/* ================================================================== */
/* Root: theme, backdrop, Eclipse transitions, property controls       */
/* ================================================================== */

/** Dev only (localhost): ?tsmdesktop=1 renders the desktop shell around the same engines, for parity checks. */
function tsmDesktopShellRequested(): boolean {
    try {
        if (!hasWindow || !/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) return false
        return new URLSearchParams(location.search).get("tsmdesktop") === "1"
    } catch (e) {
        return false
    }
}

function TsmBackdrop({ calm }: { calm: boolean }) {
    const motes = React.useMemo(
        () =>
            Array.from({ length: 18 }, (_, i) => (
                <i key={i} className="tsmMote" style={{ left: `${noise(i, 1) * 100}%`, top: `${25 + noise(i, 2) * 75}%`, ["--d" as any]: `${11 + noise(i, 3) * 10}s`, ["--dl" as any]: `${-noise(i, 4) * 16}s`, ["--mx" as any]: `${(noise(i, 5) - 0.5) * 60}px` }} />
            )),
        []
    )
    return (
        <div className="tsmBackdrop" aria-hidden="true">
            <i className="tsmNebula n1" />
            <i className="tsmNebula n2" />
            <i className="tsmNebula n3" />
            {calm ? null : motes}
        </div>
    )
}

const TSM_THEME_KEY = "ts_release_theme"

let tsmCssCache = ""
function tsmAllCss(): string {
    if (!tsmCssCache) tsmCssCache = tsmScopeCss(TSM_CSS + ECLIPSE_CSS + ORB_CSS + TSM_SHELL_CSS + RITUAL_HOST_CSS + TSM_RITUAL_CSS.join("\n")) + TSM_DESKTOP_CSS + TSM_RITUAL_CSS_G1 + TSM_RITUAL_CSS_G2 + TSM_RITUAL_CSS_G3 + TSM_RITUAL_CSS_G4 + TSM_RITUAL_CSS_G5 + TSM_RITUAL_CSS_G6
    return tsmCssCache
}

function tsmCaptionFor(kind: string, info: any): EclipseRun["caption"] | undefined {
    const g = info && info.game
    const name = g ? tsmName(g.name) : ""
    const words = String((info && info.raw) || ((info && info.entries) || []).filter((e: string) => e !== "UPLOADED IMAGE").join(" ") || "").trim()
    if (kind === "launch") return { eyebrow: "Your thought, put into words", title: name, line: words ? `“${thoughtLine(words, 84)}”` : "Your pictures, ready to release" }
    if (kind === "next" || kind === "switch") return { eyebrow: "Next ritual · same words", title: name }
    if (kind === "replay") return { eyebrow: "Once more", title: name }
    if (kind === "reveal") return { eyebrow: "Words released", title: "Thought released" }
    return undefined
}

function ThinkStillReleaseMobile(props: any) {
    const {
        theme: themeProp = "auto",
        title = "Emotional Release Console",
        eosShowGameMenu = false,
        pixarIntensity = 0.75,
        pixarDust = 8,
        pixarBokeh = 6,
        ...rest
    } = props
    const prefersDark = usePrefersDark()
    const reducedOS = usePrefersReducedMotion()
    const [themePref, setThemePrefState] = React.useState<"auto" | "dark" | "bright">(() => {
        const v = lsGet(TSM_THEME_KEY)
        if (v === "auto" || v === "dark" || v === "bright") return v
        return themeProp === "dark" || themeProp === "bright" ? themeProp : "auto"
    })
    const setThemePref = React.useCallback((t: "auto" | "dark" | "bright") => {
        setThemePrefState(t)
        lsSet(TSM_THEME_KEY, t)
    }, [])
    const theme: ThemeName = themePref === "auto" ? (prefersDark ? "dark" : "bright") : themePref
    const [calm, setCalm] = React.useState(() => {
        try {
            return !!eosPrefs().calmVisuals
        } catch (e) {
            return false
        }
    })
    React.useEffect(() => {
        // mirror the console's calm-visuals preference (EOS store) for the backdrop and transitions
        try {
            const st: any = EOS_STORE
            const read = () => setCalm(!!st.get().calmVisuals)
            read()
            if (typeof st.subscribe === "function") return st.subscribe(read)
            const t = setInterval(read, 800)
            return () => clearInterval(t)
        } catch (e) {}
    }, [])
    const reduced = reducedOS || calm
    const sceneRef = React.useRef<HTMLDivElement>(null)
    const eclipse = React.useRef<EclipseCtl | null>(null)
    const reducedRef = useLatest(reduced)

    const titleText = React.useMemo(() => {
        const t = String(title || "Emotional Release Console")
            .replace(/\bARCADE\b/gi, "Console")
            .replace(/^\s*THINKSTILL\s+/i, "")
            .replace(/\s+by\s+THINKSTILL\s*$/i, "")
            .trim()
        return /[a-z]/.test(t) ? t : tsmName(t)
    }, [title])

    const transition = React.useCallback((kind: string, info: any, fn: () => void) => {
        const ctl = eclipse.current
        if (!ctl) return fn()
        let covered = false
        try {
            covered = !!document.querySelector("#tsmRoot .eosCkDive")
        } catch (e) {}
        if (hasWindow && /^(localhost|127\.0\.0\.1)$/.test(location.hostname)) console.log("[tsm] transition", kind, covered, Math.round(performance.now()))
        ctl.run({ apply: fn, covered, long: kind === "launch" && !reducedRef.current, caption: reducedRef.current ? undefined : tsmCaptionFor(kind, info) })
    }, [])

    const shell = React.useMemo<TsmShell>(() => ({ theme, themePref, setThemePref, eclipse, reduced, titleText, showLibrary: !!eosShowGameMenu }), [theme, themePref, reduced, titleText, eosShowGameMenu])

    const nativePlay = !!useTsmPlay()
    if (tsmDesktopShellRequested()) return <ThinkStillReleaseArcadePixar {...props} />

    return (
        <div id="tsmRoot" className="tsm" data-theme={theme} data-calm={calm ? "true" : "false"} data-native={nativePlay ? "true" : "false"} style={themeVars(theme)}>
            <style>{tsmAllCss()}</style>
            <TsmBackdrop calm={reduced} />
            <TsmContext.Provider value={shell}>
                <EclipseCurtain sceneRef={sceneRef} reduced={reduced} ctlRef={eclipse}>
                    <div ref={sceneRef} className="tsmScene">
                        <ThinkStillReleaseArcadePixar
                            {...rest}
                            title={titleText}
                            eosShowGameMenu={eosShowGameMenu}
                            pixarIntensity={pixarIntensity}
                            pixarDust={pixarDust}
                            pixarBokeh={pixarBokeh}
                            background="transparent"
                            mobileUI={MobileConsole}
                            tsTransition={transition}
                        />
                        <RitualLayer />
                    </div>
                </EclipseCurtain>
            </TsmContext.Provider>
        </div>
    )
}

