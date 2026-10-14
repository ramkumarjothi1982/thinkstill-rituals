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
  const calls = [{ id: 'emergency', label: `Call ${num} · Emergency`, href: `tel:${num}`, aria: `Call emergency services, ${num}`, primary: true }];
  const line = region === 'US' || region === 'CA' ? SUPPORT_LINES.find((l) => l.id === '988')
    : region === 'GB' || region === 'IE' ? SUPPORT_LINES.find((l) => l.id === 'samaritans') : null;
  if (line) calls.push({ id: line.id, label: `Call ${line.show} · ${line.id === '988' ? 'Crisis line' : line.name}`, href: `tel:${line.tel}`, aria: line.id === '988' ? 'Call the 988 Suicide & Crisis Lifeline' : `Call ${line.name}, ${line.show}` });
  else calls.push({ id: 'findahelpline', label: 'Find a crisis line near you', href: 'https://findahelpline.com', aria: 'Find A Helpline: crisis lines in your country (opens a new tab)', external: true });
  return calls;
}

// what someone did or is doing to them: Find A Helpline, which lists domestic-abuse services, comes first
// ('unsafe' is not one of them: the main screen's grief reading uses it for a wish to follow someone who died)
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
    { id: 'findahelpline', label: 'Find a domestic-abuse service near you', href: 'https://findahelpline.com', aria: 'Find A Helpline: domestic-abuse services in your country (opens a new tab)', external: true, primary: true },
    { id: 'emergency', label: `Call ${num} · If you’re in danger now`, href: `tel:${num}`, aria: `Call emergency services, ${num}` },
  ];
}
/** The cards in the order they show: for the abuse family, Find A Helpline first, saying plainly what it lists. */
export function supportLines(category = null) {
  if (!abuseFirst(category)) return SUPPORT_LINES.slice();
  const find = SUPPORT_LINES.find((l) => l.id === 'findahelpline');
  return [{ ...find, how: 'findahelpline.com lists domestic-abuse services in your country, and other free, confidential helplines.' },
    ...SUPPORT_LINES.filter((l) => l !== find)];
}

export function openSupport(app, { urgent = false, category } = {}) {
  // something urgent gets the attentive face, never the heart-eyed comforting one
  app.world?.setStage?.(urgent ? 'concerned' : 'comforting');
  // (the visit's own reading when the caller names none: the Support pill, the Tell's Support chip)
  const cat = category !== undefined ? category : (app?.state?.hfSafety?.category ?? null);
  const region = hereRegion();
  const emergency = emergencyNumber(region);
  const lines = supportLines(urgent ? null : cat);
  const callBtn = (c) => h('a', { class: `btn block support-call${c.primary ? ' primary' : ''}`, href: c.href, 'aria-label': c.aria, 'data-call': c.id,
    ...(c.external ? { target: '_blank', rel: 'noopener' } : {}) }, c.label);
  const card = (l) => h('div', { class: 'card', style: { padding: '14px', marginTop: '10px', boxShadow: 'none' } },
    h('div', { class: 'eyebrow' }, l.where),
    h('h3', { style: { marginTop: '6px' } }, l.name),
    h('p', {}, l.how),
    l.id === 'emergency' ? h('a', { class: 'btn', style: { marginTop: '10px', textDecoration: 'none' }, href: `tel:${emergency}`, 'aria-label': `Call emergency services, ${emergency}` }, `Call ${emergency}`) : null,
    l.tel ? h('a', { class: 'btn primary', style: { marginTop: '10px', textDecoration: 'none' }, href: `tel:${l.tel}` }, `Call ${l.tel}`) : null,
    l.url ? h('a', { class: 'btn', style: { marginTop: '10px', textDecoration: 'none' }, href: l.url, target: '_blank', rel: 'noopener' }, 'Open') : null);
  const note = h('p', { style: type('label', { marginTop: '16px', color: 'var(--text-2)' }) }, `${brandName} is a wellbeing app, not a medical or crisis service. The Mallows care, but they can’t replace people who can be there with you.`);
  const body = urgent
    ? h('div', {},
      h('p', { style: type('body', { margin: '0 0 12px', color: 'var(--text-1)' }) }, 'What you wrote sounds really heavy. You deserve a real person with you right now.'),
      // the calls first, whole, above "I’m safe — continue" (the sheet's body scrolls; these never need it)
      h('div', { class: 'support-calls', role: 'group', 'aria-label': 'Call now' }, ...urgentCalls(region).map(callBtn)),
      h('p', { style: type('body', { margin: '14px 0 0', color: 'var(--text-2)' }) }, 'If you might act on thoughts of hurting yourself, please call now. These lines are free and confidential.'),
      ...lines.map(card), note)
    : h('div', {},
      h('p', { style: type('body', { margin: '0 0 12px', color: 'var(--text-1)' }) }, abuseFirst(cat)
        ? 'What’s happening isn’t your fault, and you don’t have to handle it alone. These are free and confidential.'
        : 'If things feel like too much, talking to a real person can help. These are free and confidential.'),
      // (after abuse, violence or threats: the first actions whole, above the fold, as the urgent sheet's calls are — the
      // cards, with what each line is, follow)
      abuseFirst(cat) ? h('div', { class: 'support-calls', role: 'group', 'aria-label': 'Get help' }, ...abuseActions(region).map(callBtn)) : null,
      ...lines.map(card), note);
  return openSheet({ title: urgent ? 'You’re not alone in this' : 'Support', body, label: 'Support lines',
    foot: h('button', { class: 'btn block', onclick: (e) => e.currentTarget.closest('.sheet').querySelector('.icon-btn').click() }, urgent ? 'I’m safe — continue' : 'Close') });
}
