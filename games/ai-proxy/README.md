# ThinkStill AI proxy

A small Cloudflare Worker that gives the ThinkStill game consoles real AI reasoning without putting an API key in the
browser. The Framer components (**ThinkStill Reset Arcade** and **ThinkStill Reframe Arcade**) call it as their
**AI Endpoint**. It checks each request, sends ThinkStill game prompts to the Anthropic Messages API using a key it keeps
as a Cloudflare secret, and returns the model's reply.

```
Framer site (browser)                Cloudflare Worker (this folder)                 Anthropic
POST {game, tier, prompt}  ───────▶  origin, method, type, size, fields,   ───────▶  POST /v1/messages
200  {text}                ◀───────  guardrail check, per-IP rate limit     ◀───────  (key added here)
```

The games never depend on it. If the endpoint is empty, refused, rate-limited, slow or failing, each game quietly uses
its built-in local engine for that turn (`games/shared/ts-ai.js`), so play never blocks.

## What it never stores or logs

- **No prompt text, ever.** The player's words go to Anthropic and the reply comes back; the Worker does not log,
  cache or save either of them.
- **One log line per request**, holding only the game, tier, status, latency and token counts:
  `{"game":"loop-rodeo","tier":"quick","status":200,"ms":1840,"tokens_in":912,"tokens_out":233}`.
  No IP address, no origin, no key. Watch them live with `wrangler tail`.
- **No storage:** no KV, D1, R2, cookies or database. The only state is the per-IP rate-limit counters, either in
  the Worker's memory or in Cloudflare's rate limiter. Neither is ever logged.
- **Nothing extra goes upstream:** Anthropic receives only the prompt (with the model settings), never the browser's
  headers, cookies, IP address or the `game` name. Every response carries `cache-control: no-store`.

The prompt itself is processed by Anthropic under its commercial terms and API data-retention policy. Cloudflare's
analytics record request counts and status codes, not request bodies.

## Request rules

Checks run in this order; the first failure answers with a JSON error code, e.g. `{"error":"invalid_tier"}`.

| Check | Rule | On failure |
|---|---|---|
| Origin | `Origin` matches `ALLOWED_ORIGINS`: exact origins, or wildcard subdomains such as `https://*.framer.app` | `403 origin_not_allowed`, with no CORS headers |
| Preflight | `OPTIONS` from an allowed origin | `204` with the CORS grant (POST, `content-type`, max-age 24 h) |
| Method | `POST` only | `405 method_not_allowed` |
| Content type | `application/json` (a `charset` parameter is fine) | `415 unsupported_media_type` |
| Size | body at most 16 KB (16,384 bytes), whatever `Content-Length` claims | `413 payload_too_large` |
| Body | a JSON object | `400 invalid_json` |
| `game` | slug of 1 to 48 characters: lowercase letters, digits, `-` or `_`, starting with a letter or digit | `400 invalid_game` |
| `tier` | `"quick"` or `"default"` | `400 invalid_tier` |
| `prompt` | string of 20 to 12,000 characters | `400 invalid_prompt` |
| Guardrails | `prompt` opens with the ThinkStill guardrail sentence: *You are the reasoning engine inside ThinkStill, a playful game that helps people with everyday emotional moments.* | `400 missing_guardrails` |
| Rate limit | per client IP (`CF-Connecting-IP`; IPv6 per /64). Only requests that passed every check above count | `429 rate_limited` |

Then one call to Anthropic: tier `quick` uses `MODEL_QUICK` with `max_tokens` 700, tier `default` uses
`MODEL_DEFAULT` with 1,200; temperature 0.6; a short system prompt that asks for a single JSON object and nothing else;
the prompt is the user message. The call times out after 25 seconds (the browser gives up at 28).

