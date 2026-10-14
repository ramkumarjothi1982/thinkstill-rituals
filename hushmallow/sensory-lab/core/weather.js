// Weather Weaver — the pure core of the hushmallow weather screen (#weather).
//
// Eight weathers you can touch, each happening in a Hushfold realm that can
// actually paint its sky:
//   - where each weather can happen: host scores (0 = impossible, which also
//     enforces the sky rule: no sunshine at night, no moon or stars by day)
//     and pickRealm, which keeps the current or home realm whenever it can;
//   - what each weather does to the realm: moodFor (the realm's own mood axes,
//     eased by the realm over ~4 s) and transformFor (its authored resolution);
//   - which realm pulse answers which touch: pulseFor (callers still go
//     through the Environment's photosafe gate);
//   - how far a weather has been reshaped: progressFor, latched at 1 once
//     resolved;
//   - how a dial pick plays out: TransitionPlanner (a same-realm turn, or a
//     weather front that covers a realm change) inside WeatherSession;
//   - every user-facing string (COPY), so the copy lint sees all of it.
//
// The weather is a metaphor the person picks. Nothing here infers, labels or
// stores anyone's feelings. No DOM; imports only math.js (no cycles).

import { clamp, lerp, smoothstep } from './math.js';

export const DIAL_ORDER = ['sunshine', 'wind', 'fog', 'rain', 'storm', 'moonlight', 'starlight', 'warm'];
export const WEATHER_IDS = DIAL_ORDER;
/** Lead tool per weather (dial order); 'water' is cross-cutting (every weather but Fog, where there is water). */
export const TOOLS = ['sun', 'wind', 'mist', 'rain', 'clouds', 'moon', 'stars', 'glow'];
export const WATER_TOOL = 'water';
export const ALL_TOOLS = [...TOOLS, WATER_TOOL];

// Realm traits this module needs, by id (mirrors REALM_GEO in core/environment.js; a test pins them).
export const REALM_ORDER = ['blue-drift', 'sunpop-orchard', 'raindrop-lagoon', 'moonmilk-cove', 'spark-festival', 'spiral-observatory', 'static-storm'];
export const DAY_REALMS = ['blue-drift', 'sunpop-orchard'];
export const WATER_REALMS = ['blue-drift', 'raindrop-lagoon', 'moonmilk-cove'];
export const DRY_REALMS = ['sunpop-orchard', 'spark-festival', 'spiral-observatory', 'static-storm'];

const IDX = Object.freeze(Object.fromEntries(DIAL_ORDER.map((w, i) => [w, i])));
const isWeather = (w) => typeof w === 'string' && Object.hasOwn(IDX, w);
const num = (v, d) => (typeof v === 'number' && Number.isFinite(v) ? v : d);

