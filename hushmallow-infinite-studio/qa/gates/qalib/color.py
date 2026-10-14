"""Colour science for the gates: sRGB decode, relative luminance, CIE Lab, dE.

All conversions assume sRGB primaries with the D65 white point, which is what
the engine renders (BT.709 primaries, sRGB transfer) and what the frozen
encoder tags. dE2000 follows Sharma, Wu and Dalal (2005), "The CIEDE2000
Color-Difference Formula: Implementation Notes", vectorised; the unit tests
check it against the published test pairs.
"""
import numpy as np

# 8-bit sRGB code value -> linear light (IEC 61966-2-1)
_C = np.arange(256, dtype=np.float64) / 255.0
SRGB_TO_LINEAR = np.where(_C <= 0.04045, _C / 12.92, ((_C + 0.055) / 1.055) ** 2.4).astype(np.float32)

# linear sRGB -> CIE XYZ (D65)
M_RGB_XYZ = np.array([[0.4124564, 0.3575761, 0.1804375],
                      [0.2126729, 0.7151522, 0.0721750],
                      [0.0193339, 0.1191920, 0.9503041]])
WHITE_D65 = np.array([0.95047, 1.0, 1.08883])
LUMA709 = np.array([0.2126, 0.7152, 0.0722], dtype=np.float32)


def linear(rgb8):
    """uint8 sRGB (..., 3) -> float32 linear light in [0, 1]."""
    return SRGB_TO_LINEAR[rgb8]


def luminance(rgb8):
    """Relative luminance Y in [0, 1] (WCAG / BT.709 weights on linear light)."""
    lin = SRGB_TO_LINEAR[rgb8]
    return lin[..., 0] * LUMA709[0] + lin[..., 1] * LUMA709[1] + lin[..., 2] * LUMA709[2]


def linear_to_srgb8(lin):
    """float linear light -> uint8 sRGB code values (for fixtures and probes)."""
    lin = np.clip(lin, 0.0, 1.0)
    c = np.where(lin <= 0.0031308, lin * 12.92, 1.055 * np.power(lin, 1 / 2.4) - 0.055)
    return np.clip(np.round(c * 255.0), 0, 255).astype(np.uint8)


def _f(t):
    d = 6.0 / 29.0
    return np.where(t > d ** 3, np.cbrt(t), t / (3 * d * d) + 4.0 / 29.0)


def lab_from_linear(lin):
    """Linear sRGB (..., 3) -> CIE L*a*b* (D65), float64."""
    xyz = np.asarray(lin, dtype=np.float64) @ M_RGB_XYZ.T / WHITE_D65
    fx, fy, fz = _f(xyz[..., 0]), _f(xyz[..., 1]), _f(xyz[..., 2])
    return np.stack([116.0 * fy - 16.0, 500.0 * (fx - fy), 200.0 * (fy - fz)], axis=-1)


def lab(rgb8):
    """uint8 sRGB (..., 3) -> CIE L*a*b* (D65)."""
    return lab_from_linear(SRGB_TO_LINEAR[np.asarray(rgb8)])


def lab_from_float_srgb(rgb):
    """float sRGB code values in [0, 255] (e.g. bilinear samples) -> Lab."""
    c = np.clip(np.asarray(rgb, dtype=np.float64) / 255.0, 0.0, 1.0)
    lin = np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
    return lab_from_linear(lin)


def lch(lab_):
    """Lab -> (L, C, h in degrees [0, 360))."""
    L, a, b = lab_[..., 0], lab_[..., 1], lab_[..., 2]
    return L, np.hypot(a, b), np.degrees(np.arctan2(b, a)) % 360.0


def hue_delta(h1, h2):
    """Signed smallest difference h2 - h1 in degrees, in (-180, 180]."""
    d = (np.asarray(h2) - np.asarray(h1) + 180.0) % 360.0 - 180.0
    return d


def de76(lab1, lab2):
    return np.linalg.norm(np.asarray(lab1, dtype=np.float64) - np.asarray(lab2, dtype=np.float64), axis=-1)


def de2000(lab1, lab2, kL=1.0, kC=1.0, kH=1.0):
    """CIEDE2000 between two Lab arrays of the same shape (..., 3)."""
    lab1 = np.asarray(lab1, dtype=np.float64)
    lab2 = np.asarray(lab2, dtype=np.float64)
    L1, a1, b1 = lab1[..., 0], lab1[..., 1], lab1[..., 2]
    L2, a2, b2 = lab2[..., 0], lab2[..., 1], lab2[..., 2]
    C1, C2 = np.hypot(a1, b1), np.hypot(a2, b2)
    Cm = (C1 + C2) / 2.0
    G = 0.5 * (1.0 - np.sqrt(Cm ** 7 / (Cm ** 7 + 25.0 ** 7)))
    a1p, a2p = (1.0 + G) * a1, (1.0 + G) * a2
    C1p, C2p = np.hypot(a1p, b1), np.hypot(a2p, b2)
    h1p = np.degrees(np.arctan2(b1, a1p)) % 360.0
    h2p = np.degrees(np.arctan2(b2, a2p)) % 360.0
    h1p = np.where((a1p == 0) & (b1 == 0), 0.0, h1p)
    h2p = np.where((a2p == 0) & (b2 == 0), 0.0, h2p)

    dLp = L2 - L1
    dCp = C2p - C1p
    prod = C1p * C2p
    dh = h2p - h1p
    dh = np.where(dh > 180.0, dh - 360.0, np.where(dh < -180.0, dh + 360.0, dh))
    dh = np.where(prod == 0, 0.0, dh)
    dHp = 2.0 * np.sqrt(prod) * np.sin(np.radians(dh) / 2.0)

    Lpm = (L1 + L2) / 2.0
    Cpm = (C1p + C2p) / 2.0
    hsum = h1p + h2p
    habs = np.abs(h1p - h2p)
    hpm = np.where(prod == 0, hsum,
                   np.where(habs <= 180.0, hsum / 2.0,
                            np.where(hsum < 360.0, (hsum + 360.0) / 2.0, (hsum - 360.0) / 2.0)))
    T = (1.0 - 0.17 * np.cos(np.radians(hpm - 30.0)) + 0.24 * np.cos(np.radians(2.0 * hpm))
         + 0.32 * np.cos(np.radians(3.0 * hpm + 6.0)) - 0.20 * np.cos(np.radians(4.0 * hpm - 63.0)))
    dtheta = 30.0 * np.exp(-(((hpm - 275.0) / 25.0) ** 2))
    Rc = 2.0 * np.sqrt(Cpm ** 7 / (Cpm ** 7 + 25.0 ** 7))
    Sl = 1.0 + (0.015 * (Lpm - 50.0) ** 2) / np.sqrt(20.0 + (Lpm - 50.0) ** 2)
    Sc = 1.0 + 0.045 * Cpm
    Sh = 1.0 + 0.015 * Cpm * T
    Rt = -np.sin(np.radians(2.0 * dtheta)) * Rc
    tl, tc, th = dLp / (kL * Sl), dCp / (kC * Sc), dHp / (kH * Sh)
    return np.sqrt(tl ** 2 + tc ** 2 + th ** 2 + Rt * tc * th)


def contrast_ratio(y1, y2):
    """WCAG contrast ratio of two relative luminances."""
    hi, lo = max(y1, y2), min(y1, y2)
    return (hi + 0.05) / (lo + 0.05)
