/* A tiny step sequencer for each ritual's music: songs are written as patterns (one token per 16th note) and played
 * by synthesised instruments, so nothing is downloaded and every cue can start the moment it is needed.
 * Note tokens: "C4", "F#3", "Bb2"; "." rest; "-" hold. Drum tokens: "x" hit, "X" accent, "." rest. */
import type { Synth } from './synth';

export type Inst = 'kick' | 'snare' | 'hat' | 'clap' | 'conga' | 'congaLo' | 'shaker' | 'bass' | 'organ' | 'pluck' | 'bell'
  | 'brass' | 'strings' | 'musicbox' | 'timpani' | 'harpsi' | 'tick';
export interface Track { inst: Inst; pat: string; vol?: number; }
export interface Song { bpm: number; tracks: Track[]; swing?: number; beatsPerBar?: number; }

const NOTE: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
function midi(tok: string): number | null {
  const m = /^([A-G])([#b]?)(-?\d)$/.exec(tok); if (!m) return null;
  return 12 * (Number(m[3]) + 1) + NOTE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
}
const hz = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

interface Step { kind: 'hit' | 'note'; n?: number; len: number; acc: boolean; }
function parse(pat: string): (Step | null)[] {
  const toks = pat.trim().split(/\s+/);
  const out: (Step | null)[] = [];
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i];
    if (t === '.' || t === '-') { out.push(null); continue; }
    let len = 1; while (toks[i + len] === '-') len++;
    if (t === 'x' || t === 'X') out.push({ kind: 'hit', len, acc: t === 'X' });
    else if (t.includes('+')) { // chord: C4+E4+G4
      const ns = t.split('+').map(midi).filter((n): n is number => n != null);
      out.push(ns.length ? { kind: 'note', n: ns[0], len, acc: false } : null);
      (out[out.length - 1] as any).chord = ns;
    } else { const n = midi(t); out.push(n == null ? null : { kind: 'note', n, len, acc: false }); }
  }
  return out;
}

export class Music {
  private timer: any = null;
  private out: GainNode | null = null;
  private song: { bpm: number; swing: number; tracks: { inst: Inst; vol: number; steps: (Step | null)[] }[]; len: number } | null = null;
  private next = 0; private step = 0;
  playing: string | null = null;
  constructor(private sfx: Synth) {}

  play(name: string, song: Song, o: { vol?: number; fade?: number } = {}) {
    if (this.playing === name) return;
    this.stop(0.4);
    const c = this.sfx.ctx; if (!c || !this.sfx.musicBus) { this.playing = null; return; }
    const tracks = song.tracks.map(t => ({ inst: t.inst, vol: t.vol ?? 1, steps: parse(t.pat) }));
    this.song = { bpm: song.bpm, swing: song.swing || 0, tracks, len: Math.max(...tracks.map(t => t.steps.length)) };
    const out = c.createGain(); out.gain.value = 0.0001; out.gain.setTargetAtTime(o.vol ?? 0.5, c.currentTime, (o.fade ?? 0.6) / 3);
    out.connect(this.sfx.musicBus); this.out = out;
    this.next = c.currentTime + 0.06; this.step = 0; this.playing = name;
    this.timer = setInterval(() => this.pump(), 60);
    this.pump();
  }
  stop(fade = 0.6) {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
    const c = this.sfx.ctx, out = this.out;
    if (c && out) { try { out.gain.cancelScheduledValues(c.currentTime); out.gain.setTargetAtTime(0.0001, c.currentTime, Math.max(0.02, fade / 3)); } catch (e) { /* closed */ } setTimeout(() => { try { out.disconnect(); } catch (e) { /* gone */ } }, fade * 1000 + 600); }
    this.out = null; this.song = null; this.playing = null;
  }
  private pump() {
    const c = this.sfx.ctx, s = this.song, out = this.out; if (!c || !s || !out) return;
    const dur16 = 60 / s.bpm / 4;
    while (this.next < c.currentTime + 0.3) {
      const i = this.step % s.len;
      const t = this.next + (i % 2 === 1 ? s.swing * dur16 : 0);
      for (const tr of s.tracks) {
        const st = tr.steps[i % tr.steps.length]; if (!st) continue;
        try { this.voice(c, out, tr.inst, st, t, st.len * dur16, tr.vol); } catch (e) { /* skip a note rather than stop */ }
      }
      this.next += dur16; this.step++;
    }
  }
  /** One-off hits for stings outside a loop (a chord stab, a drum roll). */
  hit(inst: Inst, notes: string[] = ['C4'], o: { at?: number; len?: number; vol?: number } = {}) {
    const c = this.sfx.ctx; if (!c || !this.sfx.musicBus || !this.sfx.enabled) return;
    const t = c.currentTime + 0.01 + (o.at || 0);
    const ns = notes.map(midi).filter((n): n is number => n != null);
    const st: any = { kind: inst === 'kick' || inst === 'snare' || inst === 'hat' || inst === 'clap' || inst === 'timpani' || inst === 'tick' || inst === 'shaker' ? 'hit' : 'note', n: ns[0] ?? 60, len: 1, acc: true, chord: ns };
    try { this.voice(c, this.sfx.musicBus, inst, st, t, o.len || 0.5, o.vol ?? 1); } catch (e) { /* ignore */ }
  }

