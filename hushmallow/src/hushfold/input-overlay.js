// The compact, temporary "tell me" overlay of the Hushfold.
//
// It appears only when the person chooses to answer (the reply chip under a
// subtitle, or the Tell pill), sits in the upper band so the iPhone keyboard
// never covers it (visualViewport), and closes as soon as they send. It is
// NOT a sheet: there is no backdrop, and the scene lays the Mallow out below
// it (onLayout), so the person can keep squeezing while they type.
//
// Compact by design: the prompt, one growing text field and one chip row.
// Everything else waits until it is useful: the "I'd like…" chips appear once
// a feeling is chosen (on short phones they follow it in the same row), the
// photo strip only when asked for, and the privacy note only on tall screens
// before anything is typed.
//
//   openInput({ app, prompt, mallow:{id,name,glow}, root, emotion, intention,
//               hasPlan, heavy, face(faceMix), onSubmit({text, emotion, intention, reading, safety, input}),
//               onClose(reason, {safety, supportShown}), onLayout(rect), onSafety(result), support(opts), trackSheet(sheet),
//               photos = true, privacyNote = null, lossAware = false, history = [] })
//   history: the visit's recent Tells (the last 3, in memory only, never stored), read by the risk screener as context.
//   photos:false → no Photos button (Another Angle never takes photos). lossAware: death and loss talk read as
//   concern (a wish to follow the one who died as care), for the main screen (src/beyond/grief.js; the feeling chips read loss
//   talk on every screen: beside a death or a loss only Grief and Sad are suggested). privacyNote: the privacy clause in
//   the note (default: "Your words stay on this phone."); the dictation hint keeps its first sentence.
//     → { el, close(reason), rect(), get text, get dirty, get safety }
//
// Words: kept exactly as typed (trimmed at the ends), shown with textContent
// only, never stored. Feelings: the person picks; the rule-based finder only
// highlights chips as suggestions and never decides. Safety: every keystroke
// pause runs the shared detector (src/engine/safety.js) and reports the level
// to the scene at once (onSafety), sent or not; crisis opens the urgent support
// sheet once, care or distress shows a Support chip. Sheets opened from here
// (support, the A–Z list) go through the scene (support / trackSheet), so Back
// closes the sheet before the overlay beneath it.

import { h } from '../app/ui.js';
import { openSupport } from '../app/scenes/support.js';
import { hfIcon } from './icons.js';
import { QUICK_FEELINGS, INTENTIONS } from './lines.js';

const QUICK_IDS = new Set(QUICK_FEELINGS.map(([id]) => id));
const MAX_CHARS = 600;
/** The visible count appears this close to the limit (sighted people see why typing stops). */
const COUNT_FROM = 540;
const LEVELS = ['none', 'concern', 'care', 'crisis'];
/** Below this viewport height the overlay keeps to one chip row and no notes. */
export const ROOMY_HEIGHT = 700;
let mods = null, modsNow = null;
/** interpret + safety + emotions, loaded on first use (kept out of the first second). */
// The main screen also reads death and loss talk (never a Thought Mallow made of a death): grief.js, on its own
// (Another Angle, which handles grief itself, already has it). Both read it for the feeling chips too (lossIn).
let griefMod = null, griefNow = null;
// (15 Oct 2026) the risk screener (src/beyond/risk-screen.js) loads with grief.js: every screen reads with it (readSafety)
let screenNow = null;
export const loadGrief = () => (griefMod ||= Promise.all([import('../beyond/grief.js'), import('../beyond/risk-screen.js').catch(() => null)])
  .then(([g, rs]) => { screenNow = rs; return (griefNow = g); }).catch(() => null));
/**
 * A death or a loss in the words, for the feeling chips only (safety routing is readSafety's): grief.js deathTalk or
 * livingLoss, or a person beside a strong loss cue (strongLoss, re-exported there from backstop.js). Beside one only the
 * feelings that fit a loss are suggested (interpret.js suggestedFeelings `loss`). False until grief.js has loaded.
 */
