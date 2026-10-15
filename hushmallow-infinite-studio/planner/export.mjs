// hm export: hand an approved final to the owner for manual posting.
// Writes <variant>/export/{final.mp4, caption.txt, metadata.json}. Nothing is
// ever posted automatically. Recording that the owner did post it
// (--mark-posted) is a separate, explicit step that appends to the ledger
// (published + copy-usage), which drives cooldowns.
//
// An export happens only when all of this holds (exportBlockers):
//   - the spec is a production spec (never review/INTERNAL) of final quality
//     (never a draft, which is a half-resolution render with the DRAFT mark,
//     nor a proof, which is stills); a render provenance.json next to
//     final.mp4, when there is one, must describe this video, rendered with a
//     full-quality, unmarked profile (final or exact);
//   - G-SPEC passes today, in the spec's batch and against the ledger, so
//     every copy string is a library string and mode/channel agree;
//   - a spec of a planned batch is exactly what hm plan wrote;
//   - the latest decision approves exactly this spec (whole-spec hash);
//   - final.mp4 exists, and qa/report.json judged that very file and spec
//     with every gate run and passed, the required gates included
//     (policy.export.requiredQaGates), unless the owner passes --skip-qa.
// The caption is assembled from the library's own entries (the hook and the
// resolution or brand closer the spec names, located in
// templates/story-library.json) plus the owner-curated hashtag list in
// library/brand.json (OWNER-DECISIONS D8): no generated copy. `hm export`
// has no way to name another hashtag file; exportVariant reads the brand
// file itself and metadata.json records the file it actually read (path and
// sha256), so the stated provenance is always the real one. Every hashtag
// passes the copy lint, searched inside its glued words (lintHashtag).

import fs from 'node:fs';
import path from 'node:path';
import { studioPath, assertWritable, studioRel } from '../render/lib/paths.mjs';
import { sha256Hex, pretty } from './canonical.mjs';
import { visibleSlots } from './fingerprint.mjs';
import { latestDecision, appendLedger } from './ledger.mjs';
import { lintCaption, lintHashtag, lintString, errorsOf } from './lint-copy.mjs';
import { copyTexts, channelContext, checkSchedule } from './schedule.mjs';
import { hooksOf, resolutionsOf } from './library.mjs';
import { specHash, planProvenance, shapeProblems, gspecOf } from './integrity.mjs';

export const BRAND_FILE = studioPath('library', 'brand.json');
const LIBRARY_REL = 'templates/story-library.json';
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Where a file is, as metadata states it: studio-relative inside the studio, else absolute. */
const provenancePath = (file) => studioRel(file) ?? path.resolve(file);

/**
 * library/brand.json, checked: { schema: 'hm-brand/1', hashtags: { curatedBy, list: [...] } }.
 * With { lib, policy }, every hashtag must also pass the copy lint (whole
 * words and glued terms). → the parsed file plus provenance: { file, sha256 }
 * of the bytes actually read.
 */
