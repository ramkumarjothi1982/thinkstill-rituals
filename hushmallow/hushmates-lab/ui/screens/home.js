// Home: a little world, not a menu. My own living Mallow sits on a cloud
// pillow in the middle; the people I've chosen (my open Hushspaces) float
// around me as smaller Mallows, linked to me by soft glowing arcs, and each
// one is the way into our Hushspace. Free places in the circle are dashed
// bubbles that lead to Find; an invitation that arrives floats in as a
// bubble. Everything below the stage is quiet text.
//
// The scene keeps its Mallows alive across state changes: it reconciles the
// stage only when the structure changes (my profile, which Hushspaces are
// open, how many invitations are waiting) and otherwise patches badges and
// pills in place. Hushmates' Mallows only react to real events (a message
// really arrived); never to my touches and never to what anyone wrote.

import { h, icon, statusOf } from '../dom.js';
import { MallowSet, face } from '../mallow.js';
import { MALLOWS, LOGO } from '../mallows-data.js';
import { arc, eyebrow, pillow, sentenceSwitch } from '../kit.js';
import { dropIn, rise, reducedMotion, CSS_EASE } from '../motion.js';
import { STATUSES } from '../../core/config.js';

// Orbit places around me, as fractions of the stage: x = centre, y = top of
// the Mallow, w = Mallow width (of the stage width). Front pair low and
// larger, the third further back, higher and smaller (the landing's depth tiers).
const ORBIT = [
  { x: 0.165, y: 0.34, w: 0.2, lean: 0.35 },
  { x: 0.835, y: 0.30, w: 0.2, lean: -0.35 },
  { x: 0.34, y: 0.045, w: 0.17, lean: 0.25 },
];
const ORBIT_SM = [
  { x: 0.165, y: 0.38, w: 0.2, lean: 0.35 },
  { x: 0.835, y: 0.35, w: 0.2, lean: -0.35 },
  { x: 0.31, y: 0.05, w: 0.16, lean: 0.25 },
];
const ME = { x: 0.5, bottom: 0.125, w: 0.36 };
const ANCHOR = [-0.085, 0.085, -0.03];   // where each arc leaves my Mallow (x offset, of the stage width)
const ART_RATIO = 0.94;       // Mallow art height / width
const RESTING = new Set(['quiet', 'break']);

const byCreated = (a, b) => ((a.createdAt || 0) - (b.createdAt || 0)) || String(a.id).localeCompare(String(b.id));
const openOf = (s) => s.hushmates.filter((x) => x.open).sort(byCreated);
const pendingOf = (s) => s.invitations.filter((i) => i.direction === 'received' && i.status === 'pending');
const unreadOf = (v) => (v.open && !v.muted ? v.unread || 0 : 0);

function testMark() {
  return h('span', { class: 'ho-test', title: 'A simulated account used for testing the prototype' }, 'Test');
}

/** The status sheet: three big radio rows and the "Pause new invitations" sentence switch. */
export function statusSheet(device) {
  const me = device.state.me;
  if (!me?.profile) return;
  const p = me.profile;
  const rows = STATUSES.map((s) => {
    const btn = h('button', {
      type: 'button', role: 'radio', class: `ho-radio ho-radio--${s.id}`, 'aria-checked': String(p.status === s.id), dataset: { test: `status-${s.id}` },
      onclick: async () => {
        if (btn.getAttribute('aria-checked') === 'true') { device.closeSheet(); return; }
        rows.forEach((r) => r.setAttribute('aria-checked', String(r === btn)));
        const ok = await device.run(() => device.client.act('saveProfile', { status: s.id }, ['me']),
          { ok: s.id === 'break' ? 'Taking a break. Come back whenever you like.' : s.id === 'quiet' ? 'Quiet mode. Replies can wait.' : 'Available.' });
        if (ok) device.closeSheet();
        else rows.forEach((r) => r.setAttribute('aria-checked', String(r.dataset.test === `status-${device.state.me?.profile?.status}`)));
      },
    },
    h('span', { class: 'ho-radio-dot', 'aria-hidden': 'true' }),
    h('span', { class: 'ho-radio-text' }, h('strong', {}, s.label), h('span', {}, s.line)),
    h('span', { class: 'ho-radio-check', 'aria-hidden': 'true' }, icon('check')));
    return btn;
  });
  device.sheet({
    title: 'How are you showing up?',
    label: 'Your status',
    body: [
      h('p', { class: 'hm-sheet-text ho-sheet-text' }, 'Your Hushmates see this. It’s always your choice, never worked out from what you do.'),
      h('div', { class: 'ho-radios', role: 'radiogroup', 'aria-label': 'Your status' }, rows),
      sentenceSwitch({
        id: `${device.name}-pause-invites`, label: 'Pause new invitations', hint: 'Nobody new can invite you. Your Hushmates are unaffected.',
        checked: !p.acceptingInvites,
        onChange: async (on) => {
          const r = await device.run(() => device.client.act('saveProfile', { acceptingInvites: !on }, ['me']),
            { ok: on ? 'New invitations paused.' : 'Invitations open again.' });
          return r ? true : false;
        },
      }),
    ],
  });
}

