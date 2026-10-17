// The account screen's notice and the sign-up tick's links (live mobile sweep of the staging preview, 17 Oct 2026):
//   1. a guest sent here from the plans page ("Step into hushmallow Beyond" → "Sign in or create an account first,
//      so your plan stays with you.") read it in a toast over "Create an account" that took the tap for 3.6 s
//      (375×667; at 390×844 with the largest text it covered "Sign in" and "Continue as a guest"). The first screen
//      says such a notice in its lede instead (src/app/scenes/account.js NOTICE_VIEWS, carriesNotice); a notice from
//      before a reload (main.js, with params.arrived) is as before;
//   2. a toast never takes a tap meant for what it sits over; only a link in it does (src/ui/app.css .toast);
//   3. "Terms" and "Privacy Policy" in the tick's label never overlap: each is one line tall and a line is taller
//      than its words (src/ui/account.css .hm-auth-tick). At 320×568 the lower edge of "Terms" opened the Privacy Policy.
// The browser proof (Chromium, 320×568, 375×667 and 390×844 at both text sizes, elementFromPoint and real taps) is
// in the commit that added this file.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = (p) => readFileSync(root + p, 'utf8');
const tick = (ms = 0) => new Promise((r) => setTimeout(r, ms));

// ------------------------------------------------------------ a small DOM --
class FakeEl {
  constructor(tag) {
    this.tagName = String(tag).toUpperCase(); this.nodeType = tag === '#text' ? 3 : 1;
    this.children = []; this.attrs = {}; this.style = { setProperty() {}, removeProperty() {} }; this.dataset = {}; this.listeners = {};
    this.parentNode = null; this._text = ''; this.disabled = false; this.value = ''; this.offsetWidth = 0; this.scrollTop = 0;
    const cls = new Set();
    this.classList = { add: (...c) => c.forEach((x) => cls.add(x)), remove: (...c) => c.forEach((x) => cls.delete(x)), toggle: (c, on) => { if (on ?? !cls.has(c)) cls.add(c); else cls.delete(c); }, contains: (c) => cls.has(c) };
  }
  get textContent() { return this.nodeType === 3 ? this._text : this.children.map((c) => c.textContent).join(''); }
  set textContent(t) { if (this.nodeType === 3) this._text = String(t); else this.replaceChildren(...(t === '' ? [] : [Object.assign(new FakeEl('#text'), { _text: String(t) })])); }
  get className() { return this.attrs.class || ''; }
  set className(v) { this.attrs.class = String(v); }
  setAttribute(k, v) { this.attrs[k] = String(v); }
  getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; }
  removeAttribute(k) { delete this.attrs[k]; }
  toggleAttribute(k, on) { if (on) this.attrs[k] = ''; else delete this.attrs[k]; }
  // a stylesheet "loads" at once
  addEventListener(t, fn) { (this.listeners[t] ||= []).push(fn); if (this.tagName === 'LINK' && t === 'load') queueMicrotask(fn); }
  removeEventListener() {}
  append(...kids) { for (const kid of kids) { const k = typeof kid === 'string' ? Object.assign(new FakeEl('#text'), { _text: kid }) : kid; k.parentNode = this; this.children.push(k); } }
  after(...kids) { this.parentNode?.append(...kids); }
  before(...kids) { this.parentNode?.append(...kids); }
  replaceChildren(...kids) { this.children = []; this.append(...kids); }
  remove() { if (this.parentNode) this.parentNode.children = this.parentNode.children.filter((c) => c !== this); }
  contains(n) { return n === this || this.children.some((c) => c.contains(n)); }
  querySelector() { return null; }
  querySelectorAll() { return []; }
  getBoundingClientRect() { return { top: 0, bottom: 0, left: 0, right: 0, width: 0, height: 0 }; }
  focus() {}
}
const all = (n, out = []) => { out.push(n); for (const c of n.children || []) all(c, out); return out; };
const saved = {};
for (const k of ['document', 'location', 'addEventListener', 'removeEventListener', 'requestAnimationFrame']) saved[k] = Object.getOwnPropertyDescriptor(globalThis, k);
after(() => { for (const [k, d] of Object.entries(saved)) { if (d) Object.defineProperty(globalThis, k, d); else delete globalThis[k]; } });
// the Mallow above the card falls back to its still picture in this DOM (and says so): not what is tested here
const warn = console.warn;
console.warn = (...a) => { if (!String(a[0]).startsWith('[auth mallow]')) warn(...a); };
after(() => { console.warn = warn; });
function fakeDocument() {
  const body = new FakeEl('body');
  globalThis.document = {
    createElement: (t) => new FakeEl(t), createElementNS: (_, t) => new FakeEl(t),
    createTextNode: (t) => Object.assign(new FakeEl('#text'), { _text: String(t) }),
    addEventListener() {}, removeEventListener() {}, querySelector: () => null, querySelectorAll: () => [],
    getElementById: () => null, head: new FakeEl('head'), body, documentElement: new FakeEl('html'),
  };
  globalThis.location = { hostname: 'app.test', protocol: 'https:', search: '', hash: '#account' };
  globalThis.addEventListener = () => {};
  globalThis.removeEventListener = () => {};
  globalThis.requestAnimationFrame = () => 0;   // no frames: the Mallow above the card is decoration here
  return body;
}

