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
//               hasPlan, face(faceMix), onSubmit({text, emotion, intention, reading, safety, input}),
//               onClose(reason, {safety, supportShown}), onLayout(rect), onSafety(result), support(opts), trackSheet(sheet) })
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
export function loadInputModules() {
  mods ||= Promise.all([import('../engine/interpret.js'), import('../engine/safety.js'), import('../data/emotions.js')])
    .then(([interpretMod, safety, emotions]) => (modsNow = { interpret: interpretMod.interpret, checkText: safety.checkText, legacySafety: safety.legacySafety, getEmotion: emotions.getEmotion }));
  return mods;
}

export function openInput({ app, prompt = 'Want to tell me?', mallow = {}, root = document.body, emotion = null, intention = null, hasPlan = true,
  text = '', face = null, onSubmit, onClose, onLayout, onSafety = null, support = null, trackSheet = null } = {}) {
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
  let suggested = [];
  let reading = null, safety = { level: 'none', category: null };
  // the most serious level seen while this overlay was open (sent or not): the scene acts on it
  let worst = { level: 'none', category: null };
  function report(r) {
    if (!r || LEVELS.indexOf(r.level) <= LEVELS.indexOf(worst.level)) return;
    worst = { level: r.level, category: r.category };
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
  const photoBtn = h('button', { class: 'hf-ghost photo', type: 'button', 'aria-expanded': 'false', 'aria-label': 'Add photos, up to seven', onclick: () => togglePhotos() },
    hfIcon('camera'), h('span', { class: 't' }, 'Photos'), photoCount);
  // no plan: Continue says where it goes inside the button itself (no extra line in the overlay)
  const sendBtn = h('button', { class: `hf-send${hasPlan ? '' : ' two'}`, type: 'button', disabled: true, onclick: () => submit(), 'aria-describedby': hasPlan ? null : `${uid}-plan` },
    hasPlan ? 'Send' : h('span', { class: 'lbl' }, 'Continue', h('small', { class: 'sub' }, 'with ', h('span', { class: 'brand-name' }, 'hushmallow'), ' Flow')), hfIcon('send'));
  const photosBox = h('div', { class: 'photos', hidden: true });
  const planHint = hasPlan ? null : h('span', { class: 'sr-only', id: `${uid}-plan` }, 'Your words come alive as a Thought Mallow with hushmallow Flow. They stay on this phone.');
  const count = h('span', { class: 'sr-only', 'aria-live': 'polite' });
  const countVis = h('span', { class: 'count-vis', 'aria-hidden': 'true', hidden: true });
  const el = h('div', { class: `hf-input hf-ui${reduced ? ' reduced' : ''}${bigText ? ' big' : ''}`, role: 'dialog', 'aria-modal': 'false', 'aria-label': prompt, 'data-hf': 'input' },
    h('div', { class: 'head' },
      h('p', { class: 'prompt' }, mallow.name ? h('span', { class: 'who', style: mallow.glow ? { '--hf-who': mallow.glow } : null }, mallow.name, h('span', { class: 'sr-only' }, ': ')) : null, prompt),
      h('button', { class: 'close', type: 'button', 'aria-label': 'Close', onclick: () => close('button') }, hfIcon('close'))),
    h('div', { class: 'field' }, ta, micBtn),
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
    // what the words suggest comes first (highlighted, never chosen for them), then the rest
    const first = [...suggested.filter((id) => QUICK_IDS.has(id)), ...extra];
    const rest = QUICK_FEELINGS.map(([id]) => id).filter((id) => !first.includes(id));
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
      note.append(hfIcon('mic'), h('span', {}, coarse ? 'Tap the mic on your keyboard and just talk. Your words stay on this phone.'
        : 'Your device’s dictation works here too. Your words stay on this device.'));
    } else if (roomy() && !ta.value.trim() && !chosenEmotion && !photosOpen) {
      // said once, before anything is typed (the highlighted chips carry their own 'suggested' label)
      note.append(hfIcon('sparkle'), h('span', {}, 'Your words stay on this phone.'));
    }
    note.hidden = !note.firstChild;
  }

  // --------------------------------------------------- reading --
  let timer = 0;
  async function read() {
    const m = await loadInputModules();
    if (closed) return;
    const t = ta.value;
    reading = t.trim() ? m.interpret(t) : null;
    safety = t.trim() ? m.checkText(t) : { level: 'none', category: null };
    // only confident matches are highlighted (typo-tolerant guesses stay quiet)
    suggested = (reading?.emotions || []).filter((e) => e.confidence >= 0.6).slice(0, 3).map((e) => e.id);
    for (const id of suggested) if (!cached.has(id)) cached.set(id, m.getEmotion(id)?.name || id);
    report(safety);
    if (safety.level === 'crisis' && !supportShown) { supportShown = true; openSupportSheet({ urgent: true }); }
    // once support has been needed it stays one tap away, even if the words change
    supportBtn.hidden = worst.level === 'none';
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
    ta.style.height = `${Math.min(max, Math.max(50, ta.scrollHeight + bd))}px`;
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
    const t = ta.value.trim();
    reading = t ? m.interpret(t) : null;
    safety = t ? m.checkText(t) : { level: 'none', category: null };
    report(safety);
    if (safety.level === 'crisis' && !supportShown) { supportShown = true; openSupportSheet({ urgent: true }); }
    const intensity = reading?.emotions?.length ? reading.intensity : 0.6;
    const emotions = [];
    if (chosenEmotion) emotions.push({ id: chosenEmotion, confidence: 1, intensity });
    for (const e of reading?.emotions || []) if (e.confidence >= 0.6 && emotions.length < 4 && !emotions.some((x) => x.id === e.id)) emotions.push({ id: e.id, confidence: e.confidence, intensity: e.intensity ?? intensity });
    // the express shape every later scene already reads
    const input = { text: t, emotions, intensity, contexts: reading?.contexts || [], desires: reading?.desires || [],
      safety: { ...m.legacySafety(safety), detail: { level: safety.level, category: safety.category } }, intention: chosenIntention, source: 'hushfold' };
    if (app) app.state.input = input;
    close('submit');
    onSubmit?.({ text: t, emotion: chosenEmotion, intention: chosenIntention, reading, safety, input });
  }

  function close(reason = 'close') {
    if (closed) return;
    // words typed just before closing (inside the reading pause) are still checked
    if (reason !== 'submit' && modsNow && ta.value.trim()) { try { report(modsNow.checkText(ta.value)); } catch { /* the scene still has what was seen */ } }
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
