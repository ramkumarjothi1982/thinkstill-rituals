// Offline renderer and mastering for score plans (WP-04): a fork of the frozen
// audio/soundtrack.mjs (renderInPage, mastering), which stays byte-identical.
//
// What the fork adds (everything else is v2's code, line for line, so a v2 plan
// renders to the very same WAV: tests/parity/audio-score.test.mjs holds the
// --compat v2-score render to the approved soundtrack's sha256):
//
//   • kit:       the engine voice is buildMallow(plan.kit) (v2: always 'noomi', R8);
//                the page checks the kit, the bed, every gesture and fx name against
//                the engine (the engine itself silently falls back to its neutral
//                kit, the blue-drift bed, 'tap' and 'chime': here that is a failure)
//                and the kit's root / scale / speed against library/sound/soundmap.json.
//   • circular:  plan.circular = { tail } renders [−PRE, D + tail] and wrap-adds the
//                tail onto the start (R7): reverb tails and anything sounding at the end
//                continue across the loop seam into frame 0. plan.fade = null: no dip.
//                The realm bed is one continuous voice, so it cannot simply be summed:
//                it is windowed (silent before 0; a crossfade over [0, xfade) and
//                [D, D + xfade); silent after) so that its continuation past D blends into
//                its own start. The crossfade keeps the bed's power on course: a quick
//                bed-only probe render measures, on 20 ms blocks every 10 ms across the
//                crossfade, the power of the start, the power of the continuation and
//                their correlation ρ (bedCrossfadeStats), and the weights a/g, (1 − a)/g
//                make the mix's power the interpolation of the two powers for that ρ:
//                linear for ρ = 1 (D a multiple of the engine's noise loops: 15 s with 3 s
//                and 5 s buffers), equal-power for ρ = 0, boosted where the two are
//                anti-correlated (Spark Festival's bed: ρ −0.35 over the second, −0.79 to
//                +0.12 block by block). Measured over the 7 realm beds, the crossfade
//                holds the expected level within 0.34 dB (50 ms windows); one global ρ
//                clamped at 0 let Spark Festival dip 6.9 dB (/home/user/hm-work/wp04r2).
//   • mastering: the look-ahead limiter of a circular plan is circular too (its
//                look-ahead, attack average and release state wrap around the seam).
//
// Determinism as v2: Math.random is seeded before any page code (the same seed for
// every render), Voice self-disposal is disabled and node inputs are kept at ≤ 2
// connections (offlineDeterminism, imported from the frozen file).

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { chromium } from 'playwright';
import { offlineDeterminism } from './soundtrack.mjs';
import { startServer } from '../render/serve.mjs';
import { mkWorkTemp } from '../render/lib/paths.mjs';

export const SR = 48000;
export const PAGE_SEED = 20261013;  // Math.random seed in the page (the engine's noise, reverb, micro-detune), as v2
export const TARGET_LUFS = -16;
export const MAX_TP = -1.5;         // dBTP, hard requirement
export const CEILING_DBTP = -2.0;   // limiter ceiling on the 4x oversampled estimate (0.5 dB margin)

// ------------------------------------------------------ in-page renderer --
// Runs inside headless Chromium. Self-contained: it may only use its argument.
// { plan, check: { kit: {id, root, scale, speed} | null, bedRho, bedXfade, probe } }

