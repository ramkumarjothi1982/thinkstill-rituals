// Mallow Nightlight: the five modes (DOM-free; they act through the api the
// screen hands them, so all timing is on the rig's frame clock).
//
//   Moonlight          its own aura is the nightlight: a slow glow, a touch-lamp swell, a look up at its world's light
//   Breathing Together a slow breath it shares with you; a held press, H, B or the chip leads the inhale
//   Sleepy Companion   the seeded evening: blinks, peeks, yawns, stretches, settles, nods and dreams as it gets drowsy
//   Ambient Drift      fireflies, slow clouds and a gently sliding world (live for a while on capable devices)
//   Quiet Company      just company: almost no movement, silent unless you ask for sound
//
// Every mode rests at intensity ≥ 0.62 (which keeps the rig's own idle hops
// and sparks asleep), owns the face mixer's 'mode' layer, and returns
// { tick(dt, t), event(e, ts), setMotion(m), stop() }. stop() releases what it
// set and lets squeeze and inflate ease back to 0. `t` is the session clock in
// ms (wall time, with the debug skew): Drift's live time is measured on it,
// so a slow or hidden device never keeps the live realm longer. `ts` is the
// event's wall time in seconds (a hold is a human gesture: "held for 4 s" is
// real seconds). Without either, the mode's frame clock stands in.
//
// The api (features/nightlight.js): { id, ways, rig, companion, face, sky,
// world, bed, pacer, limiter, moments, rand, look, levels, rules(), motion(),
// speedK(), timing(), quality(), phase(), settings(), warm(), light(),
// caption(text, ms), setQuiet(b), rest(r), inflateK() }. rest(r) sets the
// mode's resting face (the screen may hold the asleep face over it while the
// light fades); inflateK() is the fade's scale on the breath's depth.

import { COPY } from './copy.js';
import { NIGHT_CAPS } from '../../core/frame-pacer.js';
import { restFor, peekFor, PEEK_S, SLEEPY_PEEK, STRETCH_STYLES } from './ways.js';
import { BreathPacer, SleepyScript, rampFor, STRETCH } from './pacing.js';
import { clamp, lerp, TAU, hash } from '../../core/math.js';

const F = Object.freeze;
const eis = (k) => 0.5 - 0.5 * Math.cos(Math.PI * clamp(k, 0, 1));   // easeInOutSine
const def = (id, o) => F({ id, label: COPY.modes[id].label, name: COPY.modes[id].name, line: COPY.modes[id].line, cap: NIGHT_CAPS[id], ...o });
// the mode's resting face, through the screen when it offers rest() (it holds the asleep face during the fade)
const setRest = (api, r) => { if (api.rest) api.rest(r); else api.companion.restOverride = r; };

/**
 * The modes as data. bed: the night bed's { factor, pad, texture } split
 * (features/nightlight/bed.js); sky: NightSky.configure() mix; chip: the
 * status row's contextual chip while the mode runs.
 */
export const MODES = F({
  moonlight: def('moonlight', { bed: F({ factor: 1, pad: 0.6, texture: 0.4 }), sky: F({ halo: 1.35, pool: 1.2, twinkles: 8, fireflies: 0, clouds: 0, animated: true }), chip: null }),   // its own light: the strongest halo
  breathe: def('breathe', { bed: F({ factor: 0.9, pad: 0.5, texture: 0.5 }), sky: F({ halo: 1, pool: 0.8, twinkles: 4, fireflies: 0, clouds: 0, animated: true }), chip: 'breathe' }),
  sleepy: def('sleepy', { bed: F({ factor: 0.8, pad: 0.6, texture: 0.4 }), sky: F({ halo: 0.6, pool: 0.6, twinkles: 6, fireflies: 3, clouds: 0, animated: true }), chip: null }),
  drift: def('drift', { bed: F({ factor: 1, pad: 0.3, texture: 0.7 }), sky: F({ halo: 0.7, pool: 0.7, twinkles: 14, fireflies: 8, clouds: 3, animated: true }), chip: null }),
  quiet: def('quiet', { bed: F({ factor: 0.5, pad: 1, texture: 0 }), sky: F({ halo: 0.8, pool: 0.6, twinkles: 0, fireflies: 0, clouds: 0, animated: false }), chip: 'sound' }),
});

