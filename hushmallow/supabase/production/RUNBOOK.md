# hushmallow accounts · production runbook (project hushmallow1)

What this does: switches on optional sign-up, sign-in and the opt-in sync on
`https://app.hushmallow.com`, against the Supabase project **hushmallow1**
(ref `igbxbfuaoybfzsroxuln`, Sydney). About 30 minutes of clicks, plus
however long your DNS takes to verify the email domain. Distilled from
`docs/AUTH.md` (the full reference) and `supabase/README.md`.

Do the steps **in order**. Cloudflare Pages comes last on purpose: the app
shows sign-in to everyone as soon as the live build has the two public values
*and* the project is ready (the app asks the project itself, `src/auth/readiness.js`).
Until then guests see exactly today's app.

You need: the Supabase dashboard (owner of hushmallow1), the Cloudflare
dashboard (Pages project `hushmallow`), the DNS for `hushmallow.com`, an
account with an email provider (step 7), Node 22 and a checkout of this
repository (for the SQL files and the checker), your own email address, a
second address, and a second device (a phone).

Never needed, never paste anywhere: a Supabase secret key (`sb_secret_…`),
the service_role key, an access token or the database password. The one
secret in this runbook is the SMTP password, and it goes **only** into
Supabase's SMTP settings (step 7).

Dashboard labels move now and then; if one is not where this says, search
the dashboard for the setting's name.

## 1. Open the right project (1 min)

- [ ] supabase.com/dashboard → project **hushmallow1**. The address bar must
      contain `/project/igbxbfuaoybfzsroxuln` and the region must be Sydney
      (ap-southeast-2). Not the old Singapore project: it is not used for anything.
- [ ] Project Settings → API Keys → **Publishable key**: it must be
      `sb_publishable_NSv1Liou2yjKjauX09U5qQ_CxwzDuiw` (public by design; Row
      Level Security protects the data). Copy it for steps 9 and 10.
- [ ] Organization → Billing: note the plan. On the **Free** plan a project
      with no activity for a week is paused (sign-in then hides itself and
      signed-in people drop to guest) and leaked-password protection is not
      available. For real people, **Pro** is recommended.

## 2. Run the SQL (5 min)

The two files are generated from `supabase/migrations/` and
`supabase/tests/rls_check.sql`, byte for byte (`tools/auth/bundle-sql.mjs`;
a test fails if they ever differ).

- [ ] SQL Editor → **New query**. Paste the whole of
      `supabase/production/ALL_MIGRATIONS.sql` (migrations 0001 … 0009, in
      order). The role next to Run must be `postgres` (the default).
- [ ] **Run**. The editor warns about a "destructive operation" (the
      scripts replace their own policies and triggers; they never drop data):
      choose **Run this query**. Expect `Success. No rows returned`.
      An error: nothing after that migration ran. Read the message (`0001`
      stops at once, changing nothing, if the role cannot bypass row level
      security), fix the cause, and run the whole file again: every migration
      is safe to run twice.
- [ ] **New query** again. Paste the whole of `supabase/production/RLS_CHECK.sql`
      → **Run**. The result is one column, `rls_check`: 35 `PASS` lines,
      and the last row must read
      **`ALL 35 CHECKS PASSED. Everything this script created was rolled back.`**
      Any `FAIL`, or another number: stop here and do not go on.
- [ ] (Optional) `select * from hm_private.schema_migrations order by version;`
      lists 1 … 9.

## 3. Data API: exposed schemas (1 min)

Project Settings → **Data API** (older dashboards: Settings → API).

- [ ] **Enable Data API**: on.
- [ ] **Exposed schemas**: `public` only. (`graphql_public`, if the
      dashboard lists it by default, exposes nothing of ours and may stay.)
      **Never** `hm_private`.
- [ ] Extra search path `public, extensions` and max rows `1000` (the defaults). Save.

## 4. URL configuration: Site URL and redirect allow-list (2 min)

Authentication → **URL Configuration**.

- [ ] **Site URL**: exactly `https://app.hushmallow.com`, no trailing slash
      (a slash would make every email link `…com//auth/callback`). Save.
      Every email link is built on it: `{{ .SiteURL }}/auth/callback?token_hash=…`,
      so one-time tokens only ever reach the production app.
