"""Shared measurement code for the QA gates (WP-05).

Everything here is plain numpy + OpenCV (no scikit-image, no libvmaf), so the
numbers are reproducible on the studio machine and explainable line by line:

  frames.py   one ffmpeg decode of a video, frame by frame, with decode errors
  color.py    sRGB <-> linear, relative luminance, CIE Lab (D65), dE76, dE2000
  ssim.py     SSIM (Wang et al. 2004, 11x11 Gaussian window, sigma 1.5)
  text.py     a glyph/line detector for burned-in text (safe zones, readability)
  geometry.py per-frame geometry computed from the direction by qa/gates/geometry.mjs
  thresholds.py  qa/gates/thresholds.json (every threshold, provisional tags, warn bands)
"""
