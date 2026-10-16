# Staging: the full rehearsal on the release branch's preview

The release branch `claude/launch-rc` is built by Cloudflare Pages as a branch preview at
**https://claude-launch-rc.hushmallow.pages.dev**. That preview is the staging app: it talks to the
**staging** Another Angle Worker, **https://hushmallow-another-angle-staging.vibyfy-chat.workers.dev**,
for Another Angle (the real model) and for web subscriptions. Billing is on there, in **Stripe test mode**.
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
| Accounts (Supabase) | its own project **hushmallow-staging** (Sydney), with its own test accounts | **hushmallow1** (ref `igbxbfuaoybfzsroxuln`) |
| Server (Cloudflare Worker) | `hushmallow-another-angle-staging` | `hushmallow-another-angle` |
| Model key (Anthropic) | its own key **hushmallow-staging**, with its own low monthly limit (GitHub secret `ANTHROPIC_API_KEY_STAGING`) | `ANTHROPIC_API_KEY` |
| Tester codes | `TESTER_INVITE_CODES_STAGING` | `TESTER_INVITE_CODES` |
| Stripe | **test mode** keys and its own test webhook endpoint | live mode, later (`docs/PAYMENTS.md`) |

Until the owner has done Part A below, the staging project does not exist yet: the preview then has **no
sign-in** (and so no billing), exactly like a build without sign-in values. It never falls back to
production's accounts.

## How the preview knows it is staging

| | A branch preview (`<one label>.hushmallow.pages.dev`) | Everywhere else |
|---|---|---|
| Another Angle | the staging Worker (`STAGING_ANGLE_ENDPOINT`), allowed only on `STAGING_ALLOWED_HOSTS` | the production Worker (`ANGLE_ENDPOINT` on `ANGLE_ALLOWED_HOSTS`), as before |
| Web subscriptions | **on**: Stripe through the staging Worker | **off** (`BILLING_PROVIDER = ''`) until the owner switches production on |
| Prices on the plans page | the provisional test prices below | none (they show only where billing is on) |
| Settings → version line | `Version … · staging` | `Version …`, as before |
| Sign-in (accounts) | **only** the staging project hushmallow-staging; off until it exists (`STAGING_PROJECT_REF` is still `''`) | **only** hushmallow1, as before |
| Content-Security-Policy | the same policy, with the staging Worker in `connect-src` instead of production (and the staging project, once a branch build has its values) | today's policy, unchanged |

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
    (and any build outside Pages) only hushmallow1's. A branch build that is given hushmallow1's values does
    not publish them: it builds without sign-in and its log says
    `auth config: WARNING: SUPABASE_URL is the production project hushmallow1 …`. Staging values on `main`
    stop the build (production keeps its last good deploy). Everything the build refused before (a secret
    key, a service_role key, another project, a malformed value) it still refuses, on every branch.
  * **On the staging Worker:** `ACCOUNTS_STAGE = "staging"` means it accepts only the staging project's
    accounts (`STAGING_SUPABASE_PROJECT_URL` in `server/another-angle/src/config.js`), never hushmallow1's.
  * A deployment's own address (`<hash>.hushmallow.pages.dev`) counts as a preview, `main`'s included: a
    `main` deployment opened at its own hash address therefore has sign-in off (it carries production's
    values, which a preview never accepts). `app.hushmallow.com` and `hushmallow.pages.dev` are not affected.
* **Prices** (`BILLING_PRICES` in `src/app/config.js`, the one place they are written). They are the owner's
  **provisional test values**, not the final commercial prices:

  | Plan | Monthly | Yearly |
  |---|---|---|
  | hushmallow Flow | A$9.99 | A$99.99 |
  | hushmallow Beyond | A$19.99 | A$199.99 |

  The plans page shows "A$9.99 a month" and so on under each button. The amount Stripe charges is always
  the one set in Stripe, so set the same amounts there (step 1).

## The staging Worker (`[env.staging]` in `server/another-angle/wrangler.toml`)

