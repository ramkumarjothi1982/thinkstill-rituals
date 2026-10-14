"""The derivation pipeline: approved 1254 px art in, rig assets out.

    1. crop        alpha-bbox crop (common.crop_art)                       -> <id>-art.png
    2. features    the family finder: painted features, cheeks, dimple
                   edit mask = every pixel within halo_r of a feature      -> <id>-clean-mask.png
    3. background  thin-plate smooth background under the glow
    4. measure     the finder measures each feature (needs the background)
    5. un-blend    per-channel glow transmission; zone A
    6. re-synth    zone A rebuilt from the body's own texture (PatchMatch)
    7. composite   bit-exact outside the mask, alpha identical            -> <id>-clean.png
    8. face JSON   the finder's document + heightNormalMaps               -> <id>-face.json
    9. maps        height + normal maps from the clean body               -> <id>-height.png, <id>-normal.png
   10. QA pack     asset_qa.qa_pack (and the asset gates, on request)

The order and the arithmetic are exactly those of the approved Noomi script
(legacy_noomi.py), so the Noomi regression is byte-identical. Nothing is
written until every step has succeeded; each file is written to a temporary
name and renamed, so an interrupted run never leaves a half-written asset set.
"""
import dataclasses
import hashlib
import io
import json
import os
import platform
import time
import zlib

import numpy as np
import cv2
import scipy
import PIL
from PIL import Image

from . import common, config, finders, paths

ASSET_SUFFIXES = ('art.png', 'clean.png', 'clean-mask.png', 'face.json', 'height.png', 'normal.png')


@dataclasses.dataclass
class Derivation:
    """Everything one derivation computed (the inputs of the writers and of asset_qa)."""
    cfg: object
    src_path: str = ''
    src_shape: tuple = ()
    art: object = None
    offset: tuple = (0, 0)
    features: object = None
    coreU: object = None
    Hh: object = None            # edit mask
    Lbg: object = None           # smooth background under the glow
    meas: dict = None
    corr: object = None          # glow-un-blended art
    zA: object = None            # zone A (re-synthesised)
    band_gains: list = None
    clean: object = None
    diff: object = None
    outside: int = 0
    maps: dict = None
    face: dict = None
    timings: dict = dataclasses.field(default_factory=dict)


def resolve(mallow):
    """Load configs/<mallow>.json and its finder; the config's finder section
    comes back validated, with the family defaults filled in."""
    cfg = config.load(mallow)
    fin = finders.load(cfg.family)
    return dataclasses.replace(cfg, finder=fin.validate(cfg.finder)), fin


def load_source(path):
    return np.array(Image.open(path).convert('RGBA'))


class _Clock:
    """Wall-clock step timings for the run log (never written into an asset)."""

    def __init__(self, d, log):
        self.d, self.log, self.t = d, log, time.perf_counter()

    def lap(self, step, msg=None):
        now = time.perf_counter()
        self.d.timings[step] = round(now - self.t, 2)
        self.t = now
        if msg and self.log:
            self.log(msg)


def analyse(cfg, fin, art, log=None, measure=True, d=None, clock=None):
    """Steps 2-5 on the cropped art: features, edit mask, background,
    measurements (optional), glow un-blending and zone A. No PatchMatch, so
    asset_qa can rebuild the masks of an existing derivation exactly."""
    d = d or Derivation(cfg=cfg, art=art)
    clock = clock or _Clock(d, log)
    rgb = art[..., :3].astype(np.float64)
    al = art[..., 3]
    P, R = cfg.inpaint, cfg.halo_r
    d.features = fin.find(art, cfg)
    d.coreU, d.Hh = common.edit_mask(d.features.cores, R)
    clock.lap('features', f'features found ({", ".join(d.features.cores)}); edit-mask px {int(d.Hh.sum())}')
    d.Lbg = common.background_fill(rgb, al, d.Hh, d.features.protect, P['lbg_sigma'])
    clock.lap('background', 'background fill done')
    if measure:
        d.meas = fin.measure(art, d.features, d.Lbg, cfg)
        clock.lap('measure')
    d.corr, tables, geo = common.unblend(rgb, d.Lbg, d.features.cores, d.features.excl, al, P, R)
    d.zA = common.zone_a_mask(d.features.cores, tables, geo, d.features.protect, P, R)
    clock.lap('unblend', f'glow model done; zone A px {int(d.zA.sum())}')
    return d


