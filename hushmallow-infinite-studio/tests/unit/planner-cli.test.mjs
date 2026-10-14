// End to end through `node cli/hm.mjs`: plan, spec new/show/check/compile,
// approve, reject, export, --mark-posted, lib coverage. Every run uses a
// temp ledger and temp batch folders under WORK/tmp.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { hm, temp } from '../property/support.mjs';
import { sha256Hex } from '../../planner/canonical.mjs';
import { BRAND_FILE, loadBrand, exportVariant } from '../../planner/export.mjs';
import { loadContext } from '../../planner/cli-support.mjs';

const ls = (d) => fs.readdirSync(d).sort();
const read = (f) => fs.readFileSync(f, 'utf8');
const readSpec = (dir) => JSON.parse(read(path.join(dir, 'spec.json')));
const editSpec = (dir, fn) => { const s = readSpec(dir); fn(s); fs.writeFileSync(path.join(dir, 'spec.json'), `${JSON.stringify(s, null, 2)}\n`); };
/** A dummy final.mp4 and a QA report that judged it, with every required gate passed (override gates/fields). */
function fakeRender(dir, over = {}) {
  fs.writeFileSync(path.join(dir, 'final.mp4'), Buffer.alloc(64, 1));
  fs.mkdirSync(path.join(dir, 'qa'), { recursive: true });
  const rep = { video: { sha256: sha256Hex(fs.readFileSync(path.join(dir, 'final.mp4'))) }, spec: { fingerprint: readSpec(dir).fingerprint },
    gates: { 'G-FINAL': { pass: true }, 'G-AUDIO': { pass: true } }, ...over };
  fs.writeFileSync(path.join(dir, 'qa', 'report.json'), JSON.stringify(rep));
}
/** Plan one production post (seed 42: the only buildable template is T01) → its variant dir. */
function planOne(t, L, args = ['--seed', '42', '--channel', 'tiktok', '--start', '2026-11-03']) {
  const out = path.join(t.dir, `p${fs.readdirSync(t.dir).length}`);
  const r = hm(['plan', '--count', '1', ...args, '--out', out, ...L]);
  assert.equal(r.status, 0, r.out);
  return path.join(out, ls(out).find((f) => f !== 'plan.json'));
}

test('hm plan writes a reproducible review batch; flags are checked', () => {
  const t = temp('cli-plan-');
  try {
    const env = { HM_LEDGER_DIR: path.join(t.dir, 'ledger') };
    const a = hm(['plan', '--count', '4', '--seed', '42', '--review', '--out', path.join(t.dir, 'a')], { env });
    assert.equal(a.status, 0, a.out);
    assert.match(a.stdout, /review batch review-s42: 4\/4 specs planned/);
    const b = hm(['plan', '--count', '4', '--seed', '42', '--review', '--out', path.join(t.dir, 'b')], { env });
    assert.equal(b.status, 0, b.out);
    const files = ls(path.join(t.dir, 'a'));
    assert.equal(files.length, 5, 'plan.json + 4 spec dirs');
    assert.deepEqual(files, ls(path.join(t.dir, 'b')));
    for (const f of files) {
      const rel = f === 'plan.json' ? f : path.join(f, 'spec.json');
      assert.equal(read(path.join(t.dir, 'a', rel)), read(path.join(t.dir, 'b', rel)), `${rel} is byte-identical`);
    }
    assert.equal(hm(['plan', '--count', '2', '--seed', '1'], { env }).status, 2, 'production needs --channel and --start');
    assert.equal(hm(['plan', '--seed', '1', '--review'], { env }).status, 2, '--count is required');
    assert.equal(hm(['plan', '--count', '1', '--review'], { env }).status, 2, 'a seed (or batch name) is required');
    assert.equal(hm(['plan', '--count', '1', '--seed', '1', '--review', '--bogus'], { env }).status, 2);
    const p = hm(['plan', '--count', '3', '--seed', '42', '--channel', 'tiktok', '--start', '2026-11-03', '--dry'], { env });
    assert.equal(p.status, 1, 'only T01 is buildable, so a 3-post plan stops at post 2');
    assert.match(p.stdout, /blocked by: sequence:repeat-template/);
  } finally { t.done(); }
});

