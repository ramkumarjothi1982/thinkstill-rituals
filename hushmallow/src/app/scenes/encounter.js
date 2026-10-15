// MEET A MALLOW — the right Mallow arrives, wears the feeling on its face,
// says something real, and offers one ritual (with a plain reason why).
//
// (15 Oct 2026) Before anything playful, the words get the main screen's reading and outcome (readWordsSafety: the
// Hushfold Tell's readSafety, src/hushfold/input-overlay.js — the shared lexicon, the grief rules and the risk screener),
// in the main screen's order (hushfold.js tellRoute, gateRoute below): crisis → the calm line and support, no ritual;
// care → support first, no ritual; a loss → the gentle response, no ritual; distress → support close, no ritual; ordinary
// words after something heavy earlier in this visit → a short acknowledgement, a ritual only if asked; possibly at risk
// (the screener's 'check') → "Before we go on — are you okay right now?"; a loss the lists are unsure of → "Shall we play
// with this, or just be with it?"; everything else → the ritual, as before. Every way in reads the words here: Express's
// "Meet a Mallow", the landing's "Another ritual" (the words kept from earlier) and anything else that sets
// app.state.input. A heavy reading is kept for the visit the Hushfold's way (app.state.hfSafety + visit-safety.js: the
// level only, never the words), so home stays gentle afterwards. Nothing here is ever sent anywhere.
import { h, iconBtn, icon, say, clearBubble, wait, fitMallow } from '../ui.js';
import { faceMix } from '../../engine/interpret.js';
import { getEmotion, getFamily } from '../../data/emotions.js';
import { MALLOWS } from '../../mallows/registry.js';
import { encounterLine } from '../../mallows/voices.js';
import { createRound } from '../../engine/round.js';
import { planOptions } from '../../engine/next.js';
import { RITUALS } from '../../data/rituals.js';
import { AVAILABLE } from '../../rituals/index.js';
import { allowedFor } from '../../engine/recommend.js';
import { toast } from '../ui.js';
import { photoSession } from '../../v3/photos.js';
import { tellIfFull } from '../../v3/tray.js';
import { warmMallowCards } from '../../v3/mallow-cards.js';
import { fitLabel, type } from '../../ui/type.js';
import { openSupport } from './support.js';
import { SHARED_LINES, CHECK_IN, PLAY_CHECK } from '../../hushfold/lines.js';
import { rememberVisitSafety, recallVisitSafety } from '../visit-safety.js';
import { setStageFloor } from '../../mallows/rig.js';

const REFRAME_FAMILIES = new Set(['shame', 'fear', 'loneliness', 'anger', 'sadness', 'envy', 'confusion']);
const LEVELS = ['none', 'concern', 'care', 'crisis'];
/** The attentive face the main screen keeps after something heavy (hushfold.js CARE_FACE). */
const CARE_FACE = 'concerned';
/** The care the main screen offers no world for at all (hushfold.js DEATH_CARE), and the check-in's "Not really". */
const NO_OFFER = new Set(['suicide-loss', 'death-follow', 'self-risk', 'check-in']);
/** The urgent sheet waits this long after the crisis card (a double tap on "Another ritual" must not reach its calls). */
const URGENT_AFTER_MS = 800;
/** More words after something heavy earlier in the visit (hushfold.js CARE_AGAIN). */
const CARE_AGAIN = 'Thank you for telling me. I’m right here.';

/**
 * The main screen's reading of these words (input-overlay.js readSafety with the grief rules and the risk screener, as the
 * Hushfold's Tell reads them): { level, category, check?, unsure?, supportFirst?, deathCare? }. `emotions`: the feelings
 * chosen ({ id } or ids); a grief-family one counts as a loss, whatever the words say. null when the reading could not
 * load (the caller falls back to what it already has).
 */
