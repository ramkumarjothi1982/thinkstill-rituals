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
