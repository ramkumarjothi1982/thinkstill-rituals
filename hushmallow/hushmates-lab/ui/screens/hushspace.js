// The Hushspace: a quiet, private place where two real people write to each
// other. Their Mallow rests on a little cloud pillow at the top (never
// interactive and never speaking), the words sit on solid bubbles, and the
// composer floats at the bottom like the landing page's "say it in your own
// words" field. The Mallow reacts only to real events: a message really
// arrived (a small settle and two particles), they set quiet mode (sleepy
// eyes), the Hushspace closed (a calm step back into dusk). No typing
// indicators, no read receipts, no presence, nothing that reads the words.

import { h, icon, testTag, statusPill, intentOf, fmtTime, fmtDay } from '../dom.js';
import { MallowSet, face } from '../mallow.js';
import { MALLOWS } from '../mallows-data.js';
import { pillow, glow, hairline, round, sentenceSwitch, arc } from '../kit.js';
import { rise, dropIn, reducedMotion } from '../motion.js';
import { INTENTS, REPORT_CATEGORIES, LIMITS } from '../../core/config.js';
import { checkMessage, charCount } from '../../core/text-policy.js';

const TEXT_SIZES = ['Smaller', 'Standard', 'Larger'];
const GROUP_MS = 5 * 60e3;      // consecutive messages within five minutes sit together
const NEAR_PX = 96;             // "near the bottom": keep the newest words in view
const coarse = () => { try { return window.matchMedia('(pointer: coarse)').matches; } catch { return false; } };

/** Put nodes into order with as few DOM moves as possible (keeps focus and avoids re-announcing). */
function reconcile(parent, nodes) {
  let cur = parent.firstChild;
  for (const n of nodes) {
    if (n === cur) { cur = cur.nextSibling; continue; }
    parent.insertBefore(n, cur);
  }
  while (cur) { const next = cur.nextSibling; cur.remove(); cur = next; }
}

