// YOU & SAFETY: who you are here (a pseudonym, never perfectly anonymous),
// your choices (catching, return notices, your Mallow, sound), the
// perspectives you've offered and whether they may appear in share stories,
// what keeps Hushmates gentle, support if you're not okay, and your data
// (see it and download it, or delete it). The pilot is adults only, by invitation.

import { h, icon, fmtAgo } from '../dom.js';
import { sentenceSwitch } from '../kit.js';
import { face } from '../mallow.js';
import { MALLOWS, ORDER } from '../mallows-data.js';
import { soundOn, setSound } from '../sound.js';
import { top, openSupport, supportPill } from './common.js';
import { room, stage, Speech, put, privacySheet, hostNote } from './parts.js';

export function you(dev) {
  const c = dev.client;
  const me = dev.state.me;
  const p = me.profile;
  const pref = (patch, ok) => dev.run(() => c.act('savePreferences', patch, ['me']), { ok }).then((res) => !!res);

  const r = room(p.mallow, 'hf-you', { seed: 6 });
  const st = stage(p.mallow, { size: 's' });
  const speech = new Speech(p.mallow);
  put(st.above, speech.el);
  speech.say('Other Hushmates never see your name.');

  const mallows = h('div', { class: 'hf-mallow-pick', role: 'radiogroup', 'aria-label': 'Your Mallow' },
    ORDER.map((id) => h('button', {
      type: 'button', role: 'radio', class: 'hf-mallow-opt', 'aria-checked': String(p.mallow === id), 'aria-label': `${MALLOWS[id].name}, ${MALLOWS[id].title.toLowerCase()}`, dataset: { test: `mallow-${id}` },
      onclick: async (e) => {
        const btn = e.currentTarget;
        if (await pref({ mallow: id }, `${MALLOWS[id].name} will carry your feelings now.`)) mallows.querySelectorAll('.hf-mallow-opt').forEach((b) => b.setAttribute('aria-checked', String(b === btn)));
      },
    }, face(id, { size: 44 }), h('span', {}, MALLOWS[id].name))));

  const row = (test, ic, title, sub, onclick, cls = '') => h('button', { type: 'button', class: `hf-choice ${cls}`, dataset: { test }, onclick }, icon(ic), h('span', {}, h('strong', {}, title), sub ? h('small', {}, sub) : null));
  // section names are headings, so a screen reader can jump straight to "If you’re not okay"
  const section = (label, ...kids) => h('section', { class: 'hf-you-sec' }, h('h2', { class: 'kit-label' }, label), ...kids);
  const promise = (ic, title, ...text) => h('li', { class: 'hf-promise' }, icon(ic), h('span', {}, h('strong', {}, title), ' ', ...text));
  const gifts = h('div', { class: 'hf-gifts', dataset: { test: 'gifts' } }, h('p', { class: 'hf-note' }, 'Loading…'));

  const head = h('div', { class: 'hf-head' }, top(dev, { title: 'You & safety', back: true }));
  const body = h('div', { class: 'hf-scroll hf-you-scroll' },
    h('section', { class: 'hf-you-id' },
      st.el,
      h('h1', { class: 'hf-you-name', 'data-autofocus': '' }, p.pseudonym, hostNote(dev, 'account', { me })),
      h('p', { class: 'hf-sub' }, 'Others never see this name. Your feelings and perspectives travel with no name at all.'),
      h('p', { class: 'hf-note hf-you-anon' }, h('strong', {}, 'Pseudonymous, not perfectly anonymous. '), 'Words can give people away, so leave out names, places and details. Our safety team can see reported words.'),
      h('button', { type: 'button', class: 'hf-link hf-link--centre', dataset: { test: 'privacy-link' }, onclick: () => privacySheet(dev) }, 'Privacy details')),

    // first, so it is never below the fold or after a long list of choices (Tier 0)
    section('If you’re not okay',
      h('div', { class: 'hf-choices-list' },
        row('open-support', 'help', 'Get support now', 'Crisis lines, any time, and what to do if you’re not safe', () => openSupport(dev, { note: hostNote(dev, 'support') })))),

    section('Your choices',
      sentenceSwitch({ label: 'Let feelings find me', hint: 'Catch other people’s feelings when you choose to look. Always voluntary.', checked: p.catching, test: 'pref-catching', onChange: (on) => pref({ catching: on }) }),
      sentenceSwitch({ label: 'Gentle notices about my feelings', hint: 'While Hushmates is open: a quiet note when one comes home, or when your Mallow can offer another way to see one. Never about other people’s activity.', checked: p.notifyReturn !== false, test: 'pref-notify', onChange: (on) => pref({ notifyReturn: on }) }),
      sentenceSwitch({ label: 'Soft sounds', hint: 'Delicate sounds for releasing, catching and returning. On this device only.', checked: soundOn(), test: 'pref-sound', onChange: (on) => { setSound(on); return true; } })),

    section('The Mallow who carries your feelings', mallows),

    section('Perspectives you’ve offered', gifts),

    section('How Hushmates stays gentle',
      h('ul', { class: 'hf-promises' },
        promise('sparkle', 'A possibility, not a verdict.', 'Perspectives offer another way of seeing, never a diagnosis, judgement or order.'),
        promise('heart', 'Five different people at most.', 'Never the author, one each, and never shown to the same person twice.'),
        promise('star', 'Mallow perspectives are labelled.', 'They’re chosen automatically from lines the Hushmates team wrote (only if you allow it), never presented as a person, and never counted as one.'),
        promise('shield', 'Rules first, then people.', 'Words are checked for safety and personal details by rules that read English only and can miss things. Nobody on our team reads feelings as they travel, unless one is reported or an automatic check pauses it for a person to look at. When something is reported, a person on our small safety team reads it, usually within a day or two. They aren’t counsellors, and they can’t see who anyone is or contact anyone.'),
        promise('eyeOff', 'No scoreboards, no streaks.', 'Nothing here counts how popular you are.'))),

    section('Your data',
      h('div', { class: 'hf-choices-list' },
        row('open-data', 'download', 'Your data', 'See what Hushmates keeps for you, and download it', () => dev.go('data')),
        row('delete-data', 'trash', 'Delete my Hushmates data', 'Every feeling, and every perspective you gave', () => deleteAll(), 'hf-choice--danger'))),

    dev.env.signOut ? section('This device',
      h('div', { class: 'hf-choices-list' },
        row('sign-out', 'leave', 'Sign out', 'To come back, sign in with the same email', () => leave()))) : null,

    h('p', { class: 'hf-hint', dataset: { test: 'pilot-note' } }, 'Hushmates is an invitation-only pilot for adults (18+).', hostNote(dev, 'pilot')));
  r.el.append(head, body);

  async function loadGifts() {
    const res = await c.api('myGifts').catch(() => null);
    if (!res) { put(gifts, h('p', { class: 'hf-note' }, 'Couldn’t load them just now.')); return; }
    if (!res.gifts.length) { put(gifts, h('p', { class: 'hf-note' }, 'When you offer a perspective on someone’s feeling, it appears here. Only you can see this list.')); return; }
    put(gifts,
      h('p', { class: 'hf-note' }, 'Only you can see these. You decide whether the person whose feeling you caught may include your words in a share picture or video; they never learn who you are. A picture or video already made stays with them: it can’t be taken back.'),
      res.gifts.map((g) => h('article', { class: 'hf-gift', dataset: { test: 'gift' } },
        h('p', { class: 'hf-gift-text' }, g.text),
        h('p', { class: 'hf-meta' }, g.journeyHome ? 'It has come home' : 'Still travelling', ' · ', fmtAgo(g.at, c.now())),
        sentenceSwitch({
          label: 'May appear in their share picture or video', checked: g.allowShare, test: `gift-share-${g.id}`,
          onChange: (on) => dev.run(() => c.act('setGiftSharing', { perspectiveId: g.id, allowShare: on }), { ok: on ? 'They may include your words.' : 'Your words won’t appear in new share pictures or videos. Any already made can’t be taken back.' }).then((x) => !!x),
        }),
        h('button', { type: 'button', class: 'kit-btn kit-btn--text hf-gift-take', dataset: { test: `gift-withdraw-${g.id}` }, onclick: () => takeBack(g) }, 'Take it back'))));
  }
  async function takeBack(g) {
    const ok = await dev.confirm({ title: 'Take back this perspective?', text: 'Your words are removed for good, including from the collection of the person whose feeling you caught. A share picture or video they already made can’t be taken back. They aren’t told who you are.', confirmLabel: 'Take it back', danger: true });
    if (!ok) return;
    const res = await dev.run(() => c.act('withdrawPerspective', { perspectiveId: g.id }, ['gifts']), { ok: 'Taken back.' });
    if (res) loadGifts();
  }
  loadGifts();

  async function leave() {
    const ok = await dev.confirm({ title: 'Sign out of Hushmates?', text: 'Your feelings keep travelling while you’re away. To come back, sign in with the same email: everything will be here.', confirmLabel: 'Sign out' });
    if (ok) await dev.env.signOut();
  }
  async function deleteAll() {
    const ok = await dev.confirm({ title: 'Delete your Hushmates data?', text: 'Every feeling you released and every perspective you gave is deleted, and you’re signed out of Hushmates. This can’t be undone.', confirmLabel: 'Delete everything', danger: true });
    if (!ok) return;
    const res = await dev.run(() => c.api('deleteMyData', { confirm: 'DELETE' }));
    if (res) { dev.history = []; dev.go('deleted', {}, { replace: true }); }
  }
  return { el: r.el, mood: 'calm', destroy() { st.destroy(); } };
}

export function deleted(dev) {
  const r = room('noomi', 'hf-deleted', { seed: 9 });
  const st = stage('noomi', { size: 'm', label: 'Noomi, waving goodbye' });
  r.el.dataset.test = 'deleted';
  r.el.append(h('div', { class: 'hf-head' }, h('header', { class: 'rl-top' }, h('span', { class: 'rl-top-title' }), supportPill(dev))),
    h('div', { class: 'hf-scroll hf-deleted-scroll' },
    st.el,
    h('div', { class: 'hf-copy' },
      h('h1', { class: 'hf-line hf-line--sm', 'data-autofocus': '' }, 'Your Hushmates data is deleted.'),
      h('p', { class: 'hf-sub' }, 'Thank you for the feelings you shared and the perspectives you gave. Take gentle care.'))));
  return { el: r.el, mood: 'calm', quiet: true, destroy() { st.destroy(); } };
}
