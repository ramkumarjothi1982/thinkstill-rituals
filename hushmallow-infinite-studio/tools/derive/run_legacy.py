#!/usr/bin/env python3
"""Run the ORIGINAL Noomi derivation (tools/derive/legacy_noomi.py, a byte-for-byte
copy of the pre-WP-07 tools/derive_noomi_hires.py) with its outputs redirected.

    python3 -I tools/derive/run_legacy.py --out DIR [--qa-out DIR] [--src noomi.webp] [--no-lock]

legacy_noomi.py is a frozen reference: it is never edited and never run
directly (its paths are relative to its own file, so run in place it would
write into tools/assets/). This runner imports it as a module, points its
STUDIO / OUT / QA globals at the real studio and at the requested directories,
and calls its main(). It is the A/B reference for the refactor: the runtime
baseline and a second, independent check of byte identity.
"""
import argparse
import importlib.util
import os
import sys
import time

sys.dont_write_bytecode = True
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))   # tools/

from derive import lock, paths  # noqa: E402

LEGACY = os.path.join(paths.HERE, 'legacy_noomi.py')


def load_legacy():
    spec = importlib.util.spec_from_file_location('legacy_noomi', LEGACY)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def main(argv=None):
    argv = sys.argv[1:] if argv is None else argv
    ap = argparse.ArgumentParser(description=__doc__.split('\n\n')[0])
    ap.add_argument('--out', required=True, help='directory for the noomi-* assets')
    ap.add_argument('--qa-out', help='directory for the QA pack (default: <out>/asset-qa)')
    ap.add_argument('--src', default=os.path.join(paths.HIRES_SRC, 'noomi.webp'))
    ap.add_argument('--no-lock', action='store_true', help='do not take the heavy-job lock (tests only)')
    a = ap.parse_args(argv)
    if not a.no_lock:
        lock.ensure_heavy_lock([os.path.abspath(__file__), *argv], 'derive-legacy-noomi')
    out = paths.assert_writable(a.out)
    qa = paths.assert_writable(a.qa_out or os.path.join(out, 'asset-qa'))
    mod = load_legacy()
    mod.STUDIO, mod.OUT, mod.QA = paths.STUDIO, out, qa
    sys.argv = [LEGACY, a.src]
    t0 = time.perf_counter()
    mod.main()
    print('[run_legacy] wall %.2fs' % (time.perf_counter() - t0), flush=True)


if __name__ == '__main__':
    main()
