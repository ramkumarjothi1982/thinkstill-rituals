# Rollback runbook (one page)

For the person on call when the production monitor (`tools/ops/monitor.mjs`,
issue label `prod-monitor`) or a tester says something is wrong. Everything
below is a dashboard click or one command. Nothing here touches user data.

## 1. The app (Cloudflare Pages, `app.hushmallow.com`)

**Roll back:** Cloudflare dashboard → Workers & Pages → **hushmallow** →
**Deployments** → find the last good **Production** deployment (its commit is
the `v` in `https://app.hushmallow.com/version.json`) → **⋯** → **Rollback to
this deployment**. It is instant and swaps the whole site at once.

What happens to people already in the app: each deploy lives in its own
folder (`v/<commit>/`, `tools/build-site.sh`). Open pages ask `version.json`
(never cached) and move to whatever version it names, newer or older
(`src/app/update.js`: "if it differs"), at a safe moment (home screen, never
mid-sentence). A page whose folder vanished recovers through the inline
`hmStale()` in `index.html`. Their things stay on their phone.

**Then fix main:** the next push to `main` deploys again. Revert the bad
commit on `main` (a normal revert PR) before anything else merges, or the
rollback is undone. Do not delete deployments: they are the rollback targets.

Check: `curl -sI https://app.hushmallow.com/ | grep -i content-security-policy`
and `curl -s https://app.hushmallow.com/version.json`, or run the monitor
(`node hushmallow/tools/ops/monitor.mjs`).

## 2. The Another Angle Worker (`hushmallow-another-angle`)

**Roll back:** dashboard → Workers & Pages → **hushmallow-another-angle** →
**Deployments** → pick the previous version → **Rollback**; or from
`hushmallow/server/another-angle`: `npx wrangler deployments list`, then
`npx wrangler rollback <version-id> --message "reason"` (needs a Cloudflare
API token with Workers edit rights in your shell; never commit it). After a
rollback, check Settings → Variables and Secrets still list
`ANTHROPIC_API_KEY`, `TOKEN_SIGNING_KEY`, `IP_HASH_KEY` and
`TESTER_INVITE_CODES`, and that `/v1/health` (with
`Origin: https://app.hushmallow.com`) says `configured` true for both keys.
The next push to `main` touching the server redeploys it
(`.github/workflows/another-angle.yml`): revert on `main` too.

## 3. Switch Another Angle off quickly, without a deploy

From the code (`server/another-angle/src/app.js`, `src/beyond/angle-client.js`).
In every case the app plays Zuzu's own authored angles on the phone after its
own safety check; crisis and care support are unaffected.

| Fastest first | Do | Effect |
|---|---|---|
| A. Nothing leaves the phone | Dashboard → the Worker → Settings → Variables and Secrets → delete **`ANTHROPIC_API_KEY`** (or `npx wrangler secret delete ANTHROPIC_API_KEY`) | `/v1/health` reports `configured.provider_key: false`; the app's `healthReady()` then refuses to open a session, so **no words are sent** (an open app trusts a healthy answer for up to 10 minutes, `HEALTH_TTL_MS`; until then its requests get `fallback: provider`, with no model call). |
| B. No model spend | Set the variable **`DAILY_SPEND_CAP_USD`** to `0` | Every `/v1/angle` answers `fallback: capacity` before the model. Words still reach the Worker (not stored). |
| C. Worker unreachable | Settings → Domains & Routes → turn **workers.dev** off | The app's request fails (network) → authored angles. |

Caveats: a dashboard change to a variable (B) is replaced by the next
`wrangler deploy` from `main` (`wrangler.toml` `[vars]`), and the deploy job
re-sets `ANTHROPIC_API_KEY` from the GitHub secret when that secret exists
(A). To keep it off, also change `DAILY_SPEND_CAP_USD` in `wrangler.toml` or
remove the `ANTHROPIC_API_KEY` repository secret, via a PR. The permanent
app-side switch is emptying `ANGLE_ENDPOINT` and `ANGLE_ALLOWED_HOSTS` in
`src/app/config.js` (a deploy; the consent card then never shows). The monitor
will report the Worker as failing while it is off: that is expected.

## 4. Put the pilot gate back on

The gate's code is not on this branch (another workstream). Its settings are
the Pages secrets **`PILOT_ACCESS_CODES`** (comma-separated codes; production
and preview have separate sets, the production set matching the Worker's
`TESTER_INVITE_CODES`) and **`PILOT_COOKIE_KEY`**
(`server/another-angle/ops/access.mjs`). In general: dashboard → hushmallow
(Pages) → Settings → Variables and Secrets → Production → set both again (a
new random `PILOT_COOKIE_KEY` signs everyone out of the gate) → **Deployments
→ latest production → Retry deployment** (Pages applies variable changes only
to new deployments). Follow `docs/PILOT.md` where it exists. With the gate on,
run the monitor with `--allow-gate` (workflow input `allow_gate`, or the
repository variable `HM_MONITOR_ALLOW_GATE=1`). `/auth/callback/` must stay
outside the gate: sign-in emails land there.

## 5. Never

- Never touch the **Supabase** project (`hushmallow1`, Sydney) without the
  owner: no SQL, no deleting users or rows, no reset, no migration, no key
  rotation. People's accounts and synced things are kept through any rollback;
  a rollback of the app never needs a database change.
- Never put a secret in the repository, a build variable, an issue or a log
  (the build refuses Supabase secrets: `tools/site/auth-config.mjs`).
- Never force-push or rewrite `main`; roll back in Cloudflare, revert on `main`.
- Never weaken the headers to "make something work" (`'unsafe-eval'`, `*`,
  dropping `frame-ancestors`): roll back instead, then fix on a branch.
- Never delete Pages deployments or Worker versions while an incident is open.
