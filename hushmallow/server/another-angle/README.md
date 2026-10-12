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

1. **Safety first — before any limit.** HTTPS only, and the request must come from an allowed website (`ALLOWED_ORIGINS`). As soon as the body can be read, the words are checked against the app's own safety lexicon (a byte-for-byte copy of `hushmallow/src/data/safety-lexicon.js`) plus the server-only additions in `src/safety/extra-lexicon.js`. Anything about self-harm, suicide, someone in danger, abuse, violence, threats, harassment, discrimination or feeling unsafe gets the authored support message straight away — even with a missing or expired token, during a burst, or without `consent` — and the model is never called and no quota is used.
2. **Then the other checks.** Each network gets a short burst limit (a network is one IPv4 address, or one IPv6 `/64` block — a single phone or home usually has a whole `/64`, so counting single IPv6 addresses would let one device dodge the limit); the session token must be valid; the body must be well-formed (text 1–600 characters, a feeling and intention from the app's lists, at most four earlier angles, `"consent": true`). Text with no words at all (only emoji or punctuation) gets the "tell me a little more" answer, without the model.
3. **Limits.** Each device that sends a `device_id` (or, later, each subscriber) has a daily allowance (`DEVICE_DAILY_LIMIT`, 20 by default); see `POST /v1/session` for what that does and does not guarantee. The whole service has a daily spending cap (`DAILY_SPEND_CAP_USD`, $10 by default). If the cap is reached the app is told to use its own authored engine instead.
4. **The model.** One request to `claude-opus-5-5` at low effort, with the versioned instructions in `prompts/angle-v3.md` (see "Prompt versions" below) and a strict JSON schema (structured outputs). The person's words are sent inside a marked data block that cannot be closed or used to give instructions. If the model's safety classifier declines, Anthropic's recommended fallback model answers in the same call (`fallbacks: "default"`).
5. **Checking the answer.** The JSON must match the schema exactly (fixed lists of Mallows, reasoning patterns and mechanics). The model's own safety judgement is honoured. Then a deterministic quality gate checks the two subtitle lines: one short sentence each, 15–35 words together, no line over 22 words, no generic affirmations, empathy clichés, therapy jargon, false reassurance, blame, links or code, nothing stated as fact about someone else's mind, no invented names, days or numbers presented as facts, and no number that changes one of theirs ("three weeks" after their "two weeks" fails wherever it appears; their own numbers, the word count of a phrase they quoted or reported such as "I love you", everyday objects such as a CV, and inside a suggested step a time box, a small count of what to do or a clock time are fine), British spelling, about the person's actual situation, and genuinely different from angles already shown (a follow-up angle must use a reasoning pattern no earlier angle used, because the scene follows the pattern, and must not repeat the meaning-bearing words an earlier angle added — the person's own words and framing words such as "fact" or "question" don't count). Restating what the person said happened is never treated as mind-reading — "Your girlfriend forgot your anniversary" passes as it stands, so the person's account is never turned into "may have forgotten" — while a new guess about someone's motives or feelings must be offered as a possibility.
6. **One second chance.** If the gate fails, the model gets exactly one retry with the specific reasons. If that fails too, the app is told to use its authored engine (`src/ultra/reframe-engine.js`) — it never shows a weak answer.

## The API (for the app)

All responses are JSON with `Cache-Control: no-store`. Errors look like `{ "status": "error" | "limit", "error": { "code", "message" } }`; messages are for developers, never for people.

### `GET /v1/health`

`{ ok, service, prompt_version, schema_version, provider, entitlement_mode, configured: { signing_key, provider_key } }`

### `POST /v1/session`

Testing phase body: `{ "device_id": "<random id>" }` (plus `"invite": "CODE"` if `TESTER_INVITE_CODES` is set). Production body: `{ "signed_transaction": "<StoreKit 2 Transaction.jwsRepresentation>" }`. Optional: `platform` (`web`/`ios`), `app_version`.

* `device_id` (testing phase): 16–128 letters, digits, `-` or `_`. The app makes it once — for example 16 bytes from `crypto.getRandomValues`, base64url-encoded — keeps it in local storage, and sends the same value every time. The server never stores or logs it: it is hashed with `IP_HASH_KEY` into the token's subject, so a new session for the same device keeps the same daily allowance. Without a `device_id`, every new session starts a fresh allowance.

Response: `{ status: "ok", token, token_type: "Bearer", expires_at, source: "testing" | "storekit", quota: { daily, remaining, resets_at } }`. `quota` is the allowance of this token's subject: the device (with `device_id`), the subscription (StoreKit), or just this session (neither). Keep the token (it is not secret from the person, but treat it like a password); send it as `Authorization: Bearer <token>`. On a `401` from `/v1/angle`, get a new session. Limits: 3 new sessions a minute and `SESSIONS_PER_IP_DAILY` (10) a day per network, `SESSION_DAILY_CAP` (500) a day in all; a refusal is `429 session_limit`.

**What the allowance does and does not stop.** In the testing phase the `device_id` comes from the app, so an honest app gets exactly `DEVICE_DAILY_LIMIT` angles a day per device however often it renews its session. Someone who edits the app could send a new id with each session; that is bounded by the per-network session limit, so one network can get at most `SESSIONS_PER_IP_DAILY × DEVICE_DAILY_LIMIT` (10 × 20 = 200) angles a day, and the whole service by `DAILY_SPEND_CAP_USD`. Invite codes (below) close that gap; StoreKit subjects in production are tied to the purchase.

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
* `previous_angles`: what the person already saw, for "Show me another angle" (up to four). They are checked for instruction-like wording too (and treated as data either way). Each needs both lines; `reasoning_pattern` and `interaction_type` are optional, must come from the lists below and must match each other if both are sent. Send at least one of them: the follow-up must use a different pattern from the last one shown.
* Never send photos: the server rejects unknown fields.

Response: HTTP 200 whenever the server could look at the request — including support and fallback answers. Other codes mean the request did not get that far: `400`/`413`/`415` the body is wrong, `401` the token is missing or expired (get a new session), `403` origin or HTTPS, `429` a limit (daily quota or burst; see below), `500`/`503` the server itself.

```json
{
  "status": "ok",
  "prompt_version": "angle-v3", "schema_version": "scene-v1", "request_id": "…",
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
| `fallback` | `fallback.reason` is `quality`, `unclear`, `refusal`, `timeout`, `provider` or `capacity` | Run the app's own safety check first (below), then use the authored engine. `unclear` means "ask for a little more". `fallback.hint` may suggest `{ reasoning_pattern, interaction_type, mallow_character, authored_pattern }` |

`keep_support_close: true` means the words sounded heavy (for example "can't cope"): keep the Support chip visible.

**For the Beyond client (W8): the app runs its own safety check before any authored answer.** A `fallback` only means the model gave no usable answer — it does **not** mean the words were checked and found safe. The server's word list catches a lot, but when the model call fails (timeout, refusal, provider error, spending cap) the model's own safety judgement is missing too. So, before showing anything from the authored engine:

1. Run `checkText(text)` from `src/engine/safety.js` on the person's words first (before even calling the server is best), and on `crisis`/`care` open support (`openSupport(app, { urgent: level === 'crisis' })`) instead of any reframe.
2. Never read a non-200 response, a network error or a timeout as "safe": treat it like a `fallback` and run step 1.
3. Only then hand the words to `src/ultra/reframe-engine.js`.

The server answers crisis and care with support even without a valid token, during a burst limit or without `consent`, so the app can always ask it; but the app's own check must not depend on the server being reachable.

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

You need a Cloudflare account (the free plan is fine for a first look — see "CPU time" under Costs before inviting testers), an Anthropic API key, and access to this repository's settings on GitHub.

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
10. **Check the CPU time once.** In the same Logs view (or Workers & Pages → the Worker → Metrics → CPU time), look at `cpu_ms` for the first few `/v1/angle` requests, especially the first one after a deploy. See "CPU time" under Costs for what to do if it is near or over the limit.

To change a setting (limits, cap, allowed websites, model), edit `[vars]` in `wrangler.toml` and push. If the site moves to its own domain or the Framer domain needs direct access, add it to `ALLOWED_ORIGINS`.

### Testing-phase access

**Recommended: use invite codes.** Add the `TESTER_INVITE_CODES` repository secret (step 5) and redeploy, or set it directly with `npx wrangler secret put TESTER_INVITE_CODES`. The app then sends the tester's code as `invite` when it starts a session; a missing or wrong code gets `403`. Every deploy without codes shows a notice in the Actions log.

Without codes (`ENTITLEMENT_MODE = "testing"`), anyone using the app can get a session. Abuse is bounded — 3 new sessions a minute and 10 a day from one network (an IPv4 address or an IPv6 `/64`), 500 new sessions a day overall, 20 angles a day per `device_id` (an edited app can send a new id with each session, so the real ceiling per network is 10 sessions × 20 = 200 angles), and the daily spend cap — but someone determined could use up the day's 500 sessions or the spend cap and lock real testers out until midnight UTC. Many phones on mobile data share one IPv4 address, so a per-network limit alone cannot tell them apart. Invite codes avoid both problems.

### Before you sell Beyond (production entitlement)

`src/auth/storekit.js` verifies StoreKit 2 signed transactions: Apple's ES256 signature, the certificate chain up to **Apple Root CA – G3** (pinned by its SHA-256 fingerprint), Apple's marker extensions, your bundle id, a Beyond product id (`hushmallow.ultra.monthly` / `.yearly`), environment, expiry and revocation. **It has only been tested against certificate chains generated in the tests to match Apple's structure — never against a real App Store receipt.** Before launch:

1. Set `APPLE_BUNDLE_ID` and `ENTITLEMENT_MODE = "storekit"` (or `"both"` during the switch-over) in `wrangler.toml`; set `APPLE_ENVIRONMENTS = "Sandbox"` for TestFlight testing, then `"Production"`.
2. From a Sandbox build, send `Transaction.jwsRepresentation` for a Beyond purchase to `/v1/session` and confirm you get a token; try an expired and a non-Beyond purchase and confirm they are refused.
3. Remove the testing hosts from the app's `TEST_PURCHASE_HOSTS` (see `src/app/config.js`).
4. Consider App Store Server Notifications for refunds: today a refunded subscription keeps working until its session token expires (at most 24 hours, `STOREKIT_TOKEN_TTL_HOURS`).

## Costs

Prices for `claude-opus-5-5`: $4 per million input tokens, $20 per million output tokens; the cached instructions are read at $0.20 per million.

* **A typical angle costs about 2p ($0.02)**: ~5,300 cached instruction tokens (angle-v3), a few hundred tokens of the person's words, and up to ~1,000 output tokens (short internal reasoning at low effort plus the JSON). A regenerated answer roughly doubles that.
* **Daily cap:** `DAILY_SPEND_CAP_USD = 10` (≈ 400–500 angles a day). Before each call the worst case (~$0.31) is reserved against the cap, then replaced by the real cost. Set it to `0` to pause Another Angle instantly; the app falls back to its authored engine.
* **Per device:** 20 angles a day (`DEVICE_DAILY_LIMIT`) for each `device_id` (see `POST /v1/session`). An angle is given back when nothing came from the model: a timeout, a refusal, a provider error, the spending cap, or no API key. An answer the model did write still counts even if the person does not see it, because it cost a model call: one the quality checks held back (`quality`), or a reading that there was too little to work with (`unclear`). That stops one device spending the model budget for free. Support answers (crisis or care) and emoji-only text never count.
* **Second safety net:** the monthly spend limit in the Anthropic Console.
* Cloudflare's free Workers plan covers 100,000 requests a day; Durable Objects (the counters) are included on the free plan within its limits.
* **CPU time.** The free plan allows 10 ms of CPU per request; waiting for the model does not count, only the server's own work. Measured on a slow shared test machine, a warm request costs about 2–3 ms (5–6 ms with a regeneration). Compiling the few hundred safety and quality-check patterns is the expensive part, so the Worker does it once while it starts up (`warmSafety()` and `warmGate()`), not on the first request: the first request after start-up dropped from about 120–170 ms to about 4 ms in the same measurement. Start-up has its own, larger allowance, and Cloudflare refuses a deploy that exceeds it. Real Cloudflare machines are faster than the test machine, but this has not been measured on a live deploy. After the first deploy (setup step 10), if `cpu_ms` is close to 10 on ordinary requests, or people see error 1102 ("Worker exceeded resource limits"), move to **Workers Paid** ($5 a month, 30 s of CPU per request by default) — nothing else needs to change.

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

`hushmallow/tools/angle-eval.mjs` runs 49 inputs — 33 realistic situations (relationships, work, anxiety, jealousy, shame, self-criticism, disappointment, rumination, uncertainty), one too-short input, three safety probes, two prompt-injection probes and 10 held-out situations, plus nine "another angle" follow-ups (one case asks for a third angle) — through the same pipeline against the real model, with the Worker's production timeouts and retries (15 s per attempt, 28 s per answer). A second model then grades each answer for relevance, accuracy, concision, actionability, respect, safety and novelty.

The three safety probes skip the word-list check, so the report shows whether the model would have flagged them on its own (the word list's verdict is printed beside it). The report also lists every draft the quality gate rejected, with the lines, the failing field and the reason, so a good answer refused by mistake is as visible as a weak one caught.

The judge is a different model from the one that writes the answers (`claude-sonnet-5-5` grades `claude-opus-5-5`), so the eval is not a model marking its own homework. `--judge-model claude-opus-5-5` is allowed, and the report header then warns that the scores may be generous.

After the first real run, check `work-embarrassed`, `work-pitch` and `shame-nephew`: they must come back as an angle (`ok`), not as support. If the model sends one-off workplace or family friction to `care`, narrow the "care" wording in the prompt further.

```
cd hushmallow/server/another-angle
ANTHROPIC_API_KEY=sk-ant-… node ../../tools/angle-eval.mjs        # prints the cost estimate, sends nothing
ANTHROPIC_API_KEY=sk-ant-… node ../../tools/angle-eval.mjs --yes  # runs it (estimate about $1.90, worst case about $12; runs 1 and 2 really cost $0.59 each)
node ../../tools/angle-eval.mjs --mock                             # free dry run of the harness
```

The report lands in `eval/reports/angle-eval-<date>.md` (and a `.json` beside it, not committed; it contains the model's answers and rejected drafts, so keep it private). Start with "Fix before expanding": the brief asks for weak answers to be fixed before anything grows. Then read "Gate rejections" for false alarms, and the latency line for answers slower than the 15 s / 28 s limits. The summary also shows the subtitle length against the 16–28 aim, how often line 2 proposes a step or asks an answerable question (a rough word-pattern reading, not a grade), and whether each "another angle" used a new pattern.

**Held-out cases.** The last 10 inputs in `eval/cases.js` (`heldOut: true`) were added after run 2 and have never been used to tune the gate. The gate's fixes were checked against the answers to the first 39 inputs (runs 1 and 2), so its pass rates on those flatter it; the report prints the held-out cases' gate and judge numbers beside the others' ("Held-out cases"), and that column is the fairer reading. They also measure what angle-v2 and v3 changed but runs 1 and 2 could not: no forced action on grief, fresh heartbreak or a worry out of their hands, fair anger that needs a boundary, a third angle (`followUp: 2`), and an amount and a day the person gave themselves.

`--prompt angle-v2` runs the eval with an older prompt file (the default is the server's `PROMPT_VERSION`), so two prompts can be compared on the same inputs and judge. The request wording follows the version too (angle-v1 never defined the lenses, so a v1 run gets v1's one-line "another angle" request), but the quality gate is always the current one. So `--prompt` compares prompts under today's gate; the measurement of each prompt *with its own gate* is the run that introduced it: run 1 for angle-v1, run 2 for angle-v2 (`eval/runs/`). To try a prompt change, copy the current prompt to the next version (`angle-v3.md`), edit it, point `src/index.js` and `PROMPT_VERSION` at it, run the eval, and compare reports.

**Replaying the gate (free).** `npm run replay:gate` re-runs the current quality gate alone over every answer of a recorded run — the accepted answers and the drafts it rejected — and lists which rejections would no longer happen, which still would (and why), and any accepted answer that would now fail. With no argument it replays run 1 (`eval/runs/run1-answers.json`); `npm run replay:gate -- eval/runs/run2-answers.json` replays run 2, and any later report's `.json` works too. When only the Actions log is at hand (the artifact needs a GitHub login to download), `npm run extract:log -- <job-log.txt> <out.json>` turns the report printed in the log back into that JSON; both fixtures were made that way. `test/gate-run1.test.js` and `test/gate-run2.test.js` turn the two runs into regression tests.

## Prompt versions

The system prompt is a versioned file; `PROMPT_VERSION` in `src/prompt.js` names the one the Worker bundles (`src/index.js`), and every response and log line carries it. Old versions stay in `prompts/` for comparison.

| Version | Date | What changed |
|---|---|---|
| `angle-v1` | 12 Oct 2026 | First version. Real-model eval run 1 (39 inputs, 45 answers; `eval/runs/run1-summary.md`): judge overall 3.92/5 (strong 7, acceptable 30, weak 1); relevance 4.37, accuracy 4.18, concision 3.74, actionability 3.63, respect 4.03, safety 4.84; novelty on "another angle" 3.17; gate: 28 first time, 10 after one regeneration, 2 fallbacks; p50 5.0 s, p95 11.1 s. All 3 safety probes went to support, no injection leaks. The judge's most repeated note: the useful next step sat only in `practical_next_step`, which most people never open. |
| `angle-v2` | 12 Oct 2026 | From run 1. **Line 2 carries the step** when an action would genuinely help (or one answerable question that leads to it), the same step as `practical_next_step`; line 1 keeps the fact/assumption distinction or the reframe and stops restating what the person said; never an action where it would be unkind (grief, fresh hurt, worries out of their hands), and for fair anger the boundary comes first. **Concision:** aim for 16–28 words (the gate still enforces 15–35, ≤22 a line), one idea per line, plain words, a list of filler to cut. **Another angle:** six named lenses (what you know versus what you're assuming; what's in your control; what you'd tell a friend; one small step; distance or time; compassion for yourself); a follow-up must use a pattern *and* a lens no earlier angle used, with a different question and action, and the request names the used patterns outside the data block (only values from the fixed list). Also: don't tell people what they themselves think or why they reacted, don't pick a pattern their words don't show, three new examples where line 2 does the work (none taken from the eval inputs), and a new full JSON example. Unchanged: schema, safety rules, injection handling, Mallow roles, British spelling, the brand language rule. Real-model eval run 2 (same 39 inputs and judge; `eval/runs/run2-summary.md`): judge overall 3.95 (strong 19, acceptable 21, weak 0); **actionability 3.63 → 4.30**, concision 3.74 → 3.88, respect 4.03 → 4.17, relevance 4.37 → 4.42, accuracy 4.18 → 4.05, safety 4.84 → 4.80; **novelty on "another angle" unchanged at 3.17**; line 2 proposed a step or an answerable question in 40/40; but the lines got no shorter (median 31 words, 32 of 40 over the 28 aim); gate: 34 first time, 6 after one regeneration, 0 fallbacks; p50 4.4 s, p95 8.5 s; $0.59. Safety probes 3/3 to support, no injection leaks. The judge's notes on the follow-ups: three of six used the "what you'd tell a friend" lens to reach the same point as the first angle. |
| `angle-v3` | 12 Oct 2026 | From run 2 and the review of v2. **Concision:** a per-line budget (about 8–14 words a line, 16–28 together; the gate still enforces 15–35, ≤22 a line) and "count them" in the last look, because the 16–28 aim alone left the median at 31. **Line 2 in varied forms** (a plain suggestion, "One small move: …", a choice of two, an answerable "Which…/What…" question; "Could you…?" is one form, not the default), and a follow-up's line 2 must use a different form from every earlier one. **Novelty:** a new lens must reach a new point (the same conclusion in a friend's voice is a repeat); the follow-up request says so, names the form to change and repeats the length. **Anchors agree with the rules:** the brief's examples are labelled the tone standard, with a line 2 that carries a step shown under examples 2 and 3 and a note that example 4's line 1 is the kind of acknowledgement the Cut list replaces; example 6 is retagged `practical_problem` (no harsh verdict in it); the grief example is `mind_reading` (no task, never "accountability"), and a note under the pattern table says grief, fresh heartbreak and worries out of their hands get warmth, not a task, whatever the pattern; two anchors and the JSON example no longer start line 2 with "Could you". Unchanged: schema, safety rules, injection handling, Mallow roles, British spelling, the brand language rule. Not yet measured against the real model. |

The quality gate changed with angle-v2 too (it applies to every prompt). Replaying run 1 through it (`npm run replay:gate`): 11 of the 14 rejected drafts now pass — they were false alarms (`invented_detail` on "four words" for a quoted "we need to talk", on "Saturday's argument", on "three things" or "twenty minutes" inside a suggested step, on "your CV" for a redundancy worry, on "the tenth replay" in a general remark; `not_specific` on lines that plainly engaged the situation, missed because "first-choice" did not meet "first choice" and "told him" did not meet "words"; `label_echo` on "treating three failed tests as proof you're stupid") — so 8 of run 1's 10 regenerations and both of its fallbacks would not have happened (each fallback began with a false alarm). The other 3 are real: 36–38 words, over the brief's limit, and still fail. All 38 answers the gate accepted in run 1 still pass. Word counts were already right (contractions and hyphenated words count once); numbers such as "1,000" and "3.5" and abbreviations such as "e.g." now count as one word too.

**The gate after review (with angle-v3).** The first round of fixes went too far in two places, and both are back: (1) *Numbers that change the person's own.* Time boxes counted anywhere in line 2, after "after", "for" or "about", so "After three weeks of silence…" passed for someone who had waited two. Now a number counting the same unit as one of theirs (minutes, hours, days, nights, weeks, months, years, times/tests/attempts) must be theirs, wherever it sits; an ordinal may name an earlier one ("your second test" of three), and the next attempt may be looked at ahead ("before booking test number four"). Inside a suggested action only, a time box after a forward-looking verb ("spend twenty minutes", "wait 48 hours", "for the next hour"), a small count of what to do ("three things", "two or three people", "say them aloud three times") and a clock time *with* its marker ("until 9 tonight", "at 7.30"; "at 6" alone is a fact) are left out; a vantage point counts only when it looks ahead ("in five years' time", "six months from now", "in five years, will…"), never "after five years"; and a count followed by a clause about the past ("the four strengths your manager praised") is a fact again. Digits, words and ordinals are one value ("1,000" is "a thousand", "5" is "five" and "fifth"). Days, months and holidays must be theirs unless they say when a suggested step should happen ("by Friday"). (2) *Generic lines that name a pronoun.* A pronoun for the person they named no longer counts as engaging with the situation; contacting that person does ("check with him in person"). "Slot", "chat" and "conversation" left the synonym lists ("Every conversation is a chance…" is not about their talk); "a conversation" or "the chat" counts only when the person reported a talk ("we need to talk", "wants to see me", "wouldn't say why") and the line is not a general remark. Also: line 2 and the step may restate what the person said happened ("Since she forgot the day, you could…"), but a mind word joined to it ("…noticed and thinks you're careless") is still a claim; a harsh label is checked at each use, so a frame covers only the use it ends on; "like proof that you're stupid" is a frame; "only she knows" leaves her reasons open; "as a friend" is a human claim only when it introduces a speaker; plurals of listed words meet them ("courses" meets "university"); a fallback after a repeated angle no longer hints the repeated pattern (the client would skip it), and feedback is counted against the prompt version of the scene being rated.

Replays after these changes: run 1, all 38 accepted answers still pass and the same 11 false rejections still pass (the 3 over 35 words still fail); run 2 (angle-v2, 40 accepted answers, never used for the first fixes), all 40 still pass, and 3 of its 6 rejections were false alarms that now pass ("say them aloud three times" in a step; "only she knows" and "value you as a friend"; "before booking test number four" after a third fail, with "like proof that you're stupid" in the same draft). The 3 drafts over 35 words still fail. The next attempt is allowed only when it is looked at ahead ("before booking test number four", "if she cancels a fourth time"); "you've failed a fourth time" or "after a fourth test" still fail. Every probe from the review is a test (`test/gate-run1.test.js`, `test/gate-run2.test.js`).

**What the novelty check does and does not measure.** The check on meaning-bearing words was set so that none of run 1's real follow-ups would fail (they share at most one such word with the angle before), and the same holds for run 2's. It catches near-verbatim paraphrases only: it would not have rejected any follow-up the judge scored 3/5, nor run 2's 2/5 follow-up (the same point, "new friends sit beside old ones", reached through a friend's eyes), and a paraphrase in synonyms passes ("His quiet so far has not given you his reply" after "Silence after words that big has not told you his answer yet": "answer" is a framing word, and a word list does not know "quiet" is "silence", so they share none). Counting synonym groups as shared meaning was tried and left out: with these thresholds it changes nothing measured, and lowering them would reject genuinely different follow-ups that share an action ("ask… tonight"). So any novelty gain in run 3 will come from the prompt and the rule that every follow-up uses an unused pattern, not from this check; the judge's novelty score is the measure.

## What is logged, and what is kept

**Never written to logs or storage by this server:** the person's words, the model's lines, session tokens, IP addresses, device ids, and what kind of safety concern was detected.

**What the server logs (Cloudflare Workers Logs, metadata only):** one line per request with: time, route, HTTP status, outcome (`ok`/`care`/`crisis`/`fallback`), fallback reason, latency, attempts, quality-gate result and failure codes, reasoning pattern, mechanic, Mallow, scene emotion and situation type, the chosen feeling and intention ids, how many earlier angles were sent, a length bucket (short/medium/long), the safety level (`none`/`concern`/`care`/`crisis`, never the category), whether the text looked like an injection attempt, model name, token counts, cost, remaining quota; and, for feedback, which of the four buttons was pressed for which pattern, mechanic and Mallow. `src/log.js` drops anything else, and the tests check that no input text reaches the logs.

**What Cloudflare itself records:** Cloudflare's *invocation logs* — which would store each request's headers and Cloudflare's location data (city, postcode, coordinates, network) beside the lines above — are switched off in `wrangler.toml` (`[observability.logs] invocation_logs = false`), and so are traces. What remains is the server's own lines plus the metadata Cloudflare attaches to each line (such as the time, the Worker's name and version and whether the request succeeded). The exact set is Cloudflare's and was not inspected on a live deploy when this was written, so check it once after the first deploy (setup step 9), and again if you change plans or settings. Cloudflare keeps Workers Logs for a few days; its pricing page lists the period for each plan (sources disagreed between 3 and 7 days on the free plan when this was written; 7 on the paid plan), so confirm it before quoting a number on the privacy screen. Separately, like any web host, Cloudflare's network handles the visitor's IP address to deliver the request and protect against attacks; that is covered by Cloudflare's own privacy policy, not by anything this server keeps.

**Stored by the server:** daily counters only — angles per session subject (a keyed hash of the device id, the purchase, or a random id; never the raw device id), new sessions per hashed network (an IPv4 address or an IPv6 `/64`, keyed with `IP_HASH_KEY`, never the raw address), total spend — in a Durable Object, deleted after two days.

**Sent to Anthropic:** the person's text, the chosen feeling and intention, and the earlier angle lines for "another angle"; plus an opaque hashed tag (`metadata.user_id`) so Anthropic can spot abuse without knowing who anyone is. No photos, account details or device ids. Whatever the person types, including any names, is sent as written. Anthropic does not use commercial API inputs and outputs for model training. **Retention needs checking before it goes on the privacy screen:** Anthropic's help page has said API inputs and outputs are deleted within 30 days, kept longer only when flagged under its usage policy (flagged content for up to 2 years), and later reports say the default fell to 7 days in September 2025. The server could not reach Anthropic's privacy pages when this was written, so confirm the current figure at privacy.claude.com (Anthropic's privacy centre) and copy that onto the Another Angle consent and privacy screens. Zero data retention can be arranged with Anthropic.

**Deletion:** because the server keeps no content, there is nothing per person to delete here. Rotating `TOKEN_SIGNING_KEY` (move the old value to `TOKEN_SIGNING_KEY_PREVIOUS` first if you want existing sessions to keep working) signs everyone out.

## Safety notes

* The lexicon is a verbatim copy of the app's. When the app's file changes, run `npm run sync:lexicon`; the tests fail until the copy matches. Server-only additions live in `src/safety/extra-lexicon.js`: more than a dose of medicine ("took a load of paracetamol", "a handful of tablets", "the whole box of sleeping pills"), cutting and other self-harm ("I've started cutting again", "burned myself on purpose"), not wanting to exist or to have been born, "no point in me being alive", plans and places ("a plan to end it", "on the bridge"), someone else wanting to end their life or cutting, sexual coercion ("forces me to have sex", "doesn't stop when I say no"), touching by an adult ("my uncle touches me"), violence by step-parents and other relatives, and a few idiom guards ("my phone is going to die", "took my meds on time"). Each has a regression test, and so does the everyday wording it must leave alone. Once the app's shared lexicon has them, delete them there.
* Support titles: the shared copy still says "Let's pause the reframe" / "This isn't one to reframe"; until it is reworded, the server sends "Let's pause Another Angle" / "This one needs real support" instead (`src/safety/index.js`), because "reframe" is jargon the gate never lets the model use.
* The model's own `safety_status` is honoured, so subtle crisis wording the lists miss still gets support. The eval measures that on its own (see above).
* Harmful experiences are never reframed, and an ordinary reframe is never offered as enough support in an emergency.
* The word "AI" never appears in what people see: the support copy, the subtitles and the gate all keep to hushmallow's own language.

## Files

| Path | What it is |
|---|---|
| `src/index.js` | Worker entry (bundles the prompt, exports the `Ledger` Durable Object) |
| `src/app.js` | Routes, CORS, auth, limits, spend cap, logging |
| `src/pipeline.js` | Safety → model → schema → gate → one regeneration → fallback |
| `prompts/angle-v3.md` | The versioned instructions (the brief's rules, patterns, Mallows, lenses, anchors); `angle-v1.md` and `angle-v2.md` kept for comparison |
| `src/schema.js`, `src/vocab.js` | Scene schema, strict validator, controlled lists |
| `src/gate.js`, `src/text.js` | Deterministic quality gate |
| `src/safety/` | Lexicon copy, server additions, support copy |
| `src/providers/` | Anthropic adapter and mock (provider abstraction) |
| `src/auth/` | Session tokens, testing/StoreKit entitlement, StoreKit JWS + X.509 checks |
| `src/limits/` | Durable Object counters, burst limiter, network key (IPv4 address / IPv6 /64) |
| `eval/` | Eval inputs (39 + 10 held out), judge rubric, reports; `runs/` (run summaries, runs 1 and 2's answers), `replay.js` + `replay-gate.mjs` (the gate alone over a recorded run), `extract-log.mjs` (a run's answers back from its Actions log) |
| `test/` | Node tests (mock model; the StoreKit tests mint a fresh Apple-shaped certificate chain each run, so no keys are stored) |
| `scripts/` | Lexicon sync; CI secret preparation |
