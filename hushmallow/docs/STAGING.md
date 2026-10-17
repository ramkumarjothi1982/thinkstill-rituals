# Staging: the full rehearsal on the release branch's preview

The release branch `claude/launch-rc` is built by Cloudflare Pages as a branch preview at
**https://claude-launch-rc.hushmallow.pages.dev**. That preview is the staging app: it talks to the
**staging** Another Angle Worker, **https://hushmallow-another-angle-staging.vibyfy-chat.workers.dev**,
for Another Angle (the real model) and for web subscriptions. Billing is on there, in the **Stripe sandbox
hushmallow-staging** (test mode).
It is the place to rehearse the whole path before anything reaches production:

visit → sign up → log in → choose a plan → pay (Stripe test card) → use the plan → Another Angle with
the real model → save progress → come back → manage the subscription.

**Production does not change.** `app.hushmallow.com`, the production alias `hushmallow.pages.dev`,
`hushmallow.com`, the GitHub Pages copy and localhost keep exactly the production settings: the production
Worker, the production sign-in project hushmallow1, and billing off (`BILLING_PROVIDER = ''`). Production's
Worker stays on `ENTITLEMENT_MODE = "testing"` with no billing values. Switching production on is a separate
step, in `docs/PAYMENTS.md`.

**Staging shares nothing with production.** Each has its own:

| | Staging (branch previews) | Production |
|---|---|---|
| Accounts (Supabase) | its own project **hushmallow-staging** (ref `oghzabvkrxsejkkjdsuc`, Singapore, Free plan), with its own test accounts | **hushmallow1** (ref `igbxbfuaoybfzsroxuln`, Sydney) |
| Server (Cloudflare Worker) | `hushmallow-another-angle-staging` | `hushmallow-another-angle` |
| Model key (Anthropic) | its own key **hushmallow-staging**, with its own low monthly limit (GitHub secret `ANTHROPIC_API_KEY_STAGING`) | `ANTHROPIC_API_KEY` |
| Tester codes | `TESTER_INVITE_CODES_STAGING` | `TESTER_INVITE_CODES` |
| Stripe | its own **sandbox, hushmallow-staging** (test mode): its own keys, products, portal, tax settings and webhook endpoint | live mode, later (`docs/PAYMENTS.md`) |

The staging project exists: the owner created it on 17 Oct 2026, and its two public values are committed
(`src/auth/config.js`, `server/another-angle/src/config.js`, `[env.staging.vars]`). Until its database and
sign-in settings are in (A2, A3) and the preview is rebuilt without production's values (A5), the preview
has **no working sign-in** (and so no billing). It never falls back to production's accounts.

**Singapore, not Sydney (accepted, 17 Oct 2026).** The staging project was created in Singapore
(`ap-southeast-1`) with a name Supabase generated. It is used as it is, without recreating it: it only ever
holds test accounts made for the rehearsal, nothing else in staging depends on the region, and the code calls
it `hushmallow-staging` whatever its dashboard name is (it may be renamed in the dashboard at any time;
nothing changes). Production's hushmallow1 stays in **Sydney**, and so do real people's accounts
(`docs/integration/DECISIONS.md`). Real people's data never goes into the staging project.

## How the preview knows it is staging

| | A branch preview (`<one label>.hushmallow.pages.dev`) | Everywhere else |
|---|---|---|
| Another Angle | the staging Worker (`STAGING_ANGLE_ENDPOINT`), allowed only on `STAGING_ALLOWED_HOSTS` | the production Worker (`ANGLE_ENDPOINT` on `ANGLE_ALLOWED_HOSTS`), as before |
| Web subscriptions | **on**: the Stripe sandbox, through the staging Worker | **off** (`BILLING_PROVIDER = ''`) until the owner switches production on |
| Prices on the plans page | the owner's US-dollar prices below | none (they show only where billing is on) |
| Settings → version line | `Version … · staging` | `Version …`, as before |
| Sign-in (accounts) | **only** the staging project hushmallow-staging (`https://oghzabvkrxsejkkjdsuc.supabase.co`) | **only** hushmallow1, as before |
| Content-Security-Policy | the same policy, with the staging Worker in `connect-src` instead of production, and the staging project | today's policy, unchanged |

* **The host rule** (`src/app/config.js`, `isPreviewHost`): https, no port, and exactly **one** DNS label in
  front of `.hushmallow.pages.dev`. So `claude-launch-rc.hushmallow.pages.dev` is a preview, and so is a
  deployment's own address (`<hash>.hushmallow.pages.dev`, for any branch, `main` included). Not
  `hushmallow.pages.dev` (the production alias), not `a.b.hushmallow.pages.dev`, and not any other domain.
  The `_headers` rule for previews (`https://:preview.hushmallow.pages.dev/*`) matches the same hosts:
  a Pages host placeholder is one label.
* **The branch alias:** Pages lowercases the branch name and turns every character that is not a letter or
  digit into `-`. So `claude/launch-rc` becomes `claude-launch-rc` (as `claude/upbeat-pasteur-b0aqg1`
  became `claude-upbeat-pasteur-b0aqg1`, the address the infra probe uses). Pages shortens a very long
  branch name, so for another branch check its alias in Pages → hushmallow → Deployments before you add it to
  the Worker's origins.
* **Each side only on its own allow-list.** A preview can never reach the production Worker, and production
  can never reach staging. The production Worker does not accept preview origins anyway.
* **Accounts, checked three times** (`src/auth/config.js`, `tools/site/auth-config.mjs`, the Worker):
  * **In the browser:** a branch preview accepts only the staging project; every other host only
    hushmallow1. The other project switches sign-in off, and the sign-in code's one network function only
    ever reaches the project the page accepted. So a production address on a preview, or the staging
    address on production, is refused, never used.
  * **At build time:** Cloudflare Pages tells the build which branch it is building (`CF_PAGES_BRANCH`). A
    build of any branch other than `main` may only publish the staging project's values; a build of `main`
    (and any build outside Pages) only hushmallow1's. A branch build that is given **neither**
    `SUPABASE_URL` nor `SUPABASE_PUBLISHABLE_KEY` publishes the staging project committed in
    `src/auth/config.js` (`STAGING_PROJECT_URL` and `STAGING_PUBLISHABLE_KEY`, both public), so the Preview
    environment needs no sign-in variables; its log says
    `auth config: sign-in on: https://oghzabvkrxsejkkjdsuc.supabase.co (the staging project hushmallow-staging, from src/auth/config.js: …)`.
    A build of `main`, or outside Pages, given neither value still builds without sign-in: it never falls
    back to anything. A branch build that is given hushmallow1's values does
    not publish them: it builds without sign-in and its log says
    `auth config: WARNING: SUPABASE_URL is the production project hushmallow1 …`. Staging values on `main`
    stop the build (production keeps its last good deploy). Everything the build refused before (a secret
    key, a service_role key, another project, half of the pair, a malformed value) it still refuses, on every
    branch.
  * **On the staging Worker:** `ACCOUNTS_STAGE = "staging"` means it accepts only the staging project's
    accounts (`STAGING_SUPABASE_PROJECT_URL` in `server/another-angle/src/config.js`), never hushmallow1's.
  * A deployment's own address (`<hash>.hushmallow.pages.dev`) counts as a preview, `main`'s included: a
    `main` deployment opened at its own hash address therefore has sign-in off (it carries production's
    values, which a preview never accepts). `app.hushmallow.com` and `hushmallow.pages.dev` are not affected.
