// ============================================================================================
// ThinkStill shared BUBBLE FACE (founder F8, 2026-10-09 MANDATORY) — ONE implementation for every Release game.
//   * tsBubbleFaceSources(): the single picture resolver.
//       no uploads -> ThinkStill's emotional bubble pictures (the seven characters, bubble-expressions/),
//                     chosen by the user's emotion (releaseEmotionProfile via releaseEmotionSet) and driven by
//                     PROGRESS: every face starts negative/unsettled and turns positive as the release
//                     progresses (all positive at 100), never by the last word typed.
//       uploads    -> the uploaded pictures replace the defaults, spread over the six positions by the
//                     six-image rule (tsSpreadUploads: 1=x6, 2=x3, 3=x2, 4/5 balanced + interleaved, 6=one each).
//       uploads removed -> the resolver falls back to the defaults on the next render automatically.
//   * useTsBubbleFaces(): one DOM pass (MutationObserver + rAF, resize aware) that gives every emotional
//     bubble / object in the stage a <ts-face>: a TRUE circular picture (full image visible: character art is
//     contained, photos are scaled so the whole rectangle sits inside the circle) with the user's text BELOW it,
//     inside the same bubble. No dark masks (light glass only). pointer-events:none, so gameplay, arrows and
//     hit-tests are untouched. Hosts that already carry the 100+ engine's standard face (.tsAutoEmotionPic) and
//     the approved custom renderings (HOT POTATO, RAIN OUT clouds, GO WEIRD cards) are left as they are.
// ============================================================================================
const TS_FACE_HOSTS = [
    ".allCircularBubble", ".wordBubble", ".stompWordBubble", ".laserTargetBubble", ".catchTarget", ".choiceObject",
    ".cleanseStone", ".chargeOrb", ".multiEgg", ".zapMultiBubble", ".cutLoopWord", ".unhookWordBubble", ".binWordBubble",
    ".doorThoughtBubble", ".echoHoldBubble", ".tinySoundBubble", ".tugThoughtBubble", ".xrayThoughtBubble", ".magicTrapBubble",
    ".echoSourceHold", ".shelfThoughtBubble", ".juggleBall", ".coinReleaseBubble", ".sinkWordBubble", ".uniqWord",
    ".vacuumCircleBubble", ".eraseWordBubble", ".keepDropCenterBubble", ".priorityBubbleTray button", ".spaceTile",
    ".ownershipCard", ".keepDropCard", ".tradeToken", ".controlThoughtToken", ".scaleDownThought", ".stamped",
    ".dramaThoughtBox", ".shelfCard", ".exactWordsWithImage", ".tsFaceObject",
].join(",")
// approved custom renderings that already place picture + text their own way (founder-approved; do not overlay)
const TS_FACE_SKIP = ".u107,.thoughtPotato,.rainCloudUnit,.weirdWordBubble,.tsNoBubbleFace"
const TS_FACE_TEXT_SKIP = /^(?:\d+\s*\/\s*\d+|\d+%|[x×]\d+|choose|locked|silenced|released|pull|drop|keep|fact|story|unsure|tap|hold|press|done|ready|pop it!?|go|ok|\W*)$/i
const TS_FACE_MIN = 44 // px: smaller objects keep their own look (a 40px face would be unreadable)

function tsSpreadUploads(images = [], slots = 6) {
    const src = (images || []).map((x) => String(x || "").trim()).filter(Boolean).slice(0, 6)
    if (!src.length) return []
    // interleaved: 2 -> A B A B A B, 3 -> A B C A B C, 4 -> A B C D A B, 5 -> A B C D E A
    return Array.from({ length: Math.max(1, slots) }, (_, i) => src[i % src.length])
}

function tsBubbleFaceSources({ game, entries = [], uploads = [], progress = 0, count = 10, seed = 0 } = {}) {
    const up = (uploads || []).filter(Boolean)
    if (up.length) {
        const six = tsSpreadUploads(up, 6)
        return Array.from({ length: count }, (_, i) => six[i % six.length])
    }
    const p = Math.max(0, Math.min(100, Number(progress) || 0))
    // face i turns positive once the release has progressed past its share; everything is positive at the end
    const flags = Array.from({ length: count }, (_, i) => p >= 100 || (p > 0 && p >= ((i + 1) / (count + 1)) * 100))
    try {
        return releaseEmotionSet(game, flags, count, seed, 0, entries)
    } catch {
        const bank = flags.map((f, i) => {
            const b = ALL_BUBBLES[i % ALL_BUBBLES.length]
            const moods = RELEASE_PHASE_EMOTIONS[f ? "positive" : "negative"][b] || [1]
            return emotionSrc(b, moods[0])
        })
        return bank
    }
}

