/* Bubble voices: every line is "spoken" as synthesised babble — one formant blip per syllable — whose melody comes
 * from the tone (warm rises and falls, sarcastic drawls down, nervous trembles upward, deadpan stays flat), with the
 * performer's pitch and pace knobs on top. No speech engine, no AI; the subtitle carries the words. */
import type { Synth } from '../../audio/synth';
import type { Cue } from './content';
import { cueText, syllables, sylDur } from './film';

const hashStr = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };

export class VoiceBox {
  private out: GainNode | null = null;
  private an: AnalyserNode | null = null;
  private buf: Uint8Array | null = null;
  private live: { o: OscillatorNode; g: GainNode }[] = [];
  constructor(private sfx: Synth) {}
  private ensure() {
    const c = this.sfx.ctx; if (!c || !this.sfx.sfxBus) return null;
    if (!this.out) {
      this.out = c.createGain(); this.out.gain.value = 1;
      this.an = c.createAnalyser(); this.an.fftSize = 256; this.buf = new Uint8Array(this.an.fftSize);
      this.out.connect(this.an); this.out.connect(this.sfx.sfxBus);
    }
    return c;
  }
  /** Output level 0..1 for VU meters. */
  level(): number {
    if (!this.an || !this.buf) return 0;
    this.an.getByteTimeDomainData(this.buf as any);
    let s = 0; for (let i = 0; i < this.buf.length; i++) { const v = (this.buf[i] - 128) / 128; s += v * v; }
    return Math.min(1, Math.sqrt(s / this.buf.length) * 4);
  }
  /** Schedule a whole cut from film time `from`; film time maps to audio time with `rate` (1 = real time). */
  play(cues: Cue[], from = 0, rate = 1, vol = 1) {
    const c = this.ensure(); if (!c || !this.sfx.enabled) return;
    const now = c.currentTime + 0.03;
    for (const cue of cues) { try { this.schedule(c, cue, now + (cue.t - from) / rate, from > cue.t ? (from - cue.t) : 0, rate, vol); } catch (e) { /* a voice glitch never breaks the booth */ } }
  }
  /** Say one line right now (performance panel, line chips). */
  say(cue: Cue, vol = 1) { const c = this.ensure(); if (!c || !this.sfx.enabled) return; this.stop(); try { this.schedule(c, cue, c.currentTime + 0.01, 0, 1, vol); } catch (e) { /* silent rather than broken */ } }
  stop() {
    const c = this.sfx.ctx; if (!c) return;
    for (const n of this.live) { try { n.g.gain.cancelScheduledValues(c.currentTime); n.g.gain.setTargetAtTime(0, c.currentTime, 0.01); n.o.stop(c.currentTime + 0.05); } catch (e) { /* already stopped */ } }
    this.live = [];
  }
  private schedule(c: AudioContext, cue: Cue, at: number, skip: number, rate: number, vol: number) {
    const text = cueText(cue);
    const n = syllables(text), d = sylDur(cue) / rate;
    const h = hashStr(text + cue.who);
    const base = (cue.who === 'patch' ? 250 : 370) * Math.pow(2, cue.pitch * 0.7);
    for (let i = 0; i < n; i++) {
      const t0 = at + i * d;
      if (i * sylDur(cue) < skip || t0 < c.currentTime - 0.01) continue;
      const k = n > 1 ? i / (n - 1) : 0;
      let f = base;
      if (cue.tone === 'warm') f *= 1 + 0.14 * Math.sin(k * Math.PI);
      else if (cue.tone === 'sarcastic') f *= (1.12 - 0.3 * k) * (i === n - 1 ? 1.22 : 1);
      else if (cue.tone === 'nervous') f *= 1 + 0.2 * k;
      else f *= 0.9;
      f *= 1 + (((h >>> (i % 24)) & 15) / 15 - 0.5) * 0.12;
      if (!Number.isFinite(f) || f <= 0) f = base;
      const o = c.createOscillator(); o.type = cue.who === 'patch' ? 'triangle' : 'square';
      o.frequency.setValueAtTime(f, t0);
      o.frequency.linearRampToValueAtTime(f * (cue.tone === 'sarcastic' ? 0.9 : 1.04), t0 + d * 0.8);
      if (cue.tone === 'nervous') { const lfo = c.createOscillator(), lg = c.createGain(); lfo.frequency.value = 9; lg.gain.value = f * 0.035; lfo.connect(lg); lg.connect(o.frequency); lfo.start(t0); lfo.stop(t0 + d + 0.05); }
      const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 3.5;
      bp.frequency.value = [750, 1150, 1650, 950, 1400][(h >>> (i * 3 % 20)) % 5];
      const g = c.createGain();
      const peak = 0.22 * vol * (cue.tone === 'deadpan' ? 0.75 : 1) * (cue.who === 'sync' ? 0.7 : 1);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(peak, t0 + 0.012);
      g.gain.setValueAtTime(peak, t0 + d * 0.62);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + d * 0.92);
      o.connect(bp); bp.connect(g); g.connect(this.out!);
      o.start(t0); o.stop(t0 + d + 0.02);
      this.live.push({ o, g });
      o.onended = () => { this.live = this.live.filter(x => x.o !== o); try { g.disconnect(); } catch (e) { /* gone */ } };
    }
  }
}

/** The projector: a soft 24 fps clatter and a hum, while film runs. */
export class Projector {
  private node: { stop: () => void } | null = null;
  constructor(private sfx: Synth) {}
  start(vol = 0.05) {
    this.stop();
    const c = this.sfx.ctx; if (!c || !this.sfx.sfxBus) return;
    const out = c.createGain(); out.gain.value = vol; out.connect(this.sfx.sfxBus);
    const hum = c.createOscillator(); hum.frequency.value = 60; const hg = c.createGain(); hg.gain.value = 0.25; hum.connect(hg); hg.connect(out); hum.start();
    let next = c.currentTime + 0.02;
    const timer = setInterval(() => {
      while (next < c.currentTime + 0.2) {
        const o = c.createOscillator(), g = c.createGain(); o.type = 'square'; o.frequency.value = 1900 + Math.random() * 300;
        g.gain.setValueAtTime(0.0001, next); g.gain.exponentialRampToValueAtTime(0.35, next + 0.002); g.gain.exponentialRampToValueAtTime(0.0001, next + 0.012);
        o.connect(g); g.connect(out); o.start(next); o.stop(next + 0.02);
        next += 1 / 24;
      }
    }, 60);
    this.node = { stop: () => { clearInterval(timer); try { hum.stop(); out.gain.setTargetAtTime(0, c.currentTime, 0.05); } catch (e) { /* stopped */ } setTimeout(() => { try { out.disconnect(); } catch (e) { /* gone */ } }, 400); } };
  }
  stop() { if (this.node) { this.node.stop(); this.node = null; } }
}
