// A small, inspectable Web Audio fake for Node unit tests (SHARED.md L22).
//
// Enough of the API for the Sound Engine, AmbientBed and the music modules:
// every node records its connections, every AudioParam records its scheduled
// events (and can be evaluated with valueAt), sources record start / stop and
// fire `ended` when the clock passes their stop time. Nothing makes sound.
//
//   import { installAudioGlobals, FakeAudioContext } from './lib/fake-audio.mjs';
//   const restore = installAudioGlobals();          // AudioContext, document, navigator.userActivation
//   const s = new SoundEngine(); s.unlock();        // s.ctx is a FakeAudioContext
//   s.ctx.advance(1);                               // move the clock: ended sources leave ctx.live
//   restore();
//
// Extras for tests: restore.document, restore.setHidden(b), restore.setActive(b);
// ctx.nodes (every node made), ctx.count(kind), reaches(node, target).

// ------------------------------------------------------------------ param --
export class FakeParam {
  constructor(value = 0, name = '') {
    this.name = name;
    this.value = value;
    this.defaultValue = value;
    this.minValue = -3.4028234663852886e38;
    this.maxValue = 3.4028234663852886e38;
    this.events = [];      // every call, in call order: { type, v?, t, tau?, dur? }
    this._auto = [];       // the live automation timeline (cancel removes from here, never from `events`)
    this._v0 = null;       // value when automation started
    this.inputs = new Set();
  }

  _push(e) {
    if (this._v0 === null) this._v0 = this.value;
    this.events.push(e);
    if (e.type === 'cancel') this._auto = this._auto.filter((a) => a.t < e.t);
    else if (e.type === 'hold') this._auto = this._auto.filter((a) => a.t <= e.t);
    else { this._auto.push(e); this._auto.sort((a, b) => a.t - b.t); }
    return this;
  }

  setValueAtTime(v, t) { return this._push({ type: 'set', v, t }); }
  linearRampToValueAtTime(v, t) { return this._push({ type: 'linear', v, t }); }
  exponentialRampToValueAtTime(v, t) {
    if (!(v > 0 || v < 0)) throw new RangeError('exponentialRampToValueAtTime: value must be non-zero');
    return this._push({ type: 'exp', v, t });
  }
  setTargetAtTime(v, t, tau) { return this._push({ type: 'target', v, t, tau }); }
  setValueCurveAtTime(curve, t, dur) { return this._push({ type: 'curve', v: curve[curve.length - 1], curve: [...curve], t, dur }); }
  cancelScheduledValues(t) { return this._push({ type: 'cancel', t }); }
  cancelAndHoldAtTime(t) { return this._push({ type: 'hold', t }); }

  /** Events of one type (or all), in call order. */
  of(type) { return type ? this.events.filter((e) => e.type === type) : [...this.events]; }
  /** The last event (of a type). */
  last(type) { const l = this.of(type); return l[l.length - 1] || null; }

  /** The automation curve evaluated at time t (seconds); a close model of the real thing. */
  valueAt(t) {
    let v = this._v0 ?? this.value, pt = 0, target = null;
    for (const e of this._auto) {
      if (target) {   // a setTargetAtTime runs until the next event starts
        const end = Math.min(e.t, t);
        if (end > target.t) v = target.v + (v - target.v) * Math.exp(-(end - target.t) / target.tau);
        pt = end; target = null;
        if (e.t > t) return v;
      }
      if (e.type === 'set' || e.type === 'curve') {
        if (e.t > t) return v;
        if (e.type === 'curve' && t < e.t + e.dur) { const c = e.curve, k = (t - e.t) / e.dur * (c.length - 1), i = Math.floor(k); return c[i] + (c[Math.min(c.length - 1, i + 1)] - c[i]) * (k - i); }
        v = e.v; pt = e.type === 'curve' ? e.t + e.dur : e.t;
      } else if (e.type === 'linear' || e.type === 'exp') {
        if (t < e.t) {
          if (t <= pt) return v;
          const u = (t - pt) / (e.t - pt);
          return e.type === 'linear' ? v + (e.v - v) * u : (v === 0 || Math.sign(v) !== Math.sign(e.v) ? v : v * Math.pow(e.v / v, u));
        }
        v = e.v; pt = e.t;
      } else if (e.type === 'target') {
        if (e.t > t) return v;
        target = e;
      }
    }
    if (target && t > target.t) v = target.v + (v - target.v) * Math.exp(-(t - target.t) / target.tau);
    return v;
  }
}

