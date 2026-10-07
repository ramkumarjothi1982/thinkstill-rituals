#!/usr/bin/env python3
"""Build the stand-alone EOS engine preview for ONE new game (ids 111+), outside the arcade.

QUICK ITERATION ONLY (no arcade CSS, LIVE GUIDE, step rewards or word tagging). Acceptance always runs in a
scratch integrated build: python3 dev/eos_integrate.py --dev-dir /tmp/eos_<task> --modules <your file>.

Usage (from anywhere; paths resolve from this file):
  python3 dev/eos_preview.py --id 111
      → finds the src/eos module that defines EOS_GAME_111, builds arcade + core + that module into
        /tmp/eos_preview_111/{comp.jsx, eos_preview.jsx, index.html, out.js} and prints the URL to open.
  python3 dev/eos_preview.py --id 111 --modules 21_eos_game_sigh.jsx,30_eos_arrows.jsx   (explicit src/eos modules)
  python3 dev/eos_preview.py --id 121 --files /tmp/my_draft.jsx                         (out-of-tree drafts)
  python3 dev/eos_preview.py --id 111 --dev-dir /tmp/eos_sigh_pv                         (custom output dir)
  python3 dev/eos_preview.py --id 111 --check     headless load (1280×860 + 390×844): page errors, the
                                                 data-eos-target markers, window.__eosPreview contract checks
  python3 dev/eos_preview.py --id 111 --finish    --check + plays the game with eos_drive.finishGame (markers)
  python3 dev/eos_preview.py --id 111 --shots /tmp/pv_shots   (with --check/--finish: start/mid/end screenshots)
URL params of the built page: see dev/eos_preview.jsx (id, text, reduced, seed, emotion, before, safety, calm,
sound, guides=1 for the arcade's no-go zones). Drive it from a script with dev/eos_drive.mjs:
  launchEos({ dir: "/tmp/eos_preview_111", query: "id=111&emotion=panic&before=8" })
"""
import argparse, glob, json, os, re, shutil, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)  # framer/
EOS_DIR = os.path.join(ROOT, "src", "eos")


def module_for(game_id):
    hits = []
    for p in sorted(glob.glob(os.path.join(EOS_DIR, "*.jsx"))):
        if re.search(r"^const EOS_GAME_%d\b" % game_id, open(p, encoding="utf-8").read(), re.M):
            hits.append(os.path.basename(p))
    return hits


def check_module_text(label, body):
    lines = body.splitlines()
    bad = [l for l in lines if l.startswith("import ")]
    if bad:
        sys.exit(f"{label}: eos modules must not have import lines (shared file scope): {bad[0]}")
    exp = [l for l in lines if re.match(r"^export\b", l)]
    if exp:
        sys.exit(f"{label}: eos modules must not export anything: {exp[0]}")
    lb = [l for l in lines if re.search(r"\(\?<[=!]", l)]
    if lb:
        sys.exit(f"{label}: regex lookbehind is banned (SyntaxError on iOS Safari < 16.4): {lb[0].strip()[:90]}")


def build(a):
    modules = [m.strip() for m in (a.modules or "").split(",") if m.strip()]
    if not modules and not a.files:
        modules = module_for(a.id)
        if not modules:
            print(f"note: no src/eos module defines EOS_GAME_{a.id} — building core only (pass --modules / --files)")
    unknown = [m for m in modules if not os.path.exists(os.path.join(EOS_DIR, m))]
    if unknown:
        sys.exit(f"unknown modules: {unknown}")
    eos = [os.path.join(EOS_DIR, "00_eos_core.jsx")] + [os.path.join(EOS_DIR, m) for m in modules if m != "00_eos_core.jsx"]
    eos = sorted(set(eos), key=lambda p: os.path.basename(p))
    extra = [os.path.abspath(f) for f in (a.files or "").split(",") if f.strip()]
    for f in extra:
        if not os.path.exists(f):
            sys.exit(f"missing file: {f}")
    parts = [os.path.join(ROOT, "src", "00_arcade.jsx")] + eos + extra + [os.path.join(ROOT, "src", "99_pixar.jsx")]
    chunks = []
    for i, p in enumerate(parts):
        body = open(p, encoding="utf-8").read().strip()
        if 0 < i < len(parts) - 1:
            check_module_text(p, body)
        if i:
            body = f"// ===== {os.path.basename(p)} =====\n" + body
        chunks.append(body)
    out = "\n\n".join(chunks) + "\n"
    d = os.path.abspath(a.dev_dir or f"/tmp/eos_preview_{a.id}")
    os.makedirs(d, exist_ok=True)
    open(os.path.join(d, "comp.jsx"), "w", encoding="utf-8").write(out)
    shutil.copy(os.path.join(HERE, "eos_preview.jsx"), os.path.join(d, "eos_preview.jsx"))
    shutil.copy(os.path.join(HERE, "eos_preview.html"), os.path.join(d, "index.html"))
    nm = os.path.join(d, "node_modules")
    if not os.path.exists(nm):
        os.symlink(os.path.join(HERE, "node_modules"), nm)
    r = subprocess.run([os.path.join(HERE, "node_modules", ".bin", "esbuild"), "eos_preview.jsx", "--bundle", "--outfile=out.js",
                        "--jsx=automatic", '--define:process.env.NODE_ENV="development"', "--log-level=warning"], cwd=d)
    if r.returncode:
        sys.exit("esbuild failed")
    names = ", ".join(os.path.basename(p) for p in parts)
    print(f"OK preview built: {d} ({len(out) // 1024} KB: {names})")
    print(f"open: file://{d}/index.html?id={a.id}&guides=1")
    return d


