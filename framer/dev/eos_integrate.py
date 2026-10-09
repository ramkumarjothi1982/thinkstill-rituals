#!/usr/bin/env python3
"""EOS integration edits — the single source of truth for docs/EOS_SPEC.md §12.2 (groups I1, I2, I3).

Three modes (run from anywhere; paths are resolved from this file):

  1. Check anchors (read-only):
       python3 dev/eos_integrate.py --check [--groups I1,I2,I3]
     Prints, for every edit, whether it is APPLIABLE (anchor count matches), ALREADY APPLIED, or BAD.

  2. Scratch build for module builders (never touches the repo):
       python3 dev/eos_integrate.py --dev-dir /tmp/eos_arrows --modules 30_eos_arrows.jsx[,more.jsx]
     Copies the sources to <dev-dir>/_src, applies ALL groups (or --groups), writes an auto-stub
     module for every symbol the edits reference that your modules do not define, and builds into
     <dev-dir> (comp.jsx, out.js, index.html). Then: launch({dir: "<dev-dir>"}) from dev/drive.mjs.
     00_eos_core.jsx is always included. Use this to see your overlay/check-in/meter mounted in the
     real arcade before the integration phase.

  3. In-place integration (integration agents ONLY, one group at a time, in order):
       python3 dev/eos_integrate.py --in-place --groups I1
     Applies the group's edits to src/00_arcade.jsx / src/99_pixar.jsx with exact-count string
     replacement. Idempotent (already-applied edits are skipped). Refuses to write anything if any
     anchor is BAD or if a referenced symbol is not defined in src/eos/*.jsx (run python3 build.py after).

Whoever changes §12.2 of the spec must update EDITS below in the same commit (and vice versa).
"""
import argparse, glob, os, re, shutil, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)  # framer/

A, P = "src/00_arcade.jsx", "src/99_pixar.jsx"

# (group, id, file, old, new, expected_count)  — `new` fully replaces `old` (inserts repeat `old`).
EDITS = []
def edit(group, eid, f, old, new, count=1):
    EDITS.append((group, eid, f, old, new, count))

# ---------------------------------------------------------------- I1
edit("I1", "E1", A,
     '            </style>\n\n            <div className="ambient a1" />',
     '            </style>\n            <EosGlobalStyle />\n\n            <div className="ambient a1" />')
edit("I1", "E2", A,
     '                <section className="releaseStage">',
     '                <section className="releaseStage">\n                    <EosThoughtFlow stage={stage} reduced={!!reduced} />')
edit("I1", "E3", A,
     '                    {stage === "reveal" && selected ? (',
     '                    {stage === "play" && selected ? (\n'
     '                        <React.Fragment key={`eos-play-${selected.id}-${variationSeed}-${materialRevision}`}>\n'
     '                            <EosMoodGrade game={selected} hostRef={gameHostRef} reduced={!!reduced} />\n'
     '                            <EosGuideArrows game={selected} entries={renderedEntries} hostRef={gameHostRef} reduced={!!reduced} />\n'
     '                            <EosLegacyGuards game={selected} hostRef={gameHostRef} />\n'
     '                        </React.Fragment>\n'
     '                    ) : null}\n'
     '                    <EosTextFloor stage={stage} />\n'
     '                    {stage === "reveal" && selected ? (')
_legacy_guide = ('                        key={`guide-${p.game.id}-${guideText}`}\n'
                 '                        className="guideStepCard"\n'
                 '                    >\n'
                 '                        <small>{guideParts.label}</small>')
edit("I1", "E4", A, _legacy_guide,
     _legacy_guide.replace('                        <small>',
                           '                        <i className="guideActionArrow" aria-hidden="true">{eosGlyph(p.game)}</i>\n                        <small>'))
edit("I1", "E5", A, '                        {Number(p.game?.id || 0) < 100 ? (', '                        {true ? (')
edit("I1", "E6", A, '{guideGesture.arrow || "↑"}', '{eosGlyph(p.game) || guideGesture.arrow || "↑"}')
edit("I1", "E7", A,
     '    const reportProgress = (value, nextLabel) => {\n        const v = pct(value),',
     '    const reportProgress = (value, nextLabel, eosFromSfx) => {\n        const v = eosGateProgress(progressRef, value, eosFromSfx),', 2)
edit("I1", "E8", A,
     '            reportProgress(next, progressLabel(p.game, next))',
     '            reportProgress(next, progressLabel(p.game, next), true)', 2)
