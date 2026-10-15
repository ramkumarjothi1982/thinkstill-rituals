"""Original vs improved, for review.

    python3 -I tools/compare-sbs.py <v1.mp4> <v2.mp4> <out dir> [--font <ttf>]

Writes:
  side-by-side.mp4  v1 | v2 at the same playhead (1080 × 960), labelled; the improved version's sound
  a-b.mp4           v1 then v2 (each with its own soundtrack), 1080 × 1920, a one-second card between
"""
import os, subprocess, sys

v1, v2, out = sys.argv[1], sys.argv[2], sys.argv[3]
font = sys.argv[sys.argv.index('--font') + 1] if '--font' in sys.argv else '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
os.makedirs(out, exist_ok=True)


def run(a):
    p = subprocess.run(a, capture_output=True, text=True)
    if p.returncode:
        raise SystemExit(p.stderr[-2000:])


label = lambda t: (f"drawbox=x=0:y=0:w=iw:h=64:color=0x0e0b26@0.72:t=fill,drawtext=fontfile='{font}':text='{t}':fontcolor=white:fontsize=30:x=(w-tw)/2:y=17")
run(['ffmpeg', '-y', '-v', 'error', '-i', v1, '-i', v2, '-filter_complex',
     f"[0:v]scale=540:960,{label('v1  original')}[a];[1:v]scale=540:960,{label('v2  improved')}[b];[a][b]hstack=inputs=2,format=yuv420p[v]",
     '-map', '[v]', '-map', '1:a', '-c:v', 'libx264', '-preset', 'slow', '-crf', '20', '-profile:v', 'high', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart',
     os.path.join(out, 'side-by-side.mp4')])
card = lambda t: (f"color=c=0x0e0b26:s=1080x1920:d=1:r=30,drawtext=fontfile='{font}':text='{t}':fontcolor=white:fontsize=64:x=(w-tw)/2:y=(h-th)/2,format=yuv420p")
run(['ffmpeg', '-y', '-v', 'error', '-f', 'lavfi', '-i', card('v1  original'), '-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo:d=1', '-i', v1,
     '-f', 'lavfi', '-i', card('v2  improved'), '-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo:d=1', '-i', v2, '-filter_complex',
     '[2:v]scale=1080:1920,fps=30,format=yuv420p[a];[5:v]scale=1080:1920,fps=30,format=yuv420p[b];[0:v][1:a][a][2:a][3:v][4:a][b][5:a]concat=n=4:v=1:a=1[v][au]',
     '-map', '[v]', '-map', '[au]', '-c:v', 'libx264', '-preset', 'slow', '-crf', '21', '-profile:v', 'high', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart',
     os.path.join(out, 'a-b.mp4')])
print('ok')