async function renderInPage({ plan, check }) {
  const { SR, PRE, DUR, LAT } = plan;
  const TAIL = plan.circular ? plan.circular.tail : 0;
  const LEN = Math.round((PRE + DUR + TAIL) * SR);

  // (offlineDeterminism() has already been installed in this page as an init script)

  // 1. the engine, read-only: fetched as text, one export appended, imported from a Blob URL
  const src = await (await fetch(plan.engineUrl)).text();
  const patched = `${src}\nexport const __hm = { buildGraph, buildMallow, buildFx, startBed, tickBed, setG: (g) => { G = g; }, AMB_LEVEL, KITS, REALM_BEDS, GESTURES, FX, FX_FROM_HOLD };\n`;
  const E = (await import(URL.createObjectURL(new Blob([patched], { type: 'text/javascript' })))).__hm;

  // the engine falls back silently for unknown ids (neutral kit, blue-drift bed, 'tap', 'chime'): refuse instead
  const kitId = plan.kit || 'noomi';
  const kit = E.KITS[kitId];
  if (!kit || kitId === 'neutral') throw new Error(`engine has no Mallow kit '${kitId}'`);
  if (check.kit) {
    const same = kit.root === check.kit.root && kit.speed === check.kit.speed && kit.scale.length === check.kit.scale.length && kit.scale.every((x, i) => x === check.kit.scale[i]);
    if (!same) throw new Error(`soundmap kit ${kitId} {root ${check.kit.root}, scale ${check.kit.scale}, speed ${check.kit.speed}} differs from the engine's {root ${kit.root}, scale ${kit.scale}, speed ${kit.speed}}`);
  }
  if (!E.REALM_BEDS[plan.bed.realm]) throw new Error(`engine has no realm bed '${plan.bed.realm}'`);
  for (const c of plan.engine) {
    // an event may name its own Mallow kit (c.kit), e.g. a cast of several Mallows; the plan's kit otherwise
    const ck = c.kind === 'mallow' ? E.KITS[c.kit || kitId] : null;
    if (c.kind === 'mallow' && (!ck || (c.kit || kitId) === 'neutral')) throw new Error(`engine has no Mallow kit '${c.kit}' (at ${c.t} s)`);
    if (c.kind === 'mallow' ? !(ck.special[c.name] || E.GESTURES[c.name]) : !(E.FX[c.name] || E.FX_FROM_HOLD[c.name])) {
      throw new Error(`engine has no ${c.kind} sound '${c.name}' (at ${c.t} s)`);
    }
  }

  const ctx = new OfflineAudioContext({ numberOfChannels: 2, length: LEN, sampleRate: SR });
  const g = E.buildGraph(ctx, false);
  g.master.gain.value = 0.6;                 // engine default volume
  g.ambBus.gain.value = E.AMB_LEVEL;         // 0.36, as the app
  // the bed's brown-noise "waves" carry most of their energy below 90 Hz, which phones cannot play
  // and which only eats headroom: high-pass the ambience bus on its way into the master
  const ambHp = ctx.createBiquadFilter(); ambHp.type = 'highpass'; ambHp.frequency.value = 90; ambHp.Q.value = 0.6;
  g.ambBus.disconnect(); g.ambBus.connect(ambHp); ambHp.connect(g.master);
  // engine voices read g.ctx.currentTime; give them a controllable clock
  let now = 0;
  g.ctx = new Proxy(ctx, {
    get(t, p) { if (p === 'currentTime') return now; const v = Reflect.get(t, p, t); return typeof v === 'function' ? v.bind(t) : v; },
  });
  E.setG(g);

  // final fade sits after the engine's dynamics (so the compressor never "sees" it)
  g.out.disconnect();
  const fade = ctx.createGain();
  g.out.connect(fade); fade.connect(ctx.destination);
  if (plan.fade) {
    // fade-in: a 4 ms ramp from 0 (no step at the very first sample) to inFloor, then a sine rise to 1
    const n = 256, fin = new Float32Array(n), fout = new Float32Array(n), floor = plan.fade.inFloor || 0;
    for (let i = 0; i < n; i++) {
      const u = i / (n - 1);
      fin[i] = (floor + (1 - floor) * Math.sin(u * Math.PI / 2)) * Math.min(1, (u * plan.fade.inEnd) / 0.004);
      fout[i] = (plan.fade.outFloor || 0) + (1 - (plan.fade.outFloor || 0)) * Math.cos(u * Math.PI / 2) ** 2;
    }
    fade.gain.setValueAtTime(0, 0);
    fade.gain.setValueCurveAtTime(fin, PRE, plan.fade.inEnd);
    fade.gain.setValueCurveAtTime(fout, PRE + plan.fade.outStart, DUR - plan.fade.outStart);
  }

  // scene time → context time for anything that goes through the master chain
  const T = (t) => PRE + t - LAT;

  // studio bus: into the engine master (same EQ / dynamics / reverb as the engine's own voices)
  const bus = ctx.createGain(); bus.gain.value = 1; bus.connect(g.master);
  const wet = ctx.createGain(); wet.gain.value = 1; wet.connect(g.reverbIn);

  const gainNode = (v = 0) => { const n = ctx.createGain(); n.gain.value = v; return n; };
  const biquad = (type, f, q = 0.707) => { const n = ctx.createBiquadFilter(); n.type = type; n.frequency.value = f; n.Q.value = q; return n; };
  const f32 = (a) => Float32Array.from(a);
  // an output strip: gain → panner → bus (+ reverb send)
  function strip(pan = 0, send = 0) {
    const inp = gainNode(1);
    const p = ctx.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, pan));
    inp.connect(p); p.connect(bus);
    if (send > 0) { const s = gainNode(send); p.connect(s); s.connect(wet); }
    return inp;
  }
  // click-free percussive envelope: 0 → peak (linear a) → hold h → -60 dB (exponential d) → 0
  function envAD(p, t, a, h, d, peak) {
    p.setValueAtTime(0, t);
    p.linearRampToValueAtTime(peak, t + a);
    if (h > 0) p.setValueAtTime(peak, t + a + h);
    p.exponentialRampToValueAtTime(peak * 0.001, t + a + h + d);
    p.linearRampToValueAtTime(0, t + a + h + d + 0.01);
    return t + a + h + d + 0.012;
  }
  function noiseSrc(t, stop, offset = 0, color = 'white') {
    const s = ctx.createBufferSource(); s.buffer = g.noise[color]; s.loop = true;
    s.start(t, offset % (s.buffer.duration - 0.1)); s.stop(stop);
    return s;
  }
  const PARTIALS = {
    celesta: [[1, 1, 1], [2, 0.3, 0.55], [4, 0.08, 0.3]],   // [ratio, level, decay factor], as the engine's
  };

  // ---------------- instruments ----------------
  const INST = {
    // pitched blip with optional glide, low-pass and decaying vibrato (pops, clicks, boings)
    blip(e) {
      const t = T(e.t);
      const o = ctx.createOscillator(); o.type = e.type || 'sine';
      o.frequency.setValueAtTime(e.f, t);
      if (e.f1) o.frequency.exponentialRampToValueAtTime(e.f1, t + (e.glide || 0.05));
      const amp = gainNode(0);
      const end = envAD(amp.gain, t, e.a || 0.002, e.h || 0, e.d || 0.08, e.peak);
      if (e.vib) {
        const l = ctx.createOscillator(); l.frequency.value = e.vib.rate;
        const dg = gainNode(0);
        dg.gain.setValueAtTime(e.vib.cents, t);
        dg.gain.linearRampToValueAtTime(0, t + (e.vib.decay || 0.3));
        l.connect(dg); dg.connect(o.detune); l.start(t); l.stop(end);
      }
      let node = o;
      if (e.lp) { const f = biquad('lowpass', e.lp, 0.6); node.connect(f); node = f; }
      node.connect(amp); amp.connect(strip(e.pan, e.send));
      o.start(t); o.stop(end);
    },
    // additive bell (celesta / glass): sines with their own exponential decays
    bell(e) {
      const t = T(e.t);
      const out = strip(e.pan, e.send);
      const lp = biquad('lowpass', e.lp || 5000, 0.5); lp.connect(out);
      for (const [ratio, amp, dec] of PARTIALS[e.partials || 'celesta']) {
        const f = e.f * ratio; if (f > 7500) continue;
        const o = ctx.createOscillator(); o.frequency.value = f;
        const g1 = gainNode(0); const end = envAD(g1.gain, t, 0.003, 0, e.decay * dec, e.peak * amp);
        o.connect(g1); g1.connect(lp); o.start(t); o.stop(end);
      }
    },
    // a tiny sparkle: sine ping that drifts slightly upward (particles rising like stars)
    ping(e) {
      const t = T(e.t);
      const o = ctx.createOscillator(); o.frequency.setValueAtTime(e.f, t); o.frequency.linearRampToValueAtTime(e.f * e.rise, t + e.decay);
      const a = gainNode(0); const end = envAD(a.gain, t, 0.002, 0, e.decay, e.peak);
      o.connect(a); a.connect(strip(e.pan, e.send)); o.start(t); o.stop(end);
    },
    // filtered noise burst with a cutoff sweep (squish textures)
    noiseHit(e) {
      const t = T(e.t);
      const amp = gainNode(0); const end = envAD(amp.gain, t, e.a || 0.003, 0, e.d || 0.08, e.peak);
      const s = noiseSrc(t, end, (e.t * 7.31) % 2.5, e.color || 'white');
      const f = biquad(e.filter || 'lowpass', e.f, e.q || 0.8);
      f.frequency.setValueAtTime(e.f, t);
      if (e.f1) f.frequency.exponentialRampToValueAtTime(e.f1, t + (e.sweep || 0.08));
      s.connect(f); f.connect(amp); amp.connect(strip(e.pan, e.send));
    },
    // breath air: band-passed noise, raised-cosine swell up over `a`, down over `r`; optional stereo width
    air(e) {
      const t = T(e.t);
      const n = 128, curve = new Float32Array(n);
      const total = e.a + e.r;
      for (let i = 0; i < n; i++) {
        const x = (i / (n - 1)) * total;
        curve[i] = x < e.a ? (1 - Math.cos(Math.PI * x / e.a)) / 2 : (1 + Math.cos(Math.PI * (x - e.a) / e.r)) / 2;
        curve[i] *= e.peak;
      }
      const sides = e.width ? [-e.width, e.width] : [0];
      sides.forEach((pan, k) => {
        const s = noiseSrc(t, t + total + 0.05, 0.37 + k * 1.13 + (((e.t % 1) + 1) % 1));   // (pre-roll events have t < 0)
        const bp = biquad('bandpass', e.f0, e.q || 0.8);
        bp.frequency.setValueAtTime(e.f0, t); bp.frequency.exponentialRampToValueAtTime(e.f1, t + total);
        const lp = biquad('lowpass', 3000, 0.5);
        const a = gainNode(0); a.gain.setValueCurveAtTime(curve.map((v) => v / Math.sqrt(sides.length)), t, total);
        s.connect(bp); bp.connect(lp); lp.connect(a); a.connect(strip(pan, e.send));
      });
    },
    // (additions for multi-layer scores; no v2 plan uses them, so the v2 renders are unchanged)
    // a sustained pad voice that circles the listener: detuned sine + triangle, a slow filter
    // sweep, raised-cosine attack / release, its pan automated round a circle (orbit Hz, phase)
    swell(e) {
      const t = T(e.t), dur = e.a + (e.h || 0) + e.r, end = t + dur + 0.05;
      const n = Math.max(64, Math.ceil(dur * 120)), env = new Float32Array(n), pan = new Float32Array(n);
      for (let i = 0; i < n; i++) {
        const x = (i / (n - 1)) * dur;
        env[i] = e.peak * (x < e.a ? (1 - Math.cos(Math.PI * x / e.a)) / 2 : x < e.a + (e.h || 0) ? 1 : (1 + Math.cos(Math.PI * (x - e.a - (e.h || 0)) / e.r)) / 2);
        pan[i] = Math.max(-1, Math.min(1, (e.pan || 0) + (e.width || 0) * Math.sin(2 * Math.PI * ((e.orbit || 0) * (e.t + x)) + (e.phase || 0))));
      }
      const amp = gainNode(0); amp.gain.setValueCurveAtTime(env, t, dur);
      const lp = biquad('lowpass', e.lp0 || 1200, 0.7);
      if (e.lp1) lp.frequency.exponentialRampToValueAtTime(e.lp1, t + dur);
      const p = ctx.createStereoPanner(); p.pan.setValueCurveAtTime(pan, t, dur);
      lp.connect(amp); amp.connect(p); p.connect(bus);
      if (e.send) { const sg = gainNode(e.send); p.connect(sg); sg.connect(wet); }
      for (const [type, det, k] of [['sine', -(e.detune || 6), 1], ['triangle', e.detune || 6, 0.5], ['sine', 1200, 0.12]]) {
        const o = ctx.createOscillator(); o.type = type; o.frequency.value = e.f; o.detune.value = det;
        const og = gainNode(k / 1.3); o.connect(og); og.connect(lp); o.start(t); o.stop(end);
      }
    },
    // a soft rhythmic pulse: a muffled, pitched-down thump with a second harmonic phones can play
    pulse(e) {
      const t = T(e.t);
      const o = ctx.createOscillator(); o.frequency.setValueAtTime(e.f * 2, t); o.frequency.exponentialRampToValueAtTime(e.f, t + 0.06);
      const a = gainNode(0); const end = envAD(a.gain, t, 0.004, 0.01, e.d || 0.22, e.peak);
      const o2 = ctx.createOscillator(); o2.frequency.setValueAtTime(e.f * 4, t); o2.frequency.exponentialRampToValueAtTime(e.f * 2, t + 0.05);
      const a2 = gainNode(0); envAD(a2.gain, t, 0.003, 0, (e.d || 0.22) * 0.6, e.peak * 0.45);
      const lp = biquad('lowpass', e.lp || 900, 0.6); const out = strip(e.pan || 0, e.send || 0);
      o.connect(a); o2.connect(a2); a.connect(lp); a2.connect(lp); lp.connect(out);
      o.start(t); o.stop(end); o2.start(t); o2.stop(end);
    },
    // ---- the v2 score's instruments (feel-something-v2); additive, no earlier plan uses them ----
    // felt piano: slightly inharmonic partials (each decaying faster than the one below), paired
    // strings a few cents apart for the low partials, a soft felt thump, a damper at the end of the note
    piano(e) {
      const t = T(e.t), v = e.v ?? 0.7, len = e.len ?? 1.2, rel = 0.3, end = t + len + rel + 0.1;
      const out = strip(e.pan ?? 0, e.send ?? 0.28);
      const tone = biquad('lowpass', Math.min(9000, 1000 + 4800 * v * Math.min(1.4, 0.5 + 330 / e.f)), 0.5);
      tone.connect(out);
      const B = 0.00032, base = (e.peak ?? 0.03) * v;
      for (let n = 1; n <= 9; n++) {
        const fn = e.f * n * Math.sqrt(1 + B * n * n);
        if (fn > 9500) break;
        const amp = base * Math.pow(n, -1.3) * (n === 2 ? 0.75 : 1);
        const dec = (e.decay ?? 2.8) * Math.sqrt(262 / Math.max(80, e.f)) / (1 + 0.6 * (n - 1));
        const dets = n <= 2 ? [-1.6, 1.6] : [0];
        for (const det of dets) {
          const o = ctx.createOscillator(); o.frequency.value = fn; o.detune.value = det;
          const g1 = gainNode(0);
          g1.gain.setValueAtTime(0, t);
          g1.gain.linearRampToValueAtTime(amp / dets.length, t + 0.005);
          g1.gain.setTargetAtTime(0, t + 0.005, dec / 3);
          g1.gain.setTargetAtTime(0, t + len, rel / 4);
          o.connect(g1); g1.connect(tone); o.start(t); o.stop(end);
        }
      }
      const s = noiseSrc(t, t + 0.06, (e.t * 5.17 + 1) % 2.5);
      const bp = biquad('bandpass', Math.min(2400, e.f * 2.2), 1.2);
      const h = gainNode(0); envAD(h.gain, t, 0.002, 0, 0.03, base * 0.12);
      s.connect(bp); bp.connect(h); h.connect(tone);
    },
    // string ensemble: three detuned saws spread across the stereo field, a filter that opens as the
    // bow digs in, a delayed vibrato; high-passed so the section never muddies the low end
    strings(e) {
      const t = T(e.t), a = e.a ?? 0.6, r = e.r ?? 1.2, len = Math.max(a, e.len), end = t + len + r + 0.1;
      const amp = gainNode(0);
      amp.gain.setValueAtTime(0, t);
      amp.gain.linearRampToValueAtTime(e.peak, t + a);
      amp.gain.setValueAtTime(e.peak, t + len);
      amp.gain.linearRampToValueAtTime(0, t + len + r);
      const lp = biquad('lowpass', e.lp0 ?? 600, 0.6);
      lp.frequency.setValueAtTime(e.lp0 ?? 600, t);
      lp.frequency.linearRampToValueAtTime(e.lp1 ?? 2400, t + a + 0.4);
      const hp = biquad('highpass', e.hp ?? 160, 0.7);
      lp.connect(hp); hp.connect(amp); amp.connect(strip(e.pan ?? 0, e.send ?? 0.45));
      const vib = ctx.createOscillator(); vib.frequency.value = 5.1;
      const vd = gainNode(0); vd.gain.setValueAtTime(0, t); vd.gain.linearRampToValueAtTime(7, t + 0.7);
      vib.connect(vd); vib.start(t); vib.stop(end);
      for (const [det, pan] of [[-9, -0.8], [1, 0], [8, 0.8]]) {
        const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = e.f; o.detune.value = det;
        vd.connect(o.detune);
        const p = ctx.createStereoPanner(); p.pan.value = pan;
        const og = gainNode(1 / 3); o.connect(og); og.connect(p); p.connect(lp); o.start(t); o.stop(end);
      }
    },
    // choir: two detuned saws and a breath of noise through three vowel formants, with vibrato
    choir(e) {
      const t = T(e.t), a = e.a ?? 0.7, r = e.r ?? 1.4, len = Math.max(a, e.len), end = t + len + r + 0.1;
      const F = { a: [[800, 1, 9], [1150, 0.55, 10], [2900, 0.22, 12]], o: [[420, 1, 8], [760, 0.42, 9], [2450, 0.12, 12]], u: [[330, 1, 8], [640, 0.3, 9], [2300, 0.08, 12]] }[e.vowel || 'o'];
      const amp = gainNode(0);
      amp.gain.setValueAtTime(0, t);
      amp.gain.linearRampToValueAtTime(e.peak, t + a);
      amp.gain.setValueAtTime(e.peak, t + len);
      amp.gain.linearRampToValueAtTime(0, t + len + r);
      amp.connect(strip(e.pan ?? 0, e.send ?? 0.6));
      const mixIn = gainNode(1);
      for (const [fc, lvl, q] of F) { const bp = biquad('bandpass', fc, q); const fg = gainNode(lvl * 5); mixIn.connect(bp); bp.connect(fg); fg.connect(amp); }
      const vib = ctx.createOscillator(); vib.frequency.value = 5.3;
      const vd = gainNode(0); vd.gain.setValueAtTime(0, t); vd.gain.linearRampToValueAtTime(10, t + 0.8);
      vib.connect(vd); vib.start(t); vib.stop(end);
      for (const det of [-7, 6]) {
        const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = e.f; o.detune.value = det;
        vd.connect(o.detune);
        const og = gainNode(0.5); o.connect(og); og.connect(mixIn); o.start(t); o.stop(end);
      }
      const s = noiseSrc(t, end, (e.t * 3.3 + 0.7) % 2.5);
      const nb = biquad('bandpass', F[1][0], 2); const ng = gainNode(0.04);
      s.connect(nb); nb.connect(ng); ng.connect(mixIn);
    },
    // bass: sine + a low-passed saw, gently saturated so its harmonics carry on phone speakers
    bass(e) {
      const t = T(e.t), len = e.len ?? 0.5, end = t + len + 0.25;
      const amp = gainNode(0);
      amp.gain.setValueAtTime(0, t);
      amp.gain.linearRampToValueAtTime(e.peak, t + 0.008);
      amp.gain.setTargetAtTime(e.peak * 0.65, t + 0.01, 0.12);
      amp.gain.setTargetAtTime(0, t + len, 0.06);
      const sh = ctx.createWaveShaper();
      const curve = new Float32Array(1024);
      for (let i = 0; i < 1024; i++) { const x = i / 511.5 - 1; curve[i] = Math.tanh(2.2 * x) / Math.tanh(2.2); }
      sh.curve = curve;
      const lp = biquad('lowpass', e.lp ?? 700, 0.7);
      const pre = gainNode(1);
      pre.connect(sh); sh.connect(lp); lp.connect(amp); amp.connect(strip(0, 0.04));
      const o1 = ctx.createOscillator(); o1.frequency.value = e.f;
      const o2 = ctx.createOscillator(); o2.type = 'sawtooth'; o2.frequency.value = e.f; o2.detune.value = 4;
      const g1 = gainNode(0.75), g2 = gainNode(0.32);
      o1.connect(g1); o2.connect(g2); g1.connect(pre); g2.connect(pre);
      o1.start(t); o2.start(t); o1.stop(end); o2.stop(end);
    },
    // soft kick: a sine dropping in pitch, a little click, a second harmonic for small speakers
    kick(e) {
      const t = T(e.t), out = strip(0, 0.03);
      const o = ctx.createOscillator(); o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(52, t + 0.09);
      const a = gainNode(0); const end = envAD(a.gain, t, 0.002, 0.02, e.d ?? 0.32, e.peak);
      const o2 = ctx.createOscillator(); o2.frequency.setValueAtTime(300, t); o2.frequency.exponentialRampToValueAtTime(110, t + 0.06);
      const a2 = gainNode(0); envAD(a2.gain, t, 0.002, 0, 0.09, e.peak * 0.35);
      o.connect(a); o2.connect(a2); a.connect(out); a2.connect(out);
      o.start(t); o.stop(end); o2.start(t); o2.stop(end);
      const s = noiseSrc(t, t + 0.03, (e.t * 7.7) % 2.5); const hp = biquad('highpass', 2500, 0.7); const c = gainNode(0); envAD(c.gain, t, 0.001, 0, 0.012, e.peak * 0.08);
      s.connect(hp); hp.connect(c); c.connect(out);
    },
    // finger snap: a tight band of noise with a body, sent to the reverb
    snap(e) {
      const t = T(e.t), out = strip(e.pan ?? 0, e.send ?? 0.35);
      const s = noiseSrc(t, t + 0.2, (e.t * 9.1 + 0.3) % 2.5);
      const bp = biquad('bandpass', 2600, 2.2); const a = gainNode(0); envAD(a.gain, t, 0.001, 0, 0.07, e.peak);
      s.connect(bp); bp.connect(a); a.connect(out);
      const o = ctx.createOscillator(); o.frequency.value = 1150; const b2 = gainNode(0); const end = envAD(b2.gain, t, 0.001, 0, 0.025, e.peak * 0.25);
      o.connect(b2); b2.connect(out); o.start(t); o.stop(end);
    },
    // shaker: high, short, a touch of swing is in the plan
    shaker(e) {
      const t = T(e.t), out = strip(e.pan ?? 0, 0.12);
      const s = noiseSrc(t, t + 0.12, (e.t * 11.3 + 0.9) % 2.5);
      const hp = biquad('highpass', 6500, 0.8); const lp = biquad('lowpass', 12000, 0.7); const a = gainNode(0);
      envAD(a.gain, t, e.a ?? 0.008, 0, e.d ?? 0.045, e.peak);
      s.connect(hp); hp.connect(lp); lp.connect(a); a.connect(out);
    },
    // riser: noise swelling and brightening toward its end time (e.t is where it lands)
    riser(e) {
      const t1 = T(e.t), dur = e.dur ?? 1.0, t0 = t1 - dur;
      const s = noiseSrc(t0, t1 + 0.05, (e.t * 4.4) % 2.5);
      const bp = biquad('bandpass', 600, 1.4); bp.frequency.setValueAtTime(600, t0); bp.frequency.exponentialRampToValueAtTime(e.f1 ?? 5000, t1);
      const a = gainNode(0); a.gain.setValueAtTime(0.0001, t0); a.gain.exponentialRampToValueAtTime(e.peak, t1 - 0.02); a.gain.linearRampToValueAtTime(0, t1 + 0.03);
      s.connect(bp); bp.connect(a); a.connect(strip(e.pan ?? 0, e.send ?? 0.4));
    },
    // a plucked, marimba-like note for ostinati: sine fundamental + a quickly fading 4th harmonic
    pluck(e) {
      const t = T(e.t), out = strip(e.pan || 0, e.send || 0);
      const lp = biquad('lowpass', e.lp || 4200, 0.6); lp.connect(out);
      for (const [ratio, lvl, dk] of [[1, 1, 1], [2, 0.18, 0.5], [4, 0.22, 0.18]]) {
        const o = ctx.createOscillator(); o.frequency.value = e.f * ratio;
        const g1 = gainNode(0); const end = envAD(g1.gain, t, 0.003, 0, e.decay * dk, e.peak * lvl);
        o.connect(g1); g1.connect(lp); o.start(t); o.stop(end);
      }
    },
  };

  // wooden clock tick-tock: a noise click through a resonant band-pass + a short sine "body"
  function tick(k) {
    const t = T(k.t);
    const out = strip(0.12, 0.25);
    const lp = biquad('lowpass', 3200, 0.5); lp.connect(out);
    const s = noiseSrc(t, t + 0.08, (k.t * 3.7 + 10) % 2.5);
    const bp = biquad('bandpass', k.hi ? 1650 : 1250, 7);
    const a = gainNode(0); envAD(a.gain, t, 0.0008, 0.002, 0.03, k.peak * 2.2);
    s.connect(bp); bp.connect(a); a.connect(lp);
    const o = ctx.createOscillator(); o.frequency.value = k.hi ? 820 : 610;
    const b = gainNode(0); const end = envAD(b.gain, t, 0.001, 0, 0.028, k.peak * 0.45);
    o.connect(b); b.connect(lp); o.start(t); o.stop(end);
  }

  // distant crickets: sine carrier gated into chirps
  function cricket(c) {
    const o = ctx.createOscillator(); o.frequency.value = c.f;
    const a = gainNode(0);
    a.gain.setValueAtTime(0, 0);
    for (const p of c.ev) {
      const t = T(p.t);
      if (t < 0.01) continue;
      a.gain.setValueAtTime(0, t);
      a.gain.linearRampToValueAtTime(p.amp, t + 0.004);
      a.gain.linearRampToValueAtTime(p.amp * 0.7, t + p.dur - 0.004);
      a.gain.linearRampToValueAtTime(0, t + p.dur);
    }
    o.connect(a); a.connect(strip(c.pan, 0.5));
    o.start(0); o.stop(LEN / SR);
  }

  // orbit swirl: one band-passed noise whoosh per thought + an uneasy beating tension tone
  function swirl(S) {
    const t0 = T(S.t0), dur = (S.n - 1) * S.dt;
    const sbus = gainNode(1);
    const muffle = biquad('lowpass', S.muffle[0], 0.5);
    muffle.frequency.setValueCurveAtTime(f32(S.muffle), t0, dur);
    sbus.connect(muffle); muffle.connect(bus);
    const send = gainNode(0.25); muffle.connect(send); send.connect(wet);
    for (const it of S.items) {
      const s = noiseSrc(t0, t0 + dur + 0.05, it.offset);
      const bp = biquad('bandpass', it.fc[0], it.q); bp.frequency.setValueCurveAtTime(f32(it.fc), t0, dur);
      const a = gainNode(0); a.gain.setValueCurveAtTime(f32(it.gain), t0, dur);
      const p = ctx.createStereoPanner(); p.pan.setValueCurveAtTime(f32(it.pan), t0, dur);
      s.connect(bp); bp.connect(a); a.connect(p); p.connect(sbus);
    }
    if (!S.tension) return;                    // (MO-HUM off)
    // tension: two sines beating slowly + a soft octave, pitch creeping up with anxiety
    const tg = gainNode(0); tg.gain.setValueCurveAtTime(f32(S.tension.gain), t0, dur);
    const tl = biquad('lowpass', 900, 0.5); tl.connect(tg); tg.connect(sbus);
    for (const [mult, det, type, lvl] of [[1, 0, 'sine', 0.6], [1, 9, 'sine', 0.5], [2, 4, 'triangle', 0.55]]) {
      const o = ctx.createOscillator(); o.type = type; o.detune.value = det;
      o.frequency.setValueCurveAtTime(f32(S.tension.freq.map((f) => f * mult)), t0, dur);
      const lg = gainNode(lvl); o.connect(lg); lg.connect(tl); o.start(t0); o.stop(t0 + dur + 0.05);
    }
  }

  // warm transformation pad: sines + triangles, slightly detuned, slow shared vibrato
  function pad(P) {
    const t0 = T(P.t0), dur = (P.env.length - 1) * P.dt, end = t0 + dur + 0.05;
    const amp = gainNode(0); amp.gain.setValueCurveAtTime(f32(P.env.map((v) => v * P.peak)), t0, dur);
    const lp = biquad('lowpass', P.lp[0], 0.6); lp.frequency.setValueCurveAtTime(f32(P.lp), t0, dur);
    const hp = biquad('highpass', P.hp || 20, 0.707);   // 12 dB/oct: no low-end build-up under the calm
    lp.connect(hp); hp.connect(amp);
    const L = strip(-0.3, 0.35), R = strip(0.3, 0.35);
    amp.connect(L); amp.connect(R);
    const vib = ctx.createOscillator(); vib.frequency.value = 0.23;
    const vd = gainNode(4); vib.connect(vd); vib.start(t0); vib.stop(end);
    const norm = 1 / Math.sqrt(P.notes.length * 2);
    for (const [f, lvl] of P.notes) {
      for (const [type, det, k] of [['sine', -4, 1], ['triangle', 5, 0.45]]) {
        const o = ctx.createOscillator(); o.type = type; o.frequency.value = f; o.detune.value = det;
        vd.connect(o.detune);
        const og = gainNode(lvl * k * norm); o.connect(og); og.connect(lp);
        o.start(t0); o.stop(end);
      }
    }
  }

  // ---------------- schedule everything that uses explicit times ----------------
  for (const e of plan.synth) INST[e.inst](e);
  for (const k of plan.ticks) tick(k);
  for (const c of plan.crickets) cricket(c);
  if (plan.swirl) swirl(plan.swirl);
  if (plan.pad) pad(plan.pad);

  // ambience bed (engine): started inside the pre-roll, mood automated from the curves
  const B = plan.bed;
  now = 0;
  const bed = E.startBed(B.realm, B.mood[0].m, B.fadeIn);
  if (B.mute) bed.out.disconnect();
  for (const { t, m } of B.mood) if (T(t) > 0.02) bed.bed.apply(m, T(t), 0.12);
  for (const [a, b] of B.tickWindows) {
    g.voices.clear();
    const mm = B.mood.reduce((best, x) => (Math.abs(x.t - (a + b) / 2) < Math.abs(best.t - (a + b) / 2) ? x : best)).m;
    E.tickBed(bed, T(a), T(b), mm);
  }
  g.voices.clear();
  if (B.circular) {
    // circular (R7): the bed's level × its loop window, one sampled curve over [0, D + xfade]
    // (silent before 0 and after): its continuation past D crossfades into its own start
    const p = bed.out.gain;
    p.cancelScheduledValues(0); p.setValueAtTime(0, 0);
    const X = B.circular.xfade, XF = check.bedXfade;
    const clampRho = (r) => Math.max(-0.95, Math.min(1, r));
    // block statistics at loop time u (linear between block centres, held at the ends)
    const at = (arr, u) => {
      const c = XF.at;
      if (u <= c[0]) return arr[0];
      for (let i = 1; i < c.length; i++) if (u <= c[i]) return arr[i - 1] + (arr[i] - arr[i - 1]) * (u - c[i - 1]) / (c[i] - c[i - 1]);
      return arr[arr.length - 1];
    };
    // the normaliser g for weight a at loop time u: the mix's power = a·P1 + (1 − a)·P2
    const norm = (a, u) => {
      if (!XF) { const rho = clampRho(check.bedRho); return Math.sqrt(a * a + (1 - a) * (1 - a) + 2 * rho * a * (1 - a)); }
      const rho = clampRho(at(XF.rho, u)), p1 = at(XF.p1, u), p2 = at(XF.p2, u), target = a * p1 + (1 - a) * p2;
      if (!(target > 0)) return 1;
      return Math.sqrt((a * a * p1 + (1 - a) * (1 - a) * p2 + 2 * rho * a * (1 - a) * Math.sqrt(p1 * p2)) / target);
    };
    const lv = B.level;
    const level = (t) => {
      if (t <= lv[0][0]) return lv[0][1];
      for (let i = 1; i < lv.length; i++) if (t <= lv[i][0]) return lv[i - 1][1] + (lv[i][1] - lv[i - 1][1]) * (t - lv[i - 1][0]) / (lv[i][0] - lv[i - 1][0]);
      return lv[lv.length - 1][1];
    };
    const win = (t) => {                       // the crossfade weights at loop time u ∈ [0, X)
      if (check.probe) return t < DUR + X ? 1 : 0;   // probe: the bed and its continuation, unwindowed
      const inStart = t < X, inTail = t >= DUR && t < DUR + X;
      if (!inStart && !inTail) return t < DUR ? 1 : 0;
      const u = (inStart ? t : t - DUR) / X, a = (1 - Math.cos(Math.PI * u)) / 2;
      return (inStart ? a : 1 - a) / norm(a, u * X);
    };
    const step = 0.001, n = Math.round((DUR + X + 0.05) / step) + 1;
    const curve = new Float32Array(n);
    for (let i = 0; i < n; i++) { const t = i * step; curve[i] = level(t < DUR ? t : t - DUR) * win(t); }
    p.setValueCurveAtTime(curve, T(0), (n - 1) * step);
  } else {
    const p = bed.out.gain; // after startBed's own fade-in
    let last = B.fadeIn + LAT;
    for (const [t, v] of B.level) { const tt = Math.max(T(t), last + 0.01); p.linearRampToValueAtTime(v, tt); last = tt; }
  }

  // engine one-shots: suspend the render at each cue so the engine's "now" is real
  const Q = 128 / SR;
  const groups = new Map();
  for (const c of plan.engine) {
    const nowAt = T(c.t) - 0.012;                     // Voice.t = currentTime + 12 ms = T(c.t)
    const ts = Math.floor(nowAt / Q) * Q;
    const key = Math.round(ts / Q);
    if (!groups.has(key)) groups.set(key, { ts, list: [] });
    groups.get(key).list.push({ ...c, nowAt });
  }
  const placed = [];
  for (const { ts, list } of [...groups.values()].sort((a, b) => a.ts - b.ts)) {
    ctx.suspend(ts).then(() => {
      for (const c of list) {
        now = c.nowAt;
        g.voices.clear();
        if (c.kind === 'mallow') E.buildMallow(c.kit || kitId, c.name, c.opts); else E.buildFx(c.name, c.opts);
        for (const v of g.voices) {
          v.out.gain.value = c.trim;
          if (c.cut) { v.out.gain.setValueAtTime(c.trim, T(c.cut.at)); v.out.gain.linearRampToValueAtTime(0, T(c.cut.at + c.cut.fade)); }
          placed.push({ t: c.t, name: `${c.kind}:${c.name}`, voiceT: +(v.t - PRE).toFixed(4) });
        }
        g.voices.clear();                              // no voice stealing offline
      }
      ctx.resume();
    });
  }

  const buf = await ctx.startRendering();
  // the scene from frame 0, plus the circular tail past D (wrap-added in Node)
  const off = Math.round(PRE * SR), n = Math.round((DUR + TAIL) * SR);
  const l = buf.getChannelData(0), r = buf.getChannelData(1);
  const il = new Float32Array(n * 2);
  for (let i = 0; i < n; i++) { il[2 * i] = l[off + i]; il[2 * i + 1] = r[off + i]; }
  const u8 = new Uint8Array(il.buffer); let bin = '';
  for (let i = 0; i < u8.length; i += 0x8000) bin += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
  return { b64: btoa(bin), placed };
}

