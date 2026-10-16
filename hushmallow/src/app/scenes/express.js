// EXPRESS — "What's happening in your head?"
// Type, tap or browse. The rule-based feeling finder only ever SUGGESTS;
// you pick what fits. The Mallow above mirrors your feelings as you go.
//
// (15 Oct 2026) The words are read the way the Hushfold's Tell reads them (encounter.js readWordsSafety: the lexicon, the
// grief rules and the risk screener) as they are typed: a crisis opens the urgent support sheet once, a heavy reading is
// kept for the visit (encounter.js noteVisitSafety), and beside a death or a loss only the feelings that fit it are
// suggested. "Meet a Mallow" hands the reading to the encounter, whose gate decides what comes first (support, the gentle
// response, the check-in or the ritual).
import { h, iconBtn, openSheet, say, clearBubble, fitMallow } from '../ui.js';
import { interpret, faceMix, suggestedFeelings } from '../../engine/interpret.js';
import { getEmotion, getFamily, FAMILIES, searchEmotions, azIndex, EMOTIONS } from '../../data/emotions.js';
import { MALLOWS } from '../../mallows/registry.js';
import { openSupport } from './support.js';
import { photoTray } from '../../v3/tray.js';
import { warmMallowCards } from '../../v3/mallow-cards.js';
import { type, withBrand } from '../../ui/type.js';
import { legacySafety } from '../../engine/safety.js';
import { readWordsSafety, noteVisitSafety } from './encounter.js';

const LEVELS = ['none', 'concern', 'care', 'crisis'];

