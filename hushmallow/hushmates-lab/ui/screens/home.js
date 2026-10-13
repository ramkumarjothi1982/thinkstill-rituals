import { h, icon, avatar, testTag, statusPill, toggle } from '../dom.js';
import { body, labFoot } from './common.js';
import { STATUSES } from '../../core/config.js';

export function statusSheet(device) {
  const me = device.state.me;
  const p = me.profile;
  const list = h('div', { class: 'hm-options', role: 'radiogroup', 'aria-label': 'Your availability' },
    STATUSES.map((s) => h('button', { type: 'button', role: 'radio', class: 'hm-option', 'aria-checked': String(p.status === s.id), dataset: { test: `status-${s.id}` },
      onclick: async () => {
        await device.run(() => device.client.act('saveProfile', { status: s.id }, ['me']), { ok: s.id === 'break' ? 'Taking a break. Come back whenever you like.' : `${s.label}.` });
        device.closeSheet();
      } },
    h('span', { class: `hm-dot hm-dot--${s.id}`, 'aria-hidden': 'true' }), h('span', { class: 'hm-option__text' }, h('b', {}, s.label), h('span', {}, s.line)))));
  device.sheet({
    title: 'How are you showing up?',
    body: [h('p', { class: 'hm-p hm-muted' }, 'Your Hushmates see this. It’s your choice, never worked out from your activity.'), list,
      toggle({ id: `${device.name}-pause-inv`, label: 'Pause new invitations', hint: 'Existing Hushmates are unaffected.', checked: !p.acceptingInvites,
        onChange: (v) => device.run(() => device.client.act('saveProfile', { acceptingInvites: !v }, ['me']), { ok: v ? 'Invitations paused.' : 'Invitations open again.' }) })],
  });
}

export function home(device) {
  const s = device.state;
  const me = s.me;
  const p = me.profile;
  const unread = s.hushmates.filter((x) => x.open && !x.muted).reduce((n, x) => n + x.unread, 0);
  const received = s.invitations.filter((i) => i.direction === 'received' && i.status === 'pending').length;
  const active = s.hushmates.filter((x) => x.open).length;
  const tile = (name, ic, title, sub, badge, test) => h('button', { class: `hm-tile hm-tile--${name}`, onclick: () => device.go(name), dataset: { test } },
    h('span', { class: 'hm-tile__icon' }, icon(ic)),
    h('span', { class: 'hm-tile__text' }, h('b', {}, title), h('span', {}, sub)),
    badge ? h('span', { class: 'hm-badge', 'aria-label': `${badge} new` }, String(badge)) : h('span', { class: 'hm-tile__chev' }, icon('chevron')));

  const el = h('div', { class: 'hm-col' },
    h('header', { class: 'hm-home-head' },
      h('button', { class: 'hm-me', onclick: () => device.go('identity'), 'aria-label': `Your identity: ${p.pseudonym}. Edit`, dataset: { test: 'me' } },
        avatar(p.avatar, { size: 48, label: '' }),
        h('span', { class: 'hm-me__text' }, h('span', { class: 'hm-me__name' }, p.pseudonym), me.test ? testTag() : null)),
      h('button', { class: 'hm-status-btn', onclick: () => statusSheet(device), 'aria-label': 'Change your availability', dataset: { test: 'status' } }, statusPill(p.status, { mine: true }))),
    body(
      h('div', { class: 'hm-home-hero' },
        h('p', { class: 'hm-eyebrow' }, 'Hushmates'),
        h('h1', { class: 'hm-display', 'data-autofocus': '' }, active ? 'Your small, private circle.' : 'A real person. A private connection.'),
        h('p', { class: 'hm-lede' }, 'Your Mallow is there for the moments you need softness. Your Hushmate is there when you want a real conversation.')),
      me.accountState !== 'active' ? h('div', { class: 'hm-callout hm-callout--warn' }, icon('shield'), h('p', {}, 'Your account is limited while our safety team reviews something. You can still read, export or delete your data.')) : null,
      h('nav', { class: 'hm-tiles', 'aria-label': 'Hushmates' },
        tile('find', 'search', 'Find a Hushmate', 'Mallows who chose to be found', 0, 'go-find'),
        tile('hushmates', 'people', 'My Hushmates', `${active} of ${me.limits.maxActiveHushmates}${unread ? ` · ${unread} new` : ''}`, unread, 'go-hushmates'),
        tile('invitations', 'mail', 'Invitations', received ? `${received} waiting for you` : 'Sent and received', received, 'go-invitations'),
        tile('boundaries', 'shield', 'Boundaries & privacy', 'Availability, blocking, your data', 0, 'go-boundaries'),
        tile('safety', 'help', 'Safety & help', 'Reporting, standards, support', 0, 'go-safety')),
      labFoot()));
  return { el, live: true };
}