export function home(device, params = {}) {
  const set = new MallowSet();
  const rm = reducedMotion();
  const timers = new Set();
  const later = (fn, ms) => { const t = setTimeout(() => { timers.delete(t); if (!dead) fn(); }, ms); timers.add(t); return t; };
  let dead = false;
  let key = '';
  let meM = null;
  let meAvatar = null;
  const mates = new Map();       // conversation id -> entry
  let slotCount = 3;
  let compact = false;
  let hadMates = null;

  // ------------------------------------------------------------ shell --
  const statusDot = h('i', { 'aria-hidden': 'true' });
  const statusText = h('span', { class: 'ho-status-label' });
  const pausedMark = h('span', { class: 'ho-status-paused', hidden: true, title: 'New invitations paused' }, icon('pause'));
  const statusBtn = h('button', { type: 'button', class: 'ho-status', dataset: { test: 'status' }, onclick: () => statusSheet(device) },
    h('span', { class: 'kit-status ho-status-pill' }, statusDot, statusText), pausedMark,
    h('span', { class: 'ho-status-chev', 'aria-hidden': 'true' }, icon('chevron')));

  const top = h('header', { class: 'ho-top' },
    h('img', { class: 'ho-logo', src: LOGO, alt: 'hushmallow', width: 1200, height: 201 }),
    statusBtn);

  const titleEl = h('h1', { class: 'kit-title kit-title--md ho-title', 'data-autofocus': '' });
  const head = h('div', { class: 'ho-head' }, eyebrow('Hushmates', { center: true }), titleEl);
  const notice = h('p', { class: 'ho-notice', hidden: true }, icon('shield'),
    h('span', {}, 'Your account is limited while our safety team reviews something. You can still read, export or delete your data.'));

  // the stage (decorative layers are aria-hidden; the people are real buttons)
  const stageGlow = h('span', { class: 'ho-stage-glow', 'aria-hidden': 'true' });
  const orbit = h('span', { class: 'ho-orbit', 'aria-hidden': 'true' });
  const arcs = h('div', { class: 'ho-arcs', 'aria-hidden': 'true' });
  const ghostArcs = ORBIT.map(() => { const g = arc({ flow: false, cls: 'ho-arc ho-arc--ghost' }); g.setAttribute('hidden', ''); arcs.append(g); return g; });
  const meBox = h('div', { class: 'ho-me' });
  const slotEls = ORBIT.map((_, i) => h('div', { class: `ho-slot ho-slot--${i}` }));
  const inviteZone = h('div', { class: 'ho-invite-zone' });
  const stage = h('div', { class: 'ho-stage' }, stageGlow, orbit, arcs, pillow('ho-pillow'), meBox, ...slotEls, inviteZone);

  const meName = h('span', { class: 'ho-me-name-text' });
  const meTagSlot = h('span', { class: 'ho-me-tag' });
  const meMeta = h('div', { class: 'ho-me-meta' },
    h('p', { class: 'ho-me-name' }, meName, meTagSlot),
    h('button', { type: 'button', class: 'kit-btn kit-btn--text ho-edit', dataset: { test: 'edit-identity' }, onclick: () => device.go('identity') },
      'Edit identity'));

  const findBtn = h('button', { type: 'button', class: 'kit-btn kit-btn--ink kit-btn--lg ho-find', dataset: { test: 'go-find' }, onclick: () => device.go('find') },
    'Find a Hushmate', icon('arrow'));

  const invCount = h('span', { class: 'ho-link-count', hidden: true });
  const invLink = h('button', { type: 'button', class: 'ho-link', dataset: { test: 'go-invitations' }, onclick: () => device.go('invitations') },
    icon('mail'), h('span', {}, 'Invitations'), invCount);
  const matesIcon = h('span', { class: 'ho-link-faces', 'aria-hidden': 'true' });
  const matesLink = h('button', { type: 'button', class: 'ho-link', dataset: { test: 'go-hushmates' }, onclick: () => device.go('hushmates') },
    matesIcon, h('span', {}, 'All Hushmates'));
  const links = h('nav', { class: 'ho-links', 'aria-label': 'More in Hushmates' },
    invLink, matesLink,
    h('button', { type: 'button', class: 'ho-link', dataset: { test: 'go-boundaries' }, onclick: () => device.go('boundaries') }, icon('shield'), h('span', {}, 'Boundaries & privacy')),
    h('button', { type: 'button', class: 'ho-link', dataset: { test: 'go-safety' }, onclick: () => device.go('safety') }, icon('help'), h('span', {}, 'Safety & help')));
  const line = h('p', { class: 'kit-note ho-line' }, 'Your Mallow is there for softness. Your Hushmate is there for real conversation.');

  const scroll = h('div', { class: 'hm-scroll ho-scroll' }, head, notice, h('div', { class: 'ho-world' }, stage, meMeta), findBtn, links, line);
  const el = h('div', { class: `hm-scene ho` }, top, scroll);

  // ----------------------------------------------------------- geometry --
  const orbitFor = () => (compact ? ORBIT_SM : ORBIT);
  const meAnchor = (i, W, H) => ({ x: (ME.x + ANCHOR[i]) * W, y: H - ME.bottom * H - ME.w * W * ART_RATIO * (i === 2 ? 0.86 : 0.78) });
  const slotCentre = (i, W, H) => { const s = orbitFor()[i]; return { x: s.x * W, y: s.y * H + s.w * W * ART_RATIO * 0.32 }; };

  function placeArc(svg, a, b) {
    const [A, B] = a.x <= b.x ? [a, b] : [b, a];
    const dx = B.x - A.x, dy = B.y - A.y;
    const L = Math.hypot(dx, dy);
    if (L < 4) return;
    const bw = L / 0.9, bh = Math.min(L * 0.36, 80);
    Object.assign(svg.style, {
      width: `${bw}px`, height: `${bh}px`, left: `${A.x - 0.05 * bw}px`, top: `${A.y - 0.75 * bh}px`,
      transformOrigin: '5% 75%', transform: `rotate(${Math.atan2(dy, dx)}rad)`,
    });
  }

  function layout() {
    const W = stage.clientWidth, H = stage.clientHeight;
    if (!W || !H) return;
    compact = W < 350;
    orbitFor().forEach((s, i) => {
      Object.assign(slotEls[i].style, { left: `${(s.x - s.w / 2) * 100}%`, top: `${s.y * 100}%`, width: `${s.w * 100}%` });
    });
    for (const m of mates.values()) if (m.arc && m.slot != null) placeArc(m.arc, meAnchor(m.slot, W, H), slotCentre(m.slot, W, H));
    ghostArcs.forEach((g, i) => { if (!g.hasAttribute('hidden')) placeArc(g, meAnchor(i, W, H), slotCentre(i, W, H)); });
  }
  const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(() => layout()) : null;

  // ------------------------------------------------------------- pieces --
  function makeMe(avatar, animate) {
    if (meM && meAvatar === avatar) return;
    if (meM) { set.list = set.list.filter((x) => x !== meM); meM.destroy(); }
    const m = MALLOWS[avatar] || MALLOWS.noomi;
    meAvatar = avatar;
    meM = set.make(m.id, { interactive: true, eager: true, label: `Squeeze ${m.name}, your Mallow`, pressSeconds: 0.8 });
    meBox.replaceChildren(h('span', { class: 'ho-me-in' }, meM.el));
    stageGlow.style.background = `radial-gradient(closest-side, ${m.glow}70, ${m.glow}00)`;
    if (animate) dropIn(meBox.firstChild, { delay: 120, y: -70, scale: 0.82 });
  }

  function makeMate(v, slot, delay) {
    const id = v.other.avatar && MALLOWS[v.other.avatar] ? v.other.avatar : 'noomi';
    const mm = MALLOWS[id];
    const mallow = set.make(id, { float: true, label: '' });
    mallow.el.setAttribute('aria-hidden', 'true');
    const dot = h('span', { class: 'ho-mate-dot', hidden: true, 'aria-hidden': 'true' });
    const moon = h('span', { class: 'ho-mate-moon', hidden: true, 'aria-hidden': 'true' }, icon('moon'));
    const fig = h('span', { class: 'ho-mate-fig' },
      h('span', { class: 'ho-mate-glow', style: { background: `radial-gradient(closest-side, ${mm.glow}88, ${mm.glow}00)` } }),
      mallow.el, dot, moon, v.other.test ? testMark() : null);
    const nameEl = h('span', { class: 'ho-mate-name' }, h('span', { class: 'ho-mate-name-text' }, v.other.pseudonym));
    const btn = h('button', { type: 'button', class: 'ho-mate', dataset: { test: `hushmate-${v.other.pseudonym}` },
      onclick: () => device.go('hushspace', { id: v.id }, { transition: 'portal' }) }, fig, nameEl);
    const svg = arc({ cls: 'ho-arc' });
    arcs.append(svg);
    const entry = { id: v.id, view: v, mallow, btn, fig, dot, moon, arc: svg, slot, n: 0, resting: false };
    slotEls[slot].replaceChildren(btn);
    later(() => mallow.leanTo(ORBIT[entry.slot].lean), 900 + (delay || 0));
    if (delay != null) {
      dropIn(fig, { delay, y: -46, scale: 0.7, stiffness: 240, damping: 14 });
      rise([nameEl], { delay: delay + 160, y: 8 });
      svg.animate?.([{ opacity: 0 }, { opacity: 1 }], { duration: rm ? 250 : 900, delay: delay + 200, easing: CSS_EASE, fill: 'backwards' });
    }
    patchMate(entry, v, true);
    return entry;
  }

  function dropMate(entry) {
    // a calm goodbye: the Mallow steps back where it stood, its place frees at once
    mates.delete(entry.id);
    const slot = slotEls[entry.slot];
    const ghost = h('div', { class: 'ho-slot ho-ghost', 'aria-hidden': 'true', style: { left: slot.style.left, top: slot.style.top, width: slot.style.width } }, entry.btn);
    stage.append(ghost);
    entry.mallow.stepBack();
    entry.btn.disabled = true;
    entry.btn.tabIndex = -1;
    ghost.animate?.([{ opacity: 1 }, { opacity: 0 }], { duration: rm ? 250 : 900, delay: rm ? 0 : 500, easing: CSS_EASE, fill: 'forwards' });
    entry.arc.animate?.([{ opacity: 1 }, { opacity: 0 }], { duration: 600, fill: 'forwards' });
    later(() => {
      ghost.remove(); entry.arc.remove();
      set.list = set.list.filter((x) => x !== entry.mallow); entry.mallow.destroy();
    }, rm ? 300 : 1500);
  }

  function patchMate(entry, v, fresh = false) {
    entry.view = v;
    const n = unreadOf(v);
    entry.btn.setAttribute('aria-label', `Open your Hushspace with ${v.other.pseudonym}${n ? `, ${n} new` : ''}`);
    if (n !== entry.n || fresh) {
      entry.dot.textContent = n > 9 ? '9+' : String(n);
      entry.dot.hidden = !n;
      if (n > entry.n && !fresh && !rm) entry.dot.animate([{ transform: 'scale(.4)' }, { transform: 'scale(1.18)' }, { transform: 'scale(1)' }], { duration: 520, easing: CSS_EASE });
      entry.n = n;
    }
    const resting = RESTING.has(v.other.status);
    if (resting !== entry.resting || fresh) {
      entry.moon.hidden = !resting;
      entry.mallow.sleepy(resting);
      entry.resting = resting;
    }
    entry.btn.title = resting ? `${v.other.pseudonym} · ${statusOf(v.other.status).label}` : '';
  }

  function dots() {
    // a dotted ring drawn in SVG: round dots read softer than a CSS dashed border
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 100 100');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('class', 'ho-room-dots');
    svg.innerHTML = '<circle cx="50" cy="50" r="46" pathLength="100" />';
    return svg;
  }

  function makeRoom(slot, first) {
    const btn = h('button', {
      type: 'button', class: `ho-room${first ? ' is-first' : ''}`, onclick: () => device.go('find'),
      'aria-label': 'Room for one more Hushmate. Find a Hushmate',
    },
    h('span', { class: 'ho-room-ring' }, dots(), icon('plus')),
    first ? h('span', { class: 'ho-room-label' }, 'Room for one more') : null);
    // only the first free place takes keyboard focus; "Find a Hushmate" below carries the rest
    if (!first) { btn.tabIndex = -1; btn.setAttribute('aria-hidden', 'true'); }
    slotEls[slot].replaceChildren(btn);
    return btn;
  }

  function renderInvite(pending, animate) {
    if (!pending.length) { inviteZone.replaceChildren(); return; }
    const first = pending[0];
    const more = pending.length - 1;
    const who = first.other.pseudonym;
    const text = more ? `and ${more} more would like to be Hushmates` : 'would like to be Hushmates';
    const b = h('button', { type: 'button', class: 'ho-invite', onclick: () => device.go('invitations'), 'aria-label': `${who} ${text}. Open invitations` },
      h('span', { class: 'ho-invite-face' }, face(first.other.avatar, { size: 40 }), first.other.test ? testMark() : null),
      h('span', { class: 'ho-invite-text' }, h('strong', {}, who), h('span', {}, text)),
      h('span', { class: 'ho-invite-spark', 'aria-hidden': 'true' }));
    inviteZone.replaceChildren(b);
    if (animate) dropIn(b, { delay: animate === 'first' ? 760 : 80, y: -30, scale: 0.85, stiffness: 220, damping: 15 });
  }

  // ------------------------------------------------------- structure --
  function structKey(s) {
    const p = s.me.profile;
    const slots = Math.min(3, s.me.limits?.maxActiveHushmates || 3);
    const open = openOf(s).slice(0, slots).map((x) => `${x.id}:${x.other.avatar}:${x.other.pseudonym}`).join(',');
    const pend = pendingOf(s);
    return [p.pseudonym, p.avatar, s.me.test, slots, open, pend.length, pend[0]?.id || ''].join('|');
  }

  function build(s, first) {
    const p = s.me.profile;
    slotCount = Math.min(3, s.me.limits?.maxActiveHushmates || 3);
    makeMe(p.avatar, first);
    meName.textContent = p.pseudonym;
    meTagSlot.replaceChildren(...(s.me.test ? [h('span', { class: 'kit-testtag', title: 'A simulated account used for testing the prototype' }, 'Test identity')] : []));

    const open = openOf(s).slice(0, slotCount);
    const want = new Map(open.map((v, i) => [v.id, i]));
    for (const entry of [...mates.values()]) if (!want.has(entry.id)) dropMate(entry);
    let stagger = 0;
    let added = false;
    open.forEach((v, i) => {
      const entry = mates.get(v.id);
      if (entry && entry.slot === i) { patchMate(entry, v); return; }
      if (entry) {               // the circle closed up: move into the freed place
        entry.slot = i;
        slotEls[i].replaceChildren(entry.btn);
        entry.mallow.leanTo(ORBIT[i].lean);
        patchMate(entry, v);
        return;
      }
      const delay = first ? 340 + stagger * 120 : 60 + stagger * 120;
      stagger += 1; added = true;
      mates.set(v.id, makeMate(v, i, delay));
    });
    if (added && !first && meM) later(() => meM.cheer(0), 520);

    // free places in the circle
    for (let i = 0; i < 3; i++) {
      slotEls[i].hidden = i >= slotCount;
      ghostArcs[i].toggleAttribute('hidden', i < open.length || i >= slotCount);
      if (i < open.length || i >= slotCount) continue;
      const already = slotEls[i].firstElementChild;
      const isFirst = i === open.length;
      if (already?.classList.contains('ho-room') && already.classList.contains('is-first') === isFirst) continue;
      const room = makeRoom(i, isFirst);
      if (first) rise([room], { delay: 560 + i * 90, y: 10 });
      else room.animate?.([{ opacity: 0 }, { opacity: 1 }], { duration: rm ? 200 : 700, delay: rm ? 0 : 900, easing: CSS_EASE, fill: 'backwards' });
    }

    const all = openOf(s);
    matesIcon.replaceChildren(...(all.length ? all.slice(0, 3).map((v) => face(v.other.avatar, { size: 20 })) : [icon('heart')]));
    matesIcon.classList.toggle('is-faces', all.length > 0);
    const has = open.length > 0;
    if (has !== hadMates) {
      titleEl.replaceChildren(...(has ? ['Your small,', ' ', h('em', { class: 'kit-grad kit-grad--mates' }, 'soft circle.')]
        : ['Room for', ' ', h('em', { class: 'kit-grad kit-grad--mates' }, 'real people.')]));
      hadMates = has;
    }
    el.classList.toggle('has-mates', has);

    const pend = pendingOf(s);
    el.classList.toggle('has-invite', pend.length > 0);
    renderInvite(pend, first ? 'first' : true);
    layout();
  }

  function patch(s) {
    const p = s.me.profile;
    const st = statusOf(p.status);
    statusBtn.querySelector('.ho-status-pill').className = `kit-status ho-status-pill kit-status--${st.id}`;
    statusText.textContent = st.label;
    pausedMark.hidden = p.acceptingInvites !== false;
    statusBtn.setAttribute('aria-label', `Your status: ${st.label}${p.acceptingInvites === false ? ', new invitations paused' : ''}. Change it`);
    notice.hidden = !s.me.accountState || s.me.accountState === 'active';
    const pend = pendingOf(s).length;
    invCount.hidden = !pend;
    invCount.textContent = String(pend);
    if (pend) invLink.setAttribute('aria-label', `Invitations, ${pend} waiting for you`);
    else invLink.removeAttribute('aria-label');
    for (const v of openOf(s)) { const entry = mates.get(v.id); if (entry) patchMate(entry, v); }
  }

  function sync(s, first = false, detail = {}) {
    if (dead || !s.me?.profile) return;
    const k = structKey(s);
    if (k !== key) { key = k; build(s, first); }
    patch(s);
    // a message really arrived: that Hushmate's Mallow gives a small, real-event squish
    const msg = detail.message;
    if (!first && msg?.isNew && msg.message && !msg.message.mine) {
      const entry = mates.get(msg.conversationId);
      if (entry && !entry.view.muted) entry.mallow.settle();
    }
  }

  sync(device.state, true);

  return {
    el,
    mood: 'day',
    mounted() {
      ro?.observe(stage);
      layout();
      if (!params.refresh) {
        rise([head, notice.hidden ? null : notice], { stagger: 80 });
        rise([meMeta, findBtn, links, line], { delay: 260, stagger: 70 });
        if (!rm) later(() => { meM?.press(0.55, 0.14); later(() => meM?.release(), 160); }, 760);
      }
    },
    update(state, detail) { sync(state, false, detail || {}); },
    destroy() {
      dead = true;
      ro?.disconnect();
      for (const t of timers) clearTimeout(t);
      timers.clear();
      set.destroy();
    },
  };
}
