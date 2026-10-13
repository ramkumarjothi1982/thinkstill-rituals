// Validates templates/story-library.json: copy limits, references, Mallow/realm/time
// compatibility, ritual durations per beat clock, library-wide line dedupe and the
// medical/therapy copy lint. Exit code 1 on any error.
//
//   node templates/validate-library.mjs            # report
//   node templates/validate-library.mjs --quiet    # errors only

import { readFileSync } from 'node:fs';

const lib = JSON.parse(readFileSync(new URL('./story-library.json', import.meta.url), 'utf8'));
const quiet = process.argv.includes('--quiet');
const errors = [], warnings = [];
const err = (where, msg) => errors.push(`${where}: ${msg}`);
const warn = (where, msg) => warnings.push(`${where}: ${msg}`);

const MALLOW_IDS = Object.keys(lib.mallows);
const keys = (o) => Object.keys(o).filter((k) => !k.startsWith('$'));
const GAGS = keys(lib.gags), RITUALS = keys(lib.rituals), METAPHORS = keys(lib.metaphors);
const LOOPS = keys(lib.loops), CAMS = keys(lib.cameras), ARCS = keys(lib.paletteArcs), MOTIFS = keys(lib.scoreMotifs);
const whoCan = (entry) => (entry.mallows === 'all' ? MALLOW_IDS : entry.mallows);

