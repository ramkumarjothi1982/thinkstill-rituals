// Speed budgets read on this thread's own CPU clock (the safety rules' "stay cheap" tests, the world layout).
//
// node --test runs several test files at once (os.availableParallelism() - 1), so on a small CI runner a call's wall time
// also holds whatever the scheduler gave the other files meanwhile: with three files on two cores r4's "fastest of
// seven" read 42 ms for a rule that costs 22 ms of CPU, and failed its 40 ms budget. The thread's CPU time counts only
// the work the call itself does, so a rule that backtracks badly still reads slow, on every call, wherever it runs.
//
// That clock moves in scheduler ticks (4 ms on a HZ=250 Linux), so one short call cannot be read on it: a batch of
// calls is read and divided, which is within one tick over the whole batch. A Node without process.threadCpuUsage reads
// the whole process instead, which adds its helper threads' time (GC, compilers): it can only read higher.
const clock = typeof process.threadCpuUsage === 'function' ? () => process.threadCpuUsage() : () => process.cpuUsage();
const nowMs = () => { const u = clock(); return (u.user + u.system) / 1000; };

/** CPU ms per call over one batch: fn(i) for i = 0 … n - 1. */
export function cpuPerCall(fn, n = 1) {
  const a = nowMs();
  for (let i = 0; i < n; i++) fn(i);
  return (nowMs() - a) / n;
}

/**
 * A bounded re-measure, not a hidden retry: read() is taken at most `tries` times and stops at the first reading under
 * the budget; ok is false only when every reading missed. A really slow rule misses every time (all its readings are in
 * `seen` for the message); what still slows a busy runner's thread for a moment (a core shared with another file, a cold
 * cache, a GC) spoils only the reading it fell in.
 */
export function within(budget, read, tries = 3) {
  const seen = [];
  for (let k = 0; k < tries; k++) { const v = read(); seen.push(v); if (v < budget) return { ok: true, ms: v, seen }; }
  return { ok: false, ms: Math.min(...seen), seen };
}

/** "21.3, 20.9, 22.0" — the readings, for an assertion message. */
export const readings = (seen, digits = 1) => seen.map((v) => v.toFixed(digits)).join(', ');
