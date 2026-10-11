/* ================================================================== */
/* Mobile console — rendered by ThinkStillReleaseArcade via mobileUI   */
/* ================================================================== */
// All logic (stage machine, router, rotation, rituals, shift meter, safety) stays in the desktop
// console; this file is presentation only. The desktop game host, EOS overlays, check-in and shift
// meter are passed in as nodes and placed inside the same .shell > section.releaseStage structure the
// desktop CSS expects, so every ritual runs exactly as it does on desktop.

/* ---------- per-ritual "release" verbs: thought → words → release ---------- */
const TSM_RELEASE_VERB: Record<number, string> = {
    1: "Pop",
    6: "Zap",
    15: "Shred",
    22: "Flush",
    25: "Swipe away",
    29: "Mute",
    32: "Park",
    36: "Let pass",
    39: "Let the black hole take",
    40: "Fly off",
    41: "Unhook",
    47: "Unfollow",
    52: "Subtitle",
    61: "Freeze",
    75: "Bleed out",
    79: "Miss",
    87: "Sort and drop",
    88: "Trade away",
    97: "X-ray",
    100: "Fling",
    101: "Drop the rope on",
    102: "Ease out of",
    105: "Cut the drama on",
    106: "Play out",
    107: "Make weird",
    110: "Rain out",
    111: "Breathe out",
    112: "Cool",
    113: "Ground",
    114: "Lift away",
    3: "Crack",
    4: "Stomp",
    8: "Launch",
    18: "Burn",
    24: "Sling away",
    109: "Cleanse",
}
function tsmVerb(game: any): string {
    const id = Number(game && game.id) || 0
    return TSM_RELEASE_VERB[id] || "Release"
}

/* ---------- small hooks ---------- */

/** Keyboard inset on phones (visualViewport), so the composer never hides under the keyboard. */
function useKeyboardInset(): number {
    const [inset, setInset] = React.useState(0)
    React.useEffect(() => {
        const vv: any = hasWindow ? (window as any).visualViewport : null
        if (!vv) return
        const on = () => {
            const k = Math.max(0, window.innerHeight - vv.height - vv.offsetTop)
            setInset(k > 60 ? Math.round(k) : 0)
        }
        vv.addEventListener("resize", on)
        vv.addEventListener("scroll", on)
        on()
        return () => {
            vv.removeEventListener("resize", on)
            vv.removeEventListener("scroll", on)
        }
    }, [])
    return inset
}

/** Reads the running ritual's progress (0..100) from the desktop HUD without touching the engine. */
function useRitualProgress(hostRef: React.RefObject<HTMLElement>, active: boolean, key: string): number {
    const [pct, setPct] = React.useState(0)
    React.useEffect(() => {
        setPct(0)
        if (!active) return
        let raf = 0
        let last = -1
        const read = () => {
            const host = hostRef.current
            if (!host) return
            let v = -1
            const bar = host.querySelector('[role="progressbar"]') as HTMLElement | null
            if (bar) {
                const now = Number(bar.getAttribute("aria-valuenow"))
                if (Number.isFinite(now)) v = now
            }
            if (v < 0) {
                const txt = host.querySelector(".engineProgressText")
                const m = txt && (txt.textContent || "").match(/(\d+)\s*%/)
                if (m) v = Number(m[1])
            }
            if (host.querySelector(".globalFinishFeedbackCopy")) v = 100
            if (v >= 0 && v !== last) {
                last = v
                setPct(clamp(v, 0, 100))
            }
        }
        const mo = typeof MutationObserver !== "undefined" ? new MutationObserver(() => {
            cancelAnimationFrame(raf)
            raf = requestAnimationFrame(read)
        }) : null
        const t = setInterval(read, 400)
        const attach = () => {
            const host = hostRef.current
            if (host && mo) mo.observe(host, { subtree: true, childList: true, attributes: true, characterData: true, attributeFilter: ["aria-valuenow", "class", "style"] })
        }
        const t0 = setTimeout(() => {
            attach()
            read()
        }, 60)
        return () => {
            clearInterval(t)
            clearTimeout(t0)
            cancelAnimationFrame(raf)
            mo && mo.disconnect()
        }
    }, [active, key])
    return pct
}

