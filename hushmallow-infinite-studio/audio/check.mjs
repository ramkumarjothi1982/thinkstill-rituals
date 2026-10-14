// Score-side audio checks (WP-04): the G-AUDIO numbers the score can vouch for,
// measured on the written WAV, on the WAV as the delivered MP4 carries it (AAC,
// audio/loop-aac.mjs), and on the plan that made it. qa/gates/audio.py (WP-05)
// owns the gate on the delivered MP4. Where that gate defines a number, this file
// computes it the same way (tests/unit/audio-check.test.mjs runs both on the same
// file and compares them), so the two never disagree in silence.
//
//   loudness    EBU R128 via ffmpeg: −16 ± 0.5 LUFS, true peak ≤ −1.5 dBTP, LRA ≤ 10 LU
//   seamStep    the gate's definition: the wrap step |x[0] − x[N−1]|, max over both
//               channels, in dBFS, ≤ −60. Reported with its context: the raw steps on
//               either side of the seam and how the film's own sample steps are
//               distributed. A raw sample difference is the local slope of whatever is
//               playing, so on continuous content it reads as loud as the content's
//               high end (a perfectly periodic 440 Hz sine at −20 dBFS reads −44.8),
//               whether or not the file has a discontinuity.
//   seamClick   a discontinuity estimate: the size of a step at the seam, in dBFS. A
//               step is broadband; the score has little above 16 kHz. The looped seam
//               ±50 ms is high-passed at 16 kHz (8th-order Butterworth, zero phase)
//               and the peak within ±1 ms is divided by the same filter's response to a
//               unit step. On v2's approved soundtrack it reads −31.4 against an actual
//               sample jump of −30.7 dBFS. The same estimate at 32 boundaries 5–100 ms
//               either side of the seam is the local content floor: a step below it is
//               masked by the content's own high end. Pass: below −60 dBFS, or (bright
//               content) no higher than the local floor's 90th percentile.
//   seamRms     the gate's definition: the 10 ms RMS across the seam lies within 3 dB
//               of the range of its two 10 ms neighbours (a click rises above both, a
//               dropout falls below both)
//   contour     the last 3 tonal events never fall (contourRules below)
//   close       MO-CLOSE present: a content gesture on the eyes opening, the closing
//               chime on the logo
//   hum         the tension hum at the final gain ≤ −24 dBFS (a hum-only stem): its
//               loudest 400 ms RMS (v2's approved hum: −24.6 dBFS RMS, −18.3 peak)

import { spawnSync } from 'node:child_process';

export const SR = 48000;
export const LIMITS = Object.freeze({ lufs: -16, lufsTol: 0.5, truePeak: -1.5, lra: 10, seamStep: -60, seamClick: -60, seamRmsDb: 3, humDbfs: -24, offsetMs: 20 });
/** The closing contour (G-AUDIO "the final tonal events never fall"; WP-05 thresholds: last 3, 50 cents). */
export const CONTOUR = Object.freeze({ last: 3, toleranceCents: 50, audibleDb: 10 });

const db = (x) => (x > 0 ? 20 * Math.log10(x) : -Infinity);
const r1 = (x) => +x.toFixed(1), r2 = (x) => +x.toFixed(2);

/** A WAV (any format ffmpeg reads) → interleaved stereo Float32Array at 48 kHz. */
export function decodeWav(file) {
  const p = spawnSync('ffmpeg', ['-v', 'error', '-i', file, '-f', 'f32le', '-ac', '2', '-ar', String(SR), '-'], { maxBuffer: 1 << 30 });
  if (p.status !== 0) throw new Error(`ffmpeg could not decode ${file}: ${String(p.stderr).slice(-500)}`);
  return new Float32Array(p.stdout.buffer.slice(p.stdout.byteOffset, p.stdout.byteOffset + p.stdout.byteLength));
}

