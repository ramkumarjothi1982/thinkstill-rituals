// Sequential reference render of the frozen v2: frames 0..449 in one page, in
// order, exactly as render/render.mjs rendered the approved master (≈ 25 min,
// exclusive heavy lock). Three results:
//
//   1. qa/golden/v2/sequential-frames.json: sha256 of every frame's RGBA
//      (top-down). This is a full-length pixel golden that costs no disk.
//   2. Each frame-aligned cold golden compared with the same frame rendered
//      in sequence, which measures how much v2's render history matters.
//   3. The frames encoded with render.mjs's exact ffmpeg/x264 arguments, and
//      the H.264 stream compared with the approved MP4's. If they are identical,
//      the frozen code provably reproduces the approved master bit for bit.
//
//   node tools/golden/sequential-v2.mjs [--frames N]   (N < 450: a quick partial check, nothing written to qa/)

import fs from 'node:fs';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { GOLDEN_V2, WORK_GOLDEN_V2, studioPath, assertWritable } from '../../render/lib/paths.mjs';
import { withHeavyLock } from '../../render/lib/heavy-lock.mjs';
import { sha256, hashFile } from '../../render/lib/tree-hash.mjs';
import { flipRows, decodePNG, encodePNG } from '../../render/lib/png.mjs';
import * as V2 from './v2-harness.mjs';
import { readJSON, writeJSON } from './compare.mjs';
import { diffStats } from './pixels.mjs';

const args = process.argv.slice(2);
const N = Math.min(450, Number(args[args.indexOf('--frames') + 1]) || 450);
const FULL = N === 450;
const OUT_MP4 = assertWritable(path.join(WORK_GOLDEN_V2, 'sequential.video.mp4'));
const APPROVED = studioPath('output', 'v2', 'my-brain-at-2am-v2.mp4');
const T0 = performance.now();
const log = (...a) => console.log(`[sequential ${((performance.now() - T0) / 1000).toFixed(0).padStart(5)} s]`, ...a);

/** The encoder arguments of render/render.mjs for stage2 (raw RGBA, bottom-up → vflip), CRF 16. */
const ENCODE = (out) => [
  '-y', '-hide_banner', '-loglevel', 'error',
  '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${V2.W}x${V2.H}`, '-framerate', String(V2.FPS), '-i', '-',
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-tune', 'film',
  '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-level', '4.2', '-g', '30', '-keyint_min', '30',
  '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709',
  '-vf', 'vflip,scale=in_range=full:out_range=tv:out_color_matrix=bt709,format=yuv420p',
  '-r', String(V2.FPS), '-movflags', '+faststart', out,
];

const h264Hash = (file) => sha256(execFileSync('ffmpeg', ['-v', 'error', '-i', file, '-map', '0:v:0', '-c', 'copy', '-f', 'h264', '-'], { maxBuffer: 512 << 20 }));

async function main() {
  fs.mkdirSync(WORK_GOLDEN_V2, { recursive: true });
  const manifest = readJSON(path.join(GOLDEN_V2, 'manifest.json'));
  const goldenByIndex = new Map(manifest.frames.filter((f) => Number.isInteger(f.i)).map((f) => [f.i, f]));
  const env = await V2.launch({ args: V2.LEGACY_ARGS });
  const hashes = [];
  const vsCold = [];
  const ff = spawn('ffmpeg', ENCODE(OUT_MP4), { stdio: ['pipe', 'inherit', 'inherit'] });
  const ffDone = new Promise((res, rej) => ff.on('close', (c) => (c === 0 ? res() : rej(new Error(`ffmpeg ${c}`)))));
  try {
    const { page } = await V2.openStage(env);
    for (let i = 0; i < N; i++) {
      const raw = Buffer.from(await page.evaluate((i) => window.__stage.renderFrame(i, { capture: 'raw' }), i), 'base64');
      if (!ff.stdin.write(raw)) await new Promise((r) => ff.stdin.once('drain', r));
      const rgba = flipRows(raw, V2.W, V2.H);
      hashes.push(sha256(rgba));
      const g = goldenByIndex.get(i);
      if (g) {
        const same = hashes[i] === g.rgba;
        const d = same ? { identical: true, maxAbs: 0, differingPixels: 0 } : diffStats(decodePNG(fs.readFileSync(path.join(manifest.framesDir, g.file))).data, rgba);
        if (!same && FULL) {
          // keep the in-sequence version too: it is the lossless frame of the approved master
          const seqFile = g.file.replace(/\.png$/, '.sequential.png');
          fs.writeFileSync(path.join(manifest.framesDir, seqFile), encodePNG({ width: V2.W, height: V2.H, data: rgba }));
          d.sequentialPng = { file: seqFile, sha256: hashFile(path.join(manifest.framesDir, seqFile)) };
        }
        vsCold.push({ t: g.t, i, ...d });
        log(`frame ${i} (${g.t} s): sequential ${same ? '==' : '!='} cold golden${same ? '' : ` (max |Δ| ${d.maxAbs}, ${d.differingPixels} px)`}`);
      }
      if (i % 50 === 0) log(`frame ${i}/${N}`);
    }
  } finally {
    ff.stdin.end();
    await env.close();
  }
  await ffDone;
  const result = {
    schema: 'hm-golden-sequential/1',
    rule: 'frames 0..449 rendered in order in one fresh page (legacy flags), sha256 of top-down RGBA per frame, i.e. the history of render/render.mjs',
    frames: N,
    sequentialVsColdGoldens: vsCold,
  };
  if (FULL) {
    const ours = h264Hash(OUT_MP4), approved = h264Hash(APPROVED);
    result.reencode = {
      encoder: 'render/render.mjs stage2 arguments (libx264 slow CRF 16 film, -g 30, BT.709)',
      h264StreamSha256: ours, approvedH264StreamSha256: approved, bitIdenticalToApproved: ours === approved,
      file: OUT_MP4, fileSha256: hashFile(OUT_MP4),
    };
    log(`H.264 stream ${ours === approved ? 'BIT-IDENTICAL to' : 'differs from'} the approved master`);
    result.hashes = hashes;
    const file = path.join(GOLDEN_V2, 'sequential-frames.json');
    writeJSON(file, result, 0);
    // register it in the golden manifest (hm golden verify checks every listed file)
    const m = readJSON(path.join(GOLDEN_V2, 'manifest.json'));
    m.files['sequential-frames.json'] = hashFile(file);
    m.sequential = {
      file: 'sequential-frames.json',
      coldGoldensMatching: `${vsCold.filter((f) => f.identical).length}/${vsCold.length}`,
      maxAbsVsCold: Math.max(0, ...vsCold.map((f) => f.maxAbs)),
      h264BitIdenticalToApproved: result.reencode.bitIdenticalToApproved,
    };
    writeJSON(path.join(GOLDEN_V2, 'manifest.json'), m);
    log('wrote qa/golden/v2/sequential-frames.json and updated manifest.json');
  } else {
    console.log(JSON.stringify(result, null, 1));
  }
}

await withHeavyLock({ mode: 'exclusive', label: 'golden sequential v2' }, main);
