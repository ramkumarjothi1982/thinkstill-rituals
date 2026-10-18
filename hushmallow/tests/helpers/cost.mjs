// Speed budgets read on this thread's own CPU clock (the safety rules' "stay cheap" tests, the world layout), judged
// against this machine's own speed.
//
// node --test runs several test files at once (os.availableParallelism() - 1), so on a small CI runner a call's wall time
// also holds whatever the scheduler gave the other files meanwhile: with three files on two cores r4's "fastest of
// seven" read 42 ms for a rule that costs 22 ms of CPU, and failed its 40 ms budget. The thread's CPU time counts only
// the work the call itself does, so a rule that backtracks badly still reads slow, on every call, wherever it runs.
//
// That clock moves in scheduler ticks (4 ms on a HZ=250 Linux), so one short call cannot be read on it: a batch of
// calls is read and divided, which is within one tick over the whole batch. A Node without process.threadCpuUsage reads
// the whole process instead, which adds its helper threads' time (GC, compilers): it can only read higher.
//
// The machine's speed. A thread's CPU time still depends on the machine: one CI runner (job 117308513441, grief.js as on
// main) read 1.7-2.7x the reference machine's, its three readings agreeing within 3% (deathCare 134.7 ms for a 120 ms
// budget that read 73-87 ms there; keepLocal 57.7 ms for 40 that read 21-30), and its whole test step took 8 m 45 s
// where a passing runner took 4 m 53 s. So each test file first has reference work of the kinds the budgets time
// (tests/helpers/cost-work.mjs) timed in a Node process of its own: this Node, with this process's flags, started when
// this module loads. That work shares no code with hushmallow and never runs in the test process, so a slower rule can
// never make it slower, and nothing the test process does first (a cold first plan, a one-time set-up) is warmed by it.
// Each kind's cost is the fastest of a few batches (anything else on the machine only adds), divided by what it costs
// on the reference machine. The machine factor is the SMALLEST of the four kinds' ratios, never less than 1:
//   - a machine as fast as the reference or faster is judged by the written budget, exactly as before;
//   - a machine slower at every kind of work (a slower CPU) is credited with the slowdown all four show, and no more.
//     One kind, SCAN, allocates nothing (RegExp test() and lastIndex only), so the factor is bounded by the least
//     GC-sensitive kind: a costlier GC alone never raises it, and the budgets' costliest cases (keepLocal and
//     selfEnding on "i i i i ") are RegExp backtracking that allocates little. Under node --stress-compaction (GC costs
//     more, the CPU is no slower) the allocating kinds read 1.4-4.7x their quiet cost and SCAN 0.98x: r4 whole read a
//     factor of 1.19-1.32 from the three allocating kinds alone (timed in the test process, as they were) and 1.00 with
//     SCAN, while those two cases slowed 1.02x and 1.18x.
//     Where only some work is slower the factor stays near 1, because the rules then slow unevenly too and one number
//     cannot follow them all: under node --jitless the reference RegExps read 4.7x and the loops 6.6x but the string
//     built-ins 0.97x, while the budgets' cases slowed 0.8-8.5x case by case (r4's costliest, keepLocal and selfEnding
//     on "i i i i ", 1.5-1.8x; r5's, deathCare, 6.6x). A factor of the work's total (3.2-3.4 there) passes r5, but it also
//     passed r4 with keepLocal or selfEnding doing all their work three times over; the smallest kind's (1.00) passes
//     no slower rule, and r5 fails there as it did before;
//   - above MAX_FACTOR a reading that would need the factor is not judged: the test fails, saying the machine is too
//     slow to judge the budget (a reading under the written budget still passes).
// Every budget is then judged at budget × factor (within()), a reading over the written budget only once the machine has
// shown, timed again right then, that it is still that slow. The budget numbers in the tests stay as written.
import { execFileSync } from 'node:child_process';

const clock = typeof process.threadCpuUsage === 'function' ? () => process.threadCpuUsage() : () => process.cpuUsage();
const nowMs = () => { const u = clock(); return (u.user + u.system) / 1000; };

