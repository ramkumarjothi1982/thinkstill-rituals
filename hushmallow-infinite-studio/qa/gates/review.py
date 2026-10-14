"""Review artefacts for the gallery, collected during QA's single decode.

  contact-sheet.jpg     a frame every 0.5 s with its time
  strip-gag.jpg         consecutive frames around the gag (every frame)
  strip-ritual.jpg      the ritual (every 3rd frame), from the direction's probes
  poster.jpg            the cover frame
Not a gate: it never fails. Windows come from the direction's probes when
there are any, else from fixed fractions of the film.
"""
import os

import cv2
import numpy as np
from PIL import Image, ImageDraw


class ReviewArtefacts:
    id = 'review'

    def __init__(self, ctx):
        self.ctx = ctx
        self.out = ctx.get('artefacts')
        fps, n = ctx['fps'], ctx['framesExpected']
        probes = {p['label']: p['t'] for p in (ctx.get('geometry') or {}).get('probes', [])}
        gag = probes.get('gag', 0.4)
        rit = probes.get('ritual-mid', 0.63 * n / fps)
        self.sheet = set(range(0, n, max(1, fps // 2)))
        self.gag = set(range(max(0, int((gag - 0.2) * fps)), min(n, int((gag + 1.2) * fps)), 1))
        self.rit = set(range(max(0, int((rit - 2.0) * fps)), min(n, int((rit + 2.0) * fps)), 3))
        self.poster = 0
        self.thumbs = {}

    def wants(self, i):
        return bool(self.out) and (i in self.sheet or i in self.gag or i in self.rit or i == self.poster)

    def frame(self, i, f):
        if i == self.poster:
            Image.fromarray(f).save(os.path.join(self.out, 'poster.jpg'), quality=90)
        self.thumbs[i] = cv2.resize(f, (216, 384), interpolation=cv2.INTER_AREA)

    def _grid(self, idx, cols, name, label):
        idx = sorted(i for i in idx if i in self.thumbs)
        if not idx:
            return None
        tw, th = 216, 384
        rows = (len(idx) + cols - 1) // cols
        sheet = Image.new('RGB', (cols * tw, rows * (th + 18)), (12, 12, 16))
        d = ImageDraw.Draw(sheet)
        fps = self.ctx['fps']
        for k, i in enumerate(idx):
            x, y = (k % cols) * tw, (k // cols) * (th + 18)
            sheet.paste(Image.fromarray(self.thumbs[i]), (x, y + 18))
            d.text((x + 4, y + 3), f'{i / fps:.2f}s f{i}', fill=(225, 225, 230))
        p = os.path.join(self.out, name)
        sheet.save(p, quality=86)
        return {'file': p, 'label': label}

    def result(self):
        if not self.out:
            return {'checks': {}, 'metrics': {}, 'artefacts': []}
        art = [a for a in (
            self._grid(self.sheet, 10, 'contact-sheet.jpg', 'contact sheet: a frame every 0.5 s'),
            self._grid(self.gag, 10, 'strip-gag.jpg', 'gag filmstrip: every frame'),
            self._grid(self.rit, 10, 'strip-ritual.jpg', 'ritual filmstrip: every 3rd frame'),
        ) if a]
        art.append({'file': os.path.join(self.out, 'poster.jpg'), 'label': 'cover frame'})
        return {'checks': {}, 'metrics': {}, 'artefacts': art}
