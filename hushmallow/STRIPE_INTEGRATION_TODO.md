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

* [server/another-angle/wrangler.toml](server/another-angle/wrangler.toml): `[env.staging.vars]`
  `SUPABASE_URL` (`https://STAGING_TODO.supabase.co`) and `SUPABASE_PUBLISHABLE_KEY` (a `TODO` placeholder);
  the four staging price ids (the owner's, environment not verified); production's `[vars]` have no billing
  var at all yet (by design, until the activation commit).
* [src/auth/config.js](src/auth/config.js): `STAGING_PROJECT_REF = ''`.
* [server/another-angle/src/config.js](server/another-angle/src/config.js): `STAGING_SUPABASE_PROJECT_URL = ''`.
* [legal/terms.html](legal/terms.html): whether prices include GST or any other tax (an `[Owner: …]`
  placeholder, for the owner and their adviser).

| Value | Where | State | What to do |
|---|---|---|---|
| `mode` | [server/another-angle/src/billing/routes.js](server/another-angle/src/billing/routes.js) | Set: `subscription` | Nothing (not a placeholder) |
| `success_url` | same | Set: `<APP_ORIGIN>/?billing=success&session_id={CHECKOUT_SESSION_ID}` | Nothing (`APP_ORIGIN` is per Worker in `wrangler.toml`) |
| `cancel_url` | same | Set: `<APP_ORIGIN>/?billing=cancel` | Nothing |
| `line_items[0][price]` | from configuration: `STRIPE_PRICE_PAID_MONTHLY`, `_PAID_YEARLY`, `_ULTRA_MONTHLY`, `_ULTRA_YEARLY` | Staging: the owner's four ids (below). Production: **unset** | Production needs **live mode's own four prices** (a sandbox id never works with a live key), added in the activation commit |
| The four staging ids: sandbox or live? | `[env.staging.vars]` | **To be verified** (this environment cannot reach api.stripe.com) | Open each in the Stripe dashboard with the sandbox selected. A live id answers the staging Worker's test key "No such price": checkout refuses it (`503 price_misconfigured`, `not_found` in the log) and the sandbox driver's P0 names the slot. If they are live, make the same four in the sandbox and send Claude the new ids (STAGING.md B4, B10) |
| Staging sign-in project | `[env.staging.vars]` `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`; `STAGING_PROJECT_REF`; `STAGING_SUPABASE_PROJECT_URL` | Placeholders | Create hushmallow-staging and send Claude its URL and public key (STAGING.md A1 to A4). Until then every billing route answers `503 accounts_not_configured` |
| Worker secrets | Cloudflare (never a file) | Not set | See "Worker secrets" below |
| `ui_mode = hosted_page` on the pin | routes.js `CHECKOUT_STUDIO` | Sent as given | Confirm at the first sandbox checkout (below) |

The owner's prices (2026-10-17):

| Product | Plan id in the code | Monthly | Yearly |
|---|---|---|---|
| hushmallow Flow (`prod_VSG7mi9Err8Yxp`) | `paid` | US$9.99, `price_1URLbJL2iXNcXbZPceXTGXsH` | US$99.99, `price_1URLeGL2iXNcXbZPz31feM3V` |
| hushmallow Beyond (`prod_VSGH3KuGjUAdQr`) | `ultra` | US$19.99, `price_1URLlFL2iXNcXbZPGjBOF6zy` | US$199.99, `price_1URLv2L2iXNcXbZP6vLFoAtV` |

What checkout requires of a price (`CHECKOUT_PRICE_RULES`): `usd`, recurring every 1 month or 1 year as its
slot, active. A lookup key is optional: if the price has one it must be `hushmallow.<plan>.<period>` (for
example `hushmallow.ultra.monthly`); with none, the configured id decides the plan. Setting the four lookup
keys is still recommended: they also catch two ids pasted into each other's slots (without them, only the
driver's amount and product-name checks do). Tax behaviour: any while Stripe Tax is off; `inclusive` or
`exclusive` (never unspecified) before `STRIPE_AUTOMATIC_TAX` goes on. The app's `BILLING_PRICES`
([src/app/config.js](src/app/config.js)) shows US$9.99, US$99.99, US$19.99 and US$199.99: display only,
Checkout charges what Stripe holds.

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

Settings → Billing → Customer portal (PAYMENTS.md section 1, step 7): customers can **switch plans** between
the four prices (Flow monthly and yearly, Beyond monthly and yearly; quantity off; upgrades prorated at once,
downgrades at the period end, D8); **cancel at the end of the billing period** (D7); **update payment
methods**; invoice history on; pause off; the login link on, for someone who deleted their account.

### Revenue recovery

Settings → Billing → Revenue recovery: Smart Retries over about 2 weeks (the 14-day `past_due` cap, D5); when
all retries fail, **cancel the subscription** (D6; never "mark as unpaid" or "leave past due"); emails for
failed payments, expiring cards and 3-D Secure confirmations.

## Project structure

Files touched by this work: `server/another-angle/src/billing/routes.js` (the Studio settings, the price
rules), `server/another-angle/src/billing/store.js` (`noLookupKey` exported), `server/another-angle/src/config.js`
(a comment), `server/another-angle/wrangler.toml` (the staging ids, comments),
`server/another-angle/scripts/billing-e2e.mjs` (prices read by id, in US$), `src/app/config.js` and
`src/app/billing.js` (US$ display prices), their tests, `docs/PAYMENTS.md`, `docs/STAGING.md`,
`docs/integration/DECISIONS.md`, `server/another-angle/README.md`, `legal/terms.html`, and this file. **No new
route**: the five `/v1/billing/*` routes are as before.

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
7. Changes and cancellation: `POST /v1/billing/portal` opens Stripe's customer portal.

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
preflight (P0) reads the four configured prices by id and checks USD, the interval, the amounts in US$, the
product names and `BILLING_PRICES`.

## Next steps

1. Verify that the four price ids are the sandbox's (the table above). If not, make the sandbox's four.
2. Optionally set the four lookup keys on the prices (`hushmallow.paid.monthly` and so on).
3. Create hushmallow-staging (STAGING.md Part A) and send Claude its public values.
4. In the sandbox: the restricted key and the staging secrets (B8, B9), the portal (B6), revenue recovery
   (B7), then the webhook endpoint (B11) after Claude's go-ahead.
5. Run the sandbox driver (P0, P1, S3 to S9) and the manual checklist (S1, S2, S10 to S14), including one
   checkout that shows the Studio settings (no phone number, no promotion code field) and confirms
   `ui_mode=hosted_page` is accepted on the pin.
6. With your adviser: tax registrations, whether prices include tax, and the terms' `[Owner: …]` wording.
7. Live mode: its own four prices at the same US$ amounts, its own restricted `rk_live_…` key and webhook
   endpoint, the portal and recovery settings again (PAYMENTS.md sections 1 and 2).

## Live activation

The owner approved production charging **only after the full test-mode flow passes**. Until then production's
`[vars]` keep no billing var and `ENTITLEMENT_MODE = "testing"`, and the production Worker refuses a live
key. Activation is its own reviewed commit, merged by the owner: `BILLING_LIVE = "approved"` with the live
vars (live price ids, `STRIPE_API_VERSION`, the sign-in project, `APP_ORIGIN`) and the app's switch in the
same release (PAYMENTS.md section 4). That merge is the approval; nothing else is.

## Resources

* Stripe support: https://support.stripe.com
* Stripe's MCP server (for an agent with Stripe access): https://docs.stripe.com/mcp
