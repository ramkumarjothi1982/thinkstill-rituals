// Another Angle (W8) browser gate: the ten mechanics played with REAL CDP touch, a layout check at three
// moments (mechanic start, landed, its "done" line), and the safety cases (typed and closed, sent,
// reworded before Send). No server needed: the page's own requests to /v1/session and /v1/angle are
// answered here with a realistic scene per mechanic (scenes.json), so the client's validation and
// personalisation run exactly as in production; safety cases must make no request at all.
//
//   cd /home/user/thinkstill-rituals && python3 -m http.server 8000      (in another shell)
//   node hushmallow/tools/beyond/angle-gate.cjs [--size 320x568] [--mech pull_apart,find_boundary] [--safety] [--rm] [--authored] [--shots DIR]
//
// --authored: no server at all (the build as it ships while ANGLE_ENDPOINT is empty): each mechanic plays the
// authored scene for the same words (forced to that mechanic through the dev hook), by real touch.
// Every layout check also proves each named label sits nearest its own object (a bowl, the guess, a bud) and
// never moved past its tie (review r3, blocking 1).
//
// Review r4: return_responsibility drags the slab (their words) into each of the four bowls in turn and checks
// the layout with it in each; open_interpretations checks it with one and with two of the three buds open; a
// bowl's name must be strictly nearer its own bowl than any other (no slack).
//
// Exit code 1 when any check fails. Slow on SwiftShader (≈40 s a mechanic); run one browser job at a time.
const fs = require('fs');
const path = require('path');
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require(require.resolve('playwright', { paths: ['/opt/node-tools/node_modules'] }))); }

const arg = (k, d = null) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const [W, H] = (arg('--size', '320x568')).split('x').map(Number);
const SCENES = JSON.parse(fs.readFileSync(path.join(__dirname, 'scenes.json'), 'utf8'));
const MECHS = (arg('--mech', 'all') === 'all' ? Object.keys(SCENES) : arg('--mech').split(','));
const SAFETY = process.argv.includes('--safety');
const AUTHORED = process.argv.includes('--authored');
const RM = process.argv.includes('--rm');
const SHOTS = arg('--shots', null);
const BASE = arg('--base', 'http://localhost:8000/hushmallow/index.html');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ------------------------------------------------------------------ touch --
const touch = (cdp, type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map((p, i) => ({ x: p.x, y: p.y, id: p.id ?? i + 1, radiusX: 8, radiusY: 8, force: 1 })) });
async function tap(cdp, x, y) { await touch(cdp, 'touchStart', [{ x, y }]); await sleep(70); await touch(cdp, 'touchEnd', []); }
async function drag(cdp, a, b, { steps = 18, ms = 30 } = {}) { await touch(cdp, 'touchStart', [a]); for (let i = 1; i <= steps; i++) { const k = i / steps; await touch(cdp, 'touchMove', [{ x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k }]); await sleep(ms); } await sleep(40); await touch(cdp, 'touchEnd', []); }
async function drag2(cdp, a0, a1, b0, b1, { steps = 22, ms = 40 } = {}) {
  await touch(cdp, 'touchStart', [{ ...a0, id: 1 }, { ...b0, id: 2 }]);
  for (let i = 1; i <= steps; i++) { const k = i / steps; await touch(cdp, 'touchMove', [{ x: a0.x + (a1.x - a0.x) * k, y: a0.y + (a1.y - a0.y) * k, id: 1 }, { x: b0.x + (b1.x - b0.x) * k, y: b0.y + (b1.y - b0.y) * k, id: 2 }]); await sleep(ms); }
  await sleep(40); await touch(cdp, 'touchEnd', []);
}
async function trace(cdp, pts, ms) { await touch(cdp, 'touchStart', [pts[0]]); for (let i = 1; i < pts.length; i++) { await touch(cdp, 'touchMove', [pts[i]]); await sleep(ms); } await touch(cdp, 'touchEnd', []); }
async function hold(cdp, p, ms) { await touch(cdp, 'touchStart', [p]); for (let i = 0; i < Math.ceil(ms / 150); i++) { await sleep(150); await touch(cdp, 'touchMove', [{ x: p.x + (i % 2) * 0.5, y: p.y }]); } await touch(cdp, 'touchEnd', []); }
async function squeeze(cdp, p, ms = 600) { await touch(cdp, 'touchStart', [p]); for (let i = 0; i < 6; i++) { await sleep(ms / 6); await touch(cdp, 'touchMove', [{ x: p.x + (i % 2), y: p.y + 1 }]); } await touch(cdp, 'touchEnd', []); }
async function tapEl(page, cdp, sel, text = null) {
  const r = await page.evaluate(({ sel, text }) => { const e = [...document.querySelectorAll(sel)].find((x) => !x.hidden && x.offsetParent && (!text || x.textContent.includes(text))); if (!e) return null; const b = e.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; }, { sel, text });
  if (!r) throw new Error(`no ${sel} ${text || ''}`);
  await tap(cdp, r.x, r.y);
}
const chips = (page) => page.$$eval('.hf-chips:not([hidden]) .hf-chip', (els) => els.map((e) => e.textContent));
const waitChip = (page, t) => page.waitForFunction((x) => [...document.querySelectorAll('.hf-chips:not([hidden]) .hf-chip')].some((e) => e.textContent.includes(x) && e.offsetParent), t, { timeout: 90000 });

