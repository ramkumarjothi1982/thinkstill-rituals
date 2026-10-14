// CATCH. Someone else's feeling drifts into your room as a glowing orb; your
// Mallow notices it and reaches up. You can catch it or let it float past
// (always fine, never counted against you). If you catch it, you offer a
// possibility, not a verdict; your Mallow squeezes the orb, a petal of light
// unfurls in your Mallow's colour, and it floats on to the next person.
// Only after giving your own do you see how others saw it.
//   off · idle → looking → none | offer → writing → passing → after   (gone: it drifted on)

import { h, icon } from '../dom.js';
import { sentenceSwitch, chip } from '../kit.js';
import { MALLOWS } from '../mallows-data.js';
import { Orb, fly, centreIn } from '../orb.js';
import { play } from '../sound.js';
import { wait, reducedMotion, rise, CSS_EASE } from '../motion.js';
import { screenReframe } from '../../core/feeling-safety.js';
import { charCount } from '../../core/text-policy.js';
import { SHOWN_LIMITS, PERSPECTIVE_LABELS } from '../../core/relay-config.js';
import { brandBar, dock, top, feelChip, feelColour, errorText, reportSheet } from './common.js';
import { room, stage, handsOf, ThoughtCloud, Speech, line, swapLine, checkRow, put, morph, focusHeading } from './parts.js';

const STARTERS = ['Another possibility could be…', 'Maybe…', 'Could there be another explanation?'];