/** Rituals experienced in the current no-repeat cycle (v19 header counter semantics). */
function tsmRitualCycle(): { done: number; total: number } {
    try {
        const st = (eosApi("pick") as any).state()
        const ids: number[] = (eosApi("core") && (eosApi("core") as any).EOS_LAUNCH_IDS ? Array.from((eosApi("core") as any).EOS_LAUNCH_IDS) : []) as number[]
        const launch = ids.length ? ids : [111, 102, 114, 112, 1, 110, 100, 6, 105, 41, 29, 113, 101, 36, 107, 25, 61, 106, 32, 39, 40, 88, 75, 22, 97, 87, 79, 47, 15, 52]
        const mark = Math.max(0, Number(st && st.cyc && st.cyc.global) || 0)
        return { done: launch.filter((id) => st && st.at && st.at[id] != null && Number(st.at[id]) >= mark).length, total: launch.length || 30 }
    } catch (e) {
        return { done: 0, total: 30 }
    }
}

/* ---------- header ---------- */

function TsmHeader({ api, onSettings, settingsOpen }: { api: any; onSettings: () => void; settingsOpen: boolean }) {
    const shell = React.useContext(TsmContext)
    const backDisabled = api.stage === "input" && (api.checkinStep === 1 || !(api.eos && api.eos.phase === "checkin")) && !(api.eos && api.eos.phase !== "checkin" && false)
    const musicOn = !!api.musicOn
    return (
        <header className="tsmHeader tsmUi" data-stage={api.stage}>
            <div className="tsmHeadSide">
                <button type="button" className="tsmHBtn" aria-label="Previous screen" title="Previous screen" aria-disabled={backDisabled} onClick={() => {
                    if (backDisabled) return
                    tsmTick(api)
                    api.moveScreen(-1)
                }}>
                    <Icon name="back" />
                </button>
                <button type="button" className="tsmHBtn" aria-label="Next screen" title="Next screen" onClick={() => {
                    tsmTick(api)
                    api.moveScreen(1)
                }}>
                    <Icon name="forward" />
                </button>
            </div>
            <div className="tsmTitle" aria-label={`${shell.titleText} by ThinkStill`}>
                <b>{shell.titleText}</b>
                <span>
                    by <em>ThinkStill</em>
                </span>
            </div>
            <div className="tsmHeadSide right">
                <button type="button" className={cx("tsmHBtn", musicOn && "isOn")} aria-pressed={musicOn} aria-label={musicOn ? "Turn music off" : "Turn music on"} title="Music" onClick={() => {
                    tsmTick(api)
                    api.setMusicOn(!musicOn)
                }}>
                    <Icon name={musicOn ? "music" : "musicOff"} />
                    {musicOn ? <i className="tsmMusicPulse" aria-hidden="true" /> : null}
                </button>
                <button type="button" className={cx("tsmHBtn", settingsOpen && "isOn")} aria-label="Settings" aria-haspopup="dialog" aria-expanded={settingsOpen} title="Settings" onClick={() => {
                    tsmTick(api)
                    onSettings()
                }}>
                    <Icon name="gear" />
                </button>
                <button type="button" className="tsmHBtn" aria-label="Close console" title="Close console" onClick={() => {
                    tsmTick(api)
                    api.close()
                }}>
                    <Icon name="close" />
                </button>
            </div>
        </header>
    )
}

/* ---------- settings popover ---------- */