Only the staging environment changed:

* `ALLOWED_ORIGINS` adds `https://claude-launch-rc.hushmallow.pages.dev`. The GitHub Pages copy, the old
  `claude-upbeat-pasteur-b0aqg1` preview and `localhost:8000` stay.
* `ENTITLEMENT_MODE = "billing+testing"`. Another Angle opens for an account with an active (test)
  hushmallow Beyond subscription, **or** with one of `TESTER_INVITE_CODES` (a testing session, as before).
  Without invite codes set, it opens for subscribers only.
* `ACCOUNTS_STAGE = "staging"`, `SUPABASE_URL = "https://STAGING_TODO.supabase.co"` and
  `SUPABASE_PUBLISHABLE_KEY = "sb_publishable_TODO"`: the staging project's public values, as
  **placeholders** until the owner creates hushmallow-staging (Part A). Nothing of hushmallow1 is there any
  more. The server treats a `TODO` value (and a staging Worker with no staging project in its code yet) as
  "accounts not configured": it never asks any sign-in project, every billing route answers
  `503 accounts_not_configured` ("…accounts are not configured (its sign-in project, SUPABASE_URL and
  SUPABASE_PUBLISHABLE_KEY, is still a placeholder)"), and `/v1/health` shows
  `"billing": { "configured": false, …, "accounts_configured": false }`.
* Its secrets come from the **staging** repository secrets: the deploy
  (`.github/workflows/another-angle-staging.yml`) sets `ANTHROPIC_API_KEY` from `ANTHROPIC_API_KEY_STAGING`
  and `TESTER_INVITE_CODES` from `TESTER_INVITE_CODES_STAGING`, never from production's `ANTHROPIC_API_KEY` /
  `TESTER_INVITE_CODES`. A staging secret that is missing is **not** set or overwritten: the Worker keeps
  whatever it already has, and the run's summary says so. Until A6 is done, that is a copy of production's
  key, set by earlier deploys: replace it (A6).
* `APP_ORIGIN = "https://claude-launch-rc.hushmallow.pages.dev"`, so Stripe sends people back to the preview.
* `STRIPE_PRICE_PAID_MONTHLY`, `STRIPE_PRICE_PAID_YEARLY`, `STRIPE_PRICE_ULTRA_MONTHLY` and
  `STRIPE_PRICE_ULTRA_YEARLY` are **placeholders**: `price_TODO_owner`. The server treats a `price_TODO…`
  value as unset, so it is never sent to Stripe. Until the real test ids replace them, every billing route
  answers `503 billing_not_configured`, with the message "…its Stripe price ids are still placeholders",
  and `/v1/health` shows `"billing": { "configured": false, …, "placeholder_prices": 4 }` (while the
  accounts are placeholders too, the answer is `accounts_not_configured`). Nothing else breaks: Another
  Angle still works for testers with an invite code.

The staging Worker keeps its own limits: the real model, a **$3 a day** spending cap, 20 angles a day per
device or subscriber, 100 sessions a day in all, 10 new testing sessions a day per network.

## Owner steps

Two parts:

* **Part A (A1 to A7): staging gets its own accounts, model key and tester codes**, so nothing is shared
  with production. Do A1 to A4 first. Do A5 only **after** Claude has committed the staging project's values
  (before that, a preview build given the new values stops with "there is no staging project yet"). A6 and
  A7 can be done at any time, the sooner the better: until A6 is done, the staging Worker still holds a
  copy of production's model key.
* **Part B (steps 1 to 5): Stripe test mode**, as before. Step 6 says where the staging project's email
  links land.

