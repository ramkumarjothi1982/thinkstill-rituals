// Running the score: find the inputs of a job, build the plan, render, master,
// measure, and remux onto an existing picture. The command line of
// audio/score.mjs and the `hm score` / `hm remux` commands both land here.
//
// Inputs of a job directory (render/farm.mjs): cues.json (the dry run's cue log
// and curves, R12) and job.json. The direction is found, in order, from
// --direction, a direction.json beside the cue log, the job key's direction
// sha256 among the composed directions in specs/ and runs/, or — for the frozen
// v2 route, whose cue log carries no move ownership — a composed direction
// whose cue log is byte-identical to this one (T01's golden direction for v2).
// Each substitution is logged; none is silent.
//
// Outputs beside the WAV of a farm job (or a remux): score-plan.json, the plan
// qa/gates (WP-05) reads for its hum and closing-contour checks (docs/QA.md §6).
// A circular score is muxed with loop-aware AAC (audio/loop-aac.mjs), so the
// delivered MP4 loops as cleanly as score.wav does.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { buildScore, soundmap, FIX_ORDER, USAGE } from './score.mjs';
import { openRenderer, renderMix, masterToWav, wrapAdd, writeWav24 } from './render-offline.mjs';
import { hearHits, hitMoves, HIT_ROUNDS } from './hits.mjs';
import { spliceLoop } from './splice.mjs';
import { decodeWav, loudness, seamMetrics, contourCheck, closeCheck, gAudio, globalOffset, peakDbfs, maxWindowRmsDbfs } from './check.mjs';
import { deliveredRoundTrip, muxLoop } from './loop-aac.mjs';
import { studioPath, assertWritable, STUDIO } from '../render/lib/paths.mjs';

const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const sha256 = (p) => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');

function* walk(dir, depth = 4) {
  if (depth < 0 || !fs.existsSync(dir)) return;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(p, depth - 1); else if (e.isFile()) yield p;
  }
}
const directionFiles = () => [...walk(studioPath('specs')), ...walk(studioPath('runs'))].filter((p) => p.endsWith('.direction.json') || path.basename(p) === 'direction.json');

/** The cue log as the stage records it, from a direction (composer/artefacts.js dryRun's cue shape). */
const logCues = (direction) => direction.cues.map((c) => ({ t: +c.t.toFixed(4), type: c.type, ...c.data }));

/**
 * Resolve the inputs of a score: { log, direction, spec, cuesPath, jobDir, found: [notes] }.
 * input: a cues.json file or a job directory.
 */
export function resolveInputs(input, { direction: dirPath = null, spec: specPath = null } = {}) {
  const found = [];
  const isDir = fs.existsSync(input) && fs.statSync(input).isDirectory();
  const cuesPath = isDir ? path.join(input, 'cues.json') : input;
  if (!fs.existsSync(cuesPath)) throw new Error(`score: no cue log at ${cuesPath}`);
  const log = readJson(cuesPath);
  const here = path.dirname(cuesPath);
  const jobPath = path.join(here, 'job.json');
  const job = fs.existsSync(jobPath) ? readJson(jobPath) : null;

  let direction = null;
  if (dirPath) { direction = readJson(dirPath); found.push(`direction: ${path.relative(STUDIO, path.resolve(dirPath))} (--direction)`); }
  else if (fs.existsSync(path.join(here, 'direction.json'))) { direction = readJson(path.join(here, 'direction.json')); found.push('direction: direction.json beside the cue log'); }
  else {
    const want = job?.keyParts?.directionSha256;
    const files = directionFiles();
    const bySha = want ? files.find((f) => sha256(f) === want) : null;
    if (bySha) { direction = readJson(bySha); found.push(`direction: ${path.relative(STUDIO, bySha)} (the job's direction sha256)`); }
    else {
      const key = JSON.stringify(log.cues);
      const same = files.find((f) => { try { return JSON.stringify(logCues(readJson(f))) === key; } catch { return false; } });
      if (same) { direction = readJson(same); found.push(`direction: ${path.relative(STUDIO, same)} (its cue log is byte-identical to this one${job ? `; the job renders '${job.direction}'` : ''})`); }
    }
  }
  if (direction && JSON.stringify(logCues(direction)) !== JSON.stringify(log.cues)) throw new Error('score: the direction\'s cues are not this cue log');

  let spec = null;
  if (specPath) { spec = readJson(specPath); found.push(`spec: ${path.relative(STUDIO, path.resolve(specPath))} (--spec)`); }
  else if (fs.existsSync(path.join(here, 'spec.json'))) { spec = readJson(path.join(here, 'spec.json')); found.push('spec: spec.json beside the cue log'); }
  else if (direction?.meta?.spec) {
    const f = [...walk(studioPath('specs')), ...walk(studioPath('runs'))].find((p) => p.endsWith('.json') && !p.endsWith('direction.json') && (() => {
      try { const j = readJson(p); return j.schema === 'hm-variant/1' && j.id === direction.meta.spec; } catch { return false; }
    })());
    if (f) { spec = readJson(f); found.push(`spec: ${path.relative(STUDIO, f)} (the direction's spec ${direction.meta.spec})`); }
  }
  return { log, direction, spec, cuesPath, jobDir: isDir ? input : (job ? here : null), job, found };
}

