// ANOTHER ANGLE — hushmallow Beyond's cinematic, playable reframe, with Zuzu.
//
// One continuous scene in the Spiral Observatory, no chatbot bubbles and no
// forms. Zuzu is a living, squeezable MallowTouch Mallow the whole time
// (also while a perspective is being prepared: there is no spinner).
//
//   arrive → (consent, once, when the server is configured) → invitation →
//   the compact input (the person's words + an optional feeling) →
//   safety (crisis: urgent support, nothing sent; care: support, no reframe) →
//   a loss detected: the gentle path, no question; otherwise one gentle choice first (owner decision 'Ask before every
//   world', 14 Oct 2026; angle-first.js ASK_BEFORE_ANGLE): "Shall we look at this from another angle, or just be with
//   it?" (nothing sent or played before it; "Just be with it" is the gentle path, nothing sent) →
//   the words become a Thought Mallow while Zuzu explores another angle →
//   one of ten mechanics (picked by the scene's interaction_type) →
//   a new perspective: two subtitle lines from the scene's Mallow beside Zuzu →
//   optional "test it" prompts → That helped / Show me another angle /
//   Not relevant / I'd rather just squeeze a Mallow → Keep this discovery
//   (Memory Garden) → Continue (Hushflow) or Finish.
//
// Offline, without consent, without an endpoint, on a timeout or a server
// fallback, the same scenes play from the authored engine (authored.js), after
// the app's own safety check. The person's words are only ever shown exactly
// as typed (DOM textContent), never stored, and only sent after consent.
//
// createAnotherAngle(app, { root, params }) → { enter(), leave(), get blockBack(), safeForUpdate() }

import { h } from '../app/ui.js';
import { MALLOWS } from '../mallows/registry.js';
import { openSupport } from '../app/scenes/support.js';
import { checkText } from '../engine/safety.js';
import { hfIcon } from '../hushfold/icons.js';
import { ensureBeyondCss } from './styles.js';
import {
  WAITING, WAITING_LONG, ARRIVAL, SAFETY, UNCLEAR, EXPLORE, EXPLORE_ASK, EXPLORE_MORE, EXPLORE_EMPTY,
  FRIEND_LINES, FEEDBACK, END, ZUZU_SQUEEZE, INVITE, GRIEF, FEELING, LOSS_CHECK, ANGLE_CHOICE, BE_WITH, mechanicLines, pick,
} from './lines.js';
import { firstStep, answerKey, questionClock, goodbye } from './angle-first.js';
import { authoredScene, sceneParts, candidatePatterns, gentleScene, feelingOf, feelingGuard, guessGuard } from './authored.js';
import { deathEscalation, suicideDeath, serverLoss, griefLinesOk, keepLocal, noteShape } from './grief.js';
import { heavyHarm, gentleRoute, framingAllowed, bagWords, framesAsGuess, lossRoute, griefFeeling } from './backstop.js';
import { FEELING_LOOK } from './feelings.js';
import { consentState, openConsent, noteFeedback, lessWanted, STORE_KEYS } from './consent.js';
import { createAngleClient, resolveEndpoint, TIMEOUTS } from './angle-client.js';
import { RATINGS, MECHANICS } from './vocab.js';
import { loadMechanic, prefetchMechanic } from './mechanics/index.js';
import { makeTags, Blob, ThoughtBody, RectList, tintFor, familyOf, drawGlow, blinkAt, clamp, approach, setLowStim } from './mechanics/kit.js';

const DEV = () => typeof location !== 'undefined' && ['localhost', '127.0.0.1'].includes(location.hostname);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const now = () => performance.now();
const hasWords = (t) => /[\p{L}\p{N}]/u.test(String(t || ''));
const REACTIONS = new Set(['squeeze', 'tap', 'doubleTap', 'flick', 'stretch', 'massage', 'stroke', 'jiggle', 'pull']);
/** Safety levels, least to most serious (src/engine/safety.js). */
const LEVELS = ['none', 'concern', 'care', 'crisis'];
const worse = (a, b) => (LEVELS.indexOf(b) > LEVELS.indexOf(a) ? b : a);
/**
 * Zuzu's face after something heavy: attentive and quiet, the mouth soft and closed (the rig's own
 * "concerned" stage still carries Zuzu's open grin; until that art changes, this mix stands in).
 */
const CARE_MIX = { sad: 0.4, calm: 0.4, curious: 0.2 };
const CARE_EXTRA = { mouthSmile: 0.08, mouthOpen: 0.04, tears: 0, fxRain: 0, fxHeart: 0, leanBias: 0.2 };
/** What the compact input's privacy note says once sharing is on (the dictation hint around it stays). */
const SERVER_CLAUSE = 'Only these words, and the feeling and help you pick, go to our secure server for a new perspective, never photos.';
/** How long a perspective may take before Zuzu's own angle plays instead (the server's single attempt, about 15 s). */
const ANGLE_BUDGET_MS = 18000;
/** At or below this height the consent notice is a sheet to the bottom edge (styles.js: @media (max-height: 700px)). */
const CONSENT_SHEET_H = 700;
/** The look of the person's Thought Mallow when no feeling was chosen: the kind of thought it is. */
const PATTERN_LOOK = Object.freeze({
  valid_anger: 'anger', rumination: 'overthinking', catastrophising: 'anxiety', mind_reading: 'anxiety', fact_vs_assumption: 'anxiety',
  personalisation: 'guilt', self_criticism: 'shame', overgeneralisation: 'sadness', all_or_nothing: 'frustration', practical_problem: 'overwhelm',
});
/** A word-reading (never decisive) only colours the thought when it is this sure, and only with a troubled feeling. */
const READING_SURE = 0.7;
/** A harm word no ordinary idiom explains (a server loss scene beside one reads as grief: grief.js serverLoss). */
const heavyWords = (t) => heavyHarm(t);
/** How long the words rest before the draft is read again while typing (as the overlay's own safety reading). */
const DRAFT_MS = 260;
/** Authored visits (sharing said "Not now") after which the invitation mentions sharing again, gently. */
const SHARE_AGAIN_EVERY = 4;

