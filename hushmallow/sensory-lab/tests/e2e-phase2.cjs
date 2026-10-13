// Phase 2 browser tests (Chromium via Playwright, simulated input).
//
//   python3 -m http.server 8000          # from the repository root
//   node hushmallow/sensory-lab/tests/e2e-phase2.cjs [outDir]
//
// Covers: TouchTalk on all seven Mallows; Comfort DNA changing real behaviour
// in TouchTalk, SoftBody, home and Pocket Hush (plus privacy controls); every
// Pocket Hush mode started, played with real input or its button, stopped,
// replayed and deep-linked; layout at phone and desktop sizes.

const path = require('path');
const fs = require('fs');
const { createRequire } = require('module');
const { chromium } = createRequire('/opt/node-tools/node_modules/')('playwright');

const BASE = process.env.LAB_URL || 'http://localhost:8000/hushmallow/sensory-lab/index.html';
const OUT = process.argv[2] || path.join(__dirname, '..', 'docs', 'phase2');
fs.mkdirSync(OUT, { recursive: true });
const ONLY = process.env.PART;

const results = [];
const check = (scope, name, ok, detail = '') => { results.push({ scope, name, ok: !!ok, detail }); if (!ok) console.log(`  ✗ ${scope} · ${name} ${detail}`); };
const ARGS = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'];
const VP = { phone: { width: 390, height: 844, touch: true }, small: { width: 320, height: 568, touch: true }, desktop: { width: 1280, height: 860, touch: false } };

async function open(browser, vp, hash, prefs = {}, comfort = null) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: 1, hasTouch: vp.touch, isMobile: vp.touch });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error' || (m.type() === 'warning' && !/WebGL|GPU|swiftshader|GroupMarker/i.test(m.text()))) errors.push(m.type() + ': ' + m.text()); });
  await page.addInitScript(([p, c]) => {
    if (sessionStorage.getItem('seeded')) return;    // seed once per context, then let the app own storage
    sessionStorage.setItem('seeded', '1');
    localStorage.setItem('hm.sensorylab.v1', JSON.stringify({ quality: 'low', ...p }));
    if (c) localStorage.setItem('hm.sensorylab.comfort.v1', JSON.stringify(c));
  }, [prefs, comfort]);
  await page.goto(`${BASE}${hash}`);
  return { ctx, page, errors };
}
const waitRig = (page) => page.waitForFunction(() => globalThis.__lab?.companion?.rig?.soft, null, { timeout: 20000 });
const events = (page) => page.evaluate(() => __lab.events.map((e) => e.type));
const clearEvents = (page) => page.evaluate(() => { __lab.events.length = 0; });
const geo = (page) => page.evaluate(() => { const r = __lab.companion.rig, s = r.soft; return { cx: r.CX, base: r.BASE, h: s.H * r.S, w: s.W * r.S }; });
const comfort = (prefs = {}, extra = {}) => ({ version: 1, enabled: true, learn: false, prefs, favourites: [], history: {}, ...extra });

async function layout(page, scope) {
  const L = await page.evaluate(() => {
    const vis = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && !el.closest('[hidden]') && getComputedStyle(el).visibility !== 'hidden'; };
    const ctrls = [...document.querySelectorAll('.topbar button, .bottom button, .end-card button')].filter(vis).map((b) => { const r = b.getBoundingClientRect(); return { t: b.textContent.trim() || b.getAttribute('aria-label'), x: r.left, y: r.top, w: r.width, h: r.height }; });
    return { ctrls, sw: document.documentElement.scrollWidth, vw: innerWidth, vh: innerHeight };
  });
  const overlap = (a, b) => a.x < b.x + b.w - 1 && b.x < a.x + a.w - 1 && a.y < b.y + b.h - 1 && b.y < a.y + a.h - 1;
  const clash = [];
  for (let i = 0; i < L.ctrls.length; i++) for (let j = i + 1; j < L.ctrls.length; j++) if (overlap(L.ctrls[i], L.ctrls[j])) clash.push(`${L.ctrls[i].t}/${L.ctrls[j].t}`);
  check(scope, 'controls do not overlap', !clash.length, clash.join(', '));
  const off = L.ctrls.filter((c) => c.x < 0 || c.x + c.w > L.vw + 1 || c.y < 0 || c.y + c.h > L.vh + 1).map((c) => c.t);
  check(scope, 'controls on screen', !off.length, off.join(', '));
  check(scope, 'no horizontal page scroll', L.sw <= L.vw, `${L.sw} > ${L.vw}`);
}