def derive(cfg, fin, src_path=None, log=None):
    """Run steps 1-9 in memory and return the Derivation (nothing is written)."""
    src_path = src_path or cfg.src_path
    d = Derivation(cfg=cfg, src_path=src_path)
    clock = _Clock(d, log)
    src = load_source(src_path)
    d.src_shape = src.shape
    if log:
        log('source', src_path, src.shape)
    d.art, d.offset = common.crop_art(src, cfg.pad, cfg.alpha_min)
    clock.lap('crop', f'crop offset {d.offset} size {(d.art.shape[1], d.art.shape[0])}')
    analyse(cfg, fin, d.art, log, measure=True, d=d, clock=clock)
    rgb = d.art[..., :3].astype(np.float64)
    al = d.art[..., 3]
    sw, sub, d.band_gains = common.resynthesize(d.corr, rgb, al, d.Lbg, d.zA, d.features.protect, d.coreU,
                                                cfg.inpaint, cfg.seed, log)
    clock.lap('resynthesize')
    d.clean, d.diff, d.outside = common.composite(d.art, d.corr, sw, sub, d.Hh)
    clock.lap('composite', f'clean art done; changed px {int((d.diff > 0).sum())} max |diff| outside mask {d.outside}')
    d.face = fin.face_doc(d)
    d.maps = common.height_normal(d.art, d.clean, d.features.dimple, cfg.height_normal)
    d.face['heightNormalMaps'] = common.height_normal_doc(cfg.id, cfg.height_normal, d.maps['info'])
    clock.lap('maps')
    return d


# ----------------------------------------------------------------------------
# writing
# ----------------------------------------------------------------------------
def _atomic(path, write):
    """Write through `write(fileobj)` to a temp name next to `path`, then rename."""
    path = paths.assert_writable(path)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    tmp = os.path.join(os.path.dirname(path), f'.{os.path.basename(path)}.tmp-{os.getpid()}')
    try:
        with open(tmp, 'wb') as f:
            write(f)
        os.replace(tmp, path)
    finally:
        if os.path.exists(tmp):
            os.remove(tmp)
    return path


def save_png(img, path):
    """Save a PIL image as PNG (same encoder and defaults as Image.save('x.png'))."""
    return _atomic(path, lambda f: img.save(f, format='PNG'))


def save_json(doc, path):
    """json.dump(doc, indent=1), exactly as the approved script wrote it."""
    buf = io.StringIO()
    json.dump(doc, buf, indent=1)
    data = buf.getvalue().encode('utf-8')
    return _atomic(path, lambda f: f.write(data))


def write_assets(d, out_dir):
    """Write the six rig assets of `d` into out_dir; returns {file name: sha256}."""
    cfg = d.cfg
    out_dir = paths.assert_writable(out_dir)
    files = {
        cfg.file('art.png'): lambda p: save_png(Image.fromarray(d.art, 'RGBA'), p),
        cfg.file('clean.png'): lambda p: save_png(Image.fromarray(d.clean, 'RGBA'), p),
        cfg.file('clean-mask.png'): lambda p: save_png(Image.fromarray((d.Hh * 255).astype(np.uint8), 'L'), p),
        cfg.file('face.json'): lambda p: save_json(d.face, p),
        cfg.file('height.png'): lambda p: save_png(Image.fromarray(d.maps['h16']), p),
        cfg.file('normal.png'): lambda p: save_png(Image.fromarray(d.maps['nrm8'], 'RGB'), p),
    }
    for name, write in files.items():
        write(os.path.join(out_dir, name))
    return {name: sha256_file(os.path.join(out_dir, name)) for name in files}


def sha256_file(p):
    h = hashlib.sha256()
    with open(p, 'rb') as f:
        for chunk in iter(lambda: f.read(1 << 20), b''):
            h.update(chunk)
    return h.hexdigest()


def hash_dir(d, names=None):
    """{file name: sha256} of the regular files directly inside `d` (or of `names`)."""
    names = names if names is not None else sorted(n for n in os.listdir(d) if os.path.isfile(os.path.join(d, n)))
    return {n: sha256_file(os.path.join(d, n)) for n in names if os.path.isfile(os.path.join(d, n))}


def compare_dirs(got_dir, expect_dir):
    """Byte comparison of every regular file directly inside expect_dir with the
    file of the same name in got_dir. Returns {identical, files: {name: {...}}, missing}."""
    want = hash_dir(expect_dir)
    got = hash_dir(got_dir, list(want))
    files = {n: dict(expected=h, got=got.get(n), identical=got.get(n) == h) for n, h in want.items()}
    missing = sorted(n for n in want if n not in got)
    return dict(identical=bool(files) and all(f['identical'] for f in files.values()), files=files, missing=missing,
                expectDir=os.path.relpath(expect_dir, paths.STUDIO), gotDir=got_dir)


def versions():
    """Library versions that determine the output bytes (PNG zlib included)."""
    return dict(python=platform.python_version(), numpy=np.__version__, opencv=cv2.__version__, scipy=scipy.__version__,
                pillow=PIL.__version__, zlib=zlib.ZLIB_RUNTIME_VERSION)