* **Prices** (`BILLING_PRICES` in `src/app/config.js`, the one place they are written), in **US dollars**
  (the owner's decision, 2026-10-17; no longer Australian dollars):

  | Plan | Monthly | Yearly |
  |---|---|---|
  | hushmallow Flow | US$9.99 | US$99.99 |
  | hushmallow Beyond | US$19.99 | US$199.99 |

  The plans page shows "US$9.99 a month" and so on under each button (display only). The amount Stripe
  charges is always the one set in Stripe, so the prices there hold the same amounts (B4): the Worker sells a
  price only at its slot's amount, and the sandbox driver compares the two (P0).

## The staging Worker (`[env.staging]` in `server/another-angle/wrangler.toml`)

Only the staging environment changed:

* `ALLOWED_ORIGINS` adds `https://claude-launch-rc.hushmallow.pages.dev`. The GitHub Pages copy, the old
  `claude-upbeat-pasteur-b0aqg1` preview and `localhost:8000` stay.
* `ENTITLEMENT_MODE = "billing+testing"`. Another Angle opens for an account with an active (test)
  hushmallow Beyond subscription, **or** with one of `TESTER_INVITE_CODES` (a testing session, as before).
  Without invite codes set, it opens for subscribers only.
* `ACCOUNTS_STAGE = "staging"`, `SUPABASE_URL = "https://oghzabvkrxsejkkjdsuc.supabase.co"` and
  `SUPABASE_PUBLISHABLE_KEY = "sb_publishable_Sn4YKE3TRTzMkWVN9i45_A_MYYxxirc"`: the staging project's two
  public values (17 Oct 2026; the publishable key is public by design). Nothing of hushmallow1 is there. The
  Worker accepts only accounts of the project `server/another-angle/src/config.js` names
  (`STAGING_SUPABASE_PROJECT_URL`, the same URL). A `TODO` value (what was there before) would still count as
  "accounts not configured": it never asks any sign-in project, every billing route answers
  `503 accounts_not_configured`, and `/v1/health` shows `"accounts_configured": false`. So until the staging
  Worker is redeployed with these values, its health still says that.
* Its secrets come from the **staging** repository secrets: the deploy
  (`.github/workflows/another-angle-staging.yml`) sets `ANTHROPIC_API_KEY` from `ANTHROPIC_API_KEY_STAGING`
  and `TESTER_INVITE_CODES` from `TESTER_INVITE_CODES_STAGING`, never from production's `ANTHROPIC_API_KEY` /
  `TESTER_INVITE_CODES`. A staging secret that is missing is **not** set or overwritten: the Worker keeps
  whatever it already has, and the run's summary says so. Until A6 is done, that is a copy of production's
  key, set by earlier deploys: replace it (A6).
* `APP_ORIGIN = "https://claude-launch-rc.hushmallow.pages.dev"`, so Stripe sends people back to the preview.
* `STRIPE_PRICE_PAID_MONTHLY`, `STRIPE_PRICE_PAID_YEARLY`, `STRIPE_PRICE_ULTRA_MONTHLY` and
  `STRIPE_PRICE_ULTRA_YEARLY` hold **the owner's four prices** (2026-10-17, in US dollars). This Worker takes
  a test key only, so they must be the sandbox's (test-mode) prices, and **whether they are is not verified
  yet** (`hushmallow/STRIPE_INTEGRATION_TODO.md`). A live-mode id answers the test key "No such price":
  checkout's price check refuses it (`503 price_misconfigured`, `"err":"not_found"` in the log line) and the
  sandbox driver's preflight (P0) names the slot. If they are live mode's, make the same four in the sandbox
  (B4) and send Claude their ids (B10). A `price_TODO…` value would still count as unset (never sent to
  Stripe; `/v1/health` then says `"placeholder_prices"`), and so would one id pasted into two slots (neither
  slot is sold; `/v1/health` says `"duplicate_prices"`, and the tests refuse it in `wrangler.toml`). Another
  Angle also works for testers with an invite code, with or without billing.
* `STRIPE_API_VERSION = "2026-08-26.dahlia"`: the API version of the Worker's own Stripe requests, and the one
  the staging webhook endpoint is created on (B11). `STRIPE_AUTOMATIC_TAX = "false"` (the Checkout Studio's
  value): Stripe Tax at Checkout stays off until a registration in the sandbox shows Collecting and a test
  calculation passes (B3, `docs/PAYMENTS.md` "Stripe Tax").
* Its Stripe key must be a **test** key (`rk_test_…`, B8). The staging Worker refuses a live key: billing stays
  off and `/v1/health` says `"key_refused": "live_key_on_staging"`. `BILLING_LIVE` never goes in
  `[env.staging.vars]` (the tests refuse it).

The staging Worker keeps its own limits: the real model, a **$3 a day** spending cap, 20 angles a day per
device or subscriber, 100 sessions a day in all, 10 new testing sessions a day per network.

## Owner steps

Two parts:

* **Part A (A1 to A7): staging gets its own accounts, model key and tester codes**, so nothing is shared
  with production. A1 and A4 are done (17 Oct 2026: the project exists and its public values are
  committed). Do A2 and A3 now, then A5. A6 and A7 can be done at any time, the sooner the better: until A6
  is done, the staging Worker still holds a copy of production's model key.
* **Part B (B1 to B14): the Stripe sandbox hushmallow-staging**, click by click. B11 (the webhook endpoint)
  comes only after Claude says the staging Worker is deployed with the price ids, and B12 only if Claude should
  run the sandbox driver from its cloud session. "Where email links land" says where the staging project's
  email links open.

Never needed at all: a Supabase secret key (`sb_secret_…`), the service_role key, a database password, a
Stripe publishable key (`pk_…`: the app never loads Stripe.js, so the one sent earlier is not added
anywhere). The Anthropic key (A6), the Stripe keys (B8, B12) and the webhook signing secret (B11) are secrets:
they go only where a step puts them (a GitHub **New repository secret**, the staging Worker's **Variables and
Secrets** in Cloudflare, or the cloud session's network secrets in B12), never into a chat, a file, a doc or a
commit. The only values Claude needs are public: the staging project's URL and its publishable key (A4), and
the Stripe price ids (B10: the owner's four of 2026-10-17 are already in; new ones only if those are live mode's).

Dashboard labels move now and then; if one is not where this says, search the dashboard for the setting's
name.

### A1. Supabase: the staging project (done, 17 Oct 2026)

The owner created it on the Free plan. Its facts, for every step below:

| | |
|---|---|
| Project URL | `https://oghzabvkrxsejkkjdsuc.supabase.co` |
| Project ref | `oghzabvkrxsejkkjdsuc` (the address bar shows `/project/oghzabvkrxsejkkjdsuc`) |
| Publishable key | `sb_publishable_Sn4YKE3TRTzMkWVN9i45_A_MYYxxirc` (public by design) |
| Region | Singapore (`ap-southeast-1`), accepted for staging (above); production stays in Sydney |
| Name in the dashboard | generated by Supabase; renaming it to `hushmallow-staging` (Project Settings → General) is optional and changes nothing in the code |

It is not production: production's ref is `igbxbfuaoybfzsroxuln` (hushmallow1). Before each step below, check
that the address bar shows `/project/oghzabvkrxsejkkjdsuc`. (A Free project with no activity for a week is
paused: the preview then cannot sign in until you open the project and click **Restore project**.)

### A2. Supabase: the database, the same SQL as production (5 min)

The two files are the ones production uses; they are not tied to one project (their first lines name
hushmallow1, but they are just as right for the staging project). The tests keep them exact:
`tests/auth-bundle.test.mjs` checks that `ALL_MIGRATIONS.sql` is migrations 0001 to 0009 byte for byte, and
`RLS_CHECK.sql` is `supabase/tests/rls_check.sql`. Run them in the project whose address bar shows
**`/project/oghzabvkrxsejkkjdsuc`**, never in hushmallow1.

1. **SQL Editor** → **New query**. Paste the whole of `supabase/production/ALL_MIGRATIONS.sql`. The role
   next to **Run** must be `postgres` (the default).
2. Click **Run**. If the editor warns about a "destructive operation", choose **Run this query**. Expect
   `Success. No rows returned`.
3. **New query** again. Paste the whole of `supabase/production/RLS_CHECK.sql` (the production bundle's copy
   of `supabase/tests/rls_check.sql`) → **Run**. The last row must read
   **`ALL 35 CHECKS PASSED. Everything this script created was rolled back.`**
   Any `FAIL`, or another number: stop and tell Claude.
4. **Project Settings** → **Data API**: **Exposed schemas** `public` only (never `hm_private`). Save.

### A3. Supabase: sign-in settings for the preview (5 min)

Still in the staging project (`/project/oghzabvkrxsejkkjdsuc`):

1. **Authentication** → **URL Configuration**:
   * **Site URL**: `https://claude-launch-rc.hushmallow.pages.dev` (exactly, no trailing slash). Save.
     Every email link is built on it (`{{ .SiteURL }}/auth/callback?token_hash=…`), so this project's
     emails open the **preview's own** `/auth/callback` page, and only that.
   * **Redirect URLs** → **Add URL**, exactly these two:
     * `https://claude-launch-rc.hushmallow.pages.dev/auth/callback`
     * `https://claude-launch-rc.hushmallow.pages.dev/auth/callback/`

     Nothing else: no wildcard, no `localhost`, and never `app.hushmallow.com`. Save.
2. **Authentication** → **Sign In / Providers**, the same as production (`supabase/production/RUNBOOK.md`
   step 5): Allow new users to sign up **on** · Allow manual linking **off** · Allow anonymous sign-ins
   **off** · **Confirm email on**; the Email provider **on** · Secure email change **on** · Secure password
   change **on** · Minimum password length **8** · no required characters · Email OTP length **6**. Every
   other provider **off**. Save.
3. **Authentication** → **Attack Protection** → CAPTCHA **off** (the app sends no captcha token).
4. **Authentication** → **Emails** → **Templates**: the five templates exactly as production
   (`supabase/production/RUNBOOK.md` step 8): for each, the **Subject** from that table and the whole body
   from `supabase/templates/`. Without them the links do not reach the app's `/auth/callback` page.
5. Email delivery: without custom SMTP, Supabase sends only to members of the organization's team, and
   only a few emails an hour. For the rehearsal, either sign up with team members' addresses (Organization
   → **Team** → **Invite**), or set up custom SMTP for this project too (Authentication → Emails →
   **SMTP Settings**, as `RUNBOOK.md` step 7, with a separate API key from the email provider).

### A4. The staging project's two public values (done, 17 Oct 2026)

The owner sent the Project URL and the publishable key, and they are committed: the ref and the key in
`src/auth/config.js` (`STAGING_PROJECT_REF`, `STAGING_PUBLISHABLE_KEY`), the URL in
`server/another-angle/src/config.js` (`STAGING_SUPABASE_PROJECT_URL`), and both in `[env.staging.vars]`
(`SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`). The coordinator redeploys the staging Worker (a line appended to
`server/another-angle/deploy/STAGING`). Never send the secret key (`sb_secret_…`), the service_role key or the
database password: nothing needs them.

### A5. Cloudflare Pages: the Preview variables (3 min)

Today **Preview** still holds production's values (the "hushmallow pages env" workflow set them on 13 Oct). A
branch build refuses them: the preview builds **without sign-in** and its log says
`auth config: WARNING: SUPABASE_URL is the production project hushmallow1 …`. Nothing reaches production's
accounts, but the preview cannot sign in until this step is done.

1. **dash.cloudflare.com** → **Workers & Pages** → **hushmallow** → **Settings** → **Environment variables**
   (newer dashboards: **Variables and Secrets**).
2. Choose **Preview**. **Delete** both `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` there (the ⋯ or the
   bin next to each). Save. A branch build with neither then publishes the staging project committed in
   `src/auth/config.js`. (Setting both, as **Text**, to `https://oghzabvkrxsejkkjdsuc.supabase.co` and
   `sb_publishable_Sn4YKE3TRTzMkWVN9i45_A_MYYxxirc` works too; never only one of them.)
3. **Production** keeps production's values. Do not change them:
   * `SUPABASE_URL` = `https://igbxbfuaoybfzsroxuln.supabase.co`
   * `SUPABASE_PUBLISHABLE_KEY` = `sb_publishable_NSv1Liou2yjKjauX09U5qQ_CxwzDuiw`
4. **Deployments** → the latest deployment of `claude/launch-rc` → **⋯** → **Retry deployment** (new
   values only reach a new build). Its build log shows
   `auth config: sign-in on: https://oghzabvkrxsejkkjdsuc.supabase.co (the staging project hushmallow-staging…`.

Good to know:

* Do not run the "hushmallow pages env" workflow (`tools/infra/PAGES_ENV`) again: it writes production's
  values into Preview. If it ever runs, previews build without sign-in until you delete them again.

### A6. Anthropic: a separate staging key with its own low limit (5 min)

1. **console.anthropic.com** → **Settings** → **Workspaces** → **Create Workspace**. Name:
   `hushmallow-staging` → **Create**.
2. Open the workspace **hushmallow-staging** → **Limits** → **Spend limit** → **Change limit**. Set a low
   monthly limit (for example US$10) → **Save**. Every key in this workspace stops there. (The staging
   Worker also stops itself at $3 a day.)
3. **Settings** → **API Keys** → **Create Key**. Workspace: **hushmallow-staging**. Name:
   `hushmallow-staging` → **Add**. Copy the key (`sk-ant-…`) now: it is shown only once. It is a secret.
4. GitHub: the repository → **Settings** → **Secrets and variables** → **Actions** →
   **New repository secret**. Name: `ANTHROPIC_API_KEY_STAGING`. Secret: paste the key → **Add secret**.
5. Cloudflare: **dash.cloudflare.com** → **Workers & Pages** → **hushmallow-another-angle-staging** →
   **Settings** → **Variables and Secrets** → the row **ANTHROPIC_API_KEY** → **Edit** (the pencil) →
   paste the same staging key → **Deploy**. This replaces the copy of production's key that the staging
   Worker has held until now. (The next staging deploy also sets it, from the GitHub secret. Without
   `ANTHROPIC_API_KEY_STAGING` a staging deploy never sets or overwrites the Worker's key, and the run's
   summary says so.)
6. Leave production alone: the `ANTHROPIC_API_KEY` repository secret and the production Worker
   **hushmallow-another-angle** keep production's key.

### A7. Tester codes for staging (2 min)

1. Make up a few new codes, never production's, for example `hm-test-4821-7305`, `hm-test-1957-6640` and
   `hm-test-3308-9172`. Join them with commas and no spaces:
   `hm-test-4821-7305,hm-test-1957-6640,hm-test-3308-9172`.
2. GitHub: the repository → **Settings** → **Secrets and variables** → **Actions** →
   **New repository secret**. Name: `TESTER_INVITE_CODES_STAGING`. Secret: the line from 1 → **Add secret**.
3. Cloudflare: **Workers & Pages** → **hushmallow-another-angle-staging** → **Settings** →
   **Variables and Secrets** → the row **TESTER_INVITE_CODES** → **Edit** → the same line → **Deploy**.
   (No such row: **Add**, type **Secret**, name `TESTER_INVITE_CODES`.) This replaces the copy of
   production's codes the staging Worker has held until now.
4. Give each tester one code. The staging deploy's end-to-end check uses the first one.

Check Part A afterwards (from any terminal), once Claude's commit has been deployed to the staging Worker:

```
curl -s -H 'origin: https://claude-launch-rc.hushmallow.pages.dev' \
  https://hushmallow-another-angle-staging.vibyfy-chat.workers.dev/v1/health
```

`"accounts_configured":false` in the answer means the staging Worker has not been redeployed with the
staging project yet (it still runs the old placeholders). `"provider_key":true` means the Worker has a model
key (it cannot tell whose: that is A6).

### Part B: the Stripe sandbox hushmallow-staging

Staging uses a Stripe **sandbox**, not the live account's test mode: test mode shares branding, public details
and (for a standard account) Tax settings with live mode, a sandbox shares nothing (decision D1). Every step
below happens in that sandbox: check its name in the account switcher (top left) before each one. The labels
are from memory; follow what the page shows.

### B1. Choose the sandbox (2 min)

1. Open the Stripe dashboard → the account switcher (top left) → **Sandboxes**.
2. If the earlier `pk_test_…` key came from a sandbox (for example one already named hushmallow-staging), use
   that one for every step below. If it came from the live account's test mode, **Create sandbox**, name it
   `hushmallow-staging`, and use the new one.
3. A cross-check, from memory: the keys of one environment share the segment after their prefix, so the
   staging restricted key (B8) should start like the publishable key of the same environment, `rk_test_`
   instead of `pk_test_`.

### B2. Public details and branding (5 min)

1. **Settings** → **Business** → **Public details**: business name `hushmallow`, a support email and a support
   URL → **Save**.
2. **Settings** → **Branding**: upload the logo and the icon from `hushmallow/assets/brand/` → **Save**.

### B3. Stripe Tax settings (5 min)

1. **Tax** → **Settings**:
   * **Head office address**: your Australian business address. The status must then read **Active**.
   * **Default tax behaviour**: your or your accountant's choice. It applies only to a price with no tax
     behaviour of its own, and with Stripe Tax on checkout sells only an inclusive or exclusive price.
   * **Preset product tax code**: the code you or your accountant choose from Stripe's list
     (https://docs.stripe.com/tax/tax-codes). Stripe's reference names `txcd_10103001` (SaaS) and
     `txcd_10000000` (General – Electronically Supplied Services) only as candidates; Claude does not choose
     one (decision D4).
2. **Tax** → **Registrations** → **Add registration**, for example Australia → GST. In the sandbox, add it so
   the rehearsal can test tax. (In live mode, only once you actually hold that registration: Stripe records
   registrations, it does not register you. Which jurisdictions apply, with prices in US dollars, is for you and
   your tax adviser.)
3. Tell Claude when the sandbox's registration shows **Collecting**. The sandbox driver then runs a test
   calculation (P0), and once its `taxability_reason` is not `not_collecting`, `STRIPE_AUTOMATIC_TAX` can be
   turned on for staging (`docs/PAYMENTS.md` "Stripe Tax"). Until then it stays `"false"`.

### B4. Two products, four prices (10 min)

**Product catalogue** → **Create product**, twice. Customers see these names on Checkout, receipts and the
portal.

| Product name | Price | Billing period | Currency | Include tax in price | Lookup key (More options, recommended) |
|---|---|---|---|---|---|
| **hushmallow Flow** | 9.99 | Monthly | USD | Your choice (below) | `hushmallow.paid.monthly` |
| **hushmallow Flow** | 99.99 | Yearly | USD | Your choice (below) | `hushmallow.paid.yearly` |
| **hushmallow Beyond** | 19.99 | Monthly | USD | Your choice (below) | `hushmallow.ultra.monthly` |
| **hushmallow Beyond** | 199.99 | Yearly | USD | Your choice (below) | `hushmallow.ultra.yearly` |

The owner made two products and four prices like these on 2026-10-17, and their ids are in
`[env.staging.vars]`. Check in the dashboard, with **Test mode** (the sandbox) showing, that the four are
there; if they are only in live mode, make them here and send the new ids (B10).

* Each price is **recurring**, every 1 month or every 1 year. Make the second price of each product with
  **Add another price** on the same product. Name the products exactly as above (lowercase `hushmallow`; never
  "Paid", "Ultra" or "Premium"); their tax code is the preset (B3) or the one you chose.
* **A lookup key is recommended, not required.** When a price has one, it must be its slot's (checkout
  refuses any other: `503 price_misconfigured`) and it decides the plan. A price with none is sold, and its
  configured id decides the plan. Either way checkout sells a price only at its slot's amount (the table
  above; `CHECKOUT_PRICE_RULES.unit_amount`), so two ids swapped between slots are refused, and an id in two
  slots is never sold. The driver's preflight also checks each product's name.
