#!/usr/bin/env python3
"""Pilot builds — a playable arcade with the Pilot-A games swapped in, WITHOUT touching the
release sources or the running release build.

  python3 dev/pilot_build.py --dev-dir /tmp/pilot_x            # pilots ON (default)
  then open file:///tmp/pilot_x/index.html   (add ?pilot=off to see the original games)

What it does, in a scratch copy only (src/ in the repo is never modified):
  1. copies framer/src -> <dev-dir>/_src
  2. applies the release integration groups I1-I3 (dev/eos_integrate.py) so the pilots run inside
     the real, fully wired Release Console (check-in, arrows, dots, readability, shift meter ...)
  3. adds ONE pilot hook at the top of both game routers (legacy ids 1-99 and new ids 100+):
         const PE = typeof EosPilotEngineFor === "function" ? EosPilotEngineFor(p.game) : null
         if (PE) return <PE {...p} />
     -> a pilot engine replaces the original ONLY when the pilot module registers one for that id
        and the pilot switch is on (?pilot=off or localStorage eos_pilot=off shows the original).
  4. copies framer/src/pilot/*.jsx into the scratch src/eos/ as 7x_* modules (after all release
     modules, before Pixar) and builds with framer/build.py --dev-dir.
Pilot module rules: no imports, Eos/eos-prefixed names, define `function EosPilotEngineFor(game)`
in exactly one pilot file (src/pilot/70_pilot_core.jsx); never edit src/00_arcade.jsx or src/eos/.
"""
import argparse, glob, importlib.util, os, shutil, subprocess, sys
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
spec = importlib.util.spec_from_file_location("eos_integrate", os.path.join(HERE, "eos_integrate.py"))
EI = importlib.util.module_from_spec(spec); spec.loader.exec_module(EI)

HOOK = ('    {\n        const PE = typeof EosPilotEngineFor === "function" ? EosPilotEngineFor(p.game) : null\n'
        '        if (PE) return <PE {...p} />\n    }\n')
PILOT_EDITS = [
    ("function RoutedGameContentLegacy(p) {\n", "function RoutedGameContentLegacy(p) {\n" + HOOK),
    ("function RoutedGameContent(p) {\n", "function RoutedGameContent(p) {\n" + HOOK),
]

ap = argparse.ArgumentParser()
ap.add_argument("--dev-dir", required=True)
ap.add_argument("--no-release-groups", action="store_true", help="skip I1-I3 (pilot over the bare arcade)")
a = ap.parse_args()
dev = os.path.abspath(a.dev_dir)
scratch = os.path.join(dev, "_src")
if os.path.exists(scratch):
    shutil.rmtree(scratch)
shutil.copytree(os.path.join(ROOT, "src"), os.path.join(scratch, "src"))
shutil.copy(os.path.join(ROOT, "build.py"), scratch)
os.makedirs(os.path.join(scratch, "dev"), exist_ok=True)
for f in ("index.html", "main.jsx"):
    shutil.copy(os.path.join(HERE, f), os.path.join(scratch, "dev", f))
os.symlink(os.path.join(HERE, "node_modules"), os.path.join(scratch, "dev", "node_modules"))
if not a.no_release_groups:
    report, ok = EI.plan(scratch, ["I1", "I2", "I3"], write=True)
    print("\n".join(report))
    if not ok:
        sys.exit("release integration groups failed on the scratch copy")
arc = os.path.join(scratch, "src", "00_arcade.jsx")
s = open(arc, encoding="utf-8").read()
for old, new in PILOT_EDITS:
    if new in s:
        continue
    if s.count(old) != 1:
        sys.exit(f"pilot hook anchor not unique: {old!r}")
    s = s.replace(old, new)
open(arc, "w", encoding="utf-8").write(s)
pilots = sorted(glob.glob(os.path.join(ROOT, "src", "pilot", "*.jsx")))
for p in pilots:
    shutil.copy(p, os.path.join(scratch, "src", "eos", os.path.basename(p)))
r = subprocess.run([sys.executable, os.path.join(scratch, "build.py"), "--dev-dir", dev])
if r.returncode:
    sys.exit("pilot build failed")
print(f"pilot build ready: {dev}/index.html  (pilot modules: {[os.path.basename(p) for p in pilots]}; ?pilot=off = originals)")
