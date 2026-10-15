// Real-model check of Another Angle, browser level: the BUILT site (tools/build-site.sh) in Chromium, pointed at the local
// harness with ?angleDev=<port>, every request recorded and anything leaving this machine blocked. Run by
// .github/workflows/another-angle-real.yml after server/another-angle/scripts/real-check.mjs (the API level).
//
//   node hushmallow/tools/beyond/real-client.cjs --site http://127.0.0.1:8000 --dev 8790 --out DIR
//        [--budget DIR/budget.json] [--log <harness stderr file>] [--size 390x844] [--text "…"] [--no-fail]
//
// Steps (each in a fresh browser context unless said):
//   consent      the consent card is the first thing shown, with the owner's approved provider lines, and nothing is sent
//                (also screenshotted at 320x568)
//   not-now      "Not now" → Tell → the question → "Another angle": Zuzu's own angle plays and nothing is ever sent
//   yes-question consent "Accept" → Tell → the question ("Shall we look at this from another angle, or just be with it?"),
//                nothing sent before it is answered
//   yes-angle    "Another angle" → /v1/session + /v1/angle → a REAL angle (the only step that can reach the model; it is
//                skipped when budget.json has no room for one more worst-case request) → its two lines on screen
//   delete       Settings → "Delete my Another Angle data" → the sheet (with the approved provider line) → Delete: the
//                sharing choice, device code and session are gone, and Another Angle asks for consent again
//   be-with      sharing on → Tell → "Just be with it": the quiet path, nothing sent
//   crisis, care sharing on → a crisis sentence / a care sentence: support, nothing sent
//   console      0 console errors, 0 page errors, 0 requests to anywhere but this machine
// Writes DIR/client.json and screenshots (DIR/real-*.png). Exits 1 on any failure unless --no-fail.
// Playwright: PLAYWRIGHT_DIR (a node_modules folder) or /opt/node-tools/node_modules; E2E_CHROMIUM / E2E_CHROMIUM_ARGS as
// in tests/e2e/auth.e2e.mjs. The sentences are synthetic.
const { createRequire } = require('module');
const fs = require('fs');
const path = require('path');

const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf(`--${k}`); return i >= 0 && argv[i + 1] !== undefined && !argv[i + 1].startsWith('--') ? argv[i + 1] : d; };
const SITE = opt('site', 'http://127.0.0.1:8000').replace(/\/+$/, '');
const DEV = opt('dev', '8790');
const OUT = path.resolve(opt('out', path.join(process.cwd(), 'real-check-out')));
const BUDGET = opt('budget', path.join(OUT, 'budget.json'));
const [W, H] = opt('size', '390x844').split('x').map(Number);
// (a guess with its marker, "must think", so the app's own guard lets the model's framing through: guessGuard in src/beyond/authored.js)
const TEXT = opt('text', 'A colleague sighed when I asked a question in the stand-up, so she must think I’m useless at this job.');
const CRISIS = 'I want to kill myself tonight.';
const CARE = 'My partner hits me when he’s had a drink and I’m scared to go home.';
const NO_FAIL = argv.includes('--no-fail');
const ANGLE_Q = 'Shall we look at this from another angle, or just be with it?';
const ROOT = path.join(__dirname, '../..');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const norm = (s) => String(s || '').replace(/\s+/g, ' ').trim();

// the approved wording and the store version, read from the app itself (src/beyond/consent.js) so this never drifts
const CONSENT_SRC = fs.readFileSync(path.join(ROOT, 'src/beyond/consent.js'), 'utf8');
const constOf = (name) => (new RegExp(`export const ${name} = '([^']+)'`).exec(CONSENT_SRC) || [])[1] || null;
const APPROVED = { retention: constOf('PROVIDER_RETENTION'), hold: constOf('PROVIDER_SAFETY_HOLD'), use: constOf('PROVIDER_USE'), del: constOf('PROVIDER_DELETE') };
const CONSENT_VERSION = Number((/export const CONSENT_VERSION = (\d+)/.exec(CONSENT_SRC) || [])[1] || 2);
const CLIENT_TIMEOUT_MS = Number((/angle:\s*(\d+)/.exec(fs.readFileSync(path.join(ROOT, 'src/beyond/angle-client.js'), 'utf8')) || [])[1] || 17000);