/** Touches that count as company (they wake a sleepy Mallow a little and keep Drift's live realm running). */
export const TOUCHES = F(['tap', 'doubletap', 'hold', 'stroke', 'drag', 'squeeze', 'release', 'press', 'offtap']);
export const SWELL = F({ k: 0.4, riseS: 0.6, fallS: 4, holdS: 0.2, extendS: 0.6, maxHoldS: 3 });   // Moonlight's touch lamp
export const LIVE = F({ firstS: 180, touchS: 45 });                                                   // Drift's live realm: first, after a touch
export const GLOW_K = 1.3;                                                                            // Moonlight's aura × look.glow

// ------------------------------------------------------------ timeline --
/** Callbacks on the frame clock (paused while hidden, never caught up). */
export class Timeline {
  constructor() { this.t = 0; this.items = []; }
  add(sec, fn) { this.items.push({ at: this.t + Math.max(0, +sec || 0), fn }); return this; }
  step(dt) {
    this.t += Math.max(0, +dt || 0);
    const L = this.items;
    for (;;) {   // due callbacks in time order (a callback may add more)
      let k = -1;
      for (let i = 0; i < L.length; i++) if (L[i].at <= this.t && (k < 0 || L[i].at < L[k].at)) k = i;
      if (k < 0) return;
      L.splice(k, 1)[0].fn();
    }
  }
  clear() { this.items.length = 0; }
  get size() { return this.items.length; }
}

// ------------------------------------------------------------- moments --
/**
 * Plays a Mallow's authored moments (NIGHT_WAYS greet, answer, dream,
 * stillHere): overlays, face floors and values for a while, a whisper of
 * particles, a small body nudge. Session-level (survives mode changes).
 * Each kind owns face-mixer layers 'ev:<kind>' (floors), 'evs:<kind>'
 * (values) and 'evo:<kind>' (pinned overlay keys); a replay restarts its own
 * release, never someone else's.
 */
export class Moments {
  constructor(api) { this.api = api; this.tl = new Timeline(); this.tokens = new Map(); this.played = []; }

  step(dt) { this.tl.step(dt); }

  play(spec) {
    if (!spec) return 0;
    const { rig, face, pacer } = this.api, rules = this.api.rules(), kind = spec.kind || 'moment';
    const dur = spec.dur ?? 1.6;
    this.played.push(kind); if (this.played.length > 12) this.played.shift();
    pacer.event(dur * 1000 + 300);
    if (kind === 'peek') { rig.peek(null, null, PEEK_S); return PEEK_S; }
    if (kind === 'yawn') { rig.react('yawn'); return 2.4; }
    if (kind === 'bounces') {   // softer each time, then stillness (never a hop)
      if (rules.impulses) (spec.squash || []).forEach((s, i) => this.tl.add(i * (spec.gap ?? 0.7), () => rig.nudge({ squash: s })));
      return (spec.squash?.length || 1) * (spec.gap ?? 0.7);
    }
    if (spec.overlay) this.overlay(kind, spec.overlay, dur);
    if (spec.min || spec.glowAdd) {
      const owner = `ev:${kind}`;
      face.release(owner);
      for (const k in spec.min || {}) face.min(owner, k, spec.min[k]);
      if (spec.glowAdd) face.min(owner, 'glow', this.api.look.glow + spec.glowAdd);
      this._releaseAfter(owner, dur);
    }
    if (spec.set) {
      const owner = `evs:${kind}`;
      face.release(owner);
      for (const k in spec.set) face.set(owner, k, spec.set[k]);
      this._releaseAfter(owner, spec.setDur ?? dur);
    }
    if (spec.burst && rules.animated && rig.opts.particles) rig.particles.burst(spec.burst);
    if (spec.nudge && rules.impulses) rig.nudge(spec.nudge);
    return dur;
  }

