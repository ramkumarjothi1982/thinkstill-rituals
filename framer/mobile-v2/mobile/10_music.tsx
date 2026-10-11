/* ================================================================== */
/* Eclipse score — generative ambient music (no files, no services)    */
/* ================================================================== */
// The desktop console plays music only from a shared ThinkStill source (localStorage
// __ts_reset_shared_media_v1, written by the Reset product). When that source is absent the mobile
// console plays this score instead, so the music button always does what it says. Slow pads breathe
// on a ~10 s cycle (like the Eclipse), a soft bell drifts over them, and the key follows the ritual's
// character family.

type ScoreKey = { chords: number[][]; bells: number[] }

// MIDI note numbers. Each chord lasts one "breath" (9.6 s).
const SCORE_KEYS: Record<string, ScoreKey> = {
    drop: { chords: [[50, 57, 60, 64, 65], [46, 53, 57, 62, 65], [41, 53, 57, 60, 64], [48, 55, 60, 64, 69]], bells: [74, 76, 77, 81, 84, 86] },
    rush: { chords: [[45, 52, 55, 60, 64], [41, 52, 57, 60, 64], [48, 55, 59, 64, 67], [43, 55, 59, 62, 64]], bells: [72, 76, 79, 81, 84, 88] },
    sync: { chords: [[52, 59, 63, 66, 68], [49, 56, 59, 64, 68], [45, 57, 61, 64, 68], [47, 54, 59, 63, 66]], bells: [76, 78, 80, 83, 85, 88] },
    glitch: { chords: [[42, 49, 52, 56, 61], [50, 57, 61, 64, 66], [45, 57, 61, 64, 68], [40, 52, 56, 59, 61]], bells: [73, 76, 78, 81, 85, 88] },
    loopie: { chords: [[48, 55, 59, 62, 64], [45, 52, 55, 60, 64], [41, 53, 57, 60, 64], [43, 55, 59, 62, 67]], bells: [72, 74, 76, 79, 81, 84] },
    patch: { chords: [[43, 50, 54, 59, 62], [40, 52, 55, 59, 62], [48, 55, 59, 64, 66], [50, 57, 62, 66, 69]], bells: [74, 76, 79, 81, 83, 86] },
    still: { chords: [[51, 58, 62, 65, 67], [48, 55, 58, 63, 67], [44, 56, 60, 63, 67], [46, 53, 58, 62, 65]], bells: [75, 77, 79, 82, 84, 87] },
}

const midiHz = (m: number) => 440 * Math.pow(2, (m - 69) / 12)

class EclipseScore {
    ctx: AudioContext | null = null
    master: GainNode | null = null
    filter: BiquadFilterNode | null = null
    delay: DelayNode | null = null
    timer: any = 0
    nextChordAt = 0
    nextBellAt = 0
    chordIx = 0
    key = "drop"
    volume = 0.35
    running = false
    stopTimer: any = 0

    ensure(): boolean {
        if (this.ctx) return true
        try {
            const AC: any = (hasWindow && ((window as any).AudioContext || (window as any).webkitAudioContext)) || null
            if (!AC) return false
            const ctx: AudioContext = new AC()
            const master = ctx.createGain()
            master.gain.value = 0
            const filter = ctx.createBiquadFilter()
            filter.type = "lowpass"
            filter.frequency.value = 1900
            filter.Q.value = 0.4
            const comp = ctx.createDynamicsCompressor()
            comp.threshold.value = -20
            comp.ratio.value = 3
            // shimmer: a soft feedback delay for the bells
            const delay = ctx.createDelay(1.2)
            delay.delayTime.value = 0.43
            const fb = ctx.createGain()
            fb.gain.value = 0.34
            const wet = ctx.createGain()
            wet.gain.value = 0.32
            delay.connect(fb)
            fb.connect(delay)
            delay.connect(wet)
            wet.connect(filter)
            filter.connect(comp)
            comp.connect(master)
            master.connect(ctx.destination)
            // breathing: a slow swell on the filter (≈ one Eclipse breath)
            const lfo = ctx.createOscillator()
            const lfoAmt = ctx.createGain()
            lfo.frequency.value = 0.1
            lfoAmt.gain.value = 520
            lfo.connect(lfoAmt)
            lfoAmt.connect(filter.frequency)
            lfo.start()
            this.ctx = ctx
            this.master = master
            this.filter = filter
            this.delay = delay
            return true
        } catch (e) {
            return false
        }
    }

    pad(notes: number[], at: number, dur: number) {
        const ctx = this.ctx!
        notes.forEach((m, i) => {
            const f = midiHz(m)
            const g = ctx.createGain()
            const peak = (i === 0 ? 0.075 : 0.05) / Math.sqrt(notes.length / 3)
            g.gain.setValueAtTime(0.0001, at)
            g.gain.exponentialRampToValueAtTime(peak, at + 2.8)
            g.gain.setValueAtTime(peak, at + dur - 2.4)
            g.gain.exponentialRampToValueAtTime(0.0001, at + dur + 1.6)
            g.connect(this.filter!)
            ;[0, -7, 6].forEach((cents, k) => {
                const o = ctx.createOscillator()
                o.type = k === 0 ? "sine" : "triangle"
                o.frequency.value = f
                o.detune.value = cents + (Math.random() - 0.5) * 3
                const og = ctx.createGain()
                og.gain.value = k === 0 ? 1 : 0.22
                o.connect(og)
                og.connect(g)
                o.start(at)
                o.stop(at + dur + 1.8)
            })
        })
        // a deep, quiet root an octave below
        const sub = ctx.createOscillator()
        const sg = ctx.createGain()
        sub.type = "sine"
        sub.frequency.value = midiHz(notes[0] - 12)
        sg.gain.setValueAtTime(0.0001, at)
        sg.gain.exponentialRampToValueAtTime(0.06, at + 3)
        sg.gain.exponentialRampToValueAtTime(0.0001, at + dur + 1.4)
        sub.connect(sg)
        sg.connect(this.filter!)
        sub.start(at)
        sub.stop(at + dur + 1.6)
    }

