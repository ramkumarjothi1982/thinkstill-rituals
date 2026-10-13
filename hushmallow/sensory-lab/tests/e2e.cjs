// Sensory Lab browser tests (Chromium via Playwright, simulated touch).
//
//   python3 -m http.server 8000          # from the repository root
//   node hushmallow/sensory-lab/tests/e2e.cjs [outDir]
//
// Drives real pointer, touch and CDP multi-touch input at phone, Android and
// desktop sizes; checks recognition, physics response, layout, cleanup and
// console errors; writes screenshots to outDir (default: sensory-lab/docs/phase1).
// Simulated touch is not a physical-device test: see docs/PHASE1_REPORT.md.

const path = require('path');
const fs = require('fs');
const { createRequire } = require('module');
const req = createRequire('/opt/node-tools/node_modules/');
const { chromium } = req('playwright');

const BASE = process.env.LAB_URL || 'http://localhost:8000/hushmallow/sensory-lab/index.html';
const OUT = process.argv[2] || path.join(__dirname, '..', 'docs', 'phase1');
fs.mkdirSync(OUT, { recursive: true });

const VIEWPORTS = [
  { name: 'iphone-390x844', width: 390, height: 844, touch: true },
  { name: 'iphone-375x812', width: 375, height: 812, touch: true },
  { name: 'iphone-se-320x568', width: 320, height: 568, touch: true },
  { name: 'android-412x915', width: 412, height: 915, touch: true },
  { name: 'desktop-1280x860', width: 1280, height: 860, touch: false },
];

const results = [];
const check = (v, name, ok, detail = '') => { const vp = typeof v === 'string' ? v : v.name; results.push({ vp, name, ok: !!ok, detail }); if (!ok) console.log(`  ✗ ${vp} · ${name} ${detail}`); };

async function open(browser, vp, hash, init) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: 1.5, hasTouch: vp.touch, isMobile: vp.touch });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error' || (m.type() === 'warning' && !/WebGL|GPU stall|swiftshader/i.test(m.text()))) errors.push(m.type() + ': ' + m.text()); });
  await page.addInitScript((init) => { localStorage.setItem('hm.sensorylab.v1', JSON.stringify({ quality: 'medium', ...init })); }, init || {});
  await page.goto(`${BASE}${hash}`);
  await page.waitForFunction(() => globalThis.__lab?.companion?.rig?.soft, null, { timeout: 20000 });
  await page.waitForTimeout(700);
  return { ctx, page, errors };
}

const events = (page) => page.evaluate(() => __lab.events.map((e) => e.type));
const clearEvents = (page) => page.evaluate(() => { __lab.events.length = 0; });
const geo = (page) => page.evaluate(() => { const r = __lab.companion.rig, s = r.soft; return { cx: r.CX, base: r.BASE, h: s.H * r.S, w: s.W * r.S }; });
const metrics = (page) => page.evaluate(() => __lab.companion.rig.metrics());

async function layout(page, vp, label) {
  const L = await page.evaluate(() => {
    const vis = (el) => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && !el.closest('[hidden]'); };
    const ctrls = [...document.querySelectorAll('.topbar button, .bottom button')].filter(vis).map((b) => { const r = b.getBoundingClientRect(); return { t: b.textContent.trim() || b.getAttribute('aria-label'), x: r.left, y: r.top, w: r.width, h: r.height }; });
    const r = __lab.companion.rig, s = r.soft;
    let minX = 1e9, maxX = -1e9, minY = 1e9;
    for (let k = 0; k < s.n; k++) { const x = r.CX + s.px[k] * r.S, y = r.BASE + s.py[k] * r.S; minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); }
    // the visible silhouette sits ~1 cell inside the mesh
    const pad = s.cell * r.S;
    return { ctrls, body: { x: minX + pad, y: minY + pad, w: maxX - minX - 2 * pad, h: r.BASE - minY - pad }, sw: document.documentElement.scrollWidth, vw: innerWidth };
  });
  const overlap = (a, b) => a.x < b.x + b.w - 1 && b.x < a.x + a.w - 1 && a.y < b.y + b.h - 1 && b.y < a.y + a.h - 1;
  const clash = [];
  for (let i = 0; i < L.ctrls.length; i++) for (let j = i + 1; j < L.ctrls.length; j++) if (overlap(L.ctrls[i], L.ctrls[j])) clash.push(`${L.ctrls[i].t}/${L.ctrls[j].t}`);
  check(vp, `${label}: controls don't overlap`, !clash.length, clash.join(', '));
  const onBody = L.ctrls.filter((c) => overlap(c, L.body)).map((c) => c.t);
  check(vp, `${label}: controls never cover the Mallow`, !onBody.length, onBody.join(', '));
  const offscreen = L.ctrls.filter((c) => c.y + c.h > vp.height + 1 || c.y < 0).map((c) => c.t);
  check(vp, `${label}: controls on screen`, !offscreen.length, offscreen.join(', '));
  const small = L.ctrls.filter((c) => c.h < 38).map((c) => `${c.t}:${Math.round(c.h)}`);
  check(vp, `${label}: touch targets ≥ 38px tall`, !small.length, small.join(', '));
  check(vp, `${label}: no horizontal page scroll`, L.sw <= L.vw, `${L.sw} > ${L.vw}`);
  check(vp, `${label}: Mallow fully visible`, L.body.x >= 0 && L.body.x + L.body.w <= vp.width && L.body.y > 60, JSON.stringify(L.body));
}