* **US dollars only**: add no other currency to a price ("Add more currencies"). Checkout refuses a price that
  has one (`503 price_misconfigured`): Stripe would charge some customers in theirs. This is separate from
  Adaptive Pricing (B5).
* Tax behaviour: any is sold while `STRIPE_AUTOMATIC_TAX` is off. Before it goes on, each price needs
  **inclusive** or **exclusive** (never unspecified). A used price's tax behaviour may not be changeable later
  (from memory), so settle it with your accountant before launch.
* No trials and no other prices (D14). These are the owner's amounts (D2); live mode needs its own four
  prices at the same amounts, and `BILLING_PRICES` changes with them if they ever differ.

### B5. Payment methods and Checkout settings (3 min)

1. **Settings** → **Payments** → **Payment methods** (the default configuration): keep **Cards**, **Apple Pay**
   and **Google Pay** (Link is your call). Turn **off BECS Direct Debit** and every other delayed method
   (D10). Nothing in the code sends `payment_method_types`, so this page decides.
2. **Settings** → **Checkout and Payment Links**: **Adaptive Pricing off** (D11: US$ only). If the page offers "Limit
   customers to one subscription", turn it on (it works because the Worker always passes the customer).

### B6. The customer portal (5 min)

**Settings** → **Billing** → **Customer portal**:

* **Payment methods**: allow updates. **Invoice history**: on. **Customer information**: allow email and
  billing-address edits (Stripe Tax needs the address once it is on).
* **Cancellations**: on, **At the end of the billing period**, no proration or refund on cancel (D7).
* **Subscriptions** → **Customers can switch plans**: on, with hushmallow Flow (both prices) and hushmallow
  Beyond (both prices); quantity changes off. Proration (D8): prorate and invoice upgrades immediately;
  schedule downgrades (Beyond → Flow, yearly → monthly) at the end of the period if that option shows.
* **Pause**: off.
* **Business information**: the privacy policy and terms links. For the sandbox, the preview's drafts:
  `https://claude-launch-rc.hushmallow.pages.dev/legal/privacy.html` and
  `https://claude-launch-rc.hushmallow.pages.dev/legal/terms.html` (app.hushmallow.com's, in live mode, once
  they are approved).
* **Default redirect link**: `https://claude-launch-rc.hushmallow.pages.dev/`. The server also sends its own
  return address, `…/?billing=portal`.
* **Customer portal link** (email login): **Activate**, and put the link on the support page.

### B7. Revenue recovery and emails (5 min)

1. **Settings** → **Billing** → **Revenue recovery**:
   * **Retries**: Smart Retries on, with a window of about **2 weeks**, to match the Worker's 14-day
     `past_due` cap (D5).
   * **If all retries for a payment fail**: **Cancel the subscription** (D6). Not "mark as unpaid" (the
     subscription stays in place with its invoice open, and S5 fails), and never "leave the subscription past due".
   * **Emails**: failed card payment emails on (linking to Stripe's page or the portal); expiring-card reminders
     on; for 3-D Secure, send a Stripe-hosted link to confirm payments when required.
2. **Settings** → **Customer emails** (or **Subscriptions and emails**): successful payments and refunds on,
   finalized invoices on, upcoming-renewal reminders on, at least for yearly plans (D15).

### B8. The Worker's restricted key (5 min)

**Developers** → **API keys** → **Create restricted key** → **Building your own integration**. Name it
`hushmallow-worker-staging`, and set these permissions, everything else **None**:

| Resource | Permission |
|---|---|
| Checkout Sessions | Write |
| Customer portal | Write |
| Subscriptions | Read |
| Customers | Write |
| Prices | Read (and Products: Read, if the page ties them together) |

Copy the key once (`rk_test_…`) and paste it only into Cloudflare (B9). The permission names are from memory: a
missing one shows up as `"stripe_http":403` in the staging Worker's log line (with the step in `err`) and in
`stripe logs tail` on the first sandbox run; add what it names. The sandbox's full secret key (`sk_test_…`) is
not needed.

### B9. The staging Worker's Stripe key (2 min)

**Cloudflare** → **Workers & Pages** → **hushmallow-another-angle-staging** → **Settings** → **Variables and
Secrets** → **Add** → type **Secret** (not Text) → name `STRIPE_SECRET_KEY`, value the `rk_test_…` key from B8
→ **Deploy**. Or, on your own machine, in `hushmallow/server/another-angle`:

```
npx wrangler secret put STRIPE_SECRET_KEY --env staging       # paste the rk_test_… key
```

**Never put a live key on the staging Worker** (it is refused anyway), and set nothing on the production Worker.
Secrets set this way stay through later deploys: the staging workflow adds only its own (the model key from
`ANTHROPIC_API_KEY_STAGING`, the signing keys, and `TESTER_INVITE_CODES` from `TESTER_INVITE_CODES_STAGING`; a
staging secret that is missing is left as the Worker has it).

### B10. Send Claude the four price ids

The price ids are **not secret**. Paste the four `price_…` ids from B4 into the chat (or the pull request),
labelled like this:

```
hushmallow Flow monthly    price_…
hushmallow Flow yearly     price_…
hushmallow Beyond monthly  price_…
hushmallow Beyond yearly   price_…
```

The owner's four ids of 2026-10-17 are already in `[env.staging.vars]`; send new ones only if those turn out
to be live mode's, or are replaced. Claude puts them in place of the four there and commits the change. The coordinator then deploys the staging Worker (it appends a line to
`server/another-angle/deploy/STAGING` on the release branch). The deploy runs the server's tests, deploys,
and runs `scripts/e2e.mjs` against it, which includes the key-free billing checks (below). In
`billing+testing` mode that end-to-end check gets its session with the first of `TESTER_INVITE_CODES_STAGING`
(the GitHub repository secret, A7). If that secret is empty, the check fails at "session" even though the
deploy itself worked: set at least one tester code first.

