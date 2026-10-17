# Web subscriptions with Stripe

hushmallow Flow and hushmallow Beyond can be sold on the web (app.hushmallow.com) through Stripe, with Another Angle's server checking the subscription itself. **Everything described here is built and switched off.** Nothing changes for anyone until the owner does the steps below. The App Store app (StoreKit) is separate and keeps working as before; the iOS shell never shows web billing. There the app's billing module is off whatever the config says (`src/app/billing.js` `inNativeShell`), so no account token is sent and the consent card and delete screen read as before.

There are three switches, and all are off in the repository for production. (The staging rehearsal is the one exception: the release branch's Pages preview has billing on, through the staging Worker in a Stripe sandbox. See `docs/STAGING.md`.)

| Where | Off (today) | On |
|---|---|---|
| The Worker, `hushmallow/server/another-angle/wrangler.toml` | No billing vars or secrets; `ENTITLEMENT_MODE = "testing"` | The vars and secrets below; then `ENTITLEMENT_MODE = "billing+testing"` or `"billing"` |
| The owner's approval, the same file's `[vars]` | No `BILLING_LIVE` line: the production Worker refuses a live Stripe key | `BILLING_LIVE = "approved"`, in its own reviewed commit (section 4) |
| The app, `hushmallow/src/app/config.js` | `BILLING_PROVIDER = ''` | `BILLING_PROVIDER = 'stripe'`, `BILLING_ENDPOINT = ANGLE_ENDPOINT` |

The tests follow these switches. With a switch off, they check today's state. With it on, they check that every value has the right shape. So the commits that switch billing on need no change to any test, and both deploy workflows (which run the tests first) still go through. A half-done switch fails them, for example a billing mode without the vars, a price that is not a `price_` id, an API version other than the pinned one, or `BILLING_LIVE` with any word but `approved` or outside production's `[vars]`.

**Each Worker takes the keys of its own stage only** (`src/config.js` `readBilling`). The staging Worker (and any stage but production) takes **test** keys only, so the preview never takes real money. The production Worker takes **live** keys only, so a test card never opens a plan there, and only once `BILLING_LIVE = "approved"`. A key for the wrong stage counts as unset: billing stays off and `/v1/health` says why (`"key_refused"`: `live_key_on_staging`, `test_key_on_production` or `live_not_approved`). No Stripe publishable key (`pk_…`) is used anywhere: Checkout and the portal are Stripe's own pages, and the app never loads Stripe.js.

## How it works

1. On the plans page a person picks hushmallow Flow or hushmallow Beyond, monthly or yearly, and taps "Step into…".
2. A guest is sent to the account screen first ("Sign in or create an account first, so your plan stays with you."). A web plan belongs to an account, so it follows the person to every device they sign in on.
3. Signed in, the app sends `{ plan, period }` and the account's Supabase access token to `POST /v1/billing/checkout` on our Worker. The Worker checks the token with this stage's sign-in project (`/auth/v1/user`: hushmallow1 on production, hushmallow-staging on staging). Then, before anything is sold:
   * the configured price is read from Stripe and must be its slot's own: its lookup key (`hushmallow.<plan>.<period>`), AUD, recurring every one month or one year, active and tax-inclusive (`CHECKOUT_PRICE_RULES` in `src/billing/routes.js`). Anything else answers `503 price_misconfigured` and sells nothing;
   * the account gets **one Stripe Customer**, made on its first checkout with only `metadata[user_id]` (no email or name) and kept for it, so every checkout and subscription of that account sits on the same customer. If that customer is ever deleted in Stripe (a clean-up, an erasure request), the next checkout makes a new one the same way and keeps it in its place;
   * Stripe's own list of that customer's subscriptions is asked: one that is `active`, `trialing`, `past_due`, `unpaid` or `paused` answers `409 already_subscribed` (a change of plan, or paying what is owed, happens in the portal; an `unpaid` one comes back to life when its open invoice is paid, so a second one would bill twice: `HELD_STATUSES` in `src/billing/routes.js`), one still `incomplete` answers `409 payment_pending`;
   * the account's last Checkout Session is settled: still open for the same plan, period, price and tax, it is handed back as it is (a second tab pays the same session); open for anything else, it is **expired** first, so it can no longer be paid; already paid, `409 payment_pending` until its subscription arrives.

   Only then is a Checkout Session created, in subscription mode, for that customer, with `client_reference_id` set to the account id. Two checkouts started together (two tabs, a double tap) also share one Stripe idempotency key, so they get one session. The app opens Stripe's page. Today it opens only `checkout.stripe.com` and `billing.stripe.com` (`STRIPE_PAGES` in `src/app/billing.js`); the custom domain is section 1, step 10.
4. Stripe takes the payment and sends signed events to `POST /v1/billing/webhook`. The Worker checks the signature, reads the subscription back from Stripe, and records it in the `Billing` Durable Object, keyed by the account id. That record is the only thing that decides what anyone has. A browser can never say it has a plan. An event of the other Stripe mode (a test event on the live key, or the reverse) is acknowledged and gives nothing.
5. Stripe sends the person back to `APP_ORIGIN/?billing=success&session_id=cs_…`. The server's `POST /v1/billing/sync` `{ session_id }` reads that session and its subscription from Stripe and records it at once, through the webhook's own path, for the account that started it only. The app today takes `?billing=` out of the address and asks `GET /v1/billing/status` several times over about 30 seconds, because the webhook can be a moment behind, then says "Welcome to hushmallow Beyond". (It does not call sync yet, and `session_id` stays in the address: see Known limits.)
6. The plan is kept on the phone as the entitlement with source `billing`, together with the time it was checked. It is checked again at start and whenever the app comes back to the foreground (at most once a minute). Without a new answer it is trusted for **3 days** of offline grace, then set aside until the server answers again.
7. Settings → Plan shows when the plan renews or ends. **Manage subscription** opens Stripe's customer portal, where the person can cancel (as easily as they subscribed), switch plans, update their card and see receipts. The server also opens the portal's plan change directly (`POST /v1/billing/portal` `{ "intent": "switch" }`), falling back to the portal's home when the portal does not allow switching.
8. With `ENTITLEMENT_MODE = "billing"`, `POST /v1/session` (Another Angle) needs an active hushmallow Beyond subscription for the signed-in account. Without one, the server never calls the model. The app then plays Zuzu's authored angles, as it does whenever the server says no.

Access counts while Stripe's status is `active`, `trialing` or `past_due`, until one day after the paid period ends, so a late renewal event never locks anyone out. `past_due` (Stripe is still retrying a failed card) counts for at most **14 days** from when the subscription first read `past_due` (decision D5, `PAST_DUE_GRACE_MS` in `src/billing/store.js`), in step with Smart Retries' window of about two weeks, so a card fixed during the retries never loses access and an unpaid year never keeps it. Any other status means no plan: `canceled`, `unpaid`, `incomplete`, `incomplete_expired` or `paused`. When a subscription ends, the customer's other subscriptions are read, and one still billing (Flow, after a second subscription to Beyond ended) is what the account keeps.

## 1. Set up Stripe (Australian dollars)

Rehearse everything first in the staging **sandbox** (`docs/STAGING.md` Part B, click by click, with the sandbox driver), then repeat it in **live mode** with the differences named here. Dashboard labels move now and then, and some below are from memory; follow what the page shows, and search the dashboard for the setting's name if it is not where this says.

1. **Account.** Activate the account for Australia, with an AUD bank account for payouts. Settings → Business → Public details: business name `hushmallow`, a support email and URL. Banks may print the statement descriptor in capitals; that is outside our control.
2. **Branding.** Settings → Branding: the logo and icon from `hushmallow/assets/brand/`, so Checkout, receipts and the portal look like hushmallow.
3. **Tax settings.** Tax → Settings, whatever the registration status:
   * the head office address (the Australian business address): the status must read **Active**;
   * default tax behaviour **Inclusive**;
   * the preset product tax code: the one you or your accountant choose from Stripe's list (https://docs.stripe.com/tax/tax-codes). Stripe's reference names `txcd_10103001` (SaaS) and `txcd_10000000` (General – Electronically Supplied Services) only as candidates; the code is the owner's choice (decision D4), never Claude's.
   * Tax → Registrations → Australia → GST, in live mode **only once you hold an ATO GST registration**: Stripe records a registration, it does not register you (D3).
4. **Products and prices.** Product catalogue → Add product, twice:
   * Name the products exactly **hushmallow Flow** and **hushmallow Beyond**. Customers see these names on Checkout, receipts and the portal. Never use "Paid", "Ultra" or "Premium".
   * Give each product two recurring prices in **AUD**: one **monthly** and one **yearly** (every 1 month, every 1 year). That makes four prices in all. No trials and no other prices (D14).
   * Every price has the tax behaviour **inclusive** ("Include tax in price": yes), from the start and whether or not you are registered: it cannot be changed later (from memory), and Checkout must charge exactly the amount the plans page shows.
   * **Every price must have its lookup key**, under More options: `hushmallow.paid.monthly`, `hushmallow.paid.yearly`, `hushmallow.ultra.monthly` or `hushmallow.ultra.yearly`. The lookup key decides which plan a price is (a price id pasted into the wrong slot never sells Beyond at Flow's price), and checkout refuses a price without its own key. A price made later to replace one needs the same key, moved to it.
   * **The amounts are the owner's decision** (D2). Only the owner's provisional sandbox amounts are recorded (A$9.99 and A$99.99 for Flow, A$19.99 and A$199.99 for Beyond), in `BILLING_PRICES` (`src/app/config.js`). Set the final amounts in the live prices and in `BILLING_PRICES` in the same release.
5. **Copy the four price ids** (`price_…`). They are not secret, and go in the Worker's vars (section 2).
6. **Payment methods and Checkout.** Settings → Payments → Payment methods: cards, Apple Pay and Google Pay (Link is your call). **Turn off BECS Direct Debit and every other delayed method** (D10): they leave a subscription waiting for days. The code never sends `payment_method_types`, so this setting decides. Settings → Checkout and Payment Links: **Adaptive Pricing off** (D11: A$ only, as the plans page and the terms say), and "Limit customers to one subscription" on if the page offers it (the Worker always passes the customer).
7. **Customer portal.** Settings → Billing → Customer portal. This is required: people must be able to cancel easily.
   * Cancellations: on, **at the end of the billing period**, no proration or refund on cancel (D7). Settings then says "Ends on …".
   * Payment methods: updates allowed. Invoice history: on. Customer information: email and billing address editable (GST needs the address).
   * Subscriptions → Customers can switch plans: on, with hushmallow Flow (both prices) and hushmallow Beyond (both prices); quantity changes off. Proration (D8): upgrades (Flow → Beyond, monthly → yearly) prorated and invoiced at once; downgrades scheduled at the end of the period, if the page offers it. An account with a plan is sent here instead of a second Checkout.
   * Pause: off.
   * Business information: the privacy policy and terms. Drafts exist (`legal/privacy.html`, `legal/terms.html`, published at `/legal/privacy.html` and `/legal/terms.html`); link app.hushmallow.com's once they are approved.
   * Default redirect link: `https://app.hushmallow.com/`. The server also sends `/?billing=portal` itself.
   * The portal's **login link** (email login): activate it, and put it on the support page and in the receipt emails. Someone who has deleted their hushmallow account can then still cancel.
8. **Revenue recovery.** Settings → Billing → Revenue recovery:
   * Smart Retries on, with a window of about **2 weeks**, to match the 14-day `past_due` cap (D5).
   * If all retries for a payment fail: **cancel the subscription** (D6). Not "mark the subscription as unpaid": an unpaid subscription stays in place with its invoice open, paying that invoice later makes it active again, and until then the account cannot subscribe afresh (checkout sends it to the portal to pay or cancel). And **never "leave the subscription past due"**.
   * Emails: failed card payments (with a link to Stripe's page or the portal), expiring cards, and a Stripe-hosted link to confirm payments that need 3-D Secure.
   * Settings → Customer emails (or Subscriptions and emails): successful payments and refunds, finalized invoices, and upcoming-renewal reminders, at least for yearly plans (D15).
9. **API key: a restricted key.** Developers → API keys → Create restricted key → "Building your own integration". Name it for its Worker (`hushmallow-worker-live`), and give it exactly these permissions, everything else None (names from memory):
   * Checkout Sessions: **Write**
   * Customer portal: **Write**
   * Subscriptions: **Read**
   * Customers: **Write**
   * Prices: **Read** (and Products: Read, if the page ties them together)

   A missing permission shows up as a `403` from Stripe: the Worker's log line says `"stripe_http":403` with the step that failed (`err`, for example `price:…` or `customer:…`); add the permission it names. The account's full secret key (`sk_…`) is not needed and should not be used. Copy the key once, and paste it only where section 2 puts it.
10. **The custom domain `checkout.hushmallow.com`** (D12), in this order only:
    1. First the app release whose `STRIPE_PAGES` (`src/app/billing.js`) also allows `checkout.hushmallow.com` must be live on app.hushmallow.com and on the staging preview. **The app today allows only `checkout.stripe.com` and `billing.stripe.com`**, so activating the domain before that release breaks every checkout and every portal open: the app refuses the page it is given.
    2. Then DNS: Stripe → Settings → Custom domains (from memory, under Business) → Add → `checkout.hushmallow.com`. Stripe shows a CNAME and a TXT record: add each in Cloudflare → hushmallow.com → DNS → Records exactly as shown, Proxy status **DNS only** (grey cloud).
    3. Then activation: back in Stripe, Verify, and wait for Active. Stripe bills custom domains as an add-on (from memory). The next checkout's URL is then on `checkout.hushmallow.com` (and, from memory, the portal's too); check it once (`docs/STAGING.md`, S13).
11. **Webhook endpoint**, last. Its signing secret goes on the Worker with the key (section 2). A Worker with billing still off answers every event `503`, and Stripe retries it for days: in live mode nothing sends events before launch, and in the sandbox the endpoint is made only once the staging Worker is set up (`docs/STAGING.md` B11). Developers → Webhooks (Workbench) → Add destination → Your account:
    * API version: **`2026-08-26.dahlia`**. The Worker pins the same version for its own requests (`STRIPE_API_VERSION`), so what it reads and what it is sent agree. Not "any version": the guards want exactly this one (`STRIPE_API_VERSION_EXPECTED` in `src/config.js`).
    * Events, exactly these 11 (`EVENTS` in `src/billing/routes.js`; any other is acknowledged and ignored):
      `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `customer.subscription.paused`, `customer.subscription.resumed`, `invoice.paid`, `invoice.payment_failed`, `invoice.payment_action_required`.
    * URL: `https://hushmallow-another-angle.vibyfy-chat.workers.dev/v1/billing/webhook`
    * Reveal the endpoint's **signing secret** (`whsec_…`). It goes in `STRIPE_WEBHOOK_SECRET` (section 2).

### Stripe Tax (`STRIPE_AUTOMATIC_TAX`, off)

The prices are GST-inclusive from day one, whether or not Stripe Tax is on. `STRIPE_AUTOMATIC_TAX` stays `"false"` (the default, `AUTOMATIC_TAX_DEFAULT` in `src/config.js`) in each environment until **all** of these hold there (D3):

* Tax settings: the head office is set and the status reads **Active**, with the default tax behaviour inclusive;
* the AU GST registration shows **Collecting** (in live: only once you hold an ATO registration);
* the product tax code is chosen (by you or your accountant, D4) and set;
* a test calculation for an Australian address has a `taxability_reason` that is **not** `not_collecting`. The sandbox driver's preflight runs exactly that calculation (`docs/STAGING.md`, P0). The driver takes test keys only, so in live mode run the same request yourself (`POST /v1/tax/calculations` with an Australian address, for example in Workbench's shell, from memory).

Turning `automatic_tax` on without an active registration calculates and collects nothing, silently, and past zero-tax transactions cannot be corrected through Stripe. With the switch on, each new Checkout Session gets `automatic_tax[enabled]=true`, `customer_update[address]=auto` and `billing_address_collection=required`, so the address typed at checkout is the one taxed and is saved on the customer. Add "incl. GST" to the plans page in the same release.

**Subscriptions made before the switch** keep `automatic_tax` off until each is updated: for each one, `POST /v1/subscriptions/<id>` with `automatic_tax[enabled]=true` and `proration_behavior=none`, so the change applies from the next invoice without a proration (the dashboard's change can prorate; Stripe's Tax migration tool does it in bulk). First check the subscription's customer has a valid address (Dashboard → Customers, or the card's billing details): Stripe refuses to finalize an invoice it cannot place (`customer_tax_location_invalid`). Ask a customer without one to add it in the portal before their subscription is updated.