// ------------------------------------------------------------------ checks --
/** Labels vs labels, the subtitle band (lines, chips, control pill), Zuzu, the scene's bodies, the screen; text ≥13px; no sideways scroll. */
const layoutCheck = (page) => page.evaluate(() => {
  const A = window.__angle; const bad = [];
  const z = A?.zuzu?.bodyRect?.();
  const vis = (e) => e.offsetParent !== null && parseFloat(getComputedStyle(e).opacity) > 0.1;
  const sub = [...document.querySelectorAll('.hf-sublive > .hf-sub, .hf-chips:not([hidden]), .hf-subctl:not(.is-hidden)')].filter(vis).map((e) => e.getBoundingClientRect());
  const tags = [...document.querySelectorAll('.bx-tag')].filter((e) => parseFloat(getComputedStyle(e).opacity) > 0.1).map((e) => ({ t: e.textContent.slice(0, 26), k: e.classList[1], r: e.getBoundingClientRect() }));
  const ov = (a, b, m = 1) => a && b && a.left + m < b.right && a.right - m > b.left && a.top + m < b.bottom && a.bottom - m > b.top;
  for (let i = 0; i < tags.length; i++) for (let j = i + 1; j < tags.length; j++) if (ov(tags[i].r, tags[j].r)) bad.push(`labels overlap: ${tags[i].t} × ${tags[j].t}`);
  for (const t of tags) {
    if (sub.some((s) => ov(s, t.r))) bad.push(`label on the subtitles: ${t.t}`);
    if (z && ov(t.r, { left: z.left + z.width * 0.08, right: z.left + z.width * 0.92, top: z.top, bottom: z.top + z.height })) bad.push(`label on Zuzu: ${t.t}`);
    if (t.r.left < 4 || t.r.right > innerWidth - 4 || t.r.top < 0 || t.r.bottom > innerHeight) bad.push(`label off screen: ${t.t}`);
  }
  for (const e of document.querySelectorAll('#scene *')) { if (!e.offsetParent || e.closest('.sr-only')) continue; if (![...e.childNodes].some((c) => c.nodeType === 3 && c.textContent.trim())) continue; const fs = parseFloat(getComputedStyle(e).fontSize); if (fs < 13) bad.push(`text ${fs}px: ${e.textContent.trim().slice(0, 20)}`); }
  if (document.documentElement.scrollWidth > innerWidth) bad.push('sideways scroll');
  // ownership: a label that names an object is nearer its own object than any other of its kind, and stays within its tie
  const ties = A?.mech?.tags?.ties?.() || [];
  const edge = (r, x, y) => Math.hypot(Math.max(r.left - x, 0, x - r.right), Math.max(r.top - y, 0, y - r.bottom));
  for (const t of ties) {
    if (!t.visible) continue;
    if (t.tie && t.moved > t.tie + 1) bad.push(`label moved ${t.moved}px past its tie (${t.tie}): ${(t.title || t.text).slice(0, 26)}`);
    if (!t.group) continue;
    const own = edge(t.rect, t.ox, t.oy);
    for (const m of ties) {
      if (m.group !== t.group || (Math.abs(m.ox - t.ox) < 1 && Math.abs(m.oy - t.oy) < 1)) continue;
      // (a bowl's name has no slack at all: it must be nearer its own bowl than any other; review r4)
      const slack = t.group === 'bowls' ? 0 : 2;
      if (edge(t.rect, m.ox, m.oy) + slack < own || (!slack && edge(t.rect, m.ox, m.oy) <= own)) { bad.push(`label nearer another object: ${(t.title || t.text).slice(0, 26)} (own ${Math.round(own)}px, other ${Math.round(edge(t.rect, m.ox, m.oy))}px)`); break; }
    }
  }
  return bad;
});
/** The word "AI" anywhere visible outside the consent and privacy notice. */
const aiOnScreen = (page) => page.evaluate(() => { const out = []; const walk = (n) => { for (const c of n.childNodes) { if (c.nodeType === 3) { if (/\bAI\b/.test(c.textContent) && c.parentElement && !c.parentElement.closest('.bx-consent, .bx-notice')) out.push(c.textContent.slice(0, 60)); } else if (c.nodeType === 1 && !['SCRIPT', 'STYLE'].includes(c.tagName)) walk(c); } }; walk(document.body); return out; });

