// Australian crisis support and region detection (16 Oct 2026, launch blocker 1; Australia is the launch market).
// An Australian phone (every Australia/* zone and Macquarie Island, or an -AU language when the zone names no place) gets
// 000 and Lifeline first; the Australian lines are listed for everyone (the region only reorders, never hides); the UK,
// Ireland, US and Canada sheets read exactly as before; the shared support copy (app and Another Angle server) names 000
// and the Australian lines.
// Run with: node --test tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const support = await import('../src/app/scenes/support.js');
const { supportRegion, emergencyNumber, urgentCalls, supportCalls, abuseActions, supportLines, SUPPORT_LINES } = support;

const AU_ZONES = ['Australia/Sydney', 'Australia/Melbourne', 'Australia/Brisbane', 'Australia/Adelaide', 'Australia/Perth', 'Australia/Hobart',
  'Australia/Darwin', 'Australia/Lord_Howe', 'Australia/Eucla', 'Australia/Broken_Hill', 'Australia/Lindeman', 'Australia/Currie',
  'Australia/Canberra', 'Australia/ACT', 'Australia/NSW', 'Australia/Victoria', 'Australia/Queensland', 'Australia/South', 'Australia/West',
  'Australia/Tasmania', 'Australia/North', 'Australia/Yancowinna', 'Australia/LHI', 'Antarctica/Macquarie'];
const REGIONS = ['GB', 'IE', 'US', 'CA', 'AU', null];
const CATEGORIES = [null, 'abuse', 'violence', 'threat', 'harassment', 'discrimination', 'unsafe', 'check-in', 'self-risk', 'death-follow', 'loss', 'distress'];
const KNOWN = new Set(['999', '911', '112', '000', ...SUPPORT_LINES.filter((l) => l.tel).map((l) => l.tel)]);
const AU_LINES = {
  lifeline: { tel: '131114', show: '13 11 14' },
  'suicide-call-back': { tel: '1300659467', show: '1300 659 467' },
  '13yarn': { tel: '139276', show: '13 92 76' },
  'beyond-blue': { tel: '1300224636', show: '1300 22 4636' },
  'kids-helpline': { tel: '1800551800', show: '1800 55 1800' },
  '1800respect': { tel: '1800737732', show: '1800 737 732' },
};

test('AU region: every Australian zone (and Macquarie Island) is Australia, whatever the language', () => {
  for (const tz of AU_ZONES) {
    assert.equal(supportRegion({ timeZone: tz }), 'AU', tz);
    assert.equal(supportRegion({ timeZone: tz, languages: ['en-US'] }), 'AU', `${tz}: en-US phones in Australia`);
    assert.equal(supportRegion({ timeZone: tz, languages: ['en-GB'] }), 'AU', `${tz}, en-GB`);
  }
  // every Australia/* zone this runtime knows (canonical names), so a zone the list above misses is still caught
  const known = typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone').filter((z) => z.startsWith('Australia/')) : [];
  for (const tz of known) assert.equal(supportRegion({ timeZone: tz }), 'AU', tz);
  // near neighbours are not Australia (their lines are on Find A Helpline)
  for (const tz of ['Pacific/Auckland', 'Asia/Singapore', 'Asia/Jakarta', 'Pacific/Port_Moresby', 'Antarctica/McMurdo', 'Asia/Tokyo']) {
    assert.equal(supportRegion({ timeZone: tz, languages: ['en-AU'] }), null, `${tz}: the zone names a place, the language is not read`);
  }
});

test('AU region: an -AU language decides only when the time zone names no place', () => {
  for (const timeZone of [null, '', 'UTC', 'Etc/UTC', 'GMT', 'Etc/GMT+10', 'Universal', 'Zulu']) {
    assert.equal(supportRegion({ timeZone, languages: ['en-AU'] }), 'AU', `${timeZone}: en-AU`);
    assert.equal(supportRegion({ timeZone, languages: ['en_AU'] }), 'AU', `${timeZone}: en_AU`);
  }
  assert.equal(supportRegion({ timeZone: 'UTC', languages: ['fr', 'en-AU'] }), 'AU', 'a language with no region is skipped');
  assert.equal(supportRegion({ timeZone: 'UTC', languages: ['zh-AU'] }), 'AU', 'any language, the -AU region');
  assert.equal(supportRegion({ timeZone: 'UTC', languages: ['en-AU', 'en-GB'] }), 'AU', 'the first language with a region decides');
  assert.equal(supportRegion({ timeZone: 'UTC', languages: ['en-GB', 'en-AU'] }), 'GB', 'as before');
  assert.equal(supportRegion({ timeZone: 'Europe/London', languages: ['en-AU'] }), 'GB', 'the zone first, as before');
  assert.equal(supportRegion({ timeZone: 'UTC', languages: ['en-NZ'] }), null);
});

