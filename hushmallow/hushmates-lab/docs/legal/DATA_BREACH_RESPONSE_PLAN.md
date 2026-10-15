**DRAFT, not yet reviewed or approved. Not legal advice.**
**Date: 15 October 2026.**

# Hushmates · Data breach response plan (internal)

> **Status.** Internal and operational. Nothing here is final until Hushmallow's owner approves it. Parts marked
> **needs legal advice** must be checked by an Australian privacy lawyer (decision D7) before anyone relies on them.
> Hushmates is not live, and there are no members outside the team. This plan must be approved, with names in §3,
> and rehearsed once before G2 (the team-only beta with real people's words). Research item PRV-16 recommends
> that rehearsal.
>
> **Built on** the OAIC's four steps (contain, assess, notify, review) and the Notifiable Data Breaches (NDB)
> scheme in Part IIIC of the Privacy Act 1988. Facts were first taken from the code at commit `000c0cd` and re-checked
> against the committed code at `0773d1e` (15 October 2026; the app's code last changed in `9012d6f`). The database
> migrations, the Edge Function's own files and the tools cited by line are unchanged between the two; the Tier 0
> migration adds only the desk-away setting and the report wording. What Hushmates keeps, and for how long, is in
> `docs/legal/RETENTION_AND_DELETION.md`. Paths are relative to `hushmallow/hushmates-lab/`. AI is off, and nothing is
> deployed: there is no staging or production project holding real people's words yet.

**Markers:** **[GAP]** something the plan needs that doesn't exist yet · **[NOT CONFIRMED]** platform behaviour to
check · **[from memory]** law that wasn't seen in any source here: check it on legislation.gov.au or oaic.gov.au
before relying on it.

**Classifications:** **verified obligation** · **depends on Hushmallow's functionality or business circumstances** ·
**needs legal advice** · **recommended practice**.

---

## Contents

1. Does the NDB scheme apply?
2. The plan on one page
3. Roles and contacts
4. What Hushmates holds, and what a breach could expose
5. What counts as an eligible data breach here
6. Step 1: Contain
7. Step 2: Assess (within 30 days)
8. Step 3: Notify
9. Step 4: Review
10. Scenarios
11. Templates
12. Preparing for a possible 72-hour rule
13. Before G2: getting ready
14. Gaps that weaken this plan
15. Sources

---

## 1. Does the NDB scheme apply?

**It depends on whether Hushmallow is an "APP entity". That needs legal advice.**

- Turnover is far below A$3m, so Hushmallow is a small business operator, outside the APPs and the NDB scheme,
  **unless** an exception applies (Privacy Act s6D).
- The live exception is s6D(4)(b): a business that "provides a health service to another individual and holds any
  health information except in an employee record". Whether an "emotionally comforting", non-clinical companion
  is a health service is a judgement (research item PRV-02).
- Other routes in: opting in under s6EA (PRV-03), turnover above A$3m, or trading in personal information
  (PRV-01; not today).

**Recommendation: follow this plan in full whatever the answer** (recommended practice, PRV-16):

- if Hushmallow is an APP entity, the duties below are real: take all reasonable steps to finish the assessment within
  30 calendar days after the day Hushmallow became aware of the grounds to suspect a breach (s26WH(2), as quoted by the
  OAIC). Starting the clock at first suspicion, by anyone on the team, is the recommended internal practice (§7);
- state health records laws may apply regardless of size (Victoria; PRV-17, needs legal advice);
- the statutory privacy tort and the Australian Consumer Law apply whatever the APP status (PRV-20, SCW-07);
- members shared their feelings with Hushmallow. They deserve to be told.

| # | Requirement | Classification | Source |
|---|---|---|---|
| N1 | Assess a suspected eligible data breach, taking all reasonable steps to finish **within 30 calendar days** of becoming aware of the grounds for suspicion (s26WH(2)) | **depends on Hushmallow's functionality or business circumstances**: APP-entity status (needs legal advice) | OAIC, *Part 4: NDB scheme* (official guidance quoting the Act; search extract) |
| N2 | For an eligible data breach, give the Commissioner a statement **as soon as practicable** (s26WK(2)). It must contain: (a) the entity's identity and contact details; (b) a description of the breach; (c) the kinds of information involved; (d) the steps the entity recommends people take (s26WK(3)) | As N1 | As N1 |
| N3 | Then take reasonable steps to notify affected people **directly**, as soon as practicable after preparing the statement, or publish it where the conditions are met (s26WL). A website notice alone doesn't replace direct notice. | As N1. The publication conditions were not seen: **needs legal advice** before using them. | As N1 |
| N4 | Contain, assess, notify, review | **recommended practice** (OAIC guidance, not law) | OAIC, *Part 3: Responding to data breaches, four key steps* (official guidance; search extract) |
| N5 | Keep personal information secure (APP 11.1), including technical and organisational measures | **depends on Hushmallow's functionality or business circumstances** (APP-entity status) | OAIC, *Guide to securing personal information* (official guidance; earlier search extract, not re-seen) |
| N6 | A 72-hour deadline to notify the Commissioner | **Proposed, not law** as of 15 October 2026. Seen only through secondary sources in an earlier research run. No official text seen. | §12 |

No item in this plan is a verified obligation today, because each depends on APP-entity status.

---

## 2. The plan on one page

```
Anyone who suspects a breach
  → phone the response lead now (§3). Write down what you saw and when. Don't investigate alone,
    delete anything, or tell members.

Response lead, in the first hour
  → open a log entry (Template D). Start two clocks: 30 days (the law, if it applies) and 72 hours (our target).
  → CONTAIN (§6): stop the access. Preserve the evidence first where that's safe.

Within 24 hours
  → ASSESS (§7): what, who, how many, were the keys exposed, can it be undone?
  → Call the lawyer if one is engaged.

Within 72 hours (our target; the law says "as soon as practicable")
  → Decide: eligible or not? Record why.
  → If eligible: statement to the OAIC (Template A), then email each affected member (Template B).

No later than 30 days after first suspecting
  → The assessment is finished, whatever the outcome.

Within 2 weeks of closing
  → REVIEW (§9): root cause, prevention plan, updates to this plan.
```

---

## 3. Roles and contacts

Hushmallow is a very small operator, so one person may hold several roles. Write the names in before G2.

| Role | Who | What they do | Backup |
|---|---|---|---|
| **Response lead** | Hushmallow's owner: **[name, phone]** | Runs the response. Decides containment. **Decides whether a breach is eligible and who is told.** Signs the OAIC statement and the member email. | Deputy lead |
| **Deputy lead** | **[second named person, phone]** (decisions D11 and D12 call for one before real people use Hushmates) | Takes over if the lead can't be reached within 2 hours. Can contain at once. Decides notification only if the owner has authorised that in writing in advance. | — |
| **Technical responder** | **[name]**: the person who maintains the code and the staging tools | Carries out containment steps on the lead's instruction. Preserves evidence and gathers the facts (§7 queries). Never deletes evidence and never contacts members. | Lead |
| **Safety lead** | **[name]** (`docs/ESCALATION.md` §2; `docs/legal/MODERATION.md` §3.1) | Joins whenever a desk reader or moderator account is involved. Removes desk access. Looks after desk readers affected by the incident. Makes sure the desk is still read, or marked away (`MODERATION.md` §5), while the incident lasts. | Lead |
| **Legal adviser** | **[lawyer, if engaged (D7), phone]** | Eligibility, notification options, holds, police or regulator requests | — |
| **Everyone else** (desk readers, testers on the team) | — | Report a suspected breach to the lead at once | — |

**Contacts.** Fill these in and check them before G2, then every 6 months.

| Who | How | When |
|---|---|---|
| OAIC | Notifiable data breach form at **oaic.gov.au**. Phone **1300 363 992** [from memory: check]. | Eligible breach (Template A) |
| Supabase | **[support route from the dashboard; security contact]** [NOT CONFIRMED] | Any incident touching the database, Auth, the Edge Function or Vault |
| Cloudflare | **[support route]** [NOT CONFIRMED] | The static site or the Cloudflare account |
| GitHub | **[support route]** [NOT CONFIRMED] | The repository |
| Email provider | **[once chosen: decision D5]** | Their breach, or ours involving email |
| Police | **000** if anyone is in danger or a crime is happening now | Threats, extortion |
| ReportCyber | **cyber.gov.au** [from memory: check] | Cybercrime |
| Insurer | **[if any cyber cover]** | Most insurers want to hear early [recommended practice] |
| Privacy lawyer | **[name, phone]** | Eligibility and notification decisions |

---

## 4. What Hushmates holds, and what a breach could expose

Use this to scope an incident quickly. The full list with periods is in `docs/legal/RETENTION_AND_DELETION.md` §2.

| Where | What's there | Words readable? | Linked to an email? |
|---|---|---|---|
| **Supabase Postgres, `hushmates` schema** (Sydney) | Words of feelings, perspectives, Mallow lines, report details, report evidence and desk notes, all **encrypted**. In **plain text**: display names; feeling names (for example "sadness", "loneliness"); Mallow choices; **Mallow line ids that show the matched theme** (for example `hm-loss-1`, `hm-health-2`, `hm-money-1`); times, statuses and consent times; who was offered which feeling; report reasons (for example "Someone may be in danger") and who reported whom; blocks; 18+ times; invitation notes; up to about 72 hours of activity records; 365 days of audit log. | **No** without the data key. **The keys are not stored in the database.** | **Yes**, through `identities.subject`, the Supabase Auth user id |
| **Supabase Auth** (the `auth` schema of the same database) | **Email addresses**; sign-in records, possibly with IP addresses and browser details [NOT CONFIRMED] | n/a | It is the email |
| **Edge Function secrets** (Supabase) | Data keys (`HUSHMATES_DATA_KEYS`, `HUSHMATES_DATA_KEY_ID`), keyed-hash key (`HUSHMATES_MAC_KEY`), scheduler secret, the project's secret key | Keys unlock every word | — |
| **Supabase Vault** | The scheduler's URL and secret | — | — |
| **Edge Function memory** | Words in plain text, briefly, while a request is handled | Yes, while running | — |
| **The owner's computer, `.data/`** | `staging.env` (all the keys and the scheduler secret); `staging-vault.sql`; database dumps if made (encrypted words plus all plain-text records; **no** Auth, so no emails); staging check reports (test accounts only) | **Yes, if a dump and the keys are both there** | Dumps hold Auth user ids, not emails |
| **A cloud session's environment secrets** | The staging root secret, from which every staging key is derived (`tools/staging-env.mjs`) | Unlocks every staging word | — |
| **The password manager** | Keys, root secret, database password | As above | — |
| **Email provider** (today Supabase's built-in sender, team addresses only; later decision D5) | Email addresses, sign-in codes (10-minute life), sending records | n/a | Yes |
| **Cloudflare Pages** | Static files only. Request data (IP address, browser) [NOT CONFIRMED] | No words pass through it | No |
| **GitHub** (public today) | Code and documents. No personal information expected: `.data/` and `dist/` are git-ignored. | Should be none | Should be none |
| **Members' own devices** | Their session and email, their drafts | Their own | Not Hushmallow's systems |

**The key point for any assessment:** a database leak on its own exposes encrypted words, but **plain-text records
linked to email addresses**. A leak of the database **and** the keys exposes everything.

---

## 5. What counts as an eligible data breach here

**The test** (OAIC paraphrase; the s26WE wording was not seen):

1. unauthorised access to, or unauthorised disclosure of, personal information Hushmallow holds, or its loss in
   circumstances where unauthorised access or disclosure is likely; and
2. a reasonable person would conclude it is likely to result in serious harm to any of the people it is about; and
3. remedial action hasn't prevented that likelihood. The OAIC's guidance says: "If remedial action is successful in
   preventing a likely risk of serious harm to individuals, the NDB scheme notification obligations may not apply."

**Why Hushmates data is sensitive:**

- **It is personal information, even though it's pseudonymous.** Every record links to a Supabase Auth user, and so
  to an email address, in the same database. Words can also identify people: names, places, workplaces.
- **It is often about health.** Feelings usually describe someone's emotional state. Feeling names, Mallow line
  themes (loss, health, money) and danger reports say something even without the words.
- **It may all count as health information.** If Hushmallow provides a health service (PRV-02, needs legal advice),
  "all personal information collected in the course of providing a health service is considered health information"
  (OAIC, *Guide to health privacy*, search extract). Email addresses would then be included. Health information is
  sensitive information.

**Working rule (recommended practice):** treat any unauthorised access to members' words, or to records linked to
their email addresses, as **likely to cause serious harm** until the assessment shows otherwise.

| Likely eligible | Needs a careful assessment | Probably not eligible (still log it) |
|---|---|---|
| The database **and** a data key exposed | The database exposed, keys safe: plain-text records linked to emails | A lost laptop with full-disk encryption, switched off or locked, no sign of access, keys rotated quickly |
| A dump **and** `.data/staging.env` on a lost computer without disk encryption | The email provider breached: addresses, and the fact that the person uses Hushmates | Only staging test data exposed (G1). But the team's real email addresses are personal information too. |
| A desk reader copies or shares reported words outside Hushmates | A data key exposed, with no sign the data was taken | A catcher reads a feeling they were offered: that's what the member agreed to |
| A bug shows one member's words, with identifying details, to the wrong person | A secret pushed to the public repository, no sign of use | The desk reads reported words: that's its job |
| Email addresses sent to many members in one visible list | A backup restored that brings back deleted accounts (`RETENTION_AND_DELETION.md` §5.3) | A member shares their own share picture |

---

## 6. Step 1: Contain

**Order:** stop the access → preserve evidence → record times. If preserving evidence would let the access go on,
stop the access first.

### 6.1 The containment toolkit

| Action | How | What it does | Use when |
|---|---|---|---|
| **Pause everything** | Supabase dashboard → *Project Settings → General → Pause project* [DOC `docs/STAGING.md:323`] | The app, the desk, the API and the scheduler stop. Sign-in deletion retries and the daily clearing stop too. Nobody can make a report, and the desk can't be read, so the desk-away notice can't be shown either. Record when, and resume as soon as it's safe. If it will last more than 72 hours, tell testers directly (`MODERATION.md` §5.2). | Access is ongoing and you can't close it quickly |
| **Stop new people joining** | `node server/admin.mjs revoke <CODE>` for codes you hold. For all at once, as the database owner: `update hushmates.invites set revoked_at = now() where revoked_at is null;` | Unused invitations stop working (`supabase/migrations/20261014090100_hushmates_rules.sql:1048`) | An invitation leak, or any serious incident |
| **Stop one account** (member or desk reader) | `node server/admin.mjs member <reference> suspended` | Every call checks the state, so it takes effect on the next one. **Use "suspended", not "restricted": a restricted moderator can still use the desk** (`hushmates.actor` allows active and restricted; rules lines 77-82, 1061-1066). | Misuse by an account, or a stolen login |
| **End someone's sign-in** | Supabase dashboard → *Authentication → Users* [NOT CONFIRMED exact options] | Removes their sign-in. Their Hushmates data stays. | A stolen login |
| **Make everyone sign in again** | Rotate the project's JWT signing keys (*Project Settings → JWT Keys*; `docs/STAGING_CLOUD.md` step 1) [NOT CONFIRMED whether refresh tokens are revoked too] | Old access tokens fail | Token theft at scale |
| **Database password** | Reset it in the Supabase dashboard [NOT CONFIRMED path]. Update `HUSHMATES_ADMIN_PG` wherever it's kept. | Old connection strings stop | Any database leak |
| **The project's secret key** | Rotate it in the Supabase dashboard [NOT CONFIRMED path and how the Edge Function picks it up: it reads `SUPABASE_SECRET_KEYS`, `supabase/functions/hushmates/index.ts:7-9`] | Old key stops | Key exposed |
| **Access tokens** | Revoke Supabase *Access Tokens* and Cloudflare *API Tokens* (`docs/STAGING_CLOUD.md`, "When you're done") | Deploy and management access ends | A computer, session or token exposed |
| **The scheduler secret** | New value in the Edge Function secrets (`supabase secrets set`, `docs/STAGING.md:163`) **and** in Vault (`hushmates_job_secret`) | Old secret stops | Secret exposed |
| **The data key** | `RETENTION_AND_DELETION.md` §6: add a new key, make it current, re-encrypt, retire the old one. **[GAP]** There is no re-encryption tool. Until one exists, only new words use the new key. | Limits what the leaked key can open | Data key exposed |
| **The keyed-hash key** | New `HUSHMATES_MAC_KEY` in the secrets and `.data/staging.env` | **Every outstanding invitation stops working**: issue new ones. Duplicate checks reset. | MAC key exposed |
| **The staging root secret** (cloud path) | A new root secret in the environment settings. All derived keys change, so words locked with the old key can't be read until re-encrypted. **[GAP]** That needs the tool above and both keys at once. | — | Cloud environment exposed |
| **Take the site down** | Cloudflare Pages: roll back or delete the deployment [NOT CONFIRMED steps]. Pausing Supabase also leaves the site with nothing to show. | Nobody can load the app | A tampered site |
| **The repository** | GitHub → *Settings → General → Danger Zone → Change visibility* to private (decision D19) | Stops new viewing | Anything sensitive in it |
| **AI** | Confirm it's off: `node server/admin.mjs settings` shows `"enabled": false` | — | Always check |

### 6.2 Preserve evidence

Before changing things, if it's safe to wait a few minutes:

- **Export what will expire.** Activity records go after about 48 to 72 hours, and audit entries after 365 days.
  Platform logs expire on the plan's own schedule [NOT CONFIRMED]. Export the relevant rate events, audit entries,
  Supabase logs and `cron.job_run_details` now.
- **Place a legal hold** if records need keeping beyond their normal time (`RETENTION_AND_DELETION.md` §9).
- **Screenshot** dashboards, settings, GitHub history and anything else you see.
- **Don't** delete accounts, files or commits until the lead says so. Don't run anything destructive.
- Keep exported evidence encrypted, with the same care as the keys. Never paste words or keys into chat or email.

---

## 7. Step 2: Assess (within 30 days)

**The clock** starts when anyone on the team, including a desk reader or the technical responder, first has grounds
to suspect a breach. Treating that as the start is recommended practice. The law says: take all reasonable steps to
finish within 30 calendar days after the day Hushmallow became aware of the grounds to suspect a breach (s26WH(2), as
quoted by the OAIC, search extract). Whose awareness counts for the business (for example, a desk reader's) is
[from memory]. **Thirty days is a ceiling, not a target.** Aim for an initial view within 24 hours and a decision
within 72 hours.

### 7.1 Questions

1. What happened, when did it start, and is it stopped?
2. Who had access, or could have: an outsider, a desk reader, the public, another member?
3. Which stores in §4 were involved?
4. Which kinds of information? Be specific, for example "the words of feelings written between 1 and 14 March",
   not "account data".
5. **Were the data keys exposed too?** Were the words readable?
6. Was the information copied, used or published? Is there any sign of that?
7. How many people? Which ones? Do we still hold their email address?
8. Can remedial action remove the risk? For example: recovered unread, deleted by the recipient with confirmation,
   keys rotated before any data was taken.

### 7.2 Serious-harm factors

From memory: s26WG was not seen. Check it before relying on this list.

| Factor | What to weigh for Hushmates |
|---|---|
| (a) The kinds of information | Feelings, perspectives, report reasons, feeling names, theme ids, email addresses |
| (b) How sensitive it is | High. It is about people's emotional state, and possibly health information (§5). |
| (c) Whether security measures protected it | Words: AES-256-GCM. Plain-text records: protected only by access controls. |
| (d) How likely those measures could be overcome | Low, **unless the keys were exposed too**. Access controls offer nothing once someone is in. |
| (e) Who has, or could get, the information | An unknown attacker? A desk reader? Another member? The public, through a public repository? |
| (f) If encryption made it unintelligible: how likely is it that those people have, or can get, the key? | The deciding factor for most incidents here (§4: the keys live in different places from the data) |
| (g) The nature of the harm | Distress and embarrassment if private writing is read. Being identified as someone who writes about their feelings. Harassment if words identify someone. Stigma from a "Someone may be in danger" report linked to an email. |
| (h) Anything else relevant | Number of people; how long it was exposed; whether it has been published |

### 7.3 Scoping queries (read-only, as the database owner)

```sql
-- members who aren't deleted (desk readers have role 'moderator')
select role, count(*) from hushmates.members where state <> 'deleted' group by role;

-- members with words stored now: feelings, then perspectives
select count(distinct owner) from hushmates.journeys where text_enc <> '';
select count(distinct author) from hushmates.perspectives where text_enc <> '';

-- members with feelings released in a date range
select count(distinct owner) from hushmates.journeys where created_at between '[from]' and '[to]';

-- a desk reader's activity (member id from the desk's account reference); reports opened and decided
select at, action, detail from hushmates.audit_log
 where actor = '[moderator member id]' and action like 'mod.%' order by at;
-- then, for the report ids found: whose words were in them (operators only)
select id, kind, reason, subject, by_member, at, status from hushmates.reports where id in ('[ids]');
```

Getting email addresses for notification means reading Supabase Auth. Do it only when the decision to notify is made.
Keep the list encrypted and delete it after sending.

### 7.4 Record the decision

In the log (Template D): eligible or not; the reasons, factor by factor; whether remedial action worked; who
decided; the date. A decision that it is **not** eligible needs reasons just as much.

---

## 8. Step 3: Notify

### 8.1 The OAIC

- **When:** as soon as practicable after there are reasonable grounds to believe an eligible breach has happened
  (s26WK(2), OAIC paraphrase). Our target is within 72 hours (§12).
- **How:** the OAIC's online Notifiable data breach form. A training copy of the form is listed on oaic.gov.au; its
  content was not seen here. Prepare the text in Template A first.
- **What:** s26WK(3) (a)-(d), with the kinds of information named specifically. The OAIC says generic terms aren't
  enough.
- **If another organisation also holds the information** (Supabase, the email provider): [from memory, s26WJ and
  s26WK(4), not seen] one organisation's assessment and notice may cover both, and a statement may name the other.
  Agree with them who does what, and record it. **Needs legal advice** before relying on another's notice.

### 8.2 Members

- **When:** directly, as soon as practicable after the statement is prepared (s26WL; OAIC quoted).
- **Who:** either everyone affected, or only those at risk of serious harm (s26WL options, paraphrase). When unsure,
  tell everyone affected (recommended practice).
- **How:** an email to the sign-in address, one person per email (Template B). Never send to several members in one
  visible list. The email is the only contact Hushmallow holds.
  - **[GAP]** There is no way to send a general email today. Supabase's built-in sender sends only sign-in emails,
    and only to the team's addresses. For G2, the owner can email team members personally. Before G3, the email
    provider (decision D5) must also be able to send a notice like this.
  - **[GAP]** There is no in-app notice. **[recommended practice]** Build one, shown at next sign-in, as a second
    channel.
- **People whose email Hushmallow no longer holds** (for example, deleted accounts found in an old backup): direct
  notice may be impossible. Publishing the statement (s26WL's third option, Template C) may then be the route. The
  conditions were not seen: **needs legal advice**.

### 8.3 If Hushmallow isn't bound by the scheme

Recommended practice: tell members anyway, using the same templates. [From memory] the OAIC accepts voluntary
notifications. Check this, and ask the lawyer, before deciding.

### 8.4 Possible exceptions

[From memory, not seen] Part IIIC has exceptions, for example where remedial action succeeds (s26WF; the OAIC's
guidance on remedial action was seen), law enforcement (s26WN), secrecy provisions (s26WP), and a Commissioner's
declaration (s26WQ). **Needs legal advice** before relying on any of them.

### 8.5 In every notice

- **Never** quote anyone's words or display name. Never say who reported whom.
- Be specific about what was and wasn't involved. Don't guess about the attacker.
- If you need to describe how members were known, say "pseudonymous" or "without your name", never "anonymous":
  Hushmallow always knew which account wrote what.
- Point to support lines (Lifeline 13 11 14; 000 if not safe). **Don't** offer counselling, crisis help or follow-up
  calls. Hushmallow doesn't provide them, and nobody will call members.
- Keep the subject line neutral. Don't use links that ask people to sign in.

---

## 9. Step 4: Review

Within 2 weeks of closing an incident (OAIC: "a root cause analysis, a prevention plan to prevent similar incidents,
audits to ensure the plan is implemented, and a review of policies and procedures"):

1. **Root cause:** what failed, and why it wasn't caught sooner.
2. **Prevention plan:** owner, date and check for each action.
3. **Audit:** a date to confirm the actions were done.
4. **Policies:** update this plan, the retention schedule, the privacy policy wording and the risk register
   (`docs/RISKS.md`, P1 and P2).
5. **People:** a debrief for everyone involved. Reading members' words, or causing a breach, can be distressing.
   The desk readers' WHS arrangements apply (research items SCW-15 and SCW-16).
6. Close the log entry.

---

## 10. Scenarios

### 10.1 Database leak

**How it could happen:** a leaked database password or project secret key; a stolen Supabase login; a mistake in
database permissions (the staging check tests that browser roles can reach nothing, `tools/staging-check.mjs:135-142`);
an incident at Supabase itself.

**Exposed, potentially:** everything in the `hushmates` schema and, with the whole database, Supabase Auth too, so
**email addresses**. Words stay encrypted unless the keys were also exposed. The keys aren't in the database: Vault
holds only the scheduler's URL and secret.

**Contain:** reset the database password and the project's secret key; revoke access tokens; check who has dashboard
access, and that every login has two-step sign-in; pause the project if access is ongoing. If Supabase reports the
incident, get their details in writing.

**Assess:** which schemas and tables were reached (Supabase logs); whether the Edge Function secrets were reached;
how many members.

**Likely outcome:**

- **With the keys:** eligible. Notify.
- **Without the keys:** a judgement. Plain-text records linked to emails still show feeling names like "loneliness",
  theme ids like `hm-health-2`, "Someone may be in danger" reports, blocks and activity times. A reasonable person
  could well conclude serious harm is likely. Default to notifying unless the assessment clearly shows otherwise.

### 10.2 A data key leak

**How it could happen:** a key pasted into a chat, an email or a ticket; printed in a log; committed to the
repository; `.data/staging.env` copied somewhere; the cloud environment exposed (it holds the staging root secret).

**Exposed:** the ability to read every word, **for anyone who also has the encrypted data** (the database, a dump or
a backup).

**Contain:** rotate the data key (§6.1). **[GAP]** Until a re-encryption tool exists, existing words stay locked with
the old key. Find out whether anyone who saw the key could also have reached the data. If the MAC key leaked too,
rotate it and reissue invitations.

**Assess:** where did the key go, who could see it, and could they also have reached the data?

**Likely outcome:** not eligible on its own, if no data was reachable. That changes at once if any data store was also
exposed. Log it either way.

### 10.3 A desk reader misusing access

**What misuse looks like:** reading reported words is the desk's job. Misuse is copying, photographing or sharing
them outside Hushmates; trying to work out who someone is; making decisions in bad faith; or someone else using a
desk reader's login.

**What a desk reader can reach:** reported words only, with an account reference (a member id), earlier report
counts and team notes; and the activity log's last 200 entries, with accounts by a short reference only
(`m_mod_audit`). Never names, emails, or who reported (`supabase/migrations/20261014090100_hushmates_rules.sql:1079-1098`).
There's no way to browse feelings that weren't reported.

**Contain:**

- **suspend** their account (not "restrict": §6.1);
- revoke any unused desk invitations;
- end their sign-in;
- ask them in writing to delete any copies, and to confirm they have;
- the safety lead reassigns the desk. If that leaves nobody who can read it for more than 24 hours, the owner marks
  it away first (`MODERATION.md` §5.2), and the 72-hour step applies after that.

**Assess:**

- the audit log shows every list view, report opened, decision and audit view, with times (§7.3);
- operators map the report ids to the accounts involved;
- check whether the words held identifying details, and whether they were shared, and with whom.

**Likely outcome:** words shared outside Hushmates, especially with identifying details, are likely an unauthorised
disclosure with serious harm. Notify. Reading within the role, with no sharing, isn't a breach. The statutory privacy
tort can reach a person who intentionally or recklessly misuses information (PRV-20). Get legal advice before any
step against the person.

### 10.4 An email provider breach

**Today:** sign-in emails go through Supabase's built-in sender, to the team's addresses only. **Later:** a custom
provider (decision D5).

**Exposed:** email addresses; the fact that each person uses Hushmates (from the sender and the message); sign-in
codes, which expire after 10 minutes and work once; sending records.

**Contain:** rotate the provider's credentials in Supabase Auth's email settings. Consider switching provider. If
there is any sign of live interception of codes, make everyone sign in again (§6.1).

**Assess:**

- which of our members' addresses were affected (ask the provider for the list);
- whether message content was exposed;
- whether codes could have been used before they expired: check Supabase Auth's records for unexpected sign-ins
  [NOT CONFIRMED what they hold].

**Likely outcome:** a judgement. Being known to use a feelings app can be sensitive, and possibly health information
(§5). Coordinate with the provider (§8.1). Notify members if the assessment says serious harm is likely.

### 10.5 A lost or stolen computer holding `.data/staging.env`

**What may be on it:**

- `.data/staging.env`: the data keys, the MAC key and the scheduler secret;
- `.data/staging-vault.sql`;
- any dump (`.data/hushmates-backup.dump`: encrypted words plus every plain-text record, no emails);
- staging check reports;
- possibly the database connection string in the shell history, the Supabase and Cloudflare command-line logins, an
  unlocked password manager, and invitation codes in old terminal output.

**Contain, at once:**

- revoke the Supabase and Cloudflare tokens;
- reset the database password;
- rotate the scheduler secret and the MAC key (then reissue invitations);
- rotate the data key (§6.1, with the [GAP]);
- sign the computer out of GitHub, the password manager and email;
- remotely lock or wipe it if possible;
- report a theft to police: the report number may be needed later.

**Assess:**

- **Was the disk encrypted?** Was the computer off or locked?
- Which files were on it, and the date of any dump (that tells you whose words it held)?
- Is there any sign of use: new database connections, unexpected Supabase activity?

**Likely outcome:**

- **Encrypted disk, locked or off, no sign of use, keys rotated quickly:** probably not eligible. Log the reasons.
- **No disk encryption, with a dump and the keys:** every word in the dump is readable. Eligible. Notify the people
  in the dump. Their emails aren't in the dump, but Hushmallow still holds them for current members.

### 10.6 A public repository exposing something

**Today:** the repository is public (decision D19 recommends private). It holds code and documents only. `.data/` and
`dist/` are git-ignored.

**What could go wrong:**

- a key, token, password, connection string or invitation code committed;
- a dump, or someone's "Download my data" file, committed;
- screenshots, evidence or review files holding real people's words once G2 starts;
- a desk reader's work email in a document.

**Contain:**

- make the repository private;
- **treat every pushed secret as compromised and rotate it.** Removing the file doesn't remove it from history,
  forks or clones;
- remove the file, and rewrite history if the lead decides to (carefully: it affects everyone's copies);
- ask GitHub about cached views [NOT CONFIRMED process];
- check for forks.

**Assess:** what was exposed and for how long (the commit dates); whether there was any clone or fork activity
[NOT CONFIRMED what GitHub shows]; whether it was personal information or a secret that leads to it.

**Likely outcome:**

- A secret with no sign of use: follow 10.2 or 10.1.
- Real people's words or emails in a public repository: likely eligible. Notify.

### 10.7 A bug shows words to the wrong person

**Examples:**

- a perspective the writer took back appears in a share picture;
- a perspective the writer didn't allow in pictures is offered to the author for one;
- a feeling is offered after its author let it go;
- a display name appears where it shouldn't.

The share code already re-reads the journey before drawing, to prevent the first two (`ui/relay/share.js:1-18`).

**Contain:** stop the feature. There is no feature switch, so either deploy a fix or pause the project. Find out who
saw what.

**Assess:** the content's sensitivity, whether it identifies anyone, and how many people saw it. A share picture,
once made, is on the author's device and can't be recalled.

**Likely outcome:** a judgement, case by case. Log every instance, even small ones.

---

## 11. Templates

### Template A: Statement to the OAIC (s26WK)

Fill this in first, then copy it into the OAIC's online form.

```
STATEMENT ABOUT AN ELIGIBLE DATA BREACH (Privacy Act 1988, s26WK)

(a) Who we are and how to contact us
    [Legal name of the business], which runs Hushmallow and its companion app Hushmates. ABN [ABN].
    Contact for this breach: [name, role], [email], [phone].

(b) What happened
    - When we became aware: [date, time].
    - When it began and ended: [dates] / [still being contained: what is still open].
    - How it happened: [plain description, e.g. "Someone used an exposed database password to copy
      records from our database on [date]."].
    - How we found out: [...].
    - What we have done to contain it: [...].

(c) The kinds of information involved (be specific)
    e.g. - the email addresses of [n] members;
         - the words of feelings and perspectives members wrote between [date] and [date]. These are short
           pieces of writing, often about how the person was feeling;
         - for those members: the name they chose to use in the app, the feeling names they picked
           (for example "sadness"), and when they used Hushmates;
         - for [n] members: that a report was made about something they wrote, and its reason
           (for example "Someone may be in danger").
    Not involved: [e.g. no passwords, payment details or identity documents: Hushmates holds none].

(d) What we recommend people do
    - [...]

Further details (not required by s26WK(3); the OAIC's form may ask for some of them [from memory]):
    - Approximate number of people affected: [n].
    - Whether the information was encrypted, and whether the keys were also exposed: [...].
    - Other organisations involved, and their contact details: [e.g. Supabase / the email provider].
    - How we are notifying people: [direct email on (date) / publication, and why].
    - What we are doing to stop it happening again: [...].
```

### Template B: Email to members

Warm, plain and complete. Fill in every bracket. Delete any line that doesn't apply. Send one email per person,
never a shared list.

```
Subject: About your Hushmates information

Hello,

We're writing because something went wrong with information you trusted to Hushmates.
We're very sorry. Here's what happened, what it involved, and what you can do.

What happened
On [date], we found that [plain description, e.g. "someone got into our database using a
password that should have stayed private"]. It started on [date]. We stopped it on [date].

What it involved
For your account, this included:
- [your email address]
- [the words of feelings you released between [date] and [date]]
- [the perspectives you offered other people between [date] and [date]]
- [the name you chose for the app, and the feeling names you picked, such as "sadness"]

It didn't include [e.g. "the words themselves: they were locked, and the keys to unlock them
weren't taken"]. Hushmates never asks for your real name, your address, a password or
payment details, so none of those were involved.

What we've done
- [We closed the gap on [date].]
- [We changed the keys that lock stored words.]
- [We've told the Office of the Australian Information Commissioner (OAIC).]

What you can do
- Take care with emails or messages that mention Hushmates or something you wrote. We'll
  never ask you for your sign-in code. If something feels off, don't reply. Tell us instead.
- If anyone contacts you about something you wrote in Hushmates, you don't have to answer.
  Please let us know.
- You can download your Hushmates data, or delete it, at any time in You & safety.
- [Anything specific to this breach.]

If this news is weighing on you
It's okay to feel unsettled by this. If you'd like to talk to someone, Lifeline is there on
13 11 14, any time. If you're not safe right now, please call 000.

Questions
Write to us at [contact address]. We aim to reply within [5 business days].
You can also contact the OAIC at oaic.gov.au.

[Legal name of the business], who runs Hushmallow and Hushmates. ABN [ABN].
```

Before sending: the lead approves it; check it contains (a)-(d) of the statement; check there's no display name,
no quoted words and no sign-in link; check the OAIC contact details on oaic.gov.au.

### Template C: Published notice (only if legal advice says publication is the route)

```
A notice about Hushmates information

On [date], we found that [plain description]. It involved [specific kinds of information] for
people who used Hushmates between [date] and [date].

[What we've done.] [What you can do.]

If you used Hushmates in that time and have questions, write to us at [contact address].
You can also contact the OAIC at oaic.gov.au.

[Legal name of the business], who runs Hushmallow and Hushmates. ABN [ABN].
```

### Template D: Incident log entry

One entry per suspected breach. Keep it encrypted. Never include members' words. Keep it at least 2 years after
closing (`RETENTION_AND_DELETION.md`, F2; a proposal).

```
Incident no.:               I-YYYY-NN
Reported by / how:          [name, channel]            at: [date, time, timezone]
First grounds to suspect:   [date, time]   ← the 30-day and 72-hour clocks start here
Response lead:              [name]          deputy: [name]
Summary:                    [one paragraph]
Systems involved (§4):      [database / Auth / secrets / .data / email provider / repository / site / other]
Kinds of information:       [specific]
People affected:            [number; how counted]
Keys exposed?:              [yes / no / unknown: why]

Containment (each with time and who):
  [time] [action] [who]
Evidence preserved:         [what, where, encrypted?]   Legal hold: [H-YYYY-NN / none]

Assessment (factor by factor, §7.2):
  (a)…(h): [notes]
Remedial action and whether it removed the risk: [...]
Decision:                   [eligible / not eligible / still assessing]
Reasons:                    [...]
Decided by:                 [name]          on: [date]   Legal advice: [who, date / none]

Notifications:
  OAIC statement:           [date, reference no. / not required: why]
  Members:                  [date, method, how many / not required: why]
  Others:                   [Supabase / provider / police / insurer: date, reference]

Review:                     [date]  root cause: [...]  actions: [owner, due date, done?]
Closed:                     [date]          by: [name]
```

### Template E: Suspected-breach register

One line per suspicion, including the ones that turned out to be nothing.

```
| No. | First suspected | What | Eligible? | OAIC | Members told | Closed |
|-----|-----------------|------|-----------|------|--------------|--------|
```

---

## 12. Preparing for a possible 72-hour rule

**Status:** a 72-hour deadline to notify the Commissioner was reported, in an earlier research run, as part of a
proposed second tranche of Privacy Act reforms (an exposure draft). It was seen only through secondary sources. No
official text was seen, and **it is not law as of 15 October 2026**. Don't describe it as a requirement to anyone.

**Why prepare anyway:** the law already says "as soon as practicable". With one database and a very small team,
72 hours is realistic, and a fast notice helps members protect themselves.

**How:**

- Start a 72-hour clock alongside the 30-day one, in the log, from the first grounds to suspect.
- **By 24 hours:** contain; first assessment; call the lawyer.
- **By 48 hours:** Templates A and B filled in with what's known.
- **By 72 hours:** if there are reasonable grounds to believe the breach is eligible, lodge the statement, even if
  some details are still being confirmed. [From memory] the OAIC's form allows later updates; check this. If it's
  still unclear, record why, and keep assessing within the 30 days.
- **Keep ready:**
  - templates approved in advance by the owner, and by the lawyer once engaged, so only facts change;
  - the fact sheet (§4);
  - the scoping queries (§7.3);
  - the contact list (§3);
  - the legal name, ABN and contact address (decision D23).
- **Rehearse** (§13).
- **If a 72-hour rule becomes law:** update this plan from the official text, including exactly what starts its clock.

---

## 13. Before G2: getting ready

Recommended practice, unless marked.

| # | Task | Who |
|---|---|---|
| R1 | Owner approves this plan and the retention schedule | Owner |
| R2 | Names and phone numbers in §3; contacts filled in and checked | Owner |
| R3 | The business's legal name, ABN and a contact address (D23) | Owner |
| R4 | A way to email members individually (team: personal email; before G3: the provider, D5) | Owner |
| R5 | Two-step sign-in on Supabase, Cloudflare, GitHub, email and the password manager (PRV-12) | Owner, team |
| R6 | Full-disk encryption on every computer that holds `.data/` or a dump | Owner |
| R7 | The repository made private (D19) | Owner |
| R8 | A one-hour desk exercise: walk through scenario 10.5 or 10.1 with the real tools on staging, time each step, and fill in Templates A, B and D with made-up facts. Record what was missing. Repeat yearly. | Lead, technical responder |
| R9 | Rotate a staging key once, end to end, to prove the steps work (`docs/RISKS.md` P2: "Rotation steps on staging") | Technical responder |

---

## 14. Gaps that weaken this plan

| Gap | Effect | Proposal |
|---|---|---|
| No alerts for unusual access, failed jobs or new reports | A breach may be found late | Basic alerts on dashboard logins and failed scheduler runs, before G3 |
| No tool to re-encrypt words with a new key | A leaked key keeps opening old words | Build and test it before G3 |
| No general email route to members; no in-app notice | Direct notification is hard | D5; an in-app notice |
| No operator deletion tool, no per-record legal hold | Slower clean-up, and evidence at risk of routine deletion | `RETENTION_AND_DELETION.md` §3.4, §9 |
| Settings changes, journey deletions and let-go aren't in the audit log | Harder to reconstruct events and to replay deletions after a restore | Add audit entries |
| Supabase Auth logs and platform logs not yet known | Unclear evidence trail | `RETENTION_AND_DELETION.md` §12 |
| Secrets live in several places (Edge Function secrets, `.data/`, the password manager, a cloud environment) | More places to lose them | Keep the list in §4 current; delete cloud secrets after staging (`docs/STAGING_CLOUD.md`) |
| The repository is public | Any mistake is published at once | D19 |

---

## 15. Sources

Official sources were seen only as search-tool extracts or summaries. No official site could be opened from this
environment. "From memory" means not seen at all.

- **Privacy Act 1988 (Cth)**, Part IIIC (ss 26WE-26WQ), s6D, s6FB:
  https://www.legislation.gov.au/C2004A03712/latest/text (official text; not opened; the series id is from memory).
  s26WH(2), s26WK(2)-(3) and s26WL are as quoted by the OAIC below. s26WE, s26WG, s26WF, s26WJ, s26WN, s26WP and
  s26WQ were not seen.
- **OAIC, Data breach preparation and response, Part 4: Notifiable Data Breach (NDB) scheme**:
  https://www.oaic.gov.au/privacy/notifiable-data-breaches/preventing-preparing-for-and-responding-to-data-breaches/data-breach-preparation-and-response/part-4-notifiable-data-breach-ndb-scheme
  (official guidance quoting the Act; search extract).
- **OAIC, Part 3: Responding to data breaches, four key steps**:
  https://www.oaic.gov.au/privacy/notifiable-data-breaches/preventing-preparing-for-and-responding-to-data-breaches/data-breach-preparation-and-response/part-3-responding-to-data-breaches-four-key-steps
  (official guidance; search extract).
- **OAIC, The NDB scheme: an overview**: https://www.oaic.gov.au/__data/assets/pdf_file/0011/5213/the-ndb-scheme-an-overview.pdf
  (official guidance; search extract: "generally, there is a maximum of 30 days to conduct this assessment").
- **OAIC, NDB form (for training purposes only)**:
  https://www.oaic.gov.au/__data/assets/pdf_file/0008/2240/oaic-ndb-form-for-training-purposes-only.pdf (title only).
  **OAIC, Responding to data breaches quick reference guide (30 June 2026)**:
  https://www.oaic.gov.au/__data/assets/pdf_file/0028/265285/NDB-Self-Assessment-tool.pdf (title only).
- **OAIC, Guide to health privacy: introduction and key concepts**:
  https://www.oaic.gov.au/privacy/privacy-guidance-for-organisations-and-government-agencies/health-service-providers/guide-to-health-privacy/introduction-and-key-concepts
  (official guidance; search extract).
- **OAIC, APP Guidelines Chapter B**:
  https://www.oaic.gov.au/privacy/australian-privacy-principles/australian-privacy-principles-guidelines/chapter-b-key-concepts
  (official guidance; search extract quoting s6D(4)(b)).
- **OAIC, Guide to securing personal information**:
  https://www.oaic.gov.au/agencies-and-organisations/guides/guide-to-securing-personal-information (official guidance;
  earlier-run search extract, not re-seen).
- **OAIC, Statutory tort for serious invasions of privacy**:
  https://www.oaic.gov.au/privacy/your-privacy-rights/more-privacy-rights/statutory-tort-for-serious-invasions-of-privacy
  (official guidance; earlier-run search extract, not re-seen).
- **Victoria, Health Records Act**: https://www.health.vic.gov.au/legislation/health-records-act (official guidance;
  search extract).
- **Safe Work Australia, duties of a PCBU**: https://www.safeworkaustralia.gov.au/law-and-regulation/duties-under-whs-laws/duties-pcbu
  (official guidance; search extract), for §9 step 5.
- **The 72-hour proposal:** secondary sources only, in an earlier research run. No official source seen. Not cited as
  law.
- **The code**: as cited inline, re-checked at commit `0773d1e` (first drafted at `000c0cd`).
