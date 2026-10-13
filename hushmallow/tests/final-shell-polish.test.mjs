// Final shell polish (integ/final-shell-polish), the QA findings at the root:
//   1. Settings → About's first sentence ("…written in advance") comes from
//      src/app/privacy.js (aboutIntro) and follows angleLive(endpoint) with the
//      privacy lines: live, it names the perspectives Another Angle prepares as
//      the exception; never "AI", "Anthropic" or "model" on this page;
//   2. an address's closing "." (or ",") sits inside its last piece
//      (emailParts' tail), so it can never wrap onto a line of its own;
//   3. Settings → Privacy's account row stacks its button under the label when
//      the row is narrow (.setting-action in app.css);
//   4. the Plans top bar rests on a veil that covers the words scrolling under
//      it; the billing note and the support link never leave a word alone;
//   5. the version caption never breaks at the hyphen of "sign-in".
// Run with: node --test tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = (p) => readFileSync(root + p, 'utf8');
const NBSP = ' ';

// ------------------------------------------------------------ a tiny DOM --
class FakeEl {
  constructor(tag) {
    this.tagName = String(tag).toUpperCase(); this.nodeType = tag === '#text' ? 3 : 1;
    this.children = []; this.attrs = {}; this.style = {}; this.listeners = {}; this.parentNode = null; this.textContent = '';
  }
  setAttribute(k, v) { this.attrs[k] = String(v); }
  getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; }
  addEventListener(t, fn) { (this.listeners[t] ||= []).push(fn); }
  append(...kids) { for (const k of kids) { k.parentNode = this; this.children.push(k); } }
  replaceChildren(...kids) { this.children = []; this.append(...kids); }
  get className() { return this.attrs.class || ''; }
}
globalThis.document = {
  createElement: (t) => new FakeEl(t),
  createElementNS: (_, t) => new FakeEl(t),
  createTextNode: (t) => Object.assign(new FakeEl('#text'), { textContent: String(t) }),
  addEventListener() {}, removeEventListener() {}, querySelector: () => null, querySelectorAll: () => [],
  getElementById: () => null, head: new FakeEl('head'), documentElement: new FakeEl('html'),
};
globalThis.window ||= { addEventListener() {}, removeEventListener() {} };
globalThis.requestAnimationFrame ||= (fn) => setTimeout(fn, 0);
const text = (n) => (typeof n === 'string' ? n : n.nodeType === 3 ? n.textContent : (n.children || []).map(text).join(''));
const classes = (n) => (n?.attrs?.class || '').split(/\s+/).filter(Boolean);

// ------------------------------------------------------------------ 1 --
test('About: the written-in-advance sentence comes from privacy.js and names Another Angle\'s perspectives once it is live', async () => {
  const P = await import('../src/app/privacy.js');
  const { resolveEndpoint } = await import('../src/beyond/endpoint.js');
  const LIVE = 'https://hushmallow-another-angle.vibyfy-chat.workers.dev';
  // not live (this branch's ANGLE_ENDPOINT may be empty): the sentence as it always read
  const local = P.aboutIntro({ endpoint: null });
  assert.equal(local, 'Every Mallow line, world and ritual in hushmallow is written in advance, and feelings are matched with fixed word lists: you always choose what fits.');
  // live: the exception, in plain words, in the same release as the privacy lines (one angleLive(endpoint))
  const live = P.aboutIntro({ endpoint: LIVE });
  assert.equal(live, 'Every Mallow line, world and ritual in hushmallow is written in advance, except the perspectives Another Angle prepares in hushmallow Beyond after you say yes. Feelings are matched with fixed word lists: you always choose what fits.');
  assert.equal(P.aboutIntro({ endpoint: LIVE, beyond: 'Beyond' }).includes('prepares in Beyond after you say yes'), true, 'the plan name Settings passes');
  // the same switch as the privacy lines: both change together, from the endpoint
  for (const endpoint of [null, LIVE]) {
    assert.equal(P.aboutIntro({ endpoint }).includes('except the perspectives'), P.angleLive(endpoint));
    assert.equal(P.aboutPrivacy({ endpoint }).includes('The one exception is Another Angle'), P.angleLive(endpoint));
  }
  // with no argument: this build's resolveEndpoint(), like aboutPrivacy()
  assert.equal(P.aboutIntro(), P.aboutIntro({ endpoint: resolveEndpoint() }));
  // the technology and the company are named only on the consent card, privacy sheet and delete sheet, never here
  for (const endpoint of [null, LIVE]) for (const signIn of [false, true]) {
    const about = `${P.aboutIntro({ endpoint })} ${P.aboutPrivacy({ endpoint, signIn })}`;
    assert.doesNotMatch(about, /\bAI\b|Anthropic|\bmodels?\b|Claude/i, about);
  }
  // Settings uses it (and keeps no copy of the sentence), with the brand marked
  const settings = read('src/app/scenes/settings.js');
  assert.match(settings, /\.\.\.withBrand\(aboutIntro\(\{ beyond: PLANS\.ultra\?\.name \|\| 'hushmallow Beyond' \}\)\)/);
  assert.doesNotMatch(settings, /'Every Mallow line|' is written in advance/, 'no copy of its own');
  const { withBrand } = await import('../src/ui/type.js');
  const parts = withBrand(live);
  assert.equal(parts.map(text).join(''), live, 'the words unchanged');
  const marks = parts.filter((p) => typeof p !== 'string');
  assert.equal(marks.length, 2, 'hushmallow, and hushmallow Beyond');
  for (const m of marks) { assert.deepEqual(classes(m), ['brand-name']); assert.equal(text(m), 'hushmallow'); }
});

