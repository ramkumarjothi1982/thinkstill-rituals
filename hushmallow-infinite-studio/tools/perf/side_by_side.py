"""Full-video side-by-side for the owner (M0 gate): exact (left) vs final (right).

    python3 -I tools/perf/side_by_side.py <exact.mp4> <final.mp4> <out.mp4> [--preview] [--audio exact|final]

Both videos are 1080x1920 at 30 fps and the same length. Each is labelled at the
top ("A  exact (approved v2)" / "B  final profile (WP-02)").
  full     2160x1920, x264 CRF 16, every frame at 1:1 (the owner can pause anywhere)
  --preview  1080x960 (each side halved), x264 CRF 24: a small copy for the docs
The audio track is taken from one of the two (default: final).
"""
import subprocess, sys

args = [a for a in sys.argv[1:] if not a.startswith('--')]
A, B, OUT = args[:3]
preview = '--preview' in sys.argv
audio = 'final'
if '--audio' in sys.argv:
    audio = sys.argv[sys.argv.index('--audio') + 1]

FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
w, h = (540, 960) if preview else (1080, 1920)
fs = 22 if preview else 40


def label(text):
    return (f"drawtext=fontfile={FONT}:text='{text}':x=(w-text_w)/2:y={fs}:fontsize={fs}:fontcolor=white:"
            f"box=1:boxcolor=0x0e0c18@0.6:boxborderw={fs // 3}")


graph = (f"[0:v]scale={w}:{h}:flags=lanczos,{label('A  exact (approved v2)')}[a];"
         f"[1:v]scale={w}:{h}:flags=lanczos,{label('B  final profile (WP-02)')}[b];"
         f"[a][b]hstack=inputs=2,format=yuv420p[v]")
cmd = ['ffmpeg', '-y', '-hide_banner', '-loglevel', 'error', '-i', A, '-i', B, '-filter_complex', graph,
       '-map', '[v]', '-map', f"{1 if audio == 'final' else 0}:a?",
       '-c:v', 'libx264', '-preset', 'slow', '-crf', '24' if preview else '16', '-pix_fmt', 'yuv420p',
       '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709',
       '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', OUT]
subprocess.run(cmd, check=True)
print(OUT)
