import { h, icon, avatar, toggle } from '../dom.js';
import { header, body, section } from './common.js';
import { STATUSES } from '../../core/config.js';

export function boundaries(device) {
  const s = device.state;
  const p = s.me.profile;
  const save = (patch, ok) => device.run(() => device.client.act('saveProfile', patch, ['me']), { ok });

  const statusGroup = h('div', { class: 'hm-options', role: 'radiogroup', 'aria-label': 'Availability' },
    STATUSES.map((st) => h('button', { type: 'button', role: 'radio', class: 'hm-option', 'aria-checked': String(p.status === st.id), onclick: () => save({ status: st.id }, `${st.label}.`) },
      h('span', { class: `hm-dot hm-dot--${st.id}`, 'aria-hidden': 'true' }), h('span', { class: 'hm-option__text' }, h('b', {}, st.label), h('span', {}, st.line)))));

  const download = async () => {
    const data = await device.run(() => device.client.api('exportMyData'));
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = h('a', { href: URL.createObjectURL(blob), download: `hushmates-${p.pseudonym}.json` });
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    device.toast('Your data is downloading.');
  };
  const del = async () => {
    const ok = await device.confirm({
      title: 'Delete your Hushmates identity?',
      text: 'Your Mallow identity, invitations and Hushspaces close, and the words you sent are cleared for everyone. Reports you or others made are kept for safety, as the privacy notice explains. This can’t be undone.',
      confirmLabel: 'Delete everything', danger: true,
    });
    if (!ok) return;
    const r = await device.run(() => device.client.api('deleteMyIdentity', { confirm: 'DELETE' }));
    if (r) { device.history = []; device.go('deleted', {}, { replace: true }); }
  };

  const el = h('div', { class: 'hm-col' },
    header(device, { title: 'Boundaries & privacy' }),
    body(
      section('Your availability', h('p', { class: 'hm-hint' }, 'Shown to your Hushmates only. Never worked out from your activity, and there’s no “last seen”.'), statusGroup),
      section('Who can reach you',
        toggle({ id: `${device.name}-b-accept`, label: 'Accept Hushmate invitations', hint: 'Turn off to pause. Nobody is told why.', checked: p.acceptingInvites, onChange: (v) => save({ acceptingInvites: v }, v ? 'Invitations open.' : 'Invitations paused.') }),
        toggle({ id: `${device.name}-b-disc`, label: 'Show my card in Find a Hushmate', hint: 'Off by default. Turn off to disappear from Find straight away.', checked: p.discoverable, onChange: (v) => save({ discoverable: v }, v ? 'Your card is visible in Find.' : 'You’re hidden from Find.') })),
      section('Your private invitation code',
        h('p', { class: 'hm-hint' }, 'Share it only with someone you already know. It lets them invite you even while you’re hidden from Find.'),
        h('div', { class: 'hm-code' }, h('code', { dataset: { test: 'invite-code' } }, p.inviteCode),
          h('button', { class: 'hm-btn hm-btn--small', onclick: () => device.run(() => device.client.act('regenerateInviteCode', {}, ['me']), { ok: 'New code made. The old one no longer works.' }) }, icon('refresh'), 'New code'))),
      section('Blocked',
        s.blocked.length ? h('div', { class: 'hm-list' }, s.blocked.map((b) => h('div', { class: 'hm-row' },
          h('div', { class: 'hm-person' }, avatar(b.avatar, { size: 40, label: '' }), h('div', { class: 'hm-person__text' }, h('div', { class: 'hm-person__name' }, b.pseudonym), h('p', { class: 'hm-muted' }, 'Can’t message, invite or find you'))),
          h('button', { class: 'hm-btn hm-btn--small hm-btn--ghost', onclick: async () => {
            const ok = await device.confirm({ title: `Unblock ${b.pseudonym}?`, text: 'Nothing reopens. They still can’t reach out first; only an invitation from you would let them.', confirmLabel: 'Unblock' });
            if (ok) device.run(() => device.client.act('unblock', { handle: b.handle }, ['blocked']), { ok: 'Unblocked.' });
          } }, 'Unblock'))))
          : h('p', { class: 'hm-muted' }, 'Nobody. Blocking is always one tap away inside a Hushspace.')),
      section('How your messages are protected',
        h('ul', { class: 'hm-facts' },
          h('li', {}, 'Only you and your Hushmate can read your Hushspace. There are no public profiles, posts or conversation links.'),
          h('li', {}, 'In the full version messages travel over HTTPS and are encrypted at rest by our database provider. They are ', h('b', {}, 'not end-to-end encrypted'), ', so that a reported message can be checked by a trained person on our safety team. Nobody browses conversations.'),
          h('li', {}, 'No AI reads, scores or summarises your messages. Nothing is used for advertising or analytics.'),
          h('li', {}, 'Screenshots can’t be prevented by any app. Share only what you’re comfortable with.'),
          h('li', {}, h('b', {}, 'In this prototype'), ' everything stays inside this browser tab; no server is involved.'))),
      section('Your data',
        h('div', { class: 'hm-stack' },
          h('button', { class: 'hm-btn', onclick: download }, icon('download'), 'Download my Hushmates data'),
          h('button', { class: 'hm-btn hm-btn--danger-ghost', onclick: del }, icon('trash'), 'Delete my Hushmates identity')))));
  return { el, live: true };
}