async function pinch(page, cx, cy, from, to, axis = 'x') {
  const cdp = await page.context().newCDPSession(page);
  const pts = (d) => (axis === 'x' ? [[cx - d, cy], [cx + d, cy]] : [[cx, cy - d], [cx, cy + d]]).map(([x, y], i) => ({ x, y, id: i + 1 }));
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: pts(from) });
  for (let i = 1; i <= 10; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: pts(from + (to - from) * i / 10) }); await page.waitForTimeout(16); }
  await page.waitForTimeout(250);
  const m = await metrics(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await cdp.detach();
  return m;
}

async function touchHold(page, x, y, ms) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 1 }] });
  await page.waitForTimeout(ms);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await cdp.detach();
}

async function touchtalk(browser, vp) {
  const { ctx, page, errors } = await open(browser, vp, '#/touchtalk');
  const g = await geo(page);
  const face = { x: g.cx - g.w * 0.15, y: g.base - g.h * 0.6 };
  const top = { x: g.cx, y: g.base - g.h * 0.85 };
  await page.screenshot({ path: path.join(OUT, `${vp.name}-touchtalk.jpg`), type: 'jpeg', quality: 80 });
  await layout(page, vp, 'touchtalk');

  // tap (looks at the finger, dents the surface)
  await clearEvents(page);
  const peak = page.evaluate(() => new Promise((res) => { let m = 0; const t0 = performance.now(); const f = () => { m = Math.max(m, __lab.companion.rig.metrics().offset); if (performance.now() - t0 < 700) requestAnimationFrame(f); else res(m); }; requestAnimationFrame(f); }));
  if (vp.touch) await page.touchscreen.tap(face.x, face.y); else await page.mouse.click(face.x, face.y);
  const afterTap = { offset: await peak };
  check(vp, 'tap recognised', (await events(page)).includes('tap'));
  check(vp, 'tap dents the soft body', afterTap.offset > 0.01, `offset ${afterTap.offset.toFixed(3)}`);
  const look = await page.evaluate(() => __lab.companion.rig.pointerLook);
  check(vp, 'Mallow looks toward the finger', look && look.x < 0, JSON.stringify(look));
  await page.waitForTimeout(500);

  // double tap (retried: in software-GL headless runs a stalled frame can delay the second touch-up)
  let dbl = false;
  for (let attempt = 0; attempt < 3 && !dbl; attempt++) {
    await clearEvents(page);
    if (vp.touch) {
      // touch PointerEvents dispatched in-page with real phone timing (80 ms taps, 120 ms apart):
      // exercises the real binder + recogniser without waiting on software-GL frames
      await page.evaluate(async ([x, y]) => {
        const st = document.querySelector('.stage'), r = st.getBoundingClientRect();
        const fire = (type, id) => st.dispatchEvent(new PointerEvent(type, { pointerId: id, pointerType: 'touch', isPrimary: true, clientX: r.left + x, clientY: r.top + y, bubbles: true, cancelable: true, button: 0 }));
        const wait = (ms) => new Promise((res) => setTimeout(res, ms));
        fire('pointerdown', 11); await wait(80); fire('pointerup', 11); await wait(120);
        fire('pointerdown', 12); await wait(80); fire('pointerup', 12);
      }, [top.x, top.y + 20]);
    } else await page.mouse.dblclick(top.x, top.y + 20);
    await page.waitForTimeout(400);
    dbl = (await events(page)).includes('doubletap');
    if (!dbl) await page.waitForTimeout(800);
  }
  check(vp, 'double tap recognised', dbl);
  await page.waitForTimeout(1200);

  // hold
  await clearEvents(page);
  if (vp.touch) await touchHold(page, face.x, face.y, 1100);
  else { await page.mouse.move(face.x, face.y); await page.mouse.down(); await page.waitForTimeout(1100); await page.mouse.up(); }
  const ev = await events(page);
  check(vp, 'hold recognised and released', ev.includes('hold') && ev.includes('holdend'), ev.join());
  await page.waitForTimeout(600);

  // stroke: sweep onto the Mallow from the side, back and forth
  await clearEvents(page);
  const sy = g.base - g.h * 0.55;
  const x0 = Math.max(6, g.cx - g.w * 0.75), span = g.cx + g.w * 0.3 - x0;
  await page.mouse.move(x0, sy); await page.mouse.down();
  for (let k = 0; k < 3; k++) for (let i = 0; i <= 12; i++) { const t = k % 2 ? 1 - i / 12 : i / 12; await page.mouse.move(x0 + t * span, sy + Math.sin(i) * 4); await page.waitForTimeout(12); }
  await page.mouse.up();
  const sev = await events(page);
  check(vp, 'stroke recognised (sweep onto the body)', sev.includes('stroke') && sev.includes('strokeend'), sev.join());
  await page.waitForTimeout(800);

  // drag to stretch, release to rebound
  await clearEvents(page);
  await page.mouse.move(top.x, top.y); await page.mouse.down();
  for (let i = 1; i <= 10; i++) { await page.mouse.move(top.x, top.y - i * 12); await page.waitForTimeout(16); }
  await page.waitForTimeout(250);
  const stretched = await metrics(page);
  await page.mouse.up();
  await page.waitForTimeout(120);
  const dev = await events(page);
  check(vp, 'drag stretches the Mallow', stretched.squash < -0.08, `squash ${stretched.squash.toFixed(3)}`);
  check(vp, 'release recognised', dev.includes('drag') && dev.includes('release'), dev.join());
  await page.waitForTimeout(2500);
  const settled = await metrics(page);
  // energy is not checked: Boppo's own idle hops keep him moving
  check(vp, 'settles back to shape after release', settled.offset < 0.06 && Math.abs(settled.squash) < 0.06, JSON.stringify({ o: settled.offset.toFixed(3), s: settled.squash.toFixed(3) }));

  // two-finger squeeze
  if (vp.touch) {
    await clearEvents(page);
    const m = await pinch(page, g.cx, g.base - g.h * 0.85, g.h * 0.35, g.h * 0.12, 'y');
    await page.waitForTimeout(100);
    const qev = await events(page);
    check(vp, 'pinch squeeze recognised', qev.includes('squeeze') && qev.includes('release'), qev.join());
    check(vp, 'pinch compresses the body', m.squash > 0.12, `squash ${m.squash.toFixed(3)}`);
    await page.waitForTimeout(1200);
  }

  // gesture buttons (no touch needed)
  await page.getByRole('button', { name: 'Show gesture buttons' }).click();
  await page.waitForTimeout(700);   // the stage re-frames the Mallow above the taller controls
  await layout(page, vp, 'touchtalk + gesture buttons');
  await page.screenshot({ path: path.join(OUT, `${vp.name}-touchtalk-buttons.jpg`), type: 'jpeg', quality: 80 });
  await clearEvents(page);
  for (const name of ['Tap', 'Double tap', 'Stroke']) { await page.getByRole('button', { name, exact: true }).click(); await page.waitForTimeout(name === 'Stroke' ? 1500 : 400); }
  const sq = page.getByRole('button', { name: 'Squeeze', exact: true });
  const box = await sq.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.down(); await page.waitForTimeout(600);
  const btnSq = await metrics(page);
  await page.mouse.up(); await page.waitForTimeout(400);
  const bev = await events(page);
  check(vp, 'gesture buttons drive tap/double/stroke/squeeze', ['tap', 'doubletap', 'stroke', 'squeeze'].every((t) => bev.includes(t)), bev.join());
  check(vp, 'squeeze button compresses', btnSq.squash > 0.1, `squash ${btnSq.squash.toFixed(3)}`);

  // keyboard
  await clearEvents(page);
  await page.keyboard.press('d'); await page.waitForTimeout(300);
  await page.keyboard.down('h'); await page.waitForTimeout(300); await page.keyboard.up('h'); await page.waitForTimeout(200);
  const kev = await events(page);
  check(vp, 'keyboard shortcuts work', kev.includes('doubletap') && kev.includes('hold'), kev.join());

  // pausing when hidden
  const hidden = await page.evaluate(async () => {
    const r = __lab.companion.rig;
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    document.dispatchEvent(new Event('visibilitychange'));
    const t0 = r.time;
    await new Promise((res) => setTimeout(res, 400));
    const paused = r.time === t0;
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
    document.dispatchEvent(new Event('visibilitychange'));
    await new Promise((res) => setTimeout(res, 300));
    return { paused, resumed: r.time > t0 };
  });
  check(vp, 'simulation pauses when the page is hidden and resumes', hidden.paused && hidden.resumed, JSON.stringify(hidden));

  // exit
  await page.getByRole('button', { name: 'Back to the Sensory Lab' }).click();
  await page.waitForFunction(() => __lab.route === 'home');
  check(vp, 'back returns to the lab', true);
  check(vp, 'touchtalk: no console errors', !errors.length, errors.join(' | '));
  await ctx.close();
}