/** buildPlanV2 itself, for the compat self-check (tools/golden/plan-v2.mjs loads it from the frozen file). */
async function assertCompat(log, plan) {
  const { planV2 } = await import('../tools/golden/plan-v2.mjs');
  const want = JSON.stringify(await planV2(log));
  if (JSON.stringify(plan) !== want) throw new Error('score: --compat v2-score plan differs from the frozen buildPlanV2 (bug in the generaliser)');
}

/**
 * The tension hum alone (a stem through the same engine chain) at the final mastering
 * gain: its loudest 400 ms RMS and its peak, in dBFS (G-AUDIO: hum ≤ −24 dBFS).
 */
async function humStem(plan, gainDb, session, kit) {
  if (!plan.swirl?.tension) return null;
  const stem = { ...plan, engine: [], synth: [], ticks: [], crickets: [], pad: null, swirl: { ...plan.swirl, items: [] }, bed: { ...plan.bed, mute: true } };
  const { x } = await session.render(stem, { kit, bedRho: 1 });
  const y = plan.circular ? wrapAdd(x, plan.DUR) : x;
  const g = 10 ** (gainDb / 20);
  for (let i = 0; i < y.length; i++) y[i] *= g;
  return { rmsDbfs: maxWindowRmsDbfs(y, 0.4, 0.1), peakDbfs: peakDbfs(y) };
}

/**
 * Plan, render, master and write one score. → { plan, report, master, check?, ms }
 * inputs: resolveInputs() result; opts: buildScore options; check: measure G-AUDIO.
 *
 * Beyond v2's single render (--compat v2-score keeps exactly that):
 *   1. hit sync (audio/hits.mjs): the graded cues' hits are heard with the gate's own
 *      detector; a late one is corrected (a kit gesture synced by its loud note, or a
 *      studio answer softened) and the score rendered again, at most HIT_ROUNDS times;
 *   2. the loop's splice (audio/splice.mjs): a circular mix is shifted by at most 1 ms
 *      to where its waveform is flat, verified through the loop-aware AAC delivery.
 */
