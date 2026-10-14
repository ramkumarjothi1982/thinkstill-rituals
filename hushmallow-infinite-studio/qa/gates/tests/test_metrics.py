"""Unit tests of the QA metrics: colour science, SSIM, the text detector,
flash blocks, seam statistics, pHash and the check helpers."""
import unittest

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

from qalib import color
from qalib.ssim import ssim, ssim_map
from qalib.text import detect_lines
from qalib.checks import band, range_band, longest_run
from flash import block_stats, stripe_tiles
from seam import seam_stats
from signature import phash, hamming
from fidelity import sustained

# Sharma, Wu and Dalal (2005), Table 1: (Lab1, Lab2, dE2000)
SHARMA = [
    ((50.0000, 2.6772, -79.7751), (50.0000, 0.0000, -82.7485), 2.0425),
    ((50.0000, 3.1571, -77.2803), (50.0000, 0.0000, -82.7485), 2.8615),
    ((50.0000, 2.8361, -74.0200), (50.0000, 0.0000, -82.7485), 3.4412),
    ((50.0000, -1.3802, -84.2814), (50.0000, 0.0000, -82.7485), 1.0000),
    ((50.0000, 0.0000, 0.0000), (50.0000, -1.0000, 2.0000), 2.3669),
    ((50.0000, 2.4900, -0.0010), (50.0000, -2.4900, 0.0009), 7.1792),
    ((50.0000, 2.4900, -0.0010), (50.0000, -2.4900, 0.0011), 7.2195),
    ((50.0000, -0.0010, 2.4900), (50.0000, 0.0009, -2.4900), 4.8045),
    ((50.0000, 2.5000, 0.0000), (73.0000, 25.0000, -18.0000), 27.1492),
    ((50.0000, 2.5000, 0.0000), (61.0000, -5.0000, 29.0000), 22.8977),
    ((60.2574, -34.0099, 36.2677), (60.4626, -34.1751, 39.4387), 1.2644),
    ((63.0109, -31.0961, -5.8663), (62.8187, -29.7946, -4.0864), 1.2630),
    ((22.7233, 20.0904, -46.6940), (23.0331, 14.9730, -42.5619), 2.0373),
    ((90.8027, -2.0831, 1.4410), (91.1528, -1.6435, 0.0447), 1.4441),
    ((2.0776, 0.0795, -1.1350), (0.9033, -0.0636, -0.5514), 0.9082),
]

FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'


class ColourTest(unittest.TestCase):
    def test_de2000_matches_sharma(self):
        a = np.array([p[0] for p in SHARMA])
        b = np.array([p[1] for p in SHARMA])
        want = np.array([p[2] for p in SHARMA])
        np.testing.assert_allclose(color.de2000(a, b), want, atol=1e-4)
        np.testing.assert_allclose(color.de2000(b, a), want, atol=1e-4)    # symmetric

    def test_lab_of_white_black_and_primaries(self):
        np.testing.assert_allclose(color.lab(np.array([255, 255, 255], np.uint8)), [100, 0, 0], atol=0.01)
        np.testing.assert_allclose(color.lab(np.array([0, 0, 0], np.uint8)), [0, 0, 0], atol=1e-6)
        np.testing.assert_allclose(color.lab(np.array([255, 0, 0], np.uint8)), [53.24, 80.09, 67.20], atol=0.05)

    def test_luminance_and_contrast(self):
        self.assertAlmostEqual(float(color.luminance(np.array([255, 255, 255], np.uint8))), 1.0, places=5)
        self.assertAlmostEqual(color.contrast_ratio(1.0, 0.0), 21.0, places=6)
        self.assertAlmostEqual(color.contrast_ratio(0.18, 0.18), 1.0)

    def test_hue_delta_wraps(self):
        self.assertAlmostEqual(float(color.hue_delta(350, 10)), 20.0)
        self.assertAlmostEqual(float(color.hue_delta(10, 350)), -20.0)

    def test_srgb_round_trip(self):
        c = np.arange(256, dtype=np.uint8)
        np.testing.assert_array_equal(color.linear_to_srgb8(color.SRGB_TO_LINEAR[c].astype(np.float64)), c)


class SsimTest(unittest.TestCase):
    def setUp(self):
        rng = np.random.default_rng(1)
        self.img = cv2.GaussianBlur(rng.uniform(0, 255, (96, 96)), (0, 0), 2)

    def test_identical_is_one(self):
        self.assertAlmostEqual(ssim(self.img, self.img), 1.0, places=9)

    def test_matches_direct_window_formula(self):
        b = np.clip(self.img + np.random.default_rng(2).normal(0, 8, self.img.shape), 0, 255)
        m = ssim_map(self.img, b)
        # direct evaluation at one interior pixel with an explicit 11x11 Gaussian window
        g = cv2.getGaussianKernel(11, 1.5)
        w = g @ g.T
        y, x = 48, 40
        pa, pb = self.img[y - 5:y + 6, x - 5:x + 6], b[y - 5:y + 6, x - 5:x + 6]
        ma, mb = (w * pa).sum(), (w * pb).sum()
        va, vb, cov = (w * pa * pa).sum() - ma ** 2, (w * pb * pb).sum() - mb ** 2, (w * pa * pb).sum() - ma * mb
        c1, c2 = (0.01 * 255) ** 2, (0.03 * 255) ** 2
        want = (2 * ma * mb + c1) * (2 * cov + c2) / ((ma ** 2 + mb ** 2 + c1) * (va + vb + c2))
        self.assertAlmostEqual(m[y, x], want, places=6)

    def test_shift_and_noise_lower_it(self):
        self.assertLess(ssim(self.img, np.roll(self.img, 3, axis=1)), ssim(self.img, self.img + 1))

    def test_mask(self):
        mask = np.zeros(self.img.shape, bool)
        mask[20:40, 20:40] = True
        self.assertAlmostEqual(ssim(self.img, self.img, mask), 1.0, places=9)
        with self.assertRaises(ValueError):
            ssim(self.img, self.img, np.zeros(self.img.shape, bool))


