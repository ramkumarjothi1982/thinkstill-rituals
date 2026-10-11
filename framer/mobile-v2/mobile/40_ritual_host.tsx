/* ================================================================== */
/* Native mobile rituals — host, context, faces                        */
/* ================================================================== */
// Every ritual is rebuilt for a phone: same mechanic, steps, word chunks, face changes and completion rule
// as the desktop ritual, but laid out for one thumb on a portrait screen. Rituals render in a layer OUTSIDE
// the desktop console's DOM (so none of the desktop CSS, HUDs or overlays can touch them) and talk to the
// console only through this context: words, faces, sfx, haptics, progress, hint and complete().

interface RitualCtx {
    id: number
    game: any
    name: string
    /** 6 word chunks, in order ("" for a picture-only chunk). */
    words: string[]
    /** The full thought as typed. */
    thought: string
    /** Picture for object i: an uploaded picture when there are uploads, otherwise the character face. */
    pic: (i: number, positive: boolean) => string | null
    uploaded: boolean
    /** Glass tint hue of object i (follows its character). */
    hue: (i: number) => number
    /** Character slug of object i (or of the feeling for a hero ritual). */
    char: (i: number) => string
    /** The feeling's own character + faces (hero rituals). */
    hero: { char: string; loud: string; calm: string; hue: number }
    emotion: string | null
    before: number | null
    seed: number
    reduced: boolean
    theme: ThemeName
    sfx: (kind: string) => void
    /** The desktop rain noise (seconds). */
    rain: (seconds?: number) => void
    haptic: (pattern: number | number[]) => void
    /** 0..1, never goes down. */
    progress: (p: number) => void
    hint: (text: string) => void
    /** Finale finished → the console shows the reveal. */
    complete: (bonus?: number) => void
    fx: FxApi
    size: { w: number; h: number }
}

interface RitualDef {
    id: number
    hint: string
    css?: string
    Comp: (p: { ctx: RitualCtx }) => React.ReactElement | null
}

const TSM_RITUALS: Record<number, RitualDef> = {}
const TSM_RITUAL_CSS: string[] = []
function tsmRitual(def: RitualDef) {
    TSM_RITUALS[def.id] = def
    if (def.css) TSM_RITUAL_CSS.push(def.css)
}

/* ---------- play store: the console publishes, the ritual layer (outside the console DOM) renders ---------- */

interface TsmPlayState {
    api: any
    key: string
    onProgress: (p: number) => void
    bottomInset: number
}
const tsmPlay = (() => {
    let state: TsmPlayState | null = null
    const subs = new Set<() => void>()
    return {
        get: () => state,
        set(next: TsmPlayState | null) {
            state = next
            subs.forEach((f) => {
                try {
                    f()
                } catch (e) {}
            })
        },
        subscribe(f: () => void) {
            subs.add(f)
            return () => {
                subs.delete(f)
            }
        },
    }
})()
function useTsmPlay(): TsmPlayState | null {
    return React.useSyncExternalStore(tsmPlay.subscribe, tsmPlay.get, tsmPlay.get)
}

/* ---------- faces: each object keeps its character; its expression flips negative → positive ---------- */

const TSM_EMO_CHAR: Record<string, string> = {
    anger: "rush",
    anxiety: "glitch",
    overwhelm: "sync",
    sad: "drop",
    overthinking: "loopie",
    panic: "sync",
    lonely: "drop",
    shame: "patch",
    fear: "glitch",
    jealous: "patch",
    numb: "sync",
    good: "still",
}
const TSM_FACE_NEG: Record<string, number[]> = { glitch: [11, 15, 56, 63, 70], drop: [44, 58, 70, 80], still: [41, 63], patch: [70, 73, 80], loopie: [29, 34, 54, 58], rush: [29, 52, 58, 63, 80], sync: [44, 48] }
const TSM_FACE_POS: Record<string, number[]> = { glitch: [7, 10], drop: [3, 6, 8, 9, 52], still: [15, 34, 61, 70, 90], patch: [11, 20, 32, 52, 58, 63, 72, 75], loopie: [15, 20, 32, 41, 63, 70], rush: [11, 20, 34, 44, 70], sync: [11, 20, 34, 61, 63, 70, 80, 90] }
const TSM_ALL_CHARS = ["glitch", "drop", "still", "patch", "loopie", "rush", "sync"]

