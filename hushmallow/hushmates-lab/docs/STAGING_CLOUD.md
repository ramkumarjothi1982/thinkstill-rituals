# Hushmates · Staging from the cloud session, step by step

This is the shortest way to get Hushmates onto real staging infrastructure. **You**
make two accounts, two tokens and one root secret; **the developer's cloud session** deploys
and runs every test. Nothing needs installing on your computer.

`STAGING.md` is the other way, run from your own computer. Both end in the same place.

**Cost: A$0.** Supabase Free, Cloudflare Free, and Supabase's built-in email
sender, which only sends to team members. None of these can bill you
(`COSTS.md` §1).

**Nothing here touches production:**
- Hushmallow's Supabase project and sign-in;
- the Framer site;
- the production DNS and Cloudflare;
- live users.

That's why each account is **new and separate**: a token from a separate account
can't reach production at all. The tools also check, before changing anything:
- the Supabase token must reach the staging project and nothing else;
- every Pages project on the Cloudflare account must have "staging" in its name.

Otherwise they refuse.

**Who can reach staging:** anyone who has its address can load it, as with any
website. But:
- it asks search engines not to list it;
- nobody gets past sign-in without an invitation;
- Supabase's built-in sender only emails members of your Supabase team.

So staging is not a public release.

How to read this guide:
- 🔒 **Secret:** never paste it into the chat, an email or a document. It goes only into the place the step names.
- ✅ **Check:** what you should see before going on.

---

## Step 1 · A separate Supabase account and project (about 15 minutes)