Never needed at all: a Supabase secret key (`sb_secret_…`), the service_role key, a database password.
The Anthropic key (A6) and the Stripe keys (step 4) are secrets: they go only where a step puts them (a
GitHub **New repository secret**, or the staging Worker's **Variables and Secrets** in Cloudflare), never into
a chat, a file or a commit. The only values Claude needs are public: the staging project's URL and its
publishable key (A4), and later the Stripe price ids (step 5).

Dashboard labels move now and then; if one is not where this says, search the dashboard for the setting's
name.

### A1. Supabase: create the staging project (5 min)

1. Open **supabase.com/dashboard** and sign in with the account that owns hushmallow1.
2. Click **New project**.
3. **Organization**: the same organization as hushmallow1.
4. **Project name**: `hushmallow-staging` (exactly this, lower case).
5. **Database password**: click **Generate a password** and keep it in your password manager. Nothing
   below needs it.
6. **Region**: Sydney (shown as **Oceania (Sydney)**, `ap-southeast-2`), the same region as hushmallow1.
7. Leave everything else as it is. The **Free** plan is fine for staging. (A Free project with no activity
   for a week is paused: the preview then hides sign-in until you open the project and click
   **Restore project**.)
8. Click **Create new project** and wait until the project is ready (a minute or two).
9. Look at the address bar: it shows `/project/` followed by 20 letters and digits. That is the staging
   project's **ref**. It must **not** be `igbxbfuaoybfzsroxuln` (that is production's hushmallow1).

### A2. Supabase: the database, the same SQL as production (5 min)

The two files are the ones production uses; they are not tied to one project (their first lines name
hushmallow1, but they are just as right for hushmallow-staging). Check the project name at the top of the
dashboard says **hushmallow-staging** before you run anything.

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

Still in **hushmallow-staging**:

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

### A4. Send Claude the staging project's two public values

1. **Project Settings** → **Data API** → copy the **Project URL** (`https://` + the ref + `.supabase.co`).
2. **Project Settings** → **API Keys** → copy the **Publishable key** (`sb_publishable_…`).
3. Paste both into the chat (or the pull request), labelled like this:

   ```
   hushmallow-staging Project URL      https://….supabase.co
   hushmallow-staging publishable key  sb_publishable_…
   ```

Both are public by design (Row Level Security is what protects the data). Never send the secret key
(`sb_secret_…`), the service_role key or the database password.

Claude then puts the ref into `src/auth/config.js` (`STAGING_PROJECT_REF`, today the placeholder `''`), the
URL into `server/another-angle/src/config.js` (`STAGING_SUPABASE_PROJECT_URL`), and both values into
`[env.staging.vars]` (`SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`) in place of the `TODO` placeholders, and
commits. The coordinator then redeploys the staging Worker (a line appended to
`server/another-angle/deploy/STAGING`).

### A5. Cloudflare Pages: the Preview variables (3 min, after Claude's commit)

1. **dash.cloudflare.com** → **Workers & Pages** → **hushmallow** → **Settings** → **Environment variables**
   (newer dashboards: **Variables and Secrets**).
2. Choose **Preview**. For each of the two, **Edit** (or **Add variable** if it is not there), type
   **Text** (plain text; both values are public):
   * `SUPABASE_URL` = the staging Project URL from A4
   * `SUPABASE_PUBLISHABLE_KEY` = the staging publishable key from A4

   Save.
3. **Production** keeps production's values. Do not change them:
   * `SUPABASE_URL` = `https://igbxbfuaoybfzsroxuln.supabase.co`
   * `SUPABASE_PUBLISHABLE_KEY` = `sb_publishable_NSv1Liou2yjKjauX09U5qQ_CxwzDuiw`
4. **Deployments** → the latest deployment of `claude/launch-rc` → **⋯** → **Retry deployment** (new
   values only reach a new build). Its build log shows
   `auth config: sign-in on: https://….supabase.co (the staging project hushmallow-staging)`.

Good to know:

* Until this step is done, Preview still holds production's values (the "hushmallow pages env" workflow set
  them on 13 Oct). A branch build refuses them: the preview builds **without sign-in** and its log says
  `auth config: WARNING: SUPABASE_URL is the production project hushmallow1 …`. That is expected, and
  nothing reaches production's accounts.
