// Phase 3 browser tests (Chromium via Playwright, the L21 harness).
//
//   python3 -m http.server 8000          # from the repository root
//   node hushmallow/sensory-lab/tests/e2e-phase3.cjs [outDir]
//   PART=shared,weather,hushbeat,nightlight   (default: all; `shared:<block>` or `<id>:<block>` runs one block)
//
// shared (lead, SHARED.md L25): stage-screen's wrap / env / onLayout and the
// other options; Pocket Hush still mounts its realm; the duet (setPartner,
// keys to the focused stage, removal); the L4 rig hooks; sound.debug();
// the lab sheet (Done band, Escape, route changes); an AmbientBed in the
// live page; the pointer router; and the isolation loop
// (weather → hushbeat → nightlight → touchtalk, three times, with everything
// back to its baseline at home).
// Then each feature suite, tests/e2e-phase3-<id>.cjs, runs through its
// run(browser, { out, only }) when the file exists: out = <outDir>/<id>;
// only(block) is true when PART lists the id itself or `<id>:<block>`.
// Report: <outDir>/e2e-phase3.json (default docs/phase3), every result included; after a
// full run of a feature, also <outDir>/<id>/e2e-phase3-<id>.json (its own results).

const path = require('path');
const fs = require('fs');
const H = require('./lib/harness.cjs');
const { check, guard, sleep } = H;

const OUT = process.argv[2] || path.join(__dirname, '..', 'docs', 'phase3');
const FEATURES = ['weather', 'hushbeat', 'nightlight'];
const LAB = '/hushmallow/sensory-lab';
const PARTS = (process.env.PART || '').split(',').map((s) => s.trim()).filter(Boolean);
/** A whole block (`shared`) or one of its sub-blocks (`shared:duet`). */
const wants = (id) => H.only(id) || PARTS.some((p) => p.startsWith(id + ':'));
const sub = (id) => (name) => H.only(id) || H.only(`${id}:${name}`);
const shared = sub('shared');

const noErrors = (scope, errors) => check(scope, 'no console errors', !errors.length, errors.join(' | '));
const lastEvents = (page, n) => page.evaluate((n) => __lab.events.slice(-n).map((e) => ({ type: e.type, partner: !!e.partner })), n);
/** Navigate inside the lab and wait for the new screen's Mallow. */
async function go(page, id) {
  await page.evaluate((id) => __lab.ctx.navigate('/' + id), id);
  await page.waitForFunction((id) => __lab.route === id && __lab.companion?.rig?.soft, id, { timeout: 30000 });
}
/** Poll sound.debug() until no voice is live (or ms pass). */
async function untilSilent(page, ms = 3500) {
  const t0 = Date.now();
  for (;;) {
    const d = await page.evaluate(() => __lab.sound.debug());
    if (d.live === 0) return { ok: true, ms: Date.now() - t0, d };
    if (Date.now() - t0 > ms) return { ok: false, ms: Date.now() - t0, d };
    await sleep(100);
  }
}
/** Page px of the lead Mallow's middle. */
async function bodyPoint(page) { const g = await H.geo(page); return { x: g.ox + g.cx, y: g.oy + g.mid, g }; }

// Mean luminance of the opaque pixels in the Mallow's body box on the rig canvas
// (copied into a willReadFrequently canvas, so the rig canvas is never read back).
function lumaProbe() {
  const r = __lab.companion.rig, c = r.canvas, b = r.bodyRect(), d = c.width / r.W;
  const x0 = Math.max(0, Math.floor((b.cx - b.w / 2) * d)), y0 = Math.max(0, Math.floor(b.top * d));
  const w = Math.max(1, Math.min(c.width - x0, Math.ceil(b.w * d))), h = Math.max(1, Math.min(c.height - y0, Math.ceil(b.h * d)));
  const t = (window.__lumaCanvas ||= document.createElement('canvas'));
  const g = t.getContext('2d', { willReadFrequently: true });
  t.width = w; t.height = h;
  g.drawImage(c, x0, y0, w, h, 0, 0, w, h);
  const px = g.getImageData(0, 0, w, h).data;
  let n = 0, L = 0;
  for (let i = 0; i < px.length; i += 4) {
    if (px[i + 3] < 200) continue;
    const a = px[i + 3] / 255;
    L += (0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2]) / 255 / a; n++;
  }
  return { n, mean: n ? L / n : 0, mode: r.renderer?.mode ?? 'strip', filter: c.style.filter, renders: r.renders };
}

// Renders of the lead rig and page frames per second over ms.
function rateProbe(ms) {
  return new Promise((resolve) => {
    const rig = __lab.companion.rig;
    let frames = 0, on = true;
    const f = () => { if (on) { frames++; requestAnimationFrame(f); } };
    requestAnimationFrame(f);
    const r0 = rig.renders, t0 = performance.now();
    setTimeout(() => { on = false; const s = (performance.now() - t0) / 1000; resolve({ rps: (rig.renders - r0) / s, fps: frames / s }); }, ms);
  });
}