export async function scoreToWav(inputs, opts, outWav, { check = false, log = () => {} } = {}) {
  const t0 = process.hrtime.bigint();
  const ms = () => Number(process.hrtime.bigint() - t0) / 1e6;
  assertWritable(outWav);
  const sm = soundmap();
  const session = await openRenderer();
  let plan, report, kit, master, mix, hits = null, hum = null, sync = opts.sync || {};
  const rounds = [];
  try {
    for (let round = 0; ; round++) {
      ({ plan, report } = buildScore(inputs, { ...opts, sync }));
      if (round === 0 && opts.compat) await assertCompat(inputs.log, plan);
      kit = plan.kit ? { id: plan.kit, ...sm.kits[plan.kit] } : { id: 'noomi', ...sm.kits.noomi };
      mix = await renderMix(plan, { kit, session, log, bedStats: mix?.xfade ?? null });
      master = masterToWav(mix.x, outWav, { circular: !!plan.circular, log });
      if (opts.compat) break;
      hits = hearHits(outWav, inputs.log.cues, plan.DUR);
      const late = hits.filter((h) => h.graded && !h.pass);
      const entry = { round, late: late.map((h) => ({ cue: h.i, type: h.type, t: h.t, errorMs: h.errorMs, lateDb: h.lateDb })) };
      rounds.push(entry);
      if (!late.length) break;
      const m = hitMoves({ report, plan, hits, sync });
      entry.moves = m.moves;
      entry.unresolved = m.unresolved.map((h) => `${h.type}@${h.t} ${h.errorMs} ms`);
      for (const line of m.moves) log(`hit sync: ${line}`);
      if (!m.moves.length || round + 1 >= HIT_ROUNDS) break;
      sync = m.sync;
    }
    report.bedRho = mix.rho;
    if (plan.circular) {
      const sp = spliceLoop(master.mastered, plan.DUR, { cues: inputs.log.cues, log });
      writeWav24(sp.y, outWav);
      master.mastered = sp.y;
      plan = { ...plan, circular: { ...plan.circular, splice: sp.k } };
      report.splice = { samples: sp.k, ms: sp.ms, wavStepDbfs: sp.wavStepDbfs, delivered: sp.delivered, pass: sp.pass, tried: sp.tried };
      hits = hearHits(outWav, inputs.log.cues, plan.DUR);      // as delivered: after the splice
    }
    if (check) hum = await humStem(plan, master.gainDb, session, kit);
  } finally {
    await session.close();
  }
  if (!opts.compat) report.hits = { rounds, final: hits };
  const { mastered, ...m } = master;
  const out = { plan, report, master: m, ms: { render: Math.round(ms()) } };
  if (check) {
    const y = decodeWav(outWav);
    const loud = loudness(outWav), seam = seamMetrics(y), contour = contourCheck(report), close = closeCheck(plan, report);
    // the seam as the delivered MP4 carries it: a circular score through loop-aware AAC (and,
    // for comparison, through the plain mux render/mux.mjs used before); v2's through the plain mux
    const D = plan.DUR;
    const deliveredY = deliveredRoundTrip(y, D, { loopAware: !!plan.circular });
    const delivered = seamMetrics(deliveredY), offset = globalOffset(deliveredY, inputs.log.cues);
    const plainMux = plan.circular ? seamMetrics(deliveredRoundTrip(y, D, { loopAware: false })) : null;
    out.check = { loud, seam, delivered, plainMux, contour, close, hum, hits, offset,
      gAudio: gAudio({ loud, seam, delivered, contour, close, humDbfs: hum?.rmsDbfs ?? null, hits, offset }) };
  }
  out.ms.total = Math.round(ms());
  return out;
}

// ------------------------------------------------------------------- remux --

function probeComment(file) {
  const p = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format_tags=comment,title', '-of', 'json', file], { encoding: 'utf8' });
  if (p.status !== 0) return {};
  return JSON.parse(p.stdout).format?.tags || {};
}

/**
 * score-plan.json for qa/gates (docs/QA.md §6): the plan itself (synth events, the
 * tension layer, ...) plus the score's own report of who sounded and its tonal events.
 */
export function writeScorePlan(file, plan, report) {
  assertWritable(file);
  const { mode, fixes, mallow, kit, realm, tod, bed, sound, layers, tonal, notes, sync, splice, hits } = report;
  const heard = hits ? { rounds: hits.rounds.length, final: hits.final } : undefined;
  fs.writeFileSync(file, `${JSON.stringify({ schema: 'hm-score-plan/1', ...plan, report: { mode, fixes, mallow, kit, realm, tod, bed, sound, layers, tonal, notes, sync, splice, hits: heard } })}\n`);
  return file;
}

/**
 * Re-score an existing picture with new audio-only slots (contour, tickTempo,
 * panSeed) and mux it: the video stream is copied untouched; a circular score's
 * audio goes in loop-aware (audio/loop-aac.mjs). stamp(tags, report): the
 * provenance stamp to write (FU-5: hm remux passes one G-FINAL:delivery can
 * verify); audioEdit: how the AAC priming is delivered (render/mux.mjs).
 * → { wav, mp4, plan, report, ms, picture, stamp }
 */
