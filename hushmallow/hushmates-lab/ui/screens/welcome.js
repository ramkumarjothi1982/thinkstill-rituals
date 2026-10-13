import { h, icon, avatar, chip, toggle } from '../dom.js';
import { livingMallow } from '../presence.js';
import { header, body, section } from './common.js';
import { AVATARS, AVATAR_NAMES, PSEUDONYM_SUGGESTIONS, INTERESTS, STYLES, LANGUAGES, AVAILABILITY, LIMITS } from '../../core/config.js';
import { checkPseudonym } from '../../core/text-policy.js';

export function welcome(device) {
  const mallow = livingMallow('noomi', { size: 168, label: 'Noomi, a Mallow, resting quietly', fit: 0.8 });
  const el = h('div', { class: 'hm-welcome' },
    h('div', { class: 'hm-welcome__glow', 'aria-hidden': 'true' }),
    h('div', { class: 'hm-welcome__mallow' }, mallow.el),
    h('p', { class: 'hm-eyebrow' }, 'Hushmallow · Hushmates'),
    h('h1', { class: 'hm-hero', 'data-autofocus': '' }, 'Find your Hushmate.'),
    h('p', { class: 'hm-lede' }, 'A real person. A private connection.'),
    h('ul', { class: 'hm-promises' },
      h('li', {}, icon('shield'), h('span', {}, h('b', {}, 'Only people you both choose can talk.'), ' Nobody can message you unless you’ve both said yes.')),
      h('li', {}, icon('eyeOff'), h('span', {}, h('b', {}, 'A Mallow and a pseudonym.'), ' No photos, no real names, no followers.')),
      h('li', {}, icon('sparkle'), h('span', {}, h('b', {}, 'No feeds, no AI.'), ' Every word comes from a real person. Just words. Just us.'))),
    h('p', { class: 'hm-note' }, 'Hushmates are peers who choose to talk, not counsellors or crisis support. You’re always free to take a break.'),
    h('div', { class: 'hm-stack' },
      h('button', { class: 'hm-btn hm-btn--primary hm-btn--block', onclick: () => device.go('identity', { first: true }), dataset: { test: 'create-identity' } }, 'Create my Mallow identity'),
      h('button', { class: 'hm-btn hm-btn--ghost hm-btn--block', onclick: () => device.go('safety') }, 'How privacy and safety work')),
    h('p', { class: 'hm-pilot' }, 'Adult-only pilot · by invitation'));
  return { el, destroy: () => mallow.destroy() };
}