// ------------------------------------------------------ TouchTalk × 7 --
async function sevenMallows(browser) {
  const vp = VP.phone;
  for (const id of ['glitzi', 'blubi', 'zuzu', 'boppo', 'pipzi', 'loomi', 'noomi']) {
    const scope = `touchtalk:${id}`;
    const { ctx, page, errors } = await open(browser, vp, '#touchtalk', {}, comfort({ favouriteMallow: id }));
    await waitRig(page); await page.waitForTimeout(600);
    check(scope, 'favourite Mallow is the one on stage', await page.evaluate(() => __lab.companion.rig.id) === id);
    const g = await geo(page);
    const face0 = await page.evaluate(() => JSON.stringify(__lab.companion.rig.target));
    await clearEvents(page);
    await page.mouse.click(g.cx + g.w * 0.2, g.base - g.h * 0.6);
    await page.waitForTimeout(250);
    const after = await page.evaluate(() => ({ target: JSON.stringify(__lab.companion.rig.target), look: __lab.companion.rig.pointerLook, peek: __lab.companion.rig.overlays.some((o) => o.kind === 'peek'), closed: __lab.companion.rig.mallow.face.eyeStyle === 'closed' }));
    check(scope, 'tap recognised', (await events(page)).includes('tap'));
    check(scope, 'face answers the tap', after.target !== face0);
    check(scope, after.closed ? 'closed eyes open to look at the finger' : 'eyes look at the finger', after.closed ? after.peek && after.look?.x > 0 : after.look?.x > 0, JSON.stringify(after.look));
    await page.waitForTimeout(700);
    // hold, stroke, drag
    await clearEvents(page);
    await page.mouse.move(g.cx, g.base - g.h * 0.5); await page.mouse.down(); await page.waitForTimeout(1000); await page.mouse.up();
    await page.waitForTimeout(400);
    const x0 = Math.max(6, g.cx - g.w * 0.75), span = g.cx + g.w * 0.3 - x0, sy = g.base - g.h * 0.55;
    await page.mouse.move(x0, sy); await page.mouse.down();
    for (let k = 0; k < 2; k++) for (let i = 0; i <= 10; i++) { const t = k % 2 ? 1 - i / 10 : i / 10; await page.mouse.move(x0 + t * span, sy); }
    await page.mouse.up(); await page.waitForTimeout(400);
    const top = { x: g.cx, y: g.base - g.h * 0.85 };
    await page.mouse.move(top.x, top.y); await page.mouse.down();
    for (let i = 1; i <= 8; i++) await page.mouse.move(top.x, top.y - i * 12);
    await page.waitForTimeout(250);
    const stretched = await page.evaluate(() => __lab.companion.rig.metrics().squash);
    await page.mouse.up(); await page.waitForTimeout(300);
    const ev = await events(page);
    check(scope, 'hold, stroke and drag recognised', ['hold', 'holdend', 'stroke', 'drag', 'release'].every((t) => ev.includes(t)), ev.join());
    check(scope, 'drag stretches the body', stretched < -0.06, stretched.toFixed(3));
    // squeeze with the button (no touch)
    await page.getByRole('button', { name: 'Show gesture buttons' }).click();
    const sq = await page.getByRole('button', { name: 'Squeeze', exact: true }).boundingBox();
    await page.mouse.move(sq.x + sq.width / 2, sq.y + sq.height / 2); await page.mouse.down(); await page.waitForTimeout(600);
    const sface = await page.evaluate(() => ({ s: __lab.companion.rig.metrics().squash, f: __lab.companion.rig.faceState.squeeze }));
    await page.mouse.up();
    check(scope, 'squeeze compresses and the face squeezes', sface.s > 0.08 && sface.f > 0.3, JSON.stringify(sface));
    await page.screenshot({ path: path.join(OUT, `touchtalk-${id}.jpg`), type: 'jpeg', quality: 78 });
    check(scope, 'no console errors', !errors.length, errors.join(' | '));
    await ctx.close();
  }
}