export function lossIn(t) {
  if (!griefNow || !String(t || '').trim()) return false;
  try { return !!(griefNow.deathTalk(t) || griefNow.livingLoss?.(t) || griefNow.strongLoss?.(t)); } catch { return false; }
}
/**
 * The safety reading with loss talk added (lossAware): a death named with a wish to follow the one who died, or a first-person
 * clause about the self ending after it, is care ('death-follow'), and so is a suicide named about anyone (r3-esc,
 * 'suicide-loss': grief.js deathCare); any other death or loss talk is concern (the gentle path: support close, no Thought Mallow, nothing
 * playful), and so is a person beside a strong loss cue (grief.js strongLoss, review r11: "a drunk driver took my
 * brother from us", "the fire took both my grandparents"; never the weak cues, a false alarm here opens the support
 * beat), and so is a grief-family feeling they chose (`emotion`: grief, mourning, bereft, heartache, heartbreak,
 * anticipatory grief), whatever the words say. Not sure (owner decision 'Ask when unsure', 14 Oct 2026: a person or a
 * pet beside a softer loss cue, grief.js unsureLoss): level none with `unsure: true`, and the scene asks "Is this about
 * losing someone?" before anything is made of the words. Never lowers what checkText found.
 *
 * (15 Oct 2026, the risk screener) Then, with `screen` (the main screen's lossAware reading, and every Tell overlay: openInput
 * passes it on both screens): the same reading over the words in one spelling (risk-screen.js normalise), where it is care or
 * crisis; and the screener (risk-screen.js riskScreen, with `history`: the visit's last 3 Tells, in memory only). Its 'care' is
 * care, category 'self-risk' (the care path: no question, no world offered; beside the lexicon's own care, `deathCare:
 * 'self-risk'`); its 'check' with nothing more serious is `check: true` (the scene asks "Before we go on — are you okay right
 * now?" instead of its usual question); beside distress or a loss, `supportFirst: true` (support first, no world offered).
 * Without `screen` and without lossAware the reading is exactly checkText, as before.
 */
