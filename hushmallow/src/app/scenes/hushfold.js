// HOME — the Hushfold. A full-screen living stage: one hero Mallow you can
// squeeze within the first second, cinematic subtitles that speak one short
// line at a time, a compact "tell me" overlay that appears only when you
// choose to answer, and a non-modal side panel. Hushflow worlds run inside
// this scene (W4's director); until that lands a stub keeps the Mallow
// playable and says so.
//
// Scene contract: hushfold(app, params) → { el, title:'', enter(), leave(),
//   get blockBack(), safeForUpdate(), spawnThought(text, emotion) }
// params.flow = { worldId, emotion?, intention? } starts a world (the garden's "Practise
// again", Another Angle's Continue); params.safety = { level } (back from Another Angle
// after something heavy) keeps support close. Leaving, it hands the classic rig back (the
// person's own Mallow, let go on enter by world.releaseMallow), so every scene after it finds one.
//
// Layers: #world realm backdrop · .hf-touch the squeezable Mallow (MallowTouch, the
// default; the classic rig in #mallow-layer is the fallback, released meanwhile) ·
// #fx-layer the stage canvas (the Thought Mallows, W2's ThoughtLayer, drawn in the rig's
// one shared loop with the Hushflow director as its world ticker) + the one input router ·
// #scene this root (pointer-events:none; only .hf-ui takes touches; the thoughts' word tags
// are .tm-tag at z 1 in it) · #sheet-root support/confirm sheets only.

import { h } from '../ui.js';
import { MALLOWS, MALLOW_IDS, loadMallowAssets } from '../../mallows/registry.js';
import { addTicker, removeTicker, setStageFloor } from '../../mallows/rig.js';
import { rememberVisitSafety, recallVisitSafety } from '../visit-safety.js';
import { openSupport } from './support.js';
import { createSubtitles } from '../../hushfold/subtitles.js';
import { createLines, SHARED_LINES, PLAY_CHECK, flowEmotion } from '../../hushfold/lines.js';
import { requireEntitlement } from '../entitlements.js';
import { createStage, createStageMallow } from '../../hushfold/stage.js';
import { createInputRouter } from '../../hushfold/input-router.js';
import { hfIcon } from '../../hushfold/icons.js';
import { loadProgress, clearProgress, favouriteWorlds } from '../../engine/flow-store.js';

// the realms whose daylight needs a deeper subtitle scrim (a fallback for the per-line sample)
const BRIGHT_REALMS = new Set(['sunpop-orchard', 'blue-drift', 'moonmilk-cove']);
// the Hushfold opened once already in this page session (Back from Settings is not a "return visit")
let visitedThisSession = false;
// the overlay module, once preloaded: opened synchronously inside the tap (the iPhone keyboard needs a real gesture)
let inputMod = null;
const preloadInput = () => {
  if (inputMod) return Promise.resolve(inputMod);
  return import('../../hushfold/input-overlay.js').then((m) => { inputMod = m; m.loadInputModules?.().catch(() => {}); return m; });
};
const idle = (fn) => (typeof requestIdleCallback === 'function' ? requestIdleCallback(fn, { timeout: 1500 }) : setTimeout(fn, 300));

function mallowForNow() {
  const hr = new Date().getHours();
  if (hr >= 21 || hr < 6) return 'noomi';
  if (hr < 11) return 'boppo';
  if (hr < 17) return 'pipzi';
  return 'loomi';
}
const REACTION_KINDS = new Set(['squeeze', 'tap', 'doubleTap', 'flick', 'stretch', 'massage', 'stroke', 'jiggle', 'pull']);
// how carefully the stage behaves, from the shared detector (src/engine/safety.js); it only ever rises in a visit
const LEVELS = ['none', 'concern', 'care', 'crisis'];
// the face for something heavy: attentive and soft (no heart eyes, no smile, no tears)
const CARE_FACE = 'concerned';
// what a gentle choice after a care or distress disclosure actually plays: a calm world when there is one, else named honestly
const GENTLE_WORLDS = [['luminous-ocean', 'Somewhere calm, with Loomi'], ['static-storm', 'Glitzi’s storm, taken slowly']];
// more words later in a visit that already had support: a short, plain acknowledgement (the full care line was said)
const CARE_AGAIN = 'Thank you for telling me. I’m right here.';
// back from the plans page without a plan: the words they typed are offered back (in memory only, never stored)
const RETELL = 'No rush. Your words are still here, if you’d like to tell me again.';
// Thought Mallows on the home stage (owner P8): at most 3, and 2 below 360 px wide; one in a world (owner P7)
const thoughtCap = (inWorld = false) => (inWorld ? 1 : innerWidth < 360 ? 2 : 3);

/**
 * Does a world's line or choice wait for the person's tap? (A discovery's held line, "Stay, or drift on?": the
 * subtitles keep these through a clear({ keepHeld: true }); a transient choice and a passing line they do not.)
 */
export const waitsForTap = (lines, o = {}, choice = false) => (choice ? !o?.transient
  : !!(o?.hold || [].concat(lines ?? []).some((l) => l && typeof l === 'object' && l.hold)));
/**
 * The lines and choices a world is holding for the person's tap, while they wait. They are that world's: when it
 * is finished they go with it, so the home stage never keeps the old host's line (with its Continue) and the
 * person's own Mallow's closing line never queues behind it.
 */
export function worldHeldLines() {
  const live = new Set();
  return {
    /** Note a world's say()/choice() promise that waits for a tap (it is forgotten once it settles). */
    track(p, waits) {
      if (!waits || typeof p?.then !== 'function') return p;
      live.add(p);
      const done = () => live.delete(p);
      p.then(done, done);
      return p;
    },
    /** The world is finished: forget them; true when one was still waiting (the caller clears the subtitles whole). */
    drop() { const any = live.size > 0; live.clear(); return any; },
    get size() { return live.size; },
  };
}

/**
 * What a Tell sent on the main screen does first (owner decision 'Ask before every world', 14 Oct 2026), in this order:
 *   'crisis'  — crisis words: the calm line and support, nothing made of the words, any world ends quietly;
 *   'carried' — ordinary words after care or distress was answered earlier in this visit: a short acknowledgement and the
 *               quiet choice (no Thought Mallow, a world only if they ask);
 *   'support' — care, distress, wanting to hurt someone, or a loss the words (or a chosen grief feeling) name: support
 *               first, then the quiet choice — straight to the gentle path, never asked;
 *   'ask'     — everything else: "Shall we play with this, or just be with it?" before any Thought Mallow, world or
 *               plans page (a loss the lists are only unsure of, lossRoute 'ask', is asked the same: one question).
 *   'play'    — the person already chose "Play with it" for these words (back from the plans page with a plan).
 * `level` is the visit's (never lower than the words'); `carried`: care was answered earlier and these words are not heavy.
 */
export function tellRoute({ level = 'none', carried = false, chosen = null } = {}) {
  if (level === 'crisis') return 'crisis';
  if (carried && level !== 'none') return 'carried';
  if (level === 'care' || level === 'concern') return 'support';
  return chosen === 'play' ? 'play' : 'ask';
}
/**
 * The person's answer to the question (subtitles.choice: 'play' | 'stay' | null), and where it was asked → what follows:
 *   'play'  — the flow as it always was (a Thought Mallow of the words, then the world — or the world takes them);
 *   'stay'  — "Just be with it": nothing made of the words, a gentle line, the quiet choice; in a world, it waits under
 *             its veil meanwhile (staying ends it quietly, somewhere calm melts into the calm world);
 *   'quiet' — no answer within PLAY_CHECK.ms, or Back: nothing is made of the words, the stage stays quiet (a world stays
 *             paused, its Resume theirs) and the visit stays gentle from here;
 *   'retold' — a new Tell opened over the question: it is asked again for those words, once they are sent.
 */
export function askOutcome(v, { telling = false } = {}) {
  if (v === 'play') return 'play';
  if (v === 'stay') return 'stay';
  return telling ? 'retold' : 'quiet';
}
/**
 * Are these the same words, as the person would see them (case, punctuation and spacing aside)? The words offered back
 * after the plans page, sent again unchanged, keep the "Play with it" already chosen for them (never asked twice);
 * changed, they are new words, and asked about.
 */
export function sameWords(a, b) {
  const k = (t) => String(t ?? '').toLowerCase().normalize('NFKC').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  return !!k(a) && k(a) === k(b);
}