* Do not run the "hushmallow pages env" workflow (`tools/infra/PAGES_ENV`) again: it writes production's
  values into Preview. If it ever runs, previews build without sign-in until you set the staging values
  again.

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

`"accounts_configured":false` in the answer means the staging Worker's sign-in values are still the
placeholders. `"provider_key":true` means the Worker has a model key (it cannot tell whose: that is A6).

### Part B: Stripe test mode

Do everything in Stripe's **test mode**: the "Test mode" toggle (or the sandbox) at the top of the Stripe
dashboard must be on for every step. Test mode has its own products, prices, webhooks, keys and portal
settings, separate from live mode.

### 1. Stripe test mode: two products, four prices

Product catalogue → **Add product**, twice. Customers see these names on Checkout, receipts and the portal.

| Product name | Price | Billing period | Currency | Lookup key (advanced options) |
|---|---|---|---|---|
| **hushmallow Flow** | 9.99 | Monthly | AUD | `hushmallow.paid.monthly` |
| **hushmallow Flow** | 99.99 | Yearly | AUD | `hushmallow.paid.yearly` |
| **hushmallow Beyond** | 19.99 | Monthly | AUD | `hushmallow.ultra.monthly` |
| **hushmallow Beyond** | 199.99 | Yearly | AUD | `hushmallow.ultra.yearly` |

* Each price is **recurring**. Name the products exactly as above (lowercase `hushmallow`; never "Paid",
  "Ultra" or "Premium").
* Tax behaviour: **inclusive**, so the amount on Checkout is the amount on the plans page. Whether GST
  applies, and Stripe Tax, are decisions for later (`docs/PAYMENTS.md`, "Before launch"). The server does
  not switch Stripe Tax on.
* These amounts are **provisional, for the rehearsal**. Before launch the final amounts go into live-mode
  prices and into `BILLING_PRICES` together.

Open each price and copy its id (`price_…`). That makes four ids.

### 2. Stripe test mode: the customer portal

Settings → Billing → **Customer portal** (test mode):

* Cancel subscriptions: on, "at the end of the billing period".
* Update payment methods: on. Invoice history: on.
* Switch plans: on, with both products and all four prices. An account that already has a plan is sent
  here instead of a second Checkout.
* Default redirect link: `https://claude-launch-rc.hushmallow.pages.dev/`. The server also sends its own
  return address, `…/?billing=portal`.
* Privacy policy and terms links: neither document exists yet for the main app. Leave them empty for the
  rehearsal if Stripe allows it (they are needed before launch).

### 3. Stripe test mode: the webhook endpoint

Developers → **Webhooks** → Add endpoint (test mode):

* Endpoint URL: **`https://hushmallow-another-angle-staging.vibyfy-chat.workers.dev/v1/billing/webhook`**
* Events, exactly these five (any other event is acknowledged and ignored):
  * `checkout.session.completed`
  * `customer.subscription.created`
  * `customer.subscription.updated`
  * `customer.subscription.deleted`
  * `invoice.payment_failed`
* Any API version works.
* After saving, reveal and copy the endpoint's **signing secret** (`whsec_…`).

This is a separate endpoint from production's (`hushmallow-another-angle.vibyfy-chat.workers.dev`, which
is not set up now). Never point the test endpoint at the production Worker.

### 4. The staging Worker's two secrets

Use the **test** secret key, `sk_test_…` (Developers → API keys, test mode). A restricted test key
(`rk_test_…`) that can create Checkout Sessions and portal sessions and read subscriptions also works.
**Never put a live key (`sk_live_…`) on the staging Worker.**

Either from a terminal, in `hushmallow/server/another-angle`:

```
npx wrangler secret put STRIPE_SECRET_KEY --env staging       # paste sk_test_…
npx wrangler secret put STRIPE_WEBHOOK_SECRET --env staging   # paste whsec_… from step 3
```

