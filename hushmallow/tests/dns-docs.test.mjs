// hushmallow.com's DNS is managed at GoDaddy, not Cloudflare (owner, 17 Oct 2026). Every setup step that adds a DNS
// record for it says so, click by click (godaddy.com → My Products → hushmallow.com → DNS → Add New Record: type,
// name or host, value, TTL default), never to change or delete the existing website, email, Stripe checkout or
// ThinkStill records, and never to change the nameservers:
//   docs/STAGING.md B13 and docs/PAYMENTS.md section 1 step 10: Stripe's custom domain checkout.hushmallow.com
//     (a CNAME with the host `checkout`, and the TXT exactly as Stripe shows it; a `checkout` record already there with
//     another value: stop and ask, never edit it);
//   supabase/production/RUNBOOK.md step 7: Brevo's records (a check in Brevo first: Authenticated) and the
//     Supabase SMTP settings (tests/auth-runbook.test.mjs has those).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = (p) => readFileSync(root + p, 'utf8');
const DOCS = ['docs/STAGING.md', 'docs/PAYMENTS.md', 'supabase/production/RUNBOOK.md'];
const flat = (s) => s.replace(/\*\*/g, '').replace(/\s+/g, ' ');

test('no step adds a hushmallow.com DNS record in Cloudflare (or sets its proxy): the DNS is at GoDaddy', () => {
  for (const p of DOCS) {
    const t = flat(read(p));
    assert.doesNotMatch(t, /Cloudflare → hushmallow\.com → DNS|DNS is on Cloudflare|Proxy status|DNS only|grey cloud \)?,? ?$/im, `${p}: a Cloudflare DNS step`);
    assert.doesNotMatch(t, /In Cloudflare → hushmallow\.com|in Cloudflare → hushmallow\.com/i, p);
    assert.match(t, /godaddy\.com → sign in → My Products → (?:next to )?hushmallow\.com,? → DNS|godaddy\.com → sign in → My Products → next to hushmallow\.com, DNS/, `${p}: the GoDaddy click path`);
    assert.match(t, /Add New Record(?: →|:) (?:\* )?Type/, `${p}: Add New Record, with its type`);
    assert.match(t, /TTL:? (?:leave )?the default/, `${p}: TTL the default`);
    assert.match(t, /[Nn]ever change or delete (?:the records already there|the existing records)/, `${p}: never touch the existing records`);
    for (const w of ['website', 'email', 'Stripe checkout', 'ThinkStill']) assert.ok(t.includes(w), `${p}: names the ${w} records`);
    assert.match(t, /[Nn]ever change the nameservers/, `${p}: never the nameservers`);
  }
});

test('checkout.hushmallow.com: a CNAME with the host `checkout`, the TXT exactly as Stripe shows it, after the client release', () => {
  for (const p of ['docs/STAGING.md', 'docs/PAYMENTS.md']) {
    const t = flat(read(p));
    assert.match(t, /Type `CNAME` · Name \((?:GoDaddy may call it )?Host\) `checkout` · Value \((?:it may read )?Points to\) exactly the target Stripe shows/, `${p}: the CNAME`);
    assert.match(t, /Type `TXT` · Name exactly as Stripe shows it, without the `\.hushmallow\.com` ending/, `${p}: the TXT's name`);
    assert.match(t, /Value exactly as Stripe shows it/, `${p}: the TXT's value`);
    assert.match(t, /already (?:there|in the list)[^.]*leave them as they are/, `${p}: records already there stay as they are`);
    // (review, 17 Oct 2026) a `checkout` record already there with another value (the owner reports Stripe checkout records
    // exist): GoDaddy refuses a second CNAME of that name, and the existing records are never changed, so the step stops
    assert.match(t, /If a `checkout` record \(of any type\), or a TXT record with Stripe's name, is already there with a different value, stop: don't add, change or delete anything/, `${p}: a conflicting record: stop`);
    assert.match(t, /GoDaddy refuses a second record named `checkout`, and the one there may be serving checkout today/, `${p}: why`);
    assert.match(t, /send Claude a screenshot of that record and of the two values Stripe shows, and wait/, `${p}: then ask`);
  }
  // the order stays: the client release, then DNS, then activation (server/another-angle/test/billing-docs.test.js)
  assert.match(read('docs/STAGING.md'), /The order is: that client release, then DNS, then activation/);
});

test('RUNBOOK step 7: Brevo is checked first (Authenticated); records only from Brevo\'s page; one SPF and one DMARC', () => {
  const rb = read('supabase/production/RUNBOOK.md');
  const t = flat(rb.slice(rb.indexOf('## 7. '), rb.indexOf('## 8. ')));
  assert.match(t, /the owner reports Brevo's records are already there, so 7a is a check/);
  assert.match(t, /Brevo → Senders, Domains & Dedicated IPs → Domains: `hushmallow\.com` reads Authenticated/);
  assert.match(t, /copying names and values from Brevo's page, never from here/);
  assert.match(t, /Only one SPF record \(`v=spf1 …`\) per name, and only one `_dmarc` record/);
  assert.match(t, /Sender email \| `no-reply@hushmallow\.com`/);
  // the app's own domain record is at GoDaddy too, and stays as it is
  assert.match(flat(rb), /`app\.hushmallow\.com` is Active\. Its DNS record is at GoDaddy \(`app` pointing to `hushmallow\.pages\.dev`\) and is already in place: leave it, and every other GoDaddy record, as it is\./);
});