### B11. The webhook endpoint (5 min, only after Claude's go-ahead)

Do this only after Claude says the staging Worker is deployed with the price ids (B10) and the staging
project's values (A4). Until then the Worker answers every event `503`, Stripe retries each one for days, and
it may warn about or switch off the endpoint.

1. **Developers** (or **Workbench**) → **Webhooks** → **Add destination** → **Your account** → API version
   **`2026-08-26.dahlia`** (the version the Worker pins; not the default if the page offers another).
2. Events, exactly these 11 (any other event is acknowledged and ignored):
   * `checkout.session.completed`
   * `checkout.session.async_payment_succeeded`
   * `checkout.session.async_payment_failed`
   * `customer.subscription.created`
   * `customer.subscription.updated`
   * `customer.subscription.deleted`
   * `customer.subscription.paused`
   * `customer.subscription.resumed`
   * `invoice.paid`
   * `invoice.payment_failed`
   * `invoice.payment_action_required`
3. Endpoint URL: **`https://hushmallow-another-angle-staging.vibyfy-chat.workers.dev/v1/billing/webhook`**
4. After saving, reveal the endpoint's **signing secret** (`whsec_…`) and set it on the staging Worker as B9
   does, as the Secret `STRIPE_WEBHOOK_SECRET` (or `npx wrangler secret put STRIPE_WEBHOOK_SECRET --env
   staging`).