const res = { site: SITE, dev: DEV, viewport: `${W}x${H}`, started: new Date().toISOString(), finished: '', steps: [], angle: null, requests: [], blocked: [], errors: [], consoleErrors: 0, screenshots: [], calls: 0, micros: 0, fatal: null };
const step = (id, what, pass, detail = '', data = undefined, skipped = false) => {
  res.steps.push({ id, what, pass: !!pass, ...(skipped ? { skipped: true } : {}), detail: String(detail || ''), ...(data !== undefined ? { data } : {}) });
  // the Actions log is public: the id and the verdict (the detail is in client.json, in the artifact)
  console.log(`${pass ? 'PASS' : skipped ? 'SKIP' : 'FAIL'}  [browser] ${id}`);
  return pass;
};

function loadPlaywright() {
  for (const d of [process.env.PLAYWRIGHT_DIR, '/opt/node-tools/node_modules'].filter(Boolean)) {
    try { return createRequire(path.join(d, 'noop.cjs'))('playwright'); } catch { /* next */ }
  }
  return require('playwright');
}

// ------------------------------------------------------------------ harness log (calls and cost of this stage) --
const logFile = (() => { try { return opt('log', JSON.parse(fs.readFileSync(BUDGET, 'utf8')).log || ''); } catch { return opt('log', ''); } })();
const logStart = (() => { try { return logFile && fs.existsSync(logFile) ? fs.statSync(logFile).size : 0; } catch { return 0; } })();
function stageUsage() {
  if (!logFile || !fs.existsSync(logFile)) return { calls: 0, micros: 0, lines: [] };
  const buf = fs.readFileSync(logFile).subarray(logStart).toString('utf8');
  const lines = buf.split('\n').filter((l) => l.startsWith('{')).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter((l) => l && l.evt === 'angle');
  return { calls: lines.reduce((a, l) => a + (typeof l.attempts === 'number' ? l.attempts : l.err === 'exception' ? 2 : 0), 0), micros: lines.reduce((a, l) => a + (l.cost_micros || 0), 0), lines };
}
/** Room for one more worst-case request (real-check.mjs wrote budget.json; the harness's own spend cap stays in force too). */
function budgetRoom() {
  let b = null;
  try { b = JSON.parse(fs.readFileSync(BUDGET, 'utf8')); } catch { return { ok: false, why: `no ${BUDGET} (run real-check.mjs api first)` }; }
  const used = stageUsage();
  const calls = (b.calls || 0) + used.calls, micros = (b.micros || 0) + used.micros;
  if (calls + 2 > b.max_calls) return { ok: false, why: `--max-calls ${b.max_calls}: ${calls} used` };
  if (micros + (b.worst_micros || 0) > b.max_micros) return { ok: false, why: `--max-usd ${(b.max_micros / 1e6).toFixed(2)}: $${(micros / 1e6).toFixed(4)} used, worst case of one more $${((b.worst_micros || 0) / 1e6).toFixed(2)}` };
  return { ok: true, why: '' };
}