  /**
   * A timed face overlay. The face mixer's `set` values are applied after the
   * rig's overlays, so keys the night base pins (Zuzu's spin, Glitzi's glitch,
   * Pipzi's sparks) go through a mixer layer for the moment instead; the rig's
   * springs still ease them in and out.
   */
  overlay(kind, params, dur) {
    const { rig, face } = this.api, pinned = face.out.set;
    let over = null, setOwner = null;
    for (const k in params) {
      if (k in pinned) { setOwner ||= `evo:${kind}`; face.set(setOwner, k, params[k]); }
      else (over ||= {})[k] = params[k];
    }
    if (over) rig.overlay(`nl-${kind}`, over, dur);
    if (setOwner) this._releaseAfter(setOwner, dur * 0.8);
  }

  /** Drop every pending release and every layer the moments own. */
  clear() {
    this.tl.clear();
    for (const l of this.api.face.layers) if (/^ev[so]?:/.test(l.owner)) this.api.face.release(l.owner);
    this.tokens.clear();
  }

  _releaseAfter(owner, s) {
    const tok = (this.tokens.get(owner) || 0) + 1;
    this.tokens.set(owner, tok);
    this.tl.add(s, () => { if (this.tokens.get(owner) === tok) this.api.face.release(owner); });
  }
}

// --------------------------------------------------------------- modes --
/** Start mode `id` with the screen's api → its controller. */
export function startMode(id, api) {
  const make = Object.hasOwn(BUILD, id) ? BUILD[id] : BUILD.moonlight;
  const ctl = make(api);
  ctl.id = Object.hasOwn(BUILD, id) ? id : 'moonlight';
  return ctl;
}

