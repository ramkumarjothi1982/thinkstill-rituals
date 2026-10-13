// Invitations: each invitation someone sent me is a small moment, not a
// card. Their living Mallow and mine face each other across a glowing arc.
// Accepting is a shared moment that really plays out (both squeeze and
// cheer, hearts cross both ways, the light blooms) and then flows into the
// new Hushspace. Declining is calm: their Mallow steps back, nobody is told
// why. Invitations I sent wait quietly underneath; earlier ones are a
// short, gentle history.

import { h, icon, testTag, styleLabel, availabilityLabel, fmtUntil, fmtWhen } from '../dom.js';
import { MallowSet, face } from '../mallow.js';
import { MALLOWS } from '../mallows-data.js';
import { arc, eyebrow, glow, pillow, round, tags, travel } from '../kit.js';
import { rise, dropIn, reducedMotion, wait } from '../motion.js';

const CLOSED_COPY = { accepted: 'Connected', declined: 'Didn’t connect this time', cancelled: 'Withdrawn', expired: 'Expired' };
const PINK = ['#FF6FB5', '#FFB0F0', '#FF8CC6'];

const mallowOf = (id) => (id && MALLOWS[id] ? id : 'noomi');
const miniTest = () => h('span', { class: 'iv-test', title: 'A simulated account used for testing the prototype' }, 'Test');

