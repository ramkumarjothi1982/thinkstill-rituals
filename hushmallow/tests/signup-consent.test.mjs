// 18+ age assurance and consent at sign-up (owner, 17 Oct 2026):
//   1. one required tick on the sign-up form, "I’m 18 or older, and I agree to the Terms and the Privacy Policy",
//      both linked (new tabs); the create button stays off until it is ticked (src/app/scenes/account.js
//      consentTick, tickGate); its label is tied to the box, the whole row is a 44 px target, the keyboard works;
//   2. the client refuses to sign up without it (defence in depth: src/auth/client.js signUp({ agreed })), and
//      records the acceptance on the account through supabase signUp's options.data (user_metadata):
//      { age_18_confirmed_at, terms_accepted_at, terms_version, privacy_version };
//   3. the versions are constants in one place (src/app/legal.js) and are stamped into the legal pages
//      (<meta name="legal-version">); while the pages are drafts the versions say so;
//   4. a provider sign-in (signInWithProvider, off today) needs the same tick before it redirects.
// Self-declaration is the assurance level; stronger age verification is the owner's decision (DECISIONS.md).
import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { createFakeSupabase } from '../tools/auth/fake-supabase.mjs';
import { createAuth, PROVIDERS } from '../src/auth/client.js';
import { resolveAuthConfig } from '../src/auth/config.js';
import { bootNamespace } from '../src/auth/namespace.js';
import { MESSAGES, friendlyError } from '../src/auth/errors.js';
import { memoryStorage, supabaseLib, fakeDom } from './helpers/auth-env.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = (p) => readFileSync(root + p, 'utf8');
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const DRAFT_SWITCH = /^\.legal-page \{ --legal-draft: block; \}\n/m;
const isDraft = () => DRAFT_SWITCH.test(read('src/ui/legal.css').replace(/\/\*[\s\S]*?\*\//g, ''));

// ------------------------------------------------------------ a small DOM --
class FakeEl {
  constructor(tag) {
    this.tagName = String(tag).toUpperCase(); this.nodeType = tag === '#text' ? 3 : 1;
    this.children = []; this.attrs = {}; this.style = {}; this.listeners = {}; this.textContent = ''; this.disabled = false; this.checked = false;
    this.dataset = {};
  }
  setAttribute(k, v) { this.attrs[k] = String(v); }
  getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; }
  removeAttribute(k) { delete this.attrs[k]; }
  addEventListener(t, fn) { (this.listeners[t] ||= []).push(fn); }
  append(...kids) { for (const k of kids) this.children.push(k); }
  fire(t) { for (const fn of this.listeners[t] || []) fn({ type: t, currentTarget: this, target: this }); }
}
const text = (n) => (n.nodeType === 3 ? n.textContent : n.children.map(text).join(''));
const find = (n, pred, out = []) => { if (n.nodeType === 1 && pred(n)) out.push(n); for (const k of n.children || []) find(k, pred, out); return out; };
function withDocument(fn) {
  const prev = globalThis.document;
  globalThis.document = { createElement: (t) => new FakeEl(t), createElementNS: (_, t) => new FakeEl(t), createTextNode: (t) => Object.assign(new FakeEl('#text'), { textContent: String(t) }) };
  return Promise.resolve().then(fn).finally(() => { if (prev === undefined) delete globalThis.document; else globalThis.document = prev; });
}

// ------------------------------------------------------------------ 3 --
test('the versions: one place (src/app/legal.js), stamped into each legal page, and "-draft" exactly while the pages are drafts', async () => {
  const L = await import('../src/app/legal.js');
  assert.deepEqual({ ...L.LEGAL_VERSIONS }, { terms: L.TERMS_VERSION, privacy: L.PRIVACY_VERSION });
  assert.ok(Object.isFrozen(L.LEGAL_VERSIONS));
  const draft = isDraft();
  for (const [kind, v] of Object.entries(L.LEGAL_VERSIONS)) {
    assert.match(v, /^\d{4}-\d{2}-\d{2}(?:-draft)?$/, `${kind}: a date, and -draft while a draft`);
    assert.equal(v.endsWith('-draft'), draft, `${kind}: approving the pages (the DRAFT SWITCH off) needs a new version, and a draft says it is one`);
    const html = read(L.LEGAL_PAGES[kind]);
    const stamps = [...html.replace(/<!--[\s\S]*?-->/g, '').matchAll(/<meta name="legal-version" content="([^"]*)">/g)].map((m) => m[1]);
    assert.deepEqual(stamps, [v], `${L.LEGAL_PAGES[kind]}: one stamp, the same version`);
    // in the head, where the reader never sees it ("draft" is said only by the notice)
    const head = html.slice(0, html.indexOf('</head>'));
    assert.ok(head.includes(`<meta name="legal-version" content="${v}">`), `${kind}: in the head`);
  }
  // nothing else in the app spells a version out: the client and the scene import them
  for (const f of ['src/auth/client.js', 'src/app/scenes/account.js']) assert.doesNotMatch(read(f), /\b20\d\d-\d\d-\d\d(?:-draft)?\b['"]/, `${f}: no version of its own`);
});

test('consentRecord: exactly the four fields, ISO times, the current versions', async () => {
  const L = await import('../src/app/legal.js');
  const at = Date.UTC(2026, 9, 17, 8, 30, 0, 125);
  const r = L.consentRecord(at);
  assert.deepEqual(Object.keys(r), ['age_18_confirmed_at', 'terms_accepted_at', 'terms_version', 'privacy_version']);
  assert.deepEqual(r, { age_18_confirmed_at: '2026-10-17T08:30:00.125Z', terms_accepted_at: '2026-10-17T08:30:00.125Z', terms_version: L.TERMS_VERSION, privacy_version: L.PRIVACY_VERSION });
  assert.match(L.consentRecord().terms_accepted_at, ISO, 'now, by default');
});

// ------------------------------------------------------------------ 1 --
test('the tick: "I’m 18 or older, and I agree to the Terms and the Privacy Policy", its label tied to the box, both pages linked', () => withDocument(async () => {
  const L = await import('../src/app/legal.js');
  const A = await import('../src/app/scenes/account.js');
  assert.equal(L.CONSENT_LINE, 'I’m 18 or older, and I agree to the Terms and the Privacy Policy');
  const t = A.consentTick('hm-acc-agree-1');
  assert.equal(t.name, 'agree');
  assert.equal(t.tick, true);
  const box = t.input;
  assert.equal(box.tagName, 'INPUT');
  assert.deepEqual({ type: box.attrs.type, id: box.attrs.id, name: box.attrs.name }, { type: 'checkbox', id: 'hm-acc-agree-1', name: 'agree' });
  assert.equal(box.attrs.required, '', 'required');
  assert.equal(box.attrs['aria-required'], 'true');
  assert.equal(box.attrs['aria-describedby'], t.hintEl.attrs.id, 'its hint (and an error, when there is one) describe it');
  assert.equal(box.checked, false, 'never ticked for the person');
  // the label: tied to the box (for = id) and around it, so a tap anywhere on the row ticks it
  const [label] = find(t.wrap, (n) => n.tagName === 'LABEL');
  assert.equal(label.attrs.for, 'hm-acc-agree-1');
  assert.ok(find(label, (n) => n === box).length === 1, 'the box is inside its label');
  assert.equal(label.attrs.class, 'hm-auth-tick');
  assert.equal(text(label), L.CONSENT_LINE, 'the visible words');
  // its accessible name is the visible words (WCAG 2.5.3), without the links' "(opens a new tab)"
  assert.equal(box.attrs['aria-label'], L.CONSENT_LINE);
  // the links: the Terms and the Privacy Policy, in a new tab
  const links = find(label, (n) => n.tagName === 'A');
  assert.deepEqual(links.map((a) => [text(a), a.attrs.href, a.attrs.target, a.attrs.rel]), [['Terms', 'legal/terms.html', '_blank', 'noopener'], ['Privacy Policy', 'legal/privacy.html', '_blank', 'noopener']]);
  assert.deepEqual(L.consentLabel().filter((x) => typeof x === 'string'), ['I’m 18 or older, and I agree to the ', ' and the ']);
  // never "AI" or the provider in it (tests/brand.test.mjs: the legal pages may, these words never)
  assert.doesNotMatch(L.CONSENT_LINE, /\bAI\b|Anthropic/);
}));

test('tickGate: the button is off until the box is ticked, follows it both ways, and leaves a busy form alone', () => withDocument(async () => {
  const A = await import('../src/app/scenes/account.js');
  const t = A.consentTick('hm-acc-agree-2');
  const submit = new FakeEl('button');
  let busy = false;
  const gate = A.tickGate(submit, [t], { busy: () => busy });
  assert.equal(submit.disabled, true, 'off at first');
  assert.equal(gate.ready(), false);
  t.input.checked = true; t.input.fire('change');
  assert.equal(submit.disabled, false, 'ticked: on');
  assert.equal(gate.ready(), true);
  t.input.checked = false; t.input.fire('change');
  assert.equal(submit.disabled, true, 'unticked again: off');
  // while the form is busy (the account is being made), a change leaves the button as the form set it
  t.input.checked = true; busy = true; submit.disabled = true; t.input.fire('change');
  assert.equal(submit.disabled, true);
  busy = false; gate.sync();
  assert.equal(submit.disabled, false, 'and follows the box again once the form is free');
  // ready() reads the box itself, never a flag a script could set
  t.input.checked = 'yes';
  assert.equal(gate.ready(), false, 'only a real tick (true) counts');
}));

test('the sign-up form: the tick is a field, the button waits for it, and signUp is told only a real tick', () => {
  const acc = read('src/app/scenes/account.js');
  assert.match(acc, /import \{ consentLabel, CONSENT_LINE \} from '\.\.\/legal\.js';/);
  const create = acc.slice(acc.indexOf('V.create = '), acc.indexOf("V['check-email']"));
  assert.match(create, /const agree = consentTick\(uid\('agree'\)\);/);
  assert.match(create, /fields: \[email, pw, name, agree\], submit: 'Create my account'/);
  assert.match(create, /a\.signUp\(\{ email: v\.email, password: v\.password, name: v\.name, agreed: v\.agree === true \}\)/);
  assert.doesNotMatch(create, /agreeLine|By creating an account you agree/, 'the old line is merged into the tick');
  // the form: a tick's value is the box's own checked state; the gate off until ticked; refused at submit without it
  const form = acc.slice(acc.indexOf('function form({'), acc.indexOf('/** A "send it again" button'));
  assert.match(form, /x\.tick \? x\.input\.checked === true : x\.input\.value/);
  assert.match(form, /const gate = ticks\.length \? tickGate\(submitBtn, ticks, \{ busy: \(\) => !!f\.dataset\.busy \}\) : null;/);
  assert.match(form, /if \(gate && !gate\.ready\(\)\) \{ fail\(friendlyError\(\{ code: 'agree_needed' \}, 'signup'\)\); return; \}/);
  assert.match(form, /submitBtn\.disabled = gate \? !gate\.ready\(\) : false;/, 'after a failed attempt the button follows the box, not just "on"');
  // the friendly line for a missing tick sits under the box
  assert.equal(friendlyError({ code: 'agree_needed' }, 'signup').field, 'agree');
  assert.equal(MESSAGES.agree_needed, 'Please tick the box to say you’re 18 or older and agree to the Terms and the Privacy Policy.');
  // 44 px: the whole row (the label) is the target; the box itself is drawn at 24 px; keyboard focus shows
  const css = read('src/ui/account.css');
  assert.match(css, /^\.hm-auth-tick \{ display: flex; align-items: flex-start; gap: 12px; min-height: 44px;/m);
  assert.match(css, /^\.hm-auth-tick input \{ flex: 0 0 auto; width: 24px; height: 24px;/m);
  assert.match(read('src/ui/tokens.css'), /^:focus-visible \{ outline: 2\.5px solid var\(--accent\)/m, 'the shared focus ring');
});

// ------------------------------------------------------------------ 2 + 4 --
let fake, config;
const loc = { origin: 'http://localhost:8202', pathname: '/', href: 'http://localhost:8202/', hostname: 'localhost', protocol: 'http:', search: '', hash: '' };
before(async () => {
  fake = createFakeSupabase({ siteUrl: 'http://localhost:8202' });
  const port = await fake.listen(0);
  config = resolveAuthConfig({ published: { enabled: true, url: `http://localhost:${port}`, key: 'sb_publishable_hushmallow_local_dev_only', mode: 'dev' }, loc, session: memoryStorage() });
});
after(async () => { await fake.close(); });
beforeEach(() => { fake.reset(); Object.assign(fake.cfg, { autoconfirm: false, rateLimitMs: 0 }); });

/** A client as the browser wires it, counting how often supabase-js is loaded (nothing loads before a real call). */
function page(extra = {}) {
  const ls = memoryStorage();
  const { doc, win } = fakeDom();
  const loads = { n: 0 };
  const auth = createAuth({ config, ns: bootNamespace({ config, ls }), ls, ss: memoryStorage(), loader: async () => { loads.n++; return supabaseLib(); }, doc, win, loc, storage: ls, onReload: () => {}, ...extra });
  return { auth, loads };
}
const usersNow = () => [...fake.users.values()];

test('signUp without the tick: refused before anything is loaded or sent, whatever else it is given', async () => {
  const { auth, loads } = page();
  for (const agreed of [undefined, false, 'yes', 1, {}, null]) {
    const r = await auth.signUp({ email: 'ana@example.com', password: 'gentle-moon-42', name: 'Ana', ...(agreed === undefined ? {} : { agreed }) });
    assert.equal(r.ok, false, String(agreed));
    assert.equal(r.error.code, 'agree_needed', String(agreed));
    assert.equal(r.error.field, 'agree');
    assert.equal(r.error.message, MESSAGES.agree_needed);
  }
  assert.equal(loads.n, 0, 'supabase-js never loaded');
  assert.deepEqual(usersNow(), [], 'no account made');
  assert.equal(fake.lastEmail('ana@example.com', 'signup'), null, 'no email sent');
});

test('signUp with the tick: the acceptance is recorded on the account (user_metadata), with the name, at the time of sign-up', async () => {
  const L = await import('../src/app/legal.js');
  const at = Date.UTC(2026, 9, 17, 9, 0, 0, 0);
  const { auth } = page({ now: () => at });
  const r = await auth.signUp({ email: 'ana@example.com', password: 'gentle-moon-42', name: 'Ana', agreed: true });
  assert.equal(r.ok, true); assert.equal(r.needsConfirmation, true);
  const [u] = usersNow();
  assert.ok(u, 'the account');
  assert.deepEqual(u.meta, { display_name: 'Ana', ...L.consentRecord(at) });
  assert.deepEqual(u.meta, {
    display_name: 'Ana', age_18_confirmed_at: '2026-10-17T09:00:00.000Z', terms_accepted_at: '2026-10-17T09:00:00.000Z',
    terms_version: L.TERMS_VERSION, privacy_version: L.PRIVACY_VERSION,
  });
  // no name: the record alone (never an empty display_name)
  const { auth: b } = page({ now: () => at });
  assert.equal((await b.signUp({ email: 'bo@example.com', password: 'gentle-moon-42', agreed: true })).ok, true);
  const bo = usersNow().find((x) => x.email === 'bo@example.com');
  assert.deepEqual(bo.meta, L.consentRecord(at));
  // the profile trigger still takes only the name from it
  assert.deepEqual(fake.rows.profiles.map((p) => p.display_name).sort(), ['Ana', null]);
});

test('a provider sign-in (off today) needs the same tick before it redirects; none is switched on without its own record', async () => {
  // as shipped: no provider, and the hook says so before anything else
  assert.deepEqual(Object.entries(PROVIDERS).filter(([, on]) => on), [], 'switching a provider on needs the acceptance recorded on its return first (DECISIONS.md, 2026-10-17)');
  const off = page();
  assert.equal((await off.auth.signInWithProvider('google', { agreed: true })).error.code, 'signup_closed');
  // with a provider configured: refused without the tick, before supabase-js is loaded or anything is sent
  const on = page({ providers: { google: true } });
  for (const opts of [undefined, {}, { agreed: false }, { agreed: 'true' }]) {
    const r = await on.auth.signInWithProvider('google', opts);
    assert.equal(r.ok, false, JSON.stringify(opts));
    assert.equal(r.error.code, 'agree_needed', JSON.stringify(opts));
  }
  assert.equal(on.loads.n, 0, 'nothing loaded, no redirect');
  // ticked: on to the provider
  const r = await on.auth.signInWithProvider('google', { agreed: true });
  assert.equal(r.ok, true); assert.equal(r.redirecting, true);
  assert.equal(on.loads.n, 1);
  // the source says it in the same order: the provider, then the tick, then the redirect
  const src = read('src/auth/client.js');
  const at = src.indexOf('async signInWithProvider(');
  const hook = src.slice(at, src.indexOf('chooseGuestData(', at));
  assert.ok(hook.indexOf("code: 'agree_needed'") > 0 && hook.indexOf("code: 'agree_needed'") < hook.indexOf('signInWithOAuth'), 'the tick before the redirect');
});