export function readSafety(m, t, lossAware, { emotion = null, history = null, screen = lossAware } = {}) {
  const raw = readWords(m, t, lossAware, { emotion });
  if (!screen || !screenNow || !String(t ?? '').trim()) return raw;
  // (15 Oct 2026) misspellings reach every layer: the same reading over the words in one spelling (risk-screen.js normalise:
  // "i wnat to dei", "k1ll myself", "d i e"); only where it is more serious and care or crisis (nothing the words as typed found
  // is lost, and the shapes of the gentle and unsure readings stay those of the words as typed)
  let r = raw;
  try {
    const n = screenNow.normalise(t);
    if (n && n !== String(t).toLowerCase().replace(/\s+/g, ' ').trim()) {
      const b = readWords(m, n, lossAware, { emotion });
      if (RANK_OF[b.level] >= 2 && RANK_OF[b.level] > RANK_OF[raw.level]) r = b;
    }
  } catch { /* the reading as typed stands */ }
  // the risk screener: it reads meaning (frames and how they combine), with the visit's recent Tells as context
  let s = null;
  try { s = screenNow.riskScreen(t, { history: Array.isArray(history) ? history : [] }); } catch { s = null; }
  if (!s?.level || r.level === 'crisis') return r;
  if (s.level === 'care') {
    // its care is the self ending: the care path, no question and no world offered (hushfold.js DEATH_CARE 'self-risk'); a
    // death care already read stands as it is; beside the lexicon's other care (violence, abuse…) the lexicon's category and its
    // resources stand and the death care rides along
    if (r.level === 'care') return r.deathCare || DEATH_CATEGORIES.has(r.category) ? r : { ...r, deathCare: 'self-risk' };
    return { level: 'care', category: 'self-risk', matched: null };
  }
  // 'check': nothing more serious applies → the check-in replaces the usual question; beside distress or a loss (the support
  // path or the gentle path) → support first, no world offered
  if (r.level === 'none') { const { unsure, ...rest } = r; return { ...rest, check: true }; }
  if (r.level === 'concern') return r.supportFirst ? r : { ...r, supportFirst: true };
  return r;
}
/** readSafety by another name, for openInput (its own readSafety reads with the screener and the visit's last Tells). */
const readScreened = (...a) => readSafety(...a);
const RANK_OF = { none: 0, concern: 1, care: 2, crisis: 3 };
/** The care categories that are already a death care (the scene offers no world for them). */
const DEATH_CATEGORIES = new Set(['death-follow', 'suicide-loss', 'self-risk']);
/** The reading of these words by the lexicon and (lossAware) the grief rules, as before the screener. */
function readWords(m, t, lossAware, { emotion = null } = {}) {
  const r = m.checkText(t);
  if (!lossAware || !griefNow || r.level === 'crisis') return r;
  if (r.level === 'care') {
    // (final) the lexicon's care (violence, abuse…) beside a wish to follow someone who died or a suicide named: the lexicon's
    // category and its resources stand, and `deathCare` carries the death-care reading so the scene offers no world either
    try {
      const dc = griefNow.deathCare ? griefNow.deathCare(t) : (griefNow.deathEscalation(t) ? 'follow' : null);
      if (dc) return { ...r, deathCare: dc === 'follow' ? 'death-follow' : 'suicide-loss' };
    } catch { /* the plain reading stands */ }
    return r;
  }
  try {
    // (r3-esc) a wish to follow someone who died, or the self ending after a death ('death-follow'); a suicide named, nothing
    // more ('suicide-loss'): care, the scene says it gently and offers no world (hushfold.js careBeat / careChoice)
    const dc = griefNow.deathCare ? griefNow.deathCare(t) : (griefNow.deathEscalation(t) ? 'follow' : null);
    if (dc) return { level: 'care', category: dc === 'follow' ? 'death-follow' : 'suicide-loss', matched: null };
    // (final round 4, the safety net) a death recognised and, after it, a first-person clause with a death, ending, absence or
    // afterlife word (grief.js keepLocal): still the gentle path (never care), but support first: the Support pill and no world
    // offered, not even somewhere calm (`supportFirst`: hushfold.js careChoice)
    const held = () => !!griefNow.keepLocal?.(t);
    if (r.level !== 'none') return r.level === 'concern' && griefNow.deathTalk(t) && held() ? { ...r, supportFirst: true } : r;
    const route = griefNow.lossRoute ? griefNow.lossRoute(t, { emotion })
      : (griefNow.deathTalk(t) || griefNow.livingLoss?.(t) || griefNow.strongLoss?.(t) ? 'gentle' : null);
    if (route === 'gentle') return { level: 'concern', category: 'loss', matched: null, ...(held() ? { supportFirst: true } : {}) };
    if (route === 'ask') return { ...r, unsure: true };
  } catch { /* the plain reading stands */ }
  return r;
}
export function loadInputModules() {
  mods ||= Promise.all([import('../engine/interpret.js'), import('../engine/safety.js'), import('../data/emotions.js')])
    .then(([interpretMod, safety, emotions]) => (modsNow = { interpret: interpretMod.interpret, suggestedFeelings: interpretMod.suggestedFeelings,
      checkText: safety.checkText, legacySafety: safety.legacySafety, getEmotion: emotions.getEmotion }));
  return mods;
}

