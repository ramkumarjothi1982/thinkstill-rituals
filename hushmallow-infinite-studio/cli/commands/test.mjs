// hm test — run the studio's test suites (node:test) inside the write jail
// (hm confines itself before any command runs). The npm scripts `npm test`,
// `npm run test:guard`, … are aliases of this command, so the suites are
// defined once, here.
//
// `node cli/hm.mjs test …` is the npm-free way to run them: npm itself (not
// studio code) caches its own modules' bytecode in $TMPDIR/node-compile-cache
// before it reads any studio setting (see render/lib/write-audit.mjs, which
// verifies those entries); node alone writes nothing outside the studio and WORK.

export const SUITES = Object.freeze({
  guard: 'tests/guard/**/*.test.mjs',
  unit: 'tests/unit/**/*.test.mjs',
  parity: 'tests/parity/**/*.test.mjs',
  property: 'tests/property/**/*.test.mjs', // planner invariants over 1k–10k planned specs (WP-06): ≈ 30 s
  golden: 'tests/golden/**/*.test.mjs',     // pixels: ≈ 5 min, not in the default set
  derive: 'tests/derive/**/*.test.mjs',     // tools/derive Python unittest suite (WP-07): ≈ 2.5 min, not in the default set
});
const DEFAULT = ['guard', 'unit', 'parity', 'property'];
// Suites that render or derive for minutes get a long per-test timeout.
const LONG = new Set(['golden', 'derive']);

// The summary names only the default set (hm help keeps it to one short line); usage lists every suite.
export const summary = `Run test suites in the write jail (default: ${DEFAULT.join(' ')}; all suites: hm help test)`;
export const usage = `hm test [${Object.keys(SUITES).join('] [')}] [-- <extra node --test flags>]`;

export async function run(args, ctx) {
  const sep = args.indexOf('--');
  const names = sep < 0 ? args : args.slice(0, sep);
  const extra = sep < 0 ? [] : args.slice(sep + 1);
  const unknown = names.filter((n) => !SUITES[n]);
  if (unknown.length) { console.error(`hm test: unknown suite ${unknown.join(', ')} (have: ${Object.keys(SUITES).join(', ')})`); return 2; }
  const pick = names.length ? names : DEFAULT;
  const flags = ['--test', '--test-reporter=spec', ...(pick.some((n) => LONG.has(n)) ? ['--test-timeout=1800000'] : []), ...extra];
  const { runInherit } = await import('../lib/run.mjs');
  return runInherit(process.execPath, [...flags, ...pick.map((n) => SUITES[n])], { cwd: ctx.paths.STUDIO });
}