function TsmSwitch({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
    return (
        <button type="button" role="switch" aria-checked={on} aria-label={label} className={cx("tsmSwitch", on && "isOn")} onClick={() => onChange(!on)}>
            <i />
        </button>
    )
}

function TsmSettings({ api, open, onClose, onAbout }: { api: any; open: boolean; onClose: () => void; onAbout: () => void }) {
    const shell = React.useContext(TsmContext)
    const ref = React.useRef<HTMLDivElement>(null)
    React.useEffect(() => {
        if (!open) return
        const onDown = (e: Event) => {
            const t = e.target as Node
            if (ref.current && ref.current.contains(t)) return
            const el = t as HTMLElement
            if (el && el.closest && el.closest('[aria-label="Settings"]')) return
            onClose()
        }
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose()
        }
        document.addEventListener("pointerdown", onDown, true)
        document.addEventListener("keydown", onKey)
        return () => {
            document.removeEventListener("pointerdown", onDown, true)
            document.removeEventListener("keydown", onKey)
        }
    }, [open])
    if (!open) return null
    const cycle = tsmRitualCycle()
    return (
        <div ref={ref} className="tsmSettings tsmUi" role="dialog" aria-label="Settings">
            <div className="tsmSetHead">
                <b>Settings</b>
                <button type="button" className="tsmDone" onClick={onClose}>
                    Done
                </button>
            </div>
            <div className="tsmGroup">
                <div className="tsmRow">
                    <span>Sound effects</span>
                    <TsmSwitch label="Sound effects" on={!!api.sound} onChange={(v) => api.setSound(v)} />
                </div>
                <div className="tsmRow">
                    <span>Haptics</span>
                    <TsmSwitch label="Haptics" on={!!api.haptics} onChange={(v) => api.setHaptics(v)} />
                </div>
                <div className="tsmRow">
                    <span>Calm visuals</span>
                    <TsmSwitch label="Calm visuals" on={!!api.calm} onChange={(v) => api.setCalm(v)} />
                </div>
                <div className="tsmRow col">
                    <span>
                        Music volume <em>{Math.round((api.volume || 0) * 100)}%</em>
                    </span>
                    <input className="tsmRange" type="range" min={0} max={1} step={0.05} value={api.volume} aria-label="Music volume" onChange={(e) => api.setVolume(Number(e.target.value))} style={{ ["--v" as any]: `${Math.round((api.volume || 0) * 100)}%` }} />
                </div>
            </div>
            <div className="tsmGroup">
                <div className="tsmRow col">
                    <span>Appearance</span>
                    <div className="tsmSeg" role="radiogroup" aria-label="Appearance">
                        {(["auto", "dark", "bright"] as const).map((t) => (
                            <button key={t} type="button" role="radio" aria-checked={shell.themePref === t} className={cx(shell.themePref === t && "isOn")} onClick={() => shell.setThemePref(t)}>
                                {t === "auto" ? "Auto" : t === "dark" ? "Dark" : "Bright"}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
            <div className="tsmGroup">
                <button type="button" className="tsmRow link" onClick={() => {
                    onClose()
                    tsmOpenSupport()
                }}>
                    <span className="gold">
                        <Icon name="heart" size={18} /> Need to talk to someone?
                    </span>
                </button>
                <button type="button" className="tsmRow link" onClick={onAbout}>
                    <span>
                        <Icon name="info" size={18} /> About ThinkStill
                    </span>
                </button>
            </div>
            <div className="tsmSetFoot">
                Rituals this cycle · {cycle.done} of {cycle.total}
            </div>
        </div>
    )
}

function tsmOpenSupport() {
    try {
        const open = (eosApi("safety") as any).open
        if (typeof open === "function") open("info")
    } catch (e) {}
}

const TSM_ABOUT = "ThinkStill is a playful tool for everyday feelings — not therapy, diagnosis or a crisis service."

function TsmSheet({ open, onClose, title, children, className }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; className?: string }) {
    if (!open) return null
    return (
        <div className="tsmSheetWrap tsmUi" role="dialog" aria-label={title}>
            <div className="tsmScrim" onClick={onClose} />
            <div className={cx("tsmSheet", className)}>
                <i className="tsmGrab" aria-hidden="true" />
                <div className="tsmSheetHead">
                    <b>{title}</b>
                    <button type="button" className="tsmHBtn" aria-label="Close" onClick={onClose}>
                        <Icon name="close" size={20} />
                    </button>
                </div>
                {children}
            </div>
        </div>
    )
}

/* ---------- composer (words · voice · pictures · begin) ---------- */

function TsmComposer({ api, kb, mode, onUploads, onDone }: { api: any; kb: number; mode: "home" | "edit"; onUploads: () => void; onDone?: () => void }) {
    const n = api.uploadedImages.length
    const ready = !!String(api.raw || "").trim() || n > 0
    const inputRef = React.useRef<HTMLInputElement>(null)
    const begin = () => {
        tsmTick(api, 12)
        if (mode === "edit") {
            onDone && onDone()
            return
        }
        api.launchRelease()
    }
    return (
        <div className={cx("tsmComposer tsmUi", mode === "edit" && "isEdit", kb > 0 && "hasKb")} style={{ transform: kb ? `translateY(${-kb}px)` : undefined }}>
            {mode === "edit" ? <div className="tsmEditNote">Change your words — the ritual re-forms around them.</div> : null}
            <div className="tsmComposerRow">
                <button type="button" className={cx("tsmCBtn", n > 0 && "isOn")} aria-label={n ? `Pictures: ${n} of ${api.maxUploads}` : "Add pictures"} onClick={() => {
                    tsmTick(api)
                    onUploads()
                }}>
                    <Icon name={n ? "photo" : "plus"} />
                    {n ? <b className="tsmBadge">{n}</b> : null}
                </button>
                <div className={cx("tsmField", api.listening && "isListening")}>
                    <input
                        ref={inputRef}
                        className="releaseThoughtInput"
                        value={api.raw}
                        maxLength={2000}
                        enterKeyHint="go"
                        autoComplete="off"
                        autoCorrect="on"
                        spellCheck
                        placeholder="Put your emotion, feeling or thought into words to release it."
                        aria-label="Put your emotion, feeling or thought into words to release it."
                        onChange={(e) => api.setRaw(String(e.target.value || "").slice(0, 2000))}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") {
                                e.preventDefault()
                                ;(e.target as HTMLInputElement).blur()
                                begin()
                            }
                        }}
                    />
                    <button type="button" className={cx("tsmMic", api.listening && "isOn")} aria-label={api.listening ? "Stop microphone" : "Use microphone"} onClick={() => {
                        tsmTick(api)
                        api.toggleMic()
                    }}>
                        <Icon name="mic" size={20} />
                        {api.listening ? <i className="tsmMicWave" aria-hidden="true" /> : null}
                    </button>
                </div>
                <button type="button" className={cx("tsmGo", ready && "isReady")} aria-label={mode === "edit" ? "Done" : "Begin ritual"} onClick={begin}>
                    {mode === "edit" ? <Icon name="check" /> : <i className="tsmGoEcl" aria-hidden="true" />}
                </button>
            </div>
        </div>
    )
}