## 2. Set the Worker's secrets and vars

Secrets are never committed, pasted in a chat, or typed where a shell keeps them. The production Worker takes only the **live** restricted key (`rk_live_…`); a test key never goes on it (it is refused: `test_key_on_production`). Test keys go only on the staging Worker (`docs/STAGING.md`) or in the local harness (section 5). Either in the Cloudflare dashboard (Workers & Pages → `hushmallow-another-angle` → Settings → Variables and Secrets → Add → type **Secret**), or from `hushmallow/server/another-angle` on your own machine:

```
npx wrangler secret put STRIPE_SECRET_KEY        # the rk_live_… key of section 1, step 9
npx wrangler secret put STRIPE_WEBHOOK_SECRET    # whsec_… from the live webhook endpoint
```

Secrets set this way stay through later deploys. The deploy workflow's `scripts/ci-secrets.mjs` only adds its own (`ANTHROPIC_API_KEY`, the signing keys, `TESTER_INVITE_CODES`). Until the approval commit (section 4), the production Worker refuses the live key: `/v1/health` shows `"configured": false` and `"key_refused": "live_not_approved"`, which is the expected answer then (each deploy's end-to-end check says so and goes on).

Then add the vars to `[vars]` in `wrangler.toml`. They are documented there in comments, and none of them is secret:

```
SUPABASE_URL = "https://igbxbfuaoybfzsroxuln.supabase.co"   # hushmallow1; no other project is accepted
SUPABASE_PUBLISHABLE_KEY = "sb_publishable_…"               # the same public key as the Pages build
APP_ORIGIN = "https://app.hushmallow.com"                   # must be one of ALLOWED_ORIGINS
STRIPE_PRICE_PAID_MONTHLY = "price_…"
STRIPE_PRICE_PAID_YEARLY = "price_…"
STRIPE_PRICE_ULTRA_MONTHLY = "price_…"
STRIPE_PRICE_ULTRA_YEARLY = "price_…"
STRIPE_API_VERSION = "2026-08-26.dahlia"                    # required: the Worker's pin (create the webhook endpoint on it too)
# optional: BILLING_TOKEN_TTL_HOURS = "24"
# optional: STRIPE_AUTOMATIC_TAX = "true", only once section 1's Stripe Tax preconditions hold in live mode
```

These go in the activation commit (section 4), together with `BILLING_LIVE = "approved"`. A push to `main` that changes `wrangler.toml` deploys the Worker. The deploy that first carries migration `v2` creates the `Billing` Durable Object class; it holds nothing until billing is used. Afterwards:

```
curl -s -H 'origin: https://app.hushmallow.com' https://hushmallow-another-angle.vibyfy-chat.workers.dev/v1/health
# … "billing":{"configured":true,"webhook":true,"stripe_mode":"live","live_approved":true,"api_version":"2026-08-26.dahlia","automatic_tax":false}
```

