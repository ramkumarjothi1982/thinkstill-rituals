// Review gallery v1 (WP-05): one static page per batch for the owner (G-HUMAN).
//
//   node gallery/build.mjs <batch-dir | target ...> [--out dir] [--title text] [--qa]
//                                                         (= hm qa gallery ...)
//
// For every video it shows the preview MP4, the spec, the QA badges with each
// gate's checks, the contact sheet and the gag and ritual filmstrips, the loop
// seam played twice, the waveform with cue markers, the nearest ledger
// neighbours (G-DUPES), a side-by-side with the approved v2 for T01-style
// videos, the AUDIT-v2 ten-question checklist and copyable approve/reject
// commands. The owner's verdicts, reason codes, notes and checklist answers
// are exported as decisions.json (hm-review-decisions/1, for `hm review
// import`). Nothing is posted and nothing leaves the machine.
//
// The page is self-contained: index.html (template.html with the data inlined,
// no external fonts or scripts) plus a media/ folder with relative links, so it
// opens offline from the file system. QA runs first for a video without a
// report (or for every video with --qa).

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { WORK, studioPath, studioRel, assertWritable } from '../render/lib/paths.mjs';
import { expandTarget, loadContext, V2_TARGET } from '../qa/gates/context.mjs';

export const DECISIONS_SCHEMA = 'hm-review-decisions/1';
export const REASONS = Object.freeze(['acting', 'timing', 'copy', 'world', 'face', 'sameness', 'brand', 'other']);
export const PREVIEW_MAX_BYTES = 15 * 1024 * 1024;           // OWNER-DECISIONS Q3: shareable previews of 15 MB or less
/** AUDIT-v2's ten questions (the owner's own checklist). {m} is the Mallow's name. */
export const CHECKLIST = Object.freeze([
  'Does {m} feel alive?', 'Is the motion physically believable?', 'Is the face compelling?', 'Is it truly sharp at 1080 x 1920?',
  'Is the cinematography premium?', 'Is the first second captivating?', 'Soothing and satisfying?', 'Is the sound synced?',
  'Does the ending encourage replay?', 'Is it worth sharing?',
]);
const TEMPLATE = studioPath('gallery', 'template.html');
const FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf';

function ffmpeg(args) {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-y', '-nostdin', ...args], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`ffmpeg ${args.slice(0, 4).join(' ')}: ${r.stderr.trim().slice(-300)}`);
}