test('spec new / show / check / compile', () => {
  const t = temp('cli-spec-');
  try {
    const env = { HM_LEDGER_DIR: path.join(t.dir, 'ledger') };
    const n = hm(['spec', 'new', '--template', 'T01', '--seed', '9', '--out', path.join(t.dir, 'one.json')], { env });
    assert.equal(n.status, 0, n.out);
    const spec = JSON.parse(read(path.join(t.dir, 'one.json')));
    assert.equal(spec.template, 'T01-brain-at-2am');
    assert.equal(spec.mode, 'review');
    assert.equal(hm(['spec', 'new', '--template', 'T26'], { env }).status, 1, 'T26 is not buildable yet');
    const show = hm(['spec', 'show', path.join(t.dir, 'one.json')], { env });
    assert.equal(show.status, 0, show.out);
    assert.match(show.stdout, /G-SPEC PASS/);
    assert.match(show.stdout, /hook +[A-Z]/);
    const bad = { ...spec, mallow: 'zuzu' };
    fs.writeFileSync(path.join(t.dir, 'bad.json'), JSON.stringify(bad));
    const chk = hm(['spec', 'check', path.join(t.dir, 'one.json'), path.join(t.dir, 'bad.json')], { env });
    assert.equal(chk.status, 1);
    assert.match(chk.stdout, /G-SPEC: 1\/2 pass/);
    assert.match(chk.stdout, /ERROR capability:pack/);
    hm(['plan', '--count', '2', '--seed', '3', '--review', '--out', path.join(t.dir, 'batch')], { env });
    // the composer is not built yet; point at an empty place so this stays the "not built" path after WP-03 too
    const c = hm(['spec', 'compile', path.join(t.dir, 'batch')], { env: { ...env, HM_COMPOSER_DIR: path.join(t.dir, 'no-composer') } });
    assert.equal(c.status, 0, c.out);
    assert.match(c.stdout, /compiled 2: 0 failed, 2 incomplete, 0 complete/);
    assert.match(c.stdout, /not run: G-DIR: composer not built yet \(WP-03\)/);
    const id = ls(path.join(t.dir, 'batch')).find((f) => f !== 'plan.json');
    const rep = JSON.parse(read(path.join(t.dir, 'batch', id, 'compile.json')));
    assert.equal(rep.gates['G-SPEC'].pass, true);
    assert.equal(rep.gates['G-DIR'].pass, null);
    assert.equal(rep.gates['G-DIR'].status, 'not-run');
    assert.equal(rep.pass, null, 'a compile without G-DIR is never recorded as passed');
    assert.equal(rep.status, 'incomplete');
    assert.deepEqual(rep.pending, ['G-DIR', 'G-COST']);
    const badRep = hm(['spec', 'compile', path.join(t.dir, 'bad.json')], { env });
    assert.equal(badRep.status, 1);
    const br = JSON.parse(read(path.join(t.dir, 'compile.json')));
    assert.equal(br.pass, false);
    assert.equal(br.status, 'fail');
  } finally { t.done(); }
});

