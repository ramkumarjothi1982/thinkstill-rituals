// YOUR DATA: what Hushmates keeps for you, told simply, and a file to take
// with you. The service builds the file (exportMyData, format v1) from an
// allow-list, so it holds only what is yours. The screen never shows it as
// code: people read a few warm sentences, and the file goes to their device.

import { h, icon } from '../dom.js';
import { MALLOWS } from '../mallows-data.js';
import { top } from './common.js';
import { room, stage, Speech, line, put } from './parts.js';

const day = (iso) => (iso ? new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' }) : '');
const count = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const join = (parts) => parts.filter(Boolean).join(' · ');

export function yourData(dev) {
  const c = dev.client;
  const p = dev.state.me.profile;
  const r = room(p.mallow, 'hf-data', { seed: 7 });
  const st = stage(p.mallow, { size: 's', label: `${MALLOWS[p.mallow]?.name || 'Your Mallow'}, keeping your things safe` });
  const speech = new Speech(p.mallow);
  put(st.above, speech.el);
  let file = null;

  const summary = h('ul', { class: 'hf-data-list', dataset: { test: 'data-summary' }, 'aria-busy': 'true' }, h('li', { class: 'hf-note' }, 'Gathering it gently…'));
  const download = h('button', { type: 'button', class: 'kit-btn kit-btn--ink kit-btn--block', disabled: true, dataset: { test: 'download-data' }, onclick: () => save() }, icon('download'), 'Download my data');
  const copy = h('button', { type: 'button', class: 'hf-link hf-link--centre', hidden: true, dataset: { test: 'copy-data' }, onclick: () => copyIt() }, 'Didn’t arrive? Copy it instead');

  const head = h('div', { class: 'hf-head' }, top(dev, { title: 'Your data', back: true }));
  const body = h('div', { class: 'hf-scroll hf-data-scroll', dataset: { test: 'your-data' } },
    st.el,
    h('div', { class: 'hf-copy' },
      line('What Hushmates keeps for you', { cls: 'hf-line--sm' }),
      h('p', { class: 'hf-sub' }, 'Only you can see this. Other Hushmates appear only as “A Hushmate”, never by name.')),
    summary,
    h('div', { class: 'hf-data-take' },
      download,
      h('p', { class: 'hf-hint' }, 'A file for your device, in a standard format other apps can open. It holds your words, the perspectives that came back to you (never who wrote them), your choices and when you made them.'),
      copy));
  r.el.append(head, body);

  const row = (ic, title, sub, test) => h('li', { class: 'hf-data-row', dataset: { test } }, icon(ic), h('span', {}, h('strong', {}, title), sub ? h('small', {}, sub) : null));

  function render(f) {
    const feelings = f.feelings;
    const by = (s) => feelings.filter((x) => x.status === s).length;
    const back = feelings.reduce((n, x) => n + x.perspectivesFromHushmates.length, 0);
    const kept = feelings.reduce((n, x) => n + x.perspectivesFromHushmates.filter((y) => y.yourChoice === 'kept').length, 0);
    const sealed = feelings.filter((x) => x.status === 'travelling').reduce((n, x) => n + x.peopleWhoOfferedAPerspective, 0);
    const mallows = feelings.filter((x) => x.mallowPerspective).length;
    const shareable = f.perspectivesYouOffered.filter((x) => x.mayAppearInSharePictures).length;
    const agreedMallow = feelings.filter((x) => x.agreedToAMallowPerspectiveAt).length;
    const mallowName = MALLOWS[f.you.mallow]?.name || 'your Mallow';
    put(summary,
      row('heart', f.you.name, join([`Carried by ${mallowName}`, f.you.joinedAt ? `here since ${day(f.you.joinedAt)}` : null]), 'data-you'),
      row('orb', feelings.length ? count(feelings.length, 'feeling you released', 'feelings you released') : 'No feelings released yet',
        feelings.length ? join([by('travelling') && `${by('travelling')} travelling`, by('came home') && `${by('came home')} came home`, by('let go') && `${by('let go')} let go`]) : 'When you release one, it’s kept here for you.', 'data-feelings'),
      row('home', back ? count(back, 'perspective came back to you', 'perspectives came back to you') : 'No perspectives back yet',
        join([back && `${kept} kept`, sealed && `${count(sealed, 'more is', 'more are')} sealed until ${sealed === 1 ? 'its' : 'their'} feeling comes home`]) || 'They’re revealed when a feeling comes home.', 'data-back'),
      mallows ? row('star', count(mallows, 'Mallow perspective'), 'Automatically generated, only because you allowed it', 'data-mallow') : null,
      row('sparkle', f.perspectivesYouOffered.length ? count(f.perspectivesYouOffered.length, 'perspective you offered', 'perspectives you offered') : 'No perspectives offered yet',
        join([f.feelingsThatFoundYou && `${count(f.feelingsThatFoundYou, 'feeling', 'feelings')} found you`, f.perspectivesYouOffered.length && (shareable ? `${shareable} may appear in share pictures` : 'none appear in share pictures')]) || 'Catch a feeling, and what you offer is kept here.', 'data-offered'),
      feelings.length ? row('check', 'When you agreed', `You agreed to share ${feelings.length === 1 ? 'your feeling' : `each of your ${feelings.length} feelings`} without your name${agreedMallow ? `, and to a Mallow perspective on ${agreedMallow === 1 ? 'one' : agreedMallow}` : ''}. The dates are in your file.`, 'data-consent') : null,
      f.reportsYouMade.length || f.peopleYouBlocked ? row('shield', join([f.reportsYouMade.length && count(f.reportsYouMade.length, 'report you made', 'reports you made'), f.peopleYouBlocked && count(f.peopleYouBlocked, 'person you blocked', 'people you blocked')]),
        'Your file holds your own reasons, never who anyone is.', 'data-safety') : null,
      row('eyeOff', 'Your choices', join([`Let feelings find me: ${f.you.letFeelingsFindYou ? 'on' : 'off'}`, `Gentle notices: ${f.you.gentleNotices ? 'on' : 'off'}`]), 'data-choices'));
    summary.removeAttribute('aria-busy');
    download.disabled = false;
  }

  async function load() {
    const f = await c.api('exportMyData').catch(() => null);
    if (!f) {
      put(summary, h('li', { class: 'hf-data-retry' }, h('p', { class: 'hf-note' }, 'Couldn’t gather it just now.'),
        h('button', { type: 'button', class: 'kit-btn kit-btn--ghost kit-btn--sm', dataset: { test: 'data-retry' }, onclick: () => { put(summary, h('li', { class: 'hf-note' }, 'Gathering it gently…')); load(); } }, 'Try again')));
      summary.removeAttribute('aria-busy');
      return;
    }
    file = f;
    render(f);
    speech.say('Everything here is yours.');
  }

  const fileName = (f) => `hushmates-my-data-${(f.exportedAt || '').slice(0, 10) || 'today'}.json`;
  const text = (f) => JSON.stringify(f, null, 2);
  async function save() {
    const fresh = await c.api('exportMyData').catch(() => null);   // the file is made at the moment you ask for it
    if (fresh) { file = fresh; render(fresh); }
    if (!file) { dev.toast('Couldn’t gather it just now. Please try again in a moment.', { tone: 'warn' }); return; }
    try {
      const url = URL.createObjectURL(new Blob([text(file)], { type: 'application/json' }));
      const a = h('a', { href: url, download: fileName(file), hidden: true });
      document.body.append(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60e3);
      speech.say('It’s on its way to your device.');
      dev.toast('Your Hushmates file is in your downloads.', { ms: 4200 });
      copy.hidden = false;                                        // some browsers quietly block downloads: offer another way
    } catch {
      copyIt();
    }
  }
  async function copyIt() {
    if (!file) return;
    try {
      await navigator.clipboard.writeText(text(file));
      dev.toast('Copied. Paste it wherever you keep things safe.', { ms: 3600 });
    } catch {
      dev.toast('This browser wouldn’t let us copy it. Please try Download again from another browser.', { tone: 'warn', ms: 4200 });
    }
  }

  load();
  return { el: r.el, mood: 'calm', destroy() { st.destroy(); } };
}
