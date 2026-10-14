"""Drawing helpers of the review pack, verbatim from the approved Noomi derivation
(tools/derive/legacy_noomi.py; tests/test_legacy.py checks the source is unchanged)."""
import numpy as np
import cv2


def _on_bg(rgba, bg=(38, 42, 56)):
    a = rgba[..., 3:4].astype(np.float64) / 255
    return np.round(rgba[..., :3] * a + np.array(bg) * (1 - a)).astype(np.uint8)


def _label(img, text, org=(10, 26), scale=0.7):
    img = np.ascontiguousarray(img)
    (tw, th), bl = cv2.getTextSize(text, cv2.FONT_HERSHEY_SIMPLEX, scale, 1)
    x, y = org
    y0, y1 = max(y - th - 6, 0), min(y + bl + 4, img.shape[0])
    x0, x1 = max(x - 6, 0), min(x + tw + 6, img.shape[1])
    img[y0:y1, x0:x1] = (img[y0:y1, x0:x1] * 0.35).astype(np.uint8)
    cv2.putText(img, text, org, cv2.FONT_HERSHEY_SIMPLEX, scale, (255, 255, 255), 1, cv2.LINE_AA)
    return img