function TsmUploads({ api, open, onClose }: { api: any; open: boolean; onClose: () => void }) {
    const imgs: string[] = api.uploadedImages || []
    const max = api.maxUploads || 6
    return (
        <TsmSheet open={open} onClose={onClose} title="Your pictures" className="tsmUploadSheet">
            <p className="tsmSheetLead">Pictures replace the emotion characters inside your ritual. One picture fills every bubble; more are shared out evenly.</p>
            <div className="tsmSlots">
                {Array.from({ length: max }, (_, i) =>
                    imgs[i] ? (
                        <div key={i} className="tsmSlot filled">
                            <img src={imgs[i]} alt={`Uploaded picture ${i + 1}`} draggable={false} />
                            <button type="button" className="tsmSlotX" aria-label={`Remove picture ${i + 1}`} onClick={() => api.removeUploadedImage(i)}>
                                <Icon name="close" size={14} stroke={2.4} />
                            </button>
                        </div>
                    ) : (
                        <button key={i} type="button" className="tsmSlot" aria-label={`Add picture ${i + 1}`} onClick={() => api.chooseUploadFiles()}>
                            <Icon name="plus" size={22} />
                        </button>
                    )
                )}
            </div>
            <button type="button" className="tsmPrimary wide" disabled={imgs.length >= max} onClick={() => api.chooseUploadFiles()}>
                {imgs.length >= max ? `${max} pictures attached` : "Choose pictures"}
            </button>
            <p className="tsmSheetFoot">JPG, PNG or GIF · up to {max} images. Remove them all to bring the characters back.</p>
        </TsmSheet>
    )
}

