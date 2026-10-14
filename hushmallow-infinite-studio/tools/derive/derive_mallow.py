#!/usr/bin/env python3
"""Derive a Mallow's full-resolution rig assets from the owner's approved hi-res art.

    python3 -I tools/derive/derive_mallow.py --mallow <id> [--src art.webp] [--out DIR] [--qa-out DIR]
                                             [--expect DIR] [--expect-qa DIR] [--gates] [--no-lock]

Input (read only): ../hushmallow/assets/source/hires/<id>.webp (configs/<id>.json names it)

Outputs (in the <id>-art.png pixel space), default folders from the config:
    <out>/<id>-art.png          approved art cropped to its alpha bbox + padding
    <out>/<id>-clean.png        the same art with the painted face removed
    <out>/<id>-clean-mask.png   edit mask (255 = pixels allowed to differ)
    <out>/<id>-face.json        face / silhouette measurements (documented inside)
    <out>/<id>-height.png       16-bit height map (pillow dome + cloud bumps)
    <out>/<id>-normal.png       8-bit tangent-space normal map (OpenGL, +Y up)
    <qa>/qa-*.png, qa-stats.json   review pack (asset_qa.qa_pack)
    <qa>/asset-gates.json, qa-stretched-channels.png, qa-lighting-sweep.png   with --gates
    <qa>/derive-manifest.json   sha256 of every output, config, source and library versions

A Mallow whose asset folder is frozen (Noomi: assets/noomi/ is v2-approved) is
never written in place. Without --out its outputs go to WORK/derive/<id>/ and
are compared byte for byte with the committed set (assets/noomi/ and the
review pack in output/asset-qa/): that is the regression gate for any change
to tools/derive. Exit code 1 when a comparison or an enforced gate fails.

Each run takes the exclusive heavy-job lock (lock.py) unless it is already
inside one, so derivations never overlap renders, benchmarks or each other.
Deterministic: fixed seeds, no wall clock in any output; two runs give
identical files.
"""
import argparse
import json
import os
import sys
import time

if __package__ in (None, ''):                      # run as a script: python3 -I tools/derive/derive_mallow.py
    sys.dont_write_bytecode = True
    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    __package__ = 'derive'

from . import asset_qa, gates, lock, paths, pipeline  # noqa: E402

RUN_LOG = paths.work_path('derive', 'runs.jsonl')


def parse_args(argv):
    ap = argparse.ArgumentParser(prog='derive_mallow.py', description=__doc__.split('\n\n')[0])
    ap.add_argument('--mallow', required=True, help='config id (tools/derive/configs/<id>.json)')
    ap.add_argument('--src', help='approved source art (default: the config\'s, in ../hushmallow/assets/source/hires/)')
    ap.add_argument('--out', help='asset folder (default: the config\'s; WORK/derive/<id>/assets for a frozen Mallow)')
    ap.add_argument('--qa-out', help='QA folder (default: the config\'s, or <out>/asset-qa when --out is given)')
    ap.add_argument('--expect', help='compare the assets byte for byte with this folder')
    ap.add_argument('--expect-qa', help='compare the review pack byte for byte with this folder')
    ap.add_argument('--gates', action='store_true', help='also run the shared asset gates (gates.run_gates)')
    ap.add_argument('--no-lock', action='store_true', help='do not take the heavy-job lock (tests only)')
    return ap.parse_args(argv)


def plan_dirs(cfg, a):
    """Output and reference folders for this run (see the module docstring)."""
    out_default, qa_default, frozen = asset_qa.default_dirs(cfg)
    out = a.out or out_default
    qa = a.qa_out or (os.path.join(out, 'asset-qa') if a.out else qa_default)
    expect, expect_qa = a.expect, a.expect_qa
    if frozen and not a.out:
        expect = expect or cfg.assets_dir
        if not a.qa_out and os.path.isdir(cfg.qa_dir):
            expect_qa = expect_qa or cfg.qa_dir
    return paths.assert_writable(out), paths.assert_writable(qa), expect, expect_qa, frozen