def text_image(lines, size=40, w=600, h=200, bg=(20, 18, 50), fg=(255, 255, 255)):
    im = Image.new('RGB', (w, h), bg)
    d = ImageDraw.Draw(im)
    font = ImageFont.truetype(FONT, size)
    for k, line in enumerate(lines):
        d.text((20, 20 + k * int(size * 1.3)), line, font=font, fill=fg)
    return np.asarray(im)


class TextDetectorTest(unittest.TestCase):
    def test_finds_light_and_dark_text(self):
        self.assertGreaterEqual(len(detect_lines(text_image(['Should I explain?']))), 1)
        self.assertGreaterEqual(len(detect_lines(text_image(['Did I say that'], bg=(200, 204, 224), fg=(40, 42, 90)))), 1)

    def test_ignores_smooth_world_and_specks(self):
        yy, xx = np.mgrid[0:300, 0:300]
        sky = np.dstack([20 + yy * 0.1, 18 + yy * 0.05, 60 + xx * 0.1]).astype(np.uint8)
        rng = np.random.default_rng(3)
        for _ in range(40):                       # stars: 1-2 px specks
            y, x = rng.integers(0, 298, 2)
            sky[y:y + 2, x:x + 2] = 255
        self.assertEqual(detect_lines(sky), [])

    def test_ignores_a_long_edge(self):
        im = np.full((200, 400, 3), 30, np.uint8)
        cv2.ellipse(im, (200, 260), (190, 150), 0, 180, 360, (220, 220, 240), 3)
        self.assertEqual(detect_lines(im), [])


class FlashTest(unittest.TestCase):
    def test_block_stats_and_a_flash(self):
        dark = np.full((1920, 1080, 3), 30, np.uint8)
        white = dark.copy()
        white[:700] = 255
        L0, _ = block_stats(dark)
        L1, _ = block_stats(white)
        self.assertEqual(L0.shape, (60, 34))
        share = float((np.abs(L1 - L0) >= 0.10).mean())
        self.assertGreaterEqual(share, 0.25)
        self.assertLess(float(np.minimum(L0, L1).mean()), 0.8)

    def test_saturated_red(self):
        red = np.zeros((1920, 1080, 3), np.uint8)
        red[..., 0] = 255
        _, R = block_stats(red)
        self.assertTrue((R > 20).all())

    def test_stripes_found_in_a_striped_tile(self):
        lim = {'tiles': [4, 3], 'minCyclesPerTile': 3, 'peakShare': 0.35, 'amplitude': 0.05}
        yy, xx = np.mgrid[0:480, 0:270]
        stripes = 0.5 + 0.3 * np.sin((xx + yy) * 2 * np.pi / 10)
        self.assertEqual(len(stripe_tiles(stripes, lim)), 12)
        self.assertEqual(stripe_tiles(np.full((480, 270), 0.4), lim), [])


class SeamAndSignatureTest(unittest.TestCase):
    def test_seam_stats(self):
        s = seam_stats([1.0] * 50 + [3.0] * 50, 2.0, 1.15)
        self.assertAlmostEqual(s['quietMedian'], 1.0)
        self.assertAlmostEqual(s['limit'], 3.0)

    def test_phash_is_stable_and_discriminates(self):
        a = text_image(['ME TRYING TO SLEEP'], w=540, h=960)
        b = np.clip(a.astype(int) + 6, 0, 255).astype(np.uint8)
        c = np.ascontiguousarray(a[::-1])
        self.assertLessEqual(hamming(phash(a), phash(b)), 4)
        self.assertGreater(hamming(phash(a), phash(c)), 10)


class ChecksTest(unittest.TestCase):
    def test_bands(self):
        self.assertEqual(band(5, {'fail': 10, 'warn': 4})['status'], 'warn')
        self.assertEqual(band(11, {'fail': 10})['status'], 'fail')
        self.assertEqual(band(0.4, {'fail': 0.5}, higher_is_worse=False)['status'], 'fail')
        self.assertEqual(range_band(1.3, {'fail': [0.7, 1.35], 'warn': [0.75, 1.25]})['status'], 'warn')
        self.assertEqual(range_band(0.5, {'fail': [0.7, 1.35]})['status'], 'fail')

    def test_runs_and_sustained(self):
        self.assertEqual(longest_run([1, 1, 0, 1, 1, 1, 0]), 3)
        self.assertEqual(sustained([1, 9, 1, 1, 1], 2, 'high'), 1)          # a single spike is not sustained
        self.assertEqual(sustained([5, 9, 9, 1], 2, 'high'), 9)
        self.assertEqual(sustained([1, 0.2, 0.2, 1], 2, 'low'), 0.2)


if __name__ == '__main__':
    unittest.main()