edit("I1", "E9", A,
     '    const engineBubbleTextPx = Math.max(\n        1,',
     '    const engineBubbleTextPx = Math.max(\n        15,', 2)
edit("I1", "E10a", A, '        bubbleTextPx = 4,', '        bubbleTextPx = 16,')
edit("I1", "E10b", A,
     '            18,\n            Number.isFinite(parsedBubbleTextPx) ? parsedBubbleTextPx : 4',
     '            28,\n            Number.isFinite(parsedBubbleTextPx) ? parsedBubbleTextPx : 16')
edit("I1", "E10c", A,
     '        title: "Bubble Text",\n        min: 1,\n        max: 18,\n        step: 0.5,\n        defaultValue: 4,',
     '        title: "Bubble Text",\n        min: 1,\n        max: 28,\n        step: 0.5,\n        defaultValue: 16,')
edit("I1", "E11", A,
     '    if (!UNIQUE_HERO_IDS.has(p.game.id)) return <UniqueReleaseEngine {...p} />',
     '    {\n        const EosE = EosEngineFor(p.game)\n        if (EosE) return <EosE {...p} />\n    }\n'
     '    if (!UNIQUE_HERO_IDS.has(p.game.id)) return <UniqueReleaseEngine {...p} />')
edit("I1", "P1", P,
     '                            top: `${40 + pxNoise(i, 23) * 60}%`,',
     '                            top: `${pxNoise(i, 23) * 100}%`,')
edit("I1", "P2", P, '    ".sortCard",\n].join(",")', '    ".sortCard",\n    ".eosObj",\n].join(",")')
edit("I1", "P3", P,
     '        pixarDust = 14,\n        ...arcadeProps',
     '        pixarDust = 14,\n'
     '        eosCheckin = EOS_PROP_DEFAULTS.checkin,\n'
     '        eosCrisisLines = EOS_PROP_DEFAULTS.crisisLines,\n'
     '        eosCrisisUrl = EOS_PROP_DEFAULTS.crisisUrl,\n'
     '        eosEmergencyText = EOS_PROP_DEFAULTS.emergencyText,\n'
     '        eosShareUrl = EOS_PROP_DEFAULTS.shareUrl,\n'
     '        ...arcadeProps')
edit("I1", "P4", P,
     '            <ThinkStillReleaseArcade {...arcadeProps} />',
     '            <EosConfigSync checkin={eosCheckin} crisisLines={eosCrisisLines} crisisUrl={eosCrisisUrl} emergencyText={eosEmergencyText} shareUrl={eosShareUrl} />\n'
     '            <ThinkStillReleaseArcade {...arcadeProps} />')
edit("I1", "P5", P,
     '        defaultValue: 14,\n    },\n})',
     '        defaultValue: 14,\n    },\n'
     '    eosCheckin: { type: ControlType.Boolean, title: "Emotion Check-in", defaultValue: true },\n'
     '    eosCrisisLines: { type: ControlType.String, title: "Support Lines", displayTextArea: true, defaultValue: EOS_PROP_DEFAULTS.crisisLines },\n'
     '    eosCrisisUrl: { type: ControlType.String, title: "Support Link", defaultValue: EOS_PROP_DEFAULTS.crisisUrl },\n'
     '    eosEmergencyText: { type: ControlType.String, title: "Emergency Line", defaultValue: EOS_PROP_DEFAULTS.emergencyText },\n'
     '    eosShareUrl: { type: ControlType.String, title: "Share Link", defaultValue: "" },\n'
     '})')

edit("I1", "E12", A,  # M2: no contradictory regex arrow in the LIVE GUIDE copy for new games
     'function releaseGestureForGame(game) {\n    const a = `${game?.action || ""} ${game?.hook || ""}`.toLowerCase()',
     'function releaseGestureForGame(game) {\n    const a = `${game?.action || ""} ${game?.hook || ""}`.toLowerCase()\n'
     '    if (Number(game?.id) >= 111) return { arrow: "", verb: ({ hold: "HOLD", holdRelease: "HOLD", drag: "DRAG", dragTo: "DRAG", slow: "DRAG", swipe: "SWIPE", sling: "PULL" })[EOS_GAME_META[Number(game.id)]?.gesture] || "TAP" }')
