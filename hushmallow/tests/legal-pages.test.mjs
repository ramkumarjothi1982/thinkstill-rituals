// The Privacy Policy and the Terms of Use (legal/privacy.html, legal/terms.html):
//   1. both pages exist, are plain and load nothing from another site (no
//      script, no inline style or handler, a strict Content-Security-Policy,
//      every file they load relative and shipped), and their links resolve;
//   2. the draft switch: one line in src/ui/legal.css shows both pages' "Draft —
//      awaiting owner and legal review"; without it the notices are hidden, and
//      an approved page may hold no [Owner: …] placeholder. The checks follow
//      the switch's state, so deleting that line on approval needs no test edit
//      (nor does deleting the hidden notices afterwards);
//   3. the brand stays lowercase, the plan names are exact, no therapeutic claim;
//   4. the words follow the app: the owner's approved Anthropic lines and what
//      an account keeps, verbatim from the modules that show them in the app,
//      and the Settings labels the pages point to; every host (Cloudflare, the
//      GitHub Pages copy), what Delete account leaves (the sign-in service's
//      security log) and what the server's technical record holds;
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
/** The DRAFT SWITCH in src/ui/legal.css: the one line that shows both pages' draft notice. */
const SWITCH = /^\.legal-page \{ --legal-draft: block; \}\n/m;
const isDraft = (css) => SWITCH.test(css.replace(/\/\*[\s\S]*?\*\//g, ''));
const TODO = /<span class="legal-todo" data-todo="([^"]+)">([^<]*)<\/span>/g;
/** What stops a page being published as approved: with the switch off, every [Owner: …] placeholder must be replaced. */
function approvalProblems(html, draft) {
  if (draft) return [];
  const page = noComments(html);
  const left = [...page.matchAll(TODO)].map((m) => `${m[1]}: ${m[2]}`);
  if (/class="[^"]*\blegal-todo\b/.test(page.replace(TODO, ''))) left.push('a legal-todo placeholder in another form');
  if (/\[Owner\b/.test(textOf(page.replace(TODO, '')))) left.push('an [Owner …] note outside a placeholder');
  return left;
}
/** The page without its draft notice: what an approved page shows. */
const withoutNotice = (html) => noComments(html).replace(/<aside class="legal-draft"[\s\S]*?<\/aside>/, '');
/** The notice itself: while a draft, exactly one, before the title; once approved it is hidden, and may be left or deleted. */
function noticeProblems(html, draft) {
  const page = noComments(html);
  const notes = [...page.matchAll(/<aside class="legal-draft" role="note" aria-label="Draft notice"><strong>([^<]+)<\/strong>/g)];
  const bad = [];
  if (notes.length > 1 || (draft && !notes.length)) bad.push(`${notes.length} notices`);
  for (const m of notes) if (m[1] !== `${DRAFT}.`) bad.push(`the notice says "${m[1]}"`);
  if (notes.length && page.indexOf('class="legal-draft"') > page.indexOf('<h1')) bad.push('the notice comes after the title');
  return bad;
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
test('the draft switch: one line in legal.css shows both notices; with it gone, no page may keep a placeholder or call itself a draft', () => {
  const css = read('src/ui/legal.css');
  const draft = isDraft(css);
  // the notice is hidden unless the switch sets the variable, and nothing else in the stylesheet shows it
  assert.match(css, /^\.legal-draft \{ display: var\(--legal-draft, none\);/m, 'hidden unless the switch is on');
  assert.deepEqual(css.replace(/\/\*[\s\S]*?\*\//g, '').match(/--legal-draft:[^;]*;/g) || [], draft ? ['--legal-draft: block;'] : [], 'the switch is the only line that sets it');
  assert.doesNotMatch(css.replace(/\/\*[\s\S]*?\*\//g, ''), /\.legal-draft[^{]*\{[^}]*display:(?! var\(--legal-draft, none\))/, 'no other rule shows or hides the notice');
  for (const p of PAGES) {
    const html = read(p);
    // the pages carry no switch of their own: legal.css is the one place, for both
    assert.doesNotMatch(noComments(html), /data-draft|--legal-draft/, `${p}: no per-page switch`);
    assert.deepEqual(noticeProblems(html, draft), [], `${p}: the notice`);
    // only the notice says "draft": with the switch off, nothing left on the page calls it one
    assert.doesNotMatch(textOf(withoutNotice(html)), /\bdraft\b/i, `${p}: "draft" outside the notice`);
    assert.doesNotMatch(textOf(withoutNotice(html)), /not in force/i, `${p}: "not in force" outside the notice`);
    if (draft) {
      // while a draft: deleting the one line turns the switch off, and approving with a placeholder left is refused
      assert.equal(isDraft(css.replace(SWITCH, '')), false, 'deleting the line turns the switch off');
      assert.deepEqual(approvalProblems(html, true), [], 'a draft may hold placeholders');
      const placeholders = [...noComments(html).matchAll(TODO)].length;
      assert.equal(approvalProblems(html, false).length, placeholders, `${p}: each placeholder left blocks approval`);
      // every placeholder replaced with the final words, it passes
      const filled = html.replace(TODO, 'Example Pty Ltd');
      assert.deepEqual(approvalProblems(filled, false), []);
    }
    // the guard on the pages as they are: once the switch is off, an approved page keeps no placeholder
    assert.deepEqual(approvalProblems(html, draft), [], `${p}: approved with a placeholder left`);
  }
  // the guard itself, on a small page: a placeholder, a bare [Owner …] note or a leftover legal-todo class are each refused
  const sample = (x) => `<main><p>Provided by ${x}.</p></main>`;
  assert.deepEqual(approvalProblems(sample('<span class="legal-todo" data-todo="entity">[Owner: legal entity name]</span>'), false), ['entity: [Owner: legal entity name]']);
  assert.deepEqual(approvalProblems(sample('[Owner: legal entity name]'), false), ['an [Owner …] note outside a placeholder']);
  assert.deepEqual(approvalProblems(sample('<span class="legal-todo">Example Pty Ltd</span>'), false), ['a legal-todo placeholder in another form']);
  assert.deepEqual(approvalProblems(sample('Example Pty Ltd'), false), []);
  assert.deepEqual(approvalProblems(sample('<span class="legal-todo" data-todo="entity">[Owner: legal entity name]</span>'), true), []);
  // the notice check, on a small page: a draft needs its one notice above the title; an approved page may keep the hidden notice or delete it
  const note = `<aside class="legal-draft" role="note" aria-label="Draft notice"><strong>${DRAFT}.</strong> Not in force yet.</aside>`;
  const titled = (n) => `<main>${n}<h1 class="legal-title">Terms of Use</h1><p>Text.</p></main>`;
  assert.deepEqual(noticeProblems(titled(note), true), []);
  assert.deepEqual(noticeProblems(titled(''), true), ['0 notices'], 'a draft without its notice');
  assert.deepEqual(noticeProblems(titled(note + note), true), ['2 notices']);
  assert.deepEqual(noticeProblems(titled(note.replace('Draft —', 'Draft:')), true), ['the notice says "Draft: awaiting owner and legal review."']);
  assert.deepEqual(noticeProblems('<main><h1 class="legal-title">Terms of Use</h1>' + note + '</main>', true), ['the notice comes after the title']);
  assert.deepEqual(noticeProblems(titled(note), false), [], 'approved: the hidden notice may stay');
  assert.deepEqual(noticeProblems(titled(''), false), [], 'approved: or be deleted, with no test edit');
  // terms.html names the governing law: New South Wales, proposed by the owner (17 Oct 2026), with a visible note to confirm it
  // while the pages are drafts (the note goes on approval, with every other placeholder)
  assert.match(textOf(read(PAGES[1])), /governed by the laws of New South Wales, Australia/);
  if (draft) assert.match(sectionOf(read(PAGES[1]), 'law'), /New South Wales, Australia <span class="legal-todo" data-todo="governing-law">\[Owner: confirm New South Wales[^<]*\]<\/span>/);
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
    // no claim of treatment, cure or detection; "therapy", "treatment" and "diagnose" only to say what hushmallow is not
    // (the owner's positioning, 17 Oct 2026: an emotional companion platform, not medical treatment, therapy or a crisis service)
    assert.doesNotMatch(text, /\b(?:treat|treats|treating|cure[sd]?|heal(?:s|ing)?|CBT|DBT|ACT therapy|detect\w*|screening|suicide prevention|clinically|proven)\b/i, p);
    for (const s of text.split(/(?<=[.:;])\s+/)) {
      if (/\b(?:therapy|therapeutic|therapist|treatments?|diagnos\w*|counselling)\b/i.test(s)) assert.match(s, /\b(?:not|isn’t|doesn’t|no)\b/, `${p}: "${s}"`);
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

/** One numbered section of a page, from its heading to the next one. */
function sectionOf(html, id) {
  const page = noComments(html);
  const i = page.indexOf(`<h2 id="${id}">`);
  assert.ok(i >= 0, `#${id}`);
  const j = page.indexOf('<h2', i + 1);
  return page.slice(i, j < 0 ? undefined : j);
}

test('the Privacy Policy names every host and says what Delete account leaves behind', () => {
  const html = read(PAGES[0]);
  const sec = (id) => textOf(sectionOf(html, id));
  // the GitHub Pages copy (tools/build-site.sh publishes the same app there, from hushmallow-pages.yml): hosting, sharing, overseas
  assert.match(sec('hosting'), /Cloudflare hosts the hushmallow app at app\.hushmallow\.com/);
  assert.match(sec('hosting'), /A copy of the app is also published on GitHub Pages, at an address ending in github\.io\. GitHub, Inc\., in the United States, hosts that copy/);
  assert.match(sectionOf(html, 'sharing'), /<dt>GitHub, Inc\.: hosting of the GitHub Pages copy<\/dt>/);
  assert.match(sec('overseas'), /Stripe and GitHub \(the GitHub Pages copy\) are companies based in the United States/);
  // the website that embeds the app is its own site, with its own host and any analytics for the owner to name
  assert.match(sec('hosting'), /Our website, hushmallow\.com, is a separate site\./);
  // the sign-in service's security log outlives Delete account (account.js says so on the delete screen): §2, §10 and §11 agree
  assert.ok(read('src/app/scenes/account.js').includes('\'the sign-in service’s own security log (such as when you signed in): we can’t delete it from here\''), 'the app says it');
  assert.match(sec('account'), /keeps its own security records, such as when you signed in and from which network address, to protect your account\. Deleting your account doesn’t delete these records: they are kept for/);
  assert.match(sec('retention'), /The sign-in service’s own security records stay after you delete your account, for/);
  assert.match(sec('rights'), /Delete account\. This deletes your sign-in, your profile, your sync choices and everything kept with your account from our server, and that account’s things on this device\. It doesn’t delete the sign-in service’s own security records \(section 2\)/);
  // §3 is Another Angle's server only: the sign-in service's records are §2's
  assert.doesNotMatch(sec('another-angle'), /Supabase|sign-in/);
  // the server's technical record, as server/another-angle/src/log.js keeps it: the area of life, a length bucket, a coarse safety level
  const log = readFileSync(resolve(root, 'server/another-angle/src/log.js'), 'utf8');
  for (const key of ['situation', 'text_len_bucket', 'safety_level']) assert.match(log, new RegExp(`'${key}'`), `log.js keeps ${key}`);
  assert.match(sec('another-angle'), /the area of life it is about \(such as work or family\)[^.]*; a rough length \(short, medium or long\); and a coarse safety level \(none, concern, care or crisis\)\. It never holds your words/);
  // an account sends an email address and a name too: Another Angle is the only part that sends thoughts or feelings
  assert.match(sec('another-angle'), /the only part of hushmallow that sends your thoughts or feelings off your device, and only after you tap Accept/);
  // the Terms don't point at the client-side plan (the server doesn't check it yet)
  assert.doesNotMatch(textOf(read(PAGES[1])), /plan the app stores|stores on your device/);
  assert.match(textOf(read(PAGES[1])), /get round usage limits, access controls or plan checks;/);
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
    /emotional companion platform/, /not therapy, counselling or medical advice/, /doesn’t diagnose any condition/, /monthly or yearly/,
    /billed by Stripe/, /renews automatically/, /cancel at any time in the app with Manage subscription/, /until the end of the current billing period/,
    /Australian Consumer Law/, /guarantees that cannot be excluded under the Australian Consumer Law/, /before a new price applies to you/,
    /They may be wrong, incomplete or not right for you/, /You decide what to make of them/, /To the extent the law allows/,
    /governed by the laws of/, /Changes to these terms/, /18 or older/, /Acceptable use/,
  ]) assert.match(terms, fact);
});

// ------------------------------------------------- the owner's confirmed facts, 17 Oct 2026 --
// (docs/integration/DECISIONS.md, "2026-10-17: owner-confirmed facts"). What is not confirmed stays a placeholder.
test('the owner\'s facts (17 Oct 2026): the ABN shown, the entity still to check, 18+, support@, worldwide, the disclaimer', () => {
  const draft = isDraft(read('src/ui/legal.css'));
  const ABN = 'ABN 58 685 681 707';
  for (const p of PAGES) {
    const html = read(p), page = noComments(html), text = textOf(html);
    const shown = textOf(page.replace(TODO, ' '));   // what an approved page keeps once every placeholder is replaced
    // the ABN is confirmed: shown as itself, never a placeholder
    assert.ok(shown.includes(`(${ABN})`), `${p}: the lead names the ABN`);
    assert.doesNotMatch(page, /data-todo="abn"/, `${p}: no ABN placeholder`);
    // the entity registered to it is not verified: never assume the brand is the entity; while a draft, its name is a
    // placeholder that sends the owner to ABN Lookup
    assert.doesNotMatch(shown, /hushmallow\s*\(ABN|hushmallow (?:Pty|Ltd|Limited|Inc)\b/i, `${p}: the brand is never the legal entity`);
    const entity = [...page.matchAll(TODO)].filter((m) => m[1] === 'entity');
    if (draft) {
      assert.ok(entity.length >= 2, `${p}: the entity name, in the lead and the contact section`);
      for (const m of entity) assert.match(m[2], /ABN Lookup/, `${p}: ${m[2]}`);
      assert.ok(entity.some((m) => m[2].includes('abr.business.gov.au')), `${p}: where to check it`);
      assert.ok([...page.matchAll(TODO)].some((m) => m[1] === 'address'), `${p}: the address too`);
    }
    // 18 and over is approved: no age decision left; support@ is the confirmed contact: nothing left to confirm about it
    for (const todo of ['age', 'contact-email']) assert.doesNotMatch(page, new RegExp(`data-todo="${todo}"`), `${p}: ${todo}`);
    assert.doesNotMatch(text, /confirm the minimum age|confirm the support address|confirm this is the address/i, p);
    // worldwide, not Australia only
    assert.match(text, /wherever in the world you use them/, p);
    // the wellbeing and emergency disclaimer: a companion, not therapy or medical care, not for emergencies: 000 in Australia
    const crisis = textOf(sectionOf(html, 'support'));
    assert.match(page, /<h2 id="support">\d+\. Not for emergencies<\/h2>/, p);
    assert.match(crisis, /not therapy or medical care|isn’t a crisis service, therapy or medical care/, p);
    assert.match(crisis, /call (?:emergency services now: )?000 in Australia, or your local emergency number elsewhere/, p);
    // the Australian lines first, then the international ones (the app's own sheet orders them by the phone's region)
    const at = (s) => crisis.indexOf(s);
    for (const s of ['Lifeline 13 11 14', '1300 659 467', '13 92 76', 'findahelpline.com', 'Samaritans 116 123', '988']) assert.ok(at(s) > 0, `${p}: ${s}`);
    assert.ok(at('Lifeline 13 11 14') < at('findahelpline.com') && at('13 92 76') < at('Samaritans 116 123'), `${p}: Australia first`);
  }
  assert.match(textOf(read(PAGES[1])), /You must be 18 or older to use hushmallow \. By using it, you confirm that you are\./);
  assert.match(textOf(read(PAGES[0])), /hushmallow is for people aged 18 and over\./);
  assert.ok(textOf(sectionOf(read(PAGES[1]), 'contact')).includes(`, ${ABN}`), 'the Terms\' contact section names the ABN');
  assert.match(textOf(read(PAGES[1])), /It isn’t medical treatment, therapy, medical advice or a crisis service\./, 'the positioning, in short');
});

test('the Terms: "Subscriptions, renewal and cancellation" says what the code does, in US dollars', async () => {
  const draft = isDraft(read('src/ui/legal.css'));
  const html = read(PAGES[1]);
  assert.match(html, /<h2 id="subscriptions">6\. Subscriptions, renewal and cancellation<\/h2>/);
  assert.match(html, /<li><a href="#subscriptions">Subscriptions, renewal and cancellation<\/a><\/li>/);
  const sub = textOf(sectionOf(html, 'subscriptions'));
  // the owner's prices (17 Oct 2026), in US dollars; never the provisional Australian dollars
  assert.match(sub, /prices are in US dollars \(USD\): hushmallow Flow is US\$9\.99 a month or US\$99\.99 a year, and hushmallow Beyond is US\$19\.99 a month or US\$199\.99 a year\./);
  assert.doesNotMatch(sub, /A\$|\bAUD\b|Australian dollars/);
  // renewal; cancelling at the period's end in Manage subscription (Settings → Plan: settings.js, Stripe's customer portal)
  assert.match(sub, /renews automatically at the end of each month or year[^.]*until you cancel/);
  assert.match(sub, /cancel at any time in the app with Manage subscription \(in Settings, under Plan\)/);
  assert.match(sub, /Cancelling stops the next renewal: your plan stays until the end of the current billing period/);
  const settings = read('src/app/scenes/settings.js');
  assert.ok(settings.includes("'Manage subscription')") && settings.indexOf("'data-act': 'manage-subscription'") > settings.indexOf("section('Plan')"), 'the button is under Plan');
  // a failed renewal: access for as long as the server's past_due cap, then it stops
  const { PAST_DUE_GRACE_MS } = await import('../server/another-angle/src/billing/store.js');
  const days = PAST_DUE_GRACE_MS / 86400000;
  assert.equal(days, 14);
  assert.match(sub, new RegExp(`While the payment is being retried, you keep your plan for up to ${days} days\\. If the payment still hasn’t gone through by then, your plan stops\\.`));
  // no partial refunds, except where the law requires (the ACL and other consumer laws that can't be excluded)
  assert.match(sub, /We don’t give partial refunds[^.]*except where the law requires it: the Australian Consumer Law, and other consumer laws that cannot be excluded/);
  // prices can change, with notice, from the next renewal; the notice period is the owner's
  const prices = textOf(sectionOf(html, 'prices'));
  assert.match(prices, /before a new price applies to you, and it starts only from your first renewal after that notice/);
  // taxes: no tax wording until the owner has it (Stripe Tax is off at checkout until registrations are confirmed)
  const todos = (id) => [...sectionOf(html, id).matchAll(TODO)].map((m) => m[1]);
  if (draft) {
    assert.ok(todos('subscriptions').includes('taxes'), 'the taxes placeholder');
    assert.ok(todos('prices').includes('price-notice'), 'the notice period placeholder');
  }
  assert.doesNotMatch(textOf(sectionOf(html, 'subscriptions').replace(TODO, ' ')), /\b(?:GST|VAT|tax(?:es)?)\b/i, 'no tax claim outside the placeholder');
  assert.doesNotMatch(sub, /web payments aren’t built yet/, 'web payments are built');
});

test('the Privacy Policy: "AI and sensitive information" says what Another Angle\'s code does; every processor is named', async () => {
  const draft = isDraft(read('src/ui/legal.css'));
  const html = read(PAGES[0]);
  assert.match(html, /<h2 id="another-angle">3\. Another Angle: AI and sensitive information<\/h2>/);
  const ai = textOf(sectionOf(html, 'another-angle'));
  // opt-in consent (consent.js): nothing before Accept, nothing on Not now, a changed notice asks again (CONSENT_VERSION)
  const C = await import('../src/beyond/consent.js');
  assert.ok(Number.isInteger(C.CONSENT_VERSION) && C.CONSENT_VERSION >= 1);
  assert.match(ai, /only after you tap Accept on its consent card\. If you tap Not now, nothing is sent/);
  assert.match(ai, /If that notice changes in a way you should read again, the card asks you again before anything more is sent\./);
  // checked on the device first (another-angle.js): support instead of sending; the question before each angle (angle-first.js)
  const { ASK_BEFORE_ANGLE } = await import('../src/beyond/angle-first.js');
  const { ANGLE_CHOICE } = await import('../src/beyond/lines.js');
  assert.equal(ASK_BEFORE_ANGLE, true);
  assert.match(ai, /Before anything is sent, the app reads your words on your device\. If they suggest you may be in danger or need support, it shows support lines instead, and nothing is sent\./);
  assert.ok(ai.includes(`Nothing is sent before you choose, and nothing is sent if you choose ${ANGLE_CHOICE.be}.`));
  assert.match(read('src/beyond/another-angle.js'), /safety \(crisis: urgent support, nothing sent; care: support, no reframe\)/);
  // the server checks again before the model (its README: "Safety first — before any limit"; the model is never called)
  assert.match(readFileSync(resolve(root, 'server/another-angle/README.md'), 'utf8'), /and the model is never called and no quota is used/);
  assert.match(ai, /Our server checks the words it receives again, before anything goes to Anthropic\./);
  // what is sent: angle-client.js's own list, and the account's token only with web subscriptions (consent.js ACCOUNT_CHECK)
  const client = read('src/beyond/angle-client.js');
  assert.match(client, /What is sent: POST \/v1\/session \{ device_id, platform, app_version, invite\? \}/);
  assert.match(ai, /a random code for this device, the app’s version and the type of device \(and any tester code\)/);
  assert.match(C.ACCOUNT_CHECK, /sign-in token for your account, so our server can check your plan\. Never your name or email\./);
  assert.match(ai, /the start also sends your account’s access token, so our server can check your plan[^.]*\. Never your name or email, and never with your words\./);
  // the session code: at most the server's testing-token lifetime (30 days by default)
  assert.match(readFileSync(resolve(root, 'server/another-angle/src/config.js'), 'utf8'), /testingTokenTtlMs: int\(env\.TESTING_TOKEN_TTL_DAYS, 30,/);
  assert.match(ai, /keeps on your device for up to 30 days/);
  // what the server keeps (log.js; the ledger's two days); how long Cloudflare keeps the logs is not in the code: the owner's
  assert.match(ai, /These records are kept for/);
  if (draft) assert.ok([...sectionOf(html, 'another-angle').matchAll(TODO)].some((m) => m[1] === 'log-retention'), 'the log retention is a placeholder');
  // sensitive information: only with consent, only for the perspective, not kept
  assert.match(ai, /so we handle it as sensitive information\. We send it only with your consent \(Accept on the consent card\), only to prepare your perspective, and our server doesn’t keep it\./);
  // what stays on the device: a Belief Mallow only when kept ("Keep it on this phone"), and Delete my Another Angle data removes it
  const { BELIEF } = await import('../src/beyond/belief/lines.js');
  assert.ok(textOf(sectionOf(html, 'device')).includes(`if you choose “${BELIEF.end.keep}” for a Belief Mallow in Another Angle: its words`));
  assert.ok(C.ANGLE_EXTRA_KEYS.includes('beyond.belief.kept'));
  assert.match(ai, /“Delete my Another Angle data” removes [^.]*any sealed predictions and any Belief Mallows you kept\./);
  // every processor, by name, in "Who we share information with"; Brevo sends the account emails (owner, 17 Oct 2026)
  const dts = [...sectionOf(html, 'sharing').matchAll(/<dt>([^<]*)<\/dt>/g)].map((m) => m[1].split(':')[0]);
  assert.deepEqual(dts, ['Supabase, Inc.', 'Cloudflare, Inc.', 'GitHub, Inc.', 'Anthropic, PBC', 'Stripe', 'Brevo']);
  assert.match(textOf(sectionOf(html, 'account')), /are sent from no-reply@hushmallow\.com through Brevo, our email delivery service/);
  assert.match(textOf(sectionOf(html, 'overseas')), /European Union: Brevo, which sends account emails/);
  if (draft) for (const id of ['account', 'sharing', 'overseas']) assert.ok([...sectionOf(html, id).matchAll(TODO)].some((m) => m[1] === 'email-provider'), `§${id}: Brevo, to confirm`);
  assert.doesNotMatch(textOf(html), /the email delivery service used for account emails/, 'the provider is named');
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
    for (const line of ['Cache-Control: no-cache', 'Referrer-Policy: no-referrer', 'X-Frame-Options: DENY']) assert.ok(block.includes(`  ${line}`), line);
    // nosniff is one exact token: the whole-site rule (tools/site/security-headers.mjs) sets it for /legal/* too, and only it
    assert.ok(!block.includes('X-Content-Type-Options'), '/legal/* leaves nosniff to the whole-site rule');
    assert.ok((headers.split(/\n(?=\S)/).find((b) => b.startsWith('/*\n')) || '').includes('  X-Content-Type-Options: nosniff'), 'the whole-site rule sets nosniff');
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
