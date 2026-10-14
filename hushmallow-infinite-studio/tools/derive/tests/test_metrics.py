"""Metric primitives on synthetic images with known answers."""
import unittest

import numpy as np
import cv2

from derive import metrics

# CIEDE2000 reference pairs: Sharma, Wu and Dalal (2005), Table 1
SHARMA = [
    ((50.0000, 2.6772, -79.7751), (50.0000, 0.0000, -82.7485), 2.0425),
    ((50.0000, 3.1571, -77.2803), (50.0000, 0.0000, -82.7485), 2.8615),
    ((50.0000, 2.8361, -74.0200), (50.0000, 0.0000, -82.7485), 3.4412),
    ((50.0000, -1.3802, -84.2814), (50.0000, 0.0000, -82.7485), 1.0000),
    ((50.0000, 0.0000, 0.0000), (50.0000, -1.0000, 2.0000), 2.3669),
    ((50.0000, 2.4900, -0.0010), (50.0000, -2.4900, 0.0009), 7.1792),
    ((50.0000, 2.4900, -0.0010), (50.0000, -2.4900, 0.0011), 7.2195),
    ((50.0000, -0.0010, 2.4900), (50.0000, 0.0009, -2.4900), 4.8045),
    ((50.0000, 2.5000, 0.0000), (50.0000, 0.0000, -2.5000), 4.3065),
    ((50.0000, 2.5000, 0.0000), (73.0000, 25.0000, -18.0000), 27.1492),
    ((50.0000, 2.5000, 0.0000), (61.0000, -5.0000, 29.0000), 22.8977),
    ((50.0000, 2.5000, 0.0000), (56.0000, -27.0000, -3.0000), 31.9030),
    ((50.0000, 2.5000, 0.0000), (58.0000, 24.0000, 15.0000), 19.4535),
    ((60.2574, -34.0099, 36.2677), (60.4626, -34.1751, 39.4387), 1.2644),
    ((63.0109, -31.0961, -5.8663), (62.8187, -29.7946, -4.0864), 1.2630),
    ((22.7233, 20.0904, -46.6940), (23.0331, 14.9730, -42.5619), 2.0373),
    ((90.8027, -2.0831, 1.4410), (91.1528, -1.6435, 0.0447), 1.4441),
    ((6.7747, -0.2908, -2.4247), (5.8714, -0.0985, -2.2286), 0.6377),
    ((2.0776, 0.0795, -1.1350), (0.9033, -0.0636, -0.5514), 0.9082),
]


def noise(shape, seed, sigma=2.0):
    x = cv2.GaussianBlur(np.random.default_rng(seed).normal(0, 1, shape), (0, 0), sigma)
    return x / x.std() * 5


class ColourTest(unittest.TestCase):
    def test_ciede2000_reference_pairs(self):
        a = np.array([p[0] for p in SHARMA])
        b = np.array([p[1] for p in SHARMA])
        want = np.array([p[2] for p in SHARMA])
        np.testing.assert_allclose(metrics.delta_e2000(a, b), want, atol=1e-4)
        np.testing.assert_allclose(metrics.delta_e2000(b, a), want, atol=1e-4)       # symmetric

    def test_srgb_to_lab(self):
        lab = metrics.srgb_to_lab(np.array([[255, 255, 255], [0, 0, 0], [128, 128, 128]]))
        np.testing.assert_allclose(lab[0], [100, 0, 0], atol=0.01)
        np.testing.assert_allclose(lab[1], [0, 0, 0], atol=1e-9)
        self.assertAlmostEqual(lab[2, 0], 53.585, places=2)
        np.testing.assert_allclose(lab[2, 1:], [0, 0], atol=0.01)


class FilterTest(unittest.TestCase):
    def test_masked_blur_ignores_unweighted_pixels(self):
        img = np.full((40, 40), 10.0)
        img[:, 20:] = 1000.0
        w = np.zeros((40, 40)); w[:, :20] = 1
        out = metrics.masked_blur(img, w, 4)
        np.testing.assert_allclose(out[:, :20], 10.0, atol=1e-9)
        self.assertEqual(float(np.abs(out[:, 36:]).max()), 0.0)          # beyond the kernel: no weight, no value

    def test_band_of_a_ramp_is_zero_inside(self):
        yy, xx = np.mgrid[0:60, 0:60].astype(np.float64)
        b = metrics.band(2 * xx + yy, np.ones((60, 60)), 1, 4)
        self.assertLess(np.abs(b[20:40, 20:40]).max(), 1e-3)

    def test_pearson(self):
        x = noise((64, 64), 1)
        m = np.ones((64, 64), bool)
        self.assertAlmostEqual(metrics.pearson(x, 3 * x + 2, m), 1.0, places=9)
        self.assertAlmostEqual(metrics.pearson(x, -x, m), -1.0, places=9)
        self.assertLess(abs(metrics.pearson(x, noise((64, 64), 2), m)), 0.15)
        self.assertTrue(np.isnan(metrics.pearson(x, np.zeros((64, 64)), m)))


class RepeatPatchTest(unittest.TestCase):
    def test_window_all(self):
        m = np.ones((6, 6), bool); m[2, 3] = False
        v = metrics.window_all(m, 3)
        self.assertEqual(v.shape, (4, 4))
        self.assertFalse(v[0, 1]) ; self.assertFalse(v[2, 3]) ; self.assertTrue(v[3, 0])

    def test_detects_a_verbatim_copy_and_passes_fresh_texture(self):
        img = noise((200, 200), 3, 1.5)
        hole = np.zeros((200, 200), bool); hole[80:130, 80:130] = True
        src = ~cv2.dilate(hole.astype(np.uint8), np.ones((5, 5), np.uint8)).astype(bool)
        fresh = metrics.repeat_patch(img, hole, src)
        self.assertGreater(fresh['n'], 0)
        self.assertLess(fresh['max'], 0.8)
        copied = img.copy()
        copied[80:130, 80:130] = img[10:60, 20:70]               # PatchMatch copying skin verbatim
        res = metrics.repeat_patch(copied, hole, src)
        self.assertGreater(res['max'], 0.999)


class TextureTest(unittest.TestCase):
    def test_period_of_a_cell_texture(self):
        yy, xx = np.mgrid[0:160, 0:160].astype(np.float64)
        x = np.sin(2 * np.pi * xx / 14) + np.sin(2 * np.pi * yy / 14)
        ac, sup = metrics.radial_autocorr(x, np.ones((160, 160), bool), 40)
        period, corr_len = metrics.texture_scale(ac, sup)
        self.assertIsNotNone(period)
        self.assertLessEqual(abs(period - 14), 1.5)
        self.assertLess(corr_len, 7)

    def test_correlation_length_scales_with_blur(self):
        m = np.ones((160, 160), bool)
        cl = []
        for s in (1.5, 4.0):
            ac, sup = metrics.radial_autocorr(noise((160, 160), 5, s), m, 40)
            cl.append(metrics.texture_scale(ac, sup)[1])
        self.assertGreater(cl[1], 2 * cl[0])

    def test_glints(self):
        rgb = np.full((80, 80, 3), 150.0)
        for y, x in ((10, 10), (30, 50), (60, 20)):
            rgb[y - 1:y + 2, x - 1:x + 2] = 255
        rgb[40:70, 40:70] = 250                                   # a big bright area is not a glint
        self.assertEqual(metrics.glints(rgb, np.ones((80, 80), bool)), 3)


if __name__ == '__main__':
    unittest.main()