const BUILD = {
  // ----------------------------------------------------------- Moonlight --
  moonlight(api) {
    const { rig, face, sky } = api;
    setRest(api, restFor('moonlight'));
    let t = 0, ph = 0, swell = null, nextLook = (40 + api.rand() * 30) * api.speedK(), lookUntil = -1;
    const swellAt = () => {
      if (!swell) return 0;
      const s = t - swell.t0, up = swell.rise, top = up + swell.hold;
      if (s < up) return swell.k * eis(s / up);
      if (s < top) return swell.k;
      if (s < top + SWELL.fallS) return swell.k * (1 - eis((s - top) / SWELL.fallS));
      swell = null;
      return 0;
    };
    return {
      get swell() { return swellAt(); },
      tick(dt) {
        t += dt;
        const K = api.speedK(), sw = swellAt();
        ph += dt / (14 * K);   // the glow's phase: a Speed change alters its rate, never jumps it
        const wave = Math.sin(TAU * ph);
        // the glow mode: a stronger aura than the others (≤ 0.8 × look.glow), and a halo that breathes ±20 % over ≥ 14 s
        face.min('mode', 'glow', api.look.glow * GLOW_K * (1 + 0.12 * wave) + sw + api.warm());
        sky.setHaloGain((1 + 0.2 * wave) * (1 + 0.8 * sw));
        // every 40–70 s it looks up at its world's light for 3 s
        if (t >= nextLook) {
          nextLook = t + (40 + api.rand() * 30) * K;
          if (api.rules().scripted && api.phase() !== 'fading') { lookUntil = t + 3; api.pacer.event(3000); }
        }
        if (t < lookUntil) { const L = api.light(); rig.lookAtScreen(L.x, L.y); }
      },
      event(e) {
        if (e.type !== 'tap') return;
        // the touch lamp: a photosafe swell (≤ 1 start per 2 s); extra taps only hold it longer
        const g = api.limiter.request(SWELL.k, { riseMs: SWELL.riseS * 1000 });
        if (g) swell = { k: g.k, t0: t, rise: g.riseMs / 1000, hold: SWELL.holdS };
        else if (swell) swell.hold = Math.min(SWELL.maxHoldS, swell.hold + SWELL.extendS);
      },
      setMotion() {},
      stop() { face.release('mode'); sky.setHaloGain(1); },
    };
  },

  // -------------------------------------------------- Breathing Together --
  breathe(api) {
    const { rig, face, sky } = api;
    setRest(api, restFor('breathe'));
    const tm = api.timing();
    const pacer = new BreathPacer({ inhale: tm.inhale, exhale: tm.exhale, speedK: api.speedK() });
    const leads = new Set();
    let first = true;
    face.set('mode', 'breath', 0);   // the rig's own breathing bob stops: this breath is the one that shows
    const lead = (src, on) => { if (on) leads.add(src); else leads.delete(src); pacer.lead(leads.size > 0); };
    const caption = (phase) => {
      if (pacer.cycle > 1) return;    // the first two cycles only
      const text = phase === 'in' ? COPY.captions.in : phase === 'out' ? COPY.captions.out : null;
      if (text) api.caption(text, Math.min(4000, (phase === 'in' ? pacer.inhale : pacer.exhale) * pacer.speedK * 1000));
    };
    return {
      breath: pacer,
      tick(dt) {
        pacer.setSpeed(api.speedK());
        const st = pacer.step(dt), rules = api.rules();
        if (first || st.turned) {
          caption(first ? 'in' : st.phase);
          api.bed?.breathe(st.phase, pacer.duration);   // the night's texture swells with the in-breath
          first = false;
        }
        rig.setInflate(st.level * rules.inflate * (api.inflateK?.() ?? 1));
        const out = st.phase === 'out';
        face.set('mode', 'mouthRound', out ? 0.3 : null);
        face.set('mode', 'mouthOpen', out ? 0.1 : null);
        face.min('mode', 'browY', st.phase === 'holdIn' ? 0.06 : null);   // brows lift a little at the top
        face.min('mode', 'glow', 0.3 + 0.4 * st.level + api.warm());
        sky.setBreath(st.level);
      },
      event(e) {
        if (e.type === 'press' || e.type === 'pressend') lead('press', e.type === 'press');
        else if (e.type === 'hold' || e.type === 'holdend') lead('hold', e.type === 'hold');
        else if (e.type === 'lead') lead(e.source || 'chip', !!e.on);
      },
      setMotion() {},
      stop() { leads.clear(); face.release('mode'); rig.setInflate(0); sky.setBreath(null); api.bed?.breathe(null); },
    };
  },

  // ---------------------------------------------------- Sleepy Companion --
  sleepy(api) {
    const { rig, face, ways } = api;
    const S = api.settings(), K = api.speedK();
    const script = new SleepyScript({ seed: hash(`sleepy:${api.id}`), speedK: K, rampS: rampFor(S.minutes, S.fade, K), motion: api.motion(), closedEyes: ways.closedEyes });
    const tl = new Timeline();
    let t = 0, lastD = -1, stretch = null, holdAt = null, stroking = false;
    const restAt = (d) => {
      setRest(api, restFor('sleepy', d));
      face.set('mode', 'breathRate', lerp(0.14, 0.09, d));
      face.set('mode', 'breath', lerp(1.3, 1.6, d));
      face.set('mode', 'blinkRate', lerp(0.6, 0.15, d));
    };
    restAt(0);
    lastD = 0;
    const endStretch = () => {
      if (!stretch) return;
      stretch = null;
      rig.setSqueeze(0);
      rig.setInflate(0);
      face.release('ev:stretch');
    };
    const play = (ev) => {
      const rules = api.rules();
      api.pacer.event(ev.dur * 1000 + 300);
      switch (ev.kind) {
        case 'blink':
          rig.overlay('nl-blink', { eyeOpen: 0, closedCurve: 0.8 }, ev.dur);   // a heavy blink
          if (ev.double) tl.add(ev.dur + 0.18, () => rig.overlay('nl-blink', { eyeOpen: 0, closedCurve: 0.8 }, ev.dur * 0.8));
          break;
        case 'peek': rig.overlay('nl-peek', rig.peekParams || peekFor(api.id) || SLEEPY_PEEK, PEEK_S); break;
        case 'yawn': rig.react('yawn'); break;
        case 'stretch': {
          const st = ways.stretch || {}, style = STRETCH_STYLES[st.style] || STRETCH_STYLES.tall;
          stretch = { t0: t, target: style.squeeze };
          api.moments.overlay('stretch', { eyeOpen: 0, mouthRound: 0.8, mouthOpen: 0.5, browY: 0.4, ...(st.yawn ? { mouthRound: 1, mouthOpen: 1.15 } : {}), ...(st.overlay || {}) }, ev.dur);
          if (style.inflate) rig.setInflate(style.inflate * rules.inflate);
          if (style.float) face.min('ev:stretch', 'float', 0.2 + style.float);
          if (st.set) { for (const k in st.set) face.set('evs:stretch', k, st.set[k]); tl.add(st.setDur ?? 0.5, () => face.release('evs:stretch')); }
          break;
        }
        case 'settle':
          rig.setSqueeze(0.12);
          tl.add(0.6, () => { if (!stretch) rig.setSqueeze(0); rig.react('sigh'); });
          break;
        case 'sigh': rig.react('sigh'); break;
        case 'nod':   // the head dips
          rig.overlay('nl-nod', { lookY: 0.35, closedCurve: 0.9 }, ev.dur);
          if (rules.impulses) rig.nudge({ tilt: 0.01 });
          break;
        case 'dream': if (rules.scripted) api.moments.play(ways.dream); break;
        default: break;
      }
    };
    return {
      script,
      drowsy: () => script.d,
      tick(dt) {
        t += dt;
        script.setSpeed(api.speedK());   // a live Speed change reaches the script's tempo (intervals from now on)
        tl.step(dt);
        if (stroking) script.drowse(0.04 * dt);
        const ev = script.step(dt);
        if (ev) play(ev);
        const d = script.d;
        if (Math.abs(d - lastD) >= 0.02) { lastD = d; restAt(d); }
        face.min('mode', 'glow', api.look.glow * (0.75 - 0.25 * d) + api.warm());
        if (stretch) {   // ramp to the stretch, hold it, let it go
          const s = t - stretch.t0, R = STRETCH.ramp, H = R + STRETCH.hold, E = H + STRETCH.release;
          if (s >= E) endStretch();
          else rig.setSqueeze(stretch.target * (s < R ? eis(s / R) : s < H ? 1 : 1 - eis((s - H) / STRETCH.release)));
        }
      },
      event(e, ts = t) {
        switch (e.type) {
          case 'holdend':
            if (holdAt != null && ts - holdAt >= 4) script.holdLong();   // asleep in your hand
            holdAt = null;
            return;
          case 'strokeend': stroking = false; return;
          case 'stroke':   // one wake-up at the start; stroking itself makes it drowsier (0.04/s, in tick)
            if (!stroking) { stroking = true; script.touch(); endStretch(); }
            return;
          case 'hold': holdAt = ts; break;
          case 'tap': case 'doubletap': case 'drag': case 'squeeze': break;
          default: return;   // release ends a touch; press and offtap are off the body: a look, not a touch
        }
        script.touch();
        endStretch();
      },
      setMotion(m) { script.setMotion(m); if (m !== 'gentle') endStretch(); },
      stop() { tl.clear(); endStretch(); face.release('mode'); face.release('evs:stretch'); },
    };
  },

  // ------------------------------------------------------- Ambient Drift --
  drift(api) {
    const { rig, face, sky, world } = api;
    setRest(api, restFor('drift'));
    face.min('mode', 'float', api.id === 'loomi' || api.id === 'noomi' ? 0.3 : 0.2);
    sky.onGlint = () => api.bed?.chime();   // now and then a firefly's glint rings a soft bell (≥ 20 s apart)
    const pt = { x: 0, y: 0 };
    // the live realm's clock (s): the session clock when the screen passes it, else this mode's frame time
    let t = 0, clockS = null, liveUntil = null, touched = false, liveFailed = false, nextGaze = (8 + api.rand() * 7) * api.speedK(), gazeUntil = -1, gazeI = -1;
    const ph = api.rand() * TAU;
    const liveOK = () => {
      const q = api.quality(), p = api.phase();
      return !liveFailed && api.rules().live && (q === 'high' || q === 'medium') && p !== 'fading' && p !== 'ended' && !!world.realmId && !world.plain;
    };
    return {
      /** When the live realm turns back into a still, on that clock (s); `liveLeft` is the time left. */
      get liveUntil() { return liveUntil; },
      get liveLeft() { return liveUntil == null || clockS == null ? null : Math.max(0, liveUntil - clockS); },
      tick(dt, now) {
        t += dt;
        const prev = clockS;
        clockS = Number.isFinite(now) ? now / 1000 : t;
        if (liveUntil == null) liveUntil = clockS + LIVE.firstS;                     // the first 3 min from entering Drift
        else if (clockS < prev - 2) liveUntil -= prev - clockS;                      // the clock was set back: the live time keeps its length
        if (touched) { touched = false; liveUntil = Math.max(liveUntil, clockS + LIVE.touchS); }
        const rules = api.rules();
        face.min('mode', 'glow', api.look.glow * 0.8 + api.warm());
        // its eyes follow a firefly for 2.5 s every 8–15 s
        if (t >= nextGaze) {
          nextGaze = t + (8 + api.rand() * 7) * api.speedK();
          if (rules.scripted) { gazeI = sky.pickFirefly(); gazeUntil = t + 2.5; }
        }
        if (gazeI >= 0 && t < gazeUntil && sky.firefly(gazeI, pt)) rig.lookAtScreen(pt.x, pt.y); else gazeI = -1;
        // the world slides ±6 px over two minutes
        if (rules.parallax) { const a = ph + TAU * t / 120; world.setDrift(6 * Math.sin(a), 2 * Math.sin(2 * a)); } else world.setDrift(0, 0);
        // the live realm: the first 3 min, and 45 s after a touch (wall time: never longer on a slow device)
        const want = liveOK() && clockS < liveUntil;
        if (want && !world.isLive) { if (!world.goLive({ quality: api.quality() }) && world.W) liveFailed = true; }
        else if (!want && world.isLive) world.goStill();
      },
      event(e) {
        if (TOUCHES.includes(e.type)) touched = true;   // the next frame keeps the realm live for 45 s more
        if (e.type === 'offtap' && Number.isFinite(e.x)) sky.attract(e.x, e.y);
      },
      setMotion() {},
      stop() { sky.onGlint = null; world.goStill(); world.setDrift(0, 0); face.release('mode'); },
    };
  },

  // ------------------------------------------------------- Quiet Company --
  quiet(api) {
    const { face } = api;
    setRest(api, restFor('quiet'));
    face.set('mode', 'breath', 0.5);
    face.set('mode', 'breathRate', 0.1);
    face.set('mode', 'blinkRate', 0.4);
    api.setQuiet(!api.settings().quietSound);
    return {
      tick() { face.min('mode', 'glow', api.look.glow * 0.75 + api.warm()); },
      event() {},
      setMotion() {},
      stop() { face.release('mode'); api.setQuiet(false); },
    };
  },
};