/** CPU ms per call over one batch: fn(i) for i = 0 … n - 1. */
export function cpuPerCall(fn, n = 1) {
  const a = nowMs();
  for (let i = 0; i < n; i++) fn(i);
  return (nowMs() - a) / n;
}

// ------------------------------------------------------------------------------------------ machine factor --
/**
 * The reference machine's CPU ms per batch of each kind, as tests/helpers/cost-work.mjs's calibrate() reads it in a fresh
 * process: the median over 60 fresh processes (`node -e "import('./hushmallow/tests/helpers/cost.mjs').then((m) =>
 * console.log(m.machine.ms))"`, once per process, when the work ran inside the importing process), Node 22.22.0, 17 Oct
 * 2026, on the machine the CI comparison above was read on: an Intel Xeon @ 2.80 GHz (Cascade Lake, KVM, 4 vCPUs, 1 thread
 * per core), other test runs beside it at times. The same work then ran on a second machine of the same session (an Intel
 * Xeon @ 2.10 GHz, family 6 model 207, KVM, 4 vCPUs) at 0.8x of these (the smallest-kind ratio of 40 fresh processes:
 * median 0.82 quiet, 0.79 with other agents' suites beside them, all within 0.73-0.87: factor 1.00 in all 40; and again,
 * in 40 fresh processes of cost-work.mjs alone, quiet: regex 0.835, strings 0.833, loops 0.833 at the median).
 * The slower machine's numbers are the ones kept, so neither machine's budgets are loosened, and a CI runner is credited
 * only its slowdown over the slower of the two. Re-measure them on such a machine, the same way, whenever this work or
 * its batch sizes change.
 *
 * scan is derived, not read on the reference machine (the session had left it when SCAN was added): in those 40 fresh
 * processes on the second machine a batch of scan cost 1.036x a batch of regex, process by process (the median; the same
 * engine, patterns and texts), and regex × 1.036 is 98.6 ms (scan over strings or loops gives 99.6 and 98.2). Adding a
 * kind can only lower the smallest ratio, never raise it, so no machine is credited more than before scan was added. Read
 * it on the reference machine when it is to hand.
 */
export const REFERENCE_MS = Object.freeze({ regex: 95.1, strings: 100.3, loops: 103.4, scan: 98.6 });
/**
 * How far above REFERENCE_MS the reference machine itself can read: of those 60 processes the highest smallest-kind
 * ratio was 1.031 (the median 0.985). The factor counts only what is above it, so the reference machine is judged by the
 * written budgets in every process, and a slower machine is credited 4% less than it is slower (stricter, never looser).
 */
export const REFERENCE_NOISE = 0.04;
/** A machine this much slower is too slow to judge a budget on: the test fails rather than stretching it further. */
export const MAX_FACTOR = 4;

const WORK_URL = new URL('./cost-work.mjs', import.meta.url).href;
/** This process's Node flags (V8's, --import, …) less those that would make the timing process a script, a test run or a debuggee. */
export function nodeFlags(argv = process.execArgv) {
  const out = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (/^(?:-[epic]|--(?:eval|print|interactive|check|input-type|test|inspect|debug|watch))(?:$|[-=])/.test(a)) {
      if (!a.includes('=') && i + 1 < argv.length && !argv[i + 1].startsWith('-')) i++; // (and its value)
      continue;
    }
    out.push(a);
  }
  return out;
}

/** The reference work's CPU ms per batch of each kind, read in a fresh Node process of its own (never in this one). */
export function timeReference(runs = 3) {
  const env = { ...process.env };
  delete env.NODE_TEST_CONTEXT; // (it is a script, not a test file of this run)
  const script = `import(${JSON.stringify(WORK_URL)}).then((m) => process.stdout.write('\\nCOST_WORK_MS ' + JSON.stringify(m.calibrate(${Number(runs)})) + '\\n'))`;
  const out = execFileSync(process.execPath, [...nodeFlags(), '-e', script], { env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 600_000 });
  const line = /^COST_WORK_MS (\{.*\})$/m.exec(out);
  if (!line) throw new Error(`no reading in its output: ${JSON.stringify(out.slice(-200))}`);
  return JSON.parse(line[1]);
}

