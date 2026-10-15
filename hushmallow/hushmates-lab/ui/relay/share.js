// SHARE: the journey as a 9:16 story, for the person to keep or post
// themselves. Private by default: nothing is uploaded or posted from here,
// and the picture or video is made on this device.
//   "I released one thought into the world…" → "Five strangers saw it
//   differently." → "Here’s what came back." → "What would they see in yours?"
// The author chooses what it reveals. The feeling's name and their own words
// are off by default; a person's perspective can only be chosen if its writer
// allowed it; every perspective keeps its own honest label from the service,
// so a Mallow's is never counted or presented as a stranger's, and a fixed
// example is never called generated. Nothing is invented: the count is of the
// people whose perspectives the author still has.
// What a writer allows can change while this screen is open (they turn sharing
// off, or take their words back): the screen follows every refresh, and before a
// picture or video is made it asks the service for the journey as it is now, so
// nothing a writer has withdrawn is ever drawn.

import { h, icon } from '../dom.js';
import { sentenceSwitch } from '../kit.js';
import { MALLOWS } from '../mallows-data.js';
import { reducedMotion } from '../motion.js';
import { top, feelColour, feelName } from './common.js';
import { room, line, put } from './parts.js';
import { makeStory, renderPicture, renderVideo, videoType, prepare, honestLabel, W, H } from './share-render.js';