// ------------------------------------------------------------------ copy --
// Short, warm, plain British English. Describes the world and the Mallow,
// never the person. Hints ≤ 48 characters. Linted by tests/weather.test.mjs.
export const COPY = Object.freeze({
  title: 'Weather Weaver',
  dial: 'Weather',
  actions: 'Weather actions',
  again: 'Again',
  close: 'Close',
  subtitle: (label, realmShort) => `${label} · ${realmShort}`,
  stageLabel: (name) => `Weather Weaver with ${name}. Keys 1 to 8 choose the weather, arrow keys shape it, hold W to weave. Touch ${name} to talk.`,
  weathers: {
    sunshine: { label: 'Sunshine', hint: 'Drag the warm light', say: 'Drag to move the warm light.', caption: 'Golden hour.', alt: 'Bring the sun' },
    wind: { label: 'Wind', hint: 'Draw a current', say: 'Drag to draw a current.', caption: 'Just a breeze now.', alt: 'Send a breeze' },
    fog: { label: 'Fog', hint: 'Wipe the mist away', say: 'Drag to wipe the mist.', caption: 'The mist lifted.', alt: 'Clear the mist' },
    rain: { label: 'Rain', hint: 'Hold still to catch the rain', say: 'Hold to catch it.', caption: 'The rain eased.', captionWater: 'The water is still.', alt: 'Catch the rain' },
    storm: { label: 'Storm', hint: 'Swipe the clouds apart', say: 'Swipe to part the clouds.', caption: 'The storm passed.', alt: 'Part the clouds' },
    moonlight: { label: 'Moonlight', hint: 'Move the moonlight', say: 'Drag to move the moonlight.', caption: 'The night is clear.', captionWater: 'The tide is still.', alt: 'Bring the moonlight' },
    starlight: { label: 'Starlight', hint: 'Sweep up stars, then let go', say: 'Sweep up stars, then let go.', caption: 'The stars found their places.', alt: 'Gather stars' },
    warm: { label: 'Warm glow', hint: 'Drag to spread the warmth', say: 'Drag to kindle the embers.', caption: 'Everything is glowing.', alt: 'Spread the warmth' },
  },
  water: { alt: 'Push the water', hint: 'Push the water to send a swell' },
  announce: {
    at: (label, realmPhrase, say) => `${label} at ${realmPhrase}.${say ? ` ${say}` : ''}`,
    travel: (realmPhrase) => `Travelling to ${realmPhrase}.`,
    cloudsOpen: 'The clouds are opening.',
    lightOn: (name) => `Light reaches ${name}.`,
    rainThin: 'The rain is thinning.',
    sheltered: (name) => `${name} is sheltered from the rain.`,
    mistClear: 'The mist is clearing.',
    windEase: 'The wind is easing.',
    moonlit: (name) => `Moonlight reaches ${name}.`,
    starsGather: 'Stars are gathering.',
    constellation: (name) => `A constellation for ${name}.`,
    gift: (name) => `A star shower for ${name}.`,
    embers: 'The embers are glowing.',
    hearth: (name) => `Warm rings spread from ${name}.`,
    swell: 'A swell rolls in.',
    again: (label) => `${label} again.`,
  },
  // One authored line per Mallow per weather, shown under the caption when a weather settles.
  lines: {
    glitzi: {
      sunshine: 'Warm. Fine. I am not basking. Much.', wind: 'Ooh, that gust had attitude. Again.',
      fog: 'Mist gone. I was enjoying the mystery.', rain: 'Rain stopped. My static is all fizzy.',
      storm: 'Pfft. I was not worried. Not even slightly.', moonlight: 'Moonlight. Very dramatic. I approve.',
      starlight: 'Stars in neat lines. Disgusting. Lovely.', warm: 'Cosy. Do not tell anyone I said cosy.',
    },
    blubi: {
      sunshine: 'Warm all over. I might melt. Happily.', wind: 'Whee! My drops went all swirly.',
      fog: 'Oh! Everything was there all along.', rain: 'Every drop is shining now. Happy tears!',
      storm: 'It passed. I am only a little bit teary.', moonlight: 'Moonlight. I am melting into a puddle.',
      starlight: 'So many stars. I am going to cry. Happily!', warm: 'So warm. Like a hug made of light.',
    },
    zuzu: {
      sunshine: 'Ooh, light comes in so many angles.', wind: 'Which way is the wind facing? All of them!',
      fog: 'What if the mist was thinking too?', rain: 'I counted the drops. Then lost count. Again!',
      storm: 'The clouds unspun. Fascinating.', moonlight: 'Is the moon looking at us, or with us?',
      starlight: 'A spiral of stars! Ours, now.', warm: 'Warm light, warm spirals, warm everything.',
    },
    boppo: {
      sunshine: 'BOOP! Everything is golden!', wind: 'Wheee! Bouncy breeze!',
      fog: 'Peekaboo, world! Found you!', rain: 'Puddles! Can I? I am going to. Boing!',
      storm: 'Phew! Okay, okay, sunshine time?', moonlight: 'Soft bounce… shiny moon… sleepy Boppo.',
      starlight: 'Stars that bounce! Best stars!', warm: 'Toasty! A happy little bun.',
    },
    pipzi: {
      sunshine: 'Sun sparks! Big ones!', wind: 'Whoosh! The lanterns are dancing!',
      fog: 'Phew. It was getting far too quiet.', rain: 'Fizz! Sparks are back on!',
      storm: 'KAPOW, clear skies! Best thing all day.', moonlight: 'Whisper sparks. Very, very tiny ones.',
      starlight: 'A crown of stars! Best combination!', warm: 'Every lantern lit! KAPOW!',
    },
    loomi: {
      sunshine: 'Sun is out. Nice. Very nice.', wind: 'That is my kind of breeze.',
      fog: 'Mist is gone. I kind of liked it.', rain: 'Rain is done. The water is still nice.',
      storm: 'Oh, was that a storm? Huh.', moonlight: 'Moonlight on the water. No rush.',
      starlight: 'Stars. Quietly impressed over here.', warm: 'Warm and slow. My favourite speed.',
    },
    noomi: {
      sunshine: 'Mmh… bright. Five more minutes?', wind: 'The breeze is humming a lullaby.',
      fog: 'Soft mist, soft dreams.', rain: 'Rain on the water… so sleepy…',
      storm: 'Shh… it is gone. The stars can nap now.', moonlight: 'Moonmilk and slow breaths.',
      starlight: 'I dreamed these stars. Oh, they are real.', warm: 'Warm as a blanket. Mmh.',
    },
  },
});

/** 'The Raindrop Lagoon' → 'Raindrop Lagoon' (subtitles). */
export const realmShort = (name) => String(name || '').replace(/^The\s+/, '');
/** 'The Raindrop Lagoon' → 'the Raindrop Lagoon' (mid-sentence). */
export const realmPhrase = (name) => String(name || '').replace(/^The\s+/, 'the ');