    bell(m: number, at: number) {
        const ctx = this.ctx!
        const f = midiHz(m)
        const g = ctx.createGain()
        g.gain.setValueAtTime(0.0001, at)
        g.gain.exponentialRampToValueAtTime(0.045, at + 0.02)
        g.gain.exponentialRampToValueAtTime(0.0001, at + 3.2)
        ;[1, 2.01, 3.98].forEach((mult, k) => {
            const o = ctx.createOscillator()
            o.type = "sine"
            o.frequency.value = f * mult
            const og = ctx.createGain()
            og.gain.value = k === 0 ? 1 : k === 1 ? 0.18 : 0.06
            o.connect(og)
            og.connect(g)
            o.start(at)
            o.stop(at + 3.3)
        })
        g.connect(this.filter!)
        g.connect(this.delay!)
    }

    tick = () => {
        if (!this.ctx || !this.running) return
        const now = this.ctx.currentTime
        const key = SCORE_KEYS[this.key] || SCORE_KEYS.drop
        const BREATH = 9.6
        while (this.nextChordAt < now + 1.5) {
            this.pad(key.chords[this.chordIx % key.chords.length], this.nextChordAt, BREATH)
            this.chordIx++
            this.nextChordAt += BREATH
        }
        while (this.nextBellAt < now + 1.5) {
            const n = key.bells[Math.floor(Math.random() * key.bells.length)]
            this.bell(n, this.nextBellAt)
            if (Math.random() < 0.35) this.bell(key.bells[Math.floor(Math.random() * key.bells.length)], this.nextBellAt + 0.6 + Math.random() * 0.5)
            this.nextBellAt += 2.4 + Math.random() * 3.6
        }
    }

    start(key: string, volume: number) {
        if (!this.ensure()) return
        const ctx = this.ctx!
        clearTimeout(this.stopTimer)
        this.key = key
        this.volume = volume
        try {
            if (ctx.state === "suspended") ctx.resume()
        } catch (e) {}
        const now = ctx.currentTime
        this.master!.gain.cancelScheduledValues(now)
        this.master!.gain.setValueAtTime(Math.max(0.0001, this.master!.gain.value), now)
        this.master!.gain.linearRampToValueAtTime(clamp01(volume) * 0.9, now + 1.6)
        if (!this.running) {
            this.running = true
            this.nextChordAt = now + 0.05
            this.nextBellAt = now + 1.8
            this.tick()
            this.timer = setInterval(this.tick, 400)
        }
    }

    setVolume(v: number) {
        this.volume = v
        if (!this.ctx || !this.running) return
        const now = this.ctx.currentTime
        this.master!.gain.cancelScheduledValues(now)
        this.master!.gain.setTargetAtTime(clamp01(v) * 0.9, now, 0.25)
    }

    setKey(k: string) {
        this.key = k
    }

    stop() {
        if (!this.ctx || !this.running) return
        const ctx = this.ctx
        const now = ctx.currentTime
        this.master!.gain.cancelScheduledValues(now)
        this.master!.gain.setValueAtTime(this.master!.gain.value, now)
        this.master!.gain.linearRampToValueAtTime(0.0001, now + 1.2)
        this.running = false
        clearInterval(this.timer)
        this.stopTimer = setTimeout(() => {
            try {
                if (!this.running) ctx.suspend()
            } catch (e) {}
        }, 1500)
    }

    dispose() {
        this.stop()
        clearTimeout(this.stopTimer)
        const ctx = this.ctx
        this.ctx = null
        if (ctx)
            setTimeout(() => {
                try {
                    ctx.close()
                } catch (e) {}
            }, 1600)
    }
}

/** Plays the Eclipse score while `on` (and no shared music source exists). */
function useEclipseScore(on: boolean, volume: number, bubble: string) {
    const score = React.useRef<EclipseScore | null>(null)
    React.useEffect(() => {
        if (!hasWindow) return
        if (!score.current) score.current = new EclipseScore()
        const s = score.current
        if (on) s.start(bubble || "drop", volume)
        else s.stop()
    }, [on])
    React.useEffect(() => {
        if (score.current) score.current.setVolume(volume)
    }, [volume])
    React.useEffect(() => {
        if (score.current) score.current.setKey(bubble || "drop")
    }, [bubble])
    React.useEffect(() => {
        const onVis = () => {
            const s = score.current
            if (!s || !s.ctx) return
            try {
                if (document.hidden) s.ctx.suspend()
                else if (s.running) s.ctx.resume()
            } catch (e) {}
        }
        document.addEventListener("visibilitychange", onVis)
        return () => {
            document.removeEventListener("visibilitychange", onVis)
            score.current && score.current.dispose()
            score.current = null
        }
    }, [])
}
