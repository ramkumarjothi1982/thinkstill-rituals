#!/usr/bin/env python3
"""Compile the Framer deliverable into a SAFE single file for pasting into a Framer code file.

  python3 dev/framer_safe.py [SRC.txt] [OUT.txt]
  default: ThinkStillReleaseArcade_EOS_FULL.txt -> ThinkStillReleaseArcade_FRAMER_SAFE.txt

Why: the full source file (2.9 MB of JSX, 47.5k lines) made Framer's in-browser compiler stop with
"RuntimeError: unreachable" (a WebAssembly trap, most likely a resource limit). This build is plain JavaScript
(no JSX: React.createElement), ES2018 syntax, minified with function names kept, imports at the top and a plain
`export default`, so Framer's compiler has far less to parse (about 1.75 MB, close to the original arcade's
1.4 MB that already worked in Framer). Behaviour is identical: same code, compiled ahead of time.
"""
import os, re, subprocess, sys
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
src = os.path.abspath(sys.argv[1]) if len(sys.argv) > 1 else os.path.join(ROOT, "ThinkStillReleaseArcade_EOS_FULL.txt")
out = os.path.abspath(sys.argv[2]) if len(sys.argv) > 2 else os.path.join(ROOT, "ThinkStillReleaseArcade_FRAMER_SAFE.txt")
esb = os.path.join(HERE, "node_modules", ".bin", "esbuild")
r = subprocess.run([esb, src, "--loader:.txt=jsx", "--jsx=transform", "--jsx-factory=React.createElement",
                    "--jsx-fragment=React.Fragment", "--format=esm", "--target=es2018", "--minify", "--keep-names",
                    "--legal-comments=none", "--charset=utf8", "--log-level=error"],
                   capture_output=True)
if r.returncode:
    sys.exit(r.stderr.decode()[-3000:])
s = r.stdout.decode("utf8")
imps = re.findall(r'import\s*(?:\*\s*as\s+[\w$]+|\{[^}]*\}|[\w$]+)\s*from\s*"[^"]+";', s[:4000])
if not imps:
    sys.exit("no imports found at the top of the compiled file")
for im in imps:
    s = s.replace(im, "", 1)
m = re.search(r"export\{([\w$]+) as default\};\s*$", s)
if not m:
    sys.exit("compiled file does not end with the default export")
s = s[:m.start()] + f"export default {m.group(1)};\n"
banner = "// ThinkStill Release Console - Framer code component (compiled single-file build). Paste this whole file into one Framer code file.\n"
s = banner + "\n".join(imps) + "\n" + s
open(out, "w", encoding="utf8").write(s)
print(f"OK {out} ({len(s) // 1024} KB, {s.count(chr(10))} lines, {len(imps)} imports)")
