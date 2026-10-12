// Mallow Emotion Studio — inspect and test every Mallow's living face.
//   studio.html                 interactive studio
//   studio.html?sheet=noomi     expression contact sheet for one Mallow
//   studio.html?sheet=all&emotion=angry   one emotion across all Mallows
import { MALLOWS, MALLOW_IDS } from '../mallows/registry.js';
import { MallowRig, prefersReducedMotion } from '../mallows/rig.js';
import { PRESET_IDS, STAGES } from '../mallows/expressions.js';

const qs = new URLSearchParams(location.search);
const app = document.getElementById('app');
const h = (tag, attrs = {}, ...kids) => {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (v === true) el.setAttribute(k, '');
    else if (v !== false && v != null) el.setAttribute(k, v);
  }
  for (const k of kids.flat()) if (k != null) el.append(k.nodeType ? k : document.createTextNode(k));
  return el;
};

let audio = null;
async function getAudio() {
  if (!audio) {
    try { const m = await import('../engine/audio.js'); audio = m.audio; } catch { audio = null; }
  }
  return audio;
}

let realmMod = null;
async function mountRealm(el, mallowId, emotion) {
  try {
    realmMod ||= await import('../world/realm.js');
    return realmMod.mountRealm(el, MALLOWS[mallowId].realm, { emotion });
  } catch (e) {
    el.style.background = `radial-gradient(120% 90% at 50% 100%, ${MALLOWS[mallowId].colours.glow}55, #120e2c 70%)`;
    return null;
  }
}

// ------------------------------------------------------- contact sheet --
if (qs.get('sheet')) {
  const which = qs.get('sheet');
  const intensity = Number(qs.get('i') || 0.85);
  const bg = qs.get('bg') || '#14112e';
  document.body.style.background = bg;
  const cell = Number(qs.get('cell') || 150);
  const sheet = h('div', { class: 'sheet', style: `--sheet-bg:${bg};grid-template-columns:repeat(auto-fill,minmax(${cell}px,1fr))` });
  document.head.append(h('style', {}, `.sheet .cell{height:${Math.round(cell * 1.13)}px}`));
  app.append(sheet);
  const cells = [];
  const ids = which === 'all' ? MALLOW_IDS : [which];
  const emos = qs.get('emotion') ? qs.get('emotion').split(',') : PRESET_IDS;
  for (const id of ids) {
    if (qs.get('orig') !== '0') {
      const c = h('div', { class: 'cell orig' }, h('b', {}, `${MALLOWS[id].name} · approved`));
      const img = h('img', { src: MALLOWS[id].file, alt: '', style: 'position:absolute;inset:14% 18% 10%;width:64%;height:76%;object-fit:contain' });
      c.append(img);
      sheet.append(c);
    }
    for (const e of emos) {
      const c = h('div', { class: 'cell' }, h('b', {}, `${MALLOWS[id].name} · ${e}`));
      sheet.append(c);
      cells.push([c, id, e]);
    }
  }
  for (const [c, id, e] of cells) {
    const rig = new MallowRig(c, { id, interactive: false, reducedMotion: qs.get('rm') === '1', particles: qs.get('fx') !== '0' });
    rig.loaded.then(() => {
      rig.setEmotion(e, intensity, { instant: true });
      if (qs.get('freeze') === '1') { rig.cycles.idle = 1e9; rig.blink.next = 1e9; rig.sacc.next = 1e9; }
    });
  }
  window.__sheetReady = Promise.all(cells.map(() => true));
} else {
  buildStudio();
}