/** EBU R128 integrated loudness, LRA and true peak of a file (ffmpeg ebur128). */
export function loudness(file) {
  const p = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', file, '-af', 'ebur128=peak=true:framelog=quiet', '-f', 'null', '-'], { encoding: 'utf8', maxBuffer: 64 << 20 });
  if (p.status !== 0) throw new Error(`ffmpeg ebur128 failed on ${file}`);
  const s = p.stderr.slice(p.stderr.lastIndexOf('Summary:'));
  const num = (re) => { const m = s.match(re); return m ? parseFloat(m[1]) : NaN; };
  return { I: num(/I:\s+(-?[\d.]+|-inf) LUFS/), LRA: num(/LRA:\s+(-?[\d.]+) LU/), TP: num(/Peak:\s+(-?[\d.]+|-inf) dBFS/) };
}

// ------------------------------------------------------------------- seam --

// 8th-order Butterworth high-pass as 4 RBJ biquads (Q_k = 1 / (2 cos((2k−1)π/16)))
function butterHighpass(fc, order = 8) {
  const w0 = 2 * Math.PI * fc / SR, cw = Math.cos(w0), sw = Math.sin(w0);
  return Array.from({ length: order / 2 }, (_, k) => {
    const q = 1 / (2 * Math.cos(((2 * k + 1) * Math.PI) / (2 * order)));
    const alpha = sw / (2 * q), a0 = 1 + alpha;
    return { b0: (1 + cw) / 2 / a0, b1: -(1 + cw) / a0, b2: (1 + cw) / 2 / a0, a1: (-2 * cw) / a0, a2: (1 - alpha) / a0 };
  });
}
function biquadRun(x, s) {
  const y = new Float64Array(x.length); let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < x.length; i++) { const v = s.b0 * x[i] + s.b1 * x1 + s.b2 * x2 - s.a1 * y1 - s.a2 * y2; x2 = x1; x1 = x[i]; y2 = y1; y1 = v; y[i] = v; }
  return y;
}
/** zero-phase (forward-backward) filtering through a biquad cascade */
function filtfilt(x, sections) {
  let y = Float64Array.from(x);
  for (const s of sections) y = biquadRun(y, s);
  y.reverse();
  for (const s of sections) y = biquadRun(y, s);
  return y.reverse();
}

const HP = butterHighpass(16000);
const W = Math.round(0.05 * SR);          // ±50 ms of context around a boundary
const NEAR = Math.round(0.001 * SR);      // the peak is read within ±1 ms of it
// the estimator's response to a unit step, so the result reads as the step's own size
const STEP_GAIN = (() => {
  const s = new Float64Array(2 * W); s.fill(1, W);
  const h = filtfilt(s, HP);
  let m = 0; for (let i = W - NEAR; i <= W + NEAR; i++) m = Math.max(m, Math.abs(h[i]));
  return m;
})();

/** Step estimate (linear) at boundary `at` (between samples at−1 and at) of an interleaved signal read circularly. */
export function clickAt(y, at) {
  const n = y.length / 2;
  let worst = 0;
  for (let c = 0; c < 2; c++) {
    const seg = new Float64Array(2 * W);
    for (let i = 0; i < 2 * W; i++) seg[i] = y[2 * ((((at - W + i) % n) + n) % n) + c];
    const h = filtfilt(seg, HP);
    for (let i = W - NEAR; i <= W + NEAR; i++) worst = Math.max(worst, Math.abs(h[i]));
  }
  return worst / STEP_GAIN;
}

/** The raw sample step across boundary b (between samples b−1 and b), circular: max over channels of |y[b] − y[b−1]|. */
export function rawStepAt(y, b) {
  const n = y.length / 2, i = ((b % n) + n) % n, j = (i - 1 + n) % n;
  return Math.max(Math.abs(y[2 * i] - y[2 * j]), Math.abs(y[2 * i + 1] - y[2 * j + 1]));
}

const rms = (y, from, to) => {      // interleaved, circular sample range [from, to)
  const n = y.length / 2; let s = 0;
  for (let i = from; i < to; i++) { const j = ((i % n) + n) % n; s += y[2 * j] ** 2 + y[2 * j + 1] ** 2; }
  return Math.sqrt(s / (2 * (to - from)));
};
const pct = (sorted, p) => sorted[Math.min(sorted.length - 1, Math.max(0, Math.round(p * (sorted.length - 1))))];