// ------------------------------------------------------------------ browser helpers --
let tid = 40;
const touch = (cdp, type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts });
async function tap(o, x, y) { const id = ++tid; await touch(o.cdp, 'touchStart', [{ x, y, id, radiusX: 8, radiusY: 8, force: 1 }]); await sleep(70); await touch(o.cdp, 'touchEnd', []); }
async function tapEl(o, sel, text = null, timeout = 30000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    const r = await o.page.evaluate(({ sel, text }) => {
      const e = [...document.querySelectorAll(sel)].find((x) => !x.hidden && x.offsetParent && (!text || x.textContent.includes(text)));
      if (!e) return null;
      e.scrollIntoView?.({ block: 'nearest' });
      const b = e.getBoundingClientRect();
      return { x: b.left + b.width / 2, y: b.top + b.height / 2 };
    }, { sel, text });
    if (r) { await tap(o, r.x, r.y); return true; }
    await sleep(150);
  }
  throw new Error(`nothing to tap: ${sel}${text ? ` "${text}"` : ''}`);
}
async function shot(o, name) {
  await sleep(400);
  const f = path.join(OUT, `real-${name}-${o.w}x${o.h}.png`);
  try { await o.page.screenshot({ path: f }); res.screenshots.push(f); } catch { /* page gone */ }
  return f;
}
const v1 = (o, since = 0) => o.req.filter((q) => q.at >= since).map((q) => q.p);
const chips = (o) => o.page.$$eval('.hf-chips:not([hidden]) .hf-chip', (els) => els.filter((e) => e.offsetParent).map((e) => e.textContent.trim())).catch(() => []);
const said = (o) => o.page.evaluate(() => window.__realSaid || []).catch(() => []);
const angleState = (o) => o.page.evaluate(() => {
  const A = window.__angle;
  if (!A) return null;
  return { phase: A.S.phase, level: A.S.level, crisis: !!A.S.crisis, care: !!A.S.care, mech: A.mechId || null, server: A.serverMode(), source: A.S.scene?.source || null, consentCard: !!A.consent };
}).catch(() => null);
const store = (o) => o.page.evaluate(() => Object.fromEntries(Object.keys(localStorage).filter((k) => /beyond\./.test(k)).map((k) => [k, localStorage.getItem(k)]))).catch(() => ({}));

async function open(browser, { consent = null, w = W, h = H } = {}) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, hasTouch: true, isMobile: true });
  const o = { ctx, page: null, cdp: null, req: [], w, h };
  // nothing leaves this machine: the production Worker (the app's built-in endpoint), fonts, anything
  await ctx.route('**/*', (route) => {
    const u = new URL(route.request().url());
    if (['127.0.0.1', 'localhost'].includes(u.hostname) || u.protocol === 'data:' || u.protocol === 'blob:') return route.continue();
    res.blocked.push(u.href.slice(0, 200));
    return route.abort();
  });
  await ctx.addInitScript(({ consent, version }) => {
    try {
      if (!sessionStorage.getItem('real:seeded')) {
        sessionStorage.setItem('real:seeded', '1');
        localStorage.setItem('hm2:entitlement', JSON.stringify({ tier: 'paid', source: 'test', since: Date.now() }));
        if (consent) localStorage.setItem('hm2:beyond.consent', JSON.stringify({ v: version, choice: consent, at: '2026-10-15' }));
      }
    } catch { /* storage blocked */ }
    window.__realSaid = [];
    new MutationObserver(() => {
      for (const e of document.querySelectorAll('.hf-subs .hf-sub .text, .hf-sublive .hf-sub .text')) {
        const t = (e.textContent || '').replace(/\s+/g, ' ').trim();
        if (t && !window.__realSaid.slice(-6).includes(t)) window.__realSaid.push(t);
      }
    }).observe(document, { subtree: true, childList: true, characterData: true });
  }, { consent, version: CONSENT_VERSION });
  o.page = await ctx.newPage();
  o.page.on('request', (r) => { const u = r.url(); if (u.includes(`:${DEV}/v1/`)) { const q = { m: r.method(), p: u.replace(/^https?:\/\/[^/]+/, '').replace(/\?.*$/, ''), at: Date.now() }; o.req.push(q); res.requests.push(q); } });
  o.page.on('pageerror', (e) => res.errors.push(`pageerror: ${String(e.message || e).slice(0, 400)}`));
  o.page.on('console', (m) => { if (m.type() === 'error' && !/favicon/.test(m.text())) res.errors.push(`console: ${m.text().slice(0, 400)}`); });
  o.cdp = await ctx.newCDPSession(o.page);
  await o.page.goto(`${SITE}/index.html?angleDev=${DEV}`);
  await o.page.waitForFunction(() => window.__hush && window.__hush.world && window.__hushfold, null, { timeout: 120000 });
  await o.page.evaluate(async () => { if (!window.__hush.ent.has('ultra')) await window.__hush.ent.purchase('ultra'); });
  return o;
}
async function goAngle(o) {
  await o.page.evaluate(() => window.__hush.go('angle'));
  await o.page.waitForFunction(() => window.__angle && window.__angle.zuzu, null, { timeout: 120000 });
}
const waitTellChip = (o) => o.page.waitForFunction(() => [...document.querySelectorAll('.hf-chips:not([hidden]) .hf-chip, [data-bx=tell]')].some((e) => !e.hidden && e.offsetParent && /Tell Zuzu/.test(e.textContent)), null, { timeout: 90000, polling: 100 });
async function tell(o, text) {
  await waitTellChip(o);
  await sleep(400);
  await tapEl(o, '.hf-chips:not([hidden]) .hf-chip, [data-bx=tell]', 'Tell Zuzu');
  await o.page.waitForSelector('.hf-input textarea', { state: 'visible', timeout: 30000 });
  await sleep(350);
  await o.page.fill('.hf-input textarea', text);
  await sleep(700);
  const at = Date.now();
  await tapEl(o, '.hf-input .hf-send:not([disabled])');
  return at;
}
/** The question with both answers on screen. */
const waitQuestion = (o) => o.page.waitForFunction((q) => (window.__realSaid || []).includes(q)
  && [...document.querySelectorAll('.hf-chips:not([hidden]) .hf-chip')].some((e) => e.offsetParent && /Just be with it/.test(e.textContent)), ANGLE_Q, { timeout: 45000, polling: 100 }).then(() => true).catch(() => false);
