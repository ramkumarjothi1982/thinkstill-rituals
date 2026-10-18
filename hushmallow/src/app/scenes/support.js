// Support — always free, always one tap away. hushmallow is not a crisis
// service; this points people to real humans.
//
// The urgent sheet (crisis words) leads with its calls: the emergency number
// and a crisis line are tel: links above the fold on the smallest phone and at
// the largest text size, ahead of "I’m safe — continue". After abuse, violence
// or threats the sheet leads the same way: Find A Helpline (in Australia,
// 1800RESPECT), then the emergency number (abuseActions). Only the numbers this
// file already lists are ever dialled; the region (the time zone, else the
// language) only chooses which of them comes first.
import { h, openSheet } from '../ui.js';
import { brandName } from '../../brand.js';
import { type } from '../../ui/type.js';

// (16 Oct 2026, Australia: the launch market) the Australian lines are the national services' published numbers; `region`
// marks a line that moves up, right after the emergency card, for a phone in that region (supportLines) — every line still
// shows everywhere. `more`: a line's other ways in (Lifeline's text and chat, for someone who can't talk out loud), on its card.
export const SUPPORT_LINES = [
  { id: 'emergency', where: 'Anywhere', name: 'Emergency services', how: 'Call your local emergency number (e.g. 999, 911, 112, 000)' },
  { id: 'findahelpline', where: 'Worldwide', name: 'Find A Helpline', how: 'findahelpline.com — free, confidential lines in your country', url: 'https://findahelpline.com' },
  { id: 'samaritans', where: 'UK & Ireland', name: 'Samaritans', how: 'Call 116 123, any time', tel: '116123', show: '116 123' },
  { id: '988', where: 'US', name: '988 Suicide & Crisis Lifeline', how: 'Call or text 988', tel: '988', show: '988' },
  { id: 'lifeline', where: 'Australia', region: 'AU', name: 'Lifeline', how: 'Call 13 11 14, any time, day or night. You can also text 0477 13 11 14, or chat online.', tel: '131114', show: '13 11 14',
    more: [
      { id: 'lifeline-text', label: 'Text 0477 13 11 14', href: 'sms:0477131114', aria: 'Text 0477 13 11 14 · Lifeline (0 4 7 7 1 3 1 1 1 4)' },
      { id: 'lifeline-chat', label: 'Chat online', href: 'https://www.lifeline.org.au/crisis-chat/', aria: 'Chat online · Lifeline crisis chat (opens a new tab)', external: true },
    ] },
  { id: 'suicide-call-back', where: 'Australia', region: 'AU', name: 'Suicide Call Back Service', how: 'Call 1300 659 467, any time', tel: '1300659467', show: '1300 659 467' },
  { id: '13yarn', where: 'Australia', region: 'AU', name: '13YARN', how: 'Call 13 92 76, any time — crisis support by and for Aboriginal and Torres Strait Islander people', tel: '139276', show: '13 92 76' },
  { id: 'beyond-blue', where: 'Australia', region: 'AU', name: 'Beyond Blue', how: 'Call 1300 22 4636, any time, to talk things through with a counsellor', tel: '1300224636', show: '1300 22 4636' },
  { id: 'kids-helpline', where: 'Australia', region: 'AU', name: 'Kids Helpline', how: 'Call 1800 55 1800, any time — for young people aged 5 to 25', tel: '1800551800', show: '1800 55 1800' },
  { id: '1800respect', where: 'Australia', region: 'AU', abuse: true, name: '1800RESPECT', how: 'Call 1800 737 732, any time, about family, domestic or sexual violence', tel: '1800737732', show: '1800 737 732' },
];

// (only the emergency numbers the Emergency services card already names: 999, 911, 112, 000)
const EMERGENCY_BY_REGION = { GB: '999', US: '911', CA: '911', IE: '112', AU: '000' };
const TZ_REGION = { 'Europe/London': 'GB', 'Europe/Belfast': 'GB', 'Europe/Guernsey': 'GB', 'Europe/Jersey': 'GB', 'Europe/Isle_of_Man': 'GB', GB: 'GB', 'GB-Eire': 'GB', 'Europe/Dublin': 'IE', Eire: 'IE' };
const US_TZ = /^(?:America\/(?:New_York|Chicago|Denver|Los_Angeles|Phoenix|Anchorage|Juneau|Sitka|Nome|Yakutat|Metlakatla|Adak|Boise|Detroit|Menominee|Indianapolis|Louisville|Fort_Wayne|Knox_IN|Shiprock|Indiana\/[\w-]+|Kentucky\/[\w-]+|North_Dakota\/[\w-]+)|Pacific\/Honolulu|US\/[\w-]+|EST5EDT|CST6CDT|MST7MDT|PST8PDT)$/;
const CA_TZ = /^(?:America\/(?:Toronto|Montreal|Vancouver|Edmonton|Winnipeg|Halifax|St_Johns|Regina|Moncton|Glace_Bay|Goose_Bay|Whitehorse|Dawson|Dawson_Creek|Yellowknife|Iqaluit|Rankin_Inlet|Resolute|Cambridge_Bay|Swift_Current|Creston|Fort_Nelson|Atikokan|Blanc-Sablon|Inuvik|Nipigon|Thunder_Bay|Rainy_River|Pangnirtung)|Canada\/[\w-]+)$/;
// every Australian zone and its old names (Sydney, Lord_Howe, Eucla, ACT, NSW, Yancowinna, LHI…), and Macquarie Island's
const AU_TZ = /^(?:Australia\/[\w-]+|Antarctica\/Macquarie)$/;
const NO_PLACE_TZ = /^(?:UTC|GMT|Etc\/.*|Universal|Zulu|Factory)?$/;

