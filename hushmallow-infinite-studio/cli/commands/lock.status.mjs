// hm lock status — who holds the heavy-job lock (render/lib/heavy-lock.mjs).

export const summary = 'Show the heavy-job lock: idle/busy and every running heavy job';
export const usage = 'hm lock status [--json]';

export async function run(args) {
  const { heavyStatus, formatStatus } = await import('../../render/lib/heavy-lock.mjs');
  const s = await heavyStatus();
  console.log(args.includes('--json') ? JSON.stringify(s, null, 2) : formatStatus(s));
  return 0;
}