// ------------------------------------------------------------------ shared --
async function sharedBlock(browser) {
  // stage-screen: wrap, env (with and without a realm), live Motion, then every Phase 3 option on a probe screen
  if (shared('stage')) await guard('shared:stage', async (scope, own) => {
    const { ctx, page, errors } = await H.open(browser, 'phone', '#touchtalk');
    own(ctx); await H.waitRig(page);
    const plain = await page.evaluate(() => {
      const s = __lab.stage, sc = s?.screen;
      return { has: !!s, wrap: s?.wrap?.className, wrapFirst: sc?.firstElementChild === s?.wrap, env: typeof s?.env?.mount === 'function', realm: s?.realm, envRealm: s?.env?.realm,
        canvas: !!document.querySelector('canvas.hushfold-realm'), ds: sc?.dataset.realm ?? null, comp: s?.companion === __lab.companion, stage: s?.stage === __lab.companion.stage,
        list: s?.companions.length, stages: s?.stages.length, partner: s?.partner };
    });
    check(scope, 'the handle has wrap (.stage-wrap, first in the screen), env and companion; a plain stage has no realm',
      plain.has && plain.wrap === 'stage-wrap' && plain.wrapFirst && plain.env && plain.realm === null && plain.envRealm === null && !plain.canvas && plain.ds === null && plain.comp && plain.stage, JSON.stringify(plain));
    check(scope, 'solo: companions [lead], stages [stage], partner null', plain.list === 1 && plain.stages === 1 && plain.partner === null, JSON.stringify(plain));
    // a chosen world goes through env, mounted as before (calm 0.4, groundY = the rig baseline)
    await page.evaluate(() => __lab.dna.set('environment', 'blue-drift'));
    await go(page, 'home'); await go(page, 'touchtalk');
    await page.waitForFunction(() => __lab.stage?.realm, null, { timeout: 15000 }).catch(() => {});
    const st = await page.evaluate(() => {
      const s = __lab.stage, sc = s.screen, c = document.querySelector('canvas.hushfold-realm'), d = s.realm?.debug.state;
      return { same: !!s.realm && s.realm === s.env.realm, id: s.env.realmId, canvas: c?.dataset.realm, inWrap: c?.parentElement === s.wrap, ds: sc.dataset.realm, back: sc.dataset.backdrop,
        tone: s.env.tone, horizon: s.env.geo?.horizon, groundY: d?.groundY, base: __lab.companion.rig.opts.baseline, q: d?.quality, low: d?.low, p: d?.p };
    });
    check(scope, 'a chosen realm lives in env: canvas in wrap, data-realm, light chrome, geo', st.same && st.id === 'blue-drift' && st.canvas === 'blue-drift' && st.inWrap && st.ds === 'blue-drift' && st.back === 'light' && st.tone === 'light' && st.horizon === 0.57, JSON.stringify(st));
    check(scope, 'the realm is mounted as before (groundY = rig baseline, quality low, no low stimulation, p 0)', Math.abs(st.groundY - st.base) < 1e-9 && st.q === 'low' && st.low === false && st.p === 0, JSON.stringify(st));
    const mo = await page.evaluate(() => {
      const read = () => ({ env: __lab.stage.env.reduced, realm: __lab.stage.realm.debug.state.reduced, rig: __lab.companion.rig.opts.reducedMotion });
      __lab.prefs.set('motion', 'reduced'); const a = read();
      __lab.prefs.set('motion', 'full'); const b = read();
      return { a, b };
    });
    check(scope, 'a live Motion change reaches the realm and the Mallow', mo.a.env && mo.a.realm && mo.a.rig && !mo.b.env && !mo.b.realm && !mo.b.rig, JSON.stringify(mo));
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => __lab.route === 'home', null, { timeout: 10000 });
    const gone = await page.evaluate(() => ({ stage: __lab.stage, realms: document.querySelectorAll('canvas.hushfold-realm').length, canvases: document.querySelectorAll('canvas').length }));
    check(scope, 'Escape: home, realm gone, __lab.stage cleared, 1 canvas', gone.stage === null && gone.realms === 0 && gone.canvases === 1, JSON.stringify(gone));

    // a probe screen with every new option
    await H.waitRig(page);
    const r = await page.evaluate(async (LAB) => {
      const { stageScreen } = await import(`${LAB}/features/stage-screen.js`);
      const root = document.createElement('div'); root.id = 'probe-root';
      Object.assign(root.style, { position: 'fixed', inset: '0', zIndex: 50 });
      document.body.append(root);
      document.querySelector('.screen.home').style.display = 'none';
      const calls = { keys: [], gest: [], lay: [], snd: {} };
      const snd = new Proxy(__lab.sound, { get(t, k) { const v = t[k]; return typeof v !== 'function' ? v : (...a) => { calls.snd[k] = (calls.snd[k] || 0) + 1; return v.apply(t, a); }; } });
      const s = stageScreen(root, __lab.ctx, {
        title: 'Probe', backdrop: 'spark-festival', feedback: false, sound: snd,
        keys: (e, k, phase) => { calls.keys.push(`${k}:${phase}`); return k === 'd'; },
        onGesture: (type) => calls.gest.push(type),
        onLayout: (info) => calls.lay.push(info),
        stageLabel: (name) => `Probe with ${name}`,
      });
      window.__probe = { s, calls };
      return { isStage: __lab.stage === s, label: s.stage.getAttribute('aria-label'), sound: s.companion.sound === snd, wrap: s.wrap?.className, env: !!s.env };
    }, LAB);
    check(scope, '__lab.stage is the newest handle; stageLabel and the sound option reach the lead', r.isStage && r.label === 'Probe with Boppo' && r.sound && r.wrap === 'stage-wrap' && r.env, JSON.stringify(r));
    await page.waitForFunction(() => window.__probe.s.companion.rig.soft && window.__probe.calls.lay.length > 0, null, { timeout: 20000 });
    await sleep(300);
    const lay = await page.evaluate(() => {
      const { s, calls } = window.__probe, L = calls.lay.at(-1), sy = s.screen.getBoundingClientRect().top;
      return { n: calls.lay.length, L, tb: s.screen.querySelector('.topbar').getBoundingClientRect().bottom - sy, bt: s.screen.querySelector('.bottom').getBoundingClientRect().top - sy,
        base: s.companion.rig.opts.baseline, fit: s.companion.rig.opts.fit, sw: s.stage.clientWidth, sh: s.stage.clientHeight, realm: s.env.realmId, ds: s.screen.dataset.realm };
    });
    const L = lay.L;
    check(scope, 'onLayout: { W, H, floor, baseline, fit, band, topBottom, bottomTop } match the screen',
      L && L.W === lay.sw && L.H === lay.sh && Math.abs(L.baseline - L.floor / L.H) < 1e-9 && L.band === L.floor - 96 && L.fit === lay.fit && L.baseline === lay.base
      && Math.abs(L.topBottom - lay.tb) < 0.5 && Math.abs(L.bottomTop - lay.bt) < 0.5 && L.topBottom > 0 && L.bottomTop > L.topBottom, JSON.stringify(lay));
    check(scope, 'the backdrop realm goes through env', lay.realm === 'spark-festival' && lay.ds === 'spark-festival', JSON.stringify(lay));
    await page.evaluate(() => { __lab.events.length = 0; document.activeElement?.blur?.(); });
    await page.keyboard.press('d'); await sleep(200);
    await page.keyboard.press('Enter'); await sleep(300);
    const k = await page.evaluate(() => ({ keys: window.__probe.calls.keys.slice(), ev: __lab.events.map((e) => e.type), chip: document.querySelector('#probe-root .feedback')?.textContent || '', gest: window.__probe.calls.gest.slice() }));
    check(scope, 'keys runs first (down and up); true skips the built-in', k.keys.includes('d:down') && k.keys.includes('d:up') && k.keys.includes('enter:down') && !k.ev.includes('doubletap') && k.ev.includes('tap'), JSON.stringify(k));
    check(scope, 'feedback: false keeps the chip quiet; onGesture sees act()', !/Tap/.test(k.chip) && k.gest.includes('tap'), JSON.stringify(k));
    const pt = await page.evaluate(() => { const s = window.__probe.s, b = s.companion.rig.bodyRect(), o = s.stage.getBoundingClientRect(); window.__probe.calls.snd = {}; window.__probe.calls.gest.length = 0; return { x: o.left + b.cx, y: o.top + b.mid }; });
    await page.mouse.click(pt.x, pt.y); await sleep(500);
    const t = await page.evaluate(() => ({ snd: window.__probe.calls.snd, gest: window.__probe.calls.gest.slice() }));
    check(scope, 'a touch plays through the sound option and reaches onGesture', Object.keys(t.snd).length > 0 && t.gest.includes('tap'), JSON.stringify(t));
    const p = await page.evaluate(() => { const { s, calls } = window.__probe, n0 = calls.lay.length, c = s.setPartner('glitzi'); return { label: s.stages[1]?.getAttribute('aria-label'), sound: c.sound === s.companion.sound, more: calls.lay.length > n0 }; });
    check(scope, 'partner: stageLabel, the same sound, and onLayout after setPartner', p.label === 'Probe with Glitzi' && p.sound && p.more, JSON.stringify(p));
    await page.waitForFunction(() => window.__probe.s.partner?.rig.soft, null, { timeout: 20000 });
    const pg = await page.evaluate(() => { window.__probe.calls.gest.length = 0; window.__probe.s.partner.act('tap'); return window.__probe.calls.gest.slice(); });
    check(scope, 'partner gestures reach onGesture', pg.includes('tap'), JSON.stringify(pg));
    const un = await page.evaluate(() => {
      window.__probe.s.unmount();
      return { stage: __lab.stage, labN: __lab.companions().length, ctxC: __lab.ctx.companion, root: document.querySelector('#probe-root').childElementCount, realms: document.querySelectorAll('canvas.hushfold-realm').length, n: window.__probe.calls.keys.length };
    });
    check(scope, 'unmount: __lab.stage cleared, partner unregistered, realm and screen gone', un.stage === null && un.labN === 0 && un.ctxC === null && un.root === 0 && un.realms === 0, JSON.stringify(un));
    await page.keyboard.press('d'); await sleep(100);
    const after = await page.evaluate(() => window.__probe.calls.keys.length);
    check(scope, 'no key listener left behind', after === un.n, `${un.n} → ${after}`);
    noErrors(scope, errors);
  });

  // Pocket Hush (P12) still mounts its realm through stage-screen
  if (shared('pocket')) await guard('shared:pocket', async (scope, own) => {
    const { ctx, page, errors } = await H.open(browser, 'phone', '#pocket-quick-squeeze');
    own(ctx); await H.waitRig(page);
    await page.waitForFunction(() => document.querySelector('canvas.hushfold-realm'), null, { timeout: 15000 }).catch(() => {});
    const st = await page.evaluate(() => {
      const sc = document.querySelector('.screen.moment'), c = document.querySelector('canvas.hushfold-realm');
      return { moment: !!sc, ds: sc?.dataset.realm, back: sc?.dataset.backdrop, canvas: c?.dataset.realm, n: document.querySelectorAll('canvas.hushfold-realm').length, env: !!__lab.stage?.realm && __lab.stage.realm === __lab.stage.env.realm };
    });
    check(scope, 'a Pocket Hush moment mounts its realm (canvas.hushfold-realm, data-realm, light chrome on Sunpop)', st.moment && st.n === 1 && st.canvas === 'sunpop-orchard' && st.ds === 'sunpop-orchard' && st.back === 'light' && st.env, JSON.stringify(st));
    await page.keyboard.down('s'); await sleep(900); await page.keyboard.up('s'); await sleep(300);
    check(scope, 'S squeezes in the moment', (await H.events(page)).includes('squeeze'));
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => document.querySelector('.screen.pocket .ptiles') && !document.querySelector('canvas.hushfold-realm'), null, { timeout: 10000 }).catch(() => {});
    const r = await page.evaluate(() => ({ picker: !!document.querySelector('.screen.pocket .ptiles'), realms: document.querySelectorAll('canvas.hushfold-realm').length, stage: __lab.stage }));
    check(scope, 'Escape closes the moment to the picker; realm and __lab.stage gone', r.picker && r.realms === 0 && r.stage === null, JSON.stringify(r));
    noErrors(scope, errors);
  });

  // the duet: two Mallows, each on its own stage
  if (shared('duet')) for (const vp of ['phone', 'small', 'desktop']) await guard(`shared:duet:${vp}`, async (scope, own) => {
    const { ctx, page, errors } = await H.open(browser, vp, '#touchtalk', { comfort: H.comfort({ environment: 'moonmilk-cove' }) });
    own(ctx); await H.waitRig(page);
    await page.waitForFunction(() => __lab.stage?.realm, null, { timeout: 15000 }).catch(() => {});
    const lead0 = await page.evaluate(() => ({ cw: __lab.stage.stage.clientWidth, canv: document.querySelectorAll('.screen canvas').length }));
    const ret = await page.evaluate(() => { const c = __lab.stage.setPartner('loomi'); return { ok: !!c && c === __lab.stage.partner, same: __lab.stage.setPartner('loomi') === c, notCtx: __lab.ctx.companion !== c }; });
    check(scope, 'setPartner(\'loomi\') returns the partner; the same id again returns it; never ctx.companion', ret.ok && ret.same && ret.notCtx, JSON.stringify(ret));
    await H.waitRig(page, { partner: true }); await sleep(400);
    const st = await page.evaluate(() => {
      const s = __lab.stage, [a, b] = s.stages, [ca, cb] = s.companions, ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
      const body = (c) => { const r = c.rig.bodyRect(), o = c.stage.getBoundingClientRect(); return { l: o.left + r.cx - r.w / 2, r: o.left + r.cx + r.w / 2, t: o.top + r.top, b: o.top + r.bottom }; };
      return { n: s.companions.length, labN: __lab.companions().length, layout: s.screen.dataset.layout, lead: a.classList.contains('lead'), pClass: b.className, ptab: b.getAttribute('tabindex'), prole: b.getAttribute('role'),
        plabel: b.getAttribute('aria-label'), after: a.nextElementSibling === b, ra: [ra.left, ra.right], rb: [rb.left, rb.right], ba: body(ca), bb: body(cb),
        canvA: ca.rig.canvas.parentElement === a, canvB: cb.rig.canvas.parentElement === b, ready: !!(ca.rig.soft && cb.rig.soft), ids: [ca.id, cb.id],
        baseA: ca.rig.opts.baseline, baseB: cb.rig.opts.baseline, realms: document.querySelectorAll('canvas.hushfold-realm').length };
    });
    check(scope, 'two ready rigs, each canvas inside its own stage', st.n === 2 && st.labN === 2 && st.ready && st.canvA && st.canvB && st.ids.join() === 'boppo,loomi', JSON.stringify(st));
    check(scope, 'duet markup: data-layout duet, .lead, .stage.partner after the lead (tabindex 0, application, label)', st.layout === 'duet' && st.lead && st.pClass === 'stage partner' && st.ptab === '0' && st.prole === 'application' && st.after && /^Loomi\./.test(st.plabel || ''), JSON.stringify(st));
    check(scope, 'no overlap: stages side by side, each body inside its own stage', st.ra[1] <= st.rb[0] + 0.5 && st.ba.l >= st.ra[0] - 1 && st.ba.r <= st.ra[1] + 1 && st.bb.l >= st.rb[0] - 1 && st.bb.r <= st.rb[1] + 1 && st.ba.r <= st.bb.l, JSON.stringify(st));
    check(scope, 'one baseline for both; still one realm', Math.abs(st.baseA - st.baseB) < 1e-9 && st.realms === 1, JSON.stringify(st));
    await H.layout(page, scope);
    // keys reach the focused stage; a held key ends on the Mallow that started it
    await H.clearEvents(page);
    await page.focus('.stage.partner'); await page.keyboard.press('Enter'); await sleep(200);
    const e1 = await lastEvents(page, 3);
    await page.focus('.stage.lead'); await page.keyboard.press('Enter'); await sleep(200);
    const e2 = await lastEvents(page, 1);
    await page.focus('.stage.partner'); await page.keyboard.down('h'); await sleep(600);
    await page.focus('.stage.lead'); await page.keyboard.up('h'); await sleep(200);
    const e3 = await lastEvents(page, 4);
    check(scope, 'Enter on the partner stage taps the partner (partner: true)', e1.some((e) => e.type === 'tap' && e.partner) && !e1.some((e) => e.type === 'tap' && !e.partner), JSON.stringify(e1));
    check(scope, 'Enter on the lead stage taps the lead', e2[0]?.type === 'tap' && !e2[0].partner, JSON.stringify(e2));
    check(scope, 'a held H ends on the Mallow that started it', e3.some((e) => e.type === 'hold' && e.partner) && e3.some((e) => e.type === 'holdend' && e.partner), JSON.stringify(e3));
    // lab.js changes reach the partner (L15 a)
    const lab = await page.evaluate(() => {
      const [ca, cb] = __lab.stage.companions;
      __lab.prefs.set('motion', 'reduced'); const m1 = [ca.rig.opts.reducedMotion, cb.rig.opts.reducedMotion];
      __lab.prefs.set('motion', 'full'); const m2 = [ca.rig.opts.reducedMotion, cb.rig.opts.reducedMotion];
      __lab.dna.set('animationSpeed', 'slower'); const sp = [ca.rig.speed, cb.rig.speed]; __lab.dna.set('animationSpeed', 'natural');
      __lab.prefs.set('quality', 'medium'); const q1 = [ca.rig.quality, cb.rig.quality];
      __lab.prefs.set('quality', 'low'); const q2 = [ca.rig.quality, cb.rig.quality];
      return { m1, m2, sp, q1, q2 };
    });
    check(scope, 'motion, Comfort DNA tuning and quality reach the partner', lab.m1.join() === 'true,true' && lab.m2.join() === 'false,false' && lab.sp[0] === lab.sp[1] && lab.sp[0] < 1 && lab.q1.join() === 'medium,medium' && lab.q2.join() === 'low,low', JSON.stringify(lab));
    // removal
    await page.focus('.stage.partner');
    const rm = await page.evaluate(async () => {
      const p = __lab.stage.partner, r0 = __lab.stage.setPartner(null);
      await new Promise((r) => setTimeout(r, 300));
      const s = __lab.stage;
      return { r0, destroyed: p.destroyed, partner: s.partner, pst: document.querySelectorAll('.stage.partner').length, layout: s.screen.dataset.layout ?? null, lead: s.stage.classList.contains('lead'),
        comps: s.companions.length, labN: __lab.companions().length, stages: s.stages.length, canv: document.querySelectorAll('.screen canvas').length, cw: s.stage.clientWidth, focus: document.activeElement === s.stage };
    });
    check(scope, 'setPartner(null) removes the partner: its stage and canvas, data-layout, .lead, the registration', rm.r0 === null && rm.destroyed && rm.partner === null && rm.pst === 0 && rm.layout === null && !rm.lead && rm.comps === 1 && rm.labN === 1 && rm.stages === 1 && rm.canv === lead0.canv, JSON.stringify({ rm, lead0 }));
    check(scope, 'the lead gets the full stage back, with focus', Math.abs(rm.cw - lead0.cw) <= 1 && rm.focus, JSON.stringify({ rm, lead0 }));
    await page.evaluate(() => __lab.stage.setPartner('zuzu')); await H.waitRig(page, { partner: true });
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => __lab.route === 'home' && __lab.companion?.rig, null, { timeout: 10000 });
    const out = await page.evaluate(() => ({ labN: __lab.companions().length, canv: document.querySelectorAll('canvas').length, stage: __lab.stage }));
    check(scope, 'Escape from a duet: home with 1 Companion and 1 canvas', out.labN === 1 && out.canv === 1 && out.stage === null, JSON.stringify(out));
    noErrors(scope, errors);
  });

  // L4: bodyRect, nudge, frame cap, grade
  if (shared('rig')) await guard('shared:rig', async (scope, own) => {
    const { ctx, page, errors } = await H.open(browser, 'phone', '#touchtalk');
    own(ctx); await H.waitRig(page); await sleep(800);
    const g = await H.geo(page);
    const br = await page.evaluate(() => { const r = __lab.companion.rig, o = {}; return { b: r.bodyRect(), same: r.bodyRect(o) === o }; });
    const keys = ['cx', 'top', 'bottom', 'mid', 'w', 'h', 'W', 'H'];
    check(scope, 'bodyRect equals the harness geo()', keys.every((k) => Math.abs(br.b[k] - g[k]) < 1e-6) && br.same, JSON.stringify({ b: br.b, g }));
    const nd = await page.evaluate(() => {
      const r = __lab.companion.rig, b = r.body, k = r.motionScale * (r.opts.reducedMotion ? 0.25 : 1);
      const l0 = b.leanV, ret = r.nudge({ lean: 1 }) === r;
      return { d: b.leanV - l0, k, ret };
    });
    check(scope, 'nudge({ lean: 1 }) changes body.leanV (by 4·k) and returns the rig', Math.abs(nd.d - 4 * nd.k) < 1e-9 && nd.d !== 0 && nd.ret, JSON.stringify(nd));
    await sleep(1200);
    await page.evaluate(() => __lab.companion.rig.setFrameCap(10));
    const capped = await page.evaluate(rateProbe, 3000);
    check(scope, 'setFrameCap(10): at most 13 renders a second (and still rendering)', capped.rps <= 13 && capped.rps > 3, JSON.stringify(capped));
    await page.evaluate(() => __lab.companion.rig.setFrameCap(0));
    const paused = await page.evaluate(rateProbe, 800);
    check(scope, 'setFrameCap(0) pauses renders', paused.rps === 0, JSON.stringify(paused));
    await page.evaluate(() => __lab.companion.rig.setFrameCap(null));
    const back = await page.evaluate(rateProbe, 2500);
    // uncapped, the rig renders on (almost) every page frame, however slow the machine is
    check(scope, 'setFrameCap(null) restores the rate (a render on almost every frame)', back.rps >= back.fps * 0.75 && (back.fps < 16 || back.rps > capped.rps + 2) && (await page.evaluate(() => __lab.companion.rig.frameCap)) === null, JSON.stringify({ capped, back }));
    // grade: the WebGL mesh is multiplied in the shader (a CSS brightness filter otherwise)
    const waitRenders = (n) => page.waitForFunction((n) => __lab.companion.rig.renders >= n, n, { timeout: 5000 });
    const a = await page.evaluate(lumaProbe);
    await page.evaluate(() => __lab.companion.rig.setGrade([0.5, 0.5, 0.5]));
    await waitRenders(a.renders + 3);
    const b = await page.evaluate(lumaProbe);
    await page.evaluate(() => __lab.companion.rig.setGrade([1, 1, 1]));
    await waitRenders(b.renders + 3);
    const c = await page.evaluate(lumaProbe);
    const ratio = b.mean / a.mean, back1 = c.mean / a.mean;
    const gl = a.mode === 'webgl';
    check(scope, `setGrade([0.5, 0.5, 0.5]) roughly halves the rig's mean luminance (${a.mode})`, a.n > 1000 && a.mean > 0.15 && (gl ? ratio > 0.4 && ratio < 0.6 : /^brightness\(0\.5/.test(b.filter)), JSON.stringify({ a, b, ratio }));
    check(scope, 'setGrade([1, 1, 1]) restores it', back1 > 0.9 && back1 < 1.1 && c.filter === '' && (await page.evaluate(() => __lab.companion.rig.grade.join())) === '1,1,1', JSON.stringify({ c, back1 }));
    noErrors(scope, errors);
  });

  // sound.debug() fields, trim and rest on the real engine
  if (shared('sound')) await guard('shared:sound', async (scope, own) => {
    const { ctx, page, errors } = await H.open(browser, 'phone', '#touchtalk');
    own(ctx); await H.waitRig(page);
    const d0 = await page.evaluate(() => __lab.sound.debug());
    check(scope, 'sound.debug() has trim 1, resting false and keep 0 (no context before a gesture)', d0.trim === 1 && d0.resting === false && d0.keep === 0 && d0.state === 'none', JSON.stringify(d0));
    const p = await bodyPoint(page);
    await page.mouse.click(p.x, p.y); await sleep(200);
    const d1 = await page.evaluate(() => __lab.sound.debug());
    check(scope, 'a tap: the context runs and voices play', d1.state === 'running' && d1.live > 0, JSON.stringify(d1));
    const z = await untilSilent(page);
    check(scope, 'the tap\'s voices end (live 0 within 3.5 s)', z.ok, JSON.stringify(z));
    const tr = await page.evaluate(() => { const s = __lab.sound; s.setTrim(0.5); const a = s.debug().trim; s.setTrim(NaN); const b = s.debug().trim; s.setTrim(1); return { a, b, c: s.debug().trim }; });
    check(scope, 'setTrim shows in debug (0.5; NaN gives 1)', tr.a === 0.5 && tr.b === 1 && tr.c === 1, JSON.stringify(tr));
    await page.evaluate(() => __lab.sound.rest()); await sleep(300);
    const r1 = await page.evaluate(() => __lab.sound.debug());
    await page.mouse.click(p.x, p.y); await sleep(300);
    const r2 = await page.evaluate(() => __lab.sound.debug());
    check(scope, 'rest() suspends and shows resting; a tap wakes it', r1.resting === true && r1.state === 'suspended' && r2.resting === false && r2.state === 'running', JSON.stringify({ r1, r2 }));
    noErrors(scope, errors);
  });

  // lab-ui openSheet and the lab.css sheet: the Done band ends at the sheet's padding (a sheet that fits never
  // scrolls) and a feature's `inset: 0` makes a full-height pill; Escape with focus on the page closes only the
  // sheet; a route change never leaves a sheet's key listener behind to take the next screen's Escape
  if (shared('sheet')) await guard('shared:sheet', async (scope, own) => {
    const { ctx, page, errors } = await H.open(browser, { width: 1280, height: 1100, touch: false }, '#home', { initScripts: [H.INIT.listenerCounter] });
    own(ctx); await H.waitRig(page);
    const keyL = () => page.evaluate(() => __listeners().document.keydown || 0);
    const sheets = () => page.evaluate(() => ({ route: __lab.route, on: document.querySelectorAll('.sheet.on').length, all: document.querySelectorAll('.sheet').length }));
    const openSettings = async () => {
      await page.click('button[aria-label="Settings"]');
      await page.waitForFunction(() => { const s = document.querySelector('.sheet.on'); return s && getComputedStyle(s).transform === 'none'; }, null, { timeout: 10000, polling: 50 });
      await sleep(100);
    };
    const kHome = await keyL();
    await page.click('[data-experience="touchtalk"]');   // a click, as a person: home stays in the history for Back
    await page.waitForFunction(() => __lab.route === 'touchtalk' && __lab.companion?.rig?.soft, null, { timeout: 30000 });
    const k0 = await keyL();
    await openSettings();
    const m = await page.evaluate(() => {
      const s = document.querySelector('.sheet'), d = s.querySelector('.done'), af = getComputedStyle(d, '::after');
      return { sh: s.scrollHeight, ch: s.clientHeight, pb: parseFloat(getComputedStyle(s).paddingBottom), band: parseFloat(af.height), vh: innerHeight };
    });
    check(scope, 'a Settings sheet that fits does not scroll: the Done band is exactly the bottom padding', m.sh === m.ch && Math.abs(m.band - m.pb) <= 0.5, JSON.stringify(m));
    const ins = await page.evaluate(() => {
      const st = document.createElement('style'), lab = document.getElementById('lab');
      st.textContent = '.probe-inset .sheet .done::after { inset: 0; }';   // what Nightlight's pill does
      document.head.append(st); lab.classList.add('probe-inset');
      const d = document.querySelector('.sheet .done'), r = { pill: parseFloat(getComputedStyle(d, '::after').height), done: d.getBoundingClientRect().height };
      st.remove(); lab.classList.remove('probe-inset');
      return r;
    });
    check(scope, "a feature's `inset: 0` on the band gives a pill the Done's full height", ins.done >= 47 && Math.abs(ins.pill - ins.done) <= 1, JSON.stringify(ins));
    await page.click('.sheet h3');
    const ae = await page.evaluate(() => document.activeElement?.tagName);
    await page.keyboard.press('Escape'); await sleep(450);
    const e1 = await sheets(), k1 = await keyL();
    check(scope, 'Escape with focus on the page (the title clicked) closes the sheet and stays on TouchTalk', ae === 'BODY' && e1.route === 'touchtalk' && e1.all === 0, JSON.stringify({ ae, ...e1 }));
    check(scope, 'the closed sheet\'s key listener is gone', k1 === k0, `${k0} → ${k1}`);
    await openSettings();
    await page.goBack();
    await page.waitForFunction(() => __lab.route === 'home', null, { timeout: 10000 });
    await sleep(100);
    const e2 = await sheets(), k2 = await keyL();
    check(scope, 'Back with Settings open: home, no sheet, no key listener left behind', e2.all === 0 && k2 === kHome, JSON.stringify({ ...e2, kHome, k2 }));
    // a sheet the router discards without close() (no feature does this today): it must not take the next screen's keys
    await page.evaluate(async (LAB) => {
      const { openSheet, h } = await import(`${LAB}/lab-ui.js`);
      openSheet(document.getElementById('lab'), 'Probe', () => h('p', {}, 'Probe'));
    }, LAB);
    await page.waitForSelector('.sheet.on');
    await go(page, 'softbody');
    await page.focus('.stage');
    await page.keyboard.press('Escape');
    const left = await page.waitForFunction(() => __lab.route === 'home', null, { timeout: 5000 }).then(() => true, () => false);
    await sleep(100);
    const k3 = await keyL();
    check(scope, 'a sheet discarded by a route change: one Escape still leaves SoftBody', left, JSON.stringify(await sheets()));
    check(scope, 'and the discarded sheet\'s listener removed itself', k3 === kHome, `${kHome} → ${k3}`);
    noErrors(scope, errors);
  });

  // L3: an AmbientBed in the live page
  if (shared('bed')) await guard('shared:bed', async (scope, own) => {
    const { ctx, page, errors } = await H.open(browser, 'phone', '#touchtalk');
    own(ctx); await H.waitRig(page);
    await page.evaluate(async (LAB) => {
      const { AmbientBed } = await import(`${LAB}/core/ambience.js`);
      const { VOICES } = await import(`${LAB}/core/sound-engine.js`);
      const bed = new AmbientBed(__lab.sound, {
        layers: { rain: { f: 1800, q: 0.5, peak: 0.05, color: 'pink' }, wind: { f: 500, peak: 0.04, lfo: 0.1, depth: 0.4 } },
        pad: { root: VOICES.loomi.root },
      });
      bed.set({ rain: 0.8, wind: 0.6, pad: 1 });
      bed.want(true);
      let raf = 0;
      const loop = () => { bed.tick(); raf = requestAnimationFrame(loop); };
      loop();
      window.__bed = bed; window.__bedStop = () => cancelAnimationFrame(raf);
    }, LAB);
    await sleep(600);
    const pre = await page.evaluate(() => ({ alive: __bed.alive, state: __lab.sound.debug().state }));
    check(scope, 'wanted, but before a gesture: no bed and no context', !pre.alive && pre.state === 'none', JSON.stringify(pre));
    const g = await H.geo(page);
    const off = { x: g.ox + 30, y: g.oy + Math.max(110, g.top - 40) };   // a click off the Mallow: unlocks only
    await page.mouse.click(off.x, off.y);
    await page.waitForFunction(() => __bed.alive, null, { timeout: 4000 }).catch(() => {});
    const built = await page.evaluate(() => ({ ...__bed.debug(), snd: __lab.sound.debug(), keep: [...__lab.sound.live].filter((v) => v.keep).map((v) => v.dur) }));
    check(scope, 'after a click the bed is built (one keep voice)', built.alive && built.builds === 1 && built.snd.keep === 1 && built.keep[0] === 600, JSON.stringify(built));
    await page.evaluate(() => __lab.prefs.set('sound', false)); await sleep(500);
    const muted = await page.evaluate(() => ({ alive: __bed.alive, snd: __lab.sound.debug() }));
    check(scope, 'mute kills it (not alive, 0 live voices)', !muted.alive && muted.snd.live === 0, JSON.stringify(muted));
    await sleep(300);
    check(scope, 'no rebuild while muted', !(await page.evaluate(() => __bed.alive)));
    await page.mouse.click(off.x, off.y);   // a fresh activation for the unmute's unlock()
    await page.evaluate(() => __lab.prefs.set('sound', true));
    await page.waitForFunction(() => __bed.alive, null, { timeout: 4000 }).catch(() => {});
    const back = await page.evaluate(() => ({ ...__bed.debug(), snd: __lab.sound.debug() }));
    check(scope, 'unmute rebuilds it', back.alive && back.builds === 2 && back.snd.keep === 1, JSON.stringify(back));
    await page.evaluate(() => { __bed.destroy(); __bedStop(); });
    const z = await untilSilent(page, 3000);
    check(scope, 'destroy(): live voices back to 0', z.ok && !(await page.evaluate(() => __bed.alive)), JSON.stringify(z));
    noErrors(scope, errors);
  });

  // L2: a claim hides the pointer from the Companion; watchPresses fires after ms
  if (shared('pointer')) for (const vp of ['desktop', 'phone']) await guard(`shared:pointer:${vp}`, async (scope, own) => {
    const { ctx, page, errors } = await H.open(browser, vp, '#touchtalk');
    own(ctx); await H.waitRig(page); await sleep(300);
    const touchMode = vp === 'phone';
    await page.evaluate(async (LAB) => {
      const { routePointers, watchPresses } = await import(`${LAB}/core/pointer-router.js`);
      const s = __lab.stage, c = __lab.companion;
      window.__seen = []; window.__log = []; window.__wp = []; window.__claimAll = false;
      const orig = c.handle.bind(c);
      c.handle = (type, d) => { window.__seen.push(type); return orig(type, d); };
      window.__router = routePointers(s.screen, {
        stage: s.stage,
        claim: (p) => (window.__claimAll || p.x < 80 ? {
          move: (p, v) => window.__log.push(['move', Math.round(p.x), Math.round(v.vx)]),
          up: (p, v) => window.__log.push(['up', Math.round(p.x), Math.round(v.vx)]),
          cancel: () => window.__log.push(['cancel']),
        } : null),
      });
      window.__press = watchPresses(s.screen, {
        stage: s.stage, ms: 300,
        onBody: (p) => c.rig.hitTest(p.x, p.y),
        onDown: () => { window.__wp.push('down'); window.__downAt = performance.now(); },
        onPress: (p0) => { window.__wp.push('press:' + Math.round(p0.x)); window.__pressAfter = performance.now() - window.__downAt; },
        onRelease: () => window.__wp.push('release'),
        onTap: (p) => window.__wp.push('tap:' + Math.round(p.x)),
      });
    }, LAB);
    const g = await H.geo(page), ox = g.ox, oy = g.oy;
    const tapAt = (x, y, id) => (touchMode ? H.touch(page, [{ t: 0, points: [{ x, y, id }] }, { t: 60, points: [] }]) : page.mouse.click(x, y));
    const drag = async (x0, y0, x1, y1, steps = 8) => {
      if (touchMode) {
        const fr = [{ t: 0, points: [{ x: x0, y: y0, id: 1 }] }];
        for (let i = 1; i <= steps; i++) fr.push({ t: i * 16, points: [{ x: x0 + (x1 - x0) * i / steps, y: y0 + (y1 - y0) * i / steps, id: 1 }] });
        fr.push({ t: steps * 16 + 16, points: [] });
        await H.touch(page, fr);
      } else {
        await page.mouse.move(x0, y0); await page.mouse.down();
        for (let i = 1; i <= steps; i++) { await page.mouse.move(x0 + (x1 - x0) * i / steps, y0 + (y1 - y0) * i / steps); await sleep(16); }
        await page.mouse.up();
      }
    };
    const reset = () => page.evaluate(() => { window.__seen.length = 0; window.__log.length = 0; window.__wp.length = 0; __lab.events.length = 0; });
    await reset();
    await drag(ox + 30, oy + g.mid, ox + 70, oy + g.mid - 40); await sleep(200);
    const a = await page.evaluate(() => ({ log: window.__log.slice(), seen: window.__seen.slice(), active: window.__router.active }));
    check(scope, 'a claimed pointer: moves, then one up with velocity', a.log.filter((x) => x[0] === 'move').length >= 4 && a.log.filter((x) => x[0] === 'up').length === 1 && a.log.some((x) => x[0] === 'move' && x[2] > 0) && !a.log.some((x) => x[0] === 'cancel') && a.active === 0, JSON.stringify(a));
    check(scope, 'a claimed pointer never reaches the Companion', a.seen.length === 0, JSON.stringify(a.seen));
    await reset();
    await page.evaluate(() => { window.__claimAll = true; });
    await tapAt(ox + g.cx, oy + g.mid, 2); await sleep(400);
    const b = await page.evaluate(() => ({ log: window.__log.slice(), seen: window.__seen.slice(), ev: __lab.events.map((e) => e.type) }));
    check(scope, 'a claim on the body: the Companion sees nothing (no contact, no tap)', b.log.some((x) => x[0] === 'up') && b.seen.length === 0 && !b.ev.includes('tap'), JSON.stringify(b));
    await reset();
    await page.evaluate(() => { window.__claimAll = false; });
    await tapAt(ox + g.cx, oy + g.mid, 3); await sleep(500);
    const c = await page.evaluate(() => ({ log: window.__log.slice(), seen: window.__seen.slice(), ev: __lab.events.map((e) => e.type), wp: window.__wp.slice() }));
    check(scope, 'an unclaimed body tap reaches the Companion; watchPresses only sees the down (on body)', c.log.length === 0 && c.seen.includes('tap') && c.ev.includes('tap') && c.wp.join() === 'down', JSON.stringify(c));
    // a long press well off the body (rig.hitTest has a generous margin)
    await reset();
    const px = ox + Math.min(g.cx + g.w / 2 + 110, g.W - 20), py = oy + g.mid;
    // timed in the page (the press's delay after its down), so a busy machine cannot fake an early press
    const pressed = () => page.waitForFunction(() => window.__press.pressing === 1, null, { timeout: 3000 }).catch(() => {});
    let late, done, cdp = null;
    await page.evaluate(() => { window.__pressAfter = null; });
    if (touchMode) {
      cdp = await page.context().newCDPSession(page);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: px, y: py, id: 4 }] });
    } else { await page.mouse.move(px, py); await page.mouse.down(); }
    await pressed();
    late = await page.evaluate(() => ({ wp: window.__wp.slice(), pressing: window.__press.pressing, after: window.__pressAfter }));
    if (cdp) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await cdp.detach().catch(() => {}); } else await page.mouse.up();
    await sleep(100);
    done = await page.evaluate(() => ({ wp: window.__wp.slice(), pressing: window.__press.pressing, seen: window.__seen.slice() }));
    check(scope, 'watchPresses (ms 300): an off-body press fires 300 ms after its down, then releases on up', late.wp.join().startsWith('down,press:') && late.pressing === 1 && late.after >= 299 && late.after < 1000 && done.wp.at(-1) === 'release' && done.pressing === 0, JSON.stringify({ late, done }));
    check(scope, 'watchPresses is passive: the Companion still saw the pointer', done.seen.length > 0, JSON.stringify(done.seen));
    await reset();
    await tapAt(px, py, 5); await sleep(400);
    const tp = await page.evaluate(() => window.__wp.slice());
    await reset();
    await drag(px, py, px, py - 60, 2); await sleep(400);
    const mv = await page.evaluate(() => window.__wp.slice());
    check(scope, 'watchPresses: a quick off-body tap is onTap; one moved past the slop is nothing', tp.join() === `down,tap:${Math.round(px - ox)}` && mv.join() === 'down', JSON.stringify({ tp, mv }));
    if (!touchMode) {
      await reset();
      await page.mouse.move(px, py); await page.mouse.down(); await sleep(450);
      await page.evaluate(() => window.dispatchEvent(new Event('blur')));
      const bl = await page.evaluate(() => ({ wp: window.__wp.slice(), pressing: window.__press.pressing }));
      await page.mouse.up();
      check(scope, 'blur releases an active press', bl.wp.some((x) => x.startsWith('press')) && bl.wp.at(-1) === 'release' && bl.pressing === 0, JSON.stringify(bl));
      await reset();
      await page.mouse.move(ox + 30, oy + g.mid); await page.mouse.down(); await page.mouse.move(ox + 40, oy + g.mid);
      await page.evaluate(() => window.dispatchEvent(new Event('blur')));
      const cb = await page.evaluate(() => ({ log: window.__log.slice(), active: window.__router.active }));
      await page.mouse.up();
      check(scope, 'blur cancels a claimed pointer', cb.log.at(-1)?.[0] === 'cancel' && cb.active === 0, JSON.stringify(cb));
    }
    await page.evaluate(() => { window.__router.dispose(); window.__press.dispose(); });
    await reset();
    await drag(ox + 30, oy + g.mid, ox + 70, oy + g.mid); await sleep(400);
    const d = await page.evaluate(() => ({ log: window.__log.slice(), wp: window.__wp.slice() }));
    check(scope, 'after dispose() nothing is routed or watched', d.log.length === 0 && d.wp.length === 0, JSON.stringify(d));
    noErrors(scope, errors);
  });

  // isolation: every Phase 3 screen leaves nothing behind
  if (shared('isolation')) await guard('shared:isolation', async (scope, own) => {
    const I = H.INIT;
    const { ctx, page, errors } = await H.open(browser, 'phone', '#home', { initScripts: [I.listenerCounter, I.timerSpy, I.rafProbe, I.audioSpy] });
    own(ctx); await H.waitRig(page);
    const hero = await bodyPoint(page);
    await page.mouse.click(hero.x, hero.y);   // the sound engine exists before the baseline
    await untilSilent(page, 5000); await sleep(1500);
    const snap = () => page.evaluate(async (LAB) => {
      const { glowSpriteCount } = await import(`${LAB}/core/effects.js`);
      const s = __lab.sound;
      return {
        listeners: __listeners(), timers: __timers().live, raf: __raf().pendingByFile, audio: __audio().created,
        prefsL: __lab.prefs.listeners.size, dnaL: __lab.dna.listeners.size, canvases: document.querySelectorAll('canvas').length,
        screens: document.querySelectorAll('.screen').length, comps: __lab.companions().length, stage: __lab.stage, sprites: glowSpriteCount(),
        handles: ['weather', 'hushbeat', 'nightlight'].filter((k) => __lab[k] != null),
        parts: { voice: s.voiceOn, fx: s.fxOn }, tuning: { voice: __lab.dna.tuning().voice, fx: __lab.dna.tuning().touchSounds },
        prefs: Object.fromEntries(['sound', 'volume', 'motion', 'theme', 'quality', 'haptics', 'material', 'mallow'].map((k) => [k, __lab.prefs.get(k)])),
      };
    }, LAB);
    const base = await snap();
    const sum = (o, k) => Object.values(o).reduce((a, c) => a + c[k], 0);
    // live timers by file, beyond what home itself had
    const extraTimers = (now) => Object.entries(now).map(([f, c]) => [f, c.timeout - (base.timers[f]?.timeout || 0), c.interval - (base.timers[f]?.interval || 0)]).filter(([, t, i]) => t > 0 || i > 0);
    const extraRaf = (now) => Object.entries(now).filter(([f, n]) => n > (base.raf[f] || 0));
    check(scope, 'baseline at home: 1 canvas, 1 Companion, no stage handle', base.canvases === 1 && base.comps === 1 && base.stage === null, JSON.stringify(base));
    for (let round = 1; round <= 3; round++) {
      for (const id of [...FEATURES, 'touchtalk']) {
        await go(page, id);
        await sleep(500);
        if (id === 'touchtalk') {
          // before any touch here: Nightlight's rest() stayed behind with its screen (sound.wake() in route())
          const t = await page.evaluate(() => ({ trim: __lab.sound.trim, resting: __lab.sound.resting, state: __lab.sound.debug().state }));
          check(scope, `round ${round}: back in TouchTalk the trim is 1`, t.trim === 1, JSON.stringify(t));
          check(scope, `round ${round}: back in TouchTalk, before a touch, the sound is awake (a rest left Nightlight with it)`, t.resting === false && t.state === 'running', JSON.stringify(t));
        }
        const p = await bodyPoint(page);
        await page.mouse.click(p.x, p.y); await sleep(250);
        await page.focus('.stage').catch(() => {});
        await page.keyboard.press('Enter'); await sleep(300);
        if (id === 'nightlight') await page.evaluate(() => __lab.sound.rest());   // as after Quiet, or Volume 0 and 10 s still
      }
      const st = await page.evaluate(() => {
        const c = __lab.companion, r = c.rig, s = __lab.sound;
        return { route: __lab.route, resting: s.resting, state: s.debug().state, filter: c.persona.filter, cap: r.frameCap, grade: [...r.grade], peek: r.peekParams, trim: s.trim };
      });
      check(scope, `round ${round}: after a tap nothing rests; persona filter, frame cap, grade and peek are neutral`,
        st.route === 'touchtalk' && st.resting === false && st.state === 'running' && st.filter === null && st.cap === null && st.grade.join() === '1,1,1' && st.peek === null && st.trim === 1, JSON.stringify(st));
      await go(page, 'home');
      const z = await untilSilent(page, 3500);
      check(scope, `round ${round}: 0 live voices within 3.5 s at home`, z.ok, JSON.stringify(z));
      // timers settle: wait (up to 4 s) until none beyond the baseline is live
      let now = await snap();
      for (let t0 = Date.now(); extraTimers(now.timers).length && Date.now() - t0 < 4000;) { await sleep(250); now = await snap(); }
      check(scope, `round ${round}: 1 canvas and 1 screen on home; 1 Companion; no stage or feature handles`, now.canvases === 1 && now.screens === 1 && now.comps === 1 && now.stage === null && !now.handles.length, JSON.stringify(now));
      const dl = Object.fromEntries([...new Set([...Object.keys(now.listeners.window), ...Object.keys(base.listeners.window)])].map((k) => ['window.' + k, (now.listeners.window[k] || 0) - (base.listeners.window[k] || 0)])
        .concat([...new Set([...Object.keys(now.listeners.document), ...Object.keys(base.listeners.document)])].map((k) => ['document.' + k, (now.listeners.document[k] || 0) - (base.listeners.document[k] || 0)])).filter(([, d]) => d));
      check(scope, `round ${round}: window and document listeners back to the baseline (${base.listeners.total})`, now.listeners.total === base.listeners.total && !Object.keys(dl).length, JSON.stringify(dl));
      check(scope, `round ${round}: prefs and Comfort DNA listeners back to the baseline`, now.prefsL === base.prefsL && now.dnaL === base.dnaL, JSON.stringify({ base: [base.prefsL, base.dnaL], now: [now.prefsL, now.dnaL] }));
      check(scope, `round ${round}: timers back to the baseline (no interval, no timeout beyond home's)`, !extraTimers(now.timers).length && sum(now.timers, 'interval') === sum(base.timers, 'interval'), JSON.stringify({ extra: extraTimers(now.timers), base: base.timers, now: now.timers }));
      check(scope, `round ${round}: no animation loop left running (pending rAF by file within home's)`, !extraRaf(now.raf).length, JSON.stringify({ base: base.raf, now: now.raf }));
      check(scope, `round ${round}: one AudioContext; glow sprites released`, now.audio === base.audio && now.audio === 1 && now.sprites === 0, JSON.stringify({ audio: now.audio, sprites: now.sprites }));
      check(scope, `round ${round}: device prefs and sound switches unchanged`, JSON.stringify(now.prefs) === JSON.stringify(base.prefs) && now.parts.voice === now.tuning.voice && now.parts.fx === now.tuning.fx, JSON.stringify({ base: base.prefs, now: now.prefs, parts: now.parts, tuning: now.tuning }));
    }
    noErrors(scope, errors);
  });
}

