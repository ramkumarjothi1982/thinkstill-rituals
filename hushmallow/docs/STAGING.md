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
Worker, and billing off (`BILLING_PROVIDER = ''`). Production's Worker stays on `ENTITLEMENT_MODE = "testing"`
with no billing values. Switching production on is a separate step, in `docs/PAYMENTS.md`.

## How the preview knows it is staging

| | A branch preview (`<one label>.hushmallow.pages.dev`) | Everywhere else |
|---|---|---|
| Another Angle | the staging Worker (`STAGING_ANGLE_ENDPOINT`), allowed only on `STAGING_ALLOWED_HOSTS` | the production Worker (`ANGLE_ENDPOINT` on `ANGLE_ALLOWED_HOSTS`), as before |
| Web subscriptions | **on**: Stripe through the staging Worker | **off** (`BILLING_PROVIDER = ''`) until the owner switches production on |
| Prices on the plans page | the provisional test prices below | none (they show only where billing is on) |
| Settings → version line | `Version … · staging` | `Version …`, as before |
| Content-Security-Policy | the same policy, with the staging Worker in `connect-src` instead of production | today's policy, unchanged |

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
* `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`: hushmallow1's public values, the same as the Pages build.
* `APP_ORIGIN = "https://claude-launch-rc.hushmallow.pages.dev"`, so Stripe sends people back to the preview.
* `STRIPE_PRICE_PAID_MONTHLY`, `STRIPE_PRICE_PAID_YEARLY`, `STRIPE_PRICE_ULTRA_MONTHLY` and
  `STRIPE_PRICE_ULTRA_YEARLY` are **placeholders**: `price_TODO_owner`. The server treats a `price_TODO…`
  value as unset, so it is never sent to Stripe. Until the real test ids replace them, every billing route
  answers `503 billing_not_configured`, with the message "…its Stripe price ids are still placeholders",
  and `/v1/health` shows `"billing": { "configured": false, …, "placeholder_prices": 4 }`. Nothing else
  breaks: Another Angle still works for testers with an invite code.

The staging Worker keeps its own limits: the real model, a **$3 a day** spending cap, 20 angles a day per
device or subscriber, 100 sessions a day in all, 10 new testing sessions a day per network.

## Owner steps

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

Secrets set this way stay through later deploys: the staging workflow adds only its own (the model key,
the signing keys and `TESTER_INVITE_CODES`). Never commit them, paste them in a chat or put them in
`wrangler.toml`.

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
with the first of `TESTER_INVITE_CODES` (the GitHub repository secret). If that secret is empty, the check
fails at "session" even though the deploy itself worked: set at least one tester code first.

Check it afterwards (from any terminal):

```
curl -s -H 'origin: https://claude-launch-rc.hushmallow.pages.dev' \
  https://hushmallow-another-angle-staging.vibyfy-chat.workers.dev/v1/health
# … "entitlement_mode":"billing+testing" … "billing":{"configured":true,"webhook":true}
```

`"placeholder_prices"` in the answer means a `price_TODO…` line is still there. `"configured": false`
without it means a secret is missing or has the wrong shape. Every value is checked; a wrong one counts as
unset.

### 6. Supabase (hushmallow1): redirect URLs, and where email links land

Authentication → **URL Configuration** → Redirect URLs. The allow list in `docs/AUTH.md` already has
`https://*.hushmallow.pages.dev/auth/callback`, which covers the preview (Supabase's `*` matches one
label). Check that it is there. If you prefer an exact entry, add
`https://claude-launch-rc.hushmallow.pages.dev/auth/callback`. Keep the **Site URL** exactly
`https://app.hushmallow.com`.

**Email links always open production.** Every email template uses `{{ .SiteURL }}`
(`docs/AUTH.md`, templates), so the "Confirm your hushmallow account" and "Reset your password" links go to
`https://app.hushmallow.com/auth/callback`, even when the email was asked for on the preview. That is by
design: a one-time token only ever reaches the production app. What it means for the rehearsal:

* Confirming the email signs the account in **on app.hushmallow.com**, not on the preview. Sign-in is per
  site (each origin keeps its own session), so the preview tab stays signed out.
* Nothing about billing happens on production: billing is off there, and the account has no plan yet.

**The simplest path:** sign up on the preview → open the email and confirm (it opens app.hushmallow.com:
that is expected, you can close it) → go back to the preview tab → **Sign in** with the same email and
password. A password reset asked for on the preview works the same way: set the new password on
production, then sign in on the preview.

Also:

* hushmallow1 is the real sign-in project: rehearsal accounts are real accounts there. Use a dedicated
  address (for example `you+rehearsal1@…`).
* Until custom SMTP is set up (`docs/AUTH.md`, SMTP), Supabase only emails members of the project's team,
  and only a few emails an hour. Use a team member's address, or set up SMTP first.
* The Cloudflare Pages project needs `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` for **Preview** as well
  as Production (Pages → hushmallow → Settings → Variables and Secrets, once called "Environment
  variables"). Without them the preview has no
  sign-in, so billing stays off there. They were set for both by the "hushmallow pages env" workflow;
  check that they are still there.

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

- [ ] `/v1/health` (step 5) shows `billing+testing` and `"configured": true, "webhook": true`.
- [ ] Settings → the bottom line reads `Version 2026-10-13 · Hushfold pilot + optional sign-in · staging · <commit>`.
      On app.hushmallow.com the same line has no "staging".

**1. Visit, as a guest**

- [ ] The home screen opens, and nothing asks you to sign in.
- [ ] Plans: hushmallow Flow shows "A$9.99 a month", hushmallow Beyond "A$19.99 a month". Yearly shows
      "A$99.99 a year" and "A$199.99 a year".
- [ ] "Step into hushmallow Flow" as a guest opens the account screen: "Sign in or create an account first,
      so your plan stays with you."

**2. Sign up and log in**

- [ ] Create an account on the preview. The confirmation email arrives.
- [ ] The email's button opens app.hushmallow.com and confirms (expected, see step 6). Back on the
      preview, sign in with the same email and password.
- [ ] Settings → Privacy shows the account row.

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
- [ ] Delete the rehearsal accounts if you no longer need them (account screen → Delete account).
- [ ] Note anything that looked or felt wrong; it goes into the next round before production is switched on.

## What staging does not change, and what is still open

* Production: no change to `app.hushmallow.com`, its Worker (`ENTITLEMENT_MODE = "testing"`, no billing
  values) or its security headers. Production billing stays off until the owner does `docs/PAYMENTS.md`
  sections 1 to 4 in **live** mode.
* The prices above are provisional test values, not the final commercial prices.
* Legal documents (privacy policy and terms for the main app) do not exist yet.
* The email-link behaviour above is deliberate. An app-side "continue on the preview" link is not planned.
* A branch preview of **any** branch (and a deployment's own `<hash>.hushmallow.pages.dev` address)
  counts as staging in the app. Only origins listed in the staging Worker's `ALLOWED_ORIGINS` are answered,
  so another preview needs its origin added there (and as `APP_ORIGIN`, if Checkout should return to it).
