/* Reflect sound: everything is synthesised with WebAudio (nothing to download), so every action can answer inside a
 * frame. One AudioContext per console instance, unlocked by the first gesture. Each ritual picks its own palette from
 * these primitives; Bubble music from Reset's shared-media bridge plays on the music bus when present. */

export interface SoundMetrics { gestures: number; samples: number[]; }

export class Synth {
  ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  sfxBus: GainNode | null = null;
  musicBus: GainNode | null = null;
  private noiseBuf: AudioBuffer | null = null;
  enabled = true;
  private bedNodes: { stop: () => void } | null = null;
  private musicEl: HTMLAudioElement | null = null;
  /** time from the gesture that caused a sound to the moment the sound was scheduled (ms) + output latency */
  metrics: SoundMetrics = { gestures: 0, samples: [] };
  private lastGesture = 0;

  unlock() {
    try {
      if (!this.ctx) {
        const AC: any = (window as any).AudioContext || (window as any).webkitAudioContext;
        if (!AC) return;
        this.ctx = new AC({ latencyHint: 'interactive' });
        const c = this.ctx!;
        this.master = c.createGain(); this.master.gain.value = this.enabled ? 0.9 : 0;
        const comp = c.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 3; comp.attack.value = 0.003; comp.release.value = 0.2;
        this.master.connect(comp); comp.connect(c.destination);
        this.sfxBus = c.createGain(); this.sfxBus.gain.value = 0.8; this.sfxBus.connect(this.master);
        this.musicBus = c.createGain(); this.musicBus.gain.value = 0.5; this.musicBus.connect(this.master);
        const len = c.sampleRate * 1.5;
        this.noiseBuf = c.createBuffer(1, len, c.sampleRate);
        const d = this.noiseBuf.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      }
      if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    } catch (e) { /* audio unavailable: rituals stay fully playable in silence */ }
  }
  /** Mark the gesture a sound is answering (for the latency report). */
  gesture(ev?: Event) { this.lastGesture = ev && (ev as any).timeStamp ? (ev as any).timeStamp : performance.now(); this.metrics.gestures++; }
  private note() {
    if (!this.lastGesture || !this.ctx) return;
    const out = ((this.ctx as any).outputLatency || 0) * 1000 + ((this.ctx as any).baseLatency || 0) * 1000;
    const since = performance.now() - this.lastGesture;
    // only sounds that answer the gesture directly count (a later, animation-driven sound is not a response time)
    if (since < 250) { this.metrics.samples.push(Math.round((since + out) * 10) / 10); if (this.metrics.samples.length > 200) this.metrics.samples.shift(); }
    this.lastGesture = 0;
  }
  setEnabled(on: boolean) {
    this.enabled = on;
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(on ? 0.9 : 0, this.ctx.currentTime, 0.03);
    if (this.musicEl) { if (on) this.musicEl.play().catch(() => {}); else this.musicEl.pause(); }
  }
  private ready() { if (!this.ctx || !this.enabled || this.ctx.state !== 'running') return null; this.note(); return this.ctx; }
  private env(g: GainNode, t: number, a: number, d: number, peak: number) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + Math.max(0.002, a));
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  }
  tone(freq: number, dur: number, o: { type?: OscillatorType; vol?: number; attack?: number; glide?: number; at?: number; bus?: 'sfx' | 'music'; filter?: number; detune?: number } = {}) {
    const c = this.ready(); if (!c) return;
    const t = c.currentTime + (o.at || 0);
    const osc = c.createOscillator(); osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(freq, t);
    if (o.glide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.glide), t + dur);
    if (o.detune) osc.detune.value = o.detune;
    const g = c.createGain(); this.env(g, t, o.attack ?? 0.004, dur, o.vol ?? 0.3);
    let node: AudioNode = osc;
    if (o.filter) { const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = o.filter; osc.connect(f); node = f; }
    node.connect(g); g.connect(o.bus === 'music' ? this.musicBus! : this.sfxBus!);
    osc.start(t); osc.stop(t + (o.attack ?? 0.004) + dur + 0.05);
  }
  noise(dur: number, o: { vol?: number; type?: BiquadFilterType; freq?: number; q?: number; at?: number; attack?: number; sweep?: number } = {}) {
    const c = this.ready(); if (!c || !this.noiseBuf) return;
    const t = c.currentTime + (o.at || 0);
    const src = c.createBufferSource(); src.buffer = this.noiseBuf; src.loop = true;
    const f = c.createBiquadFilter(); f.type = o.type || 'bandpass'; f.frequency.setValueAtTime(o.freq || 1200, t); f.Q.value = o.q ?? 1;
    if (o.sweep) f.frequency.exponentialRampToValueAtTime(o.sweep, t + dur);
    const g = c.createGain(); this.env(g, t, o.attack ?? 0.003, dur, o.vol ?? 0.2);
    src.connect(f); f.connect(g); g.connect(this.sfxBus!);
    src.start(t, Math.random()); src.stop(t + dur + 0.1);
  }

  /* ---- a shared vocabulary; rituals combine and re-pitch these ---- */
  tick(pitch = 1) { this.noise(0.012, { type: 'highpass', freq: 3200 * pitch, vol: 0.12 }); this.tone(1800 * pitch, 0.015, { type: 'square', vol: 0.02 }); }
  glint(i = 0) { const base = [1318.5, 1568, 1760, 2093, 2349][i % 5]; this.tone(base, 0.7, { vol: 0.16 }); this.tone(base * 2.01, 0.45, { vol: 0.05 }); this.tone(base * 3.02, 0.25, { vol: 0.03 }); }
  shutter() { this.noise(0.02, { type: 'highpass', freq: 2500, vol: 0.35 }); this.noise(0.03, { type: 'highpass', freq: 1800, vol: 0.25, at: 0.06 }); this.tone(140, 0.05, { type: 'square', vol: 0.05, filter: 900 }); }
  develop() { this.noise(1.1, { type: 'bandpass', freq: 500, sweep: 2400, q: 0.7, vol: 0.06, attack: 0.3 }); }
  pluck(f = 196, vol = 0.22) { this.tone(f, 0.9, { type: 'sawtooth', vol, filter: 1600 }); this.tone(f * 2, 0.4, { type: 'triangle', vol: vol * 0.3 }); this.noise(0.02, { type: 'bandpass', freq: 3000, vol: 0.1 }); }
  thud() { this.tone(110, 0.35, { glide: 48, vol: 0.5 }); this.noise(0.05, { type: 'lowpass', freq: 700, vol: 0.25 }); }
  crack() { for (let i = 0; i < 5; i++) this.noise(0.04 + Math.random() * 0.05, { type: 'highpass', freq: 2500 + Math.random() * 3000, vol: 0.18, at: i * 0.045 + Math.random() * 0.02 }); this.tone(3400, 0.25, { vol: 0.03, at: 0.05 }); }
  whoosh(up = true, dur = 0.5) { this.noise(dur, { type: 'bandpass', freq: up ? 300 : 2600, sweep: up ? 2600 : 300, q: 1.2, vol: 0.14, attack: dur * 0.4 }); }
  rewind(dur = 2) { this.tone(900, dur, { type: 'sawtooth', glide: 180, vol: 0.05, filter: 1400 }); this.noise(dur, { type: 'bandpass', freq: 2200, sweep: 600, q: 2, vol: 0.06 }); }
  flash() { this.tone(2400, 0.28, { glide: 7200, vol: 0.03 }); this.noise(0.05, { type: 'highpass', freq: 1500, vol: 0.3, at: 0.3 }); this.tone(90, 0.12, { vol: 0.12, at: 0.3 }); }
  chime(notes = [523.25, 659.25, 783.99, 1046.5]) { notes.forEach((n, i) => this.tone(n, 0.8, { vol: 0.12, at: i * 0.08 })); }
  pop(f = 600) { this.tone(f, 0.08, { glide: f * 1.6, vol: 0.12 }); }
  heartbeat() { this.tone(70, 0.12, { glide: 50, vol: 0.4 }); this.tone(65, 0.14, { glide: 45, vol: 0.32, at: 0.18 }); }
  splat() { this.noise(0.25, { type: 'lowpass', freq: 900, sweep: 200, vol: 0.4 }); this.tone(160, 0.2, { glide: 60, vol: 0.3 }); }

  /** A soft party bed heard from across a rooftop: kick, two chords and murmur through a low-pass. */
  bed(kind: 'rooftop' | 'off', vol = 0.18) {
    if (this.bedNodes) { this.bedNodes.stop(); this.bedNodes = null; }
    const c = this.ctx; if (!c || kind === 'off' || !this.musicBus || !this.noiseBuf) return;
    const out = c.createGain(); out.gain.value = 0.0001; out.gain.setTargetAtTime(vol, c.currentTime, 0.8);
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900; lp.connect(out); out.connect(this.musicBus);
    const murmur = c.createBufferSource(); murmur.buffer = this.noiseBuf; murmur.loop = true;
    const mf = c.createBiquadFilter(); mf.type = 'bandpass'; mf.frequency.value = 520; mf.Q.value = 0.8;
    const mg = c.createGain(); mg.gain.value = 0.05; murmur.connect(mf); mf.connect(mg); mg.connect(lp); murmur.start();
    const chords = [[220, 277.2, 329.6], [196, 246.9, 293.7], [174.6, 220, 261.6], [196, 246.9, 311.1]];
    let next = c.currentTime + 0.1, beat = 0;
    const timer = setInterval(() => {
      while (next < c.currentTime + 0.35) {
        const t = next;
        const k = c.createOscillator(), kg = c.createGain(); k.frequency.setValueAtTime(110, t); k.frequency.exponentialRampToValueAtTime(42, t + 0.18);
        kg.gain.setValueAtTime(0.0001, t); kg.gain.exponentialRampToValueAtTime(0.55, t + 0.005); kg.gain.exponentialRampToValueAtTime(0.0001, t + 0.24);
        k.connect(kg); kg.connect(lp); k.start(t); k.stop(t + 0.3);
        if (beat % 8 === 0) {
          const ch = chords[(beat / 8) % chords.length | 0];
          ch.forEach((f, i) => { const o = c.createOscillator(), og = c.createGain(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = (i - 1) * 7; og.gain.setValueAtTime(0.0001, t); og.gain.exponentialRampToValueAtTime(0.05, t + 0.4); og.gain.exponentialRampToValueAtTime(0.0001, t + 3.9); o.connect(og); og.connect(lp); o.start(t); o.stop(t + 4); });
        }
        if (beat % 2 === 1) { const hs = c.createBufferSource(); hs.buffer = this.noiseBuf; const hf = c.createBiquadFilter(); hf.type = 'highpass'; hf.frequency.value = 6000; const hg = c.createGain(); hg.gain.setValueAtTime(0.0001, t); hg.gain.exponentialRampToValueAtTime(0.05, t + 0.003); hg.gain.exponentialRampToValueAtTime(0.0001, t + 0.05); hs.connect(hf); hf.connect(hg); hg.connect(lp); hs.start(t, Math.random()); hs.stop(t + 0.06); }
        next += 0.5; beat++;
      }
    }, 90);
    this.bedNodes = { stop: () => { clearInterval(timer); try { out.gain.setTargetAtTime(0.0001, c.currentTime, 0.2); murmur.stop(c.currentTime + 1); } catch (e) { /* stopped */ } setTimeout(() => { try { out.disconnect(); } catch (e) { /* gone */ } }, 1500); } };
  }
  duck(to: number, secs = 0.4) { if (this.musicBus && this.ctx) this.musicBus.gain.setTargetAtTime(to, this.ctx.currentTime, secs / 3); }

  /** Bubble music from Reset's shared-media bridge (a URL), looped quietly instead of the synth bed. */
  music(url: string | null, vol = 0.35) {
    if (this.musicEl) { this.musicEl.pause(); this.musicEl = null; }
    if (!url) return;
    try {
      const a = new Audio(url); a.loop = true; a.volume = vol; a.crossOrigin = 'anonymous';
      this.musicEl = a;
      if (this.enabled) a.play().catch(() => { /* blocked until a gesture; retried by setEnabled */ });
    } catch (e) { this.musicEl = null; }
  }
  stopAll() { this.bed('off'); this.music(null); }
}