/**
 * Where the person probably is, to order the lines (never to hide one): 'GB' | 'IE' | 'US' | 'CA' | 'AU' | null.
 * The time zone says more than the language (en-US is many phones' default anywhere), so the language's
 * region is read only when the time zone names no place (UTC).
 */
export function supportRegion({ timeZone = null, languages = [] } = {}) {
  const tz = timeZone || '';
  if (!NO_PLACE_TZ.test(tz)) {
    if (TZ_REGION[tz]) return TZ_REGION[tz];
    if (US_TZ.test(tz)) return 'US';
    if (CA_TZ.test(tz)) return 'CA';
    if (AU_TZ.test(tz)) return 'AU';
    return null;
  }
  for (const l of languages || []) {
    const m = /^[a-z]{2,3}[-_]([A-Za-z]{2})(?![A-Za-z])/.exec(String(l));
    if (!m) continue;
    const r = m[1].toUpperCase() === 'UK' ? 'GB' : m[1].toUpperCase();
    return r in EMERGENCY_BY_REGION ? r : null;
  }
  return null;
}
function hereRegion() {
  let timeZone = null, languages = [];
  try { timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || null; } catch { /* no Intl */ }
  try { languages = navigator.languages?.length ? [...navigator.languages] : [navigator.language].filter(Boolean); } catch { /* no navigator */ }
  return supportRegion({ timeZone, languages });
}
/** The emergency number for a region: 999, 911, 112 or 000 (112 also reaches emergency services from most mobiles abroad). */
export const emergencyNumber = (region) => EMERGENCY_BY_REGION[region] || '112';

/**
 * The actions the urgent sheet leads with, in order: the emergency number, then the region's crisis line
 * (988 in the US and Canada, Samaritans in the UK and Ireland, Lifeline in Australia). Elsewhere none of them
 * is a local call, so the second action is Find A Helpline, which lists the crisis lines in the person's country.
 * Each: { id, label, href, aria, primary?, external? }.
 */
export function urgentCalls(region) {
  const num = emergencyNumber(region);
  return [emergencyCall(num, { primary: true }), crisisLineCall(region)];
}
/**
 * (fix round) Every call's accessible name starts with the words on it (WCAG 2.5.3: "Call 911 · Emergency" is named "Call
 * 911 · Emergency services"), so a person who says what they see reaches it; a number read out a digit at a time follows.
 */
const digits = (n) => String(n).replace(/\D/g, '').split('').join(' ');
const emergencyCall = (num, { primary = false, label = `Call ${num} · Emergency`, aria = `Call ${num} · Emergency services` } = {}) =>
  ({ id: 'emergency', label, href: `tel:${num}`, aria, ...(primary ? { primary: true } : {}) });
/** A listed line's call: "Call 116 123 · Samaritans", named the same, then the number a digit at a time. */
const lineCall = (line, p) => ({ id: line.id, label: `Call ${line.show} · ${line.name}`, href: `tel:${line.tel}`, aria: `Call ${line.show} · ${line.name} (${digits(line.tel)})`, ...p });
const lineById = (id) => SUPPORT_LINES.find((l) => l.id === id);
/** The region's crisis line (988 in the US and Canada, Samaritans in the UK and Ireland, Lifeline in Australia), else Find A Helpline. */
function crisisLineCall(region, { primary = false } = {}) {
  const line = region === 'US' || region === 'CA' ? lineById('988')
    : region === 'GB' || region === 'IE' ? lineById('samaritans') : region === 'AU' ? lineById('lifeline') : null;
  const p = primary ? { primary: true } : {};
  if (line?.id === '988') return { id: '988', label: 'Call 988 · Crisis line', href: 'tel:988', aria: 'Call 988 · Crisis line, the 988 Suicide & Crisis Lifeline', ...p };
  if (line) return lineCall(line, p);
  return { id: 'findahelpline', label: 'Find a crisis line near you', href: 'https://findahelpline.com', aria: 'Find a crisis line near you · Find A Helpline (opens a new tab)', external: true, ...p };
}
/**
 * (fix round) The calls the support sheet leads with after the check-in's "Not really" (or "I'm not okay"), or the self
 * ending read by meaning: above the fold on the smallest phone at the largest text size, as the urgent sheet's are — the
 * region's crisis line first (someone to talk to), then the emergency number. Only numbers this file already lists.
 */
