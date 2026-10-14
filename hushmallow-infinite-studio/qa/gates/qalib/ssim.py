"""SSIM (Wang, Bovik, Sheikh and Simoncelli 2004) in OpenCV/numpy.

The standard parameterisation: an 11x11 Gaussian window with sigma 1.5,
K1 = 0.01, K2 = 0.03, dynamic range L = 255. Inputs are 2-D arrays (one
channel). ssim() returns the mean of the SSIM map, optionally over a mask
(the map is computed on the full arrays first, so masked pixels still see
their real neighbourhood).
"""
import cv2
import numpy as np

K1, K2, L = 0.01, 0.03, 255.0
C1, C2 = (K1 * L) ** 2, (K2 * L) ** 2


def _blur(x):
    return cv2.GaussianBlur(x, (11, 11), 1.5, borderType=cv2.BORDER_REFLECT)


def ssim_map(a, b):
    """SSIM map of two equally sized 2-D arrays (any numeric dtype, 0..255 scale)."""
    a = np.asarray(a, dtype=np.float64)
    b = np.asarray(b, dtype=np.float64)
    if a.shape != b.shape or a.ndim != 2:
        raise ValueError(f'ssim needs two equal 2-D arrays, got {a.shape} and {b.shape}')
    mu_a, mu_b = _blur(a), _blur(b)
    aa, bb, ab = _blur(a * a) - mu_a ** 2, _blur(b * b) - mu_b ** 2, _blur(a * b) - mu_a * mu_b
    num = (2 * mu_a * mu_b + C1) * (2 * ab + C2)
    den = (mu_a ** 2 + mu_b ** 2 + C1) * (aa + bb + C2)
    return num / den


def ssim(a, b, mask=None):
    m = ssim_map(a, b)
    if mask is None:
        return float(m.mean())
    mask = np.asarray(mask, dtype=bool)
    if not mask.any():
        raise ValueError('ssim mask selects no pixels')
    return float(m[mask].mean())