Every value is checked for its shape. If one is wrong, that value counts as unset and `/v1/health` keeps saying `"configured": false`. `npm test` checks the same shapes in `wrangler.toml` itself. `test/billing.test.js` and `test/billing-env.test.js` build the file exactly as this section and section 4 describe, then run the guards on it. A secret (`sk_…`, `rk_…`, `whsec_…`) anywhere in the file fails the tests, comments included. All the existing limits stay as they are:

* the rate limits, plus `BILLING_IP_LIMITER`: 20 billing requests a minute per network (checkout, status, sync and portal together);
* 20 angles a day per subscriber;
* the `DAILY_SPEND_CAP_USD` spend cap.

## 3. Switch the app on

In `hushmallow/src/app/config.js`:

```js
export const BILLING_PROVIDER = 'stripe';
export const BILLING_ENDPOINT = ANGLE_ENDPOINT;      // the same Worker
export const BILLING_PRICES = Object.freeze({        // shown under each button, exactly as in Stripe; '' shows none
  'hushmallow.paid.monthly': 'A$…', 'hushmallow.paid.yearly': 'A$…',
  'hushmallow.ultra.monthly': 'A$…', 'hushmallow.ultra.yearly': 'A$…',
});
```

* Sign-in must be on in the Pages build: `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` as build variables (`docs/AUTH.md`). Without sign-in the app ignores billing.
* Prices come only from `BILLING_PRICES`. Stripe Checkout always shows the real amount whatever is set here, so keep the two the same: the sandbox driver compares them with Stripe's (P0). Today it holds the owner's provisional sandbox values for the staging rehearsal (`docs/STAGING.md`): replace them with the final amounts in the release that switches production on.
* `TEST_PURCHASE_HOSTS` stays localhost-only. On localhost billing stays off unless `?billingDev=<port>` points at a local server (section 5), so test purchases keep working there.
* The client tests (`tests/billing.test.mjs`) follow these values. Each price must be `''` or an AUD price written like `A$9.99`.
* The billing copy never mentions the App Store.