/**
 * The 10 ms RMS around boundary b against its two 10 ms neighbours:
 * outside = dB outside the neighbours' range (the gate's), delta = the larger
 * difference from either neighbour (context).
 */
function levelAt(y, b) {
  const ten = Math.round(0.01 * SR), half = ten / 2;
  const at = db(rms(y, b - half, b + half)), before = db(rms(y, b - half - ten, b - half)), after = db(rms(y, b + half, b + half + ten));
  const lo = Math.min(before, after), hi = Math.max(before, after);
  return { at, before, after, outside: Math.max(0, at - hi, lo - at), delta: Math.max(Math.abs(at - before), Math.abs(at - after)) };
}

/**
 * The loop seam of an interleaved stereo signal (last sample → first):
 *   wrapStepDbfs      the gate's |x[0] − x[N−1]| (max over channels)
 *   wrapNeighbours    the raw steps just before and after it, and the film's own raw-step
 *                     distribution (median, 5th percentile, the share at or below −60 dBFS,
 *                     the share at or below the wrap step)
 *   clickDbfs         the discontinuity estimate, with its local floor (±5–100 ms) and
 *                     interior floor (64 boundaries)
 *   rmsOutsideDb      the gate's 10 ms RMS rule; rmsDeltaDb the symmetric difference
 */
export function seamMetrics(y) {
  const n = y.length / 2;
  const wrap = rawStepAt(y, 0);
  const steps = new Float32Array(n - 1);
  let atOrBelowWrap = 0, belowLimit = 0;
  const lim = 10 ** (LIMITS.seamStep / 20);
  for (let b = 1; b < n; b++) { const s = rawStepAt(y, b); steps[b - 1] = s; if (s <= wrap) atOrBelowWrap++; if (s <= lim) belowLimit++; }
  steps.sort();
  const click = clickAt(y, 0);
  const local = [];
  for (let k = 0; k < 16; k++) { const ms = 5 + (k * 95) / 15, off = Math.round(ms * SR / 1000); local.push(clickAt(y, off), clickAt(y, -off)); }
  local.sort((a, b) => a - b);
  const interior = Array.from({ length: 64 }, (_, k) => clickAt(y, Math.round(((k + 0.5) / 64) * n))).sort((a, b) => a - b);
  const s = levelAt(y, 0);
  const inner = Array.from({ length: 64 }, (_, k) => levelAt(y, Math.round(((k + 0.5) / 64) * n)));
  const io = inner.map((l) => l.outside).sort((a, b) => a - b), id = inner.map((l) => l.delta).sort((a, b) => a - b);
  return {
    wrapStepDbfs: r1(db(wrap)),
    wrapNeighboursDbfs: { before: r1(db(rawStepAt(y, n - 1))), after: r1(db(rawStepAt(y, 1))) },
    interiorStepDbfs: { median: r1(db(pct(steps, 0.5))), p05: r1(db(pct(steps, 0.05))), shareAtOrBelowLimit: +(belowLimit / (n - 1)).toFixed(4), shareAtOrBelowWrap: +(atOrBelowWrap / (n - 1)).toFixed(4) },
    clickDbfs: r1(db(click)),
    clickLocalDbfs: { median: r1(db(pct(local, 0.5))), p90: r1(db(pct(local, 0.9))), max: r1(db(local[local.length - 1])) },
    clickInteriorDbfs: { median: r1(db(pct(interior, 0.5))), p95: r1(db(pct(interior, 0.95))) },
    rmsDb: { seam: r2(s.at), before: r2(s.before), after: r2(s.after) },
    rmsOutsideDb: r2(s.outside),
    rmsDeltaDb: r2(s.delta),
    interiorRms: { outsideMedian: r2(pct(io, 0.5)), outsideP95: r2(pct(io, 0.95)), deltaMedian: r2(pct(id, 0.5)), deltaP95: r2(pct(id, 0.95)) },
  };
}