edit("I1", "E13", A,  # asks E10: legacy wrapper narrates the feeling ("SLOW-DOWN · 33%"), like the new wrapper
     '                        GAME PROGRESS · {progress}%',
     '                        {eosMeterWord(p.game)} · {progress}%')
edit("I1", "E15", A,  # fixes review: a guard-detected miss ("almost!") keeps its sound but no step reward / creep
     '        p.sfx(kind)\n        const explicit = usesExplicitProgress(p.game)',
     '        p.sfx(kind)\n        if (eosSfxMiss(p.game, kind)) return\n        const explicit = usesExplicitProgress(p.game)', 2)
edit("I1", "E14", A,  # was I2-E1 (L5): store subscription + sound / haptics / music mirror, needed by new games in I1
     '    const [releaseCheck, setReleaseCheck] = React.useState(null)',
     '    const [releaseCheck, setReleaseCheck] = React.useState(null)\n'
     '    const eos = useEosStore()\n'
     '    React.useEffect(() => {\n'
     '        EOS_STORE.set({ sound: !!sound, haptics: !!hapticsOn, music: !!(musicOn && sound) })\n'
     '    }, [sound, hapticsOn, musicOn])')

# ---------------------------------------------------------------- I2
# I2-E1 moved to I1-E14 (sound mirror must land with the new-game routing).
edit("I2", "E2", A,
     '                    {stage === "input" && !selected ? (',
     '                    {stage === "input" && !selected && eos.phase === "checkin" && eos.checkinEnabled ? (\n'
     '                        <EosCheckIn raw={raw} setRaw={setRaw} onLaunch={startThinkStillChoice} onPlay={startChosenGame} toggleMic={toggleMic} listening={listening} openMenu={() => setGameMenuOpen(true)} sfx={sfx} reduced={!!reduced} />\n'
     '                    ) : null}\n'
     '                    {stage === "input" && !selected && eos.phase !== "checkin" && eos.checkinEnabled ? <EosCheckInChip reduced={!!reduced} /> : null}\n'
     '                    <EosWorldChips stage={stage} reduced={!!reduced} />\n'
     '                    <EosSafetyLayer raw={raw} stage={stage} reduced={!!reduced} />\n'
     '                    {stage === "input" && !selected ? (')
edit("I2", "E3", A,
     '    const clearForNext = React.useCallback(() => {',
     '    const clearForNext = React.useCallback(() => {\n        EosResetFeeling()')
edit("I2", "E4", A,
     '        const best = chooseRelevantGame(sourceThought)',
     '        const best = EosRouteGame(sourceThought, played) || chooseRelevantGame(sourceThought)')
edit("I2", "E5", A,
     '        return chooseRelevantGame(sourceThought, selected.id, selected)',
     '        return EosRouteGame(sourceThought, played, selected.id) || chooseRelevantGame(sourceThought, selected.id, selected)')
edit("I2", "E6", A,
     '            setVariationSeed((v) => v + 1)\n            setStage("play")',
     '            setVariationSeed((v) => v + 1)\n            EosMarkLaunch(g, e)\n            setStage("play")')
edit("I2", "E7", A,
     '        setVariationSeed((v) => v + 101)\n        setStage("play")',
     '        setVariationSeed((v) => v + 101)\n        EosMarkLaunch(selected, entries)\n        setStage("play")')
edit("I2", "E8", A,
     '            setReleaseCheck(null)\n            setStage("reveal")',
     '            EosMarkFinish(selected, bonus)\n            setReleaseCheck(null)\n            setStage("reveal")')
edit("I2", "E9", A,
     '                                    <div className="releaseShiftCheck">',
     '                                    <EosShiftMeter\n'
     '                                        game={selected}\n'
     '                                        sfx={sfx}\n'
     '                                        rainSfx={rainSfx}\n'
     '                                        reduced={!!reduced}\n'
     '                                        onAgain={replay}\n'
     '                                        onPlay={startChosenGame}\n'
     '                                        onNext={tryRecommendedRelease}\n'
     '                                        onDoneForNow={clearForNext}\n'
     '                                        addScore={(n) => {\n'
     '                                            const add = Math.max(0, Math.round(Number(n) || 0))\n'
     '                                            if (!add) return\n'
     '                                            setScore((s) => {\n'
     '                                                const v = s + add\n'
     '                                                try {\n'
     '                                                    localStorage.setItem(SCORE_KEY, String(v))\n'
     '                                                } catch {}\n'
     '                                                return v\n'
     '                                            })\n'
     '                                        }}\n'
     '                                    />\n'
     '                                    <div className="releaseShiftCheck">')