// ---- copy helpers -----------------------------------------------------------
function wrap2(text, max) {           // can this be wrapped into <= 2 lines of <= max chars?
  if (text.length <= max) return [text];
  const words = text.split(' ');
  let best = null;
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(' '), b = words.slice(i).join(' ');
    if (a.length <= max && b.length <= max) {
      const score = Math.abs(a.length - b.length);
      if (!best || score < best.score) best = { lines: [a, b], score };
    }
  }
  return best ? best.lines : null;
}
const BANNED = lib.medicalTherapyFlags.banned, CAUTION = lib.medicalTherapyFlags.caution;
const termRe = (t) => new RegExp(`(^|[^a-z])${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i');
const bannedRes = BANNED.map((t) => [t, new RegExp(`(^|[^a-z0-9])${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[^a-z0-9])`, 'i')]);
const cautionRes = CAUTION.map((t) => [t, termRe(t)]);
function lint(where, text) {
  for (const [t, re] of bannedRes) if (re.test(text)) err(where, `banned medical/therapy/safety term "${t}" in "${text}"`);
  for (const [t, re] of cautionRes) if (re.test(text)) warn(where, `caution term "${t}" in "${text}"`);
  if (/hushmallow/i.test(text) && !/hushmallow/.test(text)) err(where, `brand name must be lowercase in "${text}"`);
  if (/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(text)) err(where, `emoji in "${text}"`);
}
const TIME = Object.entries(lib.timeWords).filter(([k]) => !k.startsWith('$')).map(([k, pats]) => [k.split('|'), pats.map((p) => new RegExp(p, 'i'))]);
function timeClasses(text) {       // union of ToD classes implied by time words (null = no constraint)
  let out = null;
  for (const [classes, res] of TIME) if (res.some((re) => re.test(text))) out = [...new Set([...(out || []), ...classes])];
  return out;
}

const seen = new Map();            // library-wide dedupe
function dedupe(where, text) {
  const k = text.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  if (seen.has(k)) err(where, `duplicate copy "${text}" (also in ${seen.get(k)})`); else seen.set(k, where);
}

// ---- library-level checks ----------------------------------------------------
for (const [d, clock] of Object.entries(lib.beatClocks)) {
  if (d.startsWith('$')) continue;
  const D = +d, w = clock.RITUAL[1] - clock.RITUAL[0];
  if (clock.IMPACT > 1.0) err(`clock ${d}`, 'gag impact must land <= 1.0 s');
  if (Math.abs(D - clock.HOOK_IN - 0.34) > 1e-6) err(`clock ${d}`, 'HOOK_IN must be D-0.34');
  if (clock.CARD_OUT - clock.LOGO < 1.5) err(`clock ${d}`, 'logo card must be visible >= 1.5 s');
  if (clock.CARD_OUT - clock.RESOLVE < 2.0) err(`clock ${d}`, 'resolution must be visible >= 2.0 s');
  if (!(clock.L1 < clock.L2 && clock.L2 < clock.L3 && clock.L3 < clock.PEAK[0] && clock.TURN <= clock.RITUAL[0])) err(`clock ${d}`, 'beat order');
  clock._ritualWindow = w;
}
for (const c of lib.brand.closers) c.forEach((l) => { if (l.length > 28) err('brand.closers', `"${l}" > 28 chars`); lint('brand.closers', l); });
for (const [k, r] of Object.entries(lib.rituals)) {
  if (k.startsWith('$')) continue;
  if (!(r.minDur <= r.idealDur)) err(k, 'minDur > idealDur');
  if (r.mallows !== 'all' && !r.mallows.every((m) => MALLOW_IDS.includes(m))) err(k, 'unknown mallow');
}

// ---- templates ---------------------------------------------------------------
const T = lib.templates;
if (T.length < 24) err('library', `only ${T.length} templates (need >= 24)`);
const ids = new Set();
let hookLong = 0;
const valence = {};
for (const t of T) {
  const W = t.id;
  if (ids.has(W)) err(W, 'duplicate id'); ids.add(W);
  valence[t.feeling.valence] = (valence[t.feeling.valence] || 0) + 1;
  for (const k of ['title', 'feeling', 'mallows', 'tod', 'durations', 'hook', 'gag', 'escalation', 'ritual', 'resolution', 'loop', 'palette', 'camera', 'sound']) if (!(k in t)) err(W, `missing ${k}`);

  // cast + time of day
  const cast = [...t.mallows.primary, ...t.mallows.secondary];
  if (!t.mallows.primary.length) err(W, 'no primary Mallow');
  for (const m of [...cast, ...Object.keys(t.mallows.avoid || {})]) if (!MALLOW_IDS.includes(m)) err(W, `unknown mallow ${m}`);
  for (const m of cast) if (t.mallows.avoid?.[m]) err(W, `${m} both cast and avoided`);
  const todsFor = (m) => (t.tod === 'any' ? lib.mallows[m].tods : lib.mallows[m].tods.filter((x) => t.tod.includes(x)));
  for (const m of cast) if (!todsFor(m).length) err(W, `${m}'s realm has no ToD in ${JSON.stringify(t.tod)}`);
  if (!t.durations.every((d) => lib.beatClocks[d])) err(W, 'unknown duration');

  // hooks
  const hooks = [t.hook.primary, ...t.hook.variants];
  if (t.hook.variants.length < 6) err(W, `only ${t.hook.variants.length} hook variants (need >= 6)`);
  hooks.forEach((h, i) => {
    const w = `${W} hook[${i}]`;
    if (h.length < 1 || h.length > 2) err(w, 'hook must be 1-2 lines');
    for (const l of h) {
      if (l.length > 32) err(w, `"${l}" ${l.length} > 32 chars`);
      if (l.length > 22) hookLong++;
      if (/[a-z]/.test(l)) err(w, `not ALL CAPS: "${l}"`);
      lint(w, l);
    }
    const txt = h.join(' ');
    if ((txt.match(/[?!]/g) || []).length > 1) err(w, `more than one ?/! in "${txt}"`);
    dedupe(w, txt);
    const tc = timeClasses(txt);
    if (tc && !cast.some((m) => todsFor(m).some((x) => tc.includes(x)))) err(w, `time words in "${txt}" fit no cast Mallow's ToD`);
  });

  // escalation
  const e = t.escalation;
  if (!METAPHORS.includes(e.metaphor)) err(W, `unknown metaphor ${e.metaphor}`);
  (e.alts || []).forEach((a) => { if (!METAPHORS.includes(a)) err(W, `unknown metaphor ${a}`); });
  if (e.lines.length !== 3) err(W, 'need exactly 3 primary lines');
  const pool = [...e.lines, ...e.pools.L1, ...e.pools.L2, ...e.pools.L3];
  const variantCount = e.pools.L1.length + e.pools.L2.length + e.pools.L3.length;
  if (variantCount < 6) err(W, `only ${variantCount} thought variants (need >= 6)`);
  for (const k of ['L1', 'L2', 'L3']) if (e.pools[k].length < 2) err(W, `pool ${k} too small`);
  pool.forEach((l) => {
    const w = `${W} line`;
    if (l.length > 28) err(w, `"${l}" ${l.length} > 28 chars`);
    if (!wrap2(l, 17)) err(w, `"${l}" cannot wrap into 2 bubble lines of <= 17 chars`);
    if (/\b(breath|breathe|inhale|exhale)/i.test(l)) err(w, `breath word in escalation line "${l}"`);
    lint(w, l); dedupe(w, l);
  });

  // gag / ritual availability for every cast member (and per duration)
  const gags = [t.gag.primary, ...t.gag.alts];
  gags.forEach((g) => { if (!GAGS.includes(g)) err(W, `unknown gag ${g}`); });
  const rits = [t.ritual.primary, ...t.ritual.alts];
  rits.forEach((r) => { if (!RITUALS.includes(r)) err(W, `unknown ritual ${r}`); });
  for (const m of cast) {
    if (!gags.some((g) => lib.gags[g] && whoCan(lib.gags[g]).includes(m))) err(W, `no usable gag for ${m}`);
    for (const d of t.durations) {
      const win = lib.beatClocks[d]._ritualWindow;
      if (!rits.some((r) => lib.rituals[r] && whoCan(lib.rituals[r]).includes(m) && lib.rituals[r].minDur <= win + 1e-6)) err(W, `no ritual for ${m} fits the ${d} s window (${win.toFixed(1)} s)`);
    }
  }
  if (rits.includes('R-NAMEIT')) {
    if (!t.nameWords || t.nameWords.length < 3) err(W, 'R-NAMEIT needs >= 3 nameWords');
    (t.nameWords || []).forEach((n) => { if (/[A-Z]/.test(n)) err(W, `nameWord not lowercase: ${n}`); lint(`${W} nameWord`, n); });
  }

  // resolution
  const res = [t.resolution.primary, ...t.resolution.variants];
  if (t.resolution.variants.length < 2) err(W, 'need >= 2 resolution variants');
  res.forEach((r, i) => {
    const w = `${W} resolution[${i}]`;
    const lines = Array.isArray(r) ? r : r.lines;
    if (!Array.isArray(r) && !r.only.every((m) => cast.includes(m))) err(w, `'only' Mallow not in cast`);
    if (lines.length < 1 || lines.length > 2) err(w, '1-2 lines');
    lines.forEach((l) => { if (l.length > 28) err(w, `"${l}" ${l.length} > 28 chars`); lint(w, l); });
    const txt = lines.join(' ');
    dedupe(w, txt);
    const tc = timeClasses(txt);
    if (tc && !cast.some((m) => todsFor(m).some((x) => tc.includes(x)))) err(w, `time words in "${txt}" fit no cast Mallow's ToD`);
  });

  // references
  if (!LOOPS.includes(t.loop.strategy)) err(W, `unknown loop ${t.loop.strategy}`);
  if (!ARCS.includes(t.palette)) err(W, `unknown palette arc ${t.palette}`);
  t.camera.forEach((c) => { if (!CAMS.includes(c)) err(W, `unknown camera ${c}`); });
  t.sound.motifs.forEach((m) => { if (!MOTIFS.includes(m)) err(W, `unknown motif ${m}`); });
  if (!t.sound.motifs.includes('MO-CLOSE')) err(W, 'MO-CLOSE (content gesture + logo chime) is mandatory');
}

