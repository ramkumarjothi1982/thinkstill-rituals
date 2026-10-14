// FEATURE 2 — Comfort DNA: a Mallow that remembers what you enjoy.
// Every saved choice is visible and editable here, with a live preview Mallow
// that shows what a change does. Personalisation is optional and reversible:
// switch it off, reset it, delete the history, or delete everything.

import { h, iconBtn, segmented } from '../lab-ui.js';
import { Companion } from '../core/companion.js';
import { PALETTES, COMFORTS, describeTune } from '../core/comfort-dna.js';
import { MALLOWS, MALLOW_IDS } from '../../src/mallows/registry.js';
import { REALMS, REALM_IDS } from '../../src/world/realm.js';
import { MATERIALS } from '../core/materials.js';
import { pocketById } from './pocket/catalog.js';

export const meta = { id: 'comfort-dna', title: 'Comfort DNA' };

const COMFORT_LABELS = { squeeze: 'Squeezing', hold: 'Holding', stroke: 'Stroking', breathe: 'Breathing', glow: 'Soft light', float: 'Letting go', quiet: 'Quiet' };

export function mount(root, ctx) {
  const { dna } = ctx;
  const screen = h('section', { class: 'screen home dna', 'aria-label': 'Comfort DNA' });
  const inner = h('div', { class: 'home-inner' });
  screen.append(inner);
  root.append(screen);
  let companion = null;
  const hero = h('div', { class: 'dna-hero', role: 'img' });

  const mountPreview = () => {
    companion?.destroy();
    hero.replaceChildren();
    hero.setAttribute('aria-label', `${MALLOWS[ctx.mallowId].name}, showing your settings`);
    companion = new Companion(hero, { mallowId: ctx.mallowId, material: ctx.prefs.get('material'), quality: ctx.quality, sound: ctx.sound, prefs: ctx.prefs, rig: { fit: 0.6, baseline: 0.92 } });
    companion.applyTuning(dna.tuning());
    ctx.setCompanion(companion);
  };
  // let the person feel a change: the preview answers a tap with the new settings
  const demo = () => setTimeout(() => companion?.act('tap'), 60);

  const row = (label, ctl, sub) => h('div', { class: 'row' }, h('span', { class: 'lbl' }, label, sub ? h('span', { class: 'sub' }, sub) : null), ctl);
  const stack = (label, ctl, sub) => h('div', { class: 'row stack' }, h('span', { class: 'lbl' }, label, sub ? h('span', { class: 'sub' }, sub) : null), ctl);
  const section = (title, ...kids) => h('section', { class: 'dna-sec', 'aria-label': title }, h('h3', {}, title), ...kids);
  const pills = (items, isOn, onPick, label, multi = false) => {
    const wrap = h('div', { class: 'pills', role: 'group', 'aria-label': label });
    const btns = items.map(([v, text, attrs = {}]) => h('button', {
      type: 'button', 'aria-pressed': String(isOn(v)), 'data-value': String(v), ...attrs,
      onclick: () => { onPick(v); for (const [i, b] of btns.entries()) b.setAttribute('aria-pressed', String(isOn(items[i][0]))); },
    }, text));
    wrap.append(...btns);
    return wrap;
  };
  const choose = (k) => (v) => { dna.set(k, v); demo(); };

  // rebuilding the screen keeps keyboard focus on the same control, or on its section if it went away
  function render() {
    const el = document.activeElement;
    const key = el && inner.contains(el) ? {
      id: el.id, label: el.getAttribute('aria-label'), text: el.textContent,
      group: el.closest('[role="group"],[role="radiogroup"]')?.getAttribute('aria-label'),
      section: el.closest('section.dna-sec')?.getAttribute('aria-label'),
    } : null;
    build();
    if (!key) return;
    const groupOf = (c) => c.closest('[role="group"],[role="radiogroup"]')?.getAttribute('aria-label');
    const all = [...inner.querySelectorAll('button, input, summary')];
    let target = (key.id && inner.querySelector('#' + CSS.escape(key.id)))
      || (key.group && all.find((c) => groupOf(c) === key.group && c.textContent === key.text))
      || (key.label && all.find((c) => c.getAttribute('aria-label') === key.label))
      || [...inner.querySelectorAll('section.dna-sec')].find((x) => x.getAttribute('aria-label') === key.section)?.querySelector('h3')
      || inner.querySelector('h1');
    if (target.matches('h1, h3')) target.tabIndex = -1;
    target.focus({ preventScroll: true });
  }

  function build() {
    inner.replaceChildren();
    const on = dna.enabled;
    const view = dna.view();
    const favs = view.favourites;
    const hist = view.history.filter((x) => x.kind !== 'experience');
    inner.append(
      h('div', { class: 'brand' },
        iconBtn('back', 'Back to the Sensory Lab', () => ctx.navigate('/')),
        h('h1', {}, 'Comfort DNA'),
        h('span', { class: 'pill' }, on ? 'On' : 'Off')),
      hero,
      h('p', { class: 'dna-lede' }, 'What your Mallow remembers about what you enjoy. ', h('b', {}, view.where.where), '.'),
      section('Personalisation',
        row('Personalise my Mallow', segmented([[true, 'On'], [false, 'Off']], on, (v) => { dna.setEnabled(v); render(); mountPreview(); }, 'Personalise my Mallow'),
          on ? 'Your choices below shape every experience' : 'Off: every experience uses the standard settings. Your choices stay saved until you delete them.')),
      section('Your Mallow',
        stack('Favourite', pills(MALLOW_IDS.map((id) => [id, MALLOWS[id].name]), (v) => v === dna.chosen('favouriteMallow'),
          (v) => { dna.set('favouriteMallow', v); if (dna.enabled) { ctx.setMallow(v); mountPreview(); } }, 'Favourite Mallow'))),
      section('How it responds',
        row('Responses', segmented([['gentle', 'Gentle'], ['balanced', 'Balanced'], ['playful', 'Playful']], dna.chosen('responses'), choose('responses'), 'Responses'), 'Gentle: smaller, slower, no jumps'),
        row('Animation', segmented([['slower', 'Slower'], ['natural', 'Natural'], ['livelier', 'Livelier']], dna.chosen('animationSpeed'), choose('animationSpeed'), 'Animation speed'), 'Also sets the Soft Breath pace'),
        row('Movement', segmented([['soft', 'Soft'], ['normal', 'Normal'], ['bouncy', 'Bouncy']], dna.chosen('motion'), choose('motion'), 'Movement'), 'How much touches move it')),
      section('Sound',
        row('Mallow voice', segmented([[true, 'On'], [false, 'Off']], dna.chosen('voice'), choose('voice'), 'Mallow voice')),
        row('Touch sounds', segmented([[true, 'On'], [false, 'Off']], dna.chosen('touchSounds'), choose('touchSounds'), 'Touch sounds'), 'Squish, stretch, breath, bubbles'),
        row('Volume', h('input', { type: 'range', id: 'dna-volume', min: '0', max: '1', step: '0.05', value: String(ctx.prefs.get('volume')), 'aria-label': 'Volume',
          oninput: (e) => ctx.prefs.set('volume', +e.target.value) }), 'Same as in Settings')),
      section('Look',
        stack('Colours', h('div', { class: 'swatches', role: 'group', 'aria-label': 'Colours' },
          ...[['mallow', `${MALLOWS[ctx.mallowId].name}'s own`, MALLOWS[ctx.mallowId].colours.glow], ...Object.entries(PALETTES).map(([k, p]) => [k, p.label, p.glow])]
            .map(([k, label, col]) => h('button', { type: 'button', class: 'swatch', 'aria-pressed': String(dna.chosen('colours') === k), 'data-value': k,
              onclick: (e) => { dna.set('colours', k); for (const b of e.currentTarget.parentNode.children) b.setAttribute('aria-pressed', String(b.dataset.value === k)); } },
            h('span', { class: 'dot', style: { background: col } }), label))), 'Glows, light and floating things'),
        stack('Behind your Mallow', pills([['auto', 'Automatic'], ['stage', 'Plain stage'], ...REALM_IDS.map((id) => [id, REALMS[id].name.replace(/^The /, '')])],
          (v) => v === dna.chosen('environment'), (v) => dna.set('environment', v), 'Environment'),
        'Automatic: your Mallow\'s own world where an experience has one; a plain stage elsewhere')),
      section('What helps',
        stack('Pick any', pills(COMFORTS.map((c) => [c, COMFORT_LABELS[c]]), (v) => dna.chosen('comfort').includes(v), (v) => {
          const cur = dna.chosen('comfort');
          dna.set('comfort', cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v]);
        }, 'What helps', true), 'Pocket Hush offers these first, and Surprise Me leans towards them')),
      section('Favourites',
        favs.length
          ? h('ul', { class: 'dna-list' }, ...favs.map((f) => h('li', {}, h('span', {}, describe(f)),
            h('button', { type: 'button', class: 'btn-quiet', 'aria-label': `Remove ${describe(f)}`, onclick: () => { dna.toggleFavourite(f); render(); } }, 'Remove'))))
          : h('p', { class: 'dna-empty' }, 'Nothing kept yet. Tap ★ Keep in SoftBody Lab, at the end of a Pocket Hush moment, or in Hushbeat.')),
      section('Learning',
        row('Learn from what I use', segmented([[true, 'On'], [false, 'Off']], view.learning === 'on', (v) => { dna.setLearning(v); render(); }, 'Learn from what I use'),
          'Counts which moments and materials you open. Never what you feel or type.'),
        hist.length
          ? h('ul', { class: 'dna-list' }, ...hist.slice(0, 6).map((x) => h('li', {}, h('span', {}, describe(x)), h('span', { class: 'sub' }, `${x.n}×`))))
          : h('p', { class: 'dna-empty' }, view.learning === 'on' ? 'Nothing learned yet.' : 'Off. Nothing is being counted.'),
        hist.length ? h('button', { type: 'button', class: 'btn-quiet', id: 'dna-delete-history', onclick: () => { dna.deleteHistory(); render(); } }, 'Delete history') : null),
      section('Privacy',
        h('details', { class: 'dna-view' }, h('summary', {}, 'View everything saved'), h('dl', {}, ...savedList(view))),
        h('div', { class: 'dna-actions' },
          h('button', { type: 'button', class: 'btn-quiet', id: 'dna-reset', onclick: () => { dna.resetPreferences(); render(); mountPreview(); } }, 'Reset my settings'),
          twoStep('Delete everything', 'Tap again to delete', async () => { await dna.deleteAll(); render(); mountPreview(); })),
        h('p', { class: 'dna-empty' }, 'hushmallow is a companion, not therapy. Comfort DNA never stores what you feel, and nothing here leaves this browser.')),
    );
    hero.hidden = false;
  }

  function describe(it) {
    if (it.kind === 'pocket') return pocketById(it.id)?.title || it.id;
    if (it.kind === 'softbody') return `${MALLOWS[it.mallow]?.name || 'Your Mallow'} as ${MATERIALS[it.material]?.label || it.material}`;
    if (it.kind === 'hushbeat') return describeTune(it);
    return it.id;
  }

  function savedList(view) {
    const out = [];
    const add = (k, v) => out.push(h('dt', {}, k), h('dd', {}, v));
    add('Where', view.where.where);
    add('Personalisation', view.personalisation);
    add('Learning', view.learning);
    const c = view.chosen;
    add('Favourite Mallow', MALLOWS[c.favouriteMallow].name);
    add('Responses / animation / movement', `${c.responses} / ${c.animationSpeed} / ${c.motion}`);
    add('Voice / touch sounds', `${c.voice ? 'on' : 'off'} / ${c.touchSounds ? 'on' : 'off'}`);
    add('Colours', c.colours);
    add('Environment', c.environment);
    add('What helps', c.comfort.length ? c.comfort.map((x) => COMFORT_LABELS[x]).join(', ') : 'none chosen');
    add('Favourites', view.favourites.length ? view.favourites.map(describe).join(', ') : 'none');
    add('History', view.history.length ? view.history.map((x) => `${describe(x)} ${x.n}×`).join(', ') : 'none');
    return out;
  }

  function twoStep(label, again, act) {
    let armed = false, timer = 0;
    const b = h('button', { type: 'button', class: 'btn-quiet danger', id: 'dna-delete-all', onclick: () => {
      if (!armed) { armed = true; b.textContent = again; timer = setTimeout(() => { armed = false; b.textContent = label; }, 4000); return; }
      clearTimeout(timer); act();
    } }, label);
    return b;
  }

  render();
  mountPreview();
  const off = dna.onChange((what) => { if (what === 'colours' || what === 'environment' || what === 'comfort') return; companion?.applyTuning(dna.tuning()); });
  return {
    unmount() { off(); companion?.destroy(); if (ctx.companion === companion) ctx.setCompanion(null); screen.remove(); },
  };
}
