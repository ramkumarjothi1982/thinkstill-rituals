// Hushflow director, integration unit B1: gentle sessions (calm worlds only), the safety
// stop (pause / finish with a reason, also while the first world loads), the host hand-over
// halfway through a melt, holds, a chosen next world, the Stay toggle, state.canNext and
// state.title — and owner P1: nothing follows the Luminous Ocean yet.
// Run: node --test hushmallow/tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { WORLDS, STATUS, createRegistry, selectNext } from '../src/hushfold/flow/registry.js';

// ------------------------------------------------------------- harness --
function installFakeDom() {
  const saved = {};
  for (const k of ['document', 'addEventListener', 'removeEventListener', 'requestAnimationFrame', 'cancelAnimationFrame']) saved[k] = Object.getOwnPropertyDescriptor(globalThis, k);
  const ctx2d = () => new Proxy({
    createImageData: (w, h) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }),
    createLinearGradient: () => ({ addColorStop() {} }), createRadialGradient: () => ({ addColorStop() {} }),
    createPattern: () => ({}), measureText: (s) => ({ width: String(s).length * 8 }), getTransform: () => ({ a: 1, e: 0 }),
  }, { get: (o, k) => (k in o ? o[k] : () => {}), set: (o, k, v) => { o[k] = v; return true; } });
  const el = () => ({ style: {}, className: '', width: 0, height: 0, children: [], setAttribute() {}, getContext: () => ctx2d(), append(...c) { this.children.push(...c); }, remove() {}, addEventListener() {}, removeEventListener() {}, clientWidth: 390, clientHeight: 844 });
  globalThis.document = { createElement: () => el(), addEventListener() {}, removeEventListener() {}, hidden: false };
  globalThis.addEventListener = () => {}; globalThis.removeEventListener = () => {};
  globalThis.requestAnimationFrame = (fn) => setTimeout(() => fn(performance.now()), 16);
  globalThis.cancelAnimationFrame = (id) => clearTimeout(id);
  return { el, restore() { for (const [k, d] of Object.entries(saved)) { if (d) Object.defineProperty(globalThis, k, d); else delete globalThis[k]; } } };
}
const fakeTicker = () => { const t = { fns: new Set(), add(fn) { t.fns.add(fn); }, remove(fn) { t.fns.delete(fn); }, tick(dt = 1 / 60) { for (const f of [...t.fns]) f(dt); } }; return t; };
const memStore = () => { const m = new Map(); return { get: (k, d = null) => (m.has(k) ? JSON.parse(m.get(k)) : d), set: (k, v) => { m.set(k, JSON.stringify(v)); return true; }, remove: (k) => m.delete(k) }; };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const deferred = () => { let resolve; const p = new Promise((r) => { resolve = r; }); return { p, resolve }; };

/**
 * A test world. `gate` (a deferred) holds its prepare() until resolved; `log` records calls;
 * `ctl.complete` / `ctl.progress` drive it; `ctl.discover(id)` makes it discover.
 */
function world(id, { calm = false, final = false, mallow = null, next = [], gate = null, log = [], ctl = {}, discoveries = {}, ambience = null, fits = null } = {}) {
  return {
    id, title: `${id} title`, status: STATUS.PLAYABLE, calm, final, mallow: mallow ? { id: mallow } : undefined,
    fits: fits || { emotions: { other: 1 }, intentions: {} }, next, dialogue: { complete: `${id}: stay, or drift on?`, completeStay: `${id}: stay as long as you like.` },
    discoveries, memory: {}, palette: { sky: '#111', deep: '#000' }, sound: ambience ? { ambience } : {},
    load: async () => ({
      create(ctx) {
        ctl.ctx = ctx;
        ctl.discover = (d) => ctx.discover(d, {});
        const w = {
          async prepare() { log.push(`${id}:prepare`); if (gate) await gate.p; },
          enter(o) { log.push(`${id}:enter${o?.from ? `<${o.from}` : ''}`); ctx.say([`${id} intro`], { kind: 'dialogue' }); },
          frame() { ctl.frames = (ctl.frames || 0) + 1; }, pointer() {},
          get progress() { return ctl.progress ?? 0; }, get complete() { return !!ctl.complete; }, get metrics() { return {}; },
          handoff: () => ({ horizonY: 500 }), outro() {}, intro() {},
          serialize() { return { v: 1, complete: !!ctl.complete }; }, restore(s) { (ctl.restores ||= []).push(s); if (s?.complete) ctl.complete = true; }, pause() { log.push(`${id}:pause`); }, resume() { log.push(`${id}:resume`); }, destroy() { log.push(`${id}:destroy`); },
          setGentle(b) { log.push(`${id}:gentle:${b}`); },
        };
        return w;
      },
    }),
  };
}
const subs = (said = []) => ({ say(lines, o) { said.push({ lines: [].concat(lines), kind: o?.kind }); return Promise.resolve(); }, choice: (q) => { said.push({ choice: q }); return new Promise(() => {}); }, clear() {}, pause() {}, resume() {} });

async function director(dom, list, extra = {}) {
  const { createHushflow } = await import('../src/hushfold/flow/director.js');
  const tk = extra.ticker || fakeTicker();
  const D = createHushflow({ worldEl: dom.el(), fxEl: dom.el(), registry: createRegistry(list), ticker: tk, store: memStore(), reducedMotion: false, ...extra, ...(extra.ticker ? {} : { ticker: tk }) });
  return { D, tk };
}
/** Step until fn() is true (or n steps), letting idle-time builds run. */
async function until(D, fn, n = 300, dt = 1 / 60) {
  for (let i = 0; i < n && !fn(); i++) { D.debug.step(dt); await wait(2); }
  return fn();
}

// ------------------------------------------------------------ registry --
test('registry: the ocean is calm and final, the storm is not calm', () => {
  const storm = WORLDS.find((w) => w.id === 'static-storm'), ocean = WORLDS.find((w) => w.id === 'luminous-ocean');
  assert.equal(storm.calm, false);
  assert.equal(ocean.calm, true);
  assert.equal(ocean.final, true, 'owner P1: nothing follows the ocean until a third world exists');
});

