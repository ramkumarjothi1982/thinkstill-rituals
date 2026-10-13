// Find a Hushmate: the landing page's Meet stage, for real people who chose
// to be found. One person at a time stands in a softly lit room tinted with
// their Mallow's colours, their pseudonym as a giant watermark behind them.
// Neighbours peek in from the edges; swipe, tap a face, use the arrows or
// the arrow keys to meet the next. Their identity card rises underneath.
// Inviting someone is a small, real moment: your Mallow drops in beside
// theirs, a light travels along the arc, they blush. Squeezing a Mallow here
// only ever animates on your own phone; nobody is told.

import { h, icon, testTag, styleLabel, availabilityLabel } from '../dom.js';
import { MallowSet, face } from '../mallow.js';
import { MALLOWS } from '../mallows-data.js';
import { arc, chip, pillow, round, tags } from '../kit.js';
import { CSS_EASE, dropIn, reducedMotion, rise, wait } from '../motion.js';
import { STYLES, INTERESTS } from '../../core/config.js';

const HEARTS = ['#FF6FB5', '#FFB0F0', '#FF8CC6'];
const mallowOf = (id) => (id && MALLOWS[id] ? id : 'noomi');
const nbsp = (s) => String(s).replace(/ /g, ' ');
// a soft line-break chance between the words of a pseudonym ("Cloud|Mallow")
const breakable = (name) => String(name).split(/(?<=[a-z])(?=[A-Z])|(?<=[ _-])/u).flatMap((p, i) => (i ? [h('wbr'), p] : [p]));

// Pair layout, in % of the room. My Mallow stands at 31%, theirs at 69%
// (see .fd-me / .is-pair .fd-fig in find.css). kit.arc draws
// M20 120 C 120 20, 280 20, 380 120 in a 400×160 box, so placing the box
// here puts both ends of the line just above the two heads.
const ARC = { left: 28.9, top: 1, width: 42.2, height: 70 };