export function supportCalls(region) {
  return [crisisLineCall(region, { primary: true }), emergencyCall(emergencyNumber(region))];
}

// what someone did or is doing to them: Find A Helpline, which lists domestic-abuse services, comes first
// ('death-follow' and 'suicide-loss', the grief readings' care, are not one of them either)
const ABUSE_CATEGORIES = new Set(['abuse', 'violence', 'threat']);
export const abuseFirst = (category) => ABUSE_CATEGORIES.has(category);
/**
 * The actions the support sheet leads with after someone tells what is being done to them (the abuse family), above the
 * fold on the smallest phone at the largest text size, as the urgent sheet's calls are: Find A Helpline first (it lists
 * domestic-abuse services in the person's country; in Australia the national line for family, domestic or sexual violence,
 * 1800RESPECT, is a call instead), then the emergency number, for danger now. Only numbers this file already lists: the
 * emergency number the Emergency services card names (999, 911, 112, 000).
 */
export function abuseActions(region) {
  const num = emergencyNumber(region);
  const own = SUPPORT_LINES.find((l) => l.abuse && region && l.region === region);
  return [
    own ? lineCall(own, { primary: true })
      : { id: 'findahelpline', label: 'Find a domestic-abuse service near you', href: 'https://findahelpline.com', aria: 'Find a domestic-abuse service near you · Find A Helpline (opens a new tab)', external: true, primary: true },
    emergencyCall(num, { label: `Call ${num} · If you’re in danger now`, aria: `Call ${num} · If you’re in danger now, emergency services` }),
  ];
}
/**
 * The cards in the order they show. The region's own lines (Australia's) come right after the emergency card; elsewhere they
 * follow the rest, so the GB, IE, US and CA order is as it was. For the abuse family, Find A Helpline first, saying plainly
 * what it lists (in Australia after 1800RESPECT). Every line, every time: nothing is ever left out.
 */
export function supportLines(category = null, region = null) {
  const own = region ? SUPPORT_LINES.filter((l) => l.region === region) : [];
  const lines = own.length ? [SUPPORT_LINES[0], ...own, ...SUPPORT_LINES.slice(1).filter((l) => !own.includes(l))] : SUPPORT_LINES.slice();
  if (!abuseFirst(category)) return lines;
  const find = lines.find((l) => l.id === 'findahelpline');
  const lead = own.filter((l) => l.abuse);
  return [...lead, { ...find, how: 'findahelpline.com lists domestic-abuse services in your country, and other free, confidential helplines.' },
    ...lines.filter((l) => l !== find && !lead.includes(l))];
}

// (fix round) after the check-in's "Not really" (or "I'm not okay" at the question), or the self ending read by meaning or a wish
// to follow someone who died: the sheet leads with its calls (supportCalls), above the fold at 320 × 568, largest text
const CALLS_FIRST = new Set(['check-in', 'self-risk', 'death-follow']);
export const callsFirst = (category) => CALLS_FIRST.has(category);

/**
 * openSupport(app, { urgent, category, focus, beside, returnFocus }) → the sheet's handle (ui.js openSheet).
 *   urgent: crisis words — the calls first, whole, then "I'm safe — continue"; a tap in its first 700 ms is ignored (a finger
 *     on its way to Send never lands on a call). beside: the Tell overlay the person is typing in — the sheet opens below it
 *     with its calls first, the keyboard focus stays in the words (focus: false) until the sheet's focusIn() (Send).
 */
