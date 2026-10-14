# Hushmates · Staging, step by step

A separate staging environment for the private beta. It is **not deployed**:
each step marked **🛑 Owner** needs the owner's account, credentials or
approval, and stops there until the owner acts. Nothing here touches the
production Hushmallow Supabase project, its authentication, the Framer landing
page or the production Cloudflare setup.

Staging can run at **A$0**: Supabase's free plan, Supabase's built-in email
sender (team members only), and a free static host. See `COSTS.md`.

## 0. What you need

- Node 22 and this repository (`npm install` in `hushmallow/hushmates-lab`).
- The [Supabase CLI](https://supabase.com/docs/guides/cli) (`npm i -g supabase` or `brew install supabase/tap/supabase`).
- Run every command from `hushmallow/hushmates-lab`, and first confirm the local suite passes:
  ```
  node --test tests/*.test.mjs        # needs the local Postgres (see BACKEND.md)
  node tools/sync-edge.mjs --check    # the Edge Function's shared copies match their sources
  ```

## 1. 🛑 Owner: a new Supabase project, apart from Hushmallow's

1. In the Supabase dashboard, create a **new organisation or project** named `hushmates-staging`. Never reuse the production Hushmallow project.
2. **Region:** Sydney (`ap-southeast-2`), so data stays in Australia.
3. **Plan:** Free.
4. Keep the database password in a password manager.
5. Note the **project ref** (in the URL) and, under *Settings → API*, the **project URL** and the **anon / publishable key**. The anon key is public by design and goes into the web build.
6. The **service role key** never leaves Supabase: the Edge Function gets it automatically.

Then, on your machine:
```
supabase login                      # 🛑 Owner: your Supabase account
supabase link --project-ref <ref>
```

## 2. Database extensions, then the schema

1. In the dashboard, open *Database → Extensions* and enable **pg_cron** and **pg_net**. Do this before step 2, so the migration can schedule the jobs.
2. Push the migrations, which apply `supabase/migrations/*` in order:
   ```
   supabase db push
   ```
3. Expose the API schema. Under *Settings → API → Data API → Exposed schemas*, add `hushmates_api`. The Edge Function calls it through PostgREST. Only the service role may execute it: browsers can't.
4. Check that browsers really can't reach anything. Run this in the SQL editor; every line must fail with *permission denied*:
   ```sql
   set role anon;           select * from hushmates.journeys limit 1;
   set role anon;           select hushmates_api.settings();
   set role authenticated;  select * from hushmates.members limit 1;
   set role authenticated;  select hushmates_api.rpc('x','y','me');
   reset role;
   ```

## 3. Secrets for the Edge Function

Generate them locally. They are shown once, so put them straight into a password manager:
```
node -e "const c=require('crypto');console.log(JSON.stringify({DATA_KEY:c.randomBytes(32).toString('base64'),MAC_KEY:c.randomBytes(32).toString('base64'),JOB_SECRET:c.randomBytes(24).toString('base64url')},null,1))"
```
Set them on the project (`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are provided by Supabase):
```
supabase secrets set \
  HUSHMATES_DATA_KEYS='{"k1":"<DATA_KEY>"}' \
  HUSHMATES_DATA_KEY_ID=k1 \
  HUSHMATES_MAC_KEY='<MAC_KEY>' \
  HUSHMATES_JOB_SECRET='<JOB_SECRET>' \
  HUSHMATES_ALLOWED_ORIGINS='https://<the staging web address>'
```
- If the project still uses the legacy shared-secret JWTs, also set `HUSHMATES_JWT_SECRET`, from *Settings → API → JWT secret*. Asymmetric signing keys need nothing: the function reads the project's public keys.
- **Losing `HUSHMATES_DATA_KEYS` makes every stored feeling unreadable.** Losing `HUSHMATES_MAC_KEY` invalidates every invitation code.
- To rotate the data key, add a new kid to the JSON, set `HUSHMATES_DATA_KEY_ID` to it, and keep the old kid until the old data is gone.
- **Do not set** `HUSHMATES_AI_URL` / `HUSHMATES_AI_TOKEN` (Another Angle): AI stays off. See step 9.

## 4. The scheduler's secrets (Supabase Vault)

pg_cron calls the function every minute, for homecoming, expiry and the Mallow fallback, using two Vault secrets. In the SQL editor:
```sql
select vault.create_secret('https://<ref>.supabase.co/functions/v1/hushmates', 'hushmates_job_url');
select vault.create_secret('<JOB_SECRET>', 'hushmates_job_secret');
select jobname, schedule from cron.job where jobname like 'hushmates-%';   -- hushmates-tick, hushmates-retention
```
If the two jobs are missing (the extensions weren't on at step 2), run the
`schedules` block at the end of `supabase/migrations/20261014090200_hushmates_api.sql` once.

## 5. Sign-in by email code

Under *Authentication*:
1. *Providers → Email*: enabled, with "Confirm email" on. (The Edge Function also refuses any sign-in that wasn't by email code, so a password sign-up can't be used to reach someone's account.)
2. *Email Templates → Magic Link*: replace the link with the code, so people type it in. For example:
   > **Your Hushmates code**
   > Your code is **{{ .Token }}**. It works for 10 minutes. If you didn't ask for it, you can ignore this email.
3. *Settings*: email OTP expiry 600 seconds, length 6.
4. *URL configuration*: the staging web address as the Site URL.
5. *Rate limits*: keep the defaults or lower them. One code per address a minute matches the app's "Send a new code" wait (`max_frequency` in `supabase/config.toml`).
6. **Email sender.** Supabase's built-in sender only delivers to the project's team members' addresses, and only a few per hour. That's enough for staging with the team as testers.
   - 🛑 **Owner:** real testers outside the team need a custom SMTP provider. Choosing one and creating its account needs your approval; see `COSTS.md`.
7. *Bot protection* (optional, free): Cloudflare Turnstile or hCaptcha. 🛑 Owner: a site key from your account.

## 6. 🛑 Owner approval: deploy the Edge Function

This is the deploy step: only with the owner's go-ahead.
```
node tools/sync-edge.mjs --check
supabase functions deploy hushmates --no-verify-jwt
```
`--no-verify-jwt`, as in `supabase/config.toml`: the function checks every token itself, and the scheduler's route carries no person's token.

Check it:
```
curl -s https://<ref>.supabase.co/functions/v1/hushmates/health                       # {"ok":true}
curl -s -X POST https://<ref>.supabase.co/functions/v1/hushmates/rpc/me -H 'content-type: application/json' -d '{}'   # 401, "Please sign in again."
```

## 7. The web app and the safety desk

Build them for this project. The anon key is public; a secret key is refused:
```
node tools/build-app.mjs --supabase-url https://<ref>.supabase.co --anon-key <anon or publishable key>
```
This writes `dist/app` and `dist/staff`, each with a hash manifest. The pages
may connect to that project and nothing else (Content Security Policy).

🛑 **Owner: a static host.** Use a new free project, for example a new
Cloudflare Pages project. That is not the production one. Publish `dist/app`
and `dist/staff` together: the URLs are `/app/…`, `/staff/…`, `/ui/…`,
`/styles/…` and so on. With Cloudflare Pages, add this `_headers` file at the
root of what you upload:
```
/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: no-referrer
  X-Frame-Options: DENY
  Cross-Origin-Opener-Policy: same-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()
  X-Robots-Tag: noindex, nofollow
  Strict-Transport-Security: max-age=31536000
```
Alternatively, any Node host can run `node server/main.mjs --mode production`,
which serves exactly the built files and checks their hashes.

Then set `HUSHMATES_ALLOWED_ORIGINS` (step 3) to that address.

## 8. Invitations and the safety team

The operator's tool talks to the database directly. Use the *Session pooler*
connection string from *Settings → Database*, plus the MAC key from step 3:
```
export HUSHMATES_ADMIN_PG='postgres://postgres.<ref>:<db password>@aws-0-ap-southeast-2.pooler.supabase.com:5432/postgres'
export HUSHMATES_MAC_KEY='<MAC_KEY>'
node server/admin.mjs invite --count 10 --expires-days 14          # testers (single use)
node server/admin.mjs invite --role moderator --count 2            # the safety team (for /staff/)
node server/admin.mjs settings                                     # AI is off: "enabled": false
node server/admin.mjs ops                                          # what ran, what it cost
```
Codes are printed once and stored only as keyed hashes. To revoke one:
`node server/admin.mjs revoke <CODE>`. To lift a restriction, use
`node server/admin.mjs member <reference shown on the desk> active`.

## 9. AI stays off

`hushmates.settings 'ai'` starts with `enabled: false` and a A$0 cap.
Switching it on needs, in this order:
1. The owner's approval of the costs.
2. Another Angle's owner agreeing to the traffic, a service token and `ALLOW_NO_ORIGIN=true` on that service. Hushmates doesn't change it.
3. Updated consent wording that names the AI provider (see `READINESS.md`).
4. The secrets `HUSHMATES_AI_URL` / `HUSHMATES_AI_TOKEN`.
5. `node server/admin.mjs set ai '{"enabled": true, "monthlyCapAud": <cap>}'`.

Turning it off takes effect at once: `set ai '{"enabled": false}'`.

## 10. Smoke test with two real accounts

1. On a phone, open `https://<staging>/app/`, sign in with a team email, enter the code, then an invitation, a name and 18+.
2. Release a feeling. Allow the Mallow fallback.
3. On a second device, with another team email and another invitation, turn on catching, catch the feeling, and write a perspective.
4. Back on the first device, the perspective has arrived. After 30 minutes with no other catchers, the Mallow's perspective is waiting. After 24 hours, the feeling comes home.
5. On the second device, report the feeling. At `/staff/`, sign in with a moderator invitation: the report is there; decide it.
6. Check that the scheduler is running:
   ```sql
   select status, start_time from cron.job_run_details order by start_time desc limit 5;
   select hushmates_api.ops_summary(1);
   ```
7. In the dashboard's Table Editor, open `hushmates.journeys`: `text_enc` starts with `hmenc:v1:`. No one's words are readable there.
8. On the first device, *You → Delete my data*: the account, its words and its sign-in are gone (*Authentication → Users*).
9. Two things only a real project can show, before inviting anyone else:
   - **How sign-ins are marked.** Decode an access token from step 1 (paste it into a JWT viewer you trust, or `node -e` with `Buffer.from(token.split('.')[1], 'base64url')`): its `amr` should name `otp`. If it names something else, the function will refuse every sign-in; tell the developer before going further.
   - **Which header carries the caller's address.** Ask the function's logs (or a temporary log line) which of `x-forwarded-for`, `cf-connecting-ip` and `x-real-ip` holds the real address. If it isn't the last `x-forwarded-for` entry, set `HUSHMATES_CLIENT_IP_HEADER` to the right one (step 3).

## Undo

- **Pause:** *Project settings → Pause project*.
- **Remove everything:** delete the project. Nothing else depends on it.
- **The schedules alone:** `select cron.unschedule('hushmates-tick'); select cron.unschedule('hushmates-retention');`