// --------------------------------------------------------------- weathers --
const mood = (a, h, c, w) => Object.freeze({ agitation: a, heaviness: h, clarity: c, warmth: w });
const hosts = (...s) => Object.freeze(Object.fromEntries(REALM_ORDER.map((r, i) => [r, s[i]])));
//                       blue-drift, sunpop, lagoon, moonmilk, spark, spiral, static-storm
const TABLE = {
  //          tool      family    base a/h/c/w                 resolved a/h/c/w             T    hosts                  order
  sunshine: ['sun', 'light', mood(0.10, 0.30, 0.62, 0.62), mood(0.05, 0, 0.95, 0.92), 0.70, hosts(3, 3, 0, 0, 0, 0, 0), ['sunpop-orchard', 'blue-drift']],
  // Wind's base agitation is "live" (.25 + .6·energy + …); 0.55 is that formula at the ambient gusts' half energy.
  wind: ['wind', 'cloud', mood(0.55, 0.12, 0.60, 0.50), mood(0.08, 0.05, 0.82, 0.55), 0.30, hosts(3, 1, 1, 2, 3, 1, 2), ['blue-drift', 'spark-festival', 'moonmilk-cove']],
  fog: ['mist', 'cloud', mood(0.04, 0.50, 0.08, 0.40), mood(0.04, 0.08, 0.88, 0.50), 0.40, hosts(3, 1, 2, 3, 2, 1, 1), ['blue-drift', 'moonmilk-cove', 'raindrop-lagoon']],
  rain: ['rain', 'cloud', mood(0.20, 0.82, 0.35, 0.30), mood(0.05, 0.10, 0.80, 0.55), 0.50, hosts(2, 1, 3, 2, 1, 0, 2), ['raindrop-lagoon', 'blue-drift', 'moonmilk-cove']],
  storm: ['clouds', 'cloud', mood(0.70, 0.70, 0.15, 0.25), mood(0.06, 0.08, 0.85, 0.60), 0.60, hosts(2, 1, 1, 2, 1, 0, 3), ['static-storm', 'blue-drift', 'moonmilk-cove']],
  moonlight: ['moon', 'night', mood(0.08, 0.35, 0.55, 0.40), mood(0.04, 0.05, 0.95, 0.50), 0.60, hosts(0, 0, 0, 3, 2, 0, 0), ['moonmilk-cove', 'spark-festival']],
  starlight: ['stars', 'night', mood(0.06, 0.12, 0.50, 0.45), mood(0.04, 0.02, 1, 0.55), 0.80, hosts(0, 0, 1, 2, 2, 3, 2), ['spiral-observatory', 'moonmilk-cove', 'spark-festival']],
  warm: ['glow', 'light', mood(0.06, 0.20, 0.60, 0.65), mood(0.04, 0, 0.85, 1), 0.75, hosts(2, 2, 2, 2, 3, 1, 1), ['spark-festival', 'moonmilk-cove', 'blue-drift']],
};
// Hold chips: every lead alternative is held (Send a breeze also answers a short tap with one sweep).
export const WEATHERS = Object.freeze(Object.fromEntries(DIAL_ORDER.map((id) => {
  const [tool, family, base, resolved, T, hostScores, order] = TABLE[id], c = COPY.weathers[id];
  return [id, Object.freeze({
    id, label: c.label, hint: c.hint, say: c.say, caption: c.caption, ...(c.captionWater ? { captionWater: c.captionWater } : {}),
    tool, family, base, resolved, T, hosts: hostScores, order: Object.freeze(order), alt: Object.freeze({ label: c.alt, hold: true }),
  })];
})));

/** Entry weather per realm: never Storm, and always a host score of 2 or more there. */
export const ENTRY = Object.freeze({
  'blue-drift': 'wind', 'sunpop-orchard': 'sunshine', 'raindrop-lagoon': 'rain', 'moonmilk-cove': 'moonlight',
  'spark-festival': 'warm', 'spiral-observatory': 'starlight', 'static-storm': 'starlight',
});

/** How well `realmId` can paint weather `w`: 0 (impossible) .. 3 (its home sky). */
export function hostScore(w, realmId) {
  const h = isWeather(w) ? WEATHERS[w].hosts : null;
  return h && Object.hasOwn(h, realmId) ? h[realmId] : 0;
}

/**
 * The realm a weather happens in: stay if the current realm scores ≥ 2 (or ≥ 1
 * when it is home); else home if it scores ≥ 1; else the weather's first choice.
 */
export function pickRealm(w, { current = null, home = null } = {}) {
  if (!isWeather(w)) w = 'starlight';
  const s = hostScore(w, current);
  if (current && (s >= 2 || (current === home && s >= 1))) return current;
  if (home && hostScore(w, home) >= 1) return home;
  return WEATHERS[w].order[0];
}

/** The gentle weather a realm opens with (unknown realms resolve to the Moonmilk Cove, as the Environment does). */
export const entryWeather = (realmId) => (Object.hasOwn(ENTRY, realmId) ? ENTRY[realmId] : 'moonlight');

// ------------------------------------------------------------ mood recipe --
const EMPTY = Object.freeze({});

/**
 * The realm mood for weather `w` at `progress` (0..1), written into `out` (no allocation).
 * live: { energy, turb, calm (wind field), height, painted (sun pool), hearth (0..1) }; missing → nominal.
 *   k = smoothstep(progress); every axis lerps base → resolved by k, then the live terms and the tweaks:
 *   static-storm storm agitation ≤ .32 (no auto bolts: the lab schedules strikes), spark rain/storm
 *   heaviness ≤ .45 and warmth + .15 (the fair stays partly lit), gentle style agitation ≤ .30.
 */
