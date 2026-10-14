// FEATURE — Hushfold Weather Weaver (#weather): touch and reshape the weather.
//
// The Mallow sits in a Hushfold world and the sky above it is something you can
// touch: clouds part under a finger, rain gathers into a glass bead, and the
// realm's own painted weather follows over a few seconds (two speeds: the lab
// layer answers within a frame, the realm eases its mood). Eight weathers live
// on a dial; each happens in a realm that can paint its sky, so a pick either
// turns the weather in place or sends a weather front across while the world
// changes behind it. Reshaping a weather raises its progress, which drives the
// realm's mood and authored resolution; at 1 the resolve beat plays (reaction,
// bloom, motif, caption and the Mallow's line) and the lead chip becomes Again.
// No storage beyond this session's last weather, kept in module memory.
//
// Built on the shared engine: stage-screen (backdrop null, then s.env), the
// pointer router, the weather sims (core/weather/*), the WeatherLayer canvases,
// the WeatherReactor with a FaceMixer, and the lab-ui announcer.
//
// One loop: progress and the planner → tools → sims → mood and transform → reactor → layer.

import { announcer } from '../lab-ui.js';
import { stageScreen } from './stage-screen.js';
import { homeRealm, REALM_GEO } from '../core/environment.js';
import { routePointers } from '../core/pointer-router.js';
import { FaceMixer } from '../core/expression-engine.js';
import { clearGlowSprites } from '../core/effects.js';
import { smoothstep } from '../core/math.js';
import {
  COPY, WEATHERS, DIAL_ORDER, WeatherSession, moodFor, transformFor, pulseFor, progressFor, captionFor, lineFor, realmShort, realmPhrase,
} from '../core/weather.js';
import { CloudBank, StrikeClock, COLS } from '../core/weather/clouds.js';
import { RainField } from '../core/weather/rain.js';
import { WeatherReactor } from '../core/weather-mallow.js';
import { WeatherLayer } from '../core/weather-layer.js';
import { createRings, addRing, stepRings, frontColour } from '../core/weather-draw.js';
import { createTools } from './weather/tools.js';
import { weatherDial, actionRow, hintLine } from './weather/ui.js';
import { REALMS } from '../../src/world/realm.js';
import { MALLOWS } from '../../src/mallows/registry.js';
import { haptic } from '../../src/engine/haptics.js';

export const meta = { id: 'weather', title: COPY.title };

let lastWeather = null;   // this session's last weather (module memory only; never stored)

const DRIFT = { storm: 1600, rain: 500 };       // px/s leeward carry once resolved (× each bank's wind factor)
const HAPTIC_GAP = { light: 250, soft: 600 };   // ms (light ≤ 4 a second)
const CHIME_GAP = 200;                          // ms between bead plinks (≤ 5 a second)