export function catchScene(dev) {
  const c = dev.client;
  const me = () => dev.state.me;
  const limits = () => ({ ...SHOWN_LIMITS, ...me()?.limits });      // the service's limits, as it tells them
  const mine = MALLOWS[me().profile.mallow] || MALLOWS.noomi;
  const mem = (dev.memory.catch ||= { drafts: {}, cids: {}, share: {} });
  let state = 'idle';
  let offer = null;
  let alive = true;
  let busy = false;
  let orb = null;

  const r = room(mine.id, 'hf-catch', { seed: 11 });
  const st = stage(mine.id);
  const speech = new Speech(mine.id);
  const head = h('div', { class: 'hf-head' });
  const body = h('div', { class: 'hf-scroll' });
  const dockSlot = h('div', { class: 'rl-dock-slot' });
  const flight = h('div', { class: 'rl-flight', 'aria-hidden': 'true' });
  r.el.append(head, body, dockSlot, flight);
  const el = r.el;

  function setState(s, { withDock = false } = {}) {
    state = s;
    el.dataset.state = s;
    dockSlot.hidden = !withDock;
    if (withDock) put(dockSlot, dock(dev, 'catch'));
  }
  function clearOrb() { orb?.destroy(); orb?.el.remove(); orb = null; }
  function skyWindow() { return h('span', { class: 'rl-catch-window', 'aria-hidden': 'true' }, h('i'), h('i'), h('i')); }

  // -------------------------------------------------------------- off --
  function off() {
    setState('off', { withDock: true });
    clearOrb();
    put(head, brandBar(dev));
    put(st.above, speech.el);
    const active = me().accountState === 'active';
    speech.say(active ? 'Want to help someone see their feeling another way? Only when you choose to look.' : 'Your account can’t catch feelings right now.');
    put(body, st.el,
      h('div', { class: 'hf-copy' }, line('Let feelings find you'),
        h('p', { class: 'hf-sub' }, 'Catch a feeling someone released and offer another way of seeing it.')),
      active ? h('div', { class: 'hf-form' }, sentenceSwitch({
        label: 'Let feelings find me', hint: 'Always voluntary. Letting a feeling float past is always fine, and you can turn this off any time.',
        checked: false, test: 'catching-on',
        onChange: async (on) => {
          const res = await dev.run(() => c.act('savePreferences', { catching: on }, ['me']));
          if (!res) return false;
          if (on) idle();
          return true;
        },
      })) : null);
  }

  // ------------------------------------------------------------- idle --
  function idle({ animate = true } = {}) {
    if (!me().profile.catching || me().accountState !== 'active') { off(); return; }
    setState('idle', { withDock: true });
    clearOrb();
    st.mallow.relax();
    put(head, brandBar(dev));
    put(st.above, skyWindow());
    const gifts = c.state.gifts?.length || 0;
    put(body,
      h('div', { class: 'hf-copy hf-copy--top' }, line('Catch a feeling'),
        h('p', { class: 'hf-sub' }, 'When someone lets a feeling go, it might find you here. Maybe you can see it another way.')),
      st.el,
      h('div', { class: 'hf-actions' },
        h('button', { type: 'button', class: 'kit-btn kit-btn--ink kit-btn--lg kit-btn--block', dataset: { test: 'find-feeling' }, onclick: () => look() }, icon('sparkle'), 'Look up'),
        gifts ? h('button', { type: 'button', class: 'kit-btn kit-btn--text kit-btn--block', dataset: { test: 'my-gifts' }, onclick: () => giftsSheet() }, `Perspectives you’ve offered · ${gifts}`)
          : h('p', { class: 'hf-note' }, 'Catching is always voluntary.')));
    if (animate) rise([...body.querySelectorAll('.hf-copy > *, .hf-actions > *')], { y: 12, stagger: 60 });
  }

  // ---------------------------------------------------------- looking --
  async function look() {
    if (busy) return;
    busy = true;
    setState('looking');
    body.querySelector('[data-test="find-feeling"]')?.setAttribute('disabled', '');
    const btn = body.querySelector('[data-test="find-feeling"]');
    if (btn) btn.lastChild.textContent = 'Looking up…';
    st.mallow.reach(0.3);
    r.sky?.pan(140, { duration: 1400 });
    let res;
    try {
      [res] = await Promise.all([c.api('findFeeling'), wait(reducedMotion() ? 0 : 1000)]);
    } catch (e) {
      busy = false;
      st.mallow.relax();
      r.sky?.pan(0, { duration: 900 });
      if (!alive) return;
      if (e.code === 'not-catching' || e.code === 'account-inactive') { await c.refresh('me').catch(() => {}); off(); return; }
      idle({ animate: false });
      put(st.above, speech.el);
      speech.say(errorText(e));
      return;
    }
    busy = false;
    if (!alive) return;
    dev.onScreen?.('catch:looked', { found: !!res.offer });   // never someone's words: a host learns only whether one came
    if (!res.offer) { none(); return; }
    offer = res.offer;
    if (offer.state === 'caught') writing(); else await arrive();
  }

  function none() {
    setState('none', { withDock: true });
    st.mallow.relax();
    r.sky?.pan(0, { duration: 1600 });
    put(st.above, speech.el);
    speech.say('I’ll keep an eye on the sky.');
    put(body,
      h('div', { class: 'hf-copy hf-copy--top', dataset: { test: 'catch-none' } }, line('No feelings are floating your way right now.', { cls: 'hf-line--sm' }),
        h('p', { class: 'hf-sub' }, 'When someone releases one, it might find you.')),
      st.el,
      h('div', { class: 'hf-actions' }, h('button', { type: 'button', class: 'kit-btn kit-btn--ghost kit-btn--block', dataset: { test: 'look-again' }, onclick: () => look() }, 'Look again')));
  }

  // ------------------------------------------------------------ offer --
  async function arrive() {
    setState('offer');
    r.sky?.pan(0, { duration: 1800 });
    const f = offer.feeling;
    put(head, top(dev, { title: '', action: moreButton(), back: () => idle() }));
    clearOrb();
    const tint = feelColour(f.label);
    orb = new Orb({ size: null, tint, label: 'A feeling that found you' });
    const slot = h('div', { class: 'hf-orb-slot' }, orb.el);
    const words = new ThoughtCloud({ label: 'Their words', long: true });
    words.set(f.text);
    words.el.dataset.test = 'offer-text';
    put(st.above, slot);
    await morph(body, st.el, () => put(body,
      h('div', { class: 'hf-copy hf-copy--top', dataset: { test: 'catch-offer' } }, line('A feeling has found you.', { cls: 'hf-line--sm' })),
      h('div', { class: 'hf-their' }, words.el,
        h('p', { class: 'hf-their-meta' }, feelChip(f.label), h('span', { class: 'hf-meta' }, `${f.perspectivesSoFar} of ${f.of} human perspectives so far`))),
      st.el,
      h('div', { class: 'hf-actions' },
        h('button', { type: 'button', class: 'kit-btn kit-btn--ink kit-btn--block', dataset: { test: 'catch-feeling' }, onclick: () => catchIt() }, 'Catch this feeling'),
        h('button', { type: 'button', class: 'kit-btn kit-btn--ghost kit-btn--block', dataset: { test: 'float-past' }, onclick: () => floatPast() }, 'Let it float past'),
        h('p', { class: 'hf-note hf-note--quiet' }, 'It waits a few minutes for you. Letting it float past is always fine.'))));
    if (!alive) return;
    focusHeading(body);
    words.el.animate([{ opacity: 0, transform: 'translateY(10px) scale(.96)' }, { opacity: 1, transform: 'none' }], { duration: 700, delay: 900, easing: CSS_EASE, fill: 'backwards' });
    play('arrive');
    if (!reducedMotion()) {
      await wait(40);
      const to = centreIn(slot, flight);
      const flyer = h('div', { class: 'rl-flyer' });
      const arriving = orb;
      flight.append(flyer);
      arriving.freeze();
      flyer.append(arriving.el);
      setTimeout(() => { if (alive) { st.mallow.notice(0); st.mallow.reach(0.28); } }, 900);
      const side = flight.getBoundingClientRect().width;
      await fly(flyer, flight, { from: { x: side * 0.86, y: -120 }, to, via: { x: side * 0.97, y: to.y * 0.62 }, duration: 1700, scale: [0.35, 1], colour: tint });
      // the person may have moved on while it flew in (reported it, let it float past): then it simply lands nowhere
      if (!alive || orb !== arriving) { flyer.remove(); return; }
      slot.append(orb.unfreeze().el);
      flyer.remove();
      orb.release(true);
      orb.glowPulse();
      setTimeout(() => alive && st.mallow.relax(), 500);
    }
  }

  async function catchIt() {
    if (busy) return;
    busy = true;
    try {
      const res = await c.api('catchFeeling', { holdId: offer.holdId });
      offer = res.offer;
    } catch (e) {
      busy = false;
      // only the connection failed: the feeling is still here, and catching again is safe (it's never caught twice)
      if (e.code === 'network' || e.code === 'response-lost') { speech.say('The connection slipped. The feeling is still here: try again when you’re ready.'); dev.toast(errorText(e), { tone: 'warn', ms: 4200 }); return; }
      lost(e);
      return;
    }
    busy = false;
    play('catch');
    st.mallow.press(0.5, 0.2);
    orb?.squeeze(0.7, 0.2);
    await wait(240);
    st.mallow.release(true);
    orb?.release();
    const was = orb?.el.getBoundingClientRect();
    await morph(body, st.el, () => writing('', { keepOrb: true }));
    if (!alive || !orb) return;
    const now = orb.el.getBoundingClientRect();
    if (was?.width && now.width && !reducedMotion()) orb.el.animate([{ transform: `scale(${was.width / now.width})` }, { transform: 'none' }], { duration: 650, easing: CSS_EASE });
    focusHeading(body);
  }

  async function floatPast() {
    if (busy) return;
    busy = true;
    const holdId = offer?.holdId;
    if (orb && !reducedMotion() && orb.el.isConnected) {
      play('pass');
      const from = centreIn(orb.el, flight);
      const flyer = h('div', { class: 'rl-flyer' });
      flight.append(flyer); orb.freeze(); flyer.append(orb.el);
      fly(flyer, flight, { from, to: { x: from.x + 170, y: -140 }, duration: 1300, scale: [1, 0.3], trail: true, colour: feelColour(offer?.feeling.label) }).then(() => flyer.remove());
    }
    try { if (holdId) await c.api('letFloatPast', { holdId }); } catch { /* it expires on its own anyway */ }
    busy = false;
    offer = null;
    if (!alive) return;
    idle();
    put(st.above, speech.el);
    speech.say('It floats on to someone else. That’s okay.');
    setTimeout(() => { if (alive && state === 'idle') put(st.above, skyWindow()); }, 3200);
  }

  // ---------------------------------------------------------- writing --
  function writing(err = '', { keepOrb = false } = {}) {
    setState('writing');
    const f = offer.feeling;
    if (!keepOrb || !orb) { clearOrb(); orb = new Orb({ size: null, tint: feelColour(f.label), label: 'The feeling you caught' }); }
    orb.unfreeze();
    put(head, top(dev, { title: '', action: moreButton(), back: () => idle() }));
    put(st.above, h('div', { class: 'hf-orb-slot hf-orb-slot--held' }, orb.el));
    const words = new ThoughtCloud({ small: true, long: true, label: 'Their words' });
    words.set(f.text);
    words.el.dataset.test = 'caught-text';
    const area = h('textarea', { id: 'hf-reframe', class: 'hf-input', rows: 3, maxlength: String(limits().reframeMaxChars + 40), placeholder: 'Write it gently…', 'aria-label': 'Your perspective', 'aria-describedby': 'hf-rf-sub hf-rf-count', dataset: { test: 'reframe-text' } });
    area.value = mem.drafts[offer.holdId] || '';
    const count = h('span', { class: 'hf-count', id: 'hf-rf-count' });
    const nudge = h('p', { class: 'hf-nudge', role: 'status', 'aria-live': 'polite' });
    const error = h('p', { class: 'kit-error', role: 'alert', dataset: { test: 'reframe-error' } }, err);
    const send = h('button', { type: 'button', class: 'kit-btn kit-btn--ink kit-btn--block', dataset: { test: 'reframe-submit' }, onclick: () => submit(area.value) }, 'Add my perspective');
    let lastBeat = 0;
    const sync = () => {
      mem.drafts[offer.holdId] = area.value;
      const n = charCount(area.value.trim());
      count.textContent = n > limits().reframeMaxChars * 0.8 ? `${n} / ${limits().reframeMaxChars}` : '';
      count.classList.toggle('is-over', n > limits().reframeMaxChars);
      send.disabled = n < limits().reframeMinChars || n > limits().reframeMaxChars;
      const local = n >= limits().reframeMinChars ? screenReframe(area.value, { maxChars: limits().reframeMaxChars }) : null;
      nudge.textContent = local?.ok && local.nudges.includes('certainty') ? 'Try holding it lightly: “maybe” or “could” leaves room for them.' : '';
    };
    area.addEventListener('input', () => {
      error.textContent = '';
      sync();
      const beat = Math.floor(area.value.length / 20);
      if (beat !== lastBeat) { lastBeat = beat; st.mallow.settle(); orb?.boop(); }
    });
    const starters = h('div', { class: 'hf-tags hf-starters', role: 'group', 'aria-label': 'Ways to begin' },
      STARTERS.map((s, i) => chip(s, false, () => {
        const lead = s.replace(/…$/, ' ');
        area.value = area.value.trim() ? `${area.value.trim()} ${lead}` : lead;
        area.dispatchEvent(new Event('input'));
        area.focus();
        area.setSelectionRange(area.value.length, area.value.length);
      }, { small: true, test: `starter-${i}` })));
    const share = checkRow({
      id: 'hf-allow-share', test: 'allow-share', checked: !!mem.share[offer.holdId],
      label: 'They may include my words in a share picture or video',
      hint: 'Off unless you choose. It never shows who you are.',
      onChange: (on) => { mem.share[offer.holdId] = on; },
    });
    put(body,
      h('div', { class: 'hf-their hf-their--top' }, words.el),
      st.el,
      h('div', { class: 'hf-copy' }, line('Can you see this another way?', { cls: 'hf-line--sm' }),
        h('p', { class: 'hf-sub', id: 'hf-rf-sub' }, 'Offer a possibility, not a verdict.')),
      h('div', { class: 'hf-form' },
        starters,
        h('div', { class: 'hf-field' }, area, count),
        nudge, error,
        h('p', { class: 'hf-hint' }, 'No diagnosis, judgement or orders. The person who released it will read your words, and so will anyone who adds a perspective after you; nobody sees who wrote it, and nobody can contact anyone.'),
        h('div', { class: 'hf-choices' }, share),
        h('div', { class: 'hf-actions' }, send,
          h('button', { type: 'button', class: 'kit-btn kit-btn--text kit-btn--block', dataset: { test: 'float-past' }, onclick: () => floatPast() }, 'Let it float past'))));
    st.el.classList.add('hf-stage--s');
    sync();
    if (err) error.textContent = err;
    if (err) requestAnimationFrame(() => error.scrollIntoView({ block: 'center' }));
  }

  async function submit(text) {
    if (busy) return;
    busy = true;
    const holdId = offer.holdId;
    // words suggesting the writer may not be safe never leave the device: support for them instead,
    // and the feeling floats on (the service checks again)
    const local = screenReframe(text, { minChars: 1, maxChars: 100000 });
    if (!local.ok && local.code === 'support') {
      busy = false;
      c.act('letFloatPast', { holdId }, ['me']).catch(() => {});
      toSupport(holdId, local);
      return;
    }
    mem.cids[holdId] ||= c.newId();
    body.querySelectorAll('button, textarea').forEach((b) => { b.disabled = true; });
    let res;
    try {
      res = await c.act('submitReframe', { holdId, text, clientId: mem.cids[holdId], allowShare: !!mem.share[holdId] }, ['me', 'gifts']);
    } catch (e) {
      busy = false;
      if (!alive) return;
      if (String(e.code).startsWith('reframe-')) { writing(errorText(e)); return; }
      if (['hold-expired', 'not-available', 'already-contributed', 'account-inactive'].includes(e.code)) { lost(e); return; }
      writing();
      put(st.above, speech.el);
      speech.say(errorText(e));
      return;
    }
    busy = false;
    if (res?.status === 'support') { toSupport(holdId, res); return; }
    delete mem.drafts[holdId];
    delete mem.share[holdId];
    if (!alive) return;
    await passing(res);
    if (!alive) return;
    after(res);
  }

  function toSupport(holdId, res) {
    delete mem.drafts[holdId];
    delete mem.share[holdId];
    offer = null;
    dev.go('support', { support: res.support, level: res.level, from: 'catch' }, { replace: true });
  }

  // ---------------------------------------------------------- passing --
  async function passing(res) {
    setState('passing');
    const f = offer.feeling;
    const tint = feelColour(f.label);
    if (!orb) orb = new Orb({ size: null, tint, label: 'The feeling, carrying your perspective' });
    put(head, h('header', { class: 'rl-top' }));
    const say = h('p', { class: 'hf-line hf-line--moment', role: 'status', 'aria-live': 'polite' });
    await morph(body, st.el, () => {
      st.el.classList.remove('hf-stage--s');
      put(st.above, h('div', { class: 'hf-orb-slot hf-orb-slot--held' }, orb.el));
      put(body, h('div', { class: 'hf-moment' }, say), st.el);
      body.scrollTop = 0;
    });
    const rm = reducedMotion();
    await wait(rm ? 0 : 300);
    // the Mallow squeezes it, it ripples, and your petal unfurls
    play('squish');
    st.mallow.press(0.8, 0.45);
    orb.squeeze(0.8, 0.45);
    await wait(rm ? 0 : 480);
    st.mallow.release();
    orb.release();
    orb.ripple({ colour: mine.glow });
    play('petal');
    orb.addPetal(mine.id);
    st.mallow.delight(0.7);
    swapLine(say, 'Your perspective is woven in.');
    await wait(rm ? 300 : 1700);
    if (!alive) return;
    // and it floats on
    play('pass');
    swapLine(say, res.homeward ? 'That was the fifth. This feeling is heading home.' : 'It’s travelling on to find someone else.');
    if (!rm) {
      const from = centreIn(orb.el, flight);
      const flyer = h('div', { class: 'rl-flyer' });
      flight.append(flyer); orb.freeze(); flyer.append(orb.el);
      r.sky?.pan(240, { duration: 2400 });
      st.mallow.reach(0.2);
      const side = flight.getBoundingClientRect().width;
      await fly(flyer, flight, { from, to: { x: side * 0.84, y: -150 }, via: { x: side * 0.96, y: from.y * 0.5 }, duration: 2100, scale: [1, 0.25], colour: tint });
      flyer.remove();
      st.mallow.relax();
    }
    await wait(rm ? 400 : 500);
  }

  // ------------------------------------------------------------ after --
  function after(res) {
    setState('after', { withDock: true });
    r.sky?.pan(0, { duration: 1600 });
    clearOrb();
    put(head, brandBar(dev));
    const earlier = res.earlier || [];
    const first = res.slot === 1;
    st.el.classList.add('hf-stage--s');
    put(st.above, speech.el);
    speech.say('Thank you for seeing it differently.');
    put(body, st.el, h('div', { class: 'hf-after', dataset: { test: 'reframe-after' } },
      h('div', { class: 'hf-copy hf-copy--top' },
        h('h1', { class: 'hf-line hf-line--sm', 'data-autofocus': '' }, earlier.length ? 'How others saw it' : first ? 'You were the first to see it differently' : 'Your perspective is on its way'),
        h('p', { class: 'hf-sub' }, earlier.length ? 'You see these only after offering your own, so every perspective stays truly yours.' : 'Others may add theirs. The person who released it will see them all when it comes home.')),
      h('ol', { class: 'hf-ribbons' },
        earlier.map((p) => h('li', { class: 'hf-ribbon' }, h('span', { class: 'hf-ribbon-src' }, PERSPECTIVE_LABELS.human), h('p', { class: 'hf-ribbon-text' }, p.text))),
        h('li', { class: 'hf-ribbon hf-ribbon--mine', style: { '--ribbon': mine.body } }, h('span', { class: 'hf-ribbon-src' }, 'Your perspective'), h('p', { class: 'hf-ribbon-text' }, res.perspective?.text || ''))),
      h('p', { class: 'hf-note' }, res.homeward ? 'Five people have seen it differently now. It’s on its way home.' : `Yours was perspective ${res.slot} of ${limits().perspectivesPerFeeling}.`),
      h('div', { class: 'hf-actions hf-actions--row' },
        h('button', { type: 'button', class: 'kit-btn kit-btn--ink', dataset: { test: 'catch-another' }, onclick: () => look() }, 'Catch another'),
        h('button', { type: 'button', class: 'kit-btn kit-btn--ghost', dataset: { test: 'catch-done' }, onclick: () => idle() }, 'Done'))));
    rise([...body.querySelectorAll('.hf-copy > *, .hf-ribbon, .hf-after > .hf-note, .hf-after > .hf-actions')], { y: 14, stagger: 70 });
    offer = null;
    focusHeading(body);
  }

  // ------------------------------------------------- lost / report / more --
  function lost(e) {
    offer = null;
    setState('gone', { withDock: true });
    clearOrb();
    put(head, brandBar(dev));
    put(st.above, speech.el);
    // each ending says what really happened
    const GONE = {
      'already-contributed': ['You’ve already seen this one differently.', 'Each person offers one perspective per feeling.'],
      'account-inactive': ['Catching is paused for your account.', 'Our safety team has paused your account for now. Feelings you already released still come home to you.'],
    }[e?.code];
    speech.say(GONE ? '' : 'It drifted on before we could catch it. There will be others.');
    put(body,
      h('div', { class: 'hf-copy hf-copy--top', dataset: { test: 'catch-gone' } }, line(GONE ? GONE[0] : 'This feeling drifted on.', { cls: 'hf-line--sm' }),
        h('p', { class: 'hf-sub' }, GONE ? GONE[1] : errorText(e))),
      st.el,
      h('div', { class: 'hf-actions' }, h('button', { type: 'button', class: 'kit-btn kit-btn--ghost kit-btn--block', onclick: () => look() }, 'Look up again')));
  }

  function moreButton() {
    return h('button', { type: 'button', class: 'kit-round', 'aria-label': 'More: report, or never see this person’s feelings', dataset: { test: 'offer-more' }, onclick: () => more() }, icon('more'));
  }
  function more() {
    const holdId = offer?.holdId;
    if (!holdId) return;
    dev.sheet({
      title: 'Something not right?',
      body: h('p', { class: 'hm-sheet-text' }, 'You can report this feeling to a person on our safety team, or make sure feelings from this person never find you again. They won’t be told either way.'),
      actions: [
        h('button', { type: 'button', class: 'kit-btn kit-btn--ghost kit-btn--block', dataset: { test: 'report-feeling' }, onclick: () => report(holdId) }, icon('flag'), 'Report this feeling'),
        h('button', { type: 'button', class: 'kit-btn kit-btn--ghost kit-btn--block', dataset: { test: 'block-author' }, onclick: () => blockAuthor(holdId) }, icon('block'), 'Don’t show me their feelings'),
        h('button', { type: 'button', class: 'kit-btn kit-btn--text kit-btn--block', onclick: () => dev.closeSheet() }, 'Cancel'),
      ],
    });
  }
  async function report(holdId) {
    const pick = await reportSheet(dev, { title: 'Report this feeling', intro: 'What best describes it? It leaves your sky straight away.' });
    if (!pick) return;
    const res = await dev.run(() => c.act('reportFeeling', { holdId, reason: pick.reason }, ['me']));
    if (!res) return;
    offer = null;
    dev.sheet({ title: 'Thank you for telling us', body: h('p', { class: 'hm-sheet-text', dataset: { test: 'report-received' } }, res.expectation),
      actions: [h('button', { type: 'button', class: 'kit-btn kit-btn--ink kit-btn--block', onclick: () => dev.closeSheet() }, 'Okay')] });
    idle({ animate: false });
  }
  async function blockAuthor(holdId) {
    dev.closeSheet();
    const ok = await dev.confirm({ title: 'Never see their feelings?', text: 'Feelings from this person won’t find you again, and your perspectives won’t reach them. Neither of you is told who the other is.', confirmLabel: 'Don’t show me their feelings' });
    if (!ok) return;
    const res = await dev.run(() => c.act('blockContributor', { holdId }, ['me']), { ok: 'Done. Their feelings won’t find you.' });
    if (!res) return;
    offer = null;
    idle({ animate: false });
  }

  function giftsSheet() {
    const list = c.state.gifts || [];
    dev.sheet({
      title: 'Perspectives you’ve offered',
      body: h('div', { class: 'kit-stack' },
        h('p', { class: 'hm-sheet-text' }, 'Your own words, kept with you. Nobody else’s details are ever shown here.'),
        h('ol', { class: 'hf-ribbons' }, list.map((g) => h('li', { class: 'hf-ribbon hf-ribbon--mine', style: { '--ribbon': mine.body } },
          h('span', { class: 'hf-ribbon-src' }, g.journeyHome ? 'Its feeling has come home' : 'Still travelling'),
          h('p', { class: 'hf-ribbon-text' }, g.text))))),
      actions: [h('button', { type: 'button', class: 'kit-btn kit-btn--ink kit-btn--block', onclick: () => dev.closeSheet() }, 'Close')],
    });
  }

  // ------------------------------------------------------------- boot --
  c.refresh('gifts').catch(() => {});
  if (me().activeHold) {
    busy = true;
    idle({ animate: false });
    c.api('findFeeling').then((res) => {
      busy = false;
      if (!alive || !res.offer) { if (alive) idle({ animate: false }); return; }
      offer = res.offer;
      if (offer.state === 'caught') writing(); else arrive();
    }).catch(() => { busy = false; if (alive) idle({ animate: false }); });
  } else idle();

  return {
    el, mood: 'sky',
    update(s, detail) {
      if (!dockSlot.hidden) put(dockSlot, dock(dev, 'catch'));
      if (detail?.gifts && state === 'idle') idle({ animate: false });
      if (detail?.me && (state === 'off' || state === 'idle')) {
        const want = s.me?.profile?.catching && s.me?.accountState === 'active';
        if (want && state === 'off') idle({ animate: false });
        if (!want && state === 'idle') off();
      }
    },
    destroy() { alive = false; st.destroy(); orb?.destroy(); },
  };
}