export function moodFor(w, progress, live = null, realmId = null, { gentle = false } = {}, out = {}) {
  const W = WEATHERS[isWeather(w) ? w : 'starlight'], b = W.base, r = W.resolved, L = live || EMPTY;
  const k = smoothstep(0, 1, clamp(num(progress, 0), 0, 1));
  let a = lerp(b.agitation, r.agitation, k), h = lerp(b.heaviness, r.heaviness, k);
  let c = lerp(b.clarity, r.clarity, k), wa = lerp(b.warmth, r.warmth, k);
  const e = num(L.energy, NaN);
  if (W.id === 'wind') {
    if (Number.isFinite(e)) a = lerp(0.25 + 0.6 * clamp(e, 0, 1) + 0.15 * clamp(num(L.turb, 0), 0, 1) - 0.2 * clamp(num(L.calm, 0), 0, 1), r.agitation, k);
  } else if (W.id !== 'storm' && Number.isFinite(e)) a += 0.35 * clamp(e, 0, 1);
  if (W.id === 'sunshine') {
    const ht = clamp(num(L.height, 0.5), 0, 1);
    wa += 0.12 * (1 - ht) - 0.04;
    c += 0.05 * ht;
    h = lerp(b.heaviness * (1 - clamp(num(L.painted, 0), 0, 1)), r.heaviness, k);
  }
  if (W.id === 'warm') wa += 0.1 * clamp(num(L.hearth, 0), 0, 1);
  if (realmId === 'static-storm' && W.id === 'storm') a = Math.min(a, 0.32);
  if (realmId === 'spark-festival' && (W.id === 'rain' || W.id === 'storm')) { h = Math.min(h, 0.45); wa += 0.15; }
  if (gentle) a = Math.min(a, 0.3);
  out.agitation = clamp(a, 0, 1); out.heaviness = clamp(h, 0, 1); out.clarity = clamp(c, 0, 1); out.warmth = clamp(wa, 0, 1);
  return out;
}

/** The realm transform (its authored resolution): T · smoothstep(.45, 1, progress), or T once resolved. */
export function transformFor(w, progress, resolved = false) {
  const T = WEATHERS[isWeather(w) ? w : 'starlight'].T;
  return resolved ? T : T * smoothstep(0.45, 1, clamp(num(progress, 0), 0, 1));
}

// ----------------------------------------------------------------- pulses --
const PULSE = Object.freeze({
  touch: 'tap', 'water-push': 'ripple', shore: 'tap', 'gust-water': 'ripple', 'splash-ground': 'tap', 'splash-body': null,
  gap: 'clear', constellation: 'success', gift: 'success', kindle: 'tap', hearth: 'success',
});
const RESOLVE_PULSE = Object.freeze({ storm: 'clear', rain: 'clear', fog: 'clear', wind: 'clear', sunshine: 'success', moonlight: 'success', starlight: 'success', warm: 'success' });
export const PULSE_EVENTS = Object.freeze([...Object.keys(PULSE), 'bead-up', 'splash-water', 'strike', 'sun-rest', 'moon-rest', 'resolved']);

/**
 * The realm pulse that answers a weather event, or null for none.
 * opts: reduced, gentle (no static-storm bolts), n (drops in a bead: ≥ 8 bursts on water), weather (for 'resolved').
 * 'strike' only ever comes back for the storm strike (static-storm), a resting sun (day realms) and a resting moon (Moonmilk).
 */
export function pulseFor(event, realmId, { reduced = false, gentle = false, n = 0, weather = null } = {}) {
  switch (event) {
    case 'bead-up': return realmId === 'spark-festival' ? 'tap' : 'success';   // spark's success is a firework: too much for one bead
    case 'splash-water': return n >= 8 ? 'burst' : 'ripple';
    case 'strike': return realmId === 'static-storm' && !reduced && !gentle ? 'strike' : null;
    case 'sun-rest': return DAY_REALMS.includes(realmId) ? 'strike' : null;
    case 'moon-rest': return realmId === 'moonmilk-cove' ? 'strike' : realmId === 'spark-festival' ? 'tap' : null;
    case 'resolved': return isWeather(weather) ? RESOLVE_PULSE[weather] : null;
    default: return Object.hasOwn(PULSE, event) ? PULSE[event] : null;
  }
}

// ---------------------------------------------------------------- pointers --
// A claimed (off-Mallow) pointer is a tap (< 220 ms, < 10 px), a hold (still for 220 ms,
// ≤ 12 px) or a drag (> 10 px before it became a hold, or > 12 px). A release at
// ≥ 700 px/s is a fling. features/weather/tools.js keeps one track per pointer.
export const POINTER = Object.freeze({ tapMs: 220, tapPx: 10, holdMs: 220, holdSlop: 12, fling: 700 });

/**
 * track: {t0, x0, y0, x, y, maxDist?, up?, tUp?} (ms, px; maxDist = furthest travel from the start).
 * → 'pending' | 'tap' | 'hold' | 'drag'
 */