export default function hushfold(app, params = {}) {
  const { world, prefs, ent, store } = app;
  // explicit picks (Meet the Mallows, the panel switcher) win, then the last one chosen, then the time of day
  if (app.state.homeMallow && MALLOWS[app.state.homeMallow]) prefs.set('mallow', app.state.homeMallow);
  let mallowId = (MALLOWS[app.state.homeMallow] && app.state.homeMallow) || (MALLOWS[prefs.get('mallow')] && prefs.get('mallow')) || mallowForNow();
  const lines = createLines({ store });
  const S = {
    emotion: null, emotionName: null, intention: null, reactions: 0, touches: 0, firstTouchAt: 0, lastLineAt: 0,
    invited: false, told: false, crisis: false, care: false, photos: false, left: false,
    // level: the most serious thing typed this visit (sent or not). Anything above 'none' keeps the
    // Support pill up, stops invitations and squeeze chatter, and holds off update reloads
    level: 'none', category: null, crisisSpoken: false, pendingResume: false,
    // noResume: a death, a loss or harm done to the person was told this visit — the world they were in is never offered back
    noResume: false,
    worldAt: 0,   // when the world on stage now arrived (its first seconds: the person's thought is still on its way)
    // soft: "Just be with it" was chosen, or the question was left unanswered (owner decision 'Ask before every world'):
    // the rest of the visit stays gentle — no squeeze quips, invitations or playful lines, the attentive face — with no
    // support line and no Support pill (nothing heavy was said). Kept for the page session, like the level (app.state).
    soft: !!app.state.hfSoft,
    asking: false,   // the question is showing ("Shall we play with this, or just be with it?")
    tellGen: 0,      // Tells sent this visit (softChoice acts only for the one it followed)
  };
  const timers = new Set();
  const later = (fn, ms) => { const t = setTimeout(() => { timers.delete(t); if (!S.left) fn(); }, ms); timers.add(t); return t; };
  const M = () => MALLOWS[mallowId];
  const now = () => performance.now();

  // ------------------------------------------------------------ DOM --
  const root = h('div', { class: 'hushfold', 'data-hf': 'root' });
  const logoBox = h('div', { class: 'hf-logo', role: 'img', 'aria-label': 'hushmallow' }, h('span', { class: 'brand-name', 'aria-hidden': 'true' }, 'hushmallow'));
  import('../../ui/type.js').then((m) => { if (m.logoImg) logoBox.replaceChildren(m.logoImg({ tone: 'light', width: 132, alt: '' })); }).catch(() => {});
  const panelBtn = h('button', { class: 'hf-btn', type: 'button', 'aria-label': 'Feelings and worlds', 'aria-expanded': 'false', 'data-hf': 'panel-handle', onclick: () => togglePanel() }, hfIcon('panel'));
  const gearBtn = h('button', { class: 'hf-btn', type: 'button', 'aria-label': 'Settings', onclick: () => app.go('settings') }, hfIcon('gear'));
  const topEl = h('header', { class: 'hf-top' }, logoBox, h('div', { class: 'grow' }), panelBtn, gearBtn);
  const tellLabel = h('span', { class: 'label' });
  const tellBtn = h('button', { class: 'hf-pill is-hidden', type: 'button', 'data-hf': 'tell', onclick: () => openTell('pill') }, h('span', { class: 'dot', 'aria-hidden': 'true' }), hfIcon('talk'), tellLabel);
  const supportPill = h('button', { class: 'hf-pill support', type: 'button', hidden: true, onclick: () => openSupportSheet() }, hfIcon('support'), 'Support');
  // a paused world says so on the stage, with one tap back into it
  const pausedPill = h('button', { class: 'hf-pill paused', type: 'button', hidden: true, 'aria-label': 'Paused. Resume the world.', onclick: () => resumeFlow() },
    hfIcon('play'), h('span', {}, h('span', { class: 'pz' }, 'Paused · '), 'Resume'));
  const dock = h('div', { class: 'hf-dock' }, pausedPill, supportPill, tellBtn);
  const srTitle = h('h1', { class: 'sr-only' }, 'hushmallow');
  root.append(srTitle, topEl, dock);

  // --------------------------------------------------- subtitles --
  const subtitles = createSubtitles({
    root, prefs,
    reducedMotion: () => prefs.reducedMotion(),
    // (in a world the lines keep to the band the world keeps clear for them; over the phone sheet, the strip above it)
    bounds: () => ({ top: bandTop(), bottom: Math.min(dockTop(), panelTop()) - 12, left: 0, right: stageRight() }),
    // (in a world's first seconds, where the person's thought is going too: a title card placed while it travels from
    // beside their Mallow is never left over it, or its words, once it lands — the ocean's cold start at 390)
    // (the world's postcards and bubbles folded away while the shell asks over it: only its thought is kept clear — foldWorld)
    // (and the thought too, when even that left no room clear of it: thoughtFolded)
    avoid: () => [mallowAvoidRect(), ...(thoughtFolded ? [] : [...(stage?.thoughts.rects() || []), thoughtRestRect()]),
      ...(flowRef?.avoid?.() || []).filter((r) => !folded || (r?.kind === 'thought' && !thoughtFolded)), overlay?.rect?.(),
      // (an offer lying in the band's free time gives the band back: it steps aside or folds when the line comes)
      ...(installMod?.installAvoidRects?.() || []).filter((r) => !inWorldBand(r))].filter(Boolean),
    // what is behind the band (the realm, a world's back and front layers): sampled once per line for the scrim
    backdrop: () => [...document.querySelectorAll('#world canvas, #fx-layer canvas.hf-front')],
    brightHint: () => !worldMode && BRIGHT_REALMS.has(world.realmId),
    // the person's ▶ on the subtitle pill resumes a paused world too
    onControl: (kind) => { if (kind === 'resume' && flowRef?.state?.paused) resumeFlow(); },
    // a block that fits nowhere (two rows of chips on a small phone): make room above the Mallow
    onBand: (need) => { if (need !== bandNeed) { bandNeed = need; layout(); } },
  });
  let bandNeed = 0;
  let folded = false;   // a world's front layer folded away while the shell asks over it (foldWorld)
  let thoughtFolded = false;   // ...and the person's thought with it, when the question had no room clear of it
  let bandPx = 0;   // the subtitle band's height as layout() reserves it (the director's subtitleBand)
  /** The top of the subtitle band: in a world (not over the phone sheet), the band the world keeps clear. */
  function bandTop() {
    const shell = (topEl.getBoundingClientRect().bottom || 60) + 12;
    if (!worldMode || panelSheet() || !flowRef?.subtitleBand) return shell;
    try { const y = flowRef.subtitleBand()?.y; return Number.isFinite(y) ? y : shell; } catch { return shell; }
  }
  // the pill's ↺ (it calls subtitles.replay): held for a crisis, nothing said before it comes back
  // (once the one calm line has been said, that is the line it replays)
  const replayLine = subtitles.replay;
  subtitles.replay = () => { if (S.hold === 'crisis' && !S.crisisSpoken) return; replayLine(); };
  const say = (text, opts = {}) => {
    if (!text) return Promise.resolve(false);
    S.lastLineAt = now();
    return subtitles.say(text, { who: M().name, colour: M().colours.glow, ...opts });
  };

  // ------------------------------------------------------- stage --
  let stage = null, stageMallow = null, router = null, overlay = null, panel = null, readEl = null;
  let touchMt = null, touchBox = null;   // the MallowTouch stage (W2), else the rig (the fallback)
  let rigReleased = false;               // the classic rig was let go for MallowTouch: leave() hands it back
  // each transient layer has its own history entry, so Back closes it first
  const layer = { overlay: 0, panel: 0, read: 0, ask: 0 };
  const pushLayer = (k) => { layer[k] = app.pushLayer?.() || 0; };
  const popLayer = (k) => { const t = layer[k]; layer[k] = 0; if (t) app.popLayer?.(t); };
  // Sheets opened from the Hushfold (support, the A–Z list) get a history entry too, newer than the
  // overlay or panel beneath them, so Back closes the sheet first and never the layer under it.
  const sheets = [];   // { token, sheet, seen, obs }
  function trackSheet(sheet) {
    if (!sheet?.el || S.left) return sheet;
    const rec = { token: app.pushLayer?.() || 0, sheet, seen: false, obs: [] };
    sheets.push(rec);
    // what is under the sheet steps back, so nothing ghosts through it
    root.classList.add('hf-sheet-open');
    // (a world under it waits, rather than talking on unseen: the subtitles are hidden under sheets)
    holdForSheet(true);
    const done = () => {
      if (rec.done) return;
      rec.done = true;
      rec.obs.forEach((o) => o.disconnect());
      const i = sheets.indexOf(rec);
      if (i >= 0) sheets.splice(i, 1);
      if (!sheets.length) { root.classList.remove('hf-sheet-open'); holdForSheet(false); }
      // closed another way (✕, its button, the backdrop, Escape, a pick): its history entry goes too
      if (rec.token) { const t = rec.token; rec.token = 0; app.popLayer?.(t); }
      if (!S.left) afterSheet();
    };
    const onClass = new MutationObserver(() => {
      if (sheet.el.classList.contains('open')) rec.seen = true;
      else if (rec.seen) done();
    });
    onClass.observe(sheet.el, { attributes: true, attributeFilter: ['class'] });
    const host = sheet.el.parentNode;
    const onGone = host ? new MutationObserver(() => { if (!sheet.el.isConnected) done(); }) : null;
    onGone?.observe(host, { childList: true });
    rec.obs = [onClass, onGone].filter(Boolean);
    return sheet;
  }
  /** The support sheet, as a layer of its own (urgent when the words were a crisis). */
  const openSupportSheet = (opts = {}) => {
    const sh = trackSheet(openSupport(app, opts));
    // the sheet gives the shared stage its loving, heart-eyed face; after something heavy the Mallow stays attentive
    if (opts.urgent || gentle()) stageMallow?.setStage?.(CARE_FACE, { quiet: true });
    return sh;
  };
  /**
   * A sheet (support, the A–Z list) over a running world: the world waits under its veil while the sheet is
   * up (no pill, no "Paused" line: it is not the person pausing it) and carries on when the last sheet
   * closes, unless something else holds it meanwhile (a safety hold, the panel sheet, the person's Pause).
   */
  let sheetHold = null;   // { paused: this hold paused it } while a sheet covers a world
  function holdForSheet(on) {
    if (on) {
      if (sheetHold || !worldMode || S.finishing || !flowRef || flowRef.stub) return;
      const st = flowRef.state || {};
      if (st.phase === 'finished') return;
      sheetHold = { paused: !st.paused };
      if (sheetHold.paused) { try { flowRef.pause?.(); } catch (e) { console.warn(e); } }
      return;
    }
    const h0 = sheetHold;
    sheetHold = null;
    if (!h0?.paused || !worldMode || S.finishing || !flowRef || S.hold || held) return;
    const st = flowRef.state || {};
    if (st.phase !== 'finished' && st.paused) { try { flowRef.resume?.(); } catch (e) { console.warn(e); } }
  }
  /** A sheet closed: the crisis line waits until nothing covers the stage. */
  function afterSheet() {
    // the support sheet set the shared stage to its comforting face; after something heavy the face stays attentive
    if (gentle()) stageMallow?.setStage?.(CARE_FACE, { quiet: true });
    speakCrisis();
  }
  let flowP = null, flowRef = null, offPrefs = null;
  let starting = 0;                      // startFlow calls in flight (a world on its way)
  let installMod = null, offerCtl = null; // garden-install, once loaded; the open offer's AbortController
  let flowReg = null;                    // the Hushflow registry module, once loaded (which worlds are calm, their hosts)
  let thoughtHome = { x: innerWidth * 0.8, y: innerHeight * 0.6 };
  // where the Thought Mallows may float (the ThoughtLayer reads it every frame; layout() fills it in place)
  const thoughtBounds = { left: 12, right: innerWidth - 12, top: 120, bottom: innerHeight - 80 };

  function dockTop({ ignorePaused = false } = {}) {
    const paused = !ignorePaused && !pausedPill.hidden;
    const away = (e) => e.hidden || e.classList.contains('is-hidden') || e.classList.contains('is-under');
    if (away(tellBtn) && away(supportPill) && !paused) return innerHeight - 24;
    // (the Paused pill only appears with the rest of the dock, in its own row when it wraps)
    const items = [tellBtn, supportPill, pausedPill].filter((e) => !away(e) && (paused || e !== pausedPill));
    const tops = items.map((e) => e.getBoundingClientRect()).filter((r) => r.height).map((r) => r.top);
    return tops.length ? Math.min(...tops) : innerHeight - 24;
  }
  /** Phones and portrait tablets: the side panel is a bottom sheet; the stage above it stays playable (side-panel.js panelIsSheet). */
  let sheetRule = null;   // side-panel.js's panelIsSheet, once the panel is loaded
  const panelSheet = () => !!panel?.isOpen && (sheetRule ? sheetRule() : innerWidth < 700);
  /**
   * The stage's right edge: the side panel's left edge where it rests while it is open (a landscape tablet, a desktop),
   * else the viewport's. The Mallow, the lines, the dock, the thoughts and a world's safe rect all keep to the free
   * width left of it, so nothing of the stage is hidden under the opaque panel.
   */
  function stageRight() {
    if (!panel?.isOpen || panelSheet()) return innerWidth;
    const w = panel.el.offsetWidth || 0;
    return w > 0 && w < innerWidth ? innerWidth - w : innerWidth;
  }
  // where the sheet comes to rest (offsetHeight ignores its slide-in transform)
  function panelTop() { return panelSheet() ? innerHeight - (panel.el.offsetHeight || 0) : innerHeight; }
  function mallowAvoidRect() {
    const b = stageMallow?.bodyRect?.() || world.bodyRect();
    if (!b || !b.height) return null;
    // room for a hop and the particles above the head — round where the Mallow rests (its place, steady while it
    // breathes, squashes or hops inside that room: what keeps off it does not flicker with it), and round the live body
    // too when that reaches further (a stretch, a glide on its way)
    const o = stageMallow?.restRect?.();
    const rest = o && o.height > 0 ? { left: o.left, right: o.right, top: o.top - Math.max(18, o.height * 0.14), bottom: o.bottom + 6 } : null;
    const live = rest ? { left: b.left - 4, right: b.left + b.width + 4, top: b.top - 4, bottom: b.top + b.height + 6 }
      : { left: b.left, right: b.left + b.width, top: b.top - Math.max(18, b.height * 0.14), bottom: b.top + b.height + 6 };
    if (!rest) return live;
    return { left: Math.min(rest.left, live.left), right: Math.max(rest.right, live.right), top: Math.min(rest.top, live.top), bottom: Math.max(rest.bottom, live.bottom) };
  }

  /**
   * The bottom sheet on a short screen hides the thoughts' words (they would sit on the Mallow above it). The Mallow's
   * new place is planned at once (restRect reports it), but the body sets off only once the words have faded out
   * (.tm-tag's .2 s and a frame), so it never rises through words that can still be seen.
   */
  function heroWaitsForTagsOut() {
    if (!stageMallow?.holdPlace || stageMallow.placeHeld) return;   // (an arrival's own hold already waits for them)
    const L = stage?.thoughts;
    if (!(L?.list || []).some((t) => L.tagRect?.(t))) return;
    stageMallow.holdPlace(true);
    stageMallow.holdPlace(230);
  }

  /** The Thought Mallows on stage that are not drifting off (oldest first). */
  const liveThoughts = () => (stage?.thoughts.list || []).filter((t) => !t.leaving);

  /** Size and place the Mallow in the free region between the subtitle band and the dock (no CSS scale). */
  function layout() {
    if (S.left) return;
    // (vw: the stage's width — left of the side panel while it is open)
    const vw = stageRight(), vh = innerHeight;
    // the dock keeps to the stage too (its pills centred in it, never under the panel)
    dock.style.right = vw < innerWidth ? `${innerWidth - vw}px` : '';
    const topB = topEl.getBoundingClientRect().bottom || 60;
    const band = Math.max(Math.min(156, Math.max(118, vh * 0.17)), bandNeed ? bandNeed + 24 : 0);
    bandPx = Math.round(band);
    let regionTop = topB + band;
    let regionBottom = Math.min(vh - 76, dockTop() - 14);
    // a paused world does not re-plan its postcards, so the Paused pill must not lift the Mallow into them
    const floorBottom = Math.min(vh - 76, dockTop({ ignorePaused: true }) - 14);
    let minB = 130;
    const ov = overlay?.rect?.();
    if (ov?.height) {
      // typing: the Mallow shrinks and sits below the compact overlay (the subtitles wait meanwhile)
      regionTop = ov.bottom + 12;
      regionBottom = vh - 24;
      minB = 96;
    } else if (panelSheet()) {
      // the bottom sheet: one subtitle line and the Mallow above it, still squeezable
      regionBottom = panelTop() - 12;
      const strip = regionBottom - topB;
      // a short strip: the line stays, its ⏸ ↺ ⏭ pill steps back (it would sit on the Mallow)
      root.classList.toggle('hf-tight', strip < 300);
      regionTop = topB + Math.max(Math.min(84, band), bandNeed ? bandNeed + 12 : 0);
      minB = 96;
    }
    if (!panelSheet()) root.classList.remove('hf-tight');
    const regionH = Math.max(minB + 8, regionBottom - regionTop);
    // a short strip above the sheet: the thoughts' word tags would sit on the Mallow, so they wait
    const tagsAway = panelSheet() && regionBottom - regionTop < 220;
    // (the words going away for the sheet: the Mallow waits where it is while they fade, so it never rises through them)
    if (tagsAway && !stage?.thoughts?.hidden) heroWaitsForTagsOut();
    root.classList.toggle('hf-tags-away', tagsAway);
    stage?.thoughts.hideTags(tagsAway);
    const thought = !worldMode && liveThoughts().length > 0;
    let B = Math.min(vw * 0.66, regionH * (ov?.height || panelSheet() ? 0.86 : 0.7), 360);
    // (a short phone: a little smaller still, so two Thought Mallows and their words have room round it)
    if (thought && vw < 700) B *= vh < 640 ? 0.74 : 0.84;
    // in a world the Mallow stands on the floor in the foreground, smaller, leaving the sky to play in
    if (worldMode && !ov?.height && !panelSheet()) B = Math.min(vw * 0.58, vh * 0.27, 300);
    B = Math.max(minB, Math.min(B, regionH));
    const lw = B / 0.64, lh = lw * 1.1;
    const cx = thought ? (vw < 700 ? vw * 0.4 : vw / 2 - B * 0.35) : vw / 2;
    const bodyCy = worldMode && !ov?.height && !panelSheet() ? Math.min(vh * 0.885, floorBottom) - B / 2 : regionTop + regionH * 0.5;
    if (stageMallow?.kind === 'touch') stageMallow.fit?.({ cx, cy: bodyCy, size: B });
    else {
      world.setLayerSize({ w: lw, h: lh });
      const layerCy = bodyCy - 0.098 * lw;
      world.place({ x: (cx / vw) * 100, y: (layerCy / vh) * 100, scale: 1 });
    }
    // where a new Thought Mallow would like to rest (the ThoughtLayer takes the nearest free place to it,
    // its words clear of the Mallow, the others and the bounds below)
    thoughtHome = vw < 700 ? { x: vw * 0.82, y: bodyCy + B * 0.22 } : { x: vw / 2 + B * 0.55, y: bodyCy + B * 0.1 };
    // where the thoughts may float: beside the side panel, under the band (or the overlay), over the dock (or the sheet)
    const side = panel?.isOpen && !panelSheet() ? panel.el.getBoundingClientRect() : null;
    thoughtBounds.left = 10;
    thoughtBounds.right = Math.min(side?.width ? side.left : vw, vw) - 10;
    thoughtBounds.top = (ov?.height ? ov.bottom : regionTop) + 10;
    // (while the garden installation has the lines paused, the band is free: a thought giving way to its card may
    // rise into it, its words with it)
    if (root.classList.contains('hf-install-quiet') && !ov?.height) thoughtBounds.top = Math.min(thoughtBounds.top, topB + 10);
    thoughtBounds.bottom = Math.max(thoughtBounds.top + 60, Math.min(dockTop(), panelTop()) - 10);
    // the Mallow glides there (a 720 ms spring): the subtitles and an open garden offer or card are
    // placed again once it lands, so neither is left over the face it was placed beside mid-glide
    later(() => { subtitles.layout(); installMod?.relayoutInstall?.(); }, 760);
    // (and the home stage's thoughts are planned again against where it landed)
    later(replanThoughts, 780);
    subtitles.layout();
    // an open garden offer or card steps out of whatever just moved: at once when something covers it now
    // (the panel, the sheet, the overlay, the face, or the face the Mallow is gliding to); when the Mallow is
    // only on its way elsewhere, once it has landed (above), so the offer moves once and never across the face
    if (!landingFace() || installClash()) installMod?.relayoutInstall?.();
  }
  /**
   * Once the Mallow has landed after a layout, the home stage's Thought Mallows are planned again against where it
   * now is (ThoughtLayer.relayout: the layer re-plans by itself when its bounds move, not when the hero does). Back
   * from a world the Mallow grows from its small place on the world's floor: planned mid-glide the thoughts stayed far
   * and small (320×568: z 0.78), planned now they come near again. At home only (a world drives its own thought).
   */
  let plannedHero = null;
  function replanThoughts() {
    if (S.left || worldMode || !stage || !(stage.thoughts.list?.length > 0)) return;
    const r = mallowAvoidRect();
    if (!r) return;
    const p = plannedHero;
    plannedHero = r;
    if (p && Math.abs(p.left - r.left) <= 12 && Math.abs(p.top - r.top) <= 12 && Math.abs(p.right - r.right) <= 12 && Math.abs(p.bottom - r.bottom) <= 12) return;
    try { stage.thoughts.relayout?.(); } catch (e) { console.warn(e); }
  }
  const overlaps = (a, b) => !!(a && b && a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top);
  /** Does an open garden offer, card or chip sit under the panel, the overlay, the face or the landing face? */
  function installClash() {
    const mine = installMod?.installAvoidRects?.() || [];
    if (!mine.length) return false;
    let face = null;
    try { face = installMod.mallowFaceRect?.(stageMallow?.bodyRect?.(), MALLOWS[mallowId]) || null; } catch { face = null; }
    const now = [panelRect(), overlay?.rect?.(), face, landingFace()].filter(Boolean);
    return mine.some((r) => now.some((o) => overlaps(r, o)));
  }
  let resizeT = 0;
  const onResize = () => { clearTimeout(resizeT); resizeT = setTimeout(layout, 120); };
  /**
   * The face where the Mallow is gliding to (MallowTouch's stage spring) while it is still on its way,
   * else null: an offer placed mid-glide keeps clear of the face it is about to have, not only the one it
   * has. (The spring, not the body box: a hop, a squeeze or the storm's tremble is not a glide.)
   */
  function landingFace() {
    const st = touchMt?.st, g = touchMt?.goalSt;
    if (!st || !g || g.x == null || g.y == null || !installMod?.mallowFaceRect) return null;
    if (Math.abs(g.x - st.x) < 3 && Math.abs(g.y - st.y) < 3 && Math.abs(g.s - st.s) < 0.02 * g.s) return null;
    const b = stageMallow?.bodyRect?.();
    if (!b?.height) return null;
    // the body box now, moved and scaled to the spring's goal (it scales about its middle)
    const k = g.s / (st.s || g.s), w = b.width * k, hh = b.height * k;
    const cx = b.left + b.width / 2 + (g.x - st.x), cy = b.top + b.height / 2 + (g.y - st.y);
    try { return installMod.mallowFaceRect({ left: cx - w / 2, top: cy - hh / 2, width: w, height: hh }, MALLOWS[mallowId]) || null; } catch { return null; }
  }

  function theme() {
    const m = M();
    root.style.setProperty('--hf-glow', m.colours.glow);
    root.style.setProperty('--hf-tint', m.colours.body);
    tellLabel.textContent = `Tell ${m.name}`;
    tellBtn.setAttribute('aria-label', `Tell ${m.name} what’s on your mind`);
    srTitle.textContent = `hushmallow, with ${m.name}. Squeeze ${m.name}, or tell ${m.name} what’s on your mind.`;
  }

  // --------------------------------------------------------- flow --
  // The person's words for the worlds: one live object, so a director made
  // before they typed still reads what they type later (exact text only).
  let wordsCur = null;
  const words = {
    get full() { return wordsCur?.full || ''; }, get own() { return !!wordsCur?.own; }, get token() { return wordsCur?.token || ''; },
    get feelings() { return wordsCur?.feelings || []; }, setToken(t) { wordsCur?.setToken(t); }, onChange(fn) { return wordsCur?.onChange?.(fn) || (() => {}); },
  };
  // the director speaks with Mallow ids; the subtitles show names in each Mallow's own colour
  const whoOf = (o = {}) => {
    const m = MALLOWS[o.who] || (o.who ? null : M());
    return m ? { ...o, who: m.name, colour: o.colour || m.colours.glow } : o;
  };
  /**
   * After care or distress in this visit, a world that is not a calm one keeps its banter to itself: its
   * dialogue ("Everything’s crackling in here.", "That’s a lot of charge.") never follows the support line,
   * however it is resumed. Its discoveries, choices and the calm worlds' own lines still come.
   */
  const quietWorldLine = (o) => {
    if (!gentle() || o?.kind !== 'dialogue') return false;
    const id = flowRef?.state?.worldId;
    return !(id && flowReg?.registry?.get?.(id)?.calm === true);
  };
  // (what the world is holding for a tap goes with it when it is finished: onFinished)
  const worldHeld = worldHeldLines();
  /** The shell's question and its soft chip after "Just be with it" (subtitles opts): never cleared by a world. */
  const isAsk = (o) => !!(o?.ask || o?.soft);
  const flowSubtitles = {
    // a world held for a crisis says nothing more (not even a line that was on its way)
    // (nor a finished one, while its last frame fades out)
    say: (lines, o) => { if (S.hold === 'crisis' || S.finishing) return Promise.resolve(null); if (quietWorldLine(o)) return Promise.resolve(null); S.lastLineAt = now(); return worldHeld.track(subtitles.say(lines, whoOf(o)), waitsForTap(lines, o)); },
    choice: (prompt, options, o) => (S.hold === 'crisis' || S.finishing ? Promise.resolve(null) : worldHeld.track(subtitles.choice(prompt, options, whoOf(o)), waitsForTap(null, o, true))),
    // a paused world drops its passing lines (a held discovery stays); the shell says "Paused" itself
    // (the shell's own question is never the world's to take: a world arriving, or pausing, under it leaves it as it is)
    clear: () => subtitles.clear({ keep: isAsk }), pause: () => subtitles.clear({ keepHeld: true, keep: isAsk }), resume: () => subtitles.resume(),
    get busy() { return subtitles.busy; }, get holding() { return subtitles.holding; },
  };
  const safeRect = () => {
    const top = (topEl.getBoundingClientRect().bottom || 60) + 8;
    // (where the Mallow rests, not where its live body is this frame: the worlds plan round it)
    const b = stageMallow?.restRect?.() || stageMallow?.bodyRect?.();
    const bottom = b?.height ? Math.max(top + 160, b.top - 14) : innerHeight * 0.62;
    // (beside an open side panel, the free width left of it: the world plans its things there)
    return { x: 20, y: top, w: stageRight() - 40, h: bottom - top };
  };

  function createStubFlow() {
    const tell = (k) => say(lines.pick(mallowId, k) || SHARED_LINES[k]?.[0]);
    return {
      stub: true,
      start() { tell('stub'); return Promise.resolve(null); },
      next() { tell('stub'); }, stay() { tell('stub'); }, pause() { tell('stub'); }, resume() {}, finish() { tell('stub'); },
      setEmotion() {}, setIntention() {}, setAutoFlow() {}, setThought() {}, setThoughts() {}, setGentle() {}, hold() { return false; },
      on() { return () => {}; },
      get state() { return { phase: 'idle', paused: false, worldId: null, stub: true }; },
      safeForUpdate() { return true; },
      destroy() {},
    };
  }
  // the worlds read prefs live: while the Support pill is up they see low stimulation too (owner P5)
  const flowPrefs = Object.create(prefs, { get: { value: (k) => (k === 'lowStim' ? lowStimNow() : prefs.get(k)) } });
  // Is the Hushflow director in this build? (imports the module only; never creates a director)
  let availP = null;
  const flowAvailable = () => (availP ||= import('../../hushfold/flow/director.js').then((m) => typeof m.createHushflow === 'function', () => false));
  /**
   * The Hushflow director (W4), created only when a world is about to start; the stub if it is missing or throws.
   * It runs in the stage's tick (ticker: stage.worldTicker, in the rig's one shared loop), so what a world writes
   * to the person's Thought Mallow is drawn in the same frame; the thoughts are the stage's ThoughtLayer (none
   * after something heavy: a gentle world never carries the words). The subtitle band is the one layout() keeps.
   */
  function getFlow() {
    flowP ||= (async () => {
      try {
        const [mod, photosMod, cards, reg] = await Promise.all([
          import('../../hushfold/flow/director.js'), import('../../v3/photos.js'), import('../../v3/mallow-cards.js').catch(() => null),
          import('../../hushfold/flow/registry.js').catch(() => null)]);
        if (typeof mod.createHushflow !== 'function') throw new Error('director has no createHushflow');
        if (S.left) throw new Error('left');
        flowReg = reg || flowReg;
        const fallback = cards ? await cards.mallowMaterial(mallowId).catch(() => []) : [];
        const photos = photosMod.photoApi({ dpr: Math.min(2, devicePixelRatio || 1), seed: 11, fallback });
        S.photos = true;
        // (the ThoughtLayer loads lazily: a world starts once it is there, or knowing it never will be)
        const layer = stage ? await stage.whenThoughts() : null;
        if (S.left) throw new Error('left');
        const f = mod.createHushflow({
          app, worldEl: document.getElementById('world'), fxEl: world.fx, mallow: stageMallow,
          thoughts: gentle() || !layer ? null : stage.thoughts, ticker: stage.worldTicker, subtitleBand: () => bandPx || null,
          subtitles: flowSubtitles, photos, words, prefs: flowPrefs, store, safeRect,
          // the person's thought keeps out from under an open garden offer, its card and its chip (on a small phone
          // there is no place for the card clear of a thought in mid-sky: the thought gives way, gently) — and from
          // where the card will show, from the moment the installation has placed it (installKeepOut)
          keepOut: () => installKeepOut(),
        });
        if (!f || typeof f.start !== 'function') throw new Error('director returned no flow');
        f.setAutoFlow?.(!!prefs.get('autoFlow'));
        f.on?.('world', (d) => onWorld(d));
        f.on?.('offer', (d) => onOffer(d));
        f.on?.('finish', () => onFinished());
        f.on?.('error', (d) => onFlowError(d));
        for (const ev of ['stay', 'complete', 'autoflow']) f.on?.(ev, () => { panel?.update(); if (ev === 'complete') app.applyUpdateIfSafe?.(); });
        // the incoming host's art starts loading as the melt begins; halfway, the host takes the stage (owner P2).
        // (an event, never a timer: a paused melt does not move, and neither does its host)
        f.on?.('melt', (d) => { if (d?.k === 0) onMeltBegins(d); panel?.update(); });
        f.on?.('host', (d) => hostMallow(d?.mallow));
        // a paused world holds its thoughts still where they are drawn (a safety pause lets them drift off first)
        f.on?.('pause', (d) => { if (d?.reason !== 'safety') stage?.freeze(true); onPaused(true); });
        f.on?.('resume', () => { stage?.freeze(false); onPaused(false); });
        return f;
      } catch (e) {
        if (!S.left) { console.info('[hushfold] Hushflow director not available, using the stub:', e?.message || e); app.staleCode?.(); }
        return createStubFlow();
      }
    })().then((f) => { flowRef = f; return f; });
    return flowP;
  }
  /** The world paused or resumed (from the panel, the pill or the director). */
  let pausedLine = null;   // the "Paused" line while it is still showing (it goes when the world resumes)
  function onPaused(on) {
    if (S.left) return;
    // resumed from anywhere (the pill, ▶, Space, the panel's own Resume): a care hold is over (a quiet one only ever
    // resumes for the calm world the person asked for: careChoice)
    if (!on && (S.hold === 'care' || S.hold === 'quiet')) S.hold = null;
    if (!on && pausedLine) { pausedLine = null; subtitles.clear({ keepHeld: true }); }
    // the sheet holding a world is not the person pausing it: no pill, no "Paused" line (nor a support or
    // A–Z sheet over it)
    // (nor the question waiting over it: "Shall we play with this…" — holdForAsk)
    if (held || (on && (sheetHold?.paused || askHold))) { panel?.update(); return; }
    // held for a crisis: the world only waits to end quietly (no pill, no line, nothing to resume); held quietly after a
    // death, a loss or harm done to the person: no pill either — it is never offered back (holdQuiet)
    if (on && (S.hold === 'crisis' || S.hold === 'quiet')) { pausedPill.hidden = true; layout(); panel?.update(); return; }
    pausedPill.hidden = !on;
    layout();
    panel?.update();
    // held for care: the pill (Resume is theirs to choose), but no "Paused" line over the support line
    if (on && S.hold !== 'care') {
      const p = pausedLine = say(lines.pick(mallowId, 'paused') || SHARED_LINES.paused[0], { interrupt: !subtitles.holding });
      p.then(() => { if (pausedLine === p) pausedLine = null; });
    }
  }
  function resumeFlow() {
    // a world held for a crisis never resumes in this visit (owner P3): the panel, the pill, ▶ and Space alike; nor one
    // held quietly after a death, a loss or harm done to the person (its calm world, asked for, clears the hold first)
    if (S.hold === 'crisis' || S.hold === 'quiet') { panel?.update(); return; }
    if (S.hold === 'care') S.hold = null;
    pausedPill.hidden = true;
    try { flowRef?.resume?.(); } catch (e) { console.warn(e); }
    if (subtitles.paused) subtitles.resume();
    layout();
    panel?.update();
  }

  let worldMode = false;
  let homeMallow = null;       // the person's own Mallow while a world borrows the stage
  function onWorld(d) {
    if (S.left) return;
    // something heavy was typed while this world loaded: it is held the moment it arrives (the director
    // also enters it paused when it was told in time: d.paused; this covers the moment before it existed)
    const hold = S.crisis ? 'crisis' : S.holdOnWorld;
    S.holdOnWorld = null;
    worldMode = true;
    S.worldAt = now();
    // (a world entered again is on stage again: its offers are its own)
    if (d?.id && d.id === S.meltedFrom) S.meltedFrom = null;
    // a touch on the person's Thought Mallow goes to the world, which carries it and hands it on itself
    router.setWorld((r) => flowRef?.pointer?.(r), { thoughts: true });
    root.classList.add('hf-world');
    // the words ride into the world on the newest thought; the others drift off (after something heavy, all of them)
    const primary = gentle() ? null : stage?.thoughts.primary;
    stage?.thoughts.release(900, (stage?.thoughts.list || []).filter((t) => t !== primary));
    // the realm is hidden under the world: it draws nothing until the world ends (A6)
    world.realm?.pause?.(true);
    S.worldTitle = d?.title || S.worldTitle;
    requestAnimationFrame(() => document.body.classList.remove('hf-world-arriving'));
    if (hold === 'crisis') {
      // held at once under its veil (no host, no title, no lines), and ended quietly as soon as the
      // overlay is closed (owner P3)
      S.hold = 'crisis';
      try { flowRef?.setAutoFlow?.(false); flowRef?.pause?.({ reason: 'safety' }); } catch (e) { console.warn(e); }
      if (!overlay) endCrisisWorld();
      panel?.update();
      return;
    }
    if (hold) { S.hold = S.noResume ? 'quiet' : 'care'; try { flowRef?.pause?.({ reason: 'safety' }); } catch (e) { console.warn(e); } }
    // a world started fresh over a held one (care, then a calm world): nothing is paused any more
    else if (!flowRef?.state?.paused) pausedPill.hidden = true;
    // a world's first arrival: its host's place on the world's floor is planned at once (the world lays itself out
    // round it), but it sets off from beside the person's words only once they have faded out of its way (heroWaitsForWords)
    const cold = !d?.from;
    if (cold) stageMallow?.holdPlace?.(true);
    // each world has its own Mallow (Glitzi hosts the Static Storm); after a melt the host already took the
    // stage halfway through it ('host'), so this is the first world's, or a melt whose 'host' never came
    if (d?.mallow && MALLOWS[d.mallow] && d.mallow !== mallowId) {
      homeMallow ||= mallowId;
      mallowId = d.mallow;
      theme();
      showMallow(mallowId, { entrance: !d.from && !prefs.reducedMotion(), soft: true });
    }
    layout();
    if (cold) heroWaitsForWords();
    // a world's name, once, in story type, ahead of its first line (not while it waits under its veil)
    // (nor while the question waits: a world arriving under it — the first Tell's, after "Play with it", with a second
    // Tell asked about meanwhile — waits under its veil until it is answered, never plays on under it: holdForAsk)
    const quietArrival = !hold && S.softArrive;
    S.softArrive = false;
    if (quietArrival) {
      S.hold = 'quiet'; S.softHold = true; pausedPill.hidden = true;
      try { flowRef?.setThoughts?.(null); flowRef?.pause?.({ reason: 'safety' }); } catch (e) { console.warn(e); }
      if (!S.quietBeat) later(() => { if (S.hold === 'quiet' && S.softHold && !S.quietBeat && !S.asking && !overlay) endQuietWorld(); }, 600);
    }
    if (d?.title && !d.from && !hold && !S.asking && !quietArrival) subtitles.say({ text: d.title, kind: 'title' }, { first: true });
    // (its postcards fold away at once; it is held once its first frames have faded in — paused on its very first frame it
    // would wait unseen, the realm frozen under the new host — so the person sees the world they chose waiting)
    if (!hold && !quietArrival && S.asking) {
      foldWorld(true);
      later(() => { if (S.asking && worldMode && !S.finishing) { holdForAsk(true); stageMallow?.setStage?.(CARE_FACE, { quiet: true }); } }, prefs.reducedMotion() ? 420 : 800);
    }
    if (panel?.isOpen) holdWorld(true);
    if (sheets.length) holdForSheet(true);
    panel?.update();
  }
  /**
   * Halfway through a melt (the director's 'host', owner P2): the incoming world's Mallow takes the stage,
   * as a soft cross-fade with a small hop (never a pop). onWorld then finds it already there.
   */
  /**
   * A world's first arrival on a small phone: the person's words, shown beside their Mallow at home, are where the
   * world's host is about to stand (larger and lower on the world's floor). The host's place is already planned
   * (restRect reports it, so the world and the ThoughtLayer keep off it: the layer hides a driven thought's words while
   * the hero covers every place round it); the host sets off only once the words have faded out — it never walks over
   * them while they can be seen. Nothing in the way, or nothing to wait for: it goes at once (and never waits > 0.9 s).
   */
  const WORDS_OUT_MS = 230;   // .tm-tag's fade-out (.2 s) and a frame
  function wordsInHeroWay() {
    const L = stage?.thoughts, K = mallowAvoidRect();
    if (!L?.tagRect || !K) return false;
    return (L.list || []).some((t) => overlaps(L.tagRect(t), K));
  }
  function heroWaitsForWords() {
    if (!stageMallow?.placeHeld) return;
    if (!wordsInHeroWay()) { stageMallow.holdPlace(0); return; }
    const t0 = now();
    let clearAt = 0;
    const tick = () => {
      if (!stageMallow?.placeHeld) return;
      if (!worldMode || S.finishing) { stageMallow.holdPlace(0); return; }
      if (wordsInHeroWay()) clearAt = 0; else clearAt ||= now();
      if ((clearAt && now() - clearAt >= WORDS_OUT_MS) || now() - t0 > 900) { stageMallow.holdPlace(0); return; }
      later(tick, 30);
    };
    later(tick, 30);
  }
  function hostMallow(id) {
    if (S.left || !worldMode || S.finishing || !MALLOWS[id] || id === mallowId) return;
    homeMallow ||= mallowId;
    mallowId = id;
    // (the dock's "Tell …" and the colours change with the host on stage — showMallow calls theme() as the new one is
    // revealed — never while the one leaving is still the hero)
    showMallow(id, { entrance: false, soft: true, hop: true });
  }
  function endWorldMode() {
    // the stage is the Hushfold's again: no float left over from the water, the realm draws again
    // (a host still waiting for the words to clear its way goes now: it is going home)
    stageMallow?.holdPlace?.(0);
    stageMallow?.float?.({ lift: 0, tilt: 0 });
    world.realm?.pause?.(false);
    worldMode = false;
    S.finishing = false;
    if (S.hold === 'care' || S.hold === 'quiet') S.hold = null;
    S.softHold = false; askHold = null;
    if (folded) { folded = false; document.body.classList.remove('hf-ask-fold'); }
    foldThought(false);
    // a world line still queued (its intro after a few pauses) never plays after the world has gone
    pausedLine = null;
    subtitles.clear({ keepHeld: true });
    root.classList.remove('hf-world');
    document.body.classList.remove('hf-world-arriving');
    if (held) { held = null; document.body.classList.remove('hf-world-held'); }
    sheetHold = null;
    router?.setWorld(null);
    try { flowRef?.destroy?.(); } catch (e) { console.warn(e); }
    flowP = null; flowRef = null;
    stage?.freeze(false);
    pausedPill.hidden = true;
    // (after something heavy, the person's Mallow comes back without a hop)
    if (homeMallow) { mallowId = homeMallow; homeMallow = null; theme(); showMallow(mallowId, { entrance: !softNow() }); world.setRealm(M().realm, { crossfadeMs: 1400 }); }
    layout();
    // the person's thought comes back beside their Mallow, near again (the world had it far out on the water)
    const back = stage?.thoughts.primary;
    // (the world has let go of it: it sets off for that home now, its words waiting until it is there — never shown at
    // the new home while it is still held where the world left it)
    if (back && !back.leaving) { try { back.letGo?.(); back.moveHome(thoughtHome); back.closer?.(0); back.labelSide = null; back.labelFit = null; } catch (e) { console.warn(e); } }
    panel?.update();
  }
  /**
   * A melt begins: the incoming host's art starts loading, and the world melting away takes what it was still saying
   * with it — its passing lines and what it held for a tap (a discovery's line and its Continue): the next world's
   * host never speaks behind them, and the old world's garden offer never comes over the new host (onOffer).
   */
  function onMeltBegins(d) {
    if (MALLOWS[d?.mallow]) loadMallowAssets(d.mallow).catch(() => {});
    if (!d?.from) return;
    S.meltedFrom = d.from;
    subtitles.drop?.((o) => o?.world === d.from);
  }
  function onFinished() {
    if (S.left) return;
    if (S.finishing) return;
    // from here the world says nothing more: what it had queued goes (a held line or a choice stays)
    S.finishing = true;
    // (a calm line cut short by a world that arrived under it is said again, whole, once the world has gone)
    if (crisisLine) { crisisLine = null; S.crisisSpoken = false; }
    subtitles.clear({ keepHeld: true });
    // ...and what the finished world itself still held for a tap goes with it (a discovery's line and its Continue,
    // "Stay, or drift on?"): the home stage is the person's own Mallow's, and its closing line must not wait behind
    // them. (A care choice of the person's Mallow showing then goes too; the quiet line follows all the same.)
    if (worldHeld.drop()) subtitles.clear();
    // after a crisis nothing that invites play is kept either: no choice, no Paused pill, nothing to resume
    if (S.crisis) { subtitles.clear(); pausedPill.hidden = true; forgetProgress(); }
    // (a paused world that is finished: its Paused pill and line go with it, not 1.25 s later)
    pausedPill.hidden = true; pausedLine = null;
    // the realm underneath runs again as the world's last frame melts away over it
    world.realm?.pause?.(false);
    // the closing line is for the stage: the panel steps aside so it is seen
    panel?.close();
    // a garden offer left unanswered folds into its chip, which waits unseen while the world says goodbye: it never
    // unfolds into a full card on the roomier home stage over the closing line, the dock or the thought going home
    holdOffer(true);
    // the last frame melts away over the Hushfold's own realm
    document.body.classList.add('hf-world-leaving');
    later(() => {
      endWorldMode();
      document.body.classList.remove('hf-world-leaving');
      // after a crisis no goodbye: the one calm line, now that the world has gone (or when the sheet
      // over it closes); after care, no cheery goodbye: the attentive face and a quiet line
      if (softNow()) stageMallow?.setStage?.(CARE_FACE, { quiet: true });
      const goodbye = () => {
        if (S.left || worldMode || S.finishing) return;
        let bye = null;
        if (S.crisis) { speakCrisis(); } else if (softNow()) bye = say(SHARED_LINES.careQuiet); else bye = say(lines.pick(mallowId, 'finished') || SHARED_LINES.finished[0]);
        // (the chip comes back in a corner once the closing line has been said, and the thought is home: 8 s at most)
        Promise.resolve(bye).then(() => later(() => holdOffer(false), 300));
      };
      later(() => holdOffer(false), 8000);
      app.applyUpdateIfSafe?.();
      // The closing line is placed knowing where the person's thought comes to rest: it is on its way home from the
      // world (planned again once the Mallow has landed, 780 ms), its words waiting until it is there. Placed before
      // that, the line went where the words were about to fade in, and then had to jump away mid-read. So it waits
      // until the thought is home with its words showing (the lines keep clear of them from the first frame), 1.8 s at
      // most; with no thought on the stage (or after a crisis: the one calm line, at once) it is said now.
      const L = stage?.thoughts, home = L?.primary;
      if (S.crisis || !home || home.leaving || typeof L?.tagRect !== 'function') { goodbye(); return; }
      const t0 = now();
      let still = 0;
      const atRest = () => {
        if (home.leaving || !(L.list || []).includes?.(home)) return true;
        const d = Math.hypot((home.x ?? 0) - (home.home?.x ?? home.x ?? 0), (home.y ?? 0) - (home.home?.y ?? home.y ?? 0));
        return d < 4 && !!L.tagRect(home);
      };
      const wait = () => {
        if (S.left || worldMode || S.finishing) return;
        // (after the re-plan, and home with its words on two looks in a row, 90 ms apart)
        still = now() - t0 >= 820 && atRest() ? still + 1 : 0;
        if (still >= 2 || now() - t0 >= 1800) { goodbye(); return; }
        later(wait, 90);
      };
      later(wait, 90);
    }, 1250);
  }
  /** A world's goodbye holds the garden offer folded (garden-install's holdInstall); one hold at a time, always let go. */
  let offerHeld = false;
  function holdOffer(on) {
    if (!!on === offerHeld) return;
    offerHeld = !!on;
    try { installMod?.holdInstall?.(offerHeld); } catch (e) { console.warn('[garden]', e); }
  }
  function onFlowError(d) {
    // a world's code that no longer loads is usually an older deploy's: move to the newer one when it is safe
    if (d?.kind === 'load') app.staleCode?.();
    if (S.left || worldMode) return;
    // (after something heavy, no "squish" joke: the quiet line)
    if (d?.kind === 'none' || d?.kind === 'start' || d?.kind === 'load') say(softNow() ? SHARED_LINES.careQuiet : SHARED_LINES.stub[0]);
  }
  /**
   * A discovery offered for the Memory Garden (W5): garden-install owns the whole moment (offer →
   * save only on the "Keep this" tap → install, or "already in your garden"). The reward never
   * needs more play. Never after something heavy (no garden offers while support is showing, owner
   * P4); a safety hold or leaving aborts it (signal), and the Mallow's face and what the world
   * keeps clear are read live, so the offer stays off them as things move.
   */
  /** The person's thoughts (soft: kept clear when it can be) and their words tags, as they are on screen now. */
  function thoughtWords() {
    const Lr = stage?.thoughts;
    if (!Lr) return [];
    const out = (Lr.rects?.() || []).map((r) => ({ left: r.left, top: r.top, right: r.right, bottom: r.bottom, soft: true }));
    // (the layer's own record of where each tag is: read every frame of the moment, so no layout is forced)
    for (const th of Lr.thoughts || []) { const t = Lr.tagRect?.(th); if (t) out.push({ left: t.left, top: t.top, right: t.right, bottom: t.bottom }); }
    return out;
  }
  async function onOffer({ skillId, worldId } = {}) {
    if (S.left || S.crisis || gentle()) return;
    // (an offer from a world that has melted away, or is melting away, is that world's: never over the next host)
    if (worldId && worldId === S.meltedFrom) return;
    let install;
    try { install = installMod ||= await import('../../hushfold/garden-install.js'); } catch (e) { console.warn('[garden]', e?.message); app.staleCode?.(); return; }
    let host = null;
    try { host = (await import('../../hushfold/flow/registry.js')).registry.get(worldId)?.mallow?.id || null; } catch { /* the world's host is decoration */ }
    if (S.left || S.crisis || gentle() || !ent.has('paid')) return;
    const origin = () => stageMallow?.bodyRect?.() || null;
    const face = () => { try { return install.mallowFaceRect(origin(), MALLOWS[mallowId]); } catch { return null; } };
    offerCtl?.abort();
    const ctl = offerCtl = new AbortController();
    // the world never melts away from under an open offer (it folds into a chip after a while: then it may)
    const flow = flowRef;
    try { flow?.hold?.('offer', true); } catch { /* an older director */ }
    // (it keeps off the person's Thought Mallow as that moves, until the offer, card and chip have gone)
    watchInstall(true);
    try {
      // (words: the person's thoughts and their words tags, which the installation's charm never forms on or flies across)
      await install.onOffer({ app, store, skillId, worldId, mallow: MALLOWS[host] ? host : mallowId, origin, face, avoid: offerAvoid, words: thoughtWords,
        subtitles: installSubtitles, reducedMotion: prefs.reducedMotion(), lowStim: lowStimNow(), signal: ctl.signal });
    } catch (e) { console.warn('[garden] onOffer', e); } finally {
      try { flow?.hold?.('offer', false); } catch { /* gone */ }
      if (offerCtl === ctl) offerCtl = null;
      cardWait(false);
      installSubtitles.resume();
      // the person's thought may have risen into the quiet subtitle band to make way for the card: the band's ▶ pill and
      // the stage's bounds come back once it has left it again (the world takes it back down at once; 3 s at most), as
      // the lines do (installSubtitles.resume) — never over it
      const t0 = now();
      const quietOff = () => {
        if (S.left || offerCtl != null) return;   // (a new offer has the band now)
        if (thoughtInBand() && now() - t0 < 3000) { later(quietOff, 60); return; }
        if (root.classList.contains('hf-install-quiet')) { root.classList.remove('hf-install-quiet'); layout(); }
        app.applyUpdateIfSafe?.();
      };
      quietOff();
    }
  }
  /**
   * What the offer, its card and its chip must leave uncovered (the face is kept clear through `face`, and
   * the face the Mallow is gliding to through landingFace()). While the phone sheet holds a world, the
   * world's subtitle band is not in use (one line sits in the strip above the Mallow, and garden-install
   * steps out of the lines themselves), so the offer may use that room.
   */
  function offerAvoid() {
    // (the installation's card is large: on a phone a world's postcards or bubbles and its subtitle band leave it no
    // clear place, and then it would be squeezed over the person's own thought. Their words come first: for its few
    // seconds the card may lie over the world's things, and over the band — the installation pauses and clears the
    // lines meanwhile, and the lines keep off the card once they come back — never over the thought or its words)
    const inst = installing(), world = flowRef?.avoid?.() || [];
    const things = inst ? world.filter((r) => r?.kind !== 'card' && r?.kind !== 'bubble') : world;
    // (the world's subtitle band is the lines': the offer keeps off it while a line or a choice is up; in its free time
    // ({ kind: 'band' }) it may lie in it when nothing outside it is clear — on a small phone the only place clear of the
    // hero, its words and the bubbles — and when a line comes the line keeps its band: the offer steps aside, or folds
    // into its chip rather than onto the Mallow)
    const band = worldMode && !panelSheet() && !inst ? flowRef?.subtitleBand?.() : null;
    // (the panel or the phone sheet and the overlay are never covered, not even by the folded chip with no corner free: hard)
    return [...things, band && (linesUp() ? band : { ...band, kind: 'band' }), ...(stage?.thoughts.rects() || []),
      thoughtRestRect(), hard(overlay?.rect?.()), hard(panelRect()), landingFace()].filter(Boolean);
  }
  const hard = (r) => (r && r.bottom > r.top && r.right > r.left ? { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.right - r.left, height: r.bottom - r.top, hard: true } : null);
  /** A line or a choice is showing (or going) on the stage now. */
  const linesUp = () => typeof document !== 'undefined' && !!document.querySelector('.hf-subs .hf-sub, .hf-subs .hf-chips:not([hidden])');
  /** An offer, card or chip lying in the world's subtitle band (in its free time): the lines never step round it. */
  function inWorldBand(r) {
    const b = worldMode && !panelSheet() ? flowRef?.subtitleBand?.() : null;
    return !!(b && b.h > 0 && r && r.top >= b.y - 4 && r.bottom <= b.y + b.h + 4);
  }
  /** Is the garden installation (its portal and card) on stage now? */
  const installing = () => typeof document !== 'undefined' && !!document.querySelector('.hm-install, .hm-install-card');
  /**
   * Where the world is taking the person's Thought Mallow to rest, with its words, while it is on its way there (the
   * first seconds of a world): its box now, moved to the world's place for it (the Static Storm's thoughtRest — its
   * planned place as moved by what it gave way to — or else its layoutPlan.thought); null when the world has no such
   * place, there is no thought, or it has had time to arrive (then where it is counts, and the offer steps aside if
   * it moves: watchInstall). An offer placed beside the thought on its way would otherwise end up over it.
   */
  function thoughtRestRect() {
    const p = worldMode && now() - S.worldAt < 3000 ? stage?.thoughts.primary : null;
    if (!p) return null;
    let T = null;
    try { const w = flowRef?.world; T = w?.thoughtRest || w?.layoutPlan?.thought || null; } catch { T = null; }
    if (!T || !Number.isFinite(T.x) || !Number.isFinite(T.y) || !Number.isFinite(p.x) || !Number.isFinite(p.y)) return null;
    const r = (stage.thoughts.rects() || []).find((q) => q.id === p.id);
    if (!r) return null;
    const dx = T.x - p.x, dy = T.y - p.y;
    return { left: r.left + dx, right: r.right + dx, top: r.top + dy, bottom: r.bottom + dy };
  }
  /**
   * While a garden offer, its card or its chip is up, the person's Thought Mallow can still move under it (a world
   * carries it, the swells take it out, a finger drags it): the moment the two meet, the offer steps aside
   * (relayoutInstall places it again, clear of the thought where it is and where it is going), at most every 0.6 s.
   */
  let installWatch = 0;
  function watchInstall(on) {
    clearInterval(installWatch); installWatch = 0;
    if (!on || S.left) return;
    let last = 0, bodyTry = 0;
    installWatch = setInterval(() => {
      if (S.left) { watchInstall(false); return; }
      const mine = installMod?.installAvoidRects?.() || [];
      if (!mine.length) { if (!offerCtl) watchInstall(false); return; }
      if (now() - last < 600) return;
      const th = [...(stage?.thoughts.rects() || []), thoughtRestRect()].filter(Boolean);
      if (!mine.some((r) => th.some((t) => overlaps(r, t)))) {
        // (placed over the Mallow's body because nothing else was free then — a line was up, the thought on its way:
        // it tries again for a clear place every 2 s while it lies there; placeBox keeps it where it is if none is free)
        const b = stageMallow?.bodyRect?.();
        const body = b?.height ? { left: b.left, top: b.top, right: b.left + b.width, bottom: b.top + b.height } : null;
        if (!body || now() - bodyTry < 2000 || !mine.some((r) => overlaps(r, body))) return;
        bodyTry = now();
      }
      last = now();
      installMod.relayoutInstall?.();
    }, 200);
  }
  /**
   * The installation's own moments (garden-install's 'hm:install'). 'start': it has paused the lines for its moment —
   * not the person's pause, so the ▶ pill steps back (and leaves the card its room) until the offer is over.
   * 'card': the card is about to show, placed again now against where the thought is.
   */
  const onInstallPhase = (e) => {
    if (S.left) return;
    const ph = e?.detail?.phase;
    if (ph === 'start') { root.classList.add('hf-install-quiet'); layout(); }
    if (ph === 'card') { try { installMod?.relayoutInstall?.(); } catch { /* gone */ } cardWaitsForThought(); }
    if (ph === 'end') cardWait(false);
  };
  /**
   * The installation's card where it shows (garden-install places it as the installation starts and shows it at 2.6 s —
   * 0.75 s with reduced motion), from its placing until it goes: its layout box, and the charm that rises 60 px over a
   * full card. (installAvoidRects has it only once it can be seen: not before, nor in the first frames of its fade-in.)
   * Null when there is none, or once it is going.
   */
  function plannedCardRect() {
    const c = typeof document !== 'undefined' ? document.querySelector('.hm-install-card:not(.is-out)') : null;
    if (!c?.isConnected) return null;
    const w = c.offsetWidth, h = c.offsetHeight;
    if (!(w > 0 && h > 0)) return null;
    const lift = c.classList.contains('is-compact') || c.classList.contains('is-tight') ? 0 : 60, l = c.offsetLeft, t = c.offsetTop;
    return { left: l, top: t - lift, right: l + w, bottom: t + h, width: w, height: h + lift };
  }
  /**
   * What the person's thought keeps clear of (the director's keepOut): the open offer, card and chip, and the card to
   * come — with KEEP_PAD px to spare, so the words as drawn (they trail their thought and sway a few px with it) stay
   * clear of the edge too, not only the place the world plans for them.
   */
  const KEEP_PAD = 10;
  function installKeepOut() {
    const shown = installMod?.installAvoidRects?.() || [], planned = plannedCardRect();
    return (planned ? [...shown, planned] : shown).map((r) => ({ left: r.left - KEEP_PAD, top: r.top - KEEP_PAD, right: r.right + KEEP_PAD, bottom: r.bottom + KEEP_PAD }));
  }
  /**
   * The card is about to show: if the person's thought (its body or its words) is still under where it shows — it has
   * been making way since the installation began, but a finger may hold it, or a reduced-motion card comes sooner —
   * the card stays unseen (body.hf-card-wait) until the thought is clear of it, then fades in as it would have
   * (at most 0.9 s later). The card is never seen over the person's words.
   */
  let cardWaiting = false;
  function cardWait(on) {
    cardWaiting = !!on;
    if (typeof document !== 'undefined') document.body.classList.toggle('hf-card-wait', cardWaiting);
  }
  const cardOverThought = () => {
    const c = plannedCardRect();
    if (!c) return false;
    const pad = { left: c.left - 4, top: c.top - 4, right: c.right + 4, bottom: c.bottom + 4 };
    return (stage?.thoughts.rects() || []).some((r) => overlaps(pad, r));
  };
  function cardWaitsForThought() {
    cardWait(true);
    if (!cardOverThought()) { cardWait(false); return; }
    const t0 = now();
    const tick = () => {
      if (!cardWaiting) return;
      if (!cardOverThought() || now() - t0 > 900 || !document.querySelector('.hm-install-card:not(.is-out)')) { cardWait(false); return; }
      later(tick, 30);
    };
    later(tick, 30);
  }
  /** The person's thought is in the subtitle band (it may rise into it while the installation keeps the lines quiet). */
  function thoughtInBand() {
    const b = worldMode ? flowRef?.subtitleBand?.() : null;
    if (!b || !(b.h > 0)) return false;
    return (stage?.thoughts.rects() || []).some((r) => r.top < b.y + b.h && r.bottom > b.y);
  }
  /** The offer's own life (garden-install's 'hm:offer'): folded into its chip, the world may drift on again; unfolded, it holds. */
  const onOfferPhase = (e) => {
    const ph = e?.detail?.phase;
    if (!offerCtl || !flowRef?.hold) return;
    try {
      if (ph === 'fold' || ph === 'close') flowRef.hold('offer', false);
      else if (ph === 'unfold' || ph === 'open') flowRef.hold('offer', true);
    } catch { /* an older director */ }
  };
  /** The open panel where it comes to rest (the phone sheet's slide-in transform is ignored), or null. */
  function panelRect() {
    if (!panel?.isOpen) return null;
    return panelSheet() ? { left: 0, right: innerWidth, top: panelTop(), bottom: innerHeight } : panel.el.getBoundingClientRect();
  }
  /**
   * The subtitles as the installation sees them: it pauses them while it plays and resumes them
   * after, but only if it was the one that paused them (the person's own ⏸ stays pressed).
   */
  let installPaused = false;
  const installSubtitles = ((shown) => {
    // (the lines as the installation sees them: when it gives them back, they come back once the person's thought has
    // left the subtitle band — it may have risen into the quiet band to make way for the card — as long as the card is
    // up, and 3 s at most after it. A pause asked for meanwhile, a second installation's, finds them not paused yet:
    // so it is that installation's own pause, and its resume brings them back.)
    let back = 0, gen = 0;
    const subtitles = {
      get paused() { return shown.paused && !back; },
      clear: (o) => shown.clear(o),
      pause() { back = 0; shown.pause(); },
      resume() {
        const g = back = ++gen;
        let freeAt = 0;
        const go = () => {
          if (back !== g) return;
          const inst = installing();
          if (!inst) freeAt ||= now();
          if (!S.left && thoughtInBand() && (inst || now() - freeAt < 3000)) { later(go, 60); return; }
          back = 0; shown.resume();
        };
        go();
      },
    };
    return {
      pause() { installPaused = !subtitles.paused; subtitles.clear({ keepHeld: true }); subtitles.pause(); },
      resume() { if (installPaused) { installPaused = false; subtitles.resume(); } },
    };
  })(subtitles);

  // ------------------------------------------------- the Mallow --
  /**
   * Put Mallow `id` on the stage. entrance: a hop as it arrives. soft (a world's host taking the stage): the
   * Mallow there now cross-fades into the new one instead of being swapped in one frame, and hop adds a small
   * hop once it is there (neither under reduced motion; the cross-fade is quicker then).
   */
  async function showMallow(id, { entrance = true, soft = false, hop = false } = {}) {
    if (touchMt) {
      // the MallowTouch stage (W2): same calls, the soft body instead of the rig
      let fade = null;
      if (touchMt.id !== id) {
        // (the picture of the one leaving is taken in the shared loop, right after it was drawn; the swap waits for it)
        if (soft && touchBox) fade = await crossFadeFrom();
        if (!touchMt || S.left) { fade?.cancel(); return touchMt?.rig || null; }
        touchMt.setMallow?.(id);
      }
      // (a Mallow whose art failed to load keeps the one on screen; the stage carries on)
      try { await touchMt.loaded; } catch (e) { console.warn('[hushfold] MallowTouch', e?.message || e); }
      if (!touchMt) { fade?.cancel(); return null; }
      const bounce = (entrance || hop) && !prefs.reducedMotion() && !S.left && id === mallowId;
      // (the hop as the new one comes into view, not while it is still hidden under the picture)
      if (fade) fade.reveal(() => { if (bounce && touchMt?.id === id) touchMt.react('hop'); });
      else if (bounce) touchMt.react('hop');
      if (S.left || id !== mallowId) return touchMt.rig;
      // (a new face on stage — a world's host halfway through a gentle melt, or arriving under the question — keeps the
      // attentive face after something heavy, or while it asks)
      if (softNow() || S.asking) stageMallow?.setStage?.(CARE_FACE, { quiet: true });
      theme(); layout();
      return touchMt.rig;
    }
    const rig = await world.setMallow(id, { entrance, interactive: true });
    if (S.left || id !== mallowId) return rig;
    stageMallow.attach(rig);
    if (softNow() || S.asking) stageMallow.setStage?.(CARE_FACE, { quiet: true });
    theme();
    layout();
    return rig;
  }
  /**
   * A soft swap of the stage Mallow (MallowTouch swaps in one frame by itself). Resolves once the Mallow on
   * stage now is held as a picture on a canvas of its own over the stage (taken inside the shared loop right
   * after MallowTouch drew it, while a WebGL canvas still holds its frame) and the stage Mallow is hidden:
   * reveal() then fades the new one in under it while the picture fades out (a cross-fade); cancel() simply
   * shows the stage Mallow again. Without a picture (a stalled loop) it is a quick dip, never a pop.
   */
  let heroGhost = null;   // { end() } while a cross-fade is on
  function crossFadeFrom() {
    heroGhost?.end();
    return new Promise((resolve) => {
      const box = touchBox;
      const ms = prefs.reducedMotion() ? 220 : 520;
      let fired = false, seen = -1, tries = 0;
      const take = () => {
        if (fired) return;
        // (an idle MallowTouch draws every other frame: a frame it skipped has no picture to take)
        const sk = touchMt?.stats?.skipped ?? 0;
        if (sk !== seen && tries++ < 4) { seen = sk; return; }
        fired = true;
        removeTicker(take);
        clearTimeout(stall);
        if (S.left || !box?.isConnected || !touchMt) { resolve({ reveal(onShow) { onShow?.(); }, cancel() {} }); return; }
        let pic = null;
        try { pic = heroPicture(box); } catch (e) { console.warn('[hushfold] host picture', e?.message || e); pic = null; }
        box.style.transition = 'none';
        box.style.opacity = '0';
        if (pic) box.after(pic);
        let gone = false;
        const end = () => {
          if (gone) return;
          gone = true;
          pic?.remove();
          box.style.transition = ''; box.style.opacity = '';
          if (heroGhost === g) heroGhost = null;
        };
        const g = heroGhost = { end };
        resolve({
          reveal(onShow) {
            if (gone) { onShow?.(); return; }
            // (in the shared loop's next frame, right after MallowTouch drew the new Mallow once, unseen: no rAF of its own)
            const once = () => {
              removeTicker(once);
              if (gone) return;
              onShow?.();
              box.style.transition = `opacity ${ms}ms ease`;
              box.style.opacity = '1';
              if (pic) { pic.style.transition = `opacity ${ms}ms ease`; pic.style.opacity = '0'; }
              setTimeout(end, ms + 80);
            };
            addTicker(once);
          },
          cancel: end,
        });
      };
      const stall = setTimeout(() => { tries = 99; seen = -2; take(); }, 400);
      addTicker(take);
    });
  }
  /** The stage Mallow as it is drawn this frame (its body with room round it), on a canvas over the stage; null if none. */
  function heroPicture(box) {
    const b = stageMallow?.bodyRect?.();
    if (!b?.width || !b?.height) return null;
    const left = Math.floor(b.left - b.width * 0.4), top = Math.floor(b.top - b.height * 0.5);
    const w = Math.ceil(b.width * 1.8), hh = Math.ceil(b.height * 1.8);
    const dpr = Math.min(2, devicePixelRatio || 1);
    const c = document.createElement('canvas');
    c.className = 'hf-hero-ghost';
    c.setAttribute('aria-hidden', 'true');
    c.width = Math.max(1, Math.round(w * dpr)); c.height = Math.max(1, Math.round(hh * dpr));
    Object.assign(c.style, { position: 'fixed', left: `${left}px`, top: `${top}px`, width: `${w}px`, height: `${hh}px`, zIndex: '1', pointerEvents: 'none', opacity: '1' });
    const g = c.getContext('2d');
    let drew = false;
    for (const src of box.querySelectorAll('canvas')) {
      if (!src.width || !src.height || src.style.display === 'none') continue;
      const r = src.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      const kx = src.width / r.width, ky = src.height / r.height;
      g.drawImage(src, (left - r.left) * kx, (top - r.top) * ky, w * kx, hh * ky, 0, 0, c.width, c.height);
      drew = true;
    }
    return drew ? c : null;
  }
  async function switchMallow(dir) {
    if (worldMode) {
      // a world keeps its host and its realm: the pick is who the person comes back to
      const base = homeMallow || mallowId;
      homeMallow = MALLOW_IDS[(MALLOW_IDS.indexOf(base) + dir + MALLOW_IDS.length) % MALLOW_IDS.length];
      app.state.homeMallow = homeMallow;
      prefs.set('mallow', homeMallow);
      app.audio.ui('select');
      panel?.update();
      say(SHARED_LINES.switchLater[0].replace('{name}', MALLOWS[homeMallow].name), { interrupt: !subtitles.holding });
      return;
    }
    const i = (MALLOW_IDS.indexOf(mallowId) + dir + MALLOW_IDS.length) % MALLOW_IDS.length;
    mallowId = MALLOW_IDS[i];
    app.state.homeMallow = mallowId;
    prefs.set('mallow', mallowId);
    if (homeMallow) homeMallow = mallowId;   // in a world: their pick is who they come back to
    app.audio.ui('whoosh');
    subtitles.clear();
    theme();
    await showMallow(mallowId);
    world.setRealm(M().realm, { crossfadeMs: 1200 });
    if (softNow()) {
      // after something heavy (or "Just be with it"): a new face, no jokey hello
      stageMallow.setStage(CARE_FACE, { quiet: true });
    } else {
      stageMallow.setStage('curious');
      say(M().voice.hello[S.reactions % M().voice.hello.length], { interrupt: !subtitles.holding });
      later(() => stageMallow.setStage('neutral'), 2600);
    }
    panel?.update();
  }

  function onMallowTouch(e) {
    if (e.kind === 'press') { S.touches++; clearNudge(); return; }
    if (!REACTION_KINDS.has(e.kind) && e.kind !== 'release') return;
    if (e.kind === 'release') return;
    S.touches++; S.reactions++;
    clearNudge();
    if (overlay) return;                                     // they are typing: no chatter
    if (softNow()) return;                                   // after something heavy, or "Just be with it": squeezing stays, the jokes go
    if (S.asking) return;                                    // (asking whether to play with the words: the same, while it waits)
    const t = now();
    if (!S.firstTouchAt) {
      S.firstTouchAt = t;
      // the overlay is ready before anyone asks for it (so it can open inside the tap)
      idle(() => { if (!S.left) preloadInput().catch(() => {}); });
      say(lines.pick(mallowId, 'first', { kind: e.kind }), { interrupt: !subtitles.holding });
      return;
    }
    if (canInvite() && S.reactions >= 3 && t - S.firstTouchAt > 5500 && !subtitles.busy) { invite(); return; }
    if (S.reactions >= 3) scheduleInvite();
    // an occasional line, never a running commentary
    if (!subtitles.busy && t - S.lastLineAt > 9000 && S.reactions % 3 === 0) say(lines.pick(mallowId, 'squeeze', { kind: e.kind }));
  }
  let nudgeT = 0;
  function clearNudge() { clearTimeout(nudgeT); timers.delete(nudgeT); }
  const canInvite = () => !S.invited && !S.told && !S.crisis && !S.care && !softNow() && !overlay && !worldMode && !S.flowAsked;
  // someone who squeezed a few times and then just watches is invited too, once the stage is quiet
  let inviteT = 0;
  function scheduleInvite() {
    if (!canInvite()) return;
    clearTimeout(inviteT); timers.delete(inviteT);
    const wait = Math.max(2600, S.firstTouchAt + 5500 - now());
    inviteT = later(function tryInvite() {
      if (!canInvite()) return;
      // (a finger still on the Mallow is fine: the brief's invitation arrives mid-squeeze)
      if (subtitles.busy || panel?.isOpen) { inviteT = later(tryInvite, 1600); return; }
      invite();
    }, wait);
  }

  async function invite() {
    S.invited = true;
    clearTimeout(inviteT);
    preloadInput().catch(() => {});
    const [l1, l2] = lines.invitation(mallowId);
    await say(l1);
    // (something heavy typed meanwhile, sent or not: the invitation goes)
    if (S.left || overlay || S.told || softNow()) return;
    showTell(true);
    // "Tell me" opens the overlay inside the tap itself; an invitation never outlives typing (transient)
    const v = await subtitles.choice(l2, [{ label: 'Tell me', value: 'tell', primary: true, onPick: () => openTell('chip', l2) }, { label: 'Just play', value: 'play' }],
      { who: M().name, colour: M().colours.glow, timeoutMs: 16000, transient: true });
    if (S.left) return;
    S.lastLineAt = now();
    if (v === 'tell') openTell('chip', l2);
    else if (v === 'play' && !softNow()) { S.intention ||= 'play'; say(lines.pick(mallowId, 'justPlay')); }
    // ignored: nothing else. The Tell pill stays; they can play for as long as they like.
  }
  /** The dock's Support pill under the open Tell overlay (whose own Support chip is the one): stepped away, or back. */
  function supportUnder(on) {
    supportPill.classList.toggle('is-under', !!on);
    supportPill.inert = !!on;
    if (on) supportPill.setAttribute('aria-hidden', 'true'); else supportPill.removeAttribute('aria-hidden');
  }
  function showTell(on) {
    const was = !tellBtn.classList.contains('is-hidden');
    tellBtn.classList.toggle('is-hidden', !on);
    // (the dock grew or shrank: the thoughts' room and the Mallow follow)
    if (was !== !!on && stage) layout();
  }

  // ------------------------------------------------------ safety --
  const gentle = () => S.level !== 'none';
  /**
   * A quiet visit: something heavy was seen (gentle()), or the person chose "Just be with it" or let the question go
   * (S.soft). The Mallow's own playful chatter stays away for the rest of it (squeeze quips, invitations, hellos, the
   * feeling and "just play" lines, the cheery goodbye) and its face stays attentive. Only gentle() brings support close.
   */
  const softNow = () => gentle() || !!S.soft;
  function softVisit() {
    if (S.soft || S.left) return;
    S.soft = true;
    app.state.hfSoft = true;
    clearTimeout(inviteT); timers.delete(inviteT);
    clearNudge();
  }
  /**
   * "Play with it" chosen later in a quiet visit (review P3): the quiet is over — the faces, the squeeze lines and the
   * goodbye are as they always were for that world. Only S.soft: after something heavy (gentle()) the visit stays gentle.
   */
  function endSoft() {
    S.softArrive = false;
    if (!S.soft || S.left) return;
    S.soft = false;
    app.state.hfSoft = false;
    if (!gentle()) stageMallow?.setStage?.('neutral', { quiet: true });
  }
  /**
   * The detector found something (while typing, sent or not, or on submit). It only rises:
   * from here the Support pill stays, invitations and squeeze chatter stop, the Mallow comforts,
   * and the router holds off a reload. Crisis is recorded the moment it is seen.
   */
  function noteSafety(r) {
    noteNoResume(r);
    if (!r?.level || LEVELS.indexOf(r.level) <= LEVELS.indexOf(S.level)) return;
    S.level = r.level;
    S.category = r.category || null;
    if (r.level === 'crisis') S.crisis = true;
    else S.care = true;
    keepSafety();
    // every Mallow on screen from here on — this stage's, a world's host, the plans page's — keeps the attentive face
    setStageFloor(CARE_FACE);
    root.classList.add('hf-heavy');   // (the panel's "No plan yet · See plans" steps aside)
    clearTimeout(inviteT); timers.delete(inviteT);
    clearNudge();
    supportPill.hidden = false;
    // a pending invitation or a playful choice goes (a held discovery stays)
    if (!overlay) subtitles.clear({ keepHeld: true });
    stageMallow?.setStage?.(CARE_FACE, { quiet: true });
    safetyHold(r.level);
    applyCalm();
    layout();
  }
  /**
   * A death or a loss in the words (grief.js: concern 'loss', or care 'unsafe' with a wish to follow), or harm done to
   * the person (every care-level disclosure: abuse, violence, threats, harassment, discrimination, not feeling safe):
   * from here the world they were in is never offered back in this visit — no Paused · Resume pill, no ▶, no panel
   * Resume, no "pick up where you left off" for a charged world. The gentle choice stays: quiet (the world ends quietly)
   * or the calm world, because they ask (owner P4's Resume stays for distress alone; DECISIONS P3/P4).
   */
  const takesWorldAway = (r) => !!r && (r.category === 'loss' || r.level === 'care');
  function noteNoResume(r) {
    if (!takesWorldAway(r) || S.noResume) return;
    S.noResume = true;
    // (a world already waiting for care with its pill: the pill goes)
    if (S.hold === 'care') holdQuiet();
  }
  function holdQuiet() {
    S.hold = 'quiet';
    pausedPill.hidden = true;
    if (held) held.wantPaused = true;
    layout();
    panel?.update();
  }
  /** A world held quietly ends quietly (the person chose to stay, or let the choice go): the quiet line follows (onFinished). */
  function endQuietWorld() {
    if (!worldMode || S.finishing || !flowRef) return false;
    try { flowRef.setAutoFlow?.(false); flowRef.finish?.({ reason: 'safety' }); } catch (e) { console.warn(e); }
    if (worldMode && !S.finishing) onFinished();
    return true;
  }
  /**
   * What a rising level does to what is playing. Everything: the garden offer goes, the Thought Mallows
   * drift off (owner P5) and the world lets the words go (no thought in it any more); the session turns
   * gentle (calm worlds only, no Memory Garden offers). Crisis: a running world, or one still loading, is
   * held (no Auto-flow, pause({ reason: 'safety' }) under its veil; while loading it enters paused, never
   * stepping) until it ends quietly: on Send, or when the overlay closes (finish, owner P3). Care or
   * concern: it pauses the same way with Resume allowed (P4). A world asked for before the director
   * exists is held the moment it arrives (S.holdOnWorld).
   */
  function safetyHold(level) {
    offerCtl?.abort();
    stage?.thoughts.release(900);
    // (a running world, or one on its way that the director already has)
    const running = flowRef && !flowRef.stub && (worldMode || starting > 0);
    if (running) { try { flowRef.setThoughts?.(null); flowRef.setGentle?.(true); } catch (e) { console.warn(e); } }
    if (level === 'crisis') {
      S.hold = 'crisis';
      if (running) { try { flowRef.setAutoFlow?.(false); flowRef.pause?.({ reason: 'safety' }); } catch (e) { console.warn(e); } }
      // nothing invites play or offers to resume after a crisis: no Paused pill, and every line and
      // choice still showing goes, a parked careBeat choice too (it resolves as no choice)
      pausedPill.hidden = true;
      subtitles.clear();
      // and nothing to pick up later: a world saved on pause (or when the tab hides while the person
      // is away, calling someone) is forgotten, so a reload never asks to carry on
      forgetProgress();
    } else if (running && !S.hold) {
      // care or distress typed in a running world, sent or not: it waits under its veil with the
      // Paused pill, and Resume stays theirs (owner P4); careBeat pauses it too when it is sent
      S.hold = S.noResume ? 'quiet' : 'care';
      if (held) held.wantPaused = true;   // (the phone sheet holding it: it stays paused when the sheet closes)
      try { flowRef.pause?.({ reason: 'safety' }); } catch (e) { console.warn(e); }
    }
    // a world on its way before the director has it (startFlow in flight) is held the moment it arrives
    if (starting && !worldMode) S.holdOnWorld = level === 'crisis' || S.holdOnWorld === 'crisis' ? 'crisis' : level;
    panel?.update();
  }
  /**
   * After a crisis the visit keeps no world to resume: cleared now, and again straight after any save the
   * director makes when the page hides (the tab left while the person calls someone, or a reload). That clear
   * is synchronous — a reload's page-hide never runs a timer — and it listens on the window: visibilitychange
   * bubbles there from the document, so it always runs after the director's own listener (on the document)
   * has saved, whichever was added first. 'pagehide' too (a reload fires it first; clearing twice is harmless).
   */
  let forgetOnHide = null;
  function forgetProgress() {
    try { clearProgress(store); } catch (e) { console.warn(e); }
    if (forgetOnHide || typeof addEventListener !== 'function') return;
    forgetOnHide = () => { if (S.crisis || S.hold === 'crisis') { try { clearProgress(store); } catch { /* storage blocked */ } } };
    addEventListener('visibilitychange', forgetOnHide);
    addEventListener('pagehide', forgetOnHide);
  }
  /** Low stimulation while the Support pill is up (owner P5): squeezing stays, the sparkles go. */
  const lowStimNow = () => !!prefs.get('lowStim') || gentle();
  function applyCalm() {
    try { touchMt?.setLowStim(lowStimNow()); } catch (e) { console.warn(e); }
    if (gentle()) world.setLowStim?.(true);
  }
  /**
   * After a crisis: one calm line, once, when neither the overlay nor a sheet covers the stage, and
   * no world is on it. A world held for the crisis ends first (owner P3): its fade-out clears the
   * world's lines, so the calm line comes after it has gone (onFinished), whole and in the voice of
   * the person's own Mallow, never the world's host.
   */
  let crisisLine = null;   // the calm line while it is showing
  function speakCrisis() {
    if (!S.crisis || S.crisisSpoken || S.left || overlay || sheets.length || worldMode || S.finishing) return;
    S.crisisSpoken = true;
    keepSafety();
    stageMallow.setStage(CARE_FACE, { quiet: true });
    const p = crisisLine = say(SHARED_LINES.support, { interrupt: !subtitles.holding });
    p.then(() => { if (crisisLine === p) crisisLine = null; });
  }
  /**
   * A crisis typed in a world: the world ends quietly now (owner P3), finish({ reason: 'safety' }). One still
   * loading never enters (the director's start() resolves null). A director that did not say so (no
   * 'finish' event) still leaves the stage, so the calm line is never kept waiting.
   */
  function endCrisisWorld() {
    if (!worldMode) {
      if (starting && flowRef && !flowRef.stub && !S.finishing) { try { flowRef.finish?.({ reason: 'safety' }); } catch (e) { console.warn(e); } }
      return;
    }
    if (S.finishing) return;
    try { flowRef?.finish?.({ reason: 'safety' }); } catch (e) { console.warn(e); }
    if (worldMode && !S.finishing) onFinished();
  }
  /**
   * The visit's level outlives the scene for the page session (no words): back from Settings, the plans page, the
   * garden or a ritual, support is still close and the visit is still a gentle one (no jokes, no invitations, no world
   * after a crisis). It outlives a reload in this tab too (visit-safety.js: the level only, for this tab, 12 h at most),
   * so a reload never greets playfully after something heavy.
   */
  function keepSafety() {
    if (S.level === 'none') return;
    app.state.hfSafety = { level: S.level, category: S.category, crisisSpoken: S.crisisSpoken };
    rememberVisitSafety(app.state.hfSafety);
  }

  // ---------------------------------------------------- telling --
  /**
   * Open the compact overlay. Synchronous when the module is preloaded, so the
   * text field takes focus inside the tap (the iPhone keyboard opens with it).
   */
  function openTell(source, prompt) {
    if (overlay || S.left) return;
    if (!inputMod) { preloadInput().then(() => { if (!S.left && !overlay) openTellNow(prompt); }).catch((e) => console.warn('[hushfold] input', e)); return; }
    openTellNow(prompt);
  }
  function openTellNow(prompt) {
    // a held discovery or a real choice waits for the overlay to close; passing lines go
    subtitles.clear({ keepHeld: true });
    subtitles.suspend();
    clearTimeout(inviteT);
    panel?.close();
    closeRead();
    showTell(false);
    // one Support control at a time (review P3, 320 px): while the overlay is open its own Support chip is the one — the
    // dock's pill steps away under it (unseen, untouchable, out of the tab order) and comes back when it closes
    supportUnder(true);
    // after something heavy the Mallow listens with its attentive, concerned face
    stageMallow.setStage(softNow() ? CARE_FACE : 'listening', { quiet: true });
    root.classList.add('hf-typing');
    // (the words offered back after the plans page: the overlay opens with them, their feeling too)
    const again = retell && !gentle() ? retell : null;
    let ov = null;
    ov = overlay = inputMod.openInput({
      app, root, prompt: prompt || 'Want to tell me?',
      mallow: { id: mallowId, name: M().name, glow: M().colours.glow },
      // (a new Tell starts with no feeling pressed: one chosen for an earlier Tell is never pre-pressed for these words —
      // in a world, after a death, it would read as theirs; only words offered back carry their own feeling)
      emotion: again?.emotion || null, intention: S.intention || again?.intention || null, hasPlan: ent.has('paid'), text: again?.text || '',
      // something heavy earlier in this visit: the Support chip is there from the start, and no plan offer
      heavy: gentle(),
      // a death or a loss in the words is never made into a Thought Mallow or a playful world: the gentle path
      lossAware: true,
      face: (f) => stageMallow.setEmotion(f, 0.6, { quiet: true }),
      onLayout: () => layout(),
      // the level is the scene's the moment it is seen, whether or not anything is sent
      onSafety: (r) => noteSafety(r),
      support: (opts) => openSupportSheet(opts),
      trackSheet: (sh) => trackSheet(sh),
      // (the words offered back after the plans page, sent unchanged: "Play with it" was already chosen for them — never
      // asked twice; changed, they are new words)
      onSubmit: (r) => afterTell(again?.chosen === 'play' && sameWords(r?.text, again.text) ? { ...r, chosen: 'play' } : r),
      onClose: (reason, meta = {}) => {
        overlay = null;
        popLayer('overlay');
        // the words offered back go once sent; closed unsent they stay as the person left them (none: gone)
        if (retell) retell = reason === 'submit' ? null : (ov?.text?.trim() ? { ...retell, text: ov.text } : null);
        root.classList.remove('hf-typing');
        if (S.left) return;
        noteSafety(meta.safety);
        supportUnder(false);
        // a crisis typed in a world (sent or not): the world it paused ends quietly now (owner P3)
        if (S.level === 'crisis' && worldMode) endCrisisWorld();
        // (one still loading for it never enters)
        else if (S.level === 'crisis' && starting) endCrisisWorld();
        // crisis words typed in the last moment before closing: the urgent sheet still opens, once
        if (meta.safety?.level === 'crisis' && !meta.supportShown && reason !== 'submit') openSupportSheet({ urgent: true });
        showTell(true);
        layout();
        subtitles.unsuspend();
        if (reason !== 'submit') {
          stageMallow.setStage(softNow() ? CARE_FACE : 'neutral', { quiet: true });
          speakCrisis();
          // a death, a loss or harm done to the person typed in a running world and closed without sending: the world is
          // held quietly (no pill, nothing resumes it), so the same gentle beat as after Send follows — the support line,
          // then stay here quietly (the world ends quietly) or somewhere calm (careBeat → careChoice) — never left frozen
          // under its veil with nothing offered. One beat at a time (a Tell opened over its choice parks it, then it is back)
          if (!S.crisis && S.hold === 'quiet' && worldMode && flowRef && !flowRef.stub) {
            if (!S.quietBeat) {
              // (held quietly for "Just be with it", nothing heavy said: the soft chip again, alone — never the support line)
              const soft = S.softHold && !gentle();
              if (!soft) S.careSaid = true;
              const beat = S.quietBeat = (soft ? softChoice({ again: true })
                : careBeat({ emotion: null, intention: null, safety: { level: S.level, category: S.category } }))
                .catch((e) => console.warn(e)).finally(() => { if (S.quietBeat === beat) S.quietBeat = null; });
            }
          // care or distress typed and closed without sending: support stays close, said once, quietly
          } else if (!S.crisis && gentle() && !S.careSaid) { S.careSaid = true; say(S.category === 'harm-others' ? SHARED_LINES.harmOthers : S.level === 'care' ? SHARED_LINES.supportCare : SHARED_LINES.supportConcern, { interrupt: !subtitles.holding }); }
          app.applyUpdateIfSafe?.();
        }
      },
    });
    pushLayer('overlay');
    S.photos = true;   // the overlay may have loaded the photo session
    layout();
  }

  async function afterTell({ text, emotion, intention, safety, input, reading = null, chosen = null }) {
    S.pendingResume = false;
    // (a newer Tell: what an earlier one left waiting — the soft chip after "Just be with it" — is its no longer)
    S.tellGen++;
    // safety comes first, before anything else is decided (with or without a plan)
    noteSafety(safety);
    noteNoResume(safety);
    // the visit's level counts, not only the words sent: crisis or care seen earlier (typed and closed, or
    // reworded before Send) still means no Thought Mallow, no world by itself and never the plans page
    // (carried: these words were not heavy themselves; the visit was, earlier, and was answered then)
    const carried = !!S.careSaid && (safety?.level || 'none') === 'none';
    if (LEVELS.indexOf(S.level) > LEVELS.indexOf(safety?.level || 'none')) safety = { level: S.level, category: S.category };
    const fam = emotion ? await setFeeling(emotion, { quiet: true }) : null;
    if (S.left) return;
    if (intention) S.intention = intention;
    // (the order is tellRoute's: crisis, carried, support, then the question — never a Thought Mallow without a choice)
    if (safety?.level === 'crisis') {
      // no Thought Mallow, no world that transforms the words; support stays one tap away.
      // A world that was playing ends quietly (owner P3); the calm line follows once it has gone
      if (worldMode) endCrisisWorld();
      else if (starting) endCrisisWorld();
      stageMallow.setStage(CARE_FACE);
      // more words later in the same visit get a calm answer, never silence (the crisis line is said once)
      if (S.crisisSpoken) say(SHARED_LINES.supportConcern, { interrupt: !subtitles.holding });
      else speakCrisis();
      layout();
      return;
    }
    // ordinary words after care or distress was already answered in this visit: a short, plain acknowledgement
    // (not the whole support line again), and a world only if they ask for one; a world playing is not paused
    if (carried && gentle()) { S.told = true; await careAgain({ emotion, intention, safety }); return; }
    // care (abuse, violence, threats…), distress, wanting to hurt someone, or a loss the words name: the person stays
    // on the stage with or without a plan. No jokes, no Thought Mallow made of it, nothing starts by itself:
    // support first, then they choose whether anything plays (the plans page only if they ask to play)
    if (safety?.level === 'care' || safety?.level === 'concern') { S.told = true; S.careSaid = true; await careBeat({ emotion, intention, safety }); return; }
    // everything else (owner decision 'Ask before every world'): before any Thought Mallow, any world or the plans page,
    // "Shall we play with this, or just be with it?" — a loss the lists are only unsure of is asked exactly this, once
    if (tellRoute({ level: safety?.level || 'none', carried, chosen }) === 'ask') {
      // (review P2: the words wait for the next Tell meanwhile, in memory only — left unanswered, closed with Back or with a
      // Tell opened over the question, they are in the Tell when it opens again, their feeling too, as after the plans page;
      // an answer lets them go: askPlay)
      const kept = text && !gentle() ? (retell = { text, emotion: emotion || null, intention: intention || null }) : null;
      const out = askOutcome(await askPlay(kept), { telling: !!overlay });
      if (S.left) return;
      if (out === 'stay') { await beWithIt({ emotion, intention }); return; }
      if (out === 'quiet') { quietAfterAsk(); return; }
      // (a new Tell opened over the question: those words are asked about once they are sent)
      if (out === 'retold') { holdForAsk(false); return; }
      // "Play with it": the flow exactly as it always was (a world that waited under its veil carries on, and takes them),
      // and a quiet visit from an earlier "Just be with it" or unanswered question is over: they chose to play (endSoft)
      holdForAsk(false, { play: true });
      endSoft();
    }
    if (!ent.has('paid')) {
      // D4: the Thought Mallow and Hushflow are part of hushmallow Flow. The words wait in memory only.
      // (chosen: they said "Play with it" — back with a plan, the words are not asked about again)
      app.state.pendingTell = { input, emotion, intention, chosen: 'play', at: Date.now() };
      app.go('plans', { reason: 'tell' });
      return;
    }
    S.told = true;
    stageMallow.react('nod');
    let spoken = Promise.resolve();
    if (emotion) spoken = say(lines.pick(mallowId, 'ack', { emotion, feelingName: S.emotionName, family: fam?.family }));
    // the words become a Thought Mallow: beside the Mallow at home, or the world's own one (the old one drifts off, owner P7)
    if (text) spawnThought(text, emotion, { inWorld: worldMode });
    if (text && !worldMode) {
      stageMallow.setStage('curious', { quiet: true });
      if (!emotion) spoken = say(lines.pick(mallowId, 'thought'));
    }
    // no feeling tapped: a confident reading of the words (the overlay's own highlighted suggestion) still steers the
    // world — "I'm so angry…" reaches the Static Storm — without choosing the feeling for the person: no chip is pressed
    // for them, no feeling is acknowledged that they did not pick, and it is never kept as theirs (S.emotion)
    const heard = !emotion && !gentle() ? await wordsFeeling(reading) : null;
    if (S.left) return;
    const steer = emotion || heard || S.emotion;
    const go = () => startFlow({ emotion: steer, intention: intention || S.intention, input, safety });
    if (worldMode) { go(); return; }
    // the world loads during the beat (its director, code and host art), so it is ready when the beat ends
    warmWorld({ emotion: steer, intention: intention || S.intention });
    // a beat with the Thought Mallow in the Hushfold (the line read to the end) before the first world melts in
    if (text) {
      const minBeat = new Promise((r) => later(r, prefs.reducedMotion() ? 1200 : 2400));
      const maxBeat = new Promise((r) => later(r, 7000));
      await Promise.race([Promise.all([spoken, minBeat]), maxBeat]);
      if (!S.left) go();
    } else await go();
  }

  /**
   * (owner decision 'Ask before every world', 14 Oct 2026) "Shall we play with this, or just be with it?", once, before
   * any Thought Mallow is made or any world starts or takes the words: the Mallow attentive (CARE_FACE: whatever touches
   * it, never a grin), nothing playful — squeezing stays quiet while it waits. In a running world the world waits under
   * its veil meanwhile (holdForAsk: no Paused pill, no "Paused" line — it is not the person pausing it). Two real buttons
   * in the subtitles' chip row (46 px, announced with the line in its live region), its own Back layer.
   * → 'play' | 'stay' | null (no answer within PLAY_CHECK.ms, Back, or a new Tell opened over it).
   */
  async function askPlay(words = null) {
    S.told = true;
    S.asking = true;
    stageMallow.setStage(CARE_FACE, { quiet: true });
    // (first: the world's own passing lines go with its pause, never the question; its postcards fold away under it)
    holdForAsk(true);
    foldWorld(true);
    pushLayer('ask');
    // the answer is the person's from the tap itself (review P3: a Tell opened within the line's fade, ~0.4 s, read it as
    // no answer and dropped "Play with it"); answered, the words kept for the next Tell are let go (they chose for them)
    let picked = null;
    const pick = (v) => () => { picked = v; if (words && retell === words) retell = null; };
    try {
      // equal weight (coordinator default): the same chip style for both, "Play with it" first in reading order — nothing
      // nudges towards play when the words might be about a loss. The keyboard focus goes to the first chip (WCAG 2.4.3),
      // and the clock (PLAY_CHECK.ms) waits while the page is hidden (WCAG 2.2.1)
      const v = await subtitles.choice(PLAY_CHECK.ask, [{ label: PLAY_CHECK.play, value: 'play', onPick: pick('play') }, { label: PLAY_CHECK.stay, value: 'stay', onPick: pick('stay') }],
        { who: M().name, colour: M().colours.glow, timeoutMs: PLAY_CHECK.ms, transient: true, ask: true, focus: true, waitHidden: true, interrupt: !subtitles.holding });
      return picked || v;
    } finally {
      S.asking = false;
      popLayer('ask');
      // ("Just be with it": the soft chip asks over it next — it stays folded, never a flicker)
      if (picked !== 'stay') foldWorld(false);
      focusTell();
    }
  }
  /** The question has gone: the keyboard focus comes back to the Tell button (never taken from a Tell opened over it). */
  function focusTell() {
    if (S.left || overlay || typeof document === 'undefined') return;
    const a = document.activeElement;
    if (a && a !== document.body && !subtitles.el.contains(a)) return;
    if (!tellBtn.classList.contains('is-hidden')) tellBtn.focus?.({ preventScroll: true });
  }
  /**
   * A running world waits under its veil while the question waits (review P3: it kept playing for 20 s). on: paused,
   * unless it already was (the person's own Pause stays theirs). off: it carries on — only if this hold paused it and
   * nothing else holds it now (a safety hold; the phone sheet or a sheet over it carries it on when it closes).
   * { play: true }: "Play with it" — a world kept quietly for an earlier "Just be with it" plays on too.
   */
  let askHold = null;   // { paused: this hold paused it } while the question waits over a world
  function holdForAsk(on, { play = false } = {}) {
    if (on) {
      if (askHold || !worldMode || S.finishing || !flowRef || flowRef.stub) return;
      const st = flowRef.state || {};
      if (st.phase === 'finished') return;
      askHold = { paused: !st.paused };
      if (askHold.paused) { try { flowRef.pause?.(); } catch (e) { console.warn(e); } }
      panel?.update();
      return;
    }
    const h0 = askHold;
    askHold = null;
    const soft = play && releaseSoftHold();
    if (!(h0?.paused || soft) || !worldMode || S.finishing || !flowRef || flowRef.stub || S.hold) { panel?.update(); return; }
    // (something else covers it now: it carries on when that lets go)
    if (sheetHold) { sheetHold.paused = true; return; }
    if (held) { held.wantPaused = false; return; }
    const st = flowRef.state || {};
    if (st.phase !== 'finished' && st.paused) { pausedPill.hidden = true; try { flowRef.resume?.(); } catch (e) { console.warn(e); } layout(); }
    panel?.update();
  }
  /**
   * While the shell asks over a world — the question, or the soft chip after "Just be with it" — the world's front layer
   * (its hanging postcards, the ocean's bubbles) folds away under the veil (review P3: at 320 and 390 the question's chips
   * sat over the postcards), so the lines and chips have the sky, kept clear of the person's earlier Thought Mallow only
   * (avoid). It comes back when the world plays on, or pauses for the person; a world that ends quietly takes it with it.
   */
  function foldWorld(on) {
    const v = !!on && worldMode && !S.finishing && !S.left;
    if (v === folded) return;
    folded = v;
    if (typeof document !== 'undefined') document.body.classList.toggle('hf-ask-fold', v);
    if (!v) foldThought(false);
    subtitles.layout();
    // (while folded: is the question, as placed, still over the person's thought? A small phone's sky has no room for two
    // rows of it beside the storm's thought under the band — then the thought steps back under the veil too, for as long)
    if (v) { const tick = () => { if (!folded) return; if (!thoughtFolded && askOverThought()) foldThought(true); later(tick, 250); }; later(tick, 60); }
  }
  function foldThought(on) {
    if (!!on === thoughtFolded) return;
    thoughtFolded = !!on;
    if (typeof document !== 'undefined') document.body.classList.toggle('hf-ask-fold-thought', thoughtFolded);
  }
  /** The shell's line and chips over a Thought Mallow, or its words, now. */
  function askOverThought() {
    if (typeof document === 'undefined') return false;
    const mine = [...document.querySelectorAll('.hf-subs .hf-sub, .hf-subs .hf-chips:not([hidden]) .hf-chip')].map((e) => e.getBoundingClientRect()).filter((r) => r.height > 0);
    const th = thoughtWords();
    return mine.some((m) => th.some((t) => overlaps(m, t)));
  }
  /** The quiet hold of an earlier "Just be with it" in this world (S.softHold) is let go: true when there was one. */
  function releaseSoftHold() {
    const was = !!S.softHold && S.hold === 'quiet' && !S.noResume;
    S.softHold = false;
    if (was) S.hold = null;
    return was;
  }
  /**
   * "Just be with it": no Thought Mallow of the words and no world takes them. Never a second question (coordinator
   * default): one gentle line that assumes nothing, with one optional soft chip, "Somewhere calm" (softChoice) — no support
   * line (the Support pill stays where it is: nothing heavy was said), and the visit stays gentle (softVisit). The
   * thoughts on stage drift off softly. At home staying is simply the default. In a world: it stays under its veil, held
   * quietly (no pill, S.softHold), and ends quietly once the chip has gone — unless they tap it: the calm world. One beat
   * at a time (S.quietBeat).
   */
  async function beWithIt({ emotion, intention }) {
    S.told = true;
    softVisit();
    stage?.thoughts.release(900);
    if (worldMode && flowRef && !flowRef.stub && !S.finishing && flowRef.state?.phase !== 'finished') {
      // (held already by the question — or not yet: a world that arrived under it, still fading in — it waits quietly now)
      askHold = null;
      S.hold = 'quiet'; S.softHold = true;
      pausedPill.hidden = true;
      try { flowRef.setThoughts?.(null); if (!flowRef.state?.paused) flowRef.pause?.(); } catch (e) { console.warn(e); }
      layout();
    } else {
      holdForAsk(false);
      // (a world still on its way — the earlier words', after "Play with it" — never plays on over "Just be with it": it
      // arrives held quietly, and ends quietly with the soft chip, or at once once that has gone: onWorld)
      if (!worldMode && starting > 0) S.softArrive = true;
    }
    stageMallow.setStage(CARE_FACE, { quiet: true });
    panel?.update();
    if (S.left || overlay || S.quietBeat) return;
    const beat = S.quietBeat = softChoice({ emotion, intention })
      .catch((e) => console.warn(e)).finally(() => { if (S.quietBeat === beat) S.quietBeat = null; });
    await beat;
  }
  /**
   * After "Just be with it": PLAY_CHECK.be, the one gentle line, with a single optional soft chip, "Somewhere calm", that
   * fades after PLAY_CHECK.calmMs (again: the chip alone, back after a Tell opened and closed over it in a world). Tapped:
   * the calm world, a gentle session with no words (playCalm). Let go: at home nothing more (staying is the default); in a
   * world held quietly for it, the world ends quietly and the person's own Mallow comes home. Anything newer — a Tell sent
   * meanwhile, or its question — decides instead (S.tellGen).
   */
  async function softChoice({ emotion = null, intention = null, again = false } = {}) {
    const gen = S.tellGen;
    const gw = await gentleWorld({ calmOnly: true });
    if (S.left || overlay || gen !== S.tellGen) return;
    let v = null;
    if (gw) {
      if (S.softHold) foldWorld(true);
      v = await subtitles.choice(again ? null : PLAY_CHECK.be, [{ label: PLAY_CHECK.calm, value: 'calm', soft: true }],
        { who: M().name, colour: M().colours.glow, timeoutMs: PLAY_CHECK.calmMs, transient: true, soft: true, interrupt: !subtitles.holding });
    } else if (!again) await say(PLAY_CHECK.be, { interrupt: !subtitles.holding });
    if (S.left || gen !== S.tellGen) return;
    // (a Tell opened over it: the overlay's close brings the chip back, or what is sent decides)
    if (v == null && (overlay || S.asking)) return;
    if (v === 'calm' && gw && !S.crisis) { foldWorld(false); playCalm({ emotion, intention, worldId: gw.worldId, safety: null, soft: true }); return; }
    if (S.hold === 'quiet' && S.softHold && worldMode) endQuietWorld();
    else foldWorld(false);
  }
  /**
   * The question let go (no answer within PLAY_CHECK.ms, or Back): nothing is made of the words and nothing starts. The
   * stage stays quiet (the Tell pill is there for more), the face attentive, and the visit gentle from here (review P3:
   * never the smiling face and "Ooh… that's cosy" at the next squeeze). A world that waited stays paused, quietly — its
   * Resume theirs (the Paused pill, no "Paused" line).
   */
  function quietAfterAsk() {
    // (the words stay for the next Tell: retell, kept as the question was asked)
    softVisit();
    stageMallow.setStage(CARE_FACE, { quiet: true });
    const h0 = askHold;
    askHold = null;
    const soft = releaseSoftHold();
    if ((h0?.paused || soft) && worldMode && flowRef && !flowRef.stub && !S.finishing && !S.hold && flowRef.state?.paused && !held) {
      pausedPill.hidden = false;
      layout();
    }
    panel?.update();
  }
  /**
   * The feeling the words themselves suggest, confidently (interpret.js suggestedFeelings: the chip the overlay
   * highlights), or null: nothing confident, or words with a safety cue. Only ever steers a world's choice.
   */
  async function wordsFeeling(reading) {
    if (!reading?.emotions?.length) return null;
    try { const m = await import('../../engine/interpret.js'); return m.suggestedFeelings?.(reading)?.[0] || null; } catch { return null; }
  }
  /** The world a gentle choice plays, named for what it is (a calm one first, once it is playable). */
  async function gentleWorld({ calmOnly = false } = {}) {
    try {
      if (!(await flowAvailable())) return null;
      const { registry } = await import('../../hushfold/flow/registry.js');
      // (after a death, a loss or harm done to the person, or "Just be with it": a calm world, or none — never a charged
      // one, taken slowly or not)
      const ok = (id) => registry.playable(id) && (!(S.noResume || calmOnly) || registry.get(id)?.calm === true);
      for (const [id, label] of GENTLE_WORLDS) if (ok(id)) return { worldId: id, label };
      const any = (registry.list || []).find((e) => ok(e.id));
      return any ? { worldId: any.id, label: `Play ${any.title}` } : null;
    } catch { return null; }
  }
  /**
   * Care, distress or wanting to hurt someone: support first, on the stage, plan or no plan.
   * Staying quietly is the first choice; a world only if the person asks for one (never with their
   * words in it). Without a plan that one optional tap is the only way to the plans page.
   */
  async function careBeat({ emotion, intention, safety }) {
    // in a world: it pauses under its veil while support comes first; Resume stays theirs (owner P4)
    // (after a death, a loss or harm done to them, quietly: no Resume pill — holdQuiet)
    if (worldMode && flowRef && !flowRef.stub) { S.hold = S.noResume ? 'quiet' : 'care'; if (S.hold === 'quiet') pausedPill.hidden = true; try { flowRef.pause?.({ reason: 'safety' }); } catch (e) { console.warn(e); } }
    S.care = true;
    supportPill.hidden = false;
    layout();
    stageMallow.setStage(CARE_FACE, { quiet: true });
    const first = safety?.category === 'harm-others' ? SHARED_LINES.harmOthers : safety?.level === 'care' ? SHARED_LINES.supportCare : SHARED_LINES.supportConcern;
    await say(first, { interrupt: !subtitles.holding });
    if (S.left || overlay) return;
    await careChoice({ emotion, intention, safety });
  }
  /**
   * More words after care or distress was answered earlier in this visit, ordinary ones this time: a short,
   * plain acknowledgement (never the whole support line again), the attentive face, and — at home — the same
   * quiet choice. A world that is playing goes on (nothing heavy was said this time); no Thought Mallow is
   * made of the words (a gentle visit).
   */
  async function careAgain({ emotion, intention, safety }) {
    supportPill.hidden = false;
    stageMallow.setStage(CARE_FACE, { quiet: true });
    await say(CARE_AGAIN, { interrupt: !subtitles.holding });
    if (S.left || overlay || worldMode) return;
    await careChoice({ emotion, intention, safety });
  }
  /**
   * Stay here quietly (first), or a calm world because they ask for one: plan or no plan, never with their words.
   * soft: after "Just be with it" (nothing heavy was said): a calm world only, played as a gentle session with no words.
   */
  async function careChoice({ emotion, intention, safety, soft = false }) {
    const gw = await gentleWorld({ calmOnly: soft });
    if (S.left || overlay) return;
    // (no world to offer: a world held quietly ends quietly, never left waiting under its veil)
    if (!gw) { if (S.hold === 'quiet' && worldMode) endQuietWorld(); else say(SHARED_LINES.careQuiet); return; }
    const v = await subtitles.choice(SHARED_LINES.careAsk[0],
      [{ label: 'Stay here quietly', value: 'stay', primary: true }, { label: gw.label, value: 'play' }],
      { who: M().name, colour: M().colours.glow, timeoutMs: 30000 });
    if (S.left) return;
    // (the question asked for new words took the stage: what follows is its answer's, not this choice's)
    if (v == null && S.asking) return;
    // a crisis seen while the choice waited: nothing plays from it (support stays, the calm line was said)
    if (v === 'play' && !S.crisis) {
      playCalm({ emotion, intention, worldId: gw.worldId, safety, soft });
    } else if (S.hold === 'quiet' && worldMode) {
      // staying quietly (or the choice let go) in a world held after a death, a loss or harm done to them: the world
      // ends quietly — it never waits under its veil to be played again — and the quiet line follows it
      endQuietWorld();
    } else if (v === 'stay') say(SHARED_LINES.careQuiet);
  }
  /**
   * The calm world, because they asked for it (careChoice's, or the soft chip after "Just be with it"): plan or no plan,
   * never with their words — a gentle session (soft: nothing heavy was said).
   */
  function playCalm({ emotion = null, intention = null, worldId, safety = null, soft = false }) {
    const calm = intention && intention !== 'let-go' ? intention : 'calm';
    if (!ent.has('paid')) {
      // D4: worlds open with hushmallow Flow. Only because they asked; their words are not carried
      app.state.pendingTell = { input: null, emotion: emotion || S.emotion, intention: calm, worldId, gentle: { level: S.level, category: S.category, ...(soft ? { soft: true } : {}) }, at: Date.now() };
      app.go('plans', { reason: 'tell' });
      return;
    }
    // their choice: it plays, unheld (held quietly too: the calm world is the one thing a quiet hold resumes for)
    if (S.hold === 'care' || S.hold === 'quiet') { S.hold = null; S.softHold = false; pausedPill.hidden = true; }
    S.holdOnWorld = null; S.softArrive = false;
    // in a world: a gentle session from here, and a melt into the calm world (or the calm world carries on)
    if (worldMode && flowRef && !flowRef.stub && !S.finishing) { calmTheWorld(worldId); return; }
    // (a world still loading under a safety pause: their choice starts the calm one instead, unheld)
    if (starting && flowRef && !flowRef.stub) { try { flowRef.resume?.(); } catch (e) { console.warn(e); } }
    startFlow({ emotion: emotion || S.emotion, intention: calm, input: null, safety, worldId, soft });
  }
  /** Care, then "play" in a world: the session turns gentle and melts into the calm world (never a hard cut). */
  function calmTheWorld(worldId) {
    try {
      flowRef.setThoughts?.(null);
      flowRef.setGentle?.(true);
      if (flowRef.state?.worldId === worldId) { resumeFlow(); return; }
      // (next() resumes a paused world and melts; false: nowhere to melt to, so it simply carries on)
      if (flowRef.next?.({ worldId }) === false) resumeFlow();
    } catch (e) { console.warn(e); }
    pausedPill.hidden = true;
    layout();
    panel?.update();
  }

  /** Start Hushflow (paid; enforced here as well as by the routes). Feeling ids map to the registry's. */
  async function startFlow({ emotion = null, intention = null, input = null, safety = null, worldId = null, resume = false, soft = false } = {}) {
    try { requireEntitlement(ent, 'paid'); } catch { app.go('plans', { reason: 'tell' }); return; }
    // after something heavy a world never carries the earlier words (a gentle world has no Thought Mallow); nor the calm
    // world asked for after "Just be with it" (soft: a gentle session too — calm, its gentle lines, no garden offers)
    if (gentle() || soft) wordsCur = null;
    // after a crisis nothing starts a world in this visit (owner P3)
    if (S.crisis) return;
    S.flowAsked = true;
    starting++;   // a world is on its way: a level that rises meanwhile holds it as it arrives
    try {
      const [{ createWords }, em] = await Promise.all([import('../../v3/words.js'), import('../../data/emotions.js')]);
      if (S.left || S.crisis) return;
      if (input) wordsCur = createWords(input);
      const fe = flowEmotion(emotion, em.getEmotion(emotion)?.family);
      if (worldMode && flowRef && !flowRef.stub && !worldId) {
        // already in a world: the new words joined it as its Thought Mallow (afterTell; no restart), and a
        // changed feeling steers it
        if (fe) flowRef.setEmotion?.(fe);
        if (intention) flowRef.setIntention?.(intention);
        panel?.update();
        return;
      }
      // the first host's art loads alongside the director (a melt prefetches the next one itself)
      prefetchHost(worldId);
      const flow = await getFlow();
      if (S.left || S.crisis) return;
      // (a director made before something heavy still has the thoughts: a gentle start lets them go)
      if (!flow.stub && (gentle() || soft)) flow.setThoughts?.(null);
      if (!flow.stub) { document.body.classList.add('hf-world-arriving'); if (!subtitles.holding) subtitles.clear({ keep: isAsk }); }
      try {
        // gentle: after a care or distress disclosure (calm worlds only, no Memory Garden offers)
        const started = flow.start({ emotion: fe, intention, intensity: input?.intensity ?? 0.6, input: input ? { text: input.text, safety: input.safety } : null, worldId, resume, gentle: gentle() || soft });
        // something heavy typed before the director had this world: it enters held, never stepping
        if (S.holdOnWorld && !flow.stub) { try { flow.pause?.({ reason: 'safety' }); } catch (e) { console.warn(e); } }
        await started;
      } catch (e) { console.warn('[hushfold] flow.start', e); }
      if (!worldMode) document.body.classList.remove('hf-world-arriving');   // nothing started: the realm stays
      panel?.update();
    } finally {
      // (a held start that never brought a world: the next world the person starts is not paused on arrival)
      if (!--starting && !worldMode) { S.holdOnWorld = null; S.softArrive = false; }
    }
  }

  /**
   * During the beat after Send, the world gets ready (back from the plans page on a slow line it used to load
   * only after the beat, ~8 s): the code startFlow needs first, then the director (its photos and Mallow cards)
   * with the code of the world it will most likely choose, then that world's host art — in that order, so
   * on a thin connection nothing it will not need competes with what it does. Nothing plays or shows until
   * startFlow() starts it.
   */
  async function warmWorld({ emotion = null, intention = null } = {}) {
    if (S.left || S.crisis || !ent.has('paid')) return;
    try {
      const made = getFlow();
      const [, em, reg] = await Promise.all([import('../../v3/words.js'), import('../../data/emotions.js'), import('../../hushfold/flow/registry.js')]);
      flowReg ||= reg;
      if (S.left || S.crisis) return;
      // (the director's own choice for a first world: the best fit for the feeling and intention, favourites first)
      const fe = flowEmotion(emotion, em.getEmotion(emotion)?.family);
      let pick = null;
      try { pick = reg.registry.select({ emotion: fe, intention, gentle: gentle(), favourites: favouriteWorlds(store) })?.id || null; } catch { pick = null; }
      if (pick) reg.registry.prefetch?.(pick);
      await made;
      if (pick && !S.left) prefetchHost(pick);
    } catch { app.staleCode?.(); }
  }
  /** Start loading a world's host art now (it is on the stage within the first frames of that world). */
  function prefetchHost(worldId) {
    if (!worldId) return;
    const go = (m) => { const id = m?.registry?.get?.(worldId)?.mallow?.id; if (MALLOWS[id] && id !== mallowId) loadMallowAssets(id).catch(() => {}); };
    if (flowReg) go(flowReg);
    else import('../../hushfold/flow/registry.js').then((m) => { flowReg ||= m; go(m); }).catch(() => {});
  }

  /**
   * The words become a Thought Mallow on the stage's ThoughtLayer (W2), carrying the exact words (its tag
   * shows their start, cut at a word). At most 3 at home, 2 below 360 px wide (owner P8); one in a world
   * (owner P7): the oldest drift off (release), never vanish. Never after something heavy (a gentle visit
   * keeps no words on stage).
   */
  async function spawnThought(text, emotion = null, { inWorld = false } = {}) {
    if (!stage || !text || gentle()) return null;
    const L = await stage.whenThoughts();
    if (!L || S.left || gentle()) return null;
    const live = L.list.filter((t) => !t.leaving);
    const over = live.length - thoughtCap(inWorld) + 1;
    if (over > 0) L.release(900, live.slice(0, over));
    const b = stageMallow.bodyRect();
    const th = L.add({ text, emotion, intensity: app.state.input?.intensity ?? 0.6, r: innerWidth < 360 ? 32 : 38 },
      { from: { x: b?.cx ?? innerWidth / 2, y: Math.max(110, (b?.top || 300) + 20) }, home: thoughtHome });
    // a world takes it from here (it writes where the thought is each frame); the director tells it about the new one
    if (inWorld && worldMode) { try { flowRef?.setThoughts?.(stage.thoughts); } catch (e) { console.warn(e); } }
    layout();
    const ma = stageMallow.bodyRect();
    if (ma && !inWorld) stageMallow.lookAt((thoughtHome.x - ma.cx) / (innerWidth * 0.5), (thoughtHome.y - ma.cy) / (innerHeight * 0.5));
    return th;
  }

  let readTh = null;   // the thought whose words are being read (its tag gets the focus back)
  function readThought(th) {
    closeRead();
    readTh = th;
    readEl = h('div', { class: 'hf-read hf-ui', role: 'dialog', 'aria-modal': 'false', 'aria-label': 'Your words' },
      h('p', {}, th.text), h('button', { class: 'hf-ghost', type: 'button', onclick: () => closeRead() }, 'Close'));
    root.append(readEl);
    readEl.querySelector('button').focus({ preventScroll: true });
    pushLayer('read');
  }
  function closeRead() {
    if (!readEl) return;
    readEl.remove(); readEl = null;
    popLayer('read');
    const tag = readTh ? stage?.thoughts.tagOf(readTh) : null;
    readTh = null;
    if (tag?.isConnected) tag.focus?.({ preventScroll: true });
  }

  // ------------------------------------------------------ panel --
  async function ensurePanel() {
    if (panel) return panel;
    const { createSidePanel, panelIsSheet } = await import('../../hushfold/side-panel.js');
    if (S.left) return null;
    sheetRule = typeof panelIsSheet === 'function' ? () => panelIsSheet() : null;
    panel ||= createSidePanel({
      app, root,
      getFlow: (create = false) => (create ? getFlow() : Promise.resolve(flowRef)),
      flowAvailable,
      // in a world, the switcher shows who the person comes back to
      state: () => ({ mallow: worldMode ? (homeMallow || mallowId) : mallowId, mallowWaiting: worldMode, emotion: S.emotion, emotionName: S.emotionName, intention: S.intention,
        // Another Angle: a link for Beyond, and for Flow an invitation to it on the plans page (owner P14); never after something heavy
        angle: ent.has('paid') && !gentle(), worldTitle: S.worldTitle, locked: S.hold === 'crisis' || S.hold === 'quiet' }),
      // the words told this visit go with it, on this phone only, sent only after consent and Send (owner P15)
      onAngle: () => {
        if (!ent.has('ultra')) { app.go('plans', { reason: 'ultra', focus: 'ultra' }); return; }
        app.go('angle', S.level === 'none' && words.full ? { text: words.full } : {});
      },
      onFeeling: (id) => pickFeeling(id),
      onIntention: (id) => pickIntention(id),
      onMallow: (dir) => switchMallow(dir),
      onSupport: () => openSupportSheet(),
      // while the sheet holds a world, Pause records what the person wants for when it closes
      pausedNow: () => (held ? held.wantPaused : null),
      // (a world held for a crisis: Pause and Resume do nothing, owner P3)
      onPause: () => { if (S.hold === 'crisis' || S.hold === 'quiet') { panel?.update(); return true; } if (!held) return false; held.wantPaused = !held.wantPaused; panel?.update(); return true; },
      resumable: () => resumableNow(),
      onResume: () => { panel?.close(); resumeSaved(); },
      onClose: () => { panelBtn.setAttribute('aria-expanded', 'false'); root.classList.remove('hf-panel-open'); popLayer('panel'); holdWorld(false); layout(); later(() => layout(), 480); },
    });
    return panel;
  }
  async function togglePanel() {
    const p = await ensurePanel();
    if (!p) return;
    if (p.isOpen) { p.close(); return; }
    closeRead();                   // one transient layer at a time
    p.open();
    root.classList.add('hf-panel-open');
    pushLayer('panel');
    panelBtn.setAttribute('aria-expanded', 'true');
    holdWorld(true);
    // phones: the bottom sheet rises and the Mallow moves up above it (still squeezable)
    layout(); later(() => layout(), 480);
  }
  /**
   * Phones, in a world: there is no room for the subtitle band, the world's postcards, the Mallow
   * and the sheet at once, and the Mallow lifted above the sheet would sit in the world's postcard
   * field. So while the sheet is up the world steps back: it waits under its veil (the director's
   * pause), its front layer (postcards, the Thought Mallow, tethers) fades out, and the Mallow comes
   * forward above the sheet, still squeezable. On close the world comes back exactly as it was
   * (still paused only if the person chose Pause in the panel).
   */
  let held = null;   // { wantPaused } while the sheet holds a world
  function holdWorld(on) {
    if (on) {
      // (a world that is ending is not held: the director still reads 'paused' after finish())
      if (held || !worldMode || S.finishing || !flowRef || flowRef.stub || !panelSheet()) return;
      const st = flowRef.state || {};
      if (st.phase === 'finished') return;
      held = { wantPaused: !!st.paused };
      document.body.classList.add('hf-world-held');
      if (!st.paused) { try { flowRef.pause?.(); } catch (e) { console.warn(e); } }
      return;
    }
    if (!held) return;
    const want = held.wantPaused;
    held = null;
    document.body.classList.remove('hf-world-held');
    if (!worldMode || S.finishing || !flowRef) return;
    const st = flowRef.state || {};
    if (st.phase === 'finished') return;
    // (Pause pressed in the sheet, then Drift on: the melt they chose plays)
    if (want) { if (st.paused) onPaused(true); else if (st.phase !== 'melting') { try { flowRef.pause?.(); } catch (e) { console.warn(e); } } }
    else if (st.paused) resumeWhenLanded();
  }
  /**
   * The phone sheet let go of a world: the Mallow glides back down from above the sheet to its place in the world
   * (MallowTouch's 720 ms spring, set off by the layout that follows). The world carries on once it has landed,
   * never while the Mallow is still crossing the world's postcards and the person's thought (the world would chase
   * a box on its way, and the thought would be pushed about). At most 1.2 s; nothing else may hold it meanwhile.
   */
  let landT = 0;
  const heroGliding = () => {
    const st = touchMt?.st, g = touchMt?.goalSt;
    if (!st || !g || g.x == null || g.y == null) return false;
    return Math.abs(g.x - st.x) >= 1 || Math.abs(g.y - st.y) >= 1 || Math.abs(g.s - st.s) >= 0.005 * (g.s || 1);
  };
  function resumeWhenLanded() {
    clearTimeout(landT); timers.delete(landT);
    const t0 = now();
    let still = 0;
    const check = () => {
      landT = 0;
      if (S.left || !worldMode || S.finishing || held || S.hold || !flowRef) return;
      const st = flowRef.state || {};
      if (st.phase === 'finished' || !st.paused) return;
      // (landed: the spring at its goal on two looks in a row, 60 ms apart)
      still = heroGliding() ? 0 : still + 1;
      if (still >= 2 || now() - t0 > 1200) { resumeFlow(); return; }
      landT = later(check, 60);
    };
    landT = later(check, 60);
  }

  // ----------------------------------------------- saved progress --
  /** A saved Hushflow to pick up (read straight from the store; no director is made for it). */
  async function resumableNow() {
    // (after a crisis in this visit, no world is offered again, owner P3)
    if (!ent.has('paid') || !prefs.get('saveHistory') || worldMode || S.crisis) return null;
    let p = null;
    try { p = loadProgress(store); } catch { p = null; }
    if (!p?.worldId) return null;
    try {
      const { registry } = await import('../../hushfold/flow/registry.js');
      if (!registry.playable(p.worldId)) return null;
      // (after a death, a loss or harm done to the person a charged world is never offered to pick up: that would replay
      // it — S.noResume. After distress alone Resume stays theirs, owner P4: the director picks it up, gently)
      if (S.noResume && registry.get(p.worldId)?.calm !== true) return null;
      return { worldId: p.worldId, title: registry.get(p.worldId)?.title || null, savedAt: p.savedAt };
    } catch { return null; }
  }
  function resumeSaved() { S.invited = true; showTell(true); startFlow({ resume: true }); }
  /** On arrival: offer to carry on, as a choice the person can ignore and keep squeezing. */
  async function offerResume() {
    const r = await resumableNow();
    if (!r || S.left || !quiet()) return false;
    S.invited = true;   // the resume offer stands in for the first invitation
    showTell(true);
    later(async () => {
      if (S.left || worldMode || overlay || S.flowAsked || gentle()) return;
      const v = await subtitles.choice(lines.pick(mallowId, 'resumeAsk', { world: r.title }),
        [{ label: 'Carry on', value: 'resume', primary: true }, { label: 'Not now', value: 'no' }],
        { who: M().name, colour: M().colours.glow, timeoutMs: 20000, transient: true });
      if (v === 'resume' && !S.left && !worldMode) resumeSaved();
    }, 1200);
    return true;
  }

  async function setFeeling(id, { quiet = false } = {}) {
    const em = await import('../../data/emotions.js');
    const e = id ? em.getEmotion(id) : null;
    S.emotion = e ? id : null;
    S.emotionName = e?.name || null;
    // after something heavy (or "Just be with it") the feeling is noted and the attentive face stays, whatever is named
    if (softNow()) stageMallow.setStage(CARE_FACE, { quiet: true });
    else if (e) stageMallow.setEmotion(e.face, 0.6, { quiet });
    else stageMallow.setStage('neutral', { quiet: true });
    return e;
  }
  /** A world the panel may steer (not one held for a crisis, nor one ending). */
  const steerable = () => !!(flowRef && !flowRef.stub && S.hold !== 'crisis' && !S.finishing);
  async function pickFeeling(id) {
    if (id === 'other') {
      const { openEmotionPicker } = await import('../emotion-picker.js');
      if (S.left) return;
      trackSheet(openEmotionPicker({ selected: S.emotion ? [S.emotion] : [], onPick: (pid) => pickFeeling(pid) }));
      return;
    }
    const e = await setFeeling(id);
    if (S.left) return;
    panel?.update();
    // after something heavy: no acknowledgement line (it would joke, or talk over the support line)
    if (e && !softNow()) say(lines.pick(mallowId, 'ack', { emotion: id, feelingName: e.name, family: e.family }), { interrupt: !subtitles.holding });
    if (e && steerable()) flowRef.setEmotion?.(flowEmotion(id, e.family));
  }
  async function pickIntention(id) {
    S.intention = id;
    panel?.update();
    // after something heavy the choice is noted, without the playful "just play" line
    if (id === 'play' && !softNow()) say(lines.pick(mallowId, 'justPlay'), { interrupt: !subtitles.holding });
    if (id && steerable()) flowRef.setIntention?.(id);
  }

  function backClose(token) {
    // a sheet (support, the A–Z list) closes before anything beneath it
    const sh = token ? sheets.find((r) => r.token === token) : (!token && sheets.length ? sheets[sheets.length - 1] : null);
    if (sh) { sh.token = 0; sh.sheet.close('back'); return; }
    const owner = token ? Object.keys(layer).find((k) => layer[k] === token) : null;
    const k = owner || (overlay ? 'overlay' : readEl ? 'read' : panel?.isOpen ? 'panel' : layer.ask ? 'ask' : null);
    if (!k) return;
    layer[k] = 0;   // its history entry is spent: closing must not step back again
    // (the question: Back lets it go, as no answer would — nothing is made of the words)
    if (k === 'ask') subtitles.drop((o) => o.ask);
    else if (k === 'overlay') overlay?.close('back');
    else if (k === 'read') closeRead();
    else panel?.close();
  }

  // ------------------------------------------------------- keys --
  const onKey = (e) => {
    if (e.key !== 'Escape') return;
    if (document.querySelector('#sheet-root .sheet.open')) return;   // the sheet closes itself, and only itself
    if (readEl) { closeRead(); return; }
    if (panel?.isOpen) { e.preventDefault(); panel.close(); }
  };

  // -------------------------------------------------- the opening --
  // the opening lines only play into an untouched, quiet stage
  const quiet = () => !S.touches && !S.told && !S.flowAsked && !worldMode && !overlay && !softNow();
  async function opening() {
    // back within this page session (from Settings, the garden, a ritual): the Tell pill, no "welcome back"
    const again = visitedThisSession;
    const returning = !again && !!prefs.get('seenIntro');
    visitedThisSession = true;
    prefs.set('seenIntro', true);
    if (await offerResume()) return;
    if (S.left) return;
    if (again) {
      showTell(true);
      nudgeT = later(() => { if (quiet() && !subtitles.busy) say(lines.pick(mallowId, 'nudge')); }, 12000);
    } else if (returning) {
      showTell(true);
      later(() => { if (quiet()) say(lines.pick(mallowId, 'return')); }, 1400);
      nudgeT = later(() => { if (quiet() && !subtitles.busy) say(lines.pick(mallowId, 'nudge')); }, 9000);
    } else {
      nudgeT = later(() => { if (quiet()) say(lines.pick(mallowId, 'nudge')); }, 3200);
    }
  }
  /**
   * Fetch, in idle time, the modules the next taps need (the overlay, the panel; with Flow the
   * director, the first two worlds and the garden), so an open session never finds them gone after
   * a new deploy. Failing to fetch them is that case: move to the newer deploy when it is safe.
   */
  function warmModules() {
    if (S.left) return;
    const flow = ent.has('paid') ? [
      import('../../hushfold/flow/director.js'),
      import('../../hushfold/flow/registry.js').then((m) => { m.registry.prefetch?.('static-storm'); m.registry.prefetch?.('luminous-ocean'); }),
      import('../../hushfold/garden-install.js').then((m) => { installMod ||= m; }),
    ] : [];
    Promise.all([preloadInput(), import('../../hushfold/side-panel.js'), ...flow]).catch(() => app.staleCode?.());
  }
  async function resumePendingTell() {
    const p = app.state.pendingTell;
    app.state.pendingTell = null;
    if (!p || Date.now() - p.at > 30 * 60 * 1000) return false;
    // they asked for something gentle after a care or distress disclosure: support stays up, with or
    // without a plan (back from the plans page without buying, the visit is still a gentle one)
    // (or a calm world after "Just be with it": the visit stays gentle, with nothing heavy to answer — soft)
    if (p.gentle) { noteSafety(p.gentle); if (p.gentle.level && p.gentle.level !== 'none') S.careSaid = true; if (p.gentle.soft) softVisit(); }
    // no plan after all (Back from the plans page): a warm line, and their words offered back to tell again
    if (!ent.has('paid') && p.input?.text && !gentle()) { offerRetell(p); return true; }
    if (!ent.has('paid')) return false;
    S.invited = true;
    showTell(true);
    if (p.gentle) {
      // ...and the gentle world they chose plays, with no words in it
      later(() => startFlow({ emotion: p.emotion, intention: p.intention || 'calm', input: null, worldId: p.worldId || null, soft: !!p.gentle.soft }), 700);
      return true;
    }
    // their words wait for this (no reload for a new deploy in between); their world starts loading now
    S.pendingResume = true;
    if (p.input?.text) warmWorld({ emotion: p.emotion, intention: p.intention });
    // (they said "Play with it" before the plans page: chosen, so the words are not asked about again)
    later(() => afterTell({ text: p.input?.text || '', emotion: p.emotion, intention: p.intention, safety: p.input?.safety?.detail || { level: 'none' }, input: p.input, chosen: p.chosen || null }), 700);
    return true;
  }

  /**
   * Free tier, back from the plans page without buying: the words they typed come back with them (held in this scene's
   * memory only, as app.state.pendingTell held them for the plans page; never stored) — a short warm line and "Tell me
   * again", which opens the overlay with the same words (so does the Tell pill). "Just play" lets them go.
   */
  let retell = null;   // { text, emotion, intention, chosen? } while offered back
  function offerRetell(p) {
    // (chosen: "Play with it" was chosen for these words before the plans page — sent again unchanged, not asked twice)
    retell = { text: p.input.text, emotion: p.emotion || null, intention: p.intention || null, chosen: p.chosen || null };
    S.invited = true;
    showTell(true);
    later(async () => {
      if (!retell || S.left || overlay || worldMode || gentle()) return;
      const v = await subtitles.choice(RETELL, [{ label: 'Tell me again', value: 'tell', primary: true, onPick: () => openTell('retell') }, { label: 'Just play', value: 'play' }],
        { who: M().name, colour: M().colours.glow, timeoutMs: 16000, transient: true });
      if (S.left) return;
      S.lastLineAt = now();
      if (v === 'tell') openTell('retell');
      else if (v === 'play' && !gentle()) { retell = null; S.intention ||= 'play'; say(lines.pick(mallowId, 'justPlay')); }
    }, 900);
  }

  /**
   * Reduced motion set to 'system' follows the OS live. MallowTouch follows it by itself only when it was made
   * under 'system' (and setReducedMotion(undefined) would mean "not reduced"), so the shell keeps it on the
   * setting: the OS's value while it is 'system', the person's choice otherwise. (Added after MallowTouch's own
   * listener, this one has the last word when the OS changes.)
   */
  let osMq = null, osFn = null;
  const osReduced = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; } };
  function followOS() {
    if (osMq || typeof matchMedia !== 'function') return;
    try {
      osMq = matchMedia('(prefers-reduced-motion: reduce)');
      osFn = (e) => { if (touchMt && !S.left) touchMt.setReducedMotion(prefs.get('motion') === 'system' ? !!e.matches : prefs.reducedMotion()); };
      if (osMq.addEventListener) osMq.addEventListener('change', osFn); else osMq.addListener?.(osFn);
    } catch { osMq = null; osFn = null; }
  }

  const view = {
    el: root,
    title: '',
    spawnThought,
    get flow() { return flowRef; },
    async enter() {
      document.body.classList.add('hf-active');
      // something heavy earlier in this visit (in this page session, or before a reload in this tab: the level kept
      // for it, never the words): the Mallow is on its attentive face from its very first frame
      const kept = app.state.hfSafety || recallVisitSafety();
      if (kept?.level) setStageFloor(CARE_FACE);
      // back from Another Angle after "Just be with it" there (params.soft): nothing heavy was said — at most the quiet
      // state of this visit (softVisit: no quips, the attentive face), never the Support pill, careSaid or 'carried' Tells
      if (params.soft === true || params.safety?.soft === true) softVisit();
      world.dim(false);
      theme();
      // the Thought Mallows (W2's ThoughtLayer, loaded lazily) keep off the Mallow (room for its hop) and inside the
      // room layout() leaves them; their sounds follow the sound setting live
      stage = createStage({ fx: world.fx, tagRoot: root, reducedMotion: () => prefs.reducedMotion(), lowStim: () => lowStimNow(), onReadThought: readThought,
        keepOut: () => mallowAvoidRect(), bounds: () => thoughtBounds, haptic: (k) => app.haptic?.(k),
        audio: { fx: (n, o) => (prefs.get('sound') ? app.audio?.fx?.(n, o) : false) } });
      // MallowTouch (W2), the squeezable Mallow, is the stage's Mallow for everyone (owner P9), behind the
      // same stage calls; the approved rig is the fallback (it failed to load in 5 s, or prefs.mallowTouch
      // is false; ?touch=0 on the development host). The classic rig goes at once, before the import, so
      // only one Mallow is ever on screen.
      const dev = ['localhost', '127.0.0.1'].includes(location.hostname), qs = new URLSearchParams(location.search);
      if (!(dev && qs.get('touch') === '0') && prefs.get('mallowTouch') !== false) {
        world.showMallow(false);
        world.releaseMallow?.();
        rigReleased = true;
        let wait = 0;
        try {
          const { MallowTouch } = await import('../../mallows/touch/mallow-touch.js');
          if (S.left) return;
          // (no aria-hidden: its root is the focusable role=button that carries the squeeze instructions)
          touchBox = h('div', { class: 'hf-touch' });
          world.fx.before(touchBox);
          touchMt = new MallowTouch(touchBox, { id: mallowId, bindPointer: false, quality: (dev && qs.get('tier')) || 'auto',
            // 'system' follows the OS setting live; the person's own choice wins otherwise
            reducedMotion: prefs.get('motion') === 'system' ? undefined : prefs.reducedMotion(), lowStim: lowStimNow(),
            audio: prefs.get('sound') ? app.audio : null, haptic: (k) => app.haptic(k) });
          // placed before it is ready, it starts exactly where the layout puts it (no entrance glide)
          stageMallow = createStageMallow(world, { touch: touchMt });
          layout();
          await Promise.race([touchMt.loaded, new Promise((_, no) => { wait = setTimeout(() => no(new Error('not ready after 5 s')), 5000); })]);
        } catch (e) {
          if (S.left) return;
          console.warn('[hushfold] MallowTouch unavailable; using the rig', e?.message || e);
          try { touchMt?.destroy(); } catch { /* already gone */ }
          touchMt = null; touchBox?.remove(); touchBox = null; stageMallow = null;
        } finally { clearTimeout(wait); }
        if (S.left) return;
      }
      if (!touchMt) world.showMallow(true);
      stageMallow ||= createStageMallow(world, { touch: null });
      // something heavy earlier in this page session (Settings and back, the plans page and back…): the
      // visit is still a gentle one from the first squeeze, support stays close, and the calm line is not said twice
      if (kept?.level) { S.crisisSpoken = !!kept.crisisSpoken; noteSafety(kept); S.careSaid = true; }
      router = createInputRouter({
        el: world.fx, mallow: stageMallow, thoughts: stage.thoughts,
        onEmpty: (r) => { if (r.type === 'down') stage.ripple(r.x, r.y, M().colours.glow); },
        onTouch: (t) => { if (t.type === 'down') { S.touches++; clearNudge(); } },
      });
      stageMallow.on('touch', onMallowTouch);
      layout();
      // the Mallow first (squeezable within the first second), then its realm
      // (after something heavy earlier in the visit: no hop, and the attentive face)
      const rigP = showMallow(mallowId, { entrance: !softNow() });
      rigP.then(() => { if (!S.left) requestAnimationFrame(() => world.setRealm(M().realm, { crossfadeMs: 900 })); });
      await rigP;
      if (S.left) return;
      // the stage joins the shared loop after the hero (so a world in it sees this frame's Mallow)
      stage.start();
      stageMallow.setStage(softNow() ? CARE_FACE : 'neutral', { quiet: true });
      addEventListener('resize', onResize);
      visualViewport?.addEventListener('resize', onResize);
      document.addEventListener('keydown', onKey);
      addEventListener('hm:offer', onOfferPhase);
      addEventListener('hm:install', onInstallPhase);
      offPrefs = prefs.onChange((k, v) => {
        if (k === 'lowStim') applyCalm();
        if (!touchMt) return;
        // 'system' follows the OS live (followOS below); otherwise the person's choice
        if (k === 'motion') touchMt.setReducedMotion(v === 'system' ? osReduced() : prefs.reducedMotion());
        if (k === 'sound') touchMt.setAudio(v ? app.audio : null);
      });
      followOS();
      // QA hooks on the development host only (Playwright sweeps, the other workstreams' labs)
      if (dev) {
        window.__hushfold = { subtitles, mallow: stageMallow, stage, router, spawnThought, openTell, startFlow, get flow() { return flowRef; }, get panel() { return panel; }, get thoughts() { return stage?.thoughts; },
          get overlay() { return overlay; }, get layers() { return { ...layer }; }, get touch() { return touchMt; }, safeForUpdate: () => view.safeForUpdate(), layout, resumableNow, onOffer, offerAvoid, S };
      }
      // the code the next steps need, fetched while the stage is quiet (a newer deploy can't strand it)
      idle(() => warmModules());
      // back from Another Angle: support stays close after something heavy there (said once, by Zuzu) — only for a real
      // level (review P2): 'none', or anything else, never brings the Support pill, careSaid or 'carried' Tells
      if (LEVELS.indexOf(params.safety?.level) > 0) { if (params.safety.level === 'crisis') S.crisisSpoken = true; noteSafety(params.safety); S.careSaid = true; }
      // (a crisis earlier in the visit whose calm line was never said: it is said now, once nothing covers the stage)
      speakCrisis();
      if (await resumePendingTell()) return;
      if (params.flow?.worldId && ent.has('paid')) {
        S.invited = true; showTell(true);
        // the feeling and intention chosen in Another Angle carry on (its words as a Thought Mallow: owner P15)
        if (params.flow.emotion) await setFeeling(params.flow.emotion, { quiet: true });
        if (S.left) return;
        if (params.flow.intention) S.intention = params.flow.intention;
        startFlow({ worldId: params.flow.worldId, emotion: S.emotion, intention: S.intention });
        return;
      }
      opening();
    },
    leave() {
      S.left = true;
      offerCtl?.abort();
      holdOffer(false);
      if (window.__hushfold?.subtitles === subtitles) delete window.__hushfold;
      for (const t of timers) clearTimeout(t);
      timers.clear();
      clearTimeout(resizeT);
      removeEventListener('resize', onResize);
      visualViewport?.removeEventListener('resize', onResize);
      document.removeEventListener('keydown', onKey);
      removeEventListener('hm:offer', onOfferPhase);
      removeEventListener('hm:install', onInstallPhase);
      watchInstall(false);
      clearTimeout(landT);
      if (osMq && osFn) { try { if (osMq.removeEventListener) osMq.removeEventListener('change', osFn); else osMq.removeListener?.(osFn); } catch { /* gone */ } }
      osMq = null; osFn = null;
      offPrefs?.();
      overlay?.close('leave');
      closeRead();
      heroGhost?.end();
      // a sheet still open stays (it is the person's support); it just stops being one of our layers
      for (const r of sheets.splice(0)) { r.token = 0; r.done = true; r.obs.forEach((o) => o.disconnect()); }
      try { flowRef?.pause?.(); flowRef?.destroy?.(); } catch (e) { console.warn(e); }
      // (destroy() saves the world it held: after a crisis, nothing is kept to resume)
      if (S.crisis) { try { clearProgress(store); } catch { /* storage blocked */ } }
      if (forgetOnHide) { removeEventListener('visibilitychange', forgetOnHide); removeEventListener('pagehide', forgetOnHide); forgetOnHide = null; }
      subtitles.destroy();
      panel?.destroy();
      router?.destroy();
      stage?.destroy();
      stageMallow?.destroy();
      if (touchMt) {
        try { touchMt.destroy(); } catch (e) { console.warn(e); }
        touchMt = null; touchBox?.remove(); touchBox = null;
      }
      if (S.photos) import('../../v3/photos.js').then((m) => m.photoSession.release()).catch(() => {});
      // hand the persistent stage back exactly as the classic scenes expect it
      world.setLayerSize(null);
      world.showMallow(true);
      world.realm?.pause?.(false);
      if (gentle()) world.setLowStim?.(!!prefs.get('lowStim'));
      // ...with a rig on it again: the person's own Mallow (not a world's host), without a hop. The
      // scene that follows (express, plans, the classic home, settings…) calls the shared stage at once
      // and may never call setMallow itself; one that does (garden, Another Angle, rituals) swaps it.
      // (world.setMallow sets the rig synchronously; its art loads after)
      const own = MALLOWS[homeMallow] ? homeMallow : mallowId;
      if (rigReleased && !world.rig) world.setMallow(own, { entrance: false, interactive: true }).catch((e) => console.warn('[hushfold] rig', e?.message || e));
      world.fx.replaceChildren();
      world.fx.classList.remove('live');
      world.dim(false);
      document.body.classList.remove('hf-active', 'hf-world-arriving', 'hf-world-leaving', 'hf-world-held', 'hf-ask-fold', 'hf-ask-fold-thought');
    },
    /**
     * Back closes the newest transient layer first. main.js passes the token of
     * the history entry Back just used: that layer closes without stepping
     * history again (its entry is already gone).
     */
    get blockBack() {
      if (!overlay && !readEl && !panel?.isOpen && !sheets.length && !layer.ask) return null;
      return (token) => backClose(token);
    },
    safeForUpdate() {
      if (overlay?.dirty) return false;
      // a garden offer waiting for its answer, or the installation playing
      if (document.querySelector('.hm-offer.is-in') || document.body.classList.contains('hm-installing')) return false;
      if (subtitles.holding) return false;
      // (the question waiting for its answer)
      if (S.asking) return false;
      if (sheets.length || S.pendingResume) return false;
      // someone who went to call a helpline comes back to the same screen, Support pill and all
      if (S.crisis || S.care || gentle() || !supportPill.hidden) return false;
      // their words are on stage as a Thought Mallow
      if (!worldMode && (stage?.thoughts.list.length || 0) > 0) return false;
      // a host cross-fading in
      if (heroGhost) return false;
      try { return flowRef?.safeForUpdate?.() ?? true; } catch { return false; }
    },
  };
  return view;
}
