// EOS engine preview — mounts ONE new-game engine (ids 111+) OUTSIDE the arcade, with mock props
// {game, entries, onProgress, onDone, sfx, rainSfx, reduced, imageSources, hasUserImages, variationSeed},
// so a game module can be iterated on before integration. QUICK ITERATION ONLY: no arcade CSS, guide panel,
// step rewards or word tagging — acceptance runs in a scratch integrated build (dev/eos_integrate.py).
//
// Build + open (never edit the built copy; it is regenerated):
//   python3 dev/eos_preview.py --id 111                    → /tmp/eos_preview_111/index.html
//   python3 dev/eos_preview.py --id 111 --check            → headless load: page errors + markers + contract
//   python3 dev/eos_preview.py --id 111 --finish           → also plays it with eos_drive.finishGame
// URL params (file:///tmp/eos_preview_111/index.html?…):
//   id=111  text=…(the user's words)  reduced=1  seed=2 (variationSeed)  emotion=anger  before=8
//   safety=selfharm|abuse|threat|soft (raise the store flag)  calm=1 (calm visuals)  sound=0
//   guides=1 (draw the HUD / LIVE GUIDE no-go zones of the real arcade: --eos-safe-top / --eos-safe-bottom)
// Live state for tests: window.__eosPreview = {id, progress, label, done, sfx:[{kind,t}], rain, progressLog, log,
//   checks:{thirdArg, backwards, flat, outOfRange, afterDone, afterUnmount, doneCalls, nonSoft, longLabels, …}}
// and window.__eos (core + every module API in this build).
import * as React from "react"
import { createRoot } from "react-dom/client"
import "./comp.jsx" // evaluates the arcade + core + the selected eos modules (registers the games)

const q = new URLSearchParams(location.search)
const id = Number(q.get("id") || 111)
const text = q.get("text") ?? "my boss yelled at me and I feel panic"
const reduced = q.get("reduced") === "1"
const seed = Number(q.get("seed") || 1)
const core = (window.__eos && window.__eos.core) || null

// Store setup happens BEFORE the first render (the engine may read it at mount; never set it during render).
if (core) {
    const emotion = q.get("emotion")
    const before = q.get("before")
    if (emotion || before != null) core.EosCommitCheckin({ emotion: emotion || null, before: before == null ? null : Number(before) })
    if (q.get("safety")) core.EosFlagSafety(q.get("safety"))
    if (q.get("calm") === "1") core.EOS_STORE.set({ calmVisuals: true })
    if (q.get("sound") === "0") core.EOS_STORE.set({ sound: false, music: false })
    // the launch mark the arcade would make (detection, act, launchAt) — so engines see a realistic store
    const game = core.GAMES.find((g) => g.id === id)
    if (game) core.EosMarkLaunch(game, text.split(/\s+/))
}

const ZONES_CSS = `
.eosPvZones{position:fixed;inset:0;pointer-events:none;z-index:2147483000;font:800 12px/1.2 system-ui,sans-serif;color:#fff}
.eosPvZones i{position:absolute;background:repeating-linear-gradient(135deg,rgba(255,40,80,.22) 0 8px,rgba(255,40,80,.08) 8px 16px);outline:1px dashed rgba(255,90,120,.9)}
.eosPvZones i span{position:absolute;left:6px;top:4px;text-shadow:0 1px 2px #000}
.eosPvZones .top{left:0;right:0;top:0;height:48px}
.eosPvZones .guide{left:0;bottom:0;width:460px;height:182px}
.eosPvZones .safe{left:0;right:0;top:48px;bottom:200px;background:none;outline:1px dashed rgba(120,255,170,.8)}
@media (max-width:560px){.eosPvZones .top{height:104px}.eosPvZones .guide{width:auto;right:0;height:150px}.eosPvZones .safe{top:104px;bottom:164px}}
`
function Zones() {
    return (
        <div className="eosPvZones" aria-hidden="true">
            <style>{ZONES_CSS}</style>
            <i className="top"><span>HUD (progress, sparks) — keep clear</span></i>
            <i className="guide"><span>LIVE GUIDE panel — keep clear</span></i>
            <i className="safe"><span>safe play area</span></i>
        </div>
    )
}
function Missing() {
    const ids = core ? Object.keys(core.EOS_ENGINES).map(Number) : []
    return (
        <div style={{ color: "#fff", font: "16px/1.5 system-ui", padding: 24 }}>
            <b>EOS preview:</b> no engine registered for id {id}.<br />
            {core ? (ids.length ? <>Registered in this build: {ids.map((n) => <a key={n} style={{ color: "#7de3ff", marginRight: 10 }} href={`?id=${n}`}>{n}</a>)}</> : "No eos game module in this build (pass --modules / --files to eos_preview.py).") : "window.__eos is missing (not a dev URL?)."}
        </div>
    )
}
function App() {
    const Preview = core && core.EosEnginePreview
    const has = core && core.EOS_ENGINES && core.EOS_ENGINES[id]
    return (
        <>
            {Preview && has ? <Preview id={id} text={text} reduced={reduced} seed={seed} /> : <Missing />}
            {q.get("guides") === "1" ? <Zones /> : null}
        </>
    )
}
createRoot(document.getElementById("root")).render(<App />)