/** The invitation light, following the drawn arc exactly (kit.travel's look). */
function travelArc(room, duration = 1350) {
  if (reducedMotion()) return Promise.resolve();
  const el = h('span', { class: 'kit-travel kit-travel--light fd-light', 'aria-hidden': 'true' }, h('i'));
  room.append(el);
  const N = 40;
  const kf = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N, u = 1 - t;
    const bx = u * u * u * 20 + 3 * u * u * t * 120 + 3 * u * t * t * 280 + t * t * t * 380;
    const by = u * u * u * 120 + 3 * u * u * t * 20 + 3 * u * t * t * 20 + t * t * t * 120;
    kf.push({
      left: `${ARC.left + (ARC.width * bx) / 400}%`,
      top: `${ARC.top + (ARC.height * by) / 160}%`,
      opacity: Math.min(1, t * 5),
      transform: `scale(${(0.55 + 0.45 * Math.min(1, t * 3)).toFixed(3)})`,
    });
  }
  const a = el.animate(kf, { duration, easing: 'cubic-bezier(.45,0,.4,1)', fill: 'forwards' });
  return a.finished.then(() => el.animate([{ opacity: 1, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(2.8)' }],
    { duration: 560, easing: CSS_EASE, fill: 'forwards' }).finished)
    .catch(() => {}).then(() => el.remove());
}

export function find(device) {
  const client = device.client;
  const rm = reducedMotion();
  const mem = (device.memory.find ||= { style: null, interests: [], focus: null });
  if (!Array.isArray(mem.interests)) mem.interests = [];
  const set = new MallowSet();
  const uid = `${device.name}-fd`;
  let alive = true;
  let phase = 'loading';        // loading | ready | empty | error
  let cards = [];
  let idx = 0;
  let current = null;           // { card, mallow } on stage
  let mine = null;              // my own Mallow, there while an invitation of mine waits
  let paired = false;
  let busy = false;             // an invitation is being sent, or its moment is playing
  let moment = 0;               // the playing moment's id (choosing someone else ends it)
  let shownKey = '';
  let squeezed = false;
  let loadSeq = 0;
  let footKind = '';
  const timers = new Set();
  const later = (fn, ms) => { const t = setTimeout(() => { timers.delete(t); if (alive) fn(); }, ms); timers.add(t); return t; };

  const profile = () => client.state.me?.profile || null;
  const myAvatar = () => mallowOf(profile()?.avatar);

  // ------------------------------------------------------------ top bar --
  const filterDot = h('span', { class: 'fd-filter-dot', 'aria-hidden': 'true', hidden: true });
  const filterBtn = round(icon('filter'), 'Filters', () => openFilters(), { class: 'kit-round fd-filter', 'aria-haspopup': 'dialog', dataset: { test: 'filters' } });
  filterBtn.append(filterDot);
  const top = h('header', { class: 'hm-top' },
    round(icon('back'), 'Back', () => device.back(), { dataset: { test: 'back' } }),
    h('h1', { class: 'hm-top-label', 'data-autofocus': '' }, 'Find a Hushmate'),
    filterBtn);

  // the filters in use, with a quick way out
  const activeText = h('span', { class: 'fd-active-text' });
  const active = h('div', { class: 'fd-active', hidden: true },
    icon('filter'), activeText,
    h('button', { type: 'button', class: 'fd-active-clear', onclick: () => clearFilters() }, 'Clear'));

  // -------------------------------------------------------------- stage --
  const glowEl = h('span', { class: 'fd-glow', 'aria-hidden': 'true' });
  const ghostIn = h('span', {});
  const ghost = h('span', { class: 'fd-ghost', 'aria-hidden': 'true' }, ghostIn);
  const arcEl = arc({ cls: 'fd-arc' });
  Object.assign(arcEl.style, { left: `${ARC.left}%`, top: `${ARC.top}%`, width: `${ARC.width}%`, height: `${ARC.height}%` });
  const peekL = h('button', { type: 'button', class: 'fd-peek fd-peek--l', tabindex: '-1', hidden: true, onclick: () => step(-1) });
  const peekR = h('button', { type: 'button', class: 'fd-peek fd-peek--r', tabindex: '-1', hidden: true, onclick: () => step(1) });
  const meM = h('span', { class: 'fd-slot-m' });
  const meSlot = h('div', { class: 'fd-slot fd-me', 'aria-hidden': 'true' }, pillow('fd-pillow'), meM, h('span', { class: 'fd-you' }, 'You'));
  const figM = h('span', { class: 'fd-slot-m' });
  const fig = h('div', { class: 'fd-slot fd-fig' }, pillow('fd-pillow'), figM);
  const prevBtn = round(icon('arrow'), 'Previous', () => step(-1), { class: 'kit-round fd-arrow fd-arrow--l', hidden: true });
  const nextBtn = round(icon('arrow'), 'Next', () => step(1), { class: 'kit-round fd-arrow fd-arrow--r', hidden: true });
  const room = h('div', { class: 'fd-room is-instant' }, glowEl, ghost, arcEl, peekL, peekR, meSlot, fig, prevBtn, nextBtn);
  const foot = h('div', { class: 'fd-foot' });
  const live = h('p', { class: 'sr-only', 'aria-live': 'polite' });
  const stage = h('section', { class: 'fd-stage', 'aria-roledescription': 'carousel', 'aria-label': 'Mallows who chose to be found' }, room, foot, live);

  // --------------------------------------------------- card, tray, more --
  const cardZone = h('div', { class: 'fd-card-zone' });
  const trayLabelId = `${uid}-tray`;
  const tray = h('div', { class: 'fd-tray', role: 'group', 'aria-labelledby': trayLabelId });
  const trayWrap = h('div', { class: 'fd-tray-wrap', hidden: true },
    h('p', { class: 'kit-hairline fd-tray-label', id: trayLabelId }, h('span', {}, 'Mallows who chose to be found')), tray);
  const hiddenHint = h('button', { type: 'button', class: 'kit-hint kit-hint--lilac fd-hidden', hidden: true, onclick: () => device.go('boundaries') },
    h('span', { class: 'kit-hint-dot', 'aria-hidden': 'true' }),
    h('span', {}, 'You’re hidden from Find. You can still invite people. ', h('span', { class: 'fd-hidden-link' }, 'Change')));
  const codeBtn = h('button', { type: 'button', class: 'kit-btn kit-btn--link fd-code', 'aria-haspopup': 'dialog', onclick: () => openCode() }, icon('key'), 'Have a private code?');
  const more = h('div', { class: 'fd-more' }, hiddenHint, codeBtn,
    h('p', { class: 'kit-note fd-note' }, 'Ordered by the interests you picked, then a gentle daily rotation. No rankings, no popularity, and nothing reads anyone’s messages.'));

  const scroll = h('div', { class: 'hm-scroll fd-scroll' }, active, stage, cardZone, trayWrap, more);
  const el = h('div', { class: 'hm-scene fd' }, top, scroll);

  // ------------------------------------------------------------ helpers --
  function stateOf(card) {
    const s = client.state;
    const hm = s.hushmates.find((x) => x.open && x.other?.handle === card.handle);
    if (hm) return { kind: 'connected', id: hm.id };
    const inv = s.invitations.find((i) => i.status === 'pending' && i.other?.handle === card.handle);
    if (inv) return { kind: inv.direction === 'sent' ? 'sent' : 'received' };
    if (!s.invitations.length && card.invitation) return { kind: card.invitation };
    if (!card.acceptingInvites) return { kind: 'paused' };
    return { kind: 'open' };
  }

  function theme(mid) {
    const m = MALLOWS[mid];
    room.style.backgroundColor = m.tint;
    room.style.setProperty('--fd-deep', m.deep);
    glowEl.style.color = `${m.glow}88`;
    ghost.style.color = m.deep;
  }

  function announce(text) { live.textContent = ''; later(() => { live.textContent = text; }, 60); }

  function setFoot(kind) {
    if (kind === footKind) return;
    footKind = kind;
    const n = cards.length;
    let node = null;
    if (kind === 'tip') node = h('p', { class: 'fd-tip' }, n > 1 ? 'Squeeze for fun · swipe to meet others' : 'Squeeze for fun. Only you see it.');
    else if (kind === 'loading') node = h('p', { class: 'fd-tip' }, 'Looking gently…');
    else if (kind === 'squeeze') node = h('p', { class: 'kit-hint kit-hint--lilac' }, h('span', { class: 'kit-hint-dot', 'aria-hidden': 'true' }), 'Squeezes stay on your phone. Nobody is told.');
    else if (kind === 'sent') node = h('p', { class: 'kit-hint' }, h('span', { class: 'kit-hint-dot', 'aria-hidden': 'true' }), 'Invitation sent. No rush, they can take their time.');
    foot.replaceChildren(...(node ? [node] : []));
    if (node) node.animate(rm ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 0, transform: 'translateY(8px) scale(.97)' }, { opacity: 1, transform: 'none' }],
      { duration: 380, easing: CSS_EASE, fill: 'backwards' });
  }

  // ------------------------------------------------------- pair layout --
  function setPair(on, { drop = true } = {}) {
    if (on && !mine) {
      const id = myAvatar();
      mine = set.make(id, { interactive: true, eager: true, label: `Squeeze ${MALLOWS[id].name}, your Mallow`, pressSeconds: 0.6, particleScale: 0.7 });
      mine.el.tabIndex = -1;        // a toy beside the moment, not a step in it
      meM.replaceChildren(mine.el);
    }
    if (on === paired) return;
    paired = on;
    room.classList.toggle('is-pair', on);
    if (on && drop) dropIn(meM, { y: -60, scale: 0.8, stiffness: 210, damping: 16, delay: 80 });
  }

  // ------------------------------------------------------ the focused one --
  function makeCandidate(card) {
    const mid = mallowOf(card.avatar);
    return set.make(mid, {
      interactive: true, eager: true, pressSeconds: 0.7,
      label: `Squeeze ${card.pseudonym}’s Mallow. Only you see this.`,
      onSqueeze: () => {
        if (squeezed || footKind === 'sent') return;
        squeezed = true;
        setFoot('squeeze');
        announce('Squeezes stay on your phone. Nobody is told.');
        later(() => { if (footKind === 'squeeze') setFoot('tip'); }, 4600);
      },
    });
  }

  function show(i, { first = false } = {}) {
    const n = cards.length;
    if (!n) return;
    idx = ((i % n) + n) % n;
    const card = cards[idx];
    mem.focus = card.handle;
    moment++;                                   // a playing moment gives way
    busy = false;
    room.querySelectorAll('.fd-light').forEach((x) => x.remove());
    const mid = mallowOf(card.avatar);
    theme(mid);
    ghostIn.textContent = card.pseudonym;
    ghost.style.setProperty('--fd-len', String(Math.max(6, [...card.pseudonym].length)));
    ghostIn.animate(rm ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }],
      { duration: 600, easing: CSS_EASE });

    const hadFocus = fig.contains(document.activeElement);
    current?.mallow.destroy();
    const mallow = makeCandidate(card);
    figM.replaceChildren(mallow.el);
    current = { card, mallow };
    const st = stateOf(card);
    if (st.kind === 'paused') mallow.sleepy(true);

    // the new person lands straight in their spot (no sliding between people)
    room.classList.add('is-instant');
    setPair(st.kind === 'sent', { drop: !paired });
    void room.offsetWidth;
    requestAnimationFrame(() => room.classList.remove('is-instant'));
    room.classList.remove('is-loading');

    dropIn(figM, { y: -60, scale: 0.8, stiffness: 210, damping: 16 });
    later(() => { if (current?.mallow === mallow) mallow.signature(0.7); }, 320);
    if (hadFocus) mallow.el.focus({ preventScroll: true });

    renderPeeks();
    [...tray.children].forEach((b, j) => b.setAttribute('aria-pressed', String(j === idx)));
    renderCard({ rise: true });
    setFoot(st.kind === 'sent' && footKind === 'sent' ? 'sent' : 'tip');
    if (!first) announce(`${card.pseudonym}. ${styleLabel(card.style)}.`);
  }

  function step(d) {
    if (phase !== 'ready' || cards.length < 2) return;
    show(idx + d);
  }

  function pick(i) {
    if (i === idx && phase === 'ready') return;
    show(i);
    // bring the stage back into view so the arrival is seen
    const off = room.getBoundingClientRect().top - scroll.getBoundingClientRect().top;
    if (off < 0) scroll.scrollTo({ top: Math.max(0, scroll.scrollTop + off - 8), behavior: rm ? 'auto' : 'smooth' });
  }

  function renderPeeks() {
    const n = cards.length;
    const prev = cards[(idx - 1 + n) % n];
    const next = cards[(idx + 1) % n];
    peekL.hidden = n < 3;
    peekR.hidden = n < 2;
    prevBtn.hidden = nextBtn.hidden = n < 2;
    if (n >= 3) {
      peekL.replaceChildren(face(mallowOf(prev.avatar), { size: 48, float: true }));
      peekL.setAttribute('aria-label', `Meet ${prev.pseudonym}`);
    }
    if (n >= 2) {
      peekR.replaceChildren(face(mallowOf(next.avatar), { size: 48, float: true }));
      peekR.setAttribute('aria-label', `Meet ${next.pseudonym}`);
      for (const [b, who, word] of [[prevBtn, prev, 'Previous'], [nextBtn, next, 'Next']]) {
        b.setAttribute('aria-label', `${word}: ${who.pseudonym}`);
        b.title = `${word}: ${who.pseudonym}`;
      }
    }
  }

  // --------------------------------------------------------------- card --
  function action(card, st) {
    if (st.kind === 'sent') {
      return [
        h('button', { type: 'button', class: 'kit-btn kit-btn--lg kit-btn--block fd-sent', disabled: true }, icon('check'), 'Invitation sent'),
        h('p', { class: 'fd-act-note' }, 'They can accept or decline in their own time.'),
      ];
    }
    if (st.kind === 'received') {
      return [
        h('button', { type: 'button', class: 'kit-btn kit-btn--ink kit-btn--lg kit-btn--block', onclick: () => device.go('invitations') }, 'They invited you', icon('arrow')),
        h('p', { class: 'fd-act-note' }, 'Their invitation is waiting in Invitations.'),
      ];
    }
    if (st.kind === 'connected') {
      return [
        h('button', { type: 'button', class: 'kit-btn kit-btn--white kit-btn--lg kit-btn--block', onclick: () => device.go('hushspace', { id: st.id }, { transition: 'portal' }) },
          'Open your Hushspace', icon('arrow')),
        h('p', { class: 'fd-act-note' }, 'You’re already Hushmates.'),
      ];
    }
    if (st.kind === 'paused') {
      return h('p', { class: 'fd-paused' }, icon('pause'), h('span', {}, 'Not taking invitations right now'));
    }
    return h('button', { type: 'button', class: 'kit-btn kit-btn--ink kit-btn--lg kit-btn--block fd-invite', 'aria-haspopup': 'dialog',
      dataset: { test: `invite-${card.pseudonym}` }, onclick: () => openInvite(card) },
    icon('mail'), h('span', { class: 'fd-invite-label' }, `Invite ${card.pseudonym}`));
  }

  function renderCard({ rise: doRise = false } = {}) {
    const card = cards[idx];
    if (!card) return;
    const mid = mallowOf(card.avatar);
    const m = MALLOWS[mid];
    const st = stateOf(card);
    shownKey = `${card.handle}:${st.kind}:${st.id || ''}`;
    const nameId = `${uid}-name`;
    const myI = new Set(profile()?.interests || []);
    const interests = [...(card.interests || [])].sort((a, b) => Number(myI.has(b)) - Number(myI.has(a)));
    const shared = interests.filter((x) => myI.has(x));
    const tagList = interests.length ? tags(interests, m) : null;
    if (tagList) {
      for (const li of tagList.children) {
        if (myI.has(li.textContent)) { li.classList.add('is-shared'); li.append(h('span', { class: 'sr-only' }, ', you picked this too')); }
      }
    }
    const meta = [styleLabel(card.style), availabilityLabel(card.availability), card.language].filter(Boolean).map(nbsp).join(' · ');
    const name = h('h2', { class: 'fd-name', id: nameId }, h('span', { class: 'fd-name-text' }, ...breakable(card.pseudonym)), card.test ? testTag() : null);
    name.style.setProperty('--fd-len', String(Math.max(8, [...card.pseudonym].length)));
    const article = h('article', { class: 'fd-card', 'aria-labelledby': nameId, dataset: { test: `card-${card.pseudonym}`, mallow: mid } },
      name,
      meta ? h('p', { class: 'fd-meta' }, meta) : null,
      tagList ? h('div', { class: 'fd-talk' }, h('p', { class: 'kit-label' }, 'Happy to talk about'), tagList,
        shared.length ? h('p', { class: 'fd-common' }, icon('sparkle'), h('span', {}, shared.length === 1 ? 'You picked this one too' : 'You picked the ringed ones too')) : null) : null,
      h('div', { class: 'fd-act' }, action(card, st)));
    article.style.setProperty('--fd-deep', m.deep);
    article.style.setProperty('--fd-tint', m.tint);
    cardZone.replaceChildren(article);
    if (doRise) rise([article], { y: 16, duration: 560 });
    renderBadges();
  }

  function renderBadges() {
    [...tray.children].forEach((b, j) => {
      const c = cards[j];
      if (!c) return;
      const sent = stateOf(c).kind === 'sent';
      const badge = b.querySelector('.fd-pick-badge');
      if (sent && !badge) b.append(h('span', { class: 'fd-pick-badge' }, icon('check'), h('span', { class: 'sr-only' }, ', invitation sent')));
      if (!sent && badge) badge.remove();
    });
  }

  function renderTray() {
    tray.replaceChildren(...cards.map((c, j) => {
      const mid = mallowOf(c.avatar);
      const b = h('button', { type: 'button', class: 'fd-pick', 'aria-pressed': String(j === idx), dataset: { test: `pick-${c.pseudonym}` }, onclick: () => pick(j) },
        face(mid, { size: 50 }), h('span', { class: 'fd-pick-name' }, ...breakable(c.pseudonym)));
      b.style.setProperty('--fd-ring', MALLOWS[mid].deep);
      return b;
    }));
  }

  function refreshState() {
    if (busy || phase !== 'ready') return;
    const card = cards[idx];
    if (!card) return;
    const st = stateOf(card);
    if (`${card.handle}:${st.kind}:${st.id || ''}` !== shownKey) {
      renderCard({ rise: true });
      setPair(st.kind === 'sent');
      if (st.kind !== 'sent' && footKind === 'sent') setFoot('tip');
    } else renderBadges();
  }

  // ----------------------------------------------------- quiet states --
  function quietStage({ sleepy = true } = {}) {
    current?.mallow.destroy();
    current = null;
    setPair(false);
    theme('noomi');
    ghostIn.textContent = '';
    peekL.hidden = peekR.hidden = prevBtn.hidden = nextBtn.hidden = true;
    if (!sleepy) { figM.replaceChildren(); return; }
    const m = set.make('noomi', { interactive: true, eager: true, label: 'Squeeze Noomi', pressSeconds: 0.7 });
    m.sleepy(true);
    figM.replaceChildren(m.el);
    current = { card: null, mallow: m };
    room.classList.remove('is-loading');
    dropIn(figM, { y: -40, scale: 0.86, stiffness: 170, damping: 18 });
  }

  function renderEmpty() {
    quietStage();
    trayWrap.hidden = true;
    setFoot(null);
    const filtered = !!(mem.style || mem.interests.length);
    const box = h('div', { class: 'fd-quiet' },
      h('h2', { class: 'kit-title kit-title--sm' }, 'No one matches right now.'),
      h('p', { class: 'kit-body' }, 'Try fewer filters, or come back another day.'),
      filtered ? h('button', { type: 'button', class: 'kit-btn kit-btn--ghost kit-btn--sm', onclick: () => clearFilters() }, 'Clear filters') : null);
    cardZone.replaceChildren(box);
    rise([box], { y: 14 });
  }

  function renderError(e) {
    quietStage();
    trayWrap.hidden = true;
    setFoot(null);
    const box = h('div', { class: 'fd-quiet' },
      h('h2', { class: 'kit-title kit-title--sm' }, 'Couldn’t look just now.'),
      h('p', { class: 'kit-body' }, e?.message || 'Something went wrong. Please try again.'),
      h('button', { type: 'button', class: 'kit-btn kit-btn--ghost kit-btn--sm', onclick: () => load() }, icon('refresh'), 'Try again'));
    cardZone.replaceChildren(box);
    rise([box], { y: 14 });
  }

  // --------------------------------------------------------------- data --
  async function load() {
    const seq = ++loadSeq;
    const firstLoad = phase === 'loading' && !cards.length;
    phase = 'loading';
    room.classList.add('is-loading');
    stage.setAttribute('aria-busy', 'true');
    later(() => { if (seq === loadSeq && phase === 'loading') setFoot('loading'); }, 260);
    try {
      const r = await client.api('discover', { style: mem.style, interests: mem.interests });
      if (!alive || seq !== loadSeq) return;
      cards = Array.isArray(r?.cards) ? r.cards : [];
      const names = cards.map((c) => c.pseudonym);
      device.memory.lastDiscover = names;
      device.onScreen?.('find:results', { names });
      stage.setAttribute('aria-busy', 'false');
      if (!cards.length) { phase = 'empty'; renderEmpty(); return; }
      phase = 'ready';
      const i = Math.max(0, cards.findIndex((c) => c.handle === mem.focus));
      idx = i;
      renderTray();
      trayWrap.hidden = false;
      footKind = '';
      show(i, { first: true });
      if (firstLoad) rise([trayWrap, more], { stagger: 90, delay: 160 });
    } catch (e) {
      if (!alive || seq !== loadSeq) return;
      stage.setAttribute('aria-busy', 'false');
      phase = 'error';
      renderError(e);
    }
  }

  // ------------------------------------------------------------ filters --
  function syncFilters() {
    const on = [mem.style ? styleLabel(mem.style) : null, ...mem.interests].filter(Boolean);
    filterDot.hidden = !on.length;
    const label = on.length ? `Filters, ${on.length} on` : 'Filters';
    filterBtn.setAttribute('aria-label', label);
    filterBtn.title = label;
    active.hidden = !on.length;
    activeText.textContent = on.join(' · ');
  }

  function clearFilters() {
    if (!mem.style && !mem.interests.length) return;
    mem.style = null;
    mem.interests = [];
    syncFilters();
    load();
  }

  function openFilters() {
    const draft = { style: mem.style, interests: [...mem.interests] };
    const before = JSON.stringify(draft);
    const myI = (profile()?.interests || []).filter((x) => INTERESTS.includes(x));
    const order = [...myI, ...INTERESTS.filter((x) => !myI.includes(x))];
    const styleChips = [{ id: null, label: 'Any style' }, ...STYLES].map((s) => {
      const c = chip(s.label, draft.style === s.id, () => { draft.style = s.id; sync(); }, { small: true });
      c.dataset.style = s.id || '';
      return c;
    });
    const interestChips = order.map((x) => {
      const c = chip(x, draft.interests.includes(x), () => {
        draft.interests = draft.interests.includes(x) ? draft.interests.filter((y) => y !== x) : [...draft.interests, x];
        sync();
      }, { small: true });
      c.dataset.interest = x;
      return c;
    });
    const clearBtn = h('button', { type: 'button', class: 'kit-btn kit-btn--text kit-btn--block', onclick: () => { draft.style = null; draft.interests = []; sync(); } }, 'Clear filters');
    function sync() {
      styleChips.forEach((c) => c.setAttribute('aria-pressed', String((c.dataset.style || null) === draft.style)));
      interestChips.forEach((c) => c.setAttribute('aria-pressed', String(draft.interests.includes(c.dataset.interest))));
      clearBtn.hidden = !draft.style && !draft.interests.length;
    }
    sync();
    const styleLabelId = `${uid}-f-style`;
    const intLabelId = `${uid}-f-int`;
    device.sheet({
      title: 'Find your kind of conversation',
      label: 'Filters',
      body: [
        h('div', { class: 'fd-fgroup' },
          h('p', { class: 'kit-label', id: styleLabelId }, 'Conversation style'),
          h('div', { class: 'kit-chips', role: 'group', 'aria-labelledby': styleLabelId }, styleChips)),
        h('div', { class: 'fd-fgroup' },
          h('p', { class: 'kit-label', id: intLabelId }, 'Interests in common'),
          h('p', { class: 'fd-fnote' }, myI.length ? 'Yours come first. Pick any; people who share more of them come first.' : 'Pick any; people who share more of them come first.'),
          h('div', { class: 'kit-chips', role: 'group', 'aria-labelledby': intLabelId }, interestChips)),
      ],
      actions: [
        h('button', { type: 'button', class: 'kit-btn kit-btn--ink kit-btn--block', onclick: () => device.closeSheet() }, 'Done'),
        clearBtn,
      ],
      onClose: () => {
        if (!alive || JSON.stringify(draft) === before) return;
        mem.style = draft.style;
        mem.interests = draft.interests;
        syncFilters();
        load();
      },
    });
  }

  // ------------------------------------------------------------- invite --
  function pairArt(theirAvatar) {
    return h('div', { class: 'fd-sheet-pair', 'aria-hidden': 'true' },
      arc({ cls: 'fd-sheet-arc' }),
      h('span', { class: 'fd-sheet-face fd-sheet-face--l' }, face(myAvatar(), { size: 70 })),
      h('span', { class: 'fd-sheet-face fd-sheet-face--r' }, face(mallowOf(theirAvatar), { size: 70 })));
  }

  function openInvite(card) {
    const send = h('button', { type: 'button', class: 'kit-btn kit-btn--ink kit-btn--lg kit-btn--block', dataset: { test: 'send-invite' } }, 'Send private invitation');
    send.addEventListener('click', async () => {
      if (send.disabled) return;
      send.disabled = true;
      busy = true;                  // hold incoming refreshes: the moment shows the change
      const r = await device.run(() => client.act('sendInvitation', { handle: card.handle }, ['invitations']));
      device.closeSheet();
      if (!alive) return;
      if (!r) { busy = false; refreshState(); return; }
      card.invitation = 'sent';
      connect(card);
    });
    device.sheet({
      title: `Invite ${card.pseudonym}?`,
      art: pairArt(card.avatar),
      body: [
        h('p', { class: 'hm-sheet-text' }, 'They’ll see your Mallow, pseudonym and interests, and can accept or decline in their own time.'),
        h('p', { class: 'hm-sheet-text' }, 'Nobody can send a message until you both agree. If they don’t accept, that’s okay, and nobody is told why.'),
      ],
      actions: [send, h('button', { type: 'button', class: 'kit-btn kit-btn--text kit-btn--block', onclick: () => device.closeSheet() }, 'Not now')],
    });
  }

  // The connection moment: my Mallow drops in beside theirs, the arc lights
  // up, a light travels along it and lands; they blush and settle.
  async function connect(card) {
    if (cards[idx] !== card) { const i = cards.indexOf(card); if (i < 0) { busy = false; return; } show(i); }
    const id = ++moment;
    busy = true;
    const them = current?.mallow;
    const still = () => alive && id === moment && current?.card === card;
    const finish = () => {
      if (!still()) return;
      renderCard({ rise: true });
      busy = false;
      refreshState();
    };
    if (rm) {
      setPair(true, { drop: false });
      setFoot('sent');
      announce('Invitation sent. No rush, they can take their time.');
      finish();
      return;
    }
    setFoot(null);
    setPair(true);                  // they slide right, I drop in on the left, the arc fades in
    await wait(1050);
    if (!still()) return;
    mine?.press(0.5, 0.14);
    later(() => mine?.release(), 170);
    await wait(140);
    await travelArc(room, 1350);
    if (!still()) return;
    them?.settle();
    them?.emit('heart', 7, HEARTS);
    setFoot('sent');
    announce('Invitation sent. No rush, they can take their time.');
    await wait(700);
    finish();
  }

  // ------------------------------------------------------- private code --
  function openCode() {
    const input = h('input', {
      id: `${uid}-code`, type: 'text', placeholder: 'ABCD-1234', maxlength: '12', autocomplete: 'off', autocapitalize: 'characters',
      autocorrect: 'off', spellcheck: 'false', enterkeyhint: 'send', dataset: { test: 'code-input' },
    });
    const err = h('p', { class: 'kit-error', role: 'alert' });
    const use = h('button', { type: 'button', class: 'kit-btn kit-btn--ink kit-btn--xs', dataset: { test: 'code-use' } }, 'Use code');
    const go = async () => {
      if (use.disabled) return;
      const code = input.value.trim();
      if (!code) { err.textContent = 'Type the code you were given.'; input.focus(); return; }
      err.textContent = '';
      use.disabled = true;
      busy = true;
      const r = await device.run(() => client.act('redeemInviteCode', { code }, ['invitations']));
      if (!alive) return;
      if (!r) { use.disabled = false; busy = false; refreshState(); return; }
      device.closeSheet();
      const i = phase === 'ready' ? cards.findIndex((c) => c.handle === r.other?.handle) : -1;
      if (i >= 0) {
        cards[i].invitation = 'sent';
        if (i !== idx) pick(i);
        connect(cards[i]);
      } else {
        busy = false;
        refreshState();
        device.toast(`Invitation sent to ${r.other?.pseudonym || 'them'}.`);
      }
    };
    use.addEventListener('click', go);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); go(); } });
    input.addEventListener('input', () => { err.textContent = ''; });
    device.sheet({
      title: 'Have a private code?',
      label: 'Use a private invitation code',
      art: face(myAvatar(), { size: 76, float: true }),
      body: [
        h('p', { class: 'hm-sheet-text' }, 'This is for someone you already know. If they’ve shared their private invitation code with you, enter it here and they’ll get an invitation from you.'),
        h('label', { class: 'kit-label fd-code-label', for: input.id }, 'Private invitation code'),
        h('div', { class: 'kit-field fd-code-field' }, input, use),
        err,
        h('p', { class: 'kit-note fd-code-note' }, 'They can still accept or decline. Never share your own code anywhere public.'),
      ],
    });
  }

  // ------------------------------------------------- swipe and the keys --
  let drag = null;
  let justDragged = false;
  const onMove = (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    drag.dx = e.clientX - drag.x0;
    if (!drag.moved && Math.abs(drag.dx) > 8 && Math.abs(drag.dx) > Math.abs(e.clientY - drag.y0)) drag.moved = true;
    if (drag.moved && !rm) room.style.transform = `translateX(${(drag.dx * 0.18).toFixed(1)}px)`;
  };
  const onEnd = (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const { dx, moved } = drag;
    drag = null;
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onEnd);
    window.removeEventListener('pointercancel', onEnd);
    if (room.style.transform) {
      const from = room.style.transform;
      room.style.transform = '';
      room.animate([{ transform: from }, { transform: 'none' }], { duration: 480, easing: 'cubic-bezier(.34,1.56,.64,1)' });
    }
    if (!moved || e.type === 'pointercancel') return;
    justDragged = true;
    setTimeout(() => { justDragged = false; }, 0);
    if (dx < -70) step(1);
    else if (dx > 70) step(-1);
  };
  room.addEventListener('pointerdown', (e) => {
    if (e.button > 0 || phase !== 'ready' || cards.length < 2 || e.target.closest('.fd-arrow')) return;
    drag = { id: e.pointerId, x0: e.clientX, y0: e.clientY, dx: 0, moved: false };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onEnd);
    window.addEventListener('pointercancel', onEnd);
  });
  room.addEventListener('click', (e) => { if (justDragged) { e.stopPropagation(); e.preventDefault(); } }, true);
  const keys = (e) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    if (e.target.closest('input, textarea')) return;
    e.preventDefault();
    const inTray = tray.contains(e.target);
    step(e.key === 'ArrowLeft' ? -1 : 1);
    if (inTray) tray.children[idx]?.focus();
  };
  stage.addEventListener('keydown', keys);
  tray.addEventListener('keydown', keys);

  function syncHidden() { hiddenHint.hidden = !!profile()?.discoverable || !profile(); }

  return {
    el,
    mood: 'sky',
    mounted() {
      syncFilters();
      syncHidden();
      theme('noomi');
      requestAnimationFrame(() => room.classList.remove('is-instant'));
      rise([active, stage], { stagger: 70 });
      load();
    },
    update(state, detail = {}) {
      if (!alive) return;
      syncHidden();
      if (detail.invitations || detail.hushmates || detail.me) refreshState();
    },
    destroy() {
      alive = false;
      for (const t of timers) clearTimeout(t);
      timers.clear();
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onEnd);
      window.removeEventListener('pointercancel', onEnd);
      set.destroy();
    },
  };
}