/* ---------- thought → words → release ---------- */

function TsmStory({ api, pct, editing, onEdit }: { api: any; pct: number; editing: boolean; onEdit: () => void }) {
    const g = api.selected
    const done = pct >= 100
    const verb = tsmVerb(g)
    return (
        <div className={cx("tsmStory tsmUi", done && "isDone")} aria-label={`${tsmName(g ? g.name : "")}: ${verb} your words to release the thought. ${Math.round(pct)}%`}>
            <div className="tsmStoryTop">
                <div className="tsmStoryText">
                    <b>{tsmName(g ? g.name : "")}</b>
                    <span>{done ? "Words released · thought released" : `${verb} your words`}</span>
                </div>
                <button type="button" className={cx("tsmStoryEdit", editing && "isOn")} onClick={onEdit} aria-label={editing ? "Close word editor" : "Edit your words"} aria-pressed={editing}>
                    <Icon name="edit" size={17} />
                </button>
            </div>
            <div className="tsmSteps" aria-hidden="true">
                <span className="tsmStep isOn">
                    <i />
                    Thought
                </span>
                <span className="tsmStepLine isOn" />
                <span className="tsmStep isOn">
                    <i />
                    Words
                </span>
                <span className="tsmStepLine" style={{ ["--p" as any]: `${pct}%` }}>
                    <em />
                </span>
                <span className={cx("tsmStep", done && "isOn")}>
                    <i />
                    Released
                </span>
            </div>
        </div>
    )
}

/* ---------- home (input stage) ---------- */

function TsmHome({ api }: { api: any }) {
    const checkin = !!api.nodes.checkIn
    if (checkin) return null
    return (
        <div className="tsmHome tsmUi">
            <div className="tsmHomeEcl">
                <Eclipse size={168} />
            </div>
            <h1 className="tLarge">What are you carrying?</h1>
            <p className="tSub">Put the thought into words. Then release the words — and the thought goes with them.</p>
            <ol className="tsmHowSteps">
                <li>
                    <b>1</b>
                    <span>
                        <strong>Name the feeling</strong>Use your words or your voice.
                    </span>
                </li>
                <li>
                    <b>2</b>
                    <span>
                        <strong>Give it a form</strong>Your words become part of a ritual.
                    </span>
                </li>
                <li>
                    <b>3</b>
                    <span>
                        <strong>Release the words</strong>Act on them. Notice what changes.
                    </span>
                </li>
            </ol>
            {api.nodes.checkInChip}
        </div>
    )
}

/* ---------- reveal (end screen) ---------- */