/** The machine factor for one reading: the smallest kind's ratio to the reference, less the noise, at least 1. */
export function machineFactor(ms, reference = REFERENCE_MS, noise = REFERENCE_NOISE) {
  const ratios = Object.fromEntries(Object.keys(reference).map((k) => [k, ms[k] / reference[k]]));
  const ratio = Math.min(...Object.values(ratios));
  return { ms, ratios, ratio, factor: Math.max(1, ratio / (1 + noise)) };
}

/**
 * This machine, timed now. If the reference work cannot be timed (no process could be started, it failed), the factor
 * is 1: the written budgets, as before there was a factor, and the message says why.
 */
export function measure(time = timeReference) {
  try {
    return machineFactor(time());
  } catch (e) {
    return { ms: null, ratios: {}, ratio: NaN, factor: 1, error: String(e?.message ?? e).split('\n')[0].slice(0, 300) };
  }
}

/** This process's machine, measured once, when this module loads. */
export const machine = measure();

const fx = (v) => v.toFixed(2);
/** "regex 1.02, strings 0.99, loops 1.01, scan 1.00" — each kind's ratio to the reference, for a message. */
export const ratiosText = (m = machine) => Object.entries(m.ratios).map(([k, v]) => `${k} ${fx(v)}`).join(', ');
/** What one timing of the reference work showed, for a message. */
const told = (m) => (m.error ? `could not be timed (${m.error})` : `read ${ratiosText(m)} × the reference machine's`);

/**
 * A bounded re-measure, not a hidden retry: read() is taken at most `tries` times and stops at the first reading under
 * the budget it is judged by; ok is false only when every reading missed. A really slow rule misses every time (all its
 * readings are in `seen` for the message); what still slows a busy runner's thread for a moment (a core shared with
 * another file, a cold cache, a GC) spoils only the reading it fell in.
 *
 * A reading under the written budget passes on any machine, and nothing else is timed for it. One over it passes only
 * under budget × factor, and only if the machine is still that slow: the reference work is timed again right then (at
 * most once a call, and never on a machine judged by the written budget) and the smaller factor of the two is the one
 * used. (On the reference machine one process read every kind of work 1.5x slower as it began, for about a minute, then
 * ran at its usual speed: that factor alone would have excused a rule 1.5x slower.) The rule's own code never runs in
 * either timing, and the second timing can only lower the factor, never raise it.
 *
 * `note` says what the readings were judged against: the written budget, the factor and the budget it made. A reading
 * over the written budget on a machine still more than MAX_FACTOR slower when timed again is not judged: it throws, and
 * the test fails saying so. (`m` and `again` are this machine and its second timing; tests/cost.test.mjs passes others.)
 */
export function within(budget, read, tries = 3, m = machine, again = () => measure()) {
  let factor = m.factor, now = null;
  const seen = [];
  const timed = () => `the reference work ${told(m)} as the file began${now ? `, ${told(now)} just now` : ''}`;
  const judged = (ok, ms) => {
    const limit = budget * factor;
    return { ok, ms, seen, budget, factor, limit, note: `budget ${budget} ms × machine factor ${fx(factor)} = ${limit.toFixed(1)} ms (${timed()})` };
  };
  for (let k = 0; k < tries; k++) {
    const v = read();
    seen.push(v);
    if (v < budget) return judged(true, v);
    // over the written budget: only the factor can pass it, so the machine shows it is still that slow (once a call)
    if (!now && factor > 1 && (v < budget * factor || !(factor <= MAX_FACTOR))) { now = again(); factor = Math.min(factor, now.factor); }
    if (!(factor <= MAX_FACTOR)) {
      throw new Error(`this machine is too slow to judge this budget: ${readings(seen)} ms for a budget of ${budget} ms, at a factor of ${fx(factor)} (${timed()}; a budget stretches at most ${MAX_FACTOR}x: ${budget} ms would be ${(budget * factor).toFixed(1)} ms)`);
    }
    if (v < budget * factor) return judged(true, v);
  }
  return judged(false, Math.min(...seen));
}

/** "21.3, 20.9, 22.0" — the readings, for an assertion message. */
export const readings = (seen, digits = 1) => seen.map((v) => v.toFixed(digits)).join(', ');