## 4. The `ENTITLEMENT_MODE` switch, and the owner's approval

| Mode | `POST /v1/session` (Another Angle) needs |
|---|---|
| `testing` (today, the default) | Nothing but the app (and one of `TESTER_INVITE_CODES` if set). Unchanged. |
| `storekit` / `both` | A StoreKit transaction (`both`: or testing). Unchanged. |
| `billing+testing` | An active hushmallow Beyond web subscription, **or** one of `TESTER_INVITE_CODES` (a testing session with the testing caps). Without codes set it is the same as `billing`, never open to anyone. |
| `billing` | An active hushmallow Beyond web subscription. No invite code is accepted. |

In the billing modes, a session's allowance is per account, on every device: 20 angles a day. Its token lasts until the paid period ends, at most `BILLING_TOKEN_TTL_HOURS` (24). After the switch to a billing mode, sessions issued under the old rules are refused at their next angle (`401 session_superseded`): under `billing` every non-billing session, under `billing+testing` without invite codes every testing session.

**The approval (decision D17).** Live billing needs one more line in production's `[vars]`: `BILLING_LIVE = "approved"`. A reviewed commit that adds it, merged by the owner, **is** the owner's approval; nothing else is. Without it the production Worker refuses any live key, whatever secrets are set, so no card can be charged. Only this exact word approves; it belongs in production's `[vars]` only (never in `[env.staging.vars]` or `[env.dev.vars]`), and only together with the full billing var set (`test/billing-env.test.js`). `BILLING_LIVE_APPROVED` in `src/config.js` is the word.