export function invitations(device, params = {}) {
  const rm = reducedMotion();
  let set = new MallowSet();
  let dead = false;
  let busy = false;          // a moment is playing: hold rebuilds until it's done
  let stale = false;
  let key = '';

  const body = h('div', { class: 'iv-body' });
  const scroll = h('div', { class: 'hm-scroll iv-scroll' }, body);
  const el = h('div', { class: 'hm-scene iv' },
    h('header', { class: 'hm-top' },
      round(icon('back'), 'Back', () => device.back(), { dataset: { test: 'back' } }),
      h('h1', { class: 'hm-top-label', 'data-autofocus': '' }, 'Invitations'),
      h('span', { class: 'hm-top-spacer', 'aria-hidden': 'true' })),
    scroll);

  const keyOf = (s) => s.invitations.map((i) => `${i.id}:${i.status}`).join(',') + `|${s.me?.profile?.avatar}`;

  // ------------------------------------------------------------ moment --
  function moment(inv, me) {
    const o = inv.other;
    const theirsId = mallowOf(o.avatar);
    const mineId = mallowOf(me?.profile?.avatar);
    const theirs = set.make(theirsId, { eager: true, label: '', particleScale: 0.8 });
    const mine = set.make(mineId, { interactive: true, eager: true, label: `Squeeze ${MALLOWS[mineId].name}, your Mallow`, pressSeconds: 0.6, particleScale: 0.8 });
    theirs.el.setAttribute('aria-hidden', 'true');
    mine.el.tabIndex = -1;            // a toy, not a step: keep the keyboard on Accept and Decline
    mine.el.setAttribute('aria-hidden', 'true');

    const pair = h('div', { class: 'iv-pair' },
      h('span', { class: 'iv-pair-glow', 'aria-hidden': 'true' }),
      arc({ cls: 'iv-pair-arc' }),
      h('div', { class: 'iv-pair-m iv-pair-m--l' }, pillow('iv-pillow'), h('span', { class: 'iv-pair-fig' }, theirs.el)),
      h('div', { class: 'iv-pair-m iv-pair-m--r' }, pillow('iv-pillow'), h('span', { class: 'iv-pair-fig' }, mine.el),
        h('span', { class: 'iv-pair-you', 'aria-hidden': 'true' }, 'You')));

    const nameId = `${device.name}-iv-${inv.id}`;
    // non-breaking inside each item so a narrow line only ever breaks between them
    const meta = [styleLabel(o.style), availabilityLabel(o.availability), o.language].filter(Boolean).map((x) => x.replace(/ /g, '\u00A0')).join('\u00A0· ');
    const status = h('p', { class: 'iv-status', role: 'status', 'aria-live': 'polite' });
    const acceptBtn = h('button', { type: 'button', class: 'kit-btn kit-btn--ink kit-btn--lg iv-accept', 'aria-label': `Accept ${o.pseudonym}’s invitation`, dataset: { test: 'accept' } }, 'Accept', icon('heart'));
    const declineBtn = h('button', { type: 'button', class: 'kit-btn kit-btn--text iv-decline', 'aria-label': `Decline ${o.pseudonym}’s invitation`, dataset: { test: 'decline' } }, 'Decline');
    const actions = h('div', { class: 'iv-actions' }, acceptBtn, declineBtn);
    const ask = h('p', { class: 'iv-ask' }, h('span', { class: 'iv-ask-dot', 'aria-hidden': 'true' }),
      h('span', { class: 'iv-ask-main' }, 'Would like to be Hushmates'), h('span', { class: 'iv-ask-sep' }, ' · '), h('span', { class: 'iv-ask-exp' }, `expires ${fmtUntil(inv.expiresAt)}`));
    const words = h('div', { class: 'iv-words' },
      h('h2', { class: 'iv-name', id: nameId }, h('span', {}, o.pseudonym), o.test ? testTag() : null),
      meta ? h('p', { class: 'iv-meta' }, meta) : null,
      o.interests?.length ? tags(o.interests, MALLOWS[o.avatar]) : null,
      ask);
    const section = h('section', { class: 'iv-moment', 'aria-labelledby': nameId, dataset: { test: `received-${o.pseudonym}` } },
      pair, words, h('div', { class: 'iv-act-zone' }, actions, status));

    const m = { inv, theirs, mine, pair, section, words, actions, status, acceptBtn, declineBtn };
    const setBusy = (on) => { acceptBtn.disabled = on; declineBtn.disabled = on; section.classList.toggle('is-busy', on); };
    acceptBtn.addEventListener('click', () => accept(m, setBusy));
    declineBtn.addEventListener('click', () => decline(m, setBusy));
    m.enter = (delay) => {
      dropIn(theirs.el.parentElement, { delay, y: -50, scale: 0.82 });
      dropIn(mine.el.parentElement, { delay: delay + 120, y: -50, scale: 0.82 });
      setTimeout(() => { if (!dead) { theirs.leanTo(0.45); mine.leanTo(-0.45); } }, rm ? 0 : delay + 700);
    };
    return m;
  }

  async function accept(m, setBusy) {
    if (busy) return;
    busy = true;
    setBusy(true);
    const name = m.inv.other.pseudonym;
    // anticipation: both draw in a breath while the answer travels
    m.theirs.press(0.45, 0.35);
    m.mine.press(0.45, 0.35);
    const r = await device.run(() => device.client.act('respondToInvitation', { id: m.inv.id, accept: true }, ['invitations', 'hushmates', 'me']));
    if (dead) return;
    if (!r || !r.conversationId) {
      m.theirs.release(true); m.mine.release(true);
      setBusy(false);
      busy = false;
      if (stale) refresh();
      return;
    }
    m.section.classList.add('is-joined');
    m.status.textContent = `You and ${name} are Hushmates. Opening your Hushspace…`;
    m.theirs.release(); m.mine.release();
    m.theirs.leanTo(1); m.mine.leanTo(-1);
    m.theirs.cheer(0.04); m.mine.cheer(0.14);
    const box = m.pair.getBoundingClientRect();
    const dev = device.root.getBoundingClientRect();
    if (dev.width && dev.height) {
      device.atmo.bloom({ x: (box.left + box.width / 2 - dev.left) / dev.width, y: (box.top + box.height * 0.45 - dev.top) / dev.height, colour: 'rgba(255,214,236,.95)' });
    }
    if (!rm) {
      travel(m.pair, { from: [22, 58], via: [50, 6], to: [78, 58], kind: 'heart', duration: 1000 });
      setTimeout(() => !dead && travel(m.pair, { from: [78, 58], via: [50, 10], to: [22, 58], kind: 'heart', duration: 1000 }), 180);
      setTimeout(() => {
        if (dead) return;
        m.theirs.pulseBlush(); m.mine.pulseBlush();
        m.theirs.emit('heart', 5, PINK); m.mine.emit('heart', 5, PINK);
      }, 900);
    } else {
      m.theirs.pulseBlush(); m.mine.pulseBlush();
    }
    await wait(rm ? 300 : 1450);
    if (dead) return;
    device.go('hushspace', { id: r.conversationId }, { transition: 'portal' });
  }

  async function decline(m, setBusy) {
    if (busy) return;
    busy = true;
    setBusy(true);
    const r = await device.run(() => device.client.act('respondToInvitation', { id: m.inv.id, accept: false }, ['invitations', 'me']));
    if (dead) return;
    if (!r) { setBusy(false); busy = false; if (stale) refresh(); return; }
    m.theirs.leanTo(0); m.mine.leanTo(0);
    m.theirs.stepBack();
    m.section.classList.add('is-declined');
    m.status.textContent = 'Declined quietly.';
    device.toast('Declined quietly. They aren’t told why.');
    await wait(rm ? 300 : 1300);
    if (dead) return;
    busy = false;
    refresh(true);
  }

  // -------------------------------------------------------------- rows --
  function sentRow(inv) {
    const o = inv.other;
    const withdraw = h('button', { type: 'button', class: 'kit-btn kit-btn--text kit-btn--sm iv-withdraw', dataset: { test: 'withdraw' },
      'aria-label': `Withdraw your invitation to ${o.pseudonym}`,
      onclick: async () => {
        withdraw.disabled = true;
        const r = await device.run(() => device.client.act('cancelInvitation', { id: inv.id }, ['invitations', 'me']), { ok: 'Invitation withdrawn.' });
        if (!r && !dead) withdraw.disabled = false;
      } }, 'Withdraw');
    return h('div', { class: 'iv-row iv-row--sent' },
      h('span', { class: 'iv-row-face' }, face(o.avatar, { size: 40 }), o.test ? miniTest() : null),
      h('div', { class: 'iv-row-text' },
        h('p', { class: 'iv-row-name' }, h('span', {}, `Waiting for ${o.pseudonym}`)),
        h('p', { class: 'iv-row-sub' }, `sent ${fmtWhen(inv.createdAt)} · expires ${fmtUntil(inv.expiresAt)}`),
        withdraw));
  }

  function earlierRow(inv) {
    const o = inv.other;
    const open = inv.status === 'accepted' && inv.conversationId
      ? h('button', { type: 'button', class: 'kit-btn kit-btn--ghost kit-btn--xs iv-open', 'aria-label': `Open your Hushspace with ${o.pseudonym}`,
        onclick: () => device.go('hushspace', { id: inv.conversationId }, { transition: 'portal' }) }, 'Open')
      : null;
    return h('div', { class: `iv-row iv-row--earlier iv-row--${inv.status}` },
      h('span', { class: 'iv-row-face' }, face(o.avatar, { size: 34 }), o.test ? miniTest() : null),
      h('div', { class: 'iv-row-text' },
        h('p', { class: 'iv-row-name' }, h('span', {}, o.pseudonym)),
        h('p', { class: 'iv-row-sub' }, h('i', { 'aria-hidden': 'true' }), `${inv.direction === 'sent' ? 'You invited them' : 'They invited you'} · ${CLOSED_COPY[inv.status] || inv.status}`)),
      open);
  }

  // --------------------------------------------------------------- body --
  let moments = [];
  function build(s) {
    set.destroy();
    set = new MallowSet();
    // oldest first: they expire first, and a new arrival lands below rather than under your finger
    const received = s.invitations.filter((i) => i.direction === 'received' && i.status === 'pending').sort((a, b) => a.createdAt - b.createdAt);
    const sent = s.invitations.filter((i) => i.direction === 'sent' && i.status === 'pending');
    const earlier = s.invitations.filter((i) => i.status !== 'pending').slice(0, 12);
    const note = h('p', { class: 'kit-note iv-note' }, 'Invitations expire after 7 days. After a decline, the other person can’t ask again for a while.');
    moments = received.map((inv) => moment(inv, s.me));

    const parts = [];
    if (moments.length) {
      parts.push(h('div', { class: 'iv-intro' }, eyebrow(moments.length > 1 ? `${moments.length} waiting for you` : 'Waiting for you', { center: true })));
      moments.forEach((m, i) => { if (i) parts.push(h('span', { class: 'iv-sep', 'aria-hidden': 'true' })); parts.push(m.section); });
    } else {
      const noomi = set.make('noomi', { interactive: true, label: 'Squeeze Noomi', pressSeconds: 0.7 });
      parts.push(h('div', { class: 'iv-empty' },
        h('div', { class: 'iv-empty-stage' }, glow(MALLOWS.noomi.glow), pillow(), h('div', { class: 'iv-empty-m' }, noomi.el)),
        h('h2', { class: 'kit-title kit-title--sm iv-empty-title' }, 'No invitations right now.'),
        note));
    }
    if (sent.length) parts.push(h('section', { class: 'kit-section iv-list', 'aria-label': 'Invitations you sent' }, h('p', { class: 'kit-label' }, 'You sent'), h('div', { class: 'kit-rows' }, sent.map(sentRow))));
    if (earlier.length) parts.push(h('section', { class: 'kit-section iv-list iv-list--earlier', 'aria-label': 'Earlier invitations' }, h('p', { class: 'kit-label' }, 'Earlier'), h('div', { class: 'kit-rows' }, earlier.map(earlierRow))));
    if (moments.length) parts.push(note);
    body.replaceChildren(...parts);
  }

  function entrance() {
    moments.forEach((m, i) => m.enter(120 + i * 160));
    rise([...body.querySelectorAll('.iv-intro, .iv-words, .iv-actions, .iv-empty-title, .iv-list, .iv-note')], { delay: 160, stagger: 60 });
    const em = body.querySelector('.iv-empty-m');
    if (em) dropIn(em, { delay: 100 });
  }

  function refresh(force = false) {
    if (dead) return;
    const s = device.state;
    if (busy) { stale = true; return; }
    const k = keyOf(s);
    if (!force && k === key) return;
    key = k;
    stale = false;
    const before = new Set(moments.map((m) => m.inv.id));
    const top = scroll.scrollTop;
    build(s);
    scroll.scrollTop = top;
    // only an invitation that has just arrived makes an entrance; the rest simply stays
    moments.forEach((m) => {
      if (before.has(m.inv.id)) { m.theirs.leanTo(0.45); m.mine.leanTo(-0.45); return; }
      m.enter(60);
      rise([m.words, m.actions], { delay: 160, y: 10, stagger: 60 });
    });
    if (!moments.length && before.size) rise([...body.querySelectorAll('.iv-empty')], { y: 8 });
  }

  key = keyOf(device.state);
  build(device.state);

  return {
    el,
    mood: 'warm',
    mounted() {
      if (params.refresh) moments.forEach((m) => { m.theirs.leanTo(0.45); m.mine.leanTo(-0.45); });
      else entrance();
    },
    update() { refresh(); },
    destroy() { dead = true; set.destroy(); },
  };
}