export function classify(track, nowMs) {
  const d = Number.isFinite(track.maxDist) ? track.maxDist : Math.hypot(track.x - track.x0, track.y - track.y0);
  const dur = (track.up && Number.isFinite(track.tUp) ? track.tUp : nowMs) - track.t0;
  if (d > POINTER.holdSlop || (d > POINTER.tapPx && dur < POINTER.holdMs)) return 'drag';
  if (dur >= POINTER.holdMs) return 'hold';
  return track.up ? 'tap' : 'pending';
}

/** Is a release velocity a fling? */
export const isFling = (vx, vy) => Math.hypot(vx || 0, vy || 0) >= POINTER.fling;

// --------------------------------------------------------------- progress --
/**
 * How far weather `w` has been reshaped (0..1) from the sim metrics:
 * sunshine max(painted/.7, bask/5) · wind calm · fog fogClear/.75 · rain (1 − rainLevel)/.85
 * (so it settles at rainLevel ≤ .15) · storm clear/.7 · moonlight dwell · starlight constellations/3 · warm heat.
 */
export function progressFor(w, m = EMPTY) {
  switch (w) {
    case 'sunshine': return clamp(Math.max(num(m.painted, 0) / 0.7, num(m.bask, 0) / 5), 0, 1);
    case 'wind': return clamp(num(m.calm, 0), 0, 1);
    case 'fog': return clamp(num(m.fogClear, 0) / 0.75, 0, 1);
    case 'rain': return clamp((1 - num(m.rainLevel, 1)) / 0.85, 0, 1);
    case 'storm': return clamp(num(m.clear, 0) / 0.7, 0, 1);
    case 'moonlight': return clamp(num(m.dwell, 0), 0, 1);
    case 'starlight': return clamp(num(m.constellations, 0) / 3, 0, 1);
    case 'warm': return clamp(num(m.heat, 0), 0, 1);
    default: return 0;
  }
}

/** The resolve caption: the water variant where the realm has water and the weather has one. */
export function captionFor(w, realmId) {
  const W = WEATHERS[isWeather(w) ? w : 'starlight'];
  return W.captionWater && WATER_REALMS.includes(realmId) ? W.captionWater : W.caption;
}

/** The Mallow's line for a settled weather (falls back to the caption). */
export function lineFor(mallowId, w) {
  const l = Object.hasOwn(COPY.lines, mallowId) ? COPY.lines[mallowId] : null;
  return (l && isWeather(w) && l[w]) || '';
}

// -------------------------------------------------------- transition plan --
// Same-realm pick → a turn: the old weather leaves over 1.2 s while the new one
// enters over 1.5 s from 0.3 s. Another realm → a weather front: cover (0.9 s,
// 0.7 s on the low tier), swap once cover ≥ 0.95 and two frames have painted it,
// then reveal (1.4 s; a drag pushes it, never under 0.5 s). Reduced motion: the
// front is a fade (0.6 s in, 0.9 s out). Presence is tracked per weather, so any
// retarget continues from the current amounts and nothing jumps.
export const TIMING = Object.freeze({
  leave: 1.2, enter: 1.5, delay: 0.3, arrive: 1.2, againOut: 0.35,
  cover: 0.9, coverLow: 0.7, coverMin: 0.6, reveal: 1.4, revealMin: 0.5, fadeIn: 0.6, fadeOut: 0.9,
  swapAt: 0.95, swapFrames: 2, keyWait: 0.35,
});

export class TransitionPlanner {
  /**
   * @param {{reduced?:boolean, tier?:string, speed?:number, weather?:string|null, realm?:string|null,
   *          pick?:((to:string, currentRealm:string)=>string)|null}} [o]
   *   speed: Comfort DNA pace (÷ on enter and leave durations only; front timings are photosafety bounds).
   *   pick: recomputes the realm for a queued or key-delayed pick when it finally runs (else its own toRealm).
   */
  constructor({ reduced = false, tier = 'medium', speed = 1, weather = null, realm = null, pick = null } = {}) {
    this.reduced = !!reduced;
    this.tier = tier;
    this.speed = clamp(num(speed, 1), 0.5, 2);
    this.pick = typeof pick === 'function' ? pick : null;
    this.amt = new Float32Array(DIAL_ORDER.length);   // presence of each weather, 0..1
    this.weather = isWeather(weather) ? weather : null;
    this.realm = realm;
    if (this.weather) this.amt[IDX[this.weather]] = 1;
    this.phase = 'idle';
    this.cover = 0;
    this.toRealm = null;
    this.dir = 1;
    this.swaps = 0;
    this.requests = 0;
    this._enterDur = TIMING.enter;
    this._delay = 0;
    this._from = -1;          // the main leaving weather (for leaveK)
    this._frames = 0;         // frames painted at full cover before the swap
    this._coverT = 0;
    this._revealT = 0;
    this._boost = 0;          // drag push, decays
    this._queued = null;      // one request during swap / reveal (latest wins)
    this._pending = null;     // a key pick that changes realm waits 350 ms
    this._instant = false;
    this.out = { phase: 'idle', k: 1, cover: 0, swapNow: false, resetNow: false, leaveK: 1, enterK: 1,
      from: null, to: this.weather, realm, toRealm: null, mode: this.reduced ? 'fade' : 'sweep', dir: 1 };
  }