test('AU: the emergency number is 000, and the Emergency services card names it with the others', () => {
  assert.equal(emergencyNumber('AU'), '000');
  const card = SUPPORT_LINES.find((l) => l.id === 'emergency');
  assert.match(card.how, /999, 911, 112, 000/);
  // everywhere else, as before
  assert.deepEqual(['GB', 'IE', 'US', 'CA', null, 'NZ'].map(emergencyNumber), ['999', '112', '911', '911', '112', '112']);
});

test('AU: the urgent sheet leads with "Call 000" then Lifeline; the calm sheet with Lifeline then 000', () => {
  assert.deepEqual(urgentCalls('AU'), [
    { id: 'emergency', label: 'Call 000 · Emergency', href: 'tel:000', aria: 'Call 000 · Emergency services', primary: true },
    { id: 'lifeline', label: 'Call 13 11 14 · Lifeline', href: 'tel:131114', aria: 'Call 13 11 14 · Lifeline (1 3 1 1 1 4)' },
  ]);
  assert.deepEqual(supportCalls('AU'), [
    { id: 'lifeline', label: 'Call 13 11 14 · Lifeline', href: 'tel:131114', aria: 'Call 13 11 14 · Lifeline (1 3 1 1 1 4)', primary: true },
    { id: 'emergency', label: 'Call 000 · Emergency', href: 'tel:000', aria: 'Call 000 · Emergency services' },
  ]);
  // after abuse, violence or threats: 1800RESPECT (family, domestic or sexual violence), then 000 for danger now
  assert.deepEqual(abuseActions('AU'), [
    { id: '1800respect', label: 'Call 1800 737 732 · 1800RESPECT', href: 'tel:1800737732', aria: 'Call 1800 737 732 · 1800RESPECT (1 8 0 0 7 3 7 7 3 2)', primary: true },
    { id: 'emergency', label: 'Call 000 · If you’re in danger now', href: 'tel:000', aria: 'Call 000 · If you’re in danger now, emergency services' },
  ]);
});

test('AU: the cards lead with 000 and the Australian lines; after abuse, 1800RESPECT and Find A Helpline lead', () => {
  assert.deepEqual(supportLines(null, 'AU').map((l) => l.id),
    ['emergency', 'lifeline', 'suicide-call-back', '13yarn', 'beyond-blue', 'kids-helpline', '1800respect', 'findahelpline', 'samaritans', '988']);
  for (const c of ['abuse', 'violence', 'threat']) {
    const ls = supportLines(c, 'AU');
    assert.deepEqual(ls.map((l) => l.id).slice(0, 4), ['1800respect', 'findahelpline', 'emergency', 'lifeline'], c);
    assert.match(ls[1].how, /domestic-abuse services/);
  }
  // the urgent sheet's cards (no category) and the calls-first ones keep 000 and Lifeline on top too
  for (const c of [null, 'check-in', 'self-risk', 'death-follow', 'harassment', 'unsafe']) assert.deepEqual(supportLines(c, 'AU').slice(0, 2).map((l) => l.id), ['emergency', 'lifeline'], String(c));
});

