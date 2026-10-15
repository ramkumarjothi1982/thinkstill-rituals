"""Fault media for the QA fixtures: the approved v2 with exactly one fault.

    python3 -I qa/fixtures/make_fixtures.py <job.json>

job.json (written by qa/fixtures/build.mjs):
  {src, out, op, params, duration, stamp, geometryFile, logo: {x, y, w, h, frames}, mark: {png, x, y}}

Video ops decode the source once, change the frames the fault touches and
re-encode the whole film (x264 High, CRF 14, BT.709, faststart) with the
source's audio stream copied. Audio ops copy the video stream and re-encode
only the audio (AAC 192 kb/s, 48 kHz stereo). Every output keeps the source's
provenance stamp, duration and frame count, so a fixture differs from the
approved film by its one fault (and the encoder generation) only.

Ops (frames are 0-based, boxes in design px = video px here):
  strobe        frames [t0, t0+dur): 2 on / 2 off, 'on' frames blended `mix` toward white
  white-rect    one frame: box filled white (a single white flash)
  time-jump     frames from..N-1 replaced by src..: the loop no longer closes
  text          burned text lines (white, dark shadow) at x, y for [t0, t0+dur)
  upscale-body  the Mallow (its silhouette from the geometry, minus glass cards and
                text) re-sampled from a `factor` times smaller copy on every frame
  recolour-body the Mallow's hue rotated by `deg` (Lab LCh) on every frame, same mask
  tint-logo     the logo card region multiplied by an RGB tint while the card shows
  rescale-logo  the logo card region scaled by `factor` about its centre while it shows
  stripes       moving diagonal stripes blended over a band of the frame for [t0, t0+dur)
  mark          the engine's DRAFT corner mark composited on every frame
  reencode      no change (a duplicate render)
  ring-fill     a ring `inner`..`outer` px around the Mallow's silhouette painted, on every
                frame, in the Mallow's own mean colour (its interior eroded 20 px, outside
                the face box), sparing cards, text and the logo card (FU-5)
  world-hue     everything but the Mallow (dilated 8 px), its cards, its text and the logo
                card hue-rotated by `deg` in Lab LCh, lightness kept (FU-5)
  fade-text     the overlay text rows, while readable (alpha >= 0.9), washed out to `keep`
                of their contrast against their box's mean colour (FU-5)
  remux         container only: the source stream-copied without faststart (FU-5)
  loudness      audio: gain then a limiter (a hot mix)
  delay         audio: circularly delayed by `ms`
"""
import json
import os
import subprocess
import sys

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(os.path.dirname(HERE), 'gates'))

from qalib.frames import VideoReader  # noqa: E402
from qalib import color  # noqa: E402

FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
SR = 48000


def encoder(out, src, w, h, stamp, duration, audio_src=None):
    """An x264 encoder process reading raw RGB on stdin; audio from src (copied) or audio_src (wav)."""
    a_in = ['-i', audio_src] if audio_src else ['-i', src]
    a_codec = ['-c:a', 'aac', '-b:a', '192k', '-ar', str(SR), '-ac', '2'] if audio_src else ['-c:a', 'copy']
    cmd = ['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{w}x{h}', '-r', '30', '-i', '-', *a_in,
           '-map', '0:v:0', '-map', '1:a:0', '-vf', 'scale=out_color_matrix=bt709:out_range=tv,format=yuv420p',
           '-c:v', 'libx264', '-preset', 'medium', '-crf', '14', '-tune', 'film', '-profile:v', 'high', '-threads', '3',
           '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', *a_codec,
           '-t', f'{duration:.6f}', '-metadata', f'comment={stamp}', '-movflags', '+faststart', out]
    return subprocess.Popen(cmd, stdin=subprocess.PIPE)


def body_mask(fr, w, h, erode=6):
    """The Mallow's silhouette on screen minus glass cards and text boxes (uint8 0/1)."""
    m = np.zeros((h, w), np.uint8)
    poly = np.asarray(fr['contour'], np.float32).reshape(-1, 2).astype(np.int32)
    cv2.fillPoly(m, [poly], 1)
    if erode:
        m = cv2.erode(m, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * erode + 1,) * 2))
    for b in [g[:4] for g in fr['glass']] + [t['box'] for t in fr['text']]:
        x0, y0, x1, y1 = (int(round(v)) for v in b)
        m[max(0, y0 - 8):max(0, y1 + 8), max(0, x0 - 8):max(0, x1 + 8)] = 0
    return m