test('selectNext: a gentle session keeps only calm worlds; nothing follows the ocean in any session (P1)', () => {
  const reg = createRegistry();
  for (const gentle of [false, true]) {
    for (const emotion of ['angry', 'anxious', 'sad', null]) {
      const after = reg.select({ current: 'luminous-ocean', emotion, intention: 'calm', gentle });
      assert.equal(after.id, null, `after the ocean (${emotion}, gentle ${gentle})`);
      assert.equal(after.reason, 'none');
    }
  }
  // gentle: only calm worlds, from anywhere
  assert.equal(reg.select({ current: null, emotion: 'angry', intention: 'calm', gentle: true }).id, 'luminous-ocean', 'even for anger the gentle choice is the ocean');
  assert.equal(reg.select({ current: 'static-storm', emotion: 'angry', intention: 'calm', gentle: true }).id, 'luminous-ocean');
  assert.equal(reg.select({ current: null, emotion: 'angry', intention: 'calm' }).id, 'static-storm', 'not gentle: the storm as before');
  // a synthetic catalogue: every pick is calm, and with no calm world left there is none
  const f = (id, calm) => ({ id, calm, status: STATUS.PLAYABLE, fits: { emotions: { other: 1 }, intentions: {} }, next: [] });
  const list = [f('a', false), f('b', true), f('c', false), f('d', true)];
  const seen = new Set();
  let bags = {};
  for (let i = 0; i < 6; i++) { const r = selectNext(list, { current: null, gentle: true, bags, seed: i }); seen.add(r.id); bags = r.bags; }
  assert.deepEqual([...seen].sort(), ['b', 'd']);
  assert.equal(selectNext([f('a', false), f('b', true)], { current: 'b', gentle: true }).id, null);
  assert.equal(selectNext([f('a', false), f('b', undefined)], { current: null, gentle: true }).id, null, 'calm must be said, not assumed');
});

// ------------------------------------------------------------ director --
test('director: start({gentle:true}) picks the calm ocean, even when the storm is asked for or saved; state.gentle, ctx.gentle, state.title', async () => {
  const dom = installFakeDom();
  try {
    const { D } = await director(dom, WORLDS.map((w) => ({ ...w })), {});
    const st = await D.start({ emotion: 'angry', intention: 'calm', gentle: true });
    assert.ok(st);
    assert.equal(D.state.worldId, 'luminous-ocean');
    assert.equal(D.state.gentle, true);
    assert.equal(D.state.title, 'Loomi’s Luminous Ocean', 'state.title === entry.title');
    D.destroy();
    const { D: D2 } = await director(dom, WORLDS.map((w) => ({ ...w })), {});
    await D2.start({ worldId: 'static-storm', emotion: 'angry', intention: 'calm', gentle: true });
    assert.equal(D2.state.worldId, 'luminous-ocean', 'a gentle session never plays the storm');
    D2.destroy();
    // not gentle: the storm, and its title
    const { D: D3 } = await director(dom, WORLDS.map((w) => ({ ...w })), {});
    await D3.start({ worldId: 'static-storm', emotion: 'angry', intention: 'calm' });
    assert.equal(D3.state.worldId, 'static-storm');
    assert.equal(D3.state.gentle, false);
    assert.equal(D3.state.title, WORLDS[0].title);
    D3.destroy();
    // ctx.gentle follows setGentle (session only)
    const ctl = {}, log = [];
    const { D: D4 } = await director(dom, [world('w', { ctl, log }), world('x', { calm: true })], {});
    await D4.start({ worldId: 'w' });
    assert.equal(ctl.ctx.gentle, false);
    const ev = [];
    D4.on('gentle', (e) => ev.push(e));
    D4.setGentle(true);
    assert.equal(ctl.ctx.gentle, true);
    assert.equal(D4.state.gentle, true);
    assert.ok(log.includes('w:gentle:true'), 'the world hears setGentle');
    assert.deepEqual(ev, [{ on: true, worldId: 'w' }]);
    D4.destroy();
  } finally { dom.restore(); }
});