export function openSupport(app, { urgent = false, category, focus = true, beside = null, returnFocus = null } = {}) {
  // something urgent gets the attentive face, never the heart-eyed comforting one
  app.world?.setStage?.(urgent ? 'concerned' : 'comforting');
  // (the visit's own reading when the caller names none: the Support pill, the Tell's Support chip)
  const cat = category !== undefined ? category : (app?.state?.hfSafety?.category ?? null);
  const region = hereRegion();
  const emergency = emergencyNumber(region);
  const lines = supportLines(urgent ? null : cat, region);
  const callBtn = (c) => h('a', { class: `btn block support-call${c.primary ? ' primary' : ''}`, href: c.href, 'aria-label': c.aria, 'data-call': c.id,
    ...(c.external ? { target: '_blank', rel: 'noopener' } : {}) }, c.label);
  // (each card's call: named for what it says first, then who answers; a number read a digit at a time)
  const cardCall = (l) => (l.id === 'emergency' ? { label: `Call ${emergency}`, href: `tel:${emergency}`, aria: `Call ${emergency} · Emergency services`, cls: 'btn' }
    : l.tel ? { label: `Call ${l.show || l.tel}`, href: `tel:${l.tel}`, aria: `Call ${l.show || l.tel} · ${l.name}${/\s/.test(l.show || '') ? ` (${digits(l.tel)})` : ''}`, cls: 'btn primary' }
      : l.url ? { label: 'Open', href: l.url, aria: `Open · ${l.name} (opens a new tab)`, cls: 'btn', external: true } : null);
  const card = (l) => {
    const c = cardCall(l);
    return h('div', { class: 'card', style: { padding: '14px', marginTop: '10px', boxShadow: 'none' } },
      h('div', { class: 'eyebrow' }, l.where),
      h('h3', { style: { marginTop: '6px' } }, l.name),
      h('p', {}, l.how),
      c ? h('a', { class: c.cls, style: { marginTop: '10px', textDecoration: 'none' }, href: c.href, 'aria-label': c.aria, ...(c.external ? { target: '_blank', rel: 'noopener' } : {}) }, c.label) : null,
      // (the line's other ways in, each named for what it says first: Lifeline's text and chat)
      l.more ? h('div', { class: 'support-more' }, ...l.more.map((m) => h('a', { class: 'btn', href: m.href, 'aria-label': m.aria, 'data-call': m.id,
        ...(m.external ? { target: '_blank', rel: 'noopener' } : {}) }, m.label))) : null);
  };
  const note = h('p', { style: type('label', { marginTop: '16px', color: 'var(--text-2)' }) }, `${brandName} is a wellbeing app, not a medical or crisis service. The Mallows care, but they can’t replace people who can be there with you.`);
  const heavy = (after = false) => h('p', { style: type('body', { margin: after ? '14px 0 0' : '0 0 12px', color: 'var(--text-1)' }) }, 'What you wrote sounds really heavy. You deserve a real person with you right now.');
  const body = urgent
    ? h('div', {},
      // (opened below the words while the person types: the calls lead, so the shorter sheet still shows them whole)
      beside ? null : heavy(),
      // the calls first, whole, above "I’m safe — continue" (the sheet's body scrolls; these never need it)
      h('div', { class: 'support-calls', role: 'group', 'aria-label': 'Call now' }, ...urgentCalls(region).map(callBtn)),
      beside ? heavy(true) : null,
      h('p', { style: type('body', { margin: '14px 0 0', color: 'var(--text-2)' }) }, 'If you might act on thoughts of hurting yourself, please call now. These lines are free and confidential.'),
      ...lines.map(card), note)
    : h('div', {},
      h('p', { style: type('body', { margin: '0 0 12px', color: 'var(--text-1)' }) }, abuseFirst(cat)
        ? 'What’s happening isn’t your fault, and you don’t have to handle it alone. These are free and confidential.'
        : 'If things feel like too much, talking to a real person can help. These are free and confidential.'),
      // (after the check-in's "Not really", or the self ending read by meaning: the calls first, whole, above the fold)
      callsFirst(cat) ? h('div', { class: 'support-calls', role: 'group', 'aria-label': 'Call someone now' }, ...supportCalls(region).map(callBtn)) : null,
      // (after abuse, violence or threats: the first actions whole, above the fold, as the urgent sheet's calls are — the
      // cards, with what each line is, follow)
      abuseFirst(cat) ? h('div', { class: 'support-calls', role: 'group', 'aria-label': 'Get help' }, ...abuseActions(region).map(callBtn)) : null,
      ...lines.map(card), note);
  return openSheet({ title: urgent ? 'You’re not alone in this' : 'Support', body, label: 'Support lines', focus: !!focus && !beside, beside, returnFocus,
    // (a tap in the urgent sheet's first 700 ms is a finger that was on its way to something else: ignored, keys still work)
    guardMs: urgent ? URGENT_GUARD_MS : 0,
    foot: h('button', { class: 'btn block', onclick: (e) => e.currentTarget.closest('.sheet').querySelector('.icon-btn').click() }, urgent ? 'I’m safe — continue' : 'Close') });
}
/** How long the urgent sheet ignores taps after it appears (a finger on its way to Send). */
export const URGENT_GUARD_MS = 700;