def boxes_mask(boxes, w, h, pad):
    """uint8 mask of axis-aligned boxes (design px = video px), each grown by pad."""
    m = np.zeros((h, w), np.uint8)
    for b in boxes:
        x0, y0, x1, y1 = (int(round(v)) for v in b[:4])
        m[max(0, y0 - pad):max(0, y1 + pad), max(0, x0 - pad):max(0, x1 + pad)] = 1
    return m


def silhouette(fr, w, h):
    m = np.zeros((h, w), np.uint8)
    cv2.fillPoly(m, [np.asarray(fr['contour'], np.float32).reshape(-1, 2).astype(np.int32)], 1)
    return m


def disk(r):
    return cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * r + 1,) * 2)


def logo_box(logo):
    return [logo['x'], logo['y'], logo['x'] + logo['w'], logo['y'] + logo['h']] if logo else None


def feather(mask, r=3):
    return cv2.GaussianBlur(mask.astype(np.float32), (0, 0), r)[..., None]


def text_layer(lines, x, y, size, w, h):
    """White text with a soft dark shadow (like the overlay's own type), as RGBA."""
    font = ImageFont.truetype(FONT, size)
    shadow = Image.new('L', (w, h), 0)
    ds = ImageDraw.Draw(shadow)
    for k, line in enumerate(lines):
        ds.text((x, y + k * int(size * 1.25)), line, font=font, fill=200)
    shadow = shadow.filter(ImageFilter.GaussianBlur(size * 0.18))
    txt = Image.new('L', (w, h), 0)
    dt = ImageDraw.Draw(txt)
    for k, line in enumerate(lines):
        dt.text((x, y + k * int(size * 1.25)), line, font=font, fill=255)
    return np.asarray(shadow, np.float32) / 255.0, np.asarray(txt, np.float32) / 255.0