test('director: a saved storm picked up in a gentle session is the storm itself, gently (Resume stays theirs after distress, owner P4); a calm world started instead opens fresh — no restore(), not complete, resumed:false, nothing of the storm carried over', async () => {
  const { saveProgress } = await import('../src/engine/flow-store.js');
  const dom = installFakeDom();
  const made = [];
  const mk = async (...a) => { const r = await director(...a); made.push(r.D); return r; };
  try {
    // (a complete storm, saved with discoveries, an offer and its own seed)
    const savedStorm = (store) => saveProgress(store, {
      worldId: 'storm', idx: 0, sequence: ['storm'], step: 1, emotion: 'angry', intention: 'calm', mallow: 'glitzi', seed: 4242,
      state: { w: { v: 1, complete: true, progress: 1, thought: { d: 1, x: 0 } }, d: ['slowing'], o: ['slowing'], i: 0.8, c: 1 },
    });
    // synthetic worlds: the restore() spy sees exactly what reaches each world
    const sc = {}, oc = {};
    const store = memStore();
    savedStorm(store);
    const { D } = await mk(dom, [world('storm', { ctl: sc }), world('ocean', { calm: true, ctl: oc })], { store });
    const worldEv = [];
    D.on('world', (e) => worldEv.push(e));
    let completes = 0;
    D.on('complete', () => completes++);
    // picked up (the shell offers it only when the visit allows: never after a crisis, a death, a loss or harm done to
    // the person — hushfold.js resumableNow): the saved storm itself, restored, and the session stays gentle
    const st = await D.start({ resume: true, gentle: true });
    assert.ok(st);
    assert.equal(D.state.worldId, 'storm', 'the saved world the person asked to pick up');
    assert.equal(sc.restores?.length, 1, 'restored');
    assert.equal(oc.restores, undefined);
    assert.equal(worldEv[0].resumed, true);
    assert.equal(D.state.gentle, true, 'still a gentle session: calm worlds only from here, no Memory Garden offers');
    D.destroy();

    // a calm world started instead (the gentle choice "somewhere calm"), with the storm saved: it opens fresh
    const sc1 = {}, oc1 = {};
    const store1 = memStore();
    savedStorm(store1);
    const { D: D1 } = await mk(dom, [world('storm', { ctl: sc1 }), world('ocean', { calm: true, ctl: oc1 })], { store: store1 });
    const ev1 = [];
    D1.on('world', (e) => ev1.push(e));
    D1.on('complete', () => completes++);
    await D1.start({ emotion: 'angry', intention: 'calm', gentle: true });
    assert.equal(D1.state.worldId, 'ocean', 'a gentle start of its own never plays the storm');
    assert.equal(oc1.restores, undefined, 'the storm’s saved state never reaches the ocean');
    assert.equal(sc1.restores, undefined);
    assert.equal(D1.state.complete, false, 'the ocean opens fresh, not complete');
    assert.equal(ev1.length, 1);
    assert.equal(ev1[0].resumed, false, "'world' says it was not resumed");
    assert.deepEqual(D1.state.discoveries, [], 'no discoveries carried over from the storm');
    assert.notEqual(oc1.ctx.seed, 4242, 'the ocean gets its own seed, not the storm’s');
    for (let i = 0; i < 40; i++) D1.debug.step(1 / 60);
    assert.equal(completes, 0, 'no completion fires straight after the world enters');
    // (what it saves now is the ocean, with a sequence of its own)
    const rec = D1.debug.persisted.progress;
    assert.equal(rec.worldId, 'ocean');
    assert.deepEqual(rec.sequence, ['ocean']);

    // not gentle: the same save resumes the storm itself, restored and complete
    const sc2 = {}, oc2 = {};
    const store2 = memStore();
    savedStorm(store2);
    const { D: D2 } = await mk(dom, [world('storm', { ctl: sc2 }), world('ocean', { calm: true, ctl: oc2 })], { store: store2 });
    const ev2 = [];
    D2.on('world', (e) => ev2.push(e));
    await D2.start({ resume: true });
    assert.equal(D2.state.worldId, 'storm');
    assert.equal(sc2.restores?.length, 1, 'the saved world is restored');
    assert.equal(sc2.restores[0].complete, true);
    assert.equal(ev2[0].resumed, true);
    assert.equal(sc2.ctx.seed, 4242, 'the saved seed');
    assert.deepEqual(D2.state.discoveries, ['slowing']);

    // gentle, and the saved world is the calm one: it is restored as before
    const oc3 = {};
    const store3 = memStore();
    saveProgress(store3, { worldId: 'ocean', idx: 0, sequence: ['ocean'], step: 0.4, emotion: 'sad', intention: 'calm', seed: 77, state: { w: { v: 1, progress: 0.4 }, d: [], o: [], i: 0.5, c: 0 } });
    const { D: D3 } = await mk(dom, [world('storm'), world('ocean', { calm: true, ctl: oc3 })], { store: store3 });
    const ev3 = [];
    D3.on('world', (e) => ev3.push(e));
    await D3.start({ resume: true, gentle: true });
    assert.equal(D3.state.worldId, 'ocean');
    assert.equal(oc3.restores?.length, 1);
    assert.equal(ev3[0].resumed, true);
  } finally { for (const d of made) d.destroy(); dom.restore(); }
});

test('director: the real Luminous Ocean, entered gentle while a complete Static Storm is saved, is not complete and plays its intro', async () => {
  const { saveProgress } = await import('../src/engine/flow-store.js');
  const dom = installFakeDom();
  const made = [];
  const mk = async (...a) => { const r = await director(...a); made.push(r.D); return r; };
  try {
    const store = memStore();
    saveProgress(store, {
      worldId: 'static-storm', idx: 0, sequence: ['static-storm'], step: 1, emotion: 'angry', intention: 'calm', mallow: 'glitzi', seed: 99,
      // (a finished storm's save; the ocean's restore() would accept it)
      state: { w: { v: 1, seed: 99, progress: 1, complete: true, discoveries: ['slowing', 'stillness'], thought: { q: 0, settled: true }, elapsed: 60 }, d: ['slowing', 'stillness'], o: [], i: 0.7, c: 1 },
    });
    const said = [];
    const { D } = await mk(dom, WORLDS.map((w) => ({ ...w })), { store, subtitles: subs(said) });
    const ev = [];
    D.on('world', (e) => ev.push(e));
    let completes = 0;
    D.on('complete', () => completes++);
    // (the gentle choice "somewhere calm" with the storm saved; picking the storm up would be the storm itself)
    await D.start({ emotion: 'angry', intention: 'calm', worldId: 'luminous-ocean', gentle: true });
    assert.equal(D.state.worldId, 'luminous-ocean');
    assert.equal(ev[0].resumed, false);
    assert.equal(D.state.complete, false, 'the ocean is not complete');
    assert.ok(D.state.progress < 0.05, `the ocean starts at the beginning (progress ${D.state.progress})`);
    for (let i = 0; i < 100; i++) { D.debug.step(1 / 30); await wait(1); }
    assert.equal(completes, 0, 'no completion straight after it enters');
    assert.equal(D.state.complete, false);
    const lines = said.flatMap((s) => s.lines || []);
    const ocean = WORLDS.find((w) => w.id === 'luminous-ocean');
    // (a gentle session: Loomi's gentle intro — never "Ahh. The storm became a sea." nor the playful one, 'Ask before every world')
    assert.ok(lines.includes(ocean.dialogue.gentle.intro[0]), `Loomi's gentle intro plays (said: ${JSON.stringify(lines)})`);
    assert.ok(!lines.includes(ocean.dialogue.intro[0]) && !lines.includes(ocean.dialogue.arrive[0]), 'never the playful intro or the storm quip');
    assert.ok(!lines.includes(ocean.dialogue.completeStay) && !lines.includes(ocean.dialogue.complete), 'no completion line');
  } finally { for (const d of made) d.destroy(); dom.restore(); }
});

