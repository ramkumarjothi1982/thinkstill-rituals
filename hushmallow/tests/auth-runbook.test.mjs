// The owner's production runbook (supabase/production/RUNBOOK.md, 16 Oct 2026): numbered steps that match
// what tools/auth/prod-readiness.mjs points to, and exactly the dashboard and Pages settings the code relies on
// (the Site URL the templates build on, 8-character passwords, a 6-digit code, the five subjects, Production-only
// public values). The runbook itself is checked by the owner; these tests keep it from drifting from the code.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

import { MIGRATIONS_NAME, RLS_CHECK_NAME } from '../tools/auth/bundle-sql.mjs';
import { SITE_URL, STEPS, BY_HAND } from '../tools/auth/prod-readiness.mjs';
import { PROJECT_URL } from '../src/auth/config.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = (p) => readFileSync(join(root, p), 'utf8');
const PROD_KEY = 'sb_publishable_NSv1Liou2yjKjauX09U5qQ_CxwzDuiw';

test('RUNBOOK.md: twelve numbered steps, and each step the checker points to is the right one', () => {
  const rb = read('supabase/production/RUNBOOK.md');
  const heads = [...rb.matchAll(/^## (\d+)\. (.+)$/gm)].map((m) => [Number(m[1]), m[2]]);
  assert.deepEqual(heads.map(([n]) => n), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  const title = (n) => heads.find(([k]) => k === n)[1];
  assert.match(title(STEPS.sql), /SQL/);
  assert.match(title(STEPS.dataApi), /Data API/);
  assert.match(title(STEPS.urls), /Site URL/);
  assert.match(title(STEPS.signup), /Sign-up/);
  assert.match(title(STEPS.check), /Check the project/);
  assert.match(title(STEPS.pages), /Cloudflare Pages/);
  assert.match(title(6), /Sessions/); assert.match(title(7), /SMTP/); assert.match(title(8), /templates/);
  for (const x of BY_HAND) for (const [, n] of x.matchAll(/step (\d+)/g)) assert.ok(heads.some(([k]) => k === Number(n)), `${x}: step ${n} exists`);
});

test('RUNBOOK.md: the dashboard settings the code relies on, exactly', () => {
  const rb = read('supabase/production/RUNBOOK.md');
  // the SQL, in one paste each, and the result it must end with
  assert.match(rb, /supabase\/production\/ALL_MIGRATIONS\.sql/);
  assert.match(rb, /supabase\/production\/RLS_CHECK\.sql/);
  assert.match(rb, /ALL 35 CHECKS PASSED\. Everything this script created was rolled back\./);
  // URL configuration: the Site URL every template builds its link on, the allow-list, never a wildcard
  assert.match(rb, /\*\*Site URL\*\*: exactly `https:\/\/app\.hushmallow\.com`, no trailing slash/);
  assert.equal(SITE_URL, 'https://app.hushmallow.com');
  for (const u of ['https://app.hushmallow.com/auth/callback', 'https://app.hushmallow.com/auth/callback/', 'https://hushmallow.pages.dev/auth/callback']) assert.ok(rb.includes(`- \`${u}\``), u);
  assert.doesNotMatch(rb, /^\s*- `https:\/\/\*\./m, 'no wildcard in the allow-list');
  for (const f of ['confirmation', 'recovery', 'email_change', 'reauthentication', 'magic_link']) assert.match(read(`supabase/templates/${f}.html`), /\{\{ \.SiteURL \}\}|\{\{ \.Token \}\}/);
  // sign-up and passwords, as the app expects them (8+ characters, a 6-digit code, confirmations on)
  for (const s of ['Confirm email on', 'Secure email change on', 'Secure password change on', 'Minimum password length 8', 'no required characters', 'Email OTP length **6**', 'Prevent use of leaked passwords', 'Allow anonymous sign-ins **off**', 'CAPTCHA off']) assert.ok(rb.includes(s), s);
  // sessions
  for (const s of ['**3600** seconds', 'Refresh token reuse interval: **10** seconds', 'Enforce single session per user: **off**']) assert.ok(rb.includes(s), s);
  // the Data API: public only, never hm_private
  assert.match(rb, /\*\*Exposed schemas\*\*: `public` only/);
  assert.match(rb, /\*\*Never\*\* `hm_private`/);
  // custom SMTP through Brevo (owner, 17 Oct 2026) with SPF / DKIM / DMARC, and the email rate limit
  for (const s of ['DKIM', 'SPF', 'DMARC', '`_dmarc`', 'Rate limit for sending emails', 'Sender name | `hushmallow`']) assert.ok(rb.includes(s), s);
  const smtp = rb.slice(rb.indexOf('## 7. '), rb.indexOf('## 8. '));
  for (const row of ['| Sender email | `no-reply@hushmallow.com` |', '| Sender name | `hushmallow` |', '| Host | `smtp-relay.brevo.com` |', '| Port | `587` |',
    '| Username | your Brevo SMTP **Login** (Brevo → SMTP & API → SMTP, 7b) |', '| Password | the Brevo **SMTP key** from 7b, pasted only here |',
    '| Minimum interval between emails | `60` seconds (the app waits 60 s before "Send it again") |']) assert.ok(smtp.includes(row), row);
  // the domain: confirm Authenticated in Brevo; any record goes in at GoDaddy (not Cloudflare), nothing existing is touched
  assert.match(smtp, /Brevo → \*\*Senders, Domains & Dedicated IPs\*\* → \*\*Domains\*\*: `hushmallow\.com`\s+reads \*\*Authenticated\*\*/);
  assert.match(smtp, /\*\*godaddy\.com\*\* → sign in → \*\*My Products\*\* → next to \*\*hushmallow\.com\*\*,\s+\*\*DNS\*\*/);
  assert.match(smtp, /\*\*Add New Record\*\* → \*\*Type\*\*[\s\S]*\*\*Name\*\*[\s\S]*\*\*Value\*\*[\s\S]*\*\*TTL\*\*: leave the default/);
  assert.match(smtp, /\*\*Never change or delete the records already there\*\*: the website's, the\s+email's[^.]*Stripe checkout's and\s+ThinkStill's\. \*\*Never change the nameservers\.\*\*/);
  assert.doesNotMatch(rb, /Resend|Postmark|hello@hushmallow\.com|DNS only|grey cloud/, 'no other provider, sender or Cloudflare DNS step');
  // the Brevo login and key go only into Supabase: neither is ever written here
  assert.doesNotMatch(rb, /xsmtpsib-|xkeysib-|@smtp-brevo\.com/, 'no Brevo key or SMTP login in the runbook');
  assert.match(rb, /The one\s+secret in this runbook is the Brevo SMTP key, and it goes \*\*only\*\* into\s+Supabase's SMTP settings \(step 7\)/);
  // the five branded templates: Authentication → Emails → Templates
  assert.match(rb.slice(rb.indexOf('## 8. '), rb.indexOf('## 9. ')), /Authentication → Emails → \*\*Templates\*\*: the five branded templates in this\s+repository's `supabase\/templates\/`/);
  // Cloudflare Pages: the two public values on Production only
  assert.ok(rb.includes(`\`SUPABASE_URL\` = \`${PROJECT_URL}\``));
  assert.ok(rb.includes(`\`SUPABASE_PUBLISHABLE_KEY\` = \`${PROD_KEY}\``));
  assert.ok(read('docs/AUTH.md').includes(`\`${PROD_KEY}\``), 'the same publishable key as docs/AUTH.md');
  assert.match(rb, /Production only/);
  assert.match(rb, /\*\*Preview\*\*: no `SUPABASE_URL` and no `SUPABASE_PUBLISHABLE_KEY`/);
  // the checks
  assert.match(rb, /node hushmallow\/tools\/auth\/prod-readiness\.mjs --app https:\/\/app\.hushmallow\.com/);
  assert.match(rb, /\[auth\] sign-in is hidden: …/);
});

test('RUNBOOK.md: the five templates with the subjects their files (and the local stack) use', () => {
  const rb = read('supabase/production/RUNBOOK.md');
  const toml = read('supabase/config.toml');
  for (const f of ['confirmation', 'recovery', 'email_change', 'reauthentication', 'magic_link']) {
    const subject = /Subject:\s*([^\n]*?)\s*-->/.exec(read(`supabase/templates/${f}.html`))[1];
    const row = rb.split('\n').find((l) => l.includes(`\`${f}.html\``) && l.startsWith('|'));
    assert.ok(row, `${f}.html has a row`);
    assert.ok(row.includes(`| ${subject} |`), `${f}.html: "${subject}"`);
    assert.ok(toml.includes(`subject = "${subject}"`), `${f}.html: config.toml agrees`);
  }
});

test('RUNBOOK.md and the bundle keep the brand and never hold a secret', () => {
  for (const p of ['supabase/production/RUNBOOK.md', `supabase/production/${MIGRATIONS_NAME}`, `supabase/production/${RLS_CHECK_NAME}`, 'tools/auth/prod-readiness.mjs', 'tools/auth/bundle-sql.mjs']) {
    const s = read(p);
    assert.doesNotMatch(s, /Hushmallow|HushMallow|HUSHMALLOW/, `${p}: always lowercase hushmallow`);
    assert.doesNotMatch(s, /\b(Premium|Ultra|Paid)\b/, `${p}: no internal plan words`);
    assert.doesNotMatch(s, /sb_secret_[A-Za-z0-9_-]{8,}|sbp_[a-f0-9]{20,}/, `${p}: no secret`);
  }
});