export function hushspace(device, params = {}) {
  const { id } = params;
  const client = device.client;
  const set = new MallowSet();
  let alive = true;

  const conv = () => client.state.conversations[id] || null;
  const view = () => conv()?.view || client.state.hushmates.find((x) => x.id === id) || null;
  const v0 = view();
  const first = v0?.other || { pseudonym: 'your Hushmate', avatar: null, test: false, status: null };
  const name = () => view()?.other.pseudonym || first.pseudonym;
  const myAvatar = () => client.state.me?.profile?.avatar || null;
  const maxChars = () => client.state.me?.limits?.messageMaxChars || LIMITS.messageMaxChars;
  const draftKey = `draft:${id}`;

  // ============================================================ header ==
  // their living Mallow on a tiny pillow: a companion, not a button
  const stage = h('div', { class: 'hs-stage' });
  let presence = null;
  let presenceId;
  let sleepy = false;
  let wasOpen = v0 ? v0.open : true;
  function placeMallow(avatar) {
    if (avatar === presenceId) return;
    presenceId = avatar;
    presence?.destroy();
    const m = MALLOWS[avatar];
    presence = m ? set.make(avatar, { size: 'var(--hs-mallow, 64px)', shadow: true, eager: true, particleScale: 0.55, label: `${name()}’s Mallow, ${m.name}` }) : null;
    stage.style.setProperty('--hs-glow', m?.glow || '#CDB8FF');
    stage.replaceChildren(glow(m?.glow || '#CDB8FF', 'hs-stage-glow'), pillow('hs-pillow'),
      presence ? presence.el : h('span', { class: 'hs-stage-empty', 'aria-hidden': 'true' }));
    if (presence && sleepy) presence.sleepy(true);
    if (presence && !wasOpen) presence.stepBack();
  }
  const nameEl = h('h1', { class: 'hs-name', 'data-autofocus': '' });
  const metaEl = h('p', { class: 'hs-meta' });
  const head = h('header', { class: 'hs-head' },
    round(icon('back'), 'Back', () => device.back(), { dataset: { test: 'back' } }),
    h('div', { class: 'hs-who' }, stage, h('div', { class: 'hs-id' }, nameEl, metaEl)),
    round(icon('more'), 'Hushspace options', () => optionsSheet(), { 'aria-haspopup': 'dialog', dataset: { test: 'hs-more' } }));

  let headSig = null;
  function drawHeader() {
    const v = view();
    const other = v?.other || first;
    const open = !v || v.open;
    const sig = [other.pseudonym, other.avatar, other.status, other.test, open].join('|');
    if (sig === headSig) return;
    headSig = sig;
    placeMallow(other.avatar);
    nameEl.textContent = other.pseudonym;
    metaEl.replaceChildren(
      open ? (other.status ? statusPill(other.status) : null)
        : h('span', { class: 'kit-status hs-status-closed' }, h('i', { 'aria-hidden': 'true' }), 'Hushspace closed'),
      other.test ? testTag() : null);
  }

  // ======================================================= preferences ==
  // two soft pills: what I'd like from this conversation, and what they'd like
  const mineFace = h('span', { class: 'hs-pref-face' });
  const mineWhat = h('span', { class: 'hs-pref-what' });
  const mineIco = h('span', { class: 'hs-pref-ico', 'aria-hidden': 'true' });
  const mineBtn = h('button', { type: 'button', class: 'hs-pref hs-pref--mine', 'aria-haspopup': 'dialog', onclick: () => intentSheet(), dataset: { test: 'intent-mine' } },
    mineFace, h('span', { class: 'hs-pref-text' }, h('span', { class: 'hs-pref-who' }, 'You'), mineWhat), mineIco);
  const theirFace = h('span', { class: 'hs-pref-face' });
  const theirWho = h('span', { class: 'hs-pref-who' });
  const theirWhat = h('span', { class: 'hs-pref-what' });
  const theirPill = h('div', { class: 'hs-pref hs-pref--theirs', dataset: { test: 'intent-theirs' } },
    theirFace, h('span', { class: 'hs-pref-text' }, theirWho, theirWhat));
  const prefs = h('div', { class: 'hs-prefs', role: 'group', 'aria-label': 'Conversation preferences' }, mineBtn, theirPill);
  const notices = h('div', { class: 'hs-notices', 'aria-live': 'polite' });

  const faceSig = { mine: undefined, theirs: undefined };
  function drawPrefs() {
    const v = view();
    const open = !!v && v.open;
    prefs.hidden = !open;
    if (!open) return;
    const mine = intentOf(v.intent.mine);
    const theirs = intentOf(v.intent.theirs);
    if (faceSig.mine !== myAvatar()) { faceSig.mine = myAvatar(); mineFace.replaceChildren(face(faceSig.mine, { size: 30 })); }
    if (faceSig.theirs !== v.other.avatar) { faceSig.theirs = v.other.avatar; theirFace.replaceChildren(face(faceSig.theirs, { size: 30 })); }
    mineWhat.textContent = mine ? mine.label : 'Share a preference';
    mineBtn.classList.toggle('is-set', !!mine);
    mineBtn.setAttribute('aria-label', `Your preference: ${mine ? mine.label : 'none shared yet'}. Change it`);
    mineIco.hidden = !!mine;
    if (!mineIco.firstChild) mineIco.append(icon('plus'));
    theirWho.textContent = v.other.pseudonym;
    theirWhat.textContent = theirs ? theirs.label : 'No preference shared';
    theirPill.classList.toggle('is-set', !!theirs);
  }

  const moonLine = (text, test, { mine = false, ic = 'moon' } = {}) =>
    h('p', { class: `hs-moon${mine ? ' hs-moon--mine' : ''}`, dataset: test ? { test } : undefined }, icon(ic), h('span', {}, text));
  let noticeKeys = null;
  function drawNotices() {
    const v = view();
    const items = [];
    if (v && v.open) {
      const theirs = intentOf(v.intent.theirs);
      if (theirs) {
        items.push([`intent:${theirs.id}:${v.other.pseudonym}`, () => h('p', { class: 'hs-quote', dataset: { test: 'their-intent-line' } },
          h('span', { class: 'sr-only' }, `${v.other.pseudonym}’s preference: `),
          h('span', { class: 'hs-quote-text' }, `“${theirs.line}”`), ' ',
          h('span', { class: 'hs-quote-who', 'aria-hidden': 'true' }, `— ${v.other.pseudonym}`))]);
      }
      if (v.quiet.theirs) items.push([`tq:${v.other.pseudonym}`, () => moonLine(`${v.other.pseudonym} set this Hushspace to quiet. No rush, either way.`, 'their-quiet')]);
      if (v.quiet.mine) items.push(['mq', () => moonLine('Quiet mode is on for you here. Reply whenever, or not at all.', 'my-quiet', { mine: true })]);
      if (v.muted) items.push(['muted', () => moonLine('Muted. Only you know.', null, { mine: true, ic: 'bellOff' })]);
    }
    const keys = items.map(([k]) => k).join('\n');
    if (keys === noticeKeys) return;
    const before = new Set((noticeKeys || '').split('\n'));
    const old = new Map([...notices.children].map((n) => [n.dataset.key, n]));
    const nodes = items.map(([k, build]) => {
      const n = old.get(k) || build();
      n.dataset.key = k;
      if (noticeKeys !== null && !before.has(k)) rise([n], { y: 8, duration: 600 });
      return n;
    });
    noticeKeys = keys;
    reconcile(notices, nodes);
  }

  // ========================================================== messages ==
  const log = h('div', { class: 'hs-log', role: 'log', 'aria-label': `Messages with ${first.pseudonym}`, tabindex: '0' });
  const scroller = h('div', { class: 'hm-scroll hs-scroll' }, log);
  const newPill = h('button', { type: 'button', class: 'hs-newpill', hidden: true, onclick: () => { toBottom(true); } }, icon('arrow'), 'New message');
  const body = h('div', { class: 'hs-body' }, scroller, newPill);

  // ----- keeping the newest words in view
  let nearBottom = true;
  let pinUntil = 0;
  const measure = () => scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight < NEAR_PX;
  scroller.addEventListener('scroll', () => {
    nearBottom = measure() || performance.now() < pinUntil;
    if (nearBottom) newPill.hidden = true;
  }, { passive: true });
  function toBottom(smooth = false) {
    pinUntil = performance.now() + (smooth ? 700 : 120);
    nearBottom = true;
    newPill.hidden = true;
    scroller.scrollTo({ top: scroller.scrollHeight, behavior: smooth && !reducedMotion() ? 'smooth' : 'auto' });
  }
  const stick = (force, smooth) => { if (force || nearBottom) toBottom(smooth); };
  // the column shrinks when the keyboard opens or the composer grows: stay pinned
  const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(() => { if (nearBottom) scroller.scrollTop = scroller.scrollHeight; }) : null;
  ro?.observe(scroller);
  ro?.observe(log);

  // ----- keyed rendering: unchanged messages are never rebuilt
  const cache = new Map();   // key -> { sig, node }
  let rendered = null;       // keys from the previous draw (null before the first)
  let quietEntrance = false; // true while earlier messages are being added above
  const keep = (key, sig, build) => {
    const c = cache.get(key);
    if (c && c.sig === sig) return c.node;
    const node = build();
    cache.set(key, { sig, node });
    return node;
  };

  function drawLog() {
    const cv = conv();
    const v = view();
    const n = v?.other.pseudonym || first.pseudonym;
    const items = [];
    const add = (key, sig, build) => items.push([key, keep(key, sig, build)]);
    if (cv?.hasMore) add('earlier', `${cv.messages.length}`, () => earlierButton());
    const empty = !!cv?.loaded && !cv.messages.length && !cv.outbox.length;
    if (cv?.loaded && !cv.hasMore) add('begin', `${n}|${v?.other.avatar}|${myAvatar()}|${v?.createdAt}|${empty}`, () => beginning(v, empty));
    if (!device.prefs.safetyNoteSeen) add('intro', n, () => introNote(n));
    if (empty) add('hello', '', () => h('p', { class: 'hs-hello' }, 'Say hello whenever you’re ready. There’s no rush here.'));

    const list = [];
    for (const m of cv?.messages || []) list.push({ kind: 'msg', m, mine: m.mine, at: m.at, key: m.mine && m.clientId ? `c:${m.clientId}` : `m:${m.id}` });
    for (const o of cv?.outbox || []) list.push({ kind: 'out', o, mine: true, at: o.at || Date.now(), key: `c:${o.clientId}` });
    let lastDay = '';
    list.forEach((it, i) => {
      const day = fmtDay(it.at);
      const prev = list[i - 1];
      const next = list[i + 1];
      const joinsPrev = !!prev && prev.mine === it.mine && it.at - prev.at < GROUP_MS && fmtDay(prev.at) === day;
      const joinsNext = !!next && next.mine === it.mine && next.at - it.at < GROUP_MS && fmtDay(next.at) === day;
      if (day !== lastDay) { add(`d:${it.key}`, day, () => { const d = hairline(day); d.classList.add('hs-day'); return d; }); lastDay = day; }
      const pos = joinsPrev ? (joinsNext ? 'middle' : 'last') : (joinsNext ? 'first' : 'single');
      if (it.kind === 'msg') {
        const m = it.m;
        add(it.key, `msg|${m.id}|${m.deleted}|${pos}|${m.body.length}|${n}`, () => bubble(m, pos, n));
      } else {
        const o = it.o;
        add(it.key, `out|${o.state}|${pos}`, () => pendingBubble(o, pos));
      }
    });

    const nodes = items.map(([, node]) => node);
    reconcile(log, nodes);

    // new words at the end rise in gently (never the history, never earlier pages)
    const keys = items.map(([k]) => k);
    if (rendered && !quietEntrance) {
      const had = new Set(rendered);
      let lastKnown = -1;
      keys.forEach((k, i) => { if (had.has(k)) lastKnown = i; });
      items.forEach(([k, node], i) => {
        if (i > lastKnown && !had.has(k) && (k.startsWith('m:') || k.startsWith('c:'))) {
          node.classList.add('is-new');
          rise([node], { y: 14, duration: 520 });
        }
      });
    }
    if (cv?.loaded) rendered = keys;
    for (const k of [...cache.keys()]) if (!keys.includes(k)) cache.delete(k);
  }

  function earlierButton() {
    const btn = h('button', { type: 'button', class: 'kit-btn kit-btn--ghost kit-btn--xs hs-earlier', onclick: async () => {
      if (btn.disabled) return;
      btn.disabled = true;
      btn.textContent = 'Opening earlier messages…';
      const h0 = scroller.scrollHeight;
      const t0 = scroller.scrollTop;
      quietEntrance = true;
      const ok = await device.run(async () => { await client.loadEarlier(id); return true; });
      if (!alive) return;
      drawLog();
      quietEntrance = false;
      scroller.scrollTop = scroller.scrollHeight - h0 + t0;
      if (!ok) { btn.disabled = false; btn.textContent = 'Earlier messages'; }
    } }, 'Earlier messages');
    return h('div', { class: 'hs-earlier-wrap' }, btn);
  }

  function beginning(v, empty) {
    const n = v?.other.pseudonym || first.pseudonym;
    const opened = v?.createdAt ? fmtDay(v.createdAt) : null;
    const when = !opened ? '' : (opened === 'Today' || opened === 'Yesterday' ? `Opened ${opened.toLowerCase()}` : `Opened on ${opened}`);
    return h('div', { class: 'hs-begin' },
      h('div', { class: 'hs-begin-pair', 'aria-hidden': 'true' },
        face(myAvatar(), { size: 46 }), arc({ flow: empty, cls: 'hs-begin-arc' }), face(v?.other.avatar, { size: 46 })),
      h('p', { class: 'hs-begin-title' }, 'Your Hushspace'),
      h('p', { class: 'hs-begin-sub' }, `A private, text-only place for you and ${n}.`, when ? h('span', {}, ` ${when}.`) : null));
  }

  function introNote(n) {
    return h('div', { class: 'hs-intro' },
      h('span', { class: 'hs-intro-ico', 'aria-hidden': 'true' }, icon('shield')),
      h('div', { class: 'hs-intro-text' },
        h('p', {}, h('strong', {}, `${n} is a real person`), ' and a peer, not a professional. Neither of you is ever obliged to reply. If something worries you, report it from ⋯ at the top and a person on our safety team will look.'),
        h('button', { type: 'button', class: 'kit-btn kit-btn--ink kit-btn--xs hs-intro-ok', onclick: () => { device.prefs.safetyNoteSeen = true; drawLog(); log.focus({ preventScroll: true }); } }, 'Got it')));
  }

  function bubble(m, pos, n) {
    const who = m.mine ? 'You' : n;
    const showTime = pos === 'single' || pos === 'last';
    const inner = m.deleted
      ? h('p', { class: 'hs-bubble hs-bubble--ghost' }, h('span', { class: 'sr-only' }, `${who}, ${fmtTime(m.at)}: `), 'Message removed')
      : h('button', { type: 'button', class: 'hs-bubble', 'aria-haspopup': 'dialog', onclick: () => messageSheet(m) },
        h('span', { class: 'sr-only' }, `${who}, ${fmtTime(m.at)}: `), h('span', { class: 'hs-text' }, m.body));
    return h('div', { class: `hs-msg hs-msg--${m.mine ? 'mine' : 'theirs'} is-${pos}${m.deleted ? ' is-deleted' : ''}`, dataset: { test: 'msg', seq: m.seq } },
      inner, showTime ? h('span', { class: 'hs-time', 'aria-hidden': 'true' }, fmtTime(m.at)) : null);
  }

  function pendingBubble(o, pos) {
    const failed = o.state === 'failed';
    const link = (label, onclick, test) => h('button', { type: 'button', class: 'hs-state-btn', onclick, dataset: test ? { test } : undefined }, label);
    return h('div', { class: `hs-msg hs-msg--mine is-${pos} ${failed ? 'is-failed' : 'is-pending'}`, dataset: { test: failed ? 'msg-failed' : 'msg-pending' } },
      h('div', { class: 'hs-bubble' }, h('span', { class: 'hs-text' }, o.body)),
      failed
        ? h('p', { class: 'hs-state hs-state--failed', role: 'status' }, h('span', { class: 'hs-state-dot', 'aria-hidden': 'true' }), 'Not sent', ' · ',
          link('Try again', () => client.retry(id, o.clientId), 'retry'), ' · ',
          link('Remove', () => client.discard(id, o.clientId)))
        : h('p', { class: 'hs-state' }, 'Sending…'));
  }

  // ========================================================== composer ==
  const ta = h('textarea', { class: 'hs-input', id: `${device.name}-hs-composer`, rows: 1, maxlength: String(maxChars() + 200), placeholder: `Write to ${first.pseudonym}…`,
    'aria-label': `Message to ${first.pseudonym}`, 'aria-describedby': `${device.name}-hs-help`, enterkeyhint: coarse() ? 'enter' : 'send', autocomplete: 'off', dataset: { test: 'composer' } });
  ta.value = device.memory[draftKey] || '';
  const sendBtn = h('button', { type: 'button', class: 'hs-send', 'aria-label': 'Send', dataset: { test: 'send' }, onclick: () => send() }, icon('send'));
  sendBtn.addEventListener('animationend', () => sendBtn.classList.remove('is-glow'));
  const counter = h('span', { class: 'hs-count', 'aria-live': 'polite' });
  const err = h('p', { class: 'kit-error hs-err', role: 'alert' });
  const field = h('div', { class: 'hs-field' }, ta, sendBtn);
  const dock = h('div', { class: 'hs-dock' }, err, field,
    h('p', { class: 'hs-help', id: `${device.name}-hs-help` }, h('span', { class: 'hs-help-text' }, 'Text only · links and contact details stay out'), counter));
  const closedCard = h('div', { class: 'hs-closed', hidden: true, role: 'status' });

  function grow() {
    ta.style.height = 'auto';
    const full = ta.scrollHeight;
    ta.style.height = `${full}px`;
    field.classList.toggle('is-multi', full > 52);
  }
  function updateCount() {
    const max = maxChars();
    const n = charCount(ta.value.trim());
    counter.textContent = n > max * 0.8 ? `${n} / ${max}` : '';
    counter.classList.toggle('is-over', n > max);
    sendBtn.disabled = !ta.value.trim();
  }
  ta.addEventListener('input', () => { device.memory[draftKey] = ta.value; err.textContent = ''; grow(); updateCount(); });
  ta.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && !coarse()) { e.preventDefault(); send(); }
  });
  ta.addEventListener('focus', () => { stick(true); setTimeout(() => { if (alive && document.activeElement === ta) stick(true); }, 280); });

  async function send() {
    const text = ta.value;
    if (!text.trim()) return;
    const pre = checkMessage(text, { maxChars: maxChars() });
    if (!pre.ok) { err.textContent = pre.message; return; }
    ta.value = '';
    device.memory[draftKey] = '';
    grow(); updateCount();
    sendBtn.classList.remove('is-glow');
    void sendBtn.offsetWidth;            // restart the halo
    sendBtn.classList.add('is-glow');
    stick(true);
    const r = await client.sendMessage(id, text);
    if (!r.ok && r.error && r.error.code !== 'network' && r.error.code !== 'response-lost') {
      // a rule said no: give the words back so nothing is lost
      if (!ta.value) { ta.value = text; device.memory[draftKey] = text; grow(); updateCount(); }
      err.textContent = r.error.message;
      device.onScreen?.('send:refused', { code: r.error.code });
    }
  }

  // ======================================================= closed state ==
  let closedSig = null;
  function drawClosed() {
    const v = view();
    const open = !v || v.open;
    dock.hidden = !open;
    closedCard.hidden = open;
    if (open) { closedSig = null; return; }
    const sig = `${v.closedByMe}|${v.other.pseudonym}`;
    if (sig === closedSig) return;
    const entering = closedSig === null && rendered !== null;
    closedSig = sig;
    const n = v.other.pseudonym;
    const text = v.closedByMe === 'blocked' ? `You blocked ${n}. Neither of you can send messages here.`
      : v.closedByMe === 'disconnected' ? 'You’ve stepped back. Take care of yourself.'
        : 'This Hushspace has closed. No new messages can be sent.';
    const sub = v.closedByMe === 'disconnected'
      ? 'No new messages can be sent here. You can still read it for now, or report something that worried you.'
      : 'You can still read it for now, or report something that worried you.';
    closedCard.replaceChildren(
      h('span', { class: 'hs-closed-moon', 'aria-hidden': 'true' }, icon('moon')),
      h('p', { class: 'hs-closed-text', dataset: { test: 'closed-text' } }, text),
      h('p', { class: 'hs-closed-sub' }, sub),
      h('button', { type: 'button', class: 'kit-btn kit-btn--link hs-closed-link', onclick: () => reportSheet(null) }, 'Report this conversation'));
    if (entering) rise([closedCard], { y: 16, duration: 800 });
  }

  // ===================================================== real reactions ==
  let myQuiet = !!(v0 && v0.open && v0.quiet.mine);
  function syncPresence() {
    const v = view();
    if (!v) return;
    const s = v.open && (v.quiet.theirs || v.other.status === 'quiet');
    if (s !== sleepy) { sleepy = s; presence?.sleepy(s); }
    if (!v.open && wasOpen) {
      wasOpen = false;
      presence?.stepBack();
      device.atmo.set('dusk');
      device.atmo.quiet(false);
      myQuiet = false;
      newPill.hidden = true;
      return;
    }
    const q = v.open && v.quiet.mine;
    if (q !== myQuiet) { myQuiet = q; device.atmo.quiet(q); }
  }

  // ============================================================ sheets ==
  function intentSheet() {
    const v = view();
    if (!v || !v.open) return;
    const n = v.other.pseudonym;
    let busy = false;
    const pick = async (intent, btn) => {
      if (busy) return;
      busy = true;
      group.querySelectorAll('[role=radio]').forEach((x) => x.setAttribute('aria-checked', String(x === btn)));
      // no toast: the pill itself changes, right where you're looking
      const ok = await device.run(async () => { await client.act('setIntent', { conversationId: id, intent }, ['hushmates']); return true; });
      busy = false;
      if (ok) device.closeSheet();
      else group.querySelectorAll('[role=radio]').forEach((x) => x.setAttribute('aria-checked', String(x.dataset.intent === (view()?.intent.mine || ''))));
    };
    const option = (intentId, label, line, test) => {
      const btn = h('button', { type: 'button', role: 'radio', class: 'hs-choice', 'aria-checked': String((v.intent.mine || '') === intentId), dataset: { intent: intentId, ...(test ? { test } : {}) },
        onclick: () => pick(intentId || null, btn) },
      h('span', { class: 'hs-choice-mark', 'aria-hidden': 'true' }, icon('check')),
      h('span', { class: 'hs-choice-text' }, h('strong', {}, label), h('span', { class: 'hs-choice-line' }, line)));
      return btn;
    };
    const group = h('div', { class: 'hs-choices', role: 'radiogroup', 'aria-label': 'Your conversation preference' },
      INTENTS.map((it) => option(it.id, it.label, `“${it.line}”`, `intent-${it.id}`)),
      option('', 'No preference', 'Let the conversation find its way.', 'intent-none'));
    device.sheet({
      title: 'What would help right now?',
      body: [h('p', { class: 'hm-sheet-text hs-sheet-lede' }, `${n} will see this. It’s a gentle guide, not a rule, and you can change it any time.`), group],
    });
  }

  function optionsSheet() {
    const v = view();
    if (!v) return;
    const n = v.other.pseudonym;
    const row = ({ ic, label, value, onclick, test, tone }) => h('button', { type: 'button', class: `hs-row${tone ? ` hs-row--${tone}` : ''}`, onclick, dataset: test ? { test } : undefined },
      h('span', { class: 'hs-row-ico', 'aria-hidden': 'true' }, icon(ic)),
      h('span', { class: 'hs-row-label' }, label, value ? h('span', { class: 'hs-row-value' }, value) : null),
      h('span', { class: 'hs-row-go', 'aria-hidden': 'true' }, icon('chevron')));
    const group = (label, rows) => h('section', { class: 'hs-group', 'aria-label': label }, h('p', { class: 'kit-label hs-group-label' }, label), h('div', { class: 'kit-rows hs-rows' }, rows));

    const quiet = v.open ? sentenceSwitch({
      id: `${device.name}-${id}-quiet`, label: 'Quiet mode for this Hushspace', test: 'quiet-toggle', checked: v.quiet.mine,
      hint: `${n} will see you’re in quiet mode. Messages still arrive, with no pressure to reply.`,
      onChange: async (on) => {
        device.atmo.quiet(on);             // the light softens straight away
        const ok = await device.run(async () => { await client.act('setConversationQuiet', { conversationId: id, quiet: on }, ['hushmates']); return true; });
        if (!ok) { device.atmo.quiet(!on); return false; }
        return true;
      },
    }) : null;
    const mute = sentenceSwitch({
      id: `${device.name}-${id}-mute`, label: 'Mute notifications', test: 'mute-toggle', checked: v.muted,
      hint: 'Only you know. New messages won’t nudge you.',
      onChange: async (on) => {
        const ok = await device.run(async () => { await client.act('setConversationMuted', { conversationId: id, muted: on }, ['hushmates']); return true; });
        return ok ? true : false;
      },
    });
    const sizes = h('div', { class: 'hs-seg', role: 'radiogroup', 'aria-labelledby': `${device.name}-hs-size` },
      TEXT_SIZES.map((label, i) => h('button', { type: 'button', role: 'radio', class: 'hs-seg-opt', 'aria-checked': String(device.prefs.textSize === i), onclick: () => {
        device.prefs.textSize = i;
        device.root.dataset.textSize = String(i);
        sizes.querySelectorAll('[role=radio]').forEach((x, j) => x.setAttribute('aria-checked', String(j === i)));
        if (nearBottom) requestAnimationFrame(() => stick(true));
      } }, h('span', { class: `hs-seg-aa hs-seg-aa--${i}`, 'aria-hidden': 'true' }, 'Aa'), h('span', { class: 'hs-seg-label' }, label))));
    const sizeBlock = h('div', { class: 'hs-size' },
      h('span', { class: 'hs-row-ico', 'aria-hidden': 'true' }, icon('text')),
      h('div', { class: 'hs-size-in' }, h('p', { class: 'hs-size-label', id: `${device.name}-hs-size` }, 'Text size'), sizes));

    const mine = intentOf(v.intent.mine);
    device.sheet({
      title: 'This Hushspace',
      label: `Options for your Hushspace with ${n}`,
      body: h('div', { class: 'hs-sheet' },
        v.open ? group('Together', [
          row({ ic: 'heart', label: 'Conversation preference', value: mine ? mine.label : 'Nothing shared yet', onclick: () => intentSheet() }),
          quiet]) : null,
        group('Just for you', [mute, sizeBlock]),
        group('Safety', [
          row({ ic: 'flag', label: 'Report this conversation', onclick: () => reportSheet(null), test: 'report-conversation' }),
          v.open ? row({ ic: 'leave', label: 'Step back (disconnect)', onclick: () => disconnect(), test: 'disconnect' }) : null,
          v.other.handle && v.closedByMe !== 'blocked' ? row({ ic: 'block', label: `Block ${n}`, onclick: () => block(), test: 'block', tone: 'danger' }) : null,
          row({ ic: 'help', label: 'Safety & help', onclick: () => device.go('safety') }),
        ])),
    });
  }

  function messageSheet(m) {
    const n = name();
    const quote = h('figure', { class: `hs-quotebubble hs-quotebubble--${m.mine ? 'mine' : 'theirs'}` },
      h('blockquote', {}, m.body),
      h('figcaption', {}, `${m.mine ? 'You' : n} · ${fmtDay(m.at)}, ${fmtTime(m.at)}`));
    const actions = m.mine
      ? [h('button', { type: 'button', class: 'kit-btn kit-btn--quiet-danger kit-btn--block', onclick: async () => {
        device.closeSheet();
        await device.run(() => client.act('deleteMessage', { conversationId: id, messageId: m.id }));
      } }, icon('trash'), 'Remove for both of us'),
      h('button', { type: 'button', class: 'kit-btn kit-btn--text kit-btn--block', onclick: () => device.closeSheet() }, 'Cancel')]
      : [h('button', { type: 'button', class: 'kit-btn kit-btn--ink kit-btn--block', dataset: { test: 'report-message' }, onclick: () => reportSheet(m) }, icon('flag'), 'Report this message'),
        h('button', { type: 'button', class: 'kit-btn kit-btn--text kit-btn--block', onclick: () => device.closeSheet() }, 'Cancel')];
    device.sheet({
      title: m.mine ? 'Your message' : `${n}’s message`,
      body: [quote, h('p', { class: 'kit-note hs-sheet-note' }, m.mine
        ? 'Removing it clears the text for both of you. If it was already reported, the report keeps its copy.'
        : 'Reporting shares this message with our human safety team. They won’t tell anyone who reported it.')],
      actions,
    });
  }

  function reportSheet(m) {
    const v = view();
    const n = v?.other.pseudonym || name();
    let category = null;
    let alsoBlock = false;
    const cats = h('div', { class: 'hs-cats', role: 'radiogroup', 'aria-label': 'What happened?' },
      REPORT_CATEGORIES.map((rc) => h('button', { type: 'button', role: 'radio', class: 'hs-cat', 'aria-checked': 'false', dataset: { test: `cat-${rc.id}` }, onclick: (e) => {
        category = rc.id;
        cats.querySelectorAll('[role=radio]').forEach((x) => x.setAttribute('aria-checked', String(x === e.currentTarget)));
        submit.disabled = false;
      } }, rc.label)));
    const detailsId = `${device.name}-hs-report-details`;
    const details = h('textarea', { class: 'kit-textarea hs-details', id: detailsId, rows: 3, maxlength: 1000, placeholder: 'Anything that would help us understand (optional)' });
    const blockSwitch = v?.open && v.other.handle ? sentenceSwitch({
      id: `${device.name}-hs-report-block`, label: `Also block ${n}`, hint: 'They won’t be told. The Hushspace simply closes.', checked: false,
      onChange: (on) => { alsoBlock = on; return true; },
    }) : null;
    const submit = h('button', { type: 'button', class: 'kit-btn kit-btn--ink kit-btn--block', disabled: true, dataset: { test: 'submit-report' }, onclick: async () => {
      if (!category) return;
      submit.disabled = true;
      const r = await device.run(() => client.act('report', { conversationId: id, messageId: m?.id || null, category, details: details.value, alsoBlock },
        alsoBlock ? ['hushmates', 'blocked'] : []));
      if (!r) { submit.disabled = false; return; }
      device.sheet({
        title: 'Report received',
        art: h('span', { class: 'hs-received', 'aria-hidden': 'true' }, icon('shield')),
        body: [h('p', { class: 'hm-sheet-text hs-received-text' }, r.expectation),
          h('p', { class: 'kit-note hs-received-note' }, 'Reports are read by people, not automated systems, and aren’t watched in real time. If you or someone else is in danger, contact local emergency services.')],
        actions: [h('button', { type: 'button', class: 'kit-btn kit-btn--ink kit-btn--block', onclick: () => device.closeSheet() }, 'Okay'),
          h('button', { type: 'button', class: 'kit-btn kit-btn--text kit-btn--block', onclick: () => device.go('safety') }, 'Support resources')],
      });
    } }, 'Send report');
    device.sheet({
      title: m ? 'Report this message' : 'Report this conversation',
      body: h('div', { class: 'hs-sheet hs-report' },
        h('p', { class: 'hm-sheet-text hs-sheet-lede' }, m
          ? 'Our safety team will see this one message.'
          : `Our safety team will see the most recent messages in this Hushspace (up to 20). ${n} won’t be told who reported.`),
        h('p', { class: 'kit-label hs-group-label' }, 'What happened?'),
        cats,
        h('label', { class: 'kit-label hs-group-label', for: detailsId }, 'Details'),
        details,
        blockSwitch),
      actions: [submit, h('button', { type: 'button', class: 'kit-btn kit-btn--text kit-btn--block', onclick: () => device.closeSheet() }, 'Cancel')],
    });
  }

  async function disconnect() {
    const v = view();
    if (!v) return;
    const ok = await device.confirm({
      title: `Step back from ${v.other.pseudonym}?`,
      text: 'Your Hushspace closes for both of you. No explanation is needed, nothing is held against you, and they can’t invite you again for 30 days.',
      confirmLabel: 'Step back', danger: true, art: face(v.other.avatar, { size: 72 }),
    });
    if (ok) await device.run(() => client.act('removeHushmate', { conversationId: id }, ['hushmates', 'me']));
  }

  async function block() {
    const v = view();
    if (!v) return;
    const ok = await device.confirm({
      title: `Block ${v.other.pseudonym}?`,
      text: 'They won’t be able to message you, invite you or find you. They aren’t told you blocked them; the Hushspace simply closes. You can unblock later in Boundaries & privacy.',
      confirmLabel: 'Block', danger: true, art: face(v.other.avatar, { size: 72 }),
    });
    if (ok) await device.run(() => client.act('block', { handle: v.other.handle }, ['hushmates', 'blocked', 'invitations', 'me']));
  }

  // ============================================================= scene ==
  const drawAll = () => { drawHeader(); drawPrefs(); drawNotices(); drawClosed(); drawLog(); syncPresence(); };

  device.root.dataset.textSize = String(device.prefs.textSize);
  const el = h('div', { class: 'hm-scene hs', dataset: { mallow: first.avatar || '' } }, head, prefs, notices, body, closedCard, dock);
  drawAll();
  grow();
  updateCount();

  return {
    el,
    mood: v0 && !v0.open ? 'dusk' : 'hush',
    quiet: myQuiet,
    mounted() {
      requestAnimationFrame(() => { grow(); toBottom(false); });
      if (!reducedMotion()) dropIn(stage, { y: -26, scale: 0.86, delay: 140 });
      rise([prefs, notices], { y: 10, delay: 220, stagger: 60 });
      rise([dock.hidden ? closedCard : dock], { y: 18, delay: 260 });
      const wasLoaded = !!conv()?.loaded;
      client.openConversation(id).then(() => {
        if (!alive) return;
        drawAll();
        if (!wasLoaded) log.animate?.([{ opacity: 0 }, { opacity: 1 }], { duration: 320 });
        toBottom(false);
      }).catch((e) => { if (alive) device.toast(e?.message || 'This Hushspace couldn’t be opened.', { tone: 'warn' }); });
    },
    update(state, detail) {
      if (!alive) return;
      drawAll();
      const inc = detail?.message;
      if (inc && inc.conversationId === id && inc.isNew && !inc.message.mine) {
        // a message really arrived: their Mallow settles, two of its particles drift up
        presence?.settle();
        if (presence) presence.emit(presence.m.part, 2);
        if (nearBottom) toBottom(true);
        else newPill.hidden = false;
      }
      if (detail?.sending) stick(true);
      else if (detail?.sent || detail?.failed) stick(false);
    },
    destroy() {
      alive = false;
      ro?.disconnect();
      client.closeConversation(id);
      set.destroy();
    },
  };
}