edit("I2", "E10", A,
     '                                <div className="releaseChoiceGroupLabel">\n                                    15 SIGNATURE RELEASES',
     '                                <EosMenuGroup played={played} gameChoice={gameChoice} onPick={startChosenGame} />\n'
     '                                <div className="releaseChoiceGroupLabel">\n                                    15 SIGNATURE RELEASES')
edit("I2", "E11", A,
     'function releaseEmotionProfile(input) {',
     'function releaseEmotionProfile(input) {\n    {\n        const eosProfile = EosProfileOverride(input)\n        if (eosProfile) return eosProfile\n    }')
edit("I2", "E12", A,
     'function cleanEntries(raw) {',
     'function cleanEntries(raw) {\n    {\n        const eosEntries = EosEntries(raw)\n        if (eosEntries) return eosEntries\n    }')
edit("I2", "E13", A,  # anchor created by I1-E3
     '                            <EosLegacyGuards game={selected} hostRef={gameHostRef} />',
     '                            <EosLegacyGuards game={selected} hostRef={gameHostRef} />\n'
     '                            <EosCompanion game={selected} hostRef={gameHostRef} reduced={!!reduced} />')

# ---------------------------------------------------------------- I3
edit("I3", "E1", A,
     '                            onClick={() => {\n                                if (step % 2 === 0) tapStep(8)',
     '                            className={step % 2 === 0 ? "eosNext" : ""}\n'
     '                            onClick={() => {\n                                if (step % 2 === 0) tapStep(8)')
edit("I3", "E2", A,
     '                            onClick={() => {\n                                if (step % 2 === 1) tapStep(8)',
     '                            className={step % 2 === 1 ? "eosNext" : ""}\n'
     '                            onClick={() => {\n                                if (step % 2 === 1) tapStep(8)')
edit("I3", "E3", A,
     '                            if (meter >= 62 && meter <= 88) advance()\n                            else {\n                                setMeter(0)',
     '                            if (meter >= 55 && meter <= 92) advance()\n                            else {\n                                setMeter((m) => Math.min(m, 40))')
edit("I3", "E4", A,
     '                cx >= m.left - 32 &&\n                cx <= m.right + 32 &&\n                cy >= m.top - 34 &&\n                cy <= m.bottom + 46',
     '                cx >= m.left - 70 &&\n                cx <= m.right + 70 &&\n                cy >= m.top - 80 &&\n                cy <= m.bottom + 90')
_echo = ('                                        onPointerUp={() => stopEchoHold(true)}\n'
         '                                        onPointerCancel={() =>\n'
         '                                            stopEchoHold(true)\n'
         '                                        }\n'
         '                                        onPointerLeave={() =>\n'
         '                                            stopEchoHold(true)\n'
         '                                        }')
edit("I3", "E5", A, _echo, _echo.replace("stopEchoHold(true)", "stopEchoHold(false)"))
_bin_measure = ('    const measureTarget = (i) => {\n'
                '        const b = bubbleRefs.current[i]?.getBoundingClientRect(),\n'
                '            m = binMouthRef.current?.getBoundingClientRect()\n'
                '        if (!b || !m) return { x: 0, y: 150 }\n'
                '        return {\n'
                '            x: m.left + m.width / 2 - (b.left + b.width / 2),\n'
                '            y: m.top + m.height / 2 - (b.top + b.height / 2),\n'
                '        }\n'
                '    }\n')
edit("I3", "E7", A, _bin_measure,  # 21 BIN: once the drag transform is visible (fixes CSS), aim the "gone" flight from the HOME slot
     '    const measureTarget = (i) => {\n'
     '        const el = bubbleRefs.current[i],\n'
     '            b = el?.getBoundingClientRect(),\n'
     '            m = binMouthRef.current?.getBoundingClientRect()\n'
     '        if (!b || !m) return { x: 0, y: 150 }\n'
     '        // EOS I3-E7: x/y animate from the home slot → subtract the visible drag translation (screen px → CSS px)\n'
     '        let tx = 0,\n'
     '            ty = 0,\n'
     '            k = 1\n'
     '        try {\n'
     '            const t = new DOMMatrixReadOnly(getComputedStyle(el).transform)\n'
     '            tx = t.m41 || 0\n'
     '            ty = t.m42 || 0\n'
     '            const kk = b.width / (el.offsetWidth * Math.hypot(t.a, t.b))\n'
     '            if (Number.isFinite(kk) && kk > 0.05) k = kk\n'
     '        } catch {}\n'
     '        return {\n'
     '            x: (m.left + m.width / 2 - (b.left + b.width / 2)) / k + tx,\n'
     '            y: (m.top + m.height / 2 - (b.top + b.height / 2)) / k + ty,\n'
     '        }\n'
     '    }\n')