test('director: pause({reason:"safety"}) during loading — the world enters paused, never steps, says nothing, loop stopped; resume() then plays', async () => {
  const dom = installFakeDom();
  try {
    const gate = deferred(), log = [], ctl = {}, said = [];
    const amb = [];
    const { D, tk } = await director(dom, [world('w', { gate, log, ctl, ambience: 'blue-drift' })], { subtitles: subs(said), audio: { ambience: (id) => amb.push(id), fx() {} } });
    const ev = [];
    for (const k of ['world', 'pause', 'resume']) D.on(k, (e) => ev.push([k, e]));
    const p = D.start({ worldId: 'w' });
    await wait(5);
    assert.equal(D.state.phase, 'loading');
    D.pause({ reason: 'safety' });
    assert.equal(D.state.paused, true, 'held at once, while it still loads');
    assert.equal(D.state.reason, 'safety');
    assert.equal(D.state.canNext, false);
    const tl = D.debug.time;
    for (let i = 0; i < 20; i++) tk.tick();
    await wait(80);                      // prepare() has begun (idle time)
    assert.equal(D.debug.time, tl, 'its clock waits while it loads');
    gate.resolve();
    const st = await p;
    assert.ok(st, 'start() resolves with the world');
    assert.equal(D.state.phase, 'paused');
    assert.equal(D.debug.loop, 'stopped', 'the loop is stopped');
    assert.equal(tk.fns.size, 0, 'off the shared ticker');
    const t0 = D.debug.time;
    for (let i = 0; i < 30; i++) tk.tick();
    await wait(300);                      // (the watchdog never starts a loop of its own while paused)
    assert.equal(D.debug.time, t0, 'the world never steps');
    assert.ok(!ctl.frames, 'no frame');
    assert.equal(said.length, 0, 'no world lines (its intro was said under the veil: nothing)');
    assert.deepEqual(amb, [], 'no ambience under the veil');
    assert.deepEqual(ev.map((e) => e[0]), ['world', 'pause']);
    assert.equal(ev[0][1].paused, true);
    assert.equal(ev[0][1].reason, 'safety');
    assert.deepEqual(ev[1][1], { worldId: 'w', reason: 'safety' });
    assert.ok(log.includes('w:pause'));
    // care: Resume stays allowed (owner P4)
    D.resume();
    assert.equal(D.state.paused, false);
    assert.equal(D.state.phase, 'playing');
    assert.deepEqual(amb, ['blue-drift'], 'the ambience starts on resume');
    tk.tick();
    assert.ok(D.debug.time > t0, 'it steps now');
    assert.deepEqual(ev.map((e) => e[0]), ['world', 'pause', 'resume']);
    D.destroy();
  } finally { dom.restore(); }
});

test('director: a pause during loading that is resumed before the world arrives leaves nothing paused', async () => {
  const dom = installFakeDom();
  try {
    const gate = deferred();
    const { D } = await director(dom, [world('w', { gate })], {});
    const p = D.start({ worldId: 'w' });
    await wait(5);
    D.pause();
    assert.equal(D.state.paused, true);
    D.resume();
    assert.equal(D.state.paused, false);
    gate.resolve();
    await p;
    assert.equal(D.state.phase, 'playing');
    D.destroy();
  } finally { dom.restore(); }
});

test('director: finish() during loading — start() resolves null, the phase stays "finished", the world never enters; finish carries its reason', async () => {
  const dom = installFakeDom();
  try {
    // finished while the module loads (before prepare)…
    const log1 = [];
    const { D: D1 } = await director(dom, [world('w', { log: log1 })], {});
    const fin = [];
    D1.on('finish', (e) => fin.push(e));
    const p1 = D1.start({ worldId: 'w' });
    D1.finish({ reason: 'safety' });
    assert.equal(await p1, null);
    assert.equal(D1.state.phase, 'finished');
    assert.deepEqual(fin, [{ worldId: 'w', reason: 'safety' }]);
    assert.ok(!log1.some((l) => l.endsWith(':enter')), 'never entered');
    await wait(120);
    assert.equal(D1.state.phase, 'finished', 'still finished');
    D1.destroy();
    // …and while it builds (after prepare began)
    const gate = deferred(), log2 = [];
    const { D: D2 } = await director(dom, [world('w', { gate, log: log2 })], {});
    const worlds = [];
    D2.on('world', (e) => worlds.push(e));
    const p2 = D2.start({ worldId: 'w' });
    await wait(90);
    assert.ok(log2.includes('w:prepare'), 'it was building');
    D2.finish();
    gate.resolve();
    assert.equal(await p2, null, 'start() resolves null');
    assert.equal(D2.state.phase, 'finished');
    assert.equal(D2.state.worldId, null);
    assert.deepEqual(worlds, [], "no 'world' event");
    assert.ok(log2.includes('w:destroy') && !log2.includes('w:enter'), 'built, never entered, destroyed');
    D2.resume();
    assert.equal(D2.state.phase, 'finished', 'no Resume after a finish (owner P3)');
    assert.equal(D2.resumable(), null, 'and nothing saved to come back to');
    D2.destroy();
  } finally { dom.restore(); }
});

test("director: exactly one 'host' per melt, halfway (0.45 ≤ k ≤ 0.6), naming the incoming Mallow; melt events carry it too and stay [0, 1]", async () => {
  const dom = installFakeDom();
  try {
    for (const reduced of [false, true]) {
      for (const dt of [1 / 60, 1 / 30, 0.05]) {
        const { D } = await director(dom, [world('storm', { mallow: 'glitzi', next: ['ocean'] }), world('ocean', { calm: true, final: true, mallow: 'loomi' })], { reducedMotion: reduced });
        const host = [], melts = [], order = [];
        D.on('host', (e) => { host.push(e); order.push(['host', D.state.melt]); });
        D.on('melt', (e) => { melts.push(e); order.push(['melt', e.k]); });
        await D.start({ worldId: 'storm' });
        assert.ok(D.next());
        assert.ok(await until(D, () => D.state.phase === 'melting'), 'melting');
        for (let i = 0; i < 400 && D.state.worldId !== 'ocean'; i++) D.debug.step(dt);
        assert.equal(D.state.worldId, 'ocean');
        assert.equal(host.length, 1, `one host (reduced ${reduced}, dt ${dt})`);
        assert.ok(host[0].k >= 0.45 && host[0].k <= 0.6, `host at k ${host[0].k}`);
        assert.deepEqual(host[0], { from: 'storm', to: 'ocean', mallow: 'loomi', k: host[0].k });
        assert.deepEqual(melts.map((m) => m.k), [0, 1]);
        assert.equal(melts[0].mallow, 'loomi', 'the host to prefetch, at k 0');
        assert.deepEqual(order.map((o) => o[0]), ['melt', 'host', 'melt']);
        assert.ok(order[1][1] >= 0.5 && order[1][1] < 0.6, `state.melt when hosted: ${order[1][1]}`);
        D.destroy();
      }
    }
  } finally { dom.restore(); }
});

