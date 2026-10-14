// Guard: studio work never lands outside the studio root. Large artefacts go
// to WORK (/home/user/hm-work), which is outside the repository. Three layers:
//
//   1. detection, repository: nothing outside hushmallow-infinite-studio/ is
//      modified, added or deleted (git status; the app is also hash-locked);
//   2. detection, whole machine: no file anywhere outside the studio and WORK
//      was written or deleted, and no git config key that can run a program
//      appeared, since the committed baseline (render/lib/write-audit.mjs);
//   3. prevention: studio entry points run in the write jail, where the kernel
//      refuses such writes (render/lib/write-jail.mjs), and tools check their
//      output paths with assertWritable().

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { STUDIO, REPO, WORK, HUSHMALLOW, isInside, assertWritable } from '../../render/lib/paths.mjs';
import { repoChangesOutsideStudio } from '../../render/lib/frozen.mjs';
import { auditOutsideWrites, describeAudit, readBaseline } from '../../render/lib/write-audit.mjs';
import { isConfined, hostRoot } from '../../render/lib/write-jail.mjs';

const JAIL = fileURLToPath(new URL('../../render/lib/write-jail.mjs', import.meta.url));

test('the repository has no uncommitted changes outside the studio root', () => {
  const outside = repoChangesOutsideStudio();
  assert.deepEqual(outside, [], `writes outside the studio root: ${outside.join(', ')}. Only ${path.relative(REPO, STUDIO)}/ and ${WORK} may be written.`);
});

test('nothing on this machine was written or deleted outside the studio and WORK since the baseline, and the git config is unchanged', (t) => {
  const a = auditOutsideWrites();
  t.diagnostic(`baseline ${a.since}; scanned ${a.roots.join(' ')} in ${Math.round(a.ms)} ms; ${a.exempted} harness/infrastructure entries exempt; `
    + `${a.attributed.length} npm compile-cache entries verified as npm's own modules`);
  assert.ok(a.ok, describeAudit(a));
});

test('the baseline is committed, reasoned, not in the future, and records the listing and git config it checks against', () => {
  const b = readBaseline();
  assert.ok(b.sinceMs <= Date.now(), `baseline ${b.since} is in the future`);
  assert.ok(b.reason?.length >= 10 && b.armedBy, 'the baseline says who armed it and why');
  assert.equal(b.schema, 'hm-write-audit/2');
  assert.ok(b.listing?.sha256 && b.listing.entries > 1000, 'a directory listing (for deletions) is recorded');
  assert.ok(Object.keys(b.gitConfig ?? {}).length >= 1, 'the git config entries are recorded');
});

test('WORK (shared scratch) lies outside the repository, so scratch files never show up in git', () => {
  assert.ok(!isInside(WORK, REPO), `${WORK} must not be inside ${REPO}`);
});

test('tools refuse output paths outside the studio and WORK, in the app, or in the frozen v2', () => {
  assert.throws(() => assertWritable(path.join(REPO, 'notes.txt')), /outside/);
  assert.throws(() => assertWritable(path.join(HUSHMALLOW, 'index.html')), /live app/);
  assert.throws(() => assertWritable(path.join(STUDIO, 'render/render.mjs')), /frozen/);
  assert.doesNotThrow(() => assertWritable(path.join(STUDIO, 'runs/batch/x.mp4')));
  assert.doesNotThrow(() => assertWritable(path.join(WORK, 'golden/v2/frames/x.png')));
});

// A probe run through the jail CLI. It never writes where it must not: for each
// protected directory it asks the kernel whether a write WOULD be allowed
// (access(W_OK)), which fails with EROFS on a read-only mount and changes
// nothing, not even the directory's ctime. Real writes go only to the places
// that may be written, and only once the probe sees itself confined ('/'
// read-only): unconfined (HM_JAIL=off), /tmp and /dev/shm would be the host's,
// so the probe writes nothing at all and the test fails on the leaks it reports.
const PROBE = `
const fs = require('node:fs');
const [mustFail, mayWrite] = JSON.parse(process.argv[1]);
const out = { blocked: {}, leaked: [], wrote: [] };
const refused = (p) => { try { fs.accessSync(p, fs.constants.W_OK); return null; } catch (e) { return e.code; } };
for (const p of mustFail) { const code = refused(p); if (code) out.blocked[p] = code; else out.leaked.push(p); }
const confined = process.env.HM_JAIL === '1' && refused('/') === 'EROFS';
if (confined) for (const p of mayWrite) { fs.writeFileSync(p, 'x'); out.wrote.push(p); fs.rmSync(p); }
out.tmpdir = process.env.TMPDIR; out.confined = process.env.HM_JAIL;
console.log(JSON.stringify(out));
`;

test('studio jobs run confined: the kernel refuses writes outside the studio and WORK, and into the frozen v2', (t) => {
  if (isConfined()) t.diagnostic('this test run is itself inside the write jail (npm scripts run confined)');
  const tag = `hm-jail-probe-${process.pid}`;
  // existing directories (and one frozen file): access(W_OK) needs a path that exists
  const mustFail = [
    '/home/user', '/root', REPO, HUSHMALLOW, '/usr/local', '/run',
    path.join(STUDIO, 'output/v2'), path.join(STUDIO, 'stage2'), path.join(STUDIO, 'assets/noomi'), path.join(STUDIO, 'render/render.mjs'),
  ];
  const mayWrite = [path.join(STUDIO, `.${tag}`), path.join(WORK, 'tmp', tag), `/tmp/${tag}`, `/dev/shm/${tag}`];
  const r = spawnSync(process.execPath, [JAIL, '--', process.execPath, '-e', PROBE, JSON.stringify([mustFail, mayWrite])], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  const out = JSON.parse(r.stdout.trim().split('\n').pop());
  assert.deepEqual(out.leaked, [], `the jail would let these writes through: ${out.leaked.join(', ')}`);
  assert.deepEqual(Object.values(out.blocked), mustFail.map(() => 'EROFS'));
  assert.deepEqual(out.wrote, mayWrite);
  assert.deepEqual([out.confined, out.tmpdir], ['1', '/tmp']);
  // /tmp and /dev/shm inside the jail are private: nothing reached the host's
  const host = hostRoot();
  for (const p of [`/tmp/${tag}`, `/dev/shm/${tag}`]) assert.ok(!fs.existsSync(host + p), `${p} leaked to the host`);
});

test('the frozen render cannot overwrite the approved output from inside the jail', () => {
  // the verifier's scenario (render.mjs --out output/v2) in miniature: the kernel refuses
  // write access to the approved video pass. access(W_OK) asks without opening the file
  // for writing, so even a broken or disabled jail (HM_JAIL=off) cannot touch it.
  const target = path.join(STUDIO, 'output/v2/my-brain-at-2am-v2.video.mp4');
  const before = fs.statSync(target).ctimeMs;
  const r = spawnSync(process.execPath, [JAIL, '--', process.execPath, '-e',
    `const fs = require('node:fs'); try { fs.accessSync(${JSON.stringify(target)}, fs.constants.W_OK); process.exit(3); } catch (e) { process.exit(e.code === 'EROFS' ? 0 : 4); }`]);
  assert.equal(r.status, 0, 'write access to the approved video pass must be refused with EROFS');
  assert.equal(fs.statSync(target).ctimeMs, before);
});
