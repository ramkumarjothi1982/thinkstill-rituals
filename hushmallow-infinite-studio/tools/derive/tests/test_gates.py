"""Each asset gate passes an ideal clean body and fails its own fault.

The fixture is the synthetic Mallow of synth.py: `art` has the painted face,
`ideal` is the same body painted without it (same texture, cheeks, dimple),
so a perfect face removal is known exactly. Faults are injected into copies
of the ideal clean body.
"""
import unittest

import numpy as np
import cv2

from derive import common, gates, pipeline
from derive.finders import Features
from derive.tests import synth


class GateTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.cfg, cls.fin = pipeline.resolve('noomi')
        cls.art, _, strokes = synth.make_source()
        ideal_body, _, _ = synth.make_source(face=False)
        f = cls.fin.find(cls.art, cls.cfg)
        cls.features = f
        cls.coreU, cls.Hh = common.edit_mask(f.cores, cls.cfg.halo_r)
        de = cv2.distanceTransform(1 - cls.coreU, cv2.DIST_L2, 5)
        cls.zA = de <= 16
        cls.ideal = cls.art.copy()
        cls.ideal[cls.Hh] = ideal_body[cls.Hh]
        cls.face = {k: dict(bezier=dict(p0=list(v[0]), c=list(v[1]), p1=list(v[2]))) for k, v in strokes.items()}
        cls.th, _ = gates.resolve_gates({})

    def gate(self, name, clean, art=None, features=None):
        maps = common.height_normal(self.art, clean, self.features.dimple, self.cfg.height_normal)
        g = gates.GateInput(self.cfg, self.fin, self.art if art is None else art, clean, self.Hh, self.zA,
                               features or self.features, maps['nrm8'], self.face)
        fn = gates.GATE_FUNCS[name]
        return fn(g, self.th[name], None) if name == 'lighting_sweep' else fn(g, self.th[name])

    def assertVerdict(self, name, clean, want, **kw):
        r = self.gate(name, clean, **kw)
        self.assertEqual(r['verdict'], want, f'{name}: {r["value"]}')
        return r

    def test_ideal_clean_body_passes(self):
        for name in ('integrity', 'repeat_patch', 'cheek_refit', 'residue', 'boundary_step', 'colour_match'):
            self.assertVerdict(name, self.ideal, 'pass')
        # statistical gates: never a fail on the ideal body (a warn = outside the
        # threshold but within sampling noise, e.g. the 8-16 px band of a thin zone A,
        # or the body's own low-frequency texture across a stroke)
        for name in ('band_energy', 'ghost', 'lighting_sweep', 'cross_profiles'):
            self.assertIn(self.gate(name, self.ideal)['verdict'], ('pass', 'warn'), name)
        self.assertEqual(self.gate('glint_density', self.ideal)['verdict'], 'n/a')      # no glints on this body

    def test_the_art_itself_fails_the_ghost_gates(self):
        r = self.assertVerdict('ghost', self.art, 'fail')
        self.assertGreater(r['value']['maxAbsR'], 0.5)
        self.assertVerdict('cross_profiles', self.art, 'fail')

    def test_integrity_fault(self):
        bad = self.ideal.copy()
        ys, xs = np.nonzero(~self.Hh & (self.art[..., 3] == 255))
        bad[ys[0], xs[0], 1] ^= 1
        r = self.assertVerdict('integrity', bad, 'fail')
        self.assertEqual(r['value']['maxAbsDiffOutsideMask'], 1)
        bad = self.ideal.copy()
        bad[self.Hh, 3] = 254
        self.assertFalse(self.gate('integrity', bad)['value']['alphaIdentical'])

    def test_transparent_rgb_fault(self):
        art, clean = self.art.copy(), self.ideal.copy()
        self.assertGreater(self.gate('transparent_rgb', clean)['value']['artPixels'], 0)   # the fixture's own rim
        for img in (art, clean):
            img[..., :3][img[..., 3] < 2] = 0
        self.assertVerdict('transparent_rgb', clean, 'pass', art=art)
        clean[0, 0] = [9, 0, 0, 1]
        self.assertVerdict('transparent_rgb', clean, 'fail', art=art)

    def test_ghost_fault(self):
        bad = self.ideal.astype(np.float64)
        imprint = cv2.GaussianBlur(self.coreU.astype(np.float64), (0, 0), 3)
        bad[..., :3] -= 4 * imprint[..., None]                     # a faint dark stroke left behind
        bad = np.clip(np.round(bad), 0, 255).astype(np.uint8)
        bad[~self.Hh] = self.art[~self.Hh]
        self.assertVerdict('ghost', bad, 'fail')

    def test_cross_profile_fault(self):
        bad = self.ideal.astype(np.float64)
        de = cv2.distanceTransform(1 - self.coreU, cv2.DIST_L2, 5)
        band = cv2.GaussianBlur(((de > 8) & (de < 20)).astype(np.float64), (0, 0), 2)
        bad[..., :3] += 6 * band[..., None]                        # a light band left along every stroke
        bad = np.clip(np.round(bad), 0, 255).astype(np.uint8)
        bad[~self.Hh] = self.art[~self.Hh]
        r = self.assertVerdict('cross_profiles', bad, 'fail')
        self.assertGreater(r['value']['worstDev'], 4)

    def test_residue_and_boundary_faults(self):
        bad = self.ideal.astype(np.int16)
        bad[self.zA, 0] += 8                                       # a pale-red band in zone A
        bad = np.clip(bad, 0, 255).astype(np.uint8)
        self.assertVerdict('residue', bad, 'fail')
        self.assertVerdict('boundary_step', bad, 'fail')
        self.assertVerdict('colour_match', self.ideal, 'pass')

    def test_flat_texture_fault(self):
        bad = self.ideal.copy()
        blur = cv2.GaussianBlur(self.ideal[..., :3], (0, 0), 6)
        bad[..., :3][self.zA] = blur[self.zA]                       # invented skin without texture
        r = self.assertVerdict('band_energy', bad, 'fail')
        self.assertLess(r['value']['worst']['ratio'], 0.85)

    def test_repeat_patch_fault(self):
        bad = self.ideal.copy()
        self.assertFalse(self.Hh[110:150, 120:180].any())          # the source block is untouched skin
        self.assertTrue(self.zA[325:365, 250:310].mean() > 0.5)    # the target block is in zone A (the mouth)
        bad[325:365, 250:310, :3] = self.ideal[110:150, 120:180, :3]   # skin copied verbatim
        r = self.assertVerdict('repeat_patch', bad, 'fail')
        self.assertGreater(r['value']['maxNcc'], 0.95)

    def test_cheek_refit_fault(self):
        bad = self.ideal.copy()
        bad[..., :3] = np.roll(self.ideal[..., :3], 3, axis=1)     # cheeks moved by 3 px
        self.assertVerdict('cheek_refit', bad, 'fail')
        none = Features(cores=self.features.cores)
        self.assertEqual(self.gate('cheek_refit', self.ideal, features=none)['verdict'], 'n/a')

    def test_threshold_overrides(self):
        th, enforce = gates.resolve_gates({'gates': {'band_energy': {'lo': 0.9, 'hi': 1.1}}, 'enforce': ['integrity']})
        self.assertEqual((th['band_energy']['lo'], th['band_energy']['hi']), (0.9, 1.1))
        self.assertEqual(th['band_energy']['bands'], gates.GATES['band_energy']['bands'])
        self.assertEqual(enforce, ['integrity'])
        self.assertEqual(gates.resolve_gates({})[1], list(gates.GATES))
        for bad in ({'gates': {'nope': {}}}, {'gates': {'ghost': {'max': 1}}}, {'enforce': ['nope']}):
            with self.assertRaises(ValueError):
                gates.resolve_gates(bad)

    def test_report_marks_enforced_gates(self):
        maps = common.height_normal(self.art, self.ideal, self.features.dimple, self.cfg.height_normal)
        g = gates.GateInput(self.cfg, self.fin, self.art, self.ideal, self.Hh, self.zA, self.features,
                               maps['nrm8'], self.face)
        rep = gates.run_gates(g, None, reproducibility={'assets': dict(identical=True)})
        self.assertEqual(rep['verdict'], 'pass')
        self.assertEqual(rep['enforced'], ['integrity'])
        self.assertTrue(rep['gates']['integrity']['enforced'])
        self.assertFalse(rep['gates']['ghost']['enforced'])
        self.assertEqual(rep['gates']['reproducibility']['verdict'], 'pass')
        self.assertIn('integrity', gates.summarize(rep))


if __name__ == '__main__':
    unittest.main()