export function openInput({ app, prompt = 'Want to tell me?', mallow = {}, root = document.body, emotion = null, intention = null, hasPlan = true,
  text = '', face = null, onSubmit, onClose, onLayout, onSafety = null, support = null, trackSheet = null, heavy = false,
  photos = true, privacyNote = null, lossAware = false, history = [] } = {}) {
  // (the chips read loss talk on every screen; the safety reading only with lossAware)
  // (history: the visit's recent Tells, in memory only, for the risk screener's context — never stored)
  const recent = Array.isArray(history) ? history.slice(-3) : [];
  // (15 Oct 2026) every reading in this overlay (typing, Send, close) is the risk screener's too, on both screens, beside them
  const readSafety = (mm, tt, la, o = {}) => readScreened(mm, tt, la, { ...o, history: recent, screen: true });
  loadGrief();
  const reduced = app?.prefs?.reducedMotion?.() ?? false;
  // larger text: the speaker's name takes its own line above the prompt
  const bigText = Number(app?.prefs?.get?.('textScale')) > 1.12;
  const openSupportSheet = (opts = {}) => (support ? support(opts) : openSupport(app, opts));
  const coarse = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
  const vv = typeof visualViewport !== 'undefined' ? visualViewport : null;
  // a tall screen, with room left above the keyboard when it is up
  const roomy = () => innerHeight >= ROOMY_HEIGHT && (!vv?.height || vv.height >= 480);
  let chosenEmotion = emotion, chosenIntention = intention;
  let extraFeeling = emotion && !QUICK_IDS.has(emotion) ? emotion : null;  // a feeling from the A–Z list
  // (heavyRow: the words, or something heavy earlier in this visit, are heavy: Sad leads the chips that follow the suggested)
  let suggested = [], heavyRow = heavy;
  let reading = null, safety = { level: 'none', category: null };
  // the most serious level seen while this overlay was open (sent or not): the scene acts on it
  let worst = { level: 'none', category: null };
  function report(r) {
    if (!r) return;
    const rise = LEVELS.indexOf(r.level) > LEVELS.indexOf(worst.level);
    // (final round 4) support first, seen at the same level ("my dad died" → "… and I want out"): said to the scene too
    const first = !!r.supportFirst && !worst.supportFirst && r.level !== 'none';
    // (final) a death-care reading beside the lexicon's care: said to the scene too, so it offers no world
    const dc = !!r.deathCare && !worst.deathCare;
    // (15 Oct 2026) the risk screener's check-in, seen: said to the scene too (support close while typing; the level stays)
    const ck = !!r.check && !worst.check;
    if (!rise && !first && !dc && !ck) return;
    worst = { level: rise ? r.level : worst.level, category: rise ? r.category : worst.category, ...(first || worst.supportFirst ? { supportFirst: true } : {}),
      ...(r.deathCare || worst.deathCare ? { deathCare: r.deathCare || worst.deathCare } : {}), ...(ck || worst.check ? { check: true } : {}) };
    try { onSafety?.({ ...worst }); } catch (e) { console.warn('[hushfold] onSafety', e); }
  }
  let supportShown = false, closed = false, sending = false, photosOpen = false, tray = null, hintUntil = 0, hintT = 0;
  let rowMode = 'feel';          // short phones: 'feel' or 'intent' (the chosen feeling, then the "I'd like…" chips)
  const opener = document.activeElement;
  const uid = `hfin${Math.random().toString(36).slice(2, 8)}`;

  const ta = h('textarea', { rows: '1', maxlength: String(MAX_CHARS), enterkeyhint: 'send', autocapitalize: 'sentences', autocomplete: 'off',
    spellcheck: 'true', placeholder: 'Type it how you’d say it…', 'aria-label': prompt, 'aria-describedby': `${uid}-note` });
  ta.value = text;
  const micBtn = h('button', { class: 'mic', type: 'button', 'aria-label': 'Prefer talking?', onclick: () => { showHint(); ta.focus({ preventScroll: true }); } }, hfIcon('mic'));
  const note = h('p', { class: 'note', id: `${uid}-note`, 'aria-live': 'polite' });
  const feelRow = h('div', { class: 'hf-scroll', role: 'group', 'aria-label': 'How does it feel?' });
  const intentRow = h('div', { class: 'hf-scroll intent', role: 'group', 'aria-label': 'What would help?', hidden: true });
  const supportBtn = h('button', { class: 'hf-ghost support', type: 'button', hidden: true, 'aria-label': 'Support', onclick: () => openSupportSheet() },
    hfIcon('support'), h('span', { class: 't' }, 'Support'));
  const photoCount = h('span', { class: 'count', hidden: true });
  const photoBtn = !photos ? null : h('button', { class: 'hf-ghost photo', type: 'button', 'aria-expanded': 'false', 'aria-label': 'Add photos, up to seven', onclick: () => togglePhotos() },
    hfIcon('camera'), h('span', { class: 't' }, 'Photos'), photoCount);
  // no plan: Continue says where it goes inside the button itself (no extra line in the overlay)
  const sendBtn = h('button', { class: `hf-send${hasPlan ? '' : ' two'}`, type: 'button', disabled: true, onclick: () => submit(), 'aria-describedby': hasPlan ? null : `${uid}-plan` },
    hasPlan ? 'Send' : h('span', { class: 'lbl' }, 'Continue', h('small', { class: 'sub' }, 'with ', h('span', { class: 'brand-name' }, 'hushmallow'), ' Flow')), hfIcon('send'));
  const photosBox = h('div', { class: 'photos', hidden: true });
  const planHint = hasPlan ? null : h('span', { class: 'sr-only', id: `${uid}-plan` }, 'Your words come alive as a Thought Mallow with hushmallow Flow. They stay on this phone.');
  /** Something heavy was typed: no plan offer in this moment (the scene keeps them on the stage), just Send. */
  function plainSend() {
    if (hasPlan || (worst.level === 'none' && !heavy) || !sendBtn.classList.contains('two')) return;
    sendBtn.classList.remove('two');
    sendBtn.removeAttribute('aria-describedby');
    sendBtn.replaceChildren('Send', hfIcon('send'));
    planHint?.remove();
  }
  const count = h('span', { class: 'sr-only', 'aria-live': 'polite' });
  const countVis = h('span', { class: 'count-vis', 'aria-hidden': 'true', hidden: true });
  const el = h('div', { class: `hf-input hf-ui${reduced ? ' reduced' : ''}${bigText ? ' big' : ''}`, role: 'dialog', 'aria-modal': 'false', 'aria-label': prompt, 'data-hf': 'input' },
    h('div', { class: 'head' },
      h('p', { class: 'prompt' }, mallow.name ? h('span', { class: 'who', style: mallow.glow ? { '--hf-who': mallow.glow } : null }, mallow.name, h('span', { class: 'sr-only' }, ': ')) : null, prompt),
      h('button', { class: 'close', type: 'button', 'aria-label': 'Close', onclick: () => close('button') }, hfIcon('close'))),
    // the frame around the words: a tap on its padding still lands in the field
    h('div', { class: 'field', onclick: (e) => { if (e.target === e.currentTarget) ta.focus({ preventScroll: true }); } }, ta, micBtn),
    note, feelRow, intentRow, photosBox,
    h('div', { class: 'actions' }, photoBtn, supportBtn, h('div', { class: 'grow' }, countVis, planHint), sendBtn), count);
  root.append(el);

  // --------------------------------------------------------- chips --
  let lastSuggestKey = '';
  const cached = new Map();
  const nameOf = (id) => new Map(QUICK_FEELINGS).get(id) || cached.get(id) || id.replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase());
  function renderFeelings() {
    // short phones: once a feeling is chosen, the same row carries on with "I'd like…"
    if (!roomy() && rowMode === 'intent' && chosenEmotion) {
      feelRow.setAttribute('aria-label', 'What would help?');
      feelRow.replaceChildren(
        chip(`${nameOf(chosenEmotion)}`, true, false, () => { rowMode = 'feel'; renderFeelings(); }, { ariaLabel: `Feeling: ${nameOf(chosenEmotion)}. Tap to change it.`, cls: 'back' }),
        ...intentionChips());
      return;
    }
    feelRow.setAttribute('aria-label', 'How does it feel?');
    const extra = [];
    if (extraFeeling && !QUICK_IDS.has(extraFeeling)) extra.push(extraFeeling);
    for (const id of suggested) if (!QUICK_IDS.has(id) && !extra.includes(id) && extra.length < 2) extra.push(id);
    // what the words suggest comes first, in the order suggested (highlighted, never chosen for them), then the rest
    // (beside a loss: Grief, then Sad)
    const first = [...suggested.filter((id) => QUICK_IDS.has(id) || extra.includes(id)), ...extra.filter((id) => !suggested.includes(id))];
    // (heavy words never have the row led by an unrelated chip: Sad leads the rest, never Angry)
    const quick = QUICK_FEELINGS.map(([id]) => id);
    const rest = (heavyRow ? ['sadness', ...quick.filter((id) => id !== 'sadness')] : quick).filter((id) => !first.includes(id));
    feelRow.replaceChildren(
      ...[...first, ...rest].map((id) => chip(nameOf(id), id === chosenEmotion, suggested.includes(id), () => pickFeeling(id))),
      chip('Something else…', false, false, () => openPicker()));
    const key = suggested.join(',');
    if (key !== lastSuggestKey) { lastSuggestKey = key; feelRow.scrollTo?.({ left: 0, behavior: reduced ? 'auto' : 'smooth' }); }
  }
  const intentionChips = () => INTENTIONS.map(([id, label]) => chip(label, id === chosenIntention, false, () => {
    chosenIntention = chosenIntention === id ? null : id; tick(); renderIntentions(); renderFeelings();
  }));
  function renderIntentions() {
    // on every height the "I'd like…" chips wait for a chosen feeling
    const show = roomy() && !!chosenEmotion;
    intentRow.hidden = !show;
    if (show) intentRow.replaceChildren(...intentionChips());
    setNote();
  }
  function chip(label, pressed, isSuggested, onclick, { ariaLabel = null, cls = '' } = {}) {
    return h('button', { class: `hf-opt${isSuggested ? ' suggested' : ''}${cls ? ` ${cls}` : ''}`, type: 'button', 'aria-pressed': String(!!pressed),
      'aria-label': ariaLabel || (isSuggested && !pressed ? `${label} (suggested by your words)` : null), onclick }, label);
  }
  function pickFeeling(id) {
    chosenEmotion = chosenEmotion === id ? null : id;
    if (chosenEmotion && !QUICK_IDS.has(chosenEmotion)) extraFeeling = chosenEmotion;
    rowMode = chosenEmotion ? 'intent' : 'feel';
    tick(); renderFeelings(); renderIntentions(); updateSend(); setNote();
    if (!roomy() && chosenEmotion) feelRow.scrollTo?.({ left: 0, behavior: 'auto' });
    if (chosenEmotion) mirror();
  }
  async function openPicker() {
    const [{ openEmotionPicker }] = await Promise.all([import('../app/emotion-picker.js'), loadInputModules()]);
    if (closed) return;
    const sheet = openEmotionPicker({ selected: chosenEmotion ? [chosenEmotion] : [], onPick: async (id) => {
      const m = await loadInputModules();
      cached.set(id, m.getEmotion(id)?.name || id);
      chosenEmotion = id; extraFeeling = id; rowMode = 'intent';
      tick(); renderFeelings(); renderIntentions(); updateSend(); setNote(); mirror();
      ta.focus({ preventScroll: true });
    } });
    trackSheet?.(sheet);
  }
  function tick() { app?.audio?.ui?.('select'); app?.haptic?.('light'); }
  async function mirror() {
    const m = await loadInputModules();
    const e = m.getEmotion(chosenEmotion);
    if (!e) return;
    // the stage's Mallow mirrors the chosen feeling (the scene passes its own adapter)
    if (face) face(e.face); else app?.world?.setEmotion(e.face, 0.6, { quiet: true });
  }

  // ----------------------------------------------------- notes --
  function showHint() {
    hintUntil = performance.now() + 6000;
    setNote();
    clearTimeout(hintT);
    hintT = setTimeout(() => { if (!closed) setNote(); }, 6100);
  }
  function setNote() {
    note.replaceChildren();
    const hinting = performance.now() < hintUntil;
    if (hinting) {
      note.append(hfIcon('mic'), h('span', {}, privacyNote
        ? `${coarse ? 'Tap the mic on your keyboard and just talk.' : 'Your device’s dictation works here too.'} ${privacyNote}`
        : coarse ? 'Tap the mic on your keyboard and just talk. Your words stay on this phone.'
          : 'Your device’s dictation works here too. Your words stay on this device.'));
    } else if (roomy() && !ta.value.trim() && !chosenEmotion && !photosOpen) {
      // said once, before anything is typed (the highlighted chips carry their own 'suggested' label)
      note.append(hfIcon('sparkle'), h('span', {}, privacyNote || 'Your words stay on this phone.'));
    }
    note.hidden = !note.firstChild;
  }

  // --------------------------------------------------- reading --
  let timer = 0;
  async function read() {
    const [m] = await Promise.all([loadInputModules(), loadGrief()]);
    if (closed) return;
    const t = ta.value;
    reading = t.trim() ? m.interpret(t) : null;
    safety = t.trim() ? readSafety(m, t, lossAware) : { level: 'none', category: null };
    // only confident matches are highlighted (typo-tolerant guesses stay quiet), never a positive feeling for words
    // that carry a safety cue (then nothing is suggested at all), never someone else's feeling, and beside a death or
    // a loss only the feelings that fit it (Grief, Sad): never "Rested" or "Obligated" after "there was no heartbeat"
    const loss = !!t.trim() && (safety.category === 'loss' || lossIn(t));
    heavyRow = heavy || loss || safety.level !== 'none';
    suggested = m.suggestedFeelings ? m.suggestedFeelings(reading, { loss, level: safety.level }) : (reading?.emotions || []).filter((e) => e.confidence >= 0.6).slice(0, 3).map((e) => e.id);
    for (const id of suggested) if (!cached.has(id)) cached.set(id, m.getEmotion(id)?.name || id);
    report(safety);
    if (safety.level === 'crisis' && !supportShown) { supportShown = true; openSupportSheet({ urgent: true }); }
    // once support has been needed it stays one tap away, even if the words change
    supportBtn.hidden = worst.level === 'none' && !heavy;
    plainSend();
    // (15 Oct 2026) words the risk screener reads as possibly at risk keep it one tap away too
    if (worst.check) supportBtn.hidden = false;
    renderFeelings(); renderIntentions(); setNote();
  }
  // the field grows a whole line at a time and stops on a line boundary, so a scrolled
  // field never shows half a line under its top border
  let metrics = null;
  function grow() {
    if (!metrics) {
      const cs = getComputedStyle(ta);
      const lh = parseFloat(cs.lineHeight) || 25;
      metrics = { lh, pad: (parseFloat(cs.paddingTop) || 0) + (parseFloat(cs.paddingBottom) || 0), bd: (parseFloat(cs.borderTopWidth) || 0) + (parseFloat(cs.borderBottomWidth) || 0) };
    }
    const { lh, pad, bd } = metrics;
    const max = Math.round((roomy() ? 4 : 3) * lh + pad + bd);
    ta.style.maxHeight = `${max}px`;
    ta.style.height = 'auto';
    // (the frame around it is the .field, which keeps its own padding)
    ta.style.height = `${Math.min(max, Math.max(Math.round(lh + pad + bd), ta.scrollHeight + bd))}px`;
  }
  function updateSend() {
    sendBtn.disabled = !(ta.value.trim() || chosenEmotion);
    const n = ta.value.length, left = MAX_CHARS - n;
    count.textContent = n > MAX_CHARS - 60 ? `${left} characters left` : '';
    countVis.hidden = n < COUNT_FROM;
    countVis.textContent = n >= COUNT_FROM ? (left > 0 ? `${left} left` : 'That’s the limit') : '';
    el.classList.toggle('counting', n >= COUNT_FROM);
  }
  let hadText = !!ta.value.trim();
  ta.addEventListener('input', () => {
    grow(); updateSend();
    const has = !!ta.value.trim();
    if (has !== hadText) { hadText = has; renderIntentions(); }
    clearTimeout(timer); timer = setTimeout(read, 260);
  });
  ta.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); submit(); }
  });
  // capture phase: Escape closes this overlay only, not the panel or sheet beneath it
  const onKey = (e) => { if (e.key === 'Escape' && !document.querySelector('.sheet.open')) { e.preventDefault(); e.stopPropagation(); close('escape'); } };
  document.addEventListener('keydown', onKey, true);

  // ------------------------------------------------------ photos --
  async function togglePhotos() {
    if (!photoBtn) return;
    photosOpen = !photosOpen;
    photoBtn.setAttribute('aria-expanded', String(photosOpen));
    if (photosOpen && !tray) {
      const [{ photoTray }, { photoSession }] = await Promise.all([import('../v3/tray.js'), import('../v3/photos.js')]);
      if (closed) return;
      tray = photoTray({ note: false });
      photosBox.append(tray.el, h('p', { class: 'note photo-note' }, hfIcon('camera'), h('span', {}, 'Up to seven. They stay on this phone and are cleared after.')));
      const label = () => {
        const n = photoSession.count;
        photoCount.hidden = !n;
        photoCount.textContent = n ? `${n}/${photoSession.max}` : '';
        photoBtn.setAttribute('aria-label', n ? `Photos: ${n} of ${photoSession.max}` : 'Add photos, up to seven');
      };
      label(); tray.offLabel = photoSession.onChange(label);
    }
    photosBox.hidden = !photosOpen;
    setNote();
    place();
  }

  // ------------------------------------------------- placement --
  function place() {
    if (closed) return;
    if (vv) {
      el.style.transform = vv.offsetTop > 0 ? `translateY(${Math.round(vv.offsetTop)}px)` : '';
      const top = el.getBoundingClientRect().top - (vv.offsetTop || 0);
      el.style.maxHeight = `${Math.max(180, Math.round(vv.height - Math.max(0, top) - 10))}px`;
    }
    onLayout?.(el.getBoundingClientRect());
  }
  const onViewport = () => { grow(); renderFeelings(); renderIntentions(); setNote(); place(); };
  vv?.addEventListener('resize', onViewport);
  vv?.addEventListener('scroll', place);
  // the scene keeps the Mallow below the overlay as it grows (photos, a second chip row, more lines)
  const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(() => onLayout?.(el.getBoundingClientRect())) : null;
  ro?.observe(el);

  // ------------------------------------------------------ submit --
  async function submit() {
    if (sending || closed || sendBtn.disabled) return;
    sending = true;
    const m = await loadInputModules();
    if (lossAware) await loadGrief();
    const t = ta.value.trim();
    reading = t ? m.interpret(t) : null;
    // (a grief-family feeling chosen counts as a loss, words or not)
    safety = t || chosenEmotion ? readSafety(m, t, lossAware, { emotion: chosenEmotion }) : { level: 'none', category: null };
    report(safety);
    if (safety.level === 'crisis' && !supportShown) { supportShown = true; openSupportSheet({ urgent: true }); }
    const intensity = reading?.emotions?.length ? reading.intensity : 0.6;
    const emotions = [];
    if (chosenEmotion) emotions.push({ id: chosenEmotion, confidence: 1, intensity });
    for (const e of reading?.emotions || []) if (e.confidence >= 0.6 && emotions.length < 4 && !emotions.some((x) => x.id === e.id)) emotions.push({ id: e.id, confidence: e.confidence, intensity: e.intensity ?? intensity });
    // the express shape every later scene already reads
    const input = { text: t, emotions, intensity, contexts: reading?.contexts || [], desires: reading?.desires || [],
      safety: { ...m.legacySafety(safety), detail: { level: safety.level, category: safety.category, ...(safety.unsure ? { unsure: true } : {}) } }, intention: chosenIntention, source: 'hushfold' };
    // (15 Oct 2026) the risk screener's check-in reading travels with it
    if (safety.check) input.safety.detail.check = true;
    if (app) app.state.input = input;
    close('submit');
    onSubmit?.({ text: t, emotion: chosenEmotion, intention: chosenIntention, reading, safety, input });
  }

  function close(reason = 'close') {
    if (closed) return;
    // words typed just before closing (inside the reading pause) are still checked
    if (reason !== 'submit' && modsNow && ta.value.trim()) { try { report(readSafety(modsNow, ta.value, lossAware)); } catch { /* the scene still has what was seen */ } }
    closed = true;
    clearTimeout(timer); clearTimeout(hintT);
    document.removeEventListener('keydown', onKey, true);
    vv?.removeEventListener('resize', onViewport);
    vv?.removeEventListener('scroll', place);
    ro?.disconnect();
    tray?.destroy?.(); tray?.offLabel?.();
    ta.blur();
    el.classList.add('out');
    setTimeout(() => el.remove(), reduced ? 160 : 300);
    if (reason !== 'submit' && opener?.isConnected) opener.focus?.({ preventScroll: true });
    onClose?.(reason, { safety: { ...worst }, supportShown });
  }

  renderFeelings(); renderIntentions(); setNote(); grow(); updateSend();
  // something heavy earlier in this visit: support is in the overlay from the start, and no plan offer
  if (heavy) { supportBtn.hidden = false; plainSend(); }
  loadInputModules().then((m) => {
    if (closed) return;
    if (extraFeeling) { cached.set(extraFeeling, m.getEmotion(extraFeeling)?.name || extraFeeling); renderFeelings(); }
    if (ta.value.trim()) read();
  }).catch(() => {});
  // focus now, inside the tap that opened the overlay, so the iPhone keyboard opens with it
  ta.focus({ preventScroll: true });
  requestAnimationFrame(() => place());

  return {
    el,
    close,
    rect: () => el.getBoundingClientRect(),
    get text() { return ta.value; },
    get dirty() { return ta.value.trim().length > 0; },
    get safety() { return safety; },
    /** The most serious level seen while open (sent or not). */
    get worst() { return { ...worst }; },
  };
}