// ------------------------------------------------------------------ 2 --
test('account: the full stop after an address is glued to its last piece, never alone on a line', async () => {
  const { emailParts } = await import('../src/app/scenes/account.js');
  const { h } = await import('../src/app/ui.js');
  const tail = h('span', { class: 'hm-account-tail' }, '.');
  const parts = emailParts('ana.longer.name@examplemailexampl.com', tail);
  assert.deepEqual(parts.map((p) => p.tagName), ['SPAN', 'WBR', 'SPAN']);
  const last = parts[2];
  assert.equal(last.style.display, 'inline-block', 'the domain is one piece');
  assert.equal(last.children[last.children.length - 1], tail, 'the "." is the last thing inside the last piece');
  assert.notEqual(last.children[last.children.length - 2].tagName, 'WBR', 'no break opportunity right before it');
  assert.equal(parts.map(text).join(''), 'ana.longer.name@examplemailexampl.com.');
  // the halves still break only after "@" and (last resort) at a dot
  assert.equal(last.children.filter((c) => c.tagName === 'WBR').length, 1, 'examplemailexampl.<wbr>com');
  // a string tail and no tail; not an address: the tail straight after the text
  assert.equal(text(emailParts('bo@example.com', ',')[2]), 'example.com,');
  assert.equal(emailParts('bo@example.com').length, 3);
  assert.deepEqual(emailParts('your email', '.'), ['your email', '.']);
  assert.deepEqual(emailParts('your email'), ['your email']);
  // every lede that follows an address with punctuation hands it to emailParts
  const src = read('src/app/scenes/account.js');
  assert.match(src, /h\('strong', \{ translate: 'no' \}, \.\.\.emailParts\(text, tail \? h\('span', \{ class: 'hm-account-tail' \}, tail\) : null\)\)/);
  assert.doesNotMatch(src, /\.\.\.emailParts\(text\)\),\s*tail \?/, 'the old sibling tail is gone');
  // inside <strong>, the tail still reads as the lede's own text
  assert.match(read('src/ui/account.css'), /\.hm-account-strong \.hm-account-tail \{ color: var\(--text-2\); font-weight: var\(--type-body-weight\); \}/);
  // and the line under it never strands its year ("With hushmallow since 13 Oct" / "2026.")
  assert.match(read('src/ui/account.css'), /\.hm-account \[data-since\] \{ text-wrap: balance; \}/);
});