def main(argv=None):
    argv = sys.argv[1:] if argv is None else argv
    a = parse_args(argv)
    if not a.no_lock:
        lock.ensure_heavy_lock([os.path.abspath(__file__), *argv], f'derive-{a.mallow}')
    t_start = time.perf_counter()
    log = lambda *m: print(f'[derive {a.mallow}]', *m, flush=True)
    cfg, fin = pipeline.resolve(a.mallow)
    if fin.STATUS != 'implemented':
        log(f'the {cfg.family} finder is a stub (owner: {fin.OWNER}); nothing derived')
        return 2
    out, qa, expect, expect_qa, frozen = plan_dirs(cfg, a)
    if frozen and not a.out:
        log(f'{os.path.relpath(cfg.assets_dir, paths.STUDIO)} is frozen: deriving into {os.path.dirname(out)} '
            'and comparing with the committed files')
    log('config', os.path.relpath(cfg.path, paths.STUDIO), 'family', cfg.family)

    d = pipeline.derive(cfg, fin, a.src, log)
    files = pipeline.write_assets(d, out)
    t0 = time.perf_counter()
    asset_qa.qa_pack(d.art, d.clean, d.Hh, d.zA, d.features.cores, d.maps, qa, cfg.halo_r, asset_qa.pack_names(cfg))
    d.timings['qa_pack'] = round(time.perf_counter() - t0, 2)
    total = time.perf_counter() - t_start
    log('assets ->', out)
    log('review pack ->', qa)

    comparisons = {}
    if expect:
        comparisons['assets'] = pipeline.compare_dirs(out, expect)
    if expect_qa:
        comparisons['reviewPack'] = pipeline.compare_dirs(qa, expect_qa)
    report = None
    if a.gates:
        t0 = time.perf_counter()
        g = gates.GateInput(cfg, fin, d.art, d.clean, d.Hh, d.zA, d.features, d.maps['nrm8'], d.face)
        report = gates.run_gates(g, qa, reproducibility=comparisons or None)
        d.timings['gates'] = round(time.perf_counter() - t0, 2)
        print(gates.summarize(report), flush=True)

    manifest = dict(
        _about='Provenance of one derivation (tools/derive/derive_mallow.py). Deterministic: no timings.',
        mallow=cfg.id, family=cfg.family, seed=cfg.seed,
        config=dict(file=os.path.relpath(cfg.path, paths.STUDIO), sha256=cfg.sha256),
        source=dict(file=os.path.relpath(d.src_path, paths.STUDIO), sha256=pipeline.sha256_file(d.src_path)),
        assets=files,
        reviewPack=pipeline.hash_dir(qa, sorted(n for n in os.listdir(qa) if n.startswith('qa-') or n == 'qa-stats.json')),
        comparisons={k: dict(identical=v['identical'], missing=v['missing'], expectDir=v['expectDir'],
                             different=sorted(n for n, f in v['files'].items() if not f['identical']))
                     for k, v in comparisons.items()},
        versions=pipeline.versions())
    pipeline.save_json(manifest, os.path.join(qa, 'derive-manifest.json'))

    code = 0
    for k, c in comparisons.items():
        same = sum(f['identical'] for f in c['files'].values())
        log(f'{k} vs {c["expectDir"]}: {"byte-identical" if c["identical"] else "DIFFERENT"} ({same}/{len(c["files"])} files)')
        for n, f in c['files'].items():
            if not f['identical']:
                log(f'  differs: {n}')
        code |= 0 if c['identical'] else 1
    if report is not None:
        log('asset gates:', report['verdict'], '(* = enforced)')
        code |= 0 if report['verdict'] == 'pass' else 1
    log('timings', json.dumps(d.timings))
    log('done in %.1fs' % total)
    _append_run_log(dict(mallow=cfg.id, out=out, qa=qa, seconds=round(total, 2), timings=d.timings,
                         lease=os.environ.get(lock.ENV_KEY), exit=code))
    return code


def _append_run_log(entry):
    """WORK/derive/runs.jsonl: one line per run (timings live here, never in an output)."""
    try:
        os.makedirs(os.path.dirname(RUN_LOG), exist_ok=True)
        with open(RUN_LOG, 'a') as f:
            f.write(json.dumps(entry) + '\n')
    except OSError:
        pass


if __name__ == '__main__':
    sys.exit(main())
