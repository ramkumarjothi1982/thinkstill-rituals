// Hushbeat Symphony browser tests (spec-hushbeat.md §13; the L21 harness).
//
//   python3 -m http.server 8000          # from the repository root
//   node hushmallow/sensory-lab/tests/e2e-phase3-hushbeat.cjs [outDir]
//   PART=hushbeat:open,hushbeat:gestures  (blocks below; default all)
//
// Also runs inside tests/e2e-phase3.cjs through run(browser, { out, only }).
// Simulated input proves state, never smoothness: software GL can run at ~6 fps,
// so waits are on state with generous limits. Musical timing is asserted on the
// times inside events (and the audio times the renderer chose), never on wall time.
//
// Blocks so far (slice 2: audio and the first playable):
//   open      E1: from the home card and from #hushbeat; rig ready, stage focused, hint, title, labels
//   quiet     E2/E3/E5 (quiet browser, touch, no evaluate before the first gesture): nothing before a
//             gesture; the first tap is re-struck audibly once unlocked; a first-touch hold never bursts
//   gestures  E4/E6: onset at contact (≤ 6 ms added); hold → hum; press down, wheel and a pinch → bass
//             under a ducked note; a real stroke → phrase notes on the grid; double tap → chord; drag up → bend
//   keys      E7: Enter, D, P, T, S, H, B and 1–7, and the chips Note, Chord, Tune, Bass, Hum, Breathe
//   mallows   every Mallow: each solo gesture renders in its own instrument (keys), no errors
//   breath    E8: Breathe leads; the tempo moves only at bar lines by ≤ 8 % a bar; an off-body press
//             leads too; the Mallow fills with the breath
//   offline   E10: offline renders (real Web Audio DSP) of every kit: pitch, loudness, clicks, hum
//             attack and release, bass pitch and phone-band energy
//   rapid     E9 (solo): 40 taps in 2 s: voice caps, every note in key, nothing clashes
//   quietmode E12/E13 (part): Mute keeps the music running silently, and unmuting during a hum brings
//             it back; Visual only plays no sound, shows the suffix, survives a reload
//   hidden    E19 (part): a hidden page releases everything, stops the scheduler, plays nothing after
//   exit      E20: Escape plays the cadence and goes home; a second Escape is immediate; nothing left;
//             12 switches leave listeners, timers and voices at the baseline
//   layout    E22 (part): solo and solo + tray at phone, small, desktop and landscape

const path = require('path');
const H = require('./lib/harness.cjs');
const { check, guard, sleep } = H;

const OUT_DEFAULT = path.join(__dirname, '..', 'docs', 'phase3', 'hushbeat');
const SCOPE = 'hushbeat';
const T = 60000;   // state waits: generous for software GL
const IDS = ['glitzi', 'blubi', 'zuzu', 'boppo', 'pipzi', 'loomi', 'noomi'];

const noErrors = (scope, errors) => check(scope, 'no console errors', !errors.length, errors.join(' | '));
const hb = (page, fn, arg) => page.evaluate(fn, arg);
const mod = (a, n) => ((a % n) + n) % n;

/** Open #hushbeat with a favourite Mallow and wait for its rig and the feature handle. */
async function openHb(browser, vp, mallow = 'boppo', { prefs = {}, initScripts = [], hash = '#hushbeat' } = {}) {
  const r = await H.open(browser, vp, hash, { prefs, initScripts, comfort: H.comfort({ favouriteMallow: mallow }) });
  await H.waitRig(r.page, { timeout: T });
  if (hash === '#hushbeat') await r.page.waitForFunction(() => __lab.hushbeat && __lab.route === 'hushbeat', null, { timeout: T });
  return r;
}
/** Page px of the lead Mallow's body (middle, top, bottom). */
async function bodyAt(page) { const g = await H.geo(page); return { x: g.ox + g.cx, y: g.oy + g.mid, top: g.oy + g.top, bottom: g.oy + g.bottom, w: g.w, h: g.h, g }; }
const clearLog = (page) => hb(page, () => { __lab.hushbeat.log.length = 0; });
const logOf = (page) => hb(page, () => __lab.hushbeat.log.map((e) => ({ ...e })));
/** Wait until the log has an event matching a predicate (given as source text over `e`). */
const waitEvent = (page, pred, timeout = T) => page.waitForFunction((src) => { const f = new Function('e', `return (${src});`); return __lab.hushbeat?.log.some(f); }, pred, { timeout });
const notes = (log) => log.filter((e) => e.kind === 'note' && !e.ghost);
async function untilSilent(page, ms = 3500, pred = () => __lab.sound.live.size === 0) {
  const t0 = Date.now();
  for (;;) {
    if (await page.evaluate(pred)) return { ok: true, ms: Date.now() - t0 };
    if (Date.now() - t0 > ms) return { ok: false, ms: Date.now() - t0, live: await page.evaluate(() => __lab.sound.live.size) };
    await sleep(100);
  }
}
const musicVoices = (page) => hb(page, () => [...__lab.sound.live].filter((v) => v.music != null).map((v) => ({ layer: v.layer, keep: v.keep })));

// Every pair of pitches sounding together, rebuilt from the log (notes ring for `ring`, released layers for
// PAD_TAIL 1.0 / BASS_TAIL 0.3 s, as the engine counts them) → clashes (interval class 1 or 6)
function clashes(log) {
  const ic = (a, b) => { const d = mod(a - b, 12); return Math.min(d, 12 - d); };
  const segs = [], byId = new Map(), pad = [null, null], bass = [null, null];
  const open = (a, pcs) => pcs.map((pc) => { const s = { a, b: Infinity, pc }; segs.push(s); return s; });
  const close = (l, b) => { if (l) for (const s of l) s.b = Math.min(s.b, b); };
  for (const e of log) {
    if (e.kind === 'note' && !e.ghost) { const s = { a: e.t, b: e.t + e.ring, pc: e.semi }; segs.push(s); byId.set(e.id, s); }
    else if (e.kind === 'noteOff') { const s = byId.get(e.id); if (s) s.b = s.a > e.t ? s.a : Math.min(s.b, e.t + 0.06); }
    else if (e.kind === 'duck') { const s = byId.get(e.id); if (s) s.b = Math.max(s.a + 0.25, Math.min(s.b, e.t + 0.1)); }
    else if (e.kind === 'bend') { const s = byId.get(e.id); if (!s) continue; if (e.start) s.b = Infinity; if (e.end === 'handoff') s.b = Math.min(s.b, e.t + 0.12); if (e.end === 'snap') { s.b = e.t; const n = { a: e.t, b: e.t + e.ring, pc: e.semi }; segs.push(n); byId.set(e.id, n); } }
    else if (e.kind === 'padOn' || (e.kind === 'padSet' && e.semis)) { close(pad[e.slot], e.t); pad[e.slot] = open(e.t, e.semis); }
    else if (e.kind === 'padOff') { close(pad[e.slot], e.t + 1.0); pad[e.slot] = null; }
    else if (e.kind === 'bassOn' || (e.kind === 'bassSet' && e.semi != null)) { close(bass[e.slot], e.t); bass[e.slot] = open(e.t, [e.semi]); }
    else if (e.kind === 'bassOff') { close(bass[e.slot], e.t + 0.3); bass[e.slot] = null; }
  }
  segs.sort((x, y) => x.a - y.a);
  const act = [], bad = [];
  for (const s of segs) {
    if (!(s.b > s.a)) continue;
    for (let i = act.length - 1; i >= 0; i--) if (act[i].b <= s.a + 1e-9) act.splice(i, 1);
    for (const o of act) if ([1, 6].includes(ic(o.pc, s.pc))) bad.push(`${o.pc}×${s.pc}@${s.a.toFixed(3)}`);
    act.push(s);
  }
  return bad;
}