// ------------------------------------------------------------------ nodes --
export class FakeNode {
  constructor(ctx, kind, params = {}) {
    this.context = ctx;
    this.kind = kind;
    this.outputs = new Set();
    this.inputs = new Set();
    this.disconnects = 0;
    this.numberOfInputs = 1; this.numberOfOutputs = 1;
    this.channelCount = 2; this.channelCountMode = 'max'; this.channelInterpretation = 'speakers';
    for (const [k, v] of Object.entries(params)) this[k] = new FakeParam(v, `${kind}.${k}`);
    this._listeners = new Map();
    ctx.nodes.push(this);
  }

  connect(dest) {
    if (!dest || typeof dest !== 'object') throw new TypeError('connect: not an AudioNode or AudioParam');
    if (dest.context && dest.context !== this.context) throw new Error('connect: nodes from different contexts');
    this.outputs.add(dest);
    dest.inputs?.add(this);
    return dest instanceof FakeParam ? undefined : dest;
  }

  disconnect(dest) {
    this.disconnects++;
    if (dest) { this.outputs.delete(dest); dest.inputs?.delete(this); return; }
    for (const d of this.outputs) d.inputs?.delete(this);
    this.outputs.clear();
  }

  addEventListener(type, fn) { if (!this._listeners.has(type)) this._listeners.set(type, new Set()); this._listeners.get(type).add(fn); }
  removeEventListener(type, fn) { this._listeners.get(type)?.delete(fn); }
  _fire(type) {
    const ev = { type, target: this, currentTarget: this };
    try { this['on' + type]?.(ev); } finally { for (const fn of [...(this._listeners.get(type) || [])]) fn(ev); }
  }
}

/** Oscillator, BufferSource and ConstantSource: start / stop / ended. */
export class FakeSource extends FakeNode {
  constructor(ctx, kind, params) {
    super(ctx, kind, params);
    this.numberOfInputs = 0;
    this.startAt = null; this.stopAt = null; this.startOffset = 0; this.ended = false; this.onended = null;
    this.stops = 0;
  }

  start(when = 0, offset = 0, dur) {
    if (this.startAt !== null) throw new Error('InvalidStateError: start() called twice');
    this.startAt = Math.max(when, this.context.currentTime);
    this.startOffset = offset;
    if (dur !== undefined) this.stopAt = this.startAt + dur;
    this.context.live.add(this);
  }

  stop(when = 0) {
    if (this.startAt === null) throw new Error('InvalidStateError: stop() before start()');
    this.stops++;
    if (this.ended) return;
    this.stopAt = Math.max(when, this.context.currentTime);
  }

  /** When this source ends on its own (stop time, or the end of a non-looping buffer); Infinity if never. */
  get endAt() {
    let end = this.stopAt ?? Infinity;
    if (this.kind === 'bufferSource' && this.buffer && !this.loop && this.startAt !== null) {
      end = Math.min(end, this.startAt + Math.max(0, this.buffer.duration - this.startOffset) / Math.max(1e-6, this.playbackRate.value));
    }
    return end;
  }
}

export class FakeBuffer {
  constructor(channels = 1, length = 1, sampleRate = 48000) {
    if (!(channels >= 1) || !(length >= 1)) throw new RangeError('createBuffer: bad size');
    this.numberOfChannels = channels; this.length = length; this.sampleRate = sampleRate;
    this.duration = length / sampleRate;
    this._data = Array.from({ length: channels }, () => null);
  }
  getChannelData(i) {
    if (i < 0 || i >= this.numberOfChannels) throw new RangeError('getChannelData: bad channel');
    return (this._data[i] ||= new Float32Array(this.length));
  }
  copyToChannel(src, i, at = 0) { this.getChannelData(i).set(src.subarray(0, this.length - at), at); }
  copyFromChannel(dst, i, at = 0) { dst.set(this.getChannelData(i).subarray(at, at + dst.length)); }
}

