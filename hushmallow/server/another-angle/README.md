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

1. **Checks before anything else.** HTTPS only; the request must come from an allowed website (`ALLOWED_ORIGINS`); each network gets a short burst limit (a network is one IPv4 address, or one IPv6 `/64` block — a single phone or home usually has a whole `/64`, so counting single IPv6 addresses would let one device dodge the limit); the session token must be valid; the body must be well-formed (text 1–600 characters, a feeling and intention from the app's lists, at most four earlier angles, `"consent": true`).
2. **Safety first.** The words are checked against the app's own safety lexicon (a byte-for-byte copy of `hushmallow/src/data/safety-lexicon.js`) plus a few server-only additions (`src/safety/extra-lexicon.js`). Anything about self-harm, suicide, someone in danger, abuse, violence, threats, harassment, discrimination or feeling unsafe gets the authored support message instead — the model is never called and no daily quota is used. Text with no words at all (only emoji or punctuation) gets the "tell me a little more" answer, also without the model.
3. **Limits.** Each device (or, later, each subscriber) has a daily allowance (`DEVICE_DAILY_LIMIT`, 20 by default). The whole service has a daily spending cap (`DAILY_SPEND_CAP_USD`, $10 by default). If the cap is reached the app is told to use its own authored engine instead.
4. **The model.** One request to `claude-opus-5-5` at low effort, with the versioned instructions in `prompts/angle-v1.md` and a strict JSON schema (structured outputs). The person's words are sent inside a marked data block that cannot be closed or used to give instructions. If the model's safety classifier declines, Anthropic's recommended fallback model answers in the same call (`fallbacks: "default"`).
5. **Checking the answer.** The JSON must match the schema exactly (fixed lists of Mallows, reasoning patterns and mechanics). The model's own safety judgement is honoured. Then a deterministic quality gate checks the two subtitle lines: one short sentence each, 15–35 words together, no line over 22 words, no generic affirmations, empathy clichés, therapy jargon, false reassurance, blame, links or code, nothing stated as fact about someone else's mind, no invented names or numbers, British spelling, about the person's actual situation, and genuinely different from angles already shown (a follow-up angle must use a different reasoning pattern from the one just shown, because the scene follows the pattern). Restating what the person said happened is never treated as mind-reading — "Your girlfriend forgot your anniversary" passes as it stands, so the person's account is never turned into "may have forgotten" — while a new guess about someone's motives or feelings must be offered as a possibility.
6. **One second chance.** If the gate fails, the model gets exactly one retry with the specific reasons. If that fails too, the app is told to use its authored engine (`src/ultra/reframe-engine.js`) — it never shows a weak answer.

## The API (for the app)

All responses are JSON with `Cache-Control: no-store`. Errors look like `{ "status": "error" | "limit", "error": { "code", "message" } }`; messages are for developers, never for people.

### `GET /v1/health`

`{ ok, service, prompt_version, schema_version, provider, entitlement_mode, configured: { signing_key, provider_key } }`

### `POST /v1/session`

Testing phase body: `{}` (or `{ "invite": "CODE" }` if `TESTER_INVITE_CODES` is set). Production body: `{ "signed_transaction": "<StoreKit 2 Transaction.jwsRepresentation>" }`. Optional: `platform` (`web`/`ios`), `app_version`.

Response: `{ status: "ok", token, token_type: "Bearer", expires_at, source: "testing" | "storekit", quota: { daily, remaining, resets_at } }`. Keep the token (it is not secret from the person, but treat it like a password); send it as `Authorization: Bearer <token>`. On a `401` from `/v1/angle`, get a new session. Limits: 3 new sessions a minute and `SESSIONS_PER_IP_DAILY` (10) a day per network, `SESSION_DAILY_CAP` (500) a day in all; a refusal is `429 session_limit`.

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
* `text`: exactly what the person typed. Text that is only emoji or punctuation ("😭😭😭") is accepted and answered with the `unclear` fallback (no model call, no quota); only blank text is a `400 empty_text`.
* `previous_angles`: what the person already saw, for "Show me another angle" (up to four). Each needs both lines; `reasoning_pattern` and `interaction_type` are optional, must come from the lists below and must match each other if both are sent. Send at least one of them: the follow-up must use a different pattern from the last one shown.
* Never send photos: the server rejects unknown fields.

Response: HTTP 200 whenever the server could look at the request — including support and fallback answers. Other codes mean the request did not get that far: `400`/`413`/`415` the body is wrong, `401` the token is missing or expired (get a new session), `403` origin or HTTPS, `429` a limit (daily quota or burst; see below), `500`/`503` the server itself.

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
| `fallback` | `fallback.reason` is `quality`, `unclear`, `refusal`, `timeout`, `provider` or `capacity` | Use the authored engine. `unclear` means "ask for a little more". `fallback.hint` may suggest `{ reasoning_pattern, interaction_type, mallow_character, authored_pattern }` |

`keep_support_close: true` means the words sounded heavy (for example "can't cope"): keep the Support chip visible.

HTTP errors: `400` invalid body (`error.code`, plus `field`), `401` no or bad token, `403` origin not allowed / invite needed / HTTPS required, `413` too large, `415` not JSON, `429` daily limit (`quota`, `Retry-After`) or burst limit (6 angles a minute per network, `Retry-After: 60`), `500` unexpected server error (CORS headers included, so the browser can read it), `503` not configured.

`fallback.hint.authored_pattern` is the closest thinking pattern in the app's own engine (`THOUGHT_PATTERNS` in `src/ultra/frameworks.js`), so the offline path can start from the same idea (`PATTERN_TO_AUTHORED` in `src/vocab.js`):

| `reasoning_pattern` | `authored_pattern` |
|---|---|
| `fact_vs_assumption` | `feelings-as-proof` |
| `catastrophising` | `worst-case-jump` |
| `personalisation` | `spotlight-on-me` |
| `all_or_nothing` | `all-or-nothing` |
| `mind_reading` | `mind-reading` |
| `overgeneralisation` | `always-never` |
| `rumination` | `what-if-loop` |
| `self_criticism` | `big-label` |
| `practical_problem`, `valid_anger` | `null` — not thinking traps; the authored engine's next steps cover them |

### `POST /v1/feedback`

`{ "rating": "helped" | "another_angle" | "not_relevant" | "just_squeeze", "reasoning_pattern"?, "interaction_type"?, "mallow_character"?, "prompt_version"? }` with the same bearer token → `202 { "status": "ok" }`. It has its own burst limit (20 a minute per network), so "Show me another angle" (feedback plus a new angle) never eats into the angle limit. No free text is accepted. It is logged as metadata only (which button, which kind of scene), so you can see which patterns land without anyone's words being kept — the privacy-safe way to "use feedback to improve future suggestions". Nothing is used to train any model.

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
5. **Add three GitHub secrets (and, recommended, a fourth).** In the repository: Settings → Secrets and variables → Actions → New repository secret:
   * `CLOUDFLARE_API_TOKEN` — from step 2
   * `CLOUDFLARE_ACCOUNT_ID` — from step 3
   * `ANTHROPIC_API_KEY` — from step 4
   * `TESTER_INVITE_CODES` — recommended while you are testing: one or more codes, separated by commas (for example `MALLOW-OCT-7Q2`). Only someone who enters a code in the app can start a session. Without it, anyone who finds the app can use the testing allowance. See "Testing-phase access".
6. **Deploy.** Push to `main` (or Actions → "Another Angle server" → Run workflow). The workflow runs the tests, then deploys. On the first deploy it also creates two random keys on the Worker (`TOKEN_SIGNING_KEY`, which signs session tokens, and `IP_HASH_KEY`, which hashes network addresses for the limits); later deploys keep them. The keys are only created when Cloudflare says the Worker does not exist yet; if the workflow cannot read the Worker's secrets for any other reason (a network blip, a token without the right permission), the deploy stops with an error instead of replacing the keys, which would sign every tester out — just re-run it. Until the Cloudflare secrets exist the deploy step is skipped with a notice and nothing else breaks.
7. **Find the address.** The deploy log prints `https://hushmallow-another-angle.<your-subdomain>.workers.dev`. Opening `…/v1/health` in a browser shows a 403 (browsers send no allowed origin); `curl -H 'origin: https://ramkumarjothi1982.github.io' …/v1/health` shows `"ok":true`.
8. **Point the app at it.** The Beyond client reads the endpoint from `src/app/config.js`.
9. **Check the logs once.** In the Cloudflare dashboard, open Workers & Pages → `hushmallow-another-angle` → Logs, make one request from the app, and confirm each log line holds only the fields listed in "What is logged" below — no IP address, location or request headers.

To change a setting (limits, cap, allowed websites, model), edit `[vars]` in `wrangler.toml` and push. If the site moves to its own domain or the Framer domain needs direct access, add it to `ALLOWED_ORIGINS`.

### Testing-phase access

**Recommended: use invite codes.** Add the `TESTER_INVITE_CODES` repository secret (step 5) and redeploy, or set it directly with `npx wrangler secret put TESTER_INVITE_CODES`. The app then sends the tester's code as `invite` when it starts a session; a missing or wrong code gets `403`. Every deploy without codes shows a notice in the Actions log.

Without codes (`ENTITLEMENT_MODE = "testing"`), anyone using the app can get a session. Abuse is bounded — 3 new sessions a minute and 10 a day from one network (an IPv4 address or an IPv6 `/64`), 500 new sessions a day overall, 20 angles per device per day, and the daily spend cap — but someone determined could use up the day's 500 sessions or the spend cap and lock real testers out until midnight UTC. Many phones on mobile data share one IPv4 address, so a per-network limit alone cannot tell them apart. Invite codes avoid both problems.

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
* **Per device:** 20 angles a day (`DEVICE_DAILY_LIMIT`). An angle is given back when nothing came from the model: a timeout, a refusal, a provider error, the spending cap, or no API key. An answer the model did write still counts even if the person does not see it, because it cost a model call: one the quality checks held back (`quality`), or a reading that there was too little to work with (`unclear`). That stops one device spending the model budget for free. Support answers (crisis or care) and emoji-only text never count.
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

`hushmallow/tools/angle-eval.mjs` runs 39 inputs — 33 realistic situations (relationships, work, anxiety, jealousy, shame, self-criticism, disappointment, rumination, uncertainty), one too-short input, three safety probes and two prompt-injection probes, plus six "another angle" follow-ups — through the same pipeline against the real model, with the Worker's production timeouts and retries (15 s per attempt, 28 s per answer). A second model then grades each answer for relevance, accuracy, concision, actionability, respect, safety and novelty.

The three safety probes skip the word-list check, so the report shows whether the model would have flagged them on its own (the word list's verdict is printed beside it). The report also lists every draft the quality gate rejected, with the lines, the failing field and the reason, so a good answer refused by mistake is as visible as a weak one caught.

```
cd hushmallow/server/another-angle
ANTHROPIC_API_KEY=sk-ant-… node ../../tools/angle-eval.mjs        # prints the cost estimate, sends nothing
ANTHROPIC_API_KEY=sk-ant-… node ../../tools/angle-eval.mjs --yes  # runs it (about $1.80; worst case about $9)
node ../../tools/angle-eval.mjs --mock                             # free dry run of the harness
```

The report lands in `eval/reports/angle-eval-<date>.md` (and a `.json` beside it, not committed; it contains the model's answers and rejected drafts, so keep it private). Start with "Fix before expanding": the brief asks for weak answers to be fixed before anything grows. Then read "Gate rejections" for false alarms, and the latency line for answers slower than the 15 s / 28 s limits. To try a prompt change, copy `prompts/angle-v1.md` to `angle-v2.md`, edit it, point `src/index.js` and `PROMPT_VERSION` at it, run the eval, and compare reports.

## What is logged, and what is kept

**Never written to logs or storage by this server:** the person's words, the model's lines, session tokens, IP addresses, device ids, and what kind of safety concern was detected.

**What the server logs (Cloudflare Workers Logs, metadata only):** one line per request with: time, route, HTTP status, outcome (`ok`/`care`/`crisis`/`fallback`), fallback reason, latency, attempts, quality-gate result and failure codes, reasoning pattern, mechanic, Mallow, scene emotion and situation type, the chosen feeling and intention ids, how many earlier angles were sent, a length bucket (short/medium/long), the safety level (`none`/`concern`/`care`/`crisis`, never the category), whether the text looked like an injection attempt, model name, token counts, cost, remaining quota; and, for feedback, which of the four buttons was pressed for which pattern, mechanic and Mallow. `src/log.js` drops anything else, and the tests check that no input text reaches the logs.

**What Cloudflare itself records:** Cloudflare's *invocation logs* — which would store each request's headers and Cloudflare's location data (city, postcode, coordinates, network) beside the lines above — are switched off in `wrangler.toml` (`[observability.logs] invocation_logs = false`), and so are traces. What remains is the server's own lines plus the metadata Cloudflare attaches to each line (such as the time, the Worker's name and version and whether the request succeeded). The exact set is Cloudflare's and was not inspected on a live deploy when this was written, so check it once after the first deploy (setup step 9), and again if you change plans or settings. Cloudflare keeps Workers Logs for a few days; its pricing page lists the period for each plan (sources disagreed between 3 and 7 days on the free plan when this was written; 7 on the paid plan), so confirm it before quoting a number on the privacy screen. Separately, like any web host, Cloudflare's network handles the visitor's IP address to deliver the request and protect against attacks; that is covered by Cloudflare's own privacy policy, not by anything this server keeps.

**Stored by the server:** daily counters only — angles per session subject, new sessions per hashed network (an IPv4 address or an IPv6 `/64`, keyed with `IP_HASH_KEY`, never the raw address), total spend — in a Durable Object, deleted after two days.

**Sent to Anthropic:** the person's text, the chosen feeling and intention, and the earlier angle lines for "another angle"; plus an opaque hashed tag (`metadata.user_id`) so Anthropic can spot abuse without knowing who anyone is. No photos, account details or device ids. Whatever the person types, including any names, is sent as written. Anthropic does not use commercial API inputs and outputs for model training. **Retention needs checking before it goes on the privacy screen:** Anthropic's help page has said API inputs and outputs are deleted within 30 days, kept longer only when flagged under its usage policy (flagged content for up to 2 years), and later reports say the default fell to 7 days in September 2025. The server could not reach Anthropic's privacy pages when this was written, so confirm the current figure at privacy.claude.com (Anthropic's privacy centre) and copy that onto the Another Angle consent and privacy screens. Zero data retention can be arranged with Anthropic.

**Deletion:** because the server keeps no content, there is nothing per person to delete here. Rotating `TOKEN_SIGNING_KEY` (move the old value to `TOKEN_SIGNING_KEY_PREVIOUS` first if you want existing sessions to keep working) signs everyone out.

## Safety notes

* The lexicon is a verbatim copy of the app's. When the app's file changes, run `npm run sync:lexicon`; the tests fail until the copy matches. Server-only additions live in `src/safety/extra-lexicon.js` (for example "stockpiling my pills", "done with life", "no way out", "sleep forever", "anyone would notice if I wasn't around", someone else "cutting herself"); once the app's shared lexicon has them, delete them there.
* The model's own `safety_status` is honoured, so subtle crisis wording the lists miss still gets support. The eval measures that on its own (see above).
* Harmful experiences are never reframed, and an ordinary reframe is never offered as enough support in an emergency.
* The word "AI" never appears in what people see: the support copy, the subtitles and the gate all keep to hushmallow's own language.

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
| `src/limits/` | Durable Object counters, burst limiter, network key (IPv4 address / IPv6 /64) |
| `eval/` | Eval inputs, judge rubric, reports |
| `test/` | Node tests (mock model; the StoreKit tests mint a fresh Apple-shaped certificate chain each run, so no keys are stored) |
| `scripts/` | Lexicon sync; CI secret preparation |
