// The score in Chromium (WP-04): --compat v2-score renders the approved
// soundtrack byte for byte through the forked renderer; the default (every
// documented fix) passes every score-side G-AUDIO check and the project's own
// gate (qa/gates/audio.py, unmodified) on the delivered MP4 audio, the raw seam
// step and the hit timing included, and is deterministic; every Mallow kit and
// realm bed builds in the engine; the kit voice models are the engine's own
// oscillators and the accents sound where the models say; T01 voiced by each of
// the 7 Mallows passes the same way; the bed crossfades hold their level; hm
// remux re-scores a picture with loop-aware AAC.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { withHeavyLock } from '../../render/lib/heavy-lock.mjs';
import { studioPath, mkWorkTemp } from '../../render/lib/paths.mjs';
import { resolveInputs, scoreToWav, remux } from '../../audio/score-cli.mjs';
import { probeKits, openRenderer, bedCrossfadeStats, wrapAdd } from '../../audio/render-offline.mjs';
import { soundmap, buildScore, mallowSound, kitGestureEvents, LAT, ENGINE_URL } from '../../audio/score.mjs';
import { decodeWav, seamMetrics, clickPass, leadOf, LIMITS } from '../../audio/check.mjs';
import { decodeAudio, lagSamples, muxLoop, SEAM_STEP_TARGET } from '../../audio/loop-aac.mjs';
import { SPLICE } from '../../audio/splice.mjs';

const sha = (f) => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const APPROVED = studioPath('output', 'v2', 'my-brain-at-2am-v2.soundtrack.wav');
const CUES = studioPath('output', 'v2', 'cues.json');
const heavy = (label, fn) => withHeavyLock({ mode: 'shared', label: `test audio ${label}` }, fn);
const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const SR = 48000;
const cents = (a, b) => 1200 * Math.log2(b / a);
const MALLOWS = ['glitzi', 'blubi', 'zuzu', 'boppo', 'pipzi', 'loomi', 'noomi'];
/** T01 re-voiced as Mallow `id` in its home realm */
const voiced = (id) => {
  const d = readJson(studioPath('specs', 'golden', 't01-v2.direction.json')), sm = soundmap();
  return id === 'noomi' ? d : { ...d, mallow: { ...d.mallow, id }, realm: { ...d.realm, id: sm.mallows[id].bed, tod: 'default' } };
};

/** The project's own G-AUDIO gate, unmodified, on a score as the farm and hm remux deliver it (loop-aware AAC in an MP4). → { checks: {name: status} } */
function gateOnDelivered(dir, name, r, wav) {
  const mp4 = path.join(dir, `${name}.mp4`), job = path.join(dir, `${name}.job.json`), out = path.join(dir, `${name}.out.json`);
  muxLoop({ video: null, wav, out: mp4, duration: r.plan.DUR });
  const plan = { ...r.plan, report: { tonal: r.report.tonal } };
  fs.writeFileSync(job, JSON.stringify({ video: mp4, duration: r.plan.DUR, fps: 30, cues: readJson(CUES).cues, plan, turn: null, score: 'hm-score', artefacts: null }));
  const p = spawnSync('python3', ['-I', studioPath('qa', 'gates', 'audio.py'), job, out], { encoding: 'utf8' });
  assert.equal(p.status, 0, p.stderr);
  const g = readJson(out);
  return { checks: Object.fromEntries(Object.entries(g.checks).map(([k, c]) => [k, c.status])), metrics: g.metrics };
}