const TS_BUBBLE_FACE_CSS = String.raw`
.tsArcade .tsBubbleFaceHost{--ts-ref-photo:none!important;--upload-image:none!important;--upload-image-1:none!important;--upload-image-2:none!important;--upload-image-3:none!important;--upload-image-4:none!important;--upload-image-5:none!important;--upload-image-6:none!important;--upload-image-7:none!important;--upload-image-8:none!important;--upload-image-9:none!important;--upload-image-10:none!important}
.tsArcade .tsBubbleFaceHost .tsBubbleFaceSrcHidden,.tsArcade .tsBubbleFaceHost .tsBubbleFaceUnder{visibility:hidden!important}
.tsArcade .tsBubbleFaceHost img[src^="data:"]:not(.tsBubbleFaceImg),.tsArcade .tsBubbleFaceHost img[src*="bubble-expressions/"]:not(.tsBubbleFaceImg),.tsArcade .tsBubbleFaceHost>.uniqWordMaterialImage{opacity:0!important}
.tsArcade ts-face{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:var(--tsf-gap,3px);pointer-events:none!important;z-index:6;background:none!important;box-shadow:none!important;border:0!important;overflow:visible;contain:layout style}
.tsArcade ts-face-pic{position:relative;display:block;flex:0 0 auto;width:var(--tsf-pic,52px);height:var(--tsf-pic,52px);border-radius:50%;overflow:hidden;background:radial-gradient(circle at 50% 38%,rgba(255,255,255,.30),rgba(190,238,255,.12) 62%,rgba(255,255,255,.04));box-shadow:0 0 0 1.5px rgba(255,255,255,.55),0 0 12px rgba(120,236,255,.35);isolation:isolate}
.tsArcade ts-face-pic>img.tsBubbleFaceImg{position:absolute;left:50%;top:50%;width:var(--tsf-iw,100%);height:var(--tsf-ih,100%);transform:translate(-50%,-50%);object-fit:contain!important;object-position:50% 50%;display:block!important;opacity:1!important;filter:none;border-radius:0;max-width:none;margin:0;pointer-events:none;transition:opacity .25s ease}
.tsArcade ts-face.tsFaceNeg ts-face-pic>img.tsBubbleFaceImg{animation:tsFaceNegBreath 2.2s ease-in-out infinite}
.tsArcade ts-face.tsFacePos ts-face-pic{box-shadow:0 0 0 1.5px rgba(160,255,220,.75),0 0 16px rgba(85,255,218,.45)}
.tsArcade ts-face.tsFacePos ts-face-pic>img.tsBubbleFaceImg{animation:tsFacePosPop .6s cubic-bezier(.18,.9,.2,1.22) both}
.tsArcade ts-face-text.tsBubbleFaceText{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden;max-width:var(--tsf-tw,80%);font:900 var(--tsf-fs,12px)/1.12 Inter,system-ui,sans-serif;color:#fff;text-align:center;letter-spacing:.01em;word-break:break-word;overflow-wrap:anywhere;text-shadow:0 1px 2px rgba(0,30,60,.85),0 0 8px rgba(0,180,255,.45);background:none!important;padding:0;margin:0;pointer-events:none}
@keyframes tsFaceNegBreath{0%,100%{transform:translate(-50%,-50%) scale(1)}50%{transform:translate(-50%,-50%) scale(.965)}}
@keyframes tsFacePosPop{0%{transform:translate(-50%,-50%) scale(.82)}60%{transform:translate(-50%,-50%) scale(1.08)}100%{transform:translate(-50%,-50%) scale(1)}}
@media (prefers-reduced-motion:reduce){.tsArcade ts-face ts-face-pic>img.tsBubbleFaceImg{animation:none!important}}
`