function TsmWordsReleased({ api }: { api: any }) {
    const words = String(api.raw || (api.entries || []).filter((e: string) => e !== "UPLOADED IMAGE").join(" ")).trim()
    const letters = React.useMemo(() => Array.from(thoughtLine(words, 90)), [words])
    if (!words) return null
    return (
        <div className="tsmReleasedWords" aria-label={`Your words, released: ${words}`}>
            <span className="tsmRWLabel">Your words</span>
            <p aria-hidden="true">
                <span className="tsmWordsGhost">{thoughtLine(words, 90)}</span>
                {letters.map((ch, i) => (
                    <i key={i} style={{ ["--d" as any]: `${0.35 + (i % 23) * 0.035 + Math.floor(i / 23) * 0.12}s`, ["--x" as any]: `${((i * 37) % 31) - 15}px`, ["--r" as any]: `${((i * 53) % 60) - 30}deg` }}>
                        {ch === " " ? " " : ch}
                    </i>
                ))}
            </p>
            <span className="tsmRWLine">Released — and the thought went with them.</span>
        </div>
    )
}

function TsmReveal({ api }: { api: any }) {
    const g = api.selected
    if (!g) return null
    const meter = api.nodes.shiftMeter
    const meterOn = !!(api.eos && api.eos.checkinEnabled)
    const ff = api.persistentFinalFeedback
    const rec = api.recommendedReleaseGame
    return (
        <div className="tsmReveal tsmUi">
            <div className="tsmRevealHero">
                <Eclipse size={92} flareKey={g.id} />
                <div className="tsmRevealTitle">
                    <span className="tEyebrow">Ritual complete · +{api.lastGain} Still</span>
                    <h2>{tsmName(g.name)}</h2>
                    {ff ? (
                        <p className="tsmHeadline">
                            <b>{ff.headline}</b>
                            <span>{ff.shift}</span>
                        </p>
                    ) : null}
                </div>
            </div>
            <TsmWordsReleased api={api} />
            {meterOn ? (
                <div className="tsmMeterWrap">{meter}</div>
            ) : (
                <div className="tsmCheck">
                    <h3>Feel a shift?</h3>
                    <div className="tsmCheckRow">
                        <button type="button" className={cx("tsmChoice", api.releaseCheck === "yes" && "isOn")} onClick={() => api.setReleaseCheck("yes")}>
                            Yes <Icon name="check" size={18} />
                        </button>
                        <button type="button" className={cx("tsmChoice", api.releaseCheck === "no" && "isOn")} onClick={() => api.setReleaseCheck("no")}>
                            Not yet
                        </button>
                    </div>
                    {api.releaseCheck === "yes" ? (
                        <div className="tsmCheckOut">
                            <p className="tsmMind">{g.mindBend}</p>
                            <div className="tsmActions">
                                <button type="button" className="tsmSecondary" onClick={api.clearForNext}>
                                    New thought
                                </button>
                                <button type="button" className="tsmPrimary" onClick={api.tryRecommendedRelease}>
                                    {api.eosMenuOn && rec ? `Try ${tsmName(rec.name)}` : "Next ritual"}
                                </button>
                            </div>
                        </div>
                    ) : api.releaseCheck === "no" ? (
                        <div className="tsmCheckOut">
                            <div className="tsmReco">
                                {api.recommendedReleasePreviewImage ? <img src={api.recommendedReleasePreviewImage} alt="" draggable={false} /> : null}
                                <div>
                                    <span className="tEyebrow">A ritual to try next</span>
                                    <strong>{api.eosMenuOn && rec ? tsmName(rec.name) : "Next ritual"}</strong>
                                    <p>{(rec && (rec.mindBend || rec.action)) || "Try another way to change your relationship to this thought."}</p>
                                </div>
                            </div>
                            <div className="tsmActions">
                                <button type="button" className="tsmSecondary" onClick={api.clearForNext}>
                                    New thought
                                </button>
                                <button type="button" className="tsmPrimary" onClick={api.tryRecommendedRelease}>
                                    Next ritual
                                </button>
                            </div>
                        </div>
                    ) : null}
                    <button type="button" className="tsmGhost" onClick={api.replay} aria-label={`Try ${g.name} again`}>
                        <Icon name="repeat" size={18} /> Repeat
                    </button>
                </div>
            )}
            {api.eosMenuOn ? (
                <div className="tsmLibNav">
                    <button type="button" className="tsmGhost" onClick={() => api.openAdjacentRelease(-1)}>
                        ‹ Previous ritual
                    </button>
                    <button type="button" className="tsmGhost" onClick={() => api.openAdjacentRelease(1)}>
                        Next ritual ›
                    </button>
                </div>
            ) : null}
        </div>
    )
}

