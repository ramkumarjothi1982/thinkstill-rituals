// hm bench gate — G-PIXEL of a profile or feature on the 16 golden times (tools/perf/gate.mjs).

export const summary = 'Pixel gate on the 16 golden times: PSNR, face-box PSNR/SSIM of profile B against A (default: the exact goldens)';
export const usage = `hm bench gate [--a golden|<profile>] [--a-features <list>] [--b <profile>] [--b-features <list>] [thresholds]
hm bench gate --steps off|on|both [--only <features>]

  A defaults to 'golden' (the exact goldens in WORK/golden/v2, not re-rendered),
  B to 'final'. A per-step gate compares a profile with and without one feature:
    hm bench gate --a final --a-features -worldFast --b final --min-psnr 50

  --min-psnr <dB>             full-frame PSNR (RGB) on every frame
  --min-face-psnr <dB>        face-box PSNR on every frame
  --min-face-ssim-mean <x>    face-box SSIM, mean over the 16 frames
  --min-face-ssim-min <x>     face-box SSIM, every frame
  --identical                 every frame bit-identical
  --frames <i,i,…>            only these golden frame indices (default all 16)
  --label <text>  --out <dir> results (default WORK/gate/<label>/gate.json)
  --save-png                  also write the rendered frames as PNG

  --steps runs every feature's own step gate (the perf plan's tolerance, plus
  face-box PSNR >= 42 dB) in one session: 'off' = final without the feature vs
  final; 'on' = exact + the feature (and the features it builds on) vs exact +
  only those; 'both'. --only limits it to some features. Writes steps.json.

  Exit code 1 when a threshold fails.`;

export async function run(args) {
  const { gate, steps, formatGate, formatSteps, parseGateArgs } = await import('../../tools/perf/gate.mjs');
  let o;
  try { o = parseGateArgs(args); } catch (e) { console.error(`hm bench gate: ${e.message}\n\n${usage}`); return 2; }
  try {
    if (o.steps) {
      const r = await steps(o);
      console.log(formatSteps(r));
      console.log(`written: ${r.outDir}/steps.json`);
      return r.pass ? 0 : 1;
    }
    const r = await gate(o);
    console.log(formatGate(r));
    console.log(`written: ${r.outDir}/gate.json`);
    return r.pass ? 0 : 1;
  } catch (e) {
    console.error(`hm bench gate: ${e.message}`);
    return 2;
  }
}