function tsFaceEnsureStyle() {
    if (typeof document === "undefined" || document.getElementById("ts-bubble-face-css")) return
    const st = document.createElement("style")
    st.id = "ts-bubble-face-css"
    st.textContent = TS_BUBBLE_FACE_CSS
    ;(document.head || document.documentElement).appendChild(st)
}

function tsFaceVisible(el) {
    if (!el || !el.isConnected) return false
    const cs = getComputedStyle(el)
    return cs.display !== "none" && cs.visibility !== "hidden"
}

// the user's words inside a host (best match first); never our own face text
function tsFaceFindText(host, entryList) {
    const norm = (v) => String(v || "").replace(/\s+/g, " ").trim().toLowerCase()
    const leaves = Array.from(host.querySelectorAll("span,b,strong,em,div,p,small,label,text,tspan")).filter(
        (n) => !n.closest("ts-face") && !n.children.length && norm(n.textContent)
    )
    let best = null
    let bestScore = 0
    for (const n of leaves) {
        const v = norm(n.textContent).replace(/[.…]+$/, "")
        if (!v || v.length > 90 || TS_FACE_TEXT_SKIP.test(v)) continue
        let s = n.classList.contains("tsExactUserText") ? 6 : 1
        if (entryList.includes(v)) s = Math.max(s, 5)
        else if (entryList.some((e) => (e.startsWith(v) || v.startsWith(e)) && Math.min(e.length, v.length) >= 3)) s = Math.max(s, 4)
        if (s > bestScore) {
            best = n
            bestScore = s
        }
    }
    return best
}

function tsFaceInscribe(img) {
    // character art (transparent PNG/WebP made for circles) fills the circle; photos are scaled so that the
    // whole rectangle (its diagonal) fits inside the circle — nothing important is ever cropped.
    const w = img.naturalWidth
    const h = img.naturalHeight
    const isChar = /bubble-expressions\//.test(img.src)
    if (!w || !h || isChar) {
        img.style.removeProperty("--tsf-iw")
        img.style.removeProperty("--tsf-ih")
        return
    }
    const d = Math.sqrt(w * w + h * h)
    img.style.setProperty("--tsf-iw", ((w / d) * 100).toFixed(2) + "%")
    img.style.setProperty("--tsf-ih", ((h / d) * 100).toFixed(2) + "%")
}

// keep the pictures of this game (its negative AND positive faces) decoded in memory, so a face never shows an
// empty circle while its picture downloads, and the negative -> positive flip is instant
const TS_FACE_PRELOAD = new Map()
function tsFacePreload(list) {
    if (typeof Image === "undefined") return
    ;(list || []).forEach((src) => {
        if (!src || TS_FACE_PRELOAD.has(src) || /^data:/.test(src)) return
        if (TS_FACE_PRELOAD.size > 160) TS_FACE_PRELOAD.delete(TS_FACE_PRELOAD.keys().next().value)
        const im = new Image()
        im.decoding = "async"
        im.src = src
        TS_FACE_PRELOAD.set(src, im)
    })
}