// ------------------------------------------------------- page session --

/** A headless Chromium + static server for rendering plans; close() when done. */
export async function openRenderer() {
  const server = await startServer(0);
  const browser = await chromium.launch();
  const url = `http://127.0.0.1:${server.address().port}/__score__.html`;
  /** a fresh page: Math.random seeded and the determinism patches installed before any page code runs */
  async function freshPage() {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    // seed Math.random BEFORE any page code (the engine's noise, reverb and micro-detune use it)
    await page.addInitScript((seed) => {
      let s = seed >>> 0;
      Math.random = () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    }, PAGE_SEED);
    await page.addInitScript(offlineDeterminism);
    // a blank same-origin page (the server root serves the repo; the engine is fetched from it)
    await page.route('**/__score__.html', (route) => route.fulfill({ contentType: 'text/html', body: '<!doctype html><meta charset="utf-8"><title>score</title>' }));
    await page.goto(url);
    return { page, errors };
  }
  /** render one plan in a fresh page (fresh seeded Math.random) → interleaved Float32Array of D (+ tail) s */
  async function render(plan, check = {}) {
    const { page, errors } = await freshPage();
    try {
      const res = await page.evaluate(renderInPage, { plan, check: { kit: null, bedRho: 1, bedXfade: null, probe: false, ...check } });
      if (errors.length) throw new Error(`page error: ${errors[0]}`);
      const raw = Buffer.from(res.b64, 'base64');
      const x = new Float32Array(raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength));
      const frames = x.length / 2, want = Math.round((plan.DUR + (plan.circular?.tail || 0)) * SR);
      if (frames !== want) throw new Error(`rendered ${frames} frames, expected ${want}`);
      for (let i = 0; i < x.length; i += 97) if (!Number.isFinite(x[i])) throw new Error('non-finite sample in render');
      // every engine voice must have started exactly at (cue - LAT): the suspend/clock trick worked
      const drift = Math.max(0, ...res.placed.map((p) => Math.abs(p.voiceT - (p.t - plan.LAT))));
      if (!check.probe && (res.placed.length !== plan.engine.length || drift > 1e-4)) throw new Error(`engine voices misplaced (${res.placed.length}/${plan.engine.length}, drift ${drift})`);
      return { x, placed: res.placed };
    } finally {
      await page.close();
    }
  }
  return { render, freshPage, close: async () => { await browser.close(); server.close(); } };
}

