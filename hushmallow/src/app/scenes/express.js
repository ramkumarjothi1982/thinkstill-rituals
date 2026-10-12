// EXPRESS — "What's happening in your head?"
// Type, tap or browse. The rule-based feeling finder only ever SUGGESTS;
// you pick what fits. The Mallow above mirrors your feelings as you go.
import { h, iconBtn, openSheet, say, clearBubble } from '../ui.js';
import { interpret, faceMix } from '../../engine/interpret.js';
import { getEmotion, getFamily, FAMILIES, searchEmotions, azIndex, EMOTIONS } from '../../data/emotions.js';
import { MALLOWS } from '../../mallows/registry.js';
import { openSupport } from './support.js';
import { photoTray } from '../../v3/tray.js';
import { warmMallowCards } from '../../v3/mallow-cards.js';
import { type } from '../../ui/type.js';

export default function express(app, params = {}) {
  const { world } = app;
  const m = MALLOWS[world.mallowId || 'noomi'];
  const sel = new Map();        // id -> {id, confidence, source}
  let reading = null;
  let intensity = 0.6;
  let supportShown = false;

  if (params.preset && getEmotion(params.preset)) sel.set(params.preset, { id: params.preset, confidence: 1, source: 'tap' });
  if (app.state.input?.text && params.keep) params.text = app.state.input.text;

  const ta = h('textarea', { class: 'feel', placeholder: 'e.g. “I’m furious about what happened at work.”', 'aria-label': 'What’s happening in your head?', maxlength: '600' });
  if (params.text) ta.value = params.text;
  const ack = h('p', { class: 'muted', style: { margin: '10px 2px 8px', minHeight: '19px' }, 'aria-live': 'polite' }, 'Type a little, or tap a feeling.');
  const sugg = h('div', { class: 'chips', role: 'group', 'aria-label': 'Suggested feelings' });
  const chosen = h('div', { class: 'chips', role: 'group', 'aria-label': 'Feelings you picked' });
  const level = h('input', { type: 'range', class: 'range', min: 0.1, max: 1, step: 0.01, value: intensity, 'aria-label': 'How big is it?' });
  const levelLabel = h('span', { class: 'muted' }, 'Medium');
  const go = h('button', { class: 'btn primary block', disabled: true }, 'Meet a Mallow');
  const tray = photoTray();
  warmMallowCards();             // ready in case no photos are added

  const el = h('div', { class: 'express', style: { display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto' } },
    h('div', { class: 'topbar' }, iconBtn('back', 'Back', () => app.back()), h('div', { class: 'grow' }),
      h('button', { class: 'btn ghost', style: { minHeight: '40px' }, onclick: () => openSupport(app) }, 'Need support now?')),
    h('div', { class: 'spacer', style: { minHeight: '22dvh' } }),
    h('div', { class: 'card', style: { padding: '16px' } },
      h('h1', { class: 'title express-q', style: { marginBottom: '12px' } }, 'What’s happening in your head?'),
      ta,
      h('p', { class: 'muted tip', style: { margin: '6px 2px 0' } }, 'Tip: tap the mic on your keyboard to talk instead. Your words stay on this phone.'),
      tray.el,
      ack, sugg,
      h('button', { class: 'btn ghost', style: { padding: '0 4px', minHeight: '40px' }, onclick: () => openExplorer() }, 'Browse every feeling A–Z →'),
      h('div', { style: { marginTop: '6px' } }, chosen),
      h('div', { style: { display: 'flex', alignItems: 'center', gap: '10px', marginTop: '10px' } },
        h('span', { style: type('label', { fontWeight: '700', flex: '0 0 auto' }) }, 'How big?'), level, levelLabel),
      h('div', { style: { marginTop: '12px' } }, go)));

  let t = 0;
  ta.addEventListener('input', () => { clearTimeout(t); t = setTimeout(read, 260); });
  level.addEventListener('input', () => { intensity = Number(level.value); levelLabel.textContent = intensity < 0.35 ? 'A little' : intensity < 0.7 ? 'Medium' : intensity < 0.9 ? 'Big' : 'Huge'; mirror(); });
  go.addEventListener('click', proceed);

  function read() {
    reading = interpret(ta.value);
    if (reading.safety.level === 'crisis' && !supportShown) { supportShown = true; openSupport(app, { urgent: true }); }
    ack.textContent = ta.value.trim() ? reading.acknowledgement : 'Type a little, or tap a feeling.';
    // confident matches are pre-selected but always removable
    for (const [k, v] of sel) if (v.source === 'auto') sel.delete(k);
    for (const e of reading.emotions) if (e.confidence >= 0.6 && sel.size < 4 && !sel.has(e.id)) sel.set(e.id, { id: e.id, confidence: e.confidence, source: 'auto' });
    if (reading.emotions.length && !level.dataset.touched) { intensity = reading.intensity; level.value = intensity; level.dispatchEvent(new Event('input')); }
    render();
  }
  level.addEventListener('pointerdown', () => { level.dataset.touched = '1'; });

  function render() {
    const ids = (reading?.suggestions || []).map((s) => s.id).filter((id) => !sel.has(id)).slice(0, 6);
    sugg.replaceChildren(...ids.map((id) => {
      const e = getEmotion(id);
      return h('button', { class: 'chip', 'aria-pressed': 'false', onclick: () => { toggle(id); } },
        h('span', { class: 'hue', style: { background: getFamily(e.family)?.hue } }), e.name);
    }));
    chosen.replaceChildren(...[...sel.values()].map(({ id }) => {
      const e = getEmotion(id);
      return h('button', { class: 'chip', 'aria-pressed': 'true', 'aria-label': `${e.name}, selected. Tap to remove.`, onclick: () => toggle(id) }, e.name, ' ×');
    }));
    go.disabled = sel.size === 0;
    mirror();
  }
  function toggle(id) {
    if (sel.has(id)) sel.delete(id);
    else sel.set(id, { id, confidence: 1, source: 'tap' });
    app.audio.ui('select');
    app.haptic('light');
    render();
  }
  function mirror() {
    if (!sel.size) { world.setStage('listening', { quiet: true }); return; }
    world.setEmotion(faceMix([...sel.values()].map((s) => ({ id: s.id, weight: 1 }))), intensity, { quiet: true });
  }

  function openExplorer() {
    const search = h('input', { class: 'search', type: 'search', placeholder: 'Search feelings (try “betrayed” or “fomo”)', 'aria-label': 'Search feelings', autofocus: true });
    let fam = null;
    const famRow = h('div', { class: 'fam-chips', role: 'group', 'aria-label': 'Feeling families' },
      h('button', { class: 'chip', 'aria-pressed': 'true', onclick: (e) => setFam(null, e.currentTarget) }, 'All'),
      ...FAMILIES.map((f) => h('button', { class: 'chip', 'aria-pressed': 'false', onclick: (e) => setFam(f.id, e.currentTarget) }, h('span', { class: 'hue', style: { background: f.hue } }), f.name)));
    const list = h('div', { role: 'list' });
    const row = (e) => h('button', { class: 'emo-row', role: 'listitem', 'aria-pressed': String(sel.has(e.id)), onclick: (ev) => { toggle(e.id); ev.currentTarget.setAttribute('aria-pressed', String(sel.has(e.id))); } },
      h('div', {}, h('div', { class: 'n' }, e.name), h('div', { class: 'b' }, e.blurb)), h('span', { class: 'tick', 'aria-hidden': 'true' }, '✓'));
    function draw() {
      const q = search.value.trim();
      if (q) { list.replaceChildren(...searchEmotions(q, { limit: 40 }).filter((e) => !fam || e.family === fam).map(row)); return; }
      const groups = azIndex().map((g) => ({ ...g, emotions: g.emotions.filter((e) => !fam || e.family === fam || (e.also || []).includes(fam)) })).filter((g) => g.emotions.length);
      list.replaceChildren(...groups.flatMap((g) => [h('div', { class: 'az-letter' }, g.letter), ...g.emotions.map(row)]));
    }
    function setFam(f, btn) { fam = f; famRow.querySelectorAll('.chip').forEach((c) => c.setAttribute('aria-pressed', String(c === btn))); draw(); }
    search.addEventListener('input', draw);
    draw();
    openSheet({ title: `Every feeling, A–Z`, full: true, body: h('div', {}, search, famRow, h('p', { class: 'muted', style: { margin: '2px 0 6px' } }, `${EMOTIONS.length} feelings and growing. Pick as many as fit.`), list),
      foot: h('button', { class: 'btn primary block', onclick: (e) => e.currentTarget.closest('.sheet').querySelector('.icon-btn').click() }, 'Done'),
      onClose: () => render() });
  }

  function proceed() {
    const emotions = [...sel.values()].map((s) => ({ id: s.id, confidence: s.confidence, intensity }));
    app.state.input = { text: ta.value.trim(), emotions, intensity, contexts: reading?.contexts || [], desires: reading?.desires || [], safety: reading?.safety || { level: 'none' } };
    app.audio.ui('whoosh');
    app.go('encounter');
  }

  return {
    el, title: 'What’s on your mind',
    enter() {
      world.dim(true);
      world.place({ x: 50, y: 15, scale: 0.5 });
      world.setStage('listening');
      setTimeout(() => say(world, m.voice.listen[0], { who: m.name, ms: 2600, above: false }), 500);
      if (params.text) read(); else render();
      if (!matchMedia('(pointer: coarse)').matches) ta.focus();
    },
    leave() { clearBubble(); tray.destroy(); },
  };
}
