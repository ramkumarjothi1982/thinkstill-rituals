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
.tsArcade .tsBubbleFaceHost>:is(.tsAutoEmotionPic,.tsBubbleTextContainer,.tsExternalThoughtLabel),.tsArcade .tsThoughtLabelHost:has(ts-face)>:is(.tsBubbleTextContainer,.tsExternalThoughtLabel){opacity:0!important;visibility:hidden!important}
.tsArcade ts-face[data-round]::before{content:"";position:absolute;inset:3%;border-radius:50%;z-index:-1;pointer-events:none;background:radial-gradient(circle at 50% 36%,rgba(205,244,255,.30),rgba(140,214,255,.20) 58%,rgba(120,190,255,.12) 100%)}
.tsArcade.stage-play .releaseGameHost :is(.echoBubbleThumb,.rainCloudUnit .rainCloudImage,.rainCloudUnit .tsAutoEmotionPic){background:transparent!important}
.tsArcade.stage-play .releaseGameHost .rainCloudUnit :is(.rainCloudImage,.tsAutoEmotionPic){object-fit:contain!important;clip-path:none!important}
.tsArcade.stage-play .releaseGameHost :is(.tsExactUserText,.priorityBubbleTray button>span,.u96 .scratchTicket .revealed .exactWordsWithImage,.u96 .scratchTicket .revealed b,.u100 .thoughtPotato>span,.u100 .thoughtPotato .potatoWord,.u100 .thoughtPotato>b,.u94 .juggleWord,.u105 .dramaThoughtBox>span,.u98 .magicTrapBubble>span,.u87 .keepDropBubbleText,.u107 .gwCard>.gwThought,.zapBubbleCount,.weirdBubbleBadge){background:none!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important;box-shadow:none!important;text-shadow:0 0 2px rgba(0,22,48,.95),0 0 7px rgba(0,26,56,.72),0 0 14px rgba(0,190,255,.35)!important}
.tsArcade ts-face{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;padding-top:var(--tsf-top,8%);box-sizing:border-box;gap:var(--tsf-gap,3px);pointer-events:none!important;z-index:6;background:none!important;box-shadow:none!important;border:0!important;overflow:visible;contain:layout style}
.tsArcade ts-face-pic{position:relative;display:block;flex:0 0 auto;width:var(--tsf-pic,52px);height:var(--tsf-pic,52px);border-radius:50%;overflow:hidden;background:radial-gradient(circle at 50% 38%,rgba(255,255,255,.30),rgba(190,238,255,.12) 62%,rgba(255,255,255,.04));box-shadow:0 0 0 1.5px rgba(255,255,255,.55),0 0 12px rgba(120,236,255,.35);isolation:isolate}
.tsArcade ts-face-pic>img.tsBubbleFaceImg{position:absolute;left:50%;top:50%;width:var(--tsf-iw,100%);height:var(--tsf-ih,100%);transform:translate(-50%,-50%);object-fit:contain!important;object-position:50% 50%;display:block!important;opacity:1!important;filter:none;border-radius:0;max-width:none;margin:0;pointer-events:none;transition:opacity .25s ease}
.tsArcade ts-face.tsFaceNeg ts-face-pic>img.tsBubbleFaceImg{animation:tsFaceNegBreath 2.2s ease-in-out infinite}
.tsArcade ts-face.tsFacePos ts-face-pic{box-shadow:0 0 0 1.5px rgba(160,255,220,.75),0 0 16px rgba(85,255,218,.45)}
.tsArcade ts-face.tsFacePos ts-face-pic>img.tsBubbleFaceImg{animation:tsFacePosPop .6s cubic-bezier(.18,.9,.2,1.22) both}
.tsArcade ts-face-text.tsBubbleFaceText{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:var(--tsf-lines,2);overflow:hidden;flex:0 0 auto;width:max-content;max-width:var(--tsf-tw,80%);font:850 var(--tsf-fs,15px)/1.1 Inter,system-ui,sans-serif;color:#fff;text-align:center;letter-spacing:0;white-space:pre-line;word-break:normal;overflow-wrap:anywhere;text-shadow:0 0 2px rgba(0,22,48,.95),0 0 7px rgba(0,26,56,.7),0 0 14px rgba(0,190,255,.4);background:none!important;padding:0;margin:0;pointer-events:none}
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

// ---- F8 / GAP P5.5 standard geometry: picture in the top ~55% of the circle, the user's words BELOW it inside the
// same circle at >= 15 px on screen, picture >= 48 px. When the words do not fit, the BUBBLE grows (CSS `scale`,
// which composes with the game's own transform and keeps mechanics/hit-tests centred) instead of the text shrinking.
const TS_FACE_FS = 15
const TS_FACE_PIC_MIN = 48
const TS_FACE_GROW_MAX = 1.9
let tsFaceCtx = null
function tsFaceTextW(s, fs) {
    try {
        if (!tsFaceCtx) tsFaceCtx = document.createElement("canvas").getContext("2d")
        tsFaceCtx.font = `850 ${fs}px Inter, system-ui, sans-serif`
        return tsFaceCtx.measureText(s).width * 1.04
    } catch {
        return String(s).length * fs * 0.6
    }
}
// lay out (in on-screen px) a picture + up to maxLines lines inside a circle of diameter D; null when it does not fit
function tsFaceLayout(words, D, fs, picFrac, picMin, maxLines) {
    const r = D / 2
    const pic = Math.max(picMin, Math.round(D * picFrac))
    if (pic > D * 0.86) return null
    if (!words.length) return { pic, top: (D - pic) / 2, gap: 0, lines: [], tw: 0 }
    const top = Math.max(2, D * 0.06)
    const gap = Math.max(2, Math.round(D * 0.025))
    const lh = fs * 1.1
    const y0 = top + pic + gap
    const chord = (i) => {
        const a = y0 + i * lh
        const b = a + lh
        if (b > D - 1.5) return 0
        const dy = Math.max(Math.abs(a - r), Math.abs(b - r))
        return 2 * Math.sqrt(Math.max(0, r * r - dy * dy)) - 4
    }
    const lines = []
    let cur = ""
    for (const w of words) {
        const cand = cur ? cur + " " + w : w
        if (tsFaceTextW(cand, fs) <= chord(lines.length)) {
            cur = cand
            continue
        }
        if (!cur) return null
        lines.push(cur)
        cur = w
        if (lines.length >= maxLines || tsFaceTextW(cur, fs) > chord(lines.length)) return null
    }
    if (cur) lines.push(cur)
    if (lines.length > maxLines) return null
    return { pic, top, gap, lines, tw: Math.ceil(Math.max(...lines.map((l) => tsFaceTextW(l, fs)))) + 4 }
}
function tsFaceFit(text, D0, cap) {
    const words = String(text || "").split(/\s+/).filter(Boolean)
    for (let g = 1; g <= cap + 1e-6; g += 0.04) {
        const D = D0 * g
        const maxL = D >= 150 ? 3 : 2
        const f = tsFaceLayout(words, D, TS_FACE_FS, 0.54, TS_FACE_PIC_MIN, maxL) || tsFaceLayout(words, D, TS_FACE_FS, 0.46, TS_FACE_PIC_MIN, maxL)
        if (f) return { ...f, g, fs: TS_FACE_FS, ok: true }
    }
    // crowded rows (growth capped by neighbours / the arena edge): the words still stay inside the circle
    const D = D0 * cap
    for (const fs of [14, 13, 12])
        for (const pm of [44, 40, 34]) {
            const f = tsFaceLayout(words, D, fs, 0.42, pm, 3)
            if (f) return { ...f, g: cap, fs, ok: false }
        }
    const fs = 12
    return { pic: Math.max(30, Math.round(D * 0.4)), top: D * 0.07, gap: 2, lines: [words.join(" ")], tw: Math.round(D * 0.72), g: cap, fs, ok: false, clamp: 2 }
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
    // on-screen geometry of every bubble first: growth is capped by the arena edge and the nearest neighbour
    const arenaEl = root.querySelector(".arena") || root
    const ar = arenaEl.getBoundingClientRect()
    const geo = new Map()
    hosts.forEach((h) => {
        if (!tsFaceVisible(h)) return
        const r = h.getBoundingClientRect()
        if (r.width < 4 || r.height < 4) return
        geo.set(h, { cx: r.left + r.width / 2, cy: r.top + r.height / 2, d: Math.min(r.width, r.height) / (Number(h.dataset.tsfGrow) || 1) })
    })
    hosts.forEach((host) => {
        // one standard for every engine: the 100+ engine's own picture/name tag (.tsAutoEmotionPic / .tsExternalThoughtLabel)
        // stay in the DOM but are hidden under the shared face (no cover-crop, no tag outside the bubble, no dark tag)
        if (!tsFaceVisible(host)) return
        let w = host.offsetWidth
        let h = host.offsetHeight
        // true circles at rest (GAP P5.1-a / P3.1-j): a round bubble that is a few px taller/wider becomes square;
        // squash/stretch animations use transforms and stay transient
        const hcs = getComputedStyle(host)
        const rad = parseFloat(hcs.borderTopLeftRadius) || 0
        const round = /%/.test(hcs.borderTopLeftRadius) ? rad >= 45 : rad >= Math.min(w, h) * 0.45
        if (round && Math.abs(w - h) > 1 && Math.abs(w - h) <= Math.max(w, h) * 0.2 && Math.min(w, h) >= TS_FACE_MIN) {
            const side = Math.min(w, h)
            const k = h > w ? "height" : "width"
            ;[k, "min-" + k, "max-" + k].forEach((p) => host.style.setProperty(p, side + "px", "important"))
            host.style.setProperty("aspect-ratio", "1 / 1", "important")
            w = host.offsetWidth
            h = host.offsetHeight
        }
        const D = Math.min(w, h)
        if (D < TS_FACE_MIN) return
        host.__tsfRound = round
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
        // sizing (on-screen px): picture on top, the words below it inside the circle at >= 15 px; the bubble grows
        // (capped by the arena edge and the nearest neighbour) rather than the words shrinking
        const me = geo.get(host)
        const gPrev = Number(host.dataset.tsfGrow) || 1
        const sGame = me && D ? me.d / D : 1 // the game's own scale on this bubble (FINGER TRAP tube, entry pops …)
        if (sGame > 0.6 && sGame < 1.8) {
            const D0 = D * sGame
            let cap = TS_FACE_GROW_MAX
            if (me) {
                const edge = Math.min(me.cx - ar.left, ar.right - me.cx, me.cy - ar.top, ar.bottom - me.cy)
                cap = Math.min(cap, Math.max(1, edge / (D0 / 2)))
                geo.forEach((o, oh) => {
                    if (oh === host || oh.contains(host) || host.contains(oh)) return
                    const dist = Math.hypot(o.cx - me.cx, o.cy - me.cy)
                    if (dist >= 1) cap = Math.min(cap, Math.max(1, (2.24 * dist) / (D0 + o.d)))
                })
            }
            const key = text + "|" + Math.round(D0) + "|" + cap.toFixed(2)
            if (face.__tsfKey !== key) {
                face.__tsfKey = key
                const fit = tsFaceFit(text, D0, cap)
                const k = 1 / (sGame * fit.g)
                const px = (v) => (v * k).toFixed(1) + "px"
                const vars = { "--tsf-pic": px(fit.pic), "--tsf-fs": px(fit.fs), "--tsf-tw": px(fit.tw), "--tsf-gap": px(fit.gap), "--tsf-top": px(fit.top), "--tsf-lines": String(fit.clamp || Math.max(1, fit.lines.length)) }
                for (const v in vars) if (face.style.getPropertyValue(v) !== vars[v]) face.style.setProperty(v, vars[v])
                const shown = fit.clamp ? text : fit.lines.join("\n")
                if (label.textContent !== shown) label.textContent = shown
                face.dataset.tsfFit = fit.ok ? "1" : "0"
                if (fit.g > 1.01) {
                    host.style.setProperty("scale", fit.g.toFixed(3))
                    host.dataset.tsfGrow = fit.g.toFixed(3)
                } else if (gPrev !== 1) {
                    host.style.removeProperty("scale")
                    delete host.dataset.tsfGrow
                }
            }
        } else if (label.textContent.replace(/\n/g, " ") !== text) label.textContent = text
        const isChar = /bubble-expressions\//.test(src)
        const pos = isChar && (positiveAll || /_E(\d+)\.webp/.test(src) && (RELEASE_PHASE_EMOTIONS.positive[(src.match(/\/([a-z]+)_E/) || [])[1]] || []).includes(Number(src.match(/_E(\d+)\.webp/)[1])))
        const want = isChar ? (pos ? "tsFacePos" : "tsFaceNeg") : "tsFaceUpload"
        if (face.className !== want) face.className = want
        // a light glass disc behind picture + words: never a dark fill around them (founder F8 rule 6)
        if (face.hasAttribute("data-round") !== !!host.__tsfRound) face.toggleAttribute("data-round", !!host.__tsfRound)
    })
    // hosts that stopped qualifying (removed from the game's bubble set) lose the face
    Array.from(root.querySelectorAll(".tsBubbleFaceHost")).forEach((host) => {
        if (live.has(host)) return
        if (!tsFaceVisible(host) && host.isConnected) return // keep while hidden (popping animation)
        host.classList.remove("tsBubbleFaceHost")
        if (host.dataset.tsfGrow) {
            host.style.removeProperty("scale")
            delete host.dataset.tsfGrow
        }
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
        let tmo = 0
        let alive = true
        const apply = () => {
            cancelAnimationFrame(raf)
            clearTimeout(tmo)
            raf = 0
            tmo = 0
            if (!alive) return
            try {
                tsApplyBubbleFaces(root, stRef.current)
            } catch (e) {
                /* a face must never break a game */
            }
        }
        const run = () => {
            if (raf || tmo) return
            raf = requestAnimationFrame(apply)
            // a busy/throttled compositor (desktop canvases, background tabs) can starve rAF: the faces still paint
            tmo = setTimeout(apply, 140)
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
            clearTimeout(tmo)
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