// ---------------------------------------------------------- Comfort DNA --
async function comfortBehaviour(browser) {
  const vp = VP.phone;
  // 1. TouchTalk tuning from Comfort DNA
  {
    const scope = 'dna:touchtalk';
    const { ctx, page, errors } = await open(browser, vp, '#touchtalk', {}, comfort({ responses: 'gentle', animationSpeed: 'slower', motion: 'soft', voice: false, favouriteMallow: 'pipzi', environment: 'moonmilk-cove', colours: 'lavender' }));
    await waitRig(page); await page.waitForTimeout(800);
    const st = await page.evaluate(() => { const c = __lab.companion; return { style: c.persona.style, speed: c.rig.speed, motion: c.rig.motionScale, voice: __lab.sound.voiceOn, id: c.rig.id, realm: document.querySelector('.screen')?.dataset.realm, realmCanvas: !!document.querySelector('canvas.hushfold-realm'), tint: document.querySelector('.stage-tint')?.style.getPropertyValue('--mallow-glow') }; });
    check(scope, 'responses: gentle reaches the personality', st.style === 'gentle', st.style);
    check(scope, 'animation: slower slows the rig clock', st.speed < 0.9, String(st.speed));
    check(scope, 'movement: soft scales impulses', st.motion < 0.7, String(st.motion));
    check(scope, 'voice off silences the Mallow voice', st.voice === false);
    check(scope, 'favourite Mallow on stage', st.id === 'pipzi', st.id);
    check(scope, 'chosen environment behind the Mallow', st.realm === 'moonmilk-cove' && st.realmCanvas, JSON.stringify(st));
    check(scope, 'colours tint the stage', /205,182,255/.test(st.tint || ''), st.tint);
    // gentle: a double tap never jumps
    const reacts = [];
    await page.evaluate(() => { const r = __lab.companion.rig, orig = r.react.bind(r); window.__reacts = []; r.react = (k, o) => { window.__reacts.push(k); return orig(k, o); }; });
    const g = await geo(page);
    for (let i = 0; i < 4; i++) { await page.mouse.dblclick(g.cx, g.base - g.h * 0.6); await page.waitForTimeout(500); }
    const ks = await page.evaluate(() => window.__reacts);
    check(scope, 'gentle responses never hop', ks.length > 0 && !ks.some((k) => ['hop', 'doubleTap', 'celebrate'].includes(k)), ks.join());
    await page.screenshot({ path: path.join(OUT, 'dna-touchtalk-realm.jpg'), type: 'jpeg', quality: 78 });
    check(scope, 'no console errors', !errors.length, errors.join(' | '));
    await ctx.close();
  }
  // 2. Personalisation off → defaults everywhere, choices kept
  {
    const scope = 'dna:off';
    const { ctx, page, errors } = await open(browser, vp, '#touchtalk', {}, comfort({ responses: 'gentle', favouriteMallow: 'noomi', environment: 'static-storm' }, { enabled: false }));
    await waitRig(page); await page.waitForTimeout(600);
    const st = await page.evaluate(() => ({ style: __lab.companion.persona.style, id: __lab.companion.rig.id, realm: !!document.querySelector('canvas.hushfold-realm'), chosen: __lab.dna.chosen('responses') }));
    check(scope, 'defaults apply while off', st.style === 'balanced' && st.id === 'boppo' && !st.realm, JSON.stringify(st));
    check(scope, 'choices are kept while off', st.chosen === 'gentle');
    check(scope, 'no console errors', !errors.length, errors.join(' | '));
    await ctx.close();
  }
  // 3. The Comfort DNA screen: edit, view, learning, reset, delete; home offers
  {
    const scope = 'dna:screen';
    const { ctx, page, errors } = await open(browser, vp, '#comfort-dna');
    await page.waitForSelector('.dna-sec'); await waitRig(page); await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(OUT, 'dna-screen.jpg'), type: 'jpeg', quality: 78 });
    await page.locator('[aria-label="Favourite Mallow"] [data-value="loomi"]').click();
    await page.waitForTimeout(600);
    check(scope, 'picking a favourite switches the preview Mallow', await page.evaluate(() => __lab.companion?.rig?.id) === 'loomi');
    await page.getByRole('radiogroup', { name: 'Responses' }).getByRole('radio', { name: 'Playful' }).click();
    await page.getByRole('radiogroup', { name: 'Movement' }).getByRole('radio', { name: 'Bouncy' }).click();
    const live = await page.evaluate(() => ({ style: __lab.companion.persona.style, motion: __lab.companion.rig.motionScale }));
    check(scope, 'changes reach the live preview at once', live.style === 'playful' && live.motion > 1.1, JSON.stringify(live));
    await page.locator('[aria-label="What helps"] [data-value="float"]').click();
    await page.locator('[aria-label="What helps"] [data-value="breathe"]').click();
    await page.getByRole('radiogroup', { name: 'Learn from what I use' }).getByRole('radio', { name: 'On' }).click();
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('hm.sensorylab.comfort.v1')));
    check(scope, 'choices are saved in the lab\'s own key', stored.prefs.favouriteMallow === 'loomi' && stored.prefs.responses === 'playful' && stored.learn === true && stored.prefs.comfort.length === 2, JSON.stringify(stored.prefs));
    await page.locator('details.dna-view summary').click();
    const viewText = await page.locator('details.dna-view').innerText();
    check(scope, 'everything saved is viewable in plain words', /Loomi/.test(viewText) && /playful/.test(viewText) && /Letting go/.test(viewText), viewText.slice(0, 120));
    // play a moment so learning records it, then see it offered at home
    await page.evaluate(() => { location.hash = '#pocket-let-it-float'; });
    await page.waitForFunction(() => __lab.moment?.mode?.items?.length === 6, null, { timeout: 20000 });
    await page.waitForTimeout(400);
    const btn = page.getByRole('button', { name: 'Let one go' });
    for (let i = 0; i < 6; i++) { await btn.click(); await page.waitForTimeout(250); }
    await page.waitForSelector('.end-card.on', { timeout: 45000 });
    await page.locator('.end-card').getByRole('button', { name: '★ Keep' }).click();
    await page.locator('.end-card').getByRole('button', { name: 'Done' }).click();
    await page.waitForSelector('.offers', { timeout: 10000 });
    const offers = await page.locator('.offer').allInnerTexts();
    check(scope, 'home offers familiar moments with honest reasons', offers.some((o) => /Let It Float/.test(o) && /Favourite/.test(o)) && offers.some((o) => /Soft Breath/.test(o) && /said this helps/.test(o)), offers.join(' | '));
    const hist = await page.evaluate(() => __lab.dna.history().map((x) => x.id));
    check(scope, 'learning recorded the moment (opted in)', hist.includes('let-it-float'), hist.join());
    // offers lead somewhere real
    await page.locator('.offer', { hasText: 'Soft Breath' }).click();
    await page.waitForFunction(() => __lab.moment?.id === 'soft-breath', null, { timeout: 20000 });
    check(scope, 'an offer opens its moment in one tap', true);
    await page.getByRole('button', { name: 'Close' }).click();
    await page.waitForSelector('.ptile');
    // privacy controls
    await page.evaluate(() => { location.hash = '#comfort-dna'; });
    await page.waitForSelector('#dna-delete-history');
    await page.locator('#dna-delete-history').click();
    check(scope, 'delete history empties it', (await page.evaluate(() => __lab.dna.history().length)) === 0);
    await page.locator('#dna-reset').click();
    const reset = await page.evaluate(() => ({ r: __lab.dna.get('responses'), favs: __lab.dna.favourites().length }));
    check(scope, 'reset returns personal settings to defaults', reset.r === 'balanced' && reset.favs === 0, JSON.stringify(reset));
    await page.locator('#dna-delete-all').click();
    await page.locator('#dna-delete-all').click();
    await page.waitForTimeout(300);
    check(scope, 'delete everything clears the store', (await page.evaluate(() => localStorage.getItem('hm.sensorylab.comfort.v1'))) === null);
    const keys = await page.evaluate(() => Object.keys(localStorage));
    check(scope, 'only the lab\'s own keys are used', keys.every((k) => k.startsWith('hm.sensorylab.')), keys.join());
    await layout(page, scope);
    check(scope, 'no console errors', !errors.length, errors.join(' | '));
    await ctx.close();
  }
  // 4. Learning is off by default: nothing is counted
  {
    const scope = 'dna:default-off';
    const { ctx, page, errors } = await open(browser, vp, '#pocket-quiet-moment');
    await page.waitForFunction(() => __lab.moment?.mode, null, { timeout: 20000 });
    await page.getByRole('button', { name: 'Close' }).click();
    await page.waitForSelector('.ptile');
    const st = await page.evaluate(() => ({ hist: __lab.dna.history().length, learn: __lab.dna.learning }));
    check(scope, 'no history without opting in', st.hist === 0 && st.learn === false, JSON.stringify(st));
    check(scope, 'no console errors', !errors.length, errors.join(' | '));
    await ctx.close();
  }
}

