// hm golden verify — fast integrity check of the goldens (no rendering):
// committed files vs manifest.json, lossless frames in WORK vs frames.sha256.
// Re-rendering checks: npm run test:parity (state) and npm run test:golden (pixels).

export const summary = 'Verify golden files: committed data vs manifest, WORK frames vs frames.sha256 (no rendering)';
export const usage = 'hm golden verify';

export async function run(_args, ctx) {
  const fs = await import('node:fs');
  const path = await import('node:path');
  const { hashFile, parseManifest } = await import('../../render/lib/tree-hash.mjs');
  const dir = ctx.paths.GOLDEN_V2;
  const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'));
  let bad = 0;
  const line = (ok, label) => { if (!ok) bad++; console.log(`${ok ? 'ok  ' : 'FAIL'}  ${label}`); };
  for (const [f, h] of Object.entries(manifest.files)) {
    const p = path.join(dir, f);
    line(fs.existsSync(p) && hashFile(p) === h, `qa/golden/v2/${f}`);
  }
  const sums = parseManifest(fs.readFileSync(path.join(dir, 'frames.sha256'), 'utf8'));
  const framesDir = manifest.framesDir;
  if (!fs.existsSync(framesDir)) {
    console.log(`skip  ${framesDir} is absent on this machine (re-create with: hm golden capture)`);
  } else {
    for (const [f, h] of Object.entries(sums)) {
      const p = path.join(framesDir, f);
      line(fs.existsSync(p) && hashFile(p) === h, path.join(framesDir, f));
    }
  }
  console.log(`pixel tolerance ${manifest.tolerance.pixel}/255, state tolerance ${manifest.tolerance.state}`);
  return bad ? 1 : 0;
}