/** The account scene for a guest, opened with these params → { el, body, lede(), said(), toasts(), view(), leave }. */
async function openScene(params) {
  const body = fakeDocument();
  const { default: account } = await import('../src/app/scenes/account.js');
  const auth = {
    enabled: true, status: () => 'guest', user: () => null, ready: async () => true, onChange: () => () => {},
    // the sign-in client never loads here (a guest's screens need none until a form is sent)
    load: () => Promise.reject(new Error('not in this test')),
  };
  const prefs = { get: () => null, set() {}, reducedMotion: () => true };
  const app = { auth, prefs, state: {}, world: { dim() {}, showMallow() {}, mallowId: 'blubi' }, back() {}, go() {} };
  const scene = account(app, params);
  await scene.enter();
  const find = (id) => all(scene.el).find((n) => n.attrs?.id === id);
  return {
    el: scene.el, body,
    lede: () => find('hm-account-lede').textContent,
    said: () => all(scene.el).find((n) => n.attrs?.role === 'status' && n.attrs?.class === 'sr-only').textContent,
    toasts: () => body.children.filter((n) => n.attrs.class === 'toast').map((n) => n.textContent),
    view: () => scene.el.dataset.authView,
    leave: () => scene.leave(),
  };
}

// ------------------------------------------------------------------- 1 --
test('a notice another screen sends a guest here with is said by the first screen (welcome, sign in), never toasted', async () => {
  const { carriesNotice, NOTICE_VIEWS, carriesArrival } = await import('../src/app/scenes/account.js');
  const { SIGN_IN_FIRST, SIGN_IN_TO_RESTORE } = await import('../src/app/scenes/plans.js');
  const { RETURN_LINES } = await import('../src/app/billing.js');
  assert.deepEqual(NOTICE_VIEWS, ['welcome', 'signin']);
  // what the app's screens send (plans.js; Stripe's way back, billing.js and plan-change.js): all said on the card
  assert.equal(carriesNotice('welcome', { view: 'welcome', notice: SIGN_IN_FIRST }), true);
  assert.equal(carriesNotice('signin', { view: 'signin', notice: SIGN_IN_TO_RESTORE }), true);
  assert.equal(carriesNotice('signin', { view: 'signin', notice: RETURN_LINES.signIn }), true);
  for (const [file, re] of [
    ['src/app/scenes/plans.js', /app\.go\('account', \{ view: 'welcome', notice: SIGN_IN_FIRST \}\);/],
    ['src/app/scenes/plans.js', /app\.go\('account', \{ view: 'signin', notice: SIGN_IN_TO_RESTORE \}\);/],
    ['src/app/billing.js', /app\.go\('account', \{ view: 'signin', notice: RETURN_LINES\.signIn \}\);/],
    ['src/app/plan-change.js', /app\.go\('account', \{ view: 'signin', notice: CHANGE_LINES\.signIn \}\);/],
  ]) assert.match(read(file), re, `${file}: a guest screen with its notice`);
  // a notice from before a reload (main.js, with its arrival) is as before: the card's lede for an arrival, else a toast
  assert.equal(carriesNotice('welcome', { notice: 'You’re signed out. Everything here is a guest’s again.', arrived: 'signed-out' }), false);
  assert.equal(carriesArrival('welcome', 'signed-out'), false);
  // nothing to say, or a screen that does not say one (the "doesn't use accounts" screen, the account card): as before
  assert.equal(carriesNotice('welcome', {}), false);
  assert.equal(carriesNotice('off', { notice: SIGN_IN_FIRST }), false);
  assert.equal(carriesNotice('account', { notice: SIGN_IN_TO_RESTORE }), false);
});