1. **Sign out** of Supabase. Then sign up again at [supabase.com/dashboard](https://supabase.com/dashboard) with **a different email address** from the one that owns Hushmallow's production project. An alias works, for example `you+staging@…`.
   - Don't use "Continue with GitHub" if your GitHub login already owns the production project.
2. Make an **organisation** called `Hushmates Staging`, on the **Free** plan.
3. In it, make a **project**:
   - name `hushmates-staging`;
   - region **Sydney (ap-southeast-2)**;
   - press *Generate a password*, then save it 🔒 in your password manager. The cloud session doesn't need it, but you might.
4. Copy the **project reference**: the 20 letters in the address bar after `/project/`. It isn't secret.
5. *Project Settings → JWT Keys*. If it says the project signs with the **Legacy JWT secret**:
   - press *Migrate JWT secret*;
   - then *Rotate keys*.

   (Hushmates checks sign-ins with the public half of a key pair. A new project with no users is safe to switch.)

✅ **Check:** the project page shows it healthy, in Sydney.

## Step 2 · A Supabase access token for staging only (5 minutes)

1. Top right → your account → *Access Tokens* → *Generate new token*.
2. If it offers a **scoped token**, choose it:
   - limit it to the `hushmates-staging` project;
   - set an expiry of **30 days**;
   - give it these permissions, which are exactly what the deploy and the tests use:

     | Permission | Access |
     |---|---|
     | Projects (account-wide) | Read |
     | Project Settings | Read-write |
     | Auth Config | Read-write |
     | Data API Config | Read-write |
     | Database | Read-write |
     | Edge Functions | Read-write |
     | Edge Function Secrets | Read-write |
     | API Keys | Read |
     | API Key Secrets | Read |

   *Project Settings: Read-write* is needed to set sign-in by email code. Be aware it would also let the token pause or delete the **staging** project. It can't reach anything else.

   If the scoped form isn't offered, a classic token is acceptable here, because this account holds nothing but staging (the tools check that).
3. Name it `hushmates-staging-cloud`, press *Generate*, and copy it 🔒. It starts with `sbp_`. You'll paste it once, in step 5.

## Step 3 · A separate Cloudflare account and the Pages project (about 10 minutes)

1. Sign up at [dash.cloudflare.com/sign-up](https://dash.cloudflare.com/sign-up), again with **a different email address** from the one used for Hushmallow's Cloudflare.
2. *Workers & Pages → Create → Pages → Upload assets*:
   - name the project `hushmates-staging`;
   - if it asks for files before creating the project, drag in **any one small file** (a text file named `index.html` is fine): the deploy replaces it a few minutes later;
   - press *Deploy*.

   **Make it as a Pages project.** The developer's tools only ever deploy to a Pages project you made, never create one. Note: from AI tools, Cloudflare's own command-line tool would otherwise make a Workers project instead.
3. Note the address Cloudflare shows: usually `https://hushmates-staging.pages.dev`. If the name was taken, it has a few extra letters, like `https://hushmates-staging-7xq.pages.dev`. Use that exact address below: the tools find the project by its address.

   Keep only staging projects on this account. The tools refuse an account that holds any Pages project without "staging" in its name.
4. Find the **Account ID**: on *Workers & Pages*, in the right-hand column, or the 32 characters after `dash.cloudflare.com/` in the address bar. It isn't secret.
5. Make an **API token**:
   - *My Profile → API Tokens → Create Token → Create Custom Token*;
   - name: `hushmates-staging-pages`;
   - permissions: **Account → Cloudflare Pages → Edit**, and nothing else;
   - account resources: **Include → your staging account**;
   - TTL: an end date **30 days** away.

   Press *Continue to summary*, then *Create Token*, and copy it 🔒.

✅ **Check:** the project's page in Cloudflare shows your placeholder deployment at the address from item 3.

## Step 4 · The staging root secret (2 minutes)

In your password manager, **generate** a new password:
- 48 characters;
- letters, digits and symbols.

Save it as `Hushmates staging root secret` 🔒.

The staging data keys are derived from it:
- the key that locks every stored word;
- the key that seals invitation codes;
- the scheduler's secret.

So:
- **keep it**: without it, staging's stored words can't be opened again;
- **never reuse it** anywhere else;
- production will never use it.

## Step 5 · Give the cloud session the secrets and the hosts (5 minutes)

In the cloud session, open the **environment menu in the session's title bar → Edit**.

**Secrets.** Under *Network secrets* (*API credentials* in an older app), or as environment variables, add exactly these four names. 🔒 Paste each value only here, never into the chat.

| Name | Value |
|---|---|
| `SUPABASE_ACCESS_TOKEN` | the `sbp_…` token from step 2 |
| `CLOUDFLARE_API_TOKEN` | the token from step 3, item 5 |
| `CLOUDFLARE_ACCOUNT_ID` | the account ID from step 3, item 4 |
| `HUSHMATES_STAGING_ROOT_SECRET` | the root secret from step 4 |

**Network access → Allowed domains.** Leave *Allow package managers* ticked, and add:

| Host | Why |
|---|---|
| `api.supabase.com` | the Management API: deploy, settings, SQL, the project's keys |
| `<project reference>.supabase.co` | the Edge Function, sign-in, and the Data API refusals |
| `api.cloudflare.com` | publishing the site to your Pages project |
| `hushmates-staging.pages.dev` (your exact address from step 3) | the browsers load the real site |

(The steps are in [the cloud environments docs](https://code.claude.com/docs/en/cloud-environments#network-access).)

## Step 6 · Start a new session and hand over

A **new session** picks up the secrets. Start one in this environment, on the branch
`claude/compassionate-pasteur-06wdsb`, and say:

> Staging is ready. Project reference: `<20 letters>`. Site: `https://<your address>.pages.dev`. Deploy Hushmates to staging and verify it, following hushmallow/hushmates-lab/docs/STAGING_CLOUD.md step 7.

Neither value is secret.

---

## Step 7 · What the session does (no action from you)

In `hushmallow/hushmates-lab`. Every command refuses unless:
- the project is named like staging, is in Sydney and is healthy;
- the Supabase token reaches no other project;
- for the deploy, every Pages project on the Cloudflare account is a staging one, and one of them is at `<site>`.

These checks run first, in the dry run too, before anything changes.

```
npm ci
node tools/staging-deploy.mjs --project-ref <ref> --site <site>              # a dry run: reads only
node tools/staging-deploy.mjs --project-ref <ref> --site <site> --apply      # extensions, migrations, settings, secrets, function, site
node tools/staging-check.mjs  --project-ref <ref> --site <site>              # about 35 checks from outside, ~5 minutes
node tools/staging-e2e.mjs    --project-ref <ref> --site <site>              # real browsers, phone and desktop, ~10 minutes
```

Then it:
- copies the two reports into `docs/evidence/staging/` (they hold no secrets);
- marks each result in `LAUNCH_READINESS.md` as **verified on staging**;
- commits;
- tells you what passed, what failed and what it couldn't check.

What the session does on the staging project:
- makes and removes test accounts, with no email sent;
- shortens two timings during the test and puts them back;
- never turns AI on;
- never touches billing.

## When you're done with staging

- **Revoke both tokens:** Supabase *Access Tokens*; Cloudflare *API Tokens*.
- **Delete the four secrets** from the environment settings.
- **Pause or delete the Supabase project**, and delete the Pages project if you no longer want them.
- Keep the root secret only while staging's data matters.

## If something goes wrong

| What the session reports | What it means | What you do |
|---|---|---|
| "the token can also reach N other project(s)", or "the token’s own list of projects doesn’t include this one" | The token belongs to an account that can see another project, or not this one | Use a token from the separate staging account (step 1) |
| "the Cloudflare account also holds N Pages project(s) without "staging" in the name" | The Cloudflare token belongs to an account with other sites | Use a separate Cloudflare account for staging (step 3) |
| "no Pages project is at https://…" | Step 3, item 2 wasn't done, or the address in your message differs from Cloudflare's | Make the Pages project (step 3), or send the exact address Cloudflare shows |
| "the Pages project … is at https://…, not …" | Cloudflare gave the project another address | Nothing: the session re-runs with that address. Add it to *Allowed domains* if it differs |
| "connect_rejected" or "host not allowed" | A host is missing from *Allowed domains* | Add the host it names, then start a new session |
| Every sign-in ends with "Please sign in again" | The project still uses the legacy JWT secret | Step 1, item 5 |
| 403 from the Management API | The scoped token lacks a permission | Make a new token with the table in step 2 |
| "… changed after it was applied: add a new migration instead" | A database change was edited after staging got it | Nothing: the developer adds a new migration |