function tsApplyBubbleFaces(root, st) {
    if (!root || !root.isConnected) return
    const norm = (v) => String(v || "").replace(/\s+/g, " ").trim().toLowerCase()
    const entryList = (st.entries || []).map(norm).filter(Boolean)
    const candidates = Array.from(root.querySelectorAll(TS_FACE_HOSTS)).filter((el) => {
        if (el.closest(TS_FACE_SKIP) || el.closest("ts-face")) return false
        const parentHost = el.parentElement && el.parentElement.closest(TS_FACE_HOSTS)
        if (parentHost && root.contains(parentHost) && !parentHost.closest(TS_FACE_SKIP)) return false // outermost only
        return true
    })
    // objects that carry the user's words but use a game-specific class (crush cans, meteors, dominoes …)
    Array.from(root.querySelectorAll(".tsExactUserText")).forEach((t) => {
        if (t.closest(TS_FACE_HOSTS) || t.closest(TS_FACE_SKIP) || t.closest("ts-face")) return
        if (t.closest(".engineProgressHud,.globalGestureGuide,.globalStepReward,.globalTripleReward,.uniqStatus,.literalStatus,.cleanseStatus,.eosGuide,.releaseFeedback")) return
        let n = t.parentElement
        for (let k = 0; k < 4 && n && n !== root; k++, n = n.parentElement) {
            const w = n.offsetWidth
            const h = n.offsetHeight
            if (w >= 56 && h >= 56 && w <= root.clientWidth * 0.7 && h <= root.clientHeight * 0.55) {
                candidates.push(n)
                return
            }
        }
    })
    const hosts = [...new Set(candidates)]
    const srcs = tsBubbleFaceSources({ game: st.game, entries: st.entries, uploads: st.uploads, progress: st.progress, count: 10, seed: st.seed || 0 })
    if (!st.__preloaded) {
        st.__preloaded = true
        tsFacePreload(srcs)
        tsFacePreload(tsBubbleFaceSources({ game: st.game, entries: st.entries, uploads: st.uploads, progress: 100, count: 10, seed: st.seed || 0 }))
    }
    const positiveAll = (Number(st.progress) || 0) >= 100
    let idx = 0
    const live = new Set()
    hosts.forEach((host) => {
        if (host.querySelector(":scope > .tsAutoEmotionPic, :scope > .tsExternalThoughtLabel")) return // the 100+ engine's standard face already serves it
        if (!tsFaceVisible(host)) return
        const w = host.offsetWidth
        const h = host.offsetHeight
        const D = Math.min(w, h)
        if (D < TS_FACE_MIN) return
        live.add(host)
        const slot = idx++ % 10
        if (!host.classList.contains("tsBubbleFaceHost")) host.classList.add("tsBubbleFaceHost")
        if (getComputedStyle(host).position === "static") {
            if (host.style.position !== "relative") host.style.position = "relative"
        }
        const textEl = tsFaceFindText(host, entryList)
        let face = host.querySelector(":scope > ts-face")
        if (!face) {
            face = document.createElement("ts-face")
            face.setAttribute("aria-hidden", "true")
            const pic = document.createElement("ts-face-pic")
            const img = document.createElement("img")
            img.className = "tsBubbleFaceImg"
            img.alt = ""
            img.draggable = false
            img.decoding = "async"
            img.addEventListener("load", () => tsFaceInscribe(img))
            pic.appendChild(img)
            const label = document.createElement("ts-face-text")
            label.className = "tsBubbleFaceText"
            face.appendChild(pic)
            face.appendChild(label)
            host.appendChild(face)
        }
        const img = face.querySelector("img.tsBubbleFaceImg")
        const label = face.querySelector("ts-face-text")
        const src = srcs[slot % srcs.length] || ""
        if (src && img.getAttribute("src") !== src) img.setAttribute("src", src)
        const text = textEl ? String(textEl.textContent || "").replace(/\s+/g, " ").trim() : ""
        if (label.textContent !== text) label.textContent = text
        if (label.hidden !== !text) label.hidden = !text
        if (textEl && !textEl.classList.contains("tsBubbleFaceSrcHidden")) textEl.classList.add("tsBubbleFaceSrcHidden")
        Array.from(host.querySelectorAll(".tsBubbleFaceSrcHidden")).forEach((n) => {
            if (n !== textEl) n.classList.remove("tsBubbleFaceSrcHidden")
        })
        // other words inside the bubble (counters such as "3 STRINGS HOLDING") would show through the picture:
        // they stay in the DOM (game logic untouched) but are hidden while the face covers them
        if (textEl) {
            Array.from(host.querySelectorAll("span,b,strong,em,small,div,p")).forEach((n) => {
                if (n === textEl || n.closest("ts-face") || n.children.length || !String(n.textContent || "").trim()) return
                if (n.closest("button") && n.closest("button") !== host) return
                if (!n.classList.contains("tsBubbleFaceUnder")) n.classList.add("tsBubbleFaceUnder")
            })
        }
        // sizing: picture + text fit inside the circle (text sits in the chord below the picture)
        const fs = Math.round(Math.max(9, Math.min(15, D * 0.13)))
        const lines = text ? (text.length * fs * 0.56 > D * 0.78 ? 2 : 1) : 0
        const textH = lines ? lines * fs * 1.12 + 2 : 0
        const picD = Math.round(Math.max(26, Math.min(D * (text ? 0.56 : 0.74), D * 0.9 - textH)))
        const vars = { "--tsf-pic": picD + "px", "--tsf-fs": fs + "px", "--tsf-tw": Math.round(D * 0.8) + "px", "--tsf-gap": Math.max(2, Math.round(D * 0.03)) + "px" }
        for (const k in vars) if (face.style.getPropertyValue(k) !== vars[k]) face.style.setProperty(k, vars[k])
        const isChar = /bubble-expressions\//.test(src)
        const pos = isChar && (positiveAll || /_E(\d+)\.webp/.test(src) && (RELEASE_PHASE_EMOTIONS.positive[(src.match(/\/([a-z]+)_E/) || [])[1]] || []).includes(Number(src.match(/_E(\d+)\.webp/)[1])))
        const want = isChar ? (pos ? "tsFacePos" : "tsFaceNeg") : "tsFaceUpload"
        if (face.className !== want) face.className = want
    })
    // hosts that stopped qualifying (removed from the game's bubble set) lose the face
    Array.from(root.querySelectorAll(".tsBubbleFaceHost")).forEach((host) => {
        if (live.has(host)) return
        if (!tsFaceVisible(host) && host.isConnected) return // keep while hidden (popping animation)
        host.classList.remove("tsBubbleFaceHost")
        const face = host.querySelector(":scope > ts-face")
        if (face) face.remove()
        Array.from(host.querySelectorAll(".tsBubbleFaceSrcHidden,.tsBubbleFaceUnder")).forEach((n) => n.classList.remove("tsBubbleFaceSrcHidden", "tsBubbleFaceUnder"))
    })
}