async function softbody(browser, vp) {
  const { ctx, page, errors } = await open(browser, vp, '#/softbody', { material: 'marshmallow' });
  await layout(page, vp, 'softbody');
  const g = await geo(page);
  const top = { x: g.cx, y: g.base - g.h * 0.85 };
  const pull = async () => {
    await page.mouse.move(top.x, top.y); await page.mouse.down();
    for (let i = 1; i <= 10; i++) { await page.mouse.move(top.x, top.y - i * 10); await page.waitForTimeout(16); }
    await page.waitForTimeout(300);
    const m = await metrics(page);
    await page.mouse.up();
    let maxE = 0; for (let i = 0; i < 12; i++) { await page.waitForTimeout(50); maxE = Math.max(maxE, (await metrics(page)).energy); }
    await page.waitForTimeout(1800);
    return { stretch: -m.squash, maxE };
  };
  const res = {};
  for (const id of ['marshmallow', 'jelly', 'mochi', 'cloud', 'pillow']) {
    await page.locator(`[data-material="${id}"]`).click();
    await page.waitForTimeout(900);
    const mat = await page.evaluate(() => __lab.companion.rig.soft.mat.id);
    check(vp, `material ${id} applied`, mat === id, mat);
    res[id] = await pull();
    if (id === 'mochi' || id === 'jelly') await page.screenshot({ path: path.join(OUT, `${vp.name}-softbody-${id}.jpg`), type: 'jpeg', quality: 80 });
  }
  check(vp, 'mochi stretches more than jelly', res.mochi.stretch > res.jelly.stretch * 1.3, JSON.stringify(res));
  check(vp, 'jelly rebounds livelier than marshmallow', res.jelly.maxE > res.marshmallow.maxE, JSON.stringify(res));
  const cloudHover = await page.evaluate(() => { __lab.companion.setMaterial('cloud'); return new Promise((r) => setTimeout(() => r(__lab.companion.rig.metrics().bottom), 1500)); });
  check(vp, 'cloud floats', cloudHover < -5, String(cloudHover));
  // mesh view
  await page.getByRole('button', { name: 'Show the soft-body mesh' }).click();
  await page.mouse.move(top.x, top.y); await page.mouse.down();
  for (let i = 1; i <= 8; i++) await page.mouse.move(top.x + i * 6, top.y - i * 10);
  await page.waitForTimeout(250);
  await page.screenshot({ path: path.join(OUT, `${vp.name}-softbody-mesh.jpg`), type: 'jpeg', quality: 80 });
  await page.mouse.up();
  check(vp, 'mesh overlay toggles', await page.evaluate(() => __lab.companion.rig.showMesh));
  check(vp, 'softbody: no console errors', !errors.length, errors.join(' | '));
  await ctx.close();
}