/* ---------- toast ---------- */

function TsmToast({ text, lift }: { text: string; lift: number }) {
    const [shown, setShown] = React.useState("")
    React.useEffect(() => {
        if (text) setShown(text)
    }, [text])
    return (
        <div className={cx("tsmToast tsmUi", text && "isOn")} role="status" aria-live="polite" style={{ ["--lift" as any]: `${lift}px` }}>
            {tsmSentence(shown)}
        </div>
    )
}

/* ---------- the console ---------- */

function MobileConsole({ api }: { api: any }) {
    const shell = React.useContext(TsmContext)
    const [settings, setSettings] = React.useState(false)
    const [about, setAbout] = React.useState(false)
    const [uploads, setUploads] = React.useState(false)
    const [editing, setEditing] = React.useState(false)
    const kb = useKeyboardInset()
    const n = api.nodes
    const stage: string = api.stage
    const playKey = api.selected ? `${api.selected.id}-${api.variationSeed}-${api.materialRevision}` : "none"
    const pct = useRitualProgress(api.gameHostRef, stage === "play", playKey)
    const rootRef = React.useRef<HTMLDivElement>(null)

    // music: the shared ThinkStill source when present, otherwise the Eclipse score
    useEclipseScore(!!api.musicOn && !api.hasSharedMusic, api.volume ?? 0.35, api.musicBubble || "drop")

    React.useEffect(() => {
        if (stage !== "play") setEditing(false)
        if (stage === "play") setUploads(false)
    }, [stage])

    const showComposer = stage === "input" || (stage === "play" && editing)
    const checkinUp = !!n.checkIn

    return (
        <div ref={rootRef} className={cx("shell tsmShell", `tsm-${stage}`, checkinUp && "tsmCheckinUp")} data-ritual={api.selected ? api.selected.id : ""}>
            <TsmHeader api={api} settingsOpen={settings} onSettings={() => setSettings((v) => !v)} />
            {stage === "play" && api.selected ? <TsmStory api={api} pct={pct} editing={editing} onEdit={() => setEditing((v) => !v)} /> : null}
            <section className="releaseStage">
                {n.thoughtFlow}
                {stage === "input" ? <TsmHome api={api} /> : null}
                {n.checkIn}
                {n.worldChips}
                {n.safety}
                {n.game}
                {n.eosPlay}
                {n.pickBridge}
                {n.textFloor}
                {stage === "reveal" ? <TsmReveal api={api} /> : null}
            </section>
            {showComposer ? <TsmComposer api={api} kb={kb} mode={stage === "input" ? "home" : "edit"} onUploads={() => setUploads(true)} onDone={() => setEditing(false)} /> : null}
            <div style={{ display: "none" }}>{n.fileInput}</div>
            <TsmToast text={api.statusText} lift={showComposer ? 88 + kb : 26} />
            <TsmSettings api={api} open={settings} onClose={() => setSettings(false)} onAbout={() => {
                setSettings(false)
                setAbout(true)
            }} />
            <TsmUploads api={api} open={uploads} onClose={() => setUploads(false)} />
            <TsmSheet open={about} onClose={() => setAbout(false)} title="About ThinkStill">
                <p className="tsmSheetLead">{TSM_ABOUT}</p>
                <p className="tsmSheetLead">Each ritual turns a thought into words, gives the words a form, and lets you release them — so the thought loosens its grip.</p>
                <button type="button" className="tsmSecondary wide" onClick={() => {
                    setAbout(false)
                    tsmOpenSupport()
                }}>
                    Need to talk to someone?
                </button>
            </TsmSheet>
        </div>
    )
}
