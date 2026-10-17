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
// where a passing runner took 4 m 53 s. So each process first times reference work of the kinds the budgets time, written
// here and sharing no code with hushmallow (this module imports nothing, and the seven test files import it before any
// hushmallow module is loaded), so a slower rule can never make it slower:
//   - REGEX: word-list alternations with \b, the i and u flags and optional runs of words, over 2,000 and 600
//     characters, including bounded but backtracking-prone patterns, clauses split and read one by one;
//   - STRINGS: the string built-ins the rules lean on (normalize, case, replace, split, join, slice, indexOf);
//   - LOOPS: plain JS (a hash over the characters, word counts in a Map, a sort, object fields).
// Each kind's cost is the fastest of a few batches (anything else on the machine only adds), divided by what it costs
// on the reference machine. The machine factor is the SMALLEST of the three, never less than 1:
//   - a machine as fast as the reference or faster is judged by the written budget, exactly as before;
//   - a machine slower at every kind of work (a slower CPU) is credited with the slowdown all three show, and no more.
//     Where only some work is slower the factor stays near 1, because the rules then slow unevenly too and one number
//     cannot follow them all: under node --jitless the reference RegExps read 4.7x and the loops 6.6x but the string
//     built-ins 0.97x, while the budgets' cases slowed 0.8-8.5x case by case (r4's costliest, keepLocal and selfEnding
//     on "i i i i ", 1.5-1.8x; r5's, deathCare, 6.6x). A factor of the work's total (3.2-3.4 there) passes r5, but it also
//     passed r4 with keepLocal or selfEnding doing all their work three times over; the smallest kind's (1.00) passes
//     no slower rule, and r5 fails there as it did before;
//   - above MAX_FACTOR nothing is judged: the test fails, saying the machine is too slow to judge the budget.
// Every budget is then judged at budget × factor (within()), a reading over the written budget only once the machine has
// shown, timed again right then, that it is still that slow. The budget numbers in the tests stay as written.
const clock = typeof process.threadCpuUsage === 'function' ? () => process.threadCpuUsage() : () => process.cpuUsage();
const nowMs = () => { const u = clock(); return (u.user + u.system) / 1000; };

/** CPU ms per call over one batch: fn(i) for i = 0 … n - 1. */
export function cpuPerCall(fn, n = 1) {
  const a = nowMs();
  for (let i = 0; i < n; i++) fn(i);
  return (nowMs() - a) / n;
}

// ------------------------------------------------------------------------------------------- reference work --
const WORDS = ('i you he she they we it me my our your the a an and but or so if when then not no never really just like feel ' +
  'want wish hope keep thinking about going to be with mum dad friend home work school today tonight tomorrow always sorry for ' +
  'everything everyone all of this that there here gone away over done tired trying again still would could should will cant ' +
  'dont wont im ive its was were had have has been being sleep rain train late bus coffee walk dog cat garden phone message ' +
  'call text later soon maybe probably honestly kind sort lot much more less little big long day night week weekend monday ' +
  'grandma grandad husband wife son daughter baby neighbour colleague cousin puppy kitten rabbit').split(' ');
/** Everyday words, the same on every machine (a fixed linear congruential sequence). */
function textOf(seed, len) {
  let x = seed >>> 0, t = '';
  const next = () => (x = (Math.imul(x, 1664525) + 1013904223) >>> 0);
  while (t.length < len) {
    const w = WORDS[next() % WORDS.length];
    t += next() % 9 === 0 ? w[0].toUpperCase() + w.slice(1) : w;
    const p = next() % 23;
    t += p === 0 ? '. ' : p === 1 ? ', ' : p === 2 ? '! ' : p === 3 ? '’s ' : ' ';
  }
  return t.slice(0, len);
}
const TEXTS = [textOf(7, 2000), textOf(11, 2000), textOf(13, 600)];
const alt = (ws) => ws.join('|');
const PEOPLE = alt(['mum', 'mom', 'dad', 'daddy', 'friend', 'best friend', 'sister', 'brother', 'nan', 'gran', 'grandad', 'grandma', 'partner',
  'husband', 'wife', 'son', 'daughter', 'baby', 'boss', 'teacher', 'neighbou?r', 'colleague', 'cousin', 'uncle', 'aunt(?:ie)?', 'mate', 'family', 'someone', 'everyone']);
