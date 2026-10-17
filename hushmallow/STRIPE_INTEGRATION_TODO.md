# Stripe integration: status and what is left

hushmallow Flow and hushmallow Beyond are sold on the web as Stripe subscriptions, in **US dollars**
(the owner's decision, 2026-10-17). The codebase already created Checkout Sessions, so the owner's Checkout
Studio settings were applied to that existing call, not to a new integration: the Worker's own REST client
(no Stripe SDK), pinned to API version `2026-08-26.dahlia`, server-side entitlements and cancellation
through the customer portal, all as before. The full owner guide is [docs/PAYMENTS.md](docs/PAYMENTS.md);
the staging rehearsal, click by click, is [docs/STAGING.md](docs/STAGING.md). This file holds no secret,
no key and no account id, and must never hold one.

## Values to Replace

Files that still hold a placeholder or an unverified value:

* [server/another-angle/wrangler.toml](server/another-angle/wrangler.toml): `[env.staging.vars]` the four
  staging price ids (the owner's sandbox ids, to be verified against Stripe); production's `[vars]` have no
  billing var at all yet (by design, until the activation commit).
* [legal/terms.html](legal/terms.html): whether prices include GST or any other tax (an `[Owner: …]`
  placeholder, for the owner and their adviser).

No longer a placeholder: the staging sign-in project is set (17 Oct 2026), the owner's
`https://oghzabvkrxsejkkjdsuc.supabase.co` (Singapore), in [src/auth/config.js](src/auth/config.js)
(`STAGING_PROJECT_REF`, `STAGING_PUBLISHABLE_KEY`),
[server/another-angle/src/config.js](server/another-angle/src/config.js) (`STAGING_SUPABASE_PROJECT_URL`) and
`[env.staging.vars]` (`SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`; the `STAGING_TODO` placeholders are gone).

| Value | Where | State | What to do |
|---|---|---|---|
| `mode` | [server/another-angle/src/billing/routes.js](server/another-angle/src/billing/routes.js) | Set: `subscription` | Nothing (not a placeholder) |
| `success_url` | same | Set: `<APP_ORIGIN>/?billing=success&session_id={CHECKOUT_SESSION_ID}` | Nothing (`APP_ORIGIN` is per Worker in `wrangler.toml`) |
| `cancel_url` | same | Set: `<APP_ORIGIN>/?billing=cancel` | Nothing |
| `line_items[0][price]` | from configuration: `STRIPE_PRICE_PAID_MONTHLY`, `_PAID_YEARLY`, `_ULTRA_MONTHLY`, `_ULTRA_YEARLY` | Staging: the owner's four ids (below). Production: **unset** | Production needs **live mode's own four prices** (a sandbox id never works with a live key), added in the activation commit |
| The four staging ids: sandbox or live? | `[env.staging.vars]` | The owner's sandbox ids (17 Oct). **To be verified** against Stripe (this environment cannot reach api.stripe.com yet) | At the first sandbox run, the price check and the driver's P0 read each one from Stripe with the sandbox key: amount, interval, currency and active must match its slot, else it is refused. An id from another account or mode answers the sandbox key "No such price" (`503 price_misconfigured`, `not_found` in the log) |
| Staging sign-in project | `[env.staging.vars]` `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`; `STAGING_PROJECT_REF`; `STAGING_SUPABASE_PROJECT_URL` | Set: `oghzabvkrxsejkkjdsuc` (Singapore, 17 Oct 2026) | Run its SQL and sign-in settings (STAGING.md A2, A3), delete production's values from Pages Preview (A5). Until the staging Worker is redeployed, its billing routes answer `503 accounts_not_configured` |
| Worker secrets | Cloudflare (never a file) | Not set | See "Worker secrets" below |
| `ui_mode = hosted_page` on the pin | routes.js `CHECKOUT_STUDIO` | Sent as given | Confirm at the first sandbox checkout (below) |

The owner's prices (2026-10-17):

| Product | Plan id in the code | Monthly | Yearly |
|---|---|---|---|
| hushmallow Flow | `paid` | US$9.99, `price_1URQs5L6VU7tTQ40MQxgK1On` | US$99.99, `price_1URQtXL6VU7tTQ40hf1mzuLd` |
| hushmallow Beyond | `ultra` | US$19.99, `price_1URQyUL6VU7tTQ408wYz4vYP` | US$199.99, `price_1URQuYL6VU7tTQ403DSA9bfh` |

These are the owner's **sandbox** prices, on staging (`[env.staging.vars]`). The owner supplied the Beyond yearly id
separately: it is to be confirmed against Stripe at the first sandbox run (the price check refuses any id whose
amount or interval does not match its slot).

The owner's prices in the **original account** are reserved for production, after they are checked in live
mode: Flow (`prod_VSG7mi9Err8Yxp`) `price_1URLbJL2iXNcXbZPceXTGXsH` monthly and `price_1URLeGL2iXNcXbZPz31feM3V`
yearly; Beyond (`prod_VSGH3KuGjUAdQr`) `price_1URLlFL2iXNcXbZPGjBOF6zy` monthly and `price_1URLv2L2iXNcXbZP6vLFoAtV`
yearly. Never mix them with the sandbox's ids, keys, customers or webhooks.

What checkout requires of a price (`CHECKOUT_PRICE_RULES`): `usd`, and no other currency added to it
(`currency_options`, which Checkout would otherwise charge some customers in), recurring every 1 month or 1
year as its slot, the owner's amount for its slot (`unit_amount` 999, 9999, 1999 or 19999 US cents), active. A lookup key
is optional: if the price has one it must be `hushmallow.<plan>.<period>` (for example
`hushmallow.ultra.monthly`); with none, the configured id decides the plan. Since the four amounts differ, two
ids pasted into each other's slots are refused with lookup keys or without, in test and live mode alike, and
one id in two slots is never sold (`/v1/health` says `"duplicate_prices"`; the tests refuse it in
`wrangler.toml`). Setting the four lookup keys is still recommended: they tie each price to its slot in
Stripe itself. Tax behaviour: any while Stripe Tax is off; `inclusive` or `exclusive` (never unspecified)
before `STRIPE_AUTOMATIC_TAX` goes on. The app's `BILLING_PRICES` ([src/app/config.js](src/app/config.js))
shows US$9.99, US$99.99, US$19.99 and US$199.99: display only, Checkout charges what Stripe holds, and a test
keeps them the same as the Worker's amounts.

## Configured Parameters

Files: [server/another-angle/src/billing/routes.js](server/another-angle/src/billing/routes.js)
(`CHECKOUT_STUDIO`, `CHECKOUT_TAX`, `checkoutSettings`, `CHECKOUT_INTEGRATION_IDENTIFIER`, the `create()` call
in `checkout`), [server/another-angle/src/billing/stripe.js](server/another-angle/src/billing/stripe.js)
(`createCheckoutSession`, unchanged), [server/another-angle/wrangler.toml](server/another-angle/wrangler.toml)
(`STRIPE_API_VERSION`, `STRIPE_AUTOMATIC_TAX`, the price ids). The exact form body is pinned by
`test/billing-checkout.test.js`.

The Checkout Studio's values, sent on every Checkout Session exactly as given:

| Parameter | Value | Note |
|---|---|---|
| `ui_mode` | `hosted_page` | The Stripe-hosted page. The Studio gives this value for SDK 21.0.0 and later; there is no SDK here (the REST calls pin `2026-08-26.dahlia`), so it is sent as the default. **Version dependency:** if Stripe refuses it as an invalid value on this pin, `hosted` is the older name of the same page |
| `billing_address_collection` | `auto` | Stripe asks for an address only when it needs one |
| `phone_number_collection[enabled]` | `false` | |
| `automatic_tax[enabled]` | `false` | Until `STRIPE_AUTOMATIC_TAX` is on (below) |
| `allow_promotion_codes` | `false` | No promotion codes (D14) |
| `payment_method_collection` | `always` | Subscription mode, so it applies |
| `submit_type` | `auto` | Stripe words the button |
| `integration_identifier` | `hosted_web_0001` | Sent only from API version 2026-03-25 on, which the pinned version is. (Stripe's guidance suggests a label ending in 8 random letters; the Studio's value is used as given) |
| `origin_context` | `web` | |

Kept from the existing integration, although the Studio's field list does not have them (a deliberate
deviation from "remove any parameters absent from the Field Intents"):

| Parameter | Value | Why it stays |
|---|---|---|
| `mode` | `subscription` | The sale itself |
| `line_items[0][price]`, `[quantity]` | the slot's configured price, 1 | The sale itself |
| `success_url`, `cancel_url` | as above | The app's return, and `session_id` for `POST /v1/billing/sync` |
| `customer` | the account's one Stripe customer | One customer per account: the duplicate-subscription guard and the portal |
| `client_reference_id` | the hushmallow account id | The webhook and sync find the account from it |
| `metadata[user_id]`, `[plan]`, `[period]`, `[price]` | the account, plan, period, price | The account, and reusing an open session only for the same sale |
| `subscription_data[metadata][user_id]` | the account id | Every later subscription event (renewal, failure, cancellation) finds the account, so the entitlement follows Stripe |

Never sent: `payment_method_types` (dynamic payment methods; which ones is a Dashboard setting), a trial, a
discount, an email (Checkout asks for it).

**The tax switch** (`STRIPE_AUTOMATIC_TAX`, decision D3) stays, default `"false"`, which is the Studio's value.
Off, the session carries exactly the values above. Turn it on only after an active registration (Collecting)
is verified in that Stripe environment, the four prices have the tax behaviour inclusive or exclusive, and a
test calculation is not `not_collecting` (PAYMENTS.md "Stripe Tax"). On, it deliberately overrides two Studio
values: `automatic_tax[enabled]=true` and `billing_address_collection=required`, and adds
`customer_update[address]=auto`, so the address typed at checkout is taxed and saved on the customer. Stripe
Tax collects nothing (silently) without an active registration; which jurisdictions you register in, with
prices in US dollars, is for you and your tax adviser.

The body sent today (staging, tax off), in order: `mode`, `line_items`, `customer`, `client_reference_id`,
`success_url`, `cancel_url`, `metadata`, `subscription_data[metadata][user_id]`, then the Studio's values,
then `integration_identifier`. Should Stripe refuse any value on the pinned version, checkout answers
`502 billing_unavailable` and the Worker's log line carries Stripe's error code (`err`) and HTTP status
(`stripe_http`): fix that value in `CHECKOUT_STUDIO` and its test.

**The customer portal's sessions** (`POST /v1/billing_portal/sessions`, from `POST /v1/billing/portal`; every
return address on `APP_ORIGIN`, never the request's), pinned by `test/billing-upgrade.test.js`:

| Asked for | Parameters sent |
|---|---|
| Settings → Manage subscription, `{}` | `customer`, `return_url=<APP_ORIGIN>/?billing=portal` (the home: cancel, change plan, card, receipts; unchanged) |
| Choose a plan, `{ intent: 'switch' }` | `customer`, `return_url=<APP_ORIGIN>/?billing=unchanged`, `flow_data[type]=subscription_update`, `flow_data[subscription_update][subscription]`, `flow_data[after_completion][type]=redirect`, `flow_data[after_completion][redirect][return_url]=<APP_ORIGIN>/?billing=changed` |
| One upgrade, `{ intent: 'upgrade', plan, period }` | `customer`, `return_url=<APP_ORIGIN>/?billing=unchanged`, `flow_data[type]=subscription_update_confirm`, `flow_data[subscription_update_confirm][subscription]`, `[items][0][id]` (its one item, `si_…`), `[items][0][price]` (the target's configured price), `[items][0][quantity]=1`, `flow_data[after_completion][type]=redirect`, `flow_data[after_completion][redirect][return_url]=<APP_ORIGIN>/?billing=changed&to=<plan>.<period>` |

Stripe refusing a plan-change flow (`400`: plan switching off, or the price not under the portal's products)
answers `503 plan_change_unavailable`, with Stripe's code in the log; the home is never opened in its place.

## Setup

### Worker secrets

Set by hand, never in a file, a chat or a commit (`npx wrangler secret put <NAME> --env staging`, or the
Cloudflare dashboard → the Worker → Settings → Variables and Secrets → type Secret):

* `STRIPE_SECRET_KEY`: a **restricted** key, `rk_test_…`, from the **same sandbox as the four prices**, with
  exactly Checkout Sessions Write, Customer portal Write, Subscriptions Read, Customers Write, Prices Read
  (STAGING.md B8). The staging Worker refuses a live key; production takes a live key only, and only after
  the approval commit.
* `STRIPE_WEBHOOK_SECRET`: the signing secret of that Worker's own webhook endpoint (below).

### Vars

In `wrangler.toml`, none of them secret: the sign-in project (`SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`),
`APP_ORIGIN`, the four `STRIPE_PRICE_*` ids, `STRIPE_API_VERSION = "2026-08-26.dahlia"`, and optionally
`STRIPE_AUTOMATIC_TAX`. **No Stripe publishable key is needed**: the hosted Checkout Session is created on the
server and the app only opens its URL (it never loads Stripe.js). Never put a key in code.

### Webhook endpoint

One per Worker (staging: `https://hushmallow-another-angle-staging.vibyfy-chat.workers.dev/v1/billing/webhook`;
production, later: `https://hushmallow-another-angle.vibyfy-chat.workers.dev/v1/billing/webhook`), on API
version **`2026-08-26.dahlia`**, with exactly these 11 events: `checkout.session.completed`,
`checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`,
`customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`,
`customer.subscription.paused`, `customer.subscription.resumed`, `invoice.paid`, `invoice.payment_failed`,
`invoice.payment_action_required`. Create it only once that Worker is configured (STAGING.md B11): until then
it answers `503` and Stripe retries for days. The webhook is required, not optional: renewals, failed
payments and cancellations reach the Worker only through it.

### Customer portal

Settings → Billing → Customer portal (PAYMENTS.md section 1, step 7): customers can **switch plans**, with
both products and **all four prices** under Subscriptions → products (Flow monthly and yearly, Beyond monthly
and yearly; quantity off; upgrades prorated at once, downgrades at the period end, D8); **cancel at the end of
the billing period** (D7); **update payment methods**; invoice history on; pause off; the login link on, for
someone who deleted their account. The upgrade's confirmation page (`subscription_update_confirm`) and the
plan choice (`subscription_update`) need those four prices there: Stripe refuses either for a price not
listed, and the Worker then answers `503 plan_change_unavailable` (never the portal's home instead).

### Revenue recovery

Settings → Billing → Revenue recovery: Smart Retries over about 2 weeks (the 14-day `past_due` cap, D5); when
all retries fail, **cancel the subscription** (D6; never "mark as unpaid" or "leave past due"); emails for
failed payments, expiring cards and 3-D Secure confirmations.

## Project structure

Files touched by this work: `server/another-angle/src/billing/routes.js` (the Studio settings, the price
rules: USD only, each slot's amount), `server/another-angle/src/billing/stripe.js` (`retrievePrice` reads
`currency_options`), `server/another-angle/src/billing/store.js` (`noLookupKey` exported),
`server/another-angle/src/config.js` (one id in two slots counts as unset), `server/another-angle/src/app.js`
(`/v1/health` `duplicate_prices`), `server/another-angle/wrangler.toml` (the staging ids, comments),
`server/another-angle/scripts/billing-e2e.mjs` (prices read by id, in US$; tax checks for any jurisdiction)
and `scripts/billing-checks.mjs`, `src/app/config.js` and `src/app/billing.js` (US$ display prices), their
tests, `docs/PAYMENTS.md`, `docs/STAGING.md`, `docs/integration/DECISIONS.md`, `server/another-angle/README.md`,
`legal/terms.html`, and this file. **No new route**: the five `/v1/billing/*` routes are as before. The
upgrade (17 Oct 2026) added bodies to two of them, in `server/another-angle/src/billing/routes.js`: the
portal's `{ intent: 'upgrade', plan, period }` and sync's `{ refresh: true }`, with `period` in the status
body (`server/another-angle/test/billing-upgrade.test.js`).

## Flow overview

1. The plans page: a signed-in person picks Flow or Beyond, monthly or yearly.
2. `POST /v1/billing/checkout` `{ plan, period }` with the account's token: the Worker checks the account, the
   price (`CHECKOUT_PRICE_RULES`) and that the account has no subscription yet, then creates the Checkout
   Session with the values above and answers `{ url }`.
3. Stripe-hosted Checkout takes the payment.
4. Stripe's signed events reach `POST /v1/billing/webhook`; back on the app, `POST /v1/billing/sync`
   `{ session_id }` records the subscription at once. Both read the subscription back from Stripe.
5. The entitlement: the `Billing` Durable Object's record for the account decides the tier (Flow `paid`,
   Beyond `ultra`); the app asks `GET /v1/billing/status`.
6. The Another Angle gate: in the billing modes `POST /v1/session` needs an active Beyond subscription.
7. Cancellation and everything else: Settings → Manage subscription, `POST /v1/billing/portal` `{}`, the
   portal's home (back to `?billing=portal`), unchanged.
8. Upgrades, without the portal's home (the owner's request, 17 Oct 2026): `POST /v1/billing/portal`
   `{ intent: 'upgrade', plan, period }` opens Stripe's confirmation of that one change
   (`flow_data[type]=subscription_update_confirm`, after Stripe's copy of the subscription is checked: the
   account's, `active` or `trialing`, one item, no change waiting, the target an upgrade and a price checkout
   would sell), `{ intent: 'switch' }` the plan choice (`subscription_update`). Both come back by
   `flow_data[after_completion][type]=redirect` to `<APP_ORIGIN>/?billing=changed` (`&to=<plan>.<period>`),
   or to `<APP_ORIGIN>/?billing=unchanged` by the portal's back link. The app then asks
   `POST /v1/billing/sync` `{ refresh: true }`: the subscription read from Stripe and recorded, and only that
   answer (the status body, with `period`) says the change happened.

## Testing

Test cards (any future expiry date, any CVC, any postcode):

| Card | Result |
|---|---|
| `4242 4242 4242 4242` | Succeeds |
| `4000 0025 0000 3155` | Asks for 3-D Secure |
| `4000 0000 0000 9995` | Declined |
| `4000 0000 0000 0341` | Attaches, then the next charge fails (failed renewals) |

Renewals, failed renewals, recovery, retries running out, plan changes, cancellations and resent events run
on **test clocks** with the sandbox driver, `scripts/billing-e2e.mjs`
(`cd server/another-angle && npm run e2e:billing`, test keys only; STAGING.md "The sandbox driver"). Its
preflight (P0) reads the four configured prices by id and checks what the Worker sells (USD, the interval,
each slot's amount), the product names and `BILLING_PRICES`.

## Next steps

1. Verify that the four price ids are the sandbox's (the table above). If not, make the sandbox's four.
2. Optionally set the four lookup keys on the prices (`hushmallow.paid.monthly` and so on).
3. The staging project (done: `oghzabvkrxsejkkjdsuc`): run its SQL and sign-in settings, then the Pages
   Preview variables (STAGING.md A2, A3, A5).
4. In the sandbox: the restricted key and the staging secrets (B8, B9), the portal (B6), revenue recovery
   (B7), then the webhook endpoint (B11) after Claude's go-ahead.
5. Run the sandbox driver (P0, P1, S3 to S9) and the manual checklist (S1, S2, S10 to S14), including one
   checkout that shows the Studio settings (no phone number, no promotion code field) and confirms
   `ui_mode=hosted_page` is accepted on the pin.
6. With your adviser: tax registrations, whether prices include tax, and the terms' `[Owner: …]` wording.
7. Live mode: its own four prices at the same US$ amounts, its own restricted `rk_live_…` key and webhook
   endpoint, the portal and recovery settings again (PAYMENTS.md sections 1 and 2).
8. Before the activation commit, check the four live prices by hand (PAYMENTS.md section 4, step 2): the
   sandbox driver takes test keys only and cannot read them. For each slot: the product (Flow for `PAID`,
   Beyond for `ULTRA`), the amount, the interval, USD, active. The Worker refuses a wrong amount, currency or
   interval and an id in two slots by itself; the product name is yours to check.

## Live activation

The owner approved production charging **only after the full test-mode flow passes**. Until then production's
`[vars]` keep no billing var and `ENTITLEMENT_MODE = "testing"`, and the production Worker refuses a live
key. Activation is its own reviewed commit, merged by the owner: `BILLING_LIVE = "approved"` with the live
vars (live price ids, each checked by hand first, step 8 above; `STRIPE_API_VERSION`, the sign-in project,
`APP_ORIGIN`) and the app's switch in the same release (PAYMENTS.md section 4). That merge is the approval;
nothing else is.

## Resources

* Stripe support: https://support.stripe.com
* Stripe's MCP server (for an agent with Stripe access): https://docs.stripe.com/mcp
