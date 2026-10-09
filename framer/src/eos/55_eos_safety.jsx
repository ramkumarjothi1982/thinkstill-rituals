// ===================================================================================
// EOS · 55 SAFETY — the safety card, the "💛 support" pill and local-first one-tap support lines.
// Spec: docs/EOS_SPEC.md §10 (all), §2.6. Task `safety`. Owns ONLY the UI: the lexicon, EosSafetyScan,
// EosFlagSafety, eosSafetyStrong and EOS_NEUTRAL_WORDS live in core (§0.2) so every caller scans synchronously.
//
// Public names (spec exports): EosSafetyLayer, EosSafetyCard, EosSupportPill, eosSafetyOrderLines,
// EOS_SAFETY_CSS, and eosExpose("safety", {scan, soft, open, close, orderLines, parseLines, region, state}).
//
// Behaviour (§10.2/§10.3):
//   * EosSafetyLayer({raw, stage, reduced}) — mounted by integration I2 inside .releaseStage in EVERY stage.
//     Scans `raw` 400 ms after typing pauses AND immediately on every stage change (EosMarkLaunch already flags
//     launches synchronously). Never writes the store during render.
//   * Card variants: selfharm · abuse · threat · soft · numb (the soft card after a numb loop) · info (no trigger:
//     the persistent "Need to talk to someone?" link / the pill). Dismissal is PER TYPE (store.safetyDismissed),
//     so a NEW trigger type re-shows the card even though the store flag never downgrades (selfharm > abuse >
//     threat > soft): the layer remembers which types were seen this app session (types only — never text).
//   * Never blocks: div.eosSafetyCard slides down at the top of the stage (z 230 = above the reveal overlay
//     and the Orb Shelf); the game, composer, menu and mic keep working underneath.
//   * Never steals focus while the user types or plays: an assertive live region announces it instead and focus
//     moves to the card on the next (non-play) stage change or on Tab / F6. Escape dismisses only from inside.
//     When opened from a tap (pill / link) focus moves to the primary button and returns on dismiss.
//   * Support lines come from the Framer property control (EOS_STORE.crisisLines, default EOS_PROP_DEFAULTS),
//     local line first from the device time zone (no network); one-tap tel: / sms: / https links.
//   * Nothing is written to storage. EOS_PRIVATE_ATTRS + fs-mask on the card.
// ===================================================================================

// ---------------------------------------------------------------- copy (exempt from the clinical-word lint)
const EOS_SAFETY_COPY = {
    selfharm: { title: "That sounds really heavy. You deserve real support right now.", body: "You don't have to carry this alone — talking to a person can help more than any game." },
    abuse: { title: "If someone is hurting you, you deserve to be safe.", body: "It's not your fault. A support line or someone you trust can help." },
    threat: { title: "If someone might hurt you, you deserve to be safe.", body: "A support line or someone you trust can help you make a plan." },
    soft: { title: "Big feelings keep coming back?", body: "Talking to someone can really help — you don't have to wait for it to get worse." },
    numb: { title: "Feeling far away for a while?", body: "Talking to someone you trust can help bring the colour back." },
    info: { title: "Want to talk to someone?", body: "These people are there for exactly this." },
}
const EOS_SAFETY_VARIANTS = ["selfharm", "abuse", "threat", "soft", "numb", "info"]
const EOS_SAFETY_NOTE = "We've kept your words off the game for now."
const EOS_SAFETY_ANNOUNCE = "Support options are open at the top of the screen."
const EOS_SAFETY_TRUST_TEXT = "Hey, can you talk? I'm having a hard time."
const EOS_SAFETY_RANKS = { soft: 1, threat: 2, abuse: 3, selfharm: 4 } // mirrors core's EOS_SAFETY_RANK

// ---------------------------------------------------------------- local-first support lines (§10.3 S7)
// Region from the device time zone only (Intl, no network). Spec list + every other Canadian zone id.
const EOS_SAFETY_CA_TZ =
    /^(?:Canada\/\w+|America\/(?:Toronto|Vancouver|Edmonton|Winnipeg|Halifax|St_Johns|Regina|Montreal|Moncton|Glace_Bay|Goose_Bay|Whitehorse|Dawson|Dawson_Creek|Yellowknife|Iqaluit|Rankin_Inlet|Cambridge_Bay|Inuvik|Swift_Current|Atikokan|Creston|Fort_Nelson|Nipigon|Thunder_Bay|Rainy_River|Pangnirtung|Resolute|Blanc-Sablon|Coral_Harbour))$/