/** Answers the question (the chip may still be fading in, so a tap that did not land is tried again). */
async function answer(o, label) {
  for (let i = 0; i < 4; i++) {
    await tapEl(o, '.hf-chips:not([hidden]) .hf-chip', label);
    const left = await o.page.waitForFunction(() => window.__angle?.S?.phase !== 'asking', null, { timeout: 4000, polling: 100 }).then(() => true).catch(() => false);
    if (left) return true;
  }
  return false;
}
/**
 * Plays the mechanic through as a keyboard or switch user would (its assist(), the dock's pill), answering a mechanic's own
 * choice with its first option and tapping a held line's Continue, until `done` holds or ~90 s pass.
 */
async function playThrough(o, done, arg) {
  for (let i = 0; i < 100; i++) {
    if (await o.page.evaluate(done, arg).catch(() => false)) return true;
    const t = await o.page.evaluate(() => {
      const vis = (e) => e && !e.hidden && e.offsetParent;
      const go = [...document.querySelectorAll('.hf-subs button')].find((e) => vis(e) && /Continue/.test(e.textContent));
      const A = window.__angle;
      const own = A?.mech && A.S.phase === 'playing' ? [...document.querySelectorAll('.hf-chips:not([hidden]) .hf-chip')].find((e) => vis(e) && !/support|Finish|squeeze/i.test(e.textContent)) : null;
      const pick = go || own;
      if (pick) { const b = pick.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; }
      if (A && ['playing', 'waiting'].includes(A.S.phase)) A.assist();
      return null;
    }).catch(() => null);
    if (t) { await tap(o, t.x, t.y); await sleep(700); } else await sleep(900);
  }
  return false;
}
const waitConsent = (o) => o.page.waitForSelector('[data-bx=consent]', { state: 'visible', timeout: 60000 }).then(() => true).catch(() => false);