// ---------------------------------------------------------------- context --
export class FakeAudioContext {
  static instances = [];

  constructor(opts = {}) {
    this.options = opts;
    this.sampleRate = opts.sampleRate || 48000;
    this.currentTime = 0;
    this.state = opts.state || 'running';
    this.baseLatency = 0.005;
    this.nodes = [];
    this.live = new Set();       // sources started and not yet ended
    this.calls = { resume: 0, suspend: 0, close: 0 };
    this.onstatechange = null;
    this._listeners = new Map();
    this.destination = new FakeNode(this, 'destination');
    this.destination.numberOfOutputs = 0; this.destination.maxChannelCount = 2;
    this.listener = {};
    FakeAudioContext.instances.push(this);
  }

  createGain() { return new FakeNode(this, 'gain', { gain: 1 }); }
  createOscillator() { const o = new FakeSource(this, 'oscillator', { frequency: 440, detune: 0 }); o.type = 'sine'; o.setPeriodicWave = (w) => { o.type = 'custom'; o.wave = w; }; return o; }
  createBiquadFilter() { const f = new FakeNode(this, 'biquad', { frequency: 350, Q: 1, gain: 0, detune: 0 }); f.type = 'lowpass'; f.getFrequencyResponse = () => {}; return f; }
  createBufferSource() { const s = new FakeSource(this, 'bufferSource', { playbackRate: 1, detune: 0 }); Object.assign(s, { buffer: null, loop: false, loopStart: 0, loopEnd: 0 }); return s; }
  createConstantSource() { return new FakeSource(this, 'constantSource', { offset: 1 }); }
  createBuffer(channels, length, sampleRate) { return new FakeBuffer(channels, length, sampleRate); }
  createStereoPanner() { return new FakeNode(this, 'panner', { pan: 0 }); }
  createConvolver() { const c = new FakeNode(this, 'convolver'); Object.assign(c, { buffer: null, normalize: true }); return c; }
  createDynamicsCompressor() { const c = new FakeNode(this, 'compressor', { threshold: -24, knee: 30, ratio: 12, attack: 0.003, release: 0.25 }); c.reduction = 0; return c; }
  createWaveShaper() { const w = new FakeNode(this, 'waveShaper'); Object.assign(w, { curve: null, oversample: 'none' }); return w; }
  createDelay(maxDelayTime = 1) { const d = new FakeNode(this, 'delay', { delayTime: 0 }); d.maxDelayTime = maxDelayTime; return d; }
  createAnalyser() { const a = new FakeNode(this, 'analyser'); Object.assign(a, { fftSize: 2048, frequencyBinCount: 1024, smoothingTimeConstant: 0.8, getFloatTimeDomainData: () => {}, getByteFrequencyData: () => {} }); return a; }
  createChannelMerger(n = 6) { const m = new FakeNode(this, 'merger'); m.numberOfInputs = n; return m; }
  createChannelSplitter(n = 6) { const s = new FakeNode(this, 'splitter'); s.numberOfOutputs = n; return s; }
  createPeriodicWave(real, imag) { return { real: [...real], imag: [...imag] }; }

  _setState(s) {
    if (this.state === s) return;
    this.state = s;
    const ev = { type: 'statechange', target: this };
    this.onstatechange?.(ev);
    for (const fn of [...(this._listeners.get('statechange') || [])]) fn(ev);
  }
  resume() { this.calls.resume++; if (this.state === 'closed') return Promise.reject(new Error('InvalidStateError: closed')); this._setState('running'); return Promise.resolve(); }
  suspend() { this.calls.suspend++; if (this.state === 'closed') return Promise.reject(new Error('InvalidStateError: closed')); this._setState('suspended'); return Promise.resolve(); }
  close() { this.calls.close++; this._setState('closed'); return Promise.resolve(); }
  addEventListener(type, fn) { if (!this._listeners.has(type)) this._listeners.set(type, new Set()); this._listeners.get(type).add(fn); }
  removeEventListener(type, fn) { this._listeners.get(type)?.delete(fn); }