// ----------------------------------------------------------- kit probe --
// Runs inside headless Chromium: every Mallow kit plays every app gesture through
// buildMallow(id) and every realm bed plays through startBed/tickBed, each in its own
// short offline render; → the engine's kit table and per-sound RMS (dBFS).

async function probeInPage({ engineUrl, kits, realms, gestureSec, bedSec }) {
  const src = await (await fetch(engineUrl)).text();
  const patched = `${src}\nexport const __hm = { buildGraph, buildMallow, startBed, tickBed, setG: (g) => { G = g; }, AMB_LEVEL, KITS, REALM_BEDS, GESTURES, MALLOW_SOUNDS, MALLOW_IDS, REALMS };\n`;
  const E = (await import(URL.createObjectURL(new Blob([patched], { type: 'text/javascript' })))).__hm;
  const SR = 48000;
  const rmsDb = (buf) => {
    let s = 0, n = 0, finite = true;
    for (let c = 0; c < buf.numberOfChannels; c++) { const d = buf.getChannelData(c); for (let i = 0; i < d.length; i++) { if (!Number.isFinite(d[i])) finite = false; s += d[i] * d[i]; n++; } }
    return { db: 10 * Math.log10(s / n || 1e-30), finite };
  };
  async function offline(sec, fn) {
    const ctx = new OfflineAudioContext({ numberOfChannels: 2, length: Math.round(sec * SR), sampleRate: SR });
    const g = E.buildGraph(ctx, false);
    g.master.gain.value = 0.6; g.ambBus.gain.value = E.AMB_LEVEL;
    let now = 0.05;
    g.ctx = new Proxy(ctx, { get(t, p) { if (p === 'currentTime') return now; const v = Reflect.get(t, p, t); return typeof v === 'function' ? v.bind(t) : v; } });
    E.setG(g);
    fn(g, (t) => { now = t; });
    return rmsDb(await ctx.startRendering());
  }
  const out = { mallowIds: E.MALLOW_IDS, realms: E.REALMS, sounds: E.MALLOW_SOUNDS, kits: {}, beds: {} };
  for (const id of kits) {
    const k = E.KITS[id];
    if (!k) { out.kits[id] = { missing: true }; continue; }
    const gestures = {};
    for (const name of E.MALLOW_SOUNDS) {
      gestures[name] = await offline(gestureSec, (g) => { E.buildMallow(id, name, { intensity: 0.6 }); g.voices.clear(); });
    }
    out.kits[id] = { root: k.root, scale: [...k.scale], speed: k.speed, gestures };
  }
  for (const realm of realms) {
    if (!E.REALM_BEDS[realm]) { out.beds[realm] = { missing: true }; continue; }
    out.beds[realm] = await offline(bedSec, (g, at) => {
      at(0);
      const mood = { agitation: 0.4, heaviness: 0.3, clarity: 0.6, warmth: 0.5 };
      const L = E.startBed(realm, mood, 0.3);
      E.tickBed(L, 0.3, bedSec - 0.5, mood);
      g.voices.clear();
    });
  }
  return out;
}

