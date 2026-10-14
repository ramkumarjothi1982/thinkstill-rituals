"""derive_mallow output planning: a frozen Mallow is never written in place."""
import argparse
import os
import shutil
import unittest

from derive import asset_qa, derive_mallow, paths, pipeline


def args(**kw):
    base = dict(mallow='noomi', src=None, out=None, qa_out=None, expect=None, expect_qa=None, gates=False, no_lock=True)
    base.update(kw)
    return argparse.Namespace(**base)


class PlanDirsTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.cfg, _ = pipeline.resolve('noomi')

    def test_frozen_default_goes_to_work_and_compares(self):
        out, qa, expect, expect_qa, frozen = derive_mallow.plan_dirs(self.cfg, args())
        self.assertTrue(frozen)
        self.assertEqual(out, paths.work_path('derive', 'noomi', 'assets'))
        self.assertEqual(qa, paths.work_path('derive', 'noomi', 'asset-qa'))
        self.assertEqual(expect, paths.studio_path('assets', 'noomi'))
        self.assertEqual(expect_qa, paths.studio_path('output', 'asset-qa'))

    def test_explicit_out(self):
        w = paths.work_path('derive-test', 'x')
        out, qa, expect, expect_qa, _ = derive_mallow.plan_dirs(self.cfg, args(out=w))
        self.assertEqual((out, qa, expect, expect_qa), (w, os.path.join(w, 'asset-qa'), None, None))
        out, qa, expect, _, _ = derive_mallow.plan_dirs(self.cfg, args(out=w, expect='assets/noomi'))
        self.assertEqual(expect, 'assets/noomi')

    def test_frozen_targets_are_refused(self):
        for kw in (dict(out=paths.studio_path('assets', 'noomi')), dict(out=paths.work_path('x'), qa_out=paths.studio_path('output', 'v2')),
                   dict(out='/tmp/derive-x'), dict(out=os.path.join(paths.HUSHMALLOW, 'assets'))):
            with self.assertRaises(PermissionError, msg=str(kw)):
                derive_mallow.plan_dirs(self.cfg, args(**kw))

    def test_unfrozen_mallow_defaults_to_its_config_folders(self):
        from derive import config
        cfg = config.parse({'id': 'blubi', 'family': 'closed_tube'})
        out, qa, frozen = asset_qa.default_dirs(cfg)
        self.assertFalse(frozen)
        self.assertEqual((out, qa), (paths.studio_path('assets', 'blubi'), paths.studio_path('output', 'asset-qa', 'blubi')))

    def test_compare_dirs(self):
        a, b = paths.mk_work_temp('cmp-a-'), paths.mk_work_temp('cmp-b-')
        for d in (a, b):
            self.addCleanup(shutil.rmtree, d, True)
        for d, txt in ((a, b'one'), (b, b'one')):
            with open(os.path.join(d, 'f.bin'), 'wb') as f:
                f.write(txt)
        with open(os.path.join(a, 'extra.bin'), 'wb') as f:
            f.write(b'new file in the output only')
        self.assertTrue(pipeline.compare_dirs(a, b)['identical'])
        with open(os.path.join(b, 'g.bin'), 'wb') as f:
            f.write(b'missing from the output')
        c = pipeline.compare_dirs(a, b)
        self.assertFalse(c['identical'])
        self.assertEqual(c['missing'], ['g.bin'])


if __name__ == '__main__':
    unittest.main()