test('director: a paused melt never hosts; it hosts once after resume', async () => {
  const dom = installFakeDom();
  try {
    const { D, tk } = await director(dom, [world('storm', { mallow: 'glitzi' }), world('ocean', { calm: true, final: true, mallow: 'loomi' })], {});
    const host = [];
    D.on('host', (e) => host.push(e));
    await D.start({ worldId: 'storm' });
    D.next();
    await until(D, () => D.state.phase === 'melting');
    for (let i = 0; i < 60; i++) D.debug.step(1 / 60);       // ~0.2 of the way
    D.pause();
    for (let i = 0; i < 400; i++) tk.tick();                  // a paused melt does not move
    await wait(40);
    assert.equal(host.length, 0);
    assert.ok(D.state.melt < 0.45);
    D.resume();
    for (let i = 0; i < 400 && D.state.worldId !== 'ocean'; i++) D.debug.step(1 / 60);
    assert.equal(host.length, 1);
    D.destroy();
  } finally { dom.restore(); }
});

test("director: hold('offer') — with Auto-flow on and the world complete it stays 'playing'; let go, it melts; safeForUpdate is false while held", async () => {
  const dom = installFakeDom();
  try {
    const ctl = {};
    const { D } = await director(dom, [world('a', { ctl }), world('b')], { subtitles: subs() });
    await D.start({ worldId: 'a' });
    D.setAutoFlow(true);
    const holdEv = [];
    D.on('hold', (e) => holdEv.push(e));
    assert.equal(D.hold('offer', true), true);
    assert.equal(D.state.held, true);
    assert.equal(D.safeForUpdate(), false, 'never reload under an open offer');
    ctl.complete = true; ctl.progress = 1;
    await until(D, () => !!D.incoming && D.debug.time > 1, 400);
    for (let i = 0; i < 60 * 12; i++) D.debug.step(1 / 60);   // 12 s of rest, well past Auto-flow's 4 s
    await wait(20);
    assert.equal(D.state.phase, 'playing', 'held: no melt');
    assert.equal(D.state.complete, true);
    assert.equal(D.state.autoFlow, true);
    assert.equal(D.hold('offer', false), false);
    assert.deepEqual(holdEv.map((e) => [e.key, e.on]), [['offer', true], ['offer', false]]);
    D.debug.step(1 / 60);
    assert.equal(D.state.phase, 'melting', 'let go: it drifts on');
    D.destroy();
  } finally { dom.restore(); }
});

test('director: the person’s own Drift on goes while an offer holds Auto-flow back', async () => {
  const dom = installFakeDom();
  try {
    const { D } = await director(dom, [world('a'), world('b')], {});
    await D.start({ worldId: 'a' });
    D.hold('offer', true);
    assert.equal(D.state.canNext, true);
    assert.equal(D.next(), true);
    assert.ok(await until(D, () => D.state.phase === 'melting'), 'melting');
    D.destroy();
  } finally { dom.restore(); }
});

test('director (owner P1): after the ocean canNext is false and next() does nothing, in every session; the completion says Stay as long as you like', async () => {
  const dom = installFakeDom();
  try {
    for (const gentle of [false, true]) {
      const said = [];
      const { D } = await director(dom, WORLDS.map((w) => ({ ...w })), { subtitles: subs(said) });
      await D.start({ worldId: 'luminous-ocean', emotion: 'anxious', intention: 'let-go', gentle });
      assert.equal(D.state.worldId, 'luminous-ocean');
      assert.equal(D.state.canNext, false, 'Drift on is disabled');
      assert.equal(D.next(), false);
      assert.equal(D.state.nextId, null);
      D.setAutoFlow(true);
      for (let i = 0; i < 30 * 8; i++) D.debug.step(1 / 30);
      assert.equal(D.state.phase, 'playing');
      assert.equal(D.incoming, null, 'nothing is even prepared');
      D.destroy();
    }
    // the ocean's completion: its completeStay line, never the choice
    const said = [], ctl = {};
    const OCEAN = { ...WORLDS[1], load: world('o', { ctl }).load };
    const { D } = await director(dom, [WORLDS[0], OCEAN], { subtitles: subs(said) });
    await D.start({ worldId: 'luminous-ocean' });
    ctl.complete = true;
    D.debug.step(1 / 60);
    await wait(10);
    assert.ok(said.some((s) => s.lines?.[0] === WORLDS[1].dialogue.completeStay), JSON.stringify(said));
    assert.ok(!said.some((s) => s.choice), 'no "Stay, or drift on?"');
    D.destroy();
  } finally { dom.restore(); }
});

test('director: canNext is true exactly when next() melts — storm yes; melting, finished, safety-held no', async () => {
  const dom = installFakeDom();
  try {
    const { D } = await director(dom, [world('storm', { next: ['ocean'] }), world('ocean', { calm: true, final: true })], {});
    assert.equal(D.state.canNext, false, 'nothing playing');
    await D.start({ worldId: 'storm' });
    assert.equal(D.state.canNext, true);
    assert.equal(D.state.nextId, null, 'reading canNext chooses nothing');
    D.pause({ reason: 'safety' });
    assert.equal(D.state.canNext, false, 'held by safety');
    assert.equal(D.next(), false, '…and next() is refused');
    assert.equal(D.state.paused, true, 'still paused');
    D.resume();
    assert.equal(D.state.canNext, true);
    assert.equal(D.next(), true);
    assert.ok(await until(D, () => D.state.phase === 'melting'));
    assert.equal(D.state.canNext, false, 'mid-melt');
    for (let i = 0; i < 400 && D.state.phase === 'melting'; i++) D.debug.step(1 / 30);
    assert.equal(D.state.worldId, 'ocean');
    assert.equal(D.state.canNext, false, 'after the ocean');
    D.finish();
    assert.equal(D.state.canNext, false);
    assert.equal(D.next(), false);
    D.destroy();
  } finally { dom.restore(); }
});