/**
 * Every kit's 14 gestures through buildMallow(id) and every realm bed, rendered offline:
 * → { mallowIds, realms, sounds, kits: {id: {root, scale, speed, gestures: {name: {db, finite}}}}, beds: {realm: {db, finite}} }
 */
export async function probeKits({ kits, realms, engineUrl = '/hushmallow/src/engine/audio.js', gestureSec = 2.5, bedSec = 4 } = {}) {
  const s = await openRenderer();
  try {
    const { page, errors } = await s.freshPage();
    try {
      const r = await page.evaluate(probeInPage, { engineUrl, kits, realms, gestureSec, bedSec });
      if (errors.length) throw new Error(`page error: ${errors[0]}`);
      return r;
    } finally { await page.close(); }
  } finally { await s.close(); }
}

// ------------------------------------------------------------- circular --

/** Correlation of the bed's start [0, X) with its continuation [D, D + X) in a probe render (both channels). */
export function bedCorrelation(x, D, X) {
  const n = Math.round(D * SR), m = Math.round(X * SR);
  let ab = 0, aa = 0, bb = 0;
  for (let i = 0; i < 2 * m; i++) { const a = x[i], b = x[2 * n + i]; ab += a * b; aa += a * a; bb += b * b; }
  return aa > 0 && bb > 0 ? ab / Math.sqrt(aa * bb) : 0;
}