// ------------------------------------------------------------------ sync --

const roundHalfEven = (x) => (Math.abs(x % 1) === 0.5 ? 2 * Math.round(x / 2) : Math.round(x));

/**
 * The gate's global A/V offset (qa/gates/audio.py global_offset, ported line for line;
 * tests/unit/audio-check.test.mjs holds the two equal): the lag (5 ms steps, ±maxMs) at
 * which the audio's onset strength (rises of log energy in 5 ms hops) best matches the
 * cue log's impulse train, circularly. → { lagMs, best, zero, margin } where margin is
 * the lag-0 match over the best match outside ±limitMs (the gate passes |lagMs| ≤ limitMs).
 */
export function globalOffset(y, cues, { maxMs = 500, limitMs = LIMITS.offsetMs } = {}) {
  if (!cues?.length) return { lagMs: 0, best: 0, zero: 0, margin: Infinity };     // (the gate does not grade a film without a cue log)
  const n = y.length / 2, hop = Math.round(0.005 * SR), e = [];
  for (let i = 0; i < n - hop; i += hop) {
    let s = 0;
    for (let j = i; j < i + hop; j++) { const m = (y[2 * j] + y[2 * j + 1]) / 2; s += m * m; }
    e.push(s);
  }
  const le = e.map((v) => Math.log10(v + 1e-10)), flux = le.map((v, i) => Math.max(0, v - le[i > 0 ? i - 1 : 0]));
  const train = new Float64Array(flux.length);
  for (const c of cues) { const k = roundHalfEven((c.t * SR) / hop); if (k >= 0 && k < train.length) train[k] += 1; }
  const at = (lag) => { let v = 0; for (let k = 0; k < train.length; k++) if (train[k]) v += flux[(((k + lag) % flux.length) + flux.length) % flux.length] * train[k]; return v; };
  const m = Math.floor(maxMs / 5);
  let best = [0, -1], outside = -Infinity;
  for (let lag = -m; lag <= m; lag++) {
    const v = at(lag);
    if (v > best[1]) best = [lag, v];
    if (Math.abs(lag * 5) > limitMs) outside = Math.max(outside, v);
  }
  const zero = at(0);
  return { lagMs: best[0] * 5, best: best[1], zero, margin: zero - outside };
}

/** seamClick verdict: below −60 dBFS, or no higher than the local content floor (bright content masks a smaller step). */
export function clickPass(seam) {
  return seam.clickDbfs < Math.max(LIMITS.seamClick, seam.clickLocalDbfs.p90);
}

// ----------------------------------------------------------------- contour --
//
// A tonal event is a pitched musical sound: { t, comps: [{ f0, f1, glide, level,
// articulation? }], source, motif?, recipe? }. Its components are its partials or
// voices with their pitch paths (f0 at the onset, f1 where the glide lands);
// level is relative within the event. The studio's pitched synth events (bell,
// ping, blip: the same set qa/gates/audio.py reads from the plan) are tonal
// events, and so are the engine's motif sounds the score models (the kit's
// closing phrase, the tuned chime): see audio/score.mjs.
//
// "The final tonal events never fall", over the last 3 events:
//   line     the loudest component's onset pitch never falls from one event to the
//            next, and neither does its landing pitch (where its glide settles);
//   gesture  no audible component (within 10 dB of the event's loudest) glides
//            down by more than the tolerance: a falling zap or a converging swell
//            whose top voice drops is a falling ending even when it starts high.
//            Exempt: a glide that is the kit's note articulation (the same shape on
//            every note the kit plays, e.g. Blubi's droplet plink), which carries no
//            melody; the line rule still compares where those notes land.
// Tolerance: 50 cents, as the gate's thresholds (G-AUDIO tonal.toleranceCents).

const cents = (a, b) => 1200 * Math.log2(b / a);
/** The loudest component of a tonal event. */
export const leadOf = (e) => e.comps.reduce((a, b) => (b.level > a.level ? b : a));