test('the plans page\'s guest, on the account screen: the notice is the lede (and read out), no toast over the buttons', async () => {
  const { SIGN_IN_FIRST, SIGN_IN_TO_RESTORE } = await import('../src/app/scenes/plans.js');
  const welcome = await openScene({ view: 'welcome', notice: SIGN_IN_FIRST });
  assert.equal(welcome.view(), 'welcome');
  assert.equal(welcome.lede(), SIGN_IN_FIRST, 'in place of "Optional. Everything works without one."');
  await tick(700);   // the toast came 500 ms after the screen
  assert.deepEqual(welcome.toasts(), [], 'never a toast over "Create an account"');
  assert.equal(welcome.said(), SIGN_IN_FIRST, 'read out as the toast was');
  assert.ok(all(welcome.el).some((n) => n.attrs?.['data-act'] === 'create'), 'the screen\'s own buttons, as before');
  welcome.leave();

  const signin = await openScene({ view: 'signin', notice: SIGN_IN_TO_RESTORE });
  assert.equal(signin.view(), 'signin');
  assert.equal(signin.lede(), SIGN_IN_TO_RESTORE);
  await tick(700);
  assert.deepEqual(signin.toasts(), []);
  signin.leave();

  // no notice: each screen's own lede
  const plain = await openScene({ view: 'welcome' });
  assert.equal(plain.lede(), 'Optional. Everything works without one.');
  plain.leave();
  const plainSignin = await openScene({ view: 'signin' });
  assert.equal(plainSignin.lede(), 'Sign in to your hushmallow account.');
  plainSignin.leave();

  // a notice from before the reload (main.js: signed out, with #account): still its toast, as before
  const out = await openScene({ arrived: 'signed-out', notice: 'You’re signed out. Everything here is a guest’s again.' });
  assert.equal(out.lede(), 'Optional. Everything works without one.');
  await tick(700);
  assert.deepEqual(out.toasts(), ['You’re signed out. Everything here is a guest’s again.']);
  out.leave();

  const src = read('src/app/scenes/account.js');
  assert.match(src, /V\.welcome = \(o = \{\}\) => \(\{\n {4}title: 'Your hushmallow account', lede: o\.notice \|\| 'Optional\. Everything works without one\.',/);
  assert.match(src, /return \{ title: 'Welcome back', lede: o\.notice \|\| 'Sign in to your hushmallow account\.', body: \[f\.form\] \};/);
});

// ------------------------------------------------------------------- 2 --
test('a toast never takes a tap meant for what it sits over; a link in it still does', () => {
  const css = read('src/ui/app.css');
  const rule = css.match(/^\.toast \{([^}]*)\}/m)[1];
  assert.match(rule, /pointer-events: none;/);
  assert.match(css, /^\.toast :is\(a, button\) \{ pointer-events: auto; \}$/m);
  // the one toast with a link today: the framed "Continue on …" (billing.js outsideNote), from the plans page
  assert.match(read('src/app/scenes/plans.js'), /else if \(r\?\.framed\) toast\(outsideNote\(h\), 9000\);/);
  assert.match(read('src/app/billing.js'), /h\('a', \{ href, target: '_top', rel: 'noopener' \}, `Continue on \$\{loc\.host\}`\)/);
});

// ------------------------------------------------------------------- 3 --
test('the sign-up tick: "Terms" and "Privacy Policy" are each one line tall, and a line is taller than its words', () => {
  const css = read('src/ui/account.css');
  const tickRule = css.match(/^\.hm-auth-tick \{([^}]*)\}/m)[1];
  const link = css.match(/^\.hm-auth-tick a \{([^}]*)\}/m)[1];
  // one line tall: an inline-block with no padding (6 px reached into the next line: a 41×12 px overlap at 320×568)
  assert.match(link, /display: inline-block;/);
  assert.doesNotMatch(link, /padding|margin|line-height/);
  // the line: 1.5 (after the font shorthand, which would reset it), over the label token's 1.35, under which the words'
  // own box (about 1.36 em in this font) already reached into the next line by a pixel or two
  assert.match(tickRule, /font: var\(--type-label\); line-height: 1\.5;/);
  assert.match(read('src/ui/type.css'), /--type-label-lh: 1\.35;/);
  // the tick itself is as before: the whole row at least 44 px, the box at 24 px, the button off until it is ticked
  assert.match(css, /^\.hm-auth-tick \{ display: flex; align-items: flex-start; gap: 12px; min-height: 44px;/m);
  assert.match(css, /^\.hm-auth-tick input \{ flex: 0 0 auto; width: 24px; height: 24px;/m);
});