test('director: next() on a paused Hushflow resumes and melts; on a safety pause it is refused, unless the session is gentle (calm worlds only)', async () => {
  const dom = installFakeDom();
  try {
    const { D } = await director(dom, [world('storm'), world('ocean', { calm: true, final: true })], {});
    const ev = [];
    for (const k of ['pause', 'resume']) D.on(k, (e) => ev.push([k, e]));
    await D.start({ worldId: 'storm' });
    D.pause();                       // the person (or a sheet) paused it
    assert.equal(D.state.canNext, true);
    assert.equal(D.next(), true);
    assert.equal(D.state.paused, false, 'resumed');
    assert.ok(await until(D, () => D.state.phase === 'melting'), 'and melting');
    assert.deepEqual(ev.map((e) => e[0]), ['pause', 'resume']);
    D.destroy();
    // care in the storm, then the calm way on (H2): setGentle(true) + next({ worldId: 'luminous-ocean' })
    const { D: D2 } = await director(dom, [world('storm'), world('other'), world('ocean', { calm: true, final: true })], {});
    await D2.start({ worldId: 'storm' });
    D2.pause({ reason: 'safety' });
    assert.equal(D2.next({ worldId: 'ocean' }), false, 'not while safety holds it');
    D2.setGentle(true);
    assert.equal(D2.next({ worldId: 'other' }), false, 'a gentle session never drifts into a world that is not calm');
    assert.equal(D2.state.canNext, true);
    assert.equal(D2.next({ worldId: 'ocean' }), true);
    assert.ok(await until(D2, () => D2.state.phase === 'melting'), 'a melt, not a hard cut');
    for (let i = 0; i < 400 && D2.state.phase === 'melting'; i++) D2.debug.step(1 / 30);
    assert.equal(D2.state.worldId, 'ocean');
    assert.equal(D2.state.gentle, true);
    D2.destroy();
  } finally { dom.restore(); }
});

test('director: next({worldId}) melts into the chosen world, dropping a staged different one; refuses unknown, current and failed worlds', async () => {
  const dom = installFakeDom();
  try {
    const log = [];
    const { D } = await director(dom, [world('a', { log, next: ['b'] }), world('b', { log }), world('c', { log })], {});
    await D.start({ worldId: 'a' });
    assert.equal(D.next({ worldId: 'a' }), false, 'not the current world');
    assert.equal(D.next({ worldId: 'nope' }), false);
    // stage b (the authored next) first, as Auto-flow's preparation would
    D.next();
    await until(D, () => !!D.incoming, 100);
    assert.equal(D.state.nextId, 'b');
    D.pause();
    assert.equal(D.next({ worldId: 'c' }), true);
    assert.ok(log.includes('b:destroy'), 'the staged b is dropped');
    assert.ok(await until(D, () => D.state.phase === 'melting'));
    for (let i = 0; i < 400 && D.state.phase === 'melting'; i++) D.debug.step(1 / 30);
    assert.equal(D.state.worldId, 'c');
    assert.ok(log.includes('c:enter<a'), 'c entered from a (a melt)');
    D.destroy();
  } finally { dom.restore(); }
});

test('director: setGentle(true) drops a staged world that is not calm; the next one is calm', async () => {
  const dom = installFakeDom();
  try {
    const log = [];
    const fits = (n) => ({ emotions: { other: n }, intentions: {} });
    const { D } = await director(dom, [world('a', { log }), world('hot', { log, fits: fits(1) }), world('sea', { log, calm: true, fits: fits(0.5) })], {});
    await D.start({ worldId: 'a' });
    D.next();
    D.pause();                                   // (paused before it melts)
    await wait(120);
    assert.equal(D.state.nextId, 'hot', 'the better fit first');
    D.setGentle(true);
    assert.ok(log.includes('hot:destroy'), 'dropped');
    assert.equal(D.state.nextId, null);
    D.resume();
    assert.ok(D.next());
    assert.ok(await until(D, () => D.state.phase === 'melting'));
    for (let i = 0; i < 400 && D.state.phase === 'melting'; i++) D.debug.step(1 / 30);
    assert.equal(D.state.worldId, 'sea');
    D.destroy();
  } finally { dom.restore(); }
});

test('director: a gentle session plays each calm world once — never drifts back into one it played; a session that is not gentle may', async () => {
  const dom = installFakeDom();
  try {
    const list = () => [world('sea', { calm: true, next: ['cove'] }), world('cove', { calm: true, next: ['hot'] }), world('hot', { next: ['sea'] })];
    const { D } = await director(dom, list(), {});
    await D.start({ worldId: 'sea', gentle: true });
    assert.equal(D.state.canNext, true, 'the other calm world follows');
    assert.ok(D.next());
    assert.ok(await until(D, () => D.state.worldId === 'cove' && D.state.phase === 'playing', 600));
    assert.equal(D.state.canNext, false, 'every calm world played: nothing follows (the sea was played, hot is not calm)');
    assert.equal(D.next(), false);
    assert.equal(D.next({ worldId: 'sea' }), true, 'a calm world the shell asks for by name still goes (care: "Somewhere calm")');
    D.destroy();
    // the same worlds, not gentle: the authored link, then (all played recently) the one played longest ago
    const { D: D2 } = await director(dom, list(), {});
    await D2.start({ worldId: 'cove' });
    assert.ok(D2.next());
    assert.ok(await until(D2, () => D2.state.worldId === 'hot' && D2.state.phase === 'playing', 600));
    assert.equal(D2.state.canNext, true, 'not gentle: the rotation goes on');
    // a session turned gentle (care) with a world it already played staged: that world is dropped, nothing follows
    const ctl = {};
    const { D: D3 } = await director(dom, [world('sea', { calm: true, next: ['cove'], ctl }), world('cove', { calm: true, next: ['sea'], ctl: {} })], {});
    await D3.start({ worldId: 'sea' });
    assert.ok(D3.next());
    assert.ok(await until(D3, () => D3.state.worldId === 'cove' && D3.state.phase === 'playing', 600));
    D3.next();
    D3.pause();
    await wait(120);
    assert.equal(D3.state.nextId, 'sea', 'staged: back to the sea (not gentle)');
    D3.setGentle(true);
    assert.equal(D3.incoming, null, 'gentle now: the sea was played, so it is dropped');
    D3.resume();
    assert.equal(D3.state.canNext, false);
    D2.destroy(); D3.destroy();
  } finally { dom.restore(); }
});

