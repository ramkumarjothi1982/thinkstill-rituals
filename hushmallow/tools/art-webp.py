#!/usr/bin/env python3
"""Lossless WebP twins of the original Mallow art (what the app loads; the PNGs stay the source of truth).

    python3 hushmallow/tools/art-webp.py          # (re)write every twin and tools/art-webp.json
    python3 hushmallow/tools/art-webp.py --check  # only verify: exit 1 if a twin is missing, stale or not identical

Every PNG in assets/mallows/ and assets/rig/ gets a <name>.webp beside it: lossless (VP8L), with the colour of
fully transparent pixels kept ("exact"), so it decodes to exactly the same RGBA pixels as the PNG (checked here,
pixel by pixel). It is about a quarter smaller (pipzi's art and body: 674 KB -> 489 KB), which is what a phone
downloads before the Mallow appears. The PNGs are untagged sRGB and so are the twins (no colour profile on either side).
In Chromium (checked on all 22 pairs): a WebGL texture of the twin is bit-identical to the PNG's; drawn on a 2D canvas,
which premultiplies alpha, opaque pixels and every alpha value are identical and a semi-transparent edge pixel can
round differently by at most 2/255 (the decoder's premultiply, the same one the high-res WebP art already goes through).

tools/art-webp.json records each pair's sha256: tests/art-webp.test.mjs fails when a PNG changes without its twin
being rewritten here (or a twin is edited by hand), and when src/mallows/registry.js names a PNG again.
"""
import hashlib
import io
import json
import sys
from pathlib import Path

from PIL import Image

HERE = Path(__file__).resolve().parent.parent          # hushmallow/
FOLDERS = ['assets/mallows', 'assets/rig']
MANIFEST = HERE / 'tools' / 'art-webp.json'


def sha256(b):
    return hashlib.sha256(b).hexdigest()


def encode(png_path):
    im = Image.open(png_path)
    im.load()
    if im.info.get('icc_profile') or 'gamma' in im.info or 'srgb' in im.info:
        raise SystemExit(f'{png_path}: carries colour metadata; the twin would have to carry it too')
    im = im.convert('RGBA') if im.mode not in ('RGBA', 'RGB') else im
    buf = io.BytesIO()
    im.save(buf, 'WEBP', lossless=True, quality=100, method=6, exact=True)
    data = buf.getvalue()
    return im, data


def identical(im, data):
    back = Image.open(io.BytesIO(data))
    back.load()
    return back.mode == im.mode and back.size == im.size and back.tobytes() == im.tobytes()


def main():
    check = '--check' in sys.argv
    old = json.loads(MANIFEST.read_text()) if MANIFEST.exists() else {}
    out, problems = {}, []
    for folder in FOLDERS:
        for png in sorted((HERE / folder).glob('*.png')):
            rel_png = png.relative_to(HERE).as_posix()
            webp = png.with_suffix('.webp')
            rel_webp = webp.relative_to(HERE).as_posix()
            png_bytes = png.read_bytes()
            if check:
                if not webp.exists():
                    problems.append(f'{rel_webp}: missing'); continue
                im = Image.open(png); im.load()
                data = webp.read_bytes()
                if data[12:16] != b'VP8L':
                    problems.append(f'{rel_webp}: not lossless')
                if not identical(im if im.mode in ('RGBA', 'RGB') else im.convert('RGBA'), data):
                    problems.append(f'{rel_webp}: pixels differ from {rel_png}')
                rec = old.get(rel_webp, {})
                if rec.get('png_sha256') != sha256(png_bytes) or rec.get('webp_sha256') != sha256(data):
                    problems.append(f'{rel_webp}: tools/art-webp.json does not match (re-run tools/art-webp.py)')
                continue
            im, data = encode(png)
            if not identical(im, data):
                raise SystemExit(f'{rel_png}: the lossless WebP does not decode to the same pixels')
            webp.write_bytes(data)
            out[rel_webp] = {'from': rel_png, 'png_bytes': len(png_bytes), 'webp_bytes': len(data),
                             'png_sha256': sha256(png_bytes), 'webp_sha256': sha256(data)}
            print(f'{rel_webp}: {len(png_bytes)} -> {len(data)} bytes ({100 * len(data) / len(png_bytes):.0f}%), pixels identical')
    if check:
        for p in problems:
            print(p, file=sys.stderr)
        print(f'art-webp: {"ok" if not problems else f"{len(problems)} problem(s)"}')
        sys.exit(1 if problems else 0)
    MANIFEST.write_text(json.dumps(out, indent=1, sort_keys=True) + '\n')
    print(f'art-webp: {len(out)} twins, {MANIFEST.relative_to(HERE)}')


if __name__ == '__main__':
    main()
