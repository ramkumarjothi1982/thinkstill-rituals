/* Bubble voices: wordless, synthesised "Bubble-speak". Each Bubble has its own timbre (pitch, waveform, formants,
 * wobble) and every utterance has an emotional contour — a scream rises and cracks, a sob wavers down, a laugh
 * bounces, a gasp is a sharp inhale. No speech engine and no AI: syllables are oscillators through vowel formants.
 * `say` returns the syllable beats so an actor can bounce in time with its own voice. */
import type { Synth } from '../audio/synth';
import type { Slug } from '../room/protocol';

export type Utter = 'talk' | 'scream' | 'gasp' | 'laugh' | 'giggle' | 'sob' | 'ooh' | 'cheer' | 'huh' | 'uhoh' | 'hmm'
  | 'mutter' | 'yay' | 'aww' | 'shush' | 'snore' | 'bid' | 'no' | 'wow' | 'quack' | 'sniff' | 'boo' | 'hey';

interface Voice { base: number; wave: OscillatorType; vib: number; pace: number; formant: number; harmony?: number; crush?: boolean; breath?: number; }
export const VOICES: Record<Slug, Voice> = {
  rush: { base: 430, wave: 'square', vib: 0.01, pace: 1.6, formant: 1.15 },
  still: { base: 180, wave: 'triangle', vib: 0.01, pace: 0.62, formant: 0.82, breath: 0.25 },
  loopie: { base: 320, wave: 'sawtooth', vib: 0.07, pace: 1.0, formant: 1.0 },
  glitch: { base: 250, wave: 'square', vib: 0, pace: 1.25, formant: 0.92, crush: true },
  drop: { base: 300, wave: 'sine', vib: 0.05, pace: 0.85, formant: 1.06, breath: 0.15 },
  patch: { base: 240, wave: 'triangle', vib: 0.02, pace: 1.0, formant: 0.95 },
  sync: { base: 350, wave: 'sawtooth', vib: 0.015, pace: 1.1, formant: 1.04, harmony: 1.498 }
};

// [F1, F2] in Hz for a neutral adult voice; scaled per Bubble
const VOWELS: Record<string, [number, number]> = { a: [800, 1200], e: [500, 1850], i: [320, 2300], o: [520, 900], u: [360, 760] };

interface Syl { v: string; d: number; f0: number; f1: number; vol: number; h?: number; trem?: number; rough?: number; gap?: number; }