Or in the Cloudflare dashboard: **Workers & Pages → hushmallow-another-angle-staging → Settings →
Variables and Secrets → Add**. Choose type **Secret** (not Text), name `STRIPE_SECRET_KEY`, paste the
value, and deploy. Then the same for `STRIPE_WEBHOOK_SECRET`.

Secrets set this way stay through later deploys: the staging workflow adds only its own (the model key from
`ANTHROPIC_API_KEY_STAGING`, the signing keys, and `TESTER_INVITE_CODES` from `TESTER_INVITE_CODES_STAGING`;
a staging secret that is missing is left as the Worker has it). Never commit them, paste them in a chat or
put them in `wrangler.toml`.

### 5. Send Claude the four test price ids

The price ids are **not secret**. Paste the four `price_…` ids from step 1 into the chat (or the pull
request), labelled like this:

```
hushmallow Flow monthly    price_…
hushmallow Flow yearly     price_…
hushmallow Beyond monthly  price_…
hushmallow Beyond yearly   price_…
```

Claude puts them into `[env.staging.vars]` in place of the four `price_TODO_owner` lines and commits the
change. The coordinator then deploys the staging Worker (it appends a line to
`server/another-angle/deploy/STAGING` on the release branch). The deploy runs the server's tests, deploys,
and runs `scripts/e2e.mjs` against it. In `billing+testing` mode that end-to-end check gets its session
with the first of `TESTER_INVITE_CODES_STAGING` (the GitHub repository secret, A7). If that secret is empty,
the check fails at "session" even though the deploy itself worked: set at least one tester code first.

Check it afterwards (from any terminal):

```
curl -s -H 'origin: https://claude-launch-rc.hushmallow.pages.dev' \
  https://hushmallow-another-angle-staging.vibyfy-chat.workers.dev/v1/health
# … "entitlement_mode":"billing+testing" … "billing":{"configured":true,"webhook":true}
```

`"placeholder_prices"` in the answer means a `price_TODO…` line is still there, and
`"accounts_configured": false` that the staging project's values are not in yet (A4). `"configured": false`
without either means a secret is missing or has the wrong shape. Every value is checked; a wrong one counts
as unset.

### 6. Where email links land (nothing to set in hushmallow1)

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
built the branch's latest commit. Stripe test cards take any future expiry date, any 3-digit CVC and any
postcode:

| Card | Result |
|---|---|
| `4242 4242 4242 4242` | succeeds |
| `4000 0000 0000 9995` | declined (insufficient funds) |
| `4000 0025 0000 3155` | asks for 3-D Secure ("Complete authentication" passes, "Fail authentication" declines) |

**Before you start**

- [ ] Part A is done: the preview's build log says `sign-in on: … (the staging project
      hushmallow-staging)` (A5), and the account screen is there on the preview.
- [ ] `/v1/health` (step 5) shows `billing+testing` and `"configured": true, "webhook": true` (and no
      `"accounts_configured": false`).
- [ ] Settings → the bottom line reads `Version 2026-10-13 · Hushfold pilot + optional sign-in · staging · <commit>`.
      On app.hushmallow.com the same line has no "staging".

**1. Visit, as a guest**

- [ ] The home screen opens, and nothing asks you to sign in.
- [ ] Plans: hushmallow Flow shows "A$9.99 a month", hushmallow Beyond "A$19.99 a month". Yearly shows
      "A$99.99 a year" and "A$199.99 a year".
- [ ] "Step into hushmallow Flow" as a guest opens the account screen: "Sign in or create an account first,
      so your plan stays with you."

**2. Sign up and log in**

- [ ] Create an account on the preview, with an address that can receive the staging project's emails
      (A3, 5). The confirmation email arrives.
- [ ] The email's button opens the **preview's** `/auth/callback` page
      (`https://claude-launch-rc.hushmallow.pages.dev/auth/callback?…`, step 6), confirms, and signs you in
      there ("You're in").