async function lifecycle(browser, vp) {
  const { ctx, page, errors } = await open(browser, vp, '');
  await page.screenshot({ path: path.join(OUT, `${vp.name}-home.jpg`), type: 'jpeg', quality: 80 });
  const cards = await page.locator('.card').count();
  const live = await page.locator('.card[aria-disabled="false"]').count();
  check(vp, 'home lists 10 experiences, 2 playable', cards === 10 && live === 2, `${cards}/${live}`);
  // switch features repeatedly: no leaked canvases, contexts or loops
  for (let i = 0; i < 4; i++) {
    for (const r of ['#/touchtalk', '#/softbody', '#/']) {
      await page.evaluate((h) => { location.hash = h; }, r);
      await page.waitForFunction(() => globalThis.__lab?.companion?.rig?.soft, null, { timeout: 10000 });
      await page.waitForTimeout(150);
    }
  }
  const counts = await page.evaluate(() => ({ canvases: document.querySelectorAll('canvas').length, screens: document.querySelectorAll('.screen').length, live: __lab.sound.debug().live }));
  check(vp, 'no leaked canvases or screens after 12 switches', counts.canvases === 1 && counts.screens === 1, JSON.stringify(counts));
  // sound: nothing before a gesture, plays after unlock, cleans up every voice, mute silences
  const snd = await page.evaluate(async () => {
    const s = __lab.sound, wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const before = s.debug().state;
    s.unlock(); await wait(300);
    const mat = { sound: { squish: 0.8, pitch: 1, wet: 0.5, airy: 0.4, boing: 0.6 } };
    s.poke(mat); s.squish(mat, 0.7); s.release(mat, 0.8); s.impact(mat, 0.6); s.settle(mat);
    for (const k of ['tap', 'giggle', 'surprise', 'boing', 'content', 'coo', 'hum', 'grumble']) s.voice('boppo', k, 0.6);
    const st = s.stretch(mat), br = s.brush(); st.update(0.6, 0.5); br.update(0.5);
    await wait(250);
    const peak = s.debug().live;
    st.end(); br.end();
    await wait(2600);
    const after = s.debug().live;
    s.setMuted(true);
    const mutedPlays = s.voice('boppo', 'tap', 1);
    s.setMuted(false);
    return { before, state: s.debug().state, peak, after, mutedPlays };
  });
  check(vp, 'no audio before a user gesture', snd.before === 'none', snd.before);
  check(vp, 'sounds play after unlock and every voice is cleaned up', snd.state === 'running' && snd.peak >= 10 && snd.after === 0, JSON.stringify(snd));
  check(vp, 'mute silences the Mallow', snd.mutedPlays === null, String(snd.mutedPlays));
  // reduced motion + light theme + reset
  await page.evaluate(() => { __lab.prefs.set('motion', 'reduced'); __lab.prefs.set('theme', 'light'); });
  await page.waitForTimeout(300);
  const rm = await page.evaluate(() => ({ rm: __lab.companion.rig.opts.reducedMotion, theme: document.documentElement.dataset.theme, damp: __lab.companion.rig.soft.mat.damping }));
  check(vp, 'reduced motion reaches the rig and calms the physics', rm.rm && rm.damp > 15, JSON.stringify(rm));
  check(vp, 'light theme applies', rm.theme === 'light');
  await page.evaluate(() => { location.hash = '#/touchtalk'; });
  await page.waitForFunction(() => __lab.route === 'touchtalk' && __lab.companion?.rig?.soft);
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(OUT, `${vp.name}-touchtalk-light.jpg`), type: 'jpeg', quality: 80 });
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(OUT, `${vp.name}-settings.jpg`), type: 'jpeg', quality: 80 });
  const keys = await page.evaluate(() => Object.keys(localStorage));
  check(vp, 'lab stores only its own key', keys.every((k) => k === 'hm.sensorylab.v1'), keys.join());
  check(vp, 'lifecycle: no console errors', !errors.length, errors.join(' | '));
  await ctx.close();
}

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
  const only = process.env.VP;
  for (const vp of VIEWPORTS.filter((v) => !only || v.name.includes(only))) {
    console.log(`▸ ${vp.name}`);
    for (const fn of [lifecycle, touchtalk, softbody]) {
      try { await fn(browser, vp); } catch (e) { check(vp.name, `${fn.name} crashed`, false, e.message.split('\n')[0]); }
    }
  }
  await browser.close();
  const fail = results.filter((r) => !r.ok);
  fs.writeFileSync(path.join(OUT, only ? `e2e-results-${only}.json` : 'e2e-results.json'), JSON.stringify({ when: new Date().toISOString(), passed: results.length - fail.length, failed: fail.length, results }, null, 1));
  console.log(`\n${results.length - fail.length}/${results.length} checks passed`);
  process.exit(fail.length ? 1 : 0);
})();
