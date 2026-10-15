// FEATURE — Hushfold Weather Weaver (#weather): touch and reshape the weather.
//
// The Mallow sits in a Hushfold world and the sky above it is something you can
// touch: clouds part under a finger, rain gathers into a glass bead, silk
// currents follow a drag, sunlight and moonlight go where you take them, stars
// come to your fingertip, mist wipes away, embers kindle, water swells. The
// realm's own painted weather follows over a few seconds (two speeds: the lab
// layer answers within a frame, the realm eases its mood). Eight weathers live
// on a dial; each happens in a realm that can paint its sky, so a pick either
// turns the weather in place (the old weather leaves while the new one arrives,
// with a few authored morphs) or sends a weather front across while the world
// changes behind it. Reshaping a weather raises its progress, which drives the
// realm's mood and authored resolution; at 1 the resolve beat plays (reaction,
// bloom, motif, caption and the Mallow's line) and the lead chip becomes Again.
// No storage beyond this session's last weather, kept in module memory.
//
// Built on the shared engine: stage-screen (backdrop null, then s.env), the
// pointer router, the weather sims (core/weather/*), the WeatherLayer canvases,
// the WeatherReactor with a FaceMixer, WeatherSound (an AmbientBed plus
// one-shots on the Sound Engine), and the lab-ui announcer.
//
// One loop: progress and the planner → presence → tools → sims → mood and transform → reactor → sound → layer.
//
// Photosafety (SHARED C6): realm pulses pass the Environment's gate (≤ 2 bright
// a second); the lab's own cloud glows pass labGlowGate (≤ 1 a second across
// both banks), so the screen stays within 3 bright events a second. Every lab
// brightening rises over ≥ 300 ms; storm strikes are ≥ 8 s apart and become soft
// glows with the gentle style or reduced motion.

import { announcer, h } from '../lab-ui.js';
import { stageScreen } from './stage-screen.js';
import { homeRealm, REALM_GEO } from '../core/environment.js';
import { routePointers } from '../core/pointer-router.js';
import { FaceMixer } from '../core/expression-engine.js';
import { clearGlowSprites } from '../core/effects.js';
import { clamp, smoothstep, rng } from '../core/math.js';
import {
  COPY, WEATHERS, DIAL_ORDER, DRY_REALMS, WeatherSession, moodFor, transformFor, pulseFor, progressFor, captionFor, lineFor, realmShort, realmPhrase,
  landFit,
} from '../core/weather.js';
import { CloudBank, MistField, StrikeClock, COLS } from '../core/weather/clouds.js';
import { RainField } from '../core/weather/rain.js';
import { WindField, Ribbons, Fluffs } from '../core/weather/wind.js';
import { WaveField, Puddles } from '../core/weather/water.js';
import { LightPool, EmberField } from '../core/weather/light.js';
import { StarSwarm } from '../core/weather/stars.js';
import { WeatherReactor } from '../core/weather-mallow.js';
import { WeatherLayer, labGlowGate } from '../core/weather-layer.js';
import { WeatherSound, bedLevels } from '../core/weather-sound.js';
import { createRings, addRing, stepRings, frontColour } from '../core/weather-draw.js';
import { createTools } from './weather/tools.js';
import { weatherDial, actionRow, hintLine } from './weather/ui.js';
import { REALMS } from '../../src/world/realm.js';
import { MALLOWS } from '../../src/mallows/registry.js';
import { haptic } from '../../src/engine/haptics.js';

export const meta = { id: 'weather', title: COPY.title };

let lastWeather = null;   // this session's last weather (module memory only; never stored)

const DRIFT = { storm: 1600, rain: 500 };       // px/s leeward carry once resolved (× each bank's wind factor)
const HAPTIC_GAP = { light: 250, soft: 600, pop: 800 };   // ms (light ≤ 4 a second)
const SOUND_MS = 100;                           // the bed follows the sims at most 10 times a second
const IDLE = [12, 20];                          // s without a weather touch before the Mallow looks at the weather
const KINDLE_PULSE = 300;                       // ms: a kindle's realm tap at most this often
const HEARTH_PULSE = 2;                         // s between the hearth's realm pulses at the Mallow's feet
const MOON_STAR_GAP = 6000;                     // ms between falling stars from a resting moon
const DEW_S = 3;                                // s of dew glints after the fog lifts
const WATER_HINT_WAIT = 4;                      // s after a weather change before the one-time water hint may show
const INK = [0.35, 0.5];                        // top-band darkness that turns the title's ink light (off, on) over a bright realm
const CAP_JUMP = [0.35, 1.5];                   // s (landscape): a resolve jump starts within the first, the caption shows by the second