export async function remux(jobDir, { sound = {}, fixes = FIX_ORDER, direction = null, spec = null, inPlace = false, stamp: stampFor = null, audioEdit = 'priming', log = () => {} } = {}) {
  const t0 = process.hrtime.bigint();
  const inputs = resolveInputs(jobDir, { direction, spec });
  for (const f of inputs.found) log(f);
  const picture = ['video.mp4', 'final.mp4'].map((f) => path.join(jobDir, f)).find((f) => fs.existsSync(f));
  if (!picture) throw new Error(`remux: no picture (video.mp4 or final.mp4) in ${jobDir}`);
  const wav = path.join(jobDir, inPlace ? 'score.wav.part.wav' : 'score.remux.wav');
  const mp4 = path.join(jobDir, inPlace ? 'final.mp4.part.mp4' : 'final.remux.mp4');
  assertWritable(wav); assertWritable(mp4);
  const r = await scoreToWav(inputs, { fixes, sound }, wav, { log });
  const tags = probeComment(path.join(jobDir, fs.existsSync(path.join(jobDir, 'final.mp4')) ? 'final.mp4' : path.basename(picture)));
  const stamp = stampFor ? stampFor(tags, r.report)
    : `${tags.comment ? `${tags.comment} | ` : ''}remux ${JSON.stringify({ contour: r.report.sound.contour, tickTempo: r.report.sound.tickTempo, panSeed: r.report.sound.panSeed })}`;
  const metadata = ['-metadata', `comment=${stamp}`, '-metadata', `title=${tags.title || inputs.log.title || ''}`];
  if (r.plan.circular || audioEdit === 'trim') {
    muxLoop({ video: picture, wav, out: mp4, duration: inputs.log.duration, metadata, edit: audioEdit, circular: !!r.plan.circular, ...(r.plan.circular ? {} : { bitrate: '192k' }) });
  } else {
    const args = ['-y', '-hide_banner', '-loglevel', 'error', '-nostdin', '-i', picture, '-i', wav,
      '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-ac', '2',
      '-t', String(inputs.log.duration), ...metadata, '-movflags', '+faststart+negative_cts_offsets', mp4];
    const p = spawnSync('ffmpeg', args, { encoding: 'utf8' });
    if (p.status !== 0) throw new Error(`remux: mux failed: ${p.stderr}`);
  }
  let outWav = wav, outMp4 = mp4;
  const planFile = writeScorePlan(path.join(jobDir, inPlace ? 'score-plan.json' : 'score-plan.remux.json'), r.plan, r.report);
  if (inPlace) {
    outWav = path.join(jobDir, 'score.wav'); outMp4 = path.join(jobDir, 'final.mp4');
    fs.renameSync(wav, outWav); fs.renameSync(mp4, outMp4);
  }
  return { wav: outWav, mp4: outMp4, planFile, plan: r.plan, report: r.report, master: r.master, picture, stamp, ms: Math.round(Number(process.hrtime.bigint() - t0) / 1e6) };
}

// --------------------------------------------------------------------- CLI --

/** Parse `--key value` options (flags listed in `bool` take no value). */
export function parseArgs(argv, known, bool = []) {
  const opts = {}, pos = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) { pos.push(a); continue; }
    const k = a.slice(2);
    if (!known.includes(k) && !bool.includes(k)) throw new Error(`unknown option ${a}`);
    if (bool.includes(k)) opts[k] = true;
    else { if (i + 1 >= argv.length) throw new Error(`${a} needs a value`); opts[k] = argv[++i]; }
  }
  return { opts, pos };
}

export const parseFixes = (s) => (s == null || s === 'all' ? [...FIX_ORDER] : s === 'none' ? [] : s.split(',').map((x) => x.trim()).filter(Boolean));

