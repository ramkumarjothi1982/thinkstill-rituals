"""Per-Mallow derivation configs: tools/derive/configs/<id>.json.

A config names the Mallow, its face family (which feature finder runs), its
approved source art and its output folders, and carries every tunable of the
family-independent pipeline:

    crop            {pad, alpha_min}        alpha-bbox crop of the 1254 px source
    halo_r          px                      edit-mask radius around the face features
    seed            int                     PatchMatch RNG seed (determinism)
    inpaint         {...}                   zone-A re-synthesis parameters (common.py)
    height_normal   {...}                   height/normal-map recipe (common.py)
    finder          {...}                   family-specific, validated by the finder
    qa              {enforce, gates}        asset-gate enforcement and thresholds (asset_qa.py)

Sections left out inherit DEFAULTS, the approved Noomi values. configs/noomi.json
spells every value out anyway, so the approved derivation never depends on
these defaults (tests/test_config.py checks that the two agree). Key order is
kept (the face JSON echoes `inpaint` and `height_normal` in this order), and
unknown keys are errors, so a typo cannot silently fall back to a default.
"""
import hashlib
import json
import os
from dataclasses import dataclass, field

from . import paths

CONFIG_DIR = os.path.join(paths.HERE, 'configs')
FAMILIES = ('closed_tube', 'open_socket', 'spiral', 'heavy_lid')

# The approved Noomi values (tools/derive/legacy_noomi.py: PAD, ALPHA_MIN, HALO_R, SEED, P, HN).
DEFAULTS = {
    'crop': {'pad': 24, 'alpha_min': 2},
    'halo_r': 64,
    'seed': 1234,
    'inpaint': {
        'lbg_sigma': 10.0,      # local-linear low-pass used as thin-plate boundary data
        'ratio_su': 4,          # outline smoothing of the glow transmission (bins of 2 px)
        'ratio_sv': 1.0,        # distance smoothing of the glow transmission (px)
        'zone_thr': 0.07,       # zone A = where the glow changes luminance by > 7 %
        'zone_vmin': 10,        # ...but at least 10 px beyond the stroke edge
        'band': 16,             # low-frequency cross-fade band outside zone A (px)
        'detail_sigma': 24,     # detail layer = image - local-linear low-pass(sigma)
        'energy_sigma': 16,     # texture-energy normalisation window
        'pm_levels': 4, 'pm_r': 3, 'pm_known_w': 2.0, 'pm_em': [6, 5, 4, 3], 'pm_iters': [5, 4, 3, 2],
        'band_gain_max': 2.2,   # cap of the multi-band texture-energy equalisation
        'seam_sigma': 5,        # boundary-mismatch smoothing for the seamless correction
    },
    'height_normal': {
        'bevel_frac': 0.18,     # bevel radius of the rounded-cube profile, x min(bodyW, bodyH)
        'front_bulge': 0.08,    # extra gentle dome on the front face, x bevel radius
        'dimple_depth': 0.22,   # top dimple depression depth, x bevel radius
        'dimple_radius': 70.0,  # px
        'detail_amp': 1.3,      # px of height per robust sigma of the luminance band-pass
        'detail_band': [1.5, 12.0],
        'detail_clip': 2.5,     # soft clip (tanh) in robust sigmas
        'edge_fade': 10.0,      # px: detail fades in from the silhouette
        'specular_weight': 0.25,  # detail weight on glossy specular streaks
    },
}

# Keys that index arrays or size kernels must be integers.
_INT_KEYS = {'crop': ('pad', 'alpha_min'), 'inpaint': ('ratio_su', 'pm_levels', 'pm_r')}


class ConfigError(ValueError):
    pass


@dataclass(frozen=True)
class Config:
    id: str
    name: str
    family: str
    src_path: str
    src_commit: str
    assets_dir: str           # absolute
    qa_dir: str               # absolute
    generator: str            # named in the face JSON
    pad: int
    alpha_min: int
    halo_r: int
    seed: int
    inpaint: dict
    height_normal: dict
    finder: dict
    qa: dict
    path: str = ''
    sha256: str = ''
    raw: dict = field(default_factory=dict, repr=False)

    def file(self, suffix):
        """Asset file name, e.g. file('clean.png') -> 'noomi-clean.png'."""
        return f'{self.id}-{suffix}'


def _is_int(v):
    return isinstance(v, int) and not isinstance(v, bool)


def _is_num(v):
    return (isinstance(v, (int, float))) and not isinstance(v, bool)


