#!/usr/bin/env python3
"""Concatenate the Framer component sources into ONE paste-able file.

Order: src/00_arcade.jsx (original arcade, owns the imports)
       src/eos/*.jsx      (Emotional OS modules, sorted by filename)
       src/99_pixar.jsx   (Pixar cinematic wrapper = export default)
Output: ThinkStillReleaseArcade_EOS_FULL.txt (+ dev/comp.jsx for the harness)
Then compile-checks the result with esbuild.
"""
import glob, os, subprocess, sys
here = os.path.dirname(os.path.abspath(__file__))
parts = [os.path.join(here, "src", "00_arcade.jsx")]
parts += sorted(glob.glob(os.path.join(here, "src", "eos", "*.jsx")))
parts += [os.path.join(here, "src", "99_pixar.jsx")]
chunks = []
for p in parts:
    body = open(p).read().strip()
    if p != parts[0]:
        bad = [l for l in body.splitlines() if l.startswith("import ")]
        if bad:
            sys.exit(f"{p}: modules must not have import lines (shared file scope): {bad[0]}")
    chunks.append(f"// ===== {os.path.relpath(p, here)} =====\n" + body if p != parts[0] else body)
out = "\n\n".join(chunks) + "\n"
assert out.count("export default") == 1, "exactly one export default expected"
dst = os.path.join(here, "ThinkStillReleaseArcade_EOS_FULL.txt")
open(dst, "w").write(out)
open(os.path.join(here, "dev", "comp.jsx"), "w").write(out)
r = subprocess.run(["npx", "--no-install", "esbuild", "main.jsx", "--bundle", "--outfile=out.js",
                    "--jsx=automatic", "--define:process.env.NODE_ENV=\"development\"", "--log-level=warning"],
                   cwd=os.path.join(here, "dev"))
if r.returncode: sys.exit("esbuild failed")
print(f"OK {dst} ({len(out)//1024} KB, {len(parts)} parts)")