export default function express(app, params = {}) {
  const { world } = app;
  const m = MALLOWS[world.mallowId || 'noomi'];
  const sel = new Map();        // id -> {id, confidence, source}
  let reading = null;
  let intensity = 0.6;
  let supportShown = false;
  let safety = { level: 'none', category: null };   // the main screen's reading of the words (readWordsSafety)
  let readSeq = 0, going = false, left = false;

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

  // (the top bar is not in the scroller: on a short phone, or at a large text size, the card is taller than the screen,
  // and "Need support now?" stays in reach while it scrolls; only the space and the card below the bar scroll, so
  // nothing passes under it, and where the card fits it lays out as it always did)
  const el = h('div', { class: 'express', style: { display: 'flex', flexDirection: 'column', height: '100%' } },
    h('div', { class: 'topbar' }, iconBtn('back', 'Back', () => app.back()), h('div', { class: 'grow' }),
      h('button', { class: 'btn ghost', onclick: () => openSupport(app) }, 'Need support now?')),
    h('div', { class: 'express-scroll', style: { display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: '0', overflowY: 'auto' } },
      h('div', { class: 'spacer', style: { minHeight: '22dvh' } }),
      h('div', { class: 'card express-card', style: { padding: '16px' } },
        h('h1', { class: 'title express-q', style: { marginBottom: '12px' } }, 'What’s happening in your head?'),
        ta,
        // (dictation is the keyboard's: where it listens follows the phone's own settings, so only what this app does is promised)
        h('p', { class: 'muted tip', style: { margin: '6px 2px 0' } }, ...withBrand('Tip: tap the mic on your keyboard to talk instead. hushmallow keeps your words on this phone. Your keyboard’s dictation follows your phone’s settings.')),
        tray.el,
        ack, sugg,
        // (44 px to a finger, as every ghost button; the gap below gives the 4 px back, so the card is no taller)
        h('button', { class: 'btn ghost', style: { padding: '0 4px' }, onclick: () => openExplorer() }, 'Browse every feeling A–Z →'),
        h('div', { style: { marginTop: '2px' } }, chosen),
        h('div', { style: { display: 'flex', alignItems: 'center', gap: '10px', marginTop: '10px' } },
          h('span', { style: type('label', { fontWeight: '700', flex: '0 0 auto' }) }, 'How big?'), level, levelLabel),
        h('div', { style: { marginTop: '12px' } }, go))));

  let t = 0;
  ta.addEventListener('input', () => { clearTimeout(t); t = setTimeout(read, 260); });
  level.addEventListener('input', () => { intensity = Number(level.value); levelLabel.textContent = intensity < 0.35 ? 'A little' : intensity < 0.7 ? 'Medium' : intensity < 0.9 ? 'Big' : 'Huge'; mirror(); });
  go.addEventListener('click', proceed);

  function read() {
    const text = ta.value;
    reading = interpret(text);
    // (the lexicon at once, then the main screen's whole reading as soon as it has loaded: words read the same everywhere)
    seen({ level: reading.safety.detail?.level || reading.safety.level, category: reading.safety.detail?.category ?? null });
    ack.textContent = text.trim() ? reading.acknowledgement : 'Type a little, or tap a feeling.';
    choose();
    if (reading.emotions.length && !level.dataset.touched) { intensity = reading.intensity; level.value = intensity; level.dispatchEvent(new Event('input')); }
    render();
    const seq = ++readSeq;
    if (!text.trim()) { safety = { level: 'none', category: null }; return; }
    readWordsSafety({ text, emotions: [...sel.values()].filter((s) => s.source !== 'auto') }).then((r) => {
      if (!r || left || seq !== readSeq) return;
      // (the chips follow the reading both ways: heavier words narrow them, lighter ones give them back)
      const key = (s) => `${s.level}|${s.category}|${!!s.check}|${!!s.deathCare}`;
      const changed = key(r) !== key(safety);
      safety = r;
      seen(r);
      if (changed) { choose(); render(); }
    });
  }
  /** A reading seen while typing (sent or not, as on the main screen): crisis opens the urgent sheet once; anything heavy is kept for the visit. */
  function seen(r) {
    if (!r || LEVELS.indexOf(r.level) < 1) return;
    noteVisitSafety(app, r);
    if (r.level === 'crisis' && !supportShown) { supportShown = true; openSupport(app, { urgent: true }); }
  }
  /**
   * Confident matches are pre-selected but always removable. Beside a death or a loss only the feelings that fit it
   * (grief, sadness, and any stated feeling that fits a loss: interpret.js suggestedFeelings), and beside any other safety
   * cue never a pleasant one: never "Rested" for "there was no heartbeat. I should have rested more".
   */
  function choose() {
    for (const [k, v] of sel) if (v.source === 'auto') sel.delete(k);
    const loss = safety.category === 'loss' || !!safety.deathCare;
    const cue = loss || safety.level !== 'none' || !!safety.check;
    const ok = cue ? new Set(suggestedFeelings(reading, { loss, level: safety.level === 'none' ? (safety.check ? 'concern' : null) : safety.level, max: 4 })) : null;
    for (const e of reading?.emotions || []) {
      if (e.confidence >= 0.6 && sel.size < 4 && !sel.has(e.id) && (!ok || ok.has(e.id))) sel.set(e.id, { id: e.id, confidence: e.confidence, source: 'auto' });
    }
  }
  /** The suggestion chips: beside a loss, the feelings that fit it first; beside any other cue, never a pleasant one. */
  function suggestionIds() {
    const loss = safety.category === 'loss' || !!safety.deathCare;
    if (loss) return suggestedFeelings(reading, { loss: true, max: 6 });
    const all = (reading?.suggestions || []).map((s) => s.id);
    if (safety.level === 'none' && !safety.check && (reading?.safety?.level || 'none') === 'none') return all;
    return all.filter((id) => (getEmotion(id)?.valence ?? 0) <= 0);
  }
  level.addEventListener('pointerdown', () => { level.dataset.touched = '1'; });

  function render() {
    const ids = suggestionIds().filter((id) => !sel.has(id)).slice(0, 6);
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

  async function proceed() {
    if (going) return;
    going = true; go.disabled = true;
    const text = ta.value.trim();
    const emotions = [...sel.values()].map((s) => ({ id: s.id, confidence: s.confidence, intensity }));
    reading = interpret(text);
    // the main screen's reading of these words and these feelings (a grief feeling chosen counts as a loss); the
    // encounter reads them again whatever it is handed, so a reading that could not load here is still made there
    const r = await readWordsSafety({ text, emotions });
    if (left) return;
    const detail = r || { level: reading.safety.detail?.level || reading.safety.level || 'none', category: reading.safety.detail?.category ?? null };
    // (kept for the visit; a crisis not yet answered with the support sheet gets it on the next screen, which a scene change
    // would otherwise close at once)
    noteVisitSafety(app, detail);
    // (the check-in or the question already answered for these very words: not asked twice)
    const answeredFor = app.state.input?.answeredFor === text ? text : undefined;
    app.state.input = { text, emotions, intensity, contexts: reading?.contexts || [], desires: reading?.desires || [],
      safety: { ...legacySafety(detail), detail: { ...detail } }, source: 'express', ...(answeredFor ? { answeredFor } : {}), ...(supportShown ? { supportShown: true } : {}) };
    app.audio.ui('whoosh');
    going = false;
    app.go('encounter');
  }

  return {
    el, title: 'What’s on your mind',
    enter() {
      world.dim(true);
      world.setStage('listening');
      // the Mallow listens from the open space above the card; on short
      // phones there is none, so it steps aside rather than sit behind the text
      requestAnimationFrame(() => {
        const top = el.querySelector('.topbar')?.getBoundingClientRect().bottom ?? 60;
        const cardTop = el.querySelector('.express-card')?.getBoundingClientRect().top ?? innerHeight * 0.3;
        const shown = fitMallow(world, top + 6, cardTop - 6, { maxScale: 0.5, minPx: 76 });
        if (shown) setTimeout(() => say(world, m.voice.listen[0], { who: m.name, ms: 2600, above: false }), 500);
      });
      if (params.text) read(); else render();
      if (!matchMedia('(pointer: coarse)').matches) ta.focus();
    },
    leave() { left = true; clearBubble(); tray.destroy(); world.showMallow(true); },
  };
}