// ------------------------------------------------------------------ the steps --
async function stepConsent(browser) {
  const o = await open(browser);
  try {
    await goAngle(o);
    const shown = await waitConsent(o);
    await sleep(1200);
    const text = norm(await o.page.$eval('[data-bx=consent]', (e) => e.textContent).catch(() => ''));
    const missing = ['retention', 'hold', 'use'].filter((k) => !APPROVED[k] || !text.includes(norm(APPROVED[k])));
    const st = await angleState(o);
    await shot(o, 'consent');
    step('consent', 'the consent card comes first, with the approved provider lines, nothing sent', shown && !missing.length && !v1(o).length && st?.phase === 'consent',
      `card=${shown} phase=${st?.phase} missing=${missing.join(',') || 'none'} requests=${JSON.stringify(v1(o))}`);
    // "Not now": then a whole angle, and nothing is ever sent
    await tapEl(o, '[data-bx=consent] .bx-notnow');
    await sleep(600);
    const choice = (await store(o))['hm2:beyond.consent'] || '';
    await tell(o, TEXT);
    const asked = await waitQuestion(o);
    const before = v1(o);
    const chose = asked && await answer(o, 'Another angle');
    // Zuzu's own scene, played through to its title ("A new perspective", or "Something kind") and the two lines after it
    const played = chose && await playThrough(o, () => { const s = window.__realSaid || []; const i = Math.max(s.lastIndexOf('A new perspective'), s.lastIndexOf('Something kind')); return i >= 0 && s.length >= i + 3; });
    await sleep(1500);
    const st2 = await angleState(o);
    await shot(o, 'not-now-angle');
    step('not-now', '"Not now" → the question → "Another angle": Zuzu’s own angle, nothing sent', /"choice":"no"/.test(choice) && asked && chose && played && !before.length && !v1(o).length && st2 && !st2.server,
      `choice=${choice} question=${asked} answered=${chose} lines=${played} mech=${st2?.mech} source=${st2?.source} sharing=${st2?.server} requests=${JSON.stringify(v1(o))}`, { said: (await said(o)).slice(-8) });
  } finally { await o.ctx.close(); }
  // the card at the smallest supported phone
  const s = await open(browser, { w: 320, h: 568 });
  try {
    await goAngle(s);
    const shown = await waitConsent(s);
    await sleep(1500);
    const fits = await s.page.evaluate(() => { const e = document.querySelector('[data-bx=consent]'); if (!e) return null; const b = e.getBoundingClientRect(); const btns = [...e.querySelectorAll('.bx-accept, .bx-notnow')].map((x) => x.getBoundingClientRect()); return { left: b.left, right: b.right, vw: innerWidth, btnsOnScreen: btns.every((r) => r.bottom <= innerHeight && r.top >= 0 && r.width >= 44) }; });
    await shot(s, 'consent');
    step('consent-320', 'the consent card at 320x568: inside the screen, both answers reachable, nothing sent', shown && fits && fits.left >= 0 && fits.right <= fits.vw + 0.5 && fits.btnsOnScreen && !v1(s).length, JSON.stringify(fits));
  } finally { await s.ctx.close(); }
}

