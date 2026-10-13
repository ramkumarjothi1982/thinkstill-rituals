// CATCH: someone else's feeling finds you. You may catch it or let it float
// past (always fine, never counted against you). If you catch it, you offer a
// possibility, not a verdict; it gains a petal in your Mallow's colour and
// travels on. Only after giving your own do you see how others saw it.
//   off · idle → looking → none | offer → writing → passing → after   (gone: it drifted on)

import { h, icon } from '../dom.js';
import { eyebrow, headline, pillow, sentenceSwitch, chip } from '../kit.js';
import { Mallow } from '../mallow.js';
import { MALLOWS } from '../mallows-data.js';
import { Orb, fly, centreIn } from '../orb.js';
import { Sky } from '../sky.js';
import { play } from '../sound.js';
import { wait, reducedMotion, rise } from '../motion.js';
import { screenReframe } from '../../core/feeling-safety.js';
import { charCount } from '../../core/text-policy.js';
import { RELAY } from '../../core/relay-config.js';
import { brandBar, dock, top, feelChip, feelColour, errorText, reportSheet, perspective } from './common.js';

const STARTERS = ['Another possibility could be…', 'Maybe…', 'Could there be another explanation?'];

export function catchScene(dev) {
  const c = dev.client;
  const me = () => dev.state.me;
  const mine = MALLOWS[me().profile.mallow] || MALLOWS.noomi;
  const mem = (dev.memory.catch ||= { drafts: {}, cids: {} });
  let state = 'idle';
  let offer = null;
  let alive = true;
  let busy = false;
  let orb = null;

  const sky = new Sky({ seed: 11 });
  const head = h('div', { class: 'rl-head-slot' });
  const body = h('div', { class: 'rl-body' });
  const orbSlot = h('div', { class: 'rl-orb-slot' });
  const mallow = new Mallow(mine.id, { interactive: true, eager: true, label: `Squeeze ${mine.name}`, onSqueeze: () => play('squish') });
  const stage = h('div', { class: 'rl-stage' }, orbSlot, h('div', { class: 'rl-stage-ground' }, pillow('rl-pillow'), h('div', { class: 'rl-stage-mallow' }, mallow.el)));
  const foot = h('div', { class: 'rl-foot' });
  const dockSlot = h('div', { class: 'rl-dock-slot' });
  const flight = h('div', { class: 'rl-flight', 'aria-hidden': 'true' });
  const el = h('div', { class: 'hm-scene rl-scene rl-catch', dataset: { state } }, sky.el, head, body, stage, foot, dockSlot, flight);

  const put = (node, ...kids) => node.replaceChildren(...kids.flat().filter(Boolean));
  function setState(s, { withDock = false } = {}) {
    state = s;
    el.dataset.state = s;
    dockSlot.hidden = !withDock;
    if (withDock) put(dockSlot, dock(dev, 'catch'));
  }
  function clearOrb() { orb?.destroy(); orb?.el.remove(); orb = null; orbSlot.replaceChildren(); }

  // -------------------------------------------------------------- off --
  function off() {
    setState('off', { withDock: true });
    clearOrb();
    put(head, brandBar(dev));
    const active = me().accountState === 'active';
    put(body, h('div', { class: 'rl-hero' },
      eyebrow('Catch', { center: true }),
      headline('h1', 'Let feelings', 'find you', { grad: 'mates' }),
      h('p', { class: 'kit-lede rl-hero-lede' }, active
        ? 'When it’s on, you can look up and catch a feeling someone has released, and offer another way of seeing it.'
        : 'Your account can’t catch feelings right now.')));
    put(foot, active ? sentenceSwitch({
      label: 'Let feelings find me', hint: 'Always voluntary: you choose when to look, and you can let any feeling float past without penalty. You can turn this off any time.',
      checked: false, test: 'catching-on',
      onChange: async (on) => {
        const r = await dev.run(() => c.act('savePreferences', { catching: on }, ['me']));
        if (!r) return false;
        if (on) idle();
        return true;
      },
    }) : null);
  }

  // ------------------------------------------------------------- idle --
  function idle({ animate = true } = {}) {
    if (!me().profile.catching || me().accountState !== 'active') { off(); return; }
    setState('idle', { withDock: true });
    clearOrb();
    orbSlot.append(h('span', { class: 'rl-catch-window', 'aria-hidden': 'true' }, h('i'), h('i'), h('i')));
    put(head, brandBar(dev));
    put(body, h('div', { class: 'rl-hero' },
      eyebrow('Catch', { center: true }),
      headline('h1', 'Catch a', 'feeling', { grad: 'mates', cls: 'kit-title--xl' }),
      h('p', { class: 'kit-lede rl-hero-lede' }, 'Somewhere, someone let a feeling go. Maybe you can see it another way.')));
    const gifts = c.state.gifts?.length || 0;
    put(foot,
      h('button', { type: 'button', class: 'kit-btn kit-btn--ink kit-btn--lg kit-btn--block', dataset: { test: 'find-feeling' }, onclick: () => look() }, icon('sparkle'), 'Look up'),
      gifts ? h('button', { type: 'button', class: 'kit-btn kit-btn--text kit-btn--block', dataset: { test: 'my-gifts' }, onclick: () => giftsSheet() }, `Perspectives you’ve offered · ${gifts}`)
        : h('p', { class: 'rl-note' }, 'Catching is always voluntary. Letting a feeling float past is always fine.'));
    if (animate) rise([...body.querySelectorAll('.rl-hero > *'), foot], { y: 14, stagger: 60 });
  }

  // ---------------------------------------------------------- looking --
  async function look() {
    if (busy) return;
    busy = true;
    setState('looking');
    put(foot, h('button', { type: 'button', class: 'kit-btn kit-btn--ink kit-btn--lg kit-btn--block', disabled: true }, 'Looking up…'));
    mallow.cheer();
    sky.pan(140, { duration: 1400 });
    let r;
    try {
      [r] = await Promise.all([c.api('findFeeling'), wait(reducedMotion() ? 0 : 900)]);
    } catch (e) {
      busy = false;
      sky.pan(0, { duration: 900 });
      if (!alive) return;
      dev.toast(errorText(e), { tone: 'warn', ms: 4200 });
      if (e.code === 'not-catching' || e.code === 'account-inactive') { await c.refresh('me').catch(() => {}); off(); } else idle({ animate: false });
      return;
    }
    busy = false;
    if (!alive) return;
    dev.onScreen?.('catch:result', { text: r.offer?.feeling.text || null });
    if (!r.offer) { none(); return; }
    offer = r.offer;
    if (offer.state === 'caught') writing(); else await arrive();
  }

  function none() {
    setState('none', { withDock: true });
    sky.pan(0, { duration: 1600 });
    put(body, h('div', { class: 'rl-hero', dataset: { test: 'catch-none' } },
      h('h1', { class: 'kit-title kit-title--md', 'data-autofocus': '' }, 'No feelings are floating your way right now.'),
      h('p', { class: 'kit-lede rl-hero-lede' }, 'That’s okay. When someone releases one, it might find you.')));
    put(foot, h('button', { type: 'button', class: 'kit-btn kit-btn--ghost kit-btn--block', dataset: { test: 'look-again' }, onclick: () => look() }, 'Look again'));
  }

  // ------------------------------------------------------------ offer --
  async function arrive() {
    setState('offer');
    sky.pan(0, { duration: 1800 });
    const f = offer.feeling;
    put(head, top(dev, { title: 'A feeling has found you', action: moreButton() }));
    clearOrb();
    orb = new Orb({ size: null, tint: feelColour(f.label), text: f.text, label: `A feeling: ${f.text}` });
    const orbBox = h('div', { class: 'rl-offer-orb' }, orb.el);
    put(body, h('div', { class: 'hm-scroll rl-offer', dataset: { test: 'catch-offer' } },
      orbBox,
      h('h1', { class: 'kit-title kit-title--md rl-center', 'data-autofocus': '' }, 'A feeling has ', h('em', { class: 'kit-grad kit-grad--mates' }, 'found you.')),
      h('figure', { class: 'rl-card rl-feeling-card' },
        h('p', { class: 'rl-quote', dataset: { test: 'offer-text' } }, f.text),
        h('figcaption', { class: 'rl-feeling-meta' }, feelChip(f.label), h('span', { class: 'rl-meta' }, `${f.perspectivesSoFar} of ${f.of} perspectives so far`))),
      h('p', { class: 'kit-note rl-center' }, 'It will wait for you for a few minutes. Letting it float past is always fine.')));
    put(foot,
      h('button', { type: 'button', class: 'kit-btn kit-btn--ink kit-btn--block', dataset: { test: 'catch-feeling' }, onclick: () => catchIt() }, 'Catch this feeling'),
      h('button', { type: 'button', class: 'kit-btn kit-btn--ghost kit-btn--block', dataset: { test: 'float-past' }, onclick: () => floatPast() }, 'Let it float past'));
    play('arrive');
    if (!reducedMotion()) {
      await wait(30);
      const to = centreIn(orbBox, flight);
      const flyer = h('div', { class: 'rl-flyer' });
      flight.append(flyer);
      orb.freeze();
      flyer.append(orb.el);
      await fly(flyer, flight, { from: { x: to.x + 50, y: -120 }, to, via: { x: to.x - 80, y: to.y * 0.3 }, duration: 1500, scale: [0.4, 1], colour: feelColour(f.label) });
      if (!alive) return;
      orbBox.append(orb.el.isConnected ? orb.unfreeze().el : orb.el);
      flyer.remove();
      orb.release(true);
    }
    orb.showText(false);
  }

  async function catchIt() {
    if (busy) return;
    busy = true;
    try {
      const r = await c.api('catchFeeling', { holdId: offer.holdId });
      offer = r.offer;
    } catch (e) { busy = false; lost(e); return; }
    busy = false;
    play('catch');
    orb?.squeeze(0.8, 0.25);
    await wait(260);
    orb?.release();
    writing();
  }

  async function floatPast() {
    if (busy) return;
    busy = true;
    const holdId = offer?.holdId;
    if (orb && !reducedMotion()) {
      play('pass');
      const from = centreIn(orb.el, flight);
      const flyer = h('div', { class: 'rl-flyer' });
      flight.append(flyer); orb.freeze(); flyer.append(orb.el);
      fly(flyer, flight, { from, to: { x: from.x + 160, y: -140 }, duration: 1300, scale: [1, 0.3], trail: true, colour: feelColour(offer.feeling.label) }).then(() => flyer.remove());
    }
    try { await c.api('letFloatPast', { holdId }); } catch { /* it expires on its own anyway */ }
    busy = false;
    offer = null;
    if (!alive) return;
    dev.toast('It floats on to someone else.');
    idle();
  }

  // ---------------------------------------------------------- writing --
  function writing(err = '') {
    setState('writing');
    const f = offer.feeling;
    clearOrb();
    put(head, top(dev, { title: 'Offer a perspective', action: moreButton() }));
    orb = new Orb({ size: null, tint: feelColour(f.label), label: 'The feeling you caught' });
    const area = h('textarea', { class: 'kit-textarea rl-reframe-input', rows: 4, maxlength: String(RELAY.reframeMaxChars + 40), placeholder: 'Another possibility could be…', 'aria-label': 'Your perspective', 'aria-describedby': 'rl-rf-hint rl-rf-count', dataset: { test: 'reframe-text' } });
    area.value = mem.drafts[offer.holdId] || '';
    const count = h('span', { class: 'rl-count', id: 'rl-rf-count' });
    const nudge = h('p', { class: 'rl-nudge', role: 'status', 'aria-live': 'polite' });
    const error = h('p', { class: 'kit-error', role: 'alert', dataset: { test: 'reframe-error' } }, err);
    const send = h('button', { type: 'button', class: 'kit-btn kit-btn--ink kit-btn--block', dataset: { test: 'reframe-submit' }, onclick: () => submit(area.value) }, 'Add my perspective');
    const sync = () => {
      mem.drafts[offer.holdId] = area.value;
      const n = charCount(area.value.trim());
      count.textContent = `${n} / ${RELAY.reframeMaxChars}`;
      count.classList.toggle('is-over', n > RELAY.reframeMaxChars);
      send.disabled = n < RELAY.reframeMinChars || n > RELAY.reframeMaxChars;
      const local = n >= RELAY.reframeMinChars ? screenReframe(area.value, { maxChars: RELAY.reframeMaxChars }) : null;
      nudge.textContent = local?.ok && local.nudges.includes('certainty') ? 'Try holding it lightly: “maybe” or “could” leaves room for them.' : '';
    };
    area.addEventListener('input', () => { error.textContent = ''; sync(); });
    const starters = h('div', { class: 'kit-chips rl-starters', role: 'group', 'aria-label': 'Ways to begin' },
      STARTERS.map((s, i) => chip(s, false, () => {
        const lead = s.replace(/…$/, ' ');
        area.value = area.value.trim() ? `${area.value.trim()} ${lead}` : lead;
        area.dispatchEvent(new Event('input'));
        area.focus();
        area.setSelectionRange(area.value.length, area.value.length);
      }, { small: true, test: `starter-${i}` })));
    put(body, h('div', { class: 'hm-scroll rl-writing' },
      h('figure', { class: 'rl-card rl-feeling-card rl-feeling-card--context' },
        h('div', { class: 'rl-context-orb' }, orb.el),
        h('div', { class: 'rl-context-text' },
          h('p', { class: 'kit-label' }, 'Their feeling'),
          h('p', { class: 'rl-quote', dataset: { test: 'caught-text' } }, f.text),
          h('p', { class: 'rl-feeling-meta' }, feelChip(f.label), h('span', { class: 'rl-meta' }, `${f.perspectivesSoFar} of ${f.of} so far`)))),
      h('h1', { class: 'kit-title kit-title--md', 'data-autofocus': '' }, 'Can you see this ', h('em', { class: 'kit-grad kit-grad--mates' }, 'another way?')),
      h('p', { class: 'kit-body', id: 'rl-rf-hint' }, 'Offer a possibility, not a verdict.'),
      starters,
      h('div', { class: 'rl-field' }, area, count),
      nudge, error,
      h('ul', { class: 'rl-guides' },
        h('li', {}, icon('check'), 'A possibility, gently held'),
        h('li', {}, icon('x'), 'No diagnosis, no judgement, no orders'),
        h('li', {}, icon('eyeOff'), 'They’ll never know who you are, and neither of you can contact the other'))));
    put(foot, send, h('button', { type: 'button', class: 'kit-btn kit-btn--text kit-btn--block', dataset: { test: 'float-past' }, onclick: () => floatPast() }, 'Let it float past'));
    sync();
    if (err) error.textContent = err;
    // on a short screen, start at the question and the text box (their words are just above)
    requestAnimationFrame(() => {
      const scroller = body.querySelector('.rl-writing');
      const title = scroller?.querySelector('.kit-title');
      if (scroller && title && scroller.scrollHeight > scroller.clientHeight + 40) scroller.scrollTop = title.offsetTop - 6;
      if (err) error.scrollIntoView({ block: 'center' });
    });
  }

  async function submit(text) {
    if (busy) return;
    busy = true;
    const holdId = offer.holdId;
    mem.cids[holdId] ||= c.newId();
    foot.querySelectorAll('button').forEach((b) => { b.disabled = true; });
    let r;
    try {
      r = await c.act('submitReframe', { holdId, text, clientId: mem.cids[holdId] }, ['me', 'gifts']);
    } catch (e) {
      busy = false;
      if (!alive) return;
      if (String(e.code).startsWith('reframe-')) { writing(errorText(e)); return; }
      if (['hold-expired', 'not-available', 'already-contributed', 'account-inactive'].includes(e.code)) { lost(e); return; }
      dev.toast(errorText(e), { tone: 'warn', ms: 4200 });
      foot.querySelectorAll('button').forEach((b) => { b.disabled = false; });
      return;
    }
    busy = false;
    delete mem.drafts[holdId];
    if (!alive) return;
    await passing(r);
    if (!alive) return;
    after(r);
  }

  // ---------------------------------------------------------- passing --
  async function passing(r) {
    setState('passing');
    const f = offer.feeling;
    clearOrb();
    put(head, h('header', { class: 'rl-top' }));
    orb = new Orb({ size: null, tint: feelColour(f.label), label: 'The feeling, carrying your perspective' });
    orbSlot.append(orb.el);
    const line = h('p', { class: 'rl-launch-copy', role: 'status', 'aria-live': 'polite' });
    put(body, h('div', { class: 'rl-hero' }, line));
    put(foot);
    const say = (t) => { line.textContent = t; line.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 600, easing: 'cubic-bezier(.22,1,.36,1)' }); };
    const rm = reducedMotion();
    await wait(rm ? 0 : 450);
    play('petal');
    orb.addPetal(mine.id);
    mallow.cheer();
    mallow.signature(0.8);
    say('Your perspective is woven in.');
    await wait(rm ? 300 : 1500);
    if (!alive) return;
    play('pass');
    say(r.homeward ? 'That was the fifth. This feeling is heading home.' : 'It’s travelling on to find someone else.');
    if (!rm) {
      const from = centreIn(orb.el, flight);
      const flyer = h('div', { class: 'rl-flyer' });
      flight.append(flyer); orb.freeze(); flyer.append(orb.el);
      sky.pan(220, { duration: 2200 });
      await fly(flyer, flight, { from, to: { x: from.x - 40, y: -150 }, via: { x: from.x + 90, y: from.y * 0.4 }, duration: 1900, scale: [1, 0.3], colour: feelColour(f.label) });
      flyer.remove();
    }
    await wait(rm ? 400 : 500);
  }

  // ------------------------------------------------------------ after --
  function after(r) {
    setState('after', { withDock: true });
    sky.pan(0, { duration: 1600 });
    clearOrb();
    put(head, brandBar(dev));
    const earlier = r.earlier || [];
    put(body, h('div', { class: 'hm-scroll rl-after', dataset: { test: 'reframe-after' } },
      h('h1', { class: 'kit-title kit-title--md', 'data-autofocus': '' }, earlier.length ? 'How others ' : 'You were the first ', h('em', { class: 'kit-grad kit-grad--mates' }, earlier.length ? 'saw it' : 'to see it differently')),
      h('p', { class: 'kit-body' }, earlier.length
        ? 'You see these only after offering your own, so every perspective stays truly yours.'
        : 'Others may add theirs after you. The person who let it go will see them all when it comes home.'),
      h('div', { class: 'rl-after-list' },
        earlier.map((p) => perspective({ id: `e${p.slot}`, kind: 'human', source: 'human', text: p.text }, { compact: true })),
        h('article', { class: 'rl-persp rl-persp--mine', style: { '--ribbon': `linear-gradient(90deg, ${mine.body}, ${mine.glow})` } },
          h('p', { class: 'rl-persp-src' }, icon('heart'), h('span', {}, 'Your perspective')),
          h('p', { class: 'rl-persp-text' }, r.perspective?.text || ''))),
      h('p', { class: 'kit-note' }, r.homeward ? 'This feeling has five perspectives now and is on its way home.' : `This was perspective ${r.slot} of ${RELAY.perspectivesPerFeeling}.`)));
    put(foot, h('div', { class: 'kit-row' },
      h('button', { type: 'button', class: 'kit-btn kit-btn--ink', dataset: { test: 'catch-another' }, onclick: () => look() }, 'Catch another'),
      h('button', { type: 'button', class: 'kit-btn kit-btn--ghost', dataset: { test: 'catch-done' }, onclick: () => idle() }, 'Done')));
    offer = null;
  }

  // ------------------------------------------------- lost / report / more --
  function lost(e) {
    offer = null;
    setState('gone', { withDock: true });
    clearOrb();
    put(head, brandBar(dev));
    put(body, h('div', { class: 'rl-hero', dataset: { test: 'catch-gone' } },
      h('h1', { class: 'kit-title kit-title--md', 'data-autofocus': '' }, 'This feeling drifted on.'),
      h('p', { class: 'kit-lede rl-hero-lede' }, errorText(e))));
    put(foot, h('button', { type: 'button', class: 'kit-btn kit-btn--ghost kit-btn--block', onclick: () => look() }, 'Look up again'));
  }

  function moreButton() {
    return h('button', { type: 'button', class: 'kit-round', 'aria-label': 'More: report or never see this person’s feelings', dataset: { test: 'offer-more' }, onclick: () => more() }, icon('more'));
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
    const r = await dev.run(() => c.act('reportFeeling', { holdId, reason: pick.reason }, ['me']));
    if (!r) return;
    offer = null;
    dev.sheet({ title: 'Thank you for telling us', body: h('p', { class: 'hm-sheet-text', dataset: { test: 'report-received' } }, r.expectation),
      actions: [h('button', { type: 'button', class: 'kit-btn kit-btn--ink kit-btn--block', onclick: () => dev.closeSheet() }, 'Okay')] });
    idle({ animate: false });
  }
  async function blockAuthor(holdId) {
    dev.closeSheet();
    const ok = await dev.confirm({ title: 'Never see their feelings?', text: 'Feelings from this person won’t find you again, and your perspectives won’t reach them. Neither of you is told who the other is.', confirmLabel: 'Don’t show me their feelings' });
    if (!ok) return;
    const r = await dev.run(() => c.act('blockContributor', { holdId }, ['me']), { ok: 'Done. Their feelings won’t find you.' });
    if (!r) return;
    offer = null;
    idle({ animate: false });
  }

  function giftsSheet() {
    const list = c.state.gifts || [];
    dev.sheet({
      title: 'Perspectives you’ve offered',
      body: h('div', { class: 'kit-stack' },
        h('p', { class: 'hm-sheet-text' }, 'Your own words, kept with you. Nobody else’s details are ever shown here.'),
        list.map((g) => h('article', { class: 'rl-persp rl-persp--mine' },
          h('p', { class: 'rl-persp-src' }, icon('heart'), h('span', {}, g.journeyHome ? 'Its feeling has come home' : 'Still travelling')),
          h('p', { class: 'rl-persp-text' }, g.text)))),
      actions: [h('button', { type: 'button', class: 'kit-btn kit-btn--ink kit-btn--block', onclick: () => dev.closeSheet() }, 'Close')],
    });
  }

  // ------------------------------------------------------------- boot --
  c.refresh('gifts').catch(() => {});
  if (me().activeHold) {
    busy = true;
    idle({ animate: false });
    c.api('findFeeling').then((r) => {
      busy = false;
      if (!alive || !r.offer) { if (alive) idle({ animate: false }); return; }
      offer = r.offer;
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
    destroy() { alive = false; mallow.destroy(); orb?.destroy(); },
  };
}