// ------------------------------------------------------------------ play --
async function play(page, cdp, id, check = async () => {}) {
  const pr = () => page.evaluate(() => window.__angle.mech?.probe?.());
  const settled = () => page.evaluate(() => !!window.__angle.mech?.settled);
  const A = await page.evaluate(() => window.__angle.area);
  if (id === 'return_responsibility') {
    // the slab first, into each bowl in turn (from the pile, then from bowl to bowl), the layout checked each time
    for (let k = 0; k < 4; k++) {
      const p = await pr();
      if (!p?.slab) break;
      await drag(cdp, { x: p.slab.x - p.slab.w * 0.3, y: p.slab.y + 4 }, p.bowls[k], { steps: 26, ms: 40 });
      await sleep(1600);
      const q = await pr();
      if (q.places[k] < 1) await check(`slab not taken into bowl ${k} (${q.names[k]})`, true);
      else await check(`slab in ${q.names[k]}`);
    }
  }
  for (let round = 0; round < 16 && !(await settled()); round++) {
    const p = await pr();
    if (!p) break;
    if (id === 'pull_apart') await drag2(cdp, { x: p.a.x - 6, y: p.a.y }, { x: A.x + 30, y: p.a.y + 10 }, { x: p.b.x + 6, y: p.b.y }, { x: A.x + A.w - 30, y: p.b.y - 10 });
    else if (id === 'shrink_projection') await drag(cdp, { x: p.big.x, y: p.big.y - p.big.r * 0.4 }, { x: p.big.x, y: p.big.y + p.big.r * 0.6 }, { steps: 30, ms: 60 });
    else if (id === 'return_responsibility') { if (!p.stones.length) { await sleep(800); continue; } const s = p.stones[p.stones.length - 1]; await drag(cdp, s, s.heaviest ? p.bowls[1] : p.bowls[round % p.bowls.length]); }
    else if (id === 'reveal_spectrum') { if (p.phase === 'reveal') await drag(cdp, { x: p.x0 + 6, y: p.y }, { x: p.x1 - 6, y: p.y }, { steps: 24, ms: 35 }); else await drag(cdp, p.thought, { x: (p.x0 + p.x1) / 2 + 20, y: p.thought.y }); }
    else if (id === 'open_interpretations') {
      if (!p.buds.length) { await sleep(800); continue; }
      await hold(cdp, p.buds[0], 1300);
      // one of three open, then two: every line is clear of the other buds and lines while the rest are closed
      if (p.buds.length > 1) { await sleep(1400); await check(`${4 - p.buds.length} of 3 open`); continue; }
    }
    else if (id === 'separate_one') await drag(cdp, p.one, { x: A.x + 30, y: A.y + A.h * 0.4 }, { steps: 24, ms: 40 });
    else if (id === 'let_loop_drift') await hold(cdp, p.stone, 4500);
    else if (id === 'assemble_step') { if (!p.pieces.length) { await sleep(800); continue; } const pc = p.pieces[0]; await drag(cdp, pc, p.treads[pc.i] || p.treads[0]); }
    else if (id === 'soften_harshness') { const pts = []; for (let i = 0; i <= 40; i++) { const k = i / 40; pts.push({ x: p.c.x - p.R * 0.9 + p.R * 1.8 * k, y: p.c.y - p.R * 0.3 + Math.sin(k * 6) * p.R * 0.2 }); } await trace(cdp, pts, 45); }
    else if (id === 'find_boundary') {
      if (p.phase === 'choosing' || p.phase === 'closed') { const ch = await chips(page); if (ch.length) await tapEl(page, cdp, '.hf-chips:not([hidden]) .hf-chip', ch[1] || ch[0]); await sleep(900); continue; }
      const pts = []; for (let i = 0; i <= 48; i++) { const a = (i / 48) * Math.PI * 2.1; pts.push({ x: p.c.x + Math.cos(a) * p.rr, y: p.c.y + Math.sin(a) * p.rr }); }
      await trace(cdp, pts, 30);
    }
    await sleep(900);
  }
  return settled();
}

