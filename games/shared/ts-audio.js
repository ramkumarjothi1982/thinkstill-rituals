/* ThinkStill synthesised audio engine (instance-scoped)
 * Everything is generated with WebAudio, so the games ship with no audio files.
 * Buses: sfx, music, amb  ->  master -> compressor -> out, with a shared reverb send.
 * Every scheduling function accepts an absolute AudioContext time (`when`), so rhythm games
 * schedule sample-accurately ahead of the beat. The context is closed when the game unmounts.
 */
(function (env) {
  'use strict';
  const TS = env.TS;
  const A = (TS.audio = { ctx: null, ready: false });
  let master, comp, reverbIn, noiseBuf, pinkBuf;
  const buses = {};
  const ksCache = new Map();
  const musicLevel = () => TS.clamp(typeof TS.opts.musicVolume === 'number' ? TS.opts.musicVolume / 0.35 : 1, 0, 2);

  function makeNoise(ctx, seconds, pink) {
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < len; i++) {
        const w = Math.random() * 2 - 1;
        if (!pink) { d[i] = w; continue; }
        b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759;
        b2 = 0.969 * b2 + w * 0.153852; b3 = 0.8665 * b3 + w * 0.3104856;
        b4 = 0.55 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.016898;
        d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
        b6 = w * 0.115926;
      }
    }
    return buf;
  }
  function makeImpulse(ctx, seconds, decay) {
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return buf;
  }

  A.unlock = function () {
    if (TS.destroyed || TS.opts.staticRender) return null;
    if (A.ctx) {
      if (A.ctx.state === 'suspended' && !document.hidden) A.ctx.resume().catch(() => {});
      return A.ctx;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    let ctx;
    try { ctx = new AC({ latencyHint: 'interactive' }); } catch (e) { try { ctx = new AC(); } catch (e2) { return null; } }
    A.ctx = ctx;
    comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16; comp.knee.value = 18; comp.ratio.value = 3.5; comp.attack.value = 0.004; comp.release.value = 0.22;
    master = ctx.createGain();
    master.gain.value = TS.settings.sound ? 0.85 : 0;
    master.connect(comp); comp.connect(ctx.destination);
    const reverb = ctx.createConvolver();
    reverb.buffer = makeImpulse(ctx, 2.6, 2.8);
    reverbIn = ctx.createGain(); reverbIn.gain.value = 0.9;
    const reverbOut = ctx.createGain(); reverbOut.gain.value = 0.32;
    reverbIn.connect(reverb); reverb.connect(reverbOut); reverbOut.connect(master);
    ['sfx', 'music', 'amb'].forEach(name => {
      const g = ctx.createGain();
      g.gain.value = name === 'amb' ? 0.55 : name === 'music' ? 0.6 * musicLevel() : 0.9;
      g.connect(master); buses[name] = g;
    });
    noiseBuf = makeNoise(ctx, 2.5, false);
    pinkBuf = makeNoise(ctx, 4, true);
    A.ready = true;
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    TS.emit('audio-ready', ctx);
    return ctx;
  };

  A.now = () => (A.ctx ? A.ctx.currentTime : performance.now() / 1000);
  A.latency = () => (A.ctx ? (A.ctx.outputLatency || 0) + (A.ctx.baseLatency || 0) : 0);
  A.bus = (name) => buses[name];
  A.setMuted = (muted) => {
    if (!A.ctx) return;
    const t = A.ctx.currentTime;
    master.gain.cancelScheduledValues(t);
    master.gain.setTargetAtTime(muted ? 0 : 0.85, t, 0.06);
  };
  TS.on('settings', ({ key, value }) => { if (key === 'sound') A.setMuted(!value); });
  A.busLevel = (name, level, time) => {
    if (!A.ctx || !buses[name]) return;
    const t = A.ctx.currentTime;
    const v = name === 'music' ? level * musicLevel() : level;
    buses[name].gain.cancelScheduledValues(t);
    buses[name].gain.setTargetAtTime(v, t, time || 0.3);
  };

  /* Map an AudioContext time to the performance.now() moment it is heard (output timestamp aware). */
  A.heardAt = (when) => {
    const ctx = A.ctx;
    if (!ctx) return performance.now();
    try {
      const ts = ctx.getOutputTimestamp ? ctx.getOutputTimestamp() : null;
      if (ts && ts.performanceTime > 0) return ts.performanceTime + (when - ts.contextTime) * 1000;
    } catch (e) { /* not supported */ }
    return performance.now() + (when - ctx.currentTime + A.latency()) * 1000;
  };
  /* Sound-sync log (dev builds only): action time vs the moment its cue is heard. */
  const syncLog = [];
  A.sync = (name, actionPerfMs, when) => {
    if (!A.ctx || !TS.isDev()) return;
    const heard = A.heardAt(when == null ? A.ctx.currentTime : when);
    syncLog.push({ name, action: +actionPerfMs.toFixed(1), heard: +heard.toFixed(1), offsetMs: +(heard - actionPerfMs).toFixed(1) });
    if (syncLog.length > 400) syncLog.shift();
  };
  A.syncLog = () => syncLog.slice();

  function out(node, o) {
    let last = node;
    if (o.pan) {
      const p = A.ctx.createStereoPanner ? A.ctx.createStereoPanner() : null;
      if (p) { p.pan.value = TS.clamp(o.pan, -1, 1); last.connect(p); last = p; }
    }
    last.connect(buses[o.bus || 'sfx'] || buses.sfx);
    if (o.verb) { const s = A.ctx.createGain(); s.gain.value = o.verb; last.connect(s); s.connect(reverbIn); }
  }

  /* Oscillator voice with envelope and optional pitch glide and filter. */
  A.tone = function (o) {
    if (!A.ctx) return null;
    const ctx = A.ctx, when = o.when ?? ctx.currentTime;
    const dur = o.dur ?? 0.2, attack = o.attack ?? 0.005, vol = o.vol ?? 0.3;
    const osc = ctx.createOscillator();
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(o.freq, when);
    if (o.to) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.to), when + (o.glide ?? dur));
    if (o.detune) osc.detune.value = o.detune;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), when + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    let node = osc;
    if (o.lp) { const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = o.lp; f.Q.value = o.q ?? 0.7; osc.connect(f); node = f; }
    node.connect(g);
    out(g, o);
    osc.start(when); osc.stop(when + dur + 0.05);
    osc.onended = () => { try { g.disconnect(); } catch (e) { /* gone */ } };
    return osc;
  };

  /* Filtered noise burst. */
  A.noise = function (o) {
    if (!A.ctx) return null;
    const ctx = A.ctx, when = o.when ?? ctx.currentTime, dur = o.dur ?? 0.1;
    const src = ctx.createBufferSource();
    src.buffer = o.pink ? pinkBuf : noiseBuf;
    src.loop = dur > 2;
    const f = ctx.createBiquadFilter();
    f.type = o.filter || 'bandpass';
    f.frequency.setValueAtTime(o.freq ?? 1200, when);
    if (o.to) f.frequency.exponentialRampToValueAtTime(o.to, when + dur);
    f.Q.value = o.q ?? 1;
    const g = ctx.createGain();
    const vol = o.vol ?? 0.2, attack = o.attack ?? 0.003;
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), when + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    src.connect(f); f.connect(g); out(g, o);
    src.start(when, Math.random() * 1.5); src.stop(when + dur + 0.05);
    src.onended = () => { try { g.disconnect(); } catch (e) { /* gone */ } };
    return src;
  };

  /* Karplus-Strong plucked string, pre-rendered per pitch. */
  function ksBuffer(freq, damp, dur) {
    const key = freq.toFixed(1) + ':' + damp + ':' + dur;
    if (ksCache.has(key)) return ksCache.get(key);
    const ctx = A.ctx, sr = ctx.sampleRate, n = Math.floor(sr * dur);
    const buf = ctx.createBuffer(1, n, sr), d = buf.getChannelData(0);
    const period = Math.max(2, Math.round(sr / freq));
    const ring = new Float32Array(period);
    let lp = 0;
    for (let i = 0; i < period; i++) { lp = lp * 0.55 + (Math.random() * 2 - 1) * 0.45; ring[i] = lp; }
    let idx = 0;
    for (let i = 0; i < n; i++) {
      const a = ring[idx], b = ring[(idx + 1) % period];
      ring[idx] = (a + b) * 0.5 * damp;
      d[i] = a;
      idx = (idx + 1) % period;
    }
    const fade = Math.floor(sr * 0.05);
    for (let i = 0; i < fade; i++) d[n - 1 - i] *= i / fade;
    ksCache.set(key, buf);
    return buf;
  }
  A.pluck = function (freq, o) {
    if (!A.ctx) return null;
    o = o || {};
    const ctx = A.ctx, when = o.when ?? ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = ksBuffer(freq, o.damp ?? 0.996, o.dur ?? 1.8);
    const g = ctx.createGain(); g.gain.value = o.vol ?? 0.35;
    let node = src;
    if (o.lp) { const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = o.lp; src.connect(f); node = f; }
    node.connect(g); out(g, o);
    src.start(when);
    src.onended = () => { try { g.disconnect(); } catch (e) { /* gone */ } };
    return src;
  };

  /* Percussion kit. */
  A.kick = (when, vol) => {
    A.tone({ when, type: 'sine', freq: 150, to: 42, glide: 0.12, dur: 0.32, vol: vol ?? 0.75, attack: 0.002 });
    A.noise({ when, freq: 2400, q: 0.8, dur: 0.02, vol: (vol ?? 0.75) * 0.25 });
  };
  A.drum = (when, vol, pitch) => { // a rawhide hand drum: low body + skin slap
    const p = pitch || 1;
    A.tone({ when, type: 'sine', freq: 190 * p, to: 92 * p, glide: 0.18, dur: 0.42, vol: vol ?? 0.6, attack: 0.002, verb: 0.15 });
    A.tone({ when, type: 'triangle', freq: 320 * p, to: 210 * p, glide: 0.05, dur: 0.09, vol: (vol ?? 0.6) * 0.3, attack: 0.001 });
    A.noise({ when, freq: 900 * p, q: 1.4, dur: 0.06, vol: (vol ?? 0.6) * 0.35 });
  };
  A.wood = (when, vol, pitch) => {
    A.tone({ when, type: 'square', freq: 820 * (pitch || 1), to: 760 * (pitch || 1), dur: 0.05, vol: (vol ?? 0.2) * 0.35, attack: 0.001, lp: 2600 });
    A.noise({ when, freq: 1800 * (pitch || 1), q: 6, dur: 0.04, vol: vol ?? 0.2 });
  };
  A.shaker = (when, vol) => A.noise({ when, filter: 'highpass', freq: 6500, dur: 0.07, attack: 0.02, vol: vol ?? 0.06 });
  A.brush = (when, vol, dur) => A.noise({ when, filter: 'bandpass', freq: 3800, q: 0.6, dur: dur ?? 0.22, attack: 0.05, vol: vol ?? 0.05 });

  /* Bell-like chime with inharmonic partials. */
  A.chime = (freq, o) => {
    o = o || {};
    const when = o.when ?? A.now(), vol = o.vol ?? 0.18;
    [[1, 1], [2.756, 0.45], [5.404, 0.22]].forEach(([m, v]) =>
      A.tone({ when, type: 'sine', freq: freq * m, dur: (o.dur ?? 1.4) / m, vol: vol * v, attack: 0.002, verb: o.verb ?? 0.35, pan: o.pan, bus: o.bus }));
  };

  /* A cute bleat: buzzy source through two formant filters with vibrato. */
  A.bleat = (o) => {
    if (!A.ctx) return;
    o = o || {};
    const ctx = A.ctx, when = o.when ?? ctx.currentTime, dur = o.dur ?? 0.45, pitch = o.pitch ?? 1;
    const osc = ctx.createOscillator(); osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(420 * pitch, when);
    osc.frequency.linearRampToValueAtTime(520 * pitch, when + dur * 0.25);
    osc.frequency.linearRampToValueAtTime(380 * pitch, when + dur);
    const lfo = ctx.createOscillator(); lfo.frequency.value = 22; const lg = ctx.createGain(); lg.gain.value = 26 * pitch;
    lfo.connect(lg); lg.connect(osc.frequency);
    const f1 = ctx.createBiquadFilter(); f1.type = 'bandpass'; f1.frequency.value = 780; f1.Q.value = 5;
    const f2 = ctx.createBiquadFilter(); f2.type = 'bandpass'; f2.frequency.value = 1250; f2.Q.value = 6;
    const g = ctx.createGain(), vol = o.vol ?? 0.22;
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(vol, when + 0.04);
    g.gain.setValueAtTime(vol, when + dur * 0.6);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    osc.connect(f1); osc.connect(f2); f1.connect(g); f2.connect(g);
    out(g, { pan: o.pan, verb: 0.2 });
    osc.start(when); lfo.start(when); osc.stop(when + dur + 0.05); lfo.stop(when + dur + 0.05);
    osc.onended = () => { try { g.disconnect(); } catch (e) { /* gone */ } };
  };

  A.whoosh = (o) => { o = o || {}; A.noise({ when: o.when, freq: o.from ?? 400, to: o.to ?? 3200, q: 1.2, dur: o.dur ?? 0.35, attack: (o.dur ?? 0.35) * 0.6, vol: o.vol ?? 0.18, pan: o.pan }); };
  A.pop = (o) => { o = o || {}; A.tone({ when: o.when, type: 'sine', freq: o.freq ?? 520, to: (o.freq ?? 520) * 2.2, glide: 0.07, dur: 0.14, vol: o.vol ?? 0.25, pan: o.pan }); };
  A.boing = (o) => { o = o || {}; A.tone({ when: o.when, type: 'triangle', freq: o.freq ?? 300, to: (o.freq ?? 300) * 0.45, glide: 0.25, dur: 0.3, vol: o.vol ?? 0.18, pan: o.pan }); };
  A.thud = (o) => { o = o || {}; A.tone({ when: o.when, type: 'sine', freq: 110, to: 48, glide: 0.1, dur: 0.28, vol: o.vol ?? 0.6 }); A.noise({ when: o.when, filter: 'lowpass', freq: 900, dur: 0.12, vol: (o.vol ?? 0.6) * 0.5 }); };
  A.paper = (o) => { o = o || {}; A.noise({ when: o.when, filter: 'bandpass', freq: o.freq ?? 2600, to: (o.freq ?? 2600) * 1.6, q: 0.7, dur: o.dur ?? 0.16, attack: 0.04, vol: o.vol ?? 0.12, pan: o.pan }); };
  A.click = (o) => { o = o || {}; A.noise({ when: o.when, filter: 'highpass', freq: 3000, dur: 0.018, vol: o.vol ?? 0.12, pan: o.pan }); A.tone({ when: o.when, type: 'square', freq: 1700, dur: 0.012, vol: (o.vol ?? 0.12) * 0.3 }); };
  A.typeKey = (o) => { o = o || {}; A.noise({ when: o.when, filter: 'bandpass', freq: 2200 + Math.random() * 1200, q: 3, dur: 0.03, vol: o.vol ?? 0.09 }); A.tone({ when: o.when, type: 'sine', freq: 140, dur: 0.04, vol: 0.05 }); };

  /* A continuous noise voice whose level and colour the game drives every frame (rope whirr, lamp hum). */
  A.loop = (o) => {
    if (!A.ctx) return null;
    o = o || {};
    const ctx = A.ctx;
    const s = ctx.createBufferSource(); s.buffer = o.pink ? pinkBuf : noiseBuf; s.loop = true;
    const f = ctx.createBiquadFilter(); f.type = o.filter || 'bandpass'; f.frequency.value = o.freq || 800; f.Q.value = o.q ?? 1;
    const g = ctx.createGain(); g.gain.value = 0.0001;
    s.connect(f); f.connect(g); out(g, o); s.start();
    let alive = true;
    return {
      level(v, tc) { if (alive && A.ctx) g.gain.setTargetAtTime(Math.max(0.0001, v), A.ctx.currentTime, tc ?? 0.06); },
      freq(v, tc) { if (alive && A.ctx) f.frequency.setTargetAtTime(Math.max(40, v), A.ctx.currentTime, tc ?? 0.08); },
      stop() { if (!alive) return; alive = false; try { s.stop(); } catch (e) { /* stopped */ } try { g.disconnect(); } catch (e) { /* gone */ } }
    };
  };

  /* Soft polyphonic pad (resolutions and finales). */
  A.pad = (freqs, o) => {
    o = o || {};
    const when = o.when ?? A.now(), dur = o.dur ?? 3, vol = (o.vol ?? 0.12) / Math.max(1, freqs.length * 0.7);
    freqs.forEach((f, i) => {
      A.tone({ when, type: 'triangle', freq: f, dur, vol, attack: o.attack ?? 0.6, lp: o.lp ?? 1400, verb: 0.5, bus: o.bus || 'music', pan: (i - (freqs.length - 1) / 2) * 0.25, detune: (i % 2 ? 6 : -6) });
    });
  };

  /* ---------- ambiences ---------- */
  A.ambience = function (kind) {
    if (!A.ctx) return { stop() {}, level() {} };
    const ctx = A.ctx;
    const g = ctx.createGain(); g.gain.value = 0.0001; g.connect(buses.amb);
    const nodes = [];
    let alive = true, timer = 0;
    const loopNoise = (pink, type, freq, q, vol) => {
      const s = ctx.createBufferSource(); s.buffer = pink ? pinkBuf : noiseBuf; s.loop = true;
      const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
      const v = ctx.createGain(); v.gain.value = vol;
      s.connect(f); f.connect(v); v.connect(g); s.start(); nodes.push(s);
      return { src: s, filter: f, gain: v };
    };
    const lfoTo = (param, rate, depth) => { const l = ctx.createOscillator(); l.frequency.value = rate; const d = ctx.createGain(); d.gain.value = depth; l.connect(d); d.connect(param); l.start(); nodes.push(l); };
    const ambLayers = {};
    if (kind === 'prairie') {
      const wind = loopNoise(true, 'lowpass', 380, 0.4, 0.5);
      lfoTo(wind.filter.frequency, 0.07, 180);
      lfoTo(wind.gain.gain, 0.05, 0.22);
      const fire = loopNoise(true, 'lowpass', 160, 0.5, 0.25);
      lfoTo(fire.gain.gain, 0.9, 0.08);
      const crickets = () => {
        if (!alive || !A.ctx) return;
        const t = ctx.currentTime + 0.05, base = 4300 + Math.random() * 500, pan = Math.random() * 1.6 - 0.8;
        const n = 2 + Math.floor(Math.random() * 3);
        for (let i = 0; i < n; i++) {
          const o = ctx.createOscillator(); o.frequency.value = base;
          const v = ctx.createGain(); const st = t + i * 0.055;
          v.gain.setValueAtTime(0.0001, st); v.gain.exponentialRampToValueAtTime(0.018, st + 0.008); v.gain.exponentialRampToValueAtTime(0.0001, st + 0.04);
          let last = v;
          if (ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = pan; v.connect(p); last = p; }
          o.connect(v); last.connect(g); o.start(st); o.stop(st + 0.05);
        }
        if (Math.random() < 0.7) for (let i = 0; i < 1 + Math.floor(Math.random() * 3); i++) A.noise({ when: t + Math.random() * 0.4, filter: 'highpass', freq: 1500 + Math.random() * 2500, dur: 0.012 + Math.random() * 0.02, vol: 0.02 + Math.random() * 0.05, bus: 'amb', pan: 0.1 });
        timer = TS.later(crickets, 380 + Math.random() * 900);
      };
      crickets();
    } else if (kind === 'rain') {
      ambLayers.hiss = loopNoise(false, 'bandpass', 2600, 0.35, 0.32);
      ambLayers.low = loopNoise(true, 'lowpass', 520, 0.3, 0.42);
      lfoTo(ambLayers.low.gain.gain, 0.04, 0.12);
      const drips = () => {
        if (!alive || !A.ctx) return;
        const t = ctx.currentTime + 0.03;
        if (ambLayers.dripsOn !== false) A.tone({ when: t, type: 'sine', freq: 1400 + Math.random() * 2400, to: 900 + Math.random() * 600, glide: 0.03, dur: 0.05, vol: 0.012 + Math.random() * 0.02, bus: 'amb', pan: Math.random() * 1.6 - 0.8 });
        timer = TS.later(drips, 60 + Math.random() * 260);
      };
      drips();
    } else if (kind === 'room') {
      loopNoise(true, 'lowpass', 220, 0.3, 0.3);
    } else if (kind === 'dawn') {
      const air = loopNoise(true, 'lowpass', 900, 0.3, 0.18);
      lfoTo(air.gain.gain, 0.06, 0.06);
      const birds = () => {
        if (!alive || !A.ctx) return;
        const t = ctx.currentTime + 0.05, base = 2400 + Math.random() * 1800, n = 2 + Math.floor(Math.random() * 4), pan = Math.random() * 1.4 - 0.7;
        for (let i = 0; i < n; i++) A.tone({ when: t + i * (0.07 + Math.random() * 0.05), type: 'sine', freq: base * (1 + Math.random() * 0.25), to: base * (0.8 + Math.random() * 0.5), glide: 0.06, dur: 0.08, vol: 0.02 + Math.random() * 0.015, bus: 'amb', pan });
        timer = TS.later(birds, 900 + Math.random() * 2600);
      };
      birds();
    }
    g.gain.setTargetAtTime(1, ctx.currentTime, 0.8);
    return {
      layers: ambLayers,
      level(v, t) { if (A.ctx) g.gain.setTargetAtTime(Math.max(0.0001, v), ctx.currentTime, t ?? 0.5); },
      stop(fade) {
        if (!alive) return;
        alive = false; TS.cancel(timer);
        if (!A.ctx) return;
        g.gain.setTargetAtTime(0.0001, ctx.currentTime, (fade ?? 0.6) / 3);
        TS.later(() => { nodes.forEach(n => { try { n.stop(); } catch (e) { /* stopped */ } }); try { g.disconnect(); } catch (e) { /* gone */ } }, (fade ?? 0.6) * 1000 + 300);
      }
    };
  };

  /* Note helpers */
  A.midi = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const NOTE = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
  A.note = (name) => { const m = /^([A-G][#b]?)(-?\d)$/.exec(name); return m ? A.midi(12 * (Number(m[2]) + 1) + NOTE[m[1]]) : 440; };

  /* Unlock on the first gesture inside the game; pause with the tab; close on unmount. */
  const unlockOnce = () => { A.unlock(); };
  ['pointerdown', 'touchstart'].forEach(ev => TS.listen(TS.root, ev, unlockOnce, { capture: true, passive: true }));
  TS.listen(window, 'keydown', unlockOnce, { capture: true, passive: true });
  TS.listen(document, 'visibilitychange', () => {
    if (A.ctx) { if (document.hidden) A.ctx.suspend().catch(() => {}); else A.ctx.resume().catch(() => {}); }
    TS.emit('visibility', !document.hidden);
  });
  TS.onDestroy(() => {
    const ctx = A.ctx;
    A.ctx = null; A.ready = false;
    if (ctx) { try { ctx.close(); } catch (e) { /* closed */ } }
  });
})(window.TSG_ENV);
