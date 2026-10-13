// Hushspace: a private, text-only conversation between two Hushmates.
// No read receipts, no typing indicators, no "last seen". The Mallow beside
// the other person's name is a visual companion and never speaks.

import { h, icon, testTag, statusOf, intentOf, fmtTime, fmtDay, toggle } from '../dom.js';
import { livingMallow } from '../presence.js';
import { INTENTS, REPORT_CATEGORIES } from '../../core/config.js';
import { checkMessage, charCount } from '../../core/text-policy.js';

const TEXT_SIZES = ['Smaller', 'Standard', 'Larger'];
const coarse = () => { try { return window.matchMedia('(pointer: coarse)').matches; } catch { return false; } };

export function hushspace(device, { id }) {
  const client = device.client;
  let alive = true;
  const c = () => client.state.conversations[id];
  const view = () => c()?.view || client.state.hushmates.find((x) => x.id === id) || null;
  const v0 = view();
  const other = v0?.other || { pseudonym: 'your Hushmate', avatar: null };
  const name = other.pseudonym;

  // ------------------------------------------------------------- header --
  const presence = livingMallow(other.avatar, { size: 52, label: `${name}’s Mallow` });
  const who = h('div', { class: 'hm-hs-who' });
  const more = h('button', { class: 'hm-icon-btn', 'aria-label': 'Hushspace options', dataset: { test: 'hs-more' }, onclick: () => optionsSheet() }, icon('more'));
  const head = h('header', { class: 'hm-hs-head', dataset: { mallow: other.avatar || '' } },
    h('button', { class: 'hm-icon-btn', 'aria-label': 'Back', onclick: () => device.back(), dataset: { test: 'back' } }, icon('back')),
    h('div', { class: 'hm-hs-mallow' }, presence.el), who, more);

  // ------------------------------------------------------------- intent --
  const intents = h('div', { class: 'hm-hs-intent', 'aria-label': 'Conversation preferences' });
  const notices = h('div', { class: 'hm-hs-notices' });

  // ----------------------------------------------------------- messages --
  const log = h('div', { class: 'hm-hs-log', role: 'log', 'aria-label': `Messages with ${name}`, 'aria-live': 'polite', tabindex: '0' });
  const scroller = h('div', { class: 'hm-hs-scroll' }, log);

  // ----------------------------------------------------------- composer --
  const ta = h('textarea', { class: 'hm-hs-input', rows: 1, maxlength: 1200, placeholder: `Write to ${name}…`, 'aria-label': `Message to ${name}`, enterkeyhint: coarse() ? 'enter' : 'send', dataset: { test: 'composer' } });
  ta.value = device.memory[`draft:${id}`] || '';
  const sendBtn = h('button', { class: 'hm-hs-send', 'aria-label': 'Send', dataset: { test: 'send' }, onclick: () => send() }, icon('send'));
  const counter = h('span', { class: 'hm-hs-count', 'aria-live': 'polite' });
  const err = h('p', { class: 'hm-hs-error', role: 'alert' });
  const composer = h('div', { class: 'hm-hs-composer' },
    err,
    h('div', { class: 'hm-hs-field' }, ta, sendBtn),
    h('p', { class: 'hm-hs-help' }, h('span', {}, 'Text only · links and contact details stay out'), counter));
  const closedBar = h('div', { class: 'hm-hs-closed', hidden: true });

  const grow = () => { ta.style.height = 'auto'; ta.style.height = `${Math.min(ta.scrollHeight, 132)}px`; };
  const updateCount = () => {
    const max = client.state.me?.limits?.messageMaxChars || 1000;
    const n = charCount(ta.value.trim());
    counter.textContent = n > max * 0.8 ? `${n} / ${max}` : '';
    counter.classList.toggle('is-over', n > max);
    sendBtn.disabled = !ta.value.trim();
  };
  ta.addEventListener('input', () => { device.memory[`draft:${id}`] = ta.value; err.textContent = ''; grow(); updateCount(); });
  ta.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && !coarse()) { e.preventDefault(); send(); }
  });
  ta.addEventListener('focus', () => setTimeout(() => stick(true), 250));

  async function send() {
    const text = ta.value;
    if (!text.trim()) return;
    const pre = checkMessage(text, { maxChars: client.state.me?.limits?.messageMaxChars || 1000 });
    if (!pre.ok) { err.textContent = pre.message; return; }
    ta.value = ''; device.memory[`draft:${id}`] = ''; grow(); updateCount();
    sendBtn.classList.remove('is-glow'); void sendBtn.offsetWidth; sendBtn.classList.add('is-glow');
    presence.acknowledge();
    stick(true);
    const r = await client.sendMessage(id, text);
    if (!r.ok && r.error && r.error.code !== 'network' && r.error.code !== 'response-lost') {
      // refused by a rule: give the words back so nothing is lost
      if (!ta.value) { ta.value = text; device.memory[`draft:${id}`] = text; grow(); updateCount(); }
      err.textContent = r.error.message;
      device.onScreen?.('send:refused', { code: r.error.code });
    }
  }

  // --------------------------------------------------------- rendering --
  let nearBottom = true;
  scroller.addEventListener('scroll', () => { nearBottom = scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight < 80; });
  const stick = (force) => { if (force || nearBottom) scroller.scrollTop = scroller.scrollHeight; };

  function drawHeader() {
    const v = view();
    if (!v) return;
    const st = statusOf(v.other.status);
    who.replaceChildren(
      h('h1', { class: 'hm-hs-name', 'data-autofocus': '' }, v.other.pseudonym),
      h('p', { class: 'hm-hs-subline' },
        h('span', { class: `hm-hs-sub hm-hs-sub--${v.open ? st.id : 'closed'}` }, v.open ? (v.other.status ? st.label : '') : 'Closed'),
        v.other.test ? testTag() : null));
  }

  function drawIntent() {
    const v = view();
    if (!v) return;
    intents.hidden = !v.open;
    const mine = intentOf(v.intent.mine);
    const theirs = intentOf(v.intent.theirs);
    intents.replaceChildren(
      h('button', { class: `hm-intent hm-intent--mine ${mine ? 'is-set' : ''}`, disabled: !v.open, onclick: () => intentSheet(), dataset: { test: 'intent-mine' } },
        h('span', { class: 'hm-intent__who' }, 'You'), h('span', { class: 'hm-intent__what' }, mine ? mine.label : 'Share a preference')),
      h('div', { class: `hm-intent hm-intent--theirs ${theirs ? 'is-set' : ''}`, dataset: { test: 'intent-theirs' } },
        h('span', { class: 'hm-intent__who' }, v.other.pseudonym), h('span', { class: 'hm-intent__what' }, theirs ? theirs.label : 'No preference shared')));
    const items = [];
    if (theirs && v.open) items.push(h('p', { class: 'hm-hs-notice hm-hs-notice--intent', dataset: { test: 'their-intent-line' } }, `${v.other.pseudonym}: “${theirs.line}”`));
    if (v.quiet.theirs && v.open) items.push(h('p', { class: 'hm-hs-notice', dataset: { test: 'their-quiet' } }, icon('moon'), `${v.other.pseudonym} set this Hushspace to quiet. No rush, either way.`));
    if (v.quiet.mine && v.open) items.push(h('p', { class: 'hm-hs-notice hm-hs-notice--mine', dataset: { test: 'my-quiet' } }, icon('moon'), 'Quiet mode is on for you here. Reply whenever, or not at all.'));
    if (v.muted && v.open) items.push(h('p', { class: 'hm-hs-notice hm-hs-notice--mine' }, icon('bellOff'), 'Muted. Only you know.'));
    notices.replaceChildren(...items);
  }

  function drawClosed() {
    const v = view();
    const open = !v || v.open;
    composer.hidden = !open;
    closedBar.hidden = open;
    if (open) return;
    const why = v.closedByMe === 'blocked' ? `You blocked ${v.other.pseudonym}. Neither of you can send messages here.`
      : v.closedByMe === 'disconnected' ? 'You stepped back from this Hushspace. No new messages can be sent.'
        : 'This Hushspace has closed. No new messages can be sent.';
    closedBar.replaceChildren(icon('shield'), h('div', {}, h('p', { dataset: { test: 'closed-text' } }, why),
      h('p', { class: 'hm-muted' }, 'You can still read it for now, or report something that worried you.'),
      h('button', { class: 'hm-link', onclick: () => reportSheet(null) }, 'Report this conversation')));
  }

  function drawLog() {
    const conv = c();
    if (!conv) return;
    const v = view();
    const nodes = [];
    if (conv.hasMore) nodes.push(h('button', { class: 'hm-btn hm-btn--small hm-hs-earlier', onclick: async () => {
      const h0 = scroller.scrollHeight;
      await device.run(() => client.loadEarlier(id));
      scroller.scrollTop = scroller.scrollHeight - h0;
    } }, 'Earlier messages'));
    if (!device.prefs.safetyNoteSeen) {
      nodes.push(h('div', { class: 'hm-hs-intro' },
        h('p', {}, h('b', {}, `${v?.other.pseudonym || 'Your Hushmate'} is a real person`), ' and a peer, not a professional. Neither of you is ever obliged to reply. If something worries you, report it from ⋯ and a person on our safety team will look.'),
        h('button', { class: 'hm-link', onclick: () => { device.prefs.safetyNoteSeen = true; drawLog(); } }, 'Got it')));
    }
    if (!conv.messages.length && !conv.outbox.length) {
      nodes.push(h('p', { class: 'hm-hs-empty' }, 'This is the beginning of your Hushspace. Say hello whenever you’re ready.'));
    }
    let lastDay = '';
    let prev = null;
    for (const m of conv.messages) {
      const day = fmtDay(m.at);
      if (day !== lastDay) { nodes.push(h('p', { class: 'hm-hs-day' }, day)); lastDay = day; prev = null; }
      const grouped = prev && prev.mine === m.mine && m.at - prev.at < 5 * 60e3;
      nodes.push(bubble(m, grouped));
      prev = m;
    }
    for (const o of conv.outbox) nodes.push(pendingBubble(o));
    log.replaceChildren(...nodes);
  }

  function bubble(m, grouped) {
    const label = `${m.mine ? 'You' : name}, ${fmtTime(m.at)}${m.deleted ? ', message removed' : ''}`;
    const b = h('div', { class: `hm-msg ${m.mine ? 'hm-msg--mine' : 'hm-msg--theirs'} ${grouped ? 'is-grouped' : ''} ${m.deleted ? 'is-deleted' : ''}`, dataset: { seq: m.seq, test: 'msg' } },
      h('div', { class: 'hm-msg__bubble', tabindex: m.deleted ? null : '0', role: m.deleted ? null : 'button', 'aria-haspopup': m.deleted ? null : 'dialog', 'aria-label': m.deleted ? label : `${label}. Options`,
        onclick: () => !m.deleted && messageSheet(m), onkeydown: (e) => { if ((e.key === 'Enter' || e.key === ' ') && !m.deleted) { e.preventDefault(); messageSheet(m); } } },
      h('span', { class: 'hm-msg__text' }, m.deleted ? 'Message removed' : m.body)),
      h('span', { class: 'hm-msg__time', 'aria-hidden': 'true' }, fmtTime(m.at)));
    return b;
  }
  function pendingBubble(o) {
    const failed = o.state === 'failed';
    return h('div', { class: `hm-msg hm-msg--mine ${failed ? 'is-failed' : 'is-pending'}`, dataset: { test: failed ? 'msg-failed' : 'msg-pending' } },
      h('div', { class: 'hm-msg__bubble' }, h('span', { class: 'hm-msg__text' }, o.body)),
      failed
        ? h('span', { class: 'hm-msg__state' }, 'Not sent. ',
          h('button', { class: 'hm-link', dataset: { test: 'retry' }, onclick: () => client.retry(id, o.clientId) }, 'Try again'), ' · ',
          h('button', { class: 'hm-link', onclick: () => client.discard(id, o.clientId) }, 'Remove'))
        : h('span', { class: 'hm-msg__state' }, 'Sending…'));
  }

  // ------------------------------------------------------------- sheets --
  function intentSheet() {
    const v = view();
    const pick = (intent) => device.run(async () => {
      await client.act('setIntent', { conversationId: id, intent }, ['hushmates']);
      device.closeSheet();
    }, { ok: intent ? 'Shared with your Hushmate.' : 'Preference cleared.' });
    device.sheet({
      title: 'What would help right now?',
      body: [
        h('p', { class: 'hm-p hm-muted' }, `${v.other.pseudonym} will see this. It’s a gentle guide, not a rule, and you can change it any time.`),
        h('div', { class: 'hm-options', role: 'radiogroup', 'aria-label': 'Conversation preference' },
          INTENTS.map((it) => h('button', { type: 'button', role: 'radio', class: 'hm-option', 'aria-checked': String(v.intent.mine === it.id), dataset: { test: `intent-${it.id}` }, onclick: () => pick(it.id) },
            h('span', { class: 'hm-option__text' }, h('b', {}, it.label), h('span', {}, `“${it.line}”`)))),
          h('button', { type: 'button', role: 'radio', class: 'hm-option', 'aria-checked': String(!v.intent.mine), onclick: () => pick(null) },
            h('span', { class: 'hm-option__text' }, h('b', {}, 'No preference'), h('span', {}, 'Let the conversation find its way.')))),
      ],
    });
  }

  function optionsSheet() {
    const v = view();
    const size = h('div', { class: 'hm-seg', role: 'radiogroup', 'aria-label': 'Text size' },
      TEXT_SIZES.map((label, i) => h('button', { type: 'button', role: 'radio', 'aria-checked': String(device.prefs.textSize === i), onclick: (e) => {
        device.prefs.textSize = i; device.root.dataset.textSize = String(i);
        e.currentTarget.parentElement.querySelectorAll('[role=radio]').forEach((x, j) => x.setAttribute('aria-checked', String(j === i)));
      } }, label)));
    const rows = [
      v.open ? h('button', { class: 'hm-menu-item', onclick: () => intentSheet() }, icon('heart'), h('span', {}, 'Conversation preference')) : null,
      v.open ? toggle({ id: `${device.name}-${id}-quiet`, label: 'Quiet mode for this Hushspace', hint: `${v.other.pseudonym} will see you’re in quiet mode. Messages still arrive, with no pressure to reply.`, checked: v.quiet.mine,
        onChange: (on) => device.run(() => client.act('setConversationQuiet', { conversationId: id, quiet: on }, ['hushmates']), { ok: on ? 'Quiet mode on. No rush, ever.' : 'Quiet mode off.' }) }) : null,
      toggle({ id: `${device.name}-${id}-mute`, label: 'Mute notifications', hint: 'Only you know. New messages won’t nudge you.', checked: v.muted,
        onChange: (on) => device.run(() => client.act('setConversationMuted', { conversationId: id, muted: on }, ['hushmates']), { ok: on ? 'Muted.' : 'Unmuted.' }) }),
      h('div', { class: 'hm-menu-block' }, h('p', { class: 'hm-label' }, 'Text size'), size),
      h('button', { class: 'hm-menu-item', onclick: () => reportSheet(null), dataset: { test: 'report-conversation' } }, icon('flag'), h('span', {}, 'Report this conversation')),
      v.open ? h('button', { class: 'hm-menu-item', onclick: () => disconnect(), dataset: { test: 'disconnect' } }, icon('leave'), h('span', {}, 'Step back (disconnect)')) : null,
      v.other.handle ? h('button', { class: 'hm-menu-item hm-menu-item--danger', onclick: () => block(), dataset: { test: 'block' } }, icon('block'), h('span', {}, `Block ${v.other.pseudonym}`)) : null,
      h('button', { class: 'hm-menu-item', onclick: () => device.go('safety') }, icon('help'), h('span', {}, 'Safety & help')),
    ];
    device.sheet({ title: 'This Hushspace', body: h('div', { class: 'hm-menu' }, rows) });
  }

  function messageSheet(m) {
    const actions = m.mine
      ? [h('button', { class: 'hm-btn hm-btn--danger', onclick: async () => {
        device.closeSheet();
        await device.run(() => client.act('deleteMessage', { conversationId: id, messageId: m.id }), { ok: 'Removed for both of you.' });
      } }, 'Remove for both of us'), h('button', { class: 'hm-btn hm-btn--ghost', onclick: () => device.closeSheet() }, 'Cancel')]
      : [h('button', { class: 'hm-btn', dataset: { test: 'report-message' }, onclick: () => reportSheet(m) }, icon('flag'), 'Report this message'),
        h('button', { class: 'hm-btn hm-btn--ghost', onclick: () => device.closeSheet() }, 'Cancel')];
    device.sheet({
      title: m.mine ? 'Your message' : `${name}’s message`,
      body: [h('blockquote', { class: 'hm-quote' }, m.body), h('p', { class: 'hm-hint' }, m.mine ? 'Removing it clears the text for both of you. If it was already reported, the report keeps its copy.' : 'Reporting shares this message with our human safety team. They won’t tell anyone who reported it.')],
      actions,
    });
  }

  function reportSheet(m) {
    const v = view();
    let category = null;
    const cats = h('div', { class: 'hm-options', role: 'radiogroup', 'aria-label': 'What happened?' },
      REPORT_CATEGORIES.map((rc) => h('button', { type: 'button', role: 'radio', class: 'hm-option hm-option--compact', 'aria-checked': 'false', dataset: { test: `cat-${rc.id}` }, onclick: (e) => {
        category = rc.id;
        cats.querySelectorAll('[role=radio]').forEach((x) => x.setAttribute('aria-checked', String(x === e.currentTarget)));
        submit.disabled = false;
      } }, h('span', { class: 'hm-option__text' }, h('b', {}, rc.label)))));
    const details = h('textarea', { class: 'hm-input hm-textarea', id: `${device.name}-report-details`, rows: 3, maxlength: 1000, placeholder: 'Anything that would help us understand (optional)' });
    const alsoBlock = h('input', { type: 'checkbox', id: `${device.name}-report-block` });
    if (!v.open) alsoBlock.disabled = true;
    const submit = h('button', { class: 'hm-btn hm-btn--primary', disabled: true, dataset: { test: 'submit-report' }, onclick: async () => {
      submit.disabled = true;
      const r = await device.run(() => client.act('report', { conversationId: id, messageId: m?.id || null, category, details: details.value, alsoBlock: alsoBlock.checked }, alsoBlock.checked ? ['hushmates', 'blocked'] : []));
      if (!r) { submit.disabled = false; return; }
      device.sheet({
        title: 'Report received',
        body: [h('p', { class: 'hm-p' }, r.expectation),
          h('p', { class: 'hm-p hm-muted' }, 'Reports are read by people, not automated systems, and aren’t watched in real time. If you or someone else is in danger, contact local emergency services.')],
        actions: [h('button', { class: 'hm-btn hm-btn--primary', onclick: () => device.closeSheet() }, 'Okay'),
          h('button', { class: 'hm-btn hm-btn--ghost', onclick: () => device.go('safety') }, 'Support resources')],
      });
    } }, 'Send report');
    device.sheet({
      title: m ? 'Report this message' : 'Report this conversation',
      body: [
        h('p', { class: 'hm-p hm-muted' }, m ? 'Our safety team will see this one message.' : `Our safety team will see the most recent messages in this Hushspace (up to 20). ${v.other.pseudonym} won’t be told who reported.`),
        cats,
        h('label', { class: 'hm-label', for: `${device.name}-report-details` }, 'Details'), details,
        v.open ? h('label', { class: 'hm-check', for: `${device.name}-report-block` }, alsoBlock, h('span', {}, `Also block ${v.other.pseudonym}`)) : null,
      ],
      actions: [submit, h('button', { class: 'hm-btn hm-btn--ghost', onclick: () => device.closeSheet() }, 'Cancel')],
    });
  }

  async function disconnect() {
    const v = view();
    const ok = await device.confirm({
      title: `Step back from ${v.other.pseudonym}?`,
      text: 'Your Hushspace closes for both of you. No explanation is needed, nothing is held against you, and they can’t invite you again for 30 days.',
      confirmLabel: 'Step back', danger: true,
    });
    if (ok) await device.run(() => client.act('removeHushmate', { conversationId: id }, ['hushmates', 'me']), { ok: 'You’ve stepped back. Take care of yourself.' });
  }

  async function block() {
    const v = view();
    const ok = await device.confirm({
      title: `Block ${v.other.pseudonym}?`,
      text: 'They won’t be able to message you, invite you or find you. They aren’t told you blocked them; the Hushspace simply closes. You can unblock later in Boundaries & privacy.',
      confirmLabel: 'Block', danger: true,
    });
    if (ok) await device.run(() => client.act('block', { handle: v.other.handle }, ['hushmates', 'blocked', 'invitations', 'me']), { ok: `${v.other.pseudonym} is blocked.` });
  }

  const drawAll = () => { drawHeader(); drawIntent(); drawClosed(); drawLog(); };

  const el = h('div', { class: 'hm-hs' }, head, intents, notices, scroller, closedBar, composer);
  el.dataset.mallow = other.avatar || '';
  return {
    el,
    mounted() {
      device.root.dataset.textSize = String(device.prefs.textSize);
      drawAll(); grow(); updateCount();
      requestAnimationFrame(() => stick(true));
      client.openConversation(id).then(() => { if (alive) { drawAll(); stick(true); } }).catch((e) => device.toast(e.message, { tone: 'warn' }));
    },
    update(state, detail) {
      if (!alive) return;
      drawHeader(); drawIntent(); drawClosed(); drawLog();
      const inc = detail?.message;
      if (inc && inc.conversationId === id && inc.isNew && !inc.message.mine) { presence.settle(); stick(false); }
      if (detail?.sending || detail?.sent) stick(true);
    },
    destroy() { alive = false; client.closeConversation(id); presence.destroy(); },
  };
}