async function openPage(browser, { route, authored = false }) {
  const context = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 2, hasTouch: true, isMobile: W < 600, reducedMotion: RM ? 'reduce' : 'no-preference' });
  const page = await context.newPage();
  const sent = [];
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.route('**/v1/**', async (r) => {
    const u = r.request().url();
    if (r.request().method() === 'OPTIONS') return r.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'content-type, authorization', 'access-control-allow-methods': 'POST' } });
    sent.push(u.replace(/^https?:\/\/[^/]+/, ''));
    const cors = { 'content-type': 'application/json', 'access-control-allow-origin': 'http://localhost:8000' };
    if (u.endsWith('/v1/session')) return r.fulfill({ status: 200, headers: cors, body: JSON.stringify({ status: 'ok', token: 'gate-token', expires_at: new Date(Date.now() + 3600e3).toISOString() }) });
    if (u.endsWith('/v1/feedback')) return r.fulfill({ status: 202, headers: cors, body: '{"status":"ok"}' });
    return r.fulfill({ status: 200, headers: cors, body: JSON.stringify(route()) });
  });
  // (the notice is at version 2 since G1: an older choice asks again)
  await page.addInitScript((choice) => { try { localStorage.setItem('hm2:beyond.consent', JSON.stringify({ v: 2, choice, at: '2026-10-13' })); } catch {} }, authored ? 'no' : 'yes');
  await page.goto(authored ? BASE : `${BASE}?angleDev=8799`);
  await page.waitForFunction(() => window.__hush && window.__hush.world && window.__hushfold, null, { timeout: 120000 });
  await page.evaluate(async () => { if (!window.__hush.ent.has('ultra')) await window.__hush.ent.purchase('ultra'); });
  const cdp = await context.newCDPSession(page);
  await page.evaluate(() => window.__hush.go('angle'));
  await page.waitForFunction(() => window.__angle && window.__angle.zuzu, null, { timeout: 120000 });
  await waitChip(page, 'Tell Zuzu');
  await sleep(700);
  return { context, page, cdp, sent, errors };
}
async function tell(page, cdp, text) {
  await tapEl(page, cdp, '.hf-chips:not([hidden]) .hf-chip', 'Tell');
  await page.waitForSelector('.hf-input textarea', { timeout: 30000 });
  await sleep(400);
  await page.fill('.hf-input textarea', text);
  await sleep(1800);
}
const shot = (page, name) => (SHOTS ? page.screenshot({ path: path.join(SHOTS, `${name}.png`) }) : null);