async function run(browser, { out = OUT_DEFAULT, only = (b) => H.only(SCOPE) || H.only(`${SCOPE}:${b}`) } = {}) {
  // ------------------------------------------------------------------- E1 --
  if (only('open')) await guard(`${SCOPE}:open`, async (scope, own) => {
    const { ctx, page, errors } = await H.open(browser, 'phone', '#home', { comfort: H.comfort({ favouriteMallow: 'boppo' }) });
    own(ctx);
    await H.waitRig(page, { timeout: T });
    const card = await hb(page, () => document.querySelector('.card[data-experience="hushbeat"] .go')?.textContent);
    await page.click('.card[data-experience="hushbeat"]');
    await page.waitForFunction(() => __lab.route === 'hushbeat' && __lab.hushbeat && __lab.companion?.rig?.soft, null, { timeout: T });
    const s = await hb(page, () => {
      const scr = document.querySelector('.screen.hushbeat'), hint = scr?.querySelector('.hb-hint');
      return {
        screen: !!scr, focused: document.activeElement === scr?.querySelector('.stage'), title: scr?.querySelector('.topbar .title b')?.textContent,
        sub: scr?.querySelector('.topbar .title small')?.textContent, close: !!scr?.querySelector('.topbar button[aria-label="Close"]'),
        settings: !!scr?.querySelector('.topbar button[aria-label="Settings"]'), label: scr?.querySelector('.stage')?.getAttribute('aria-label'),
        hint: hint && !hint.classList.contains('gone') && getComputedStyle(hint).display !== 'none' ? hint.textContent : null,
        tray: scr?.querySelector('.hb-tray')?.hidden, buttons: scr?.querySelector('.hb-buttons')?.getAttribute('aria-pressed'),
        backdrop: scr?.dataset.backdrop, realm: document.querySelectorAll('.hushbeat canvas.hushfold-realm').length, debug: __lab.hushbeat.debug(),
      };
    });
    check(scope, 'the home card says Play and opens #hushbeat: rig ready, stage focused', card === 'Play' && s.screen && s.focused, JSON.stringify({ card, s }));
    check(scope, 'title Hushbeat, subtitle the Mallow, Close (no Settings), the stage label lists the keys', s.title === 'Hushbeat' && s.sub === 'Boppo' && s.close && !s.settings && s.label.startsWith('Boppo. Tap for a note') && s.label.includes('1 to 7 notes'), JSON.stringify(s));
    check(scope, 'the hint is visible; the tray is hidden behind Buttons', s.hint === 'Tap a note · Squeeze bass · Stroke a tune · Hold a hum' && s.tray === true && s.buttons === 'false', JSON.stringify(s));
    check(scope, 'the Mallow\'s own world behind it (Automatic)', s.realm === 1 && !!s.backdrop, JSON.stringify(s));
    const d = s.debug;
    check(scope, 'debug(): listening at the natural pace, 96 bpm in 4/4, scheduler idle, silent (nothing plays by itself)', d.state === 'listening' && d.pace === 'natural' && d.bpm === 96 && !d.scheduler.running && d.scheduler.pending === 0 && d.live === 0 && d.take === 0, JSON.stringify(d));
    await page.goto(`${H.BASE}#hushbeat`);
    await H.waitRig(page, { timeout: T });
    await page.waitForFunction(() => __lab.hushbeat, null, { timeout: T });
    check(scope, 'opens from #hushbeat too', await hb(page, () => __lab.route === 'hushbeat' && !!document.querySelector('.screen.hushbeat')));
    await H.shot(page, out, 'hushbeat-phone-open');
    noErrors(scope, errors);
  });

  // ---------------------------------------------------------- E2 E3 E5 --
  // A quiet browser keeps Chromium's autoplay policy. page.evaluate counts as a user activation (about
  // 5 s), so every gesture here waits 6 s after the last evaluate: the touch is the only activation.
  if (only('quiet')) await guard(`${SCOPE}:quiet`, async (scope) => {
    const qb = await H.launch({ quiet: true });
    try {
      for (const kind of ['tap', 'hold']) {
        const ctx = await qb.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
        try {
          const page = await ctx.newPage();
          const errors = [];
          page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
          page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
          await page.addInitScript(H.INIT.audioSpy);
          await page.addInitScript(() => { if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); localStorage.setItem('hm.sensorylab.v1', JSON.stringify({ quality: 'low' })); } });
          await page.goto(`${H.BASE}#hushbeat`);
          await H.waitRig(page, { timeout: T });
          await page.waitForFunction(() => __lab.hushbeat, null, { timeout: T });
          const b = await bodyAt(page);
          await sleep(6000);
          const idle = await hb(page, () => ({ audio: __audio(), log: __lab.hushbeat.log.length, ctx: !!__lab.sound.ctx }));
          if (kind === 'tap') check(scope, 'E2: idle for 6 s: no AudioContext, no music event', idle.audio.created === 0 && idle.log === 0 && !idle.ctx, JSON.stringify(idle));
          await sleep(6000);
          if (kind === 'tap') await H.touch(page, [{ t: 0, points: [{ x: b.x, y: b.y }] }, { t: 70, points: [] }]);
          else await H.touch(page, [{ t: 0, points: [{ x: b.x, y: b.y }] }, { t: 1800, points: [] }]);
          await sleep(1500);
          const r = await hb(page, () => ({ audio: __audio(), log: __lab.hushbeat.log.map((e) => ({ kind: e.kind, src: e.src, id: e.id, heard: !!e.heard, restrike: !!e.restrike, hz: e.hz })), V: __lab.hushbeat.players[0].part.V }));
          const ns = r.log.filter((e) => e.kind === 'note');
          const inKey = ns.every((e) => { const s = 12 * Math.log2(e.hz / r.V.rootHz), k = Math.round(s); return Math.abs(s - k) < 0.01 && r.V.scale.includes(mod(k, 12)); });
          if (kind === 'tap') {
            check(scope, 'E3: the first touch made one AudioContext, inside the activation (touchend)', r.audio.created === 1 && r.audio.contexts[0].activation, JSON.stringify(r.audio));
            check(scope, 'E3: the contact note was struck while locked and re-struck audibly at the tap (one heard note, in key)',
              ns.length === 2 && !ns[0].heard && ns[1].restrike && ns[1].heard && ns[1].id === ns[0].id && inKey, JSON.stringify(ns));
          } else {
            const heard = ns.filter((e) => e.heard);
            check(scope, 'E5: a first-touch hold starts the hum\'s visuals (padOn) and never bursts after lift (≤ 1 heard note, no heard hum)',
              r.log.some((e) => e.kind === 'padOn') && heard.length <= 1 && inKey, JSON.stringify(r.log.slice(0, 8)));
          }
          check(scope, `${kind}: no console errors`, !errors.length, errors.join(' | '));
        } finally { await ctx.close(); }
      }
    } finally { await qb.close(); }
  });

  // ------------------------------------------------------------- E4 E6 --
  if (only('gestures')) await guard(`${SCOPE}:gestures`, async (scope, own) => {
    const { ctx, page, errors } = await openHb(browser, 'desktop', 'boppo');
    own(ctx);
    const b = await bodyAt(page);
    await page.mouse.click(b.x, b.y);   // unlock
    await sleep(700);
    // E4: onset at contact, before the finger lifts
    await clearLog(page);
    await page.mouse.move(b.x, b.y); await page.mouse.down(); await sleep(120);
    const down = await logOf(page);
    await page.mouse.up();
    const c0 = notes(down)[0];
    check(scope, 'E4: the note sounds at contact (heard, immediate, ≤ 6 ms added) before the finger lifts', !!c0 && c0.heard && c0.immediate && c0.audioT - c0.ctxNow <= 0.006 + 1e-9, JSON.stringify(c0));
    await sleep(600);
    // hold → the contact note blooms into a hum (a keep voice), released on lift
    await clearLog(page);
    await page.mouse.move(b.x, b.y - b.h * 0.2); await page.mouse.down();
    await waitEvent(page, "e.kind === 'padOn'");
    await sleep(600);
    const holdV = await musicVoices(page);
    await page.mouse.up();
    await waitEvent(page, "e.kind === 'padOff'");
    let L = await logOf(page);
    check(scope, 'E6 hold: one contact note, then the hum (padOn from it), a held pad voice, released on lift', notes(L).length === 1 && L.find((e) => e.kind === 'padOn')?.from === notes(L)[0].id && holdV.some((v) => v.layer === 'pad' && v.keep), JSON.stringify({ kinds: L.map((e) => e.kind), holdV }));
    await sleep(800);
    // press down → the note ducks under a warm bass
    await clearLog(page);
    await page.mouse.move(b.x, b.y - b.h * 0.15); await page.mouse.down();
    for (let i = 1; i <= 10; i++) { await page.mouse.move(b.x, b.y - b.h * 0.15 + i * 9); await sleep(25); }
    await waitEvent(page, "e.kind === 'bassOn'");
    await sleep(500);
    const pressV = await musicVoices(page);
    await page.mouse.up();
    await waitEvent(page, "e.kind === 'bassOff'");
    L = await logOf(page);
    const ord = L.map((e) => e.kind);
    check(scope, 'E6 press down: duck, then bassOn (no second strike), a held bass voice, bassOff on lift', notes(L).length === 1 && ord.indexOf('duck') >= 0 && ord.indexOf('duck') < ord.indexOf('bassOn') && pressV.some((v) => v.layer === 'bass' && v.keep), JSON.stringify({ ord, pressV }));
    await sleep(800);
    // the wheel squeezes too (desktop)
    await clearLog(page);
    await page.mouse.move(b.x, b.y);
    for (let i = 0; i < 6; i++) { await page.mouse.wheel(0, 120); await sleep(40); }
    await waitEvent(page, "e.kind === 'bassOn'");
    await waitEvent(page, "e.kind === 'bassOff'");
    check(scope, 'E6 wheel: a bass that ends as the wheel settles', true);
    await sleep(800);
    // a real stroke: back and forth across the body → phrase notes on the Mallow's grid
    await clearLog(page);
    await page.mouse.move(b.x - 70, b.y); await page.mouse.down();
    for (let i = 0; i <= 120; i++) { await page.mouse.move(b.x + Math.sin(i / 6) * 70, b.y + Math.sin(i / 3) * 4); await sleep(14); }
    await page.mouse.up();
    await sleep(1500);
    L = await logOf(page);
    const ph = notes(L).filter((e) => e.src === 'phrase' && !e.immediate);
    const onGrid = await hb(page, (ts) => ts.map((t) => [1, 2, 4, 8].some((d) => Math.abs(__lab.hushbeat.clock.nextGrid(t - 1e-4, d, 0.5) - t) < 0.003)), ph.map((e) => e.t));
    check(scope, 'E6 stroke: ≥ 3 phrase notes after the first, each on the grid (±3 ms), and a phraseEnd', ph.length >= 3 && onGrid.every(Boolean) && L.some((e) => e.kind === 'phraseEnd'), JSON.stringify({ n: ph.length, onGrid, kinds: [...new Set(L.map((e) => e.kind + (e.src ? ':' + e.src : '')))] }));
    await sleep(800);
    // double tap → a rolled chord (the other chord tones on 16ths)
    await clearLog(page);
    await page.mouse.click(b.x, b.y); await sleep(90); await page.mouse.click(b.x, b.y);
    await sleep(1200);
    L = await logOf(page);
    const roll = notes(L).filter((e) => e.src === 'chord');
    check(scope, 'E6 double tap: the second note rolls into a chord (2 more notes, on 16ths)', roll.length >= 2 && roll.every((e) => !e.immediate), JSON.stringify(notes(L).map((e) => e.src)));
    await sleep(600);
    // drag up → the note bends, then snaps to a scale tone
    await clearLog(page);
    await page.mouse.move(b.x, b.y + b.h * 0.2); await page.mouse.down();
    for (let i = 1; i <= 12; i++) { await page.mouse.move(b.x, b.y + b.h * 0.2 - i * 10); await sleep(40); }
    await sleep(200);
    const bendV = await musicVoices(page);
    await page.mouse.up();
    await sleep(800);
    L = await logOf(page);
    const bends = L.filter((e) => e.kind === 'bend');
    check(scope, 'E6 drag up: the note becomes a held glide (keep) that bends, then snaps', bends[0]?.start && bends.some((e) => e.end === 'snap') && bendV.some((v) => v.layer === 'glide' && v.keep), JSON.stringify({ bends: bends.map((e) => e.end || (e.start ? 'start' : 'move')), bendV }));
    const z = await untilSilent(page, 3500);
    check(scope, 'E6: every voice is gone ≤ 3.5 s after the last release', z.ok, JSON.stringify(z));
    noErrors(scope, errors);
    // a two-finger pinch on a touch screen
    const tc = await openHb(browser, 'phone', 'loomi');
    try {
      const p2 = tc.page, q = await bodyAt(p2);
      await H.touch(p2, [{ t: 0, points: [{ x: q.x, y: q.y }] }, { t: 60, points: [] }]);   // unlock
      await sleep(800);
      await clearLog(p2);
      const frames = [{ t: 0, points: [{ x: q.x - 50, y: q.y, id: 1 }] }, { t: 40, points: [{ x: q.x - 50, y: q.y, id: 1 }, { x: q.x + 50, y: q.y, id: 2 }] }];
      for (let i = 1; i <= 12; i++) frames.push({ t: 40 + i * 50, points: [{ x: q.x - 50 + i * 3, y: q.y, id: 1 }, { x: q.x + 50 - i * 3, y: q.y, id: 2 }] });
      frames.push({ t: 1300, points: [{ x: q.x - 14, y: q.y, id: 1 }, { x: q.x + 14, y: q.y, id: 2 }] }, { t: 1400, points: [] });
      await H.touch(p2, frames);
      await sleep(900);
      const PL = await logOf(p2), po = PL.map((e) => e.kind);
      check(`${scope}:pinch`, 'E6 pinch: the first finger\'s note ducks under the bass; the bass ends on lift', po.includes('duck') && po.indexOf('duck') < po.indexOf('bassOn') && po.includes('bassOff') && notes(PL).length <= 2, JSON.stringify(po));
      noErrors(`${scope}:pinch`, tc.errors);
    } finally { await tc.ctx.close(); }
  });

  // ------------------------------------------------------------------- E7 --
  if (only('keys')) await guard(`${SCOPE}:keys`, async (scope, own) => {
    const { ctx, page, errors } = await openHb(browser, 'desktop', 'pipzi');
    own(ctx);
    await page.focus('.hushbeat .stage');
    const V = await hb(page, () => __lab.hushbeat.players[0].part.V);
    const tryKey = async (name, fn, pred, wait = 1200) => {
      await clearLog(page);
      await fn();
      await sleep(wait);
      const L = await logOf(page);
      return { ok: pred(L), kinds: [...new Set(L.map((e) => e.kind + (e.src ? ':' + e.src : '')))] };
    };
    const results = {};
    results.enter = await tryKey('Enter', () => page.keyboard.press('Enter'), (L) => notes(L).some((e) => e.heard));
    results.d = await tryKey('D', () => page.keyboard.press('d'), (L) => notes(L).filter((e) => e.src === 'chord').length >= 2);
    results.p = await tryKey('P', () => page.keyboard.press('p'), (L) => notes(L).filter((e) => e.src === 'phrase').length >= 3, 2600);
    results.t = await tryKey('T', () => page.keyboard.press('t'), (L) => L.some((e) => e.kind === 'bend' && e.start) && L.some((e) => e.kind === 'bend' && e.end === 'snap'), 2000);
    results.s = await tryKey('S', async () => { await page.keyboard.down('s'); await sleep(900); await page.keyboard.up('s'); }, (L) => L.some((e) => e.kind === 'bassOn') && L.some((e) => e.kind === 'bassOff'));
    results.h = await tryKey('H', async () => { await page.keyboard.down('h'); await sleep(1200); await page.keyboard.up('h'); }, (L) => L.some((e) => e.kind === 'padOn') && L.some((e) => e.kind === 'padOff'));
    await clearLog(page);
    await page.keyboard.down('b'); await sleep(600);
    const bIn = await hb(page, () => __lab.hushbeat.debug().breath);
    await page.keyboard.up('b'); await sleep(200);
    const bOut = await hb(page, () => __lab.hushbeat.debug().breath);
    results.b = { ok: bIn.leading === 'in' && bOut.leading === 'out', kinds: [bIn.leading, bOut.leading] };
    const degs = [];
    for (let n = 1; n <= 7; n++) { await clearLog(page); await page.keyboard.press(String(n)); await sleep(250); degs.push(notes(await logOf(page))[0]?.deg); }
    results.digits = { ok: degs.every((d, i) => d === V.tapLo + i), kinds: degs };
    for (const [k, r] of Object.entries(results)) check(scope, `key ${k}: its musical result`, r.ok, JSON.stringify(r.kinds));
    // the chips
    await page.click('.hushbeat .hb-buttons');
    const tray = await hb(page, () => ({ hidden: document.querySelector('.hb-tray').hidden, pressed: document.querySelector('.hb-buttons').getAttribute('aria-pressed'), chips: [...document.querySelectorAll('.hb-tray .chip')].map((c) => c.textContent) }));
    check(scope, 'Buttons shows the tray: Note, Chord, Tune, Bass, Hum, Breathe', !tray.hidden && tray.pressed === 'true' && tray.chips.join() === 'Note,Chord,Tune,Bass,Hum,Breathe', JSON.stringify(tray));
    const chip = (name) => `.hb-tray .chip:nth-child(${['Note', 'Chord', 'Tune', 'Bass', 'Hum', 'Breathe'].indexOf(name) + 1})`;
    const holdChip = async (name, ms) => { const r = await page.locator(chip(name)).boundingBox(); await page.mouse.move(r.x + r.width / 2, r.y + r.height / 2); await page.mouse.down(); await sleep(ms); await page.mouse.up(); };
    const cr = {};
    cr.note = await tryKey('Note', () => page.click(chip('Note')), (L) => notes(L).length >= 1);
    cr.chord = await tryKey('Chord', () => page.click(chip('Chord')), (L) => notes(L).filter((e) => e.src === 'chord').length >= 2);
    cr.tune = await tryKey('Tune', () => page.click(chip('Tune')), (L) => notes(L).filter((e) => e.src === 'phrase').length >= 3, 2600);
    cr.bass = await tryKey('Bass', () => holdChip('Bass', 900), (L) => L.some((e) => e.kind === 'bassOn') && L.some((e) => e.kind === 'bassOff'));
    cr.hum = await tryKey('Hum', () => holdChip('Hum', 1200), (L) => L.some((e) => e.kind === 'padOn') && L.some((e) => e.kind === 'padOff'));
    let lead = null;
    const r = await page.locator(chip('Breathe')).boundingBox();
    await page.mouse.move(r.x + r.width / 2, r.y + r.height / 2); await page.mouse.down(); await sleep(500);
    lead = await hb(page, () => __lab.hushbeat.debug().breath.leading);
    await page.mouse.up();
    cr.breathe = { ok: lead === 'in', kinds: [lead] };
    for (const [k, v] of Object.entries(cr)) check(scope, `chip ${k}: its musical result`, v.ok, JSON.stringify(v.kinds));
    noErrors(scope, errors);
  });

  // -------------------------------------------------- every Mallow, solo --
  if (only('mallows')) await guard(`${SCOPE}:mallows`, async (scope, own) => {
    const { ctx, page, errors } = await openHb(browser, 'desktop', 'glitzi');
    own(ctx);
    for (const id of IDS) {
      if (id !== 'glitzi') {
        await hb(page, (id) => { __lab.ctx.setMallow(id); __lab.ctx.navigate('/hushbeat'); }, id);
        await page.waitForFunction((id) => __lab.hushbeat?.players[0]?.part.mallowId === id && __lab.companion?.rig?.soft, id, { timeout: T });
      }
      await page.focus('.hushbeat .stage');
      await clearLog(page);
      const layers = new Set();
      const sampleLayers = async () => { for (const v of await musicVoices(page)) layers.add(v.layer); };
      await page.keyboard.press('Enter'); await sleep(250); await sampleLayers();
      await page.keyboard.press('d'); await sleep(700);
      await page.keyboard.press('p'); await sleep(900); await sampleLayers(); await sleep(1300);
      await page.keyboard.press('t'); await sleep(450); await sampleLayers(); await sleep(900);
      await page.keyboard.down('h'); await sleep(1500); await sampleLayers(); await page.keyboard.up('h');
      await page.keyboard.down('s'); await sleep(1000); await sampleLayers(); await page.keyboard.up('s');
      for (const n of [1, 3, 5, 7]) { await page.keyboard.press(String(n)); await sleep(150); }
      await sleep(500);
      const L = await logOf(page);
      const ns = notes(L), V = await hb(page, () => __lab.hushbeat.players[0].part.V);
      const kinds = new Set(L.map((e) => e.kind));
      const inKey = ns.every((e) => { const s = 12 * Math.log2(e.hz / V.rootHz), k = Math.round(s); return Math.abs(s - k) < 0.01 && V.scale.includes(mod(k, 12)); });
      check(scope, `${id}: every solo gesture renders (notes, chord, phrase, bend, hum, bass) in its own key, heard`,
        ['note', 'bend', 'padOn', 'padOff', 'bassOn', 'bassOff', 'phraseEnd'].every((k) => kinds.has(k)) && ns.filter((e) => e.src === 'chord').length >= 2 && ns.filter((e) => e.src === 'phrase').length >= 3 && inKey && ns.every((e) => e.heard),
        JSON.stringify({ kinds: [...kinds], n: ns.length, unheard: ns.filter((e) => !e.heard).length, inKey }));
      check(scope, `${id}: note, glide, hum and bass voices all sounded`, ['note', 'glide', 'pad', 'bass'].every((l) => layers.has(l)), [...layers].join());
      check(scope, `${id}: nothing clashes`, !clashes(L).length, clashes(L).slice(0, 5).join(', '));
    }
    const z = await untilSilent(page, 4000);
    check(scope, 'all quiet afterwards', z.ok, JSON.stringify(z));
    noErrors(scope, errors);
  });

  // ------------------------------------------------------------------- E8 --
  if (only('breath')) await guard(`${SCOPE}:breath`, async (scope, own) => {
    const { ctx, page, errors } = await openHb(browser, 'desktop', 'boppo');
    own(ctx);
    await page.click('.hushbeat .hb-buttons');
    const r = await page.locator('.hb-tray .chip:nth-child(6)').boundingBox();
    const bpm0 = await hb(page, () => __lab.hushbeat.debug().bpm);
    await page.mouse.move(r.x + r.width / 2, r.y + r.height / 2); await page.mouse.down();
    const tIn = await hb(page, () => performance.now());
    // the Mallow fills with the breath: inflateTarget follows the breath level while leading
    const pairs = [];
    for (let i = 0; i < 8; i++) { await sleep(220); pairs.push(await hb(page, () => [__lab.hushbeat.clock.at(performance.now() / 1000, {}).level, __lab.companion.rig.inflateTarget])); }
    await page.mouse.up();
    const inhale = (await hb(page, () => performance.now()) - tIn) / 1000;
    const d = await hb(page, () => __lab.hushbeat.debug());
    // the tempo then moves toward the measured breath only at bar lines, ≤ 8 % a bar
    const samples = [];
    const t0 = Date.now();
    while (Date.now() - t0 < 9000) { samples.push(await hb(page, () => { const c = __lab.hushbeat.clock; c.step(); return { bpm: c.bpm, bar: c.barA }; })); await sleep(150); }
    let ok = true, steps = [];
    for (let i = 1; i < samples.length; i++) {
      const a = samples[i - 1], b = samples[i];
      if (b.bpm !== a.bpm) { steps.push(+(b.bpm / a.bpm - 1).toFixed(4)); if (b.bar === a.bar || Math.abs(b.bpm / a.bpm - 1) > 0.08 * (b.bar - a.bar) + 1e-6) ok = false; }
    }
    const end = samples.at(-1).bpm;
    // a lone in-breath estimates the cycle from the pace's ratio (4 : 6): 2.5 × the inhale, within 7–15 s
    const want = Math.min(15, Math.max(7, inhale * 2.5));
    check(scope, 'Breathe leads: the in-breath sets the target cycle (2.5 × the inhale, clamped); out on release', d.breath.leading === 'out' && Math.abs(d.breath.target - want) < 0.35 && d.breath.target < 10, JSON.stringify({ inhale, want, breath: d.breath }));
    check(scope, 'the tempo moves toward the breath only at bar lines, ≤ 8 % a bar', ok && end > bpm0 && steps.length >= 1 && steps.every((s) => s > 0 && s <= 0.08 + 1e-6), JSON.stringify({ bpm0, end, steps }));
    const n = pairs.length, mx = pairs.reduce((s, p) => s + p[0], 0) / n, my = pairs.reduce((s, p) => s + p[1], 0) / n;
    const cov = pairs.reduce((s, p) => s + (p[0] - mx) * (p[1] - my), 0), vx = pairs.reduce((s, p) => s + (p[0] - mx) ** 2, 0), vy = pairs.reduce((s, p) => s + (p[1] - my) ** 2, 0);
    const corr = cov / Math.sqrt(vx * vy + 1e-12);
    check(scope, 'the Mallow fills with the breath (inflate follows the level, r > 0.8)', corr > 0.8, `r=${corr.toFixed(3)} ${JSON.stringify(pairs.map((p) => p.map((x) => +x.toFixed(2))))}`);
    // an off-body press held still for 300 ms leads too (the Companion never sees it as a touch)
    const b = await bodyAt(page);
    await clearLog(page);
    await page.mouse.move(60, b.y); await page.mouse.down(); await sleep(700);
    const pin = await hb(page, () => __lab.hushbeat.debug().breath.leading);
    await page.mouse.up(); await sleep(200);
    const pout = await hb(page, () => ({ lead: __lab.hushbeat.debug().breath.leading, notes: __lab.hushbeat.log.filter((e) => e.kind === 'note').length }));
    check(scope, 'an off-body press (300 ms, still) leads the in-breath; letting go starts the out-breath; no note', pin === 'in' && pout.lead === 'out' && pout.notes === 0, JSON.stringify({ pin, pout }));
    noErrors(scope, errors);
  });

  // ------------------------------------------------------------------ E10 --
  if (only('offline')) await guard(`${SCOPE}:offline`, async (scope, own) => {
    const { ctx, page, errors } = await H.open(browser, 'desktop', '#home');
    own(ctx);
    await page.waitForFunction(() => globalThis.__lab, null, { timeout: T });
    const res = await page.evaluate(renderKits);
    const rmsAll = Object.values(res).map((r) => r.rms);
    for (const [id, r] of Object.entries(res)) {
      check(scope, `${id}: the tap note is on pitch (±3 %), peak < 0.9, no clicks (silent before, < 0.02 in its first 0.5 ms, silent after)`,
        Math.abs(r.err) < 3 && r.peak < 0.9 && r.pre < 1e-4 && r.first < 0.02 && r.tail < 0.02, JSON.stringify(r));
      check(scope, `${id}: the hum swells in (≥ 300 ms), is quiet a second after letting go, and ends`, r.padAttack >= 0.3 && r.padAfter1s <= -26 && r.padEnd < 0.002, JSON.stringify({ a: r.padAttack, after: r.padAfter1s, end: r.padEnd }));
      check(scope, `${id}: every bass root sits below 131 Hz on pitch, ≥ 15 % of its energy in 150–500 Hz, and ends`, r.bass.every((x) => x.f0 < 131 && Math.abs(x.f0 / x.hz - 1) < 0.03 && x.band >= 15 && x.end < 0.002), JSON.stringify(r.bass));
      check(scope, `${id}: a bent note follows to its new pitch (±1 %)`, Math.abs(r.held / r.heldWant - 1) < 0.01, JSON.stringify({ held: r.held, want: r.heldWant }));
    }
    check(scope, 'tap-note loudness of the seven within ±4 dB', Math.max(...rmsAll) - Math.min(...rmsAll) <= 8, JSON.stringify(Object.fromEntries(Object.entries(res).map(([k, r]) => [k, r.rms]))));
    noErrors(scope, errors);
  });

  // ------------------------------------------------------------------- E9 --
  if (only('rapid')) await guard(`${SCOPE}:rapid`, async (scope, own) => {
    const { ctx, page, errors } = await openHb(browser, 'desktop', 'zuzu');
    own(ctx);
    const b = await bodyAt(page);
    await page.mouse.click(b.x, b.y); await sleep(600);
    await clearLog(page);
    await hb(page, () => { window.__mx = { live: 0, voices: 0 }; window.__mxT = setInterval(() => { __mx.live = Math.max(__mx.live, __lab.sound.live.size); __mx.voices = Math.max(__mx.voices, __lab.hushbeat.audio.voices); }, 50); });
    for (let i = 0; i < 40; i++) {
      const x = b.x + Math.sin(i * 2.3) * b.w * 0.3, y = b.y + Math.cos(i * 1.7) * b.h * 0.3;
      await page.mouse.click(x, y);
      await sleep(25);
    }
    await sleep(1500);
    const mx = await hb(page, () => { clearInterval(window.__mxT); return { ...window.__mx, cap: 10 }; });
    const L = await logOf(page), V = await hb(page, () => __lab.hushbeat.players[0].part.V);
    const ns = notes(L);
    const inKey = ns.every((e) => { const s = 12 * Math.log2(e.hz / V.rootHz), k = Math.round(s); return Math.abs(s - k) < 0.01 && V.scale.includes(mod(k, 12)); });
    check(scope, '40 taps in 2 s: live voices ≤ 24, music voices ≤ the low-tier cap', mx.live <= 24 && mx.voices <= mx.cap, JSON.stringify(mx));
    check(scope, 'every note in Zuzu\'s key; nothing sounding together forms a semitone or tritone', ns.length >= 10 && inKey && !clashes(L).length, JSON.stringify({ n: ns.length, ghosts: L.filter((e) => e.ghost).length, clashes: clashes(L).slice(0, 5) }));
    noErrors(scope, errors);
  });

  // ------------------------------------------------------------ E12 E13 --
  if (only('quietmode')) await guard(`${SCOPE}:quietmode`, async (scope, own) => {
    const { ctx, page, errors } = await openHb(browser, 'desktop', 'noomi');
    own(ctx);
    const b = await bodyAt(page);
    await page.mouse.click(b.x, b.y); await sleep(800);
    // Mute: the music goes on (events) without a sound; unmuting during a hum brings it back
    await page.click('.hushbeat .topbar button[aria-label="Mute sound"]');
    await untilSilent(page, 3000);
    await clearLog(page);
    await page.mouse.click(b.x, b.y); await sleep(400);
    const m1 = await hb(page, () => ({ notes: __lab.hushbeat.log.filter((e) => e.kind === 'note').length, voices: __lab.hushbeat.audio.voices, ready: __lab.hushbeat.audio.ready }));
    check(scope, 'E12 muted: a tap still makes its note event, no voice', m1.notes >= 1 && m1.voices === 0 && !m1.ready, JSON.stringify(m1));
    await page.focus('.hushbeat .stage');
    await page.keyboard.down('h');
    await waitEvent(page, "e.kind === 'padOn'");
    await page.click('.hushbeat .topbar button[aria-label="Mute sound"]');
    await page.waitForFunction(() => __lab.hushbeat.audio.layer[0].pad?.alive, null, { timeout: 10000 }).catch(() => {});
    const m2 = await hb(page, () => ({ pad: !!__lab.hushbeat.audio.layer[0].pad?.alive, voices: [...__lab.sound.live].filter((v) => v.layer === 'pad').length }));
    await page.keyboard.up('h');
    check(scope, 'E12 unmuting during a hum brings the hum back (reconcile)', m2.pad && m2.voices === 1, JSON.stringify(m2));
    await untilSilent(page, 4000);
    // Visual only: the same music as light, no sound; it survives a reload
    await hb(page, () => __lab.hushbeat.setVisualOnly(true));
    const sub = await hb(page, () => document.querySelector('.hushbeat .topbar .title small').textContent);
    await clearLog(page);
    await page.focus('.hushbeat .stage');
    let maxV = 0;
    for (let i = 0; i < 30; i++) {
      if (i % 3 === 0) await page.mouse.click(b.x + (i % 5) * 6, b.y - (i % 4) * 10);
      else await page.keyboard.press(String(1 + (i % 7)));
      await sleep(70);
      if (i % 5 === 0) maxV = Math.max(maxV, await hb(page, () => __lab.hushbeat.audio.voices));
    }
    await page.keyboard.down('h'); await sleep(800); maxV = Math.max(maxV, await hb(page, () => __lab.hushbeat.audio.voices)); await page.keyboard.up('h');
    const v1 = await hb(page, () => ({ notes: __lab.hushbeat.log.filter((e) => e.kind === 'note' && !e.ghost).length, heard: __lab.hushbeat.log.filter((e) => e.heard).length, pad: __lab.hushbeat.log.some((e) => e.kind === 'padOn'), live: __lab.sound.live.size, chip: document.querySelector('.hushbeat .feedback').textContent }));
    check(scope, 'E13 Visual only: 30 gestures make their music events and no sound at all; the subtitle says so', sub === 'Noomi · Visual only' && v1.notes >= 20 && v1.pad && v1.heard === 0 && maxV === 0 && v1.live === 0, JSON.stringify({ sub, v1, maxV }));
    await page.reload();
    await H.waitRig(page, { timeout: T });
    await page.waitForFunction(() => __lab.hushbeat, null, { timeout: T });
    const v2 = await hb(page, () => ({ sub: document.querySelector('.hushbeat .topbar .title small').textContent, attached: __lab.hushbeat.audio.attached, visual: __lab.hushbeat.debug().visualOnly }));
    check(scope, 'E13 Visual only survives a reload', v2.sub === 'Noomi · Visual only' && !v2.attached && v2.visual, JSON.stringify(v2));
    await hb(page, () => __lab.hushbeat.setVisualOnly(false));
    const v3 = await hb(page, () => ({ sub: document.querySelector('.hushbeat .topbar .title small').textContent, attached: __lab.hushbeat.audio.attached }));
    check(scope, 'switching back to Music reattaches the sound', v3.sub === 'Noomi' && v3.attached, JSON.stringify(v3));
    noErrors(scope, errors);
  });

  // ------------------------------------------------------------------ E19 --
  if (only('hidden')) await guard(`${SCOPE}:hidden`, async (scope, own) => {
    const { ctx, page, errors } = await openHb(browser, 'desktop', 'blubi');
    own(ctx);
    const b = await bodyAt(page);
    await page.mouse.click(b.x, b.y); await sleep(600);
    await page.focus('.hushbeat .stage');
    await page.keyboard.down('h');
    await page.keyboard.down('b');
    await waitEvent(page, "e.kind === 'padOn'");
    await sleep(400);
    await H.setHidden(page, true, { lifecycle: true });
    await sleep(300);
    const hdn = await hb(page, () => { const d = __lab.hushbeat.debug(); return { players: d.players, sched: d.scheduler, breath: d.breath.leading, live: __lab.sound.live.size, layers: __lab.hushbeat.engine.layers().length }; });
    // (the SoundEngine stops every voice and suspends; a voice fading as the context suspends ends on resume)
    check(scope, 'hidden: every layer released, players idle, scheduler stopped, breath let go', hdn.layers === 0 && hdn.players.every((p) => p.state === 'idle' && !p.pad && !p.bass) && !hdn.sched.running && !hdn.breath, JSON.stringify(hdn));
    await page.keyboard.up('h'); await page.keyboard.up('b');
    await clearLog(page);
    await H.setHidden(page, false, { lifecycle: true });
    await sleep(1500);
    const vis = await hb(page, () => ({ log: __lab.hushbeat.log.map((e) => e.kind), state: __lab.hushbeat.state }));
    check(scope, 'visible again: listening, nothing plays on its own for 1.5 s', vis.log.filter((k) => k === 'note' || k === 'padOn' || k === 'bassOn').length === 0 && vis.state === 'listening', JSON.stringify(vis));
    const z = await untilSilent(page, 3500);
    check(scope, 'and every voice is gone', z.ok, JSON.stringify(z));
    noErrors(scope, errors);
  });

  // ------------------------------------------------------------------ E20 --
  if (only('exit')) await guard(`${SCOPE}:exit`, async (scope, own) => {
    const { ctx, page, errors } = await H.open(browser, 'desktop', '#home', { initScripts: [H.INIT.listenerCounter, H.INIT.timerSpy], comfort: H.comfort({ favouriteMallow: 'pipzi' }) });
    own(ctx);
    await H.waitRig(page, { timeout: T });
    const hero = await bodyAt(page);
    await page.mouse.click(hero.x, hero.y);
    await untilSilent(page, 5000); await sleep(800);
    const snap = () => hb(page, () => ({ l: __listeners().total, timers: Object.values(__timers().live).reduce((s, c) => s + c.timeout + c.interval, 0), prefs: __lab.prefs.listeners.size, dna: __lab.dna.listeners.size, canvases: document.querySelectorAll('canvas').length }));
    const base = await snap();
    const toHb = async () => { await hb(page, () => __lab.ctx.navigate('/hushbeat')); await page.waitForFunction(() => __lab.hushbeat && __lab.companion?.rig?.soft, null, { timeout: T }); };
    // Escape after playing: the cadence, then home within 1.5 s
    await toHb();
    let b = await bodyAt(page);
    await page.mouse.click(b.x, b.y); await sleep(500);
    await page.focus('.hushbeat .stage');
    await clearLog(page);
    // page-side times: the Escape keydown and the route change home
    await hb(page, () => {
      window.__esc = { t0: 0, t1: 0 };
      addEventListener('keydown', (e) => { if (e.key === 'Escape' && !__esc.t0) __esc.t0 = performance.now(); }, { capture: true, once: true });
      addEventListener('hashchange', () => { if (/home/.test(location.hash) && !__esc.t1) __esc.t1 = performance.now(); }, { once: true });
    });
    await page.keyboard.press('Escape');
    const mid = await hb(page, () => ({ state: __lab.hushbeat?.state, cad: __lab.hushbeat?.log.filter((e) => e.src === 'cadence').length, fading: document.querySelector('.hushbeat')?.classList.contains('hb-leaving') }));
    await page.waitForFunction(() => __lab.route === 'home', null, { timeout: T });
    const ms = await hb(page, () => Math.round(__esc.t1 - __esc.t0));
    check(scope, 'Escape: the cadence plays (leaving, fading) and the lab goes home within 1.5 s', mid.state === 'leaving' && mid.cad >= 1 && mid.fading && ms > 600 && ms < 1500, JSON.stringify({ mid, ms }));
    const z = await untilSilent(page, 3000);
    check(scope, 'live voices reach 0 within 3 s; the handle is gone', z.ok && (await hb(page, () => __lab.hushbeat)) === null, JSON.stringify(z));
    // a second Escape leaves at once
    await toHb();
    b = await bodyAt(page);
    await page.mouse.click(b.x, b.y); await sleep(300);
    await page.focus('.hushbeat .stage');
    await page.keyboard.press('Escape'); await page.keyboard.press('Escape');
    await sleep(150);
    check(scope, 'a second Escape leaves at once', await hb(page, () => __lab.route === 'home'));
    // Close with nothing played for 8 s: straight home
    await toHb();
    await sleep(300);
    await page.click('.hushbeat .topbar button[aria-label="Close"]');
    await sleep(150);
    check(scope, 'Close with nothing sounding leaves at once', await hb(page, () => __lab.route === 'home'));
    // twelve switches: nothing grows
    for (let i = 0; i < 12; i++) {
      await toHb();
      b = await bodyAt(page);
      await page.mouse.click(b.x, b.y); await sleep(120);
      await hb(page, () => __lab.ctx.navigate('/'));
      await page.waitForFunction(() => __lab.route === 'home', null, { timeout: T });
    }
    await untilSilent(page, 4000);
    let now = await snap();
    for (let t1 = Date.now(); now.timers > base.timers && Date.now() - t1 < 4000;) { await sleep(250); now = await snap(); }
    check(scope, '12 hushbeat ↔ home switches: listeners, prefs and DNA listeners, timers and canvases back to the baseline', now.l === base.l && now.prefs === base.prefs && now.dna === base.dna && now.timers <= base.timers && now.canvases === base.canvases, JSON.stringify({ base, now }));
    noErrors(scope, errors);
  });

  // ------------------------------------------------------------------ E22 --
  if (only('layout')) await guard(`${SCOPE}:layout`, async (scope) => {
    for (const vp of ['phone', 'small', 'desktop', 'land']) {
      const { ctx, page, errors } = await openHb(browser, vp, 'loomi');
      try {
        const sc = `${scope}:${vp}`;
        await sleep(400);
        await H.layout(page, `${sc}:solo`, { scrollers: ['.hb-tray'] });
        await H.shot(page, out, `hushbeat-${vp}-solo`);
        await page.click('.hushbeat .hb-buttons');
        await sleep(500);
        await H.layout(page, `${sc}:tray`, { scrollers: ['.hb-tray'] });
        await H.shot(page, out, `hushbeat-${vp}-tray`);
        noErrors(sc, errors);
      } finally { await ctx.close(); }
    }
  });
}