test('the Australian lines: the exact published numbers, shown as dialled, with what each one is for', () => {
  for (const [id, { tel, show }] of Object.entries(AU_LINES)) {
    const l = SUPPORT_LINES.find((x) => x.id === id);
    assert.ok(l, id);
    assert.equal(l.tel, tel, id);
    assert.equal(l.show, show, id);
    assert.equal(l.show.replace(/\s/g, ''), l.tel, `${id}: the number shown is the number dialled`);
    assert.ok(l.how.includes(show), `${id}: the card's words name the number`);
    assert.equal(l.region, 'AU');
    assert.equal(l.where, 'Australia');
  }
  const by = (id) => SUPPORT_LINES.find((x) => x.id === id);
  assert.match(by('lifeline').how, /any time, day or night/);
  assert.match(by('lifeline').how, /text 0477 13 11 14/);
  assert.match(by('13yarn').how, /by and for Aboriginal and Torres Strait Islander people/);
  assert.match(by('kids-helpline').how, /aged 5 to 25/);
  assert.match(by('1800respect').how, /family, domestic or sexual violence/);
  // Lifeline's text and chat, each named for what it says first (WCAG 2.5.3)
  assert.deepEqual(by('lifeline').more.map((m) => [m.id, m.href]),
    [['lifeline-text', 'sms:0477131114'], ['lifeline-chat', 'https://www.lifeline.org.au/crisis-chat/']]);
  for (const m of by('lifeline').more) assert.ok(m.aria.startsWith(m.label), m.aria);
  assert.ok(by('lifeline').more.find((m) => m.id === 'lifeline-chat').external);
  // brand: plan words and the technology are never on the support sheet
  for (const l of SUPPORT_LINES) for (const s of [l.where, l.name, l.how, ...(l.more || []).flatMap((m) => [m.label, m.aria])]) {
    assert.doesNotMatch(s, /\bAI\b|\bPaid\b|\bUltra\b|\bPremium\b|Anthropic/, s);
  }
});

test('no line is ever hidden, for any region or category: the region and the category only reorder', () => {
  const all = SUPPORT_LINES.map((l) => l.id).sort();
  assert.equal(new Set(all).size, all.length, 'ids are unique');
  for (const r of [...REGIONS, 'NZ']) {
    for (const c of CATEGORIES) {
      const ids = supportLines(c, r).map((l) => l.id);
      assert.deepEqual([...ids].sort(), all, `${r} / ${c}: every line, once`);
    }
  }
  // the original four and the emergency card are still there for an Australian phone
  for (const id of ['emergency', 'findahelpline', 'samaritans', '988']) assert.ok(supportLines(null, 'AU').some((l) => l.id === id), id);
});

