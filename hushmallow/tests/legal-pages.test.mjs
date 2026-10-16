// The Privacy Policy and the Terms of Use (legal/privacy.html, legal/terms.html):
//   1. both pages exist, are plain and load nothing from another site (no
//      script, no inline style or handler, a strict Content-Security-Policy,
//      every file they load relative and shipped), and their links resolve;
//   2. the draft switch: data-draft on <html> shows "Draft — awaiting owner and
//      legal review"; without it the notice is hidden, and an approved page may
//      hold no [Owner: …] placeholder;
//   3. the brand stays lowercase, the plan names are exact, no therapeutic claim;
//   4. the words follow the app: the owner's approved Anthropic lines and what
//      an account keeps, verbatim from the modules that show them in the app,
//      and the Settings labels the pages point to;
//   5. tools/build-site.sh publishes them at /legal/ (tools/site/check.mjs
//      passes, and fails on a page that breaks the rules); _headers gives
//      /legal/* the strict policy;
//   6. the app links to them: Settings → Privacy and About, the plans page's
//      foot, and the sign-up form's "By creating an account you agree to the
//      Terms and Privacy Policy."
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, mkdtempSync, rmSync, cpSync, writeFileSync, unlinkSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = (p) => readFileSync(root + p, 'utf8');
const PAGES = ['legal/privacy.html', 'legal/terms.html'];
const DRAFT = 'Draft — awaiting owner and legal review';