- [ ] **Redirect URLs** → Add URL, exactly these:
      - `https://app.hushmallow.com/auth/callback`
      - `https://app.hushmallow.com/auth/callback/`
      - `https://hushmallow.pages.dev/auth/callback` (the production build's own pages.dev address)
- [ ] Remove anything else (a `localhost:3000` left from setup, and **never**
      a wildcard such as `**` or `https://*`). Previews get no entry: they run
      without sign-in (step 10). Save.

## 5. Sign-up and passwords (3 min)

Authentication → **Sign In / Providers**.

- [ ] **User Signups**: Allow new users to sign up **on** · Allow manual
      linking **off** · Allow anonymous sign-ins **off** · **Confirm email on**. Save.
- [ ] **Email** (the provider row) → Enable Email provider **on** ·
      **Secure email change on** · **Secure password change on** (Supabase asks
      for an emailed code only on a session more than 24 hours old; the app
      always asks for the current password first) · **Minimum password length 8** ·
      Password requirements: **no required characters** · Email OTP expiration
      **3600** seconds · Email OTP length **6** (the app says "Six digits"). Save.
- [ ] **Prevent use of leaked passwords**: on (here or under Authentication →
      Attack Protection; Pro plan). The app already words that refusal
      ("That password is easy to guess…").
- [ ] Every other provider (Phone, Google, Apple, …): **off**. Google comes
      later (docs/AUTH.md, "Google, later").
- [ ] Authentication → Attack Protection → **CAPTCHA off**. The app sends no
      captcha token yet: with CAPTCHA on, every sign-up and sign-in fails.

## 6. Sessions and tokens (1 min)

Authentication → **Sessions** (some dashboards keep the token expiry under
Project Settings → JWT Keys).

- [ ] Access token (JWT) expiry: **3600** seconds (the default).
- [ ] Detect and revoke potentially compromised refresh tokens (rotation): **on** ·
      Refresh token reuse interval: **10** seconds (the defaults).
- [ ] Enforce single session per user: **off** (people use more than one
      device, and the current-password check signs in once more on the side:
      with this on it would end the person's real session).
- [ ] Time-box user sessions: **off** · Inactivity timeout: **off** (or 30 days).

## 7. Email: custom SMTP, DNS and the rate limit (10 min + DNS)

**Required before real people sign up.** Supabase's built-in mailer only
sends to members of the project's team: anyone else's sign-up is refused and
the app reads "That email doesn't look quite right." It is also limited to a
few emails an hour.

Pick a transactional provider. Either works; take the first unless you have a reason:
* **Resend**: quickest to set up, a free tier that covers a launch.
* **Postmark**: transactional only, very good deliverability; a new account
  sends only to your own domain until Postmark approves it (allow a day).

7a. At the provider:
- [ ] Add the domain **`hushmallow.com`** and choose the sender
      **`hello@hushmallow.com`** (a real inbox you read: people reply to these
      emails). Resend: pick the region nearest Sydney it offers.
- [ ] Add the DNS records it shows to `hushmallow.com` (template below).
      Copy names and values **from the provider's page**, never from here.
      Wait until the provider says **Verified**.
- [ ] Create the SMTP credential: Resend → an API key with sending access
      for hushmallow.com only; Postmark → the server's API token.

DNS template for `hushmallow.com` (names are relative to the domain; if the
DNS is on Cloudflare, every record is **DNS only**, grey cloud):

| Type | Name | Value | What it is |
|---|---|---|---|
| TXT | `resend._domainkey` (Resend) or `<selector>pm._domainkey` (Postmark, e.g. `20261016123456pm._domainkey`) | `p=MIGfMA0G…` / `k=rsa; p=MIGf…`, the public key the provider shows | **DKIM**: signs every email for hushmallow.com |
| MX | `send` (Resend) | `feedback-smtp.<region>.amazonses.com`, priority `10` | bounces for the sending subdomain |
| TXT | `send` (Resend) | `v=spf1 include:amazonses.com ~all` | **SPF** for the sending subdomain |
| CNAME | `pm-bounces` (Postmark) | `pm.mtasv.net` | Return-Path: bounces, and **SPF** alignment |
| TXT | `_dmarc` | `v=DMARC1; p=none; rua=mailto:hello@hushmallow.com; adkim=r; aspf=r` | **DMARC**: start with `p=none`; after two clean weeks of reports, `p=quarantine` |

* Only **one** SPF record (`v=spf1 …`) per name. If `hushmallow.com` itself
  already has one (a mailbox provider for `hello@`), leave it as it is: the
  records above live on subdomains and do not touch it.
* Only one `_dmarc` record: if there is one already, keep it (or tighten it).

7b. In Supabase, Authentication → Emails → **SMTP Settings** → Enable custom SMTP **on**:

| Field | Resend | Postmark |
|---|---|---|
| Sender email | `hello@hushmallow.com` | `hello@hushmallow.com` |
| Sender name | `hushmallow` | `hushmallow` |
| Host | `smtp.resend.com` | `smtp.postmarkapp.com` |
| Port | `465` | `587` |
| Username | `resend` | the server API token |
| Password | the API key | the server API token |
| Minimum interval between emails | `60` seconds (the app waits 60 s before "Send it again") | `60` |

- [ ] Save.
- [ ] Authentication → **Rate Limits** → Rate limit for sending emails:
      raise it to fit, e.g. **100 per hour** (the default with custom SMTP
      is about 30). Leave the other limits at their defaults. Save.

## 8. Email templates (5 min)

Authentication → Emails → **Templates**. For each row: open the template,
set **Subject**, replace the **body** with the whole file from
`supabase/templates/` (its first line is a comment; it may stay), Save.

| Template in the dashboard | Subject | File |
|---|---|---|
| Confirm signup | Confirm your hushmallow account | `confirmation.html` |
| Reset Password | Reset your hushmallow password | `recovery.html` |
| Change Email Address | Confirm your new email for hushmallow | `email_change.html` |
| Reauthentication | Your hushmallow code | `reauthentication.html` |
| Magic Link | Your hushmallow sign-in link | `magic_link.html` |

- [ ] Each link in the bodies reads `{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&amp;type=…`
      (Reauthentication shows `{{ .Token }}`). Leave "Invite user" as it is: the app never invites.
- [ ] (If offered) Authentication → Emails → security notifications:
      **Password changed** on, so an account hears when its password changes.

## 9. Check the project from your computer (1 min)

From the repository root:

```
SUPABASE_PUBLISHABLE_KEY=sb_publishable_NSv1Liou2yjKjauX09U5qQ_CxwzDuiw node hushmallow/tools/auth/prod-readiness.mjs
```

Read only: GET requests with the publishable key, nothing is changed. It
asks exactly what the app asks before it shows sign-in, then every table
(there, and closed to anonymous visitors), that the Data API does not expose
`hm_private`, Auth's public settings (email on, sign-ups allowed, Confirm email
on, anonymous sign-ins off), and the Site URL and allow-list as Auth applies
them (it sends Auth two made-up email links that verify nothing, so the Auth
logs show two "invalid link" lines: expected).

- [ ] Every line `PASS`, last line `RESULT  READY`. Each `FAIL` names the step
      that fixes it. Then tick the list it prints of what the key cannot read
      (password rules, SMTP, templates, sessions): steps 2 and 5–8.

## 10. Cloudflare Pages: the two public values, Production only (3 min)

Workers & Pages → **hushmallow** → Settings → **Variables and Secrets**.

- [ ] **Production** → Add, type **Text** (both values are public):
      - `SUPABASE_URL` = `https://igbxbfuaoybfzsroxuln.supabase.co`
      - `SUPABASE_PUBLISHABLE_KEY` = `sb_publishable_NSv1Liou2yjKjauX09U5qQ_CxwzDuiw`
      - `NODE_VERSION` = `22` (recommended)
      Save.
- [ ] **Preview**: no `SUPABASE_URL` and no `SUPABASE_PUBLISHABLE_KEY`. A
      request on 13 Oct 2026 (`tools/infra/PAGES_ENV`) asked for them on Production
      **and** Preview: if they are there, delete both from Preview.
- [ ] Never add `HM_AUTH_MODE` (local test builds only), a secret /
      service_role key or `SUPABASE_ACCESS_TOKEN` (the build refuses to
      publish while a Supabase secret or token is in its environment).
- [ ] Deployments → the latest **Production** deployment → ⋯ → **Retry
      deployment** (new values only reach a new build). Wait for Success.
- [ ] Custom domains: `app.hushmallow.com` is **Active**.

**Why previews run without sign-in (recommended).** A preview is built from
any branch, reviewed or not, and published on a public `*.hushmallow.pages.dev`
address. With the production values it would run unreviewed code against the
real accounts (Row Level Security still holds, but a preview could still
sign real people in, write their synced rows or delete their accounts). It
would not even test sign-in well: every email link opens production, by
design. The app accepts no other project (`src/auth/config.js`), so the
choice is production or nothing; without the two values a preview builds
`{ enabled: false }` and runs exactly as today. Sign-in itself is tested on
a local Supabase stack (the CI E2E, docs/AUTH.md). If previews with sign-in
are wanted later, that means a second, staging project and a change to
`src/auth/config.js`.

## 11. Verify on the live app (10 min)

- [ ] The checker again, now with the site:
      `SUPABASE_PUBLISHABLE_KEY=sb_publishable_NSv1Liou2yjKjauX09U5qQ_CxwzDuiw node hushmallow/tools/auth/prod-readiness.mjs --app https://app.hushmallow.com`
      → every line `PASS` (the live build has sign-in on for this project and
      key; `/auth/callback/` is never cached, never framed, sends no referrer and
      its CSP reaches the project; `/auth/callback` keeps the link's query; no
      CSP on the root page blocks sign-in).
- [ ] A **new** private window → `https://app.hushmallow.com`. As a guest
      everything is as before; the network panel shows no request to
      `supabase.co` until you open Settings (two small readiness questions) or `/#account`.
- [ ] Settings → Privacy: the top row reads "Sign in or create an account".
      No row? The console says why: `[auth] sign-in is hidden: …`. Fix that
      step, then open a **new** tab: the answer is kept for the tab's session.
- [ ] Create an account with your own address and a name → "Check your email"
      shows it; "Send it again" counts down.
- [ ] The email arrives from `hello@hushmallow.com`, subject "Confirm your
      hushmallow account", not in spam (Gmail → Show original: SPF, DKIM and
      DMARC `PASS`). Its button opens `https://app.hushmallow.com/auth/callback?token_hash=…&type=email`.