test('director: stay(false) un-stays without melting; stay() keeps Auto-flow from melting a complete world', async () => {
  const dom = installFakeDom();
  try {
    const ctl = {};
    const { D } = await director(dom, [world('a', { ctl }), world('b')], { subtitles: subs() });
    const ev = [];
    D.on('stay', (e) => ev.push(e));
    await D.start({ worldId: 'a' });
    D.setAutoFlow(true);
    D.stay();
    assert.equal(D.state.staying, true);
    ctl.complete = true;
    for (let i = 0; i < 60 * 8; i++) { D.debug.step(1 / 60); if (i % 30 === 0) await wait(1); }
    await wait(120);                               // (b is built in idle time)
    for (let i = 0; i < 60 * 2; i++) D.debug.step(1 / 60);
    assert.equal(D.state.phase, 'playing', 'staying');
    D.stay(false);
    assert.equal(D.state.staying, false);
    assert.equal(D.state.phase, 'playing', 'un-staying is not a melt by itself');
    assert.deepEqual(ev, [{ worldId: 'a', on: true }, { worldId: 'a', on: false }]);
    // …but Auto-flow may now drift on after its rest
    for (let i = 0; i < 60 * 6 && D.state.phase === 'playing'; i++) D.debug.step(1 / 60);
    assert.equal(D.state.phase, 'melting');
    D.destroy();
  } finally { dom.restore(); }
});

test('director: no Memory Garden offer while safety holds the world, in a gentle session, or after a finish (owner P3/P4); discoveries wait under the veil', async () => {
  const dom = installFakeDom();
  try {
    const disc = { found: { skillId: 'tool' }, again: { skillId: 'tool' }, third: { skillId: 'tool2' } };
    // a discovery whose lines are still being said when safety pauses the world
    let release;
    const slow = { say: () => new Promise((r) => { release = r; }), choice: () => new Promise(() => {}), clear() {}, pause() {}, resume() {} };
    const ctl = {};
    const { D } = await director(dom, [world('a', { ctl, discoveries: { found: { skillId: 'tool', lines: ['Found it.'] }, again: { skillId: 'tool', lines: ['Again.'] } } })], { subtitles: slow });
    const offers = [];
    D.on('offer', (e) => offers.push(e));
    await D.start({ worldId: 'a' });
    assert.equal(ctl.discover('found'), true);
    D.pause({ reason: 'safety' });
    assert.equal(D.state.hushed, true);
    release(); await wait(5);
    assert.deepEqual(offers, [], 'held for safety: no offer');
    assert.equal(ctl.discover('again'), false, 'nothing is found under the veil');
    D.resume();
    assert.equal(D.state.hushed, false);
    assert.equal(ctl.discover('again'), true);
    release(); await wait(5);
    assert.deepEqual(offers.map((o) => o.skillId), ['tool'], 'once support is gone, a later discovery of the same tool offers it');
    D.destroy();
    // gentle session: never
    const ctl2 = {};
    const { D: D2 } = await director(dom, [world('a', { ctl: ctl2, calm: true, discoveries: disc })], { subtitles: subs() });
    const offers2 = [];
    D2.on('offer', (e) => offers2.push(e));
    await D2.start({ worldId: 'a', gentle: true });
    assert.equal(ctl2.discover('found'), true);
    await wait(5);
    assert.deepEqual(offers2, []);
    D2.destroy();
    // after a finish: a discovery still speaking never turns into an offer
    let rel3;
    const slow3 = { ...slow, say: () => new Promise((r) => { rel3 = r; }) };
    const ctl3 = {};
    const { D: D3 } = await director(dom, [world('a', { ctl: ctl3, discoveries: { found: { skillId: 'tool', lines: ['Found it.'] } } })], { subtitles: slow3 });
    const offers3 = [];
    D3.on('offer', (e) => offers3.push(e));
    await D3.start({ worldId: 'a' });
    ctl3.discover('found');
    D3.finish();
    rel3(); await wait(5);
    assert.deepEqual(offers3, []);
    assert.equal(ctl3.discover('third'), false, 'and nothing is found after the end');
    D3.destroy();
  } finally { dom.restore(); }
});