const SOFT = '(?:(?:really|just|still|kind of|sort of|honestly|probably|maybe|actually|so|very|too)\\s+)*';
const MANY = alt(WORDS);
const SCAN = [
  new RegExp(`\\b(?:my|our|your|his|her)\\s+${SOFT}(?:${PEOPLE})s?\\b`, 'giu'),
  new RegExp(`\\b(?:i|we|im|ive)\\s+${SOFT}(?:want|wish|hope|need|keep thinking about|cant|dont|wont)\\s+(?:to\\s+)?${SOFT}(?:be|go|stay|sleep|walk)\\b`, 'giu'),
  /\b(?:tonight|tomorrow|today|later|soon|again|always|never)\b/giu,
  /[\p{L}']+/gu,
  /\b(?=\w*e)\w+(?:ing|ed|ly)\b/giu,
  new RegExp(`\\b(?:${MANY})\\s+(?:${MANY})\\s+(?:gone|away|over|done)\\b`, 'giu'),
];
// bounded but backtracking-prone: optional words before and after a near miss, on text full of near misses
const BACK = [
  new RegExp(`(?:\\b\\w+\\b[\\s,]*){1,6}?\\b(?:never|not|no)\\b(?:[\\s,]+\\w+){0,5}?\\s+(?:gone|done|over)\\s+(?:with|for)\\s+(?:${PEOPLE})\\b`, 'giu'),
  new RegExp(`\\b(?:i|we)\\s+(?:\\w+\\s+){0,4}?(?:want|wish|hope)\\s+(?:\\w+\\s+){0,4}?(?:to\\s+)?(?:be\\s+)?(?:with|like)\\s+(?:\\w+\\s+){0,2}?(?:${PEOPLE})\\s+(?:again|forever|tonight)\\b`, 'giu'),
];
const CUT = /\s*(?:[.!?;]+|,\s*(?:but|and then|so)\b|\bbut\b)\s*/u;
const CLAUSE = [new RegExp(`^${SOFT}(?:i|we|im)\\b`, 'iu'), new RegExp(`\\b(?:${PEOPLE})\\b.*\\b(?:gone|away|over|done)\\b`, 'iu'),
  /\b(?:not|never|no|dont|cant|wont)\b\s+(?:\w+\s+){0,3}?(?:want|feel|think|be)\b/iu];

function regexWork() {
  let h = 0;
  for (const t of TEXTS) {
    for (const re of SCAN) { re.lastIndex = 0; let m; while ((m = re.exec(t))) h = (h + m.index) | 0; }
    for (const re of BACK) h = (h + t.replace(re, '#').length) | 0;
    for (const c of t.split(CUT)) for (const re of CLAUSE) if (re.test(c)) h = (h + c.length) | 0;
  }
  return h;
}
function stringWork() {
  let h = 0;
  for (const t0 of TEXTS) {
    const t = t0.normalize('NFKC').toLowerCase();
    const u = t.replaceAll('’', '').replaceAll('  ', ' ').replaceAll('. ', ' . ').replaceAll(', ', ' , ');
    const ws = u.split(' ');
    h = (h + ws.join('\n').length + ws.slice(10, 200).join(' ').toUpperCase().length + u.trim().padEnd(2100, '.').length) | 0;
    h = (h + u.indexOf('again', 100) + u.lastIndexOf('home') + u.split('.').length + (u.includes('tonight') ? 1 : 0)) | 0;
    h = (h + u.substring(5, 900).concat(u.slice(-300)).length + u.localeCompare(t0.slice(0, 50))) | 0;
  }
  return h;
}
function loopWork() {
  let h = 0;
  for (const t of TEXTS) {
    for (let i = 0; i < t.length; i++) h = (Math.imul(h, 31) + t.charCodeAt(i)) | 0;
    const counts = new Map();
    let start = -1;
    for (let i = 0; i <= t.length; i++) {
      const c = i < t.length ? t.charCodeAt(i) | 32 : 32;
      if (c >= 97 && c <= 122) { if (start < 0) start = i; } else if (start >= 0) { const w = t.slice(start, i); counts.set(w, (counts.get(w) || 0) + 1); start = -1; }
    }
    const top = [...counts].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).slice(0, 12);
    for (const [k, v] of top) h = (h + k.length * v) | 0;
    const o = { n: 0, s: 0, xs: [] };
    for (let i = 0; i < 3000; i++) { o.n += i & 7; o.s ^= o.n << (i & 3); if ((i & 63) === 0) o.xs.push(o.s); }
    h = (h + o.s + o.xs.length) | 0;
  }
  return h;
}
/** Each kind of work, and how many calls make one batch (~100 ms on the reference machine: many clock ticks). */
const WORK = { regex: [regexWork, 70], strings: [stringWork, 800], loops: [loopWork, 480] };
const RUNS = 3;

// ------------------------------------------------------------------------------------------ machine factor --
/**
 * The reference machine's CPU ms per batch of each kind, as this module measures it when it loads: the median over 60
 * fresh processes (`node -e "import('./hushmallow/tests/helpers/cost.mjs').then((m) => console.log(m.machine.ms))"`,
 * once per process), Node 22.22.0, 17 Oct 2026, on the machine the CI comparison above was read on: an Intel Xeon @
 * 2.80 GHz (Cascade Lake, KVM, 4 vCPUs, 1 thread per core), other test runs beside it at times. The same work then ran on
 * a second machine of the same session (an Intel Xeon @ 2.10 GHz, family 6 model 207, KVM, 4 vCPUs) at 0.8x of these
 * (the smallest-kind ratio of 40 fresh processes: median 0.82 quiet, 0.79 with other agents' suites beside them, all
 * within 0.73-0.87: factor 1.00 in all 40).
 * The slower machine's numbers are the ones kept, so neither machine's budgets are loosened, and a CI runner is credited
 * only its slowdown over the slower of the two. Re-measure them on such a machine, the same way, whenever this work or
 * its batch sizes change.
 */