test('--compat v2-score through the forked renderer is the approved soundtrack, byte for byte', { timeout: 300_000 }, async () => {
  const dir = mkWorkTemp('audio-compat-');
  try {
    const out = path.join(dir, 'compat.wav');
    const r = await heavy('compat', () => scoreToWav(resolveInputs(CUES), { compat: 'v2-score' }, out));
    assert.equal(sha(out), sha(APPROVED));
    assert.equal(r.master.I, -16);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('the default score (every fix): G-AUDIO on the score side and the project\'s gate on the delivered MP4, every check; deterministic', { timeout: 300_000 }, async () => {
  const dir = mkWorkTemp('audio-default-');
  try {
    const a = path.join(dir, 'a.wav'), b = path.join(dir, 'b.wav');
    const r = await heavy('default', () => scoreToWav(resolveInputs(CUES), {}, a, { check: true }));
    assert.deepEqual(r.check.gAudio.failing, [], JSON.stringify(Object.fromEntries(r.check.gAudio.failing.map((k) => [k, r.check.gAudio.checks[k].value]))));
    // the seam: spliced within 1 ms where the waveform is flat, verified as delivered
    assert.ok(Math.abs(r.report.splice.samples) <= SPLICE.maxShift && r.report.splice.pass);
    assert.ok(r.check.delivered.wrapStepDbfs <= SEAM_STEP_TARGET, `the gate's raw wrap step as delivered: ${r.check.delivered.wrapStepDbfs} dBFS`);
    assert.ok(r.check.seam.clickDbfs < -90 && r.check.delivered.clickDbfs < -60, `click: WAV ${r.check.seam.clickDbfs}, delivered ${r.check.delivered.clickDbfs} dBFS (v2: -31.4)`);
    assert.ok(r.check.plainMux.clickDbfs > -40, `the plain mux would click where the MP4 loops: ${r.check.plainMux.clickDbfs} dBFS`);
    // Noomi's hits are on their cues as v2's were: no hit sync move
    assert.equal(r.report.hits.rounds.length, 1);
    assert.deepEqual(r.report.sync, { advance: {}, soften: {}, clearTicks: {} });
    assert.ok(r.report.bedRho > 0.95, 'D = 15 s loops the engine\'s 3 s and 5 s noise buffers: the bed is self-similar');
    const gate = gateOnDelivered(dir, 'default', r, a);
    assert.deepEqual(Object.entries(gate.checks).filter(([, v]) => v !== 'pass'), [], JSON.stringify(gate.checks));
    await heavy('default again', () => scoreToWav(resolveInputs(CUES), {}, b));
    assert.equal(sha(a), sha(b));
    assert.notEqual(sha(a), sha(APPROVED));
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('buildMallow(id) and the realm bed build for all 7 ids; the engine\'s kits are the sound map\'s', { timeout: 300_000 }, async () => {
  const sm = soundmap();
  const kits = Object.keys(sm.kits), realms = Object.keys(sm.realms);
  assert.equal(kits.length, 7);
  assert.equal(realms.length, 7);
  const r = await heavy('kits', () => probeKits({ kits, realms }));
  assert.deepEqual([...r.mallowIds].sort(), [...kits].sort(), 'the engine\'s MALLOW_IDS');
  assert.deepEqual([...r.realms].sort(), [...realms].sort(), 'the engine\'s REALMS');
  for (const id of kits) {
    const k = r.kits[id];
    assert.deepEqual({ root: k.root, scale: k.scale, speed: k.speed }, { root: sm.kits[id].root, scale: sm.kits[id].scale, speed: sm.kits[id].speed }, id);
    assert.equal(Object.keys(k.gestures).length, 14);
    for (const [name, g] of Object.entries(k.gestures)) assert.ok(g.finite && g.db > -80, `${id} ${name}: ${g.db.toFixed(1)} dBFS`);
  }
  for (const realm of realms) assert.ok(r.beds[realm].finite && r.beds[realm].db > -70, `${realm}: ${r.beds[realm].db}`);
});

// ------------------------------------------------------------ kit voices --
// Runs in the page: every oscillator the engine starts for buildMallow(kit, 'success')
// with its frequency automation and whether it only feeds an AudioParam (an FM
// modulator or a vibrato LFO), and the gesture rendered (mono), with and without
// the score's planned damping; or (accent jobs) the kit's accent alone, as the
// success gesture calls it (dry).
async function traceInPage({ engineUrl, jobs, lat }) {
  const src = await (await fetch(engineUrl)).text();
  const E = (await import(URL.createObjectURL(new Blob([`${src}\nexport const __hm = { buildGraph, buildMallow, setG: (g) => { G = g; }, KITS, Voice };\n`], { type: 'text/javascript' })))).__hm;
  const SR = 48000, P = AudioParam.prototype;
  let recs = null;
  const byParam = new Map(), byNode = new Map(), edges = new Map();
  const mk = BaseAudioContext.prototype.createOscillator;
  BaseAudioContext.prototype.createOscillator = function () { const o = mk.call(this); if (recs) { const r = { node: o, start: null, ev: [] }; recs.push(r); byParam.set(o.frequency, r); byNode.set(o, r); } return o; };
  for (const m of ['setValueAtTime', 'linearRampToValueAtTime', 'exponentialRampToValueAtTime']) {
    const f = P[m];
    P[m] = function (v, t) { const r = byParam.get(this); if (r) r.ev.push([m, v, t]); return f.call(this, v, t); };
  }
  const vd = Object.getOwnPropertyDescriptor(P, 'value');
  Object.defineProperty(P, 'value', { configurable: true, get() { return vd.get.call(this); }, set(v) { const r = byParam.get(this); if (r) r.ev.push(['value', v, null]); vd.set.call(this, v); } });
  const conn = AudioNode.prototype.connect;
  AudioNode.prototype.connect = function (d, ...rest) { if (!edges.has(this)) edges.set(this, []); edges.get(this).push(d); return conn.call(this, d, ...rest); };
  const st = OscillatorNode.prototype.start;
  OscillatorNode.prototype.start = function (t = 0) { const r = byNode.get(this); if (r) r.start = t; return st.call(this, t); };
  const feedsParam = (n, seen = new Set()) => { if (seen.has(n)) return true; seen.add(n); const o = edges.get(n) || []; return o.length > 0 && o.every((d) => d instanceof AudioParam || feedsParam(d, seen)); };
  const out = [];
  for (const { kit, cut, accent } of jobs) {
    recs = []; byParam.clear(); byNode.clear(); edges.clear();
    const ctx = new OfflineAudioContext({ numberOfChannels: 2, length: Math.round(1.6 * SR), sampleRate: SR });
    const g = E.buildGraph(ctx, false); g.master.gain.value = 0.6;
    const now = 0.05;
    g.ctx = new Proxy(ctx, { get(t, p) { if (p === 'currentTime') return now; const v = Reflect.get(t, p, t); return typeof v === 'function' ? v.bind(t) : v; } });
    E.setG(g);
    const t0 = now + 0.012;
    // the accent dry (no reverb send): a fast-decaying glide's own reverb would carry its earlier, higher pitches past its landing
    if (accent) { const k = E.KITS[kit], v = new E.Voice({ send: 0 }); k.accent(v, v.t, accent.amp, accent.f); v.finish(); }
    else E.buildMallow(kit, 'success', { intensity: 0.5 });
    for (const v of g.voices) {
      v.out.gain.value = 0.28;
      if (cut) { v.out.gain.setValueAtTime(0.28, t0 + cut.at); v.out.gain.linearRampToValueAtTime(0, t0 + cut.at + cut.fade); }
    }
    g.voices.clear();
    const oscs = recs.filter((r) => r.start !== null && r.start >= t0 - 1e-6).map((r) => {
      const ramps = r.ev.filter((e) => e[0] === 'linearRampToValueAtTime' || e[0] === 'exponentialRampToValueAtTime');
      return { t: r.start - t0, f0: r.ev[0][1], f1: r.ev[r.ev.length - 1][1], glide: ramps.length ? ramps[ramps.length - 1][2] - r.start : 0, modulator: feedsParam(r.node) };
    });
    const buf = await ctx.startRendering();
    // the master chain's look-ahead delays what comes out by LAT (12 ms, audio/score.mjs): sample 0 of `mono` is the voice's t
    const l = buf.getChannelData(0), rr = buf.getChannelData(1), off = Math.round((t0 + lat) * SR), mono = new Float32Array(buf.length - off);
    for (let i = 0; i < mono.length; i++) mono[i] = (l[off + i] + rr[off + i]) / 2;
    const u8 = new Uint8Array(mono.buffer); let bin = '';
    for (let i = 0; i < u8.length; i += 0x8000) bin += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
    out.push({ kit, cut: !!cut, accent: !!accent, oscs, mono: btoa(bin) });
  }
  return out;
}

/** The strongest frequency within ±semis of `hz` in a Hann window of n samples centred at t (s), and its level against the frame's strongest 100–8000 Hz. */
function peakNear(x, t, hz, { semis = 1.5, n = 1024 } = {}) {
  const c = Math.round(t * SR), w = new Float64Array(n);
  for (let i = 0; i < n; i++) { const j = c - n / 2 + i; w[i] = (j >= 0 && j < x.length ? x[j] : 0) * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (n - 1))); }
  const mag = (f) => { let re = 0, im = 0; const k = (2 * Math.PI * f) / SR; for (let i = 0; i < n; i++) { re += w[i] * Math.cos(k * i); im -= w[i] * Math.sin(k * i); } return Math.hypot(re, im); };
  let best = 0, bestF = hz;
  for (let s = -semis; s <= semis; s += 0.02) { const f = hz * Math.pow(2, s / 12), m = mag(f); if (m > best) { best = m; bestF = f; } }
  let top = 0;
  for (let s = 0; s <= 1; s += 1 / 400) top = Math.max(top, mag(100 * Math.pow(80, s)));
  return { hz: bestF, rel: 20 * Math.log10(best / top), db: 20 * Math.log10(best / (n / 4) + 1e-12) };
}

test('kit voice models are the engine\'s oscillators; each accent sounds where its model says; the planned damping silences it', { timeout: 300_000 }, async () => {
  const sm = soundmap();
  const plans = Object.fromEntries(MALLOWS.map((id) => [id, buildScore({ log: readJson(CUES), direction: voiced(id) }).plan.engine.find((e) => e.name === 'success')]));
  const model = (kit) => kitGestureEvents(mallowSound(kit), { t: 0, kind: 'mallow', name: 'success', opts: { intensity: 0.5 } });
  // the accent alone, called as GESTURES.success calls it: amplitude A·0.5 (A = 0.45 + 0.55 × 0.5), pitch D(4)
  const D4 = (kit) => { const k = sm.kits[kit]; return k.root * Math.pow(2, (k.scale[4]) / 12); };
  const jobs = MALLOWS.flatMap((kit) => [
    { kit, cut: null },
    ...(plans[kit].cut ? [{ kit, cut: { at: plans[kit].cut.at - plans[kit].t, fade: plans[kit].cut.fade } }] : []),
    ...(model(kit).some((e) => e.part === 'accent') ? [{ kit, accent: { amp: 0.725 * 0.5, f: D4(kit) } }] : []),
  ]);
  const res = await heavy('kit voices', async () => {
    const s = await openRenderer();
    try {
      const { page, errors } = await s.freshPage();
      try {
        const r = await page.evaluate(traceInPage, { engineUrl: ENGINE_URL, jobs, lat: LAT });
        assert.deepEqual(errors, []);
        return r;
      } finally { await page.close(); }
    } finally { await s.close(); }
  });
  const decode = (b64) => { const raw = Buffer.from(b64, 'base64'); return new Float32Array(raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength)); };
  for (const kit of MALLOWS) {
    const full = res.find((r) => r.kit === kit && !r.cut && !r.accent);
    const m = model(kit);
    const audible = full.oscs.filter((o) => !o.modulator && o.f0 >= 20);
    // 1. every modelled component is an oscillator the engine starts (time, pitch within the engine's
    //    random detune, and the glide's exact shape)
    const used = new Set();
    for (const ev of m) for (const c of ev.comps) {
      const i = audible.findIndex((o, k) => !used.has(k) && Math.abs(o.t - ev.t) < 0.002 && Math.abs(cents(c.f0, o.f0)) < 100 && Math.abs((o.f1 / o.f0) / (c.f1 / c.f0) - 1) < 0.01 && Math.abs(o.glide - c.glide) < 0.002);
      assert.ok(i >= 0, `${kit}: no engine oscillator for the ${ev.part} at ${ev.t.toFixed(3)} s, ${c.f0.toFixed(1)} → ${c.f1.toFixed(1)} Hz`);
      used.add(i);
    }
    // 2. nothing glides that the model leaves out (static partials may be omitted, never a glide)
    const unmodelled = audible.filter((o, k) => !used.has(k) && Math.abs(o.f1 / o.f0 - 1) > 0.03);
    assert.deepEqual(unmodelled, [], `${kit}: gliding oscillators the model does not know`);
    // 3. in the sound of the accent alone (dry), each audible component follows the model's pitch path:
    //    heard at 60 % and 90 % of its glide (anything the path sweeps through in the analysis window,
    //    ± 50 cents plus any vibrato's depth; within 30 dB of the frame's strongest peak: an FM carrier sits under its sidebands),
    //    moving the model's way; a static one at its pitch
    const lone = res.find((r) => r.kit === kit && r.accent);
    const accents = m.filter((e) => e.part === 'accent');
    if (lone) {
      const x = decode(lone.mono), t0 = accents[0].t;
      const base = lone.oscs.filter((o) => !o.modulator && o.f0 >= 20);
      for (const ev of accents) for (const c of ev.comps.filter((cc) => cc.level >= 0.5)) {
        const o = base.find((a) => Math.abs(a.t - (ev.t - t0)) < 0.002 && Math.abs(cents(c.f0, a.f0)) < 100 && Math.abs((a.f1 / a.f0) / (c.f1 / c.f0) - 1) < 0.01);
        assert.ok(o, `${kit}: the lone accent plays the ${c.f0.toFixed(0)} → ${c.f1.toFixed(0)} Hz component`);
        // a slow glide gets a longer window (Zuzu's two voices are 150 Hz apart); a fast one a short one
        const n = c.glide >= 0.1 ? 2048 : 512, h = n / 2 / SR;
        const path = (x0) => o.f0 * Math.pow(o.f1 / o.f0, c.glide ? Math.min(1, Math.max(0, x0 / c.glide)) : 0);
        const heard = (frac) => {
          const tau = c.glide ? frac * c.glide : 0.03, p = peakNear(x, o.t + tau, path(tau), { n });
          const lo = Math.min(path(tau - h), path(tau + h)), hi = Math.max(path(tau - h), path(tau + h));
          const tol = 50 + (c.vib || 0);   // a vibrato swings the pitch by its depth
          assert.ok(cents(lo, p.hz) > -tol && cents(hi, p.hz) < tol && p.rel > -30, `${kit}: at ${(tau * 1000).toFixed(0)} ms the accent is at ${p.hz.toFixed(1)} Hz (${p.rel.toFixed(1)} dB), the model sweeps ${lo.toFixed(1)}–${hi.toFixed(1)}`);
          return p.hz;
        };
        if (!c.glide) { heard(0); continue; }
        const a = heard(0.6), b = heard(0.9);
        assert.equal(Math.sign(cents(a, b)), Math.sign(cents(c.f0, c.f1)), `${kit}: heard moving the model's way (${a.toFixed(1)} → ${b.toFixed(1)} Hz)`);
      }
    }
    // 4. where the score damps the voice, the accent is gone from the sound
    const damped = res.find((r) => r.kit === kit && r.cut);
    if (damped) {
      // the accent's band where nothing else plays: the component starting farthest from the phrase's last note,
      // 15 ms into the accent (the damped voice's notes still ring in the reverb, at their own pitches)
      const x = decode(full.mono), y = decode(damped.mono), acc = accents[0], last = leadOf(m.filter((e) => e.part === 'note').pop());
      const c = acc.comps.reduce((a, b) => (Math.abs(cents(last.f1, b.f0)) > Math.abs(cents(last.f1, a.f0)) ? b : a));
      const f = c.f0 * Math.pow(c.f1 / c.f0, c.glide ? Math.min(1, 0.015 / c.glide) : 0);
      const before = peakNear(x, acc.t + 0.015, f, { n: 512 }), after = peakNear(y, acc.t + 0.015, f, { n: 512 });
      assert.ok(after.db < before.db - 15, `${kit}: the accent's band (${f.toFixed(0)} Hz) ${after.db.toFixed(1)} dB damped vs ${before.db.toFixed(1)} undamped`);
    }
  }
});

test('T01 voiced by each of the 7 Mallows: every score-side G-AUDIO check, and the project\'s gate on the delivered MP4', { timeout: 1_500_000 }, async () => {
  const dir = mkWorkTemp('audio-voiced-');
  try {
    for (const id of MALLOWS) {
      const out = path.join(dir, `${id}.wav`);
      const r = await heavy(`voiced ${id}`, () => scoreToWav({ ...resolveInputs(CUES, {}), direction: voiced(id), spec: readJson(studioPath('specs', 'golden', 't01-v2.json')) }, {}, out, { check: true }));
      const g = r.check.gAudio;
      assert.deepEqual(g.failing, [], `${id}: ${JSON.stringify(Object.fromEntries(g.failing.map((k) => [k, g.checks[k].value])))}`);
      assert.equal(r.report.kit, id);
      const gate = await heavy(`gate ${id}`, async () => gateOnDelivered(dir, id, r, out));
      assert.deepEqual(Object.entries(gate.checks).filter(([, v]) => v !== 'pass'), [], `${id}: ${JSON.stringify(gate.checks)}`);
    }
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('the bed crossfade holds the expected level within 1 dB (50 ms windows) for every realm bed, anti-correlated ones included', { timeout: 600_000 }, async () => {
  const sm = soundmap(), log = readJson(CUES);
  const pow = (x, from, len) => { let s = 0; for (let i = from; i < from + len; i++) s += x[2 * i] ** 2 + x[2 * i + 1] ** 2; return s / (2 * len); };
  await heavy('bed crossfades', async () => {
    const s = await openRenderer();
    try {
      for (const id of MALLOWS) {
        const { plan } = buildScore({ log, direction: voiced(id) });
        const kit = { id: plan.kit, ...sm.kits[plan.kit] };
        const bed = { ...plan, engine: [], synth: [], ticks: [], crickets: [], swirl: null, pad: null };
        const pr = await s.render(bed, { kit, probe: true });
        const D = plan.DUR, X = plan.bed.circular.xfade, n = Math.round(D * SR), xf = bedCrossfadeStats(pr.x, D, X);
        const y = wrapAdd((await s.render(bed, { kit, bedXfade: xf, bedRho: xf.global })).x, D);
        const w = Math.round(0.05 * SR);
        for (let u = 0; u + w <= Math.round(X * SR); u += w) {
          const a = (1 - Math.cos(Math.PI * (u + w / 2) / (X * SR))) / 2;
          const e = 10 * Math.log10(pow(y, u, w) / (a * pow(pr.x, u, w) + (1 - a) * pow(pr.x, n + u, w)));
          assert.ok(Math.abs(e) < 1, `${id} (${plan.bed.realm}, rho ${xf.global.toFixed(2)}): ${e.toFixed(2)} dB at ${(u / SR).toFixed(2)} s`);
        }
      }
    } finally { await s.close(); }
  });
});

test('hm remux re-scores an existing picture: video copied, loop-aware audio in sync, score-plan written, in well under 60 s', { timeout: 300_000 }, async () => {
  const dir = mkWorkTemp('audio-remux-');
  try {
    fs.copyFileSync(CUES, path.join(dir, 'cues.json'));
    const v = spawnSync('ffmpeg', ['-v', 'error', '-f', 'lavfi', '-i', 'testsrc2=s=270x480:r=30:d=15', '-c:v', 'libx264', '-preset', 'ultrafast', '-pix_fmt', 'yuv420p', path.join(dir, 'video.mp4')]);
    assert.equal(v.status, 0, String(v.stderr));
    const r = await heavy('remux', () => remux(dir, { sound: { contour: 'rise-2', tickTempo: 0.95, panSeed: 11 } }));
    assert.ok(r.ms < 60_000, `${r.ms} ms`);
    assert.equal(r.report.sound.contour, 'rise-2');
    const probe = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'stream=codec_type,nb_frames,sample_rate,channels,duration', '-of', 'json', r.mp4], { encoding: 'utf8' });
    const streams = JSON.parse(probe.stdout).streams;
    assert.deepEqual(streams.map((s) => s.codec_type), ['video', 'audio']);
    assert.equal(+streams[0].nb_frames, 450);
    assert.equal(+streams[1].sample_rate, 48000);
    assert.equal(+streams[1].duration, 15, 'the edit list presents exactly D');
    const raw = (f) => spawnSync('ffmpeg', ['-v', 'error', '-i', f, '-map', '0:v', '-c', 'copy', '-f', 'h264', '-'], { maxBuffer: 1 << 28 }).stdout;
    assert.ok(raw(r.mp4).equals(raw(path.join(dir, 'video.mp4'))), 'the picture is untouched');
    const wav = decodeWav(r.wav), aac = decodeAudio(r.mp4, 15);
    assert.equal(aac.length, wav.length);
    assert.equal(lagSamples(wav, aac), 0);
    const s = seamMetrics(aac);
    assert.ok(clickPass(s) && s.clickDbfs < -60, `the delivered seam: click ${s.clickDbfs} dBFS`);
    assert.ok(s.wrapStepDbfs <= SEAM_STEP_TARGET, `the delivered seam: raw wrap step ${s.wrapStepDbfs} dBFS`);
    const plan = readJson(r.planFile);
    assert.equal(plan.schema, 'hm-score-plan/1');
    assert.ok(plan.swirl.tension.gain.length && plan.synth.some((e) => e.inst === 'bell'), 'what qa/gates/audio.py reads for hum and tonal');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