export function mount(root, ctx) {
  const id = ctx.mallowId, mallow = MALLOWS[id], name = mallow.name;
  const home = homeRealm(ctx.dna, id);
  let tuning = ctx.dna.tuning(), reduced = ctx.prefs.reducedMotion(), tier = ctx.quality;
  const gentle = () => tuning.style === 'gentle';
  const session = new WeatherSession({ home, weather: lastWeather, reduced, tier, speed: tuning.speed });
  const planner = session.planner;

  let ready = false, closed = false, leaving = false;
  let raf = 0, enterRaf = 0, last = 0, simT = 0, qAcc = 0, raw = 0;
  let leaveT = 0, remountT = 0, actT = 0, groundY = 0, leanT = 0, hintAt = -1, waterHintAt = -1, waterHinted = false;
  let shownW = null, geoKey = '', deckY0 = 0, affA = 0, affKind = null, wHeld = false, lastPickT = 0, inkLight = false, cursor = '';
  let firstGap = false, saidLight = false, saidThin = false, saidShelter = false, saidMoon = false, saidStars = false, saidMist = false, saidWind = false, saidEmbers = false, saidHearth = false;
  let hearthT = 0, hearthK = 0, heatStep = 0, dewT = -1, haloA = 0, haloKind = 'sun', morphSun = false;
  let sndT = -Infinity, bolt = 1, idleT = 0;
  let land = null, lastL = null;   // land: landFit's answer while the stage is short and wide (styles/weather.css), else null
  let capWait = null;               // landscape: the resolve caption waiting for the Mallow's jump to land
  const idleRnd = rng(7 + id.length);
  let idleAt = IDLE[0] + (IDLE[1] - IDLE[0]) * idleRnd();
  const touchedW = new Set();
  const gates = new Map();
  const geo = { W: 390, H: 844, skyTop: 64, horizonY: 480, floorY: 700, water: null, shore: null, baseline: 0.83, topBottom: 56, bottomTop: 718, body: null,
    waterBottom: (x) => waterBottom(x) };

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
  const sun = new LightPool({ kind: 'sun', tier });
  const moon = new LightPool({ kind: 'moon', tier });
  const stars = new StarSwarm({ tier, seed: 13, mallowId: id });
  const wind = new WindField({ tier });
  const ribbons = new Ribbons({ tier, seed: 21 });
  const fluffs = new Fluffs({ tier, seed: 22 });
  const mist = new MistField({ tier });
  const embers = new EmberField({ tier, seed: 31 });
  const waves = new WaveField({ tier });
  const puddles = new Puddles();
  // every presence comes from the planner (drive()): the sims' own enter / leave easing is off
  const PRESENCE = [clouds, deck, rain, sun, moon, stars, ribbons, fluffs, mist, embers, waves];
  for (const sim of PRESENCE) { sim.enterDur = sim.leaveDur = Infinity; sim.setReduced(reduced); sim.setSpeed(tuning.speed); }
  const TIERED = [clouds, deck, rain, stars, ribbons, fluffs, embers, waves];
  wind.speed = tuning.speed;
  waves.motion = tuning.motion;
  const cover = new Float32Array(COLS);
  const rainOpts = { cover, coverK: 1, wind: 0, body, reduced };
  const rings = createRings();
  const windMid = { vx: 0, vy: 0 }, windBody = { vx: 0, vy: 0 };
  const morphBuf = new Float32Array(64), sunGap = [0, 0];
  const live = { clear: 0, rainLevel: 1, painted: 0, bask: 0, calm: 0, fogClear: 0, dwell: 0, constellations: 0, heat: 0 };
  const moodLive = { energy: 0, turb: 0, calm: 0, height: 0.5, painted: 0, hearth: 0 };
  const moodOut = { agitation: 0, heaviness: 0, clarity: 0, warmth: 0 }, moodOpts = { gentle: false };

  // ---------------------------------------------------------- the Mallow --
  const mixer = new FaceMixer(rig);
  const reactor = new WeatherReactor(companion, { mallowId: id, sound: ctx.sound, mixer, style: tuning.style, reduced, motion: tuning.motion });
  const cond = { gaze: null, touch: null, pool: null, cluster: null, front: null, windAt: null, energy: 0, lightOnBody: 0, moonlit: false, bask: false, hearth: false,
    raining: false, heat: 0, clusterN: 0, touched: false, t: 0, dt: 0 };
  const gazePt = { x: 0, y: 0 }, frontPt = { x: 0, y: 0 }, poolPt = { x: 0, y: 0 }, clusterPt = { x: 0, y: 0 }, idlePt = { x: 0, y: 0 }, windPt = { x: 0, y: 0 };

  // ------------------------------------------------------------ layers --
  const layer = new WeatherLayer({ wrap: s.wrap, screen: s.screen, quality: tier, reducedMotion: reduced, palette: ctx.dna.palette() });
  const glows = labGlowGate();   // the lab's cloud glows (≤ 1 a second) and bead blooms

  // ------------------------------------------------------------- sound --
  const wsound = new WeatherSound(ctx.sound, id, { tier });
  const bedIn = { amount: (w) => planner.amount(w), weather: session.weather, progress: 0, warmth: 0.5, rain: 0, storm: 0, wind: 0, water: 0, waves: 0, mist: 0, fade: 1 };
  const bedOut = {};
  const pan = (x) => clamp((x / Math.max(1, geo.W)) * 2 - 1, -1, 1) * 0.6;
  const front = { on: false, cover: 0, dir: 1, swapped: false, mode: 'sweep', family: 'cloud', colA: [0, 0, 0], colB: [0, 0, 0], t: 0, toRealm: null };
  const scene = {
    t: 0, W: geo.W, H: geo.H, geo, fade: 1, held: 0, rainAlpha: 1, rings, front,
    sims: { clouds, deck, rain, sun, moon, stars, wind, ribbons, fluffs, mist, embers, waves, puddles },
    storm: { gaps: null, n: 0, y0: 0, shaft: 0, warm: 0 },
    affordance: null, affordanceA: 0,
    sunAt: [0, 0], moonAt: [0, 0], halo: { a: 0, kind: 'sun' }, lantern: 0, mistTop: -1e9, mistK: 0.82, dew: -1,
    water: null, trail: null, puddleRip: null, kindleT: -1,
  };

  // ------------------------------------------------------------- tools --
  const hitB = {};
  const waterOn = () => !!geo.water && session.weather !== 'fog';
  const onMallow = (x, y) => {
    if (rig.soft) return rig.hitTest(x, y);
    rig.bodyRect(hitB);   // before the soft body loads: its ellipse
    const dx = (x - hitB.cx) / (hitB.w * 0.5), dy = (y - hitB.mid) / (hitB.h * 0.5);
    return dx * dx + dy * dy < 1;
  };
  const tools = createTools({
    sims: { clouds, deck, rain, strikes, sun, moon, stars, wind, mist, embers, waves, puddles }, geo,
    weather: () => session.weather,
    amount: (w) => planner.amount(w),
    fronting: () => fronting(),
    frontDrag: (v) => planner.drag(v),
    locked: () => !ready || leaving || session.state === 'paused',
    onMallow,
    waterOn,
    emit: (type, x, y, k, vx, vy) => onWeather(type, x, y, k, vx, vy),
    reduced: () => reduced, gentle,
    ring: (x, y) => addRing(rings, x, y),
    touched: (w) => { touchedW.add(w); idleT = 0; },
    flash: (bank, x) => (glows.allow('glow') ? bank.flash(x) : -1),
  });
  scene.storm.gaps = tools.storm.gaps;
  scene.trail = tools.trail;
  scene.puddleRip = tools.puddleRip;
  rain.emit = (type, x, y, k) => onWeather(type, x, y, k);
  sun.emit = (type, x, y, k) => onWeather(type === 'rest' ? 'sun-rest' : type === 'body-in' ? 'sun-in' : 'sun-out', x, y, k);
  moon.emit = (type, x, y, k) => onWeather(type === 'rest' ? 'moon-rest' : type === 'body-in' ? 'moon-in' : 'moon-out', x, y, k);
  stars.emit = (type, x, y, k) => onWeather(type, x, y, k);
  wind.emit = (type, x, y, k) => onWeather(type, x, y, k);
  embers.emit = (type, x, y, k) => onWeather(type, x, y, k);
  waves.emit = (type, x, y, k) => onWeather(type === 'arrive' ? 'wave-arrive' : type, x, y, k);
  // a press in the world (not on the controls) takes keyboard focus back from a clicked radio or chip, so the
  // digits, arrows and Enter act on the stage again (registered before the router, which stops claimed presses);
  // it also quiets the stage's focus ring again until the next key (the pointer is in use: no frame round the scene)
  const topbar = s.screen.querySelector('.topbar');
  const onPress = (e) => {
    if (s.bottom.contains(e.target) || topbar?.contains(e.target)) return;
    s.screen.classList.add('wx-quiet-focus');
    const ae = document.activeElement;
    if (!ae || ae === s.stage || !s.bottom.contains(ae)) return;
    s.stage.focus({ preventScroll: true });
  };
  s.screen.addEventListener('pointerdown', onPress, true);
  const router = routePointers(s.screen, { stage: s.stage, claim: tools.claim });
  // a mouse over touchable weather: a grab cursor (grabbing while a weather pointer is held)
  const setCursor = (c) => {
    if (c === cursor) return;
    cursor = c;
    s.stage.classList.toggle('grab', c === 'grab');
    s.stage.classList.toggle('grabbing', c === 'grabbing');
  };
  const onHover = (e) => {
    if (e.pointerType !== 'mouse') return;
    if (router.active > 0) { setCursor('grabbing'); return; }
    if (!ready || leaving || covered() || e.buttons || topbar?.contains(e.target) || s.bottom.contains(e.target) || e.target.closest?.('.sheet')) { setCursor(''); return; }
    const r = s.stage.getBoundingClientRect();
    setCursor(onMallow(e.clientX - r.left, e.clientY - r.top) ? '' : 'grab');
  };
  const offHover = () => setCursor('');
  for (const ev of ['pointermove', 'pointerdown', 'pointerup']) s.screen.addEventListener(ev, onHover, true);
  s.screen.addEventListener('pointerleave', offHover);

  // ---------------------------------------------------------------- ui --
  const hint = hintLine(s.screen);
  const sr = announcer(s.screen, { gapMs: 3000 });
  const actions = actionRow();
  const dial = weatherDial(DIAL_ORDER, session.weather, (w, viaKey) => pick(w, viaKey));
  s.bottom.append(actions.el, dial.el);
  const subtitleEl = s.screen.querySelector('.topbar .title small');
  const say = (text) => sr.say(text);
  const howTo = (w) => (tools.has(w) ? WEATHERS[w].say : '');
  const showHint = (w) => { if (tools.has(w)) hint.show(WEATHERS[w].hint, 3000); else hint.hide(); };

  // ------------------------------------------------------- live settings --
  const offPrefs = ctx.prefs.onChange((k) => {
    if (k !== 'motion' && k !== '*') return;
    reduced = ctx.prefs.reducedMotion();
    rainOpts.reduced = reduced;
    layer.setReducedMotion(reduced);
    for (const sim of PRESENCE) sim.setReduced(reduced);
    planner.setReduced(reduced);
    reactor.setReduced(reduced);
    if (reduced) { env.setFocus(0, 0); leanT = 0; }
  });
  const offDna = ctx.dna.onChange(() => {
    tuning = ctx.dna.tuning();
    reactor.setStyle(tuning.style);
    reactor.setMotion(tuning.motion);
    for (const sim of PRESENCE) sim.setSpeed(tuning.speed);
    wind.speed = tuning.speed;
    waves.motion = tuning.motion;
    planner.setSpeed(tuning.speed);
    layer.setPalette(ctx.dna.palette());
  });
  const onVis = () => {
    if (closed) return;
    if (document.hidden) { session.pause(); actions.endHolds(); wRelease(); tools.altEnd(); wsound.wipe(false); }   // the engine stops the bed; it rebuilds on return
    else { session.resume(); last = 0; kick(); }
  };
  document.addEventListener('visibilitychange', onVis);
  // the window loses focus (another window, a dialog): a held W never sees its keyup, so let it go now
  const onBlur = () => { if (wHeld) { wRelease(); tools.altEnd(); } };
  addEventListener('blur', onBlur);

  // --------------------------------------------------------------- start --
  function onLayout(L) {
    geo.W = L.W; geo.H = L.H; geo.floorY = L.floor; geo.baseline = L.baseline;
    geo.topBottom = L.topBottom; geo.bottomTop = L.bottomTop; geo.skyTop = L.topBottom + 8;
    if (closed) return;
    fitSubtitle();
    lastL = L;
    frameLand(L);
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
    lastPickT = simT;
    tools.enter(shownW);
    if (shownW === 'warm') scene.kindleT = 0;
    reactor.weather(shownW, 0);
    setSubtitle();
    updateActions();
    dial.reveal();
    hintAt = 0.8;
    say(COPY.announce.at(WEATHERS[shownW].label, realmPhrase(REALMS[realm].name), howTo(shownW)));
    kick();
  }

  // A short, wide stage (styles/weather.css sets --wx-land and puts the controls in the lower corners): the Mallow
  // grows to landFit's size between them, its head clear of the hint spot; the swells' row keeps above the corner
  // clusters. stage-screen sets its own fit on every reframe just before this, so portrait keeps exactly that one.
  function frameLand(L) {
    land = getComputedStyle(s.screen).getPropertyValue('--wx-land').trim() === '1' ? land || {} : null;
    if (!land) return;
    const st = s.stage.getBoundingClientRect(), ar = actions.el.getBoundingClientRect(), dr = dial.el.getBoundingClientRect();
    const [bx0, by0, bx1, by1] = rig.mallow.bodyBox, soft = rig.soft;
    const r = landFit({ W: L.W, H: L.H, floor: L.floor, hintTop: hint.el.getBoundingClientRect().top - st.top,
      left: ar.right - st.left, right: dr.left - st.left, hU: soft ? soft.H : by1 - by0, wU: soft ? soft.W : bx1 - bx0,
      ref: Math.sqrt((bx1 - bx0) * (by1 - by0)) });
    Object.assign(land, r);
    if (Math.abs(r.fit - rig.opts.fit) > 1e-4) companion.setLayout({ fit: r.fit });
    geo.bottomTop = Math.min(L.bottomTop, ar.top - st.top, dr.top - st.top);
  }
  // the soft body replaces the drawn one's box with its own: frame it again by its real size
  rig.softReady?.then(() => { if (!closed && lastL && land) { frameLand(lastL); if (ready) applyGeo(false); } });

  function remount() {
    remountT = 0;
    if (closed || leaving || Math.abs(geo.baseline - groundY) <= 0.015) return;
    if (session.state === 'fronting') { remountT = setTimeout(remount, 300); return; }
    env.remount({ groundY: geo.baseline });
    groundY = geo.baseline;
  }

  /** The water's lower edge at x: the Moonmilk shoreline curves (H·(0.785 − 0.05u²)); elsewhere the band's bottom. */
  function waterBottom(x) {
    if (!geo.water) return -1;
    if (!geo.shore) return geo.water[1];
    const u = clamp((x - geo.W / 2) / (geo.W / 2), -1.25, 1.25);
    return geo.H * (geo.shore[0] - geo.shore[1] * u * u);
  }

  /** Bands for the current realm and layout; every sim is laid out afresh only when these change. */
  function applyGeo(force) {
    const g = REALM_GEO[env.realmId] || REALM_GEO['moonmilk-cove'];
    geo.horizonY = geo.H * g.horizon;
    geo.water = g.water ? [geo.H * g.water[0], geo.H * g.water[1]] : null;
    geo.shore = g.shore || null;
    rig.bodyRect(body);
    // the Mallow's rest height (not its current one, which a reaction can shrink for a moment):
    // the sims are only laid out afresh when the layout really changes
    const bb = rig.mallow.bodyBox, restTop = rig.BASE - (rig.soft ? rig.soft.H : bb[3] - bb[1]) * rig.S;
    // the thunderheads' band: down to the horizon or just above the Mallow; on a wide sky no deeper than a third of the screen
    const W = geo.W, H = geo.H, top = geo.skyTop;
    let bottom = Math.max(top + 120, Math.min(geo.horizonY - 8, restTop - 20));
    if (W > 700) bottom = Math.max(top + 120, Math.min(bottom, top + 0.32 * H));
    const deckBottom = top + 0.5 * Math.max(120, geo.horizonY - top);
    const key = `${env.realmId}|${Math.round(W)}|${Math.round(H)}|${Math.round(top)}|${Math.round(bottom)}|${Math.round(geo.floorY)}`;
    if (!force && key === geoKey) return;
    geoKey = key;
    clouds.resize({ W, H, top, bottom });
    deck.resize({ W, H, top, bottom: deckBottom });
    rain.resize({ W, H, skyTop: top, horizonY: geo.horizonY, floorY: geo.floorY, deckY: (top + deckBottom) / 2 + 12, water: geo.water, body });
    deckY0 = rain.deckY;
    // the light pools hang from the realm's own sun or moon (a night realm with no moon: its feature, or high in the sky)
    const sa = g.sun || [0.72, Math.max(0.12, (top + 40) / H)], ma = g.moon || g.feature || [0.7, Math.max(0.14, (top + 50) / H)];
    scene.sunAt[0] = sa[0] * W; scene.sunAt[1] = sa[1] * H;
    scene.moonAt[0] = ma[0] * W; scene.moonAt[1] = ma[1] * H;
    sun.resize({ W, H, anchor: scene.sunAt, skyTop: top, horizonY: geo.horizonY, water: geo.water, floorY: geo.floorY });
    moon.resize({ W, H, anchor: scene.moonAt, skyTop: top, horizonY: geo.horizonY, water: geo.water, floorY: geo.floorY });
    stars.resize({ rect: { x0: 16, y0: top + 10, x1: W - 16, y1: Math.max(top + 90, geo.horizonY - 12) }, avoid: [], body, W });
    // embers wait over the ground and the sky (on water realms, above the water: the water is for swells)
    embers.resize({ rect: { x0: 20, y0: top + 36, x1: W - 20, y1: geo.water ? Math.max(top + 140, geo.water[0] - 8) : geo.floorY - 8 }, avoid: [], body });
    wind.resize({ W, H });
    ribbons.resize({ W, H, skyTop: top, horizonY: geo.horizonY });
    fluffs.resize({ W, H, skyTop: top, floorY: geo.floorY });
    mist.resize({ W, H, top, floor: geo.floorY });
    waves.resize({ W, band: geo.water || [geo.floorY, H], bodyX: body.cx });
    puddles.resize({ floorY: geo.floorY, body, W });
    if (!DRY_REALMS.includes(env.realmId)) puddles.wet = 0;   // no puddles where there is real water
    scene.water = geo.water;
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

  function readProgress() {
    live.clear = clouds.clear(); live.rainLevel = rain.level;
    live.painted = sun.painted; live.bask = sun.bask; live.calm = wind.calm; live.dwell = moon.dwell;
    live.fogClear = session.weather === 'fog' ? mist.fogClear() : 0;
    live.constellations = stars.constellations; live.heat = embers.heat;
    return progressFor(session.weather, live);
  }

  function step(dt) {
    simT += dt;
    pollQuality(dt);
    rig.bodyRect(body);
    // 1. the planner (inside the session), with progress read from the sims as they are now
    noticeWeather();   // a pick since the last frame: a weather with no presence starts fresh first
    raw = readProgress();
    const st = session.update(dt, raw);
    if (st.swapNow) swap();
    if (st.resetNow) { tools.reset(session.weather); afterReset(); }
    noticeWeather();   // a queued pick that ran inside the update
    if (session.arrivedNow) reactor.event('arrive', { x: body.cx, y: body.top - 140 });
    if (session.resolvedNow) resolve();
    if (capWait) waitCaption();
    frontState(st);
    if (hintAt >= 0 && simT >= hintAt) { hintAt = -1; if (!session.resolved) showHint(session.weather); }
    if (waterHintAt >= 0 && simT >= waterHintAt) {   // the one-time water hint never cuts a hint or caption short: it waits its turn
      if (hint.busy || hint.captioning || capWait || front.on || simT - lastPickT < WATER_HINT_WAIT) waterHintAt = simT + 1;
      else { waterHintAt = -1; if (waterOn()) hint.show(COPY.water.hint, 3000); }
    }
    if (leanT && simT >= leanT) { leanT = 0; env.setFocus(0, 0); }
    const w = session.weather;
    // 2. presence follows the planner, then the tools
    drive(clouds, planner.amount('storm'));
    drive(deck, planner.amount('rain'));
    drive(rain, Math.max(planner.amount('rain'), planner.amount('storm')));
    drive(sun, planner.amount('sunshine'));
    drive(moon, planner.amount('moonlight'));
    drive(stars, planner.amount('starlight'));
    const aw = planner.amount('wind');
    drive(ribbons, aw); drive(fluffs, aw);
    wind.ambient = w === 'wind' && session.resolved ? 0 : aw;   // the Wind arrives gusty; once calm, just a breeze
    drive(mist, planner.amount('fog'));
    drive(embers, planner.amount('warm'));
    drive(waves, geo.water ? 1 - planner.amount('fog') : 0);
    tools.step(dt);
    // 3. sims (sim time; nothing catches up after the page was hidden)
    wind.step(dt);
    wind.sample(geo.W / 2, (geo.skyTop + geo.horizonY) / 2, windMid);
    clouds.step(dt, (tools.storm.drift ? DRIFT.storm : 0) + windMid.vx);
    deck.step(dt, (tools.rain.drift ? DRIFT.rain : 0) + windMid.vx);
    const aR = smoothstep(0.25, 0.9, deck.amount), aS = smoothstep(0.25, 0.9, clouds.amount) * 0.95;
    for (let c = 0; c < COLS; c++) cover[c] = Math.max(deck.columnCover[c] * aR, clouds.columnCover[c] * aS);
    rain.deckY = aS > aR ? tools.storm.y0 : deckY0;
    rainOpts.wind = windMid.vx;
    rain.step(dt, rainOpts);
    if (ribbons.amount > 0 || ribbons.target > 0) {
      if (tools.windAt(windPt)) ribbons.pull(windPt.x, windPt.y);   // the silk nearest a drawn current follows it
      ribbons.step(dt, wind, reduced); fluffs.step(dt, wind, reduced);
    }
    if (mist.amount > 0 || mist.target > 0) mist.step(dt, windMid.vx);
    if (sun.amount > 0 || sun.target > 0) sun.step(dt, body);
    if (moon.amount > 0 || moon.target > 0) moon.step(dt, body);
    if (stars.amount > 0 || stars.target > 0) stars.step(dt, reduced);
    if (embers.amount > 0 || embers.target > 0) embers.step(dt, reduced);
    if (geo.water) waves.step(dt);
    if (DRY_REALMS.includes(env.realmId)) puddles.addWet(dt, rain.intensity);
    puddles.step(dt);
    hearth(dt, w);
    stepRings(rings, dt);
    if (dewT >= 0) { dewT += dt; if (dewT > DEW_S) dewT = -1; }
    if (scene.kindleT >= 0) { scene.kindleT += dt; if (scene.kindleT > 2 || w !== 'warm') scene.kindleT = -1; }
    // 4. the realm's mood and resolution follow progress (held still under a front's cover)
    if (st.phase !== 'cover' && st.phase !== 'swap' && !leaving) {
      moodOpts.gentle = gentle();
      moodLive.energy = wind.energy; moodLive.turb = wind.turb; moodLive.calm = wind.calm;
      moodLive.height = sun.amount > 0.05 ? sun.height : 0.5; moodLive.painted = sun.painted; moodLive.hearth = hearthK;
      moodFor(w, session.progress, moodLive, env.realmId, moodOpts, moodOut);
      env.setMood(moodOut);
      env.transform(transformFor(w, session.progress, session.resolved));
    }
    // 5. the Mallow
    conditions(w);
    reactor.weather(w, session.progress);
    reactor.conditions(cond, dt);
    idle(dt, w);
    // 6. sound: the bed follows the sims
    soundStep(w);
    // 7. draw
    if (leaving) scene.fade = Math.max(0, scene.fade - dt / 0.45);
    fillScene(st, dt, w);
    layer.frame(dt, scene);
  }

  // A sim's presence is the planner's for its weather; enter / leave (called once per change of
  // direction) set the choreography: clouds sweep from windward, pools slide down their beam…
  function drive(sim, a) {
    if (a > sim.amount + 1e-4 && sim.target !== 1) { if (sim.amount <= 1e-4 && 'off' in sim) sim.off = 0; sim.enter(1); }
    else if (a < sim.amount - 1e-4 && sim.target !== 0) sim.leave(1);
    sim.amount = a;
  }

  // Warm glow: the Mallow held (a Companion hold, or H) or the "Spread the warmth" chip makes it the hearth
  function hearth(dt, w) {
    const on = w === 'warm' && planner.amount('warm') > 0.5 && !leaving && (tools.glow.hearth || !!companion.hold);
    hearthK += ((on ? 1 : 0) - hearthK) * Math.min(1, dt * 2);
    cond.hearth = on;
    if (!on) { hearthT = 0; return; }
    embers.radiate(body.cx, body.mid, dt);
    hearthT += dt;
    if (hearthT >= HEARTH_PULSE) { hearthT = 0; pulse('hearth', body.cx, body.bottom); }
    if (!saidHearth) { saidHearth = true; say(COPY.announce.hearth(name)); }
  }

  function conditions(w) {
    cond.gaze = tools.focus(gazePt) ? gazePt : null;
    cond.front = front.on ? frontPt : null;
    const pool = w === 'sunshine' ? sun : w === 'moonlight' ? moon : null;
    if (pool && pool.amount > 0.5) { poolPt.x = pool.x; poolPt.y = pool.y; cond.pool = poolPt; } else cond.pool = null;
    cond.cluster = null; cond.clusterN = 0;
    if (w === 'starlight') for (let k = 0; k < 2; k++) if (stars.cId[k] !== -1 && stars.cn[k]) { clusterPt.x = stars.cx[k]; clusterPt.y = stars.cy[k]; cond.cluster = clusterPt; cond.clusterN = stars.cn[k]; break; }
    cond.heat = w === 'warm' ? embers.heat : 0;
    wind.sample(body.cx, body.mid, windBody);
    cond.windAt = wind.energy > 0.05 ? windBody : null;
    cond.energy = wind.energy;
    // light on the body: a storm shaft, the sun pool close by, the fog lantern
    let light = tools.storm.light;
    if (w === 'sunshine' && sun.amount > 0.5) light = Math.max(light, 1 - smoothstep(0.5, 1.6, Math.hypot(sun.x - body.cx, sun.y - body.mid) / Math.max(1, body.h)));
    if (w === 'fog') light = Math.max(light, 0.78 * smoothstep(0.3, 1, mist.amount));
    cond.lightOnBody = light;
    cond.bask = w === 'sunshine' && sun.onBody && sun.amount > 0.5;
    cond.moonlit = w === 'moonlight' && moon.onBody && moon.amount > 0.5;
    cond.raining = w === 'rain' && rain.intensity > 0.25;
    // a third and two thirds of the embers lit: the Mallow's comfort beats
    if (w === 'warm') {
      const want = embers.heat >= 2 / 3 ? 2 : embers.heat >= 1 / 3 ? 1 : 0;
      if (want > heatStep) { heatStep = want; reactor.event('heat', { x: body.cx, y: body.top - 60, k: embers.heat }); if (!saidEmbers) { saidEmbers = true; say(COPY.announce.embers); } }
    }
  }

  // The bed follows what the sims are doing (≤ 10 Hz; nothing plays before a gesture), and wiping
  // mist plays the brush at the wipe's speed.
  function soundStep(w) {
    const t = performance.now();
    if (t - sndT < SOUND_MS) return;
    sndT = t;
    bedIn.weather = w; bedIn.progress = session.progress; bedIn.warmth = moodOut.warmth;
    bedIn.rain = rain.intensity;
    bedIn.storm = clouds.amount > 0.01 ? clouds.coverage() * smoothstep(0.2, 1, clouds.amount) : 0;
    bedIn.wind = wind.energy;
    bedIn.water = geo.water ? 1 : 0; bedIn.waves = waves.energy;
    bedIn.mist = mist.amount > 0.01 ? mist.amount * (1 - mist.fogClear()) : 0;
    bedIn.fade = scene.fade;
    wsound.update(bedLevels(bedIn, bedOut), t);
    const ws = w === 'fog' && !leaving ? tools.wiping() : -1;
    wsound.wipe(ws >= 0, ws);
  }

  // 12–20 s without a weather touch (sim time): the Mallow looks over at the weather's lead element
  function idle(dt, w) {
    if (tools.active || tools.altActive || wHeld || reactor.touched || front.on || leaving || planner.busy) { idleT = 0; return; }
    idleT += dt;
    if (idleT < idleAt) return;
    idleT = 0;
    idleAt = IDLE[0] + (IDLE[1] - IDLE[0]) * idleRnd();
    if (leadPoint(w, idlePt)) reactor.event('idle', idlePt);
  }

  /** Where the weather's lead element is (the pool, the brighter star, the bank…) into out; false when there is none. */
  function leadPoint(w, out) {
    const b = body;
    switch (w) {
      case 'sunshine': case 'moonlight': {
        const p = w === 'sunshine' ? sun : moon;
        out.x = p.x; out.y = p.y;
        return p.amount > 0.5;
      }
      case 'starlight': {
        let i = stars.affordance;
        if (i < 0 || i >= stars.n) { i = -1; for (let k = 0; k < stars.n; k++) if (stars.a[k] > 0.5 && !stars.held(k)) { i = k; break; } }
        if (i < 0) return false;
        out.x = stars.x[i]; out.y = stars.y[i];
        return true;
      }
      case 'storm': out.x = geo.W / 2; out.y = (clouds.top + clouds.bottom) / 2; return clouds.amount > 0.5;
      case 'rain': out.x = geo.W / 2; out.y = rain.deckY; return deck.amount > 0.5;
      case 'wind': if (!ribbons.n || ribbons.amount < 0.5) return false; out.x = ribbons.px[0]; out.y = ribbons.py[0]; return true;
      case 'fog': out.x = clamp(b.cx + b.w * 0.9, 20, geo.W - 20); out.y = b.mid - b.h * 0.5; return mist.amount > 0.5;
      case 'warm': {
        let best = -1, bd = Infinity;
        for (let i = 0; i < embers.n; i++) {
          if (embers.lit[i] >= 0.5) continue;
          const d = Math.hypot(embers.x[i] - b.cx, embers.y[i] - b.mid);
          if (d < bd) { bd = d; best = i; }
        }
        if (best < 0) return false;
        out.x = embers.x[best]; out.y = embers.y[best];
        return true;
      }
      default: return false;
    }
  }

  function fillScene(st, dt, w) {
    scene.t = simT; scene.W = geo.W; scene.H = geo.H;
    let held = 0;
    for (let k = 0; k < rain.oState.length; k++) if (rain.oState[k]) held++;
    if (stars.amount > 0) for (let i = 0; i < stars.n; i++) if (stars.held(i)) held++;
    scene.held = held;
    const S = scene.storm;
    S.n = tools.storm.n; S.y0 = tools.storm.y0; S.shaft = clouds.amount;
    if (w === 'storm') S.warm = smoothstep(0.1, 1, session.progress);
    // the idle affordance: once per weather, until it is first touched
    const want = !touchedW.has(w) && planner.amount(w) >= 1 && !front.on && !leaving && !session.resolved;
    if (want) affKind = w;
    affA += ((want ? 1 : 0) - affA) * Math.min(1, dt * 2);
    scene.affordance = affA > 0.01 ? affKind : null;
    scene.affordanceA = affA;
    // the sun slides down a shaft through the parting clouds (Storm or Rain → Sunshine), then hangs from its own sun
    if (morphSun) {
      const g = REALM_GEO[env.realmId], k = smoothstep(0.3, 1, sun.amount);
      if (g?.sun) { scene.sunAt[0] = sunGap[0] + (g.sun[0] * geo.W - sunGap[0]) * k; scene.sunAt[1] = sunGap[1] + (g.sun[1] * geo.H - sunGap[1]) * k; }
      if (k >= 1 || w !== 'sunshine') morphSun = false;
    }
    // the glow behind the Mallow: basking (warm), moonlit (silver), the hearth (embers). In Warm glow the
    // Mallow is the hearth from the start: a low ember glow that grows as the warmth spreads
    const hearthGlow = w === 'warm' && !leaving ? (0.4 + 0.25 * embers.heat) * smoothstep(0.3, 1, planner.amount('warm')) : 0;
    const hk = cond.bask ? 'sun' : cond.moonlit ? 'moon' : cond.hearth || hearthGlow > 0.01 ? 'ember' : null;
    if (hk) haloKind = hk;
    haloA += ((hk ? (hk === 'moon' ? 0.42 : hk === 'ember' && !cond.hearth ? hearthGlow : 0.5) : 0) - haloA) * Math.min(1, dt * 2.5);
    scene.halo.a = haloA; scene.halo.kind = haloKind;
    // fog: it rises from the floor as it arrives and sinks back as it leaves (reduced motion: it fades in place)
    const ma = smoothstep(0, 1, mist.amount);
    if (reduced) { scene.mistTop = -1e9; scene.mistK = 0.82 * ma; }
    else { scene.mistTop = geo.floorY - (geo.floorY - geo.skyTop + 90) * ma; scene.mistK = 0.82; }
    scene.lantern = w === 'fog' ? 0.32 * ma * (1 - 0.6 * live.fogClear) : 0;
    scene.dew = dewT;
    // a bright realm keeps dark chrome ink; when a storm bank or a dark front fills the top band behind the
    // title, the title, subtitle and hint switch to light ink (the bottom chips stay on the bright ground)
    let dark = 0;
    if (env.tone === 'light' && !leaving) {
      dark = clouds.amount > 0.01 ? clouds.coverage() * smoothstep(0.2, 1, clouds.amount) : 0;
      if (front.on && front.family !== 'light') dark = Math.max(dark, front.cover);
    }
    if (inkLight ? dark < INK[0] : dark > INK[1]) {   // the hint and caption sit in the same band: they follow the title
      inkLight = !inkLight; topbar?.classList.toggle('wx-ink-light', inkLight); hint.el.classList.toggle('wx-ink-light', inkLight);
    }
    if (front.on) {
      front.cover = st.cover; front.mode = st.mode; front.t = reduced ? 0 : simT;   // no edge drift or twinkle with reduced motion
      const k = front.swapped ? 1 - st.cover : st.cover;
      frontPt.x = front.dir > 0 ? k * geo.W : (1 - k) * geo.W; frontPt.y = geo.H * 0.35;
    }
  }

  // ---------------------------------------------------- weather changes --
  function noticeWeather() {
    if (session.weather === shownW) return;
    const from = shownW;
    shownW = session.weather;
    lastWeather = shownW;
    idleT = 0;
    lastPickT = simT;
    if (planner.amount(shownW) < 0.01) { tools.enter(shownW); if (shownW === 'warm') scene.kindleT = 0; }   // arriving from nothing: fresh, untouched
    if (!fronting()) morph(from, shownW);
    dial.set(shownW);
    reactor.weather(shownW, 0);
    saidLight = saidThin = saidShelter = saidMoon = saidStars = saidMist = saidWind = saidEmbers = saidHearth = false;
    heatStep = 0;
    updateActions();
    if (fronting()) return;   // the front announces when it clears
    say(COPY.announce.at(WEATHERS[shownW].label, realmPhrase(REALMS[env.realmId].name), howTo(shownW)));
    showHint(shownW);
    hintAt = -1;
    setSubtitle();
    if (!reduced) { env.setFocus(planner.dir * 0.4, -0.12); leanT = simT + 2; }   // a subtle lean toward the incoming weather
  }

  // The same-realm morphs (everything else is the generic leave and enter):
  //   Rain → Starlight: the drops in flight slow, rise and become the stars.
  //   Storm or Rain → Sunshine: the clouds part from the centre as they drift off (drawing only, so a quick pick back
  //     finds the bank exactly as the person left it); the pool slides down a shaft through the gap.
  //   Fog → any: the mist sinks to the floor and thins, revealing the new weather from the top down (drawn by the layer).
  function morph(from, to) {
    if (to === 'starlight' && from === 'rain' && planner.amount('rain') > 0.05) {
      const n = rain.positions(morphBuf, Math.min(stars.n, morphBuf.length >> 1));
      if (n) { stars.seedFrom(morphBuf, n); rain.clearDrops(); }
    }
    if (to === 'sunshine' && (from === 'storm' || from === 'rain')) {
      const bank = from === 'storm' ? clouds : deck, cy = bank.top + (bank.bottom - bank.top) * 0.5;
      bank.apart(1);
      if (sun.amount < 0.05) {
        sunGap[0] = geo.W / 2; sunGap[1] = cy;
        sun.from = sunGap;
        scene.sunAt[0] = sunGap[0]; scene.sunAt[1] = sunGap[1];
        morphSun = true;
      }
    }
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
    rain.clearDrops();   // drops still falling belonged to the old world (hidden under the full front)
    applyGeo(true);
    tools.enter(session.weather);   // fresh behind the band (every presence was zeroed at the swap)
    if (session.weather === 'warm') scene.kindleT = 0;
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
    // on a short, wide stage the Mallow's head stands close under the hint spot, and a celebrate or a big hop would
    // jump through the caption's second line: there it waits until the jump has landed (the announcer says it now)
    if (land) { hint.hide(); capWait = { cap, line: lineFor(id, w), t: simT, flew: false }; }
    else hint.caption(cap, lineFor(id, w), name, 4000);
    hintAt = -1;
    say(cap);
    if (w === 'storm') tools.storm.drift = true;   // the remaining clouds drift leeward
    if (w === 'rain') tools.rain.drift = true;     // the deck drifts off; puddles glint
    if (w === 'fog') { mist.lift(true); dewT = 0; }   // the fog lifts as a whole; dew glints
    updateActions();
  }

  // the landscape resolve caption: once the Mallow is down again after its jump (or had none), at the latest CAP_JUMP[1]
  function waitCaption() {
    if (!session.resolved || leaving) { capWait = null; return; }
    const b = rig.body, up = !b.grounded || b.hop > 0, t = simT - capWait.t;
    if (up) capWait.flew = true;
    if ((!up && (capWait.flew || t >= CAP_JUMP[0])) || t >= CAP_JUMP[1]) { hint.caption(capWait.cap, capWait.line, name, 4000); capWait = null; }
  }

  // Again ran its reset step: everything the weather left behind goes too
  function afterReset() {
    if (session.weather === 'fog') dewT = -1;
    heatStep = 0;
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
    saidLight = saidThin = saidShelter = saidMoon = saidStars = saidMist = saidWind = saidEmbers = saidHearth = false;
    showHint(session.weather);
    hintAt = -1;
    say(COPY.announce.again(WEATHERS[session.weather].label));
    updateActions();
  }

  function pushWater() {
    if (!ready || leaving || covered()) return false;
    const ok = tools.pushWater();
    if (ok) say(COPY.announce.swell);
    return ok;
  }

  function updateActions() {
    const w = session.weather, list = [];
    if (session.resolved) list.push({ id: 'again', label: COPY.again, click: () => again() });
    else if (tools.has(w)) list.push({ id: 'lead', label: WEATHERS[w].alt.label, hold: true, start: () => tools.altStart(session.weather), end: () => tools.altEnd() });
    if (waterOn()) {
      list.push({ id: 'water', label: COPY.water.alt, click: () => pushWater() });
      if (!waterHinted) { waterHinted = true; waterHintAt = simT + 3.4; }   // a one-time hint, after the weather's own
    }
    actions.set(list, { disabled: covered() || leaving });
  }

  /** A front is passing (a pick changes the weather before the session's next update says so: ask the planner too). */
  function fronting() { return session.state === 'fronting' || planner.phase === 'cover' || planner.phase === 'swap'; }
  /** Under a front's cover (before the reveal begins) the chips and W wait. */
  function covered() { return fronting() && !front.swapped && planner.phase !== 'reveal'; }

  // "Storm · Raindrop Lagoon" (the same text for screen readers); where it has to wrap (320 px), the world goes on
  // its own line without the dot, so no separator dangles, and the hint below steps down to give it room
  function setSubtitle() {
    if (!subtitleEl || !env.realmId) return;
    const text = COPY.subtitle(WEATHERS[session.weather].label, realmShort(REALMS[env.realmId].name)), at = text.indexOf(' · ');
    if (at < 0) subtitleEl.textContent = text;
    else subtitleEl.replaceChildren(text.slice(0, at), h('span', { class: 'wx-sep' }, ' · '), h('span', { class: 'wx-where' }, text.slice(at + 3)));
    // the hint spot moved (a subtitle that now wraps, or no longer does): a landscape Mallow is framed under it again
    if (fitSubtitle() && land && lastL) { frameLand(lastL); applyGeo(false); }
  }
  /** Wrap the subtitle's world onto its own line where it has to; true when that changed (the hint steps with it). */
  function fitSubtitle() {
    if (!subtitleEl) return false;
    const was = subtitleEl.classList.contains('wx-two');
    subtitleEl.classList.remove('wx-two');
    const lh = parseFloat(getComputedStyle(subtitleEl).lineHeight) || 17, two = subtitleEl.getBoundingClientRect().height > lh * 1.5;
    subtitleEl.classList.toggle('wx-two', two);
    s.screen.classList.toggle('wx-sub-two', two);
    return two !== was;
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

  function onWeather(type, x, y, k, vx = 0, vy = 0) {
    const e = evRing[evN++ % 64];
    e.t = +simT.toFixed(2); e.type = type; e.x = Math.round(x); e.y = Math.round(y); e.k = +(+k || 0).toFixed(2);
    if (leaving || closed) return;
    const w = session.weather;
    switch (type) {
      case 'touch': pulse('touch', x, y); reactor.event('glance', { x, y }); break;
      // storm
      case 'gap':
        pulse('gap', x, y);
        reactor.event('gap', { x, y });
        hap('soft');
        say(COPY.announce.cloudsOpen);
        if (!firstGap && wsound.pair()) firstGap = true;   // the first light: a warm pair
        break;
      case 'light-through':
        reactor.event('light-through', { x, y });
        if (!saidLight) { saidLight = true; say(COPY.announce.lightOn(name)); }
        break;
      case 'strike': pulse('strike', x, y); reactor.event('strike', { x, y }); bolt = 1; wsound.rumble(1); break;
      case 'glow': reactor.event('glance', { x, y }); bolt = 0.6; wsound.rumble(0.6); break;   // gentle or reduced: a glow, softer thunder
      case 'thunder': wsound.thunder(bolt); break;
      case 'swish': wsound.swish(Math.max(0.3, k), pan(x)); break;
      // rain
      case 'bead': wsound.drip(0, 0.6, pan(x)); break;
      case 'bead-up':
        pulse('bead-up', x, y);
        wsound.rise(k);
        if (glows.allow('bloom')) layer.addBloom(x, y, 34 + 4 * Math.sqrt(k), REALMS[env.realmId].palette.glow, 1.6);
        if (!saidThin && rain.level < 0.6) { saidThin = true; say(COPY.announce.rainThin); }
        break;
      case 'merge': wsound.drip(Math.floor(k / 2), 1, pan(x)); hap('light'); break;   // plinks up the Mallow's scale
      case 'hit-body': reactor.event('hit-body', { x, y, k }); wsound.patter(pan(x)); break;
      case 'splash-body': reactor.event('hit-body', { x, y, k: 1 }); wsound.splash(clamp(k / 16, 0.2, 1), pan(x)); break;
      case 'orb-up': if (deck.amount > 0.5 && glows.allow('glow')) deck.flash(x); break;   // light inside the cloud above
      case 'splash-water': pulse('splash-water', x, y, { n: k }); addRing(rings, x, y); waves.ripple(x, Math.min(1, 0.2 + k / 20)); wsound.splash(clamp(k / 16, 0.2, 1), pan(x)); break;
      case 'splash-ground': pulse('splash-ground', x, y); addRing(rings, x, y); wsound.splash(clamp(k / 16, 0.2, 0.7), pan(x)); break;
      case 'sheltered':
        reactor.event('sheltered', { x, y });
        if (!saidShelter) { saidShelter = true; say(COPY.announce.sheltered(name)); }
        break;
      // sunshine and moonlight
      case 'sun-rest':
        if (w === 'sunshine' && pulse('sun-rest', x, y)) wsound.glint(3);   // a sun shaft or sunbeam there, with a glint
        break;
      case 'sun-in':
        if (w !== 'sunshine') break;
        reactor.event('bask', { x, y });
        if (!saidLight) { saidLight = true; say(COPY.announce.lightOn(name)); }
        break;
      case 'moon-rest':   // resting in the sky: a falling star in the cove (a lantern in the fair), ≥ 6 s apart
        if (w === 'moonlight' && !moon.onWater && !moon.onBody && y < geo.horizonY && gate('moon-star', MOON_STAR_GAP) && pulse('moon-rest', x, y)) wsound.glint(5);
        break;
      case 'moon-in':
        if (w !== 'moonlight') break;
        reactor.event('moonlit', { x, y });
        if (!saidMoon) { saidMoon = true; say(COPY.announce.moonlit(name)); }
        break;
      case 'moon-out': if (w === 'moonlight') reactor.event('moon-leave', { x, y }); break;
      case 'moon-water': pulse('moon-water', x, y); break;
      // starlight
      case 'gather':
        wsound.tink(2 + Math.min(7, k));   // tinks up the scale as the cluster grows
        if (!saidStars) { saidStars = true; say(COPY.announce.starsGather); }
        break;
      case 'constellation':
        pulse('constellation', x, y);
        reactor.event('constellation', { x, y, k });
        hap('pop');
        ctx.sound.motif(id, 'bright');
        say(COPY.announce.constellation(name));
        break;
      case 'gift':
        pulse('gift', body.cx, body.bottom);
        reactor.event('gift', { x: body.cx, y: body.top });
        wsound.shower();
        say(COPY.announce.gift(name));
        break;
      // wind
      case 'gust': reactor.event('gust', { x, y, k, vx, vy }); wsound.swish(k, pan(x - Math.sign(vx) * 60)); break;
      case 'gust-water': pulse('gust-water', x, y); break;
      case 'eddy': case 'calm-loop': reactor.event('eddy', { x, y, k }); break;
      // fog
      case 'wipe': wsound.swish(0.35, pan(x)); break;   // then the brush follows the wipe (soundStep)
      case 'revealed':
        reactor.event('revealed', { x, y });
        if (!saidMist && mist.fogClear() > 0.25) { saidMist = true; say(COPY.announce.mistClear); }
        break;
      // warm glow
      case 'kindle':
        if (gate('kindle', KINDLE_PULSE)) { pulse('kindle', x, y); wsound.kindle(4 + (heatStep * 2)); }
        reactor.event('kindle', { x, y });
        break;
      // water
      case 'water-push': pulse('water-push', x, y); wsound.swell(k, pan(x)); break;
      case 'water-tap': pulse('water-tap', x, y); wsound.drip(0, 0.7, pan(x)); break;
      case 'puddle': pulse('puddle', x, y); wsound.drip(2, 0.6, pan(x)); break;
      case 'wave-arrive':
        reactor.event('wave-arrive', { x, y, k, vx: body.cx > geo.W / 2 ? 1 : -1 });
        wsound.swell(Math.min(1, k) * 0.7, pan(body.cx), 'arrive');
        if (k > 0.7) hap('soft');
        if (waves.lastGold && w === 'warm') embers.kindleNear(body.cx, body.mid, 2);   // a warm swell brings heat
        break;
      case 'shore': if (gate('shore', 700)) pulse('shore', x, y); break;
      default: break;   // land-* (single drops: the rain bed carries them), wipe-end, eddy, calm-loop
    }
    if (w === 'wind' && !saidWind && wind.calm > 0.5) { saidWind = true; say(COPY.announce.windEase); }
  }

  // ---------------------------------------------------------------- keys --
  // through stage-screen's keys hook: 1–8 choose, arrows shape, W holds the lead chip, R is Again
  function keys(e, k, phase) {
    s.screen.classList.remove('wx-quiet-focus');   // the keyboard is in use: focus rings as usual
    if (!ready) return false;
    if (leaving) return k !== 'escape';
    const ae = document.activeElement;
    const onStage = !ae || ae === document.body || ae === s.stage;
    const typing = !!ae?.closest?.('input, textarea, select');
    const m = /^(?:Digit|Numpad)([1-9])$/.exec(e.code || '');
    if (m) {   // from anywhere but a text field (a clicked radio or chip keeps focus: the digits still choose)
      if (typing || e.altKey || e.ctrlKey || e.metaKey || +m[1] > DIAL_ORDER.length) return false;
      if (phase === 'down' && !e.repeat) pick(DIAL_ORDER[+m[1] - 1], true);
      return true;
    }
    if (k.startsWith('arrow')) {
      if (!onStage) return false;
      if (phase === 'down') {
        e.preventDefault();
        if (!covered()) tools.nudge(session.weather, k === 'arrowleft' ? -1 : k === 'arrowright' ? 1 : 0, k === 'arrowup' ? -1 : k === 'arrowdown' ? 1 : 0);
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
    for (const sim of TIERED) sim.setTier(q);   // pools shrink, never grow, mid-session
    planner.setTier(q);
    wsound.setTier(q);                          // the bed only loses layers
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
    wsound.end(0.6);   // the bed fades with the screen
    leaveT = setTimeout(() => { leaveT = 0; if (!closed) ctx.navigate('/'); }, 460);
  }

  function metrics() {
    const w = session.weather, pool = w === 'moonlight' ? moon : sun;
    let clusters = 0;
    for (let i = 0; i < stars.n; i++) if (stars.held(i)) clusters++;
    return {
      coverage: +clouds.coverage().toFixed(3), clear: +clouds.clear().toFixed(3), rainLevel: +rain.level.toFixed(3), wet: +rain.wet.toFixed(3),
      energy: +wind.energy.toFixed(3), calm: +wind.calm.toFixed(3), fogClear: +mist.fogClear().toFixed(3), painted: +sun.painted.toFixed(3),
      height: +pool.height.toFixed(3), onBody: pool.onBody, bask: +sun.bask.toFixed(2), dwell: +moon.dwell.toFixed(3), constellations: stars.constellations,
      heat: +embers.heat.toFixed(3), waveEnergy: +waves.energy.toFixed(3), held: rain.orbs() + (clusters ? 1 : 0), heldStars: clusters,
      light: +cond.lightOnBody.toFixed(3), intensity: +rain.intensity.toFixed(3), puddles: +puddles.visible.toFixed(3), hearth: cond.hearth,
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
    /** Exactly what the chips do: name 'lead' | 'water' | 'again'; phase 'start' | 'end' | 'tap'. */
    act(nameA, phase = 'tap') {
      if (nameA === 'again') return again();
      if (nameA === 'water') return pushWater();
      if (nameA !== 'lead') return false;
      if (phase === 'start') return tools.altStart(session.weather);
      if (phase === 'end') { tools.altEnd(); return true; }
      clearTimeout(actT);
      const ok = tools.altStart(session.weather);
      actT = setTimeout(() => { actT = 0; tools.altEnd(); }, 400);
      return ok;
    },
    sims: { clouds, deck, rain, strikes, mist, wind, ribbons, fluffs, waves, puddles, sun, moon, embers, stars },
    metrics, env, layer, reactor, tools, session,
    /** The live terms moodFor is given this frame (wind energy, the sun's height, the hearth…). */
    live() { return { ...moodLive }; },
    /** WeatherSound.debug(): the bed (alive, layers, levels) and the one-shots played. */
    get sound() { return wsound.debug(); },
    /** The lab glow gate's last decisions (cloud glows, bead blooms). */
    get glows() { return glows.log; },
    /** The announcer's last 10 messages (what a screen reader was told). */
    get said() { return sr.log; },
    get events() { const n = Math.min(64, evN), out = []; for (let i = evN - n; i < evN; i++) out.push({ ...evRing[i % 64] }); return out; },
    get pulses() { return env.log; },
    geo() {
      const g = REALM_GEO[env.realmId] || {};
      return { W: geo.W, H: geo.H, skyTop: geo.skyTop, horizonY: geo.horizonY, water: geo.water, floorY: geo.floorY, body: { ...body },
        sun: g.sun ? [g.sun[0] * geo.W, g.sun[1] * geo.H] : null, moon: g.moon ? [g.moon[0] * geo.W, g.moon[1] * geo.H] : null,
        sunAt: [...scene.sunAt], moonAt: [...scene.moonAt] };
    },
    /** Fast-forward for tests: the realm eases to its target at once, and the planner finishes. */
    settle() { env.realm?.debug?.settle(); planner.finish(); },
    debug() { return { state: session.state, weather: session.weather, realmId: env.realmId, progress: +session.progress.toFixed(3), resolved: session.resolved, metrics: metrics() }; },
    /** The landscape framing (landFit's { fit, size, h, w, headTop }) on a short, wide stage, else null. */
    get land() { return land ? { ...land } : null; },
  };
  if (globalThis.__lab) globalThis.__lab.weather = handle;
  // keyboard gestures and keys work straight away. The ring waits for the keyboard: Chrome shows
  // :focus-visible for a script's focus before any click (a deep link), framing the whole screen
  s.screen.classList.add('wx-quiet-focus');
  s.stage.focus({ preventScroll: true });

  return {
    unmount() {
      if (closed) return;
      closed = true;
      cancelAnimationFrame(raf); raf = 0;
      cancelAnimationFrame(enterRaf); enterRaf = 0;
      router.dispose();
      s.screen.removeEventListener('pointerdown', onPress, true);
      for (const ev of ['pointermove', 'pointerdown', 'pointerup']) s.screen.removeEventListener(ev, onHover, true);
      s.screen.removeEventListener('pointerleave', offHover);
      setCursor('');
      actions.endHolds();
      tools.altEnd();
      offPrefs(); offDna();
      document.removeEventListener('visibilitychange', onVis);
      removeEventListener('blur', onBlur);
      clearTimeout(leaveT); clearTimeout(remountT); clearTimeout(actT);
      hint.destroy();
      sr.destroy();
      wsound.end(0.4);   // the brush, then the bed
      reactor.destroy();
      layer.destroy();
      clearGlowSprites();
      env.destroy();
      s.unmount();
      if (globalThis.__lab?.weather === handle) globalThis.__lab.weather = null;
    },
  };
}