// Which line label belongs to a region (labels only — values are never used to guess the region).
const EOS_SAFETY_REGION_LABEL = {
    CA: /\b(?:canada|ca)\b/i,
    US: /\b(?:us|usa|u\.s\.a?\.?|united\s+states|america)\b/i,
    UK: /\b(?:uk|u\.k\.?|ie|ireland|britain|england|scotland|wales)\b/i,
    AU: /\b(?:australia|au)\b/i,
    IN: /\b(?:india)\b/i,
}
function eosSafetyRegion(tz) {
    let z = tz
    if (z == null) {
        try {
            z = Intl.DateTimeFormat().resolvedOptions().timeZone
        } catch {
            z = ""
        }
    }
    z = String(z || "")
    if (EOS_SAFETY_CA_TZ.test(z)) return "CA"
    if (/^(?:America\/|US\/)/.test(z) || z === "Pacific/Honolulu") return "US"
    if (/^(?:Europe\/(?:London|Dublin|Belfast|Isle_of_Man|Jersey|Guernsey)|GB|GB-Eire|Eire)$/.test(z)) return "UK"
    if (/^Australia\//.test(z)) return "AU"
    if (/^Asia\/(?:Kolkata|Calcutta)$/.test(z)) return "IN"
    return null
}
function eosSafetySafeUrl(u) {
    const s = String(u || "").trim()
    return /^https?:\/\/[^\s"'<>]+$/i.test(s) ? s : ""
}
// One "label · value" entry → {label, value, name, number, tel, sms:{to, body}|null, url, domain, callOrText}.
// Only the VALUE is parsed for numbers ("24/7" in a label is never dialled). Exactly as §10.3:
//   "text WORD to NNNNN" → sms:NNNNN?&body=WORD · a phone-like run (≥ 3 digits) → tel: · a domain → https link
//   (to crisisUrl when it is that domain). "Call or text N" / 988 → also a secondary sms:N.
function eosSafetyParseLine(raw, crisisUrl = "") {
    const s = String(raw || "").replace(/\s+/g, " ").trim()
    if (!s) return null
    const cut = s.search(/\s[·•]\s|[·•]/)
    let label = ""
    let value = s
    if (cut >= 0) {
        label = s.slice(0, cut).trim()
        value = s.slice(cut).replace(/^\s*[·•]\s*/, "").trim()
    }
    let rest = value
    let sms = null
    const tm = rest.match(/\btext\s+([A-Za-z0-9]+)\s+to\s+(\+?\d(?:[\d\s-]*\d)?)/i)
    if (tm) {
        sms = { to: tm[2].replace(/[\s-]/g, ""), body: tm[1] }
        rest = rest.replace(tm[0], " ")
    }
    let tel = null
    let number = ""
    const runs = rest.match(/\+?\d(?:[\d\s-]*\d)?/g) || []
    for (const r of runs) {
        const digits = r.replace(/\D/g, "")
        if (digits.length >= 3) {
            tel = (r.trim().startsWith("+") ? "+" : "") + digits
            number = r.trim()
            break
        }
    }
    const textOnly = !!tel && /\btext\b/i.test(rest) && !/\bcall\b/i.test(rest)
    const callOrText = !!tel && !textOnly && (tel === "988" || /\bcall\s+or\s+text\b/i.test(rest))
    if (tel && textOnly && !sms) {
        sms = { to: tel, body: "" }
        tel = null
    } else if (callOrText && !sms) sms = { to: tel, body: "" }
    let url = ""
    let domain = ""
    if (!tel && !sms) {
        const dm = rest.match(/\b((?:[a-z0-9-]+\.)+[a-z]{2,})(\/[^\s]*)?/i)
        if (dm) {
            domain = dm[1].toLowerCase()
            const cu = eosSafetySafeUrl(crisisUrl)
            url = cu && cu.toLowerCase().includes(domain) ? cu : eosSafetySafeUrl(`https://${domain}${dm[2] || ""}`)
        }
    }
    let name = rest
    if (number) name = name.replace(number, " ")
    if (domain) name = name.replace(new RegExp(domain.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"), " ")
    name = name.replace(/\b(?:call|or|text|to)\b/gi, " ").replace(/[·•|,:;()]+/g, " ").replace(/(^|\s)[-–—]+(?=\s|$)/g, " ").replace(/\s+/g, " ").trim()
    return { raw: s, label, value, name, number, tel, sms, url, domain, callOrText }
}
function eosSafetyParseLines(lines, crisisUrl = "") {
    const list = Array.isArray(lines) ? lines : String(lines || "").split("|")
    const out = []
    for (const l of list) {
        const p = l && typeof l === "object" && "raw" in l ? l : eosSafetyParseLine(l, crisisUrl)
        if (p) out.push(p)
    }
    return out
}
// eosSafetyOrderLines(EOS_STORE.crisisLines) → parsed lines, the device region's line first (`local: true`).
// opts: {tz} to override the time zone (tests), {url} = crisisUrl for domain lines. Empty → the defaults.
function eosSafetyOrderLines(lines, opts = {}) {
    const src = (Array.isArray(lines) ? lines.length : String(lines || "").trim()) ? lines : EOS_PROP_DEFAULTS.crisisLines
    const url = opts.url != null ? opts.url : EOS_STORE.get().crisisUrl || EOS_PROP_DEFAULTS.crisisUrl
    const parsed = eosSafetyParseLines(src, url).map((p) => ({ ...p, local: false }))
    const region = eosSafetyRegion(opts.tz)
    const rx = region ? EOS_SAFETY_REGION_LABEL[region] : null
    if (rx) {
        const i = parsed.findIndex((p) => rx.test(p.label || p.value))
        if (i >= 0) {
            const [hit] = parsed.splice(i, 1)
            parsed.unshift({ ...hit, local: true })
        }
    }
    return parsed
}
function eosSafetySmsHref(sms) {
    if (!sms) return ""
    return `sms:${sms.to || ""}${sms.body ? `?&body=${encodeURIComponent(sms.body)}` : ""}`
}
// The one-tap action of a line: {href, text, kind, external}.
function eosSafetyLineAction(p) {
    if (!p) return null
    if (p.tel) {
        const nm = p.name && !/^\d+$/.test(p.name) ? `${p.name} ` : ""
        return { href: `tel:${p.tel}`, text: p.callOrText ? `Call or text ${p.number}` : `Call ${nm}${p.number}`, kind: "tel" }
    }
    if (p.sms) return { href: eosSafetySmsHref(p.sms), text: p.sms.body ? `Text ${p.sms.body} to ${p.sms.to}` : `Text ${p.sms.to}`, kind: "sms" }
    if (p.url) return { href: p.url, text: `Visit ${p.domain}`, kind: "url", external: true }
    return null
}

// ---------------------------------------------------------------- UI state (memory only: types, never text)
const EOS_SAFETY_UI = (() => {
    let s = { seen: {}, forced: null, softKind: "soft", nonce: 0, userAt: 0, softKey: "", softFired: false, softRun: null }
    const subs = new Set()
    return {
        get: () => s,
        set(p) {
            s = { ...s, ...p }
            subs.forEach((f) => {
                try {
                    f()
                } catch {}
            })
        },
        subscribe(f) {
            subs.add(f)
            return () => subs.delete(f)
        },
    }
})()
function useEosSafetyUi() {
    return React.useSyncExternalStore(EOS_SAFETY_UI.subscribe, EOS_SAFETY_UI.get, EOS_SAFETY_UI.get)
}
// Every trigger type present in the text (core's EosSafetyScan returns only the top one; a second type typed
// after the first was dismissed must still show its own card).
function eosSafetyScanAll(text) {
    const top = EosSafetyScan(text)
    if (!top) return []
    const out = [top]
    try {
        const s = eosNormText(text).replace(/\b\d+(?:[.,]\d+)?\s*kms\b/gi, " ")
        const L = EOS_SAFETY_LEX
        if (!out.includes("abuse") && (L.abuse.test(s) || L.abuse2.test(s))) out.push("abuse")
        if (!out.includes("threat") && typeof EOS_REAL_THREAT !== "undefined" && typeof EOS_THREAT_CARD !== "undefined" && EOS_REAL_THREAT.test(s) && EOS_THREAT_CARD.test(s)) out.push("threat")
        if (!out.includes("soft") && L.soft.test(s)) out.push("soft")
    } catch {}
    return out
}
function eosSafetySee(types, softKind) {
    const ui = EOS_SAFETY_UI.get()
    let seen = ui.seen
    const patch = {}
    for (const t of [].concat(types || [])) {
        if (!EOS_SAFETY_RANKS[t] || seen[t]) continue
        seen = { ...seen, [t]: true }
        patch.seen = seen
        if (t === "soft") patch.softKind = softKind || "soft"
    }
    if (patch.seen) EOS_SAFETY_UI.set(patch)
}
// Scan text → remember the types (memory only) → raise the store flag (precedence in core). Callbacks only.
function eosSafetyIngest(text) {
    const types = eosSafetyScanAll(text)
    if (!types.length) return null
    eosSafetySee(types)
    EosFlagSafety(types[0])
    return types[0]
}
// Highest-ranked trigger that was seen (or is the store flag) and is not dismissed yet.
function eosSafetyTriggered(st, ui) {
    const seen = { ...(ui.seen || {}) }
    if (st.safety) seen[st.safety] = true
    const dis = st.safetyDismissed || {}
    let best = null
    for (const t in seen) if (seen[t] && EOS_SAFETY_RANKS[t] && !dis[t] && (!best || EOS_SAFETY_RANKS[t] > EOS_SAFETY_RANKS[best])) best = t
    return best
}
// → {variant, triggered} for the current store + UI state (pure).
function eosSafetyView(st, ui) {
    const triggered = eosSafetyTriggered(st, ui)
    const f = ui.forced
    if (f && f !== "info") return { variant: f, triggered: null }
    if (triggered) return { variant: triggered === "soft" && ui.softKind === "numb" ? "numb" : triggered, triggered }
    return { variant: f || null, triggered: null }
}
// Open a card from a tap: "info" (default) or a variant (dev / tests). Any stage; never throws.
function eosSafetyOpen(variant = "info") {
    let v = String(variant || "info").toLowerCase()
    if (/^numb-?soft$/.test(v)) v = "numb"
    if (!EOS_SAFETY_VARIANTS.includes(v)) v = "info"
    const ui = EOS_SAFETY_UI.get()
    EOS_SAFETY_UI.set({ forced: v, nonce: ui.nonce + 1, userAt: Date.now() })
    return true
}
function eosSafetyClose() {
    if (EOS_SAFETY_UI.get().forced) EOS_SAFETY_UI.set({ forced: null })
}
// "I'm safe — keep playing": dismisses every trigger type seen so far (per type; a NEW type re-shows the card).
function eosSafetyDismiss() {
    const st = EOS_STORE.get()
    const ui = EOS_SAFETY_UI.get()
    const view = eosSafetyView(st, ui)
    if (ui.forced) EOS_SAFETY_UI.set({ forced: null })
    if (view.triggered) {
        const dis = { ...(st.safetyDismissed || {}) }
        const seen = { ...(ui.seen || {}) }
        if (st.safety) seen[st.safety] = true
        for (const t in seen) if (seen[t] && EOS_SAFETY_RANKS[t]) dis[t] = true
        EOS_STORE.set({ safetyDismissed: dis })
    }
}
function eosSafetyNum(v) {
    return v == null || v === "" || !Number.isFinite(+v) ? null : +v
}
// Soft trigger from the shift meter (§10.1): eosApi("safety").soft(shift). Fires only for a "better: down"
// feeling when after ≥ 9 with delta ≤ 1, or after ≥ 7 && after ≥ before on two consecutive RATED loops of the
// same feeling. Never for GOOD, never at low numbers. Numb gets its own copy. Idempotent per shift row.
function eosSafetySoft(shift) {
    try {
        if (!shift || typeof shift !== "object") return false
        const key = `${shift.t || 0}|${shift.gameId || 0}|${shift.emo || ""}|${shift.before}|${shift.after}`
        const ui = EOS_SAFETY_UI.get()
        if (ui.softKey === key) return ui.softFired
        const a = eosSafetyNum(shift.after)
        const b = eosSafetyNum(shift.before)
        const d = eosSafetyNum(shift.delta)
        const e = EOS_EMO[shift.emo]
        let run = ui.softRun
        let fire = false
        if (a != null) {
            if (e && e.better === "down") {
                const hit = a >= 7 && b != null && a >= b
                fire = (a >= 9 && d != null && d <= 1) || (hit && !!run && run.emo === shift.emo && run.hit)
                run = { emo: shift.emo, hit }
            } else run = { emo: shift.emo, hit: false } // a rated loop of another kind breaks the run
        }
        EOS_SAFETY_UI.set({ softKey: key, softFired: fire, softRun: run })
        if (fire) {
            const kind = shift.emo === "numb" ? "numb" : "soft"
            eosSafetySee(["soft"], kind)
            if (EOS_SAFETY_UI.get().softKind !== kind) EOS_SAFETY_UI.set({ softKind: kind })
            EosFlagSafety("soft")
        }
        return fire
    } catch {
        return false
    }
}
// Is the user typing or playing right now? (then the card must never take focus). `.arena *` counts only in
// stage-play: after the finish a game control can keep focus for a frame while the arena animates out.
function eosSafetyBusy(el, stage) {
    try {
        if (stage === "play") return true
        if (!el || typeof document === "undefined" || el === document.body || el === document.documentElement) return false
        if (el.closest && el.closest(".eosSafetyCard, .eosSupportPill")) return false
        if (el.matches && el.matches("input, textarea, select, [contenteditable], [contenteditable] *")) return true
        return !stage && !!(el.closest && el.closest(".arena"))
    } catch {
        return false
    }
}
// True while keyboard focus is inside the safety card or pill: other overlays (shift meter, check-in) should
// not move focus then — eosApi("safety").holdsFocus?.()
function eosSafetyHoldsFocus() {
    try {
        const a = typeof document !== "undefined" ? document.activeElement : null
        return !!(a && a.closest && a.closest(".eosSafetyCard, .eosSupportPill"))
    } catch {
        return false
    }
}
function eosSafetyFocus(el) {
    try {
        if (el && el.isConnected) el.focus({ preventScroll: true })
    } catch {}
}

// ---------------------------------------------------------------- UI
// The card. Self-sufficient (reads lines from the store); the layer passes refs + the dismiss handler.
function EosSafetyCard({ variant = "info", reduced = false, onDismiss, primaryRef, cardRef, tz, className = "" }) {
    const st = useEosStore()
    const calm = eosCalm(reduced)
    const v = EOS_SAFETY_COPY[variant] ? variant : "info"
    const copy = EOS_SAFETY_COPY[v]
    const strong = eosSafetyStrong(st.safety)
    const lines = React.useMemo(() => eosSafetyOrderLines(st.crisisLines, { tz, url: st.crisisUrl || EOS_PROP_DEFAULTS.crisisUrl }), [st.crisisLines, st.crisisUrl, tz])
    const emergency = String(st.emergencyText || EOS_PROP_DEFAULTS.emergencyText || "").trim()
    const [more, setMore] = React.useState(false)
    const first = lines.find((p) => eosSafetyLineAction(p)) || null
    const act = eosSafetyLineAction(first)
    const others = lines.filter((p) => p !== first)
    const fallbackUrl = eosSafetySafeUrl(st.crisisUrl || EOS_PROP_DEFAULTS.crisisUrl)
    const trustHref = `sms:?&body=${encodeURIComponent(EOS_SAFETY_TRUST_TEXT)}`
    const share = (e) => {
        try {
            if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
                e.preventDefault()
                navigator.share({ text: EOS_SAFETY_TRUST_TEXT }).catch(() => {})
            }
        } catch {}
    }
    const onKeyDown = (e) => {
        if (e.key === "Escape" && typeof onDismiss === "function") {
            e.stopPropagation()
            e.preventDefault()
            onDismiss("escape")
        }
    }
    const linkProps = (a) => (a && a.external ? { target: "_blank", rel: "noopener noreferrer" } : {})
    return (
        <div
            ref={cardRef}
            className={`eosSafetyCard fs-mask v-${v}${calm ? " isCalm" : ""} ${className}`}
            role="alertdialog"
            aria-modal="false"
            aria-labelledby="eosSafetyTitle"
            aria-describedby="eosSafetyBody"
            data-eos-variant={v}
            data-eos-calm={calm ? "1" : "0"}
            onKeyDown={onKeyDown}
            {...EOS_PRIVATE_ATTRS}
        >
            <div className="eosSafetyHead">
                <div className="eosSafetyStill" aria-hidden="true">
                    <i className="eosSafetyHalo" />
                    <EosCharacterOrb char="still" mood={15} hue={38} size={64} bob={false} reduced />
                    <i className="eosSafetyHeart">💛</i>
                </div>
                <div className="eosSafetyText">
                    <div id="eosSafetyTitle" className="eosSafetyTitle" role="heading" aria-level={2}>
                        {copy.title}
                    </div>
                    <div id="eosSafetyBody" className="eosSafetyBody">
                        {copy.body}
                        {strong ? <span className="eosSafetyNote">{EOS_SAFETY_NOTE}</span> : null}
                    </div>
                </div>
            </div>
            <div className="eosSafetyPrimaryRow">
                {act ? (
                    <a ref={primaryRef} className="eosSafetyBtn eosSafetyCall" href={act.href} data-eos-primary="1" data-eos-local={first.local ? "1" : "0"} {...linkProps(act)}>
                        <span className="eosSafetyIcon" aria-hidden="true">
                            {act.kind === "tel" ? "📞" : act.kind === "sms" ? "💬" : "🌐"}
                        </span>
                        <span className="eosSafetyCallText">
                            <b>{act.text}</b>
                            {first.label ? <small>{first.label}</small> : null}
                        </span>
                    </a>
                ) : fallbackUrl ? (
                    <a ref={primaryRef} className="eosSafetyBtn eosSafetyCall" href={fallbackUrl} target="_blank" rel="noopener noreferrer" data-eos-primary="1">
                        <span className="eosSafetyIcon" aria-hidden="true">
                            🌐
                        </span>
                        <span className="eosSafetyCallText">
                            <b>Find a helpline</b>
                        </span>
                    </a>
                ) : null}
                {first && first.tel && first.sms ? (
                    <a className="eosSafetyBtn eosSafetySms" href={eosSafetySmsHref(first.sms)} aria-label={`Text ${first.sms.to}${first.label ? `, ${first.label}` : ""}`}>
                        <span aria-hidden="true">💬</span> Text
                    </a>
                ) : null}
            </div>
            <div className="eosSafetyRow">
                <a className="eosSafetyBtn eosSafetyTrust" href={trustHref} onClick={share} data-eos-trust="1">
                    Text someone I trust
                </a>
                <button type="button" className="eosSafetyBtn eosSafetyOk" onClick={() => typeof onDismiss === "function" && onDismiss("button")} data-eos-dismiss="1">
                    {v === "info" ? "Back to ThinkStill" : "I'm safe — keep playing"}
                </button>
            </div>
            {others.length ? (
                <div className="eosSafetyMoreWrap">
                    <button type="button" className="eosSafetyMore" aria-expanded={more ? "true" : "false"} aria-controls="eosSafetyMoreList" onClick={() => setMore((m) => !m)}>
                        {more ? "fewer lines ▴" : "more lines ▾"}
                    </button>
                    {more ? (
                        <ul id="eosSafetyMoreList" className="eosSafetyList">
                            {others.map((p, i) => {
                                const a = eosSafetyLineAction(p)
                                return (
                                    <li key={`${p.raw}|${i}`} className="eosSafetyLine">
                                        <span className="eosSafetyLineLabel">{p.label || p.value}</span>
                                        <span className="eosSafetyLineActs">
                                            {a ? (
                                                <a className="eosSafetyLineBtn" href={a.href} {...linkProps(a)}>
                                                    {a.text}
                                                </a>
                                            ) : (
                                                <span className="eosSafetyLineText">{p.value}</span>
                                            )}
                                            {p.tel && p.sms ? (
                                                <a className="eosSafetyLineBtn" href={eosSafetySmsHref(p.sms)}>
                                                    Text {p.sms.to}
                                                </a>
                                            ) : null}
                                        </span>
                                    </li>
                                )
                            })}
                        </ul>
                    ) : null}
                </div>
            ) : null}
            {emergency ? <div className="eosSafetyEmergency">{emergency}</div> : null}
        </div>
    )
}

// The pill that stays for the app session after a triggered card was dismissed (top-left of the stage).
function EosSupportPill({ onOpen, reduced = false }) {
    const calm = eosCalm(reduced)
    return (
        <div className={`eosSupportPill${calm ? " isCalm" : ""}`} data-eos-calm={calm ? "1" : "0"}>
            <button type="button" aria-haspopup="dialog" aria-label="Support: talk to someone" onClick={() => (typeof onOpen === "function" ? onOpen() : eosSafetyOpen("info"))}>
                <span aria-hidden="true">💛</span> support
            </button>
        </div>
    )
}

// Mounted by I2 inside .releaseStage in every stage: <EosSafetyLayer raw={raw} stage={stage} reduced={!!reduced} />
function EosSafetyLayer({ raw = "", stage = "", reduced = false, tz }) {
    const st = useEosStore()
    const ui = useEosSafetyUi()
    const rawRef = React.useRef(raw)
    rawRef.current = raw
    const stageRef = React.useRef(stage)
    stageRef.current = stage
    const cardRef = React.useRef(null)
    const primaryRef = React.useRef(null)
    const prevRef = React.useRef(null)
    const pendRef = React.useRef(false)
    const firstStage = React.useRef(true)
    const [announce, setAnnounce] = React.useState("")
    const { variant } = eosSafetyView(st, ui)
    const variantRef = React.useRef(variant)
    variantRef.current = variant

    const focusCard = () => {
        const el = primaryRef.current || (cardRef.current && cardRef.current.querySelector("a,button"))
        eosSafetyFocus(el)
    }
    // Debounced scan while typing (400 ms after the last keystroke).
    React.useEffect(() => {
        if (!raw) return undefined
        const t = setTimeout(() => {
            try {
                eosSafetyIngest(rawRef.current)
            } catch {}
        }, 400)
        return () => clearTimeout(t)
    }, [raw])
    // Immediate scan on every stage change + focus hand-over that was deferred while typing / playing.
    React.useEffect(() => {
        try {
            eosSafetyIngest(rawRef.current)
        } catch {}
        if (firstStage.current) {
            firstStage.current = false
            return undefined
        }
        if (!pendRef.current || !variantRef.current || stage === "play") return undefined
        const t = setTimeout(() => {
            if (!pendRef.current || !variantRef.current) return
            const ae = typeof document !== "undefined" ? document.activeElement : null
            if (eosSafetyBusy(ae, stageRef.current)) return // already typing / playing in the new stage → keep waiting
            pendRef.current = false
            prevRef.current = ae && ae !== document.body ? ae : null
            focusCard()
        }, 300)
        return () => clearTimeout(t)
    }, [stage])
    // Mirror the store flag (EosMarkLaunch / router / soft) into the seen set.
    React.useEffect(() => {
        if (st.safety) eosSafetySee([st.safety])
    }, [st.safety])
    // A card appeared (or switched variant / was re-opened by a tap).
    React.useEffect(() => {
        if (!variant) {
            pendRef.current = false
            setAnnounce("")
            return undefined
        }
        if (typeof document === "undefined") return undefined
        const ae = document.activeElement
        if (cardRef.current && ae && cardRef.current.contains(ae)) return undefined
        const userAsked = ui.userAt && Date.now() - ui.userAt < 1500
        if (!userAsked && eosSafetyBusy(ae, stageRef.current)) {
            pendRef.current = true
            setAnnounce("")
            const t = setTimeout(() => setAnnounce(EOS_SAFETY_ANNOUNCE), 80)
            return () => clearTimeout(t)
        }
        pendRef.current = false
        prevRef.current = ae && ae !== document.body && !(ae.closest && ae.closest(".arena")) ? ae : null
        // a tap lands at once; an automatic hand-over waits for other overlays' mount-time autofocus (shift: 80 ms)
        const t = setTimeout(focusCard, userAsked ? 40 : 300)
        return () => clearTimeout(t)
    }, [variant, ui.nonce])
    // Tab / F6 while the card waits → into the card (once).
    React.useEffect(() => {
        if (!variant || typeof document === "undefined") return undefined
        const onKey = (e) => {
            if (!pendRef.current || (e.key !== "Tab" && e.key !== "F6")) return
            const card = cardRef.current
            if (!card) return
            pendRef.current = false
            if (card.contains(document.activeElement)) return
            e.preventDefault()
            prevRef.current = document.activeElement !== document.body ? document.activeElement : null
            focusCard()
        }
        document.addEventListener("keydown", onKey, true)
        return () => document.removeEventListener("keydown", onKey, true)
    }, [variant])

    const dismiss = () => {
        const back = prevRef.current
        const inside = !!(cardRef.current && typeof document !== "undefined" && cardRef.current.contains(document.activeElement))
        prevRef.current = null
        pendRef.current = false
        setAnnounce("")
        eosSafetyDismiss()
        if (!inside) return
        // back to where focus was; when that is gone (the pill hides while a card is open) → the pill, once it is back
        if (back && back.isConnected && !back.closest?.(".eosSafetyCard")) setTimeout(() => eosSafetyFocus(back), 0)
        else
            setTimeout(() => {
                try {
                    const a = document.activeElement
                    if (!a || a === document.body) eosSafetyFocus(document.querySelector(".eosSupportPill button"))
                } catch {}
            }, 60)
    }
    const dismissed = st.safetyDismissed || {}
    const pill = !variant && Object.keys(dismissed).some((k) => dismissed[k])
    return (
        <>
            <div className="eosSrOnly" aria-live="assertive" aria-atomic="true">
                {announce}
            </div>
            {variant ? <EosSafetyCard key="eosSafetyCard" variant={variant} reduced={reduced} onDismiss={dismiss} primaryRef={primaryRef} cardRef={cardRef} tz={tz} /> : null}
            {pill ? <EosSupportPill reduced={reduced} onOpen={() => eosSafetyOpen("info")} /> : null}
        </>
    )
}

// ---------------------------------------------------------------- CSS (cream card, warm light, Baloo 2)
const EOS_SAFETY_CSS = `
${EOS_A} .eosSafetyCard{position:absolute;z-index:230;top:12px;left:50%;translate:-50% 0;width:min(520px,calc(100% - 16px));max-height:calc(100% - 20px);overflow-x:hidden;overflow-y:auto;overscroll-behavior:contain;box-sizing:border-box;
padding:18px 18px 14px;border-radius:26px;pointer-events:auto;text-align:left;font-family:var(--eos-font);color:#3a1f45;-webkit-font-smoothing:antialiased;
background:radial-gradient(120% 80% at 10% 0%,#fffbf3 0%,#fff3e1 52%,#ffe6cb 100%);
box-shadow:0 0 0 2px rgba(255,206,140,.95),0 0 0 7px rgba(255,186,110,.16),0 22px 50px rgba(18,6,40,.5),0 0 80px rgba(255,180,100,.32);
animation:eosSafetySlide .3s cubic-bezier(.2,.9,.3,1.12) both}
${EOS_A} .eosSafetyCard.isCalm{animation:eosSafetyFade .3s ease both}
${EOS_A} .eosSafetyCard *{box-sizing:border-box}
${EOS_A} .eosSafetyHead{display:flex;align-items:flex-start;gap:14px}
${EOS_A} .eosSafetyStill{position:relative;flex:0 0 auto;width:64px;height:64px;margin-top:2px}
${EOS_A} .eosSafetyStill .eosOrb{position:relative;z-index:1}
${EOS_A} .eosSafetyHalo{position:absolute;inset:-14px;border-radius:50%;background:radial-gradient(closest-side,rgba(255,206,120,.85),rgba(255,170,90,.35) 55%,rgba(255,170,90,0));animation:eosSafetyHalo 6s ease-in-out infinite}
${EOS_A} .eosSafetyCard.isCalm .eosSafetyHalo{animation:none;opacity:.75}
${EOS_A} .eosSafetyStill .eosOrbBall{background:radial-gradient(circle at 34% 24%,rgba(255,255,255,.95),rgba(255,255,255,0) 32%),radial-gradient(circle at 50% 62%,#fff6e0 0%,#ffdca6 60%,#ffc07c 100%)!important;
box-shadow:inset 0 -6px 12px rgba(232,128,56,.32),inset 0 4px 10px rgba(255,255,255,.7),0 6px 16px rgba(206,112,40,.32),0 0 0 2px rgba(255,255,255,.85)!important}
${EOS_A} .eosSafetyHeart{position:absolute;z-index:2;right:-7px;bottom:-5px;font-style:normal;font-size:18px;line-height:1;filter:drop-shadow(0 2px 2px rgba(120,50,0,.3))}
${EOS_A} .eosSafetyText{min-width:0;flex:1}
${EOS_A} .eosSafetyTitle{margin:0 0 6px;font:800 20px/1.22 var(--eos-font)!important;letter-spacing:0!important;text-transform:none!important;color:#341a44!important;text-shadow:none!important}
${EOS_A} .eosSafetyBody{margin:0;font:500 16px/1.42 var(--eos-font)!important;color:#5a3b63!important;text-shadow:none!important}
${EOS_A} .eosSafetyNote{display:block;margin-top:6px;font:600 15px/1.35 var(--eos-font);font-style:italic;color:#7a4a2a}
${EOS_A} .eosSafetyPrimaryRow{display:flex;gap:8px;margin-top:14px}
${EOS_A} .eosSafetyRow{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px}
${EOS_A} .eosSafetyCard .eosSafetyBtn{display:flex!important;align-items:center!important;justify-content:center!important;gap:8px!important;min-height:48px!important;min-width:44px!important;margin:0!important;padding:8px 14px!important;border-radius:999px!important;
font:800 15px/1.15 var(--eos-font)!important;letter-spacing:0!important;text-transform:none!important;text-align:center!important;text-decoration:none!important;text-shadow:none!important;cursor:pointer!important;
color:#3a1f45!important;background:#fff!important;border:2px solid rgba(122,60,140,.28)!important;box-shadow:0 3px 0 rgba(122,60,140,.18)!important;transition:transform .12s ease,box-shadow .12s ease,background-color .12s ease!important;-webkit-tap-highlight-color:transparent}
${EOS_A} .eosSafetyCard .eosSafetyBtn:hover{background:#fff8ee!important}
${EOS_A} .eosSafetyCard .eosSafetyBtn:active{transform:translateY(2px)!important;box-shadow:0 1px 0 rgba(122,60,140,.18)!important}
${EOS_A} .eosSafetyCard .eosSafetyCall{flex:1 1 auto;min-height:58px!important;justify-content:flex-start!important;padding:8px 18px 8px 10px!important;border:0!important;
background:linear-gradient(180deg,#ffd27a 0%,#ffae5c 60%,#ff9650 100%)!important;color:#3a1a08!important;box-shadow:0 4px 0 #c7642c,0 10px 22px rgba(255,130,60,.35),inset 0 2px 0 rgba(255,255,255,.55)!important}
${EOS_A} .eosSafetyCard .eosSafetyCall:hover{background:linear-gradient(180deg,#ffdb8f 0%,#ffb86a 60%,#ffa05c 100%)!important}
${EOS_A} .eosSafetyCard .eosSafetyCall:active{box-shadow:0 2px 0 #c7642c,0 6px 14px rgba(255,130,60,.3)!important}
${EOS_A} .eosSafetyIcon{display:grid;place-items:center;flex:0 0 auto;width:40px;height:40px;border-radius:50%;background:rgba(255,255,255,.6);font-size:20px;line-height:1}
${EOS_A} .eosSafetyCallText{display:flex;flex-direction:column;align-items:flex-start;gap:2px;min-width:0;text-align:left}
${EOS_A} .eosSafetyCallText b{font:900 18px/1.1 var(--eos-font);color:#3a1a08}
${EOS_A} .eosSafetyCallText small{font:700 13px/1.1 var(--eos-font);letter-spacing:.04em;color:#7a3f12}
${EOS_A} .eosSafetyCard .eosSafetySms{flex:0 0 auto;min-height:58px!important;padding:8px 16px!important}
${EOS_A} .eosSafetyCard .eosSafetyOk{background:#fdf1ff!important}
${EOS_A} .eosSafetyMoreWrap{margin-top:6px}
${EOS_A} .eosSafetyCard .eosSafetyMore{display:inline-flex!important;align-items:center!important;min-height:44px!important;padding:6px 6px!important;margin:0!important;border:0!important;background:none!important;box-shadow:none!important;text-shadow:none!important;
font:800 15px/1.1 var(--eos-font)!important;color:#7a3c8c!important;text-decoration:underline!important;text-underline-offset:3px!important;cursor:pointer!important;transition:none!important}
${EOS_A} .eosSafetyList{list-style:none;margin:2px 0 0;padding:0;display:flex;flex-direction:column;gap:6px}
${EOS_A} .eosSafetyLine{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:6px 10px;padding:6px 6px 6px 12px;border-radius:16px;background:rgba(255,255,255,.65)}
${EOS_A} .eosSafetyLineLabel{font:800 15px/1.2 var(--eos-font);color:#4a2a55}
${EOS_A} .eosSafetyLineActs{display:flex;flex-wrap:wrap;gap:6px}
${EOS_A} .eosSafetyCard .eosSafetyLineBtn{display:inline-flex!important;align-items:center!important;min-height:44px!important;padding:6px 14px!important;border-radius:999px!important;background:#fff!important;border:2px solid rgba(255,150,80,.55)!important;box-shadow:none!important;
font:800 15px/1.1 var(--eos-font)!important;color:#3a1f45!important;text-decoration:none!important;text-shadow:none!important}
${EOS_A} .eosSafetyLineText{font:600 15px/1.2 var(--eos-font);color:#5a3b63}
${EOS_A} .eosSafetyEmergency{margin-top:8px;font:600 14px/1.35 var(--eos-font);color:#6a4a70}
${EOS_A} .eosSafetyCard :is(a,button):focus-visible{outline:3px solid #7a3cff!important;outline-offset:3px!important}
${EOS_A} .eosSupportPill{position:absolute;z-index:230;left:12px;top:12px;pointer-events:auto;animation:eosSafetyFade .3s ease both}
${EOS_A} .releaseStage:has(.eosCheckInChip) .eosSupportPill{top:66px}
/* play: below the HUD band and the arena's top-left step counter (.literalProgress) at both sizes */
${EOS_A}.stage-play .eosSupportPill{top:48px}
/* the check-in (footer) and the Orb Shelf carry their own "Need to talk to someone?" link (same card) — the pill
   steps aside while they are open instead of covering the check-in title / the shelf header */
${EOS_A} .releaseStage:is(:has(.eosOrbShelf),:has(.eosCheckIn [data-eos-support])) .eosSupportPill{display:none}
${EOS_A} .eosSupportPill button{display:inline-flex!important;align-items:center!important;gap:6px!important;min-height:44px!important;min-width:44px!important;margin:0!important;padding:4px 16px 4px 12px!important;border-radius:999px!important;cursor:pointer!important;
font:800 15px/1 var(--eos-font)!important;letter-spacing:.02em!important;text-transform:none!important;text-shadow:none!important;color:#3a1f45!important;
background:linear-gradient(180deg,#fff8ea,#ffe2bf)!important;border:2px solid rgba(255,200,130,.95)!important;box-shadow:0 6px 18px rgba(18,6,40,.45),0 0 22px rgba(255,180,100,.4)!important;transition:transform .12s ease!important}
${EOS_A} .eosSupportPill button:active{transform:scale(.96)!important}
${EOS_A} .eosSupportPill button:focus-visible{outline:3px solid var(--eos-gold-1)!important;outline-offset:3px!important}
@media (max-width:560px){
  ${EOS_A} .eosSafetyCard{top:8px;padding:14px 14px 10px;border-radius:22px}
  ${EOS_A} .eosSafetyHead{gap:12px}
  ${EOS_A} .eosSafetyStill{width:52px;height:52px}
  ${EOS_A} .eosSafetyStill .eosOrb{--eos-orb:52px!important}
  ${EOS_A} .eosSafetyBody{line-height:1.36!important}
  ${EOS_A} .eosSafetyPrimaryRow{margin-top:12px}
  ${EOS_A} .eosSafetyMoreWrap{margin-top:2px}
  ${EOS_A} .eosSafetyEmergency{margin-top:2px}
  ${EOS_A} .eosSafetyCallText b{font-size:17px}
  ${EOS_A} .eosSupportPill{left:8px;top:8px}
  ${EOS_A} .releaseStage:has(.eosCheckInChip) .eosSupportPill{top:62px}
  ${EOS_A}.stage-play .eosSupportPill{top:46px}
}
@keyframes eosSafetySlide{from{opacity:0;transform:translateY(-22px) scale(.97)}to{opacity:1;transform:none}}
@keyframes eosSafetyFade{from{opacity:0}to{opacity:1}}
@keyframes eosSafetyHalo{0%,100%{opacity:.55;scale:.92}50%{opacity:1;scale:1.06}}
@media (prefers-reduced-motion:reduce){${EOS_A} .eosSafetyCard{animation:eosSafetyFade .3s ease both}${EOS_A} .eosSafetyHalo{animation:none;opacity:.75}}
`
eosCss("safety", EOS_SAFETY_CSS)

eosExpose("safety", {
    scan: EosSafetyScan, // core's function, re-exposed for old callers
    scanAll: eosSafetyScanAll,
    soft: eosSafetySoft,
    open: eosSafetyOpen,
    close: eosSafetyClose,
    dismiss: eosSafetyDismiss,
    holdsFocus: eosSafetyHoldsFocus,
    orderLines: eosSafetyOrderLines,
    parseLines: eosSafetyParseLines,
    region: eosSafetyRegion,
    lineAction: eosSafetyLineAction,
    // dev / tests only: forget the in-memory UI state (seen types, soft run). Never called by the app.
    _testReset: () => {
        if (!eosIsDev()) return false
        EOS_SAFETY_UI.set({ seen: {}, forced: null, softKind: "soft", softKey: "", softFired: false, softRun: null })
        return true
    },
    // types only (never text): what the card would show right now
    state: () => {
        const st = EOS_STORE.get()
        const ui = EOS_SAFETY_UI.get()
        return { flag: st.safety, dismissed: { ...(st.safetyDismissed || {}) }, seen: { ...ui.seen }, softKind: ui.softKind, ...eosSafetyView(st, ui) }
    },
})