  private voice(c: AudioContext, out: AudioNode, inst: Inst, st: Step, t: number, len: number, vol: number) {
    const notes: number[] = (st as any).chord && (st as any).chord.length ? (st as any).chord : [st.n ?? 60];
    const acc = st.acc ? 1.25 : 1;
    const env = (g: GainNode, a: number, peak: number, d: number) => { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); };
    const osc = (type: OscillatorType, f: number) => { const o = c.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t); return o; };
    const noise = (d: number, type: BiquadFilterType, freq: number, q: number, peak: number) => {
      if (!this.sfx.noiseBuf) return;
      const s = c.createBufferSource(); s.buffer = this.sfx.noiseBuf; s.loop = true;
      const f = c.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
      const g = c.createGain(); env(g, 0.002, peak, d);
      s.connect(f); f.connect(g); g.connect(out); s.start(t, Math.random()); s.stop(t + d + 0.05);
    };
    switch (inst) {
      case 'kick': { const o = osc('sine', 125); o.frequency.exponentialRampToValueAtTime(42, t + 0.16); const g = c.createGain(); env(g, 0.004, 0.7 * vol * acc, 0.24); o.connect(g); g.connect(out); o.start(t); o.stop(t + 0.3); break; }
      case 'snare': { noise(0.16, 'bandpass', 1900, 0.8, 0.35 * vol * acc); const o = osc('triangle', 190); o.frequency.exponentialRampToValueAtTime(120, t + 0.08); const g = c.createGain(); env(g, 0.002, 0.2 * vol, 0.09); o.connect(g); g.connect(out); o.start(t); o.stop(t + 0.15); break; }
      case 'hat': noise(0.045, 'highpass', 7500, 0.7, 0.12 * vol * acc); break;
      case 'tick': noise(0.02, 'bandpass', 3200, 6, 0.18 * vol * acc); break;
      case 'shaker': noise(0.07, 'highpass', 5200, 0.6, 0.07 * vol * acc); break;
      case 'clap': for (let k = 0; k < 3; k++) { const tt = t + k * 0.012; const s = this.sfx.noiseBuf; if (!s) break; const src = c.createBufferSource(); src.buffer = s; const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1500; const g = c.createGain(); g.gain.setValueAtTime(0.0001, tt); g.gain.exponentialRampToValueAtTime(0.25 * vol, tt + 0.002); g.gain.exponentialRampToValueAtTime(0.0001, tt + 0.08); src.connect(f); f.connect(g); g.connect(out); src.start(tt, Math.random()); src.stop(tt + 0.1); } break;
      case 'conga': case 'congaLo': { const f0 = inst === 'conga' ? 330 : 220; const o = osc('sine', f0 * 1.3); o.frequency.exponentialRampToValueAtTime(f0, t + 0.04); const g = c.createGain(); env(g, 0.003, 0.4 * vol * acc, 0.22); o.connect(g); g.connect(out); o.start(t); o.stop(t + 0.3); noise(0.02, 'bandpass', 1200, 2, 0.08 * vol); break; }
      case 'timpani': { const f = hz(notes[0]); const o = osc('sine', f * 1.05); o.frequency.exponentialRampToValueAtTime(f, t + 0.1); const g = c.createGain(); env(g, 0.005, 0.55 * vol * acc, 1.2); o.connect(g); g.connect(out); o.start(t); o.stop(t + 1.3); noise(0.12, 'lowpass', 400, 1, 0.2 * vol); break; }
      case 'bass': { for (const n of notes.slice(0, 1)) { const o = osc('triangle', hz(n)); const o2 = osc('sawtooth', hz(n)); const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 600; const g = c.createGain(); env(g, 0.01, 0.32 * vol * acc, Math.max(0.12, len * 0.9)); const m2 = c.createGain(); m2.gain.value = 0.25; o.connect(f); o2.connect(m2); m2.connect(f); f.connect(g); g.connect(out); o.start(t); o2.start(t); o.stop(t + len + 0.1); o2.stop(t + len + 0.1); } break; }
      case 'organ': { for (const n of notes) { const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.06 * vol, t + 0.12); g.gain.setValueAtTime(0.06 * vol, t + Math.max(0.15, len - 0.1)); g.gain.exponentialRampToValueAtTime(0.0001, t + len + 0.25); const trem = c.createOscillator(), tg = c.createGain(); trem.frequency.value = 5.5; tg.gain.value = 0.015 * vol; trem.connect(tg); tg.connect(g.gain); trem.start(t); trem.stop(t + len + 0.3); for (const [mul, a] of [[1, 1], [2, 0.5], [3, 0.25], [0.5, 0.5]]) { const o = osc('sine', hz(n) * mul); const ga = c.createGain(); ga.gain.value = a; o.connect(ga); ga.connect(g); o.start(t); o.stop(t + len + 0.3); } g.connect(out); } break; }
      case 'pluck': case 'harpsi': { for (const n of notes) { const o = osc(inst === 'harpsi' ? 'square' : 'sawtooth', hz(n)); const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(inst === 'harpsi' ? 4200 : 2600, t); f.frequency.exponentialRampToValueAtTime(400, t + 0.35); const g = c.createGain(); env(g, 0.003, (inst === 'harpsi' ? 0.07 : 0.12) * vol * acc, inst === 'harpsi' ? 0.5 : 0.6); o.connect(f); f.connect(g); g.connect(out); o.start(t); o.stop(t + 0.8); } break; }
      case 'bell': case 'musicbox': { for (const n of notes) { const f = hz(n) * (inst === 'musicbox' ? 2 : 1); const g = c.createGain(); env(g, 0.002, (inst === 'musicbox' ? 0.09 : 0.12) * vol * acc, inst === 'musicbox' ? 0.9 : 1.8); for (const [mul, a] of [[1, 1], [2.76, 0.35], [5.4, 0.15]]) { const o = osc('sine', f * mul); const ga = c.createGain(); ga.gain.value = a; o.connect(ga); ga.connect(g); o.start(t); o.stop(t + 2); } g.connect(out); } break; }
      case 'brass': { for (const n of notes) { const o = osc('sawtooth', hz(n)); const o2 = osc('sawtooth', hz(n) * 1.004); const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(500, t); f.frequency.exponentialRampToValueAtTime(2600, t + 0.08); f.frequency.exponentialRampToValueAtTime(900, t + len); const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.08 * vol * acc, t + 0.04); g.gain.setValueAtTime(0.07 * vol, t + Math.max(0.06, len - 0.05)); g.gain.exponentialRampToValueAtTime(0.0001, t + len + 0.15); o.connect(f); o2.connect(f); f.connect(g); g.connect(out); o.start(t); o2.start(t); o.stop(t + len + 0.2); o2.stop(t + len + 0.2); } break; }
      case 'strings': { for (const n of notes) { const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.035 * vol, t + 0.25); g.gain.setValueAtTime(0.035 * vol, t + Math.max(0.3, len)); g.gain.exponentialRampToValueAtTime(0.0001, t + len + 0.6); const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 2200; for (const d of [-7, 0, 7]) { const o = osc('sawtooth', hz(n)); o.detune.value = d; o.connect(f); o.start(t); o.stop(t + len + 0.7); } f.connect(g); g.connect(out); } break; }
    }
  }
}

/** Short stings outside the loops. */
export function slideWhistle(sfx: Synth, from = 1400, to = 260, d = 0.9) { sfx.tone(from, d, { type: 'sine', glide: to, vol: 0.12 }); sfx.tone(from * 2, d, { type: 'sine', glide: to * 2, vol: 0.02 }); }
export function thunder(sfx: Synth) { sfx.noise(1.6, { type: 'lowpass', freq: 320, sweep: 70, vol: 0.45, attack: 0.05 }); sfx.noise(0.25, { type: 'lowpass', freq: 900, vol: 0.3 }); }
export function drumroll(sfx: Synth, d = 1.6) { for (let i = 0; i * 0.045 < d; i++) sfx.noise(0.05, { type: 'bandpass', freq: 1900, q: 0.8, vol: 0.06 + 0.12 * (i * 0.045 / d), at: i * 0.045 }); }