// ------------------------------------------------------------ studio --
function buildStudio() {
  const state = {
    id: qs.get('mallow') || 'glitzi', emotion: 'neutral', intensity: 0.75, mix: 'none', mixW: 0.4,
    bg: 'realm', reduced: prefersReducedMotion(), sound: false, pristine: true,
  };
  let rig = null, realm = null;
  const smalls = [];

  const stageRealm = h('div', { class: 'realm' });
  const stageRig = h('div', { class: 'rig' });
  const readout = h('div', { class: 'readout', 'aria-live': 'polite' });
  const stage = h('div', { class: 'stage' }, stageRealm, stageRig, readout,
    h('div', { class: 'hint' }, 'Tap · double-tap · hold to squeeze · drag · flick'));

  const roster = h('div', { class: 'roster', role: 'group', 'aria-label': 'Choose a Mallow' });
  for (const id of MALLOW_IDS) {
    const m = MALLOWS[id];
    roster.append(h('button', { 'data-id': id, 'aria-pressed': String(id === state.id), onclick: () => select(id) },
      h('img', { src: m.file, alt: '' }), m.name));
  }
  const sizes = h('div', { class: 'sizes' });
  const sizeCells = [['white', 'small', 'white · 56px'], ['dark', 'small', 'dark · 56px'], ['check', 'small', 'alpha check'], ['dark', 'large', 'dark · 96px']];

  const chip = (label, pressed, onclick) => h('button', { class: 'chip', 'aria-pressed': String(pressed), onclick }, label);
  const emoChips = h('div', { class: 'chips' });
  const stageChips = h('div', { class: 'chips' });
  const intensity = h('input', { type: 'range', min: 0, max: 1, step: 0.01, value: state.intensity, 'aria-label': 'Intensity',
    oninput: (e) => { state.intensity = Number(e.target.value); apply(); } });
  const mixSel = h('select', { 'aria-label': 'Blend with', onchange: (e) => { state.mix = e.target.value; apply(); } },
    h('option', { value: 'none' }, 'No blend'), ...PRESET_IDS.filter((p) => p !== 'neutral').map((p) => h('option', { value: p }, p)));
  const mixW = h('input', { type: 'range', min: 0, max: 1, step: 0.01, value: state.mixW, 'aria-label': 'Blend amount',
    oninput: (e) => { state.mixW = Number(e.target.value); apply(); } });

  const TESTS = [
    ['Neutral → Angry', [['neutral', 0], 1.2, ['angry', 0.85]]],
    ['Angry → Calm', [['angry', 0.85], 1.8, ['calm', 0.8]]],
    ['Neutral → Sad', [['neutral', 0], 1.2, ['sad', 0.85]]],
    ['Sad → Comforted', [['sad', 0.85], 2, ['comforted', 0.8], 'comfort']],
    ['Neutral → Happy → Excited', [['neutral', 0], 1, ['happy', 0.7], 1.8, ['excited', 0.95]]],
    ['Calm → Surprised', [['calm', 0.8], 1.6, ['surprised', 0.9], 'gasp']],
    ['Happy → Frustrated', [['happy', 0.75], 1.6, ['frustrated', 0.8]]],
    ['Anxious → Hopeful', [['anxious', 0.8], 2, ['hopeful', 0.8]]],
    ['Sad → Relieved', [['sad', 0.75], 1.8, ['relieved', 0.8], 'sigh']],
    ['Neutral → Playful', [['neutral', 0], 1.2, ['playful', 0.85]]],
  ];
  let seqToken = 0;
  async function runTest(steps) {
    const tok = ++seqToken;
    for (const s of steps) {
      if (tok !== seqToken) return;
      if (typeof s === 'number') await new Promise((r) => setTimeout(r, s * 1000));
      else if (typeof s === 'string') rig?.react(s);
      else { state.emotion = s[0]; state.intensity = s[1] || 0.0001; state.mix = 'none'; intensity.value = state.intensity; mixSel.value = 'none'; apply(); }
    }
  }

  const acts = h('div', { class: 'acts' }, ...[
    ['Tap', 'tap'], ['Double tap', 'doubleTap'], ['Flick', 'flick'], ['Squeeze + release', 'squeeze'],
    ['Celebrate', 'celebrate'], ['Comfort', 'comfort'], ['Gasp', 'gasp'], ['Sigh', 'sigh'], ['Yawn', 'yawn'], ['Nod', 'nod'],
  ].map(([l, k]) => h('button', { onclick: () => {
    if (k === 'squeeze') {
      rig.press = { id: -1, x0: rig.CX, y0: rig.BASE - 80, x: rig.CX, y: rig.BASE - 80, t0: rig.time, lastX: 0, lastY: 0, lastT: rig.time, vx: 0, vy: 0, squeezed: false };
      setTimeout(() => { rig.press && (rig.press.squeezed = true); }, 380);
      setTimeout(() => { const sq = rig.press?.squeezed; rig.press = null; rig.body.squashV -= rig.body.press * 7; if (sq) rig.react('release'); }, 1300);
    } else rig?.react(k);
  } }, l)));

  const toggle = (label, key, after) => h('label', {}, label, h('input', { type: 'checkbox', checked: state[key] || false,
    onchange: (e) => { state[key] = e.target.checked; after?.(); } }));
  const bgSel = h('select', { 'aria-label': 'Background', onchange: (e) => { state.bg = e.target.value; applyBg(); } },
    ...['realm', 'white', 'dark', 'check'].map((b) => h('option', { value: b }, { realm: 'Hushfold realm', white: 'White', dark: 'Dark', check: 'Transparency check' }[b])));

  const aside = h('aside', {},
    h('section', {}, h('h2', {}, 'Emotion'), emoChips),
    h('section', {}, h('h2', {}, 'Intensity & blend'),
      h('div', { class: 'row' }, h('label', {}, 'Intensity'), intensity),
      h('div', { class: 'row', style: 'margin-top:8px' }, h('label', {}, 'Blend with'), mixSel),
      h('div', { class: 'row', style: 'margin-top:8px' }, h('label', {}, 'Blend amount'), mixW)),
    h('section', {}, h('h2', {}, 'Character states'), stageChips),
    h('section', {}, h('h2', {}, 'Transition tests'), h('div', { class: 'tests' }, ...TESTS.map(([l, s]) => h('button', { onclick: () => runTest(s) }, l)))),
    h('section', {}, h('h2', {}, 'Touch & reactions'), acts),
    h('section', {}, h('h2', {}, 'View'),
      h('div', { class: 'toggles' },
        h('div', { class: 'row' }, h('label', {}, 'Background'), bgSel),
        toggle('Reduced motion', 'reduced', () => { rig?.setReducedMotion(state.reduced); smalls.forEach((s) => s.setReducedMotion(state.reduced)); }),
        toggle('Sound', 'sound', async () => { const a = state.sound ? await getAudio() : null; if (rig) rig.opts.audio = a; a?.unlock?.(); }),
        toggle('Show approved art at rest', 'pristine', () => { if (rig) rig.opts.pristine = state.pristine; })),
    ),
  );

  app.append(h('div', { class: 'studio' },
    h('header', { class: 'top' }, h('h1', {}, 'Mallow Emotion Studio'), h('span', { class: 'sub' }, 'Seven living Mallows · approved artwork'),
      h('a', { href: './index.html' }, 'Open hushmallow →')),
    h('div', { class: 'stagewrap' }, roster, stage, sizes),
    aside));

  function renderChips() {
    emoChips.replaceChildren(...PRESET_IDS.map((p) => chip(p, p === state.emotion, () => { state.emotion = p; apply(); renderChips(); })));
    stageChips.replaceChildren(...Object.keys(STAGES).map((s) => chip(s, false, () => { rig?.setStage(s); readout.textContent = `${MALLOWS[state.id].name} · ${s}`; })));
  }

  function apply() {
    if (!rig) return;
    const mix = { [state.emotion]: 1 - (state.mix !== 'none' ? state.mixW : 0) };
    if (state.mix !== 'none') mix[state.mix] = (mix[state.mix] || 0) + state.mixW;
    rig.setEmotion(mix, state.intensity);
    smalls.forEach((s) => s.setEmotion(mix, state.intensity, { quiet: true }));
    readout.textContent = rig.describe();
    realm?.setEmotion?.(state.emotion, state.intensity);
    renderChips();
  }

  function applyBg() {
    stage.className = 'stage' + (state.bg === 'realm' ? '' : ` bg-${state.bg}`);
    stageRealm.style.display = state.bg === 'realm' ? '' : 'none';
  }

  async function select(id) {
    state.id = id;
    for (const b of roster.children) b.setAttribute('aria-pressed', String(b.dataset.id === id));
    rig?.destroy();
    smalls.splice(0).forEach((s) => s.destroy());
    realm?.destroy?.();
    stageRealm.replaceChildren();
    stageRealm.removeAttribute('style');
    realm = await mountRealm(stageRealm, id, state.emotion);
    rig = new MallowRig(stageRig, { id, reducedMotion: state.reduced, pristine: state.pristine, audio: state.sound ? await getAudio() : null });
    rig.on('react', ({ kind }) => { readout.textContent = `${MALLOWS[id].name} · ${kind}`; });
    sizes.replaceChildren();
    for (const [bg, size, label] of sizeCells) {
      const cell = h('div', { class: `cell ${bg} ${size}` }, h('span', {}, label));
      const inner = h('div', { style: size === 'small' ? 'position:absolute;left:50%;top:50%;width:76px;height:76px;transform:translate(-50%,-44%)' : 'position:absolute;inset:6px 6px 0' });
      cell.append(inner);
      sizes.append(cell);
      smalls.push(new MallowRig(inner, { id, interactive: false, reducedMotion: state.reduced, particles: false, shadow: bg !== 'check' }));
    }
    await rig.loaded;
    apply();
    window.__rig = rig;
  }

  applyBg();
  renderChips();
  select(state.id);
}