export function createAnotherAngle(app, { root, params = {} } = {}) {
  const { world, prefs, store } = app;
  const rmOn = () => prefs.reducedMotion();
  const lowOn = () => !!prefs.get('lowStim');
  const ZUZU = MALLOWS.zuzu;
  const endpoint = resolveEndpoint();
  // QA on the development host only: ?angleTimeout=<ms> shortens the wait (timeout tests)
  const devTimeout = DEV() ? Number(new URLSearchParams(location.search).get('angleTimeout')) || 0 : 0;
  const devBudget = devTimeout > 0 ? devTimeout + 500 : 0;
  const client = endpoint ? createAngleClient({ store, endpoint, ...(devTimeout > 0 ? { timeouts: { ...TIMEOUTS, angle: devTimeout } } : {}) }) : null;
  const serverMode = () => !!client && consentState(store) === 'yes';

  const S = {
    left: false, phase: 'arrive', text: params.text || '', emotion: null, intention: null,
    scene: null, shown: [], used: [], crisis: false, care: false, keepSupport: false, kept: false,
    // the most serious safety level seen in this visit (typed and closed, reworded before Send, or sent): it counts, not only the words sent
    level: 'none', category: null, concernSaid: false,
    // (review r8) follow: death talk that wanted to follow the one who died was seen (typed, closed or sent: care, for
    // the visit); noPlay: a bag word or death talk was seen (no playful line for the visit); heavyDraft: while typing;
    // (r3-esc) suicide: a suicide named was seen (care for the visit, its gentle lines)
    follow: false, suicide: false, noPlay: false, heavyDraft: false,
    // (owner decision 'Ask before every world') answers: the gentle answers given for these words in this visit (angle-first.js
    // answerKey → 'be' | 'yes'; r2-angle item 2: "Another angle" is never remembered, every new Tell is asked again);
    // keepWords: the question was let go (no answer, Back), so the Tell opens with those words (r2-angle item 2: after any
    // answer it opens empty); unsure: the words carry a softer loss cue (lossRoute 'ask'); beOnly (r2-angle item 5): "Just be
    // with it" for words where nothing heavy was seen, a quiet path of its own (never the grief path's support or goodbye)
    answers: new Map(), keepWords: false, unsure: false, beOnly: false,
    // (final round 5) local: unsure words (lossRoute 'ask') with the safety net's words (grief.js keepLocal): "Another angle" plays
    // Zuzu's own authored angle and nothing is sent for them
    local: false,
    touches: 0, squeezes: 0, seq: 0, lastLineAt: 0, offlineSaid: false, explored: 0, sheetAt: -1e9, band: 0,
  };
  const timers = new Set();
  const later = (fn, ms) => { const t = setTimeout(() => { timers.delete(t); if (!S.left) fn(); }, ms); timers.add(t); return t; };

  // ------------------------------------------------------------ DOM --
  ensureBeyondCss();
  root.classList.add('beyond');
  const backBtn = h('button', { class: 'hf-btn', type: 'button', 'aria-label': 'Leave Another Angle', onclick: () => app.back() }, hfIcon('prev'));
  const supportBtn = h('button', { class: 'hf-btn', type: 'button', 'aria-label': 'Need support now?', onclick: () => openSupportSheet() }, hfIcon('support'));
  const top = h('header', { class: 'bx-top' }, backBtn, h('span', { class: 'bx-name' }, 'Another Angle'), h('div', { class: 'grow' }), supportBtn);
  const assistLabel = h('span', {});
  const assistBtn = h('button', { class: 'hf-pill assist', type: 'button', hidden: true, 'data-bx': 'assist', onclick: () => { S.touches++; mech?.assist?.(); } }, h('span', { class: 'dot', 'aria-hidden': 'true' }), assistLabel);
  const tellPill = h('button', { class: 'hf-pill', type: 'button', hidden: true, 'data-bx': 'tell', onclick: () => openTell() }, hfIcon('talk'), 'Tell Zuzu');
  const supportPill = h('button', { class: 'hf-pill support', type: 'button', hidden: true, onclick: () => openSupportSheet() }, hfIcon('support'), 'Support');
  const finishPill = h('button', { class: 'hf-pill', type: 'button', hidden: true, 'data-bx': 'finish', onclick: () => finish() }, hfIcon('finish'), 'Finish');
  const dock = h('div', { class: 'bx-dock' }, assistBtn, tellPill, supportPill, finishPill);
  const live = h('p', { class: 'sr-only', 'aria-live': 'polite' });
  root.append(h('h1', { class: 'sr-only' }, 'Another Angle, with Zuzu. Squeeze Zuzu any time.'), top, dock, live);
  const tags = makeTags(root);

  // -------------------------------------------------------- the stage --
  let canvas = null, g = null, dpr = 1, W = 0, H = 0;
  let subs = null, router = null, inputMod = null, touchBox = null, zt = null, zAd = null, compBox = null, ct = null, compAd = null, compId = null;
  let overlay = null, consentCard = null, mech = null, mechId = null, thought = null, thoughtTag = null, rigTicker = null, removeTicker = null;
  let TL = null, wth = null, sheetObs = null;   // W2's ThoughtLayer (src/mallows/thought) and the person's Thought Mallow on it
  let W2 = null;                                // W2's Thought Mallow + its renderer, for the mechanics (null: the kit's jelly)
  let area = { x: 16, y: 160, w: 358, h: 360 };
  const ripples = [];
  const layer = { overlay: 0, lossCheck: 0 };
  // Sheets opened here (support, urgent support, the overlay's A–Z list) get a history entry of their own,
  // newer than the compact input beneath them, so Back closes the sheet first (as in the Hushfold shell)
  const sheets = [];   // { token, sheet, seen, obs, done }
  function trackSheet(sheet) {
    if (!sheet?.el || S.left) return sheet;
    S.sheetAt = now();
    const rec = { token: app.pushLayer?.() || 0, sheet, seen: false, obs: [], done: false };
    sheets.push(rec);
    const done = () => {
      if (rec.done) return;
      rec.done = true;
      rec.obs.forEach((o) => o.disconnect());
      const i = sheets.indexOf(rec);
      if (i >= 0) sheets.splice(i, 1);
      // closed another way (✕, its button, the backdrop, Escape): its history entry goes too
      if (rec.token && !S.left) { const t = rec.token; rec.token = 0; app.popLayer?.(t); }
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
  /** The support sheet (urgent after crisis words), as a layer of its own. */
  const openSupportSheet = (opts = {}) => trackSheet(openSupport(app, opts));
  /** Back: the newest sheet first, then the compact input (main.js passes the token of the entry it used). */
  function backClose(token) {
    const sh = token ? sheets.find((r) => r.token === token) : sheets[sheets.length - 1];
    if (sh) { sh.token = 0; sh.sheet.close('back'); return; }
    if (overlay && (!token || token === layer.overlay || !sheets.length)) { layer.overlay = 0; overlay.close('back'); return; }
    // (the question before the angle, or the check-in "Is this about losing someone?": Back lets it go, and Zuzu stays
    // here quietly)
    if (layer.lossCheck && (!token || token === layer.lossCheck)) { layer.lossCheck = 0; subs?.drop((o) => o.lossCheck); }
  }

  function resize() {
    if (!canvas) return;
    dpr = Math.min(2, devicePixelRatio || 1);
    W = innerWidth; H = innerHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    if (S.phase === 'playing' && S.scene) { const L = mechanicLines(S.scene.mechanic, S.scene); S.band = measureBand([L.hint, L.hint2, L.hint3, L.slow, L.done]); }
    mech?.tags?.remeasure?.();
    layout();
  }
  const topBottom = () => top.getBoundingClientRect().bottom || 58;
  function dockTop() {
    const shown = [...dock.children].some((c) => !c.hidden);
    const r = shown ? dock.getBoundingClientRect() : null;
    return r && r.height ? r.top : innerHeight - 22;
  }

  /** Zuzu (and the scene's Mallow) at the bottom, the play area between the subtitle band and their heads. */
  function layout() {
    if (S.left || !zAd) return;
    const vw = innerWidth, vh = innerHeight;
    const topB = topBottom();
    const two = !!compAd;
    const ov = overlay?.rect?.();
    let B = clamp(Math.min(vw * 0.42, vh * 0.21), 96, 210);
    // plain play: Zuzu comes forward to be squeezed (after something heavy Zuzu stays its usual size, under the words)
    if (S.phase === 'squeeze') B = clamp(Math.min(vw * 0.6, vh * 0.34), 140, 320);
    // while the notice is open Zuzu waits smaller beneath it (still squeezable), so more of the notice is in view; on a
    // short screen the notice is a sheet to the bottom edge (styles.js) and Zuzu waits out of sight below it, coming back
    // up once it closes (the QA sweep: a 146 px window between Zuzu and the top bar)
    const sheetNotice = !!consentCard && vh <= CONSENT_SHEET_H;
    if (consentCard) B = clamp(vh * 0.105, 70, 116);
    const onStage = S.phase === 'playing' || (!!mech && !root.classList.contains('bx-recede'));
    // a short phone, while a mechanic is on stage: Zuzu sits a little smaller, down in the corner beside the
    // dock's pill, so the play area keeps the height it needs (squeezable there too)
    if (onStage && vh < 700) B = Math.min(B, clamp(vh * 0.155, 80, 130));
    const corner = vh < 700 && onStage && !two && !ov?.height && !consentCard;
    root.classList.toggle('bx-corner', corner);
    // (the subtitle band never glides across a scene that is on stage: styles.js)
    root.classList.toggle('bx-onstage', !!mech);
    // (20px from the screen's edges: room for the system's own gestures)
    if (corner) root.style.setProperty('--bx-corner', `${Math.round(B * 1.16 + 20 + 8)}px`);
    if (two) B *= 0.86;
    let cy = sheetNotice ? vh + B : dockTop() - 14 - B / 2;
    // Zuzu and the scene's Mallow stand together, centred (never a screen apart on a wide display)
    const spread = Math.min(vw * 0.36, B * 1.3);
    let cxZ = two ? vw / 2 - spread / 2 : vw / 2;
    if (corner) {
      const pills = [...dock.children].filter((c) => !c.hidden).map((c) => c.getBoundingClientRect().bottom);
      cxZ = 20 + B * 0.58;
      cy = (pills.length ? Math.max(...pills) - 2 : vh - 22) - B / 2;
    }
    if (ov?.height) {
      // typing: Zuzu waits below the compact overlay, smaller
      B = clamp(Math.min(vw * 0.36, (vh - ov.bottom) * 0.55), 80, 180);
      cy = Math.min(vh - 24 - B / 2, ov.bottom + 18 + B / 2);
    }
    zAd.fit?.({ cx: cxZ, cy, size: B });
    compAd?.fit?.({ cx: vw / 2 + spread / 2, cy: cy + B * 0.03, size: B * 0.94 });
    const band = clamp(vh * 0.14, 86, 132);
    // while a mechanic is on stage (played, or landed and waiting for its line), the area starts below the
    // subtitle band its own lines need (measured): the scene never climbs into the band as its line arrives
    const playing = (S.phase === 'playing' || !!mech) && S.band;
    const aTop = Math.max(topB + band, playing ? topB + 8 + S.band : 0);
    const aBottom = (corner ? Math.min(cy - B / 2, dockTop()) : cy - B / 2) - 16;
    const aw = Math.min(vw - (vw < 360 ? 20 : 32), 560);
    area = { x: (vw - aw) / 2, y: aTop, w: aw, h: Math.max(150, aBottom - aTop) };
    root.style.setProperty('--bx-card-max', `${Math.round(Math.max(230, cy - B / 2 - 20 - (topB + 8)))}px`);
    subs?.layout();
  }
  /** The height a subtitle line (at least two rows) plus its controls takes at this size and text scale (the tallest of several lines). */
  function measureBand(text) {
    if (Array.isArray(text)) return Math.max(0, ...text.filter(Boolean).map((t) => measureBand(t)));
    const real = subs?.el;
    if (!real?.parentNode || typeof getComputedStyle !== 'function') return 0;
    try {
      const probe = h('div', { class: 'hf-subs', 'aria-hidden': 'true', style: { visibility: 'hidden', pointerEvents: 'none', transform: 'none' } },
        h('div', { class: 'hf-sublive' }, h('div', { class: 'hf-sub dialogue' }, h('div', { class: 'who' }, ZUZU.name), h('p', { class: 'text' }, text || 'Zuzu'))));
      real.parentNode.append(probe);
      const line = probe.firstChild, t = probe.querySelector('.text');
      const lh = parseFloat(getComputedStyle(t).lineHeight) || t.offsetHeight || 28;
      const rows = Math.max(1, Math.round(t.offsetHeight / lh));
      const need = line.offsetHeight + Math.max(0, 2 - rows) * lh;
      probe.remove();
      const ctlH = real.querySelector('.hf-subctl')?.offsetHeight || 44;
      return Math.round(need + ctlH + 22);
    } catch { return 0; }
  }
  let resizeT = 0;
  const onResize = () => { clearTimeout(resizeT); resizeT = setTimeout(resize, 120); };

  // ------------------------------------------------------- subtitles --
  const who = (id = 'zuzu') => { const m = MALLOWS[id] || ZUZU; return { who: m.name, colour: m.colours.glow }; };
  // (a line that opens on their words in quotes starts with a capital: "“She must be angry with me” is a guess…"; the
  // words inside stay as typed otherwise)
  const capOpen = (t) => (typeof t === 'string' ? t.replace(/^([“"‘])(\p{Ll})/u, (m, q, c) => q + c.toUpperCase()) : t);
  const say = (text, opts = {}) => { if (!text || !subs) return Promise.resolve(false); S.lastLineAt = now(); return subs.say(capOpen(text), { ...who(opts.mallow), ...opts }); };
  const choose = (prompt, options, opts = {}) => (subs ? subs.choice(prompt, options, { ...who(opts.mallow), ...opts }) : Promise.resolve(null));
  const announce = (t) => { live.textContent = ''; requestAnimationFrame(() => { live.textContent = t; }); };
  // what a mechanic shows (its cards, possibilities, bowls, pieces) is heard as it appears: gathered for a
  // moment so several labels arriving together are read as one calm sentence, not lost to each other
  const heard = [];
  let heardT = 0;
  const announceSoon = (t) => {
    const x = String(t || '').trim();
    if (!x || heard.includes(x)) return;
    heard.push(x);
    clearTimeout(heardT);
    heardT = setTimeout(() => { if (S.left || !heard.length) return; announce(heard.join('. ').replace(/([.!?…])\./g, '$1')); heard.length = 0; }, 260);
  };
  /** Zuzu after something heavy: attentive, quiet, no grin. */
  const careFace = () => zt?.setEmotion(CARE_MIX, 0.55, { extra: CARE_EXTRA, quiet: true });
  function rectOf(ad, pad = 0.12) {
    const b = ad?.bodyRect?.();
    if (!b || !b.height) return null;
    return { left: b.left, right: b.left + b.width, top: b.top - Math.max(16, b.height * pad), bottom: b.top + b.height + 6 };
  }
  function subsAvoid() {
    const list = [rectOf(zAd), rectOf(compAd), overlay?.rect?.(), consentCard?.rect?.()];
    // while a mechanic is on stage its bodies stay clear (its labels make way for the line, not the other way
    // round: a band that chased the labels would never settle); once it has receded, only the Mallows matter
    if (mech && !root.classList.contains('bx-recede')) {
      // the whole play area is the scene's: the band sits above it (the area was sized to leave it that room)
      list.push({ left: area.x, right: area.x + area.w, top: area.y, bottom: area.y + area.h }, ...(mech.bodies?.() || mech.avoid?.() || []));
    } else if (mech) {
      // receded (dimmed, its labels gone) while the perspective is told: the lines still never sit on its jellies
      list.push(...(mech.bodies?.() || []));
    }
    else if (thought?.w2 && !mech) list.push(...TL.rects());
    else if (thought && !mech) list.push({ left: thought.x - thought.r * 1.4, right: thought.x + thought.r * 1.4, top: thought.y - thought.r * 1.4, bottom: thought.y + thought.r * 1.4 + 44 });
    return list.filter(Boolean);
  }

  // ----------------------------------------------------- the ticker --
  function tick(dt, t) {
    if (S.left || !g) return;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, W, H);
    // touch ripples on empty sky
    for (let i = ripples.length - 1; i >= 0; i--) {
      const r = ripples[i];
      r.t += dt / (rmOn() ? 0.45 : 0.9);
      if (r.t >= 1) { ripples.splice(i, 1); continue; }
      const k = r.t, a = (1 - k) * (1 - k) * (lowOn() ? 0.14 : 0.3);
      g.globalAlpha = a; g.strokeStyle = '#9ff7ff'; g.lineWidth = 2;
      g.beginPath(); g.arc(r.x, r.y, rmOn() ? 18 : 10 + 50 * (1 - (1 - k) * (1 - k)), 0, Math.PI * 2); g.stroke();
      g.globalAlpha = 1;
    }
    if (TL && TL.list.length) { try { TL.frame(dt, t, g); } catch (e) { console.warn('[another angle] thought layer', e?.message); swapToLocalThought(); } }
    if (thought && !thought.w2 && !mech) drawThought(dt, t);
    if (mech) {
      try {
        mech.frame(dt, t);
        // the labels keep off each other, the subtitle band and its pill, the Mallows and the scene's bodies
        mech.tags?.layout?.(dt, tagObstacles(), { instant: rmOn() });
        // once it has landed there is nothing left to assist
        if (mech.settled && !assistBtn.hidden) { assistBtn.hidden = true; layout(); }
      } catch (e) { mechFailed(e); }
    }
    g.globalAlpha = 1;
  }
  /** What a mechanic's labels must keep clear of (refreshed ~10 times a second, not every frame; the rects are reused). */
  let obsAt = -1e9;
  const obsRects = new RectList();
  let obsList = obsRects.end();
  const obsBox = (r, pad = 0) => { if (r && r.width !== 0 && r.height !== 0) obsRects.box(r.left - pad, r.top - pad, r.right + pad, r.bottom + pad); };
  const obsMallow = (ad) => { const b = ad?.bodyRect?.(); if (b?.height) obsRects.box(b.left + b.width * 0.08, b.top, b.left + b.width * 0.92, b.top + b.height); };
  let subParts = null, subPartsAt = -1e9;
  function tagObstacles() {
    const t = now();
    if (t - obsAt < 90) return obsList;
    obsAt = t;
    obsRects.begin();
    if (subs?.el) {
      // the band's pieces: looked up again now and then (they come and go with each line), measured every time
      if (!subParts || t - subPartsAt > 200) { subParts = subs.el.querySelectorAll('.hf-sublive > .hf-sub, .hf-chips:not([hidden]), .hf-subctl:not(.is-hidden)'); subPartsAt = t; }
      for (const e of subParts) if (e.isConnected) obsBox(e.getBoundingClientRect(), 2);
    }
    obsMallow(zAd); obsMallow(compAd);
    for (const c of dock.children) if (!c.hidden) obsBox(c.getBoundingClientRect(), 2);
    const bs = mech?.bodies?.();
    if (bs) for (const r of bs) obsRects.box(r.left, r.top, r.right, r.bottom);
    obsList = obsRects.end();
    return obsList;
  }
  /** A mechanic that throws: never a stuck scene. Its perspective still arrives (through pull_apart, or straight to the reveal). */
  let failNote = null;
  function mechFailed(e) {
    const m = mech;
    if (!m || m.failed) return;
    m.failed = true;
    console.warn('[another angle] mechanic stopped', mechId, e?.message);
    failNote?.(mechId);
  }

  // ------------------------------------------------- Thought Mallow --
  // The words become a small, distressed Thought Mallow while Zuzu explores:
  // it is squeezable too, and the mechanic takes it over from where it sits.
  function spawnThought() {
    const [light, deep] = tintFor(S.look || S.emotion);
    const r = clamp(Math.min(area.w, area.h) * 0.12, 26, 42);
    const ov = overlay?.rect?.();
    const fromY = ov?.bottom ? ov.top + 60 : area.y;
    if (TL) {
      // W2's Thought Mallow: the person's exact words, alive (emotion style, squeezable, tap to read)
      try {
        TL.clear();
        wth = TL.add({ text: S.text, emotion: S.look || S.emotion || 'anxiety', intensity: 0.7, r }, { from: { x: innerWidth / 2, y: fromY }, home: { x: area.x + area.w / 2, y: area.y + area.h * 0.46 } });
        thought = { get x() { return wth.x; }, get y() { return wth.y; }, get r() { return wth.r || r; }, w2: true };
        return;
      } catch (e) { console.info('[another angle] ThoughtLayer add failed; using the local Thought Mallow', e?.message); wth = null; }
    }
    thought = new Blob({ x: innerWidth / 2, y: ov?.bottom ? ov.top + 60 : area.y, r, light, deep });
    thought.scale = rmOn() ? 1 : 0.2;
    thought.born = 0;
    thoughtTag?.remove();
    thoughtTag = tags.add(sceneParts(S.text).excerpt, { kind: 'words' });
    placeThought();
    if (rmOn()) { thought.x = thought.hx; thought.y = thought.hy; }
  }
  /** W2's layer failed mid-flight: the local Thought Mallow takes over where it was, words and all. */
  function swapToLocalThought() {
    const at = thought?.w2 ? { x: thought.x, y: thought.y } : null;
    try { TL?.clear(); } catch { /* already broken */ }
    TL = null; wth = null; thought = null;
    if (at && S.phase === 'waiting') {
      spawnThought();
      Object.assign(thought, { x: at.x, y: at.y, scale: 1, born: 1 });
    }
  }
  function placeThought() { if (thought) { thought.hx = area.x + area.w / 2; thought.hy = area.y + area.h * 0.46; } }
  function drawThought(dt, t) {
    placeThought();
    const rm = rmOn();
    thought.scale = rm ? 1 : approach(thought.scale, 1, 3, dt);
    thought.born = Math.min(1, thought.born + dt / (rm ? 0.3 : 0.9));
    if (!rm && !thought.press) thought.hy += Math.sin(t * 1.6) * 3;
    thought.step(dt, rm);
    const jit = rm || lowOn() ? 0 : 0.9;
    thought.draw(g, { tension: 0.75, sad: /sad|lonel|hurt|disap/.test(S.emotion || '') ? 0.5 : 0.1, blink: blinkAt(t, 0.4), press: thought.press ? 1 : 0,
      lookX: Math.sin(t * 0.7) * 0.4 }, { x: thought.x + (jit ? Math.sin(t * 29) * jit : 0), alpha: thought.born });
    thoughtTag?.at(thought.x, thought.y + thought.r * thought.scale * 1.1 + 6, 'bottom', thought.born);
  }
  function thoughtPointer(e) {
    if (!thought) return false;
    if (thought.w2) { const ok = TL.pointer(e); if (ok && e.type === 'down') { app.haptic('light'); S.touches++; } return ok; }
    if (e.type === 'down') { if (!thought.hit(e.x, e.y, 1.4)) return false; thought.grab(e); app.haptic('light'); S.touches++; return true; }
    if (e.type === 'move') return thought.drag(e);
    if (e.type === 'up' || e.type === 'cancel') { const p = thought.drop(e); if (p) placeThought(); return !!p; }
    return false;
  }
  function dropThought(fadeMs = 0) {
    if (thought?.w2) { try { if (fadeMs > 0) TL.release(fadeMs); else TL.clear(); } catch { /* ignore */ } wth = null; }
    thought = null; thoughtTag?.remove(); thoughtTag = null;
  }

  // --------------------------------------------------------- input --
  function stagePointer(e) {
    let used = false;
    if (mech) used = !!mech.pointer?.(e);
    else if (thought) used = thoughtPointer(e);
    if (!used && e.type === 'down') { if (ripples.length > 4) ripples.shift(); ripples.push({ x: e.x, y: e.y, t: 0 }); }
    if (e.type === 'down') S.touches++;
  }
  function onZuzuTouch(e) {
    if (e.kind === 'press') { S.touches++; return; }
    if (!REACTIONS.has(e.kind)) return;
    S.squeezes++;
    // after something heavy, squeezing stays and the playful lines go
    if (overlay || S.phase === 'typing' || S.level !== 'none' || S.crisis || S.care) return;
    // (death talk, or any word of the backstop's bag, earlier in the visit: squeezing stays, the playful lines go)
    if (S.grief || S.noPlay) return;
    // an occasional line, never a running commentary (and never over a perspective)
    if (['arrive', 'invite', 'squeeze', 'end'].includes(S.phase) && !subs?.busy && now() - S.lastLineAt > 9000 && S.squeezes % 3 === 1) say(pick(ZUZU_SQUEEZE, S.squeezes));
  }

  // ------------------------------------------------- Mallows on stage --
  async function makeTouch(id, box) {
    const { MallowTouch } = await import('../mallows/touch/mallow-touch.js');
    const mt = new MallowTouch(box, { id, bindPointer: false, reducedMotion: rmOn(), lowStim: lowOn(), audio: prefs.get('sound') ? app.audio : null, haptic: (k) => app.haptic(k) });
    await mt.loaded;
    return mt;
  }
  async function bringCompanion(id) {
    if (S.left || !id || id === 'zuzu' || id === compId) return;
    dismissCompanion(true);
    compId = id;
    try {
      compBox = h('div', { class: 'hf-touch' });
      world.fx.before(compBox);
      const { createStageMallow } = await import('../hushfold/stage.js');
      ct = await makeTouch(id, compBox);
      if (S.left || compId !== id) { ct.destroy(); compBox.remove(); return; }
      compAd = createStageMallow(world, { touch: ct });
      // enters from the right side of the stage
      ct.place({ x: innerWidth + 120, y: zAd.bodyRect().cy }, { instant: true });
      layout();
      if (!rmOn()) ct.react('hop');
      ct.setStage('curious');
    } catch (e) { console.info('[another angle] companion unavailable', e?.message); compAd = null; ct = null; compBox?.remove(); compBox = null; compId = null; }
  }
  function dismissCompanion(now_ = false) {
    if (!ct) { compId = null; return; }
    const c = ct, box = compBox;
    ct = null; compAd = null; compBox = null; compId = null;
    if (!now_ && !rmOn()) c.place({ x: innerWidth + 160 });
    setTimeout(() => { try { c.destroy(); } catch { /* ignore */ } box?.remove(); }, now_ || rmOn() ? 0 : 520);
    layout();
  }

  // ---------------------------------------------------------- dock --
  function dockShow({ assist = null, tell = false, finish: fin = false, support = true } = {}) {
    assistBtn.hidden = !assist;
    if (assist) { assistLabel.textContent = assist; assistBtn.setAttribute('aria-label', `${assist} (instead of touch)`); }
    tellPill.hidden = !tell;
    finishPill.hidden = !fin;
    // (support: false only while a choice of its own offers support: never the same control twice)
    supportPill.hidden = !(S.keepSupport || S.care || S.crisis) || !support;
    layout();
  }

  // ---------------------------------------------------------- flow --
  async function arrive() {
    S.phase = 'arrive';
    zt?.setStage('curious');
    if (!rmOn()) zt?.react('hop');
    if (client && consentState(store) === 'unasked') { await askConsent(); if (S.left) return; }
    invite();
  }
  function askConsent() {
    S.phase = 'consent';
    return new Promise((resolve) => {
      consentCard = openConsent({ app, root, support: () => openSupportSheet(), onDecide: (choice) => {
        consentCard = null;
        layout();
        if (choice === 'no') S.offlineSaid = false;
        resolve(choice);
      } });
      layout();
    });
  }
  async function invite() {
    if (S.left) return;
    S.phase = 'invite';
    dockShow({});
    preloadInput();
    let first = true;
    try { first = !store.get(STORE_KEYS.seen, false); store.set(STORE_KEYS.seen, true); } catch { /* first visit, then */ }
    if (first) await say(ARRIVAL.first[0]);
    else await say(ARRIVAL.again[0]);
    if (S.left || S.phase !== 'invite') return;
    if (!serverMode() && !S.offlineSaid) { S.offlineSaid = true; say(ARRIVAL.offline, { who: null, colour: null }); }
    // "Not now" is never a closed door: every few visits on Zuzu's own angles, the invitation mentions sharing once
    const options = [
      { label: ARRIVAL.tell, value: 'tell', primary: true, onPick: () => openTell() },
      { label: ARRIVAL.squeeze, value: 'squeeze' },
    ];
    if (shareAgainNow()) options.push({ label: ARRIVAL.share, value: 'share' });
    const v = await choose(first ? ARRIVAL.first[1] : ARRIVAL.ask, options, { transient: true });
    if (S.left || S.phase !== 'invite') return;
    if (v === 'share') { await askConsent(); if (S.left) return; S.offlineSaid = false; return invite(); }
    dockShow({ tell: true });
    if (v === 'squeeze') say(ARRIVAL.justSqueeze[0]);
  }

  /** Said "Not now" before, and this is one of the visits (every few) where sharing is mentioned again. */
  let shareAsked = false;
  function shareAgainNow() {
    if (shareAsked || !client || consentState(store) !== 'no') return false;
    shareAsked = true;
    let n = 0;
    try { n = (Number(store.get(STORE_KEYS.visits, 0)) || 0) + 1; store.set(STORE_KEYS.visits, n); } catch { return false; }
    return n % SHARE_AGAIN_EVERY === 0;
  }

  let inputP = null;
  const preloadInput = () => (inputP ||= import('../hushfold/input-overlay.js').then((m) => { inputMod = m; m.loadInputModules?.().catch(() => {}); return m; }));
  /** Opens inside the tap (the iPhone keyboard needs a real gesture), so the module is preloaded. */
  function openTell() {
    if (overlay || S.left || S.crisis) return;
    if (!inputMod) { preloadInput().then(() => { if (!S.left && !overlay) openTellNow(); }); return; }
    openTellNow();
  }
  function openTellNow() {
    // (askall-angle item 2, r2-angle item 2) after any answer the Tell opens empty: sending those words again is never one tap
    // away (and is asked again); only after the question was let go (no answer, Back) are the words kept for them
    const prefill = S.keepWords ? S.text : '';
    subs?.clear({ keepHeld: true });
    subs?.suspend();
    S.phase = 'typing';
    // after something heavy Zuzu listens with its attentive face
    if (S.level !== 'none') careFace(); else zt?.setStage('listening');
    root.classList.add('hf-typing');
    overlay = inputMod.openInput({
      app, root, prompt: ARRIVAL.prompt,
      mallow: { id: 'zuzu', name: ZUZU.name, glow: ZUZU.colours.glow },
      emotion: S.emotion, intention: S.intention, hasPlan: true, text: prefill,
      // Another Angle never takes photos; with sharing on, the note says where the words go (not "on this phone")
      photos: false, privacyNote: serverMode() ? SERVER_CLAUSE : null,
      // its support sheets (urgent on crisis words, the Support chip) and the A–Z list are layers of the scene,
      // so Back closes them before the overlay beneath
      support: (o) => openSupportSheet(o), trackSheet: (sh) => trackSheet(sh),
      // something heavy earlier in this visit: the overlay's Support chip is there from the start
      heavy: S.level !== 'none',
      face: (f) => { if (S.level === 'none' && !S.heavyDraft) zt?.setEmotion(f, 0.6, { quiet: true }); },
      onLayout: () => layout(),
      // the level is the scene's the moment it is seen, whether or not anything is sent
      onSafety: (r) => noteSafety(r),
      onSubmit: (r) => { afterTell(r); },
      onClose: (reason, meta = {}) => {
        // (what was typed, sent or not: read before the overlay goes)
        const typed = String(overlay?.text ?? '');
        overlay = null;
        clearTimeout(draftT); draftT = 0;
        const t = layer.overlay; layer.overlay = 0; if (t) app.popLayer?.(t);
        root.classList.remove('hf-typing');
        if (S.left) return;
        noteSafety(meta.safety);
        supportObs?.disconnect(); supportObs = null;
        subs?.unsuspend();
        if (reason !== 'submit') {
          // death talk that wants to follow the one who died, typed and closed: care, as sending it would be
          readDraft(typed);
          // crisis or care typed and closed without sending: exactly what sending them would have done (nothing is sent)
          if (S.level === 'crisis') crisisMode({ sheetShown: !!meta.supportShown });
          else if (S.level === 'care') careMode();
          else if (S.level === 'concern') concernNote();
          // death talk typed and closed: a quiet word, support close, never a playful line (nothing is sent)
          else if (gentleRoute(typed)) gentleNote();
          else { S.phase = 'invite'; if (S.noPlay) careFace(); else zt?.setStage('curious'); dockShow({ tell: true }); }
        }
        layout();
      },
    });
    layer.overlay = app.pushLayer?.() || 0;
    // the draft is read while typing too (as the overlay reads crisis and care): an escalation is care the moment it
    // is seen, and death talk turns Zuzu's face attentive
    const ta = overlay?.el?.querySelector?.('textarea');
    ta?.addEventListener('input', () => { clearTimeout(draftT); draftT = setTimeout(() => { draftT = 0; if (overlay) readDraft(overlay.text); }, DRAFT_MS); });
    if (prefill) readDraft(prefill);
    dockShow({});
    layout();
  }
  let draftT = 0;
  /**
   * Words seen while typing, on close, or sent: death talk that wants to follow the one who died raises the visit to
   * care (and stays: rewording never undoes it); death talk or any bag word ends the playful lines for the visit.
   */
  function readDraft(text) {
    const t = String(text ?? '');
    if (S.left || !hasWords(t)) return;
    if (deathEscalation(t)) noteFollow();
    // (r3-esc) a suicide named, nothing more: care too, said gently (nothing sent)
    else if (suicideDeath(t)) noteSuicide();
    // (final round 6) a note's shape or a wish to die with no death named (grief.js noteShape): care, the follow lines
    if (!S.follow && noteShape(t)) noteFollow();
    if (gentleRoute(t) || bagWords(t)) {
      S.noPlay = true;
      if (!S.heavyDraft) { S.heavyDraft = true; careFace(); }
    }
  }
  /**
   * The lines for the server's care answer: a wish to follow → SAFETY.follow; beside a bag word, a loss shape (lossNear,
   * strongLoss) or death talk → SAFETY.careGentle ("That sounds like a lot to carry."), never "shouldn't have happened";
   * otherwise SAFETY.care (review r11).
   */
  function serverCareLines() {
    if (S.follow) return SAFETY.follow;
    return S.lossSaid || gentleRoute(S.text) || bagWords(S.text) || lossRoute(S.text, { emotion: S.emotion }) ? SAFETY.careGentle : SAFETY.care;
  }
  /** Death talk that wants to follow the one who died, seen: care for the rest of the visit (grief.js deathEscalation). */
  function noteFollow() {
    S.follow = true;
    noteSafety({ level: 'care', category: 'death-follow' });
    keepTypingSupport();
  }
  /**
   * (r3-esc) A suicide named about anyone (grief.js suicideDeath), seen: care for the rest of the visit, said gently and assuming
   * nothing (SAFETY.careGentle), nothing sent. A suicide bereavement is a known risk, and a calm "support is here" costs nothing.
   */
  function noteSuicide() {
    S.suicide = true;
    noteSafety({ level: 'care', category: 'suicide-loss' });
    keepTypingSupport();
  }
  /**
   * While typing, an escalation this file reads (not the lexicon's) still shows the overlay's Support chip, as the
   * lexicon's care does (review r9): the chip is kept visible while the overlay re-reads the words.
   */
  let supportObs = null;
  function keepTypingSupport() {
    const btn = overlay?.el?.querySelector?.('button.support');
    if (!btn) return;
    btn.hidden = false;
    supportObs?.disconnect();
    if (typeof MutationObserver !== 'function') return;
    supportObs = new MutationObserver(() => { if (btn.hidden && S.level !== 'none') btn.hidden = false; });
    supportObs.observe(btn, { attributes: true, attributeFilter: ['hidden'] });
  }

  async function afterTell({ text, emotion, intention, input = null, reading = null, safety: seen = null }) {
    S.text = String(text || '').trim();
    // (r2-angle item 2) a new Tell: its words are only kept for the next one if its question is let go
    S.keepWords = false;
    S.emotion = emotion || null;
    // how the Thought Mallow looks (only its look; nothing is sent): the feeling they chose; else a reading of the
    // words only when it is sure and troubled; else the kind of thought it is (fair anger looks hot, replaying busy)
    S.look = firstLook({ emotion, input, reading, text: S.text });
    S.intention = intention || null;
    S.shown = []; S.used = []; S.kept = false; S.explored = 0;
    // the app's own safety check first, always (never dependent on the server); and the visit's level
    // counts, not only the words sent (crisis or care typed earlier and reworded before Send still means no angle)
    // (care seen earlier in the visit, the lexicon's or an escalation typed and reworded before Send, still holds)
    // (final) a wish to follow someone who died, or a suicide named, read first: when the lexicon's care (violence, abuse…) is
    // what routes, careMode still speaks with the follow / gentle lines (it reads S.follow / S.suicide); the lexicon's category stands
    // ((final round 6) a note's shape with no death named, grief.js noteShape, speaks with the follow lines too)
    if (noteShape(S.text)) S.follow = true;
    if (deathEscalation(S.text)) S.follow = true; else if (suicideDeath(S.text)) S.suicide = true;
    noteSafety(seen);
    noteSafety(checkText(S.text));
    if (S.level === 'crisis') { crisisMode(); return; }
    if (S.level === 'care') { careMode(); return; }
    // death talk that wants to be with, join or follow the one who died (grief.js, never the safety lexicon):
    // the care path, nothing sent, no game (and care for the rest of the visit)
    if (deathEscalation(S.text)) { noteFollow(); careMode({ lines: SAFETY.follow }); return; }
    // (final round 6) a goodbye note or a wish to die with NO death named (grief.js noteShape: "by the time you read this I'll be
    // gone", "this is my goodbye", "i wnat to dei"): the same care, nothing sent, never the question
    if (noteShape(S.text)) { noteFollow(); careMode({ lines: SAFETY.follow }); return; }
    // (r3-esc) a suicide named, whatever the clause: care, said gently, nothing sent (never the question, never the server)
    if (suicideDeath(S.text)) { noteSuicide(); careMode({ lines: SAFETY.careGentle }); return; }
    // death talk or any word of the backstop's bag: no playful line for the rest of the visit
    readDraft(S.text);
    if (S.level === 'concern') S.keepSupport = true;
    // (r2-angle item 7) only a grief-family feeling chosen, no words: the gentle path, as on the main screen (nothing to send)
    if ((!S.text || !hasWords(S.text)) && griefFeeling(S.emotion)) { griefMode({ asked: true }); return; }
    if (!S.text || !hasWords(S.text)) { unclear(); return; }
    startAngle({ another: false });
  }

  function firstLook({ emotion = null, input = null, reading = null, text = '' } = {}) {
    if (emotion) return emotion;
    for (const e of [input?.emotions?.[0], reading?.emotions?.[0]]) {
      if (e && typeof e.id === 'string' && (e.confidence ?? 0) >= READING_SURE && familyOf(e.id) !== 'none') return e.id;
    }
    // a feeling said plainly looks like that feeling ("I feel so alone" is lonely, never "anxious")
    let f = null;
    try { f = feelingOf(text); } catch { f = null; }
    if (f && FEELING_LOOK[f.kind]) return FEELING_LOOK[f.kind];
    let p = null;
    try { p = candidatePatterns(text)[0] || null; } catch { p = null; }
    return PATTERN_LOOK[p] || 'anxiety';
  }
  /** The look for a played scene: their chosen feeling, else the scene's own (a server's reading), else the thought's so far. */
  function sceneLook(scene) {
    if (S.emotion) return S.emotion;
    const se = typeof scene?.emotion === 'string' ? scene.emotion.trim().toLowerCase() : '';
    if (se && familyOf(se) !== 'none' && scene.source === 'server') return se;
    return S.look || PATTERN_LOOK[scene?.reasoning_pattern] || 'anxiety';
  }

  /**
   * A safety level seen (while typing, on close, on send, or from the server). Raises the visit's level
   * only: once support has been needed it stays one tap away, the playful lines and the invitation go.
   */
  function noteSafety(r) {
    const lv = r?.level;
    if (!lv || !LEVELS.includes(lv) || worse(S.level, lv) === S.level) return;
    S.level = lv;
    S.category = r.category || null;
    S.keepSupport = true;
    if (lv === 'crisis') S.crisis = true;
    if (lv === 'care') S.care = true;
    // the Memory Garden offer or its installation stops at once (nothing more is saved, nothing plays)
    if (lv === 'crisis' || lv === 'care') keepCtl?.abort();
    supportPill.hidden = false;
    // a pending invitation or a playful choice goes (a held line stays); while typing nothing shows anyway
    if (!overlay) subs?.clear({ keepHeld: true });
    careFace();
    if (!overlay) layout();
  }
  function crisisMode({ sheetShown = false } = {}) {
    S.crisis = true; S.keepSupport = true; S.level = 'crisis'; S.phase = 'support';
    S.seq++;                               // whatever was waiting for an answer is over
    keepCtl?.abort();
    dropThought(); endMechanic(true); dismissCompanion();
    // openInput opens the urgent sheet as soon as it sees the words: never a second time straight after
    if (!sheetShown && !document.querySelector('#sheet-root .sheet.open') && now() - S.sheetAt > 60000) openSupportSheet({ urgent: true });
    careFace();
    dockShow({ finish: true });
    if (S.crisisSaid) return;              // said once a visit; the Support pill stays
    S.crisisSaid = true;
    subs?.clear();
    say(SAFETY.crisis, { hold: true, interrupt: true });
  }
  async function careMode({ lines = S.follow ? SAFETY.follow : S.suicide ? SAFETY.careGentle : SAFETY.care } = {}) {
    S.care = true; S.keepSupport = true; S.level = worse(S.level, 'care'); S.phase = 'support';
    S.seq++;
    keepCtl?.abort();
    dropThought(); endMechanic(true); dismissCompanion();
    careFace();
    dockShow({ finish: true });
    if (S.careSaid) return;
    S.careSaid = true;
    subs?.clear();
    await say(lines, { interrupt: true });
    if (S.left || S.phase !== 'support') return;
    // (review r9) the choice's "See support" carries support while it is up: never the dock's pill beside it
    dockShow({ finish: true, support: false });
    const v = await choose(SAFETY.careAsk, SAFETY.careOptions);
    if (S.left) return;
    dockShow({ finish: true });
    if (v === 'support') openSupportSheet();
  }
  /**
   * Death talk typed and closed without sending: support close for the visit, a quiet word once, never a playful
   * line or face (nothing is sent; the gentle path's own line, true whether or not anyone died).
   */
  function gentleNote() {
    S.grief = true; S.keepSupport = true; S.noPlay = true;
    S.phase = 'invite';
    careFace();
    dockShow({ tell: true });
    if (S.gentleSaid) return;
    S.gentleSaid = true;
    say(GRIEF.closed, { mallow: 'zuzu', interrupt: !subs?.holding });
  }
  /** Something heavy (not care or crisis) typed and closed without sending: support close, said once, quietly. */
  function concernNote() {
    S.phase = 'invite';
    careFace();
    dockShow({ tell: true });
    if (S.concernSaid) return;
    S.concernSaid = true;
    say(SAFETY.concern, { interrupt: !subs?.holding });
  }
  /**
   * The gentle path (death talk, grief.js; or a harm word no idiom explains, backstop.js): no Thought Mallow, no
   * mechanic, nothing playful, support one tap away, and no "another angle" or feedback to give. Zuzu answers
   * gently with the authored pair (lines.js GRIEF), which never assumes anyone died.
   * (Final round 5, structural) The gentle path stays on the phone: NOTHING is ever sent from here, whatever the words, with
   * sharing on or off (docs/integration/DECISIONS.md, defaults of 2026-10-14: "Another Angle after a death"; the model's own
   * gentle reply is switched off). `scene` is a server scene that already reads as grief, from words sent on the ordinary
   * path ("Another angle" chosen, and the server read a loss the app did not: serverLoss); its two lines are used only when
   * both acknowledge (griefLinesOk), never its mechanic. `asked` is kept for the callers' sake: it changes nothing now.
   */
  async function griefMode({ scene = null, asked = false, told = null } = {}) {
    // (wanting to follow the one who died is care, whichever way it got here: nothing more is sent)
    if (deathEscalation(S.text)) { noteFollow(); careMode({ lines: SAFETY.follow }); return; }
    // ((final round 6) a note's shape: the same care)
    if (noteShape(S.text)) { noteFollow(); careMode({ lines: SAFETY.follow }); return; }
    // (r3-esc) a suicide named, whatever the clause (r2-angle item 1 read only a first-person future beside it): never sent to
    // the server; care, said gently and assuming nothing
    if (suicideDeath(S.text)) { noteSuicide(); careMode({ lines: SAFETY.careGentle }); return; }
    const seq = ++S.seq;
    S.grief = true; S.keepSupport = true; S.noPlay = true; S.phase = 'support';
    S.beOnly = false;
    keepCtl?.abort();
    dropThought(); endMechanic(true); dismissCompanion();
    supportPill.hidden = false;
    careFace();
    // (while the choice below is up, its chips carry support and Finish: the dock never offers them twice)
    dockShow({ finish: true, tell: true });
    subs?.clear();
    // first, that they said it (never the lines about "another side")
    const heard = say(GRIEF.heard, { mallow: 'zuzu', interrupt: true });
    // (final round 5, structural) nothing is sent from the gentle path: no client call here, whatever the words (the app's own
    // check has run already, on the words as they were told)
    // only the two lines are used: the server's own mechanic never plays for a loss
    if (!scene) scene = gentleScene(S.text, { emotion: S.emotion, kind: told || (griefFeeling(S.emotion) ? 'grief' : null) });
    else scene = { ...scene, grief: true, mechanic: null };
    S.scene = scene;
    await heard;
    if (S.left || seq !== S.seq) return;
    await say(scene.subtitle_line_1, { mallow: 'zuzu' });
    if (S.left || seq !== S.seq) return;
    await sleep(rmOn() ? 400 : 1000);
    await say(scene.subtitle_line_2, { mallow: 'zuzu' });
    if (S.left || seq !== S.seq) return;
    dockShow({ tell: true, support: false });
    const v = await choose(GRIEF.ask, GRIEF.options, { mallow: 'zuzu' });
    if (S.left || seq !== S.seq) return;
    dockShow({ finish: true, tell: true });
    if (v === 'support') { openSupportSheet(); return; }
    if (v === 'finish') { finish(); return; }
    if (v === 'squeeze') {
      // Zuzu comes forward to be held (no playful face, no playful lines)
      S.phase = 'squeeze';
      later(() => layout(), 480);
      say(GRIEF.squeeze, { mallow: 'zuzu' });
    }
  }
  /** Something heavy seen in this visit, or beside these words: then (and only then) "See support" is offered after "Just be with it". */
  const heavySeen = () => S.level !== 'none' || S.keepSupport || S.care || S.crisis || S.heavyDraft || S.unsure || bagWords(S.text);
  /**
   * (r2-angle item 5) "Just be with it": a quiet path of its own, as the main screen's (its line: "Okay. Let's just be with it
   * for a while."). No Thought Mallow, no mechanic, nothing sent, nothing playful (noPlay). It is not the grief path: S.grief
   * and the visit's support stay as they were, so Finish says the ordinary goodbye (END.finish) and sends no safety level home,
   * and "See support" is offered only when something heavy was seen (heavySeen).
   */
  async function beWithIt() {
    const seq = ++S.seq;
    S.beOnly = true; S.noPlay = true; S.phase = 'support';
    keepCtl?.abort();
    dropThought(); endMechanic(true); dismissCompanion();
    careFace();
    dockShow({ finish: true, tell: true });
    subs?.clear();
    await say(BE_WITH.line, { mallow: 'zuzu', interrupt: true });
    if (S.left || seq !== S.seq) return;
    await sleep(rmOn() ? 400 : 900);
    await say(BE_WITH.second, { mallow: 'zuzu' });
    if (S.left || seq !== S.seq) return;
    dockShow({ tell: true, support: false });
    const opts = heavySeen() ? BE_WITH.optionsHeavy : BE_WITH.options;
    const v = await choose(BE_WITH.ask, opts, { mallow: 'zuzu' });
    if (S.left || seq !== S.seq) return;
    dockShow({ finish: true, tell: true });
    if (v === 'support') { openSupportSheet(); return; }
    if (v === 'finish') { finish(); return; }
    if (v === 'squeeze') {
      S.phase = 'squeeze';
      later(() => layout(), 480);
      say(BE_WITH.squeeze, { mallow: 'zuzu' });
    }
  }
  async function unclear() {
    S.phase = 'invite';
    // the choice carries "Tell Zuzu more": the dock's own Tell pill waits until it is answered
    dockShow({});
    const v = await choose(UNCLEAR.line, UNCLEAR.options.map((o) => (o.value === 'tell' ? { ...o, onPick: () => openTell() } : o)));
    if (S.left || S.phase !== 'invite') return;
    dockShow({ tell: true });
    if (v === 'squeeze') say(ARRIVAL.justSqueeze[0]);
  }

  /** The words → a Thought Mallow → (server or authored) scene → its mechanic. */
  async function startAngle({ another = false } = {}) {
    // death talk (any death or loss word, recall first), someone alive but going, a person beside a strong loss cue (as
    // on the main screen), or a grief-family feeling they chose: no Thought Mallow and no mechanic; with sharing on the
    // server still answers it, gently (griefMode)
    const route = lossRoute(S.text, { emotion: S.emotion });
    if (route === 'gentle') return griefMode();
    S.unsure = route === 'ask';
    // (owner decision 'Ask before every world', 14 Oct 2026) otherwise Zuzu asks one gentle choice first, before anything is
    // sent, framed or played: "Shall we look at this from another angle, or just be with it?" (angle-first.js; with its switch
    // ASK_BEFORE_ANGLE off, the 'Ask when unsure' check-in for unsure words instead). Only the gentle answers are kept for these
    // words (r2-angle item 2): every new Tell is asked again, the same words included, and only "Show me another angle", inside
    // an angle they chose, plays without asking. "Yes, it is" (the check-in) keeps those words on the gentle path; "Just be
    // with it" is asked again too (angle-first.js BE_ASKS_AGAIN, as on the main screen)
    const key = answerKey(S.text);
    const step = firstStep(S.text, { emotion: S.emotion, another, said: S.answers.get(key) || null });
    if (step === 'be') return beWithIt();
    if (step === 'told') return griefMode({ told: 'loss' });
    if (step === 'choice' || step === 'check-in') {
      const v = await askFirst(step);
      if (S.left) return;
      if (v) S.keepWords = false;
      // (r2-angle item 5) "Just be with it": a quiet path of its own, nothing sent; never the grief path's support or goodbye
      if (v === 'be') { S.answers.set(key, 'be'); return beWithIt(); }
      if (v === 'yes') { S.answers.set(key, 'yes'); S.lossSaid = true; S.noPlay = true; return griefMode({ told: 'loss' }); }
      if (v !== 'angle' && v !== 'else') { quietAfterAsk(); return; }
    }
    const seq = ++S.seq;
    S.phase = 'waiting';
    dockShow({});
    if (!another || !thought) spawnThought();
    zt?.setStage('curious');
    // a feeling said plainly (or words beside a harm word) gets Zuzu's attentive face, never a playful one
    let feel = null;
    try { feel = feelingOf(S.text) || (framingAllowed(S.text) ? null : { kind: 'low' }); } catch { feel = null; }
    // (askall-angle) words with a softer loss cue keep Zuzu attentive, whatever they chose
    if (S.unsure) feel ||= { kind: 'low' };
    if (feel) careFace(); else zt?.setEmotion({ curious: 0.65, playful: 0.35 }, 0.7, { quiet: true });
    const started = now();
    waitingLines(seq);
    // the request (only with consent) and a cinematic minimum beat, together
    const exclude = S.shown.map((s) => s.reasoning_pattern);
    // (final round 5) unsure words (lossRoute 'ask') with the safety net's words (grief.js keepLocal: a death, ending, absence or
    // afterlife word in a first-person clause, with or without a recognised death): Zuzu's own authored angle, nothing sent
    S.local = S.unsure && keepLocal(S.text);
    // (a stalled server never keeps the person waiting long: past the budget, Zuzu's own angle plays)
    const req = serverMode() && !S.local
      ? Promise.race([
        client.angle({ text: S.text, emotion: S.emotion, intention: S.intention, previous: S.shown }).catch(() => ({ status: 'error', reason: 'exception' })),
        sleep(devBudget || ANGLE_BUDGET_MS).then(() => ({ status: 'error', reason: 'timeout' })),
      ])
      : Promise.resolve(null);
    const res = await req;
    if (S.left || seq !== S.seq) return;
    let scene = null, offline = !serverMode(), hint = null, invited = false;
    if (res) {
      if (res.keepSupportClose) { S.keepSupport = true; supportPill.hidden = false; }
      if (res.status === 'crisis') { crisisMode(); return; }
      // (review r11) the server's care beside a bag word or a loss shape is said gently, assuming nothing (careGentle)
      if (res.status === 'care') { careMode({ lines: serverCareLines() }); return; }
      if (res.status === 'unclear') { subs?.clear(); dropThought(); unclear(); return; }
      // the server read a loss the words didn't name the app's way ("since Mum passed"): gently, no mechanic, its two
      // lines only when both acknowledge (grief.js griefLinesOk), else the authored gentle lines
      if (res.status === 'ok' && res.scene && serverLoss(res.scene, S.text, { heavy: heavyWords })) { griefMode({ scene: griefLinesOk(res.scene) ? res.scene : null, asked: true }); return; }
      if (res.status === 'ok' && res.scene && !exclude.includes(res.scene.reasoning_pattern)) {
        // a feeling said plainly is never pulled apart into "what happened" and "what your mind added", whoever
        // wrote it; words without an interpretive marker, or beside a bag word, never get the framing either (the
        // gate: a kind step instead, with the authored kind lines when the server's would frame them)
        scene = guessGuard(feelingGuard(res.scene, S.text, { emotion: S.emotion, exclude }), S.text, { emotion: S.emotion, exclude });
        if (scene.exhausted) { await noMoreAngles(); return; }
      } else { offline = true; hint = res.hint?.reasoning_pattern || null; invited = res.reason === 'invite'; }
    }
    if (!scene) {
      // never "safe" by default: a fallback, a non-200, a timeout or an error runs the app's own check again
      const again = checkText(S.text);
      if (again.level === 'crisis') { crisisMode(); return; }
      if (again.level === 'care') { careMode(); return; }
      const avoid = [...exclude, ...(another ? [] : lessWanted(store).filter((p) => p !== hint))];
      scene = authoredScene(S.text, { emotion: S.emotion, exclude: avoid, usedAngles: S.used, hint });
      // the kinds they found less useful are only skipped while others still fit
      if (scene.exhausted && avoid.length > exclude.length) scene = authoredScene(S.text, { emotion: S.emotion, exclude, usedAngles: S.used, hint });
      // every angle that fits these words has been shown: Zuzu says so, and never plays one that doesn't fit
      if (scene.exhausted || exclude.includes(scene.reasoning_pattern)) { await noMoreAngles(); return; }
    }
    prefetchMechanic(scene.mechanic);
    const minBeat = rmOn() ? 1400 : (another ? 2200 : 3200);
    const left = minBeat - (now() - started);
    if (left > 0) await sleep(left);
    if (S.left || seq !== S.seq) return;
    // open to invited testers only (and no code yet): said once a visit, then Zuzu's own angle (never the offline note too)
    if (invited && !S.inviteSaid) { S.inviteSaid = true; S.offlineSaid = true; scene.inviteNote = true; }
    else if (offline && serverMode() && !S.offlineSaid) { S.offlineSaid = true; scene.offlineNote = true; }
    await playScene(scene, seq);
  }
  /**
   * The one question before anything is sent, framed or played, with Zuzu's attentive face: no Thought Mallow, nothing
   * playful, no waiting line ("There's another side to this…" only once they chose an angle). The chips are real buttons in
   * the subtitles' row (announced with the line), Back lets it go.
   *   'choice'   (owner decision 'Ask before every world', 14 Oct 2026) "Shall we look at this from another angle, or just be
   *              with it?" → 'angle' (primary) | 'be' | null
   *   'check-in' (owner decision 'Ask when unsure'; only with ASK_BEFORE_ANGLE off) "Is this about losing someone?" →
   *              'yes' | 'else' | null
   * (null: no answer within its `ms`, Back, or a new Tell.)
   */
  // (r2-angle item 7, a coordinator default) the two answers carry equal weight: the same chip style, "Another angle" first
  const FIRST_QUESTION = {
    choice: { ask: ANGLE_CHOICE.ask, ms: ANGLE_CHOICE.ms, options: [{ label: ANGLE_CHOICE.angle, value: 'angle' }, { label: ANGLE_CHOICE.be, value: 'be' }] },
    'check-in': { ask: LOSS_CHECK.ask, ms: LOSS_CHECK.ms, options: [{ label: LOSS_CHECK.yes, value: 'yes' }, { label: LOSS_CHECK.no, value: 'else' }] },
  };
  async function askFirst(kind) {
    const q = FIRST_QUESTION[kind];
    const seq = ++S.seq;
    S.phase = 'asking';
    // (r2-angle item 6) while it is up, and if it is let go, the words are kept for the next Tell
    S.keepWords = true;
    careFace();
    dockShow({});
    layer.lossCheck = app.pushLayer?.() || 0;
    // (r2-angle item 6) about 45 s, never counted while the page is hidden (subtitles' own timeout is not used)
    stopClock?.();
    const stop = (stopClock = questionClock(q.ms, () => { if (seq === S.seq) subs?.drop((o) => o.lossCheck); }));
    try {
      const p = choose(q.ask, q.options, { mallow: 'zuzu', transient: true, lossCheck: true, interrupt: true });
      focusFirstChoice();
      const v = await p;
      return seq === S.seq ? v : null;
    } finally {
      stop();
      if (stopClock === stop) stopClock = null;
      const t = layer.lossCheck; layer.lossCheck = 0; if (t) app.popLayer?.(t);
    }
  }
  /** The question's clock (angle-first.js questionClock: never counted while the page is hidden); stopped on leave. */
  let stopClock = null;
  /** (r2-angle item 6) Focus moves to the first answer when the question appears (never out of a text field). */
  function focusFirstChoice() {
    const go = () => {
      if (S.left || S.phase !== 'asking' || overlay) return;
      const a = document.activeElement;
      if (a && (/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) || a.isContentEditable)) return;
      subs?.el?.querySelector?.('.hf-chips:not([hidden]) button')?.focus?.({ preventScroll: true });
    };
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(go); else go();
  }
  /**
   * The question let go (no answer, Back, a new Tell): Zuzu stays here quietly, Tell close by (with the words kept), nothing
   * sent or made; (r2-angle item 3) and the rest of the visit stays quiet, as the main screen's softVisit: squeezing never
   * brings the playful lines back after words the person never chose to play with.
   */
  function quietAfterAsk() {
    S.noPlay = true;
    if (S.left || overlay || S.phase !== 'asking') return;
    S.phase = 'invite';
    careFace();
    dockShow({ tell: true });
    layout();
  }
  async function waitingLines(seq) {
    // Zuzu's line first, then (early, once) what is happening, in the Hushfold's own words; then the rest in turn
    let i = 0, w = 0, n = 0;
    // a feeling said plainly (or words beside a harm word) is never met with "What else could be true?"
    let feel = null;
    try { feel = feelingOf(S.text) || (framingAllowed(S.text) ? null : { kind: 'low' }); } catch { feel = null; }
    if (S.unsure) feel ||= { kind: 'low' };
    // (review r9) the server may still read a loss
    if (serverMode()) feel ||= { kind: 'low' };
    const lines = feel ? FEELING.waiting : WAITING, long = feel ? FEELING.waitingLong : WAITING_LONG;
    while (!S.left && seq === S.seq && S.phase === 'waiting') {
      const narrate = n === 1 || (n > 2 && n % 3 === 0);
      if (narrate) await say(pick(long, i++), { who: null, colour: null });
      else await say(pick(lines, w++), { mallow: 'zuzu' });
      n++;
      if (S.phase !== 'waiting' || seq !== S.seq) break;
      await sleep(rmOn() ? 300 : 700);
    }
  }

  async function playScene(scene, seq) {
    // the gate, where every scene plays (authored, server, the lab's): without an interpretive marker of their own,
    // or beside a bag word, never the fact-vs-guess framing (a kind step with its own lines instead); with one, only
    // the clause that carries it is the guess
    scene = guessGuard(scene, S.text, { emotion: S.emotion });
    S.scene = scene;
    S.shown.push(scene);
    if (scene.angle_id) S.used.push(scene.angle_id);
    if (scene.alt_id) S.used.push(scene.alt_id);
    S.phase = 'playing';
    subs?.clear();
    let mod;
    // (a mechanic that can't load hands over to one that fits the scene: a feeling never falls back to pull_apart)
    const gentle = !!scene.feeling || !framingAllowed(S.text);
    const fallback = gentle ? 'assemble_step' : 'pull_apart';
    try { mod = await loadMechanic(scene.mechanic); } catch (e) { console.warn('[another angle] mechanic', e?.message); mod = await loadMechanic(fallback); scene.mechanic = fallback; }
    if (S.left || seq !== S.seq) return;
    const L = mechanicLines(scene.mechanic, scene);
    const from = thought ? { x: thought.x, y: thought.y, r: thought.r } : null;
    if (from) S.lastThought = { ...from };
    // the Thought Mallow hands over to the mechanic where it sits: the same living jelly takes over there (a
    // quick cross-fade; a longer one only when the mechanic draws the kit's own jelly instead)
    dropThought(rmOn() || W2 ? 120 : 420);
    const parts = sceneParts(S.text, scene);
    const look = sceneLook(scene);
    S.look = look;
    const [tl, td] = tintFor(look);
    const ctx = {
      g, area: () => area, from, scene, parts, lines: L, text: S.text, emotion: look, tags: makeTags(root, { bounds: () => area, announce: announceSoon }),
      reducedMotion: rmOn, lowStim: lowOn,
      // the person's Thought Mallow in the mechanic: the same living jelly (W2) they watched while Zuzu explored
      thought: (o = {}) => new ThoughtBody({ text: S.text, emotion: look, intensity: 0.7, light: tl, deep: td, reducedMotion: rmOn(), lowStim: lowOn(), rmFn: rmOn,
        // (the mechanic gives every touch its own haptic: the jelly adds none, so nothing buzzes twice)
        haptic: null, bounds: { left: area.x, top: area.y, right: area.x + area.w, bottom: area.y + area.h }, ...o }, W2),
      // something the mechanic changed that a screen reader should hear (a weight put down, a step made)
      say: (t) => announceSoon(t),
      hint: (line) => { if (line && !subs?.holding) say(line, { mallow: 'zuzu', interrupt: true }); },
      // a mechanic's own question (find_boundary): the chips are the way on, so the assist pill steps aside meanwhile
      choose: async (prompt, options) => {
        assistBtn.hidden = true; layout();
        try { return await choose(prompt, options, { mallow: scene.mallow_character }); } finally { if (mech && !mech.settled && S.phase === 'playing') { assistBtn.hidden = false; layout(); } }
      },
      haptic: (k) => app.haptic(k),
      fx: (name, o) => { try { app.audio.fx?.(name, o); } catch { /* sound is decoration */ } },
      // (its done line is said as a subtitle the moment it lands, and the subtitles are a live region: not twice)
      progress: () => {},
      kick: () => {},
    };
    endMechanic(true);
    // the band its own lines need (the longest of them), and the dock's pill, before the mechanic sizes itself
    S.band = measureBand([L.hint, L.hint2, L.hint3, L.slow, L.done]);
    dockShow({ assist: L.assist });
    // a mechanic that throws (mounting or in a frame) never leaves the person stuck
    let failed = null;
    const failP = new Promise((r) => { failed = r; });
    failNote = (id) => failed(id);
    try {
      mech = mod.mount(ctx);
      mechId = scene.mechanic;
      mech.tags = ctx.tags;
    } catch (e) { console.warn('[another angle] mechanic mount', e?.message); ctx.tags.clear(); mech = null; failed(scene.mechanic); }
    zt?.lookAt(0, -0.8);
    if (mech) {
      if (scene.inviteNote) say(INVITE.line, { who: null, colour: null });
      say(L.hint, { mallow: 'zuzu' });
      if (scene.offlineNote) say('Zuzu’s own angle this time, worked out on this phone.', { who: null, colour: null });
    }
    const result = mech ? await Promise.race([mech.done, failP]) : await failP;
    failNote = null;
    if (S.left || seq !== S.seq) return;
    if (!mech || mech.failed) {
      // pull_apart once (every scene has a fact and an assumption; a feeling's is assemble_step), else straight to the perspective
      endMechanic(true);
      S.shown.pop();
      if (scene.mechanic !== fallback) { scene.mechanic = fallback; return playScene(scene, seq); }
      S.shown.push(scene);
      return reveal(scene, seq, { played: false });
    }
    void result;
    await reveal(scene, seq);
  }
  /** The played scene steps back (dimmed, its labels hidden) so a perspective reads clearly over it. */
  function recede(on) {
    root.classList.toggle('bx-recede', !!on);
    if (canvas) { canvas.style.transition = `opacity ${rmOn() ? 160 : 700}ms ease`; canvas.style.opacity = on ? '0.3' : '1'; }
  }
  /** Ends the mechanic; unless `now_`, the stage fades out first (no abrupt cut). */
  function endMechanic(now_ = false) {
    if (!mech) return Promise.resolve();
    const m = mech;
    const kill = () => { if (mech === m) { mech = null; mechId = null; } try { m.destroy(); } catch { /* ignore */ } };
    if (now_ || !canvas) { kill(); recede(false); return Promise.resolve(); }
    for (const el of root.querySelectorAll('.bx-tag')) el.style.opacity = '0';
    canvas.style.transition = `opacity ${rmOn() ? 160 : 420}ms ease`;
    canvas.style.opacity = '0';
    return sleep(rmOn() ? 170 : 440).then(() => { kill(); recede(false); if (canvas) canvas.style.opacity = '1'; });
  }

  async function reveal(scene, seq, { played = true } = {}) {
    S.phase = 'reveal';
    dockShow({});
    const L = mechanicLines(scene.mechanic, scene);
    subs.clear();
    if (played) await say(L.done, { mallow: 'zuzu' });
    if (S.left || seq !== S.seq) return;
    recede(true);
    const lead = scene.mallow_character || 'zuzu';
    if (lead !== 'zuzu') { await bringCompanion(lead); await sleep(rmOn() ? 200 : 700); }
    if (S.left || seq !== S.seq) return;
    // (review r9) beside a bag word or after something heavy: Zuzu's attentive face, never the transforming grin
    const quiet = S.noPlay || S.level !== 'none';
    if (quiet) careFace(); else zt?.setStage('transforming');
    ct?.setStage('curious');
    await subs.say({ text: scene.feeling ? FEELING.title : 'A new perspective', kind: 'title' }, {});
    if (S.left || seq !== S.seq) return;
    await say(scene.subtitle_line_1, { mallow: lead });
    if (S.left || seq !== S.seq) return;
    await sleep(rmOn() ? 400 : 1000);          // a natural pause between the two lines
    await say(scene.subtitle_line_2, { mallow: lead, hold: true });
    if (S.left || seq !== S.seq) return;
    if (quiet) careFace(); else zt?.setStage('neutral');
    ct?.setStage('neutral');
    // the played scene has said what it had to: it fades away, so what follows reads on the open sky
    await endMechanic();
    if (S.left || seq !== S.seq) return;
    await explore(scene, seq);
  }

  function exploreLine(scene, id) {
    const p = EXPLORE.find((x) => x.id === id);
    if (!p) return null;
    if (p.field === 'friend') {
      // (without a marker of their own, only a friend line that frames nothing: fair anger's own, else a feeling's)
      const own = FRIEND_LINES[scene.reasoning_pattern] || FRIEND_LINES.fact_vs_assumption;
      return scene.feeling || (!framingAllowed(S.text) && framesAsGuess(own)) ? FEELING.friend : own;
    }
    const v = scene[p.field];
    if (p.field === 'known_fact') return [v || EXPLORE_EMPTY.known_fact, scene.possible_assumption].filter(Boolean);
    return v || EXPLORE_EMPTY[p.field];
  }
  async function explore(scene, seq) {
    S.phase = 'explore';
    const lead = scene.mallow_character || 'zuzu';
    // a feeling, or words beside a death or harm word, are never fact-checked: no "What do you actually know?",
    // no "another explanation", never "Want to test it?"
    const gentle = !!scene.feeling || !framingAllowed(S.text);
    let remaining = gentle ? EXPLORE.filter((p) => FEELING.explore.includes(p.id)) : EXPLORE.slice();
    let first = true;
    while (remaining.length && !S.left && seq === S.seq) {
      const opts = remaining.slice(0, 2).map((p) => ({ label: p.label, value: p.id }));
      opts.push({ label: 'That’s enough', value: 'enough' });
      // (a feeling is never something to "test")
      const v = await choose(gentle ? (first ? FEELING.exploreAsk : FEELING.exploreMore) : (first ? EXPLORE_ASK : EXPLORE_MORE), opts, { mallow: 'zuzu' });
      first = false;
      if (S.left || seq !== S.seq) return;
      if (v == null || v === 'enough') break;
      remaining = remaining.filter((p) => p.id !== v);
      S.explored++;
      await say(exploreLine(scene, v), { mallow: lead });
    }
    if (S.left || seq !== S.seq) return;
    await feedback(scene, seq);
  }

  function sendFeedback(rating) {
    const scene = S.scene;
    if (!scene) return;
    if (prefs.get('saveHistory') !== false) noteFeedback(store, scene.reasoning_pattern, rating);
    if (serverMode() && scene.source === 'server') client.feedback(rating, scene).catch(() => false);
  }
  async function feedback(scene, seq) {
    S.phase = 'feedback';
    const v = await choose(FEEDBACK.ask, FEEDBACK.options, { mallow: 'zuzu' });
    if (S.left || seq !== S.seq) return;
    if (v === 'helped') {
      sendFeedback(RATINGS.helped);
      zt?.react('nod');
      await say(FEEDBACK.helped, { mallow: 'zuzu' });
      if (S.left || seq !== S.seq) return;
      await keep();
      return endChoice(seq);
    }
    if (v === 'another') { sendFeedback(RATINGS.another); return anotherAngle(); }
    if (v === 'notRelevant') {
      sendFeedback(RATINGS.notRelevant);
      await say(FEEDBACK.notRelevant, { mallow: 'zuzu' });
      if (S.left || seq !== S.seq) return;
      const w = await choose(FEEDBACK.notRelevantAsk, FEEDBACK.notRelevantOptions, { mallow: 'zuzu' });
      if (w === 'another') return anotherAngle();
      return finish();
    }
    if (v === 'squeeze') { sendFeedback(RATINGS.squeeze); return squeezeMode(); }
    // dismissed (cleared): leave the person in peace, with the way out in reach
    dockShow({ finish: true, tell: true });
  }
  async function anotherAngle() {
    if (S.shown.length >= 4) return noMoreAngles();
    await say(pick(FEEDBACK.another, S.shown.length), { mallow: 'zuzu' });
    if (S.left) return;
    dismissCompanion();
    await endMechanic();
    if (S.left) return;
    spawnThought();
    startAngle({ another: true });
  }
  async function noMoreAngles() {
    dropThought();
    await say(FEEDBACK.noMore, { mallow: 'zuzu' });
    return endChoice(S.seq);
  }
  function squeezeMode() {
    S.phase = 'squeeze';
    subs?.clear();
    endMechanic(); dismissCompanion(); dropThought();
    later(() => layout(), 480);
    // (never the playful face beside a bag word or after something heavy)
    if (S.noPlay || S.level !== 'none') careFace(); else zt?.setStage('playful');
    dockShow({ tell: true, finish: true });
    say(FEEDBACK.squeeze, { mallow: 'zuzu' });
  }

  // the installation pauses the subtitles while it plays and resumes only what it paused itself (never the
  // person's own ⏸), the same adapter as the Hushfold shell's installSubtitles
  let subsHeld = false;
  const installSubtitles = {
    pause() { if (!subs) return; subsHeld = !subs.paused; subs.clear({ keepHeld: true }); subs.pause(); },
    resume() { if (subsHeld) { subsHeld = false; subs?.resume(); } },
  };
  /** The keep in progress: crisis or care seen meanwhile (noteSafety), or leaving, stops it. */
  let keepCtl = null;
  async function keep() {
    const ctl = typeof AbortController === 'function' ? new AbortController() : null;
    keepCtl = ctl;
    try {
      const install = await import('../hushfold/garden-install.js');
      if (S.left || ctl?.signal.aborted) return;
      const origin = () => zAd?.bodyRect?.();
      const face = () => { try { return install.mallowFaceRect?.(zAd?.bodyRect?.(), ZUZU) || null; } catch { return null; } };
      // the install owns the stage: no line, and no subtitle pill floating on its own
      subs?.clear({ keepHeld: false });
      root.classList.add('bx-installing');
      const r = await install.keepDiscovery({
        app, store, skillId: 'another-angle', worldId: 'another-angle', mallow: 'zuzu', origin, face,
        // Zuzu (and the scene's Mallow) stay clear: the garden's chip never sits on them
        avoid: () => [rectOf(zAd), rectOf(compAd), ...(mech?.avoid?.() || [])].filter(Boolean),
        subtitles: installSubtitles, reducedMotion: rmOn(), lowStim: lowOn(), signal: ctl?.signal,
        // which kind of angle it was (no words): for the garden's own copy per kind, when it has it
        evidence: { reasoning_pattern: S.scene?.reasoning_pattern || null, interaction_type: S.scene?.interaction_type || null },
      });
      if (r?.kept || r?.already) S.kept = true;
    } catch (e) { console.info('[another angle] garden unavailable', e?.message); } finally {
      if (keepCtl === ctl) keepCtl = null;
      installSubtitles.resume();
      root.classList.remove('bx-installing');
    }
  }
  async function endChoice(seq) {
    if (S.left || seq !== S.seq) return;
    S.phase = 'end';
    dockShow({});
    const opts = END.options.filter((o) => o.value !== 'keep' || !S.kept);
    const v = await choose(END.ask, opts, { mallow: 'zuzu' });
    if (S.left || seq !== S.seq) return;
    if (v === 'keep') { await keep(); return endChoice(seq); }
    if (v === 'continue') return continueFlow();
    if (v === 'finish') return finish();
    dockShow({ finish: true, tell: true });
  }
  async function continueFlow() {
    await say(END.continue, { mallow: 'zuzu' });
    if (S.left) return;
    let worldId = null;
    try {
      const [{ registry }, { flowEmotion }, em] = await Promise.all([import('../hushfold/flow/registry.js'), import('../hushfold/lines.js'), import('../data/emotions.js')]);
      const fe = flowEmotion(S.emotion, em.getEmotion(S.emotion)?.family) || null;
      worldId = registry.select({ emotion: fe, intention: S.intention && S.intention !== 'play' ? S.intention : 'calm' })?.id || null;
    } catch { worldId = null; }
    // the feeling and intention carry on into Hushflow (and the words, in memory only, if the Hushfold takes them);
    // where the person's Thought Mallow last sat and how it looked, for the Hushfold to use later (owner P-15; never sent)
    const lt = S.lastThought;
    const thoughtAt = lt && [lt.x, lt.y, lt.r].every(Number.isFinite)
      ? { x: Math.round(lt.x), y: Math.round(lt.y), r: Math.round(lt.r), emotion: S.look || S.emotion || null } : null;
    const carry = { emotion: S.emotion || null, intention: S.intention || null, text: S.text || '', thought: thoughtAt };
    app.go('home', worldId ? { flow: { worldId, ...carry } } : { carry });
  }
  async function finish() {
    if (S.phase === 'finishing') return;
    S.phase = 'finishing';
    S.seq++;
    subs?.clear();
    // (r2-angle item 5: angle-first.js goodbye) only crisis, care or the grief path are heavy; "Just be with it" alone is not
    const bye = goodbye(S);
    const heavy = bye.heavy;
    dockShow({});
    if (heavy || S.noPlay) careFace(); else zt?.setStage('comforting');
    if (!rmOn() && !heavy && !S.noPlay) zt?.react('hop');
    const lines = bye.lines === 'safety' ? SAFETY.finish : END.finish;
    await say(lines[0], { mallow: 'zuzu' });
    if (S.left) return;
    await say(lines[1], { mallow: 'zuzu' });
    if (S.left) return;
    // the Hushfold keeps support close after something heavy (it reads params.safety): after the gentle path too, so
    // "Support is one tap away" holds there (its Support pill, the attentive face, no playful opening); never after "Just be
    // with it" alone (its next Tell is asked the play question, as any)
    app.go('home', bye.params);
  }

  // ------------------------------------------------------- the view --
  const view = {
    async enter() {
      document.body.classList.add('hf-active');
      setLowStim(lowOn());
      world.dim(false);
      world.showMallow(false);
      world.setRealm('spiral-observatory', { crossfadeMs: 900 });
      canvas = h('canvas', { class: 'hf-stage', 'aria-hidden': 'true' });
      world.fx.replaceChildren(canvas);
      world.fx.classList.add('live');
      g = canvas.getContext('2d');
      const [subMod, routerMod, stageMod, rig] = await Promise.all([
        import('../hushfold/subtitles.js'), import('../hushfold/input-router.js'), import('../hushfold/stage.js'), import('../mallows/rig.js')]);
      if (S.left) return;
      subs = subMod.createSubtitles({
        root, prefs, reducedMotion: rmOn,
        bounds: () => ({ top: topBottom() + 8, bottom: Math.min(dockTop(), (rectOf(zAd)?.top ?? innerHeight) + 4) - 10 }),
        avoid: subsAvoid,
        backdrop: () => [...document.querySelectorAll('#world canvas'), canvas].filter(Boolean),
      });
      // Zuzu: the living, squeezable MallowTouch Mallow (the approved rig if WebGL/MallowTouch is unavailable)
      touchBox = h('div', { class: 'hf-touch' });
      world.fx.before(touchBox);
      try {
        zt = await makeTouch('zuzu', touchBox);
        if (S.left) { zt.destroy(); return; }
        zAd = stageMod.createStageMallow(world, { touch: zt });
      } catch (e) {
        console.info('[another angle] MallowTouch unavailable; using the rig', e?.message);
        zt = null; touchBox.remove(); touchBox = null;
        world.showMallow(true);
        zAd = stageMod.createStageMallow(world, {});
        const r = await world.setMallow('zuzu', { entrance: true, interactive: true });
        zAd.attach(r);
        zAd.fit = ({ cx, cy, size }) => { const lw = size / 0.64; world.setLayerSize({ w: lw, h: lw * 1.1 }); world.place({ x: (cx / innerWidth) * 100, y: ((cy - 0.098 * lw) / innerHeight) * 100, scale: 1 }); };
      }
      zAd.on('touch', onZuzuTouch);
      // when a support sheet last opened (so crisis support is offered once, not twice in a row)
      const sheets = document.getElementById('sheet-root');
      if (sheets && typeof MutationObserver === 'function') {
        sheetObs = new MutationObserver(() => { if (sheets.querySelector('.sheet')) S.sheetAt = now(); });
        sheetObs.observe(sheets, { childList: true });
      }
      try {
        const tm = await import('../mallows/thought/index.js');
        if (S.left) return;
        try { const tr = await import('../mallows/thought/render.js'); if (typeof tm.createThought === 'function' && typeof tr.drawThought === 'function') W2 = { create: tm.createThought, draw: tr.drawThought, style: tm.styleFor }; } catch { W2 = null; }
        if (S.left) return;
        TL = new tm.ThoughtLayer({
          ctx2d: g, tagRoot: root, reducedMotion: rmOn, lowStim: lowOn, keepOut: () => rectOf(zAd),
          bounds: () => ({ left: area.x, top: area.y, right: area.x + area.w, bottom: area.y + area.h }),
          haptic: (k) => app.haptic(k), audio: prefs.get('sound') ? app.audio : null,
        });
      } catch (e) { console.info('[another angle] ThoughtLayer unavailable; the local Thought Mallow stands in', e?.message); TL = null; }
      router = routerMod.createInputRouter({
        el: world.fx, mallow: zAd,
        thoughts: { hitTest: (x, y) => (compAd?.hitTest?.(x, y) ? compAd : null), pointer: (target, r) => target.pointer(r) },
        onEmpty: (r) => stagePointer(r),
      });
      router.setWorld((r) => stagePointer(r));
      rigTicker = (dt, t) => tick(dt, t);
      removeTicker = rig.removeTicker;
      rig.addTicker(rigTicker);
      addEventListener('resize', onResize);
      visualViewport?.addEventListener('resize', onResize);
      offPrefs = prefs.onChange((k, v) => {
        if (k === 'lowStim') { setLowStim(!!v); zt?.setLowStim(!!v); ct?.setLowStim(!!v); TL?.setLowStim(!!v); }
        if (k === 'motion') { zt?.setReducedMotion(rmOn()); ct?.setReducedMotion(rmOn()); TL?.setReducedMotion(rmOn()); }
        if (k === 'sound') { zt?.setAudio(v ? app.audio : null); ct?.setAudio(v ? app.audio : null); }
      });
      resize();
      if (DEV()) window.__angle = devApi();
      arrive();
    },
    leave() {
      S.left = true;
      S.seq++;
      for (const t of timers) clearTimeout(t);
      timers.clear();
      clearTimeout(resizeT);
      clearTimeout(heardT);
      clearTimeout(draftT);
      stopClock?.();
      removeEventListener('resize', onResize);
      visualViewport?.removeEventListener('resize', onResize);
      offPrefs?.();
      keepCtl?.abort();
      // the sheets' history entries are forgotten by app.go(); their watchers stop here
      for (const r of sheets.splice(0)) { r.done = true; r.token = 0; r.obs.forEach((o) => o.disconnect()); }
      overlay?.close('leave');
      consentCard?.close();
      endMechanic(true);
      dropThought();
      try { TL?.destroy(); } catch { /* ignore */ }
      sheetObs?.disconnect();
      TL = null;
      if (rigTicker) removeTicker?.(rigTicker);
      subs?.destroy();
      router?.destroy();
      tags.clear();
      dismissCompanion(true);
      zAd?.destroy?.();
      if (zt) { try { zt.destroy(); } catch { /* ignore */ } zt = null; }
      touchBox?.remove(); touchBox = null;
      world.setLayerSize(null);
      world.showMallow(true);
      world.fx.replaceChildren();
      world.fx.classList.remove('live');
      document.body.classList.remove('hf-active');
      if (window.__angle && DEV()) delete window.__angle;
    },
    /** Back closes the newest layer first: a sheet (the urgent one included), then the compact input. */
    get blockBack() {
      if (!overlay && !sheets.length && !layer.lossCheck) return null;
      return (token) => backClose(token);
    },
    safeForUpdate() {
      if (overlay?.dirty || consentCard || sheets.length) return false;
      if (subs?.holding) return false;
      if (S.crisis || S.care || !supportPill.hidden) return false;
      return !['waiting', 'playing', 'reveal', 'explore', 'feedback', 'typing', 'asking'].includes(S.phase);
    },
  };
  let offPrefs = null;

  // QA hooks (localhost only): Playwright drives the real flow through these
  function devApi() {
    return {
      S, get subs() { return subs; }, get mech() { return mech; }, get mechId() { return mechId; }, get area() { return area; },
      get zuzu() { return zAd; }, get companion() { return compAd; }, get overlay() { return overlay; }, get consent() { return consentCard; },
      get thought() { return thought; },
      openTell, layout, serverMode, endpoint,
      /** Play a scene directly (lab): an authored scene for `text`, optionally forcing the mechanic. */
      async play(text, { mechanic = null, emotion = null } = {}) {
        S.text = text; S.emotion = emotion; S.shown = []; S.used = [];
        S.look = firstLook({ emotion, text });
        const sc = authoredScene(text, { emotion });
        if (sc.grief) return griefMode();
        if (mechanic && MECHANICS.includes(mechanic)) { sc.mechanic = mechanic; sc.interaction_type = mechanic; }
        spawnThought();
        const seq = ++S.seq;
        await playScene(sc, seq);
      },
      assist() { mech?.assist?.(); },
    };
  }

  return view;
}