/** Summary lines of a score run. */
export function summarize(r, outWav) {
  const lines = [`[score] ${r.report.mode}${r.report.fixes.length ? ` (fixes ${r.report.fixes.join(', ')})` : ''}: ${r.report.mallow} (kit ${r.report.kit}${r.report.transposition.identity ? ', reference key' : `, key ${r.report.transposition.keyRoot.toFixed(2)} Hz`}), bed ${r.report.bed}, layers ${r.report.layers.join(' ')}`,
    `[score] ${r.report.counts.engine} engine voices, ${r.report.counts.synth} synth events, ${r.report.counts.ticks} ticks${r.report.bedRho != null ? `, bed crossfade rho ${r.report.bedRho.toFixed(3)}` : ''}`,
    `[score] wrote ${outWav}: ${r.master.I} LUFS, ${r.master.TP} dBTP, LRA ${r.master.LRA} LU (${(r.ms.total / 1000).toFixed(1)} s)`];
  if (r.check) {
    const c = r.check;
    lines.push(`[score] G-AUDIO ${c.gAudio.pass ? 'pass' : `FAIL (${c.gAudio.failing.join(', ')})`}: ${Object.entries(c.gAudio.checks).map(([k, v]) => `${k} ${v.pass ? 'ok' : 'FAIL'} (${typeof v.value === 'object' ? JSON.stringify(v.value) : v.value})`).join('; ')}`);
    lines.push(`[score] seam: wrap step ${c.seam.wrapStepDbfs} dBFS on the WAV (neighbours ${c.seam.wrapNeighboursDbfs.before} / ${c.seam.wrapNeighboursDbfs.after}; ${(100 * c.seam.interiorStepDbfs.shareAtOrBelowLimit).toFixed(1)} % of the film's own steps are ≤ −60), ${c.delivered.wrapStepDbfs} delivered; click ${c.seam.clickDbfs} dBFS (local floor p90 ${c.seam.clickLocalDbfs.p90}), ${c.delivered.clickDbfs} delivered${c.plainMux ? `, ${c.plainMux.clickDbfs} through the plain mux` : ''}`);
  }
  if (r.report.hits) {
    const { rounds, final } = r.report.hits;
    const late = (final || []).filter((h) => h.graded && !h.pass);
    lines.push(`[score] hit sync: ${rounds.length} render(s); ${(final || []).filter((h) => h.graded).length} graded hits, ${late.length ? `LATE: ${late.map((h) => `${h.type}@${h.t} ${h.errorMs} ms`).join(', ')}` : 'all on their cues'}`);
    for (const rd of rounds) for (const mv of rd.moves || []) lines.push(`[score]   round ${rd.round}: ${mv}`);
  }
  if (r.report.splice) {
    const sp = r.report.splice;
    lines.push(`[score] splice: ${sp.samples} samples (${sp.ms} ms): wrap step ${sp.wavStepDbfs} dBFS in the WAV, ${sp.delivered.stepDbfs} delivered, click ${sp.delivered.clickDbfs} delivered, A/V offset ${sp.delivered.offsetMs} ms (margin ${sp.delivered.offsetMargin})${sp.pass ? '' : ' (NO CANDIDATE PASSES)'}`);
  }
  for (const n of r.report.notes) lines.push(`[score] note: ${n}`);
  return lines;
}

/** audio/score.mjs command line. → exit code */
export async function cli(argv) {
  let parsed;
  try { parsed = parseArgs(argv, ['compat', 'fixes', 'direction', 'spec', 'sound', 'mallow', 'realm', 'tod', 'plan', 'check']); } catch (e) { console.error(`${e.message}\n${USAGE}`); return 2; }
  const { opts, pos } = parsed;
  if (pos.length !== 2) { console.error(USAGE); return 2; }
  const { confine } = await import('../render/lib/write-jail.mjs');
  await confine();
  const { withHeavyLock } = await import('../render/lib/heavy-lock.mjs');
  try {
    const inputs = resolveInputs(pos[0], { direction: opts.direction, spec: opts.spec });
    for (const f of inputs.found) console.log(`[score] ${f}`);
    const bo = { compat: opts.compat ?? null, fixes: parseFixes(opts.fixes), mallow: opts.mallow, realm: opts.realm, tod: opts.tod, sound: opts.sound ? JSON.parse(opts.sound) : {} };
    const r = await withHeavyLock({ mode: 'shared', label: `score ${path.basename(pos[1])}` },
      () => scoreToWav(inputs, bo, pos[1], { check: !!opts.check, log: (l) => console.log(`[score] ${l}`) }));
    for (const l of summarize(r, pos[1])) console.log(l);
    if (opts.plan) { assertWritable(opts.plan); fs.writeFileSync(opts.plan, `${JSON.stringify({ plan: r.plan, report: r.report }, null, 1)}\n`); }
    // a farm job (cues.json beside job.json): the plan qa/gates reads, beside the score
    if (inputs.job && path.resolve(path.dirname(pos[1])) === path.resolve(path.dirname(inputs.cuesPath))) {
      console.log(`[score] wrote ${writeScorePlan(path.join(path.dirname(pos[1]), 'score-plan.json'), r.plan, r.report)}`);
    }
    if (opts.check) { assertWritable(opts.check); fs.writeFileSync(opts.check, `${JSON.stringify({ report: r.report, master: r.master, check: r.check, ms: r.ms }, null, 1)}\n`); }
    return r.check && !r.check.gAudio.pass ? 1 : 0;
  } catch (e) {
    console.error(`[score] ${e.message}`);
    return 1;
  }
}
