// hm doctor — can this machine render? Checks the pinned toolchain (Node,
// Playwright 1.56.1 and its Chromium with explicit software WebGL), that the
// engine really renders a frame through the binary frame sink, the font, ffmpeg
// with libx264/aac, cores, RAM, free disk and the hash-locks. The engine frame
// is a heavy job: it renders under a shared slot of the heavy-job lock (FU-5),
// so a doctor run never disturbs a benchmark or golden capture that holds the
// machine exclusively (it waits for it instead).

export const summary = 'Check the render toolchain: WebGL2 (SwiftShader), engine frame, fonts, ffmpeg, cores, RAM, disk';
export const usage = 'hm doctor [--json]';

export const PLAYWRIGHT_PIN = '1.56.1';

export async function run(args, ctx) {
  const os = await import('node:os');
  const { ENGINE_ARGS, EngineSession, topDownSha256 } = await import('../../render/worker.mjs');
  const { ffmpegInfo } = await import('../../render/encode.mjs');
  const { diskCheck, preflight, DISK_WARN_GB, DISK_REFUSE_GB } = await import('../../render/farm.mjs');
  const { playwrightVersion } = await import('../../render/lib/provenance.mjs');
  const { isConfined } = await import('../../render/lib/write-jail.mjs');
  const { heavyStatus, withHeavyLock } = await import('../../render/lib/heavy-lock.mjs');
  const fs = await import('node:fs');
  const path = await import('node:path');

  const checks = [];
  const add = (level, name, detail) => checks.push({ level, name, detail });

  // Node and Playwright
  const [maj, min] = process.versions.node.split('.').map(Number);
  add(maj > 22 || (maj === 22 && min >= 2) ? 'ok' : 'fail', 'node', `${process.version} (need >= 22.2)`);
  const pw = playwrightVersion();
  add(pw === PLAYWRIGHT_PIN ? 'ok' : 'fail', 'playwright', `${pw ?? 'not installed'} (pinned ${PLAYWRIGHT_PIN}: newer Chromium may drop software WebGL, R2)`);

  // who holds the machine before doctor asks for a slot itself
  const lock = await heavyStatus();
  add('ok', 'heavy lock', lock.idle ? 'idle' : `busy: ${lock.holders.map((h) => `${h.mode} pid ${h.pid} "${h.label}"`).join('; ')} (doctor waits for a shared slot)`);

  // Chromium, WebGL2 and one engine frame through the sink, under a shared slot of the heavy lock
  await withHeavyLock({ mode: 'shared', label: 'hm doctor' }, async (lease) => {
  let session;
  try {
    session = await EngineSession.start();
    add('ok', 'chromium', `${session.version}, flags ${ENGINE_ARGS.join(' ')}`);
    const p = { direction: 'dev/text-a', width: 1080, height: 1920, scale: 0.25, seed: 20261013 };
    const { page, info } = await session.openPage(p);
    const gl = await page.evaluate(() => window.__engine.glInfo());
    const need = ['EXT_color_buffer_float', 'OES_texture_float_linear'];
    const missing = need.filter((e) => !gl.extensions.includes(e));
    add(gl.webgl2 && !missing.length ? 'ok' : 'fail', 'webgl2', `${gl.version}; ${gl.renderer}${missing.length ? `; missing ${missing.join(', ')}` : ''}`);
    if (!/swiftshader/i.test(gl.renderer)) add('warn', 'webgl renderer', 'not SwiftShader: goldens were captured on SwiftShader and may not match');
    add(gl.fredoka ? 'ok' : 'fail', 'font', `Fredoka ${gl.fredoka ? 'loaded' : 'NOT loaded'} from hushmallow/assets/fonts/fredoka-latin.woff2`);
    let hash = null, bytes = 0;
    const sink = session.server.addSink((i, buf) => { hash = topDownSha256(buf, info.width, info.height); bytes = buf.reduce((s, v, k) => (k % 4 === 3 ? s : s + v), 0); }, { bytes: info.width * info.height * 4 });
    const t0 = performance.now();
    await page.evaluate(() => window.__engine.render(0));
    const t1 = performance.now();
    await page.evaluate((u) => window.__engine.readback(u), sink.url(0));
    await page.evaluate(() => window.__engine.flush());
    const t2 = performance.now();
    sink.close();
    await page.close();
    add(hash && bytes > 0 ? 'ok' : 'fail', 'engine frame', `${info.width}x${info.height} fixture frame rendered in ${(t1 - t0).toFixed(0)} ms, read back (binary POST) in ${(t2 - t1).toFixed(0)} ms${bytes ? '' : ': BLACK'} (under the heavy lock: ${lease?.noop ? 'covered by the caller\'s lease' : `${lease?.mode} slot`})`);
  } catch (e) {
    add('fail', 'chromium/engine', e.message.split('\n')[0]);
  } finally {
    await session?.close();
  }
  });
  const fontFile = path.join(ctx.paths.HUSHMALLOW, 'assets', 'fonts', 'fredoka-latin.woff2');
  if (!fs.existsSync(fontFile)) add('fail', 'font file', `${fontFile} missing`);

  // ffmpeg
  try {
    const ff = ffmpegInfo();
    add(ff.libx264 && ff.aac && ff.ffprobe ? 'ok' : 'fail', 'ffmpeg', `${ff.version}; libx264 ${ff.libx264 ? 'yes' : 'NO'}, aac ${ff.aac ? 'yes' : 'NO'}, ffprobe ${ff.ffprobe ? 'yes' : 'NO'}`);
  } catch (e) { add('fail', 'ffmpeg', e.message); }

  // machine
  const cores = os.cpus().length, ramGB = os.totalmem() / 2 ** 30, freeGB = os.freemem() / 2 ** 30;
  add(cores >= 4 ? 'ok' : 'warn', 'cores', `${cores} (the plan assumes 4: 2 render workers at most)`);
  add(ramGB >= 8 ? 'ok' : 'warn', 'ram', `${ramGB.toFixed(1)} GB total, ${freeGB.toFixed(1)} GB available (~2.5 GB per render worker)`);
  for (const [name, dir] of [['disk (studio)', ctx.paths.STUDIO], ['disk (WORK)', ctx.paths.WORK]]) {
    const d = diskCheck(dir);
    add(d.level === 'ok' ? 'ok' : d.level === 'warn' ? 'warn' : 'fail', name, `${d.freeGB} GB free (warn < ${DISK_WARN_GB} GB, refuse < ${DISK_REFUSE_GB} GB)`);
  }

  // safety rails
  try { const pre = preflight(); add('ok', 'hash-locks', `frozen v2 ${pre.frozenTree?.slice(0, 12)}, live app ${pre.appTree?.slice(0, 12)}`); } catch (e) { add('fail', 'hash-locks', e.message); }
  add(isConfined() ? 'ok' : 'warn', 'write jail', isConfined() ? 'confined (writes only to the studio and WORK)' : 'not confined (HM_JAIL=off?)');

  if (args.includes('--json')) console.log(JSON.stringify(checks, null, 1));
  else for (const c of checks) console.log(`${c.level === 'ok' ? 'ok  ' : c.level === 'warn' ? 'warn' : 'FAIL'}  ${c.name.padEnd(15)} ${c.detail}`);
  return checks.some((c) => c.level === 'fail') ? 1 : 0;
}
