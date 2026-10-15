// Render a dream-stage direction (dream/, videos/<id>.js) to stills or to an MP4.
//
//   node tools/render-dream.mjs --stills 0,1.5s,7.4s --out <dir>     PNG stills (cold: each in a fresh page)
//   node tools/render-dream.mjs --dry --out <dir>                    cues.json (cue log + audio curves)
//   node tools/render-dream.mjs --out <dir> [--workers 2] [--scale 1] [--crf 16] [--frames a:b]
//        full video pass: W pages render interleaved segments (frames are pure functions of
//        time, so any order gives the same pixels), each frame is POSTed raw to the frame
//        sink and piped into one ffmpeg (libx264 High 4.2, yuv420p, BT.709, 30-frame GOP)
//        in frame order → <dir>/<id>.video.mp4; then cues.json.
//   options: --direction feel-something
//
// The soundtrack and the mux are audio/score-feel.mjs and tools/mux-dream.mjs.

import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { startServer } from '../render/serve.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(`--${k}`); return i >= 0 ? (args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true) : d; };
const DIR = opt('direction', 'feel-something');
const OUT = path.resolve(opt('out', path.join(HERE, '..', 'output', DIR)));
const SCALE = Number(opt('scale', 1));
const WORKERS = Number(opt('workers', 2));
const CRF = String(opt('crf', 16));
const ARGS = ['--use-angle=vulkan', '--enable-unsafe-swiftshader', '--disable-gpu-vsync', '--disable-frame-rate-limit', '--force-color-profile=srgb', '--font-render-hinting=none'];
fs.mkdirSync(OUT, { recursive: true });
const log = (...a) => console.log('[dream]', ...a);

async function openPage(browser, port) {
  const page = await browser.newPage({ viewport: { width: Math.round(1080 * SCALE), height: Math.round(1920 * SCALE) }, deviceScaleFactor: 1 });
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log('[page]', m.type(), m.text()); });
  page.on('pageerror', (e) => console.log('[page] error', e.message));
  await page.goto(`http://127.0.0.1:${port}/hushmallow-infinite-studio/dream/index.html?direction=${DIR}&scale=${SCALE}`);
  const info = await page.evaluate(() => window.__dream.ready);
  return { page, info };
}

function ffmpeg(argv) {
  const p = spawn('ffmpeg', argv, { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = new Promise((res, rej) => { p.on('error', rej); p.on('close', (c) => (c === 0 ? res() : rej(new Error(`ffmpeg exited ${c}`)))); });
  return { stdin: p.stdin, done };
}

async function main() {
  const t0 = Date.now();
  const server = await startServer(0);
  const { port } = server.address();
  const browser = await chromium.launch({ args: ARGS });
  try {
    if (opt('dry', false)) {
      const { page, info } = await openPage(browser, port);
      const res = await page.evaluate((n) => window.__dream.dryRun(n), info.frames);
      fs.writeFileSync(path.join(OUT, 'cues.json'), JSON.stringify({ video: DIR, title: info.title, fps: info.fps, duration: info.duration, ...res }, null, 1));
      log(`cues.json: ${res.cues.length} cues, ${res.curves.length} curve samples`);
      return;
    }
    if (opt('stills', null)) {
      const want = String(opt('stills')).split(',').map((s) => s.trim());
      const dir = path.join(OUT, 'stills');
      fs.mkdirSync(dir, { recursive: true });
      const { page, info } = await openPage(browser, port);
      for (const s of want) {
        const i = s.endsWith('s') ? Math.round(parseFloat(s) * info.fps) : parseInt(s, 10);
        const ts = Date.now();
        const url = await page.evaluate((i) => window.__dream.renderFrame(i, { capture: 'png' }), i);
        const f = path.join(dir, `f${String(i).padStart(3, '0')}_${(i / info.fps).toFixed(2)}s.png`);
        fs.writeFileSync(f, Buffer.from(url.split(',')[1], 'base64'));
        log('still', path.basename(f), `${Date.now() - ts} ms`);
      }
      return;
    }

    // ------------------------------------------------------------ full video pass
    const pages = [];
    for (let w = 0; w < WORKERS; w++) pages.push(await openPage(browser, port));
    const info = pages[0].info;
    const [a, b] = opt('frames', null) ? String(opt('frames')).split(':').map(Number) : [0, info.frames];
    const frameBytes = info.width * info.height * 4;
    const silent = path.join(OUT, `${DIR}.video.mp4`);
    const enc = ffmpeg([
      '-y', '-hide_banner', '-loglevel', 'error',
      '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${info.width}x${info.height}`, '-framerate', String(info.fps), '-i', '-',
      '-vf', 'vflip,scale=in_range=full:out_range=tv:out_color_matrix=bt709,format=yuv420p',
      '-c:v', 'libx264', '-preset', 'slow', '-crf', CRF, '-tune', 'film', '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-level', '4.2',
      '-g', '30', '-keyint_min', '30', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709',
      '-r', String(info.fps), '-movflags', '+faststart', silent,
    ]);
    // frames arrive from W pages out of order; write them to ffmpeg in order
    const pending = new Map();
    let next = a;
    const waiters = [];
    const flushInOrder = async () => {
      while (pending.has(next)) {
        const buf = pending.get(next); pending.delete(next);
        if (!enc.stdin.write(buf)) await new Promise((r) => enc.stdin.once('drain', r));
        next++;
      }
      while (waiters.length && pending.size < WORKERS * 3) waiters.shift()();
    };
    const sink = server.addSink(async (i, buf) => {
      while (pending.size >= WORKERS * 3 && i !== next) await new Promise((r) => waiters.push(r));
      pending.set(i, Buffer.from(buf));
      await flushInOrder();
    }, { bytes: frameBytes });
    const stats = { frames: 0, subframes: 0, ms: 0 };
    await Promise.all(pages.map(async ({ page }, w) => {
      for (let i = a + w; i < b; i += WORKERS) {
        const ts = Date.now();
        const r = await page.evaluate(async ([i, url]) => { const r = window.__dream.renderFrame(i, { capture: false }); await window.__dream.readback(url); return r; }, [i, sink.url(i)]);
        stats.frames++; stats.subframes += r.n; stats.ms += Date.now() - ts;
        if (stats.frames % 30 === 0) log(`${stats.frames}/${b - a} frames, ${((Date.now() - t0) / stats.frames).toFixed(0)} ms/frame wall, avg ${(stats.subframes / stats.frames).toFixed(1)} sub-frames`);
      }
      await page.evaluate(() => window.__dream.flush());
    }));
    await flushInOrder();
    enc.stdin.end();
    await enc.done;
    sink.close();
    // the cue log for the score
    const res = await pages[0].page.evaluate((n) => window.__dream.dryRun(n), info.frames);
    fs.writeFileSync(path.join(OUT, 'cues.json'), JSON.stringify({ video: DIR, title: info.title, fps: info.fps, duration: info.duration, ...res }, null, 1));
    const wall = (Date.now() - t0) / 1000;
    fs.writeFileSync(path.join(OUT, 'render-stats.json'), JSON.stringify({ frames: b - a, workers: WORKERS, wallSeconds: +wall.toFixed(1), msPerFrame: +(wall * 1000 / (b - a)).toFixed(0), avgSubframes: +(stats.subframes / stats.frames).toFixed(2) }, null, 1));
    log(`video pass: ${b - a} frames in ${wall.toFixed(0)} s → ${silent}`);
  } finally {
    await browser.close();
    server.close();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