export async function readWordsSafety({ text = '', emotions = [] } = {}) {
  try {
    const io = await import('../../hushfold/input-overlay.js');
    const [m] = await Promise.all([io.loadInputModules(), io.loadGrief()]);
    const g = await import('../../beyond/grief.js').catch(() => null);
    const ids = (emotions || []).map((e) => (typeof e === 'string' ? e : e?.id)).filter(Boolean);
    const emotion = ids.find((id) => g?.griefFeeling?.(id)) || ids[0] || null;
    const t = String(text ?? '').trim();
    if (!t && !emotion) return { level: 'none', category: null };
    return io.readSafety(m, t, true, { emotion, screen: true });
  } catch (e) { console.warn('[encounter] reading', e?.message || e); return null; }
}
/** The more serious of two readings, with every flag either one carries (check / unsure only while nothing is heavier). */
export function strongerSafety(a, b) {
  if (!a?.level) return b?.level ? { ...b } : null;
  if (!b?.level) return { ...a };
  const hi = LEVELS.indexOf(b.level) > LEVELS.indexOf(a.level) ? b : a;
  const out = { level: hi.level, category: hi.category ?? null };
  if (a.supportFirst || b.supportFirst) out.supportFirst = true;
  if (a.deathCare || b.deathCare) out.deathCare = a.deathCare || b.deathCare;
  if (out.level === 'none') { if (a.check || b.check) out.check = true; if (a.unsure || b.unsure) out.unsure = true; }
  return out;
}
/**
 * What the words lead to here, in the main screen's order (hushfold.js tellRoute): 'crisis' | 'care' | 'loss' | 'concern'
 * | 'carried' (ordinary words, something heavy earlier in this visit) | 'check' (the screener's check-in) | 'ask' (a loss the
 * lists are unsure of) | 'offer' (the ritual, as before). `answered`: the person already answered the check-in or the
 * question for these very words ("I'm okay", "Play with it"): not asked twice.
 */
export function gateRoute(r, { visit = null, answered = false } = {}) {
  const lv = r?.level || 'none';
  if (lv === 'crisis') return 'crisis';
  if (lv === 'care') return 'care';
  if (lv === 'concern') return r.category === 'loss' ? 'loss' : 'concern';
  if (visit && LEVELS.indexOf(visit.level) > 0) return 'carried';
  if (r?.check && !answered) return 'check';
  if (r?.unsure && !answered) return 'ask';
  return 'offer';
}
/**
 * Something heavy, kept for the visit the way the Hushfold keeps it (hushfold.js keepSafety: app.state.hfSafety and this
 * tab's visit-safety.js, the level only, never the words; it only rises), and every Mallow on screen keeps the attentive
 * face from here (rig.js setStageFloor). crisisSpoken: the calm line was said here, so home does not say it again.
 */
export function noteVisitSafety(app, r, { crisisSpoken = false } = {}) {
  if (!r || LEVELS.indexOf(r.level) < 1) return;
  const was = app?.state?.hfSafety || recallVisitSafety();
  const up = !was || LEVELS.indexOf(r.level) > LEVELS.indexOf(was.level);
  const next = up ? { level: r.level, category: r.category || null, crisisSpoken: !!crisisSpoken || !!was?.crisisSpoken }
    : { level: was.level, category: was.category ?? null, crisisSpoken: !!crisisSpoken || !!was.crisisSpoken };
  if (app?.state) app.state.hfSafety = next;
  rememberVisitSafety(next);
  setStageFloor(CARE_FACE);
}