test('approve / reject / export / mark-posted, with the ledger as the record', () => {
  const t = temp('cli-ledger-');
  try {
    const ledger = path.join(t.dir, 'ledger');
    const L = ['--ledger', ledger];
    const dir = planOne(t, L);
    let r = hm(['export', dir, ...L]);
    assert.equal(r.status, 1);
    assert.match(r.stderr, /has not been approved/);
    assert.equal(hm(['reject', dir, ...L]).status, 2, 'a reject needs --reason');
    assert.equal(hm(['reject', dir, '--reason', 'vibes', ...L]).status, 2);
    assert.equal(hm(['reject', dir, '--reason', 'timing', '--at', '2026-11-01T09:00:00Z', ...L]).status, 0);
    assert.equal(hm(['approve', dir, '--at', '2026-11-02T09:00:00Z', ...L]).status, 0);
    r = hm(['approve', dir, ...L]);
    assert.match(r.stdout, /already approved/);
    const decisions = read(path.join(ledger, 'decisions.jsonl')).trim().split('\n').map((l) => JSON.parse(l));
    assert.deepEqual(decisions.map((d) => d.verdict), ['reject', 'approve']);
    const spec = readSpec(dir);
    const plan = JSON.parse(read(path.join(path.dirname(dir), 'plan.json')));
    assert.equal(decisions[1].specHash, plan.specs[0].hash, 'the approval names the exact spec hm plan wrote');
    assert.deepEqual([decisions[1].mode, decisions[1].internal, decisions[1].gspec], ['production', false, { pass: true, errors: [] }]);
    fs.writeFileSync(path.join(dir, 'final.mp4'), Buffer.alloc(64, 1));
    r = hm(['export', dir, ...L]);
    assert.match(r.stderr, /no QA report/);
    fakeRender(dir);
    // hashtags come from library/brand.json only: there is no option to name another file
    const brand = path.join(t.dir, 'brand.json');
    fs.writeFileSync(brand, JSON.stringify({ schema: 'hm-brand/1', hashtags: { curatedBy: 'anyone', list: ['#tiktokmademebuyit', '#fyp'] } }));
    r = hm(['export', dir, '--brand', brand, '--at', '2026-11-02T10:00:00Z', ...L]);
    assert.equal(r.status, 2, r.out);
    assert.match(r.stderr, /Unknown option '--brand'/);
    assert.equal(fs.existsSync(path.join(dir, 'export')), false);
    r = hm(['export', dir, '--at', '2026-11-02T10:00:00Z', ...L]);
    assert.equal(r.status, 0, r.out);
    assert.match(r.stdout, /nothing was posted/);
    assert.match(r.stdout, /library\/brand\.json has no owner-curated hashtags yet/);
    assert.deepEqual(ls(path.join(dir, 'export')), ['caption.txt', 'final.mp4', 'metadata.json']);
    assert.equal(read(path.join(dir, 'export', 'caption.txt')), `${spec.copy.hook.join(' ')}\n\n${spec.copy.end.text.join(' ')}\n`);
    const meta = JSON.parse(read(path.join(dir, 'export', 'metadata.json')));
    assert.equal(meta.fingerprint, spec.fingerprint);
    assert.match(meta.caption.sources[0], /^templates\/story-library\.json T01-brain-at-2am hook\.(primary|variants\[\d\])$/);
    assert.match(meta.caption.sources[1], /^templates\/story-library\.json (T01-brain-at-2am resolution\.(primary|variants\[\d\])|brand\.closers\[\d\])$/);
    assert.equal(meta.caption.sources.length, 2, 'no hashtags, so no third source');
    assert.deepEqual(meta.hashtags, { file: 'library/brand.json', sha256: sha256Hex(fs.readFileSync(BRAND_FILE)), curatedBy: loadBrand().hashtags.curatedBy, count: 0, lint: 'pass' });
    assert.deepEqual([meta.qa.status, meta.qa.gates], ['pass', ['G-FINAL', 'G-AUDIO']]);
    assert.equal(meta.approval.specHash, decisions[1].specHash);
    assert.match(meta.posting, /manual only/);
    assert.equal(fs.existsSync(path.join(ledger, 'published.jsonl')), false, 'exporting is not posting');
    assert.equal(hm(['export', dir, '--mark-posted', '--at', '2026-11-03T18:00:00Z', ...L]).status, 0);
    assert.equal(hm(['export', dir, '--mark-posted', ...L]).status, 1, 'a post is recorded once per channel');
    assert.equal(read(path.join(ledger, 'copy-usage.jsonl')).trim().split('\n').length, 2 + spec.copy.lines.length);
    r = hm(['spec', 'check', dir, ...L]);
    assert.equal(r.status, 0, `a posted spec re-checks clean against its own post: ${r.out}`);
    r = hm(['plan', '--count', '1', '--seed', '7', '--channel', 'tiktok', '--start', '2026-11-04', '--dry', ...L]);
    assert.match(r.stdout, /sequence:repeat-template/, 'the next post sees the recorded one');
  } finally { t.done(); }
});

