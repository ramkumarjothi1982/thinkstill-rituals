#!/usr/bin/env python3
"""Asset QA for a derived Mallow: the visual review pack plus the shared asset-gate metrics.

    python3 -I tools/derive/asset_qa.py --mallow <id> [--assets DIR] [--qa-out DIR]
                                        [--expect-qa DIR] [--no-pack] [--no-gates] [--no-lock]

Reads the derived files (<id>-art.png, -clean.png, -clean-mask.png, -normal.png,
-face.json) from --assets (default: the config's asset folder), rebuilds the
feature masks and zone A from the art exactly as the derivation did (steps 2-5,
no PatchMatch), then writes into --qa-out (default: the config's QA folder;
for a frozen Mallow such as Noomi: WORK/derive/<id>/asset-qa):

  qa_pack()      the review pack of the approved Noomi derivation, verbatim:
                 qa-<feature>-1x.png, -2x.png, -2x-nearest-clean.png,
                 qa-fullbody-before-after.png, qa-face-contrast-boost.png,
                 qa-diff-outside-mask.png, qa-normal-lambert.png, qa-stats.json
  run_gates()    asset-gates.json: every shared asset gate (docs/PHASE2-PLAN.md
                 and the asset reports in docs/design/map-asset-*.md), with its
                 measured value, threshold and verdict; plus two new review
                 images, qa-stretched-channels.png and qa-lighting-sweep.png

The gates (thresholds in GATES; a config's "qa" section overrides them and lists
the gates it enforces):

  integrity           zero difference outside the edit mask, alpha identical
  transparent_rgb     RGB is zero where alpha < 2 (no edge-colour fringes)
  band_energy         texture energy inside vs real skin around: 0.85-1.15 per band and channel
  repeat_patch        no 24 px patch of zone A matches untouched skin with NCC > 0.95
  ghost               fine detail of the clean body vs each old feature's shape: |r| < 0.05
  lighting_sweep      the same ghost test on the normal map lit from 8 directions
  cheek_refit         cheeks refitted on the clean body move <= 1 px, sparkles all present
  residue             mean colour of zone A / zone B vs the smooth surround: within 3 levels
  boundary_step       low-pass colour step across the edit-mask and zone-A edges: <= 2 levels
  colour_match        dE2000 of the low-passed edit region vs the smooth surround: mean < 2
  cross_profiles      cross-stroke luma and G profiles over +-60 px flat within 1.5 levels
  texture_period      texture cell period inside vs outside: within 15 %
  glint_density       small bright glints per area inside vs outside: within 25 %
  reproducibility     byte identity against a reference set (derive_mallow --expect)

A gate whose input does not exist (no glints, no cheeks, a clipped channel) is
"n/a", never a silent pass.
"""
import argparse
import json
import os
import sys
import time

if __package__ in (None, ''):                      # run as a script: python3 -I tools/derive/asset_qa.py
    sys.dont_write_bytecode = True
    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    __package__ = 'derive'

import numpy as np
import cv2
from PIL import Image

from . import paths
from .gates import (GATE_FUNCS, GATES, GateInput, resolve_gates, run_gates,  # noqa: F401  (the gate API, re-exported)
                    summarize)
from .qa_draw import _label, _on_bg


