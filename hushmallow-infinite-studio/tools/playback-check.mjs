// Browser playback test of a delivered video (VP9/Opus proxy of the master: this Chromium build has no
// H.264/AAC decoders), on an emulated phone, through a player with the review page's controls.
//
//   node tools/playback-check.mjs <proxy.webm> <out.json>
//
// Checks: metadata (duration, size) · play from a tap · time advances in real time · sound actually
// comes out (WebAudio analyser on the element) · mute silences it and unmute restores it · the video
// stops at the end when loop is off · loops (time wraps) when loop is on · the player fits the phone
// width with no horizontal scroll.

import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { chromium, devices } from 'playwright';

const [file, out] = process.argv.slice(2);
const body = fs.readFileSync(file);
const page$ = `<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1">
<style>body{margin:0;background:#0e0b26}.phone{max-width:380px;margin:0 auto;padding:0 16px}video{width:100%;aspect-ratio:9/16;display:block;border-radius:20px}</style>
<div class="phone"><video id="v" src="/v.webm" playsinline controls preload="auto"></video>
<button id="play">Play with sound</button><button id="loop" aria-pressed="false">Loop: off</button><button id="mute">Mute</button></div>
<script>
const v = document.getElementById('v');
document.getElementById('play').onclick = () => { v.muted = false; v.play(); };
document.getElementById('loop').onclick = (e) => { v.loop = !v.loop; e.target.setAttribute('aria-pressed', String(v.loop)); };
document.getElementById('mute').onclick = () => { v.muted = !v.muted; };
let an = null;
window.level = () => { if (!an) { const ctx = new AudioContext(); const src = ctx.createMediaElementSource(v); an = ctx.createAnalyser(); an.fftSize = 2048; src.connect(an); an.connect(ctx.destination); } const d = new Float32Array(an.fftSize); an.getFloatTimeDomainData(d); let s = 0; for (const x of d) s += x * x; return Math.sqrt(s / d.length); };
</script>`;
const server = http.createServer((req, res) => {
  if (req.url === '/v.webm') { res.writeHead(200, { 'content-type': 'video/webm', 'content-length': body.length, 'accept-ranges': 'bytes' }); res.end(body); return; }
  res.writeHead(200, { 'content-type': 'text/html' }); res.end(page$);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const browser = await chromium.launch({ args: ['--autoplay-policy=user-gesture-required'] });
const ctx = await browser.newContext({ ...devices['iPhone 13'], defaultBrowserType: undefined });
const page = await ctx.newPage();
await page.goto(`http://127.0.0.1:${server.address().port}/`);
const meta = await page.evaluate(() => new Promise((res) => { const v = document.getElementById('v'); const f = () => res({ duration: v.duration, w: v.videoWidth, h: v.videoHeight }); if (v.readyState >= 1) f(); else v.addEventListener('loadedmetadata', f, { once: true }); }));
const fits = await page.evaluate(() => ({ scrollW: document.documentElement.scrollWidth, viewW: window.innerWidth, videoW: document.getElementById('v').getBoundingClientRect().width }));
await page.tap('#play');
await page.evaluate(() => window.level());
const sample = async (ms) => { await page.waitForTimeout(ms); return page.evaluate(() => ({ t: document.getElementById('v').currentTime, rms: window.level(), paused: document.getElementById('v').paused, muted: document.getElementById('v').muted })); };
const s1 = await sample(1500), s2 = await sample(2000);
const levels = [];
for (let k = 0; k < 6; k++) levels.push((await sample(250)).rms);
await page.tap('#mute');
const muted = await sample(400);
await page.tap('#mute');
const unmuted = await sample(500);
// play to the end with loop off
await page.evaluate(() => { document.getElementById('v').currentTime = 18.5; });
const end = await sample(2600);
// loop on: from near the end it must wrap to the start
await page.tap('#loop');
await page.evaluate(() => { const v = document.getElementById('v'); v.currentTime = 19.2; v.play(); });
const wrap = await sample(1600);
const res = {
  meta, fits,
  advanced: { from: s1.t, to: s2.t, realS: 2.0 },
  audioRms: { playing: Math.max(...levels), muted: muted.rms, unmuted: unmuted.rms },
  endWithoutLoop: { t: end.t, paused: end.paused }, loopWrapped: { t: wrap.t, paused: wrap.paused },
};
res.pass = Math.abs(meta.duration - 20) < 0.1 && meta.w === 540 && fits.scrollW <= fits.viewW && fits.videoW <= fits.viewW
  && s2.t - s1.t > 1.7 && s2.t - s1.t < 2.4 && !s2.paused
  && res.audioRms.playing > 0.01 && res.audioRms.muted < 0.002 && res.audioRms.unmuted > 0.005
  && end.paused && end.t > 19.8 && !wrap.paused && wrap.t < 2;
fs.writeFileSync(out, JSON.stringify(res, null, 1));
console.log(JSON.stringify(res, null, 1));
await browser.close(); server.close();