/** A studio synth event as a tonal event (null when it is not pitched). */
export function synthTonal(e) {
  if (!e.f) return null;
  if (e.inst === 'bell') return { t: e.t, source: 'synth:bell', comps: [{ f0: e.f, f1: e.f, glide: 0, level: 1 }] };
  if (e.inst === 'ping') return { t: e.t, source: 'synth:ping', comps: [{ f0: e.f, f1: e.f * (e.rise ?? 1), glide: e.decay, level: 1 }] };
  if (e.inst === 'blip') return { t: e.t, source: 'synth:blip', comps: [{ f0: e.f, f1: e.f1 ?? e.f, glide: e.f1 ? (e.glide || 0.05) : 0, level: 1 }] };
  return null;
}

/** The closing rules over the last `last` tonal events (sorted by onset). → { last3, falls, pass } */
export function contourRules(events, { last = CONTOUR.last, tolerance = CONTOUR.toleranceCents, audibleDb = CONTOUR.audibleDb } = {}) {
  const tail = [...events].sort((a, b) => a.t - b.t).slice(-last);
  const falls = [];
  for (let i = 1; i < tail.length; i++) {
    const a = leadOf(tail[i - 1]), b = leadOf(tail[i]);
    const on = cents(a.f0, b.f0), land = cents(a.f1, b.f1);
    if (on < -tolerance) falls.push({ rule: 'line', at: +tail[i].t.toFixed(3), cents: Math.round(on), what: 'onset pitch falls from the previous event' });
    if (land < -tolerance) falls.push({ rule: 'line', at: +tail[i].t.toFixed(3), cents: Math.round(land), what: 'landing pitch falls from the previous event' });
  }
  for (const e of tail) {
    const top = Math.max(...e.comps.map((c) => c.level)), floor = top * 10 ** (-audibleDb / 20);
    for (const c of e.comps) {
      const d = cents(c.f0, c.f1);
      if (c.level >= floor && d < -tolerance && !c.articulation) falls.push({ rule: 'gesture', at: +e.t.toFixed(3), cents: Math.round(d), what: `a ${e.source} component glides down ${Math.round(c.f0)} → ${Math.round(c.f1)} Hz` });
    }
  }
  const summary = (e) => { const l = leadOf(e); return { t: +e.t.toFixed(3), hz: +l.f0.toFixed(2), hz1: +l.f1.toFixed(2), source: e.source, ...(e.motif ? { motif: e.motif } : {}) }; };
  return { last3: tail.map(summary), falls, pass: tail.length > 0 && !falls.length };
}

/** The contour check on a score report (report.tonal: every tonal event of the score). */
export function contourCheck(report) {
  return contourRules(report.tonal);
}

/**
 * MO-CLOSE: a content gesture on the eyes opening and the closing chime on the logo
 * (the kit gesture the cue's recipe plays: report.kitVoices, which also holds a gesture
 * that hit sync starts early so its loud note lands on the cue).
 */
export function closeCheck(plan, report) {
  const at = (type) => report.cues.filter((c) => c.type === type).map((c) => c.t);
  const gestureAt = (times, names) => times.some((t) => (report.kitVoices
    ? report.kitVoices.some((v) => names.includes(v.name) && Math.abs(v.cueT - t) < 1e-6 && v.offset === 0)
    : plan.engine.some((e) => e.kind === 'mallow' && names.includes(e.name) && Math.abs(e.t - t) < 1e-6)));
  const open = gestureAt(at('eyes_open'), ['comfort', 'release', 'celebrate']);
  const logo = gestureAt(at('logo'), ['success', 'celebrate']);
  return { open, logo, pass: open && logo };
}

// -------------------------------------------------------------- G-AUDIO --

/**
 * G-AUDIO (score side) from the measurements; → { pass, checks, failing }.
 * seam: seamMetrics of the WAV; delivered: seamMetrics of the WAV through AAC as the
 * MP4 carries it (audio/loop-aac.mjs), when measured. The gate reads the MP4, so its
 * seamStep is judged on the delivered audio when there is one.
 */