  get busy() { return this.phase !== 'idle' || !!this._pending || !!this._queued; }
  amount(w) { return isWeather(w) ? this.amt[IDX[w]] : 0; }
  setReduced(b) { this.reduced = !!b; }
  setTier(t) { this.tier = t; }
  setSpeed(k) { this.speed = clamp(num(k, 1), 0.5, 2); }
  /** Finish whatever is under way as fast as possible (tests and debug; swapNow still fires once). */
  finish() { this._instant = true; if (this._pending) { this._pending.wait = 0; } }

  /** First weather of a session: it enters from nothing over 1.2 s (no front). */
  arrive(w, realm) {
    this.amt.fill(0);
    this.weather = isWeather(w) ? w : 'starlight';
    this.realm = realm ?? this.realm;
    this.toRealm = null; this.cover = 0; this._queued = null; this._pending = null;
    this.phase = 'turn';
    this._enterDur = TIMING.arrive / this.speed;
    this._delay = 0;
    this._from = -1;
    return 'turn';
  }

  /** Again: the current weather leaves quickly, the step it is gone reports resetNow, then it enters again. */
  again() {
    if (!this.weather || this.phase === 'cover' || this.phase === 'swap') return 'none';
    this.phase = 'again';
    return 'again';
  }

  /**
   * A dial pick. → 'turn' (same realm), 'front' (another realm), 'queued' (during swap / reveal, or a key
   * pick that changes realm, which waits 350 ms) or 'cancelled-swap' (during cover, back to a weather
   * the old realm can host: the front uncovers without swapping).
   */
  request({ from = null, to, fromRealm = null, toRealm = null, dir = 0, viaKey = false } = {}) {
    if (!isWeather(to)) return 'none';
    this.requests++;
    if (this.realm == null) this.realm = fromRealm ?? toRealm;
    if (!this.weather && isWeather(from)) { this.weather = from; this.amt[IDX[from]] = Math.max(this.amt[IDX[from]], 1); }
    toRealm = toRealm ?? this.realm;
    const d = dir ? Math.sign(dir) : Math.sign(IDX[to] - (this.weather ? IDX[this.weather] : IDX[to])) || this.dir;
    const p = this.phase;
    if (viaKey && toRealm !== this.realm && (p === 'idle' || p === 'turn' || p === 'again')) {
      this._pending = { to, toRealm, dir: d, wait: TIMING.keyWait };
      return 'queued';
    }
    this._pending = null;
    if (p === 'swap' || (p === 'reveal' && toRealm !== this.realm)) {
      this._queued = { to, toRealm, dir: d };
      return 'queued';
    }
    this._queued = null;
    if (p === 'reveal') { this._retarget(to, d); return 'turn'; }
    if (p === 'cover') {
      if (toRealm === this.realm) {   // the old realm can host it after all
        this.toRealm = null;
        this.phase = 'reveal';
        this._revealT = 0;
        this._retarget(to, d);
        return 'cancelled-swap';
      }
      this.toRealm = toRealm;
      this.weather = to;
      this.dir = d;
      return 'front';
    }
    if (toRealm === this.realm) {
      if (to === this.weather && p === 'idle') return 'none';
      if (to === this.weather && p === 'turn') return 'turn';   // already entering: keep its timing
      this._retarget(to, d);
      this.phase = 'turn';
      return 'turn';
    }
    this.weather = to;
    this.dir = d;
    this.toRealm = toRealm;
    this.phase = 'cover';
    this._coverT = 0;
    this._frames = 0;
    this._from = this._mainOther();
    return 'front';
  }

  /** A drag on the front (px/s) pushes cover and reveal faster. */
  drag(pxPerSec) { this._boost = Math.max(this._boost, clamp(Math.abs(num(pxPerSec, 0)) / 600, 0, 2)); }

  _retarget(to, d) {
    this.weather = to;
    this.dir = d;
    this._from = this._mainOther();
    this._enterDur = TIMING.enter / this.speed;
    this._delay = this.amt[IDX[to]] < 0.01 ? TIMING.delay / this.speed : 0;
  }

  _mainOther() {
    const ti = this.weather ? IDX[this.weather] : -1;
    let best = -1, a = 0;
    for (let i = 0; i < this.amt.length; i++) if (i !== ti && this.amt[i] > a) { a = this.amt[i]; best = i; }
    return best;
  }

  /** Presence: the target grows (after its delay), everything else leaves; a third weather leaves 3× faster. */
  _amounts(dt, grow, leaveDur) {
    const ti = this.weather ? IDX[this.weather] : -1, main = this._mainOther();
    const rate = dt / Math.max(1e-3, leaveDur);
    for (let i = 0; i < this.amt.length; i++) {
      if (i === ti) {
        if (!grow) continue;
        if (this._delay > 0) { this._delay -= dt; if (this._delay > 0) continue; }
        this.amt[i] = Math.min(1, this.amt[i] + dt / Math.max(1e-3, this._enterDur));
      } else if (this.amt[i] > 0) {
        this.amt[i] = Math.max(0, this.amt[i] - rate * (i === main ? 1 : 3));
      }
    }
  }

