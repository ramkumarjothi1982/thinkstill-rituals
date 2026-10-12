// The compact, temporary "tell me" overlay of the Hushfold.
//
// It appears only when the person chooses to answer (the reply chip under a
// subtitle, or the Tell pill), sits in the upper band so the iPhone keyboard
// never covers it (visualViewport), and closes as soon as they send. It is
// NOT a sheet: there is no backdrop, so the stage keeps working around it.
//
//   openInput({ app, prompt, mallow:{id,name,glow}, root, emotion, intention,
//               hasPlan, onSubmit({text, emotion, intention, reading, safety, input}),
//               onClose(reason) }) → { el, close(reason), get text, get dirty }
//
// Words: kept exactly as typed (trimmed at the ends), shown with textContent
// only, never stored. Feelings: the person picks; the rule-based finder only
// highlights chips as suggestions and never decides. Safety: every keystroke
// pause runs the shared detector (src/engine/safety.js); crisis opens the
// urgent support sheet once, care or distress shows a Support chip.

import { h } from '../app/ui.js';
import { openSupport } from '../app/scenes/support.js';
import { hfIcon } from './icons.js';
import { QUICK_FEELINGS, INTENTIONS } from './lines.js';

const QUICK_IDS = new Set(QUICK_FEELINGS.map(([id]) => id));
const MAX_CHARS = 600;
let mods = null;
/** interpret + safety + emotions, loaded on first use (kept out of the first second). */
export function loadInputModules() {
  mods ||= Promise.all([import('../engine/interpret.js'), import('../engine/safety.js'), import('../data/emotions.js')])
    .then(([interpretMod, safety, emotions]) => ({ interpret: interpretMod.interpret, checkText: safety.checkText, legacySafety: safety.legacySafety, getEmotion: emotions.getEmotion }));
  return mods;
}

