#!/usr/bin/env python3
"""Hosted PREVIEW build of the integrated Release Console (for the owner to play on a phone).

  python3 dev/preview_build.py OUT_DIR [--pilot]

Builds the fully integrated release (I1-I3 + every src/eos module; with --pilot also the pilot
modules) in a scratch copy, then:
  * production-minified bundle -> OUT_DIR/app.js
  * character images (bubble-expressions/*.webp, 512 px) resized to 256 px and packed into a few
    JSON bundles OUT_DIR/img/pack-N.json, because the hosting page may only load same-origin files
    and a single page may publish at most ~500 files;
  * emotionSrc() in the scratch copy is patched to look images up in window.__TS_IMG (blob URLs made
    from the packs) and to fall back to the GitHub raw URL used in Framer.
The release sources in src/ are never modified.
"""
import base64, glob, io, json, os, shutil, subprocess, sys
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
REPO = os.path.dirname(ROOT)
out = os.path.abspath(sys.argv[1]); pilot = "--pilot" in sys.argv
scratch_dev = out + "_scratch"
if pilot:
    cmd = [sys.executable, os.path.join(HERE, "pilot_build.py"), "--dev-dir", scratch_dev]
else:
    mods = ",".join(sorted(os.path.basename(p) for p in glob.glob(os.path.join(ROOT, "src", "eos", "*.jsx"))))
    cmd = [sys.executable, os.path.join(HERE, "eos_integrate.py"), "--dev-dir", scratch_dev, "--modules", mods]
r = subprocess.run(cmd, capture_output=True, text=True)
if r.returncode:
    sys.exit(r.stdout[-2000:] + r.stderr[-2000:])
comp = open(os.path.join(scratch_dev, "comp.jsx"), encoding="utf-8").read()
old = '`${EXPRESSION_BASE}${bubble}_E${String(mood).padStart(2, "0")}.webp`'
assert comp.count(old) == 1, "emotionSrc anchor"
comp = comp.replace(old, '((f) => (typeof window !== "undefined" && window.__TS_IMG && window.__TS_IMG[f]) || EXPRESSION_BASE + f)(`${bubble}_E${String(mood).padStart(2, "0")}.webp`)')
os.makedirs(os.path.join(out, "img"), exist_ok=True)
open(os.path.join(scratch_dev, "comp.jsx"), "w", encoding="utf-8").write(comp)
esb = os.path.join(HERE, "node_modules", ".bin", "esbuild")
r = subprocess.run([esb, "main.jsx", "--bundle", "--minify", "--outfile=" + os.path.join(out, "app.js"),
                    "--jsx=automatic", "--define:process.env.NODE_ENV=\"production\"", "--log-level=warning"], cwd=scratch_dev)
if r.returncode:
    sys.exit("esbuild failed")
packs, cur, size = [], {}, 0
for p in sorted(glob.glob(os.path.join(REPO, "bubble-expressions", "*.webp"))):
    im = Image.open(p).convert("RGBA").resize((256, 256), Image.LANCZOS)
    buf = io.BytesIO(); im.save(buf, "WEBP", quality=82, method=6)
    b = base64.b64encode(buf.getvalue()).decode()
    cur[os.path.basename(p)] = b; size += len(b)
    if size > 6_000_000:
        packs.append(cur); cur, size = {}, 0
if cur:
    packs.append(cur)
for i, pk in enumerate(packs):
    json.dump(pk, open(os.path.join(out, "img", f"pack-{i + 1}.json"), "w"))
meta = {"packs": [f"img/pack-{i + 1}.json" for i in range(len(packs))], "images": sum(len(p) for p in packs)}
json.dump(meta, open(os.path.join(out, "img", "index.json"), "w"))
shutil.rmtree(scratch_dev, ignore_errors=True)
print(json.dumps({"app_kb": os.path.getsize(os.path.join(out, "app.js")) // 1024, **meta,
                  "pack_mb": [round(os.path.getsize(os.path.join(out, m)) / 1e6, 1) for m in meta["packs"]]}))