export default function encounter(app) {
  const { world, rec, ent } = app;
  const input = app.state.input;
  if (!input) { queueMicrotask(() => app.go('home', {}, { replace: true })); return { el: h('div') }; }
  const top = getEmotion(input.emotions[0]?.id);
  const family = top?.family || 'default';
  const req = { ...input, entitlements: ent.flags(), tier: 'paid', prefs: { lowStimulation: app.prefs.get('lowStim') } };
  // what this plan may offer (Another Angle has its own door, so it isn't dealt here)
  const offerRituals = RITUALS.filter((r) => (r.tier || 'paid') === 'paid' && allowedFor(r, ent.flags()) && AVAILABLE.has(r.module));
  const round = createRound(app.store, ent.tier());
  let options = [];
  let idx = 0;
  async function deal() {
    let plan = planOptions({ rec, req, rituals: offerRituals, seen: round.seen(), limit: 4 });
    if (!plan.options.length && plan.total) {
      // every ritual in the plan has been done once: start a fresh round
      toast(`You’ve tried all ${plan.total} in your plan. Starting a fresh round!`, 3600);
      round.restart();
      plan = planOptions({ rec, req, rituals: offerRituals, seen: round.seen(), limit: 4 });
    }
    options = plan.options;
  }

  // add (more) photos without leaving the offer: they become part of this ritual
  const picker = h('input', { type: 'file', accept: 'image/*', multiple: true, 'aria-hidden': 'true', tabindex: '-1', style: { position: 'absolute', width: '1px', height: '1px', opacity: '0', pointerEvents: 'none' } });
  picker.addEventListener('change', async () => {
    const files = [...(picker.files || [])]; picker.value = '';
    if (!files.length) return;
    const added = await photoSession.add(files);
    tellIfFull(files.length, added);
    if (added) { app.haptic('light'); render(); }
  });
  function photoButton() {
    const n = photoSession.count;
    if (n >= photoSession.max) return h('div', { class: 'photo-add-inline photo-full', role: 'status' }, icon('camera'), `${n} photos added`);
    return h('button', { class: 'btn ghost block photo-add-inline', onclick: () => picker.click() },
      icon('camera'), n ? `Add more photos (${n}/${photoSession.max})` : 'Add up to seven of your photos (optional)');
  }
  // no photos yet: get the Mallow cards ready while the offer is read
  if (!photoSession.count) warmMallowCards();

  const card = h('div', { class: 'card enc-card' });
  let voiceEl = null;          // the Mallow's line, inside the card when there's no room to show the Mallow
  let mallowShown = true;
  const ultraRow = h('div');
  const el = h('div', { style: { display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto', scrollbarWidth: 'none' } },
    h('div', { class: 'topbar' }, iconBtn('back', 'Back', () => app.back()), h('div', { class: 'grow' }),
      // on its own dark pill: readable over the brightest realm
      h('span', { class: 'eyebrow scrim-pill enc-feelings' }, input.emotions.map((e) => getEmotion(e.id)?.name).filter(Boolean).slice(0, 3).join(' · '))),
    h('div', { class: 'spacer' }),
    card, picker, h('div', { style: { height: '10px' } }), ultraRow);

  function render() {
    const o = options[idx];
    if (!o) {
      card.replaceChildren(
        h('h3', {}, 'I don’t have the right ritual for this one yet'),
        h('p', {}, 'Rather than give you something that doesn’t fit, here’s what you can do: pick a different feeling, or just stay here with the Mallows for a moment.'),
        h('div', { class: 'row-btns', style: { marginTop: '14px' } },
          h('button', { class: 'btn fit-one', onclick: () => app.go('express', { keep: true }) }, 'Change feelings'),
          h('button', { class: 'btn fit-one', onclick: () => app.go('home') }, 'Home')));
      // one line on a small phone: "Pick again" when "Change feelings" would wrap
      const change = card.querySelector('.row-btns .btn');
      const fitChange = () => fitLabel(change, 'Pick again');
      requestAnimationFrame(fitChange); setTimeout(fitChange, 700);
      return;
    }
    const r = o.item;
    const lead = MALLOWS[r.mallows[0]];
    const mins = Math.max(1, Math.round(r.durationSec / 60));
    voiceEl = h('p', { class: 'enc-voice', hidden: true });
    card.replaceChildren(
      h('div', { class: 'eyebrow', style: { color: 'var(--accent)' } }, `${lead.name} has a ritual for that`),
      voiceEl,
      h('h3', { class: 't-world', style: { marginTop: '8px' } }, r.name),
      h('p', {}, r.purpose),
      h('div', { class: 'reasons' }, ...o.reasons.filter((x) => !/minute/.test(x)).map((x) => h('span', {}, x)), h('span', {}, `About ${mins} min`),
        r.module === 'v3' ? h('span', { class: 'photo-chip' }, photoSession.count ? `With your ${photoSession.count} photo${photoSession.count > 1 ? 's' : ''}` : 'With the seven Mallows') : null),
      r.module === 'v3' ? photoButton() : null,
      h('div', { style: { display: 'grid', gap: '8px', marginTop: '16px' } },
        h('button', { class: 'btn primary block', onclick: () => begin(o) }, 'Let’s do it'),
        options.length > 1 ? h('button', { class: 'btn ghost block', onclick: () => { idx = (idx + 1) % options.length; app.audio.ui('toggle'); show(); } }, 'Something else') : null));
  }

  async function show() {
    const o = options[idx];
    const leadId = o ? o.item.mallows[0] : (getFamily(family)?.mallows?.[0] || 'blubi');
    const lead = MALLOWS[leadId];
    await Promise.all([world.setRealm(lead.realm, { emotion: Object.keys(faceMix(input.emotions))[0], intensity: input.intensity }), world.setMallow(leadId)]);
    world.setEmotion(faceMix(input.emotions), Math.min(1, input.intensity * 1.05));
    render();
    await fit();
    await wait(850); // let the Mallow settle into place before it speaks
    const line = encounterLine(leadId, family);
    if (mallowShown) say(world, line, { who: lead.name, ms: 3600 });
    else if (voiceEl) { voiceEl.textContent = `“${line}”`; voiceEl.hidden = false; }
  }

  // keep the Mallow's face in view: fit it into the space above the card.
  // On short phones there is no such space: the Mallow steps aside (it never
  // ghosts under the card's text) and its line is written into the card.
  function fit() {
    return new Promise((resolve) => requestAnimationFrame(() => {
      const top = el.querySelector('.topbar')?.getBoundingClientRect().bottom ?? 60;
      const cardTop = card.getBoundingClientRect().top;
      mallowShown = fitMallow(world, top + 6, cardTop - 6, { maxScale: 0.92, minPx: 76 });
      resolve();
    }));
  }

  function begin(o) {
    clearBubble();
    if (o.item.id === 'another-angle') { app.go('angle', { text: input.text || '' }); return; }
    rec.markDealt(o.item.id, o.poolKey);
    app.state.ritual = o.item;
    app.go('ritual', { id: o.item.id });
  }

  // Beyond members can step into Another Angle from here. Non-members aren't
  // shown an upsell in the middle of a hard moment. (Only beside a ritual offer: never beside support or a question.)
  function angleRow() {
    if (!ent.has('ultra') || ultraRow.firstChild || !(REFRAME_FAMILIES.has(family) || (input.text || '').length > 20)) return;
    ultraRow.append(h('button', { class: 'ultra-card', onclick: () => app.go('angle', { text: input.text }) },
      h('div', { class: 'spiral', 'aria-hidden': 'true' }),
      h('div', {}, h('span', { class: 'badge' }, 'BEYOND'), h('div', { class: 't' }, 'Or try Another Angle'), h('div', { class: 's' }, 'Ready for the plot twist?'))));
  }

  // ------------------------------------------------------------------ the gate --
  // (15 Oct 2026) the words' reading comes first (see the top of this file): nothing playful before it
  let left = false;
  async function decide() {
    const text = String(input.text ?? '').trim();
    const kept = input.safety?.detail || (input.safety?.level && input.safety.level !== 'none'
      ? { level: input.safety.level === 'crisis' ? 'crisis' : 'concern', category: input.safety.reason ?? null } : null);
    const read = await readWordsSafety({ text, emotions: input.emotions });
    const r = strongerSafety(read, kept) || { level: 'none', category: null };
    const visit = app.state.hfSafety || recallVisitSafety();
    return { r, visit, route: gateRoute(r, { visit, answered: !!text && input.answeredFor === text }) };
  }
  /** "I'm okay — let's play" / "Play with it": these words are not asked about again (Another ritual), and the ritual follows. */
  async function goOn() {
    const text = String(input.text ?? '').trim();
    if (text) input.answeredFor = text;
    app.state.hfSoft = false;   // a quiet visit from an earlier "Just be with it" is over: they chose to play (hushfold.js endSoft)
    clearBubble();
    card.className = 'card enc-card';
    card.removeAttribute('aria-live');
    const pill = el.querySelector('.enc-feelings');
    if (pill) pill.style.display = '';
    world.dim(false);
    angleRow();
    await deal();
    if (left) return;
    await show();
  }
  const leadNow = () => MALLOWS[world.mallowId] || MALLOWS[getFamily(family)?.mallows?.[0]] || MALLOWS.blubi;
  const lineEls = (lines) => (Array.isArray(lines) ? lines : [lines]).filter(Boolean).map((t, i) =>
    h('p', { style: type('body', { margin: i ? '6px 0 0' : '8px 0 0', color: 'var(--text-1)', textWrap: 'pretty' }) }, t));
  const btn = (label, onclick, cls = '') => h('button', { class: `btn block${cls ? ` ${cls}` : ''}`, onclick }, label);
  const supportBtn = (r, { primary = false, label = 'See support' } = {}) => btn(label, () => openSupport(app, r?.level === 'crisis' ? { urgent: true } : { category: r?.category ?? null }), primary ? 'primary' : '');
  const homeBtn = () => btn('Home', () => app.go('home'), 'ghost');
  /** The gentle card: who speaks, what they say, and the ways on (a polite live region: read once, nothing moves). */
  function gentleCard(lines, buttons) {
    if (left) return;
    clearBubble();
    card.className = 'card enc-gate';
    card.setAttribute('aria-live', 'polite');
    card.replaceChildren(
      h('div', { class: 'eyebrow', style: { color: 'var(--accent)' } }, leadNow().name),
      ...lineEls(lines),
      h('div', { style: { display: 'grid', gap: '8px', marginTop: '16px' } }, ...buttons.filter(Boolean)));
    requestAnimationFrame(() => { if (!left) fit(); });
  }
  /** "Stay here quietly": the quiet line, support one tap away, and home. */
  const stayQuiet = (r) => gentleCard(SHARED_LINES.careQuiet, [supportBtn(r), homeBtn()]);
  /** "Just be with it": the one gentle line, nothing playful for the rest of the visit (hushfold.js softVisit), and home. */
  function beWithIt() {
    app.state.hfSoft = true;
    gentleCard(PLAY_CHECK.be, [homeBtn()]);
  }
  function gate(route, r, visit) {
    ultraRow.replaceChildren();
    world.dim(true);
    world.setStage(CARE_FACE, { quiet: true });
    const pill = el.querySelector('.enc-feelings');
    if (pill && route !== 'check' && route !== 'ask') pill.style.display = 'none';
    if (route === 'crisis') {
      // the calm line and support (the urgent sheet opened while the words were typed): nothing is made of the words
      noteVisitSafety(app, r, { crisisSpoken: true });
      gentleCard(SHARED_LINES.support, [supportBtn(r, { primary: true }), homeBtn()]);
      // (not yet shown for these words — a misspelling only the whole reading caught, or words brought from elsewhere: once,
      // a moment after the card, so a second tap of the button that led here never lands on a call button that just opened)
      if (!input.supportShown) {
        input.supportShown = true;
        setTimeout(() => { if (!left && !document.querySelector('.sheet.open')) openSupport(app, { urgent: true }); }, URGENT_AFTER_MS);
      }
    } else if (route === 'care' || route === 'loss' || route === 'concern') {
      // support first, then staying quietly (no ritual is offered: the main screen's careBeat, without its world)
      noteVisitSafety(app, r);
      const first = r.category === 'harm-others' ? SHARED_LINES.harmOthers
        : route === 'loss' && r.category !== 'suicide-loss' ? (SHARED_LINES.supportGrief || SHARED_LINES.supportLoss)
        : r.category === 'suicide-loss' || route === 'loss' ? SHARED_LINES.supportLoss
          : route === 'care' ? SHARED_LINES.supportCare : SHARED_LINES.supportConcern;
      gentleCard(first, route === 'care'
        ? [supportBtn(r, { primary: true }), btn('Stay here quietly', () => stayQuiet(r))]
        : [btn('Stay here quietly', () => stayQuiet(r), 'primary'), supportBtn(r)]);
    } else if (route === 'carried') {
      // ordinary words after something heavy earlier in this visit: a short acknowledgement; a ritual only if they ask
      // (never after a crisis, a suicide named, a wish to follow someone who died or "Not really")
      const offer = visit.level !== 'crisis' && !NO_OFFER.has(visit.category);
      gentleCard(CARE_AGAIN, [btn('Stay here quietly', () => stayQuiet(visit), 'primary'), offer ? btn('Show me a ritual', () => goOn()) : null, supportBtn(visit)]);
    } else if (route === 'check') {
      // possibly at risk: the main screen's check-in, three answers of equal weight, before any ritual
      gentleCard(CHECK_IN.ask, [btn(CHECK_IN.okay, () => goOn()), btn(CHECK_IN.notReally, () => notReally()), btn(CHECK_IN.stay, () => beWithIt())]);
    } else {
      // a loss the lists are only unsure of: the main screen's one question, two answers of equal weight
      gentleCard(PLAY_CHECK.ask, [btn(PLAY_CHECK.play, () => goOn()), btn(PLAY_CHECK.stay, () => beWithIt())]);
    }
  }
  /** "Not really": the care-lite path (hushfold.js careLite) — a calm line, support first, no ritual for the visit. */
  function notReally() {
    const r = { level: 'concern', category: 'check-in' };
    noteVisitSafety(app, r);
    const pill = el.querySelector('.enc-feelings');
    if (pill) pill.style.display = 'none';
    gentleCard(CHECK_IN.heard, [supportBtn(r, { primary: true, label: CHECK_IN.support }), btn(CHECK_IN.quiet, () => stayQuiet(r))]);
  }

  return {
    el, title: 'Meet a Mallow',
    async enter() {
      world.dim(false);
      world.showMallow(true);
      world.place({ x: 50, y: 40, scale: 0.92 });
      const { r, visit, route } = await decide();
      if (left) return;
      if (route !== 'offer') { gate(route, r, visit); return; }
      angleRow();
      await deal();
      if (left) return;
      await show();
    },
    leave() { left = true; clearBubble(); world.showMallow(true); },
  };
}
