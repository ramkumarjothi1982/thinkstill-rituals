// hm qa — the QA suite (WP-05): every gate on a rendered video, the fault
// fixture suite, and the static review gallery.

export const summary = 'QA gates on a video (G-SPEC..G-DUPES), the fault-fixture suite, and the review gallery';
export const usage = `hm qa <target> [<target> ...] [options]      every gate on each target; writes <dir>/qa/report.json
hm qa fixtures [--build] [--force] [--only id,id] [--render] [--no-v2]
                                              v2 must pass every gate; each fault fixture must fail exactly its own gate
hm qa gallery <batch-dir | target ...> [--out dir] [--title text]
                                              static review gallery (opens offline) with a decisions.json export

  target        v2 | <variant or farm job dir> | <batch dir> | <hm-qa-target/1 manifest.json> | <video.mp4>
  --stage s     final (default: every gate) | draft (G-SPEC, G-DIR, G-COST, G-DRAFT, the brand mark)
  --out dir     report directory (one target only; default <dir>/qa, or WORK/qa/<label>)
  --no-render   skip the determinism re-render (G-FINAL:determinism is then not run)
  --ledger dir  ledger for G-SPEC and G-DUPES (default ledger/; 'empty' for none)
  --corpus f    extra G-DUPES signature corpus (JSONL), repeatable
  --at iso      reference time (default now)
  --json        print the report(s) as JSON

Exit: 0 every gate passed, 1 a gate failed, 3 a gate did not run, 2 usage.
Thresholds: qa/gates/thresholds.json; gates, fixtures and calibration: docs/QA.md.`;

export async function run(args) {
  const [sub, ...rest] = args;
  try {
    if (sub === 'fixtures') {
      const { runFixtures, parseArgs } = await import('../../qa/fixtures/run-fixtures.mjs');
      const s = await runFixtures(parseArgs(rest));
      return s.ok ? 0 : 1;
    }
    if (sub === 'gallery') {
      const { main } = await import('../../gallery/build.mjs');
      return await main(rest);
    }
    const { main } = await import('../../qa/run-qa.mjs');
    return await main(args);
  } catch (e) {
    if (e.usage) { console.error(`hm qa: ${e.message}\n\n${usage}`); return 2; }
    console.error(`hm qa: ${e.message}`);
    return 1;
  }
}
