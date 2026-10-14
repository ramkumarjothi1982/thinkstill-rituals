"""End to end on the synthetic Mallow: the refactored pipeline writes exactly the
bytes the original script writes, and two runs are identical.

This is the fast stand-in for the full Noomi regression (derive_mallow.py
--mallow noomi, about 100 s): the same code paths (every parameterised step,
the writers, the review pack) on a 560 x 540 image. It needs the heavy-job lock
(run tools/derive/tests/run.py) and is skipped with --fast.
"""
import os
import shutil
import sys
import unittest

from PIL import Image

from derive import asset_qa, lock, paths, pipeline, run_legacy
from derive.tests import synth


def derive_into(cfg, fin, src, out):
    d = pipeline.derive(cfg, fin, src)
    pipeline.write_assets(d, os.path.join(out, 'assets'))
    asset_qa.qa_pack(d.art, d.clean, d.Hh, d.zA, d.features.cores, d.maps, os.path.join(out, 'qa'), cfg.halo_r,
                     asset_qa.pack_names(cfg))


class EquivalenceTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        if os.environ.get('HM_DERIVE_FAST'):
            raise unittest.SkipTest('--fast')
        if lock.held_lease() is None:
            raise unittest.SkipTest('needs the heavy-job lock: run python3 -I tools/derive/tests/run.py')
        cls.tmp = paths.mk_work_temp('derive-equiv-')
        src, _, _ = synth.make_source()
        cls.src = os.path.join(cls.tmp, 'synthetic.png')
        Image.fromarray(src, 'RGBA').save(cls.src)
        legacy = run_legacy.load_legacy()
        legacy.STUDIO, legacy.OUT, legacy.QA = paths.STUDIO, os.path.join(cls.tmp, 'legacy', 'assets'), os.path.join(cls.tmp, 'legacy', 'qa')
        argv, sys.argv = sys.argv, [run_legacy.LEGACY, cls.src]
        try:
            legacy.main()
        finally:
            sys.argv = argv
        cfg, fin = pipeline.resolve('noomi')
        for run in ('new1', 'new2'):
            derive_into(cfg, fin, cls.src, os.path.join(cls.tmp, run))

    @classmethod
    def tearDownClass(cls):
        shutil.rmtree(cls.tmp, ignore_errors=True)

    def assertSameDir(self, got, want):
        c = pipeline.compare_dirs(os.path.join(self.tmp, got), os.path.join(self.tmp, want))
        self.assertTrue(c['identical'], [n for n, f in c['files'].items() if not f['identical']] + c['missing'])
        return c

    def test_assets_are_byte_identical_to_the_original_script(self):
        c = self.assertSameDir('new1/assets', 'legacy/assets')
        self.assertEqual(len(c['files']), 6)

    def test_review_pack_is_byte_identical_to_the_original_script(self):
        c = self.assertSameDir('new1/qa', 'legacy/qa')
        self.assertEqual(len(c['files']), 14)

    def test_two_runs_are_identical(self):
        self.assertSameDir('new2/assets', 'new1/assets')
        self.assertSameDir('new2/qa', 'new1/qa')


if __name__ == '__main__':
    unittest.main()
