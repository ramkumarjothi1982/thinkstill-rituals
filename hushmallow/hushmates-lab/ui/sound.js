// Delicate synthesised sound for the relay's key moments (no audio files).
// Quiet by design, started only after a person interacts (browsers require
// it), and one tap turns it off. Remembered per browser where storage works.

let ctx = null;
let master = null;
let enabled = true;
try { enabled = localStorage.getItem('hushmates.sound') !== 'off'; } catch { /* storage blocked */ }

function audio() {
  if (!enabled) return null;
  try {
    if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return null;
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.16;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  } catch { return null; }
}

function tone(c, { f = 440, type = 'sine', at = 0, dur = 0.6, gain = 0.5, attack = 0.01, bend = 0 }) {
  const o = c.createOscillator();
  const g = c.createGain();
  const t = c.currentTime + at;
  o.type = type;
  o.frequency.setValueAtTime(f, t);
  if (bend) o.frequency.exponentialRampToValueAtTime(Math.max(40, f * bend), t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(master);
  o.start(t); o.stop(t + dur + 0.05);
}

function air(c, { at = 0, dur = 1.2, from = 300, to = 2400, gain = 0.25 }) {
  const n = Math.floor(c.sampleRate * dur);
  const buf = c.createBuffer(1, n, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * 0.6;
  const src = c.createBufferSource();
  src.buffer = buf;
  const bp = c.createBiquadFilter();
  bp.type = 'bandpass'; bp.Q.value = 0.8;
  const t = c.currentTime + at;
  bp.frequency.setValueAtTime(from, t);
  bp.frequency.exponentialRampToValueAtTime(to, t + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + dur * 0.4);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(bp); bp.connect(g); g.connect(master);
  src.start(t); src.stop(t + dur);
}

const SOUNDS = {
  tap: (c) => tone(c, { f: 660, type: 'triangle', dur: 0.12, gain: 0.18 }),
  squish: (c) => tone(c, { f: 260, dur: 0.35, gain: 0.35, bend: 0.6 }),
  release: (c) => { air(c, { dur: 1.6, from: 280, to: 2600, gain: 0.22 }); tone(c, { f: 784, at: 0.5, dur: 1.4, gain: 0.18 }); tone(c, { f: 1175, at: 0.62, dur: 1.2, gain: 0.1 }); },
  arrive: (c) => { air(c, { dur: 1.1, from: 1800, to: 500, gain: 0.12 }); tone(c, { f: 988, at: 0.7, dur: 0.9, gain: 0.12 }); },
  catch: (c) => { tone(c, { f: 523, type: 'triangle', dur: 0.5, gain: 0.25 }); tone(c, { f: 659, type: 'triangle', at: 0.09, dur: 0.6, gain: 0.22 }); },
  petal: (c) => { tone(c, { f: 1047, dur: 0.9, gain: 0.16 }); tone(c, { f: 1568, at: 0.05, dur: 0.8, gain: 0.09 }); },
  pass: (c) => air(c, { dur: 1.0, from: 1600, to: 260, gain: 0.14 }),
  home: (c) => { [262, 330, 392, 523].forEach((f, i) => tone(c, { f, at: i * 0.12, dur: 2.4, gain: 0.13, attack: 0.5 })); [1047, 1319, 1568].forEach((f, i) => tone(c, { f, at: 1 + i * 0.18, dur: 1.2, gain: 0.07 })); },
  unfold: (c) => [784, 988, 1175, 1319, 1568].forEach((f, i) => tone(c, { f, at: i * 0.11, dur: 0.8, gain: 0.08 })),
};

export function play(name) {
  const c = audio();
  if (!c || !SOUNDS[name]) return;
  try { SOUNDS[name](c); } catch { /* audio is a nicety */ }
}

export function soundOn() { return enabled; }
export function setSound(on) {
  enabled = !!on;
  try { localStorage.setItem('hushmates.sound', enabled ? 'on' : 'off'); } catch { /* storage blocked */ }
  if (!enabled && ctx) { try { ctx.suspend(); } catch { /* ok */ } }
}