/**
 * The bed's crossfade statistics, block by block (`block` s, half overlapping) over
 * [0, X): the power of its start P1, of its continuation past D P2, and their
 * correlation ρ, at the block centres `at` (s); plus the correlation over the whole
 * crossfade (`rho`, reported).
 */
export function bedCrossfadeStats(x, D, X, block = 0.02) {
  const n = Math.round(D * SR), m = Math.round(X * SR), b = Math.round(block * SR), hop = Math.round(b / 2);
  const out = { block, at: [], rho: [], p1: [], p2: [], global: bedCorrelation(x, D, X) };
  for (let s = 0; s + b <= m; s += hop) {
    let ab = 0, aa = 0, bb = 0;
    for (let i = 2 * s; i < 2 * (s + b); i++) { const a = x[i], c = x[2 * n + i]; ab += a * c; aa += a * a; bb += c * c; }
    out.at.push((s + b / 2) / SR);
    out.rho.push(aa > 0 && bb > 0 ? ab / Math.sqrt(aa * bb) : 0);
    out.p1.push(aa / (2 * b)); out.p2.push(bb / (2 * b));
  }
  return out;
}

/** Wrap-add a render of D + tail seconds into a D-second loop (interleaved stereo). */
export function wrapAdd(x, D) {
  const n = Math.round(D * SR), total = x.length / 2;
  const y = new Float32Array(2 * n);
  for (let i = 0; i < total; i++) { const j = 2 * (i % n); y[j] += x[2 * i]; y[j + 1] += x[2 * i + 1]; }
  return y;
}

