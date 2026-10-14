#!/usr/bin/env python3
"""Derive full-resolution Noomi rig assets from the owner's APPROVED high-res art (thin wrapper).

    python3 -I tools/derive_noomi_hires.py [path/to/noomi.webp] [derive_mallow.py options]

The derivation moved to tools/derive/ in WP-07: the generic pipeline
(derive_mallow.py, common.py, pipeline.py), the closed-tube feature finder
(finders/closed_tube.py) and every Noomi value (configs/noomi.json). This
wrapper keeps the old command working and is equivalent to

    python3 -I tools/derive/derive_mallow.py --mallow noomi [--src path/to/noomi.webp] [options]

The original script is preserved byte for byte as tools/derive/legacy_noomi.py
(run it only through tools/derive/run_legacy.py). assets/noomi/ is frozen
(v2-approved), so without --out the files are derived into WORK/derive/noomi/
and compared byte for byte with assets/noomi/* and output/asset-qa/* (exit 1
if anything differs). The run takes the exclusive heavy-job lock.
"""
import os
import sys

sys.dont_write_bytecode = True
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))     # tools/

from derive import derive_mallow  # noqa: E402


def to_derive_args(argv):
    """Old CLI -> derive_mallow.py CLI: a leading positional is the source art."""
    args = list(argv)
    if args and not args[0].startswith('-'):
        args = ['--src', args[0], *args[1:]]
    return ['--mallow', 'noomi', *args]


if __name__ == '__main__':
    sys.exit(derive_mallow.main(to_derive_args(sys.argv[1:])))