test('invented copy and edits after planning or approval never reach export or the ledger', () => {
  const t = temp('cli-tamper-');
  try {
    const ledger = path.join(t.dir, 'ledger');
    const L = ['--ledger', ledger];
    // 1. invented copy, re-sealed with the official tool: fingerprint and id agree, G-SPEC does not
    const a = planOne(t, L);
    editSpec(a, (s) => { s.copy.hook = ['BUY OUR NEW STUFF NOW']; s.copy.end.text = ['Use code SAVE20 today.']; });
    assert.equal(hm(['spec', 'seal', path.join(a, 'spec.json'), '--write']).status, 0);
    let r = hm(['approve', a, ...L]);
    assert.equal(r.status, 1);
    assert.match(r.stderr, /G-SPEC copy:hook/);
    assert.match(r.stderr, /G-SPEC copy:end/);
    assert.match(r.stderr, /claims the id .* but hm plan wrote/);
    fakeRender(a);
    r = hm(['export', a, '--skip-qa', ...L]);
    assert.equal(r.status, 1);
    assert.match(r.stderr, /G-SPEC copy:hook/);
    assert.equal(fs.existsSync(path.join(a, 'export')), false);
    // 2. an approved INTERNAL review spec flipped to production by hand (fingerprint unchanged)
    const b = planOne(t, L, ['--seed', '7', '--review']);
    assert.equal(hm(['approve', b, '--at', '2026-11-02T09:00:00Z', ...L]).status, 0);
    editSpec(b, (s) => { s.internal = false; s.mode = 'production'; s.gag.intensity = 1; });
    fakeRender(b);
    r = hm(['export', b, '--skip-qa', ...L]);
    assert.equal(r.status, 1);
    assert.match(r.stderr, /G-SPEC mode: a production spec needs channel and plannedFor/);
    assert.match(r.stderr, /spec\.json changed since it was approved/);
    assert.match(r.stderr, /differs from the spec hm plan wrote/);
    r = hm(['export', b, '--mark-posted', '--channel', 'tiktok', ...L]);
    assert.equal(r.status, 1);
    assert.match(r.stderr, /changed since it was approved/);
    // ... even dressed up as a complete production spec that G-SPEC accepts, it cannot be re-approved
    editSpec(b, (s) => { s.gag.intensity = 0.9; s.channel = 'tiktok'; s.plannedFor = '2026-11-03'; });
    assert.equal(hm(['spec', 'check', b, ...L]).status, 0, 'G-SPEC judges content only');
    r = hm(['approve', b, ...L]);
    assert.equal(r.status, 1);
    assert.match(r.stderr, /differs from the spec hm plan wrote/);
    assert.equal(fs.existsSync(path.join(ledger, 'published.jsonl')), false, 'nothing reached the posting record');
    assert.equal(fs.existsSync(path.join(ledger, 'copy-usage.jsonl')), false);
    // 3. a rejection of a spec G-SPEC refuses is allowed and records why
    r = hm(['reject', a, '--reason', 'copy', '--at', '2026-11-04T09:00:00Z', ...L]);
    assert.equal(r.status, 0, r.out);
    assert.match(r.stdout, /G-SPEC also refuses this spec \(copy:hook, copy:end\)/);
    const last = read(path.join(ledger, 'decisions.jsonl')).trim().split('\n').map((l) => JSON.parse(l)).at(-1);
    assert.deepEqual(last.gspec, { pass: false, errors: ['copy:hook', 'copy:end'] });
  } finally { t.done(); }
});

test('export refuses internal specs, missing videos and every QA report that does not prove a pass', () => {
  const t = temp('cli-qa-');
  try {
    const ledger = path.join(t.dir, 'ledger');
    const L = ['--ledger', ledger];
    const dir = planOne(t, L);
    assert.equal(hm(['approve', dir, '--at', '2026-11-02T09:00:00Z', ...L]).status, 0);
    let r = hm(['export', dir, ...L]);
    assert.equal(r.status, 1);
    assert.match(r.stderr, /no final\.mp4/);
    fakeRender(dir);
    const spec = readSpec(dir);
    const videoSha = sha256Hex(fs.readFileSync(path.join(dir, 'final.mp4')));
    const bound = { video: { sha256: videoSha }, spec: { fingerprint: spec.fingerprint } };
    const cases = [
      [{ gates: { 'G-FINAL': { pass: false } } }, /QA gates failed: G-FINAL/],
      [{ ...bound, gates: {} }, /lists no gates/],
      [{ nothing: 1 }, /no gates object/],
      [{ ...bound, gates: { 'G-FINAL': { pass: true }, 'G-AUDIO': { pass: null } } }, /did not run.*G-AUDIO/],
      [{ ...bound, gates: { 'G-FINAL': { pass: true } } }, /required QA gate G-AUDIO is missing/],
      [{ ...bound, video: { sha256: 'a'.repeat(64) }, gates: { 'G-FINAL': { pass: true }, 'G-AUDIO': { pass: true } } }, /judged another video/],
      [{ gates: { 'G-FINAL': { pass: true }, 'G-AUDIO': { pass: true } } }, /does not name the video/],
    ];
    for (const [rep, re] of cases) {
      fs.writeFileSync(path.join(dir, 'qa', 'report.json'), JSON.stringify(rep));
      r = hm(['export', dir, ...L]);
      assert.equal(r.status, 1, JSON.stringify(rep));
      assert.match(r.stderr, re, JSON.stringify(rep));
      assert.equal(fs.existsSync(path.join(dir, 'export')), false, 'nothing written on a refusal');
    }
    fs.writeFileSync(path.join(dir, 'qa', 'report.json'), 'not json');
    assert.match(hm(['export', dir, ...L]).stderr, /qa\/report\.json is not JSON/);
    // --skip-qa is an explicit, recorded owner override (QA is WP-05)
    r = hm(['export', dir, '--skip-qa', ...L]);
    assert.equal(r.status, 0, r.out);
    assert.match(r.stdout, /QA was skipped/);
    assert.deepEqual(JSON.parse(read(path.join(dir, 'export', 'metadata.json'))).qa, { status: 'skipped', reason: 'hm export --skip-qa' });
    // an approved INTERNAL review spec with a perfect QA report is still never exported
    const rv = planOne(t, L, ['--seed', '7', '--review']);
    assert.equal(hm(['approve', rv, ...L]).status, 0);
    fakeRender(rv);
    r = hm(['export', rv, ...L]);
    assert.equal(r.status, 1);
    assert.match(r.stderr, /review\/INTERNAL specs are never exported/);
    assert.equal(hm(['export', rv, '--mark-posted', '--channel', 'tiktok', ...L]).status, 1);
  } finally { t.done(); }
});

