// Render a Hushmallow Studio video to MP4.
//
//   node render/render.mjs                         full render → output/<id>.mp4
//   node render/render.mjs --stills 0,54,120       PNG stills only → output/stills/
//   node render/render.mjs --dry                   cue log + audio curves only → output/cues.json
//   options: --video my-brain-at-2am  --seed 20261013  --no-audio  --crf 17  --out <dir>
//
// Pipeline: static server (repo root) → headless Chromium (Playwright) loads
// stage/index.html → each frame is stepped deterministically and returned as
// PNG → piped into ffmpeg (libx264, yuv420p, BT.709) → the soundtrack is
// rendered from the cue log (audio/soundtrack.mjs) → muxed as AAC.

import fs from 'node:fs';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { startServer } from './serve.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const argOut = (() => { const i = process.argv.indexOf('--out'); return i >= 0 ? process.argv[i + 1] : null; })();
const OUT = argOut ? path.resolve(argOut) : path.join(ROOT, 'output');

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(`--${k}`); return i >= 0 ? (args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true) : d; };
const VIDEO = opt('video', 'my-brain-at-2am');
const SEED = opt('seed', '20261013');
const STILLS = opt('stills', null);
const DRY = !!opt('dry', false);
const NO_AUDIO = !!opt('no-audio', false);
const CRF = opt('crf', '16');
const LIMIT = opt('frames', null);

fs.mkdirSync(OUT, { recursive: true });