export const REFERENCE_MS = Object.freeze({ regex: 95.1, strings: 100.3, loops: 103.4 });
/**
 * How far above REFERENCE_MS the reference machine itself can read: of those 60 processes the highest smallest-kind
 * ratio was 1.031 (the median 0.985). The factor counts only what is above it, so the reference machine is judged by the
 * written budgets in every process, and a slower machine is credited 4% less than it is slower (stricter, never looser).
 */
export const REFERENCE_NOISE = 0.04;
/** A machine this much slower is too slow to judge a budget on: the test fails rather than stretching it further. */
export const MAX_FACTOR = 4;

/** The fastest of RUNS batches of each kind of work, in CPU ms per batch. */
export function calibrate(runs = RUNS) {
  const ms = {};
  let sink = 0;
  for (const [kind, [work, n]] of Object.entries(WORK)) {
    sink ^= work(); sink ^= work(); // (compiled before the clock starts)
    let best = Infinity;
    for (let r = 0; r < runs; r++) {
      const a = nowMs();
      for (let i = 0; i < n; i++) sink ^= work();
      best = Math.min(best, nowMs() - a);
    }
    ms[kind] = best;
  }
  if (sink === 0.5) console.log(sink); // (never: keeps the work from being optimised away)
  return ms;
}

/** The machine factor for one calibrate() reading: the smallest kind's ratio to the reference, less the noise, at least 1. */
export function machineFactor(ms, reference = REFERENCE_MS, noise = REFERENCE_NOISE) {
  const ratios = Object.fromEntries(Object.keys(reference).map((k) => [k, ms[k] / reference[k]]));
  const ratio = Math.min(...Object.values(ratios));
  return { ms, ratios, ratio, factor: Math.max(1, ratio / (1 + noise)) };
}

/** This process's machine, measured once, when this module loads. */
export const machine = machineFactor(calibrate());

const fx = (v) => v.toFixed(2);
/** "regex 1.02, strings 0.99, loops 1.01" — each kind's ratio to the reference, for a message. */
export const ratiosText = (m = machine) => Object.entries(m.ratios).map(([k, v]) => `${k} ${fx(v)}`).join(', ');

/**
 * A bounded re-measure, not a hidden retry: read() is taken at most `tries` times and stops at the first reading under
 * the budget it is judged by; ok is false only when every reading missed. A really slow rule misses every time (all its
 * readings are in `seen` for the message); what still slows a busy runner's thread for a moment (a core shared with
 * another file, a cold cache, a GC) spoils only the reading it fell in.
 *
 * A reading under the written budget passes on any machine. One over it passes only under budget × factor, and only if
 * the machine is still that slow: the reference work is timed again right then (at most once a call, and never on a
 * machine judged by the written budget) and the smaller factor of the two is the one used. (On the reference machine one
 * process read every kind of work 1.5x slower as it began, for about a minute, then ran at its usual speed: that factor
 * alone would have excused a rule 1.5x slower.) The rule's own code never runs in either timing, and the second timing
 * can only lower the factor, never raise it.
 *
 * `note` says what the readings were judged against: the written budget, the factor and the budget it made. On a
 * machine more than MAX_FACTOR slower nothing is read: it throws, and the test fails saying so. (`m` and `again` are
 * this machine and its second timing; tests/cost.test.mjs passes others.)
 */
export function within(budget, read, tries = 3, m = machine, again = () => machineFactor(calibrate())) {
  if (!(m.factor <= MAX_FACTOR)) {
    throw new Error(`this machine is too slow to judge this budget: factor ${fx(m.factor)} (the reference work read ${ratiosText(m)} × the reference machine's; a budget stretches at most ${MAX_FACTOR}x: ${budget} ms would be ${(budget * m.factor).toFixed(1)} ms)`);
  }
  let factor = m.factor, now = null;
  const seen = [];
  const judged = (ok, ms) => {
    const limit = budget * factor;
    const timed = `the reference work read ${ratiosText(m)} × the reference machine's as the file began${now ? `, ${ratiosText(now)} just now` : ''}`;
    return { ok, ms, seen, budget, factor, limit, note: `budget ${budget} ms × machine factor ${fx(factor)} = ${limit.toFixed(1)} ms (${timed})` };
  };
  for (let k = 0; k < tries; k++) {
    const v = read();
    seen.push(v);
    if (v < budget) return judged(true, v);
    if (v < budget * factor && !now) { now = again(); factor = Math.min(factor, now.factor); }
    if (v < budget * factor) return judged(true, v);
  }
  return judged(false, Math.min(...seen));
}

/** "21.3, 20.9, 22.0" — the readings, for an assertion message. */
export const readings = (seen, digits = 1) => seen.map((v) => v.toFixed(digits)).join(', ');