- [ ] Open it **on the phone**: "You're in", then the account screen there.
      The same link again: "expired or already used".
- [ ] Back on the computer: "I've confirmed it: sign in" → a wrong password
      first ("That email and password don't match…"), then the right one →
      signed in. **Reload: still signed in.** Close the browser and come back
      the next day: still signed in.
- [ ] Supabase → Authentication → Users: your user, confirmed. Table Editor →
      `profiles`: one row (your name). `sync_consents`: no row until you touch a switch.
- [ ] Sign out → a guest again. Forgot your password → the email "Reset your
      hushmallow password" → its link → a new password → signed in.
- [ ] Account → Delete my account → type `delete`: Authentication → Users no
      longer lists it; no rows remain for it.
- [ ] When you have an hour: the full 23 steps in `docs/AUTH.md`, "Manual
      checklist" (two accounts on one phone, the sync switches, password change
      on a day-old session, two tabs).
- [ ] Delete the test accounts you made (Authentication → Users).

## 12. If something is wrong

| What you see | Why | Fix |
|---|---|---|
| No sign-in row in Settings, and `/#account` stays on the Hushfold | the readiness gate: the console line `[auth] sign-in is hidden: …` names it | steps 2 and 5, then a new tab |
| "That email doesn't look quite right." for a real address | the built-in mailer (only the team gets email) | step 7 |
| No email at all | SMTP host, port or password; the domain not verified; spam | Supabase → Logs → Auth, and the provider's own log |
| "Let's take a short breather. Try again in a minute." | an email or sign-in rate limit | step 7 (Rate Limits) |
| "New accounts are paused for now." | sign-ups or the email provider switched off | step 5 |
| The link opens `…com//auth/callback` or another site | the Site URL | step 4 |
| "This link has expired or was already used" at once | the link was already opened, or a newer email replaced it (only the newest works) | ask for a new one, open the newest |
| A sign-in that keeps ending | time-box, inactivity timeout or single session on | step 6 |