This is a separate endpoint from production's (`hushmallow-another-angle.vibyfy-chat.workers.dev`, which is
not set up now). Never point the sandbox's endpoint at the production Worker, and keep no other endpoint in
the sandbox: the driver reads `pending_webhooks 0` as "the Worker answered 200".

Check it afterwards (from any terminal):

```
curl -s -H 'origin: https://claude-launch-rc.hushmallow.pages.dev' \
  https://hushmallow-another-angle-staging.vibyfy-chat.workers.dev/v1/health
# … "entitlement_mode":"billing+testing" … "billing":{"configured":true,"webhook":true,"stripe_mode":"test","live_approved":false,"api_version":"2026-08-26.dahlia","automatic_tax":false}
```

`"placeholder_prices"` in the answer means a `price_TODO…` line is still there, and
`"accounts_configured": false` that the staging project's values are not in yet (A4). `"key_refused"` means the
key is not a test key. `"configured": false` without any of these means a secret is missing or has the wrong
shape. Every value is checked; a wrong one counts as unset.

### B12. (Optional) Let Claude run the sandbox driver (5 min)

Only if Claude should run the sandbox driver from its cloud session; otherwise run it on your own machine
(below).

1. A second restricted key, for the driver only (B8's page): name `hushmallow-e2e-staging`; **Write**:
   Customers, Subscriptions, Invoices, PaymentMethods, Test clocks and Tax calculations; **Read**: Checkout
   Sessions, Prices, Products, Events, Webhook endpoints, Customer portal, Tax settings and Tax registrations
   (names from memory; S8's resend may also need Events: Write, and without it the driver says SKIP and the
   resend is done by hand).
2. A third test account in hushmallow-staging for the driver (E2E-B), confirmed, with a password of its own.
3. The cloud environment menu in the session's title bar → **Edit**:
   * **Network access** → **Allowed domains**: `api.stripe.com`,
     `hushmallow-another-angle-staging.vibyfy-chat.workers.dev` and `<staging ref>.supabase.co`. Keep "Allow
     package managers" ticked.
   * **Network secrets** (or environment variables): `STRIPE_E2E_KEY` (the key from 1), `STAGING_E2E_EMAIL`
     and `STAGING_E2E_PASSWORD` (the account from 2). A new session picks them up.
4. No Stripe key ever goes into GitHub Actions: the driver is not part of any workflow.

### B13. The custom domain checkout.hushmallow.com (10 min, only after Claude's go-ahead)

Do this only after Claude confirms the app release that allows `checkout.hushmallow.com` is live on
app.hushmallow.com **and** on the staging preview. The app today opens only `checkout.stripe.com` and
`billing.stripe.com`: a custom domain activated before that release breaks every checkout and every portal
open, here and in production. The order is: that client release, then DNS, then activation (D12).

1. Stripe → **Settings** → **Custom domains** (from memory, under Business) → **Add** →
   `checkout.hushmallow.com`.
2. Stripe shows a CNAME and a TXT record. In **Cloudflare** → **hushmallow.com** → **DNS** → **Records**, add
   each exactly as Stripe shows it, with **Proxy status: DNS only** (the grey cloud).
3. Back in Stripe, **Verify**, and wait for **Active**. Stripe bills custom domains as an add-on (from memory).
4. Tell Claude, who checks the host of the next session URL (S13).

### B14. GitHub secret scanning (2 min)

GitHub → the repository → **Settings** → **Code security** → **Secret scanning**: **Enable**, and **Push
protection**: **Enable**.

### The sandbox driver (`npm run e2e:billing`)

`server/another-angle/scripts/billing-e2e.mjs` runs the scripted parts of the rehearsal against the staging
Worker and the sandbox, in test mode only. It reads three secrets from the environment and never prints them:
`STRIPE_E2E_KEY` (B12's key; anything but `rk_test_…` or `sk_test_…`, a live key above all, is refused before
any request), `STAGING_E2E_EMAIL` and `STAGING_E2E_PASSWORD` (E2E-B). Everything else (the Workers' addresses,
the staging project, the price ids, the tax switch) it reads from the repository, and it refuses to start
while any of it is still a placeholder.

* From Claude's cloud session (B12): `cd hushmallow/server/another-angle && npm run e2e:billing`.
* On your own machine: put the three in a gitignored file (`server/another-angle/.dev.vars.e2e`, one
  `NAME=value` a line; `.gitignore` covers `.dev.vars.*`), never on a command line, then
  `node --env-file=.dev.vars.e2e scripts/billing-e2e.mjs`.
* One phase or a few: `-- --phases P0,P1` (P0, P1 and S3 to S9; S5 starts with S4's steps).

| Phase | What it does |
|---|---|
| P0 | Reads only. Staging `/v1/health`: `billing+testing`, configured, webhook, `stripe_mode` test, `api_version` 2026-08-26.dahlia, `live_approved` false, `automatic_tax` as `[env.staging.vars]` says, no placeholders. Production's: billing off, `testing`. The four prices by the ids in `[env.staging.vars]` (a live-mode id fails here: not found with the test key): what the Worker sells (USD with no other currency, every 1 month or year, its slot's amount, active, a lookup key of their own or none: none is said), a tax behaviour of inclusive or exclusive only if `automatic_tax` is on, US$9.99/99.99/19.99/199.99, the products' names, the same amounts in `BILLING_PRICES`. The webhook endpoint: enabled, 2026-08-26.dahlia, exactly the 11 events. The default portal configuration (B6). Tax: with `automatic_tax` on, settings Active and an active registration in any jurisdiction (off, both are only said); for each active registration, a test calculation in USD at an address it covers (Australia, New Zealand, the UK, Ireland, Germany and France are known to the driver, the EU's One Stop Shop too; any other is said, and that calculation is yours): `taxability_reason` not `not_collecting`, and for an inclusive price the total unchanged. |
| P1 | The key-free checks (below), plus: `Origin: https://app.hushmallow.com` refused on staging (403), and a hushmallow1 token refused (401). |
| S3 | Renewal: a test clock, a customer on it with `metadata.user_id`, a card, Flow monthly (tier `paid`); the clock past the period end; `invoice.paid` delivered (200); the period a month on, at the Worker too. |
| S4 | A failed renewal, then recovery: Beyond monthly, the `…0341` card (`pm_card_chargeCustomerFail`); `invoice.payment_failed`, `past_due` with Beyond still open (`/v1/session` 200); a good card, the open invoice paid; `active` again. |
| S5 | Retries running out: fails again, then the clock follows each retry until Stripe cancels the subscription (`canceled`; never `unpaid` or left `past_due`: B7); tier `none`, `/v1/session` 403 `subscription_required`. The 14-day `past_due` cap runs on the Worker's own clock, which a test clock does not move: the server's tests cover it. |
| S6 | Plan changes through the API: Flow (403 for Another Angle) → Beyond monthly (tier `ultra`, 200) → Flow yearly (tier `paid`, a year-long period, 403). |
| S7 | Cancellations: at the period end (`ends_at` the period end, tier unchanged), `cancel_at` 90 days on (`ends_at` that date), past it (tier `none`); a cancel at once (`none` at the next check). |
| S8 | A resend of an applied event (status unchanged; the Worker's log says `"duplicate":true`); a second, higher subscription for the same customer, then cancelled (the remaining Flow one is recorded). |
| S9 | A renewal that needs authentication (`pm_card_authenticationRequired`): `invoice.payment_action_required` delivered, `past_due`. |

Each scenario starts with E2E-B on no plan and ends there; each object it makes carries `metadata[e2e_run]`
(the clocks, the run in their name), only those ids are printed, and its test clocks are deleted at the end
(which deletes their customers and subscriptions). Any of its subscriptions still running then (a run stopped
half way, Ctrl-C) is cancelled first, so Stripe tells the Worker and E2E-B is on no plan for the next run.
It asks `/v1/billing/status` every 5 s at most (the limit is
20 a minute) and `/v1/session` every 21 s at most. It never makes prices, products, registrations, settings or
webhook endpoints, and any Stripe object read with `livemode: true` stops it at once. Exit `0`: every check
passed; `1`: a check failed; `2`: refused to start; `3`: stopped on a live object. The test-clock limits it
keeps to (3 customers a clock; two intervals an advance) and the test card tokens are from memory: watch
`stripe logs tail` on its first run. It has been run only offline so far (`test/billing-e2e.test.js`, an
in-memory sandbox).

### The key-free checks (every deploy)

`scripts/e2e.mjs` runs after every staging and production deploy, and `scripts/billing-checks.mjs` gives it
these checks, which need no Stripe key or account: the webhook refuses GET (405) and an event with no, a bad or
a stale signature (400; 503 while there is no signing secret); checkout refuses no token (401; 503 while
billing is off) and a foreign origin (403); on staging, a hushmallow1 token (401). `/v1/health`'s
`live_approved`, `api_version` and `automatic_tax` must be what that stage's table in `wrangler.toml` gives,
`stripe_mode` only `test` on staging (or nothing yet), and a refused key fails the check (except production's
live key waiting for the approval commit).

### Where email links land (nothing to set in hushmallow1)

The staging project's **Site URL** is the preview (A3), and every email template builds its link on
`{{ .SiteURL }}`. So the "Confirm your hushmallow account" and "Reset your hushmallow password" emails from
hushmallow-staging open `https://claude-launch-rc.hushmallow.pages.dev/auth/callback?token_hash=…`: the
preview's own callback page, which checks the link with the staging project and signs the person in **on
the preview**. Production's emails keep opening `https://app.hushmallow.com/auth/callback` only.

* Rehearsal accounts live only in **hushmallow-staging**. hushmallow1 never sees them, and needs no entry
  for the preview: if its Authentication → **URL Configuration** → Redirect URLs still lists
  `https://*.hushmallow.pages.dev/auth/callback` (or the preview's address), **remove it**. Production's
  list is exactly the three addresses in `supabase/production/RUNBOOK.md` step 4.
* The callback page and the app on the preview accept only the staging project: a link from hushmallow1
  opened on the preview cannot sign anyone in there, and a link from the staging project opened on
  production cannot either.
* Without custom SMTP on the staging project, only team members get its emails (A3, 5).

## The rehearsal checklist

On a phone (or a phone-sized window), at **https://claude-launch-rc.hushmallow.pages.dev** once Pages has
built the branch's latest commit. The steps marked S1, S2 and S10 to S14 are by hand; S3 to S9 are the
sandbox driver's (above). Use three hushmallow-staging test accounts: **E2E-A** for the purchase by hand,
**E2E-B** for the driver, **E2E-C** for the declines. Stripe test cards take any future expiry date, any
3-digit CVC and any postcode:

| Card | Result |
|---|---|
| `4242 4242 4242 4242` | succeeds |
| `4000 0000 0000 9995` | declined (insufficient funds) |
| `4000 0025 0000 3155` | asks for 3-D Secure ("Complete authentication" passes, "Fail authentication" declines) |
| `4000 0000 0000 0341` | saved, then the next charge fails (the driver's `pm_card_chargeCustomerFail`) |
| `4000 0027 6000 3184` | every charge needs authentication (the driver's `pm_card_authenticationRequired`) |

**Before you start**

- [ ] Part A is done: the preview's build log says `sign-in on: … (the staging project
      hushmallow-staging)` (A5), and the account screen is there on the preview.
- [ ] `/v1/health` (B11) shows `billing+testing`, `"configured": true, "webhook": true`, `"stripe_mode":
      "test"`, `"api_version": "2026-08-26.dahlia"` and `"live_approved": false` (and no
      `"accounts_configured": false`, `"placeholder_prices"` or `"key_refused"`).
- [ ] The sandbox driver's P0 and P1 pass (`npm run e2e:billing -- --phases P0,P1`).
- [ ] Settings → the bottom line reads `Version 2026-10-13 · Hushfold pilot + optional sign-in · staging · <commit>`.
      On app.hushmallow.com the same line has no "staging".

**1. Visit, as a guest**

- [ ] The home screen opens, and nothing asks you to sign in.
- [ ] Plans: hushmallow Flow shows "US$9.99 a month", hushmallow Beyond "US$19.99 a month". Yearly shows
      "US$99.99 a year" and "US$199.99 a year".
- [ ] (S1) "Step into hushmallow Beyond" as a guest opens the account screen: "Sign in or create an account
      first, so your plan stays with you."

**2. Sign up and log in**

- [ ] Create an account on the preview (E2E-A), with an address that can receive the staging project's
      emails (A3, 5). The confirmation email arrives.
- [ ] The email's button opens the **preview's** `/auth/callback` page
      (`https://claude-launch-rc.hushmallow.pages.dev/auth/callback?…`, "Where email links land"), confirms,
      and signs you in there ("You're in").
- [ ] Settings → Privacy shows the account row.
- [ ] (Optional) Supabase → **hushmallow-staging** → Authentication → **Users** lists the account;
      **hushmallow1** does not.

**3. Choose a plan and pay** (S1, S2)

- [ ] (S1, E2E-A) Plans → Monthly → "Step into hushmallow Beyond" opens Stripe Checkout on
      `checkout.stripe.com` (on `checkout.hushmallow.com` once B13 is done), in test mode, for **hushmallow
      Beyond, US$19.99 a month**. Pay with `4242 4242 4242 4242`.
- [ ] The Checkout page has the owner's Checkout Studio settings: Stripe's hosted page, no phone number, no
      promotion code field, a billing address only where Stripe asks for one (with `STRIPE_AUTOMATIC_TAX` off).
- [ ] Back on the preview, the address loses `?billing=success`, and within about 30 seconds the app says
      "Welcome to hushmallow Beyond". (The server records the plan at once through `POST /v1/billing/sync`;
      the app calls it, and takes `session_id` out of the address, from the client release that follows
      these server changes. Until then `session_id` stays in the address and the app waits for the webhook.)
- [ ] Stripe → Webhooks → the staging endpoint: every event was delivered with `200`. Customers: the account
      has **one** customer, with `metadata.user_id` and the email typed at Checkout (D13: the Worker sends no
      email).
- [ ] (S1) Then "Step into hushmallow Flow": the server answers `409 already_subscribed`, and the app opens
      the portal instead of a second Checkout.
- [ ] (S2, E2E-C) Pay with `4000 0000 0000 9995`: Stripe declines it on its own page, and nothing is charged.
      Use Checkout's back link: the app says "No problem. Nothing was charged." No plan.
- [ ] (S2) `4000 0025 0000 3155` with "Fail authentication": no plan; again with "Complete authentication":
      active.
- [ ] (S2) Two tabs, before paying: Flow monthly in tab 1, then Beyond monthly in tab 2. Tab 1's Checkout
      page now says it has expired; only one subscription is possible.

**4. Use the plan**

- [ ] Flow's rituals and worlds open; Beyond's do too.
- [ ] Settings → Plan shows hushmallow Beyond and "Renews on …", and a "Manage subscription" button.

**5. Another Angle, the real model** (S11)

- [ ] Open Another Angle: the consent card shows (its "What's kept" line mentions the sign-in token used to
      check the plan). Accept.
- [ ] Tell it a made-up, everyday situation (never a real person's private details). A fresh angle from
      the real model arrives (usually within seconds, at most about half a minute), and "Show me another
      angle" gives a second one.
- [ ] A crisis-sounding test sentence gets the support response, not an angle.
- [ ] (Optional) the Worker's logs (Workers & Pages → hushmallow-another-angle-staging → Logs) show
      `source: "billing"` for the session, and no email, account id, `cus_`/`sub_` id or token.
- [ ] (S11) An account with **hushmallow Flow** only: Another Angle stays with Zuzu's authored angles (the
      server answers `subscription_required`), unless a tester code is entered in Settings; a tester code
      still works under `billing+testing`.
- [ ] (S11, optional) Set staging to `ENTITLEMENT_MODE = "billing"` for a moment: an old testing session gets
      `401 session_superseded`, and a new session needs Beyond. Set it back to `billing+testing` afterwards.

**6. Save progress**

- [ ] Account screen → "Keep with my account": turn on "Sync my settings" and "Keep my favourites and
      progress with my account".
- [ ] Favourite a world, play part of a Hushflow, and add something to the Memory Garden.

**7. Come back**

- [ ] Close the tab, then open the preview again: still signed in, still hushmallow Beyond, the favourite,
      the paused Hushflow and the Memory Garden are there.
- [ ] (Optional) On a second device or browser, sign in on the preview: the plan and the synced
      favourites and progress follow the account.

**8. Manage the subscription** (S6, S7 by hand)

- [ ] Settings → **Manage subscription** opens Stripe's portal on `billing.stripe.com` (test mode; from
      memory, on the custom domain once B13 is done).
- [ ] Switch to hushmallow Flow (or yearly) there and return: the app shows the new plan.
- [ ] Cancel (at the period end) and return: Settings shows "Ends on …. Nothing more is charged."
- [ ] (Optional) Cancel a test subscription **immediately** in the Stripe dashboard: at the next check (open
      the app again) the plan goes, and Another Angle stays with the authored angles.

**9. The rest by hand** (S10, S12 to S14)

- [ ] (S10, only once B3's registration is Collecting and staging has `STRIPE_AUTOMATIC_TAX = "true"`) Check
      out with an address that registration covers (an Australian one for an AU registration). In the dashboard (or the API, with `expand[]=line_items.data.taxes`)
      the session's `taxability_reason` is not `not_collecting`; with an inclusive price the total is still
      US$19.99 (with an exclusive one the tax is added on top), and the invoice shows the tax. Checkout asks for
      the billing address (the tax switch replaces the Studio's `auto`). Note what an address outside the
      registered jurisdictions gives, for the owner to judge.
- [ ] (S12) With E2E-A's Beyond still renewing, the delete screen's "Not touched" list says to cancel it
      first in Settings → Manage subscription (and, from the client release with the deletion guard (D9), a
      "Cancel your subscription first" step comes before Delete). After a cancel at the period end, deleting
      goes ahead, and the Stripe subscription still ends at its period end.
- [ ] (S13, after B13) A new checkout's address is on `checkout.hushmallow.com`, the app opens it, and the
      payment completes; the portal opens too.
- [ ] (S14) The staging Worker's logs (Workers & Pages → hushmallow-another-angle-staging → Logs): search for
      `cus_`, `sub_`, `cs_`, `sk_`, `rk_`, `whsec_`, `@` and `eyJ`; none is there. No `mode_mismatch`
      outcome; any `"stripe_http":403` is a missing key permission (B8).

**Afterwards (teardown)**

- [ ] The driver deletes its own test clocks (and with them their customers and subscriptions). If a run was
      stopped, delete any `hushmallow-e2e …` clock left in Billing → Test clocks.
- [ ] Cancel E2E-A's subscription and any other test subscription still running. Deleting a hushmallow
      account does **not** cancel its Stripe subscription (`docs/PAYMENTS.md`, Known limits).
- [ ] Delete the rehearsal accounts if you no longer need them (account screen → Delete account). They are
      in hushmallow-staging only. Nothing is ever made in live mode.
- [ ] Note anything that looked or felt wrong; it goes into the next round before production is switched on.

## What staging does not change, and what is still open

* Production: no change to `app.hushmallow.com`, its Worker (`ENTITLEMENT_MODE = "testing"`, no billing
  values), its sign-in project hushmallow1, its model key, its tester codes or its security headers.
  Production billing stays off until the owner does `docs/PAYMENTS.md` sections 1 to 4 in **live** mode,
  and merges the activation commit that sets `BILLING_LIVE = "approved"`.
* The prices above are the owner's, in US dollars (2026-10-17). Whether the four ids in `[env.staging.vars]`
  are the sandbox's or live mode's is still to be verified, and production needs its own four live prices
  (`hushmallow/STRIPE_INTEGRATION_TODO.md`).
* The privacy policy and terms (`legal/privacy.html`, `legal/terms.html`) are drafts awaiting the owner's and
  legal review; the sandbox portal links the preview's copies (B6).
* A branch preview of **any** branch (and a deployment's own `<hash>.hushmallow.pages.dev` address)
  counts as staging in the app. Only origins listed in the staging Worker's `ALLOWED_ORIGINS` are answered,
  so another preview needs its origin added there (and as `APP_ORIGIN`, if Checkout should return to it),
  and in the staging project's Site URL and Redirect URLs (A3) if its email links should open it. The
  staging project has **one** Site URL, so its emails open one preview: `claude-launch-rc`.
* Until Part A is done: no staging project exists, so the preview has no sign-in and no billing (Another
  Angle still works there with a tester code), and the staging Worker still holds copies of production's
  model key and tester codes. A5 to A7 are what end that.
* The "hushmallow pages env" workflow (`tools/infra/PAGES_ENV`) still writes production's values into
  Preview when it runs. The build refuses them on a branch (sign-in off), so nothing crosses over, but do
  not run it: it would undo A5.