export function identity(device, { first = false } = {}) {
  const profile = device.state.me?.profile;
  const start = profile || {};
  const key = device.name;
  const f = device.memory.identity ||= {
    pseudonym: start.pseudonym || PSEUDONYM_SUGGESTIONS.find((s) => s.toLowerCase().startsWith(key)) || PSEUDONYM_SUGGESTIONS[0],
    avatar: start.avatar || (key === 'moon' ? 'noomi' : 'blubi'),
    interests: start.interests ? [...start.interests] : [],
    style: start.style || 'gentle',
    language: start.language || 'English',
    availability: start.availability || 'evenings',
    acceptingInvites: start.acceptingInvites ?? true,
    discoverable: start.discoverable ?? false,
  };
  let suggestionIndex = 0;

  const preview = h('div', { class: 'hm-id-preview' });
  const drawPreview = () => preview.replaceChildren(avatar(f.avatar, { size: 96, label: `${AVATAR_NAMES[f.avatar]}, your Mallow` }),
    h('div', {}, h('p', { class: 'hm-id-preview__name' }, f.pseudonym || 'Your name'), h('p', { class: 'hm-muted' }, `with ${AVATAR_NAMES[f.avatar]}`)));
  drawPreview();

  const avatars = h('div', { class: 'hm-avatar-pick', role: 'radiogroup', 'aria-label': 'Choose your Mallow' },
    AVATARS.map((id) => {
      const b = h('button', { type: 'button', role: 'radio', class: 'hm-avatar-pick__item', 'aria-checked': String(f.avatar === id), 'aria-label': AVATAR_NAMES[id],
        onclick: () => { f.avatar = id; avatars.querySelectorAll('[role=radio]').forEach((x) => x.setAttribute('aria-checked', String(x === b))); drawPreview(); } },
      avatar(id, { size: 52, label: '' }), h('span', {}, AVATAR_NAMES[id]));
      return b;
    }));

  const nameErr = h('p', { class: 'hm-field-error', role: 'alert' });
  const nameInput = h('input', { class: 'hm-input', id: `${key}-pseudonym`, value: f.pseudonym, maxlength: 20, autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', dataset: { test: 'pseudonym' } });
  nameInput.addEventListener('input', () => { f.pseudonym = nameInput.value; nameErr.textContent = ''; drawPreview(); });
  const another = h('button', { type: 'button', class: 'hm-btn hm-btn--small', onclick: () => {
    suggestionIndex = (suggestionIndex + 1) % PSEUDONYM_SUGGESTIONS.length;
    f.pseudonym = PSEUDONYM_SUGGESTIONS[suggestionIndex]; nameInput.value = f.pseudonym; drawPreview();
  } }, 'Suggest one');

  const interestCount = h('span', { class: 'hm-count' });
  const interestChips = h('div', { class: 'hm-chips' });
  const drawInterests = () => {
    interestCount.textContent = `${f.interests.length} of ${LIMITS.maxInterests}`;
    interestChips.replaceChildren(...INTERESTS.map((x) => chip(x, f.interests.includes(x), () => {
      if (f.interests.includes(x)) f.interests = f.interests.filter((y) => y !== x);
      else if (f.interests.length < LIMITS.maxInterests) f.interests.push(x);
      else device.toast(`Up to ${LIMITS.maxInterests} interests.`);
      drawInterests();
    })));
  };
  drawInterests();

  const single = (list, prop) => {
    const wrap = h('div', { class: 'hm-chips' });
    const draw = () => wrap.replaceChildren(...list.map((x) => chip(x.label, f[prop] === x.id, () => { f[prop] = x.id; draw(); })));
    draw();
    return wrap;
  };
  const lang = h('select', { class: 'hm-input', id: `${key}-lang`, onchange: (e) => { f.language = e.target.value; } },
    LANGUAGES.map((l) => { const o = h('option', { value: l }, l); if (l === f.language) o.selected = true; return o; }));

  const save = h('button', { class: 'hm-btn hm-btn--primary hm-btn--block', dataset: { test: 'save-identity' }, onclick: async () => {
    const local = checkPseudonym(f.pseudonym);
    if (!local.ok) { nameErr.textContent = local.message; nameInput.focus(); return; }
    save.disabled = true;
    try {
      await device.client.act('saveProfile', { ...f }, ['me']);
      device.memory.identity = null;
      device.toast(first ? `Welcome, ${local.text}.` : 'Saved.');
      if (first) device.go('home', {}, { replace: true }); else device.back();
    } catch (e) {
      nameErr.textContent = e.message;
      save.disabled = false;
    }
  } }, first ? 'Create my identity' : 'Save changes');

  const el = h('div', { class: 'hm-col' },
    header(device, { title: first ? 'Your Mallow identity' : 'My Mallow identity', back: !first || device.history.length > 0 }),
    body(
      preview,
      h('div', { class: 'hm-callout' }, icon('eyeOff'), h('p', {}, 'Your Mallow is your picture here. Real names, e-mail, phone and location are never shown. A pseudonym isn’t perfect anonymity, though: what you write can still reveal who you are.')),
      section('Choose your Mallow', avatars),
      section('Your name here',
        h('label', { class: 'hm-label', for: `${key}-pseudonym` }, 'Pseudonym'),
        h('div', { class: 'hm-input-row' }, nameInput, another), nameErr,
        h('p', { class: 'hm-hint' }, 'Avoid your real name, birthday or anything that points to you.')),
      section(h('span', {}, 'Happy to talk about ', interestCount), interestChips),
      section('Conversation style', single(STYLES, 'style')),
      section('Language', h('label', { class: 'sr-only', for: `${key}-lang` }, 'Language'), lang),
      section('When you’re usually around', h('p', { class: 'hm-hint' }, 'A general idea only. Nobody sees when you’re online.'), single(AVAILABILITY, 'availability')),
      section('Who can reach you',
        toggle({ id: `${key}-accepting`, label: 'Accept Hushmate invitations', hint: 'Pause any time. Nobody is told why.', checked: f.acceptingInvites, onChange: (v) => { f.acceptingInvites = v; } }),
        toggle({ id: `${key}-discoverable`, label: 'Show my card in Find a Hushmate', hint: 'Off unless you turn it on. You can still invite others, or share a private code.', checked: f.discoverable, onChange: (v) => { f.discoverable = v; } })),
      h('div', { class: 'hm-sticky-foot' }, save)));
  return { el };
}