test('hm lib coverage and hm help', () => {
  const c = hm(['lib', 'coverage']);
  assert.equal(c.status, 0, c.out);
  assert.match(c.stdout, /^1\/28 templates plannable in production mode/m);
  assert.match(c.stdout, /T01-brain-at-2am/);
  const all = hm(['lib', 'coverage', '--all']);
  assert.match(all.stdout, /blocked T26-nostalgia/);
  assert.match(all.stdout, /pack blubi: hi-res face assets not derived yet/);
  assert.match(hm(['lib', 'coverage', '--open']).stdout, /28\/28 templates plannable/);
  const h = hm(['help']);
  for (const cmd of ['plan', 'spec new', 'spec show', 'spec check', 'spec compile', 'approve', 'reject', 'export', 'lib coverage', 'lib validate']) assert.match(h.stdout, new RegExp(`hm ${cmd} `));
});

test('exportVariant names the hashtag file it actually read, and refuses tags that fail the copy lint', () => {
  const t = temp('cli-brand-');
  try {
    const ledger = path.join(t.dir, 'ledger');
    const L = ['--ledger', ledger];
    const dir = planOne(t, L);
    assert.equal(hm(['approve', dir, '--at', '2026-11-02T09:00:00Z', ...L]).status, 0);
    fakeRender(dir);
    const ctx = loadContext({ ledger });
    const file = path.join(dir, 'spec.json'), spec = readSpec(dir);
    const brandFile = (name, list, curatedBy = 'test owner') => {
      const f = path.join(t.dir, name);
      fs.writeFileSync(f, JSON.stringify({ schema: 'hm-brand/1', hashtags: { curatedBy, list } }));
      return f;
    };
    // a module caller may point at another file (tests do), but metadata then says which file, with its hash
    const good = brandFile('good-brand.json', ['#hushmallow', '#pillowtalk']);
    const r = exportVariant({ ...ctx, dir, file, spec, out: path.join(t.dir, 'out-good'), at: '2026-11-02T10:00:00Z', brandFile: good });
    assert.equal(r.caption.split('\n').at(-2), '#hushmallow #pillowtalk');
    assert.equal(r.metadata.hashtags.file, good, 'outside the studio: the absolute path, never library/brand.json');
    assert.equal(r.metadata.hashtags.sha256, sha256Hex(fs.readFileSync(good)));
    assert.match(r.metadata.caption.sources[2], new RegExp(`^${good.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} hashtags\\.list \\(sha256 [0-9a-f]{12}, curatedBy "test owner"\\)$`));
    assert.ok(!JSON.stringify(r.metadata).includes('library/brand.json'));
    assert.throws(() => exportVariant({ ...ctx, dir, file, spec, out: path.join(t.dir, 'out-x'), at: '2026-11-02T10:00:00Z', brand: { hashtags: { curatedBy: 'x', list: [] } } }), /reads the hashtag file itself/);
    // glued banned terms, app and brand names never reach a caption
    for (const [tag, rule] of [['#anxietyrelief', 'medical'], ['#therapytok', 'medical'], ['#selfharmawareness', 'self-harm'], ['#mentalhealth', 'caution'], ['#tiktokmademebuyit', 'name:app'], ['#netflixnight', 'name:app']]) {
      const bad = brandFile(`bad-${tag.slice(1)}.json`, ['#hushmallow', tag]);
      assert.throws(() => exportVariant({ ...ctx, dir, file, spec, out: path.join(t.dir, `out-${tag.slice(1)}`), at: '2026-11-02T10:00:00Z', brandFile: bad }), new RegExp(`hashtags fail the copy lint[\\s\\S]*${tag}[\\s\\S]*${rule}`), tag);
      assert.equal(fs.existsSync(path.join(t.dir, `out-${tag.slice(1)}`)), false, `${tag}: nothing written`);
    }
  } finally { t.done(); }
});