/**
 * Render a plan to its D-second mix (interleaved Float32Array, not yet mastered).
 * A circular plan takes two renders: a bed-only probe (its crossfade statistics; pass
 * bedStats from an earlier render of the same bed to skip it) and the score itself,
 * whose tail is wrap-added onto the start. xfade 'global'
 * normalises the bed's crossfade with the one correlation over the whole second
 * instead of the per-block statistics (kept for comparison: tests/parity).
 */
export async function renderMix(plan, { kit = null, session = null, log = () => {}, xfade = 'local', bedStats = null } = {}) {
  const own = !session;
  const s = session || await openRenderer();
  try {
    if (!plan.circular) {
      const { x, placed } = await s.render(plan, { kit });
      return { x, placed, rho: null };
    }
    // (bedStats: the probe's statistics from an earlier render of the same bed, reused)
    let xf = bedStats;
    if (!xf) {
      const probe = { ...plan, engine: [], synth: [], ticks: [], crickets: [], swirl: null, pad: null };
      const pr = await s.render(probe, { kit, probe: true });
      xf = bedCrossfadeStats(pr.x, plan.DUR, plan.bed.circular.xfade);
    }
    const rho = xf.global;
    log(`bed crossfade: correlation ${rho.toFixed(3)} between the bed's start and its continuation past D (20 ms blocks: ${Math.min(...xf.rho).toFixed(2)} to ${Math.max(...xf.rho).toFixed(2)})`);
    const { x, placed } = await s.render(plan, { kit, bedXfade: xfade === 'global' ? null : xf, bedRho: rho });
    return { x: wrapAdd(x, plan.DUR), placed, rho, xfade: xf };
  } finally {
    if (own) await s.close();
  }
}

// ------------------------------------------------------------ mastering --

function ffmpeg(args, opts = {}) {
  const p = spawnSync('ffmpeg', ['-hide_banner', '-nostats', ...args], { encoding: 'utf8', maxBuffer: 64 << 20, ...opts });
  if (p.status !== 0) throw new Error(`ffmpeg failed (${p.status}): ${p.stderr.slice(-2000)}`);
  return p.stderr;
}

/** EBU R128 via ffmpeg's ebur128 (integrated loudness, LRA, true peak) of an f32le stereo file. */
export function measure(f32File) {
  const err = ffmpeg(['-f', 'f32le', '-ar', String(SR), '-ac', '2', '-i', f32File, '-af', 'ebur128=peak=true:framelog=quiet', '-f', 'null', '-']);
  const s = err.slice(err.lastIndexOf('Summary:'));
  const num = (re) => { const m = s.match(re); return m ? parseFloat(m[1]) : NaN; };
  return { I: num(/I:\s+(-?[\d.]+|-inf) LUFS/), LRA: num(/LRA:\s+(-?[\d.]+) LU/), TP: num(/Peak:\s+(-?[\d.]+|-inf) dBFS/) };
}

const TAPS = 16; // ±16 samples windowed sinc
const ISP_FILTERS = [1, 2, 3].map((p) => {
  const h = []; let sum = 0;
  for (let k = -TAPS + 1; k <= TAPS; k++) {
    const u = k - p / 4;
    const w = 0.5 + 0.5 * Math.cos(Math.PI * u / TAPS);
    const v = (u === 0 ? 1 : Math.sin(Math.PI * u) / (Math.PI * u)) * w;
    h.push(v); sum += v;
  }
  return h.map((v) => v / sum);
});

