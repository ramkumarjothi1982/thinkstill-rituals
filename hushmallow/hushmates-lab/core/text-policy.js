// Deterministic text rules for Hushspace messages and pseudonyms.
//
// No AI and no content scoring: a handful of fixed patterns that stop the
// obvious cases (links, contact details, outside usernames, money requests).
// They are deliberately simple and they are imperfect: people can always
// describe identifying details in words, so the interface says so plainly.
// The same function runs in the interface (instant feedback) and in the
// service (the check that counts).

// zero-width characters, bidi overrides and other invisible format marks
const INVISIBLE = /[­᠎​-‏‪-‮⁠-⁯﻿]/g;
// C0/C1 control characters except tab and newline
const CONTROL = /[\u0000-\u0008\u000B-\u001F\u007F-\u009F]/g;

export function normaliseText(input) {
  let s = String(input ?? '');
  try { s = s.normalize('NFC'); } catch { /* lone surrogates */ }
  s = s.replace(INVISIBLE, '').replace(CONTROL, '').replace(/\t/g, ' ').replace(/\r\n?/g, '\n');
  s = s.replace(/[  ]+\n/g, '\n').replace(/\n{3,}/g, '\n\n');
  return s.trim();
}

export const charCount = (s) => Array.from(s).length;

const RULES = [
  {
    code: 'contact',
    message: 'To keep you both safe, contact details and outside usernames can’t be shared here.',
    tests: [
      /[^\s@]+@[^\s@]+\.[a-z]{2,}/i,                                          // email
      /\S+\s?[([]at[)\]]\s?\S+\s?[([]dot[)\]]\s?[a-z]{2,}/i,                  // "name (at) mail (dot) com"
      /(?:\+?\d[\s\-().]{0,3}){7,}/,                                          // 7+ digits: phone numbers
      /(?:^|\s)@[a-z0-9_.]{3,}/i,                                             // @handles
      /\b(?:add|message|text|dm|find|follow|reach|contact|call|ping)\s+me\s+(?:on|at|via|over)\b/i,
      /\bmy\s+(?:snap(?:chat)?|insta(?:gram)?|ig|whats\s?app|telegram|discord|kik|wechat|skype)\b/i,
      /\bmy\s+(?:user\s?name|handle|e-?mail|number)\s+(?:is|=|:)/i,
      /\b(?:whats\s?app|telegram|snapchat|discord|kik|wechat)\s+(?:me\b|id\b|is\b|:)/i,
    ],
  },
  {
    code: 'link',
    message: 'Links can’t be shared in Hushspace. You can describe it in your own words instead.',
    tests: [
      /\b(?:https?|ftp):\/\//i,
      /\bwww\.[^\s]/i,
      // bare domains such as example.com, bit.ly/x or t.me/name. Lower-case
      // endings only, so a missed space after a full stop ("tired.Me too")
      // isn't mistaken for a link; short endings that are everyday words are left out.
      /\b[A-Za-z0-9][A-Za-z0-9-]{0,62}(?:\.|\s?[([]dot[)\]]\s?)(?:com|net|org|io|co|me|app|ly|gg|xyz|info|biz|uk|de|fr|au|ca|tv|link|site|online|ru|cn|nl|es|club|live|COM|NET|ORG)\b/,
    ],
  },
  {
    code: 'money',
    message: 'Money requests and payment details aren’t allowed in Hushmates.',
    tests: [
      /\b(?:venmo|cash\s?app|zelle|western\s+union|moneygram|paypal\.me|wallet\s+address|iban)\b/i,
      /\bgift\s?cards?\s+(?:code|number|pin)s?\b/i,
      /\bbuy\s+(?:me\s+)?(?:a\s+|some\s+)?gift\s?cards?\b/i,
      /\b(?:send|lend|loan|wire)\s+(?:me\s+)?(?:some\s+)?(?:money|cash|funds|crypto|bitcoin|btc|usdt|eth)\b/i,
    ],
  },
];

/** @returns {{ ok: true, text: string } | { ok: false, code: string, message: string }} */
export function checkMessage(input, { maxChars = 1000 } = {}) {
  const text = normaliseText(input);
  if (!text) return { ok: false, code: 'empty', message: 'Write something first.' };
  if (charCount(text) > maxChars) {
    return { ok: false, code: 'too-long', message: `Messages can be up to ${maxChars} characters. You could split this into two.` };
  }
  for (const rule of RULES) {
    if (rule.tests.some((re) => re.test(text))) return { ok: false, code: rule.code, message: rule.message };
  }
  return { ok: true, text };
}

const RESERVED = /(admin|moderat|hushmallow|official|support|staff|anthropic|claude|system)/i;

/** Pseudonyms: 3–20 letters/numbers (spaces, _ and - inside), nothing that looks like contact info. */
export function checkPseudonym(input) {
  const text = normaliseText(input).replace(/\s+/g, ' ');
  if (charCount(text) < 3 || charCount(text) > 20) {
    return { ok: false, code: 'length', message: 'Choose a name between 3 and 20 characters.' };
  }
  if (!/^[\p{L}\p{N}][\p{L}\p{N} _-]*[\p{L}\p{N}]$/u.test(text)) {
    return { ok: false, code: 'chars', message: 'Use letters and numbers (spaces, - and _ are fine in the middle).' };
  }
  if (/\d{4,}/.test(text)) return { ok: false, code: 'digits', message: 'Avoid long numbers, they can give away dates or phone numbers.' };
  if (RESERVED.test(text)) return { ok: false, code: 'reserved', message: 'That name is reserved. Try another.' };
  const asMessage = checkMessage(text, { maxChars: 40 });
  if (!asMessage.ok) return { ok: false, code: 'contact', message: 'Names can’t contain links or contact details.' };
  return { ok: true, text };
}