/* ---------- property controls (desktop controls + mobile additions) ---------- */
const TSM_CONTROLS: Record<string, any> = {
    theme: { type: ControlType.Enum, title: "Appearance", options: ["auto", "dark", "bright"], optionTitles: ["Auto", "Dark", "Bright"], defaultValue: "auto" },
    title: { type: ControlType.String, title: "Title", defaultValue: "Emotional Release Console" },
    onClose: { type: ControlType.EventHandler, title: "On Close" },
    eosShowGameMenu: { type: ControlType.Boolean, title: "Show ritual library", defaultValue: false },
    soundOn: { type: ControlType.Boolean, title: "SFX On", defaultValue: true },
    hapticsOn: { type: ControlType.Boolean, title: "Haptics", defaultValue: true },
    musicOnDefault: { type: ControlType.Boolean, title: "Music Default", defaultValue: false },
    musicVolume: { type: ControlType.Number, title: "Music Volume", min: 0, max: 1, step: 0.05, defaultValue: 0.35 },
    tapOutBpm: { type: ControlType.Number, title: "Tap Out BPM", min: 40, max: 180, step: 1, defaultValue: 92 },
    bubbleTextPx: { type: ControlType.Number, title: "Bubble Text", min: 1, max: 28, step: 0.5, defaultValue: 16, unit: "px", displayStepper: true },
    pixarIntensity: { type: ControlType.Number, title: "Pixar Light", min: 0, max: 2, step: 0.05, defaultValue: 0.75 },
    pixarWarmth: { type: ControlType.Number, title: "Warmth", min: 0, max: 2, step: 0.05, defaultValue: 1 },
    pixarParallax: { type: ControlType.Boolean, title: "Light Follows", defaultValue: true },
    pixarSquash: { type: ControlType.Boolean, title: "Squash & Stretch", defaultValue: true },
    pixarBokeh: { type: ControlType.Number, title: "Bokeh", min: 0, max: 24, step: 1, defaultValue: 6 },
    pixarDust: { type: ControlType.Number, title: "Dust Motes", min: 0, max: 40, step: 1, defaultValue: 8 },
    eosCheckin: { type: ControlType.Boolean, title: "Emotion Check-in", defaultValue: true },
    eosCrisisLines: { type: ControlType.String, title: "Support Lines", displayTextArea: true, defaultValue: "US · 988 | Canada · 988 | UK & IE · Samaritans 116 123 | Australia · Lifeline 13 11 14 | India · Tele-MANAS 14416 | Anywhere · findahelpline.com" },
    eosCrisisUrl: { type: ControlType.String, title: "Support Link", defaultValue: "https://findahelpline.com" },
    eosEmergencyText: { type: ControlType.String, title: "Emergency Line", defaultValue: "In immediate danger? Call your local emergency number." },
    eosShareUrl: { type: ControlType.String, title: "Share Link", defaultValue: "" },
}