- [ ] Settings → Privacy shows the account row.
- [ ] (Optional) Supabase → **hushmallow-staging** → Authentication → **Users** lists the account;
      **hushmallow1** does not.

**3. Choose a plan and pay**

- [ ] Plans → Monthly → "Step into hushmallow Beyond" opens Stripe Checkout on `checkout.stripe.com`, in
      test mode, for **hushmallow Beyond, A$19.99 a month**.
- [ ] Pay with `4000 0000 0000 9995`: Stripe declines it on its own page, and nothing is charged. Use
      Checkout's back link: the app says "No problem. Nothing was charged."
- [ ] Try again with `4000 0025 0000 3155`: the 3-D Secure screen appears. "Fail authentication" declines; try
      once more and choose "Complete authentication".
- [ ] (or) Pay with `4242 4242 4242 4242`.
- [ ] Back on the preview, the address loses `?billing=success`, and within about 30 seconds the app says
      "Welcome to hushmallow Beyond".
- [ ] Stripe (test mode) → Webhooks → the staging endpoint: the events were delivered with `200`.

**4. Use the plan**

- [ ] Flow's rituals and worlds open; Beyond's do too.
- [ ] Settings → Plan shows hushmallow Beyond and "Renews on …", and a "Manage subscription" button.

**5. Another Angle, the real model**

- [ ] Open Another Angle: the consent card shows (its "What's kept" line mentions the sign-in token used to
      check the plan). Accept.
- [ ] Tell it a made-up, everyday situation (never a real person's private details). A fresh angle from
      the real model arrives (usually within seconds, at most about half a minute), and "Show me another
      angle" gives a second one.
- [ ] A crisis-sounding test sentence gets the support response, not an angle.
- [ ] (Optional) the Worker's logs (Workers & Pages → hushmallow-another-angle-staging → Logs) show
      `source: "billing"` for the session, and no email, account id, `cus_`/`sub_` id or token.
- [ ] (Optional) an account with **hushmallow Flow** only: Another Angle stays with Zuzu's authored angles
      (the server answers `subscription_required`), unless a tester code is entered in Settings.

**6. Save progress**

- [ ] Account screen → "Keep with my account": turn on "Sync my settings" and "Keep my favourites and
      progress with my account".
- [ ] Favourite a world, play part of a Hushflow, and add something to the Memory Garden.

**7. Come back**

- [ ] Close the tab, then open the preview again: still signed in, still hushmallow Beyond, the favourite,
      the paused Hushflow and the Memory Garden are there.
- [ ] (Optional) On a second device or browser, sign in on the preview: the plan and the synced
      favourites and progress follow the account.

**8. Manage the subscription**

- [ ] Settings → **Manage subscription** opens Stripe's portal on `billing.stripe.com` (test mode).
- [ ] Switch to hushmallow Flow (or yearly) there and return: the app shows the new plan.
- [ ] Cancel (at the period end) and return: Settings shows "Ends on …. Nothing more is charged."
- [ ] (Optional) Cancel a test subscription **immediately** in the Stripe dashboard: at the next check (open
      the app again) the plan goes, and Another Angle stays with the authored angles.

**Afterwards**

- [ ] Cancel any test subscriptions still running. Deleting a hushmallow account does **not** cancel its
      Stripe subscription (`docs/PAYMENTS.md`, Known limits).
- [ ] Delete the rehearsal accounts if you no longer need them (account screen → Delete account). They are
      in hushmallow-staging only.
- [ ] Note anything that looked or felt wrong; it goes into the next round before production is switched on.

## What staging does not change, and what is still open

* Production: no change to `app.hushmallow.com`, its Worker (`ENTITLEMENT_MODE = "testing"`, no billing
  values), its sign-in project hushmallow1, its model key, its tester codes or its security headers.
  Production billing stays off until the owner does `docs/PAYMENTS.md` sections 1 to 4 in **live** mode.
* The prices above are provisional test values, not the final commercial prices.
* Legal documents (privacy policy and terms for the main app) do not exist yet.
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