def _merge(section, given, where):
    """Default section overlaid with the given values, default key order first."""
    base = DEFAULTS[section]
    if given is None:
        return json.loads(json.dumps(base))
    if not isinstance(given, dict):
        raise ConfigError(f'{where}: "{section}" must be an object')
    unknown = sorted(set(given) - set(base) - {'_about'})
    if unknown:
        raise ConfigError(f'{where}: unknown key(s) in "{section}": {", ".join(unknown)}')
    out = {}
    for k, dv in base.items():
        v = given.get(k, dv)
        if isinstance(dv, list):
            if not isinstance(v, list) or not all(_is_num(x) for x in v):
                raise ConfigError(f'{where}: {section}.{k} must be a list of numbers')
        elif k in _INT_KEYS.get(section, ()):
            if not _is_int(v):
                raise ConfigError(f'{where}: {section}.{k} must be an integer')
        elif not _is_num(v):
            raise ConfigError(f'{where}: {section}.{k} must be a number')
        out[k] = v
    return out


def parse(doc, where='<config>', cfg_path='', sha=''):
    """Validate a config document and resolve it into a Config."""
    if not isinstance(doc, dict):
        raise ConfigError(f'{where}: a config must be a JSON object')
    known = {'_about', 'id', 'name', 'family', 'source', 'outputs', 'generator', 'crop', 'halo_r', 'seed',
             'inpaint', 'height_normal', 'finder', 'qa'}
    unknown = sorted(set(doc) - known)
    if unknown:
        raise ConfigError(f'{where}: unknown key(s): {", ".join(unknown)}')
    mid = doc.get('id')
    if not isinstance(mid, str) or not mid.isidentifier() or mid != mid.lower():
        raise ConfigError(f'{where}: "id" must be a lowercase identifier')
    family = doc.get('family')
    if family not in FAMILIES:
        raise ConfigError(f'{where}: "family" must be one of {", ".join(FAMILIES)} (got {family!r})')
    src = doc.get('source') or {}
    src_file = src.get('file', f'{mid}.webp')
    src_path = src_file if os.path.isabs(src_file) else os.path.join(paths.HIRES_SRC, src_file)
    outs = doc.get('outputs') or {}
    assets = outs.get('assets', f'assets/{mid}')
    qa = outs.get('qa', f'output/asset-qa/{mid}')
    crop = _merge('crop', doc.get('crop'), where)
    inpaint = _merge('inpaint', doc.get('inpaint'), where)
    for k in ('pm_em', 'pm_iters'):
        if len(inpaint[k]) != inpaint['pm_levels'] or not all(_is_int(x) and x > 0 for x in inpaint[k]):
            raise ConfigError(f'{where}: inpaint.{k} needs pm_levels ({inpaint["pm_levels"]}) positive integers')
    hn = _merge('height_normal', doc.get('height_normal'), where)
    halo_r = doc.get('halo_r', DEFAULTS['halo_r'])
    seed = doc.get('seed', DEFAULTS['seed'])
    if not _is_int(halo_r) or halo_r <= 0:
        raise ConfigError(f'{where}: "halo_r" must be a positive integer')
    if not _is_int(seed) or seed < 0:
        raise ConfigError(f'{where}: "seed" must be a non-negative integer')
    finder = doc.get('finder') or {}
    qa_cfg = doc.get('qa') or {}
    if not isinstance(finder, dict) or not isinstance(qa_cfg, dict):
        raise ConfigError(f'{where}: "finder" and "qa" must be objects')
    return Config(
        id=mid, name=doc.get('name') or mid.capitalize(), family=family,
        src_path=src_path, src_commit=str(src.get('commit', '')),
        assets_dir=paths.studio_path(assets) if not os.path.isabs(assets) else assets,
        qa_dir=paths.studio_path(qa) if not os.path.isabs(qa) else qa,
        generator=doc.get('generator') or f'tools/derive/derive_mallow.py --mallow {mid}',
        pad=crop['pad'], alpha_min=crop['alpha_min'], halo_r=halo_r, seed=seed,
        inpaint=inpaint, height_normal=hn, finder=finder, qa=qa_cfg,
        path=cfg_path, sha256=sha, raw=doc)


def config_path(mallow_id):
    return os.path.join(CONFIG_DIR, f'{mallow_id}.json')


def load(mallow_id_or_path):
    """Load configs/<id>.json (or an explicit .json path) into a Config."""
    p = mallow_id_or_path
    if not p.endswith('.json'):
        p = config_path(p)
    if not os.path.isfile(p):
        have = sorted(f[:-5] for f in os.listdir(CONFIG_DIR) if f.endswith('.json'))
        raise ConfigError(f'no derivation config {p} (have: {", ".join(have)})')
    with open(p, 'rb') as f:
        data = f.read()
    try:
        doc = json.loads(data)
    except json.JSONDecodeError as e:
        raise ConfigError(f'{p}: invalid JSON: {e}') from None
    return parse(doc, os.path.relpath(p, paths.STUDIO), p, hashlib.sha256(data).hexdigest())


def available():
    return sorted(f[:-5] for f in os.listdir(CONFIG_DIR) if f.endswith('.json'))