// ------------------------------------------------------------------- main --
(async () => {
  const browser = await H.launch();
  const suites = {};
  try {
    if (wants('shared')) await sharedBlock(browser);
    for (const id of FEATURES) {
      if (!wants(id)) continue;
      const file = path.join(__dirname, `e2e-phase3-${id}.cjs`);
      if (!fs.existsSync(file)) { suites[id] = 'missing'; console.log(`  · ${id}: tests/e2e-phase3-${id}.cjs is not there yet; skipped`); continue; }
      suites[id] = 'ran';
      await guard(`${id}:suite`, async () => { await require(file).run(browser, { out: path.join(OUT, id), only: sub(id) }); });
    }
  } finally {
    await browser.close();
  }
  const { failed } = H.writeReport(OUT, 'e2e-phase3');
  const file = path.join(OUT, 'e2e-phase3.json');
  fs.writeFileSync(file, JSON.stringify({ ...JSON.parse(fs.readFileSync(file, 'utf8')), suites }, null, 1));
  // Each feature's own report beside its screenshots, as its standalone run writes it,
  // from this run's results; only when the whole feature ran (not one PART block).
  for (const id of FEATURES) {
    if (suites[id] !== 'ran' || !H.only(id)) continue;
    const mod = require(path.join(__dirname, `e2e-phase3-${id}.cjs`)), dir = path.join(OUT, id), name = `e2e-phase3-${id}`;
    H.writeReport(dir, name, { prefix: `${id}:` });
    const f = path.join(dir, `${name}.json`), rep = JSON.parse(fs.readFileSync(f, 'utf8'));
    const brief = mod.briefMap ? mod.briefMap(rep.results) : mod.BRIEF;
    if (brief) fs.writeFileSync(f, JSON.stringify({ ...rep, brief }, null, 1));
  }
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