function tsmFaceUrl(char: string, n: number): string {
    try {
        return emotionSrc(char, n)
    } catch (e) {
        return `https://raw.githubusercontent.com/ramkumarjothi1982/thinkstill-rituals/main/bubble-expressions/${char}_E${String(n).padStart(2, "0")}.webp`
    }
}

function tsmEmotionOf(api: any): string | null {
    const e = api && api.eos
    return (e && (e.emotion || e.detected)) || null
}

function tsmBuildFaces(api: any, count = 6) {
    const seed = Number(api.variationSeed) || 1
    const rnd = mulberry(seed * 7 + 13)
    const emo = tsmEmotionOf(api)
    const lead = emo && TSM_EMO_CHAR[emo] ? TSM_EMO_CHAR[emo] : null
    const rest = shuffled(TSM_ALL_CHARS.filter((c) => c !== lead), rnd)
    const order = lead ? [lead, ...rest] : rest
    const chars = Array.from({ length: count }, (_, i) => order[i % order.length])
    const pick = (arr: number[]) => arr[Math.floor(rnd() * arr.length)]
    const neg = chars.map((c) => tsmFaceUrl(c, pick(TSM_FACE_NEG[c] || [44])))
    const pos = chars.map((c) => tsmFaceUrl(c, pick(TSM_FACE_POS[c] || [70])))
    let heroLoud = neg[0]
    let heroCalm = pos[0]
    let heroChar = chars[0]
    try {
        const E = (EOS_EMO as any)[emo || ""]
        if (E) {
            heroChar = E.char
            heroLoud = tsmFaceUrl(E.char, E.loud)
            heroCalm = tsmFaceUrl(E.char, E.calm)
        }
    } catch (e) {}
    return { chars, neg, pos, hero: { char: heroChar, loud: heroLoud, calm: heroCalm, hue: CHAR_HUE[heroChar] ?? 210 } }
}

function tsmWords(api: any): string[] {
    const src: string[] = (api.renderedEntries && api.renderedEntries.length ? api.renderedEntries : api.entries) || []
    const w = src.map((x: string) => (String(x || "").toUpperCase() === "UPLOADED IMAGE" ? "" : String(x || "").trim()))
    while (w.length < 6) w.push(w.length ? w[w.length % Math.max(1, w.length)] || "" : "")
    return w.slice(0, 6)
}

/* ---------- the layer ---------- */

const RITUAL_HOST_CSS = String.raw`
.tsm .tsmRitualLayer{position:absolute;left:0;right:0;z-index:10;overflow:hidden;touch-action:none;-webkit-user-select:none;user-select:none;contain:layout paint}
.tsm .tsmRitualLayer .tsmRitualWorld{position:absolute;inset:0}
.tsm .tsmRitualLayer .tsmHintPill{position:absolute;left:50%;bottom:calc(14px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);z-index:40;max-width:calc(100% - 40px);
  display:flex;align-items:center;gap:8px;padding:10px 16px;border-radius:20px;white-space:nowrap;font-size:14.5px;font-weight:500;line-height:1.25;letter-spacing:-.005em;color:var(--ink);text-align:center;
  background:var(--surface);-webkit-backdrop-filter:blur(16px);backdrop-filter:blur(16px);box-shadow:inset 0 0 0 1px var(--hair2), 0 8px 24px rgba(0,0,0,.2);pointer-events:none;transition:opacity .3s}
.tsm .tsmRitualLayer .tsmHintPill.hide{opacity:0}
.tsm .tsmRitualLayer .tsmHintPill i{width:6px;height:6px;border-radius:50%;background:var(--accent);flex:none;animation:tsmPulse 1.6s ease-in-out infinite}
.tsm .tsmRitualLayer .tsmTag{font-size:12px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--ink3)}
`

function RitualLayer() {
    const play = useTsmPlay()
    const shell = React.useContext(TsmContext)
    if (!play || !play.api || !play.api.selected) return null
    const def = TSM_RITUALS[Number(play.api.selected.id)]
    if (!def) return null
    return <RitualHost key={play.key} play={play} def={def} theme={shell.theme} reduced={shell.reduced} />
}

