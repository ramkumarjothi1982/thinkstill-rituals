// The fixture suite: the approved v2 must pass every gate, and each fault
// fixture must fail exactly its own gate, with its named check failing.
//
//   node qa/fixtures/run-fixtures.mjs [--build] [--force] [--only id,id] [--render] [--no-v2]
//                                                                  (= hm qa fixtures)
//
//   --build    build missing or stale fixtures first (qa/fixtures/build.mjs)
//   --render   also run the determinism re-render on every fixture (it never
//              reads the fixture's pixels, so by default it runs only for v2 and
//              for the fixtures that declare "render": true)
// Writes WORK/qa-fixtures/summary.json; exit 0 only when every expectation holds.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { studioRel } from '../../render/lib/paths.mjs';
import { loadFixtures, FIXTURE_ROOT, buildFixtures } from './build.mjs';
import { V2_TARGET } from '../gates/context.mjs';

/** Judge one fixture report against its expectation. */
export function judge(report, expect) {
  const failed = Object.entries(report.gates).filter(([, g]) => g.pass === false).map(([k]) => k);
  const own = report.gates[expect.gate];
  const checkStatus = own?.checks?.[expect.check]?.status ?? null;
  const exactly = failed.length === 1 && failed[0] === expect.gate;
  const ok = exactly && checkStatus === 'fail';
  return {
    ok, failed, expectedGate: expect.gate, expectedCheck: expect.check, checkStatus,
    why: ok ? `fails exactly ${expect.gate} (${expect.check})`
      : !failed.includes(expect.gate) ? `${expect.gate} did not fail` : failed.length > 1 ? `also fails ${failed.filter((g) => g !== expect.gate).join(', ')}`
        : `${expect.gate} failed, but not on ${expect.check} (${checkStatus})`,
    detail: own?.checks?.[expect.check]?.detail ?? null,
  };
}

export async function runFixtures({ build = false, force = false, only = null, render = false, v2 = true, log = console.log } = {}) {
  const defs = loadFixtures();
  const list = defs.fixtures.filter((f) => !only || only.includes(f.id));
  if (build || force) await buildFixtures({ only: list.map((f) => f.id), force, log });
  const { runQa } = await import('../run-qa.mjs');
  const t0 = process.hrtime.bigint();
  const rows = [];
  let v2Row = null;
  if (v2) {
    const [r] = await runQa(V2_TARGET, { log: () => {} });
    v2Row = { id: 'v2-approved', ok: r.pass === true, status: r.status, failed: r.failed, pending: r.pending, warnings: r.warnings, seconds: r.timings.total, report: r.reportFile };
    log(`${v2Row.ok ? 'PASS' : 'FAIL'}  v2-approved: ${r.status}${r.failed.length ? ` (failed ${r.failed.join(', ')})` : ''}${r.pending.length ? ` (not run ${r.pending.join(', ')})` : ''}  ${r.timings.total} s`);
  }
  for (const f of list) {
    const target = path.join(FIXTURE_ROOT, f.id, 'target.json');
    if (!fs.existsSync(target)) { rows.push({ id: f.id, ok: false, why: 'not built (run with --build)' }); log(`FAIL  ${f.id}: not built`); continue; }
    // a fixture of the determinism gate needs its re-render; the others never read it (--render runs it for all)
    const [r] = await runQa(target, { render: render || !!f.render, log: () => {} });
    const j = judge(r, f.expect);
    rows.push({ id: f.id, plan: f.plan, fault: f.fault, ...j, seconds: r.timings.total, report: r.reportFile });
    log(`${j.ok ? 'PASS' : 'FAIL'}  ${f.id}: ${j.why}${j.detail ? ` | ${j.detail.slice(0, 160)}` : ''}  ${r.timings.total} s`);
  }
  const summary = {
    schema: 'hm-qa-fixture-summary/1',
    ok: (!v2Row || v2Row.ok) && rows.every((r) => r.ok),
    v2: v2Row, fixtures: rows,
    planFixtures: rows.filter((r) => r.plan).length, passed: rows.filter((r) => r.ok).length,
    seconds: Math.round(Number(process.hrtime.bigint() - t0) / 1e8) / 10,
  };
  fs.mkdirSync(FIXTURE_ROOT, { recursive: true });
  fs.writeFileSync(path.join(FIXTURE_ROOT, 'summary.json'), `${JSON.stringify(summary, null, 1)}\n`);
  log(`${summary.passed}/${rows.length} fixtures fail exactly their own gate (${summary.planFixtures} of them from the plan's list); v2 ${v2Row ? v2Row.status : 'not run'}; ${summary.seconds} s`);
  log(`summary: ${studioRel(path.join(FIXTURE_ROOT, 'summary.json')) ?? path.join(FIXTURE_ROOT, 'summary.json')}`);
  return summary;
}

export function parseArgs(argv) {
  const o = { build: argv.includes('--build'), force: argv.includes('--force'), render: argv.includes('--render'), v2: !argv.includes('--no-v2') };
  const i = argv.indexOf('--only');
  if (i >= 0) o.only = argv[i + 1].split(',');
  const bad = argv.filter((a, k) => a.startsWith('--') && !['--build', '--force', '--render', '--no-v2', '--only'].includes(a) && argv[k - 1] !== '--only');
  if (bad.length) throw Object.assign(new Error(`unknown option ${bad[0]}`), { usage: true });
  return o;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { confine } = await import('../../render/lib/write-jail.mjs');
  await confine();
  const s = await runFixtures(parseArgs(process.argv.slice(2)));
  process.exitCode = s.ok ? 0 : 1;
}
