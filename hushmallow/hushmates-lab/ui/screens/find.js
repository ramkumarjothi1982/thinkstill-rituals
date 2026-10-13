import { h, icon, avatar, testTag, chip, styleLabel, availabilityLabel } from '../dom.js';
import { header, body, section, empty } from './common.js';
import { STYLES, INTERESTS } from '../../core/config.js';

function inviteSheet(device, card, onSent) {
  device.sheet({
    title: `Invite ${card.pseudonym}?`,
    body: [
      h('div', { class: 'hm-sheet-person' }, avatar(card.avatar, { size: 64, label: `${card.pseudonym}’s Mallow` }), h('div', {}, h('b', {}, card.pseudonym), h('p', { class: 'hm-muted' }, styleLabel(card.style)))),
      h('p', { class: 'hm-p' }, 'They’ll see your Mallow, pseudonym and interests, and can accept or decline in their own time.'),
      h('p', { class: 'hm-p hm-muted' }, 'Nobody can send a message until you both agree. If they don’t accept, that’s okay, and nobody is told why.'),
    ],
    actions: [
      h('button', { class: 'hm-btn hm-btn--primary', dataset: { test: 'send-invite' }, onclick: async (e) => {
        e.currentTarget.disabled = true;
        const r = await device.run(() => device.client.act('sendInvitation', { handle: card.handle }, ['invitations']), { ok: 'Invitation sent. No rush. They can take their time.' });
        device.closeSheet();
        if (r) onSent();
      } }, 'Send private invitation'),
      h('button', { class: 'hm-btn hm-btn--ghost', onclick: () => device.closeSheet() }, 'Not now'),
    ],
  });
}

export function find(device) {
  const me = device.state.me;
  const m = device.memory.find ||= { style: null, interests: [] };
  const results = h('div', { class: 'hm-cards', 'aria-live': 'polite', 'aria-busy': 'true' });
  let alive = true;

  const load = async () => {
    results.setAttribute('aria-busy', 'true');
    results.replaceChildren(h('p', { class: 'hm-muted hm-loading' }, 'Looking gently…'));
    try {
      const r = await device.client.api('discover', { style: m.style, interests: m.interests });
      if (!alive) return;
      device.memory.lastDiscover = r.cards.map((c) => c.pseudonym);
      device.onScreen?.('find:results', { names: device.memory.lastDiscover });
      results.replaceChildren(...(r.cards.length ? r.cards.map(card) : [empty({ title: 'No one matches right now.', text: 'Try fewer filters, or come back another day. People join and step back all the time.' })]));
    } catch (e) {
      results.replaceChildren(empty({ title: 'Couldn’t look just now.', text: e.message }));
    }
    results.setAttribute('aria-busy', 'false');
  };

  const card = (c) => {
    let action;
    if (c.invitation === 'sent') action = h('button', { class: 'hm-btn hm-btn--small', disabled: true }, icon('check'), 'Invitation sent');
    else if (c.invitation === 'received') action = h('button', { class: 'hm-btn hm-btn--small hm-btn--primary', onclick: () => device.go('invitations') }, 'They invited you');
    else if (!c.acceptingInvites) action = h('p', { class: 'hm-card__paused' }, icon('pause'), 'Not taking invitations right now');
    else action = h('button', { class: 'hm-btn hm-btn--small hm-btn--primary', dataset: { test: `invite-${c.pseudonym}` }, onclick: () => inviteSheet(device, c, load) }, 'Invite');
    return h('article', { class: 'hm-card', dataset: { mallow: c.avatar, test: `card-${c.pseudonym}` }, 'aria-label': c.pseudonym },
      h('div', { class: 'hm-card__top' },
        avatar(c.avatar, { size: 64, label: `${c.pseudonym}’s Mallow` }),
        h('div', { class: 'hm-card__who' },
          h('h3', { class: 'hm-card__name' }, c.pseudonym, c.test ? testTag() : null),
          h('p', { class: 'hm-card__meta' }, styleLabel(c.style)),
          h('p', { class: 'hm-card__meta hm-muted' }, `${availabilityLabel(c.availability)} · ${c.language}`))),
      c.interests.length ? h('ul', { class: 'hm-tags', 'aria-label': 'Happy to talk about' }, c.interests.map((x) => h('li', {}, x))) : null,
      h('div', { class: 'hm-card__foot' }, action));
  };

  const styleChips = h('div', { class: 'hm-chips hm-chips--scroll' });
  const interestChips = h('div', { class: 'hm-chips hm-chips--scroll' });
  const drawFilters = () => {
    styleChips.replaceChildren(chip('Any style', !m.style, () => { m.style = null; drawFilters(); load(); }),
      ...STYLES.map((s) => chip(s.label, m.style === s.id, () => { m.style = m.style === s.id ? null : s.id; drawFilters(); load(); })));
    const order = [...(me.profile.interests || []), ...INTERESTS.filter((x) => !me.profile.interests.includes(x))];
    interestChips.replaceChildren(...order.map((x) => chip(x, m.interests.includes(x), () => {
      m.interests = m.interests.includes(x) ? m.interests.filter((y) => y !== x) : [...m.interests, x];
      drawFilters(); load();
    })));
  };
  drawFilters();

  const codeInput = h('input', { class: 'hm-input', id: `${device.name}-code`, placeholder: 'ABCD-1234', maxlength: 12, autocomplete: 'off', autocapitalize: 'characters', spellcheck: 'false' });
  const useCode = h('button', { class: 'hm-btn hm-btn--small', onclick: async () => {
    if (!codeInput.value.trim()) { codeInput.focus(); return; }
    const r = await device.run(() => device.client.act('redeemInviteCode', { code: codeInput.value }, ['invitations']));
    if (r) { codeInput.value = ''; device.toast(`Invitation sent to ${r.other.pseudonym}.`); }
  } }, 'Use code');

  const el = h('div', { class: 'hm-col' },
    header(device, { title: 'Find a Hushmate' }),
    body(
      h('p', { class: 'hm-lede hm-lede--tight' }, 'Every Mallow here chose to be found. Cards show only what each person decided to share.'),
      me.profile.discoverable ? null : h('div', { class: 'hm-callout' }, icon('eyeOff'),
        h('p', {}, 'You’re hidden from Find (the default). You can still invite people. ', h('button', { class: 'hm-link', onclick: () => device.go('boundaries') }, 'Change'))),
      section('Conversation style', styleChips),
      section('Interests in common', interestChips),
      results,
      h('p', { class: 'hm-hint hm-center' }, 'Ordered by the interests you picked, then a gentle daily rotation. No rankings, no popularity, and nothing reads anyone’s messages.'),
      section('Have a private code?',
        h('p', { class: 'hm-hint' }, 'Someone you already know can share their private invitation code with you.'),
        h('label', { class: 'sr-only', for: `${device.name}-code` }, 'Private invitation code'),
        h('div', { class: 'hm-input-row' }, codeInput, useCode))));
  return { el, mounted: load, destroy: () => { alive = false; } };
}
