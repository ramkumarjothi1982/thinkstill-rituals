// YOU & SAFETY: who you are here (a pseudonym, never perfectly anonymous),
// your choices (catching, return notices, your Mallow, sound), the
// perspectives you've offered and whether they may appear in share pictures,
// what keeps Hushmates gentle, support if you're not okay, and your data
// (download, delete). The pilot is adults only, by invitation.

import { h, icon, fmtAgo } from '../dom.js';
import { sentenceSwitch } from '../kit.js';
import { face } from '../mallow.js';
import { MALLOWS, ORDER } from '../mallows-data.js';
import { soundOn, setSound } from '../sound.js';
import { HARM_COPY } from '../../../src/ultra/frameworks.js';
import { top, supportBody } from './common.js';
import { room, stage, Speech, put, privacySheet } from './parts.js';

export function you(dev) {
  const c = dev.client;
  const me = dev.state.me;
  const p = me.profile;
  const lab = !!dev.env?.lab;
  const pref = (patch, ok) => dev.run(() => c.act('savePreferences', patch, ['me']), { ok }).then((res) => !!res);

  const r = room(p.mallow, 'hf-you', { seed: 6 });
  const st = stage(p.mallow, { size: 's' });
  const speech = new Speech(p.mallow);
  put(st.above, speech.el);
  speech.say('Nobody here can see who you are.');

  const mallows = h('div', { class: 'hf-mallow-pick', role: 'radiogroup', 'aria-label': 'Your Mallow' },
    ORDER.map((id) => h('button', {
      type: 'button', role: 'radio', class: 'hf-mallow-opt', 'aria-checked': String(p.mallow === id), 'aria-label': `${MALLOWS[id].name}, ${MALLOWS[id].title.toLowerCase()}`, dataset: { test: `mallow-${id}` },
      onclick: async (e) => {
        const btn = e.currentTarget;
        if (await pref({ mallow: id }, `${MALLOWS[id].name} will carry your feelings now.`)) mallows.querySelectorAll('.hf-mallow-opt').forEach((b) => b.setAttribute('aria-checked', String(b === btn)));
      },
    }, face(id, { size: 44 }), h('span', {}, MALLOWS[id].name))));

  const row = (test, ic, title, sub, onclick, cls = '') => h('button', { type: 'button', class: `hf-choice ${cls}`, dataset: { test }, onclick }, icon(ic), h('span', {}, h('strong', {}, title), sub ? h('small', {}, sub) : null));
  const section = (label, ...kids) => h('section', { class: 'hf-you-sec' }, h('p', { class: 'kit-label' }, label), ...kids);
  const promise = (ic, title, text) => h('li', { class: 'hf-promise' }, icon(ic), h('span', {}, h('strong', {}, title), ' ', text));
  const gifts = h('div', { class: 'hf-gifts', dataset: { test: 'gifts' } }, h('p', { class: 'hf-note' }, 'Loading…'));

  const head = h('div', { class: 'hf-head' }, top(dev, { title: 'You & safety', back: true }));
  const body = h('div', { class: 'hf-scroll hf-you-scroll' },
    h('section', { class: 'hf-you-id' },
      st.el,
      h('p', { class: 'hf-you-name' }, p.pseudonym, lab && me.test ? h('span', { class: 'hf-lab-tag', title: 'A simulated account used for testing the prototype' }, 'Lab · test identity') : null),
      h('p', { class: 'hf-sub' }, 'Others never see this name. Your feelings and perspectives travel with no name at all.'),
      h('p', { class: 'hf-note hf-you-anon' }, h('strong', {}, 'Pseudonymous, not perfectly anonymous. '), 'Words can give people away, so leave out names, places and details. Our safety team can see reported words.'),
      h('button', { type: 'button', class: 'hf-link hf-link--centre', dataset: { test: 'privacy-link' }, onclick: () => privacySheet(dev) }, 'Privacy details')),

    section('Your choices',
      sentenceSwitch({ label: 'Let feelings find me', hint: 'Catch other people’s feelings when you choose to look. Always voluntary.', checked: p.catching, test: 'pref-catching', onChange: (on) => pref({ catching: on }) }),
      sentenceSwitch({ label: 'Tell me when a feeling comes home', hint: 'A gentle notice. Never about other people’s activity.', checked: p.notifyReturn !== false, test: 'pref-notify', onChange: (on) => pref({ notifyReturn: on }) }),
      sentenceSwitch({ label: 'Soft sounds', hint: 'Delicate sounds for releasing, catching and returning. On this device only.', checked: soundOn(), test: 'pref-sound', onChange: (on) => { setSound(on); return true; } })),

    section('The Mallow who carries your feelings', mallows),

    section('Perspectives you’ve offered', gifts),

    section('How Hushmates stays gentle',
      h('ul', { class: 'hf-promises' },
        promise('sparkle', 'A possibility, not a verdict.', 'Perspectives offer another way of seeing, never a diagnosis, judgement or order.'),
        promise('heart', 'Five different people at most.', 'Never the author, one each, and never shown to the same person twice.'),
        promise('star', 'Mallow perspectives are labelled.', 'They’re automatically generated (only if you allow it), never presented as a person, and never counted as one.'),
        promise('shield', 'Rules first, people behind them.', 'Words are screened for safety and personal details, and every report goes to a person on our safety team.'),
        promise('eyeOff', 'No scoreboards, no streaks.', 'Nothing here counts how popular you are.'))),

    section('If you’re not okay',
      h('div', { class: 'hf-choices-list' },
        row('open-support', 'help', 'Get support now', 'Crisis lines and what to do if you’re not safe', () => dev.sheet({ title: 'You deserve support', body: supportBody({ message: 'Hushmates isn’t an emergency service. If you might be in danger, or you’re not safe, please reach out now.', resources: HARM_COPY.crisis.resources, stillHere: HARM_COPY.stillHere }, { lab }) })))),

    section('Your data',
      h('div', { class: 'hf-choices-list' },
        row('export-data', 'download', 'Download my data', 'Your feelings, what came back, what you gave, and when you agreed', () => exportData()),
        row('delete-data', 'trash', 'Delete my Hushmates data', 'Every feeling, and every perspective you gave', () => deleteAll(), 'hf-choice--danger'))),

    h('p', { class: 'hf-hint', dataset: { test: 'pilot-note' } }, 'Hushmates is an invitation-only pilot for adults (18+).',
      lab ? h('span', { class: 'hf-lab-tag hf-lab-tag--block' }, 'Lab: every account here is a simulated test identity; nothing reaches real people.') : null));
  r.el.append(head, body);

  async function loadGifts() {
    const res = await c.api('myGifts').catch(() => null);
    if (!res) { put(gifts, h('p', { class: 'hf-note' }, 'Couldn’t load them just now.')); return; }
    if (!res.gifts.length) { put(gifts, h('p', { class: 'hf-note' }, 'When you offer a perspective on someone’s feeling, it appears here. Only you can see this list.')); return; }
    put(gifts,
      h('p', { class: 'hf-note' }, 'Only you can see these. You decide whether the person whose feeling you caught may include your words in a share picture; they never learn who you are.'),
      res.gifts.map((g) => h('article', { class: 'hf-gift', dataset: { test: 'gift' } },
        h('p', { class: 'hf-gift-text' }, g.text),
        h('p', { class: 'hf-meta' }, g.journeyHome ? 'It has come home' : 'Still travelling', ' · ', fmtAgo(g.at, c.now())),
        sentenceSwitch({
          label: 'May appear in their share picture', checked: g.allowShare, test: `gift-share-${g.id}`,
          onChange: (on) => dev.run(() => c.act('setGiftSharing', { perspectiveId: g.id, allowShare: on }), { ok: on ? 'They may include your words.' : 'Your words won’t appear in share pictures.' }).then((x) => !!x),
        }))));
  }
  loadGifts();

  async function exportData() {
    const data = await dev.run(() => c.api('exportMyData'));
    if (!data) return;
    const text = JSON.stringify(data, null, 2);
    const pre = h('pre', { class: 'rl-export', tabindex: '0', dataset: { test: 'export-json' } }, text);
    const selectAll = () => { const rg = document.createRange(); rg.selectNodeContents(pre); const sel = getSelection(); sel.removeAllRanges(); sel.addRange(rg); dev.toast('Selected: copy it with your device’s copy command.'); };
    const copy = h('button', { type: 'button', class: 'kit-btn kit-btn--ink kit-btn--block', dataset: { test: 'export-copy' }, onclick: () => {
      navigator.clipboard?.writeText(text).then(() => dev.toast('Copied.'), () => selectAll()) ?? selectAll();
    } }, 'Copy my data');
    dev.sheet({
      title: 'Your Hushmates data',
      body: h('div', { class: 'kit-stack' }, h('p', { class: 'hm-sheet-text' }, 'Your feelings and what came back, the perspectives you gave, and when you agreed to share. Other people never appear in it.'), pre),
      actions: [copy, h('button', { type: 'button', class: 'kit-btn kit-btn--text kit-btn--block', onclick: () => dev.closeSheet() }, 'Close')],
    });
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
  r.el.append(h('div', { class: 'hf-scroll hf-deleted-scroll' },
    st.el,
    h('div', { class: 'hf-copy' },
      h('h1', { class: 'hf-line hf-line--sm', 'data-autofocus': '' }, 'Your Hushmates data is deleted.'),
      h('p', { class: 'hf-sub' }, 'Thank you for the feelings you shared and the perspectives you gave. Take gentle care.'))));
  return { el: r.el, mood: 'calm', quiet: true, destroy() { st.destroy(); } };
}
