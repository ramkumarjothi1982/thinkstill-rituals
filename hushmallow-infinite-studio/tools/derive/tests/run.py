#!/usr/bin/env python3
"""Run the tools/derive tests inside the shared heavy-job lock.

    python3 -I tools/derive/tests/run.py [--fast] [unittest args...]

--fast skips the synthetic end-to-end derivations (test_equivalence.py), which
run the legacy and the refactored pipeline on a small synthetic Mallow
(about 10 s each on 4 cores) and need the lock.
"""
import os
import sys
import unittest

sys.dont_write_bytecode = True
TOOLS = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, TOOLS)

from derive import lock  # noqa: E402


def main(argv):
    fast = '--fast' in argv
    rest = [a for a in argv if a != '--fast']
    if not fast:
        lock.ensure_heavy_lock([os.path.abspath(__file__), *argv], 'derive-tests', mode='shared')
    else:
        os.environ['HM_DERIVE_FAST'] = '1'
    here = os.path.dirname(os.path.abspath(__file__))
    suite = unittest.defaultTestLoader.discover(here, pattern='test_*.py', top_level_dir=TOOLS)
    if rest:
        suite = unittest.defaultTestLoader.loadTestsFromNames(rest)
    res = unittest.TextTestRunner(verbosity=2).run(suite)
    return 0 if res.wasSuccessful() else 1


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