CHECK_JS = r"""
import * as eos from "%(drive)s"
const [dir, id, finish, shots] = [%(dir)s, %(id)d, %(finish)s, %(shots)s]
const fs = await import("fs")
const out = {}
for (const [w, h] of [[1280, 860], [390, 844]]) {
    const L = await eos.launchEos({ width: w, height: h, dir, query: "id=" + id, waitMs: 1500 })
    const p = L.page
    const markers = await p.evaluate(() => [...document.querySelectorAll('[data-eos-target="1"]')].map((e) => {
        const r = e.getBoundingClientRect()
        return { g: e.dataset.eosG, label: e.dataset.eosLabel || null, x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) }
    }))
    if (shots) { fs.mkdirSync(shots, { recursive: true }); await p.screenshot({ path: `${shots}/pv_${id}_${w}_start.png` }) }
    let fin = null
    if (finish) {
        fin = await eos.finishGame(p, id, { timeoutMs: 60000 })
        fin = { done: fin.done, reason: fin.reason, ms: fin.ms, actions: fin.actions, stages: fin.stages.map((s) => `${s.g}:${s.label}`), progress: fin.progressLog.map((e) => e.v).join(",") }
        if (shots) await p.screenshot({ path: `${shots}/pv_${id}_${w}_end.png` })
    }
    const pv = await p.evaluate(() => window.__eosPreview ? { progress: window.__eosPreview.progress, label: window.__eosPreview.label, done: window.__eosPreview.done, checks: window.__eosPreview.checks, sfx: window.__eosPreview.sfx.length } : null)
    const small = (await eos.smallText(p, 14, { scope: ".eosArena" })).slice(0, 8)
    out[`${w}x${h}`] = { errors: L.errors, markers, preview: pv, arenaTextUnder14px: small, finish: fin }
    await L.browser.close()
}
console.log(JSON.stringify(out, null, 1))
"""


def check(d, a):
    js = CHECK_JS % {
        "drive": os.path.join(HERE, "eos_drive.mjs"),
        "dir": json.dumps(d),
        "id": a.id,
        "finish": "true" if a.finish else "false",
        "shots": json.dumps(os.path.abspath(a.shots)) if a.shots else "null",
    }
    tmp = os.path.join(d, "_check.mjs")
    open(tmp, "w").write(js)
    r = subprocess.run(["node", tmp], cwd=HERE)
    sys.exit(r.returncode)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--id", type=int, required=True, help="game id (111+) to mount")
    ap.add_argument("--modules", default="", help="comma list of src/eos modules (default: the one defining EOS_GAME_<id>)")
    ap.add_argument("--files", default="", help="comma list of out-of-tree .jsx drafts to append after the modules")
    ap.add_argument("--dev-dir", default=None, help="output dir (default /tmp/eos_preview_<id>)")
    ap.add_argument("--check", action="store_true", help="headless load at 1280×860 and 390×844 and print a report")
    ap.add_argument("--finish", action="store_true", help="--check + play the game with eos_drive.finishGame")
    ap.add_argument("--shots", default=None, help="with --check/--finish: screenshot dir")
    a = ap.parse_args()
    d = build(a)
    if a.check or a.finish:
        check(d, a)


if __name__ == "__main__":
    main()