// 4x oversampled peak estimate per frame (max over both channels and the 3 inter-sample points).
// circular: the filter taps wrap around the loop (a looping file has no edges).
function interSamplePeaks(x, circular) {
  const n = x.length / 2;
  const pk = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let m = Math.max(Math.abs(x[2 * i]), Math.abs(x[2 * i + 1]));
    if (m > 0.25) { // only bother with the expensive part near the top
      for (let c = 0; c < 2; c++) {
        for (const h of ISP_FILTERS) {
          let acc = 0;
          for (let k = -TAPS + 1, j = 0; k <= TAPS; k++, j++) {
            let ii = i + k;
            if (circular) ii = ((ii % n) + n) % n; else if (ii < 0 || ii >= n) continue;
            acc += h[j] * x[2 * ii + c];
          }
          m = Math.max(m, Math.abs(acc));
        }
      }
    }
    pk[i] = m;
  }
  return pk;
}

// Look-ahead peak limiter (offline: zero latency), v2's (audio/soundtrack.mjs limit()):
// gain ≤ ceiling/peak everywhere, smooth attack, exponential release.
function limitLinear(x, gainDb, ceilingDb, { lookahead = 0.003, release = 0.09 } = {}) {
  const n = x.length / 2, g0 = 10 ** (gainDb / 20), ceil = 10 ** (ceilingDb / 20);
  const y = new Float32Array(x.length);
  for (let i = 0; i < x.length; i++) y[i] = x[i] * g0;
  const pk = interSamplePeaks(y, false);
  const L = Math.round(lookahead * SR);
  const g1 = new Float32Array(n).fill(1);
  for (let i = 0; i < n; i++) {
    if (pk[i] > ceil) { const r = ceil / pk[i]; for (let j = Math.max(0, i - L); j <= i; j++) if (g1[j] > r) g1[j] = r; }
  }
  const g2 = new Float32Array(n); let acc = 0; // moving average over L+1 (attack ramp)
  for (let i = 0; i < n; i++) { acc += g1[i]; if (i > L) acc -= g1[i - L - 1]; g2[i] = acc / Math.min(i + 1, L + 1); }
  // g2[k] ≤ ceil/peak[k] holds by construction (every value averaged into it is ≤ that)
  const rel = 1 - Math.exp(-1 / (release * SR));
  let gPrev = 1, reduced = 0;
  for (let i = 0; i < n; i++) {
    let gi = g2[i];
    gi = gi < gPrev ? gi : gPrev + (gi - gPrev) * rel;
    gPrev = gi;
    if (gi < 0.999) reduced++;
    y[2 * i] *= gi; y[2 * i + 1] *= gi;
  }
  return { y, reducedMs: (reduced / SR) * 1000 };
}

// The same limiter on a loop: look-ahead, attack average and release all wrap around
// the seam, so the gain at frame 0 continues the gain at the last frame.
function limitCircular(x, gainDb, ceilingDb, { lookahead = 0.003, release = 0.09 } = {}) {
  const n = x.length / 2, g0 = 10 ** (gainDb / 20), ceil = 10 ** (ceilingDb / 20);
  const y = new Float32Array(x.length);
  for (let i = 0; i < x.length; i++) y[i] = x[i] * g0;
  const pk = interSamplePeaks(y, true);
  const L = Math.round(lookahead * SR);
  const g1 = new Float32Array(n).fill(1);
  for (let i = 0; i < n; i++) {
    if (pk[i] > ceil) { const r = ceil / pk[i]; for (let k = 0; k <= L; k++) { const j = (i - k + n) % n; if (g1[j] > r) g1[j] = r; } }
  }
  const g2 = new Float32Array(n);
  let acc = 0;
  for (let k = 0; k <= L; k++) acc += g1[(n - k) % n];   // window ending at 0 (wrapped)
  for (let i = 0; i < n; i++) {
    if (i > 0) { acc += g1[i]; acc -= g1[(i - L - 1 + n) % n]; }
    g2[i] = acc / (L + 1);
  }
  const rel = 1 - Math.exp(-1 / (release * SR));
  // the release state at the seam: run the loop once to settle it, then apply
  let gPrev = 1;
  for (let i = 0; i < n; i++) { const gi = g2[i]; gPrev = gi < gPrev ? gi : gPrev + (gi - gPrev) * rel; }
  let reduced = 0;
  for (let i = 0; i < n; i++) {
    let gi = g2[i];
    gi = gi < gPrev ? gi : gPrev + (gi - gPrev) * rel;
    gPrev = gi;
    if (gi < 0.999) reduced++;
    y[2 * i] *= gi; y[2 * i + 1] *= gi;
  }
  return { y, reducedMs: (reduced / SR) * 1000 };
}

/** Write an interleaved stereo Float32Array as a 24-bit 48 kHz WAV (bit-exact, no metadata). */
export function writeWav24(y, outPath) {
  const tmp = mkWorkTemp('hm-wav-');
  try {
    const f32 = path.join(tmp, 'y.f32');
    fs.writeFileSync(f32, Buffer.from(y.buffer, y.byteOffset, y.byteLength));
    fs.mkdirSync(path.dirname(path.resolve(outPath)), { recursive: true });
    ffmpeg(['-y', '-f', 'f32le', '-ar', String(SR), '-ac', '2', '-i', f32, '-map_metadata', '-1', '-c:a', 'pcm_s24le', '-fflags', '+bitexact', '-flags:a', '+bitexact', outPath]);
    return outPath;
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

/**
 * Master a mix to −16 LUFS integrated, ≤ −1.5 dBTP, and write a 24-bit WAV:
 * measure → gain + look-ahead true-peak limiter → re-measure, until on target (v2's loop).
 * → { I, TP, LRA, gainDb, limiterMs, raw: {I, TP, LRA} }
 */
export function masterToWav(x, outPath, { circular = false, log = () => {} } = {}) {
  const tmp = mkWorkTemp('hm-score-');
  const tmpF32 = path.join(tmp, 'mix.f32');
  const limit = circular ? limitCircular : limitLinear;
  try {
    fs.writeFileSync(tmpF32, Buffer.from(x.buffer, x.byteOffset, x.byteLength));
    const m0 = measure(tmpF32);
    log(`raw mix: ${m0.I} LUFS, ${m0.TP} dBTP, LRA ${m0.LRA} LU`);
    let gain = TARGET_LUFS - m0.I, m = null, lim = null;
    for (let iter = 0; iter < 6; iter++) {
      lim = limit(x, gain, CEILING_DBTP);
      fs.writeFileSync(tmpF32, Buffer.from(lim.y.buffer));
      m = measure(tmpF32);
      log(`  gain ${gain.toFixed(2)} dB → ${m.I} LUFS, ${m.TP} dBTP (limiter active ${lim.reducedMs.toFixed(0)} ms)`);
      if (Math.abs(m.I - TARGET_LUFS) <= 0.1 && m.TP <= MAX_TP) break;
      gain += TARGET_LUFS - m.I;
    }
    if (Math.abs(m.I - TARGET_LUFS) > 0.5) log(`warning: loudness ${m.I} LUFS is off target`);
    if (m.TP > MAX_TP) throw new Error(`true peak ${m.TP} dBTP above ${MAX_TP}`);
    writeWav24(lim.y, outPath);
    return { I: m.I, TP: m.TP, LRA: m.LRA, gainDb: +gain.toFixed(4), limiterMs: +lim.reducedMs.toFixed(1), raw: m0, mastered: lim.y };
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

export { renderInPage, limitLinear, limitCircular, interSamplePeaks };