**Order of switching:**

1. Rehearse in the staging sandbox (`docs/STAGING.md`): the sandbox driver (`npm run e2e:billing`) passing, and the manual checklist done.
2. In live mode, do section 1, the webhook endpoint included. Set the two live secrets on the production Worker (section 2). `/v1/health` then shows `"key_refused": "live_not_approved"`: the key is there and refused, as it must be.
3. Claude prepares **the activation commit**: `BILLING_LIVE = "approved"`, the section 2 vars (`STRIPE_API_VERSION`, the four live price ids, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `APP_ORIGIN`, and `STRIPE_AUTOMATIC_TAX` if section 1's preconditions hold), and in the same release the app (section 3: `BILLING_PROVIDER = 'stripe'`, the final `BILLING_PRICES`) and set `ENTITLEMENT_MODE = "billing+testing"`. Then subscribers and testers both reach Another Angle.
4. The owner reviews it and merges it. That merge is the approval; the deploy follows. Check `/v1/health` (section 2).
5. When testing ends, set `ENTITLEMENT_MODE = "billing"`. Before that, decide the App Store app's path (D16): in the billing modes the iOS shell sends no account token and its StoreKit transaction is not read, so Another Angle there refuses everyone until a StoreKit-or-web mode exists, or the iOS app is said to use the authored angles only.

To switch off, set `ENTITLEMENT_MODE = "testing"` and/or `BILLING_PROVIDER = ''`; taking out `BILLING_LIVE` stops the live key with that deploy. Subscriptions in Stripe carry on; cancel or refund them in the Stripe dashboard if needed.

## 5. Test mode on your own computer (the local harness)

The full rehearsal is on staging (`docs/STAGING.md`). The local harness is for working on the code: the real app on Node with the mock model, subscriptions in memory, and the [Stripe CLI](https://docs.stripe.com/stripe-cli) forwarding the sandbox's events. It bills as the staging Worker does: **test keys only**, and only on the hushmallow-staging sign-in project (`ACCOUNTS_STAGE=staging`), never hushmallow1. A live key is refused, `BILLING_LIVE` is never read, and it pins the Stripe API version as the Workers do. So it needs hushmallow-staging to exist (`docs/STAGING.md` A1 to A4: `STAGING_SUPABASE_PROJECT_URL` filled in `server/another-angle/src/config.js`).

1. Forward webhooks to the local server, and note the `whsec_…` it prints:

   ```
   stripe login
   stripe listen --forward-to localhost:8790/v1/billing/webhook \
     --events checkout.session.completed,checkout.session.async_payment_succeeded,checkout.session.async_payment_failed,customer.subscription.created,customer.subscription.updated,customer.subscription.deleted,customer.subscription.paused,customer.subscription.resumed,invoice.paid,invoice.payment_failed,invoice.payment_action_required
   ```

2. Put the values in a gitignored file, never on a command line (a shell keeps its history). `server/another-angle/.gitignore` covers `.dev.vars` and `.dev.vars.*`; use `.dev.vars.harness`, one `NAME=value` a line:

   ```
   STRIPE_SECRET_KEY=<the sandbox's restricted test key, docs/STAGING.md B8>
   STRIPE_WEBHOOK_SECRET=<the whsec_… that stripe listen printed>
   STRIPE_PRICE_PAID_MONTHLY=<price_…>
   STRIPE_PRICE_PAID_YEARLY=<price_…>
   STRIPE_PRICE_ULTRA_MONTHLY=<price_…>
   STRIPE_PRICE_ULTRA_YEARLY=<price_…>
   SUPABASE_URL=<the hushmallow-staging Project URL>
   SUPABASE_PUBLISHABLE_KEY=<its sb_publishable_… key>
   ACCOUNTS_STAGE=staging
   APP_ORIGIN=http://localhost:8000
   ENTITLEMENT_MODE=billing
   ```

   Then run the harness with it:

   ```
   cd hushmallow/server/another-angle
   node --env-file=.dev.vars.harness --import ./test/register.mjs tools/local-harness.mjs --serve 8790
   ```

3. Build the app with the staging project's sign-in values and serve it on port 8000 (both values are public):

   ```
   cd hushmallow
   SUPABASE_URL=https://<staging ref>.supabase.co SUPABASE_PUBLISHABLE_KEY=sb_publishable_… \
     bash tools/build-site.sh /tmp/hm-site rehearsal
   python3 -m http.server 8000 -d /tmp/hm-site
   ```

4. Open `http://localhost:8000/?billingDev=8790&angleDev=8790`. `billingDev` switches billing on for that tab only, on localhost only, and survives the trip to Stripe and back. Without it, localhost has test purchases, as before. Sign in with a hushmallow-staging test account.
5. Pay with Stripe's test cards (any future expiry date, any CVC, any postcode): `4242 4242 4242 4242` succeeds; `4000 0025 0000 3155` asks for 3-D Secure; `4000 0000 0000 9995` is declined; `4000 0000 0000 0341` is saved, and the next charge fails.
6. The harness's log lines (stderr) never contain an email, an account id, a `cus_`/`sub_` id or a token.

Renewals, failed renewals, recovery, retries running out, plan changes, cancellations and resent events are run by the sandbox driver against staging, with test clocks (`docs/STAGING.md`, "The sandbox driver").

## What is sent, stored and logged

* **The app → our Worker:** the account's access token, and `{ plan, period }` for a checkout (or the `session_id` Stripe returned, for sync). Never words, feelings or photos. A guest sends nothing. When billing is on and the person is signed in, Another Angle's `/v1/session` also carries the account's token. The consent card's "What's kept" line then says so ("When you're signed in, it also sends a sign-in token for your account, so our server can check your plan. Never your name or email."). With billing off, the line reads exactly as before.
  * Anyone who accepted the card before billing was switched on is asked again, once, before their token goes with a session (`src/beyond/consent.js` `sendsAccount`). No `CONSENT_VERSION` change is needed. A "Not now" stays as it was, since nothing is sent then. With billing off, nobody is asked again.
* **Our Worker → Stripe:**
  * a Customer for the account, once, with only `metadata[user_id]` (a random UUID, not an email; D13: Checkout asks for the email itself);
  * the price, and the account id as `client_reference_id` and as metadata on the session (with the plan, period and price) and on the subscription;
  * the return URLs;
  * with `STRIPE_AUTOMATIC_TAX` on, the request that Checkout collect and save the billing address.

  Stripe itself collects the email and card on its own pages. Never a trial, a promotion code (D14) or `payment_method_types`.
* **Stored by our Worker** (the `Billing` Durable Object):
  * for each subscribing account: the Stripe customer and subscription ids, Stripe's status, the plan and period, the period end, whether it cancels then and on which date (`cancel_at`), and since when it has been `past_due`;
  * the account's one Stripe customer, and its last Checkout Session (id and expiry);
  * which account each Stripe customer belongs to;
  * the ids of Stripe events already applied (kept 30 days).

  Never card details, emails, names, words or feelings.
* **Logged:** metadata only: route, HTTP status, outcome, plan, period, tier, Stripe's event type and status, and when a Stripe call fails, Stripe's error code and HTTP status (`stripe_http`). Never an account id, email, Stripe id, token or key.
* **Kept on the phone:** the entitlement: tier, source `billing`, when it was checked, Stripe's status, the period end and whether it cancels then.

## Known limits

* **Flow is enforced only in the browser.** hushmallow Flow's rituals and worlds run entirely on the phone. A determined person can edit the stored entitlement (or the code) and unlock Flow, and Beyond's on-phone parts, without paying. Stripe and the server cannot stop that; only moving content behind a server could. **Beyond's server cost is enforced:** in `billing` mode, Another Angle's model is reached only with a session the server issued after checking an active Beyond subscription.
* A cancelled or refunded subscription keeps a session it already has until that token expires (at most 24 hours). The app's own copy of the plan lapses at the next check, or after the 3-day offline grace.
* **Deleting a hushmallow account does not cancel its Stripe subscription.** The account's `Billing` record also stays, because the Worker is not told about deletions. With billing on, the delete screen's "Not touched" list says both: "a web subscription, if you have one, and our server's record of it (which plan and its status, never your card): deleting your account doesn't cancel it, so cancel it first in Settings → Manage subscription". After deleting, the person can no longer reach Manage subscription, so turn on the portal's login link (section 1). Cancelling for the person, or removing the record, is an open item.
* **Only `APP_ORIGIN` sells.** Stripe sends everyone back to `APP_ORIGIN`, and the app's other addresses (`hushmallow.pages.dev`, the github.io address) have no checkout return of their own. Someone who subscribes from one of them comes back to app.hushmallow.com, where they are not signed in yet: sign-in is kept per address. They sign in there. The plan belongs to the account, so it also shows on the other address at its next check.
* One subscription per account. Changes (Flow ↔ Beyond, monthly ↔ yearly) happen in the portal, so "switch plans" must be on there. The duplicate guards (section "How it works", step 3) are one Customer per account, Stripe's own list of its subscriptions before every checkout, and the account's open session handed back or expired. A subscription made outside checkout (in the dashboard, on the same customer) is not prevented; if an account ever has two, the one still billing is kept when the other ends, and the extra one is refunded in the dashboard.
* **The app does not follow every server change yet.** The server's sync on return, the `409 payment_pending` and `409 customer_conflict` answers, the portal's `{ "intent": "switch" }` and `checkout.hushmallow.com` need a client release: until it ships, the app waits for the webhook on return (and `session_id` stays in the address), opens the portal for any `409`, and opens only `checkout.stripe.com` and `billing.stripe.com`.
* After signing in, the app reloads into the account screen. The person goes back to the plans page themselves, and their choice is not remembered.
* A person who subscribes on the web and later uses the App Store app is not recognised there: StoreKit and Stripe are separate.
* **Not yet run against real Stripe or Supabase.** The tests use faithful fakes of both (`server/another-angle/test/billing*.test.js`, `tests/billing.test.mjs`), and the sandbox driver itself has run only against an in-memory sandbox with test clocks (`test/billing-e2e.test.js`). Its first run against the staging sandbox is the real check; the dashboard labels, the restricted-key permission names and some Stripe limits here are from memory until then.

## Before launch (owner)

Each decision has a recommended default, already built where the code needs one; change the named constant (and its test) to change it.

* **D1** the staging Stripe environment: a sandbox named hushmallow-staging (`docs/STAGING.md` B1).
* **D2** the final amounts of the four prices, in live Stripe and `BILLING_PRICES` together.
* **D3** GST registration, and when `STRIPE_AUTOMATIC_TAX` goes on (off by default: `AUTOMATIC_TAX_DEFAULT`, `src/config.js`); **D4** the product tax code (yours or your accountant's choice).
* **D5** access while a renewal fails: 14 days of `past_due` (`PAST_DUE_GRACE_MS`, `src/billing/store.js`); **D6** when retries run out: cancel, never unpaid or past due.
* **D7** cancel at period end, no partial refunds; **D8** upgrades at once, downgrades at period end.
* **D9** account deletion with a live web plan: block deletion until it is cancelled (the client's guard), and the portal login link on the support page.
* **D10** delayed methods off; **D11** Adaptive Pricing off; **D12** `checkout.hushmallow.com`, in section 1's order; **D13** no email sent to Stripe; **D14** no trials or promotion codes.
* **D15** renewal reminders on (yearly at least); no change-of-mind refunds except where the law requires; fill the `[Owner: …]` placeholders in `legal/terms.html` with your adviser. Australian consumer law covers renewals, cancellation and refunds.
* **D16** the App Store app under `ENTITLEMENT_MODE = "billing"` (section 4, step 5).
* **D17** the approval: the `BILLING_LIVE = "approved"` commit (`BILLING_LIVE_APPROVED`, `src/config.js`).
* **Legal documents:** the drafts of the privacy policy and terms (`legal/`) approved, naming Stripe as payment processor, and linked in the portal.