  /** Move the clock forward; sources whose end time has passed fire `ended` (earliest first) and leave `live`. */
  advance(secs) {
    this.currentTime += secs;
    const done = [...this.live].filter((s) => s.endAt <= this.currentTime + 1e-9).sort((a, b) => a.endAt - b.endAt);
    for (const s of done) { this.live.delete(s); s.ended = true; s._fire('ended'); }
    return this;
  }

  /** How many nodes of a kind were made ('gain', 'oscillator', 'bufferSource', 'biquad', 'panner', …). */
  count(kind) { return this.nodes.filter((n) => n.kind === kind).length; }
}

/** Is there a connection path from `node` to `target` (a node or a param)? */
export function reaches(node, target, seen = new Set()) {
  if (node === target) return true;
  if (!node?.outputs || seen.has(node)) return false;
  seen.add(node);
  for (const o of node.outputs) if (reaches(o, target, seen)) return true;
  return false;
}

// ---------------------------------------------------------------- globals --
/**
 * Install the fake as globalThis.AudioContext, plus a minimal `document` (only
 * if none exists) and navigator.userActivation. Returns restore(), which also
 * carries .document, .setHidden(b) and .setActive(b) for tests.
 */
export function installAudioGlobals({ active = true } = {}) {
  const saved = {
    AudioContext: Object.getOwnPropertyDescriptor(globalThis, 'AudioContext'),
    webkitAudioContext: Object.getOwnPropertyDescriptor(globalThis, 'webkitAudioContext'),
    navigator: Object.getOwnPropertyDescriptor(globalThis, 'navigator'),
    document: Object.getOwnPropertyDescriptor(globalThis, 'document'),
  };
  const define = (k, value) => Object.defineProperty(globalThis, k, { value, configurable: true, writable: true, enumerable: false });
  define('AudioContext', FakeAudioContext);
  define('webkitAudioContext', undefined);

  let isActive = !!active;
  const old = saved.navigator ? (saved.navigator.get ? saved.navigator.get.call(globalThis) : saved.navigator.value) : null;
  const pick = (k) => { try { return old?.[k]; } catch { return undefined; } };
  define('navigator', {
    userAgent: pick('userAgent') || 'node', language: pick('language') || 'en-GB', hardwareConcurrency: pick('hardwareConcurrency') || 4,
    userActivation: { get isActive() { return isActive; }, get hasBeenActive() { return true; } },
  });

  let doc = null;
  if (!saved.document) {
    const listeners = new Map();
    doc = {
      hidden: false, visibilityState: 'visible',
      addEventListener(type, fn) { if (!listeners.has(type)) listeners.set(type, new Set()); listeners.get(type).add(fn); },
      removeEventListener(type, fn) { listeners.get(type)?.delete(fn); },
      dispatchEvent(ev) { const e = typeof ev === 'string' ? { type: ev } : ev; for (const fn of [...(listeners.get(e.type) || [])]) fn(e); return true; },
      listenerCount(type) { return listeners.get(type)?.size || 0; },
    };
    define('document', doc);
  }

  const restore = () => {
    for (const [k, d] of Object.entries(saved)) {
      if (d) Object.defineProperty(globalThis, k, d); else delete globalThis[k];
    }
  };
  restore.document = doc || globalThis.document;
  restore.setActive = (b) => { isActive = !!b; };
  /** Fake document only: flip hidden / visibilityState and dispatch visibilitychange. */
  restore.setHidden = (b) => {
    if (!doc) throw new Error('setHidden needs the fake document (a real one was already present)');
    doc.hidden = !!b; doc.visibilityState = b ? 'hidden' : 'visible';
    doc.dispatchEvent({ type: 'visibilitychange' });
  };
  return restore;
}