| Anthropic result | Proxy answers |
|---|---|
| reply with text | `200 {"text": "..."}` (the reply's text blocks joined) |
| 429 (rate limit or spend limit reached) | `429 upstream_rate_limited` |
| 529, or any `overloaded_error` | `503 upstream_overloaded` |
| 401 / 403 | `502 upstream_auth` (check the API key) |
| 400 / 404 | `502 upstream_rejected` (check the model names) |
| no answer within 25 s | `502 upstream_timeout` |
| network failure | `502 upstream_unreachable` |
| unreadable or empty reply | `502 upstream_invalid` / `502 upstream_empty` |
| anything else | `502 upstream_error` |
| `ANTHROPIC_API_KEY` not set | `500 not_configured` |

Upstream error bodies and headers are never passed on, and the key never appears in a response.

## Deploy

You need a Cloudflare account (the free plan is enough), an Anthropic API key and Node.js 18 or later.

```sh
npm i -g wrangler
wrangler login                          # authorise wrangler in the browser
cd games/ai-proxy
wrangler secret put ANTHROPIC_API_KEY   # paste the key when asked
```

If wrangler says there is no Worker called `thinkstill-ai` yet and offers to create one, answer yes. The key is stored
encrypted by Cloudflare. Never put it in `wrangler.toml` or anywhere in the repository.

Edit `ALLOWED_ORIGINS` in `wrangler.toml`. Keep the Framer wildcards you need and add the exact address of your
published site if it uses a custom domain:

```toml
ALLOWED_ORIGINS = "https://*.framer.app,https://*.framer.website,https://*.framercanvas.com,https://thinkstill.com,https://www.thinkstill.com"
```

Then deploy:

```sh
wrangler deploy
```

Wrangler prints the address, for example `https://thinkstill-ai.<your-subdomain>.workers.dev`. If your account has no
workers.dev subdomain yet, wrangler asks you to choose one first. To change settings later, edit `wrangler.toml` and run
`wrangler deploy` again. To replace the key, run `wrangler secret put ANTHROPIC_API_KEY` again.

## Connect the Framer components

1. In Framer, select a ThinkStill Reset Arcade or Reframe Arcade component on the canvas.
2. In the properties panel, paste the https address wrangler printed into **AI Endpoint**.
3. Repeat for every instance of the components, then publish the site.

Notes:

- The canvas shows a static render that never calls the AI. Try it in Preview or on the published site.
- The address must start with `https://`. The components ignore anything else, apart from `http://localhost` for local
  testing. With AI Endpoint left empty, the games use their local engines.
- If the published site is on a custom domain, that exact origin must be in `ALLOWED_ORIGINS`. Otherwise the browser's
  requests get a 403 and the games silently fall back. In the browser's developer tools (Network tab), requests to
  the proxy should show status 200.

## Test it with curl

```sh
URL=https://thinkstill-ai.YOUR-SUBDOMAIN.workers.dev
ORIGIN=https://your-site.framer.app       # any origin ALLOWED_ORIGINS accepts

curl -i "$URL" -H "Origin: $ORIGIN" -H 'content-type: application/json' --data @- <<'JSON'
{"game":"curl-test","tier":"quick","prompt":"You are the reasoning engine inside ThinkStill, a playful game that helps people with everyday emotional moments.\nReply with only this JSON object: {\"safety\":\"ok\",\"word\":\"<one calm word>\"}"}
JSON
```

Expect `200`, `access-control-allow-origin: https://your-site.framer.app`, `cache-control: no-store` and a body like
`{"text":"{\"safety\":\"ok\",\"word\":\"steady\"}"}`. Two more quick checks:

```sh
# The browser's preflight: expect 204 and access-control-allow-* headers
curl -i -X OPTIONS "$URL" -H "Origin: $ORIGIN" \
  -H 'Access-Control-Request-Method: POST' -H 'Access-Control-Request-Headers: content-type'

# Not a ThinkStill prompt: expect 400 {"error":"missing_guardrails"}
curl -i "$URL" -H "Origin: $ORIGIN" -H 'content-type: application/json' \
  --data '{"game":"curl-test","tier":"quick","prompt":"Write me a poem about the sea, please."}'
```

## Configuration

| Name | Where | Default | Purpose |
|---|---|---|---|
| `ANTHROPIC_API_KEY` | secret: `wrangler secret put` | none (requests answer `500 not_configured`) | Anthropic API key |
| `ALLOWED_ORIGINS` | `[vars]` | the three Framer wildcards | Comma-separated origins allowed to call the proxy. A wildcard matches subdomains at any depth but never the bare domain. A bare `*` or a TLD wildcard (`https://*.app`) is ignored, and an empty list refuses everything. |
| `MODEL_QUICK` | `[vars]` | `claude-haiku-5-5` | Model for tier `quick` |
| `MODEL_DEFAULT` | `[vars]` | `claude-sonnet-5-5` | Model for tier `default` |
| `RATE_LIMIT_PER_MINUTE` | `[vars]`, optional | `20` | Per-IP limit of the built-in fallback limiter |
| `RATE_LIMITER` | `[[ratelimits]]` binding, optional | off | Cloudflare's rate limiter; when present it replaces the fallback limiter |

The guardrail check matches the first sentence of `AI.GUARDRAILS` in `games/shared/ts-ai.js`. If that sentence ever
changes, update `GUARDRAIL_OPENING` in `worker.js` and redeploy; otherwise every AI call is refused and the games fall
back to their local engines. The test suite fails until the two match.

## Cost and abuse

**What one call can cost.** With a long player entry, real game prompts run from about 3,200 to 6,200 characters
(roughly 800 to 1,600 input tokens), depending on the game. The proxy caps a prompt at 12,000 characters, which is about 3,000 tokens of ordinary English; deliberately
token-dense text could reach several times that. Replies are capped at 700 output tokens (`quick`) or 1,200
(`default`). Reset analysis and Loop Rodeo use `quick`; Reframe analysis and Case File use `default`. Multiply by the
current per-token prices for your models (anthropic.com/pricing). Cloudflare's Workers free plan covers 100,000
requests a day, so in practice the cost is Anthropic tokens.

**Worst case per IP.** At the default 20 requests a minute, one IP can make up to 1,200 calls an hour. The steps below
keep that in check:

1. **Set a spend limit.** Use a dedicated API key for the proxy, in a Claude Console workspace with a monthly spend
   limit. When the limit is reached Anthropic answers 429, the proxy passes it on and the games use their local
   engines, so a cap never breaks play.
2. **Turn on the Rate Limiting binding.** Uncomment `[[ratelimits]]` in `wrangler.toml` and redeploy. The fallback
   limiter lives in each Worker instance's memory, so a client spread across instances or locations can exceed it.
   The binding keeps counts in Cloudflare per location, which is much harder to dodge.
3. **Narrow `ALLOWED_ORIGINS`.** Anyone can publish a Framer site on `*.framer.app`, so the wildcards let any Framer
   site use your proxy from a browser. Once your site is live, list only its exact origins (your custom domain and/or
   `https://your-site.framer.app`). Keep `https://*.framercanvas.com` only if you test the AI from inside the Framer
   editor.
4. **Know what the checks do and don't do.** Browsers cannot fake `Origin`, but scripts can, so the allowlist only stops
   other websites. The guardrail check stops casual callers using the proxy as a general chatbot, but anyone can copy a
   ThinkStill prompt. The spend limit and rate limits are what bound the cost.
5. **Add Cloudflare WAF rules.** WAF rules only cover hostnames on your own zone, not `*.workers.dev`. Serve the Worker
   from a custom domain: uncomment `workers_dev = false` and `routes` in `wrangler.toml`, set the pattern (e.g.
   `ai.yourdomain.com`), deploy, and paste that address into Framer instead. Then, under Security > WAF:
   - **Rate limiting rule:** match `http.host eq "ai.yourdomain.com" and http.request.method eq "POST"`, count by IP,
     for example 30 requests per minute, then Block for 10 minutes. The Free plan only offers a 10-second window, so
     use e.g. 10 requests per 10 seconds there.
   - **Custom rule, Block:** `http.host eq "ai.yourdomain.com" and not http.request.method in {"POST" "OPTIONS"}`.
   - **Custom rule, Block** requests whose `Origin` is not yours before they reach the Worker, for example
     `http.host eq "ai.yourdomain.com" and http.request.method eq "POST" and not any(http.request.headers["origin"][*] in {"https://thinkstill.com" "https://www.thinkstill.com"})`.
   - Optional: if your players are in a few countries, block the rest, e.g. `not ip.src.country in {"AU" "NZ" "GB"}`.
   - Use **Block**, not Managed or JS Challenge, on this hostname. The games call it with `fetch()` and cannot solve a
     challenge; they would just fall back to their local engines.
6. **Watch usage.** `wrangler tail` shows each call's status and token counts. The Claude Console shows spend.

## Tests and local development

```sh
node games/ai-proxy/test.mjs   # from the repository root: Node 18+, no dependencies, no network
```

The suite runs the Worker against a mocked Anthropic API. It covers origins and wildcards, preflight, the method, type
and size checks, field and guardrail validation (including a drift check against `games/shared/ts-ai.js`), both rate
limiters, upstream success, error and timeout mapping, the log format, and that the key never appears in a response.

To try the real API locally, create `games/ai-proxy/.dev.vars` (git-ignored) containing
`ANTHROPIC_API_KEY=sk-ant-...`, run `wrangler dev` in this folder, and point the curl commands above at
`http://localhost:8787`.