export function mount(root, ctx) {
  const id = ctx.mallowId, mallow = MALLOWS[id], name = mallow.name;
  const home = homeRealm(ctx.dna, id);
  let tuning = ctx.dna.tuning(), reduced = ctx.prefs.reducedMotion(), tier = ctx.quality;
  const gentle = () => tuning.style === 'gentle';
  const session = new WeatherSession({ home, weather: lastWeather, reduced, tier, speed: tuning.speed });
  const planner = session.planner;

  let ready = false, closed = false, leaving = false;
  let raf = 0, enterRaf = 0, last = 0, simT = 0, qAcc = 0, raw = 0;
  let leaveT = 0, remountT = 0, actT = 0, groundY = 0, leanT = 0, hintAt = -1;
  let shownW = null, geoKey = '', deckY0 = 0, affA = 0, affKind = null, wHeld = false;
  let firstGap = false, saidLight = false, saidThin = false, saidShelter = false;
  const touchedW = new Set();
  const gates = new Map();
  const geo = { W: 390, H: 844, skyTop: 64, horizonY: 480, floorY: 700, water: null, baseline: 0.83, topBottom: 56, bottomTop: 718, body: null };

  const s = stageScreen(root, ctx, {
    title: COPY.title, subtitle: COPY.subtitle(WEATHERS[session.weather].label, realmShort(REALMS[session.realm].name)),
    backdrop: null, feedback: false, stageLabel: COPY.stageLabel,
    onExit: () => leave(), onLayout: (L) => onLayout(L), keys: (e, k, phase) => keys(e, k, phase),
    onEvent: (e) => { if (ready && !leaving && e.type === 'tap' && rain.wet > 0.3) reactor.event('touch-wet', { x: body.cx, y: body.top }); },
  });
  s.screen.classList.add('moment', 'weather', 'entering');
  enterRaf = requestAnimationFrame(() => { enterRaf = 0; s.screen.classList.remove('entering'); });
  const env = s.env, companion = s.companion, rig = companion.rig;
  const body = rig.bodyRect({});
  geo.body = body;

  // ------------------------------------------------------------- sims --
  const clouds = new CloudBank({ kind: 'thunder', tier, seed: 7 });
  const deck = new CloudBank({ kind: 'deck', tier, seed: 3 });
  const rain = new RainField({ tier, seed: 5, lagoon: session.realm === 'raindrop-lagoon' });
  const strikes = new StrikeClock({ seed: 9 });
  for (const sim of [clouds, deck, rain]) { sim.setReduced(reduced); sim.setSpeed(tuning.speed); }
  const cover = new Float32Array(COLS);
  const rainOpts = { cover, coverK: 1, wind: 0, body, reduced };
  const rings = createRings();
  const live = { clear: 0, rainLevel: 1 };
  const moodOut = { agitation: 0, heaviness: 0, clarity: 0, warmth: 0 }, moodOpts = { gentle: false };

  // ---------------------------------------------------------- the Mallow --
  const mixer = new FaceMixer(rig);
  const reactor = new WeatherReactor(companion, { mallowId: id, sound: ctx.sound, mixer, style: tuning.style, reduced, motion: tuning.motion });
  const cond = { gaze: null, touch: null, pool: null, cluster: null, front: null, windAt: null, energy: 0, lightOnBody: 0, moonlit: false, bask: false, hearth: false, raining: false, touched: false, t: 0, dt: 0 };
  const gazePt = { x: 0, y: 0 }, frontPt = { x: 0, y: 0 };

  // ------------------------------------------------------------ layers --
  const layer = new WeatherLayer({ wrap: s.wrap, screen: s.screen, quality: tier, reducedMotion: reduced, palette: ctx.dna.palette() });
  const front = { on: false, cover: 0, dir: 1, swapped: false, mode: 'sweep', family: 'cloud', colA: [0, 0, 0], colB: [0, 0, 0], t: 0, toRealm: null };
  const scene = {
    t: 0, W: geo.W, H: geo.H, geo, fade: 1, held: 0, rainAlpha: 1, rings, front,
    sims: { clouds, deck, rain },
    storm: { gaps: null, n: 0, y0: 0, shaft: 0, warm: 0 },
    affordance: null, affordanceA: 0,
  };

  // ------------------------------------------------------------- tools --
  const hitB = {};
  const tools = createTools({
    sims: { clouds, deck, rain, strikes }, geo,
    weather: () => session.weather,
    amount: (w) => planner.amount(w),
    fronting: () => session.state === 'fronting',
    frontDrag: (v) => planner.drag(v),
    locked: () => !ready || leaving || session.state === 'paused',
    onMallow: (x, y) => {
      if (rig.soft) return rig.hitTest(x, y);
      rig.bodyRect(hitB);   // before the soft body loads: its ellipse
      const dx = (x - hitB.cx) / (hitB.w * 0.5), dy = (y - hitB.mid) / (hitB.h * 0.5);
      return dx * dx + dy * dy < 1;
    },
    emit: (type, x, y, k) => onWeather(type, x, y, k),
    reduced: () => reduced, gentle,
    ring: (x, y) => addRing(rings, x, y),
    touched: (w) => touchedW.add(w),
  });
  scene.storm.gaps = tools.storm.gaps;
  rain.emit = (type, x, y, k) => onWeather(type, x, y, k);
  const router = routePointers(s.screen, { stage: s.stage, claim: tools.claim });

  // ---------------------------------------------------------------- ui --
  const hint = hintLine(s.screen);
  const sr = announcer(s.screen, { gapMs: 3000 });
  const actions = actionRow();
  const dial = weatherDial(DIAL_ORDER, session.weather, (w, viaKey) => pick(w, viaKey));
  s.bottom.append(actions.el, dial.el);
  const subtitleEl = s.screen.querySelector('.topbar .title small');
  const say = (text) => sr.say(text);
  // a weather whose tool has not landed yet shows its world only: no hint, no "how to" (nothing to promise)
  const howTo = (w) => (tools.has(w) ? WEATHERS[w].say : '');
  const showHint = (w) => { if (tools.has(w)) hint.show(WEATHERS[w].hint, 3000); else hint.hide(); };

  // ------------------------------------------------------- live settings --
  const offPrefs = ctx.prefs.onChange((k) => {
    if (k !== 'motion' && k !== '*') return;
    reduced = ctx.prefs.reducedMotion();
    rainOpts.reduced = reduced;
    layer.setReducedMotion(reduced);
    for (const sim of [clouds, deck, rain]) sim.setReduced(reduced);
    planner.setReduced(reduced);
    reactor.setReduced(reduced);
    if (reduced) { env.setFocus(0, 0); leanT = 0; }
  });
  const offDna = ctx.dna.onChange(() => {
    tuning = ctx.dna.tuning();
    reactor.setStyle(tuning.style);
    reactor.setMotion(tuning.motion);
    for (const sim of [clouds, deck, rain]) sim.setSpeed(tuning.speed);
    planner.setSpeed(tuning.speed);
    layer.setPalette(ctx.dna.palette());
  });
  const onVis = () => {
    if (closed) return;
    if (document.hidden) { session.pause(); actions.endHolds(); wRelease(); tools.altEnd(); }
    else { session.resume(); last = 0; kick(); }
  };
  document.addEventListener('visibilitychange', onVis);

  // --------------------------------------------------------------- start --
  function onLayout(L) {
    geo.W = L.W; geo.H = L.H; geo.floorY = L.floor; geo.baseline = L.baseline;
    geo.topBottom = L.topBottom; geo.bottomTop = L.bottomTop; geo.skyTop = L.topBottom + 8;
    if (closed) return;
    if (!ready) { begin(); return; }
    applyGeo(false);
    // a new ground line: rebuild the realm in place (debounced, never under a front)
    if (Math.abs(L.baseline - groundY) > 0.015) { clearTimeout(remountT); remountT = setTimeout(remount, 300); }
  }

  function begin() {
    ready = true;
    const realm = session.realm;
    env.mount(realm, { mood: moodFor(session.weather, 0, null, realm, { gentle: gentle() }), transform: 0, groundY: geo.baseline });
    groundY = geo.baseline;
    layer.setRealm(realm, REALMS[realm].palette, env.tone);
    rain.setLagoon(realm === 'raindrop-lagoon');
    applyGeo(true);
    session.begin();
    shownW = session.weather;
    lastWeather = shownW;
    reactor.weather(shownW, 0);
    setSubtitle();
    updateActions();
    dial.reveal();
    hintAt = 0.8;
    say(COPY.announce.at(WEATHERS[shownW].label, realmPhrase(REALMS[realm].name), howTo(shownW)));
    kick();
  }

  function remount() {
    remountT = 0;
    if (closed || leaving || Math.abs(geo.baseline - groundY) <= 0.015) return;
    if (session.state === 'fronting') { remountT = setTimeout(remount, 300); return; }
    env.remount({ groundY: geo.baseline });
    groundY = geo.baseline;
  }

  /** Bands for the current realm and layout; the banks are laid out afresh only when these change. */
  function applyGeo(force) {
    const g = REALM_GEO[env.realmId] || REALM_GEO['moonmilk-cove'];
    geo.horizonY = geo.H * g.horizon;
    geo.water = g.water ? [geo.H * g.water[0], geo.H * g.water[1]] : null;
    rig.bodyRect(body);
    // the Mallow's rest height (not its current one, which a reaction can shrink for a moment):
    // the banks are only laid out afresh when the layout really changes
    const bb = rig.mallow.bodyBox, restTop = rig.BASE - (rig.soft ? rig.soft.H : bb[3] - bb[1]) * rig.S;
    const top = geo.skyTop, bottom = Math.max(top + 120, Math.min(geo.horizonY - 8, restTop - 20));
    const deckBottom = top + 0.5 * Math.max(120, geo.horizonY - top);
    const key = `${env.realmId}|${Math.round(geo.W)}|${Math.round(geo.H)}|${Math.round(top)}|${Math.round(bottom)}|${Math.round(geo.floorY)}`;
    if (!force && key === geoKey) return;
    geoKey = key;
    clouds.resize({ W: geo.W, H: geo.H, top, bottom });
    deck.resize({ W: geo.W, H: geo.H, top, bottom: deckBottom });
    rain.resize({ W: geo.W, H: geo.H, skyTop: top, horizonY: geo.horizonY, floorY: geo.floorY, deckY: (top + deckBottom) / 2 + 12, water: geo.water, body });
    deckY0 = rain.deckY;
  }

  // ---------------------------------------------------------------- loop --
  function kick() { if (!raf && !closed && !document.hidden && ready) { last = 0; raf = requestAnimationFrame(frame); } }

  function frame(now) {
    raf = 0;
    if (closed || document.hidden) return;
    raf = requestAnimationFrame(frame);   // first: one bad frame never stops the loop
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
    last = now;
    step(dt);
  }

  function step(dt) {
    simT += dt;
    pollQuality(dt);
    rig.bodyRect(body);
    // 1. the planner (inside the session), with progress read from the sims as they are now
    noticeWeather();   // a pick since the last frame: a weather with no presence starts fresh first
    live.clear = clouds.clear(); live.rainLevel = rain.level;
    raw = progressFor(session.weather, live);
    const st = session.update(dt, raw);
    if (st.swapNow) swap();
    if (st.resetNow) tools.reset(session.weather);
    noticeWeather();   // a queued pick that ran inside the update
    if (session.arrivedNow) reactor.event('arrive', { x: body.cx, y: body.top - 140 });
    if (session.resolvedNow) resolve();
    frontState(st);
    if (hintAt >= 0 && simT >= hintAt) { hintAt = -1; if (!session.resolved) showHint(session.weather); }
    if (leanT && simT >= leanT) { leanT = 0; env.setFocus(0, 0); }
    // 2. presence follows the planner, then the tools
    drive(clouds, planner.amount('storm'));
    drive(deck, planner.amount('rain'));
    drive(rain, Math.max(planner.amount('rain'), planner.amount('storm')));
    tools.step(dt);
    // 3. sims (sim time; nothing catches up after the page was hidden)
    clouds.step(dt, tools.storm.drift ? DRIFT.storm : 0);
    deck.step(dt, tools.rain.drift ? DRIFT.rain : 0);
    const aR = smoothstep(0.25, 0.9, deck.amount), aS = smoothstep(0.25, 0.9, clouds.amount) * 0.95;
    for (let c = 0; c < COLS; c++) cover[c] = Math.max(deck.columnCover[c] * aR, clouds.columnCover[c] * aS);
    rain.deckY = aS > aR ? tools.storm.y0 : deckY0;
    rain.step(dt, rainOpts);
    stepRings(rings, dt);
    // 4. the realm's mood and resolution follow progress (held still under a front's cover)
    if (st.phase !== 'cover' && st.phase !== 'swap' && !leaving) {
      moodOpts.gentle = gentle();
      moodFor(session.weather, session.progress, null, env.realmId, moodOpts, moodOut);
      env.setMood(moodOut);
      env.transform(transformFor(session.weather, session.progress, session.resolved));
    }
    // 5. the Mallow
    cond.gaze = tools.focus(gazePt) ? gazePt : null;
    cond.front = front.on ? frontPt : null;
    cond.lightOnBody = tools.storm.light;
    cond.raining = session.weather === 'rain' && rain.intensity > 0.25;
    reactor.weather(session.weather, session.progress);
    reactor.conditions(cond, dt);
    // 6. draw
    if (leaving) scene.fade = Math.max(0, scene.fade - dt / 0.45);
    fillScene(st, dt);
    layer.frame(dt, scene);
  }

  // A sim's presence is the planner's for its weather; enter / leave set the choreography's direction.
  function drive(sim, a) {
    if (a > sim.amount + 1e-4) { if (sim.amount <= 1e-4 && 'off' in sim) sim.off = 0; sim.enter(1); }
    else if (a < sim.amount - 1e-4) sim.leave(1);
    sim.amount = a;
  }

  function fillScene(st, dt) {
    scene.t = simT; scene.W = geo.W; scene.H = geo.H;
    let held = 0;
    for (let k = 0; k < rain.oState.length; k++) if (rain.oState[k]) held++;
    scene.held = held;
    const S = scene.storm;
    S.n = tools.storm.n; S.y0 = tools.storm.y0; S.shaft = clouds.amount;
    if (session.weather === 'storm') S.warm = smoothstep(0.1, 1, session.progress);
    // the idle affordance: once per weather, until it is first touched
    const w = session.weather;
    const want = (w === 'storm' || w === 'rain') && !touchedW.has(w) && planner.amount(w) >= 1 && !front.on && !leaving;
    if (want) affKind = w;
    affA += ((want ? 1 : 0) - affA) * Math.min(1, dt * 2);
    scene.affordance = affA > 0.01 ? affKind : null;
    scene.affordanceA = affA;
    if (front.on) {
      front.cover = st.cover; front.mode = st.mode; front.t = reduced ? 0 : simT;   // no edge drift or twinkle with reduced motion
      const k = front.swapped ? 1 - st.cover : st.cover;
      frontPt.x = front.dir > 0 ? k * geo.W : (1 - k) * geo.W; frontPt.y = geo.H * 0.35;
    }
  }

  // ---------------------------------------------------- weather changes --
  function noticeWeather() {
    if (session.weather === shownW) return;
    shownW = session.weather;
    lastWeather = shownW;
    if (planner.amount(shownW) < 0.01) tools.enter(shownW);   // arriving from nothing: a new bank, all its rain
    dial.set(shownW);
    reactor.weather(shownW, 0);
    saidLight = saidThin = saidShelter = false;
    updateActions();
    if (session.state === 'fronting') return;   // the front announces when it clears
    say(COPY.announce.at(WEATHERS[shownW].label, realmPhrase(REALMS[env.realmId].name), howTo(shownW)));
    showHint(shownW);
    hintAt = -1;
    setSubtitle();
    if (!reduced) { env.setFocus(planner.dir * 0.4, -0.12); leanT = simT + 2; }   // a subtle lean toward the incoming weather
  }

  function frontState(st) {
    const fronting = session.state === 'fronting';
    if (fronting && !front.on) {   // a front begins (cover)
      front.on = true; front.swapped = false; front.toRealm = null; front.dir = st.dir || 1;
      front.family = WEATHERS[session.weather].family;
      frontColour(REALMS[env.realmId].palette.sky, front.family, front.colA);
      frontColour(REALMS[env.realmId].palette.sky, front.family, front.colB);
      reactor.event('front', { x: front.dir > 0 ? 0 : geo.W, y: geo.H * 0.35 });
      hint.hide();
      updateActions();
    }
    if (!front.on) return;
    if (!front.swapped) {
      front.family = WEATHERS[session.weather].family;
      if (st.toRealm && st.toRealm !== front.toRealm) {
        front.toRealm = st.toRealm;
        frontColour(REALMS[st.toRealm].palette.sky, front.family, front.colB);
        say(COPY.announce.travel(realmPhrase(REALMS[st.toRealm].name)));
      }
    }
    if (!fronting && st.cover <= 0.001) {   // it has cleared (or the swap was cancelled)
      front.on = false; front.swapped = false; front.toRealm = null; front.cover = 0;
      say(COPY.announce.at(WEATHERS[session.weather].label, realmPhrase(REALMS[env.realmId].name), howTo(session.weather)));
      showHint(session.weather);
      setSubtitle();
      updateActions();
    }
  }

  // the swap, on exactly one step, under a full front: the new realm and everything sized to it
  function swap() {
    const realm = session.realm;
    env.mount(realm, { mood: moodFor(session.weather, 0, null, realm, { gentle: gentle() }), transform: 0, groundY: geo.baseline });
    groundY = geo.baseline;
    front.swapped = true;
    frontColour(REALMS[realm].palette.sky, front.family, front.colB);
    layer.setRealm(realm, REALMS[realm].palette, env.tone);
    rain.setLagoon(realm === 'raindrop-lagoon');
    applyGeo(true);
    setSubtitle();
    updateActions();   // the chips come back as the reveal begins
  }

  function resolve() {
    const w = session.weather, realm = env.realmId, cloudy = WEATHERS[w].family === 'cloud';
    reactor.weather(w, 1);
    reactor.event('resolved', { x: body.cx, y: body.mid });
    pulse('resolved', body.cx, cloudy ? body.mid : body.bottom, { weather: w });
    layer.addBloom(body.cx, body.mid, body.h * 1.25, REALMS[realm].palette.glow, 2);
    ctx.sound.motif(id, 'bright');
    const cap = captionFor(w, realm);
    hint.caption(cap, lineFor(id, w), name, 4000);
    hintAt = -1;
    say(cap);
    if (w === 'storm') tools.storm.drift = true;   // the remaining clouds drift leeward
    if (w === 'rain') tools.rain.drift = true;     // the deck drifts off
    updateActions();
  }

  function pick(w, viaKey = false) {
    if (!ready || leaving) return 'none';
    const r = session.choose(w, { viaKey });
    dial.set(r === 'none' ? session.weather : w);
    if (r === 'again') afterAgain();
    return r;
  }

  function again() {
    if (!ready || leaving) return 'none';
    const r = session.again();
    if (r === 'again') afterAgain();
    return r;
  }

  function afterAgain() {
    actions.endHolds();
    wRelease();
    tools.altEnd();
    saidLight = saidThin = saidShelter = false;
    showHint(session.weather);
    hintAt = -1;
    say(COPY.announce.again(WEATHERS[session.weather].label));
    updateActions();
  }

  function updateActions() {
    const w = session.weather, list = [];
    if (session.resolved) list.push({ id: 'again', label: COPY.again, click: () => again() });
    else if (tools.has(w)) list.push({ id: 'lead', label: WEATHERS[w].alt.label, hold: true, start: () => tools.altStart(session.weather), end: () => tools.altEnd() });
    actions.set(list, { disabled: covered() || leaving });
  }

  /** Under a front's cover (before the reveal begins) the chips and W wait. */
  function covered() { return session.state === 'fronting' && !front.swapped && planner.phase !== 'reveal'; }

  function setSubtitle() {
    if (subtitleEl && env.realmId) subtitleEl.textContent = COPY.subtitle(WEATHERS[session.weather].label, realmShort(REALMS[env.realmId].name));
  }

  // ---------------------------------------------------- weather events --
  const evRing = Array.from({ length: 64 }, () => ({ t: 0, type: '', x: 0, y: 0, k: 0 }));
  let evN = 0;
  const gate = (key, ms) => { const t = performance.now(); if (t - (gates.get(key) ?? -1e9) < ms) return false; gates.set(key, t); return true; };
  const hap = (kind) => { if (ctx.prefs.get('haptics') && gate('h:' + kind, HAPTIC_GAP[kind] || 300)) haptic(kind); };

  function pulse(event, x, y, o = {}) {
    const kind = pulseFor(event, env.realmId, { reduced, gentle: gentle(), n: o.n ?? 0, weather: o.weather ?? null });
    return kind ? env.pulse(kind, { nx: x / geo.W, ny: y / geo.H }) : false;
  }

  function onWeather(type, x, y, k) {
    const e = evRing[evN++ % 64];
    e.t = +simT.toFixed(2); e.type = type; e.x = Math.round(x); e.y = Math.round(y); e.k = +(+k || 0).toFixed(2);
    if (leaving || closed) return;
    switch (type) {
      case 'touch': pulse('touch', x, y); reactor.event('glance', { x, y }); break;
      case 'gap':
        pulse('gap', x, y);
        reactor.event('gap', { x, y });
        hap('soft');
        say(COPY.announce.cloudsOpen);
        if (!firstGap) { firstGap = true; ctx.sound.chime(id, 2, 0.35); ctx.sound.chime(id, 4, 0.3); }   // the first light: a warm pair
        break;
      case 'light-through':
        reactor.event('light-through', { x, y });
        if (!saidLight) { saidLight = true; say(COPY.announce.lightOn(name)); }
        break;
      case 'strike': pulse('strike', x, y); reactor.event('strike', { x, y }); break;
      case 'glow': reactor.event('glance', { x, y }); break;
      case 'bead-up':
        pulse('bead-up', x, y);
        layer.addBloom(x, y, 34 + 4 * Math.sqrt(k), REALMS[env.realmId].palette.glow, 1.6);
        if (!saidThin && rain.level < 0.6) { saidThin = true; say(COPY.announce.rainThin); }
        break;
      case 'merge':
        if (gate('chime', CHIME_GAP)) ctx.sound.chime(id, Math.floor(k / 2) % 10, 0.3);   // plinks up the Mallow's scale
        hap('light');
        break;
      case 'hit-body': reactor.event('hit-body', { x, y, k }); break;
      case 'splash-body': reactor.event('hit-body', { x, y, k: 1 }); break;
      case 'orb-up': if (deck.amount > 0.5) deck.flash(x); break;   // light inside the cloud above
      case 'splash-water': pulse('splash-water', x, y, { n: k }); addRing(rings, x, y); break;
      case 'splash-ground': pulse('splash-ground', x, y); addRing(rings, x, y); break;
      case 'sheltered':
        reactor.event('sheltered', { x, y });
        if (!saidShelter) { saidShelter = true; say(COPY.announce.sheltered(name)); }
        break;
      default: break;   // swish, thunder, bead, land-*: their sounds arrive with WeatherSound
    }
  }

  // ---------------------------------------------------------------- keys --
  // through stage-screen's keys hook: 1–8 choose, arrows shape, W holds the lead chip, R is Again
  function keys(e, k, phase) {
    if (!ready) return false;
    if (leaving) return k !== 'escape';
    const ae = document.activeElement;
    const onStage = !ae || ae === document.body || ae === s.stage;
    const typing = !!ae?.closest?.('input, textarea, select');
    const m = /^(?:Digit|Numpad)([1-9])$/.exec(e.code || '');
    if (m) {
      if (!onStage || e.altKey || e.ctrlKey || e.metaKey || +m[1] > DIAL_ORDER.length) return false;
      if (phase === 'down' && !e.repeat) pick(DIAL_ORDER[+m[1] - 1], true);
      return true;
    }
    if (k.startsWith('arrow')) {
      if (!onStage) return false;
      if (phase === 'down') {
        e.preventDefault();
        tools.nudge(session.weather, k === 'arrowleft' ? -1 : k === 'arrowright' ? 1 : 0, k === 'arrowup' ? -1 : k === 'arrowdown' ? 1 : 0);
      }
      return true;
    }
    if (k === 'w' && !typing && !e.ctrlKey && !e.metaKey) {
      if (phase === 'down') { if (!e.repeat && !wHeld && !covered() && tools.altStart(session.weather)) { wHeld = true; leadChip()?.classList.add('active'); } }
      else if (wHeld) { wRelease(); tools.altEnd(); }
      return true;
    }
    if (k === 'r' && !typing && !e.ctrlKey && !e.metaKey) {
      if (phase === 'down' && !e.repeat) again();
      return true;
    }
    return false;
  }
  const leadChip = () => actions.el.querySelector('[data-action="lead"]');
  function wRelease() { if (!wHeld) return; wHeld = false; leadChip()?.classList.remove('active'); }

  // --------------------------------------------------------------- misc --
  function pollQuality(dt) {
    qAcc += dt;
    if (qAcc < 1) return;
    qAcc = 0;
    const q = ctx.quality;
    if (q === tier) return;
    tier = q;
    env.setQuality(q);
    layer.setQuality(q);
    for (const sim of [clouds, deck, rain]) sim.setTier(q);
    planner.setTier(q);
  }

  // Close or Escape: everything fades over 450 ms, the Mallow nods, the rest motif, then home
  function leave() {
    if (leaving || closed) return;
    leaving = true;
    session.leave();
    actions.endHolds();
    wRelease();
    tools.altEnd();
    router.cancelAll();
    updateActions();
    hint.hide();
    s.screen.inert = true;
    s.screen.classList.add('leaving');
    rig.react('nod');
    ctx.sound.motif(id, 'rest');
    leaveT = setTimeout(() => { leaveT = 0; if (!closed) ctx.navigate('/'); }, 460);
  }

  function metrics() {
    return {
      coverage: +clouds.coverage().toFixed(3), clear: +clouds.clear().toFixed(3), rainLevel: +rain.level.toFixed(3), wet: +rain.wet.toFixed(3),
      energy: 0, calm: 0, fogClear: 0, painted: 0, height: 0, onBody: false, dwell: 0, constellations: 0, heat: 0, waveEnergy: 0,
      held: rain.orbs(), light: +tools.storm.light.toFixed(3), intensity: +rain.intensity.toFixed(3),
    };
  }

  // test / debugging handle (development lab only)
  const handle = {
    get state() { return session.state; },
    get weather() { return session.weather; },
    get realmId() { return env.realmId; },
    get progress() { return session.progress; },
    get resolved() { return session.resolved; },
    get front() { return front.on ? { ...planner.snapshot(), swapped: front.swapped } : null; },
    /** Same path as a dial pick; instant: the planner finishes as fast as it can (a few frames). */
    setWeather(w, { instant = false } = {}) { const r = pick(w, false); if (instant) planner.finish(); return r; },
    /** Exactly what the chips do: name 'lead' | 'again'; phase 'start' | 'end' | 'tap'. */
    act(nameA, phase = 'tap') {
      if (nameA === 'again') return again();
      if (nameA !== 'lead') return false;
      if (phase === 'start') return tools.altStart(session.weather);
      if (phase === 'end') { tools.altEnd(); return true; }
      clearTimeout(actT);
      const ok = tools.altStart(session.weather);
      actT = setTimeout(() => { actT = 0; tools.altEnd(); }, 400);
      return ok;
    },
    sims: { clouds, deck, rain, strikes, mist: null, wind: null, ribbons: null, waves: null, puddles: null, sun: null, moon: null, embers: null, stars: null },
    metrics, env, layer, reactor, tools, session,
    get sound() { return { alive: false, levels: {} }; },
    get events() { const n = Math.min(64, evN), out = []; for (let i = evN - n; i < evN; i++) out.push({ ...evRing[i % 64] }); return out; },
    get pulses() { return env.log; },
    geo() {
      const g = REALM_GEO[env.realmId] || {};
      return { W: geo.W, H: geo.H, skyTop: geo.skyTop, horizonY: geo.horizonY, water: geo.water, floorY: geo.floorY, body: { ...body },
        sun: g.sun ? [g.sun[0] * geo.W, g.sun[1] * geo.H] : null, moon: g.moon ? [g.moon[0] * geo.W, g.moon[1] * geo.H] : null };
    },
    /** Fast-forward for tests: the realm eases to its target at once, and the planner finishes. */
    settle() { env.realm?.debug?.settle(); planner.finish(); },
    debug() { return { state: session.state, weather: session.weather, realmId: env.realmId, progress: +session.progress.toFixed(3), resolved: session.resolved, metrics: metrics() }; },
  };
  if (globalThis.__lab) globalThis.__lab.weather = handle;
  s.stage.focus({ preventScroll: true });   // keyboard gestures and keys work straight away

  return {
    unmount() {
      if (closed) return;
      closed = true;
      cancelAnimationFrame(raf); raf = 0;
      cancelAnimationFrame(enterRaf); enterRaf = 0;
      router.dispose();
      actions.endHolds();
      tools.altEnd();
      offPrefs(); offDna();
      document.removeEventListener('visibilitychange', onVis);
      clearTimeout(leaveT); clearTimeout(remountT); clearTimeout(actT);
      hint.destroy();
      sr.destroy();
      reactor.destroy();
      layer.destroy();
      clearGlowSprites();
      env.destroy();
      s.unmount();
      if (globalThis.__lab?.weather === handle) globalThis.__lab.weather = null;
    },
  };
}