def video_op(job):
    op, P = job['op'], job.get('params', {})
    reader = VideoReader(job['src'], threads=2)
    w, h = reader.width, reader.height
    geo = None
    if job.get('geometryFile'):
        with open(job['geometryFile']) as fh:
            geo = json.load(fh)
    enc = encoder(job['out'], job['src'], w, h, job['stamp'], job['duration'])
    if op == 'time-jump':                  # keep the source frames the jump repeats (decoded once)
        keep = {}
        need = set(range(P['src'], P['src'] + (int(job['duration'] * 30) - P['from'])))
    text = None
    if op == 'text':
        text = text_layer(P['lines'], P['x'], P['y'], P['size'], w, h)
    mark = None
    if op == 'mark':
        M = np.asarray(Image.open(job['mark']['png']).convert('RGBA'), np.float32) / 255.0
        mark = (M, job['mark']['x'], job['mark']['y'])
    logo = job.get('logo')
    for i, f in reader:
        f = f.copy()
        t = i / 30.0
        if op == 'strobe' and P['t0'] <= t < P['t0'] + P['dur'] and ((i - int(P['t0'] * 30)) // 2) % 2 == 0:
            f = np.clip(f.astype(np.float32) * (1 - P['mix']) + 255.0 * P['mix'], 0, 255).astype(np.uint8)
        elif op == 'white-rect' and i == P['frame']:
            x0, y0, x1, y1 = P['box']
            f[y0:y1, x0:x1] = 255
        elif op == 'text' and P['t0'] <= t < P['t0'] + P['dur']:
            sh, tx = text
            g = f.astype(np.float32)
            g = g * (1 - 0.7 * sh[..., None]) + np.array([8, 5, 34], np.float32) * 0.7 * sh[..., None]
            g = g * (1 - tx[..., None]) + 255.0 * tx[..., None]
            f = np.clip(g, 0, 255).astype(np.uint8)
        elif op in ('upscale-body', 'recolour-body'):
            fr = geo['perFrame'][i]
            m = body_mask(fr, w, h)
            ys, xs = np.nonzero(m)
            if len(ys):
                y0, y1, x0, x1 = max(0, ys.min() - 4), min(h, ys.max() + 5), max(0, xs.min() - 4), min(w, xs.max() + 5)
                crop = f[y0:y1, x0:x1]
                if op == 'upscale-body':
                    k = P['factor']
                    small = cv2.resize(crop, (max(1, int((x1 - x0) / k)), max(1, int((y1 - y0) / k))), interpolation=cv2.INTER_AREA)
                    new = cv2.resize(small, (x1 - x0, y1 - y0), interpolation=cv2.INTER_LINEAR)
                else:
                    lab = color.lab(crop)
                    L, C, hdeg = color.lch(lab)
                    hr = np.radians(hdeg + P['deg'])
                    lab2 = np.stack([L, C * np.cos(hr), C * np.sin(hr)], axis=-1)
                    new = lab_to_srgb8(lab2)
                a = feather(m[y0:y1, x0:x1])
                f[y0:y1, x0:x1] = np.clip(crop * (1 - a) + new * a, 0, 255).astype(np.uint8)
        elif op in ('tint-logo', 'rescale-logo') and logo and t >= P['from']:
            x, y, lw, lh = logo['x'], logo['y'], logo['w'], logo['h']
            crop = f[y:y + lh, x:x + lw].astype(np.float32)
            if op == 'tint-logo':
                new = crop * np.asarray(P['rgb'], np.float32)
            else:
                k = P['factor']
                big = cv2.resize(crop, (int(round(lw * k)), int(round(lh * k))), interpolation=cv2.INTER_CUBIC)
                oy, ox = (big.shape[0] - lh) // 2, (big.shape[1] - lw) // 2
                new = big[oy:oy + lh, ox:ox + lw]
            f[y:y + lh, x:x + lw] = np.clip(new, 0, 255).astype(np.uint8)
        elif op == 'stripes' and P['t0'] <= t < P['t0'] + P['dur']:
            y0, y1 = P['band']
            yy, xx = np.mgrid[y0:y1, 0:w]
            phase = (xx + yy + P['speed'] * (i - int(P['t0'] * 30))) * (2 * np.pi / P['period'])
            s = (0.5 + 0.5 * np.sin(phase))[..., None]
            g = f[y0:y1].astype(np.float32)
            f[y0:y1] = np.clip(g * (1 - P['mix'] * s) + 255.0 * P['mix'] * s, 0, 255).astype(np.uint8)
        elif op == 'ring-fill':
            fr = geo['perFrame'][i]
            sil = silhouette(fr, w, h)
            spare = boxes_mask([g[:4] for g in fr['glass']] + [t['box'] for t in fr['text']] + ([logo_box(logo)] if logo else []), w, h, 10)
            ring = cv2.dilate(sil, disk(P['outer'])) & (1 - cv2.dilate(sil, disk(P['inner']))) & (1 - spare)
            inside = cv2.erode(sil, disk(20)) & (1 - spare)
            fb = [int(round(v)) for v in fr['faceBox']]
            inside[max(0, fb[1]):max(0, fb[3]), max(0, fb[0]):max(0, fb[2])] = 0
            if inside.any() and ring.any():
                col = f[inside.astype(bool)].astype(np.float32).mean(axis=0)
                a = feather(ring, 2)
                f = np.clip(f.astype(np.float32) * (1 - a) + col * a, 0, 255).astype(np.uint8)
        elif op == 'world-hue':
            fr = geo['perFrame'][i]
            keep = cv2.dilate(silhouette(fr, w, h), disk(8)) | boxes_mask([g[:4] for g in fr['glass']], w, h, 24) \
                | boxes_mask([t['box'] for t in fr['text']] + ([logo_box(logo)] if logo else []), w, h, 18)
            lab = color.lab(f)
            L, C, hdeg = color.lch(lab)
            hr = np.radians(hdeg + P['deg'])
            new = lab_to_srgb8(np.stack([L, C * np.cos(hr), C * np.sin(hr)], axis=-1))
            a = feather(1 - keep, 2)
            f = np.clip(f.astype(np.float32) * (1 - a) + new * a, 0, 255).astype(np.uint8)
        elif op == 'fade-text':
            fr = geo['perFrame'][i]
            lb = logo_box(logo)
            for t in fr['text']:
                if t['kind'] != 'overlay' or t['alpha'] < 0.9:
                    continue
                x0, y0, x1, y1 = (int(round(v)) for v in t['box'])
                x0, y0, x1, y1 = max(0, x0 - 8), max(0, y0 - 8), min(w, x1 + 8), min(h, y1 + 8)
                reg = f[y0:y1, x0:x1].astype(np.float32)
                mean = reg.reshape(-1, 3).mean(axis=0)
                new = mean + (reg - mean) * P['keep']
                if lb:                                       # never touch the logo card
                    yy, xx = np.mgrid[y0:y1, x0:x1]
                    inlogo = ((xx >= lb[0]) & (xx < lb[2]) & (yy >= lb[1]) & (yy < lb[3]))[..., None]
                    new = np.where(inlogo, reg, new)
                f[y0:y1, x0:x1] = np.clip(new, 0, 255).astype(np.uint8)
        elif op == 'mark':
            M, mx, my = mark
            mh, mw = M.shape[:2]
            a = M[..., 3:4]
            reg = f[my:my + mh, mx:mx + mw].astype(np.float32)
            f[my:my + mh, mx:mx + mw] = np.clip(M[..., :3] * 255.0 * a + reg * (1 - a), 0, 255).astype(np.uint8)
        if op == 'time-jump':
            if i in need:
                keep[i] = f
            if i >= P['from']:
                f = keep[P['src'] + (i - P['from'])]
        enc.stdin.write(np.ascontiguousarray(f).tobytes())
    enc.stdin.close()
    if enc.wait() != 0:
        raise SystemExit(f'encoder failed for {job["out"]}')
    if reader.errors:
        raise SystemExit(f'decode errors in {job["src"]}: {reader.errors[:2]}')


def lab_to_srgb8(lab):
    L, a, b = lab[..., 0], lab[..., 1], lab[..., 2]
    fy = (L + 16) / 116
    fx, fz = fy + a / 500, fy - b / 200
    d = 6 / 29
    finv = lambda t: np.where(t > d, t ** 3, 3 * d * d * (t - 4 / 29))
    xyz = np.stack([finv(fx), finv(fy), finv(fz)], axis=-1) * color.WHITE_D65
    lin = xyz @ np.linalg.inv(color.M_RGB_XYZ).T
    return color.linear_to_srgb8(lin).astype(np.float32)


def audio_op(job):
    op, P = job['op'], job.get('params', {})
    tmp = job['out'] + '.wav'
    if op == 'loudness':
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', job['src'], '-map', '0:a:0', '-t', f'{job["duration"]:.6f}',
                        '-af', f'volume={P["gainDb"]}dB,alimiter=limit={P["limit"]}:level=false', '-c:a', 'pcm_f32le', tmp], check=True)
    elif op == 'delay':
        raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', job['src'], '-map', '0:a:0', '-t', f'{job["duration"]:.6f}', '-f', 'f32le', '-ac', '2', '-ar', str(SR), '-'],
                             check=True, capture_output=True).stdout
        x = np.frombuffer(raw, dtype='<f4').reshape(-1, 2)
        x = np.roll(x, int(round(P['ms'] / 1000 * SR)), axis=0)          # circular: the film loops
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ac', '2', '-ar', str(SR), '-i', '-', '-c:a', 'pcm_f32le', tmp],
                       input=np.ascontiguousarray(x).tobytes(), check=True)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', job['src'], '-i', tmp, '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'copy',
                    '-c:a', 'aac', '-b:a', '192k', '-ar', str(SR), '-ac', '2', '-t', f'{job["duration"]:.6f}',
                    '-metadata', f'comment={job["stamp"]}', '-movflags', '+faststart', job['out']], check=True)
    os.remove(tmp)


def remux_op(job):
    """Container-only faults: the source stream-copied (video and audio untouched)."""
    P = job.get('params', {})
    flags = ['-movflags', '+faststart'] if P.get('faststart', True) else []
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', job['src'], '-map', '0', '-c', 'copy', '-metadata', f'comment={job["stamp"]}', *flags, job['out']], check=True)


if __name__ == '__main__':
    with open(sys.argv[1]) as fh:
        job = json.load(fh)
    os.makedirs(os.path.dirname(job['out']), exist_ok=True)
    if job['op'] in ('loudness', 'delay'):
        audio_op(job)
    elif job['op'] == 'remux':
        remux_op(job)
    else:
        video_op(job)
    print(job['out'])