// ------------------------------------------------------------------ 3 --
test('Settings → Privacy account row: the button stacks under the label on a narrow row', async () => {
  const { mountAccountRow } = await import('../src/app/scenes/account.js');
  const el = new FakeEl('div');
  const app = { auth: { enabled: true, status: () => 'signed-in', user: () => ({ email: 'ana.longer.name@example.com' }) } };
  mountAccountRow(app, el);
  const row = el.children[0];
  assert.deepEqual(classes(row), ['setting', 'setting-action']);
  const [label, btn] = row.children;
  assert.equal(row.children.length, 2, 'label and button are the row\'s two flex items');
  assert.deepEqual(classes(label), ['grow']);
  assert.ok(classes(btn).includes('btn') && btn.attrs['data-act'] === 'account-row');
  assert.equal(text(btn), 'Manage');
  assert.match(text(label), /^Your accountSigned in as ana\.longer\.name@example\.com$/);
  // guest: the same shape
  mountAccountRow({ auth: { enabled: true, status: () => 'guest', user: () => null } }, el);
  assert.deepEqual(classes(el.children[0]), ['setting', 'setting-action']);
  assert.equal(text(el.children[0].children[1]), 'Sign in');
  // app.css (always loaded; account.css only loads with the account screens): the label asks for
  // 10 em of its own text, so the row really wraps; alone on its line the button takes the full width
  const css = read('src/ui/app.css');
  assert.match(css, /\.setting\.setting-action \{ flex-wrap: wrap; row-gap: 10px; \}/);
  assert.match(css, /\.setting\.setting-action > \.grow \{ flex: 999 1 10em; min-width: 0; \}/);
  assert.match(css, /\.setting\.setting-action > \.btn \{ flex: 1 0 auto; \}/);
  assert.doesNotMatch(read('src/ui/account.css'), /setting-action/, 'not where Settings cannot see it');
});

// ------------------------------------------------------------------ 4 --
test('Plans: the top bar rests on a veil over the scrolled words; no lone word in the billing note or the support link', async () => {
  const { periodNote, SUPPORT_LINK } = await import('../src/app/scenes/plans.js');
  // breaks only after a "·": "Test purchase · monthly ·" / "nothing is charged", never "· nothing…" or "nothing is / charged"
  const test1 = periodNote({ period: 'monthly' });
  assert.equal(test1.replaceAll(NBSP, ' '), 'Test purchase · monthly · nothing is charged');
  const spaces = [...test1.matchAll(/ /g)].map((m) => m.index);
  for (const i of spaces) assert.equal(test1[i - 1], '·', `a plain space only after "·" (at ${i})`);
  assert.equal(periodNote({ period: 'yearly' }).replaceAll(NBSP, ' '), 'Test purchase · yearly · nothing is charged');
  assert.ok(periodNote({ native: true, period: 'yearly' }).endsWith(`Cancel any${NBSP}time.`));
  assert.equal(periodNote({ native: true }).replaceAll(NBSP, ' '), 'Billed monthly by the App Store. Cancel any time.');
  // "It's free →" stays together (and "right now?")
  assert.equal(SUPPORT_LINK.replaceAll(NBSP, ' '), 'Need support right now? It’s free →');
  assert.ok(SUPPORT_LINK.endsWith(`It’s${NBSP}free${NBSP}→`));
  assert.match(read('src/app/scenes/plans.js'), /openSupport\(app\) \}, SUPPORT_LINK\)/);
  const css = read('src/ui/app.css');
  assert.match(css, /\.invite-period \{[^}]*text-wrap: balance;/);
  // the veil: from the top of the screen (the scroller runs over the scene's top padding) to a soft
  // fade under the bar, near-opaque night ink plus a blur, shown once the page has scrolled
  assert.match(css, /#scene \{[^}]*--scene-pad-top: calc\(var\(--safe-top\) \+ 14px\);[^}]*padding: var\(--scene-pad-top\)/);
  assert.match(css, /\.plans \{[^}]*height: calc\(100% \+ var\(--scene-pad-top\)\); margin: calc\(-1 \* var\(--scene-pad-top\)\)/);
  assert.match(css, /\.plans > \.plans-topbar \{[^}]*position: sticky; top: 0;[^}]*padding: var\(--scene-pad-top\) var\(--gutter\) 0; min-height: calc\(44px \+ var\(--scene-pad-top\)\);/);
  const veil = css.match(/\.plans > \.plans-topbar::before \{([^}]*)\}/)[1];
  assert.match(veil, /inset: 0 0 -28px; z-index: -1; pointer-events: none; opacity: 0;/);
  assert.match(veil, /rgba\(8,6,22,\.95\)/);
  assert.match(veil, /backdrop-filter: blur\(14px\)/);
  assert.match(css, /\.plans\.scrolled > \.plans-topbar::before \{ opacity: 1; \}/);
  assert.doesNotMatch(css, /\.plans\.scrolled > \.plans-topbar \{ background-color/, 'the old see-through band is gone');
  // the entrance fade is not held, or the blur would see nothing under the bar (Chrome's backdrop root)
  assert.match(css, /\.plans\.scene-enter \{ animation-name: fadeIn; animation-fill-mode: backwards; \}/);
});
