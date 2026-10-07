#!/usr/bin/env python3
"""Concatenate the Framer component sources into ONE paste-able file.

Order: src/00_arcade.jsx (original arcade, owns the imports)
       src/eos/*.jsx      (Emotional OS modules, sorted by filename)
       src/99_pixar.jsx   (Pixar cinematic wrapper = export default)
Then compile-checks the result with esbuild into a dev harness dir.

Default: writes ThinkStillReleaseArcade_EOS_FULL.txt and builds dev/out.js.
Isolated builds (for parallel agents, so they never clobber each other):
  python3 build.py --dev-dir /tmp/eos_mytask --modules 00_eos_core.jsx,30_eos_arrows.jsx
  -> only those eos modules are included, output goes to /tmp/eos_mytask/{comp.jsx,out.js,index.html}
     and the shared FULL.txt is NOT touched. Open file:///tmp/eos_mytask/index.html or use
     launch({ dir: "/tmp/eos_mytask" }) from dev/drive.mjs.
"""
import argparse, glob, os, re, shutil, subprocess, sys
here = os.path.dirname(os.path.abspath(__file__))
ap = argparse.ArgumentParser()
ap.add_argument("--dev-dir", default=None, help="isolated harness dir (default: framer/dev)")
ap.add_argument("--modules", default=None, help="comma list of src/eos file names to include (default: all)")
ap.add_argument("--no-compile", action="store_true")
a = ap.parse_args()

eos = sorted(glob.glob(os.path.join(here, "src", "eos", "*.jsx")))
if a.modules is not None:
    want = {m.strip() for m in a.modules.split(",") if m.strip()}
    missing = want - {os.path.basename(p) for p in eos}
    if missing:
        sys.exit(f"unknown modules: {sorted(missing)}")
    eos = [p for p in eos if os.path.basename(p) in want]
parts = [os.path.join(here, "src", "00_arcade.jsx")] + eos + [os.path.join(here, "src", "99_pixar.jsx")]
chunks = []
for i, p in enumerate(parts):
    body = open(p).read().strip()
    if i:
        bad = [l for l in body.splitlines() if l.startswith("import ")]
        if bad:
            sys.exit(f"{p}: modules must not have import lines (shared file scope): {bad[0]}")
        if p != parts[-1]:  # eos modules (99_pixar owns the single export default)
            exp = [l for l in body.splitlines() if re.match(r"^export\b", l)]
            if exp:
                sys.exit(f"{p}: eos modules must not export anything (Framer lists every export): {exp[0]}")
            lb = [l for l in body.splitlines() if re.search(r"\(\?<[=!]", l)]
            if lb:
                sys.exit(f"{p}: regex lookbehind is banned (SyntaxError on iOS Safari < 16.4): {lb[0].strip()[:90]}")
        body = f"// ===== {os.path.relpath(p, here)} =====\n" + body
    chunks.append(body)
out = "\n\n".join(chunks) + "\n"
if len(re.findall(r"^export default ", out, re.M)) != 1:
    sys.exit("exactly one `export default` line expected")

dev = os.path.join(here, "dev")
if a.dev_dir:
    d = os.path.abspath(a.dev_dir)
    os.makedirs(d, exist_ok=True)
    for f in ("index.html", "main.jsx"):
        shutil.copy(os.path.join(dev, f), os.path.join(d, f))
    nm = os.path.join(d, "node_modules")
    if not os.path.exists(nm):
        os.symlink(os.path.join(dev, "node_modules"), nm)
    target = d
else:
    target = dev
    dst = os.path.join(here, "ThinkStillReleaseArcade_EOS_FULL.txt")
    open(dst, "w").write(out)
open(os.path.join(target, "comp.jsx"), "w").write(out)
if not a.no_compile:
    r = subprocess.run([os.path.join(dev, "node_modules", ".bin", "esbuild"), "main.jsx", "--bundle",
                        "--outfile=out.js", "--jsx=automatic",
                        "--define:process.env.NODE_ENV=\"development\"", "--log-level=warning"], cwd=target)
    if r.returncode:
        sys.exit("esbuild failed")
print(f"OK {target} ({len(out)//1024} KB, {len(parts)} parts: {', '.join(os.path.basename(p) for p in parts)})")
