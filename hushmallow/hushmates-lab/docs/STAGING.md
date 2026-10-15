# Hushmates · Setting up staging, step by step

Staging is a private copy of Hushmates on real Supabase, for you and a few
testers. It is completely separate from Hushmallow. Nothing here touches:
- the production Hushmallow Supabase project or its sign-in;
- the Framer site;
- the production Cloudflare setup;
- any live user.

**Cost: A$0.** It uses Supabase's free plan, Supabase's built-in email sender (team
members only) and a free static host. **About 2–3 hours**, most of it waiting
or copying.

How to read this guide:
- 🛑 **You:** a step only you can do (your accounts, your approval).
- ✅ **Check:** what you should see before going on. If you don't, stop and see *If something goes wrong* at the end.
- 🔒 **Secret:** never paste it into a chat, an email or a document. It goes only where the step says.

Each of these is a separate approval (see `DECISIONS.md`):
- creating the accounts (part 2);
- deploying the Edge Function (part 6);
- publishing the web app (part 7);
- inviting testers outside your team, which needs an email provider (part 5, step 7).

---

## Part 1 · On your computer (about 20 minutes)

You need:
- **Node.js 22 LTS**, from [nodejs.org](https://nodejs.org). Check in a terminal: `node --version` shows `v22…`.
- **Git**, from [git-scm.com](https://git-scm.com).
- **A password manager**, for the secrets this guide makes.
- **The PostgreSQL 17 client tools**, for backups in part 11:
  - Mac: `brew install libpq`, then `brew link --force libpq`.
  - Windows: the PostgreSQL installer from EDB, ticking only *Command Line Tools*.

  Check: `pg_dump --version` shows `17` or later.

Then, in a terminal:
```
git clone <this repository's address>
cd <the folder it made>/hushmallow/hushmates-lab
git checkout claude/compassionate-pasteur-06wdsb
npm install
npm run staging:preflight
```
The Supabase command-line tool runs through `npx supabase …`; it downloads itself the first time.

✅ **Check:** every line shows ✓, except *.data/staging.env exists* (part 3 makes it)
and *the app builds for this project* (it needs part 2 first).

---

## Part 2 · 🛑 You: a new Supabase project (about 15 minutes)

1. Open [supabase.com/dashboard](https://supabase.com/dashboard) and sign in.
2. **Make a new organisation**, so staging can't touch Hushmallow's: use the organisation menu at the top left, then *New organization*.
   - Name: `Hushmates Staging`.
   - Plan: **Free**.
3. In that organisation, choose **New project**:
   - Name: `hushmates-staging`.
   - Database password: press *Generate a password*, then 🔒 save it in your password manager.
   - Region: **Sydney (ap-southeast-2)**, so the data stays in Australia.
   - Press *Create new project* and wait about two minutes.
4. Copy the **project reference**: the 20 letters in your browser's address bar, after `/project/`. For example, in `supabase.com/dashboard/project/abcdefghijklmnopqrst` it's `abcdefghijklmnopqrst`. It isn't secret.
5. Open **Project Settings → API Keys** and find:
   - the **publishable key** (`sb_publishable_…`). It is public by design: it goes into the web app.
   - the **secret key** (`sb_secret_…`). 🔒 It's for your computer only, in part 9.

   If your project shows the older `anon` and `service_role` keys instead, use those the same way: `anon` is public, `service_role` is secret.
6. Open **Project Settings → JWT Keys**. If it says the project signs with the *Legacy JWT secret*, switch it over:
   - press *Migrate JWT secret*;
   - then *Rotate keys*, so the new key is the one in use.

   Sign-ins are then signed with a public/private key pair. The Edge Function checks them with the public half, so no secret is shared with it. It's safe on a new project with no users yet.

✅ **Check:** the project's home page shows it as healthy, in Sydney.

---

## Part 3 · The staging secrets (5 minutes)

Choose the web address the app will have. With Cloudflare Pages (part 7) it is
`https://<a name you choose>.pages.dev`, for example `https://hushmates-staging-7k.pages.dev`.
You can change it later (part 7, step 6).

```
npm run staging:secrets -- new --origin https://<your web address> --project-ref <project reference>
```

This makes two private files, readable only by you and never committed:
- `.data/staging.env`: the keys that lock everyone's words, the invitation key and the scheduler's secret;
- `.data/staging-vault.sql`: the scheduler's settings, to paste in part 4.

🔒 **Copy `.data/staging.env` into your password manager now.** If it's lost,
every stored feeling becomes unreadable. That is what the encryption is for.

✅ **Check:** `npm run staging:secrets -- check` says the file is complete and well formed.

---

## Part 4 · The database (about 15 minutes)

1. **Two extensions.** In the dashboard: *Database → Extensions*. Search **pg_cron** and turn it on, then search **pg_net** and turn it on. Do this first, so the next step can set up the scheduler.
2. **The tables and rules.** In the terminal:
   ```
   npx supabase login                                   # opens the browser to sign in
   npx supabase link --project-ref <project reference>  # asks for the database password
   npx supabase db push                                 # lists 3 migrations: answer Y
   ```
3. **Let the Edge Function reach its database functions.** *Project Settings → Data API*. Under *Exposed schemas*, add `hushmates_api`, then press *Save*.

   Only the server's own key can use it. The staging check in part 9 proves browsers can't.
4. **The scheduler's settings.**
   - Open `.data/staging-vault.sql` in a text editor and copy all of it.
   - In the dashboard, open *SQL Editor → New query*, paste it and press *Run*.

   🔒 The file holds a secret: don't paste it anywhere else. You may delete the file afterwards.
5. **Check the scheduler is set up.** In a new SQL Editor query:
   ```sql
   select jobname, schedule, active from cron.job where jobname like 'hushmates-%';
   ```

✅ **Check:** two rows, `hushmates-retention` and `hushmates-tick`, both active. If
there are none, the extensions weren't on at step 2: run the `schedules` block at
the end of `supabase/migrations/20261014090200_hushmates_api.sql` once in the SQL Editor.

---

## Part 5 · Sign-in by email code (about 10 minutes)

All in *Authentication*:

1. **Sign In / Providers → Email:**
   - leave it on;
   - *Confirm email* on;
   - *Email OTP length* 6;
   - *Email OTP expiration* 600 seconds.
2. **Emails → Templates.** Change **two** templates, *Confirm signup* and *Magic link or OTP*, so they send a code to type, not a link. A person's first code comes from *Confirm signup*; every later one from *Magic link or OTP*. Use this for both:
   - Subject: `Your Hushmates code`
   - Body:
     ```html
     <h2>Your Hushmates code</h2>
     <p>Your code is <strong>{{ .Token }}</strong>. It works for 10 minutes.</p>
     <p>If you didn't ask for it, you can ignore this email.</p>
     ```
3. **URL Configuration:** the *Site URL* is your web address from part 3.
4. **Rate Limits:** keep the defaults.
5. **Attack Protection:** leave *captcha* **off**. The app has no captcha yet, so turning it on would refuse every sign-in.
6. **Password sign-in:** you may leave it as it is. The Edge Function refuses any sign-in that wasn't by email code (part 9 checks this).
7. **Email sender.** Supabase's built-in sender only delivers to your team's addresses (*Organization settings → Team*), and only a few emails an hour. That is enough for staging with the team as testers.
   - 🛑 Testers outside the team need an email provider (custom SMTP). Choosing one is decision **D5** in `DECISIONS.md`; the free tiers are enough for a beta.

---

## Part 6 · 🛑 You approve: deploy the Edge Function (5 minutes)

This is the first step that runs anything on Supabase. Do it only when you're happy to.
```
npx supabase secrets set --env-file .data/staging.env
npx supabase functions deploy hushmates --no-verify-jwt
```
(If it asks for Docker, add `--use-api` to the second command: Supabase then bundles the function itself.)
- `--no-verify-jwt` is intended: the function checks every sign-in itself (more strictly than the platform), and the scheduler's call carries none.
- AI stays off: `.data/staging.env` has no AI settings, and the database's switch starts off.

✅ **Check:** open `https://<project reference>.supabase.co/functions/v1/hushmates/health`
in your browser. It shows `{"ok":true}`.

---

## Part 7 · 🛑 You approve: publish the web app (about 20 minutes)

1. Build the app and the safety desk for your project. This makes one folder to upload:
   ```
   npm run staging:site -- --supabase-url https://<project reference>.supabase.co --anon-key <publishable key>
   ```
   The folder is `dist/site`. The tool refuses a secret key.
2. Create a free Cloudflare account just for staging: [dash.cloudflare.com/sign-up](https://dash.cloudflare.com/sign-up). Using a separate account keeps it well away from the production Cloudflare setup.
3. In it, open *Workers & Pages → Create → Pages → Upload assets*.
4. Name the project the name you chose in part 3. Drag in the **`dist/site`** folder, then press *Deploy*.
5. Open `https://<your name>.pages.dev/app/`.
6. If Cloudflare gave a different address from the one in part 3:
   - edit the `HUSHMATES_ALLOWED_ORIGINS` line in `.data/staging.env`;
   - run `npx supabase secrets set --env-file .data/staging.env` again;
   - update the *Site URL* (part 5, step 3).

✅ **Check:** the sign-in screen appears with Noomi. `/staff/` shows the safety desk's
sign-in. `/lab/` says *This page isn't here*.

Another host instead? Upload the same folder. The `_headers` file holds the
security headers that Cloudflare applies; another host must apply the same ones.

---

## Part 8 · Invitations and the safety team (about 10 minutes)

The operator's tool talks to the database directly, over an encrypted connection:

1. *Project Settings → Database → SSL Configuration*: press *Download certificate* and save it as `supabase-ca.crt` in your home folder.
2. Press **Connect** at the top of the dashboard, choose **Session pooler**, and copy the connection string. Put your database password where it says `[YOUR-PASSWORD]`.

   If the password has symbols in it, replace each with its `%` code: `@` is `%40`, `#` is `%23`, `/` is `%2F`.
3. Tell the terminal where the database is. Add the certificate to the end of the string:
   - Mac or Linux:
     ```
     export HUSHMATES_ADMIN_PG="<the string>?sslmode=verify-full&sslrootcert=$HOME/supabase-ca.crt"
     ```
   - Windows PowerShell:
     ```
     $env:HUSHMATES_ADMIN_PG="<the string>?sslmode=verify-full&sslrootcert=$HOME\supabase-ca.crt"
     ```

   🔒 The string holds your database password: don't save it in a file in the repository.
4. Make invitations. The tool reads the invitation key from `.data/staging.env`:
   ```
   node server/admin.mjs invite --count 5 --expires-days 14     # testers (each code works once)
   node server/admin.mjs invite --role moderator --count 2      # the safety team, for /staff/
   node server/admin.mjs settings                               # check: "ai": { "enabled": false, … }
   ```
   Codes are shown once. Give each one to one person. To cancel one: `node server/admin.mjs revoke <CODE>`.

---

## Part 9 · The staging check (about 10 minutes, mostly waiting)

One command checks the whole system from the outside:
- sign-in by email code;
- that browsers can't reach the database;
- the Edge Function;
- the scheduler;
- encryption, and that your saved keys are the deployed ones;
- the same feeling sent five times at once is stored once;
- deletion.

It makes three test people (no email is sent), cleans up after itself, never calls AI, and costs nothing.

In the same terminal as part 8:
- Mac or Linux:
  ```
  export HUSHMATES_STAGING_ANON_KEY="<publishable key>"
  export HUSHMATES_STAGING_SERVICE_KEY="<secret key>"        # 🔒
  npm run staging:check -- --project-ref <project reference>
  ```
- Windows PowerShell: the same with `$env:NAME="value"` lines.

It waits about four minutes to watch the platform's own scheduler at work.

✅ **Check:** the last line says `… passed, 0 failed`. A report without any secret is saved
in `.data/staging-check-<time>.json`: you can share that file with the developer.
A line marked `·` was not checked, and says why.

---

## Part 10 · Try it yourself (about 1 hour, mostly waiting)

You need three team email addresses that have **never** signed in to this
project: two members and one moderator.

1. On a phone, open `https://<your web address>/app/`. Sign in with the first email.
   - The email shows a **code**, not a link.
   - Enter the code, then an invitation, a name, and confirm you're 18 or over.
2. Release a feeling, and allow the Mallow.
3. On a second device, sign in with the second email and another invitation. Turn on catching, catch the feeling, and write a perspective.
4. On the first device, the feeling shows one petal. The words arrive when it comes home: after 24 hours, or sooner if five people answer.
5. Release a second feeling with the Mallow allowed, and let nobody catch it. About 31 minutes later, its Mallow perspective is waiting under *Journeys*, labelled *Automatically generated*, even if the app was closed.
6. On the second device, find a feeling and choose *… → Report this feeling*. At `/staff/`, sign in with the third email and a moderator invitation: the report is there. Decide it.
7. **A second sign-in.** On the second device: *You → Sign out*, then sign in again with the same email. It goes straight in: no invitation, the same name, and your perspective under *Perspectives you've offered*.
   - This uses the *Magic link or OTP* template, so check that email shows a code too.
   - If either sign-in says *Please sign in again*, stop and tell the developer.
8. On the first device: *You → Delete my data*. The account disappears from *Authentication → Users*.

---

## Part 11 · Backups and the recovery drill (about 15 minutes, then monthly)

The free plan keeps **no backups**. Make one yourself, and prove it can be read:
```
pg_dump "$HUSHMATES_ADMIN_PG" --format=custom --schema=hushmates --schema=hushmates_api --file=.data/hushmates-backup.dump
npm run staging:drill -- --dump .data/hushmates-backup.dump
```
The drill:
- restores the backup into a new database on your computer (it needs a local Postgres; see `BACKEND.md`);
- opens every stored word with your keys;
- removes the copy again.

✅ **Check:** *The backup and the keys work together.*

Keep backups with the same care as `.data/staging.env`. A backup without the
keys is unreadable. The keys without a backup are useless.

---

## Optional · Letting the developer's cloud session run the check

The simplest and safest way is to run part 9 on your computer and share the report.

If you'd rather the cloud session ran it:
1. 🔒 Add `HUSHMATES_STAGING_ANON_KEY`, `HUSHMATES_STAGING_SERVICE_KEY` and `HUSHMATES_ADMIN_PG` as secrets in the environment's settings. That's the cloud environment menu in the session's title bar, then *Edit*. Never paste them into the chat.
2. Allow these two hosts under *Network access → Allowed domains*:
   - `<project reference>.supabase.co`;
   - the pooler host from part 8, step 2.
3. The check also needs `.data/staging.env`, which holds the data keys. Keeping those only on your computer is safer.

---

## If something goes wrong

| What you see | What it means | What to do |
|---|---|---|
| `{"ok":true}` page doesn't load (part 6) | The function isn't deployed, or its secrets are missing | Run both commands in part 6 again. In the dashboard, *Edge Functions → hushmates → Logs* shows why |
| The check says the function's database calls fail with 406 | `hushmates_api` isn't exposed | Part 4, step 3 |
| The check says "the scheduler … ran" failed | The jobs or the Vault settings are missing | Part 4, steps 4–5 |
| Every sign-in ends with *Please sign in again* | The project still signs tokens with the legacy shared secret | Part 2, step 6. (Or, if you can't switch: copy the legacy JWT secret from *Project Settings → JWT Keys*, add `HUSHMATES_JWT_SECRET='…'` to `.data/staging.env`, and run part 6 again) |
| No email arrives | The built-in sender only sends to team members, a few an hour | Use team addresses; wait a while; or decision D5 |
| *The keys in .data/staging.env open it* failed | The function was deployed with other keys | Run part 6 again with the right `.data/staging.env`. Never make new keys for a project that has data |
| Anything else | | Run `npm run staging:check -- --project-ref <ref> --quick` and share the report file (it has no secrets) |

## Undo

- **Pause it:** *Project Settings → General → Pause project*. Free projects also pause by themselves after a week without use.
- **Remove everything:** delete the Supabase project and the Cloudflare Pages project. Nothing else depends on them.
- **Stop only the scheduler:** in the SQL Editor:
  ```sql
  select cron.unschedule('hushmates-tick');
  select cron.unschedule('hushmates-retention');
  ```