const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);
const esc = (s) => String(s).replace(/'/g, "'\\''");

/** A preview of at most 15 MB: the render's own preview when it has one, else an encode. */
function preview(ctx, out) {
  const own = [path.join(path.dirname(ctx.video), 'preview.mp4'), ctx.video.replace(/\.mp4$/, '.preview.mp4')].find((f) => f !== ctx.video && fs.existsSync(f));
  if (own && fs.statSync(own).size <= PREVIEW_MAX_BYTES) { fs.copyFileSync(own, out); return { source: studioRel(own) ?? own, encoded: false }; }
  for (const crf of [23, 26, 29]) {
    ffmpeg(['-i', ctx.video, '-c:v', 'libx264', '-preset', 'medium', '-crf', String(crf), '-pix_fmt', 'yuv420p', '-threads', '2',
      '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', out]);
    if (fs.statSync(out).size <= PREVIEW_MAX_BYTES) return { source: `x264 CRF ${crf}`, encoded: true };
  }
  return { source: 'x264 CRF 29 (still over 15 MB)', encoded: true };
}

/** The loop seam played twice: last 1.5 s, first 1.5 s, twice, at half size, with sound. */
function seamTwice(ctx, out, D) {
  const a = Math.max(0, D - 1.5);
  const parts = [], labels = [];
  for (let k = 0; k < 2; k++) {
    parts.push(`[0:v]trim=start=${a},setpts=PTS-STARTPTS,scale=540:960[t${k}];[0:a]atrim=start=${a},asetpts=PTS-STARTPTS[ta${k}]`);
    parts.push(`[1:v]trim=end=1.5,setpts=PTS-STARTPTS,scale=540:960[h${k}];[1:a]atrim=end=1.5,asetpts=PTS-STARTPTS[ha${k}]`);
    labels.push(`[t${k}][ta${k}][h${k}][ha${k}]`);
  }
  ffmpeg(['-i', ctx.video, '-i', ctx.video, '-filter_complex', `${parts.join(';')};${labels.join('')}concat=n=4:v=1:a=1[v][a]`,
    '-map', '[v]', '-map', '[a]', '-c:v', 'libx264', '-preset', 'fast', '-crf', '22', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', out]);
}

/** Side by side with the approved v2 (T01-style videos): candidate left, v2 right, half size. */
function sideBySide(ctx, v2video, out) {
  const label = (t) => `drawtext=fontfile=${FONT}:text='${esc(t)}':x=(w-text_w)/2:y=18:fontsize=22:fontcolor=white:box=1:boxcolor=0x0e0c18@0.6:boxborderw=8`;
  ffmpeg(['-i', ctx.video, '-i', v2video, '-filter_complex',
    `[0:v]scale=540:960,${label('this video')}[a];[1:v]scale=540:960,${label('approved v2')}[b];[a][b]hstack=inputs=2,format=yuv420p[v]`,
    '-map', '[v]', '-map', '0:a?', '-shortest', '-c:v', 'libx264', '-preset', 'fast', '-crf', '24', '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', out]);
}

const t01Style = (ctx) => ctx.spec?.template?.startsWith('T01') || ctx.legacy?.id === 'my-brain-at-2am-v2' || ctx.direction?.meta?.template?.startsWith('T01');

function specTable(ctx) {
  const s = ctx.spec;
  if (!s) return ctx.direction ? [['direction', ctx.direction.meta.id], ['template', ctx.direction.meta.template], ['realm', ctx.direction.realm?.id]] : [];
  return [
    ['id', s.id], ['template', s.template], ['Mallow', s.mallow], ['realm / ToD', `${s.realm} / ${s.tod}`], ['duration', `${s.duration} s`],
    ['gag', `${s.gag.id} @ ${s.gag.intensity}`], ['metaphor', s.metaphor], ['turn', s.turn], ['ritual', s.ritual], ['loop', s.loop], ['camera', s.camera], ['arc', s.arc],
    ['hook', s.copy.hook.join(' / ')], ['lines', s.copy.lines.join(' | ')], ['end', `${s.copy.end.kind}: ${s.copy.end.text.join(' / ')}`],
    ['mode', `${s.mode}${s.internal ? ' (INTERNAL)' : ''}${s.channel ? `, ${s.channel} ${s.plannedFor}` : ''}`], ['seed', s.seed], ['fingerprint', s.fingerprint],
  ];
}

function gatesView(report) {
  return Object.entries(report.gates).map(([id, g]) => ({
    id, status: g.pass === true ? (g.warn ? 'warn' : 'pass') : g.pass === false ? 'fail' : 'na', reason: g.reason || null,
    checks: Object.entries(g.checks || {}).map(([name, c]) => ({ name, status: c.status, detail: c.detail, value: typeof c.value === 'object' ? JSON.stringify(c.value) : c.value, limit: typeof c.limit === 'object' ? JSON.stringify(c.limit) : c.limit, reportOnly: !!c.reportOnly })),
  }));
}

/** Gallery data and media of one target. */
async function item(desc, mediaRoot, opts, log, used) {
  const { qaOne } = await import('../qa/run-qa.mjs');
  const ctx = await loadContext(desc, {});
  if (!ctx.video) return null;
  let reportFile = path.join(ctx.outDir, 'report.json');
  let report = fs.existsSync(reportFile) ? JSON.parse(fs.readFileSync(reportFile, 'utf8')) : null;
  if (!report || opts.qa || report.video?.sha256 !== ctx.videoSha256) {
    log(`  QA ${ctx.label}`);
    const { withHeavyLock } = await import('../render/lib/heavy-lock.mjs');
    report = await withHeavyLock({ mode: 'shared', label: `qa ${ctx.label}` }, () => qaOne(desc, {}));
    reportFile = path.join(ctx.outDir, 'report.json');
  }
  const id = ctx.spec?.id || ctx.label;
  // a variant's id is unique in a batch; ad-hoc galleries (fixtures) may repeat one, so media and UI state key on a slug
  const base = (desc.kind === 'dir' ? id : ctx.label).replace(/[^A-Za-z0-9._-]+/g, '_');
  let slug = base;
  for (let k = 2; used.has(slug); k++) slug = `${base}-${k}`;
  used.add(slug);
  const dir = path.join(mediaRoot, slug);
  fs.mkdirSync(dir, { recursive: true });
  const rel = (f) => path.relative(path.dirname(mediaRoot), f).split(path.sep).join('/');
  const media = {};
  const { withHeavyLock } = await import('../render/lib/heavy-lock.mjs');
  await withHeavyLock({ mode: 'shared', label: `gallery ${slug}` }, async () => {
    const pv = preview(ctx, path.join(dir, 'preview.mp4'));
    media.preview = { file: rel(path.join(dir, 'preview.mp4')), bytes: fs.statSync(path.join(dir, 'preview.mp4')).size, source: pv.source };
    seamTwice(ctx, path.join(dir, 'seam-twice.mp4'), ctx.duration || 15);
    media.seam = rel(path.join(dir, 'seam-twice.mp4'));
    const v2 = await loadContext({ kind: 'manifest', path: V2_TARGET });
    if (t01Style(ctx) && ctx.videoSha256 !== v2.videoSha256) {
      sideBySide(ctx, v2.video, path.join(dir, 'vs-v2.mp4'));
      media.sideBySide = rel(path.join(dir, 'vs-v2.mp4'));
    }
  });
  const copyArt = (name) => {
    const f = path.join(path.dirname(reportFile), 'artefacts', name);
    if (!fs.existsSync(f)) return null;
    fs.copyFileSync(f, path.join(dir, name));
    return rel(path.join(dir, name));
  };
  for (const [k, n] of [['contactSheet', 'contact-sheet.jpg'], ['gagStrip', 'strip-gag.jpg'], ['ritualStrip', 'strip-ritual.jpg'], ['waveform', 'waveform.png'],
    ['seamPair', 'seam-pair.jpg'], ['logo', 'logo-logo.png'], ['poster', 'poster.jpg'], ['safezone', 'safezone-worst.jpg']]) {
    const r = copyArt(n);
    if (r) media[k] = r;
  }
  const mallow = cap(ctx.spec?.mallow || ctx.direction?.mallow?.id || 'the Mallow');
  return {
    key: slug, id, label: ctx.label, batch: ctx.spec?.batch || null, fingerprint: ctx.spec?.fingerprint || null, mode: ctx.spec?.mode || null, internal: ctx.spec?.internal ?? null,
    video: { file: studioRel(ctx.video) ?? ctx.video, sha256: ctx.videoSha256 },
    qa: { status: report.status, pass: report.pass, failed: report.failed, pending: report.pending, warnings: report.warnings, report: studioRel(reportFile) ?? reportFile,
      reportSha256: crypto.createHash('sha256').update(fs.readFileSync(reportFile)).digest('hex'), at: report.at, seconds: report.timings?.total },
    spec: specTable(ctx), gates: gatesView(report),
    neighbours: report.gates['G-DUPES']?.metrics?.nearest || [],
    media,
    checklist: CHECKLIST.map((q) => q.replace('{m}', mallow)),
    commands: {
      approve: ctx.spec ? `node cli/hm.mjs approve ${id}` : null,
      reject: ctx.spec ? `node cli/hm.mjs reject ${id} --reason <${REASONS.join('|')}> --note "..."` : null,
    },
  };
}

/** Build the gallery. → { dir, index, items } */
export async function buildGallery(targets, { out = null, title = null, qa = false, log = console.log } = {}) {
  const descs = targets.flatMap((t) => expandTarget(t));
  if (!descs.length) throw new Error('nothing to show');
  const batchDir = targets.length === 1 && fs.existsSync(targets[0]) && fs.statSync(targets[0]).isDirectory() && descs.length >= 1 && descs[0].kind === 'dir' && path.resolve(targets[0]) !== descs[0].path
    ? path.resolve(targets[0]) : null;
  const dir = assertWritable(path.resolve(out || (batchDir ? path.join(batchDir, 'gallery') : path.join(WORK, 'gallery', descs[0].kind === 'manifest' ? path.basename(path.dirname(descs[0].path)) : path.basename(descs[0].path)))));
  fs.mkdirSync(path.join(dir, 'media'), { recursive: true });
  const items = [], used = new Set();
  for (const d of descs) {
    log(`gallery: ${d.kind === 'manifest' ? path.basename(path.dirname(d.path)) : path.basename(d.path)}`);
    const it = await item(d, path.join(dir, 'media'), { qa }, log, used);
    if (it) items.push(it);
  }
  const data = {
    schema: 'hm-gallery/1', title: title || (batchDir ? `Batch ${path.basename(batchDir)}` : 'Review'), batch: batchDir ? path.basename(batchDir) : null,
    generatedAt: new Date().toISOString(), reasons: REASONS, decisionsSchema: DECISIONS_SCHEMA, items,
  };
  const html = fs.readFileSync(TEMPLATE, 'utf8').replace('/*__GALLERY_DATA__*/null', JSON.stringify(data).replace(/</g, '\\u003c'));
  const index = path.join(dir, 'index.html');
  fs.writeFileSync(index, html);
  fs.writeFileSync(path.join(dir, 'gallery.json'), `${JSON.stringify(data, null, 1)}\n`);
  log(`gallery: ${items.length} videos -> ${index}`);
  return { dir, index, items };
}

export async function main(argv, { log = console.log } = {}) {
  const o = { targets: [], qa: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--out') o.out = argv[++i];
    else if (a === '--title') o.title = argv[++i];
    else if (a === '--qa') o.qa = true;
    else if (a.startsWith('--')) throw Object.assign(new Error(`unknown option ${a}`), { usage: true });
    else o.targets.push(a);
  }
  if (!o.targets.length) throw Object.assign(new Error('gallery needs a batch directory or targets'), { usage: true });
  await buildGallery(o.targets, { ...o, log });
  return 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { confine } = await import('../render/lib/write-jail.mjs');
  await confine();
  try {
    process.exitCode = await main(process.argv.slice(2));
  } catch (e) {
    console.error(`gallery: ${e.message}`);
    process.exitCode = e.usage ? 2 : 1;
  }
}