// ---------------------------------------------------------- Pocket Hush --
async function pocket(browser, vpName, full) {
  const vp = VP[vpName];
  const { ctx, page, errors } = await open(browser, vp, '#pocket-hush', {}, comfort({ favouriteMallow: 'blubi' }));
  await page.waitForSelector('.ptile');
  await page.waitForTimeout(400);
  const tiles = await page.locator('.ptile').count();
  check(`pocket:${vpName}`, 'picker shows six choices (five moments + Surprise Me)', tiles === 6, String(tiles));
  await page.screenshot({ path: path.join(OUT, `${vpName}-pocket-picker.jpg`), type: 'jpeg', quality: 78 });
  const startMode = async (id) => {
    await page.locator(`.ptile[data-mode="${id}"]`).click();
    await page.waitForFunction((id) => __lab.moment?.id === id && __lab.moment.mode && __lab.companion?.rig?.soft, id, { timeout: 20000 });
    await page.waitForTimeout(900);
  };
  const ended = (ms = 60000) => page.waitForSelector('.end-card.on', { timeout: ms });
  for (const id of ['quick-squeeze', 'soft-breath', 'gentle-glow', 'let-it-float', 'quiet-moment']) {
    const scope = `pocket:${vpName}:${id}`;
    await startMode(id);
    const st = await page.evaluate(() => ({ realm: !!document.querySelector('canvas.hushfold-realm'), fx: !!document.querySelector('canvas.fx-layer'), mallow: __lab.companion.rig.id }));
    check(scope, 'starts in the Mallow\'s realm with the effects layer', st.realm && st.fx && st.mallow === 'blubi', JSON.stringify(st));
    await layout(page, scope);
    if (vpName !== 'phone') await page.screenshot({ path: path.join(OUT, `${vpName}-pocket-${id}.jpg`), type: 'jpeg', quality: 78 });
    if (!full) {
      // stop mid-moment: clean exit back to the picker
      await page.getByRole('button', { name: 'Close' }).click();
      await page.waitForSelector('.ptile');
      const counts = await page.evaluate(() => ({ canvases: document.querySelectorAll('canvas').length, moment: !!__lab.moment }));
      check(scope, 'stops cleanly', counts.canvases === 0 && !counts.moment, JSON.stringify(counts));
      continue;
    }
    const g = await geo(page);
    if (id === 'quick-squeeze') {
      // real input: three presses down on the body, then two with the button
      for (let i = 0; i < 3; i++) {
        await page.mouse.move(g.cx, g.base - g.h * 0.85); await page.mouse.down();
        for (let k = 1; k <= 8; k++) await page.mouse.move(g.cx, g.base - g.h * 0.85 + k * 14);
        await page.waitForTimeout(350); await page.mouse.up(); await page.waitForTimeout(700);
      }
      const byTouch = await page.evaluate(() => __lab.moment.mode.count);
      check(scope, 'pressing down on the Mallow counts as squeezes', byTouch >= 2, String(byTouch));
      const btn = page.getByRole('button', { name: 'Squeeze', exact: true });
      for (let i = 0; i < 4 && !(await page.evaluate(() => __lab.moment?.ended)); i++) { const b = await btn.boundingBox(); if (!b) break; await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await page.mouse.down(); await page.waitForTimeout(700); await page.mouse.up(); await page.waitForTimeout(800); }
    } else if (id === 'soft-breath') {
      // lead a breath: press during the exhale to breathe in early
      await page.waitForFunction(() => __lab.moment.mode.phase === 'out', null, { timeout: 20000 });
      await page.mouse.move(40, g.base - g.h * 1.3); await page.mouse.down(); await page.waitForTimeout(300);
      const led = await page.evaluate(() => __lab.moment.mode.phase);
      await page.waitForTimeout(1600); await page.mouse.up();
      check(scope, 'pressing leads the breath in', led === 'in', led);
      const infl = await page.evaluate(() => __lab.companion.rig.inflate);
      check(scope, 'the Mallow inflates with the breath', infl > 0.1, infl.toFixed(2));
    } else if (id === 'gentle-glow') {
      const w0 = await page.evaluate(() => __lab.moment.mode.warmth);
      await page.mouse.move(vp.width - 30, 140); await page.mouse.down();
      for (let i = 1; i <= 12; i++) await page.mouse.move(vp.width - 30 + (g.cx - vp.width + 30) * i / 12, 140 + (g.base - g.h * 0.5 - 140) * i / 12);
      await page.waitForTimeout(2500);
      const w1 = await page.evaluate(() => ({ w: __lab.moment.mode.warmth, glow: __lab.companion.rig.val.glow }));
      check(scope, 'the light warms and lights up the Mallow', w1.w > w0 + 0.1 && w1.glow > 0.15, JSON.stringify(w1));
      await page.waitForTimeout(6000); await page.mouse.up();
      if (!(await page.evaluate(() => __lab.moment?.ended))) {
        const b = await page.getByRole('button', { name: 'Bring the light' }).boundingBox();
        await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await page.mouse.down(); await page.waitForTimeout(6000); await page.mouse.up();
      }
    } else if (id === 'let-it-float') {
      await page.waitForFunction(() => __lab.moment.mode.items.length === 6, null, { timeout: 10000 });
      await page.waitForTimeout(600);
      // flick two by hand
      for (let k = 0; k < 2; k++) {
        const f = await page.evaluate(() => { const it = __lab.moment.mode.items.find((x) => x.state === 'waiting'); return it && { x: it.x, y: it.y }; });
        if (!f) break;
        await page.mouse.move(f.x, f.y); await page.mouse.down();
        for (let i = 1; i <= 5; i++) await page.mouse.move(f.x + i * 4, f.y - i * 30);
        await page.mouse.up(); await page.waitForTimeout(300);
      }
      const rising = await page.evaluate(() => __lab.moment.mode.items.filter((x) => x.state === 'rising' || x.state === 'gone').length);
      check(scope, 'flicked floaters rise away', rising >= 2, String(rising));
      const mallowEvents = await events(page);
      check(scope, 'flicks on floaters never grab the Mallow', !mallowEvents.includes('drag'), mallowEvents.join());
      const btn = page.getByRole('button', { name: 'Let one go' });
      for (let i = 0; i < 5; i++) { if (await btn.isVisible()) await btn.click(); await page.waitForTimeout(250); }
    } else if (id === 'quiet-moment') {
      await page.mouse.move(g.cx, g.base - g.h * 0.5); await page.mouse.down(); await page.waitForTimeout(1200); await page.mouse.up();
      const ev = await events(page);
      check(scope, 'resting a finger still reaches the Mallow', ev.includes('hold'), ev.join());
    }
    await ended(70000);
    const card = await page.evaluate(() => ({ cap: document.querySelector('.end-cap')?.textContent, line: document.querySelector('.end-line')?.textContent }));
    check(scope, 'ends with its own closing and a Mallow line', !!card.cap && /“.+”/.test(card.line || ''), JSON.stringify(card));
    await layout(page, scope + ':end');
    await page.screenshot({ path: path.join(OUT, `${vpName}-pocket-${id}-end.jpg`), type: 'jpeg', quality: 78 });
    // replay
    await page.locator('.end-card').getByRole('button', { name: 'Again' }).click();
    await page.waitForFunction((id) => __lab.moment?.id === id && !__lab.moment.ended && __lab.moment.t < 3, id, { timeout: 20000 });
    check(scope, 'Again replays it from the start', true);
    await page.getByRole('button', { name: 'Close' }).click();
    await page.waitForSelector('.ptile');
    const counts = await page.evaluate(() => ({ canvases: document.querySelectorAll('canvas').length, live: __lab.sound.debug().live }));
    check(scope, 'stopping cleans up', counts.canvases === 0, JSON.stringify(counts));
    await clearEvents(page);
  }
  // Surprise Me + deep link
  await page.locator('.ptile[data-mode="surprise"]').click();
  await page.waitForFunction(() => __lab.moment?.mode, null, { timeout: 20000 });
  const sub = await page.locator('.topbar .title small').textContent();
  check(`pocket:${vpName}`, 'Surprise Me starts a moment', sub === 'Surprise', sub);
  await page.getByRole('button', { name: 'Close' }).click();
  await page.waitForSelector('.ptile');
  await page.evaluate(() => { location.hash = '#pocket-gentle-glow'; });
  await page.waitForFunction(() => __lab.moment?.id === 'gentle-glow', null, { timeout: 20000 });
  check(`pocket:${vpName}`, 'a #pocket-<mode> link opens the moment directly', true);
  // Escape closes a moment
  await page.keyboard.press('Escape');
  await page.waitForSelector('.ptile');
  check(`pocket:${vpName}`, 'Escape stops a moment', true);
  check(`pocket:${vpName}`, 'no console errors', !errors.length, errors.join(' | '));
  await ctx.close();
}

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ARGS });
  const parts = { seven: () => sevenMallows(browser), comfort: () => comfortBehaviour(browser), pocket: () => pocket(browser, 'phone', true), small: () => pocket(browser, 'small', false), desktop: () => pocket(browser, 'desktop', false) };
  for (const [name, fn] of Object.entries(parts)) {
    if (ONLY && !ONLY.split(',').includes(name)) continue;
    console.log(`▸ ${name}`);
    try { await fn(); } catch (e) { check(name, 'crashed', false, e.message.split('\n')[0]); }
  }
  await browser.close();
  const fail = results.filter((r) => !r.ok);
  fs.writeFileSync(path.join(OUT, ONLY ? `e2e-phase2-${ONLY.replace(/,/g, '-')}.json` : 'e2e-phase2.json'), JSON.stringify({ when: new Date().toISOString(), passed: results.length - fail.length, failed: fail.length, results }, null, 1));
  console.log(`\n${results.length - fail.length}/${results.length} checks passed`);
  process.exit(fail.length ? 1 : 0);
})();
