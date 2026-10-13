import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { mkWorkTemp } from '../../render/lib/paths.mjs';
import { discover, load, resolve, suggest } from '../../cli/lib/registry.mjs';
import { main, COMMANDS_DIR } from '../../cli/hm.mjs';

const HM = fileURLToPath(new URL('../../cli/hm.mjs', import.meta.url));

function fixtureDir(files) {
  const d = mkWorkTemp('cli-');
  for (const [name, src] of Object.entries(files)) fs.writeFileSync(path.join(d, name), src);
  return d;
}
const cmd = (summary, body = 'return 0;') => `export const summary = ${JSON.stringify(summary)};\nexport async function run(args, ctx) { ${body} }\n`;

test('file names map to command paths; the longest match wins', () => {
  const d = fixtureDir({ 'bench.mjs': cmd('bench'), 'bench.realm.mjs': cmd('realm'), 'lib.validate.mjs': cmd('lv') });
  try {
    const e = discover(d);
    assert.deepEqual(e.map((x) => x.name), ['bench', 'bench realm', 'lib validate']);
    assert.equal(resolve(e, ['bench', 'realm', '--worst']).entry.name, 'bench realm');
    assert.deepEqual(resolve(e, ['bench', 'realm', '--worst']).args, ['--worst']);
    assert.equal(resolve(e, ['bench', '--profile', 'final']).entry.name, 'bench');
    assert.equal(resolve(e, ['bench', 'other']).entry.name, 'bench', 'unknown sub-word falls back to the parent command');
    assert.deepEqual(resolve(e, ['lib']).group, 'lib');
    assert.deepEqual(resolve(e, ['nope']), { unknown: 'nope' });
    assert.deepEqual(suggest(e, 'benhc'), ['bench']);
  } finally { fs.rmSync(d, { recursive: true, force: true }); }
});

test('dispatch passes args and ctx, returns the exit code, and rejects bad modules', async () => {
  const d = fixtureDir({
    'echo.mjs': cmd('echo', 'globalThis.__hmSeen = { args, name: ctx.name, studio: ctx.paths.STUDIO, lock: typeof ctx.heavy.withHeavyLock }; return 5;'),
    'broken.mjs': 'export const summary = "no run";\n',
  });
  try {
    assert.equal(await main(['echo', 'a', '--b'], { commandsDir: d }), 5);
    assert.deepEqual(globalThis.__hmSeen.args, ['a', '--b']);
    assert.equal(globalThis.__hmSeen.name, 'echo');
    assert.equal(globalThis.__hmSeen.lock, 'function');
    await assert.rejects(main(['broken'], { commandsDir: d }), /must export async function run/);
    assert.throws(() => discover(fixtureDir({ 'Bad_Name.mjs': cmd('x') })), /lower-case words joined by dots/);
  } finally { fs.rmSync(d, { recursive: true, force: true }); }
});

test('every shipped command honours the contract and is side-effect free at import', async () => {
  const entries = discover(COMMANDS_DIR);
  assert.ok(entries.length >= 3);
  for (const e of entries) {
    const c = await load(e);
    assert.ok(c.summary.length <= 120, `${e.name}: summary should be one short line`);
    assert.ok(!c.summary.includes('\n'));
  }
  // importing all of them must print nothing (no work at import time)
  const script = `for (const f of ${JSON.stringify(entries.map((e) => e.file))}) await import(f);`;
  const r = spawnSync(process.execPath, ['--input-type=module', '-e', script], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.stdout + r.stderr, '');
});

test('hm help lists commands; unknown commands exit 2 with a suggestion', () => {
  const help = spawnSync(process.execPath, [HM, 'help'], { encoding: 'utf8' });
  assert.equal(help.status, 0);
  assert.match(help.stdout, /hm lib validate/);
  assert.match(help.stdout, /hm lock status/);
  const bad = spawnSync(process.execPath, [HM, 'lok'], { encoding: 'utf8' });
  assert.equal(bad.status, 2);
  assert.match(bad.stderr, /did you mean: lock/);
  const usage = spawnSync(process.execPath, [HM, 'help', 'lib', 'validate'], { encoding: 'utf8' });
  assert.match(usage.stdout, /^hm lib validate \[--quiet\]/);
});

test('hm lib validate runs the story library validator (0 errors)', () => {
  const r = spawnSync(process.execPath, [HM, 'lib', 'validate'], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /templates 28/);
  assert.match(r.stdout, /^OK$/m);
});
