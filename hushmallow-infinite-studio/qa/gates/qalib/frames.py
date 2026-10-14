"""One ffmpeg decode of a video, frame by frame.

The QA suite decodes a video exactly once: pixels.py hands every frame to
every frame gate in turn. The decoder runs with `-v error`, so whatever it
prints on stderr is a decode error; the reader keeps those lines and the
frame count for G-FINAL delivery (zero decode errors, exact frame count),
which saves a second full decode.
"""
import json
import subprocess
import threading

import numpy as np


def probe(path):
    """ffprobe streams + format as a dict."""
    out = subprocess.run(['ffprobe', '-v', 'error', '-show_streams', '-show_format', '-of', 'json', path],
                         check=True, capture_output=True, text=True).stdout
    return json.loads(out)


def video_size(path):
    v = next(s for s in probe(path)['streams'] if s['codec_type'] == 'video')
    return int(v['width']), int(v['height'])


class VideoReader:
    """Iterate (index, HxWx3 uint8 RGB frame). After iteration: .frames, .errors."""

    def __init__(self, path, threads=2):
        self.path = path
        self.width, self.height = video_size(path)
        self.threads = threads
        self.frames = 0
        self.errors = []

    def __iter__(self):
        w, h = self.width, self.height
        size = w * h * 3
        p = subprocess.Popen(['ffmpeg', '-v', 'error', '-nostdin', '-threads', str(self.threads), '-i', self.path,
                              '-map', '0:v:0', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'],
                             stdout=subprocess.PIPE, stderr=subprocess.PIPE, bufsize=size * 2)
        err = []
        t = threading.Thread(target=lambda: err.extend(p.stderr.read().decode('utf8', 'replace').splitlines()), daemon=True)
        t.start()
        i = 0
        try:
            while True:
                buf = bytearray(size)
                mv = memoryview(buf)
                got = 0
                while got < size:
                    r = p.stdout.readinto(mv[got:])
                    if not r:
                        break
                    got += r
                if got < size:
                    if got:
                        err.append(f'truncated frame {i}: {got} of {size} bytes')
                    break
                yield i, np.frombuffer(buf, np.uint8).reshape(h, w, 3)
                i += 1
        finally:
            p.stdout.close()
            p.wait()
            t.join()
            self.frames = i
            self.errors = [e for e in err if e.strip()]
            if p.returncode not in (0, None):
                self.errors.append(f'ffmpeg exited {p.returncode}')


def read_frames(path, indices):
    """{index: frame} for a set of frame indices (one sequential decode)."""
    want = set(indices)
    out = {}
    if not want:
        return out
    last = max(want)
    for i, f in VideoReader(path):
        if i in want:
            out[i] = f.copy()
        if i >= last:
            break
    return out
