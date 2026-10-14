// hm bench gate — G-PIXEL of a profile or feature on the 16 golden times (tools/perf/gate.mjs).

export const summary = 'Pixel gate on the 16 golden times: PSNR, face-box PSNR/SSIM of profile B against A (default: the exact goldens)';
export const usage = `hm bench gate [--a golden|<profile>] [--a-features <list>] [--b <profile>] [--b-features <list>] [thresholds]

  A defaults to 'golden' (the exact goldens in WORK/golden/v2, not re-rendered),
  B to 'final'. A per-step gate compares a profile with and without one feature:
    hm bench gate --a final --a-features -worldFast --b final --min-psnr 50

  --min-psnr <dB>             full-frame PSNR (RGB) on every frame
  --min-face-psnr <dB>        face-box PSNR on every frame
  --min-face-ssim-mean <x>    face-box SSIM, mean over the 16 frames
  --min-face-ssim-min <x>     face-box SSIM, every frame
  --label <text>  --out <dir> results (default WORK/gate/<label>/gate.json)
  --save-png                  also write the rendered frames as PNG

  Exit code 1 when a threshold fails.`;

export async function run(args) {
  const { gate, formatGate, parseGateArgs } = await import('../../tools/perf/gate.mjs');
  let o;
  try { o = parseGateArgs(args); } catch (e) { console.error(`hm bench gate: ${e.message}\n\n${usage}`); return 2; }
  try {
    const r = await gate(o);
    console.log(formatGate(r));
    console.log(`written: ${r.outDir}/gate.json`);
    return r.pass ? 0 : 1;
  } catch (e) {
    console.error(`hm bench gate: ${e.message}`);
    return 2;
  }
}
