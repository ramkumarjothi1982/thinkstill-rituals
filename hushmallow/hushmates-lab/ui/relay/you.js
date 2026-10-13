// YOU & SAFETY: who you are here (a pseudonym, never perfectly anonymous),
// your choices (catching, return notices, your Mallow, sound), what keeps
// Hushmates gentle, support if you're not okay, and your data (download,
// delete). The pilot is adults only, by invitation.

import { h, icon } from '../dom.js';
import { sentenceSwitch } from '../kit.js';
import { face } from '../mallow.js';
import { MALLOWS, ORDER } from '../mallows-data.js';
import { soundOn, setSound } from '../sound.js';
import { HARM_COPY } from '../../../src/ultra/frameworks.js';
import { top, supportBody } from './common.js';

export function you(dev) {
  const c = dev.client;
  const me = dev.state.me;
  const p = me.profile;
  const pref = (patch, ok) => dev.run(() => c.act('savePreferences', patch, ['me']), { ok }).then((r) => !!r);
  const mallows = h('div', { class: 'rl-mallow-pick', role: 'radiogroup', 'aria-label': 'Your Mallow' },
    ORDER.map((id) => h('button', {
      type: 'button', role: 'radio', class: 'rl-mallow-opt', 'aria-checked': String(p.mallow === id), 'aria-label': `${MALLOWS[id].name}, ${MALLOWS[id].title.toLowerCase()}`, dataset: { test: `mallow-${id}` },
      onclick: async (e) => {
        const btn = e.currentTarget;
        if (await pref({ mallow: id }, `${MALLOWS[id].name} will carry your feelings now.`)) mallows.querySelectorAll('.rl-mallow-opt').forEach((b) => b.setAttribute('aria-checked', String(b === btn)));
      },
    }, face(id, { size: 46 }), h('span', {}, MALLOWS[id].name))));

  const el = h('div', { class: 'hm-scene rl-scene rl-you' },
    h('div', { class: 'rl-head-slot' }, top(dev, { title: 'You & safety', back: true })),
    h('div', { class: 'hm-scroll rl-you-scroll' },
      h('section', { class: 'rl-you-id' },
        face(p.mallow, { size: 72, float: true }),
        h('div', {},
          h('p', { class: 'kit-name' }, p.pseudonym, ' ', me.test ? h('span', { class: 'kit-testtag', title: 'A simulated account used for testing the prototype' }, 'Test identity') : null),
          h('p', { class: 'kit-note' }, 'Others never see this name. Your feelings and perspectives travel with no name at all.'))),
      h('div', { class: 'rl-card' },
        h('div', { class: 'rl-card-head' }, icon('eyeOff'), h('h3', {}, 'Pseudonymous, not perfectly anonymous')),
        h('p', {}, 'Nobody you meet here learns who you are, and nobody can contact you. But words can give people away: leave out names, places and details, and remember our safety team can see reported content.')),

      h('section', { class: 'kit-section' },
        h('p', { class: 'kit-label' }, 'Your choices'),
        sentenceSwitch({ label: 'Let feelings find me', hint: 'Catch other people’s feelings when you choose to look. Always voluntary.', checked: p.catching, test: 'pref-catching', onChange: (on) => pref({ catching: on }) }),
        sentenceSwitch({ label: 'Tell me when a feeling comes home', hint: 'A gentle notice. Never about other people’s activity.', checked: p.notifyReturn !== false, test: 'pref-notify', onChange: (on) => pref({ notifyReturn: on }) }),
        sentenceSwitch({ label: 'Soft sounds', hint: 'Delicate sounds for releasing, catching and returning. On this device only.', checked: soundOn(), test: 'pref-sound', onChange: (on) => { setSound(on); return true; } })),

      h('section', { class: 'kit-section' },
        h('p', { class: 'kit-label' }, 'The Mallow who carries your feelings'),
        mallows),

      h('section', { class: 'kit-section' },
        h('p', { class: 'kit-label' }, 'How Hushmates stays gentle'),
        h('ul', { class: 'rl-standards' },
          h('li', {}, h('strong', {}, 'A possibility, not a verdict.'), ' Perspectives offer another way of seeing, never a diagnosis, judgement or order.'),
          h('li', {}, h('strong', {}, 'Five different people at most.'), ' Never the author, one each, and never shown to the same person twice.'),
          h('li', {}, h('strong', {}, 'Mallow perspectives are labelled.'), ' They’re AI-generated (only if you allow it), never presented as a person, and never counted as one.'),
          h('li', {}, h('strong', {}, 'Rules first, people behind them.'), ' Words are screened for safety and personal details, and every report goes to a person on our safety team.'),
          h('li', {}, h('strong', {}, 'No scoreboards, no streaks.'), ' Nothing here counts how popular you are.'))),

      h('section', { class: 'kit-section' },
        h('p', { class: 'kit-label' }, 'If you’re not okay'),
        h('button', { type: 'button', class: 'rl-choice', dataset: { test: 'open-support' }, onclick: () => dev.sheet({ title: 'You deserve support', body: supportBody({ message: 'Hushmates isn’t an emergency service. If you might be in danger, or you’re not safe, please reach out now.', resources: HARM_COPY.crisis.resources, stillHere: HARM_COPY.stillHere }) }) },
          icon('help'), h('span', {}, h('strong', {}, 'Get support now'), h('small', {}, 'Crisis lines and what to do if you’re not safe')))),

      h('section', { class: 'kit-section' },
        h('p', { class: 'kit-label' }, 'Your data'),
        h('button', { type: 'button', class: 'rl-choice', dataset: { test: 'export-data' }, onclick: () => exportData() },
          icon('download'), h('span', {}, h('strong', {}, 'Download my data'), h('small', {}, 'Your feelings, what came back, and what you gave'))),
        h('button', { type: 'button', class: 'rl-choice', dataset: { test: 'my-gifts-you' }, onclick: () => dev.go('catch', {}, { replace: true }) },
          icon('heart'), h('span', {}, h('strong', {}, 'Perspectives I’ve offered'), h('small', {}, 'In Catch, under “Perspectives you’ve offered”'))),
        h('button', { type: 'button', class: 'rl-choice rl-choice--danger', dataset: { test: 'delete-data' }, onclick: () => deleteAll() },
          icon('trash'), h('span', {}, h('strong', {}, 'Delete my Hushmates data'), h('small', {}, 'Every feeling, and every perspective you gave')))),

      h('p', { class: 'rl-pilot', dataset: { test: 'pilot-note' } }, icon('key'),
        h('span', {}, 'Hushmates is an invitation-only pilot for adults (18+). In this lab every account is a simulated test identity; nothing here reaches real people.'))));

  async function exportData() {
    const data = await dev.run(() => c.api('exportMyData'));
    if (!data) return;
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    const a = h('a', { href: url, download: 'my-hushmates-data.json' });
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    dev.toast('Downloaded to this device.');
  }
  async function deleteAll() {
    const ok = await dev.confirm({ title: 'Delete your Hushmates data?', text: 'Every feeling you released and every perspective you gave is deleted, and you’re signed out of Hushmates. This can’t be undone.', confirmLabel: 'Delete everything', danger: true });
    if (!ok) return;
    const r = await dev.run(() => c.api('deleteMyData', { confirm: 'DELETE' }));
    if (r) { dev.history = []; dev.go('deleted', {}, { replace: true }); }
  }
  return { el, mood: 'calm' };
}

export function deleted() {
  const el = h('div', { class: 'hm-scene rl-scene rl-deleted', dataset: { test: 'deleted' } },
    h('div', { class: 'rl-hero rl-hero--middle' },
      face('noomi', { size: 110, float: true }),
      h('h1', { class: 'kit-title kit-title--md', 'data-autofocus': '' }, 'Your Hushmates data is deleted.'),
      h('p', { class: 'kit-lede rl-hero-lede' }, 'Thank you for the feelings you shared and the perspectives you gave. Take gentle care.')));
  return { el, mood: 'calm', quiet: true };
}