(async () => {
  if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
  const browser = await chromium.launch({ executablePath: fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined, args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  let failed = 0;
  const report = (name, problems) => { console.log(`${problems.length ? 'FAIL' : 'ok  '} ${name}${problems.length ? `\n       ${problems.join('\n       ')}` : ''}`); if (problems.length) failed++; };
  for (const id of SAFETY ? [] : MECHS) {
    const { text, scene } = SCENES[id];
    const { context, page, cdp, sent, errors } = await openPage(browser, { route: () => ({ status: 'ok', prompt_version: 'angle-v4', scene, keep_support_close: false }), authored: AUTHORED });
    const problems = [];
    if (AUTHORED) {
      try {
        if (await page.evaluate(() => window.__angle.serverMode())) problems.push('a server is configured');
        await page.evaluate(({ t, id }) => { window.__angle.play(t, { mechanic: id }); }, { t: text, id });
        await page.waitForFunction(() => window.__angle.mech, null, { timeout: 90000 });
        await sleep(1800);
        await shot(page, `a-${id}-${W}-1-start`);
        problems.push(...(await layoutCheck(page)).map((p) => `start: ${p}`));
        const midCheck = async (what, failed = false) => { if (failed) { problems.push(what); return; } await shot(page, `a-${id}-${W}-1m-${what.replace(/\W+/g, '-')}`); problems.push(...(await layoutCheck(page)).map((p) => `${what}: ${p}`)); };
        if (!(await play(page, cdp, id, midCheck))) problems.push('did not land through touch');
        await sleep(700);
        await shot(page, `a-${id}-${W}-2-landed`);
        problems.push(...(await layoutCheck(page)).map((p) => `landed: ${p}`));
        await page.waitForFunction(() => window.__angle.S.phase === 'reveal', null, { timeout: 60000 });
        await sleep(700);
        problems.push(...(await layoutCheck(page)).map((p) => `done line: ${p}`));
        // nothing on screen is cut, and the word "AI" never shows
        const cut = await page.evaluate(() => [...document.querySelectorAll('.bx-tag, .hf-sub .text')].filter((e) => parseFloat(getComputedStyle(e).opacity) > 0.1 && /…/.test(e.textContent)).map((e) => e.textContent.slice(0, 50)));
        for (const c of cut) problems.push(`cut text on screen: ${c}`);
        problems.push(...(await aiOnScreen(page)).map((t) => `"AI" on screen: ${t}`));
        if (sent.length) problems.push(`requests were made: ${sent.join(', ')}`);
      } catch (e) { problems.push(`error: ${e.message.split('\n')[0]}`); await shot(page, `a-${id}-${W}-err`); }
      problems.push(...errors.map((e) => `page error: ${e}`));
      report(`authored ${id} ${W}×${H}${RM ? ' reduced motion' : ''}`, problems);
      await context.close();
      continue;
    }
    try {
      await tell(page, cdp, text);
      await tapEl(page, cdp, '.hf-input .hf-send');
      await sleep(900);
      const z = await page.evaluate(() => window.__angle.zuzu.bodyRect());
      const n0 = await page.evaluate(() => window.__angle.S.squeezes);
      await squeeze(cdp, { x: z.cx, y: z.cy });
      if ((await page.evaluate(() => window.__angle.S.squeezes)) <= n0) problems.push('Zuzu not squeezable while waiting');
      if (await page.evaluate(() => !!document.querySelector('.spinner, [role=progressbar]'))) problems.push('a spinner while waiting');
      await page.waitForFunction(() => window.__angle.mech, null, { timeout: 90000 });
      if ((await page.evaluate(() => window.__angle.mechId)) !== id) problems.push(`played ${await page.evaluate(() => window.__angle.mechId)}`);
      if ((await page.evaluate(() => window.__angle.S.scene?.source)) !== 'server') problems.push('not the server scene');
      await sleep(1800);
      await shot(page, `${id}-${W}-1-start`);
      problems.push(...(await layoutCheck(page)).map((p) => `start: ${p}`));
      const midCheck = async (what, failed = false) => { if (failed) { problems.push(what); return; } await shot(page, `${id}-${W}-1m-${what.replace(/\W+/g, '-')}`); problems.push(...(await layoutCheck(page)).map((p) => `${what}: ${p}`)); };
      if (!(await play(page, cdp, id, midCheck))) problems.push('did not land through touch');
      await sleep(700);
      await shot(page, `${id}-${W}-2-landed`);
      problems.push(...(await layoutCheck(page)).map((p) => `landed: ${p}`));
      await page.waitForFunction(() => window.__angle.S.phase === 'reveal', null, { timeout: 60000 });
      await sleep(700);
      await shot(page, `${id}-${W}-3-done`);
      problems.push(...(await layoutCheck(page)).map((p) => `done line: ${p}`));
      const l2 = scene.subtitle_line_2;
      await page.waitForFunction((l) => [...document.querySelectorAll('.hf-sub .text')].some((e) => e.textContent.includes(l.slice(0, 20))), l2, { timeout: 60000 });
      await sleep(1200);
      await shot(page, `${id}-${W}-4-line2`);
      problems.push(...(await aiOnScreen(page)).map((t) => `"AI" on screen: ${t}`));
      if (!sent.some((u) => u.endsWith('/v1/angle'))) problems.push('no request was made');
    } catch (e) { problems.push(`error: ${e.message.split('\n')[0]}`); await shot(page, `${id}-${W}-err`); }
    problems.push(...errors.map((e) => `page error: ${e}`));
    report(`${id} ${W}×${H}${RM ? ' reduced motion' : ''}`, problems);
    await context.close();
  }
  if (SAFETY) {
    const CASES = {
      'crisis typed, then closed': { text: 'Nobody would miss me if I was gone', send: false, level: 'crisis' },
      'crisis sent': { text: 'I want to kill myself', send: true, level: 'crisis' },
      'crisis reworded before Send': { text: 'Nobody would miss me if I was gone', then: 'My boss embarrassed me in front of everyone.', send: true, level: 'crisis' },
      'care sent': { text: 'My partner hits me', send: true, level: 'care' },
      'care typed, then closed': { text: 'My partner hits me', send: false, level: 'care' },
    };
    const PLAYFUL = ['Squishy thinking helps, apparently.', 'Ooh. Spin me round.', 'Still here. Still squishy.', 'Every angle feels better squeezed.'];
    for (const [name, C] of Object.entries(CASES)) {
      const { context, page, cdp, sent, errors } = await openPage(browser, { route: () => ({ status: 'ok', scene: SCENES.pull_apart.scene }) });
      const problems = [];
      try {
        await tell(page, cdp, C.text);
        await page.evaluate(() => document.querySelector('#sheet-root .sheet.open .sheet-head button')?.click());
        await sleep(800);
        if (C.then) { await page.fill('.hf-input textarea', C.then); await sleep(1500); }
        if (C.send) await page.evaluate(() => document.querySelector('.hf-input .hf-send')?.click());
        else await page.evaluate(() => window.__angle.overlay?.close('close'));
        await sleep(2500);
        await page.evaluate(() => document.querySelector('#sheet-root .sheet.open .sheet-head button')?.click());
        await sleep(800);
        const st = await page.evaluate(() => ({ level: window.__angle.S.level, phase: window.__angle.S.phase, support: !document.querySelector('.bx-dock .hf-pill.support').hidden, mech: !!window.__angle.mech }));
        if (st.level !== C.level) problems.push(`level ${st.level}, expected ${C.level}`);
        if (!st.support) problems.push('no Support pill');
        if (st.mech || st.phase !== 'support') problems.push(`phase ${st.phase}${st.mech ? ' with a mechanic' : ''}`);
        const z = await page.evaluate(() => window.__angle.zuzu.bodyRect());
        const lines = new Set();
        for (let i = 0; i < 6; i++) { await squeeze(cdp, { x: z.cx, y: z.cy }, 500); await sleep(800); (await page.$$eval('.hf-sub .text', (els) => els.map((e) => e.textContent))).forEach((l) => lines.add(l)); }
        for (const l of lines) if (PLAYFUL.includes(l)) problems.push(`playful line after something heavy: ${l}`);
        await shot(page, `safety-${name.replace(/\W+/g, '-')}-${W}`);
      } catch (e) { problems.push(`error: ${e.message.split('\n')[0]}`); }
      if (sent.length) problems.push(`requests were made: ${sent.join(', ')}`);
      problems.push(...errors.map((e) => `page error: ${e}`));
      report(`safety: ${name} ${W}×${H}`, problems);
      await context.close();
    }
  }
  await browser.close();
  process.exit(failed ? 1 : 0);
})();