export function loadBrand(file = BRAND_FILE, { lib = null, policy } = {}) {
  const bytes = fs.readFileSync(file);
  const b = JSON.parse(bytes.toString('utf8'));
  if (b.schema !== 'hm-brand/1') throw new Error(`${file}: schema must be hm-brand/1`);
  const list = b.hashtags?.list;
  if (!Array.isArray(list) || !list.every((h) => typeof h === 'string' && /^#[a-z0-9_]{1,40}$/.test(h))) {
    throw new Error(`${file}: hashtags.list must be lowercase #tags (letters, digits, _)`);
  }
  if (new Set(list).size !== list.length) throw new Error(`${file}: hashtags.list has duplicates`);
  if (typeof b.hashtags.curatedBy !== 'string' || !b.hashtags.curatedBy) throw new Error(`${file}: hashtags.curatedBy must name who curated the list`);
  if (lib) {
    const bad = list.flatMap((h) => errorsOf([...lintString(h, 'caption', { lib, policy, where: h }), ...lintHashtag(h, { lib, policy, where: h })]));
    if (bad.length) throw new Error(`${file}: hashtags fail the copy lint:\n  ${[...new Set(bad.map((i) => `${i.where}: ${i.message}`))].join('\n  ')}`);
  }
  return { ...b, provenance: { file: provenancePath(file), sha256: sha256Hex(bytes) } };
}

/**
 * Locate the spec's caption copy in the library. → { hook: { lines, source }, end: { lines, source } }
 * lines are the library's own arrays; source is the exact library path. Throws
 * when the spec's copy is not a library entry of its template.
 */
export function captionSources(spec, lib) {
  const t = lib.template(spec.template);
  if (!t) throw new Error(`unknown template ${spec.template}`);
  const hooks = hooksOf(t);
  const hi = hooks.findIndex((h) => same(h, spec.copy?.hook));
  if (hi < 0) throw new Error(`hook "${[].concat(spec.copy?.hook).join(' / ')}" is not a ${t.id} hook in ${LIBRARY_REL}`);
  const hook = { lines: hooks[hi], source: `${LIBRARY_REL} ${t.id} hook.${hi === 0 ? 'primary' : `variants[${hi - 1}]`}` };
  const text = spec.copy?.end?.text;
  let end;
  if (spec.copy?.end?.kind === 'resolution') {
    const rs = resolutionsOf(t);
    const ri = rs.findIndex((r) => same(r.lines, text));
    if (ri < 0) throw new Error(`resolution "${[].concat(text).join(' / ')}" is not a ${t.id} resolution in ${LIBRARY_REL}`);
    end = { lines: rs[ri].lines, source: `${LIBRARY_REL} ${t.id} resolution.${ri === 0 ? 'primary' : `variants[${ri - 1}]`}` };
  } else if (spec.copy?.end?.kind === 'closer') {
    const ci = lib.raw.brand.closers.findIndex((c) => same(c, text));
    if (ci < 0) throw new Error(`closer "${[].concat(text).join(' / ')}" is not a brand closer in ${LIBRARY_REL}`);
    end = { lines: lib.raw.brand.closers[ci], source: `${LIBRARY_REL} brand.closers[${ci}]` };
  } else throw new Error(`end card kind must be resolution or closer, not ${spec.copy?.end?.kind}`);
  return { hook, end };
}

/** caption.txt: the library hook, the library end-card text, then the owner's hashtags. */
export function buildCaption(spec, brand, lib) {
  const { hook, end } = captionSources(spec, lib);
  const parts = [hook.lines.join(' '), end.lines.join(' ')];
  if (brand.hashtags.list.length) parts.push(brand.hashtags.list.join(' '));
  return `${parts.join('\n\n')}\n`;
}

/**
 * Problems with a QA report for an export (empty = acceptable).
 * The report must name the video it judged (video.sha256, with or without a
 * 'sha256:' prefix) and the spec (spec.fingerprint), list at least one gate,
 * and every gate must have pass === true: false means failed, null or a
 * missing pass means the gate did not run. Each required gate must be
 * present by name or as sub-gates '<gate>:<part>' (or '-', '/', '.', ' ').
 */
export function qaProblems(report, { videoSha256, fingerprint, required = [] }) {
  if (!report || typeof report !== 'object' || Array.isArray(report)) return ['qa/report.json is not a JSON object'];
  const out = [];
  const gates = report.gates;
  if (!gates || typeof gates !== 'object' || Array.isArray(gates)) return ['qa/report.json has no gates object: nothing was checked'];
  const names = Object.keys(gates);
  if (!names.length) out.push('qa/report.json lists no gates: nothing was checked');
  const vsha = typeof report.video?.sha256 === 'string' ? report.video.sha256.replace(/^sha256:/, '') : '';
  if (!vsha) out.push('qa/report.json does not name the video it judged (video.sha256)');
  else if (vsha !== videoSha256) out.push(`qa/report.json judged another video (video.sha256 ${vsha.slice(0, 12)}..., final.mp4 is ${videoSha256.slice(0, 12)}...); re-run QA`);
  if (!report.spec?.fingerprint) out.push('qa/report.json does not name the spec it judged (spec.fingerprint)');
  else if (report.spec.fingerprint !== fingerprint) out.push(`qa/report.json judged spec ${report.spec.fingerprint}, not ${fingerprint}`);
  const failed = names.filter((k) => gates[k] && gates[k].pass === false);
  const notRun = names.filter((k) => !gates[k] || typeof gates[k] !== 'object' || (gates[k].pass !== true && gates[k].pass !== false));
  if (failed.length) out.push(`QA gates failed: ${failed.join(', ')}`);
  if (notRun.length) out.push(`QA gates did not run (pass must be true or false): ${notRun.join(', ')}`);
  for (const r of required) {
    const re = new RegExp(`^${escapeRe(r)}(?:$|[:/. -])`);
    if (!names.some((n) => re.test(n))) out.push(`required QA gate ${r} is missing from qa/report.json`);
  }
  return out;
}

/** Why a spec quality other than final is never exported. */
const QUALITY_WHY = Object.freeze({
  draft: 'a draft is a review render at half resolution with the DRAFT mark burned in',
  proof: 'a proof is 6 stills for a look, not a video',
});
/** Render profiles that make a full-quality, unmarked master (engine/render/profiles.js). */
export const EXPORT_PROFILES = Object.freeze(['final', 'exact']);

/**
 * The render's own record of how final.mp4 was made, when the render farm
 * left provenance.json next to it (hm-provenance/1: job.params.profile,
 * scale, mark; final.sha256). It must describe this very video and a
 * full-quality, unmarked profile. Without a provenance.json the spec's
 * quality and the QA report (G-FINAL checks the DRAFT/INTERNAL mark) are the
 * evidence. → { render: { profile, scale, mark, encoder, provenance } | null, problems: [] }
 */
export function renderProvenance(dir, videoSha256) {
  const file = path.join(dir, 'provenance.json');
  if (!fs.existsSync(file)) return { render: null, problems: [] };
  let prov;
  try { prov = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { return { render: null, problems: [`provenance.json is not JSON (${e.message})`] }; }
  const params = prov?.job?.params || {};
  const render = { profile: params.profile ?? null, scale: params.scale ?? null, mark: params.mark ?? null, encoder: params.encoder ?? null, provenance: { file: 'provenance.json', sha256: sha256Hex(fs.readFileSync(file)) } };
  const problems = [];
  const madeSha = typeof prov?.final?.sha256 === 'string' ? prov.final.sha256.replace(/^sha256:/, '') : null;
  if (madeSha !== videoSha256) problems.push(`provenance.json describes another video (final.sha256 ${madeSha ? `${madeSha.slice(0, 12)}...` : 'missing'}, final.mp4 is ${videoSha256.slice(0, 12)}...)`);
  if (!EXPORT_PROFILES.includes(render.profile)) problems.push(`final.mp4 was rendered with the "${render.profile}" profile (provenance.json); only ${EXPORT_PROFILES.join(' or ')} renders are exported`);
  if (render.mark) problems.push(`final.mp4 carries the ${render.mark} mark (provenance.json); a marked render is never exported`);
  if (render.scale !== null && render.scale !== 1) problems.push(`final.mp4 was rendered at scale ${render.scale} (provenance.json); only full-resolution renders are exported`);
  return { render, problems };
}

/**
 * Why an export must not happen (empty = allowed).
 * ctx: { lib, caps, policy, ledger, file (spec.json path), dir (variant dir), skipQa? }
 */
export function exportBlockers(spec, ctx) {
  const { ledger, dir, file, policy, skipQa = false } = ctx;
  const shape = shapeProblems(spec);
  if (shape.length) return shape;
  const out = [];
  if (spec.internal || spec.mode !== 'production') out.push('review/INTERNAL specs are never exported (re-plan it as a production spec)');
  if (spec.quality !== 'final') out.push(`spec quality is "${spec.quality}": only final-quality renders are exported (${QUALITY_WHY[spec.quality] || 'unknown quality'}); re-plan it with --quality final and render it with the final profile`);
  const g = gspecOf(file, spec, ctx);
  for (const e of g.errors) out.push(`G-SPEC ${e.rule}: ${e.message}`);
  const prov = planProvenance(file, spec);
  if (prov.problem) out.push(prov.problem);
  const d = latestDecision(ledger, spec.id);
  if (!d || d.verdict !== 'approve') out.push(d ? `the latest decision for ${spec.id} is "${d.verdict}"` : `${spec.id} has not been approved (hm approve ${spec.id})`);
  else if (d.specHash !== specHash(spec)) out.push(`spec.json changed since it was approved (approved ${d.specHash.slice(7, 19)}, now ${specHash(spec).slice(7, 19)}); review and approve it again`);
  const video = path.join(dir, 'final.mp4');
  const hasVideo = fs.existsSync(video) && fs.statSync(video).size > 0;
  if (!hasVideo) out.push(`no final.mp4 (or an empty one) in ${dir}`);
  else out.push(...renderProvenance(dir, sha256Hex(fs.readFileSync(video))).problems);
  if (!skipQa) {
    const qa = path.join(dir, 'qa', 'report.json');
    if (!fs.existsSync(qa)) out.push(`no QA report (${qa}); run QA first or pass --skip-qa`);
    else {
      let rep = null;
      try { rep = JSON.parse(fs.readFileSync(qa, 'utf8')); } catch (e) { out.push(`qa/report.json is not JSON (${e.message})`); }
      if (rep !== null) {
        const videoSha256 = hasVideo ? sha256Hex(fs.readFileSync(video)) : '';
        out.push(...qaProblems(rep, { videoSha256, fingerprint: spec.fingerprint, required: policy.export.requiredQaGates }));
      }
    }
  }
  return out;
}

/**
 * Export an approved final. → { outDir, files, caption, metadata }
 * opts: { lib, caps, policy, ledger, file (spec.json), dir (variant dir), spec, out?, skipQa?, at (ISO, for metadata),
 *         brandFile? (default library/brand.json; read here, so metadata names the file actually used) }
 */
export function exportVariant(opts) {
  const { lib, ledger, dir, file, spec, out, skipQa = false, at, brandFile = BRAND_FILE } = opts;
  if ('brand' in opts) throw new Error('exportVariant reads the hashtag file itself (brandFile), so its provenance is the file it read; do not pass a brand object');
  const blockers = exportBlockers(spec, opts);
  if (blockers.length) throw new Error(`cannot export ${spec.id}:\n  ${blockers.join('\n  ')}`);
  const brand = loadBrand(brandFile, { lib, policy: opts.policy });
  const { hook, end } = captionSources(spec, lib);
  const caption = buildCaption(spec, brand, lib);
  const lint = errorsOf(lintCaption(caption, { lib, policy: opts.policy }));
  if (lint.length) throw new Error(`caption fails copy lint:\n  ${lint.map((i) => i.message).join('\n  ')}`);
  const outDir = assertWritable(out ? path.resolve(out) : path.join(dir, 'export'));
  fs.mkdirSync(outDir, { recursive: true });
  const video = path.join(dir, 'final.mp4');
  fs.copyFileSync(video, path.join(outDir, 'final.mp4'));
  fs.writeFileSync(path.join(outDir, 'caption.txt'), caption);
  const t = lib.template(spec.template);
  const d = latestDecision(ledger, spec.id);
  const qaFile = path.join(dir, 'qa', 'report.json');
  const metadata = {
    schema: 'hm-export/1',
    id: spec.id, title: t.title, template: spec.template, mallow: spec.mallow, realm: spec.realm, tod: spec.tod, duration: spec.duration,
    channel: spec.channel, plannedFor: spec.plannedFor, fingerprint: spec.fingerprint,
    quality: spec.quality,
    render: renderProvenance(dir, sha256Hex(fs.readFileSync(video))).render ?? { profile: null, note: 'no provenance.json next to final.mp4: the spec quality and the QA report are the evidence' },
    spec: { file: path.basename(file), sha256: sha256Hex(fs.readFileSync(file)), hash: specHash(spec), gspec: 'pass', plan: planProvenance(file, spec).planned ? 'matches plan.json' : 'loose spec (no plan.json entry)' },
    video: { file: 'final.mp4', sha256: sha256Hex(fs.readFileSync(video)), bytes: fs.statSync(video).size },
    caption: {
      file: 'caption.txt',
      sources: [hook.source, end.source, ...(brand.hashtags.list.length ? [`${brand.provenance.file} hashtags.list (sha256 ${brand.provenance.sha256.slice(0, 12)}, curatedBy "${brand.hashtags.curatedBy}")`] : [])],
    },
    hashtags: { file: brand.provenance.file, sha256: brand.provenance.sha256, curatedBy: brand.hashtags.curatedBy, count: brand.hashtags.list.length, lint: 'pass' },
    approval: { by: d.by, at: d.at, specHash: d.specHash },
    qa: skipQa
      ? { status: 'skipped', reason: 'hm export --skip-qa' }
      : (() => { const rep = JSON.parse(fs.readFileSync(qaFile, 'utf8')); return { status: 'pass', report: { file: 'qa/report.json', sha256: sha256Hex(fs.readFileSync(qaFile)) }, gates: Object.keys(rep.gates) }; })(),
    exportedAt: at,
    posting: 'manual only: nothing is posted automatically. After posting, record it: hm export <id> --mark-posted --channel <channel>',
  };
  fs.writeFileSync(path.join(outDir, 'metadata.json'), pretty(metadata));
  return { outDir, files: ['final.mp4', 'caption.txt', 'metadata.json'], caption, metadata, brand };
}

/**
 * Record that the owner posted an approved spec (ledger: published + copy-usage).
 * The spec must be intact and exactly the approved one; the post itself has
 * already happened, so posting-rule breaches on that channel and date are
 * returned as warnings for the owner rather than refused.
 * opts: { lib, caps, policy, ledger, spec, channel, at, dir (ledger dir) } → { warnings }
 */
export function markPosted({ lib, caps, policy, ledger, spec, channel, at, dir: ledgerDirOpt }) {
  const problems = shapeProblems(spec);
  if (spec.internal || spec.mode !== 'production') problems.push('review/INTERNAL specs are never posted');
  if (spec.quality !== 'final') problems.push(`spec quality is "${spec.quality}": only final-quality videos are exported, so only they are recorded as posted`);
  const d = latestDecision(ledger, spec.id);
  if (!d || d.verdict !== 'approve') problems.push(`${spec.id} is not approved; only approved videos can be recorded as posted`);
  else if (d.specHash !== specHash(spec)) problems.push(`spec.json changed since it was approved (approved ${d.specHash.slice(7, 19)}, now ${specHash(spec).slice(7, 19)})`);
  if (ledger.published.some((p) => p.id === spec.id && p.channel === channel)) problems.push(`${spec.id} is already recorded as posted on ${channel}`);
  if (problems.length) throw new Error(`cannot record ${spec.id} as posted:\n  ${problems.join('\n  ')}`);
  const warnings = [];
  if (spec.channel !== channel) warnings.push(`planned for ${spec.channel}, recorded on ${channel}`);
  const postDay = at.slice(0, 10);
  const sctx = channelContext({ ledger, channel, lib, caps });
  for (const v of checkSchedule({ ...spec, channel, plannedFor: postDay }, sctx, { lib, policy })) warnings.push(`${v.rule}: ${v.message}`);
  const t = lib.template(spec.template);
  appendLedger('published', { id: spec.id, fingerprint: spec.fingerprint, specHash: specHash(spec), channel, postedAt: at, visible: visibleSlots(spec), family: t.feeling.family, valence: t.feeling.valence, batch: spec.batch }, { dir: ledgerDirOpt });
  appendLedger('copy-usage', copyTexts(spec).map((u) => ({ ...u, id: spec.id, channel, at })), { dir: ledgerDirOpt });
  return { warnings };
}
