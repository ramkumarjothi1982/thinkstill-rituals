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
  golden: 'tests/golden/**/*.test.mjs',     // pixels: 1–2 min, not in the default set
});
const DEFAULT = ['guard', 'unit', 'parity'];

export const summary = `Run test suites inside the write jail (${Object.keys(SUITES).join(', ')}; default: ${DEFAULT.join(' ')})`;
export const usage = 'hm test [guard] [unit] [parity] [golden] [-- <extra node --test flags>]';

export async function run(args, ctx) {
  const sep = args.indexOf('--');
  const names = sep < 0 ? args : args.slice(0, sep);
  const extra = sep < 0 ? [] : args.slice(sep + 1);
  const unknown = names.filter((n) => !SUITES[n]);
  if (unknown.length) { console.error(`hm test: unknown suite ${unknown.join(', ')} (have: ${Object.keys(SUITES).join(', ')})`); return 2; }
  const pick = names.length ? names : DEFAULT;
  const flags = ['--test', '--test-reporter=spec', ...(pick.includes('golden') ? ['--test-timeout=1800000'] : []), ...extra];
  const { runInherit } = await import('../lib/run.mjs');
  return runInherit(process.execPath, [...flags, ...pick.map((n) => SUITES[n])], { cwd: ctx.paths.STUDIO });
}