export function openInput({ app, prompt = 'Want to tell me?', mallow = {}, root = document.body, emotion = null, intention = null, hasPlan = true,
  text = '', onSubmit, onClose } = {}) {
  const reduced = app?.prefs?.reducedMotion?.() ?? false;
  const coarse = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
  let chosenEmotion = emotion, chosenIntention = intention;
  let extraFeeling = emotion && !QUICK_IDS.has(emotion) ? emotion : null;  // a feeling from the A–Z list
  let suggested = [];
  let reading = null, safety = { level: 'none', category: null };
  let supportShown = false, closed = false, sending = false, photosOpen = false, tray = null;
  const opener = document.activeElement;

  const ta = h('textarea', { rows: '1', maxlength: String(MAX_CHARS), enterkeyhint: 'send', autocapitalize: 'sentences', autocomplete: 'off',
    spellcheck: 'true', placeholder: 'Type it how you’d say it…', 'aria-label': prompt });
  ta.value = text;
  const note = h('p', { class: 'note tip' });
  const feelRow = h('div', { class: 'hf-scroll', role: 'group', 'aria-label': 'How does it feel?' });
  const intentRow = h('div', { class: 'hf-scroll', role: 'group', 'aria-label': 'What would help?' });
  const supportBtn = h('button', { class: 'hf-ghost support', type: 'button', hidden: true, onclick: () => openSupport(app) }, hfIcon('support'), 'Support');
  const photoBtn = h('button', { class: 'hf-ghost', type: 'button', 'aria-expanded': 'false', onclick: () => togglePhotos() }, hfIcon('camera'), h('span', { class: 'n' }, 'Photos'));
  const sendBtn = h('button', { class: 'hf-send', type: 'button', disabled: true, onclick: () => submit() }, hasPlan ? 'Send' : 'Continue', hfIcon('send'));
  const photosBox = h('div', { class: 'photos', hidden: true });
  const planNote = hasPlan ? null : h('p', { class: 'plan-note' }, 'Your words come alive as a Thought Mallow with ', h('b', {}, 'hushmallow Flow'), '. Nothing is sent anywhere.');
  const count = h('span', { class: 'sr-only', 'aria-live': 'polite' });
  const el = h('div', { class: `hf-input hf-ui${reduced ? ' reduced' : ''}`, role: 'dialog', 'aria-modal': 'false', 'aria-label': prompt, 'data-hf': 'input' },
    h('div', { class: 'head' },
      h('p', { class: 'prompt' }, mallow.name ? h('span', { class: 'who', style: mallow.glow ? { color: mallow.glow } : null }, mallow.name) : null, prompt),
      h('button', { class: 'close', type: 'button', 'aria-label': 'Close', onclick: () => close('button') }, hfIcon('close'))),
    ta, note,
    h('div', { class: 'hf-row' }, h('span', { class: 'lbl', 'aria-hidden': 'true' }, 'Feeling'), feelRow),
    h('div', { class: 'hf-row' }, h('span', { class: 'lbl', 'aria-hidden': 'true' }, 'I’d like'), intentRow),
    photosBox, planNote,
    h('div', { class: 'actions' }, photoBtn, supportBtn, h('div', { class: 'grow' }), sendBtn), count);
  root.append(el);

  // --------------------------------------------------------- chips --
  function renderFeelings() {
    const extra = [];
    if (extraFeeling && !QUICK_IDS.has(extraFeeling)) extra.push(extraFeeling);
    for (const id of suggested) if (!QUICK_IDS.has(id) && !extra.includes(id) && extra.length < 2) extra.push(id);
    const name = (id) => cached.get(id) || id.replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase());
    feelRow.replaceChildren(
      ...extra.map((id) => chip(name(id), id === chosenEmotion, suggested.includes(id), () => pickFeeling(id))),
      ...QUICK_FEELINGS.map(([id, label]) => chip(label, id === chosenEmotion, suggested.includes(id), () => pickFeeling(id))),
      chip('Something else…', false, false, () => openPicker()));
  }
  const cached = new Map();
  function renderIntentions() {
    intentRow.replaceChildren(...INTENTIONS.map(([id, label]) => chip(label, id === chosenIntention, false, () => {
      chosenIntention = chosenIntention === id ? null : id; tick(); renderIntentions();
    })));
  }
  function chip(label, pressed, isSuggested, onclick) {
    return h('button', { class: `hf-opt${isSuggested ? ' suggested' : ''}`, type: 'button', 'aria-pressed': String(!!pressed),
      'aria-label': isSuggested && !pressed ? `${label} (suggested by your words)` : null, onclick }, label);
  }
  function pickFeeling(id) {
    chosenEmotion = chosenEmotion === id ? null : id;
    if (chosenEmotion && !QUICK_IDS.has(chosenEmotion)) extraFeeling = chosenEmotion;
    tick(); renderFeelings(); updateSend();
    if (chosenEmotion) mirror();
  }
  async function openPicker() {
    const [{ openEmotionPicker }] = await Promise.all([import('../app/emotion-picker.js'), loadInputModules()]);
    openEmotionPicker({ selected: chosenEmotion ? [chosenEmotion] : [], onPick: async (id) => {
      const m = await loadInputModules();
      cached.set(id, m.getEmotion(id)?.name || id);
      chosenEmotion = id; extraFeeling = id; tick(); renderFeelings(); updateSend(); mirror();
    } });
  }
  function tick() { app?.audio?.ui?.('select'); app?.haptic?.('light'); }
  async function mirror() {
    const m = await loadInputModules();
    const e = m.getEmotion(chosenEmotion);
    if (e && app?.world) app.world.setEmotion(e.face, 0.6, { quiet: true });
  }

  // --------------------------------------------------- reading --
  function setNote() {
    note.replaceChildren();
    if (suggested.length && !chosenEmotion) {
      note.append(hfIcon('sparkle'), h('span', {}, 'Highlighted feelings are only suggestions. Pick what fits, or none.'));
    } else if (coarse) {
      note.append(hfIcon('mic'), h('span', {}, 'Prefer talking? Tap the mic on your keyboard. Your words stay on this phone.'));
    } else {
      note.append(hfIcon('sparkle'), h('span', {}, 'Your words stay on this device. Nothing is sent anywhere.'));
    }
  }
  let timer = 0;
  async function read() {
    const m = await loadInputModules();
    if (closed) return;
    const t = ta.value;
    reading = t.trim() ? m.interpret(t) : null;
    safety = t.trim() ? m.checkText(t) : { level: 'none', category: null };
    suggested = (reading?.emotions || []).filter((e) => e.confidence >= 0.5).slice(0, 3).map((e) => e.id);
    for (const id of suggested) if (!cached.has(id)) cached.set(id, m.getEmotion(id)?.name || id);
    if (safety.level === 'crisis' && !supportShown) { supportShown = true; openSupport(app, { urgent: true }); }
    supportBtn.hidden = safety.level === 'none';
    renderFeelings(); setNote();
  }
  function grow() {
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(128, Math.max(52, ta.scrollHeight + 2))}px`;
  }
  function updateSend() {
    sendBtn.disabled = !(ta.value.trim() || chosenEmotion);
    const n = ta.value.length;
    count.textContent = n > MAX_CHARS - 60 ? `${MAX_CHARS - n} characters left` : '';
  }
  ta.addEventListener('input', () => { grow(); updateSend(); clearTimeout(timer); timer = setTimeout(read, 260); });
  ta.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); submit(); }
  });
  const onKey = (e) => { if (e.key === 'Escape') { e.preventDefault(); close('escape'); } };
  document.addEventListener('keydown', onKey);

  // ------------------------------------------------------ photos --
  async function togglePhotos() {
    photosOpen = !photosOpen;
    photoBtn.setAttribute('aria-expanded', String(photosOpen));
    if (photosOpen && !tray) {
      const { photoTray } = await import('../v3/tray.js');
      if (closed) return;
      tray = photoTray({ note: false });
      photosBox.append(tray.el, h('p', { class: 'note' }, hfIcon('camera'), h('span', {}, 'Up to seven, optional. They stay on this phone and are cleared afterwards.')));
      const { photoSession } = await import('../v3/photos.js');
      const label = () => { photoBtn.querySelector('.n').textContent = photoSession.count ? `Photos ${photoSession.count}/${photoSession.max}` : 'Photos'; };
      label(); tray.offLabel = photoSession.onChange(label);
    }
    photosBox.hidden = !photosOpen;
    place();
  }

  // ------------------------------------------------- placement --
  const vv = typeof visualViewport !== 'undefined' ? visualViewport : null;
  function place() {
    if (!vv || closed) return;
    el.style.transform = vv.offsetTop > 0 ? `translateY(${Math.round(vv.offsetTop)}px)` : '';
    const top = el.getBoundingClientRect().top - (vv.offsetTop || 0);
    el.style.maxHeight = `${Math.max(180, Math.round(vv.height - Math.max(0, top) - 10))}px`;
  }
  vv?.addEventListener('resize', place);
  vv?.addEventListener('scroll', place);

  // ------------------------------------------------------ submit --
  async function submit() {
    if (sending || closed || sendBtn.disabled) return;
    sending = true;
    const m = await loadInputModules();
    const t = ta.value.trim();
    reading = t ? m.interpret(t) : null;
    safety = t ? m.checkText(t) : { level: 'none', category: null };
    if (safety.level === 'crisis' && !supportShown) { supportShown = true; openSupport(app, { urgent: true }); }
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
    closed = true;
    clearTimeout(timer);
    document.removeEventListener('keydown', onKey);
    vv?.removeEventListener('resize', place);
    vv?.removeEventListener('scroll', place);
    tray?.destroy?.(); tray?.offLabel?.();
    ta.blur();
    el.classList.add('out');
    setTimeout(() => el.remove(), reduced ? 160 : 300);
    if (reason !== 'submit' && opener?.isConnected) opener.focus?.({ preventScroll: true });
    onClose?.(reason);
  }

  renderFeelings(); renderIntentions(); setNote(); grow(); updateSend();
  loadInputModules().then((m) => {
    if (closed) return;
    if (extraFeeling) { cached.set(extraFeeling, m.getEmotion(extraFeeling)?.name || extraFeeling); renderFeelings(); }
    if (ta.value.trim()) read();
  }).catch(() => {});
  requestAnimationFrame(() => { place(); ta.focus({ preventScroll: true }); });

  return {
    el,
    close,
    get text() { return ta.value; },
    get dirty() { return ta.value.trim().length > 0; },
    get safety() { return safety; },
  };
}
