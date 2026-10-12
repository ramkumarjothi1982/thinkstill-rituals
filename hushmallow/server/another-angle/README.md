# Another Angle server (hushmallow Beyond)

This small server is the only part of hushmallow that talks to an outside model. It sits between the app and Claude, so the API key never reaches a phone or the Framer site, and it checks every answer before the app sees it.

```
hushmallow app (Pages / Framer / iPhone)
   │  POST /v1/angle  (session token, the person's words, chosen feeling)
   ▼
Cloudflare Worker  ── safety check → Claude (structured JSON) → schema check → quality gate
   │                     (one retry with the reasons; otherwise "use your own engine")
   ▼
scene JSON → the app's cinematic renderer (Zuzu, Thought Mallows, two subtitle lines)
```

It is **not** part of the GitHub Pages site: `tools/build-site.sh` only copies `src/` and the art, and this folder deploys separately through `.github/workflows/another-angle.yml`.

## What happens on each request

1. **Checks before anything else.** HTTPS only; the request must come from an allowed website (`ALLOWED_ORIGINS`); each network address gets a short burst limit; the session token must be valid; the body must be well-formed (text 1–600 characters, a feeling and intention from the app's lists, at most four earlier angles, `"consent": true`).
2. **Safety first.** The words are checked against the app's own safety lexicon (a byte-for-byte copy of `hushmallow/src/data/safety-lexicon.js`). Anything about self-harm, suicide, someone in danger, abuse, violence, threats, harassment, discrimination or feeling unsafe gets the authored support message instead — the model is never called and no daily quota is used.
3. **Limits.** Each device (or, later, each subscriber) has a daily allowance (`DEVICE_DAILY_LIMIT`, 20 by default). The whole service has a daily spending cap (`DAILY_SPEND_CAP_USD`, $10 by default). If the cap is reached the app is told to use its own authored engine instead.
4. **The model.** One request to `claude-opus-5-5` at low effort, with the versioned instructions in `prompts/angle-v1.md` and a strict JSON schema (structured outputs). The person's words are sent inside a marked data block that cannot be closed or used to give instructions. If the model's safety classifier declines, Anthropic's recommended fallback model answers in the same call (`fallbacks: "default"`).
5. **Checking the answer.** The JSON must match the schema exactly (fixed lists of Mallows, reasoning patterns and mechanics). The model's own safety judgement is honoured. Then a deterministic quality gate checks the two subtitle lines: one short sentence each, 15–35 words together, no line over 22 words, no generic affirmations, empathy clichés, therapy jargon, false reassurance, blame, links or code, nothing stated as fact about someone else's mind, no invented names or numbers, British spelling, about the person's actual situation, and genuinely different from angles already shown.
6. **One second chance.** If the gate fails, the model gets exactly one retry with the specific reasons. If that fails too, the app is told to use its authored engine (`src/ultra/reframe-engine.js`) — it never shows a weak answer.

## The API (for the app)

All responses are JSON with `Cache-Control: no-store`. Errors look like `{ "status": "error" | "limit", "error": { "code", "message" } }`; messages are for developers, never for people.

### `GET /v1/health`

`{ ok, service, prompt_version, schema_version, provider, entitlement_mode, configured: { signing_key, provider_key } }`

### `POST /v1/session`

Testing phase body: `{}` (or `{ "invite": "CODE" }` if `TESTER_INVITE_CODES` is set). Production body: `{ "signed_transaction": "<StoreKit 2 Transaction.jwsRepresentation>" }`. Optional: `platform` (`web`/`ios`), `app_version`.

Response: `{ status: "ok", token, token_type: "Bearer", expires_at, source: "testing" | "storekit", quota: { daily, remaining, resets_at } }`. Keep the token (it is not secret from the person, but treat it like a password); send it as `Authorization: Bearer <token>`. On a `401` from `/v1/angle`, get a new session.

### `POST /v1/angle`

```json
{
  "consent": true,
  "text": "My colleague got promoted instead of me.",
  "emotion": "disappointed",
  "intention": "help-me-feel-steady",
  "previous_angles": [
    { "subtitle_line_1": "…", "subtitle_line_2": "…", "reasoning_pattern": "practical_problem" }
  ],
  "locale": "en-GB",
  "request_id": "optional-8-to-64-chars"
}
```

* `emotion`: any id from `src/data/emotions.js` or a chip word (`angry`, `anxious`, `sad`, `overwhelmed`, `frustrated`, `lonely`, `restless`, `something-else`).
* `intention`: `calm` / `let_go` / `distract` / `steady` / `play` (the chip labels, e.g. `calm-me-down`, are accepted too).
* `previous_angles`: what the person already saw, for "Show me another angle" (up to four).
* Never send photos: the server rejects unknown fields.

Response (always HTTP 200 unless the request itself was wrong):

```json
{
  "status": "ok",
  "prompt_version": "angle-v1", "schema_version": "scene-v1", "request_id": "…",
  "scene": {
    "emotion": "disappointment", "situation_type": "work", "reasoning_pattern": "practical_problem",
    "known_fact": "…", "possible_assumption": "", "alternative_angle": "…", "practical_next_step": "…",
    "interaction_type": "assemble_step", "mallow_character": "boppo",
    "subtitle_line_1": "That disappointment makes sense.",
    "subtitle_line_2": "Could you ask what specific experience or results would strengthen your next promotion opportunity?",
    "safety_status": "ok"
  },
  "support": null, "fallback": null, "keep_support_close": false,
  "quota": { "daily": 20, "remaining": 19, "resets_at": "…" }
}
```

| `status` | Meaning | What the app does |
|---|---|---|
| `ok` | `scene` is checked and ready | Play the scene for `interaction_type`, reveal the two lines |
| `crisis` / `care` | `support` holds the authored title, message and helplines | Show support (`openSupport(app, {urgent: status === 'crisis'})`); no reframe, no Thought Mallow transformation |
| `fallback` | `fallback.reason` is `quality`, `unclear`, `refusal`, `timeout`, `provider` or `capacity` | Use the authored engine. `unclear` means "ask for a little more". `fallback.hint` may suggest a pattern/mechanic/Mallow |

`keep_support_close: true` means the words sounded heavy (for example "can't cope"): keep the Support chip visible.

HTTP errors: `400` invalid body (`error.code`, plus `field`), `401` no or bad token, `403` origin not allowed / invite needed / HTTPS required, `413` too large, `415` not JSON, `429` daily limit (`quota`, `Retry-After`) or burst limit, `503` not configured.

### `POST /v1/feedback`

`{ "rating": "helped" | "another_angle" | "not_relevant" | "just_squeeze", "reasoning_pattern"?, "interaction_type"?, "mallow_character"?, "prompt_version"? }` with the same bearer token → `202 { "status": "ok" }`. No free text is accepted. It is logged as metadata only (which button, which kind of scene), so you can see which patterns land without anyone's words being kept — the privacy-safe way to "use feedback to improve future suggestions". Nothing is used to train any model.

### The ten mechanics

| `reasoning_pattern` | `interaction_type` | The scene | Usual Mallow |
|---|---|---|---|
| `fact_vs_assumption` | `pull_apart` | Pull two connected Thought Mallows apart | Zuzu |
| `catastrophising` | `shrink_projection` | Slowly resize an exaggerated future projection | Loomi |
| `personalisation` | `return_responsibility` | Move imagined responsibility back to where it belongs | Boppo |
| `all_or_nothing` | `reveal_spectrum` | Reveal the spectrum between two extremes | Zuzu |
| `mind_reading` | `open_interpretations` | Open several interpretations, none claimed true | Pipzi |
| `overgeneralisation` | `separate_one` | Lift one event out of a larger collection | Zuzu |
| `rumination` | `let_loop_drift` | Let a looping thought keep moving without grabbing it | Noomi |
| `practical_problem` | `assemble_step` | Assemble one small, doable next step | Boppo |
| `self_criticism` | `soften_harshness` | Soften a harsh verdict without erasing accountability | Boppo |
| `valid_anger` | `find_boundary` | Identify the boundary or response that may be needed | Glitzi |

The server always pairs the mechanic with the pattern, and keeps the Mallow in role (Zuzu is always allowed; Blubi for sadness, Glitzi for anger, Loomi for worry and so on). Lists live in `src/vocab.js`.

## Setting it up (once)

You need a Cloudflare account (the free plan is enough to start), an Anthropic API key, and access to this repository's settings on GitHub.

1. **Cloudflare account.** Sign up at cloudflare.com. In the dashboard, open **Workers & Pages** once so your `workers.dev` subdomain is created.
2. **Cloudflare API token.** My Profile → API Tokens → Create Token → use the **Edit Cloudflare Workers** template → Continue → Create. Copy the token.
3. **Cloudflare account ID.** It is shown on the right of the Workers & Pages overview page (or in the URL after `dash.cloudflare.com/`).
4. **Anthropic API key.** In the Anthropic Console (console.anthropic.com) → API Keys → Create Key. While you are there, set a monthly spend limit under Billing as a second safety net.
5. **Add three GitHub secrets.** In the repository: Settings → Secrets and variables → Actions → New repository secret:
   * `CLOUDFLARE_API_TOKEN` — from step 2
   * `CLOUDFLARE_ACCOUNT_ID` — from step 3
   * `ANTHROPIC_API_KEY` — from step 4
6. **Deploy.** Push to `main` (or Actions → "Another Angle server" → Run workflow). The workflow runs the tests, then deploys. On the first deploy it also creates two random keys on the Worker (`TOKEN_SIGNING_KEY`, which signs session tokens, and `IP_HASH_KEY`, which hashes network addresses for the limits); later deploys keep them. Until the Cloudflare secrets exist the deploy step is skipped with a notice and nothing else breaks.
7. **Find the address.** The deploy log prints `https://hushmallow-another-angle.<your-subdomain>.workers.dev`. Opening `…/v1/health` in a browser shows a 403 (browsers send no allowed origin); `curl -H 'origin: https://ramkumarjothi1982.github.io' …/v1/health` shows `"ok":true`.
8. **Point the app at it.** The Beyond client reads the endpoint from `src/app/config.js` (W8).

To change a setting (limits, cap, allowed websites, model), edit `[vars]` in `wrangler.toml` and push. If the site moves to its own domain or the Framer domain needs direct access, add it to `ALLOWED_ORIGINS`.

### Testing-phase access

By default anyone using the app can get a session (`ENTITLEMENT_MODE = "testing"`). To limit it to testers, add a Worker secret: `npx wrangler secret put TESTER_INVITE_CODES` (comma-separated codes) and have the app send `invite`. Abuse is bounded anyway: 3 new sessions per minute and 10 per day from one network, 500 new sessions a day overall, 20 angles per device per day, and the daily spend cap.

### Before you sell Beyond (production entitlement)

`src/auth/storekit.js` verifies StoreKit 2 signed transactions: Apple's ES256 signature, the certificate chain up to **Apple Root CA – G3** (pinned by its SHA-256 fingerprint), Apple's marker extensions, your bundle id, a Beyond product id (`hushmallow.ultra.monthly` / `.yearly`), environment, expiry and revocation. **It has only been tested against certificate chains generated in the tests to match Apple's structure — never against a real App Store receipt.** Before launch:

1. Set `APPLE_BUNDLE_ID` and `ENTITLEMENT_MODE = "storekit"` (or `"both"` during the switch-over) in `wrangler.toml`; set `APPLE_ENVIRONMENTS = "Sandbox"` for TestFlight testing, then `"Production"`.
2. From a Sandbox build, send `Transaction.jwsRepresentation` for a Beyond purchase to `/v1/session` and confirm you get a token; try an expired and a non-Beyond purchase and confirm they are refused.
3. Remove the testing hosts from the app's `TEST_PURCHASE_HOSTS` (see `src/app/config.js`).
4. Consider App Store Server Notifications for refunds: today a refunded subscription keeps working until its session token expires (at most 24 hours, `STOREKIT_TOKEN_TTL_HOURS`).

## Costs

Prices for `claude-opus-5-5`: $4 per million input tokens, $20 per million output tokens; the cached instructions are read at $0.20 per million.

* **A typical angle costs about 2p ($0.02)**: ~3,700 cached instruction tokens, a few hundred tokens of the person's words, and up to ~1,000 output tokens (short internal reasoning at low effort plus the JSON). A regenerated answer roughly doubles that.
* **Daily cap:** `DAILY_SPEND_CAP_USD = 10` (≈ 400–500 angles a day). Before each call the worst case (~$0.31) is reserved against the cap, then replaced by the real cost. Set it to `0` to pause Another Angle instantly; the app falls back to its authored engine.
* **Per device:** 20 angles a day (`DEVICE_DAILY_LIMIT`); failed or refused calls don't count.
* **Second safety net:** the monthly spend limit in the Anthropic Console.
* Cloudflare's free Workers plan covers 100,000 requests a day; Durable Objects (the counters) are included on the free plan within its limits.

## Running it on your computer

```
cd hushmallow/server/another-angle
npm install
npm test               # all checks, using a mock model (free, offline)
npm run typecheck
npm run harness -- "My boss embarrassed me in front of everyone."   # one answer as JSON (mock)
npm run harness -- --serve 8790                                      # local server for the app
npm run dev            # the real Workers runtime (wrangler dev), mock model; needs .dev.vars (copy .dev.vars.example)
```

The mock model returns placeholder lines in the right shape so the app can be built against it; it is not the real quality. `PROVIDER=anthropic ANTHROPIC_API_KEY=… npm run harness -- "…"` uses the real model (and costs money).

## The quality evaluation

`hushmallow/tools/angle-eval.mjs` runs 39 realistic inputs (relationships, work, anxiety, jealousy, shame, self-criticism, disappointment, rumination, uncertainty, plus three safety probes, two prompt-injection probes and six "another angle" follow-ups) through the same pipeline against the real model, then has a second model grade each answer for relevance, accuracy, concision, actionability, respect, safety and novelty.

```
cd hushmallow/server/another-angle
ANTHROPIC_API_KEY=sk-ant-… node ../../tools/angle-eval.mjs        # prints the cost estimate, sends nothing
ANTHROPIC_API_KEY=sk-ant-… node ../../tools/angle-eval.mjs --yes  # runs it (about $1.80; worst case about $9)
node ../../tools/angle-eval.mjs --mock                             # free dry run of the harness
```

The report lands in `eval/reports/angle-eval-<date>.md` (and a `.json` beside it, not committed). Start with "Fix before expanding": the brief asks for weak answers to be fixed before anything grows. To try a prompt change, copy `prompts/angle-v1.md` to `angle-v2.md`, edit it, point `src/index.js` and `PROMPT_VERSION` at it, run the eval, and compare reports.

## What is logged, and what is kept

**Never logged or stored:** the person's words, the model's lines, tokens, IP addresses, device ids.

**Logged (Cloudflare Workers Logs, metadata only):** time, route, HTTP status, outcome (`ok`/`care`/`crisis`/`fallback`), fallback reason, latency, attempts, quality-gate result and failure codes, reasoning pattern, mechanic, Mallow, scene emotion and situation type, the chosen feeling and intention ids, how many earlier angles were sent, a length bucket (short/medium/long), safety level and category, whether the text looked like an injection attempt, model name, token counts, cost, remaining quota; and, for feedback, which of the four buttons was pressed for which pattern, mechanic and Mallow. `src/log.js` drops anything else, and the tests check that no input text reaches the logs. Cloudflare keeps Workers Logs for a few days (plan-dependent).

**Stored by the server:** daily counters only — angles per session subject, new sessions per hashed network address, total spend — in a Durable Object, deleted after two days.

**Sent to Anthropic:** the person's text, the chosen feeling and intention, and the earlier angle lines for "another angle"; plus an opaque hashed tag (`metadata.user_id`) so Anthropic can spot abuse without knowing who anyone is. No photos, names or device ids. Under Anthropic's commercial API terms at the time of writing, API inputs and outputs are not used for model training and are deleted within a limited period (30 days by default, longer only if flagged for a usage-policy review); zero data retention can be arranged with Anthropic. Check the current terms at privacy.anthropic.com and reflect them accurately on the Another Angle consent and privacy screens.

**Deletion:** because the server keeps no content, there is nothing per person to delete here. Rotating `TOKEN_SIGNING_KEY` (move the old value to `TOKEN_SIGNING_KEY_PREVIOUS` first if you want existing sessions to keep working) signs everyone out.

## Safety notes

* The lexicon is a verbatim copy of the app's. When the app's file changes, run `npm run sync:lexicon`; the tests fail until the copy matches. Server-only additions live in `src/safety/extra-lexicon.js`.
* The model's own `safety_status` is honoured, so subtle crisis wording the lists miss still gets support.
* Harmful experiences are never reframed, and an ordinary reframe is never offered as enough support in an emergency.
* The words "AI" never appear in what people see: the support copy, the subtitles and the gate all keep to hushmallow's own language.

## Files

| Path | What it is |
|---|---|
| `src/index.js` | Worker entry (bundles the prompt, exports the `Ledger` Durable Object) |
| `src/app.js` | Routes, CORS, auth, limits, spend cap, logging |
| `src/pipeline.js` | Safety → model → schema → gate → one regeneration → fallback |
| `prompts/angle-v1.md` | The versioned instructions (the brief's rules, patterns, Mallows, anchors) |
| `src/schema.js`, `src/vocab.js` | Scene schema, strict validator, controlled lists |
| `src/gate.js`, `src/text.js` | Deterministic quality gate |
| `src/safety/` | Lexicon copy, server additions, support copy |
| `src/providers/` | Anthropic adapter and mock (provider abstraction) |
| `src/auth/` | Session tokens, testing/StoreKit entitlement, StoreKit JWS + X.509 checks |
| `src/limits/` | Durable Object counters, burst limiter |
| `eval/` | Eval inputs, judge rubric, reports |
| `test/` | Node tests (mock model; the StoreKit tests mint a fresh Apple-shaped certificate chain each run, so no keys are stored) |
| `scripts/` | Lexicon sync; CI secret preparation |
