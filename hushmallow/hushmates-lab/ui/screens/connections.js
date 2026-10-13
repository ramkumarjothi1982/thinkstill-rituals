import { h, icon, avatar, testTag, styleLabel, statusOf, intentOf, fmtUntil, fmtWhen } from '../dom.js';
import { header, body, section, empty, personLine } from './common.js';

const CLOSED_COPY = { accepted: 'Connected', declined: 'Didn’t connect this time', cancelled: 'Withdrawn', expired: 'Expired' };

export function invitations(device) {
  const s = device.state;
  const received = s.invitations.filter((i) => i.direction === 'received' && i.status === 'pending');
  const sent = s.invitations.filter((i) => i.direction === 'sent' && i.status === 'pending');
  const earlier = s.invitations.filter((i) => i.status !== 'pending').slice(0, 12);

  const respond = async (inv, accept) => {
    const r = await device.run(() => device.client.act('respondToInvitation', { id: inv.id, accept }, ['invitations', 'hushmates', 'me']));
    if (!r) return;
    if (accept) {
      device.sheet({
        title: `You and ${inv.other.pseudonym} are Hushmates`,
        body: [h('div', { class: 'hm-sheet-person' }, avatar(inv.other.avatar, { size: 64, label: '' }), h('p', { class: 'hm-p' }, 'Your private Hushspace is open. Only the two of you can read it, and neither of you is ever obliged to reply.'))],
        actions: [h('button', { class: 'hm-btn hm-btn--primary', dataset: { test: 'open-hushspace' }, onclick: () => device.go('hushspace', { id: r.conversationId }) }, 'Open our Hushspace'),
          h('button', { class: 'hm-btn hm-btn--ghost', onclick: () => device.closeSheet() }, 'Later')],
      });
    } else device.toast('Declined quietly. They aren’t told why.');
  };

  const receivedCard = (inv) => h('article', { class: 'hm-card', dataset: { test: `received-${inv.other.pseudonym}` } },
    personLine(inv.other, { size: 64, extra: h('p', { class: 'hm-card__meta' }, `${styleLabel(inv.other.style)} · ${inv.other.language || ''}`) }),
    inv.other.interests?.length ? h('ul', { class: 'hm-tags' }, inv.other.interests.map((x) => h('li', {}, x))) : null,
    h('p', { class: 'hm-hint' }, `Wants to be Hushmates · expires ${fmtUntil(inv.expiresAt)}`),
    h('div', { class: 'hm-row-btns' },
      h('button', { class: 'hm-btn hm-btn--primary', dataset: { test: 'accept' }, onclick: () => respond(inv, true) }, 'Accept'),
      h('button', { class: 'hm-btn', dataset: { test: 'decline' }, onclick: () => respond(inv, false) }, 'Decline')));

  const sentRow = (inv) => h('div', { class: 'hm-row' },
    personLine(inv.other, { size: 44, extra: h('p', { class: 'hm-muted' }, `Sent ${fmtWhen(inv.createdAt)} · waiting`) }),
    h('button', { class: 'hm-btn hm-btn--small hm-btn--ghost', onclick: () => device.run(() => device.client.act('cancelInvitation', { id: inv.id }, ['invitations']), { ok: 'Invitation withdrawn.' }) }, 'Withdraw'));

  const earlierRow = (inv) => h('div', { class: 'hm-row hm-row--quiet' },
    personLine(inv.other, { size: 36, extra: h('p', { class: 'hm-muted' }, `${inv.direction === 'sent' ? 'You invited' : 'Invited you'} · ${CLOSED_COPY[inv.status] || inv.status}`) }),
    inv.status === 'accepted' && inv.conversationId ? h('button', { class: 'hm-btn hm-btn--small', onclick: () => device.go('hushspace', { id: inv.conversationId }) }, 'Open') : null);

  const el = h('div', { class: 'hm-col' },
    header(device, { title: 'Invitations' }),
    body(
      section('Waiting for you', received.length ? received.map(receivedCard) : h('p', { class: 'hm-muted' }, 'No invitations right now.')),
      section('You sent', sent.length ? sent.map(sentRow) : h('p', { class: 'hm-muted' }, 'Nothing waiting.')),
      earlier.length ? section('Earlier', earlier.map(earlierRow)) : null,
      h('p', { class: 'hm-hint' }, 'Invitations expire after 7 days. After a decline, the other person can’t ask again for a while.')));
  return { el, live: true };
}

export function hushmates(device) {
  const s = device.state;
  const me = s.me;
  const open = s.hushmates.filter((x) => x.open);
  const closed = s.hushmates.filter((x) => !x.open);
  const row = (c) => {
    const st = c.other.status && c.other.status !== 'available' ? statusOf(c.other.status).label : null;
    const theirIntent = intentOf(c.intent.theirs);
    const line = !c.open ? 'Hushspace closed' : st || (theirIntent ? `Prefers: ${theirIntent.label}` : 'Private Hushspace');
    return h('button', { class: `hm-row hm-row--btn ${c.open ? '' : 'hm-row--quiet'}`, onclick: () => device.go('hushspace', { id: c.id }), dataset: { test: `hushmate-${c.other.pseudonym}` } },
      personLine(c.other, { size: 52, extra: h('p', { class: 'hm-muted' }, line) }),
      c.unread && c.open ? h('span', { class: `hm-badge ${c.muted ? 'hm-badge--muted' : ''}`, 'aria-label': `${c.unread} unread` }, String(c.unread)) : h('span', { class: 'hm-tile__chev' }, icon('chevron')));
  };
  const el = h('div', { class: 'hm-col' },
    header(device, { title: 'My Hushmates', sub: `${open.length} of ${me.limits.maxActiveHushmates}` }),
    body(
      open.length ? h('div', { class: 'hm-list' }, open.map(row)) : empty({
        title: 'No Hushmates yet.',
        text: 'When you and someone else both say yes, your private Hushspace appears here.',
        action: h('button', { class: 'hm-btn hm-btn--primary', onclick: () => device.go('find') }, 'Find a Hushmate'),
      }),
      h('p', { class: 'hm-hint' }, 'A small circle on purpose. There’s no obligation to reply, ever, and you can step back whenever you need.'),
      closed.length ? section('Closed Hushspaces', h('div', { class: 'hm-list' }, closed.map(row))) : null));
  return { el, live: true };
}
