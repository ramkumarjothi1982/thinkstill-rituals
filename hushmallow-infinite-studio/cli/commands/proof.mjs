// hm proof — full-quality stills of a direction (the proof profile, tools/proof.mjs).

export const summary = 'Render a few full-quality stills of a direction (proof profile: final settings, 6 stills, <= 45 s)';
export const usage = `hm proof [direction] [--times t1,t2,…] [--out dir]

  direction        registry id (default my-brain-at-2am-v2)
  --times <list>   still times in seconds (default: the middles of 6 equal parts of the film)
  --out <dir>      where the PNGs and proof.json go (default runs/proof/<direction>)`;

export async function run(args) {
  const { proof } = await import('../../tools/proof.mjs');
  const opt = (k) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : null; };
  const unknown = args.filter((a) => a.startsWith('--') && !['--times', '--out'].includes(a));
  if (unknown.length) { console.error(`hm proof: unknown option ${unknown[0]}\n\n${usage}`); return 2; }
  const positional = args.filter((a, i) => !a.startsWith('--') && !['--times', '--out'].includes(args[i - 1]));
  const times = opt('times') ? opt('times').split(',').map(Number) : null;
  if (times && times.some((t) => !Number.isFinite(t))) { console.error('hm proof: --times wants numbers, e.g. 1.25,3.75'); return 2; }
  try {
    const r = await proof({ direction: positional[0], times, out: opt('out') });
    for (const s of r.stills) console.log(`${s.t.toFixed(3).padStart(7)} s  frame ${String(s.frame).padStart(4)}  ${s.file}`);
    console.log(`${r.stills.length} stills in ${(r.ms.total / 1000).toFixed(1)} s (setup ${(r.ms.setup / 1000).toFixed(1)} s, render ${(r.ms.render / 1000).toFixed(1)} s)`);
    return 0;
  } catch (e) {
    console.error(`hm proof: ${e.message}`);
    return 1;
  }
}