// provenance: which source produced this file (verify.mjs checks staleness)
function sourceStamp() {
  try {
    const sha = execFileSync('git', ['rev-parse', '--short=12', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim();
    const dirty = execFileSync('git', ['status', '--porcelain', '--', '.'], { cwd: ROOT, encoding: 'utf8' })
      .split('\n').some((l) => l.trim() && !/output\//.test(l));
    return `hushmallow-infinite-studio ${VIDEO} @ ${sha}${dirty ? '-dirty' : ''}`;
  } catch { return `hushmallow-infinite-studio ${VIDEO}`; }
}

function log(...a) { console.log('[render]', ...a); }

async function openStage() {
  const server = await startServer(0);
  const { port } = server.address();
  const browser = await chromium.launch({
    args: ['--disable-gpu-vsync', '--disable-frame-rate-limit', '--force-color-profile=srgb', '--font-render-hinting=none'],
  });
  // stage world is 720×1280 CSS px; DSF 2 gives the rig a 1440×2560 backing
  // store (headroom for camera push-ins); the output canvas is 1080×1920.
  const page = await browser.newPage({ viewport: { width: 720, height: 1280 }, deviceScaleFactor: 2 });
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log('[page]', m.type(), m.text()); });
  page.on('pageerror', (e) => console.log('[page] error', e.message));
  const url = `http://127.0.0.1:${port}/hushmallow-infinite-studio/stage/index.html?video=${VIDEO}&seed=${SEED}`;
  await page.goto(url);
  const info = await page.evaluate(() => window.__stage.ready);
  return { server, browser, page, info };
}

function ffmpeg(argv, { input } = {}) {
  return new Promise((resolve, reject) => {
    const p = spawn('ffmpeg', argv, { stdio: [input ? 'pipe' : 'ignore', 'inherit', 'inherit'] });
    p.on('error', reject);
    p.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg exited ${code}`))));
    if (input) input(p.stdin);
  });
}

async function main() {
  const t0 = Date.now();
  const { server, browser, page, info } = await openStage();
  log(`${info.title}: ${info.width}×${info.height} @ ${info.fps} fps, ${info.frames} frames`);
  try {
    if (DRY) {
      const res = await page.evaluate((n) => window.__stage.dryRun(n), info.frames);
      fs.writeFileSync(path.join(OUT, 'cues.json'), JSON.stringify({ video: VIDEO, fps: info.fps, duration: info.duration, ...res }, null, 1));
      log(`cues.json: ${res.cues.length} cues, ${res.curves.length} curve samples`);
      return;
    }

    if (STILLS) {
      const want = new Set(String(STILLS).split(',').map((s) => {
        s = s.trim();
        return s.endsWith('s') ? Math.round(parseFloat(s) * info.fps) : parseInt(s, 10);
      }));
      const last = Math.max(...want);
      const dir = path.join(OUT, 'stills');
      fs.mkdirSync(dir, { recursive: true });
      for (let i = 0; i <= last; i++) {
        const cap = want.has(i);
        const url = await page.evaluate(([i, cap]) => window.__stage.renderFrame(i, { capture: cap }), [i, cap]);
        if (cap) {
          const f = path.join(dir, `f${String(i).padStart(3, '0')}_${(i / info.fps).toFixed(2)}s.png`);
          fs.writeFileSync(f, Buffer.from(url.split(',')[1], 'base64'));
          log('still', path.basename(f));
        }
      }
      return;
    }

    // ---------------------------------------------------------- full render
    const frames = LIMIT ? Math.min(info.frames, parseInt(LIMIT, 10)) : info.frames;
    const silent = path.join(OUT, `${VIDEO}.video.mp4`);
    let frameMs = 0;
    await ffmpeg([
      '-y', '-hide_banner', '-loglevel', 'error',
      '-f', 'image2pipe', '-framerate', String(info.fps), '-c:v', 'png', '-i', '-',
      '-c:v', 'libx264', '-preset', 'slow', '-crf', String(CRF), '-tune', 'film',
      '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-level', '4.2', '-g', '30', '-keyint_min', '30',
      '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709',
      '-vf', 'scale=in_range=full:out_range=tv:out_color_matrix=bt709,format=yuv420p',
      '-r', String(info.fps), '-movflags', '+faststart', silent,
    ], {
      input: async (stdin) => {
        for (let i = 0; i < frames; i++) {
          const ts = Date.now();
          const url = await page.evaluate((i) => window.__stage.renderFrame(i), i);
          frameMs += Date.now() - ts;
          const buf = Buffer.from(url.split(',')[1], 'base64');
          if (!stdin.write(buf)) await new Promise((r) => stdin.once('drain', r));
          if (i % 30 === 0) log(`frame ${i}/${frames}  (${(frameMs / (i + 1)).toFixed(0)} ms/frame)`);
        }
        stdin.end();
      },
    });
    const { cues, curves } = await page.evaluate(() => ({ cues: window.__stage.cues, curves: window.__stage.curves }));
    fs.writeFileSync(path.join(OUT, 'cues.json'), JSON.stringify({ video: VIDEO, fps: info.fps, duration: info.duration, cues, curves }, null, 1));
    log(`video pass done in ${((Date.now() - t0) / 1000).toFixed(0)} s; ${cues.length} cues`);
    await browser.close();
    server.close();

    const final = path.join(OUT, `${VIDEO}.mp4`);
    if (NO_AUDIO) { fs.copyFileSync(silent, final); log('wrote', final, '(no audio)'); return; }
    // soundtrack from the cue log
    const wav = path.join(OUT, `${VIDEO}.soundtrack.wav`);
    await new Promise((resolve, reject) => {
      const p = spawn(process.execPath, [path.join(ROOT, 'audio', 'soundtrack.mjs'), path.join(OUT, 'cues.json'), wav], { stdio: 'inherit' });
      p.on('close', (c) => (c === 0 ? resolve() : reject(new Error(`soundtrack exited ${c}`))));
    });
    await ffmpeg([
      '-y', '-hide_banner', '-loglevel', 'error', '-i', silent, '-i', wav,
      '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'copy',
      '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-ac', '2',
      '-t', String(info.duration), '-metadata', `comment=${sourceStamp()}`, '-metadata', `title=${info.title}`,
      '-movflags', '+faststart', final,
    ]);
    log('wrote', final, `in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  } finally {
    try { await browser.close(); } catch {}
    try { server.close(); } catch {}
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