export function safety(device) {
  const el = h('div', { class: 'hm-col' },
    header(device, { title: 'Safety & help' }),
    body(
      h('div', { class: 'hm-callout hm-callout--care' }, icon('heart'),
        h('div', {}, h('p', {}, h('b', {}, 'If you or someone else is in immediate danger, contact your local emergency number now'), ' (for example 911 in the US and Canada, 999 or 112 in the UK, 112 across the EU, 000 in Australia, 112 in India).'),
          h('p', {}, 'Hushmates are peers, not crisis responders or clinicians, and Hushmallow doesn’t monitor conversations in real time. ',
            h('a', { href: 'https://findahelpline.com', target: '_blank', rel: 'noopener noreferrer' }, 'Find a Helpline'), ' lists free, confidential support lines in many countries.'))),
      section('What Hushmates is',
        h('p', { class: 'hm-p' }, 'A small, private place where two real people who both said yes can talk. No feeds, no followers, no AI, and no obligation to reply. It doesn’t replace professional support, and it can’t promise to fix loneliness; it’s simply a kind conversation, when you want one.')),
      section('Community standards',
        h('ul', { class: 'hm-facts' },
          h('li', {}, 'Be kind. No harassment, bullying, hate or threats.'),
          h('li', {}, 'Adults only. No sexual content, and never anything involving anyone under 18.'),
          h('li', {}, 'No grooming, exploitation or manipulation of any kind.'),
          h('li', {}, 'Never ask for money, gifts, payment details or favours.'),
          h('li', {}, 'Don’t push anyone to share contact details or move to another app.'),
          h('li', {}, 'Respect “no”, quiet mode, breaks and goodbyes. Nobody owes anyone a reply.'))),
      section('Reporting and what happens next',
        h('ul', { class: 'hm-facts' },
          h('li', {}, 'Report a message or a whole Hushspace from its menu. You can block at the same time.'),
          h('li', {}, 'People on our safety team read reports, not automated systems. During the pilot we aim to review priority reports within 24 hours and others within 48 hours.'),
          h('li', {}, 'The person you report isn’t told who reported them. Actions range from a warning to suspension or removal, and there’s an appeal route.'),
          h('li', {}, 'Our team can only see what’s been reported. They can’t browse conversations.'))),
      section('Your controls',
        h('ul', { class: 'hm-facts' },
          h('li', {}, 'Quiet mode, taking a break and pausing invitations are always free and always available.'),
          h('li', {}, 'Step back from a Hushmate without explaining. They can’t invite you again for 30 days.'),
          h('li', {}, 'Block anyone, any time. Blocking, reporting and privacy controls will never be paid features.'))),
      h('p', { class: 'hm-hint' }, 'This pilot is invitation-only for adults. Age is not yet independently verified; access is controlled by invitation while age assurance is designed.')));
  return { el };
}

export function deleted(device) {
  const el = h('div', { class: 'hm-col hm-center-col' },
    body(h('div', { class: 'hm-empty' },
      h('p', { class: 'hm-empty__title', 'data-autofocus': '' }, 'Your Hushmates identity is deleted.'),
      h('p', { class: 'hm-p hm-muted' }, `Take good care. In this lab, use “Reset demo” to start again.`))));
  return { el };
}