const pos = (valence.positive || 0) + (valence.mixed || 0);
if (pos / T.length < 0.25) err('library', `positive+mixed templates ${pos}/${T.length} < 25%`);

// ---- report ------------------------------------------------------------------
const lines = T.reduce((n, t) => n + 3 + t.escalation.pools.L1.length + t.escalation.pools.L2.length + t.escalation.pools.L3.length, 0);
const hooksN = T.reduce((n, t) => n + 1 + t.hook.variants.length, 0);
const resN = T.reduce((n, t) => n + 1 + t.resolution.variants.length, 0);
if (!quiet) {
  console.log(`templates ${T.length} | hooks ${hooksN} | thought lines ${lines} | resolutions ${resN} | valence ${JSON.stringify(valence)}`);
  console.log(`gags ${GAGS.length} | metaphors ${METAPHORS.length} | rituals ${RITUALS.length} | loops ${LOOPS.length} | cameras ${CAMS.length} | palette arcs ${ARCS.length} | motifs ${MOTIFS.length}`);
  console.log(`hook lines > 22 chars (auto-fit below 76 px): ${hookLong}`);
  for (const w of warnings) console.log(`warn  ${w}`);
}
for (const e of errors) console.log(`ERROR ${e}`);
console.log(errors.length ? `FAILED: ${errors.length} error(s)` : 'OK');
process.exit(errors.length ? 1 : 0);
