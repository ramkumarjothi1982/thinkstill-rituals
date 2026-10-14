"""Finder registry, stub behaviour and the closed-tube finder on the synthetic Mallow."""
import json
import os
import shutil
import unittest

import numpy as np

from derive import config, derive_mallow, finders, paths, pipeline
from derive.finders import FeatureError, closed_tube
from derive.tests import synth


class RegistryTest(unittest.TestCase):
    def test_every_family_loads_and_declares_itself(self):
        for fam in finders.FAMILIES:
            m = finders.load(fam)
            self.assertEqual(m.FAMILY, fam)
            self.assertIn(m.STATUS, ('implemented', 'stub'))
            self.assertTrue(m.OWNER)
            for fn in ('validate', 'find', 'measure', 'face_doc'):
                self.assertTrue(callable(getattr(m, fn)), f'{fam}.{fn}')
        self.assertEqual(finders.load('closed_tube').STATUS, 'implemented')
        with self.assertRaises(ValueError):
            finders.load('round_eye')

    def test_stubs_fail_loudly(self):
        for fam in ('open_socket', 'spiral', 'heavy_lid'):
            m = finders.load(fam)
            self.assertEqual(m.STATUS, 'stub')
            self.assertTrue(len(m.PLANNED) >= 3)
            for call in (lambda: m.find(None, None), lambda: m.measure(None, None, None, None), lambda: m.face_doc(None)):
                with self.assertRaises(NotImplementedError) as cm:
                    call()
                self.assertIn(m.OWNER, str(cm.exception))

    def test_derive_refuses_a_stub_family(self):
        tmp = paths.mk_work_temp('derive-test-')
        self.addCleanup(shutil.rmtree, tmp, True)
        cfgp = os.path.join(tmp, 'pipzi.json')
        with open(cfgp, 'w') as f:
            json.dump({'id': 'pipzi', 'family': 'open_socket'}, f)
        self.assertEqual(derive_mallow.main(['--mallow', cfgp, '--no-lock', '--out', os.path.join(tmp, 'a')]), 2)
        self.assertFalse(os.path.exists(os.path.join(tmp, 'a')))


class ClosedTubeTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.cfg, cls.fin = pipeline.resolve('noomi')
        cls.src, cls.masks, _ = synth.make_source()

    def test_stroke_pixels(self):
        rgb = np.array([[[60, 120, 200], [80, 120, 200], [60, 140, 200]]], np.float64)
        al = np.array([[255, 255, 100]], np.uint8)
        m = closed_tube.stroke_pixels(rgb, al, [['R', '<', 70], ['G', '<', 130], ['A', '>', 200]])
        self.assertEqual(m.tolist(), [[True, False, False]])
        y = closed_tube.stroke_pixels(rgb, al, [['Y', '>', 112]])          # luma 111.2, 117.2, 122.9
        self.assertEqual(y.tolist(), [[False, True, True]])

    def test_finds_and_orders_the_synthetic_face(self):
        f = self.fin.find(self.src, self.cfg)
        self.assertEqual(list(f.cores), ['eyeL', 'eyeR', 'mouth'])
        for k, m in f.cores.items():
            overlap = (m > 0) & self.masks[k]
            self.assertGreater(overlap.sum() / self.masks[k].sum(), 0.95, k)
        self.assertEqual(sorted(f.cheeks), ['L', 'R'])
        self.assertTrue(all(len(c['sparkles']) == 2 for c in f.cheeks.values()))
        self.assertIsNotNone(f.dimple)
        self.assertTrue(f.protect.any() and f.excl.any())

    def test_rows_config_names_the_strokes(self):
        cfg = config.parse({'id': 'x', 'family': 'closed_tube', 'finder': {'rows': [['a', 'b'], ['c']]}})
        cfg = pipeline.dataclasses.replace(cfg, finder=closed_tube.validate(cfg.finder))
        self.assertEqual(list(self.fin.find(self.src, cfg).cores), ['a', 'b', 'c'])

    def test_wrong_stroke_count_is_a_feature_error(self):
        cfg = config.parse({'id': 'x', 'family': 'closed_tube', 'finder': {'rows': [['bL', 'bR'], ['eL', 'eR'], ['m']]}})
        cfg = pipeline.dataclasses.replace(cfg, finder=closed_tube.validate(cfg.finder))
        with self.assertRaises(FeatureError):
            self.fin.find(self.src, cfg)


if __name__ == '__main__':
    unittest.main()