test("director: a safety pause drops a Drift on asked for earlier; a world's completion choice waits for resume and never comes after a finish", async () => {
  const dom = installFakeDom();
  try {
    const gate = deferred(), ctl = {}, said = [];
    const { D } = await director(dom, [world('a', { ctl }), world('b', { gate })], { subtitles: subs(said) });
    await D.start({ worldId: 'a' });
    assert.ok(D.next());                     // b is still building (gated)
    await wait(90);
    D.pause({ reason: 'safety' });
    gate.resolve();
    await wait(20);
    D.resume();
    for (let i = 0; i < 120; i++) D.debug.step(1 / 60);
    assert.equal(D.state.phase, 'playing', 'the earlier Drift on is gone');
    D.destroy();
    // completion while a discovery still speaks, then paused: the question waits for resume
    for (const end of ['resume', 'finish']) {
      const ctl2 = {}, said2 = [];
      let release;
      const s2 = { ...subs(said2), say: (lines, o) => { said2.push({ lines: [].concat(lines), kind: o?.kind }); return o?.kind === 'discovery' ? new Promise((r) => { release = r; }) : Promise.resolve(); } };
      const { D: D2 } = await director(dom, [world('a', { ctl: ctl2, discoveries: { found: { lines: ['Found.'], offer: false } } }), world('b')], { subtitles: s2 });
      await D2.start({ worldId: 'a' });
      ctl2.discover('found');
      ctl2.complete = true;
      D2.debug.step(1 / 60);                  // complete: the question waits for the discovery's lines
      D2.pause();
      release();
      await wait(450);
      assert.ok(!said2.some((s) => s.choice), 'not under the veil');
      if (end === 'resume') {
        D2.resume();
        await wait(450);
        assert.ok(said2.some((s) => s.choice), 'after resume');
      } else {
        D2.finish();
        await wait(450);
        assert.ok(!said2.some((s) => s.choice) && !said2.some((s) => /stay/i.test(s.lines?.[0] || '')), 'never after a finish');
      }
      D2.destroy();
    }
  } finally { dom.restore(); }
});

test('director (owner P3): paused for safety, then finished — the phase is "finished", nothing paused, Resume does nothing', async () => {
  const dom = installFakeDom();
  try {
    const { D, tk } = await director(dom, [world('a'), world('b')], {});
    await D.start({ worldId: 'a' });
    D.pause({ reason: 'safety' });
    D.finish({ reason: 'safety' });
    assert.equal(D.state.phase, 'finished');
    assert.equal(D.state.paused, false, 'no Resume shows for a finished world');
    const t0 = D.debug.time;
    D.resume();
    for (let i = 0; i < 30; i++) tk.tick();
    assert.equal(D.state.phase, 'finished');
    assert.equal(D.debug.time, t0);
    assert.equal(D.next(), false);
    D.destroy();
  } finally { dom.restore(); }
});

test('director: the calls the current shell makes still work unchanged (pause(), resume(), finish(), next(), setAutoFlow(), stay(), on())', async () => {
  const dom = installFakeDom();
  try {
    const { D } = await director(dom, [world('a'), world('b')], {});
    const ev = [];
    for (const k of ['world', 'pause', 'resume', 'finish', 'stay', 'autoflow', 'melt']) D.on(k, (e) => ev.push(k));
    await D.start({ emotion: 'angry', intention: 'calm', worldId: 'a' });
    D.setAutoFlow(false);
    D.pause(); D.pause();
    assert.equal(D.state.paused, true);
    assert.equal(D.state.reason, null);
    D.resume();
    D.stay();
    assert.equal(D.state.staying, true);
    assert.equal(D.next(), true);
    assert.equal(D.state.staying, false);
    await until(D, () => D.state.phase === 'melting');
    D.finish(); D.finish();
    assert.deepEqual(ev, ['world', 'autoflow', 'pause', 'resume', 'stay', 'melt', 'finish']);
    D.destroy();
  } finally { dom.restore(); }
});

test("director: a world's completion never comes over an open offer — its choice waits for hold('offer') to let go", async () => {
  const dom = installFakeDom();
  try {
    const ctl = {}, said = [];
    const { D } = await director(dom, [world('w', { ctl }), world('x')], { subtitles: subs(said) });
    await D.start({ worldId: 'w' });
    said.length = 0;
    D.hold('offer', true);
    ctl.complete = true;
    for (let i = 0; i < 10; i++) D.debug.step(1 / 60);
    await wait(900);
    assert.equal(said.filter((s) => s.choice || s.kind === 'dialogue').length, 0, `nothing said over the offer: ${JSON.stringify(said)}`);
    assert.equal(D.state.phase, 'playing');
    D.hold('offer', false);
    await wait(900);
    assert.deepEqual(said.filter((s) => s.choice).map((s) => s.choice), ['w: stay, or drift on?'], 'the completion choice once the offer is answered');
    D.destroy();
  } finally { dom.restore(); }
});

test('director: finish() while loading clears the loading title; a start() that fails drops a pause asked for meanwhile', async () => {
  const dom = installFakeDom();
  try {
    // finish during loading: no title left behind
    const gate = deferred();
    const { D } = await director(dom, [world('w', { gate })], {});
    const p = D.start({ worldId: 'w' });
    await wait(5);
    assert.equal(D.state.title, 'w title', 'the loading world’s name');
    D.finish({ reason: 'safety' });
    assert.equal(D.state.title, null, 'nothing is loading after a finish');
    assert.equal(D.state.worldId, null);
    gate.resolve();
    assert.equal(await p, null);
    assert.equal(D.state.title, null);
    D.destroy();

    // a build that fails while a safety pause waits for it: the pause goes with it
    let fail;
    const bad = { p: new Promise((_, r) => { fail = r; }) };
    bad.p.catch(() => {});
    const warn = console.warn; console.warn = () => {};
    try {
      const errs = [];
      const { D: D2 } = await director(dom, [world('bad', { gate: bad }), world('ok')], {});
      D2.on('error', (e) => errs.push(e.kind));
      const p2 = D2.start({ worldId: 'bad' });
      await wait(5);
      D2.pause({ reason: 'safety' });
      assert.equal(D2.state.paused, true);
      await wait(40);
      fail(new Error('build failed'));
      assert.equal(await p2, null);
      assert.deepEqual(errs, ['start']);
      assert.equal(D2.state.phase, 'idle');
      assert.equal(D2.state.paused, false, 'no pause left waiting');
      assert.equal(D2.state.reason, null, 'no stale safety reason');
      assert.equal(D2.state.title, null);
      // the next start() enters playing, not paused
      const ev = [];
      D2.on('world', (e) => ev.push(e));
      assert.ok(await D2.start({ worldId: 'ok' }));
      assert.equal(D2.state.phase, 'playing');
      assert.equal(ev[0].paused, false);
      assert.equal(ev[0].reason, null);
      D2.destroy();
    } finally { console.warn = warn; }
  } finally { dom.restore(); }
});