function useTsBubbleFaces(hostRef, { game, entries = [], uploads = [], progress = 0, seed = 0, enabled = true } = {}) {
    const stRef = React.useRef(null)
    stRef.current = { game, entries, uploads, progress, seed }
    const runRef = React.useRef(null)
    const uploadKey = (uploads || []).filter(Boolean).map((s) => String(s).length + ":" + String(s).slice(-12)).join(",")
    React.useLayoutEffect(() => {
        const root = hostRef.current
        if (!root || !enabled || typeof window === "undefined") return
        tsFaceEnsureStyle()
        let raf = 0
        let alive = true
        const run = () => {
            cancelAnimationFrame(raf)
            raf = requestAnimationFrame(() => {
                if (!alive) return
                try {
                    tsApplyBubbleFaces(root, stRef.current)
                } catch (e) {
                    /* a face must never break a game */
                }
            })
        }
        runRef.current = run
        run()
        const own = (m) => {
            const t = m.target
            if (t && t.nodeType === 1 && (t.tagName === "TS-FACE" || t.closest?.("ts-face"))) return true
            if (t && t.nodeType === 3 && t.parentElement?.closest("ts-face")) return true
            if (m.type === "childList") {
                const nodes = [...m.addedNodes, ...m.removedNodes]
                if (nodes.length && nodes.every((n) => n.nodeType === 1 && n.tagName === "TS-FACE")) return true
            }
            return false
        }
        const MO = window.MutationObserver
        const mo = MO ? new MO((muts) => { if (muts.some((m) => !own(m))) run() }) : null
        if (mo) mo.observe(root, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ["class"] })
        const timers = [120, 450, 1100, 2400].map((ms) => setTimeout(run, ms))
        window.addEventListener("resize", run)
        window.addEventListener("orientationchange", run)
        return () => {
            alive = false
            cancelAnimationFrame(raf)
            if (mo) mo.disconnect()
            timers.forEach(clearTimeout)
            window.removeEventListener("resize", run)
            window.removeEventListener("orientationchange", run)
            runRef.current = null
        }
    }, [enabled, game && game.id, (entries || []).join("|"), uploadKey, seed])
    // expression progression (negative -> positive) follows the release progress
    React.useEffect(() => {
        if (runRef.current) runRef.current()
    }, [Math.round(Number(progress) || 0)])
}

if (typeof window !== "undefined") {
    window.__tsBubbleFace = { HOST_SELECTOR: TS_FACE_HOSTS + ",.tsBubbleFaceHost,.tsStandardBubble,.tsThoughtLabelHost", SKIP: TS_FACE_SKIP, sources: tsBubbleFaceSources, spread: tsSpreadUploads }
}