export function gAudio({ loud, seam, delivered = null, contour, close, humDbfs = null, hits = null, offset = null }) {
  const onFile = delivered || seam;
  const where = delivered ? 'the delivered AAC' : 'the WAV';
  const checks = {
    loudness: { value: loud.I, limit: `${LIMITS.lufs} ± ${LIMITS.lufsTol} LUFS`, pass: Math.abs(loud.I - LIMITS.lufs) <= LIMITS.lufsTol },
    truePeak: { value: loud.TP, limit: `≤ ${LIMITS.truePeak} dBTP`, pass: loud.TP <= LIMITS.truePeak },
    lra: { value: loud.LRA, limit: `≤ ${LIMITS.lra} LU`, pass: loud.LRA <= LIMITS.lra },
    seamStep: {
      value: onFile.wrapStepDbfs, limit: `≤ ${LIMITS.seamStep} dBFS: |x[0] − x[N−1]| on ${where} (qa/gates/audio.py)`,
      pass: onFile.wrapStepDbfs <= LIMITS.seamStep,
      context: { wav: seam.wrapStepDbfs, neighbours: onFile.wrapNeighboursDbfs, interior: onFile.interiorStepDbfs },
    },
    seamClick: {
      value: delivered ? { wav: seam.clickDbfs, delivered: delivered.clickDbfs } : seam.clickDbfs,
      limit: `< max(${LIMITS.seamClick} dBFS, local floor p90) on the WAV${delivered ? ' and the delivered AAC' : ''}`,
      pass: clickPass(seam) && (!delivered || clickPass(delivered)),
    },
    seamRms: { value: onFile.rmsOutsideDb, limit: `≤ ${LIMITS.seamRmsDb} dB outside the range of its 10 ms neighbours on ${where} (qa/gates/audio.py)`, pass: onFile.rmsOutsideDb <= LIMITS.seamRmsDb },
    contour: { value: contour.last3, limit: 'last 3 tonal events never fall (line and gesture, 50 cents)', pass: contour.pass, ...(contour.falls.length ? { falls: contour.falls } : {}) },
    close: { value: close, limit: 'MO-CLOSE present', pass: close.pass },
  };
  if (humDbfs !== null) checks.hum = { value: humDbfs, limit: `≤ ${LIMITS.humDbfs} dBFS`, pass: humDbfs <= LIMITS.humDbfs };
  if (offset) checks.offset = { value: offset.lagMs, limit: `±${LIMITS.offsetMs} ms global A/V offset (the gate's onset-strength correlation with the cue log, on ${where})`, pass: Math.abs(offset.lagMs) <= LIMITS.offsetMs, margin: +offset.margin.toFixed(3) };
  if (hits) {
    const graded = hits.filter((h) => h.graded), late = graded.filter((h) => !h.pass);
    checks.onsets = { value: late.length, limit: `every graded hit within its tolerance (loud ±20 ms, quiet ±45 ms; the gate's detector, audio/hits.py), ${graded.length} graded`,
      pass: !late.length, ...(late.length ? { late: late.map((h) => `${h.type}@${h.t} ${h.errorMs} ms`) } : {}) };
  }
  const failing = Object.entries(checks).filter(([, c]) => !c.pass).map(([k]) => k);
  return { pass: !failing.length, failing, checks };
}

/** Loudest RMS over `win`-second windows every `hop` seconds of an interleaved signal, in dBFS. */
export function maxWindowRmsDbfs(y, win = 0.4, hop = 0.1) {
  const n = y.length / 2, w = Math.round(win * SR), h = Math.round(hop * SR);
  let best = 0;
  for (let a = 0; a + w <= n; a += h) {
    let s = 0;
    for (let i = 2 * a; i < 2 * (a + w); i++) s += y[i] * y[i];
    best = Math.max(best, s / (2 * w));
  }
  return +(10 * Math.log10(best || 1e-30)).toFixed(1);
}

/** Peak of an interleaved signal in dBFS. */
export function peakDbfs(y) {
  let m = 0; for (let i = 0; i < y.length; i++) m = Math.max(m, Math.abs(y[i]));
  return +db(m).toFixed(1);
}