async function stepYes(browser) {
  const o = await open(browser);
  try {
    await goAngle(o);
    await waitConsent(o);
    await sleep(800);
    await tapEl(o, '[data-bx=consent] .bx-accept');
    await sleep(600);
    const at = await tell(o, TEXT);
    const asked = await waitQuestion(o);
    await sleep(1500);
    const before = v1(o, at);
    await shot(o, 'question');
    step('yes-question', 'consent "Accept" → Tell → the question first, nothing sent before it is answered', asked && !before.length, `question=${asked} requests=${JSON.stringify(before)}`, { said: (await said(o)).slice(-6), chips: await chips(o) });
    if (!asked) return;

    const room = budgetRoom();
    if (!room.ok) { step('yes-angle', '"Another angle" → a real angle with its lines on screen', false, `skipped: ${room.why}`, undefined, true); }
    else {
      /** the /v1/angle answer, as the app received it */
      let reply = null;
      const got = new Promise((resolve) => {
        o.page.on('response', async (r) => {
          if (!r.url().includes(`:${DEV}/v1/angle`) || r.request().method() !== 'POST') return;
          let j = null;
          try { j = await r.json(); } catch { j = null; }
          reply = { http: r.status(), json: j, at: Date.now() };
          resolve(reply);
        });
      });
      const t0 = Date.now();
      await answer(o, 'Another angle');
      await Promise.race([got, sleep(45000)]);
      const ms = reply ? reply.at - t0 : null;
      const lines = reply?.json?.scene ? [reply.json.scene.subtitle_line_1, reply.json.scene.subtitle_line_2].map(norm) : null;
      let onScreen = null, played = null;
      if (lines) {
        // played through to the scene's title and the two lines after it: the model's, or the app's own if a guard swapped them
        const titled = () => { const s = window.__realSaid || []; const i = Math.max(s.lastIndexOf('A new perspective'), s.lastIndexOf('Something kind')); return i >= 0 && s.length >= i + 3; };
        await playThrough(o, titled);
        const s = (await said(o)).map(norm);
        const i = Math.max(s.lastIndexOf('A new perspective'), s.lastIndexOf('Something kind'));
        const shown = i >= 0 ? s.slice(i + 1, i + 3) : [];
        onScreen = lines.filter((l) => s.includes(l));
        played = shown.length && shown.join('|') !== lines.join('|') ? shown : null;
      }
      await sleep(1500);
      const st = await angleState(o);
      await shot(o, 'angle');
      const reqs = v1(o, at);
      res.angle = { http: reply?.http ?? null, status: reply?.json?.status ?? null, fallback: reply?.json?.fallback?.reason ?? null, lines, onScreen, replacedBy: played, ms, source: st?.source ?? null, mech: st?.mech ?? null, pattern: reply?.json?.scene?.reasoning_pattern ?? null };
      const ok = reply?.http === 200 && reply?.json?.status === 'ok' && lines && onScreen.length === 2 && reqs.includes('/v1/session') && reqs.includes('/v1/angle');
      step('yes-angle', '"Another angle" → /v1/session + /v1/angle → a real angle, both of its lines on screen', ok,
        !reply ? 'no /v1/angle reply within 45 s' : `server ${reply.http} ${reply.json?.status}${res.angle.fallback ? ` (${res.angle.fallback})` : ''} in ${ms} ms${ms > CLIENT_TIMEOUT_MS ? ` — over the app's ${CLIENT_TIMEOUT_MS} ms, so it played Zuzu's own angle` : ''}; the model's lines on screen ${onScreen ? onScreen.length : 0}/2${played ? `; the app's own guard played Zuzu's lines instead: ${played.map((l) => `«${l}»`).join(' / ')}` : ''}; scene source ${st?.source}; mechanic ${st?.mech}; requests ${JSON.stringify(reqs)}`,
        { response: reply?.json ?? null, said: (await said(o)).slice(-10) });
    }

    // delete this phone's Another Angle data from Settings
    const had = await store(o);
    await o.page.evaluate(() => window.__hush.go('settings'));
    await o.page.waitForFunction(() => [...document.querySelectorAll('button')].some((b) => /Delete my Another Angle data/.test(b.textContent) && b.offsetParent), null, { timeout: 30000, polling: 200 });
    await tapEl(o, 'button', 'Delete my Another Angle data');
    const sheet = await o.page.waitForFunction(() => [...document.querySelectorAll('h1, h2, h3, .sheet-title, [role=dialog]')].some((e) => /Delete your Another Angle data\?/.test(e.textContent)), null, { timeout: 15000, polling: 100 }).then(() => true).catch(() => false);
    const sheetText = norm(await o.page.evaluate(() => [...document.querySelectorAll('[role=dialog], .sheet')].map((e) => e.textContent).join(' ')).catch(() => ''));
    await shot(o, 'delete-sheet');
    await tapEl(o, '.sheet.open .row-btns .btn.primary', 'Delete');
    await sleep(800);
    const after = await store(o);
    const gone = !Object.keys(after).some((k) => /beyond\.(consent|device|session)$/.test(k));
    await goAngle(o);
    const askedAgain = await waitConsent(o);
    await shot(o, 'after-delete');
    step('delete', 'Settings → "Delete my Another Angle data": the sheet with the approved provider line, then choice, device code and session gone, consent asked again',
      sheet && APPROVED.del && sheetText.includes(norm(APPROVED.del)) && gone && askedAgain,
      `sheet=${sheet} approvedLine=${!!APPROVED.del && sheetText.includes(norm(APPROVED.del))} before=${Object.keys(had).join(',')} after=${Object.keys(after).join(',') || 'none'} consentAgain=${askedAgain}`);
  } finally { await o.ctx.close(); }
}

async function stepBeWith(browser) {
  const o = await open(browser, { consent: 'yes' });
  try {
    await goAngle(o);
    const at = await tell(o, 'My neighbours’ dog barks every night at eleven and I’m too awkward to knock and say anything.');
    const asked = await waitQuestion(o);
    if (asked) await answer(o, 'Just be with it');
    const quiet = await o.page.waitForFunction(() => (window.__realSaid || []).some((t) => /just be with it for a while/i.test(t)), null, { timeout: 30000, polling: 100 }).then(() => true).catch(() => false);
    await sleep(5000);
    const st = await angleState(o);
    await shot(o, 'be-with');
    step('be-with', 'sharing on → Tell → "Just be with it": the quiet path, nothing sent', asked && quiet && !v1(o, at).length && st?.server && !st.mech,
      `question=${asked} quietLine=${quiet} sharing=${st?.server} mech=${st?.mech} requests=${JSON.stringify(v1(o, at))}`, { said: (await said(o)).slice(-6) });
  } finally { await o.ctx.close(); }
}