edit("I3", "E6", A,  # 109 CLEANSE: a stale delayed write must never shrink the released list (stuck at 100 %)
     '                    () => {\n                        setReleasedIndices(nextReleased)\n                    },',
     '                    () => {\n                        setReleasedIndices((prev) =>\n'
     '                            prev.length >= releasedRef.current.length\n'
     '                                ? prev\n'
     '                                : releasedRef.current.slice()\n'
     '                        )\n                    },')

# Symbols the edits reference that must be defined by src/eos/* (core defines the rest).
REFERENCED = {
    "I1": {"components": ["EosThoughtFlow", "EosMoodGrade", "EosGuideArrows", "EosLegacyGuards", "EosTextFloor"],
           "functions": ["eosGlyph", "eosGateProgress", "eosSfxMiss"]},
    "I2": {"components": ["EosCheckIn", "EosCheckInChip", "EosWorldChips", "EosSafetyLayer", "EosShiftMeter", "EosMenuGroup", "EosCompanion"],
           "functions": ["EosRouteGame", "EosProfileOverride", "EosEntries"]},
    "I3": {"components": [], "functions": []},
}
STUB_BODIES = {
    "eosGlyph": 'function eosGlyph() {\n    return "☝"\n}',
    "EosRouteGame": "function EosRouteGame() {\n    return null\n}",
    "EosProfileOverride": "function EosProfileOverride() {\n    return null\n}",
    "EosEntries": "function EosEntries() {\n    return null\n}",
    "eosSfxMiss": "function eosSfxMiss() {\n    return false\n}",
    # same algorithm as docs/EOS_SPEC.md §11.2 so scratch builds behave like the final build
    "eosGateProgress": ("const EOS_STUB_PROGRESS_OWN = new WeakMap()\n"
                        "function eosGateProgress(ref, value, fromSfx) {\n"
                        "    const v = pct(value)\n"
                        "    const cur = Number(ref && ref.current) || 0\n"
                        "    if (!fromSfx && v <= 0 && cur <= 0) {\n"
                        "        EOS_STUB_PROGRESS_OWN.set(ref, 0)\n"
                        "        return 0\n"
                        "    }\n"
                        "    if (fromSfx) {\n"
                        "        const own = EOS_STUB_PROGRESS_OWN.get(ref)\n"
                        "        return Math.max(cur, Math.min(v, own == null ? 90 : own + 12, 96))\n"
                        "    }\n"
                        "    EOS_STUB_PROGRESS_OWN.set(ref, Math.max(EOS_STUB_PROGRESS_OWN.get(ref) || 0, v))\n"
                        "    return Math.max(cur, v)\n"
                        "}"),
}


def groups_arg(s):
    gs = [g.strip().upper() for g in (s or "I1,I2,I3").split(",") if g.strip()]
    bad = [g for g in gs if g not in ("I1", "I2", "I3")]
    if bad:
        sys.exit(f"unknown groups: {bad}")
    return gs


def plan(root, groups, write):
    """Apply (or just evaluate) edits for `groups` on files under `root`. Returns (report, ok)."""
    texts = {f: open(os.path.join(root, f), encoding="utf-8").read() for f in (A, P)}
    report, ok = [], True
    for g, eid, f, old, new, n in EDITS:
        if g not in groups:
            continue
        src = texts[f]
        c = src.count(old)
        # insert-type edits keep `old` inside `new`: applied ⇔ the longest inserted line exists
        # (a later group may extend the inserted block, e.g. I2-E13 inside I1-E3);
        # replacements remove `old`: applied ⇔ `new` exists and the anchor count no longer matches.
        if old in new:
            inserted = new.replace(old, "", 1)
            signature = max((l.strip() for l in inserted.splitlines()), key=len, default="")
            applied = bool(signature) and signature in src
        else:
            applied = new in src and c != n
        if applied:
            report.append(f"SKIP  {g}-{eid:5s} already applied ({os.path.basename(f)})")
            continue
        if c != n:
            ok = False
            report.append(f"BAD   {g}-{eid:5s} anchor count {c}, expected {n} ({os.path.basename(f)}): {old[:70]!r}")
            continue
        texts[f] = src.replace(old, new)
        report.append(f"OK    {g}-{eid:5s} x{n} ({os.path.basename(f)})")
    if write and ok:
        for f, t in texts.items():
            open(os.path.join(root, f), "w", encoding="utf-8").write(t)
    return report, ok


