# Web subscriptions with Stripe

hushmallow Flow and hushmallow Beyond can be sold on the web (app.hushmallow.com) through Stripe, with Another Angle's server checking the subscription itself. **Everything described here is built and switched off.** Nothing changes for anyone until the owner does the steps below. The App Store app (StoreKit) is separate and keeps working as before; the iOS shell never shows web billing. There the app's billing module is off whatever the config says (`src/app/billing.js` `inNativeShell`), so no account token is sent and the consent card and delete screen read as before.

There are two switches, and both are off in the repository for production. (The staging rehearsal is the one exception: the release branch's Pages preview has billing on, through the staging Worker in Stripe test mode. See `docs/STAGING.md`.)

| Where | Off (today) | On |
|---|---|---|
| The Worker, `hushmallow/server/another-angle/wrangler.toml` | No billing vars or secrets; `ENTITLEMENT_MODE = "testing"` | The vars and secrets below; then `ENTITLEMENT_MODE = "billing+testing"` or `"billing"` |
| The app, `hushmallow/src/app/config.js` | `BILLING_PROVIDER = ''` | `BILLING_PROVIDER = 'stripe'`, `BILLING_ENDPOINT = ANGLE_ENDPOINT` |

The tests follow both switches. With a switch off, they check today's state. With it on, they check that every value has the right shape. So the commits that switch billing on need no change to any test, and both deploy workflows (which run the tests first) still go through. A half-done switch fails them, for example a billing mode without the vars, or a price that is not a `price_` id.

## How it works

1. On the plans page a person picks hushmallow Flow or hushmallow Beyond, monthly or yearly, and taps "Step into…".
2. A guest is sent to the account screen first ("Sign in or create an account first, so your plan stays with you."). A web plan belongs to an account, so it follows the person to every device they sign in on.
3. Signed in, the app sends `{ plan, period }` and the account's Supabase access token to `POST /v1/billing/checkout` on our Worker. The Worker checks the token with the sign-in project (`/auth/v1/user`, hushmallow1 only). It then creates a Stripe Checkout Session in subscription mode for the configured price, with `client_reference_id` set to the account id. Checkouts for the same account, plan and period within two minutes share a Stripe idempotency key, so two tabs started together get one Checkout Session, which can be paid only once. The app opens Stripe's page (only `checkout.stripe.com` or `billing.stripe.com` are ever opened).
4. Stripe takes the payment and sends signed events to `POST /v1/billing/webhook`. The Worker checks the signature, reads the subscription back from Stripe, and records it in the `Billing` Durable Object, keyed by the account id. That record is the only thing that decides what anyone has. A browser can never say it has a plan.
5. Stripe sends the person back to `https://app.hushmallow.com/?billing=success`. The app takes `?billing=` out of the address, asks `GET /v1/billing/status` (several times over about 30 seconds, because the webhook can be a moment behind), and says "Welcome to hushmallow Beyond".
6. The plan is kept on the phone as the entitlement with source `billing`, together with the time it was checked. It is checked again at start and whenever the app comes back to the foreground (at most once a minute). Without a new answer it is trusted for **3 days** of offline grace, then set aside until the server answers again.
7. Settings → Plan shows when the plan renews or ends. **Manage subscription** opens Stripe's customer portal, where the person can cancel (as easily as they subscribed), switch plans, update their card and see receipts.
8. With `ENTITLEMENT_MODE = "billing"`, `POST /v1/session` (Another Angle) needs an active hushmallow Beyond subscription for the signed-in account. Without one, the server never calls the model. The app then plays Zuzu's authored angles, as it does whenever the server says no.

Access counts while Stripe's status is `active`, `trialing` or `past_due` (Stripe is still retrying a failed card), until one day after the paid period ends, so a late renewal event never locks anyone out. Any other status means no plan: `canceled`, `unpaid`, `incomplete`, `incomplete_expired` or `paused`.

## 1. Set up Stripe (Australian dollars)

Do all of this in **test mode** first (the toggle at the top of the dashboard), rehearse (section 5), then repeat it in live mode.

1. **Account.** Activate the account for Australia, with an AUD bank account for payouts. Under Settings → Business → Public details, set the public business name to `hushmallow`, plus a support email and URL. Banks may print the statement descriptor in capitals; that is outside our control.
2. **Branding.** Under Settings → Branding, upload the logo and icon from `hushmallow/assets/brand/`, so Checkout, receipts and the portal look like hushmallow.
3. **Products and prices.** Product catalogue → Add product, twice:
   * Name the products exactly **hushmallow Flow** and **hushmallow Beyond**. Customers see these names on Checkout, receipts and the portal. Never use "Paid", "Ultra" or "Premium".
   * Give each product two recurring prices in **AUD**: one **monthly** and one **yearly**. That makes four prices in all.
   * Under each price's advanced options, set its **lookup key** to the app's product id: `hushmallow.paid.monthly`, `hushmallow.paid.yearly`, `hushmallow.ultra.monthly` or `hushmallow.ultra.yearly`. The server maps a price to a plan by its id, and falls back to the lookup key, so a price replaced later still maps.
   * Australian consumer prices should be shown tax-inclusive. Set each price's tax behaviour to "inclusive" if you are registered for GST. Stripe Tax is **not** switched on by the code (no `automatic_tax`); decide this with your accountant.
   * **The amounts are the owner's decision.** Only the owner's provisional test amounts are recorded, in `BILLING_PRICES` (`src/app/config.js`) for the staging rehearsal (`docs/STAGING.md`). They are not the final prices.
4. **Copy the four price ids** (`price_…`). They go in the Worker's vars (section 2).
5. **Webhook endpoint.** Developers → Webhooks → Add endpoint:
   * URL: `https://hushmallow-another-angle.vibyfy-chat.workers.dev/v1/billing/webhook`
   * Events: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`. Nothing else is needed; any other event is acknowledged and ignored.
   * Any API version works. The server reads the subscription's period end and an invoice's subscription in both the older and the newer shapes.
   * Copy the endpoint's **signing secret** (`whsec_…`). It goes in `STRIPE_WEBHOOK_SECRET`.
6. **Customer portal.** Settings → Billing → Customer portal. This is required: people must be able to cancel easily.
   * Turn on **cancel subscriptions**. "At the end of the billing period" is recommended, so the person keeps what they paid for. Settings then says "Ends on …".
   * Turn on **update payment methods** and **invoice history**.
   * Turn on **switch plans**, with both products and all four prices. Flow → Beyond and monthly ↔ yearly happen here: an account with a plan is sent to the portal instead of a second Checkout. Proration is your choice.
   * Business information: add links to the privacy policy and terms. **Neither exists yet for the main app** (see "Before launch").
   * Default redirect link: `https://app.hushmallow.com/`. The server also sends `/?billing=portal` itself.
   * Recommended: turn on the portal's **login link**, where a customer signs in with their email address. Put it on the support page and in the receipt emails. Someone who has deleted their hushmallow account can then still cancel. The app can't help them any more, because Manage subscription needs a signed-in account. (Not checked against the live dashboard.)
7. **Payments and emails.**
   * Under Settings → Payment methods, cards, Apple Pay and Google Pay are enough. Delayed methods such as BECS Direct Debit leave a subscription waiting for days.
   * Under Settings → Subscriptions and emails, turn on renewal reminders and failed-payment emails, and Smart Retries.
   * When retries run out, choose "cancel the subscription" (recommended) or "mark as unpaid". Either one ends access.
8. **API key.** Use the account's **secret key** (`sk_test_…`, later `sk_live_…`), or a restricted key (`rk_…`) that can create Checkout Sessions and portal sessions and read subscriptions. The exact permissions a restricted key needs were **not** verified. If a call fails, the Worker's log line shows Stripe's error code (`err`).

## 2. Set the Worker's secrets and vars

Secrets are never committed. From `hushmallow/server/another-angle`:

```
npx wrangler secret put STRIPE_SECRET_KEY        # sk_live_… (sk_test_… for the rehearsal)
npx wrangler secret put STRIPE_WEBHOOK_SECRET    # whsec_… from the webhook endpoint
# staging: add --env staging to both, with that environment's own keys and endpoint
```

Secrets set this way stay through later deploys. The deploy workflow's `scripts/ci-secrets.mjs` only adds its own (`ANTHROPIC_API_KEY`, the signing keys, `TESTER_INVITE_CODES`).

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
```

A push to `main` that changes `wrangler.toml` deploys the Worker. The same deploy creates the `Billing` Durable Object class (migration `v2`); it holds nothing until billing is used. Afterwards:

```
curl -s -H 'origin: https://app.hushmallow.com' https://hushmallow-another-angle.vibyfy-chat.workers.dev/v1/health
# … "billing":{"configured":true,"webhook":true}
```

Every value is checked for its shape. If one is wrong, that value counts as unset and `/v1/health` keeps saying `"configured": false`. `npm test` checks the same shapes in `wrangler.toml` itself. `test/billing.test.js` builds the file exactly as this section and section 4 describe, then runs the guards on it. A secret (`sk_…`, `rk_…`, `whsec_…`) anywhere in the file fails the tests, comments included. All the existing limits stay as they are:

* the rate limits, plus a new `BILLING_IP_LIMITER`: 20 billing requests a minute per network;
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
* Prices come only from `BILLING_PRICES`. Stripe Checkout always shows the real amount whatever is set here, so keep the two the same. Today it holds the owner's provisional test values for the staging rehearsal (`docs/STAGING.md`): replace them with the final amounts in the release that switches production on.
* `TEST_PURCHASE_HOSTS` stays localhost-only. On localhost billing stays off unless `?billingDev=<port>` points at a local server (section 5), so test purchases keep working there.
* The client tests (`tests/billing.test.mjs`) follow these values. Each price must be `''` or an AUD price written like `A$9.99`.
* The billing copy never mentions the App Store.

## 4. The `ENTITLEMENT_MODE` switch

| Mode | `POST /v1/session` (Another Angle) needs |
|---|---|
| `testing` (today, the default) | Nothing but the app (and one of `TESTER_INVITE_CODES` if set). Unchanged. |
| `storekit` / `both` | A StoreKit transaction (`both`: or testing). Unchanged. |
| `billing+testing` | An active hushmallow Beyond web subscription, **or** one of `TESTER_INVITE_CODES` (a testing session with the testing caps). Without codes set it is the same as `billing`, never open to anyone. |
| `billing` | An active hushmallow Beyond web subscription. No invite code is accepted. |

In the billing modes, a session's allowance is per account, on every device: 20 angles a day. Its token lasts until the paid period ends, at most `BILLING_TOKEN_TTL_HOURS` (24).

**Order of switching:**

1. Deploy the Worker with the billing vars and secrets. The mode is still `testing`; check `/v1/health`.
2. Rehearse in test mode (section 5).
3. In one release, switch the app on (section 3) and set `ENTITLEMENT_MODE = "billing+testing"`. Then subscribers and testers both reach Another Angle.
4. When testing ends, set `ENTITLEMENT_MODE = "billing"`.

To switch off, set `ENTITLEMENT_MODE = "testing"` and/or `BILLING_PROVIDER = ''`. Subscriptions in Stripe carry on; cancel or refund them in the Stripe dashboard if needed.

## 5. Test-mode rehearsal (no deploy needed)

On your own computer, with Stripe **test** keys and the [Stripe CLI](https://docs.stripe.com/stripe-cli):

1. Forward webhooks to the local server, and note the `whsec_…` it prints:

   ```
   stripe login
   stripe listen --forward-to localhost:8790/v1/billing/webhook \
     --events checkout.session.completed,customer.subscription.created,customer.subscription.updated,customer.subscription.deleted,invoice.payment_failed
   ```

2. Run the Worker's local harness with the billing values. It uses the mock model, keeps subscriptions in memory and refuses live keys:

   ```
   cd hushmallow/server/another-angle
   STRIPE_SECRET_KEY=sk_test_… STRIPE_WEBHOOK_SECRET=whsec_… \
   STRIPE_PRICE_PAID_MONTHLY=price_… STRIPE_PRICE_PAID_YEARLY=price_… \
   STRIPE_PRICE_ULTRA_MONTHLY=price_… STRIPE_PRICE_ULTRA_YEARLY=price_… \
   SUPABASE_URL=https://igbxbfuaoybfzsroxuln.supabase.co SUPABASE_PUBLISHABLE_KEY=sb_publishable_… \
   APP_ORIGIN=http://localhost:8000 ENTITLEMENT_MODE=billing \
   npm run harness -- --serve 8790
   ```

3. Build the app with sign-in on and serve it on port 8000:

   ```
   cd hushmallow
   SUPABASE_URL=https://igbxbfuaoybfzsroxuln.supabase.co SUPABASE_PUBLISHABLE_KEY=sb_publishable_… \
     bash tools/build-site.sh /tmp/hm-site rehearsal
   python3 -m http.server 8000 -d /tmp/hm-site
   ```

4. Open `http://localhost:8000/?billingDev=8790&angleDev=8790`. `billingDev` switches billing on for that tab only, on localhost only, and survives the trip to Stripe and back. Without it, localhost has test purchases, as before. Sign in with a test account on hushmallow1.
5. Pay with Stripe's test cards. Use any future expiry date, any CVC and any postcode:
   * `4242 4242 4242 4242`: succeeds.
   * `4000 0025 0000 3155`: asks for 3-D Secure.
   * `4000 0000 0000 9995`: declined (insufficient funds).
   * `4000 0000 0000 0341`: the card is saved, but the next charge fails (`invoice.payment_failed`).
6. Check each of these:
   - [ ] As a guest, "Step into hushmallow Flow" opens the account screen. Once signed in, it opens Stripe Checkout with the right plan, period and AUD price.
   - [ ] After paying, the app says "Welcome to hushmallow Flow", Tell and worlds open, and Settings shows "Renews on …".
   - [ ] For hushmallow Beyond, Another Angle's session answers `source: "billing"`. Without Beyond, the server refuses the session (`subscription_required`) and Zuzu's authored angles play.
   - [ ] "Step into hushmallow Beyond" with Flow already active opens the portal; switching there makes the app show Beyond.
   - [ ] Settings → Manage subscription → cancel (at period end) makes Settings show "Ends on …". Cancelling the subscription **immediately** in the Stripe dashboard makes the plan go.
   - [ ] A failed renewal moves the status to `past_due` and Settings asks for the card to be updated. When retries are exhausted, the plan goes.

     Stripe's **test clocks** simulate renewals, but only for customers created on a clock, not the ones Checkout creates. To try it:
     1. In the dashboard, create a test-clock customer with the `…0341` card.
     2. Give it a subscription to one of the four prices, with metadata `user_id` set to the test account's id (Supabase → Authentication → Users).
     3. Advance the clock past the period end.
   - [ ] Resending an event from the dashboard (or `stripe events resend evt_…`) changes nothing; the log line says `"duplicate":true`.
   - [ ] The harness's log lines (stderr) never contain an email, an account id, a `cus_`/`sub_` id or a token.

A staging rehearsal with the real Worker and the real model is set up: the release branch's Pages preview (`https://claude-launch-rc.hushmallow.pages.dev`) uses the staging Worker, with billing on in Stripe test mode. It needs the `--env staging` secrets, a second (test) webhook endpoint for the staging URL, and the four test price ids. The steps and the checklist are in `docs/STAGING.md`.

## What is sent, stored and logged

* **The app → our Worker:** the account's access token, and `{ plan, period }` for a checkout. Never words, feelings or photos. A guest sends nothing. When billing is on and the person is signed in, Another Angle's `/v1/session` also carries the account's token. The consent card's "What's kept" line then says so ("When you're signed in, it also sends a sign-in token for your account, so our server can check your plan. Never your name or email."). With billing off, the line reads exactly as before.
  * Anyone who accepted the card before billing was switched on is asked again, once, before their token goes with a session (`src/beyond/consent.js` `sendsAccount`). No `CONSENT_VERSION` change is needed. A "Not now" stays as it was, since nothing is sent then. With billing off, nobody is asked again.
* **Our Worker → Stripe:**
  * the price;
  * the account id, as `client_reference_id` and as metadata on the session and the subscription (a random UUID, not an email);
  * the return URLs;
  * the Stripe customer, for a returning subscriber.

  Stripe itself collects the email and card on its own pages.
* **Stored by our Worker** (the `Billing` Durable Object):
  * for each subscribing account: the Stripe customer and subscription ids, Stripe's status, the plan and period, the period end, and whether it cancels then;
  * which account each Stripe customer belongs to;
  * the ids of Stripe events already applied (kept 30 days).

  Never card details, emails, names, words or feelings.
* **Logged:** metadata only: route, HTTP status, outcome, plan, period, tier, Stripe's event type and status. Never an account id, email, Stripe id, token or key.
* **Kept on the phone:** the entitlement: tier, source `billing`, when it was checked, Stripe's status, the period end and whether it cancels then.

## Known limits

* **Flow is enforced only in the browser.** hushmallow Flow's rituals and worlds run entirely on the phone. A determined person can edit the stored entitlement (or the code) and unlock Flow, and Beyond's on-phone parts, without paying. Stripe and the server cannot stop that; only moving content behind a server could. **Beyond's server cost is enforced:** in `billing` mode, Another Angle's model is reached only with a session the server issued after checking an active Beyond subscription.
* A cancelled or refunded subscription keeps a session it already has until that token expires (at most 24 hours). The app's own copy of the plan lapses at the next check, or after the 3-day offline grace.
* **Deleting a hushmallow account does not cancel its Stripe subscription.** The account's `Billing` record also stays, because the Worker is not told about deletions. With billing on, the delete screen's "Not touched" list says both: "a web subscription, if you have one, and our server's record of it (which plan and its status, never your card): deleting your account doesn't cancel it, so cancel it first in Settings → Manage subscription". After deleting, the person can no longer reach Manage subscription, so turn on the portal's login link (section 1). Cancelling for the person, or removing the record, is an open item.
* **Only `APP_ORIGIN` sells.** Stripe sends everyone back to `APP_ORIGIN`, and the app's other addresses (`hushmallow.pages.dev`, the github.io address) have no checkout return of their own. Someone who subscribes from one of them comes back to app.hushmallow.com, where they are not signed in yet: sign-in is kept per address. They sign in there. The plan belongs to the account, so it also shows on the other address at its next check.
* One subscription per account. Changes (Flow ↔ Beyond, monthly ↔ yearly) happen in the portal, so "switch plans" must be on there. Two checkouts started at once share one Checkout Session. A second checkout started more than two minutes later, before the first one's webhook arrives, can still make a second subscription. Refund it in the dashboard.
* After signing in, the app reloads into the account screen. The person goes back to the plans page themselves, and their choice is not remembered.
* A person who subscribes on the web and later uses the App Store app is not recognised there: StoreKit and Stripe are separate.
* **Not tested against live Stripe or Supabase.** The tests use faithful fakes of both (`server/another-angle/test/billing.test.js`, `tests/billing.test.mjs`). The first test-mode rehearsal above is the real check.

## Before launch (owner)

* **Prices:** the amounts for the four prices.
* **Access while a card is failing:** keep access during `past_due` (the default here) or not.
* **Cancellation and plan changes:** cancel at period end or at once; proration on plan changes.
* **Tax:** GST and Stripe Tax.
* **Legal documents:** a privacy policy and terms for the main app, naming Stripe as payment processor. Australian consumer law covers renewals, cancellation and refunds. None of these documents exists yet.
* **Account deletion:** whether deleting an account should also cancel its subscription and remove its `Billing` record (the open item above).
