// What the customer app says about the Mallow line and about email must match what Hushmates actually does
// and what the draft privacy policy says. The screens run only in a browser, so the words are read from the
// shipped source (comments stripped, as tools/build-app.mjs ships it) and checked as sentences.
//  - The Mallow's perspective is chosen from a fixed set of lines written in advance: nothing "writes" it.
//    The "Automatically generated" label (owner decision D21) is left exactly as it is.
//  - The email is used to sign in, to reply, and for an important notice such as a data breach notice
//    (docs/legal/PRIVACY_POLICY.md "When you sign in"; COLLECTION_NOTICE_AND_CONSENT.md §4.1, §4.10), so no
//    screen may say it's used "only to sign you in".

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { stripJs } from '../tools/strip-comments.mjs';

const dir = new URL('../ui/relay/', import.meta.url);
const FILES = readdirSync(dir).filter((f) => f.endsWith('.js')).sort();
const source = (f) => stripJs(readFileSync(new URL(f, dir), 'utf8'));

/** Every string a screen can show: the '…', "…" and `…` literals of a file, comments already gone. */
function literals(code) {
  const out = [];
  const re = /'((?:[^'\\\n]|\\.)*)'|"((?:[^"\\\n]|\\.)*)"|`((?:[^`\\]|\\.)*)`/g;
  for (let m; (m = re.exec(code));) out.push(m[1] ?? m[2] ?? m[3]);
  return out;
}
const sentences = (text) => text.split(/(?<=[.!?:;])\s+/).map((s) => s.trim()).filter(Boolean);
const shown = (f) => literals(source(f)).flatMap(sentences);
const ALL = FILES.map((f) => [f, shown(f)]);

test('wording: the Release note says the Mallow’s perspective is chosen from lines written in advance, not written for you', () => {
  const release = literals(source('release.js'));
  const note = release.find((s) => s.startsWith('If you turn this on and nobody catches it within 30 minutes'));
  assert.ok(note, 'the Release screen still explains what turning the Mallow on means');
  assert.ok(note.includes('chosen automatically from a fixed set of lines written in advance for Hushmallow, guided by your words'), note);
  assert.ok(!/\bwrit(e|es|ing)\b/i.test(note), `the note says something writes it: ${note}`);
  assert.ok(note.includes('It isn’t a person') && note.includes('your words stay with Hushmates'), note);
  assert.ok(!/anonym/i.test(note), note);
  // the label and its hint stay exactly as decided (D21, pending a lawyer)
  assert.ok(release.includes('Your Mallow can offer an automatically generated perspective if no one catches your feeling.'), 'the switch hint changed');
});

test('wording: no screen says Hushmates or a Mallow writes the Mallow’s perspective', () => {
  for (const [f, lines] of ALL) {
    for (const s of lines) {
      assert.ok(!/\b(Hushmates|Mallow)\s+(writes|wrote|will write|is writing)\b/i.test(s), `${f}: ${s}`);
      assert.ok(!/\bwrites (a|one|your) perspective for you\b/i.test(s), `${f}: ${s}`);
    }
  }
});

// what an email-use sentence must cover, in the app's own words
const EMAIL_USES = [/sign you in/, /reply when you write to us/, /tell you something important about your account, your data or the service/];
const aboutEmailUse = (s) => /\byour email\b/i.test(s) && /\b(use|used|uses)\b/i.test(s);

test('wording: wherever the app says what your email is used for, it names every use, never only signing in', () => {
  let found = 0;
  for (const [f, lines] of ALL) {
    for (const s of lines.filter(aboutEmailUse)) {
      found++;
      for (const use of EMAIL_USES) assert.match(s, use, `${f}: "${s}" leaves out a use the privacy policy lists`);
      assert.ok(!/anonym/i.test(s), `${f}: ${s}`);
    }
    for (const s of lines) assert.ok(!/\bonly (use your email )?to sign you in[.;]|\bused only to sign you in\b/i.test(s), `${f}: ${s}`);
  }
  assert.ok(found >= 2, 'the sign-in hint and the privacy sheet both say what the email is for');
});

test('wording: the sign-in hint and the privacy sheet’s “Your account” say what the email is for, and that nobody else sees it', () => {
  const hint = shown('sign-in.js').filter(aboutEmailUse);
  assert.equal(hint.length, 1, `the sign-in screen: ${JSON.stringify(hint)}`);
  assert.ok(literals(source('sign-in.js')).some((s) => s.startsWith(hint[0]) && /Nobody else in Hushmates sees it\.$/.test(s)), 'the sign-in hint says nobody else sees the email');
  const account = literals(source('parts.js'));
  const i = account.indexOf('Your account');
  assert.ok(i >= 0, 'the privacy sheet has a “Your account” section');
  const text = account[i + 1];
  assert.equal(sentences(text).filter(aboutEmailUse).length, 1, text);
  assert.match(text, /Nobody else in Hushmates sees it\./, text);
});