def defined_symbols(paths):
    syms = set()
    for p in paths:
        for m in re.finditer(r"^(?:function|const|let|class)\s+([A-Za-z_$][\w$]*)", open(p, encoding="utf-8").read(), re.M):
            syms.add(m.group(1))
    return syms


def needed_symbols(groups):
    out = []
    for g in groups:
        out += REFERENCED[g]["components"] + REFERENCED[g]["functions"]
    return out


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--check", action="store_true")
    ap.add_argument("--in-place", action="store_true")
    ap.add_argument("--groups", default=None)
    ap.add_argument("--dev-dir", default=None)
    ap.add_argument("--modules", default="")
    a = ap.parse_args()
    groups = groups_arg(a.groups)

    if a.check:
        report, ok = plan(ROOT, groups, write=False)
        print("\n".join(report))
        print("anchors:", "ALL OK" if ok else "PROBLEMS FOUND")
        sys.exit(0 if ok else 1)

    if a.in_place:
        eos_files = sorted(glob.glob(os.path.join(ROOT, "src", "eos", "*.jsx")))
        missing = [s for s in needed_symbols(groups) if s not in defined_symbols(eos_files)]
        if missing:
            sys.exit(f"refusing: these symbols are not defined in src/eos/*.jsx yet: {missing}")
        report, ok = plan(ROOT, groups, write=True)
        print("\n".join(report))
        if not ok:
            sys.exit("refused: nothing written (fix the BAD anchors first)")
        print(f"applied {','.join(groups)} in place — now run: python3 build.py")
        return

    if not a.dev_dir:
        ap.error("give --check, --in-place or --dev-dir")
    dev_dir = os.path.abspath(a.dev_dir)
    scratch = os.path.join(dev_dir, "_src")
    if os.path.exists(scratch):
        shutil.rmtree(scratch)
    os.makedirs(os.path.join(scratch, "dev"), exist_ok=True)
    shutil.copytree(os.path.join(ROOT, "src"), os.path.join(scratch, "src"))
    shutil.copy(os.path.join(ROOT, "build.py"), scratch)
    for f in ("index.html", "main.jsx"):
        shutil.copy(os.path.join(HERE, f), os.path.join(scratch, "dev", f))
    os.symlink(os.path.join(HERE, "node_modules"), os.path.join(scratch, "dev", "node_modules"))
    report, ok = plan(scratch, groups, write=True)
    print("\n".join(report))
    if not ok:
        sys.exit("scratch integration failed (BAD anchors)")
    want = ["00_eos_core.jsx"] + [m.strip() for m in a.modules.split(",") if m.strip() and m.strip() != "00_eos_core.jsx"]
    eos_dir = os.path.join(scratch, "src", "eos")
    have = defined_symbols([os.path.join(eos_dir, m) for m in want if os.path.exists(os.path.join(eos_dir, m))])
    unknown = [m for m in want if not os.path.exists(os.path.join(eos_dir, m))]
    if unknown:
        sys.exit(f"unknown modules: {unknown}")
    stubs = []
    for s in needed_symbols(groups):
        if s in have:
            continue
        stubs.append(STUB_BODIES.get(s) or f"function {s}() {{\n    return null\n}}")
    stub_name = "98_eos_scratch_stubs.jsx"
    if stubs:
        open(os.path.join(eos_dir, stub_name), "w", encoding="utf-8").write(
            "// AUTO-GENERATED by dev/eos_integrate.py (scratch build only) — stubs for modules not included\n" + "\n".join(stubs) + "\n")
        want.append(stub_name)
    r = subprocess.run([sys.executable, os.path.join(scratch, "build.py"), "--dev-dir", dev_dir, "--modules", ",".join(want)])
    if r.returncode:
        sys.exit("scratch build failed")
    print(f"scratch integrated build ready: launch({{ dir: {dev_dir!r} }}) — stubs: {len(stubs)}")


if __name__ == "__main__":
    main()