async function stepSupport(browser, level, text) {
  const o = await open(browser, { consent: 'yes' });
  try {
    await goAngle(o);
    const at = await tell(o, text);
    const reached = await o.page.waitForFunction((lv) => { const S = window.__angle?.S; return !!S && (lv === 'crisis' ? S.crisis || S.level === 'crisis' : S.care || S.level === 'care'); }, level, { timeout: 30000, polling: 100 }).then(() => true).catch(() => false);
    await sleep(4000);
    const st = await angleState(o);
    const ss = await said(o);
    await shot(o, level);
    step(level, `sharing on → a ${level} sentence: support, no question, nothing sent`, reached && !v1(o, at).length && !ss.includes(ANGLE_Q) && st?.server && !st.mech,
      `level=${st?.level} crisis=${st?.crisis} care=${st?.care} sharing=${st?.server} asked=${ss.includes(ANGLE_Q)} requests=${JSON.stringify(v1(o, at))}`, { said: ss.slice(-6) });
  } finally { await o.ctx.close(); }
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  let browser = null;
  try {
    const { chromium } = loadPlaywright();
    const launch = { args: String(process.env.E2E_CHROMIUM_ARGS || '--use-gl=swiftshader --enable-unsafe-swiftshader --disable-dev-shm-usage').split(/\s+/).filter(Boolean) };
    if (process.env.E2E_CHROMIUM) launch.executablePath = process.env.E2E_CHROMIUM;
    browser = await chromium.launch(launch);
    res.browser = browser.version();
    const health = await fetch(`http://127.0.0.1:${DEV}/v1/health`, { headers: { origin: SITE } }).then((r) => r.json()).catch((e) => ({ error: String(e.message || e) }));
    res.provider = health.provider || null;
    console.log(`browser ${res.browser} · site ${SITE} · harness :${DEV} provider=${res.provider} · ${W}x${H}`);
    if (!health.ok) throw new Error(`the harness on :${DEV} is not answering: ${JSON.stringify(health)}`);
    for (const [name, fn] of [['consent', () => stepConsent(browser)], ['yes', () => stepYes(browser)], ['be-with', () => stepBeWith(browser)], ['crisis', () => stepSupport(browser, 'crisis', CRISIS)], ['care', () => stepSupport(browser, 'care', CARE)]]) {
      try { await fn(); } catch (e) { step(name, `${name} flow`, false, `error: ${String(e.message || e).split('\n')[0]}`); }
    }
  } catch (e) {
    res.fatal = String(e.message || e).split('\n')[0];
    console.error('FATAL', res.fatal);
  } finally { if (browser) await browser.close().catch(() => {}); }
  res.consoleErrors = res.errors.length;
  step('console', '0 console or page errors, 0 requests leaving this machine', !res.errors.length && !res.blocked.length, `errors=${res.errors.length} blocked=${res.blocked.length}${res.blocked.length ? ` ${JSON.stringify([...new Set(res.blocked)].slice(0, 5))}` : ''}`, res.errors.length ? res.errors.slice(0, 20) : undefined);
  const u = stageUsage();
  res.calls = u.calls; res.micros = u.micros;
  res.finished = new Date().toISOString();
  fs.writeFileSync(path.join(OUT, 'client.json'), JSON.stringify(res, null, 1));
  const failed = res.steps.filter((s) => !s.pass).length + (res.fatal ? 1 : 0);
  console.log(`browser stage: ${res.steps.length} steps, ${failed} failed; model calls ${res.calls}, ${res.provider === 'mock' ? 'mock usage at real prices' : 'cost'} $${(res.micros / 1e6).toFixed(4)}; wrote ${path.join(OUT, 'client.json')}`);
  process.exit(failed && !NO_FAIL ? 1 : 0);
})();
