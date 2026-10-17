// The reference work tests/helpers/cost.mjs times to read this machine's speed. It runs only in a Node process of its
// own: cost.mjs starts one (this Node, its flags) when a budget file loads, and again when a reading needs the factor,
// and reads back what calibrate() printed. So nothing in the test process is warmed or loaded by it (the layout's first
// plan stays cold, as in the world), and nothing of hushmallow can ever run inside it: this module imports nothing.
//
// Three kinds of the work the budgets time, each read on that process's own thread CPU clock:
//   - REGEX: word-list alternations with \b, the i and u flags and optional runs of words, over 2,000 and 600
//     characters, including bounded but backtracking-prone patterns, clauses split and read one by one;
//   - STRINGS: the string built-ins the rules lean on (normalize, case, replace, split, join, slice, indexOf);
//   - LOOPS: plain JS (a hash over the characters, word counts in a Map, a sort, object fields).
const clock = typeof process.threadCpuUsage === 'function' ? () => process.threadCpuUsage() : () => process.cpuUsage();
const nowMs = () => { const u = clock(); return (u.user + u.system) / 1000; };

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
export const WORK = { regex: [regexWork, 70], strings: [stringWork, 800], loops: [loopWork, 480] };
export const RUNS = 3;

/** The fastest of `runs` batches of each kind of work, in CPU ms per batch (anything else on the machine only adds). */
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