**Switching off again.** Quick, sign-ups only: step 5, "Allow new users to
sign up" off (people who have an account still sign in; new ones read
"New accounts are paused for now"). Everything: delete the two Production
values in Cloudflare Pages and retry the deployment; the app is guest-only
again and every account and row stays in Supabase. Removing the tables
too: `supabase/README.md`, "Rollback".

## Known gaps (not fixed by this runbook)

* **Safari (not a Home Screen app) clears a site's storage after seven days
  of Safari use without a visit**, which signs the person out and also
  clears a guest's things. Adding hushmallow to the Home Screen avoids it.
* The **Framer embed** (`hushmallow.com`) runs the app in a cross-site frame
  with its own partitioned storage: a sign-in there is separate from
  `app.hushmallow.com`. Offer sign-in in the app itself.
* **No CAPTCHA**, so nothing stops a script from signing up addresses
  other than "Confirm email" and the rate limits.
* An **account deleted on another device** can leave its copy on a phone
  whose access token had already expired (docs/AUTH.md, Known limits).
* A **root-page Content-Security-Policy** (the security-headers work, not
  merged) must keep `https://igbxbfuaoybfzsroxuln.supabase.co` in
  `connect-src`; the checker's `--app` run says so if it does not.
* No email change screen, no data export, no MFA, no Google yet.