const noComments = (html) => html.replace(/<!--[\s\S]*?-->/g, '');
/** The words a reader sees: tags out, whitespace collapsed. */
const textOf = (html) => noComments(html).replace(/<head>[\s\S]*?<\/head>/, ' ').replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
/** [tag, attribute, value] for every attribute that names a URL. */
const urls = (html) => [...noComments(html).matchAll(/<([a-z][a-z0-9]*)\b([^>]*)>/gi)]
  .flatMap((m) => [...m[2].matchAll(/\s(href|src|srcset|poster|data|action|formaction)="([^"]*)"/gi)].map((a) => [m[1].toLowerCase(), a[1].toLowerCase(), a[2]]));
const ids = (html) => new Set([...noComments(html).matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
const isDraft = (html) => /<html\b[^>]*\sdata-draft[\s>=]/.test(html);
/** What stops a page being published as approved: with data-draft gone, every [Owner: …] placeholder must be filled. */
function approvalProblems(html) {
  if (isDraft(html)) return [];
  return [...noComments(html).matchAll(/<span class="legal-todo" data-todo="([^"]+)">([^<]*)<\/span>/g)].map((m) => `${m[1]}: ${m[2]}`);
}

// ------------------------------------------------------------------ 1 --
test('legal pages: both exist, en-AU, titled "<name> · hushmallow", one h1, a way back to the app and to each other', () => {
  for (const [p, name] of [[PAGES[0], 'Privacy Policy'], [PAGES[1], 'Terms of Use']]) {
    assert.ok(existsSync(root + p), p);
    const html = read(p);
    assert.match(html, /^<!doctype html>/i, `${p}: standards mode`);
    assert.match(html, /<html lang="en-AU"[\s>]/, p);
    assert.match(html, /<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">/, `${p}: mobile first`);
    assert.equal(html.match(/<title>([^<]*)<\/title>/)[1], `${name} · hushmallow`);
    assert.equal(noComments(html).match(/<h1\b/g).length, 1, `${p}: one h1`);
    assert.match(html, new RegExp(`<h1 class="legal-title">${name}</h1>`));
    assert.match(html, /<main class="legal" id="legal-main" tabindex="-1">/, `${p}: the skip link's target`);
    assert.match(html, /<a class="legal-skip" href="#legal-main">/, `${p}: a skip link first`);
    assert.match(html, /<a class="legal-home" href="\.\.\/">/, `${p}: the logo goes back to the app`);
    assert.match(html, /<img class="hm-logo hm-logo-light" src="\.\.\/assets\/brand\/hushmallow-logo-light-360\.webp" alt="[^"]+"/, `${p}: the approved logo artwork, with alt text`);
    assert.ok(urls(html).some(([t, , v]) => t === 'a' && v === (p.endsWith('privacy.html') ? 'terms.html' : 'privacy.html')), `${p}: links to the other page`);
    assert.match(html, /<a href="mailto:support@hushmallow\.com">support@hushmallow\.com<\/a>/, `${p}: the contact address`);
  }
});

test('legal pages: no external requests, no script, no inline style or handler; a strict Content-Security-Policy', () => {
  for (const p of PAGES) {
    const html = noComments(read(p));
    assert.doesNotMatch(html, /<script\b/i, `${p}: no script`);
    assert.doesNotMatch(html, /<style\b|\sstyle\s*=/i, `${p}: no inline style`);
    assert.doesNotMatch(html, /<[a-z][^>]*\son[a-z]+\s*=/i, `${p}: no inline event handler`);
    assert.doesNotMatch(html, /<(?:iframe|object|embed|form|base|video|audio)\b/i, p);
    const csp = html.match(/<meta http-equiv="Content-Security-Policy" content="([^"]+)">/)?.[1];
    assert.equal(csp, "default-src 'none'; style-src 'self'; font-src 'self'; img-src 'self'; base-uri 'none'; form-action 'none'", p);
    assert.match(html, /<meta name="referrer" content="no-referrer">/, p);
    // everything the page loads is relative and is a file in the repository (published from this version's folder)
    const loads = urls(html).filter(([t, a]) => !(t === 'a' && a === 'href'));
    assert.ok(loads.length >= 6, `${p}: icon, two fonts, three stylesheets, logo`);
    for (const [t, a, v] of loads) {
      assert.match(v, /^\.\.\/(src|assets)\//, `${p}: <${t} ${a}="${v}"> is relative into src/ or assets/`);
      assert.ok(existsSync(resolve(root, 'legal', v)), `${p}: ${v} exists`);
    }
    assert.deepEqual([...html.matchAll(/<link rel="stylesheet" href="([^"]+)">/g)].map((m) => m[1]),
      ['../src/ui/tokens.css', '../src/ui/type.css', '../src/ui/legal.css'], `${p}: the app's tokens and faces, then its own styles`);
  }
  // the stylesheets name nothing from another site (the fonts are the self-hosted ones beside them)
  for (const css of ['src/ui/tokens.css', 'src/ui/type.css', 'src/ui/legal.css']) {
    const src = read(css).replace(/\/\*[\s\S]*?\*\//g, '');
    for (const m of src.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)|@import\s+["']([^"']+)["']/g)) {
      const u = m[1] || m[2];
      assert.doesNotMatch(u, /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i, `${css}: ${u}`);
      assert.ok(existsSync(resolve(root, dirname(css), u)), `${css}: ${u} exists`);
    }
  }
});

test('legal pages: every link resolves (the app, the other page, ids on the page); ways out are https:, mailto: or tel: only', () => {
  for (const p of PAGES) {
    const html = read(p);
    const own = ids(html);
    const links = urls(html).filter(([t, a]) => t === 'a' && a === 'href').map(([, , v]) => v);
    assert.ok(links.length > 20, p);
    for (const v of links) {
      if (v.startsWith('#')) { assert.ok(own.has(v.slice(1)), `${p}: ${v} is an id on the page`); continue; }
      if (/^(?:https:\/\/|mailto:|tel:)/.test(v)) continue;
      assert.doesNotMatch(v, /^(?:[a-z][a-z0-9+.-]*:|\/)/i, `${p}: ${v} (no other scheme, no absolute path: the GitHub Pages copy lives one folder down)`);
      const [path, frag] = v.split('#');
      const target = resolve(root, 'legal', path || '.');
      const file = path.endsWith('/') || path === '..' ? join(target, 'index.html') : target;
      assert.ok(existsSync(file), `${p}: ${v} → ${file}`);
      if (frag) assert.ok(ids(readFileSync(file, 'utf8')).has(frag), `${p}: ${v}: the id is on that page`);
    }
    // the contents list names every numbered section, in order
    const toc = [...noComments(html).match(/<nav class="legal-toc"[\s\S]*?<\/nav>/)[0].matchAll(/href="#([^"]+)"/g)].map((m) => m[1]);
    const sections = [...noComments(html).matchAll(/<h2 id="([^"]+)">\d+\./g)].map((m) => m[1]);
    assert.deepEqual(toc, sections, `${p}: the contents list matches the sections`);
    // phone numbers dial what they show
    for (const m of noComments(html).matchAll(/<a href="tel:(\d+)">([^<]+)<\/a>/g)) assert.equal(m[2].replace(/\s/g, ''), m[1], `${p}: tel:${m[1]}`);
  }
});

// ------------------------------------------------------------------ 2 --
test('the draft switch: data-draft on <html> shows the notice; without it the notice hides and no placeholder may remain', () => {
  const css = read('src/ui/legal.css');
  assert.match(css, /^\.legal-draft \{ display: none; \}$/m, 'hidden unless the page is a draft');
  assert.match(css, /^html\[data-draft\] \.legal-draft \{ display: block;/m, 'shown while <html data-draft>');
  for (const p of PAGES) {
    const html = read(p);
    // today both pages are drafts (remove data-draft once the owner and a lawyer approve)
    assert.equal(isDraft(html), true, `${p}: still a draft`);
    const notes = [...noComments(html).matchAll(/<aside class="legal-draft" role="note" aria-label="Draft notice"><strong>([^<]+)<\/strong>/g)];
    assert.equal(notes.length, 1, `${p}: one notice`);
    assert.equal(notes[0][1], `${DRAFT}.`);
    assert.ok(noComments(html).indexOf('class="legal-draft"') < noComments(html).indexOf('<h1'), `${p}: the notice comes before the title`);
    // one attribute is the whole switch: <html lang="en-AU" data-draft> → <html lang="en-AU">
    const approved = html.replace(/<html lang="en-AU" data-draft>/, '<html lang="en-AU">');
    assert.notEqual(approved, html, `${p}: the switch is the one attribute on <html>`);
    assert.equal(isDraft(approved), false);
    assert.deepEqual(approvalProblems(html), [], 'a draft may hold placeholders');
    const left = approvalProblems(approved);
    assert.ok(left.length >= 5, `${p}: approving it now is refused while placeholders remain (${left.length})`);
    for (const key of ['entity', 'abn', 'address', 'contact-email', 'age', 'effective-date']) assert.ok(left.some((l) => l.startsWith(`${key}:`)), `${p}: ${key}`);
    // filled in, it passes
    const filled = approved.replace(/<span class="legal-todo" data-todo="[^"]+">[^<]*<\/span>/g, 'Example Pty Ltd');
    assert.deepEqual(approvalProblems(filled), []);
  }
  // the guard itself: a page that has left draft keeps no placeholder (an empty list today, as both are drafts)
  for (const p of PAGES) assert.deepEqual(approvalProblems(read(p)), [], `${p}: approved with a placeholder left`);
  // terms.html also names the governing-law state; both pages name the same entity placeholder
  assert.match(read(PAGES[1]), /data-todo="governing-law">\[Owner: State or Territory\]/);
});

// ------------------------------------------------------------------ 3 --
test('legal pages: lowercase brand, the exact plan names, no plan words, no therapeutic claims', () => {
  for (const p of PAGES) {
    const html = noComments(read(p));
    const text = textOf(read(p));
    assert.doesNotMatch(html, /Hushmallow|HUSHMALLOW|HushMallow|Hush ?Mallow/, `${p}: always lowercase`);
    assert.match(text, /hushmallow Flow/, p);
    assert.match(text, /hushmallow Beyond/, p);
    assert.doesNotMatch(text, /\b(?:ultra|premium)\b/i, `${p}: never Ultra or Premium`);
    assert.doesNotMatch(text, /\bpaid\b/i, `${p}: never "Paid"`);
    // the brand is never uppercased by a style either: no text-transform on anything that holds it
    assert.doesNotMatch(html, /class="[^"]*t-(?:overline|badge)[^"]*"[^>]*>[^<]*hushmallow/, p);
    // no claim of treatment, cure or detection; "therapy" and "diagnose" only to say what hushmallow is not
    assert.doesNotMatch(text, /\b(?:treat|treats|treating|treatment|cure[sd]?|heal(?:s|ing)?|CBT|DBT|ACT therapy|detect\w*|screening|suicide prevention|clinically|proven)\b/i, p);
    for (const s of text.split(/(?<=[.:;])\s+/)) {
      if (/\b(?:therapy|therapeutic|therapist|diagnos\w*|counselling)\b/i.test(s)) assert.match(s, /\b(?:not|isn’t|doesn’t|no)\b/, `${p}: "${s}"`);
    }
  }
  // the transparency exception, used: the pages name the technology and the provider plainly
  assert.match(textOf(read(PAGES[0])), /AI language model from Anthropic/);
  assert.match(textOf(read(PAGES[1])), /AI language model from Anthropic/);
});

// ------------------------------------------------------------------ 4 --
test('the Privacy Policy says what the app does: the approved Anthropic lines and what an account keeps, verbatim', async () => {
  const C = await import('../src/beyond/consent.js');
  const P = await import('../src/app/privacy.js');
  const text = textOf(read(PAGES[0]));
  // the owner's approved wording (docs/integration/DECISIONS.md, 12 Oct 2026), exactly as the consent card and delete sheet show it
  for (const line of [C.PROVIDER_RETENTION, C.PROVIDER_SAFETY_HOLD, C.PROVIDER_USE, C.PROVIDER_DELETE]) assert.ok(line && text.includes(line), line);
  assert.ok(text.includes('Your words go to our secure server, where an AI language model from Anthropic, an outside provider, suggests a perspective.'), 'the card\'s own first line');
  assert.ok(text.includes('stores nothing you write and doesn’t log your words'), 'the card\'s "What’s kept"');
  assert.match(read('src/beyond/consent.js'), /'Your words go to our secure server, where an AI language model from Anthropic, an outside provider, suggests a perspective\.'/);
  // what an account keeps: the same sentence as Settings → About (src/app/privacy.js)
  assert.ok(text.includes(P.ACCOUNT_KEEPS), 'ACCOUNT_KEEPS');
  for (const fact of [
    /hm2:/, /local storage on this device/, /Sydney, Australia/, /ap-southeast-2/, /Supabase/, /Cloudflare/, /Stripe/, /we never see or store your card number/,
    /independent controller/, /No advertising/, /No analytics, tracking pixels or third-party trackers/, /never sell, rent or trade/,
    /Photos you add stay in the app’s memory on this device while you use them: they are never uploaded and never saved/,
    /no speech recognition of its own/, /keyboard’s microphone key/, /only after you tap Accept/, /Not now, nothing is sent/,
    /United States/, /APP 8/, /Australian Privacy Principles/, /APPs 12 and 13/, /Office of the Australian Information Commissioner \(OAIC\)/, /1300 363 992/,
    /Notifiable Data Breaches/, /aged 18 and over/, /deleted two days after the day they count/, /a code that changes every day/,
  ]) assert.match(text, fact);
  // the Settings labels the policy points to are the app's own (renaming one in the app fails here until the page follows)
  const settings = read('src/app/scenes/settings.js'), consent = read('src/beyond/consent.js'), account = read('src/app/scenes/account.js');
  for (const [label, src] of [['Delete everything on this phone', settings], ['Remember what I played', settings], ['Keep sealed predictions', settings],
    ['Share my words with Another Angle', consent], ['Delete my Another Angle data', consent], ['Your account', account], ['Delete account', account]]) {
    assert.ok(src.includes(`'${label}'`), `the app says "${label}"`);
    assert.ok(text.includes(label), `the policy says "${label}"`);
  }
});

test('both pages: not a crisis service, with Australian and international lines; the Terms cover what launch needs', () => {
  for (const p of PAGES) {
    const html = noComments(read(p));
    const text = textOf(read(p));
    assert.match(html, /<section class="legal-crisis" aria-labelledby="support">/, p);
    assert.match(text, /It isn’t a crisis service|can’t respond to emergencies/, p);
    for (const tel of ['000', '131114', '1300659467', '139276', '116123', '988']) assert.match(html, new RegExp(`href="tel:${tel}"`), `${p}: ${tel}`);
    assert.match(html, /href="https:\/\/findahelpline\.com"/, p);
    assert.match(text, /Lifeline 13 11 14/, p);
  }
  const terms = textOf(read(PAGES[1]));
  for (const fact of [
    /wellbeing and entertainment app/, /not therapy, counselling or medical advice/, /doesn’t diagnose any condition/, /monthly or yearly/,
    /billed by Stripe/, /renews automatically/, /cancel at any time in the app with Manage subscription/, /until the end of the current billing period/,
    /Australian Consumer Law/, /guarantees that cannot be excluded under the Australian Consumer Law/, /before a new price applies to you/,
    /They may be wrong, incomplete or not right for you/, /You decide what to make of them/, /To the extent the law allows/,
    /governed by the laws of/, /Changes to these terms/, /18 or older/, /Acceptable use/,
  ]) assert.match(terms, fact);
});

// ------------------------------------------------------------------ 5 --
test('the build publishes both pages at /legal/ (versioned styles, check.mjs passes) and _headers gives /legal/* a strict policy', async () => {
  const out = mkdtempSync(join(tmpdir(), 'hm-legal-'));
  try {
    const env = { ...process.env };
    for (const k of ['SUPABASE_URL', 'SUPABASE_PUBLISHABLE_KEY', 'HM_AUTH_MODE']) delete env[k];
    const log = execFileSync('bash', [`${root}tools/build-site.sh`, out, 'legal1'], { env, stdio: 'pipe' }).toString();
    assert.match(log, /check: ok/);
    assert.match(log, /legal pages 2/);
    for (const p of PAGES) {
      const pub = readFileSync(join(out, p), 'utf8');
      assert.match(pub, /href="\.\.\/v\/legal1\/src\/ui\/legal\.css"/, `${p}: styles from this version's folder`);
      assert.match(pub, /src="\.\.\/v\/legal1\/assets\/brand\/hushmallow-logo-light-360\.webp"/, p);
      assert.doesNotMatch(pub, /(?:href|src)="\.\.\/(?:src|assets)\//, `${p}: nothing unversioned left`);
      assert.match(pub, /<a class="legal-home" href="\.\.\/">/, `${p}: the way back is untouched`);
      assert.equal(pub.replace(/\.\.\/v\/legal1\//g, '../'), read(p), `${p}: only the paths change`);
    }
    assert.ok(existsSync(join(out, 'v/legal1/src/ui/legal.css')));
    const headers = readFileSync(join(out, '_headers'), 'utf8');
    const block = headers.split(/\n(?=\S)/).find((b) => b.startsWith('/legal/*'));
    assert.ok(block, '_headers has /legal/*');
    for (const line of ['Cache-Control: no-cache', 'Referrer-Policy: no-referrer', 'X-Frame-Options: DENY', 'X-Content-Type-Options: nosniff']) assert.ok(block.includes(`  ${line}`), line);
    const { LEGAL_CSP } = await import('../tools/site/auth-config.mjs');
    assert.ok(block.includes(`  Content-Security-Policy: ${LEGAL_CSP}`));
    assert.equal(LEGAL_CSP, `${read(PAGES[0]).match(/http-equiv="Content-Security-Policy" content="([^"]+)"/)[1]}; frame-ancestors 'none'`, 'the header is the meta tag plus frame-ancestors');
    assert.ok(headers.indexOf('/auth/*') >= 0 && /\/auth\/\*\n {2}Cache-Control: no-store/.test(headers), '/auth/* unchanged');

    // check.mjs refuses a published legal page that breaks the rules
    const { checkSite } = await import('../tools/site/check.mjs');
    assert.deepEqual((await checkSite(out, 'legal1')).problems, []);
    const bad = mkdtempSync(join(tmpdir(), 'hm-legal-bad-'));
    try {
      cpSync(out, bad, { recursive: true });
      const pp = join(bad, 'legal/privacy.html');
      writeFileSync(pp, readFileSync(pp, 'utf8')
        .replace('</head>', '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter">\n<script>1</script>\n</head>')
        .replace('<a href="#device">', '<a href="#nowhere" onclick="x()">'));
      unlinkSync(join(bad, 'legal/terms.html'));
      const r = await checkSite(bad, 'legal1');
      const has = (re) => r.problems.some((x) => re.test(x));
      assert.ok(has(/legal\/privacy\.html has a <script>/), 'a script');
      assert.ok(has(/legal\/privacy\.html has an inline event handler/), 'a handler');
      assert.ok(has(/loads https:\/\/fonts\.googleapis\.com/), 'another site');
      assert.ok(has(/links to #nowhere, which is not an id/), 'a broken fragment');
      assert.ok(has(/legal\/terms\.html \(the app links to it\) is not in the site/), 'a missing page');
      assert.ok(has(/links to terms\.html, which is not in the site/), 'a broken link');
    } finally { rmSync(bad, { recursive: true, force: true }); }
  } finally { rmSync(out, { recursive: true, force: true }); }
});

// ------------------------------------------------------------------ 6 --
class FakeEl {
  constructor(tag) { this.tagName = String(tag).toUpperCase(); this.nodeType = tag === '#text' ? 3 : 1; this.children = []; this.attrs = {}; this.style = {}; this.listeners = {}; this.textContent = ''; }
  setAttribute(k, v) { this.attrs[k] = String(v); }
  getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; }
  addEventListener(t, fn) { (this.listeners[t] ||= []).push(fn); }
  append(...kids) { for (const k of kids) this.children.push(k); }
}
const text = (n) => (n.nodeType === 3 ? n.textContent : n.children.map(text).join(''));
const find = (n, pred, out = []) => { if (n.nodeType === 1 && pred(n)) out.push(n); for (const k of n.children || []) find(k, pred, out); return out; };

test('the app links to both pages in a new tab: legalLink, "Terms · Privacy Policy" and the sign-up line', async () => {
  globalThis.document = { createElement: (t) => new FakeEl(t), createElementNS: (_, t) => new FakeEl(t), createTextNode: (t) => Object.assign(new FakeEl('#text'), { textContent: String(t) }) };
  try {
    const L = await import('../src/app/legal.js');
    assert.deepEqual({ ...L.LEGAL_PAGES }, { privacy: 'legal/privacy.html', terms: 'legal/terms.html' });
    // relative to the app's page: index.html is at the site's root, here and when published
    for (const p of Object.values(L.LEGAL_PAGES)) { assert.ok(PAGES.includes(p)); assert.ok(existsSync(resolve(root, p))); }
    assert.ok(existsSync(root + 'index.html'));
    for (const kind of ['privacy', 'terms']) {
      const a = L.legalLink(kind);
      assert.equal(a.tagName, 'A');
      assert.deepEqual({ href: a.attrs.href, target: a.attrs.target, rel: a.attrs.rel, label: a.attrs['aria-label'], kind: a.attrs['data-legal'] },
        { href: L.LEGAL_PAGES[kind], target: '_blank', rel: 'noopener', label: `${L.LEGAL_LABELS[kind]} (opens a new tab)`, kind });
      assert.equal(text(a), L.LEGAL_LABELS[kind]);
      assert.ok(a.attrs['aria-label'].startsWith(text(a)), 'the name starts with the words on it');
    }
    assert.deepEqual({ ...L.LEGAL_LABELS }, { privacy: 'Privacy Policy', terms: 'Terms' });
    const btn = L.legalLink('privacy', { cls: 'btn ghost block', style: { textDecoration: 'none' } });
    assert.equal(btn.attrs.class, 'btn ghost block'); assert.equal(btn.style.textDecoration, 'none');
    const pair = L.legalLinks();
    assert.equal(text(pair), 'Terms · Privacy Policy');
    assert.equal(pair.attrs.class, 'legal-links');
    assert.deepEqual(find(pair, (n) => n.tagName === 'A').map((n) => n.attrs['data-legal']), ['terms', 'privacy']);
    const agree = L.agreeLine('hm-auth-hint');
    assert.equal(text(agree), 'By creating an account you agree to the Terms and Privacy Policy.');
    assert.equal(text(agree), L.AGREE_LINE);
    assert.deepEqual(find(agree, (n) => n.tagName === 'A').map((n) => [text(n), n.attrs.href]), [['Terms', 'legal/terms.html'], ['Privacy Policy', 'legal/privacy.html']]);
    // never "AI" or the provider in the app's own words for them
    for (const s of [...Object.values(L.LEGAL_LABELS), L.AGREE_LINE]) assert.doesNotMatch(s, /\bAI\b|Anthropic/);
  } finally { delete globalThis.document; }
});

test('the links sit where people look: Settings → Privacy and About, the plans page\'s foot, the sign-up form above its button', () => {
  const settings = read('src/app/scenes/settings.js');
  assert.match(settings, /import \{ legalLink, legalLinks \} from '\.\.\/legal\.js';/);
  const privacy = settings.slice(settings.indexOf("section('Privacy')"), settings.indexOf("section('Plan')"));
  assert.match(privacy, /'data-act': 'delete-local'[^\n]*\n(?:\s*\/\/[^\n]*\n)*\s*legalLink\('privacy', \{ cls: 'btn ghost block'/, 'Privacy ends with the Privacy Policy, after Delete everything');
  const about = settings.slice(settings.indexOf("section('About')"));
  assert.match(about, /openSupport\(app\) \}, 'Support lines'\),\n\s*legalLinks\(\),/, 'About: Terms · Privacy Policy under Support lines');
  const plans = read('src/app/scenes/plans.js');
  assert.match(plans, /import \{ legalLinks \} from '\.\.\/legal\.js';/);
  const foot = plans.slice(plans.indexOf("h('div', { class: 'plans-foot' }"));
  assert.match(foot, /legalLinks\('legal-links plans-legal'\)\)\)\);/, 'the last thing in the plans foot');
  const account = read('src/app/scenes/account.js');
  assert.match(account, /import \{ agreeLine \} from '\.\.\/legal\.js';/);
  const create = account.slice(account.indexOf('V.create = '), account.indexOf("V['check-email']"));
  assert.match(create, /note: agreeLine\('hm-auth-hint hm-auth-center hm-auth-agree'\),/);
  // the form puts the note after the fields and before the error and the button
  assert.match(account, /\.\.\.before, \.\.\.fields\.map\(\(x\) => x\.wrap\), note, errEl, actionsEl\);/);
  // styled where each screen can see it: app.css (Settings, plans) and account.css (the account screens)
  assert.match(read('src/ui/app.css'), /^\.legal-links a \{ display: inline-flex; align-items: center; min-height: 44px;/m, '44 px targets');
  assert.match(read('src/ui/account.css'), /^\.hm-auth-agree a \{/m);
});