# ----------------------------------------------------------------------------
# review pack (verbatim from the approved Noomi derivation)
# ----------------------------------------------------------------------------
def qa_pack(art, clean, Hh, zA, cores, maps, qa_dir, halo_r, names):
    """The visual review pack of a derivation (verbatim from the approved script):
    1:1 and 2:1 before/after crops of every feature, the full body, a x2.5
    contrast boost of the face, the outside-mask difference proof, a Lambert
    preview of the normal map, and qa-stats.json. `names` gives the asset file
    names shown in the labels (art, clean, mask, normal). Returns the stats."""
    qa_dir = paths.assert_writable(qa_dir)
    os.makedirs(qa_dir, exist_ok=True)
    A, B = _on_bg(art), _on_bg(clean)
    gap = lambda h: np.full((h, 8, 3), 255, np.uint8)
    stats = {}
    for k, m in cores.items():
        ys, xs = np.nonzero(Hh & (cv2.distanceTransform(1 - m, cv2.DIST_L2, 5) <= halo_r))
        y0, y1, x0, x1 = ys.min() - 8, ys.max() + 9, xs.min() - 8, xs.max() + 9
        a, b = A[y0:y1, x0:x1], B[y0:y1, x0:x1]
        Image.fromarray(np.hstack([_label(a.copy(), 'approved art 1:1'), gap(a.shape[0]), _label(b.copy(), 'clean 1:1')])).save(
            os.path.join(qa_dir, f'qa-{k}-1x.png'))
        # 2:1 of the central part of the stroke region (Lanczos)
        cy, cx = (y0 + y1) // 2, (x0 + x1) // 2
        hh, ww = 75, 120
        a2 = np.array(Image.fromarray(A[cy - hh:cy + hh, cx - ww:cx + ww]).resize((4 * ww, 4 * hh), Image.LANCZOS))
        b2 = np.array(Image.fromarray(B[cy - hh:cy + hh, cx - ww:cx + ww]).resize((4 * ww, 4 * hh), Image.LANCZOS))
        Image.fromarray(np.hstack([_label(a2, 'approved art 2:1'), gap(a2.shape[0]), _label(b2, 'clean 2:1')])).save(
            os.path.join(qa_dir, f'qa-{k}-2x.png'))
        # nearest-neighbour 2:1 of the clean result alone (pixel-honest)
        Image.fromarray(B[cy - hh:cy + hh, cx - ww:cx + ww]).resize((4 * ww, 4 * hh), Image.NEAREST).save(
            os.path.join(qa_dir, f'qa-{k}-2x-nearest-clean.png'))
    Image.fromarray(np.hstack([_label(A.copy(), f'approved art ({names["art"]})'), gap(A.shape[0]),
                               _label(B.copy(), f'face lines removed ({names["clean"]})')])).save(os.path.join(qa_dir, 'qa-fullbody-before-after.png'))
    # contrast-boosted face (x2.5 around a 40 px local mean) to expose any ghost
    def boost(img):
        f = img.astype(np.float64)
        m = cv2.GaussianBlur(f, (0, 0), 40)
        return np.clip(m + (f - m) * 2.5, 0, 255).astype(np.uint8)
    ys, xs = np.nonzero(Hh)
    fy0, fy1, fx0, fx1 = ys.min() - 30, ys.max() + 30, xs.min() - 30, xs.max() + 30
    Image.fromarray(np.vstack([_label(boost(A)[fy0:fy1, fx0:fx1], 'approved art, contrast x2.5'),
                               np.full((8, fx1 - fx0, 3), 255, np.uint8),
                               _label(boost(B)[fy0:fy1, fx0:fx1], 'clean, contrast x2.5')])).save(os.path.join(qa_dir, 'qa-face-contrast-boost.png'))
    # difference outside the mask: must be exactly zero
    diff = np.abs(clean.astype(int) - art.astype(int)).max(2)
    out_max = int(diff[~Hh].max())
    vis = np.clip(diff * 8, 0, 255).astype(np.uint8)
    vis = cv2.cvtColor(vis, cv2.COLOR_GRAY2RGB)
    vis[(~Hh) & (diff > 0)] = [255, 0, 0]          # (would be red if anything changed outside)
    cnt, _ = cv2.findContours(Hh.astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    cv2.drawContours(vis, cnt, -1, (0, 200, 255), 1)
    cnt, _ = cv2.findContours(zA.astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    cv2.drawContours(vis, cnt, -1, (255, 200, 0), 1)
    vis = _label(vis, f'|clean - art| x8   max abs diff OUTSIDE mask = {out_max}   (pixels outside: {int((~Hh).sum())})')
    vis = _label(vis, f'cyan = edit mask ({names["mask"]}), yellow = re-synthesised zone A, inside the rest: glow un-blended', (10, 54), 0.55)
    Image.fromarray(vis).save(os.path.join(qa_dir, 'qa-diff-outside-mask.png'))
    # Lambert preview from a top-right light
    n, body = maps['n'], maps['body']
    L = np.array([0.55, 0.55, 0.63]); L /= np.linalg.norm(L)
    lam = np.clip((n * L).sum(2), 0, 1)
    shade = 0.12 + 0.88 * lam
    al = art[..., 3:4].astype(np.float64) / 255
    clay = np.array([228, 232, 240.]) * shade[..., None]
    prev = np.round(clay * al + np.array([38, 42, 56.]) * (1 - al)).astype(np.uint8)
    alb = clean[..., :3].astype(np.float64) * (0.35 + 0.75 * lam[..., None])
    prev2 = np.round(np.clip(alb, 0, 255) * al + np.array([38, 42, 56.]) * (1 - al)).astype(np.uint8)
    nm = maps['nrm8']                              # == the PNG read back
    Image.fromarray(np.hstack([_label(prev, 'normal map, Lambert, light top-right'), gap(prev.shape[0]),
                               _label(nm.copy(), names['normal']), gap(prev.shape[0]),
                               _label(prev2, 'clean art x Lambert')])).save(os.path.join(qa_dir, 'qa-normal-lambert.png'))
    stats.update(maxAbsDiffOutsideMask=out_max, changedPixels=int((diff > 0).sum()), editMaskPixels=int(Hh.sum()),
                 resynthesizedPixels=int(zA.sum()), alphaIdentical=bool((clean[..., 3] == art[..., 3]).all()),
                 maxAbsDiffInsideMask=int(diff[Hh].max()))
    with open(os.path.join(qa_dir, 'qa-stats.json'), 'w') as f:
        json.dump(stats, f, indent=1)
    return stats


# ----------------------------------------------------------------------------
# command line
# ----------------------------------------------------------------------------
def default_dirs(cfg):
    """(assets_dir, qa_dir, frozen). A Mallow whose asset folder is frozen
    (Noomi: assets/noomi/ is v2-approved) never gets its committed files
    rewritten: its default outputs go to WORK/derive/<id>/ instead."""
    frozen = paths.is_frozen(cfg.assets_dir)
    if frozen:
        base = paths.work_path('derive', cfg.id)
        return os.path.join(base, 'assets'), os.path.join(base, 'asset-qa'), True
    return cfg.assets_dir, cfg.qa_dir, False


def pack_names(cfg):
    return dict(art=cfg.file('art.png'), clean=cfg.file('clean.png'), mask=cfg.file('clean-mask.png'),
                normal=cfg.file('normal.png'))


def load_rgba(p):
    return np.array(Image.open(p).convert('RGBA'))


def main(argv=None):
    from . import common, lock, pipeline
    argv = sys.argv[1:] if argv is None else argv
    ap = argparse.ArgumentParser(prog='asset_qa.py', description='QA pack + shared asset gates for a derived Mallow.')
    ap.add_argument('--mallow', required=True, help='config id (tools/derive/configs/<id>.json)')
    ap.add_argument('--assets', help='folder with the derived <id>-*.png / <id>-face.json (default: the config\'s)')
    ap.add_argument('--qa-out', help='output folder (default: the config\'s; WORK/derive/<id>/asset-qa for a frozen Mallow)')
    ap.add_argument('--expect-qa', help='compare the review pack byte for byte with this folder')
    ap.add_argument('--no-pack', action='store_true', help='skip the review pack')
    ap.add_argument('--no-gates', action='store_true', help='skip the asset gates')
    ap.add_argument('--no-lock', action='store_true', help='do not take the heavy-job lock (tests only)')
    a = ap.parse_args(argv)
    if not a.no_lock:
        lock.ensure_heavy_lock([os.path.abspath(__file__), *argv], f'asset-qa-{a.mallow}')
    log = lambda *m: print(f'[asset_qa {a.mallow}]', *m, flush=True)
    cfg, fin = pipeline.resolve(a.mallow)
    if fin.STATUS != 'implemented':
        log(f'the {cfg.family} finder is a stub (owner: {fin.OWNER})')
        return 2
    _, qa_default, frozen = default_dirs(cfg)
    assets = a.assets or cfg.assets_dir
    qa_dir = paths.assert_writable(a.qa_out or qa_default)
    expect_qa = a.expect_qa or (cfg.qa_dir if frozen and not a.qa_out and os.path.isdir(cfg.qa_dir) else None)
    art = load_rgba(os.path.join(assets, cfg.file('art.png')))
    clean = load_rgba(os.path.join(assets, cfg.file('clean.png')))
    mask = np.array(Image.open(os.path.join(assets, cfg.file('clean-mask.png')))) > 127
    normal8 = np.array(Image.open(os.path.join(assets, cfg.file('normal.png'))).convert('RGB'))
    with open(os.path.join(assets, cfg.file('face.json'))) as f:
        face = json.load(f)
    log('assets', os.path.relpath(assets, paths.STUDIO), '-> QA', qa_dir)
    t0 = time.perf_counter()
    # rebuild the masks exactly as the derivation did (steps 2-5) and check them against the files
    d = pipeline.analyse(cfg, fin, art, log, measure=False)
    if not np.array_equal(d.Hh, mask):
        log('the edit mask rebuilt from the art differs from', cfg.file('clean-mask.png'), '- were these assets derived with this config?')
        return 1
    maps = common.height_normal(art, clean, d.features.dimple, cfg.height_normal)
    if not np.array_equal(maps['nrm8'], normal8):
        log('the normal map rebuilt from art + clean differs from', cfg.file('normal.png'))
        return 1
    log('masks rebuilt and checked in %.1fs' % (time.perf_counter() - t0))
    code = 0
    if not a.no_pack:
        t0 = time.perf_counter()
        qa_pack(art, clean, d.Hh, d.zA, d.features.cores, maps, qa_dir, cfg.halo_r, pack_names(cfg))
        log('review pack written in %.1fs' % (time.perf_counter() - t0))
        if expect_qa:
            cmp = pipeline.compare_dirs(qa_dir, expect_qa)
            log('review pack vs', cmp['expectDir'], ':', 'byte-identical' if cmp['identical'] else 'DIFFERENT',
                f'({sum(f["identical"] for f in cmp["files"].values())}/{len(cmp["files"])} files)')
            code |= 0 if cmp['identical'] else 1
    if not a.no_gates:
        t0 = time.perf_counter()
        g = GateInput(cfg, fin, art, clean, d.Hh, d.zA, d.features, normal8, face)
        report = run_gates(g, qa_dir, log=None)
        print(summarize(report), flush=True)
        log('asset gates: %s (* = enforced; warn = within sampling noise) in %.1fs' % (report['verdict'], time.perf_counter() - t0))
        code |= 0 if report['verdict'] == 'pass' else 1
    return code


if __name__ == '__main__':
    sys.exit(main())
