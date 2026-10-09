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


# ---- founder F8 / GAP P5.4-c: no dark masks behind bubble pictures or the user's words, ever again.
# Static lint over every CSS rule in the sources whose selector names a bubble / picture / word tag: a background
# with a dark, mostly opaque colour (luminance < .14 and alpha >= .5) fails the package build unless its fingerprint
# is in dark_mask_whitelist.json (each entry reviewed, with the reason). Isolated --dev-dir builds only warn.
def dark_mask_lint(parts):
    sel_re = re.compile(r"(?i)bubble|uniqWord|potato|tsStandard|MaterialImage|ThoughtLabel|tsBubbleText|ts-face|"
                        r"juggleBall|cleanseStone|ThoughtText|ExactUserText|thoughtToken|wordTag|BubbleFace|AutoEmotionPic")
    def dark(c):
        m = re.match(r"rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+%?))?\s*\)", c)
        if m:
            r, g, b = (float(m.group(i)) for i in (1, 2, 3))
            a = m.group(4) or "1"
            a = float(a[:-1]) / 100 if a.endswith("%") else float(a)
        else:
            h = c.lstrip("#")
            if len(h) in (3, 4):
                h = "".join(ch * 2 for ch in h)
            if len(h) not in (6, 8):
                return False
            r, g, b = (int(h[i:i + 2], 16) for i in (0, 2, 4))
            a = int(h[6:8], 16) / 255 if len(h) == 8 else 1
        return a >= 0.5 and (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 < 0.14
    col_re = re.compile(r"rgba?\([^)]*\)|#[0-9a-fA-F]{3,8}\b")
    import hashlib, json
    wl_path = os.path.join(here, "dark_mask_whitelist.json")
    wl = json.load(open(wl_path)) if os.path.exists(wl_path) else {}
    hits = []
    texts = []
    for p in parts:
        src = open(p).read()
        texts.append((p, src))
        gz = re.search(r"const CSS_GZIP_B64 = \[(.*?)\]", src, re.S)
        if gz:  # the arcade's compressed stylesheet is linted too
            import base64, gzip
            try:
                texts.append((p + "#CSS_GZIP_B64", gzip.decompress(base64.b64decode("".join(re.findall(r'"([^"]*)"', gz.group(1))))).decode("utf8", "replace")))
            except Exception as e:
                print(f"dark-mask lint: could not read CSS_GZIP_B64 ({e})", file=sys.stderr)
    for p, src in texts:
        src = re.sub(r"/\*.*?\*/", lambda c: "\n" * c.group(0).count("\n"), src, flags=re.S)  # CSS comments
        for m in re.finditer(r"([^{}`;]{1,4000})\{([^{}]*)\}", src):
            sel, body = m.group(1).strip(), m.group(2)
            if not sel_re.search(sel) or "@keyframes" in sel:
                continue
            for d in re.finditer(r"(?:^|;)\s*(background(?:-color|-image)?)\s*:([^;]*)", body):
                bad = [c for c in col_re.findall(d.group(2)) if dark(c)]
                if not bad:
                    continue
                fp = hashlib.sha1((sel + "|" + d.group(2).strip()).encode()).hexdigest()[:12]
                if fp not in wl:
                    line = src.count("\n", 0, m.start()) + 1
                    hits.append(f"{os.path.relpath(p.split('#')[0], here)}{('#' + p.split('#')[1]) if '#' in p else ''}:{line} [{fp}] {sel[-110:]} {{{d.group(1)}:{d.group(2).strip()[:70]}}}")
    return hits


dark_hits = dark_mask_lint(parts)
if dark_hits:
    print(f"DARK-MASK LINT: {len(dark_hits)} dark background(s) behind bubble pictures/words (founder F8):", file=sys.stderr)
    for h in dark_hits:
        print("  " + h, file=sys.stderr)
    if not a.dev_dir:
        sys.exit("dark-mask lint failed: remove the dark fill (use a soft text glow) or add a reviewed entry to dark_mask_whitelist.json")

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