  _settled() {
    const ti = this.weather ? IDX[this.weather] : -1;
    for (let i = 0; i < this.amt.length; i++) if (i === ti ? this.amt[i] < 1 : this.amt[i] > 0) return false;
    return true;
  }

  /** Advance by dt seconds (sim time). Returns the reused step object. */
  step(dt) {
    dt = clamp(num(dt, 0), 0, 0.25);
    const o = this.out, inst = this._instant;
    if (inst) dt = Math.max(dt, 0.25);
    o.swapNow = false; o.resetNow = false;
    if (this._pending) {
      this._pending.wait -= dt;
      if (this._pending.wait <= 0 || inst) {
        const q = this._pending;
        this._pending = null;
        this.request({ to: q.to, toRealm: this.pick ? this.pick(q.to, this.realm) : q.toRealm, dir: q.dir });
      }
    }
    const boost = 1 + this._boost;
    this._boost *= Math.exp(-dt / 0.25);
    const leaveDur = TIMING.leave / this.speed;
    switch (this.phase) {
      case 'turn':
        this._amounts(inst ? 10 : dt, true, inst ? 1e-3 : leaveDur);
        if (this._settled()) this.phase = 'idle';
        break;
      case 'again': {
        const i = IDX[this.weather];
        this.amt[i] = Math.max(0, this.amt[i] - (inst ? 1 : dt / TIMING.againOut));
        this._amounts(dt, false, inst ? 1e-3 : leaveDur);
        if (this.amt[i] <= 0) {
          o.resetNow = true;
          this.phase = 'turn';
          this._enterDur = TIMING.arrive / this.speed;
          this._delay = 0;
        }
        break;
      }
      case 'cover': case 'swap': {
        const dur = this.reduced ? TIMING.fadeIn : this.tier === 'low' ? TIMING.coverLow : TIMING.cover;
        this._coverT += dt;
        // pushed faster by a drag, but the front's alpha never changes in under 0.6 s
        const cap = inst ? 1 : clamp(this._coverT / TIMING.coverMin, 0, 1);
        this.cover = Math.min(1, cap, this.cover + (inst ? 1 : dt * boost / dur));
        this._amounts(dt, false, inst ? 1e-3 : Math.min(leaveDur, dur));
        if (this.phase === 'cover' && this.cover >= TIMING.swapAt) { this.phase = 'swap'; this._frames = 0; }
        else if (this.phase === 'swap' && ++this._frames > (inst ? 0 : TIMING.swapFrames)) {
          o.swapNow = true;          // the feature mounts the new realm on exactly this step
          this.swaps++;
          this.realm = this.toRealm;
          this.toRealm = null;
          this.amt.fill(0);          // hidden under a full front
          this._from = -1;
          this._enterDur = TIMING.enter / this.speed;
          this._delay = 0;
          this.phase = 'reveal';
          this._revealT = 0;
        }
        break;
      }
      case 'reveal': {
        const dur = this.reduced ? TIMING.fadeOut : TIMING.reveal;
        this._revealT += dt;
        const floor = inst ? 0 : 1 - this._revealT / TIMING.revealMin;    // never under 0.5 s in all
        this.cover = clamp(Math.max(floor, this.cover - (inst ? 1 : dt * boost / dur)), 0, 1);
        this._amounts(inst ? 10 : dt, true, inst ? 1e-3 : leaveDur);
        if (this.cover <= 0) {
          this.phase = this._settled() ? 'idle' : 'turn';
          const q = this._queued;
          this._queued = null;
          if (q) this.request({ to: q.to, toRealm: this.pick ? this.pick(q.to, this.realm) : q.toRealm, dir: q.dir });
        }
        break;
      }
      default: break;
    }
    if (this.phase === 'idle' && !this._pending && !this._queued) this._instant = false;
    const ti = this.weather ? IDX[this.weather] : -1;
    o.phase = this.phase;
    o.cover = this.cover;
    o.enterK = ti >= 0 ? this.amt[ti] : 1;
    o.leaveK = this._from >= 0 ? 1 - this.amt[this._from] : 1;
    o.from = this._from >= 0 ? DIAL_ORDER[this._from] : null;
    o.to = this.weather;
    o.realm = this.realm;
    o.toRealm = this.toRealm;
    o.mode = this.reduced ? 'fade' : 'sweep';
    o.dir = this.dir;
    o.k = this.phase === 'cover' || this.phase === 'swap' ? this.cover : this.phase === 'reveal' ? 1 - this.cover : o.enterK;
    return o;
  }

  snapshot() {
    const amounts = {};
    for (let i = 0; i < DIAL_ORDER.length; i++) if (this.amt[i] > 0) amounts[DIAL_ORDER[i]] = +this.amt[i].toFixed(3);
    return { phase: this.phase, cover: +this.cover.toFixed(3), weather: this.weather, realm: this.realm, toRealm: this.toRealm,
      dir: this.dir, swaps: this.swaps, queued: this._queued?.to || null, pending: this._pending?.to || null,
      reduced: this.reduced, mode: this.reduced ? 'fade' : 'sweep', amounts };
  }
}