/** The shape of each utterance: syllables with vowel, duration, start/end pitch ratio and loudness. */
function plan(u: Utter, n: number, rnd: () => number): Syl[] {
  const pick = (s: string) => s[Math.floor(rnd() * s.length)];
  const out: Syl[] = [];
  switch (u) {
    case 'scream': out.push({ v: 'a', d: 0.16, f0: 1.4, f1: 2.2, vol: 0.8, h: 0.4 }, { v: 'a', d: 0.62, f0: 2.2, f1: 2.6, vol: 1, trem: 11, rough: 0.5 }); break;
    case 'gasp': out.push({ v: 'a', d: 0.18, f0: 1.3, f1: 1.9, vol: 0.55, h: 0.9 }); break;
    case 'laugh': for (let i = 0; i < (n || 4); i++) out.push({ v: 'a', d: 0.11, f0: 1.5 - i * 0.08, f1: 1.35 - i * 0.08, vol: 0.85 - i * 0.08, h: 0.55, gap: 0.05 }); break;
    case 'giggle': for (let i = 0; i < (n || 5); i++) out.push({ v: 'i', d: 0.065, f0: 1.9 - (i % 2) * 0.15, f1: 1.8, vol: 0.6, h: 0.35, gap: 0.035 }); break;
    case 'sob': out.push({ v: 'u', d: 0.3, f0: 1.15, f1: 0.95, vol: 0.7, trem: 7, h: 0.3 }, { v: 'u', d: 0.22, f0: 1.25, f1: 1.0, vol: 0.6, trem: 8, h: 0.4, gap: 0.08 }, { v: 'a', d: 0.45, f0: 1.2, f1: 0.75, vol: 0.75, trem: 6 }); break;
    case 'ooh': out.push({ v: 'u', d: 0.5, f0: 0.95, f1: 1.4, vol: 0.7 }, { v: 'o', d: 0.35, f0: 1.4, f1: 1.1, vol: 0.55 }); break;
    case 'wow': out.push({ v: 'u', d: 0.12, f0: 0.9, f1: 1.1, vol: 0.6 }, { v: 'a', d: 0.38, f0: 1.3, f1: 0.95, vol: 0.85 }); break;
    case 'cheer': out.push({ v: 'e', d: 0.12, f0: 1.2, f1: 1.4, vol: 0.7 }, { v: 'a', d: 0.5, f0: 1.6, f1: 1.9, vol: 0.95, trem: 6 }); break;
    case 'yay': out.push({ v: 'e', d: 0.14, f0: 1.3, f1: 1.6, vol: 0.8 }, { v: 'i', d: 0.3, f0: 1.7, f1: 1.95, vol: 0.9 }); break;
    case 'huh': out.push({ v: 'a', d: 0.26, f0: 0.95, f1: 1.45, vol: 0.7, h: 0.3 }); break;
    case 'uhoh': out.push({ v: 'u', d: 0.18, f0: 1.25, f1: 1.25, vol: 0.7 }, { v: 'o', d: 0.32, f0: 1.0, f1: 0.88, vol: 0.75, gap: 0.06 }); break;
    case 'hmm': out.push({ v: 'u', d: 0.55, f0: 1.0, f1: 1.08, vol: 0.4 }); break;
    case 'aww': out.push({ v: 'a', d: 0.55, f0: 1.3, f1: 0.95, vol: 0.7, trem: 5 }); break;
    case 'no': out.push({ v: 'o', d: 0.14, f0: 1.3, f1: 1.25, vol: 0.85 }, { v: 'o', d: 0.14, f0: 1.3, f1: 1.25, vol: 0.85, gap: 0.05 }, { v: 'o', d: 0.3, f0: 1.4, f1: 1.0, vol: 0.9, gap: 0.05 }); break;
    case 'bid': out.push({ v: 'o', d: 0.1, f0: 1.3, f1: 1.5, vol: 0.8 }, { v: 'o', d: 0.18, f0: 1.6, f1: 1.8, vol: 0.9, gap: 0.04 }); break;
    case 'hey': out.push({ v: 'e', d: 0.24, f0: 1.2, f1: 1.5, vol: 0.85, h: 0.4 }); break;
    case 'boo': out.push({ v: 'u', d: 0.6, f0: 0.9, f1: 0.7, vol: 0.7, trem: 4 }); break;
    case 'quack': out.push({ v: 'a', d: 0.12, f0: 1.6, f1: 1.2, vol: 0.9, rough: 0.9 }); break;
    case 'sniff': out.push({ v: 'i', d: 0.08, f0: 1, f1: 1, vol: 0.0001, h: 1 }, { v: 'i', d: 0.08, f0: 1, f1: 1, vol: 0.0001, h: 1, gap: 0.06 }); break;
    case 'shush': out.push({ v: 'u', d: 0.6, f0: 1, f1: 1, vol: 0.0001, h: 1 }); break;
    case 'snore': out.push({ v: 'o', d: 0.9, f0: 0.55, f1: 0.5, vol: 0.4, rough: 0.8, h: 0.5 }); break;
    case 'mutter': for (let i = 0; i < (n || 6); i++) out.push({ v: pick('aeiou'), d: 0.07 + rnd() * 0.04, f0: 0.8 + rnd() * 0.15, f1: 0.8 + rnd() * 0.12, vol: 0.4, gap: 0.015 }); break;
    default: for (let i = 0; i < (n || 4); i++) { const up = i === (n || 4) - 1 && rnd() < 0.4; out.push({ v: pick('aeiouaeo'), d: 0.08 + rnd() * 0.07, f0: 0.9 + rnd() * 0.35, f1: up ? 1.35 : 0.9 + rnd() * 0.3, vol: 0.65 + rnd() * 0.25, gap: 0.02 + rnd() * 0.03 }); }
  }
  return out;
}

let seedN = 1;
const rand = (s: number) => () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };

export class Babble {
  private bus: GainNode | null = null;
  private shaper: WaveShaperNode | null = null;
  constructor(private sfx: Synth) {}
  private out(): AudioContext | null {
    const c = this.sfx.ctx;
    if (!c || !this.sfx.sfxBus || !this.sfx.enabled || c.state !== 'running') return null;
    if (!this.bus) {
      this.bus = c.createGain(); this.bus.gain.value = 0.9; this.bus.connect(this.sfx.sfxBus);
      this.shaper = c.createWaveShaper();
      const k = 6, n = 512, curve = new Float32Array(n);
      for (let i = 0; i < n; i++) { const x = (i / (n - 1)) * 2 - 1; curve[i] = ((1 + k) * x) / (1 + k * Math.abs(x)); }
      this.shaper.curve = curve; this.shaper.connect(this.bus);
    }
    return c;
  }
  /** Speak. Returns the total duration (s) and syllable onsets (s) so the speaker can bounce on each beat. */
  say(who: Slug, u: Utter, o: { vol?: number; at?: number; n?: number; pitch?: number; pace?: number } = {}): { dur: number; beats: number[] } {
    const vc = VOICES[who] || VOICES.loopie;
    const syl = plan(u, o.n || 0, rand(((seedN++ * 7919) ^ (who.length * 131)) % 2147483646 + 1));
    const pace = (o.pace || 1) * (u === 'talk' || u === 'mutter' ? vc.pace : Math.sqrt(vc.pace));
    const beats: number[] = [];
    let t = 0;
    for (const s of syl) { t += (s.gap || 0) / pace; beats.push(t); t += s.d / pace; }
    const c = this.out();
    if (!c) return { dur: t, beats };
    const t0 = c.currentTime + 0.02 + (o.at || 0);
    const vol = (o.vol ?? 1) * 0.2;
    const base = vc.base * (o.pitch || 1);
    try {
      syl.forEach((s, i) => this.syllable(c, vc, s, t0 + beats[i], s.d / pace, base, vol));
    } catch (e) { /* a voice hiccup never breaks a ritual */ }
    return { dur: t, beats };
  }
  private syllable(c: AudioContext, vc: Voice, s: Syl, at: number, d: number, base: number, vol: number) {
    const [F1, F2] = VOWELS[s.v] || VOWELS.a;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, at);
    const peak = Math.max(0.0002, vol * s.vol);
    g.gain.exponentialRampToValueAtTime(peak, at + Math.min(0.03, d * 0.25));
    g.gain.setValueAtTime(peak, at + d * 0.7);
    g.gain.exponentialRampToValueAtTime(0.0001, at + d);
    const rough = (s.rough || 0) + (vc.crush ? 0.3 : 0);
    g.connect(rough > 0.2 && this.shaper ? this.shaper : this.bus!);
    // breath / aspiration ("h")
    const breath = Math.max(s.h || 0, vc.breath || 0);
    if (breath > 0 && this.sfx.noiseBuf) {
      const src = c.createBufferSource(); src.buffer = this.sfx.noiseBuf; src.loop = true;
      const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = F2 * vc.formant; bp.Q.value = 1.2;
      const ng = c.createGain();
      ng.gain.setValueAtTime(0.0001, at); ng.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol * breath * 1.6), at + 0.02); ng.gain.exponentialRampToValueAtTime(0.0001, at + Math.min(d, 0.12 + (s.vol < 0.01 ? d : 0)));
      src.connect(bp); bp.connect(ng); ng.connect(this.bus!);
      src.start(at, Math.random()); src.stop(at + d + 0.05);
    }
    if (s.vol < 0.01) return;
    const voices = vc.harmony ? [1, vc.harmony] : [1];
    for (const hm of voices) {
      const o = c.createOscillator(); o.type = vc.wave;
      const f0 = base * s.f0 * hm, f1 = base * s.f1 * hm;
      o.frequency.setValueAtTime(Math.max(40, f0), at);
      if (vc.crush) { // glitchy: stepped pitch jumps
        const steps = Math.max(2, Math.round(d / 0.04));
        for (let k = 1; k <= steps; k++) o.frequency.setValueAtTime(Math.max(40, f0 + (f1 - f0) * (k / steps) * (k % 2 ? 1.08 : 0.94)), at + (d * k) / (steps + 1));
      } else o.frequency.exponentialRampToValueAtTime(Math.max(40, f1), at + d);
      const vibHz = s.trem || (vc.vib > 0 ? 5.5 : 0), vibDepth = s.trem ? 0.06 : vc.vib;
      if (vibHz && vibDepth) { const l = c.createOscillator(), lg = c.createGain(); l.frequency.value = vibHz; lg.gain.value = f0 * vibDepth; l.connect(lg); lg.connect(o.frequency); l.start(at); l.stop(at + d + 0.05); }
      const b1 = c.createBiquadFilter(); b1.type = 'bandpass'; b1.frequency.value = F1 * vc.formant; b1.Q.value = 4;
      const b2 = c.createBiquadFilter(); b2.type = 'bandpass'; b2.frequency.value = F2 * vc.formant; b2.Q.value = 6;
      const m1 = c.createGain(); m1.gain.value = hm === 1 ? 1 : 0.55; const m2 = c.createGain(); m2.gain.value = hm === 1 ? 0.6 : 0.35;
      o.connect(b1); o.connect(b2); b1.connect(m1); b2.connect(m2); m1.connect(g); m2.connect(g);
      o.start(at); o.stop(at + d + 0.03);
    }
  }
}