function RitualHost({ play, def, theme, reduced }: { play: TsmPlayState; def: RitualDef; theme: ThemeName; reduced: boolean }) {
    const [ref, size] = useSize<HTMLDivElement>()
    const { ref: fxRef, fx } = useFx()
    const [hint, setHint] = React.useState(def.hint)
    const playRef = useLatest(play)
    const progRef = React.useRef(0)
    const doneRef = React.useRef(false)
    const api0 = React.useRef(play.api).current
    const faces = React.useMemo(() => tsmBuildFaces(api0, 6), [])
    const words = React.useMemo(() => tsmWords(api0), [])
    const uploads: string[] = React.useMemo(() => (api0.uploadedImages && api0.uploadedImages.length ? (api0.uploadSlots || api0.uploadedImages).slice(0, 6) : []), [])
    React.useEffect(() => {
        // warm the cache: every face this ritual can show
        faces.neg.concat(faces.pos, [faces.hero.loud, faces.hero.calm]).forEach((s) => preloadImage(s))
    }, [])
    const ctx = React.useMemo<RitualCtx>(() => {
        const api = api0
        return {
            id: Number(api.selected.id),
            game: api.selected,
            name: tsmName(api.selected.name),
            words,
            thought: String(api.raw || words.filter(Boolean).join(" ")).trim(),
            pic: (i, positive) => (uploads.length ? uploads[i % uploads.length] : (positive ? faces.pos : faces.neg)[i % 6]),
            uploaded: uploads.length > 0,
            hue: (i) => CHAR_HUE[faces.chars[i % 6]] ?? 210,
            char: (i) => faces.chars[i % 6],
            hero: faces.hero,
            emotion: tsmEmotionOf(api),
            before: api.eos && api.eos.before != null ? Number(api.eos.before) : null,
            seed: Number(api.variationSeed) || 1,
            reduced,
            theme,
            sfx: (k) => {
                try {
                    playRef.current.api.sfx(k)
                } catch (e) {}
            },
            rain: (sec) => {
                try {
                    playRef.current.api.rainSfx && playRef.current.api.rainSfx(sec)
                } catch (e) {}
            },
            haptic: (pattern) => {
                try {
                    if (playRef.current.api.haptics && hasWindow && navigator.vibrate) navigator.vibrate(pattern as any)
                } catch (e) {}
            },
            progress: (p) => {
                const v = clamp01(p)
                if (v <= progRef.current) return
                progRef.current = v
                try {
                    playRef.current.onProgress(Math.round(v * 100))
                } catch (e) {}
            },
            hint: (t) => setHint(t),
            complete: (bonus = 0) => {
                if (doneRef.current) return
                doneRef.current = true
                try {
                    playRef.current.onProgress(100)
                    playRef.current.api.done(bonus)
                } catch (e) {}
            },
            fx,
            size: { w: 0, h: 0 },
        }
    }, [])
    ctx.size = size
    ctx.theme = theme
    ctx.reduced = reduced
    const Comp = def.Comp
    return (
        <div ref={ref} className="tsmRitualLayer tsmUi" data-rid={def.id} style={{ top: `calc(env(safe-area-inset-top,0px) + 116px)`, bottom: play.bottomInset }}>
            <div className="tsmRitualWorld">{size.w > 0 ? <Comp ctx={ctx} /> : null}</div>
            <FxCanvas ref={fxRef} reduced={reduced} style={{ zIndex: 30 }} />
            <div className={cx("tsmHintPill", !hint && "hide")} role="status" aria-live="polite">
                <i aria-hidden="true" />
                <span>{hint}</span>
            </div>
        </div>
    )
}

/* ---------- small shared helpers for rituals ---------- */

/** Bounding area for objects: leaves room for the hint pill at the bottom. */
function tsmPlayArea(size: { w: number; h: number }, bottom = 76) {
    return { x: 0, y: 0, w: size.w, h: Math.max(200, size.h - bottom) }
}

/** Fit n circles of max diameter dMax into columns × rows with a gutter. */
function tsmGrid(n: number, area: { w: number; h: number }, cols: number, dMax: number, gutter = 18, stagger = 0.18) {
    const rows = Math.ceil(n / cols)
    const d = Math.floor(Math.min(dMax, (area.w - gutter * (cols + 1)) / cols, (area.h - gutter * (rows + 1)) / (rows + stagger * (cols > 1 ? 1 : 0))))
    const cellW = area.w / cols
    const cellH = area.h / rows
    return {
        d,
        pos: Array.from({ length: n }, (_, i) => {
            const c = i % cols
            const r = Math.floor(i / cols)
            const off = cols > 1 ? (c % 2 ? 1 : -1) * stagger * d * 0.5 : 0
            return { x: cellW * (c + 0.5), y: cellH * (r + 0.5) + off }
        }),
    }
}