export function share(dev, { id } = {}) {
  const c = dev.client;
  let j = c.journey(id);
  const mine = MALLOWS[j?.mallow] || MALLOWS.noomi;
  const r = room(mine.id, 'hf-share', { seed: 8 });
  const head = h('div', { class: 'hf-head' }, top(dev, { title: 'Share your journey', back: true }));
  r.el.append(head);
  if (!j) {
    r.el.append(h('div', { class: 'hf-scroll' }, h('div', { class: 'hf-copy hf-copy--top' }, line('This journey isn’t here any more.', { cls: 'hf-line--sm' }))));
    return { el: r.el, mood: 'warm' };
  }

  // what can be shown: everything that came back, people first, the Mallow's with its own label
  const itemsOf = (view) => [...(view.collection || []), ...(view.mallowExtra ? [view.mallowExtra] : [])];
  let items = itemsOf(j);
  const allowed = (p) => p.kind === 'mallow' || p.shareable === true;
  const opts = { label: false, words: false, picks: new Set() };
  let hasMallow = items.some((p) => p.kind === 'mallow');
  let story = null;
  let alive = true;
  let raf = 0;
  let playing = !reducedMotion();
  let t0 = 0;

  const canvas = h('canvas', { class: 'hf-share-canvas', width: W / 2, height: H / 2, role: 'img', 'aria-label': 'Preview of your share story' });
  const ctx = canvas.getContext('2d');
  const playBtn = h('button', { type: 'button', class: 'kit-round hf-share-play', 'aria-label': playing ? 'Pause the preview' : 'Play the preview', dataset: { test: 'share-play' }, onclick: () => setPlaying(!playing) }, icon(playing ? 'pause' : 'orb'));
  const preview = h('figure', { class: 'hf-share-preview', dataset: { test: 'share-preview' } }, canvas, playBtn);
  const described = h('p', { class: 'hf-sr', 'aria-live': 'polite' });
  // said plainly when the picture can't hold every perspective chosen (the video always shows each)
  const fitNote = h('p', { class: 'hf-hint hf-hint--left hf-share-fit', 'aria-live': 'polite', dataset: { test: 'share-fit' } });
  const WORD = ['no', 'one', 'two', 'three', 'four', 'five'];

  function data() {
    return {
      tint: feelColour(j.label),
      label: opts.label && j.label ? feelName(j.label) : null,
      labelColour: feelColour(j.label),
      words: opts.words && j.text ? j.text : null,
      humans: j.humanCount,
      petals: j.petals || [],
      mallowPetal: j.mallowPetal,
      hasMallow,
      mallow: mine.id,
      // a person's Mallow isn't passed on: the picture shows nothing about who wrote it
      picks: items.filter((p) => opts.picks.has(p.id) && allowed(p)).map((p) => ({ kind: p.kind, label: honestLabel(p), text: p.text, mallow: p.kind === 'mallow' ? p.mallow : null })),
    };
  }
  function refresh() {
    const d = data();
    story = makeStory(d);
    t0 = performance.now();
    described.textContent = `The story shows: ${[story.showsMallow() ? `your Mallow, ${mine.name}` : null, d.label ? `the feeling’s name (${d.label})` : null, d.words ? 'your words' : null, `${d.humans} ${d.humans === 1 ? 'petal' : 'petals'} of light`, d.picks.length ? `${d.picks.length} chosen ${d.picks.length === 1 ? 'perspective' : 'perspectives'}` : null].filter(Boolean).join(', ')}.`;
    const n = d.picks.length;
    const fit = n ? story.stillPicks(ctx) : 0;
    fitNote.textContent = fit >= n ? ''
      : fit ? `The picture has room for ${WORD[fit]} of the ${WORD[n] || n} you chose; the video shows each one.`
        : `The picture has no room for ${n === 1 ? 'this perspective; the video shows it' : 'these perspectives; the video shows each one'}.`;
    if (!playing) still();
  }
  function frame() {
    if (!alive || !playing) return;
    const t = ((performance.now() - t0) / 1000) % (story.duration + 1.2);
    ctx.setTransform(0.5, 0, 0, 0.5, 0, 0);
    story.draw(ctx, Math.min(t, story.duration));
    raf = requestAnimationFrame(frame);
  }
  function still() { ctx.setTransform(0.5, 0, 0, 0.5, 0, 0); story.still(ctx); }
  function setPlaying(on) {
    playing = on;
    cancelAnimationFrame(raf);
    put(playBtn, icon(on ? 'pause' : 'orb'));
    playBtn.setAttribute('aria-label', on ? 'Pause the preview' : 'Play the preview');
    if (on) { t0 = performance.now(); raf = requestAnimationFrame(frame); } else still();
  }

  // ----------------------------------------------------------- choices --
  const switches = [
    j.label ? sentenceSwitch({ label: 'Show the feeling’s name', checked: opts.label, test: 'share-label', onChange: (on) => { opts.label = on; refresh(); return true; } }) : null,
    j.text ? sentenceSwitch({ label: 'Include my own words', hint: 'Off unless you choose. Leave out anything that could identify you or anyone else.', checked: opts.words, test: 'share-words', onChange: (on) => { opts.words = on; refresh(); return true; } }) : null,
  ].filter(Boolean);
  switches.forEach((s) => s.classList.add('kit-switch--plain'));

  const mark = (p) => {
    const m = MALLOWS[p.mallow] || MALLOWS.noomi;
    return p.kind === 'mallow'
      ? h('span', { class: 'hf-pick-star', style: { color: m.deep }, 'aria-hidden': 'true' }, icon('star'))
      : h('i', { class: 'hf-src-dot', style: { '--dot': m.body }, 'aria-hidden': 'true' });
  };
  const pickRow = (p) => {
    const btn = h('button', {
      type: 'button', role: 'checkbox', class: 'hf-pick', 'aria-checked': String(opts.picks.has(p.id)), dataset: { test: 'share-pick', kind: p.kind },
      onclick: () => {
        const on = !opts.picks.has(p.id);
        if (on) opts.picks.add(p.id); else opts.picks.delete(p.id);
        btn.setAttribute('aria-checked', String(on));
        refresh();
      },
    }, h('span', { class: 'hf-pick-box', 'aria-hidden': 'true' }, icon('check')),
    h('span', { class: 'hf-pick-body' }, h('span', { class: 'hf-pick-src' }, mark(p), h('span', {}, honestLabel(p))), h('span', { class: 'hf-pick-text' }, `“${p.text}”`)));
    return btn;
  };
  // a person who kept theirs private: one quiet line, nothing of their words
  const lockedRow = () => h('p', { class: 'hf-pick-locked', dataset: { test: 'share-pick-locked' } },
    h('span', { class: 'hf-pick-key', 'aria-hidden': 'true' }, icon('key')), 'A Hushmate kept theirs private');
  const picksHint = h('p', { class: 'hf-hint hf-hint--left' });
  const picksBox = h('div', { class: 'hf-picks' });
  const picksSec = h('section', { class: 'hf-share-sec' }, h('h2', { class: 'kit-label' }, 'Perspectives to include'), picksHint, picksBox, fitNote);
  function paintPicks() {
    const open = items.filter(allowed);
    const kept = items.filter((p) => !allowed(p));
    picksSec.hidden = !items.length;
    picksHint.textContent = open.length
      ? 'Only ones their writers allowed. Nobody is named, and each keeps its own label. The picture fits one or two; the video shows each in turn.'
      : 'Their writers kept these private, so the story shows the real count without their words.';
    put(picksBox, open.map(pickRow), kept.map(lockedRow));
  }
  paintPicks();
  /**
   * The journey as the service has it now. Anything chosen that is no longer allowed is
   * taken out (and the numbers follow). → how many chosen perspectives were taken out
   */
  function adopt(view) {
    j = view;
    items = itemsOf(view);
    hasMallow = items.some((p) => p.kind === 'mallow');
    let dropped = 0;
    for (const pid of [...opts.picks]) {
      const p = items.find((x) => x.id === pid);
      if (!p || !allowed(p)) { opts.picks.delete(pid); dropped += 1; }
    }
    // a row being redrawn can't keep focus: it moves to the section's heading, not to the top of the page
    const onPick = picksBox.contains(document.activeElement);
    paintPicks();
    if (onPick) { const head = picksSec.querySelector('h2'); head.setAttribute('tabindex', '-1'); head.focus(); }
    refresh();
    return dropped;
  }
  const changedMind = (n) => `${n === 1 ? 'A writer has' : 'Some writers have'} stopped sharing ${n === 1 ? 'their perspective' : 'theirs'}, so ${n === 1 ? 'it’s' : 'they’re'} no longer in your story. Have a look, then make it again.`;
  /** Asked of the service just before anything is made: false (and nothing is made) if it can't say, or if a choice had to go. */
  async function stillAllowed() {
    let view;
    try { view = await c.api('getJourney', { journeyId: id }); } catch {
      dev.toast('Couldn’t check with Hushmates just now, so nothing was made. Please try again in a moment.', { tone: 'warn', ms: 5000 });
      return false;
    }
    if (!alive) return false;
    if (!view || !view.id) { dev.toast('This journey isn’t here any more.', { tone: 'warn' }); return false; }
    const dropped = adopt(view);
    if (dropped) { dev.toast(changedMind(dropped), { tone: 'warn', ms: 6500 }); return false; }
    return true;
  }

  const vtype = videoType();
  const makePic = h('button', { type: 'button', class: 'kit-btn kit-btn--ink kit-btn--block', dataset: { test: 'share-save' }, onclick: () => savePicture() }, icon('download'), 'Make the picture');
  const makeVid = vtype ? h('button', { type: 'button', class: 'kit-btn kit-btn--ghost kit-btn--block', dataset: { test: 'share-video' }, onclick: () => saveVideo() }, icon('orb'), 'Make a short video') : null;

  r.el.append(h('div', { class: 'hf-scroll hf-share-scroll' },
    preview, described,
    h('div', { class: 'hf-copy' },
      h('h1', { class: 'hf-line hf-line--sm', 'data-autofocus': '' }, 'Private until you choose.'),
      h('p', { class: 'hf-sub', dataset: { test: 'share-privacy' } }, 'Nothing is posted from here. You choose what your story shows, and nothing in it is made up.')),
    switches.length ? h('div', { class: 'hf-share-opts' }, switches) : null,
    picksSec,
    h('div', { class: 'hf-actions' }, makePic, makeVid,
      h('p', { class: 'hf-hint' }, vtype ? 'Made on this device. You decide if and where to post it.' : 'Made on this device. (This browser can’t make videos, but the picture works everywhere.)'))));

  let busy = false;
  async function savePicture() {
    if (busy) return;
    busy = true;
    try { if (!(await stillAllowed())) return; } finally { busy = false; }
    let url;
    const pic = makeStory(data());
    try { url = URL.createObjectURL(await renderPicture(pic)); } catch {
      dev.toast('Couldn’t make the picture here. Please try again.', { tone: 'warn' });
      return;
    }
    // shown, not downloaded: works everywhere (some hosts block script downloads), and nothing is uploaded
    dev.sheet({
      title: 'Your picture',
      body: h('div', { class: 'rl-share-out' },
        h('img', { src: url, alt: `Your journey as a picture: the orb with a petal of light for each person${pic.showsMallow() ? `, ${mine.name} on a cloud beneath it` : ''}, the real count, and any perspectives you chose`, class: 'rl-share-img', dataset: { test: 'share-image' } }),
        h('p', { class: 'kit-note rl-center' }, 'Press and hold the picture (or right-click it) to save it. Nothing was uploaded or posted.')),
      actions: [h('button', { type: 'button', class: 'kit-btn kit-btn--ink kit-btn--block', onclick: () => dev.closeSheet() }, 'Done')],
      onClose: () => setTimeout(() => URL.revokeObjectURL(url), 1000),
    });
  }

  async function saveVideo() {
    if (busy) return;
    busy = true;
    try { if (!(await stillAllowed())) return; } finally { busy = false; }
    const ctl = new AbortController();
    const bar = h('span', { class: 'hf-progress-bar' });
    const status = h('p', { class: 'kit-note rl-center', 'aria-live': 'polite' }, 'Recording your story… it plays once, in real time.');
    dev.sheet({
      title: 'Making your video',
      body: h('div', { class: 'kit-stack' }, h('div', { class: 'hf-progress', role: 'progressbar', 'aria-label': 'Making your video' }, bar), status),
      actions: [h('button', { type: 'button', class: 'kit-btn kit-btn--text kit-btn--block', onclick: () => { ctl.abort(); dev.closeSheet(); } }, 'Cancel')],
      onClose: () => ctl.abort(),
    });
    let blob;
    try {
      blob = await renderVideo(makeStory(data()), { signal: ctl.signal, onProgress: (p) => { bar.style.width = `${Math.round(p * 100)}%`; } });
    } catch (e) {
      if (!ctl.signal.aborted) { dev.closeSheet(); dev.toast('Couldn’t make the video here. The picture still works.', { tone: 'warn' }); }
      return;
    }
    if (!alive) return;
    const url = URL.createObjectURL(blob);
    dev.closeSheet();
    dev.sheet({
      title: 'Your video',
      body: h('div', { class: 'rl-share-out' },
        h('video', { src: url, class: 'rl-share-img', controls: true, playsinline: true, loop: true, muted: true, dataset: { test: 'share-video-out' }, 'aria-label': 'Your journey as a short video' }),
        h('p', { class: 'kit-note rl-center' }, 'A short video made on this device. Use the player’s menu to save it. Nothing was uploaded or posted.')),
      actions: [h('button', { type: 'button', class: 'kit-btn kit-btn--ink kit-btn--block', onclick: () => dev.closeSheet() }, 'Done')],
      onClose: () => setTimeout(() => URL.revokeObjectURL(url), 1000),
    });
  }

  refresh();
  // the type and the author's Mallow arrive, then the preview is drawn again with them
  prepare(mine.id).then(() => { if (alive) { refresh(); if (playing) setPlaying(true); } });
  return {
    el: r.el, mood: 'warm',
    // the journeys were refreshed (every 20 seconds, or after any change): follow what writers allow now
    update(state, detail) {
      if (!detail?.journeys || !alive) return;
      const fresh = c.journey(id);
      if (!fresh) return;
      const dropped = adopt(fresh);
      if (dropped) dev.toast(changedMind(dropped).replace(' Have a look, then make it again.', ''), { tone: 'warn', ms: 6500 });
    },
    destroy() { alive = false; cancelAnimationFrame(raf); },
  };
}