// In the page: offline renders of every kit (real DSP) and their measurements.
async function renderKits() {
  const base = new URL('core/', location.href).href;
  const K = await import(base + 'music-kits.js');
  const T = await import(base + 'music-theory.js');
  const sr = 48000;
  async function render(secs, fn) {
    const oac = new OfflineAudioContext(1, Math.round(sr * secs), sr);
    K.warmNoise(oac);
    fn(oac, K.graph(oac, oac.destination));
    return (await oac.startRendering()).getChannelData(0);
  }
  const rms = (x, a, b) => { let s = 0; for (let i = a; i < b; i++) s += x[i] * x[i]; return Math.sqrt(s / Math.max(1, b - a)); };
  const peak = (x, a = 0, b = x.length) => { let m = 0; for (let i = a; i < b; i++) m = Math.max(m, Math.abs(x[i])); return m; };
  const db = (v) => +(20 * Math.log10(v + 1e-12)).toFixed(1);
  function f0(x, a, n, fe) {   // normalised autocorrelation around the expected pitch
    const lo = Math.floor(sr / (fe * 1.6)), hi = Math.ceil(sr / (fe / 1.6));
    let best = 0, bl = lo;
    for (let L = lo; L <= hi; L++) {
      let s = 0, e1 = 0, e2 = 0;
      for (let i = a; i < a + n; i++) { s += x[i] * x[i + L]; e1 += x[i] * x[i]; e2 += x[i + L] * x[i + L]; }
      const r = s / Math.sqrt(e1 * e2 + 1e-12);
      if (r > best) { best = r; bl = L; }
    }
    return sr / bl;
  }
  function fft(re, im) {
    const n = re.length;
    for (let i = 1, j = 0; i < n; i++) { let bit = n >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit; if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; } }
    for (let len = 2; len <= n; len <<= 1) {
      const ang = -2 * Math.PI / len;
      for (let i = 0; i < n; i += len) for (let k = 0; k < len / 2; k++) {
        const wr = Math.cos(ang * k), wi = Math.sin(ang * k), a = i + k, b = a + len / 2;
        const vr = re[b] * wr - im[b] * wi, vi = re[b] * wi + im[b] * wr;
        re[b] = re[a] - vr; im[b] = im[a] - vi; re[a] += vr; im[a] += vi;
      }
    }
  }
  function band(x, a, f1, f2) {
    const n = 16384, re = new Float64Array(n), im = new Float64Array(n);
    for (let i = 0; i < n; i++) re[i] = x[a + i] * (0.5 - 0.5 * Math.cos(2 * Math.PI * i / n));
    fft(re, im);
    let tot = 0, b = 0;
    for (let k = 1; k < n / 2; k++) { const p = re[k] ** 2 + im[k] ** 2, f = k * sr / n; tot += p; if (f >= f1 && f <= f2) b += p; }
    return b / tot;
  }
  const res = {};
  for (const id of Object.keys(K.KITS)) {
    const V = T.voiceFor(id), kit = K.KITS[id], r = {};
    const deg = Math.round((V.tapLo + V.tapHi) / 2), f = T.hz(V, T.degSemi(V.scale, deg)), dur = Math.min(4, Math.max(0.15, 0.15 + 3 * V.decay));
    const t0 = 0.05, x = await render(dur + 0.4, (oac, g) => kit.note(g, t0, f, 0.75, { dur })), a = Math.round(t0 * sr);
    r.f = +f.toFixed(1); r.f0 = +f0(x, a + Math.round(0.07 * sr), 2048, f).toFixed(1); r.err = +(100 * (r.f0 / f - 1)).toFixed(2);
    r.rms = db(rms(x, a, a + Math.round(0.25 * sr))); r.peak = +peak(x).toFixed(3);
    r.pre = +peak(x, 0, a).toFixed(5); r.first = +peak(x, a, a + 24).toFixed(4); r.tail = +peak(x, Math.round((t0 + dur + 0.05) * sr)).toFixed(4);
    const ch = T.chordAt(V, 0), pfs = T.voicePad(T.degSemi(V.scale, V.tapHi - 2), ch.tones).map((s) => T.hz(V, s));
    const px = await render(4.2, (oac, g) => { const h = kit.pad(g, 0.05, pfs, 0.8, 0.5); h.breathe(0.5, 0.05); h.release(1.6); });
    let mx = 0; const env = [];
    for (let i = 0; i < 2.4 * sr; i += 960) { const v = rms(px, i, i + 960); env.push(v); mx = Math.max(mx, v); }
    r.padAttack = +(env.findIndex((v) => v >= 0.9 * mx) * 0.02 - 0.05).toFixed(2);
    r.padAfter1s = db(rms(px, Math.round(2.6 * sr), Math.round(2.65 * sr)) / mx); r.padEnd = +peak(px, Math.round(3.9 * sr)).toFixed(4);
    r.bass = [];
    for (const root of new Set(V.prog)) {
      const bf = T.bassHz(V, root);
      const bx = await render(1.4, (oac, g) => { const h = kit.bass(g, 0.05, bf, 0.5); h.beat(0.3, 1); h.release(1.0, null, { step: 0.5 }); });
      r.bass.push({ hz: +bf.toFixed(1), f0: +f0(bx, Math.round(0.4 * sr), 4096, bf).toFixed(1), band: +(100 * band(bx, Math.round(0.08 * sr), 150, 500)).toFixed(1), end: +peak(bx, Math.round(1.36 * sr)).toFixed(4) });
    }
    const hx = await render(1.5, (oac, g) => { const h = kit.held(g, 0.05, f, 0.75); h.set(f * 1.12, 0.2, 0.03); h.set(f * 1.122, 0.4, 0.08); h.release(0.5, 0.2, 1.4); });
    r.held = +f0(hx, Math.round(0.42 * sr), 2048, f * 1.122).toFixed(1); r.heldWant = +(f * 1.122).toFixed(1);
    res[id] = r;
  }
  return res;
}

module.exports = { run };

if (require.main === module) {
  (async () => {
    const out = process.argv[2] || OUT_DEFAULT;
    const browser = await H.launch();
    try { await run(browser, { out }); } finally { await browser.close(); }
    const { failed } = H.writeReport(out, 'e2e-phase3-hushbeat', { prefix: `${SCOPE}:` });
    process.exit(failed ? 1 : 0);
  })().catch((e) => { console.error(e); process.exit(2); });
}
