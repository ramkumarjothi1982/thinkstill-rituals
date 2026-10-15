// Support — always free, always one tap away. hushmallow is not a crisis
// service; this points people to real humans.
//
// The urgent sheet (crisis words) leads with its calls: the emergency number
// and a crisis line are tel: links above the fold on the smallest phone and at
// the largest text size, ahead of "I’m safe — continue". After abuse, violence
// or threats the sheet leads the same way: Find A Helpline, then the emergency
// number (abuseActions). Only the numbers this file already lists are ever
// dialled; the region (the time zone, else the language) only chooses which of
// them comes first.
import { h, openSheet } from '../ui.js';
import { brandName } from '../../brand.js';
import { type } from '../../ui/type.js';

export const SUPPORT_LINES = [
  { id: 'emergency', where: 'Anywhere', name: 'Emergency services', how: 'Call your local emergency number (e.g. 999, 911, 112)' },
  { id: 'findahelpline', where: 'Worldwide', name: 'Find A Helpline', how: 'findahelpline.com — free, confidential lines in your country', url: 'https://findahelpline.com' },
  { id: 'samaritans', where: 'UK & Ireland', name: 'Samaritans', how: 'Call 116 123, any time', tel: '116123', show: '116 123' },
  { id: '988', where: 'US', name: '988 Suicide & Crisis Lifeline', how: 'Call or text 988', tel: '988', show: '988' },
];

// (only the emergency numbers the Emergency services card already names: 999, 911, 112)
const EMERGENCY_BY_REGION = { GB: '999', US: '911', CA: '911', IE: '112' };
const TZ_REGION = { 'Europe/London': 'GB', 'Europe/Belfast': 'GB', 'Europe/Guernsey': 'GB', 'Europe/Jersey': 'GB', 'Europe/Isle_of_Man': 'GB', GB: 'GB', 'GB-Eire': 'GB', 'Europe/Dublin': 'IE', Eire: 'IE' };
const US_TZ = /^(?:America\/(?:New_York|Chicago|Denver|Los_Angeles|Phoenix|Anchorage|Juneau|Sitka|Nome|Yakutat|Metlakatla|Adak|Boise|Detroit|Menominee|Indianapolis|Louisville|Fort_Wayne|Knox_IN|Shiprock|Indiana\/[\w-]+|Kentucky\/[\w-]+|North_Dakota\/[\w-]+)|Pacific\/Honolulu|US\/[\w-]+|EST5EDT|CST6CDT|MST7MDT|PST8PDT)$/;
const CA_TZ = /^(?:America\/(?:Toronto|Montreal|Vancouver|Edmonton|Winnipeg|Halifax|St_Johns|Regina|Moncton|Glace_Bay|Goose_Bay|Whitehorse|Dawson|Dawson_Creek|Yellowknife|Iqaluit|Rankin_Inlet|Resolute|Cambridge_Bay|Swift_Current|Creston|Fort_Nelson|Atikokan|Blanc-Sablon|Inuvik|Nipigon|Thunder_Bay|Rainy_River|Pangnirtung)|Canada\/[\w-]+)$/;
const NO_PLACE_TZ = /^(?:UTC|GMT|Etc\/.*|Universal|Zulu|Factory)?$/;

/**
 * Where the person probably is, to order the lines (never to hide one): 'GB' | 'IE' | 'US' | 'CA' | null.
 * The time zone says more than the language (en-US is many phones' default anywhere), so the language's
 * region is read only when the time zone names no place (UTC).
 */
export function supportRegion({ timeZone = null, languages = [] } = {}) {
  const tz = timeZone || '';
  if (!NO_PLACE_TZ.test(tz)) {
    if (TZ_REGION[tz]) return TZ_REGION[tz];
    if (US_TZ.test(tz)) return 'US';
    if (CA_TZ.test(tz)) return 'CA';
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
/** The emergency number for a region: 999, 911 or 112 (112 also reaches emergency services from most mobiles abroad). */
export const emergencyNumber = (region) => EMERGENCY_BY_REGION[region] || '112';

/**
 * The actions the urgent sheet leads with, in order: the emergency number, then the region's crisis line
 * (988 in the US and Canada, Samaritans in the UK and Ireland). Elsewhere neither line is a local call, so
 * the second action is Find A Helpline, which lists the crisis lines in the person's country.
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
/** The region's crisis line (988 in the US and Canada, Samaritans in the UK and Ireland), else Find A Helpline. */
function crisisLineCall(region, { primary = false } = {}) {
  const line = region === 'US' || region === 'CA' ? SUPPORT_LINES.find((l) => l.id === '988')
    : region === 'GB' || region === 'IE' ? SUPPORT_LINES.find((l) => l.id === 'samaritans') : null;
  const p = primary ? { primary: true } : {};
  if (line?.id === '988') return { id: '988', label: 'Call 988 · Crisis line', href: 'tel:988', aria: 'Call 988 · Crisis line, the 988 Suicide & Crisis Lifeline', ...p };
  if (line) return { id: line.id, label: `Call ${line.show} · ${line.name}`, href: `tel:${line.tel}`, aria: `Call ${line.show} · ${line.name} (${digits(line.tel)})`, ...p };
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
 * domestic-abuse services in the person's country), then the emergency number, for danger now. Only numbers this file
 * already lists: the emergency number the Emergency services card names (999, 911, 112).
 */
export function abuseActions(region) {
  const num = emergencyNumber(region);
  return [
    { id: 'findahelpline', label: 'Find a domestic-abuse service near you', href: 'https://findahelpline.com', aria: 'Find a domestic-abuse service near you · Find A Helpline (opens a new tab)', external: true, primary: true },
    emergencyCall(num, { label: `Call ${num} · If you’re in danger now`, aria: `Call ${num} · If you’re in danger now, emergency services` }),
  ];
}
/** The cards in the order they show: for the abuse family, Find A Helpline first, saying plainly what it lists. */
export function supportLines(category = null) {
  if (!abuseFirst(category)) return SUPPORT_LINES.slice();
  const find = SUPPORT_LINES.find((l) => l.id === 'findahelpline');
  return [{ ...find, how: 'findahelpline.com lists domestic-abuse services in your country, and other free, confidential helplines.' },
    ...SUPPORT_LINES.filter((l) => l !== find)];
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
  const lines = supportLines(urgent ? null : cat);
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
      c ? h('a', { class: c.cls, style: { marginTop: '10px', textDecoration: 'none' }, href: c.href, 'aria-label': c.aria, ...(c.external ? { target: '_blank', rel: 'noopener' } : {}) }, c.label) : null);
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