test('every call is named by its words first and dials only a listed number, Australia included', () => {
  for (const r of REGIONS) {
    for (const c of [...urgentCalls(r), ...supportCalls(r), ...abuseActions(r)]) {
      assert.ok(c.aria.startsWith(c.label), `${r}: "${c.aria}" starts with "${c.label}"`);
      if (c.href.startsWith('tel:')) assert.ok(KNOWN.has(c.href.slice(4)), `${r}: ${c.href} is a listed number`);
      else assert.ok(c.external && /^https:\/\//.test(c.href), c.href);
    }
    assert.equal(urgentCalls(r)[0].id, 'emergency');
    assert.equal(urgentCalls(r)[0].href, `tel:${emergencyNumber(r)}`);
    assert.ok(urgentCalls(r)[0].primary && supportCalls(r)[0].primary && abuseActions(r)[0].primary);
    assert.deepEqual(supportCalls(r).map((c) => c.id).slice(1), ['emergency']);
  }
});

test('the UK, Ireland, US and Canada (and elsewhere) read exactly as before', () => {
  const emergency = (n, primary) => ({ id: 'emergency', label: `Call ${n} · Emergency`, href: `tel:${n}`, aria: `Call ${n} · Emergency services`, ...(primary ? { primary: true } : {}) });
  const danger = (n) => ({ id: 'emergency', label: `Call ${n} · If you’re in danger now`, href: `tel:${n}`, aria: `Call ${n} · If you’re in danger now, emergency services` });
  const samaritans = (primary) => ({ id: 'samaritans', label: 'Call 116 123 · Samaritans', href: 'tel:116123', aria: 'Call 116 123 · Samaritans (1 1 6 1 2 3)', ...(primary ? { primary: true } : {}) });
  const l988 = (primary) => ({ id: '988', label: 'Call 988 · Crisis line', href: 'tel:988', aria: 'Call 988 · Crisis line, the 988 Suicide & Crisis Lifeline', ...(primary ? { primary: true } : {}) });
  const find = (primary) => ({ id: 'findahelpline', label: 'Find a crisis line near you', href: 'https://findahelpline.com', aria: 'Find a crisis line near you · Find A Helpline (opens a new tab)', external: true, ...(primary ? { primary: true } : {}) });
  const abuseFind = { id: 'findahelpline', label: 'Find a domestic-abuse service near you', href: 'https://findahelpline.com', aria: 'Find a domestic-abuse service near you · Find A Helpline (opens a new tab)', external: true, primary: true };
  const was = {
    GB: ['999', samaritans], IE: ['112', samaritans], US: ['911', l988], CA: ['911', l988], null: ['112', find],
  };
  for (const [r, [n, line]] of Object.entries(was)) {
    const region = r === 'null' ? null : r;
    assert.deepEqual(urgentCalls(region), [emergency(n, true), line(false)], `${r}: urgent`);
    assert.deepEqual(supportCalls(region), [line(true), emergency(n, false)], `${r}: calm, calls first`);
    assert.deepEqual(abuseActions(region), [abuseFind, danger(n)], `${r}: after abuse`);
    // the cards: the same four first, in the same order, then the Australian lines
    for (const c of CATEGORIES) {
      const ids = supportLines(c, region).map((l) => l.id);
      const first = support.abuseFirst(c) ? ['findahelpline', 'emergency', 'samaritans', '988'] : ['emergency', 'findahelpline', 'samaritans', '988'];
      assert.deepEqual(ids.slice(0, 4), first, `${r} / ${c}`);
      assert.deepEqual(ids.slice(4), ['lifeline', 'suicide-call-back', '13yarn', 'beyond-blue', 'kids-helpline', '1800respect'], `${r} / ${c}: then Australia's`);
    }
    // the category alone, as every caller but openSupport passes it, is the region-less order
    assert.deepEqual(supportLines('abuse').map((l) => l.id), supportLines('abuse', null).map((l) => l.id));
  }
});

// ------------------------------------------------------------------------------------- the sheet itself --
// (a fake DOM, enough for the real openSheet: elements with classes, attributes, children and events)
function installDom() {
  const KEYS = ['document', 'window', 'requestAnimationFrame', 'cancelAnimationFrame', 'innerWidth', 'innerHeight'];
  const saved = Object.fromEntries(KEYS.map((k) => [k, Object.getOwnPropertyDescriptor(globalThis, k)]));
  let doc = null;
  class El extends EventTarget {
    constructor(tag) {
      super();
      this.tagName = String(tag).toUpperCase(); this.nodeType = 1; this.children = []; this.parentNode = null; this.hidden = false; this._text = '';
      this.attrs = new Map(); this.inert = false;
      const props = new Map();
      this.style = { setProperty: (k, v) => props.set(k, v), getPropertyValue: (k) => props.get(k) ?? '', removeProperty: (k) => props.delete(k) };
      const cls = new Set(); this._cls = cls;
      this.classList = { add: (...c) => c.forEach((x) => cls.add(x)), remove: (...c) => c.forEach((x) => cls.delete(x)), contains: (c) => cls.has(c),
        toggle: (c, on) => { const v = on === undefined ? !cls.has(c) : !!on; if (v) cls.add(c); else cls.delete(c); return v; } };
    }
    get className() { return [...this._cls].join(' '); }
    set className(v) { this._cls.clear(); String(v).split(/\s+/).filter(Boolean).forEach((c) => this._cls.add(c)); }
    get textContent() { return this._text + this.children.map((c) => c.textContent).join(''); }
    set textContent(v) { this.children = []; this._text = String(v ?? ''); }
    get isConnected() { let n = this; while (n.parentNode) n = n.parentNode; return n === doc.root; }
    get offsetHeight() { return 0; }
    setAttribute(k, v) { this.attrs.set(k, String(v)); if (k === 'class') this.className = v; if (k === 'id') this.id = String(v); }
    getAttribute(k) { return this.attrs.has(k) ? this.attrs.get(k) : null; }
    hasAttribute(k) { return this.attrs.has(k); }
    removeAttribute(k) { this.attrs.delete(k); }
    append(...nodes) { for (const n of nodes) { if (n == null) continue; const c = typeof n === 'object' ? n : doc.createTextNode(n); c.parentNode = this; this.children.push(c); } }
    replaceChildren(...nodes) { this.children = []; this._text = ''; this.append(...nodes); }
    remove() { const p = this.parentNode; if (p) { p.children = p.children.filter((c) => c !== this); this.parentNode = null; } }
    focus() { doc.activeElement = this; }
    click() { this.dispatchEvent(Object.assign(new Event('click', { cancelable: true }), { detail: 0 })); }
    getBoundingClientRect() { return { left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 }; }
    *all() { for (const c of this.children) { yield c; yield* c.all(); } }
    matches(sel) {
      return sel.split(',').map((x) => x.trim()).some((x) => {
        if (/\s/.test(x)) { const parts = x.split(/\s+/); const last = parts.pop(); if (!this.matches(last)) return false; for (let n = this.parentNode; n && n.nodeType === 1; n = n.parentNode) if (n.matches(parts.join(' '))) return true; return false; }
        if (x.includes(':not(')) return false;
        if (x === '[inert]') return this.inert;
        if (x.startsWith('.')) return this._cls.has(x.slice(1));
        if (x.startsWith('[') && x.endsWith(']')) return this.attrs.has(x.slice(1, -1).split('=')[0]);
        if (x.startsWith('#')) return this.id === x.slice(1);
        return this.tagName === x.toUpperCase();
      });
    }
    closest(sel) { for (let n = this; n && n.nodeType === 1; n = n.parentNode) if (n.matches?.(sel)) return n; return null; }
    querySelector(sel) { for (const n of this.all()) if (n.nodeType === 1 && n.matches(sel)) return n; return null; }
    querySelectorAll(sel) { return [...this.all()].filter((n) => n.nodeType === 1 && n.matches(sel)); }
    contains(n) { for (let x = n; x; x = x.parentNode) if (x === this) return true; return false; }
  }
  doc = new EventTarget();
  doc.root = new El('html');
  Object.assign(doc, { body: new El('body'), activeElement: null, hidden: false });
  doc.root.append(doc.body);
  doc.createElement = (t) => new El(t);
  doc.createElementNS = (_ns, t) => new El(t);
  doc.createTextNode = (s) => Object.assign(new El('#text'), { nodeType: 3, _text: String(s) });
  doc.getElementById = (id) => doc.root.querySelector(`#${id}`);
  doc.querySelector = (s) => doc.root.querySelector(s);
  doc.querySelectorAll = (s) => doc.root.querySelectorAll(s);
  const scene = new El('main'); scene.setAttribute('id', 'scene');
  const sheetRoot = new El('div'); sheetRoot.setAttribute('id', 'sheet-root');
  doc.body.append(scene, sheetRoot);
  doc.activeElement = doc.body;
  Object.assign(globalThis, { document: doc, window: new EventTarget(), requestAnimationFrame: (fn) => setTimeout(fn, 0), cancelAnimationFrame: clearTimeout, innerWidth: 390, innerHeight: 844 });
  return { sheetRoot, restore() { for (const [k, d] of Object.entries(saved)) { if (d) Object.defineProperty(globalThis, k, d); else delete globalThis[k]; } } };
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
/**
 * Runs `fn(openAs)` in the fake DOM; openAs(timeZone, opts) opens the real support sheet as a phone in `timeZone` would see it
 * and reads its links in order. The sheets close at once; the DOM stays until their timers (470 ms) are done.
 */
async function withSheets(fn) {
  const dom = installDom();
  const realDTF = Intl.DateTimeFormat;
  const openAs = (timeZone, opts) => {
    Intl.DateTimeFormat = function DateTimeFormat() { return { resolvedOptions: () => ({ timeZone }) }; };
    try {
      const sh = support.openSupport({ state: {} }, { focus: false, ...opts });
      const nodes = [...sh.el.all()];
      const links = nodes.filter((n) => n.tagName === 'A');
      const out = {
        calls: links.filter((n) => n.closest('.support-calls')).map((n) => n.getAttribute('href')),
        cards: nodes.filter((n) => n.tagName === 'H3').map((n) => n.textContent),
        hrefs: links.map((n) => n.getAttribute('href')),
        arias: links.map((n) => [n.textContent, n.getAttribute('aria-label')]),
      };
      sh.close();
      return out;
    } finally { Intl.DateTimeFormat = realDTF; }
  };
  try { await fn(openAs); await sleep(520); } finally { dom.restore(); }
}

test('the sheet as an Australian phone sees it: 000 then Lifeline first, every card, Lifeline’s text and chat', () => withSheets((openAs) => {
  const urgent = openAs('Australia/Sydney', { urgent: true });
  assert.deepEqual(urgent.calls, ['tel:000', 'tel:131114'], 'the urgent calls: 000, then Lifeline');
  assert.deepEqual(urgent.cards, ['Emergency services', 'Lifeline', 'Suicide Call Back Service', '13YARN', 'Beyond Blue', 'Kids Helpline', '1800RESPECT', 'Find A Helpline', 'Samaritans', '988 Suicide & Crisis Lifeline']);
  for (const href of ['tel:000', 'tel:131114', 'sms:0477131114', 'https://www.lifeline.org.au/crisis-chat/', 'tel:1300659467', 'tel:139276', 'tel:1300224636', 'tel:1800551800', 'tel:1800737732', 'https://findahelpline.com', 'tel:116123', 'tel:988']) {
    assert.ok(urgent.hrefs.includes(href), href);
  }
  for (const [words, aria] of urgent.arias) assert.ok(aria.startsWith(words), `"${aria}" starts with "${words}"`);
  const abuse = openAs('Australia/Perth', { category: 'abuse' });
  assert.deepEqual(abuse.calls, ['tel:1800737732', 'tel:000'], 'after abuse: 1800RESPECT, then 000');
  assert.equal(abuse.cards[0], '1800RESPECT');
  assert.equal(abuse.cards.length, SUPPORT_LINES.length);
  const notOkay = openAs('Australia/Brisbane', { category: 'check-in' });
  assert.deepEqual(notOkay.calls, ['tel:131114', 'tel:000'], 'after "Not really": Lifeline, then 000');
}));

test('the sheet as a UK, US or unplaced phone sees it: the same calls first as before, the Australian cards after', () => withSheets((openAs) => {
  assert.deepEqual(openAs('Europe/London', { urgent: true }).calls, ['tel:999', 'tel:116123']);
  assert.deepEqual(openAs('America/New_York', { urgent: true }).calls, ['tel:911', 'tel:988']);
  assert.deepEqual(openAs('Asia/Kolkata', { urgent: true }).calls, ['tel:112', 'https://findahelpline.com']);
  assert.deepEqual(openAs('Europe/London', { category: 'abuse' }).calls, ['https://findahelpline.com', 'tel:999']);
  const gb = openAs('Europe/London', {});
  assert.deepEqual(gb.calls, [], 'the plain sheet has no calls first, as before');
  assert.deepEqual(gb.cards.slice(0, 4), ['Emergency services', 'Find A Helpline', 'Samaritans', '988 Suicide & Crisis Lifeline']);
  assert.deepEqual(gb.cards.slice(4), ['Lifeline', 'Suicide Call Back Service', '13YARN', 'Beyond Blue', 'Kids Helpline', '1800RESPECT']);
}));

test('the source: openSupport orders the cards by the region, and the Lifeline chat is the only new address', () => {
  const src = read('src/app/scenes/support.js');
  assert.match(src, /const lines = supportLines\(urgent \? null : cat, region\);/);
  const urls = [...new Set(src.match(/https?:\/\/[^'"`\s)]+/g))].sort();
  assert.deepEqual(urls, ['https://findahelpline.com', 'https://www.lifeline.org.au/crisis-chat/']);
  // the app's own CSS lays the extra ways in out as buttons that wrap
  assert.match(read('src/ui/app.css'), /\.support-more \{ display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; \}/);
});

test('the shared support copy (the app and, byte for byte, the Another Angle server) names 000 and the Australian lines', async () => {
  const { HARM_COPY } = await import('../src/data/safety-lexicon.js');
  const details = (rs) => rs.map((r) => `${r.label}: ${r.detail}`).join('\n');
  const crisis = details(HARM_COPY.crisis.resources);
  for (const s of ['999 (UK), 911 (US), 112 (EU), 000 (Australia)', 'Lifeline (Australia)', '13 11 14', '0477 13 11 14', 'Suicide Call Back Service', '1300 659 467', '13YARN', '13 92 76',
    'Samaritans', '116 123', '988', 'findahelpline.com']) assert.ok(crisis.includes(s), `crisis: ${s}`);
  const other = details(HARM_COPY.crisisOther.resources);
  for (const s of ['000 (Australia)', 'Lifeline (Australia)', '13 11 14', 'Samaritans', '988', 'findahelpline.com']) assert.ok(other.includes(s), `someone in danger: ${s}`);
  const care = details(HARM_COPY.careResources);
  for (const s of ['000 (Australia)', '1800RESPECT', '1800 737 732', '0808 2000 247', '1-800-799-7233', 'findahelpline.com']) assert.ok(care.includes(s), `care: ${s}`);
  // the authored copy, as the rest of the app's: no "AI" and no plan words
  for (const s of [crisis, other, care]) assert.doesNotMatch(s, /\bAI\b|\bPaid\b|\bUltra\b|\bPremium\b/);
  assert.equal(read('server/another-angle/src/safety/shared-lexicon.js'), read('src/data/safety-lexicon.js'), 'the server copy is the same file');
});