// ----------------------------------------------------------------- session --
// booting → arriving (elements enter 1.2 s) → live, with turning / fronting while a
// pick plays out; resolved is a latched flag; leaving is final; paused while hidden.
export class WeatherSession {
  /**
   * @param {{home:string, weather?:string|null, reduced?:boolean, tier?:string, speed?:number}} o
   *   weather: the session's last weather, else the home realm's entry weather.
   */
  constructor({ home, weather = null, reduced = false, tier = 'medium', speed = 1 } = {}) {
    this.home = home;
    this.weather = isWeather(weather) ? weather : entryWeather(home);
    this.realm = pickRealm(this.weather, { current: null, home });
    this.state = 'booting';
    this.progress = 0;
    this.resolved = false;
    this.t = 0;
    this.planner = new TransitionPlanner({ reduced, tier, speed, pick: (w, cur) => pickRealm(w, { current: cur, home: this.home }) });
    this.resolvedNow = false;   // true for the one update that resolved
    this.arrivedNow = false;    // true for the one update the main element reached 80 % (arrival reaction)
    this.swapNow = false;
    this.resetNow = false;
    this._arrived = false;
    this._fronting = false;
    this._prev = 'live';
  }

  /** Start (first layout): the start weather enters in its realm. */
  begin() {
    this.planner.arrive(this.weather, this.realm);
    this.state = 'arriving';
    this._arrived = false;
    return this.state;
  }

  /**
   * A dial pick (or a re-pick of the settled weather, which is Again).
   * → 'turn' | 'front' | 'queued' | 'cancelled-swap' | 'again' | 'none'
   */
  choose(w, { dir = 0, viaKey = false } = {}) {
    if (!isWeather(w) || this.state === 'leaving' || this.state === 'booting') return 'none';
    if (w === this.weather && !this.planner.busy) return this.again();
    const cur = this.planner.realm;
    const toRealm = pickRealm(w, { current: cur, home: this.home });
    const r = this.planner.request({ to: w, toRealm, dir, viaKey });
    if (r === 'none') return r;
    if (r !== 'queued') this._switch(w);
    return r;
  }

  _switch(w) {
    if (w !== this.weather) { this.weather = w; this.progress = 0; this.resolved = false; }
    this._arrived = false;
  }

  again() {
    if (this.state === 'leaving' || this.state === 'booting') return 'none';
    const r = this.planner.again();
    if (r === 'none') return r;
    this.progress = 0;
    this.resolved = false;
    this._arrived = false;
    this.state = 'turning';
    return 'again';
  }

  /**
   * Advance by dt (sim seconds) with the raw progress from the sim metrics.
   * Returns the planner's step; read resolvedNow / arrivedNow / swapNow / resetNow after it.
   */
  update(dt, raw = 0) {
    this.resolvedNow = this.arrivedNow = this.swapNow = this.resetNow = false;
    if (this.state === 'leaving' || this.state === 'paused' || this.state === 'booting') return this.planner.out;
    this.t += dt;
    const before = this.planner.weather;
    const s = this.planner.step(dt);
    const switched = !!s.to && s.to !== before;
    if (switched) this._switch(s.to);   // a queued pick that just ran
    this.swapNow = s.swapNow;
    this.resetNow = s.resetNow;
    if (s.swapNow) this.realm = s.realm;
    if (s.resetNow) { this.progress = 0; this.resolved = false; }
    // a front lasts from cover until its reveal ends (a cancelled swap uncovers without one)
    this._fronting = s.phase === 'cover' || s.phase === 'swap' || (this._fronting && s.phase === 'reveal');
    this.state = s.phase === 'idle' ? 'live' : this._fronting ? 'fronting' : this.state === 'arriving' ? 'arriving' : 'turning';
    if (!this._arrived && s.phase !== 'cover' && s.phase !== 'swap' && s.phase !== 'again' && s.enterK >= 0.8) {
      this._arrived = true;
      this.arrivedNow = true;
    }
    // raw belongs to the world before this step: never count it on a step that switched or reset the weather
    if (!this.resolved && !switched && !s.resetNow && s.phase !== 'cover' && s.phase !== 'swap' && s.phase !== 'again') {
      this.progress = clamp(num(raw, 0), 0, 1);
      if (this.progress >= 1) { this.resolved = true; this.resolvedNow = true; }
    }
    if (this.resolved) this.progress = 1;
    return s;
  }

  leave() { this.state = 'leaving'; }
  pause() { if (this.state !== 'paused' && this.state !== 'leaving') { this._prev = this.state; this.state = 'paused'; } }
  resume() { if (this.state === 'paused') this.state = this._prev; }

  snapshot() {
    return { state: this.state, weather: this.weather, realm: this.realm, home: this.home, progress: +this.progress.toFixed(3),
      resolved: this.resolved, planner: this.planner.snapshot() };
  }
}
