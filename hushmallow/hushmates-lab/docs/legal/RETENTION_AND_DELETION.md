**DRAFT, not yet reviewed or approved. Not legal advice.**
**Date: 15 October 2026.**

# Hushmates · Retention and deletion schedule (internal)

> **Status.** Internal and operational. Nothing here is final until Hushmallow's owner approves it. Parts marked
> **needs legal advice** must also be checked by an Australian privacy lawyer (decision D7) before anyone relies
> on them. Hushmates is not live. There are no members outside the team.
>
> **What this is.** The full list of what Hushmates keeps, for how long, what starts the clock, how it is removed,
> and why. The member-facing version is "How long we keep things" in `docs/legal/PRIVACY_POLICY.md`. The two must
> always say the same thing. §11 lists where they differ today.
>
> **Where the facts come from.** Re-checked against the committed code at `0773d1e` (15 October 2026; the app's code
> last changed in `9012d6f`). The three original migrations and the Edge Function's own files (`gateway.js`,
> `mallow.js`, `fieldcrypt.js`, `hushmates/index.ts`) haven't changed since `000c0cd`, when this schedule was first
> drafted, so their line references still hold (its vendored copy of `core/` has changed, with the screen and the
> library); the Tier 0 migration
> (`supabase/migrations/20261015090000_hushmates_tier0.sql`) adds only the desk-away setting and the report wording.
> Line references in UI files that have changed were re-checked. File and line references are relative to
> `hushmallow/hushmates-lab/`. The working inventory is the app-facts file the drafting team made from the code.
> Every number below was checked against the migrations.

**Markers**

- **[GAP]** The code doesn't do something this schedule needs, or keeps something with no end date.
- **[PROPOSAL]** A period or rule that isn't built yet, for the owner to decide. All proposals are recommended practice.
- **[NOT CONFIRMED]** Platform behaviour (Supabase, Cloudflare, an email provider) that can't be seen from this repository. Check it on staging or with the provider.
- **[DOC]** Stated in a project document, not visible in code.

**Classifications** (used throughout the legal drafts):

- **verified obligation**: the law was seen and it binds Hushmallow on the known facts.
- **depends on Hushmallow's functionality or business circumstances**: binding only if a named fact is true.
- **needs legal advice**: the answer turns on a judgement or a text that wasn't seen.
- **recommended practice**: not a legal duty.

Nothing in this schedule is a verified obligation today. The main privacy duties depend on whether Hushmallow is an
"APP entity", and that needs legal advice (§1).

---

## Contents

1. What the law asks, and whether it applies
2. The schedule: every kind of data
3. How deletion works
4. What stays after an account is deleted, and why
5. Backups and other copies
6. Destroying or de-identifying information (APP 11.2)
7. How retention is enforced
8. How retention is checked
9. Legal holds
10. Proposed end dates for records that have none
11. Where other documents disagree with the code
12. Facts to confirm
13. Sources

---

## 1. What the law asks, and whether it applies

| # | Requirement | Classification | Deciding fact | Source |
|---|---|---|---|---|
| L1 | **APP 11.2.** When information is no longer needed for any permitted purpose, and no law requires it to be kept, take reasonable steps to destroy it or de-identify it. | **depends on Hushmallow's functionality or business circumstances**: Hushmallow must be an APP entity. That status **needs legal advice** (privacy research item PRV-02, the s6D(4)(b) health-service test). | APP-entity status. Then: what each record is still needed for. | Privacy Act 1988 (Cth) Sch 1, APP 11.2. legislation.gov.au was not opened; the wording is from memory and from an earlier search extract of the OAIC *Guide to securing personal information* (official guidance, not re-seen). |
| L2 | **APP 11.1.** Take reasonable steps to protect personal information from misuse, interference, loss and unauthorised access, change or disclosure. Since the 2024 amendment, reasonable steps include technical and organisational measures. Copies, backups and leftovers are part of what must be protected. | **depends on Hushmallow's functionality or business circumstances** (APP-entity status, as L1). | As L1. The bar rises with sensitivity: mental-state writing linked to an email address. | OAIC, *Guide to securing personal information* (official guidance, earlier search extract, not re-seen). |
| L3 | **APP 12.** On request, give people access to the information held about them, usually within 30 calendar days. A full request covers the leftovers in §4, not only the download file. | **depends on Hushmallow's functionality or business circumstances** (APP-entity status). | As L1. | OAIC, *Dealing with requests for access to personal information* (official guidance, earlier search extract, not re-seen). |
| L4 | **Deletion claims must be true.** What the app and the policy say about deleting and clearing must hold across the database, logs and backups. Otherwise it risks being misleading conduct. | **depends on Hushmallow's functionality or business circumstances**: on what the app and the policy actually say (research item SCW-07). | The wording used, and whether the code does it. | Australian Consumer Law s18 (Competition and Consumer Act 2010 (Cth) Sch 2). The text was not opened in this environment. ACCC pages were seen only as search extracts. |
| L5 | **Online Safety industry standard records.** A provider bound by the Designated Internet Services standard for class 1A and 1B material "must keep records that set out the actions that the provider has taken to comply", for "at least 2 years after the end of the calendar year during which the action was taken". | **depends on Hushmallow's functionality or business circumstances**: whether the DIS (or RES) Standard covers Hushmates, which turns on the service category (SCW-01, **needs legal advice**) and the tier (SCW-02, SCW-03). | The service category and risk tier. | *Online Safety (Designated Internet Services—Class 1A and Class 1B Material) Industry Standard 2024*, esafety.gov.au PDF (official text, seen only as a search extract; possibly the draft). |
| L6 | **Age-check information.** eSafety "does not expect platforms to keep personal information from individual age checks". If Part 4A of the Online Safety Act applies, it limits how information collected for the minimum-age duty is used, and requires it to be destroyed. | **needs legal advice**: whether Part 4A covers Hushmates is open (research items U16-01 to U16-03, U16-09). The research leans towards "in scope" (the s 63C(1)(a) base test, and the time-limited-feature limb of rule 4A of the Rules), and the health-purpose exclusion (Rules 2025 s 5(1)(f)) is unresolved. Don't assume it doesn't apply. | Scope. Today Hushmates collects only the 18+ tick and its time (A7 below). | eSafety media release on the minimum-age regulatory guidance (official guidance, search extract). OAIC, *Privacy Guidance on Part 4A* (title only seen). |
| L7 | **State health records laws.** Victoria's *Health Records Act 2001* has no small business exemption. NSW's *Health Records and Information Privacy Act 2002* covers health service providers. **From memory, not seen in this research:** both may set a minimum time that a health service provider must keep health information about an adult (7 years, as I recall). If that applied, it would conflict with the 30-day clearing and with members deleting their own words. | **needs legal advice** (PRV-17, PRV-18). | Whether Hushmallow is a health service provider; the owner's state; the reach of each Act. | health.vic.gov.au, *Health Records Act* (official guidance, search extract); legislation.nsw.gov.au, HRIP Act (official text, search extract). Neither extract showed a retention rule. |
| L8 | **Statutory tort for serious invasions of privacy.** It reaches intentional or reckless misuse, such as staff keeping copies of members' words outside the system. It applies whatever the APP status. | **depends on Hushmallow's functionality or business circumstances**: on conduct (PRV-20). | What staff and desk readers actually do. | OAIC, *Statutory tort for serious invasions of privacy* (official guidance, earlier search extract, not re-seen). |

**Recommended posture (recommended practice, PRV-03).** Follow this schedule as if Hushmallow were bound by the APPs.
It costs little, it covers most of what the state laws would ask, and every extra day data is kept widens what a
breach could expose (`docs/legal/DATA_BREACH_RESPONSE_PLAN.md`).

---

## 2. The schedule: every kind of data

"Words" means a member's writing: a feeling, a perspective or a Mallow line. Words are encrypted (AES-256-GCM) by the
Edge Function before they reach the database (`supabase/functions/_shared/fieldcrypt.js:6-13`).

"The daily job" is `hushmates-retention` (§7). It runs once a day, so anything due "after N days" goes at the first
run after the limit. In practice that means up to about a day later.

**Status:** ✅ built and tested · **[GAP]** · **[PROPOSAL]** · **[NOT CONFIRMED]**.

### A. Account and sign-in

| # | Data | Where | Kept for | Clock starts | How it goes | Why | Status |
|---|---|---|---|---|---|---|---|
| A1 | Email address | Supabase Auth (the project's `auth` schema), not the Hushmates tables. Not encrypted by Hushmates. | While the person is a member | Sign-in | When the member deletes their data, the Edge Function deletes the Auth user at once (`supabase/functions/hushmates/index.ts:62-67`). If Supabase can't be reached, the scheduler retries, at least 5 minutes apart, up to 50 times (`supabase/migrations/20261014090200_hushmates_api.sql:201-215`). | To send sign-in codes | ✅. **[GAP]** After 50 failed tries the email stays and nobody is alerted (A12). |
| A2 | Email of someone who asked for a code but never redeemed an invitation | Supabase Auth | **No end date** | Code requested | Nothing removes it. "Delete my data" needs a member (`supabase/migrations/20261014090200_hushmates_api.sql:30-33`). | None after the code expires | **[GAP]**. **[PROPOSAL]** Delete Auth users with no Hushmates membership 30 days after they were created (§10). Until then, delete by hand on request (§3.5). |
| A3 | Sign-in code | Supabase Auth | 10 minutes | Sent | It expires (`otp_expiry = 600`, one code per address per 60 seconds: `supabase/config.toml:17-20`) | Sign-in | ✅. How Supabase stores used codes: **[NOT CONFIRMED]**. |
| A4 | Supabase Auth's own records: sessions, refresh tokens, one-time tokens, Auth audit log. These may include IP addresses and browser details. | Supabase Auth | **[NOT CONFIRMED]** | Each sign-in | **[NOT CONFIRMED]** whether deleting the Auth user removes all of them. The Auth audit log may not be tied to the user row. | Platform | **[NOT CONFIRMED]**. Check on staging (§12, item 1). |
| A5 | Sign-in identity: issuer, subject (the Auth user id), provider, created, last seen (updated at most once an hour) | `hushmates.identities` (`supabase/migrations/20261014090000_hushmates_schema.sql:72-80`) | While a member | Joining | Deleted when the member deletes their data (`supabase/migrations/20261014090100_hushmates_rules.sql:1019-1023`) | Knowing who is calling | ✅ |
| A6 | Display name (3 to 20 letters or numbers). Plain text. | `members.pseudonym` | While a member | Joining | Replaced with "A former Mallow" on deletion (`supabase/migrations/20261014090100_hushmates_rules.sql:1024`) | The member's own name in the app | ✅ |
| A7 | 18+ confirmation time | `members.adult_confirmed_at` (not null) | **No end date**, including after deletion | Invitation redeemed | Nothing removes it | Evidence the age gate was passed | **[GAP]**. **[PROPOSAL]** Keep while a member, then for 365 days after deletion, then remove. This needs a schema change, because the column can't be empty today. |
| A8 | Which invitation was used | `members.invite_id` | **No end date** | Joining | Nothing removes it. It is set to empty only if the invitation row is deleted (`supabase/migrations/20261014090000_hushmates_schema.sql:65`, `on delete set null`). | Tracing how someone joined | **[GAP]**. **[PROPOSAL]** in §10. |
| A9 | Invitations: keyed hash of the code (never the code), role, uses, expiry, revoked time, free-text note, created time | `hushmates.invites` | **No end date**. Defaults: 1 use, 14 days (`server/admin.mjs`, `invite`). | Created | Nothing removes them | Invitation-only pilot | **[GAP]**. The operator's `--note` is plain text and could hold a name or email. **[PROPOSAL]** Rule: never put a name or email in a note. Delete invitations 90 days after they expire, are used up or are revoked. |
| A10 | Settings and state: role, state (active, restricted, suspended, deleted), Mallow, "Let feelings find me", gentle notices, onboarded, created and deleted times | `hushmates.members` | While a member. The row stays after deletion, with the name and Mallow reset and catching off. | Joining | Nothing removes the row | Running the account; after deletion, nothing except the links from other rows | **[GAP]**. **[PROPOSAL]** in §10. |
| A11 | Restrictions (by a moderator or an operator) | `members.state`, plus the audit log | Until lifted | Decision | An operator lifts it (`server/admin.mjs member <ref> active`) | Safety | ✅ |
| A12 | Pending sign-in deletions | `hushmates.auth_deletions` | Until the Auth user is gone | Account deletion | Removed when deletion succeeds (`supabase/migrations/20261014090200_hushmates_api.sql:195-198`) | Finishing a deletion | **[GAP]** After 50 attempts the row stays and nobody is told. **[PROPOSAL]** An alert, and a manual deletion within 7 days (§8, check C9). |

### B. Feelings and what comes back

| # | Data | Where | Kept for | Clock starts | How it goes | Why | Status |
|---|---|---|---|---|---|---|---|
| B1 | **Feeling words** (encrypted) and their keyed hash | `journeys.text_enc`, `text_mac` | Travelling: at most 24 hours a trip, with up to 2 resends (`journeyTtlMs 86400000`, `maxResends 2`). Home and not saved: **30 days**. Saved: no end date. | Release; then coming home | **The daily job** clears them 30 days after the feeling came home, if it isn't saved (`returnedDays 30`). **Let it go** clears them at once. **Delete this journey** and **Delete my data** clear them at once. | Bringing it home; time to come back, read and keep what helps | ✅. **[GAP]** Saved feelings have no upper limit (§10). |
| B2 | Journey steps and choices (kept or let go) | `journeys.events`, `choices` | As B1, but **not** cleared by "Let it go": they wait for the 30-day clearing | As B1 | Cleared with the words at 30 days, on deletion of the journey, or on "Delete my data" | Showing the journey | ✅ |
| B3 | Journey record without words: owner, label (e.g. sadness, loneliness), Mallow, consent times (the release consent is shown in "Download my data" as `agreedToShareWithoutYourNameAt`, format version 2: `core/export-format.js:44, 54-55`), status, times, why it came home, resends, paused, saved, seen, client id | `hushmates.journeys` (`supabase/migrations/20261014090000_hushmates_schema.sql:93-121`) | **No end date**, including after account deletion | Release | Deletion is a soft delete: `status = 'deleted'`. The row stays. | Reports point to it. Nothing else needs it once the words are gone. | **[GAP]**. Deleting the row would also delete reports on it (`reports.journey_id ... on delete cascade`, schema line 198). **[PROPOSAL]** in §10. |
| B4 | **Perspective words** (encrypted) and hash | `perspectives.text_enc`, `text_mac` | While the feeling keeps its words (B1). On a saved feeling, until the author deletes it or the writer takes it back. | Written | Cleared: when the writer takes it back (`supabase/migrations/20261014090100_hushmates_rules.sql:757-771`); when the writer deletes their data (line 1008); when the author deletes the journey or their data (lines 480, 1003); by a moderator's "Remove the perspective"; by the daily job, with the feeling, at 30 days. **"Let it go" hides** perspectives the author didn't keep (line 467). Their words are cleared at the 30-day run. | The author's collection | ✅. See the two notes below. |
| B5 | Perspective record without words: writer, slot, Mallow, hidden, set aside, removed, withdrawn time, share setting and its time | `hushmates.perspectives` | **No end date** | Written | Nothing removes the row | Counting places on a journey while it travels | **[GAP]**. **[PROPOSAL]** in §10. |
| B6 | Mallow line words (encrypted). The line is chosen automatically from a fixed set of lines written in advance for Hushmallow, guided by the feeling's words: an opener in the Mallow's voice plus one perspective (`core/perspectives.js:640` at `0773d1e`). The library is 293 lines (51 openers, 114 Hushmates lines and 128 of Reframe's), checked line by line at Tier 0 (`docs/safety/TIER0_SELF_ASSESSMENT.md` §3); who wrote each line is for the owner to confirm. AI is off. The app still labels these lines "Automatically generated" (decision D21, open). | `mallow_perspectives.text_enc` | With the journey (B1) | Prepared | Wiped on "Let it go" if not kept, on journey deletion, on "Delete my data" (`hushmates.wipe_fallback`, rules lines 449-456), and by the daily job at 30 days | The author's own extra line | ✅ |
| B7 | Mallow line record: status, source, `model` (`reframe-library:<line id>`), `angle_id` (for example `hm-loss-1`, `hm-health-2`, `hm-money-1`: **it shows which theme the words were matched to**), voice, reason, who asked, times | `hushmates.mallow_perspectives` (schema lines 171-189) | **No end date** | Prepared | Nothing removes it | Not repeating the member's last 12 lines (`supabase/migrations/20261014090200_hushmates_api.sql:104-109`) | **[GAP]**. The line id hints at health, loss or money, in plain text, linked to the account. **[PROPOSAL]** in §10. |
| B8 | Holds: who was offered, caught, passed or reported which feeling, with times | `hushmates.holds` | **No end date**. A hold itself expires after 3 minutes (offered) or 10 minutes (caught). | Offer | The status changes; the row stays. Deletion voids only live holds (rules lines 1017-1018). | One feeling at a time, fairness | **[GAP]**. **[PROPOSAL]** in §10. |
| B9 | Exposures: which member was shown which feeling | `hushmates.exposures` | **No end date** | Offer | Nothing removes them | Never showing the same feeling twice | **[GAP]**. Only needed while the feeling can still travel. **[PROPOSAL]** in §10. |
| B10 | Daily Mallow counts (per member and service-wide) | `hushmates.usage_daily` | **7 days** | The day | The daily job deletes days older than 7 days (`supabase/migrations/20261014090200_hushmates_api.sql:189`). So up to about 8 days. | The 5-a-day and 500-a-day limits | ✅ |
| B11 | AI usage records | `hushmates.ai_usage` | None exist: **AI is off** (`supabase/migrations/20261014090000_hushmates_schema.sql:39`) | n/a | No rule | Accounting, if AI were ever on | **[GAP]**, only if AI is turned on (decision D10). Set a period first. |
| B12 | AI answer cache in the Edge Function's memory | Memory only | Used only for AI answers, so empty while AI is off. At most 1 hour and 500 entries. | n/a | Cleared for a person on deletion (`supabase/functions/_shared/gateway.js:141`), and on restart | Not paying twice | ✅ |

Two notes on B4:

- **Set-aside perspectives.** A perspective is "set aside" when its writer had blocked the author. The author never sees it. "Delete this journey" and "Delete my data" by the author don't clear these (`and not set_aside`, rules lines 480, 1003). The daily job clears them at its next run, because the journey is then deleted (api line 174). So they can keep their words for up to a day after the author deletes. The writer can still take them back at any time.
- **After "Let it go"**, the writer still sees their perspective in "Perspectives you've offered" until the 30-day clearing. That matches the privacy sheet: their perspective goes when the author deletes the feeling, and letting go is not deleting.

### C. Safety records

| # | Data | Where | Kept for | Clock starts | How it goes | Why | Status |
|---|---|---|---|---|---|---|---|
| C1 | **Report evidence**: encrypted copies of the reported feeling and perspective. **Report details** (encrypted; the current app never collects them, the API accepts up to 600 characters). | `reports.evidence`, `details_enc` | **90 days after the decision.** **180 days after the report**, if it's never decided. | Decision, or report | The daily job (`evidenceDaysAfterResolution 90`, `openEvidenceDays 180`; api lines 178-184). Also at once when the member deletes their data: their details, their feeling quoted in reports they made, and their words in reports about them (rules lines 1009-1016). | Deciding the report; a complaint about the decision; spotting a repeat pattern; the first-month review of the beta (`docs/ESCALATION.md` §6) | ✅. **[GAP]** below. |
| C2 | Report record without words: reason (for example "Someone may be in danger"), who reported, who it was about, kind, ids, urgent, status, times | `hushmates.reports` | **No end date** | Report | Nothing removes it | Accountability; "earlier reports about the same person" on the desk | **[GAP]**. **[PROPOSAL]** in §10. |
| C3 | Desk notes (encrypted) | `hushmates.report_notes` | **No end date**. Neither the daily job nor account deletion touches them. | Written | Removed only if the report row is deleted (cascade, schema line 213) | The desk's record of what it saw and did | **[GAP]**. **[PROPOSAL]** Clear them with the report's evidence. |
| C4 | Blocks: who blocked whom, when | `hushmates.blocks` | **No end date**, even after either person deletes their data | Block | Nothing removes them | Keeping the two apart | **[GAP]**. Once either side has deleted, the block does nothing: a returning person gets a new account. **[PROPOSAL]** Delete blocks involving a member when that member deletes their data. |
| C5 | Audit log: what happened, never anyone's words. Actor (member id, `system` or `operator`), action, detail (for example report ids, decisions, account state changes). | `hushmates.audit_log` | **365 days** | The entry | The daily job deletes entries older than 365 days (`auditDays 365`; api line 185) | Who did what at the desk and in operations; investigating misuse of access | ✅. If L5 applies, a separate, non-personal record of compliance actions may need to last longer (§10). |
| C6 | The desk's session | `sessionStorage` in the desk tab only | That tab. Signs out after 30 minutes idle (`staff/desk.js:6-7, 14, 328`). | Sign-in | Closing the tab, or idle | Desk access | ✅ |

**[GAP] in C1.** The rule for decided reports clears details only when the evidence isn't already empty
(api line 180: `and evidence <> '{}'`). If the reported person deletes their data first, their words leave the
evidence, which can leave it empty. The reporter's added details would then stay with no end date. Today the app
sends no details, so this needs a direct API call to happen. Fix: match the open-report rule (line 184).

**Reported words can outlive the feeling.** Evidence is a copy. When a feeling is cleared at 30 days, the copy in a
report stays until C1's own limit: up to 90 days after the decision, or 180 days after the report.

### D. Records that keep Hushmates running

| # | Data | Where | Kept for | How it goes | Why | Status |
|---|---|---|---|---|---|---|
| D1 | Rate-limit events: one row for every API call (member id, or `id:<issuer>\|<subject>` before joining), plus rows for releases, finds, perspectives, Mallow requests and reports. For wrong invitation codes, a keyed hash of the caller's network address (`net:` plus 16 hex characters; never the address: `supabase/functions/_shared/gateway.js:251-257`). | `hushmates.rate_events` | **48 hours** (`rateEventsHours 48`). The daily job deletes them, so in practice **between 48 and about 72 hours**. | Daily job (api line 187) | The limits look back at most a day | ✅. The privacy policy draft says "48 hours" (§11). For 48 hours this table is a time-stamped record of each member's activity. |
| D2 | Service counts by day (for example finds, scheduler runs, Mallow lines from the library). Totals only, about nobody. | `hushmates.ops_daily` | No end date | — | Running the service | ✅ Not personal information. Review yearly. |
| D3 | Settings (limits, retention, Mallow, AI, invitations, desk). `desk.awayUntil` holds the day a reader will next check the desk, or null (`supabase/migrations/20261015090000_hushmates_tier0.sql:11`) | `hushmates.settings` | Current values | Changed by an operator | Configuration | ✅ Not personal. **[GAP]** Changes aren't written to the audit log (`admin_set_setting`, api lines 296-300), only `updated_at`, so past desk-away periods aren't recorded anywhere unless the owner writes them down (`MODERATION.md` §12). |
| D4 | Edge Function log lines: error messages only, never words (`gateway.js:157, 174, 287`; `mallow.js:199, 238`) | Supabase platform | **[NOT CONFIRMED]** | Platform | Fixing faults | **[NOT CONFIRMED]** |
| D5 | Scheduler run history | `cron.job_run_details` (pg_cron) | **[NOT CONFIRMED]** | Platform | Checking the jobs ran | No personal data expected |

### E. Outside the database

| # | Data | Where | Kept for | How it goes | Status |
|---|---|---|---|---|---|
| E1 | The session: access and refresh tokens, expiry, user id, **email** | The member's browser, `localStorage` key `hushmates.session` (memory if storage is blocked) | Until "Sign out" on that device, or deletion | Cleared by the app (`client/supabase-auth.js:287-296`; `app/app.js:94-99`). After a deletion, other devices' sessions stop working, and each forgets its session when it next connects. | ✅ |
| E2 | The address a code was just sent to | `sessionStorage` key `hushmates.signin` | 15 minutes, cleared after sign-in (`ui/relay/sign-in.js:17-30`) | The app | ✅ |
| E3 | "Soft sounds" on or off | `localStorage` key `hushmates.sound` | Until changed | — | ✅ Not personal in itself |
| E4 | An unsent draft | Page memory | Gone when cleared or when Hushmates closes | — | ✅ |
| E5 | Share pictures and videos | Made on the member's device; Hushmallow stores nothing (`ui/relay/share.js:1-3, 246, 250`) | Out of Hushmallow's hands | The app tells writers a picture already made can't be taken back | ✅ |
| E6 | Supabase platform logs: API gateway, Auth, Edge Function calls, Postgres. They usually include request paths, times and IP addresses. | Supabase | **[NOT CONFIRMED]**; depends on the plan | Platform | **[NOT CONFIRMED]** |
| E7 | Cloudflare Pages request data (IP address, browser) for the static site | Cloudflare | **[NOT CONFIRMED]** | Platform | **[NOT CONFIRMED]** |
| E8 | The sign-in email: address, code, sending records | Today: Supabase's built-in sender, which reaches only the team's own addresses [DOC `docs/STAGING.md:154-155`]. Later: a custom email provider (decision D5, not chosen). | **[NOT CONFIRMED]** | Provider | **[NOT CONFIRMED]**. Get the provider's retention in writing before choosing it. |
| E9 | Supabase's automatic backups | Supabase | **Free plan: none. Pro plan: daily, kept 7 days** [DOC `docs/DECISIONS.md` D3; `docs/READINESS.md:76`]. The beta's plan is undecided. | Rotation | See §5 |
| E10 | The owner's manual database copies (`pg_dump` of the `hushmates` and `hushmates_api` schemas only: no Auth, so no email addresses) | The owner's computer, for example `.data/hushmates-backup.dump` (`docs/STAGING.md:282`) | **No rule today** | By hand | **[GAP]**. **[PROPOSAL]** in §5 |
| E11 | The recovery drill's restored copy | A new local database | Dropped at the end of the drill, unless `--keep` (`tools/recovery-drill.mjs:80`) | The drill | ✅ |
| E12 | The keys: `HUSHMATES_DATA_KEYS`, `HUSHMATES_DATA_KEY_ID`, `HUSHMATES_MAC_KEY` (plus the scheduler's secret) | Edge Function secrets; the owner's `.data/staging.env` and password manager; in a cloud session, derived from the staging root secret | While any stored text or backup needs them | Old keys are destroyed after rotation, once nothing needs them (§6) | Not personal information, but they unlock it |
| E13 | Staging check reports (`.data/staging-check-<time>.json`) | The owner's computer | Until staging is finished | By hand | Test accounts only (`@example.com`) |
| E14 | The source repository | GitHub, **public** today (decision D19 recommends making it private, now) | n/a | n/a | It must never hold personal information. `.data/` and `dist/` are ignored (`.gitignore`). |

### F. Records the team makes by hand

| # | Data | Kept for | Status |
|---|---|---|---|
| F1 | Privacy requests and complaints (to the contact address, decision D23), with the replies | **[PROPOSAL]** 2 years after the request is closed | Not set up. No contact address exists yet. |
| F2 | The breach and incident log (`docs/legal/DATA_BREACH_RESPONSE_PLAN.md` §11) | **[PROPOSAL]** At least 2 years after the incident is closed. It holds no member words. | Not set up |
| F3 | The legal hold register (§9) and any held copies | Copies: until the hold is released. The register: **[PROPOSAL]** 2 years after release. | Not set up |
| F4 | The retention check log (§8) | **[PROPOSAL]** 2 years | Not set up |

### G. Never stored

| # | What | Fact |
|---|---|---|
| G1 | Feeling words held back by the safety screen | Answered before any database call. Nothing is stored and no record is made (`supabase/functions/_shared/gateway.js:75-77`). |
| G2 | Perspective words held back by the safety screen | Never stored. The catcher's hold ends as "passed", the same as letting it float past (rules lines 698-707). |
| G3 | Analytics, tracking, advertising identifiers | None (no such code; the site's content rules allow only itself and the Supabase project). |
| G4 | Cookies | None set by the app or the desk. Whether Cloudflare sets any of its own is **[NOT CONFIRMED]**. |

---

## 3. How deletion works

### 3.1 What a member can do, and what each action does

| Action (in the app) | At once | Later | What stays |
|---|---|---|---|
| **Bring a feeling home early** | It comes home, with reason "withdrawn". Live holds end. | The 30-day clearing applies from now, unless saved. | Everything in B1-B9, as for any feeling at home. |
| **Let it go** | The feeling's words are cleared. Perspectives the author didn't keep are hidden from them. The Mallow line is wiped if it wasn't kept. A late Mallow answer is dropped (rules lines 459-472, 832-835). | At the 30-day clearing: the steps, the choices, and the hidden perspectives' words. | Kept perspectives stay with the author until then. The rows (B3, B5, B7-B9). |
| **Delete this journey** | The feeling's words, steps and choices; every perspective on it, including kept ones; the Mallow line (rules lines 474-484). | Set-aside perspectives on it: at the next daily run. | The rows without words (B3, B5, B7-B9), and any report evidence (C1, until its own limit). |
| **Take back a perspective** (writer) | Its words, and its share setting. Logged as `withdraw-perspective` (rules lines 757-771). | — | The row without words. A copy in a report, until C1's limit. Pictures already made. |
| **Turn off sharing for a perspective** | Future share pictures leave it out | — | Pictures already made |
| **Delete my Hushmates data** | See §3.3 | See §3.3 | See §4 |

### 3.2 What happens automatically

**Every minute** (`hushmates-tick`, `* * * * *`): holds expire (3 minutes offered, 10 minutes caught); feelings
past 24 hours come home; Mallow lines are prepared where the author allowed it; pending sign-in deletions are retried
(`supabase/migrations/20261014090200_hushmates_api.sql:117-130`; `supabase/functions/_shared/gateway.js:207-224`).

**Every day at 03:17** (`hushmates-retention`, `17 3 * * *`; the time zone is **[NOT CONFIRMED]**, normally UTC,
which would be 13:17 Sydney time in winter and 14:17 in summer). `hushmates_api.job_retention()` does this, in order
(api lines 165-191):

1. Feelings that came home or were let go, aren't saved, and came home more than `returnedDays` (30) days ago:
   words, hash, steps and choices cleared; status set to deleted.
2. Every perspective on a deleted feeling that still has words: words and hash cleared, marked removed.
3. Every Mallow line on a deleted feeling that still has words: words cleared, hidden.
4. Decided reports more than `evidenceDaysAfterResolution` (90) days after the decision: evidence and details
   cleared (see the [GAP] under C1).
5. Undecided reports more than `openEvidenceDays` (180) days old: evidence and details cleared. The report stays open.
6. Audit entries older than `auditDays` (365) days: deleted.
7. Rate-limit events older than `rateEventsHours` (48) hours: deleted.
8. Daily Mallow counts older than 7 days: deleted (fixed in the code, not a setting).

It returns counts (`journeysCleared`, `evidenceCleared`, `auditDeleted`, `rateEventsDeleted`). **Nothing stores them**
(§8).

### 3.3 Deleting an account ("Delete my Hushmates data")

The member confirms: "Every feeling you released and every perspective you gave is deleted, and you're signed out of
Hushmates. This can't be undone." (`ui/relay/you.js:113`). Then, in one database transaction
(`supabase/migrations/20261014090100_hushmates_rules.sql:995-1027`):

1. Each of their feelings still travelling is brought home.
2. For each of their feelings: the words, steps and choices are cleared; every perspective on it is cleared,
   other people's included (set-aside ones wait for the next daily run); the Mallow line is wiped.
3. Every perspective they gave, on anyone's feeling, is cleared.
4. Their words leave the safety team's reports: details they wrote, their own feeling quoted in reports they made,
   and their words quoted in reports about them. The reports themselves stay, without those words.
5. Their live holds are voided.
6. Their sign-in identities are queued for deletion at Supabase Auth, then removed from `identities`.
7. Their name becomes "A former Mallow", their Mallow is reset, catching is turned off, and the state becomes
   deleted.
8. It is logged as `account.deleted`.

Then the Edge Function drops anything of theirs from its in-memory cache and deletes the Supabase Auth user, which
holds the email (`supabase/functions/_shared/gateway.js:139-160`). If that fails, the scheduler retries (A1, A12).
The device forgets its session and shows "Your Hushmates data is deleted."

There is no grace period and no undo.

### 3.4 Deleting an account for someone (operator)

**[GAP]** There is no operator tool to delete a member's data. `server/admin.mjs` has invite, revoke, settings, set,
ops and member state only. It is needed for: an account found to belong to someone under 18; a person who can't sign
in any more and asks by email; a legal requirement.

Until a tool is built and tested, the stop-gap is:

1. Confirm the request comes from the account's email address (the sign-in email is the only identity Hushmallow
   holds). Record it in the request log (F1).
2. Suspend the account at once: `node server/admin.mjs member <reference> suspended`.
3. The developer runs the same database function the app uses, as the database owner, with the member's reference.
   Then they check that the scheduler deleted the Auth user (the pending row in `auth_deletions` disappears).
   **Rehearse this on staging first. It has never been tested by hand.**
4. Reply to the person and record the date.

### 3.5 Someone who asked for a code but never joined

Their email sits in Supabase Auth with no Hushmates membership (A2). On request: find the user in the Supabase
dashboard (*Authentication → Users*) and delete it. Record the request (F1).
**[PROPOSAL]** An automatic expiry (§10).

---

## 4. What stays after an account is deleted, and why

Nothing below holds the person's words or email. But it is still linked by the member's id, and some of it says
something about them.

| What stays | Why it stays today | Honest assessment | Proposal (§10) |
|---|---|---|---|
| The member row: id, role, created and deleted times, 18+ time, invitation link, preferences | Other rows point to it | No purpose after deletion except as a link | Strip after 365 days |
| Journey rows: label, Mallow, consent times, times, how each journey ended | Soft delete; reports point to journeys | The label (for example "loneliness") is about the person | Strip when words go |
| Perspective rows: slot, Mallow, flags, times | Soft delete | Little purpose | Strip when words go |
| Mallow line rows, with line ids such as `hm-health-2` | No rule | The line id hints at a health, loss or money theme | Strip when words go |
| Holds and exposures | No rule | A record of which feelings found them, and when | Delete when the journey's words go |
| Blocks, both ways | No rule | Useless once either side is gone | Delete on deletion |
| Report rows about them, or made by them | Accountability; the repeat-pattern count on the desk | Says "this account was reported for X" | Strip people after 365 days |
| Desk notes on those reports | No rule | Could describe them | Clear with the evidence |
| Report evidence about **other** people, in reports this person made | Those reports are about someone else's words, which may still be needed for that decision | Justified until C1's limit | None |
| Audit entries naming their id | Accountability | Justified for 365 days | None |
| Rate-limit events and daily Mallow counts | Short limits | Justified | None |
| Invitation record, including any free-text note | No rule | A note could name them | Rule for notes; delete old invitations |
| Copies outside the database: backups, manual dumps, platform logs, the email provider's records, Supabase Auth's audit log | Platform and operations | Persist for their own periods | §5; confirm the platform items (§12) |
| Share pictures others made, if this person allowed it | Made on someone else's device | Out of Hushmallow's reach. The app says so. | None |

---

## 5. Backups and other copies

### 5.1 How long deleted data can persist in copies

| Copy | Holds | How long a deleted item can persist | Status |
|---|---|---|---|
| Supabase automatic backups | The whole database, probably including Supabase Auth (so email addresses) **[NOT CONFIRMED]** | **Free plan: no backups, so nothing.** **Pro plan: up to 7 days** after the deletion, until the last backup holding it rotates out [DOC] | The plan is undecided (D3). Point-in-time recovery is not on. |
| Supabase's own internal copies beyond the plan | Unknown | **[NOT CONFIRMED]** | Ask Supabase, or read its terms |
| The owner's manual dumps (E10) | Encrypted words and every plain-text record in the two Hushmates schemas. No Auth, so no emails. | **Until the owner deletes the file. No rule today.** | **[GAP]** |
| Platform logs (D4, E6, E7) | Request metadata, possibly IP addresses; never words | **[NOT CONFIRMED]** | Confirm per plan |

### 5.2 Rules for manual copies [PROPOSAL, recommended practice]

- Make a manual dump only for the monthly recovery drill, or before a risky change.
- Keep **one** at a time. Delete each one **within 30 days** of making it. The privacy policy draft says "[30 days]",
  so the two match.
- Keep it only on a computer with full-disk encryption, never in a synced folder, an email or a chat, and never
  inside the repository. `.data/` is ignored by git, but check before every commit.
- A dump without the keys can't be read. Don't keep the keys in the same place as the dump. A password manager
  for the keys and the encrypted disk for the dump is enough.
- Record each dump's date, and the date it was deleted, in the retention check log (F4).

### 5.3 After a restore: putting deletions back [GAP, PROPOSAL]

A restored backup brings back everything deleted after the backup was taken: words, accounts and, if the backup
includes Supabase Auth, email addresses. The code has no way to replay those deletions, and some aren't recorded
anywhere. For example, deleting or letting go of a journey writes no audit entry.

Until a deletion record is built:

1. **Before restoring**, if the current database can still be read, export the list of what was deleted after the
   backup's time. Use `account.deleted` and `withdraw-perspective` audit entries, and journeys whose status is now
   `deleted` or `released`. Keep the list (ids only, no words) with the restore record.
2. **After restoring**, before anyone uses the app:
   - re-apply each account deletion (§3.4 method), so their Auth users are deleted again;
   - re-apply each journey deletion and perspective withdrawal;
   - run the daily job once by hand.
3. If the current database **can't** be read, the deletions since the backup are lost. Treat it as a privacy
   incident: record it in the breach log and decide, with the response lead, what to tell members.

**[PROPOSAL]** Build a small deletion ledger: ids and times only, kept at least as long as the longest backup plus a
week. Or write audit entries for journey deletions and let-go. Then build a replay tool.

---

## 6. Destroying or de-identifying information (APP 11.2)

**Classification: depends on Hushmallow's functionality or business circumstances** (APP-entity status, which
**needs legal advice**). Recommended practice either way.

**What "cleared" means in this code.** A word field is overwritten with an empty string, and its keyed hash is set to
empty. The app and the API can no longer reach it. Two honest limits:

1. **Physical remnants.** Postgres keeps the old version of an updated row until its clean-up process (vacuum)
   reclaims the space. Recent changes also sit in its write-ahead log for a while. How long that takes on Supabase
   is **[NOT CONFIRMED]**. Any remnant of a word is **ciphertext**, and the keys are not stored in the database.
2. **Copies.** Backups and dumps keep cleared words until they rotate or are deleted (§5).

Whether this counts as "reasonable steps to destroy" is a judgement. From memory (check against the OAIC's APP 11
guidelines before relying on it), the OAIC accepts that information which can't practically be retrieved, and is
kept from use, can be treated as destroyed. That includes information in backups waiting to be overwritten.
**Needs legal advice.**

**The backstop: retire old keys (crypto-shredding).** [PROPOSAL, recommended practice] Rotate the data key on a
schedule, for example once a year, and whenever a key may have been seen:

1. Add a new key with a new id, and make it the current one. The code supports several keys at once:
   `HUSHMATES_DATA_KEYS` is a map and `HUSHMATES_DATA_KEY_ID` names the current one
   (`supabase/functions/_shared/fieldcrypt.js:15-18`).
2. Re-encrypt every stored word with the new key. **[GAP]** There is no tool for this yet. The test at
   `tests/backend-auth.test.mjs:795-802` shows re-encrypting works.
3. Check that nothing still uses the old key. The recovery drill reports how many texts use each key id.
4. Keep the old key only until the last backup made before step 2 has rotated out (7 days on Pro). Then destroy
   every copy of it, including the password manager entry and `.data/staging.env`.

After step 4, every remnant and old copy of a cleared word is unreadable for good.

The keyed-hash key (`HUSHMATES_MAC_KEY`) is different. Rotating it makes every outstanding invitation code stop
working, and weakens the duplicate checks for a while. Rotate it only when it may have been seen.

**De-identification.** After an account is deleted, its Auth user and identity rows are gone. Hushmallow then has no
direct way to link the leftover rows (§4) to an email, except through backups, platform logs and invitation notes,
until they expire. Whether those rows are then "de-identified" (no longer about a reasonably identifiable person) is
a judgement. They still link to each other, and words in other people's reports may describe the person.
**Needs legal advice.** The safer path is the end dates in §10, so that the question doesn't need answering.

---

## 7. How retention is enforced

| Mechanism | What | Where |
|---|---|---|
| Scheduled jobs (pg_cron on Supabase) | `hushmates-tick` every minute; `hushmates-retention` daily at 03:17 | `supabase/migrations/20261014090200_hushmates_api.sql:346-358`. The tick calls the Edge Function's `/jobs/tick` route with the scheduler's secret, read from Supabase Vault. The retention job calls the database function directly. |
| The retention settings | `{ "returnedDays": 30, "evidenceDaysAfterResolution": 90, "openEvidenceDays": 180, "auditDays": 365, "rateEventsHours": 48 }` in `hushmates.settings`, key `retention` | `supabase/migrations/20261014090000_hushmates_schema.sql:40` |
| Changing a setting | `node server/admin.mjs set retention '{"returnedDays": 30}'` (it merges) | Only with the owner's approval. Record every change, its reason and its date in the retention check log (F4): the audit log doesn't record it (D3 [GAP]). Change the privacy policy first if a period gets longer. |
| A second route | The Edge Function's `/jobs/retention` route runs the same job, with the scheduler's secret | `supabase/functions/_shared/gateway.js:265-268` |
| Immediate deletions | In the database functions themselves, in one transaction each | §3 |
| Tests | Retention at each limit, and not before: 48 hours, 30 days, 90 days, 365 days, and 180 days for open reports | `tests/backend-security-fixes.test.mjs:114-190` |
| The staging check | Confirms both jobs exist and are active, with the right schedules, and that the tick ran in the last 5 minutes | `tools/staging-check.mjs:145-147`. **It doesn't check that the retention job's runs succeeded.** |

**When the jobs don't run.** The local dev stack runs only the tick, not retention. On Supabase, if the project is
paused (Free projects pause after about a week without use [DOC `docs/STAGING.md:323`]), nothing runs: no clearing
and no Auth-deletion retries. The first run after it resumes catches up on the time-based rules.

---

## 8. How retention is checked

**Who:** the owner, or a named person they choose. **[PROPOSAL, recommended practice]**

**When:** weekly during the beta (C1-C3); monthly for the rest (C4-C11); yearly, a review of this whole schedule.
Also after any restore, any change to the retention code or settings, and any incident.

**How:** read-only SQL as the database owner, run some minutes after the daily job, and recorded in the check log
(F4). The expected result is 0 for each count, unless noted.

| # | Check | Query (read-only) | Expected |
|---|---|---|---|
| C1 | The retention job ran, and succeeded, every day this week | `select status, start_time from cron.job_run_details d join cron.job j on j.jobid = d.jobid where j.jobname = 'hushmates-retention' order by start_time desc limit 7;` | 7 rows, all `succeeded` |
| C2 | Unsaved feelings home for more than 31 days that weren't cleared | `select count(*) from hushmates.journeys where status in ('returned','released') and not saved and coalesce(returned_at, released_at) < now() - interval '31 days';` | 0 |
| C3 | Words left on deleted feelings | `select (select count(*) from hushmates.perspectives p join hushmates.journeys j on j.id = p.journey_id where j.status = 'deleted' and p.text_enc <> '') + (select count(*) from hushmates.mallow_perspectives m join hushmates.journeys j on j.id = m.journey_id where j.status = 'deleted' and m.text_enc <> '');` | 0 after the daily run |
| C4 | Decided reports past 91 days that still hold words | `select count(*) from hushmates.reports where status <> 'open' and resolved_at < now() - interval '91 days' and (evidence <> '{}' or details_enc <> '');` | 0. A non-zero count with empty evidence is the [GAP] under C1. |
| C5 | Undecided reports past 181 days that still hold words | `select count(*) from hushmates.reports where status = 'open' and at < now() - interval '181 days' and (evidence <> '{}' or details_enc <> '');` | 0 |
| C6 | Undecided reports at all | `select count(*) from hushmates.reports where status = 'open' and at < now() - interval '7 days';` | 0: every report should be decided long before its words go |
| C7 | Audit entries past 366 days | `select count(*) from hushmates.audit_log where at < now() - interval '366 days';` | 0 |
| C8 | Rate-limit events past 3 days | `select count(*) from hushmates.rate_events where at < now() - interval '72 hours';` | 0 |
| C9 | Sign-in deletions that gave up, or are stuck | `select count(*) from hushmates.auth_deletions where attempts >= 50 or created_at < now() - interval '1 day';` | 0. If not, delete those Auth users by hand within 7 days and record it. |
| C10 | Auth users with no Hushmates membership, older than 30 days (A2) | `select count(*) from auth.users u where u.created_at < now() - interval '30 days' and not exists (select 1 from hushmates.identities i where i.subject = u.id::text);` **[NOT CONFIRMED]** that the column names match Supabase's schema. Moderator and member accounts both appear in `identities`. | Report the number until §10's rule exists |
| C11 | Manual dumps older than 30 days | Look in `.data/` and anywhere else dumps were saved | None |

**If a check fails:** fix the cause, run the job by hand if needed, and record what happened and how long data was
kept too long. Words kept too long are not, by themselves, a data breach. But if the reason is a failure that also
exposed data, follow the breach plan. If the privacy policy promised a shorter time, tell the owner: it may need
correcting, or members may need to be told (L4).

---

## 9. Legal holds

A legal hold stops particular records being deleted because the law, or a likely legal process, needs them kept.
**What must be kept, for how long, and whether a member's own deletion may go ahead during a hold all need legal
advice.**

**When to consider one:**

- a notice, order or request from police, a court, eSafety or the OAIC;
- a complaint, dispute or threatened claim where legal proceedings are reasonably likely;
- a data breach investigation that needs evidence (the breach plan, step 1);
- material the moderation procedure says to report and preserve, such as child sexual exploitation material or
  pro-terror material suggesting an immediate threat (`docs/legal/MODERATION.md`; research item SCW-03). Don't copy or
  forward child sexual exploitation material. Get legal advice on preservation first.

**Who decides:** the owner, with legal advice where there's time. In an emergency the owner may place a hold first and
get advice straight after.

**How, today.** **[GAP]** There is no per-record hold. The daily job and "Delete my data" will clear held words on
their normal schedule. So, as soon as a hold is decided:

1. **Scope it as narrowly as possible:** the report ids, journey ids, member reference and dates involved.
2. **Take a copy** of exactly those rows, as the database owner, into a file on an encrypted disk. Keep the words
   encrypted unless the request needs them readable and legal advice confirms it. Platform logs expire on their own
   schedule **[NOT CONFIRMED]**, so export any that matter at the same time.
3. **Record it** in the hold register (below).
4. **Only as a last resort**, pause the retention job or lengthen a retention setting. Both affect every member.
   Record the start and the end, and put things back as soon as the copy exists.
   - Pause: `select cron.unschedule('hushmates-retention');`
   - Put back: `select cron.schedule('hushmates-retention', '17 3 * * *', 'select hushmates_api.job_retention()');`
     (the same schedule the migration sets, api line 356). Then confirm both jobs are listed and active:
     `select jobname, schedule, active from cron.job where jobname like 'hushmates-%';`
5. **When the hold ends:** delete the copy, put back any changed setting, record the release, and let normal
   retention resume. The next daily run catches up.

**[PROPOSAL]** Before G3 (testers outside the team), build a `legal_holds` table that the daily job and the deletion
functions respect, so a hold never needs a copy or a global change.

**Hold register (template)**

```
Hold no.:            H-YYYY-NN
Opened:              [date, time]            by: [name]
Reason / requester:  [e.g. police request ref …; eSafety notice …; complaint …]
Legal advice:        [who, date, summary] / [not yet]
Scope:               [report ids / journey ids / member reference / date range / platform logs]
How held:            [copy file name and location / job paused / setting changed (old → new)]
Members told?:       [no / yes, how, when; or why not]
Reviewed:            [dates]
Released:            [date]                  by: [name]
Copy destroyed:      [date]                  setting restored: [date]
```

---

## 10. Proposed end dates for records that have none [PROPOSAL]

Recommended practice. For the owner to decide. Each needs a code change, tests at the limit (like the existing
retention tests) and an updated privacy policy. Proposed timing: before G3, testers outside the team.

| Record | Proposed rule | Reason |
|---|---|---|
| Auth users with no membership (A2) | Delete 30 days after creation | No purpose once the code has expired. Invitations last 14 days by default. |
| Pending sign-in deletions that gave up (A12) | Alert the owner; finish by hand within 7 days | The email must not outlive "Delete my data" |
| 18+ confirmation time (A7) | Keep while a member, plus 365 days after deletion, then remove | Evidence of the age gate, for as long as the audit log |
| Member row after deletion (A10) | After 365 days, clear everything but the id and the deleted time | Other rows point to it; nothing else needs it |
| Invitations (A9) | Delete 90 days after expiry, full use or revocation (the member's link becomes empty, schema line 65). Never write names or emails in notes. | Long enough to trace a recent problem |
| Journey, perspective and Mallow line rows (B3, B5, B7) | When the words are cleared, also clear the label, consent times, client id and Mallow line id. Delete the rows once no report on them still holds evidence. | The metadata says something about the person and serves nothing once the words are gone. Reports cascade with the journey, so wait for them. |
| Holds and exposures (B8, B9) | Delete when the journey's words are cleared | Needed only while a feeling can travel |
| Saved feelings (B1) | Owner to choose: keep while the account is used; for example, delete the data of accounts with no sign-in for 24 months, after an email notice 30 days before | Saved words, including other people's perspectives, have no limit today. The notice email must be a plain service message (research item SCW-12). |
| Report rows (C2) | 365 days after the decision, remove who reported and who it was about. Keep the reason, outcome and times, about nobody. | Repeat patterns and accountability for a year, matching the audit log |
| Desk notes (C3) | Clear with the report's evidence (90 days after the decision, 180 days if undecided) | They describe a report whose words are already gone |
| Blocks (C4) | Delete when either member deletes their data | Useless after that |
| The C1 details gap | Clear details on decided reports whatever the evidence holds | Fixes an unlimited case |
| Rate-limit events (D1) | Either clear them in the minute tick, or say "up to 3 days" in the policy | The policy should match the code |
| AI usage (B11), only if AI is ever on | Keep member ids 90 days, then totals only | Cost limits need recent detail only |
| Online Safety compliance record (L5), only if advice says it applies | A non-personal record of moderation actions (counts, decision types, dates), kept at least 2 years after the end of each calendar year | Meets the record duty without keeping the audit log's member ids for longer |
| A health records law minimum (L7), only if advice says it applies | Re-plan the whole schedule | It would conflict with the 30-day clearing and with member deletion |

---

## 11. Where other documents disagree with the code

Not edited here, except where a row says it was fixed in a draft. Each is for that document's owner.

| Document | What it says | What the code does |
|---|---|---|
| `docs/legal/PRIVACY_POLICY.md`, "How long we keep things" | Request records: "48 hours" | Deleted at the first daily run after 48 hours: up to about 72 hours (D1). **Fixed in the draft** on 15 October 2026: it now says "up to 3 days" (and "up to 8 days" for daily Mallow counts, B10) |
| `docs/legal/PRIVACY_POLICY.md`, "A feeling you let go" | "Its words are cleared straight away" | True for the feeling's words. The steps, choices and the hidden perspectives' words go at the 30-day clearing (§3.1). |
| `docs/legal/PRIVACY_POLICY.md`, "A feeling you let go"; `COLLECTION_NOTICE_AND_CONSENT.md` §4.5, §4.10 and §6 (catcher and withdrawal wording) | Was: "Perspectives you chose to keep stay with you"; the catcher's perspective "is cleared when their feeling's words are cleared" | Kept perspectives on an unsaved let-go feeling are cleared at the 30-day clearing, 30 days after it came home (`api.sql:169-177`, `status in ('returned', 'released') and not saved`); "Save my journey" is hidden once a feeling is released (`ui/relay/returned.js:235`). Only a feeling saved before letting go keeps them, with no limit (app-facts P11). **Fixed in the drafts** on 15 October 2026. **Still in the app:** the let-go confirmation "Any perspectives you chose to keep stay with you." (`ui/relay/returned.js:293`) needs the same qualification |
| `docs/legal/PRIVACY_POLICY.md`, "A journey you delete" | "Every word on it is cleared straight away" | Except set-aside perspectives, cleared at the next daily run, up to a day later (B4 note) |
| `docs/legal/PRIVACY_POLICY.md`, "Words copied into a report" | Cleared 90 or 180 days after | True, except the details gap under C1 |
| `docs/RELAY.md:357` | "Deleted journeys and accounts: removed at once, and from backups within their rotation" | Words are removed at once; the rows stay (soft delete, §4). Nothing re-applies deletions after a restore (§5.3). |
| `docs/READINESS.md:121` | Retention marked done | True for what it lists. It leaves out the records with no end date (§10). |
| `docs/ESCALATION.md` §5 | Retention clears report evidence | True. Desk notes are not cleared (C3). |

---

## 12. Facts to confirm [NOT CONFIRMED]

Check each on staging or with the provider. Record the answer here.

1. Supabase Auth: which tables hold a user's records (users, sessions, refresh tokens, one-time tokens, the Auth audit
   log); whether they hold IP addresses or browser details; and **what deleting a user removes**. Test: delete a
   staging test user, then look for its id and email in each Auth table.
2. Whether Supabase creates the Auth user when a code is requested, or only when it's used (A2).
3. Supabase platform log contents and retention on the chosen plan (D4, E6).
4. Cloudflare Pages request logs and any cookies it sets (E7, G4).
5. The email provider's records and retention, once chosen (E8, decision D5).
6. pg_cron's time zone on Supabase (§3.2), and how long `cron.job_run_details` keeps its history.
7. The backup plan: Free (none) or Pro (7 days) (decision D3); whether Pro backups include the Auth schema; whether
   Supabase keeps any other copies.
8. How long Postgres remnants and write-ahead log segments persist on Supabase (§6).
9. Supabase's disk encryption [DOC `docs/BACKEND.md:59`].

---

## 13. Sources

Official sources were seen only as search-tool extracts or summaries. No official site could be opened from this
environment. Items marked "from memory" were not seen at all and must be checked before anyone relies on them.

- **Privacy Act 1988 (Cth)**, Schedule 1 (APPs 11 and 12): https://www.legislation.gov.au/C2004A03712/latest/text
  (official text; not opened; the series id is from memory). APP 11.2 wording: from memory and an earlier-run
  extract of the OAIC guide below.
- **OAIC, Guide to securing personal information**:
  https://www.oaic.gov.au/agencies-and-organisations/guides/guide-to-securing-personal-information (official guidance;
  earlier-run search extract, not re-seen). The guide is not legally binding, but the OAIC refers to it in
  investigations. Reasonable steps include technical and organisational measures (2024 amendment).
- **OAIC, Dealing with requests for access to personal information**:
  https://www.oaic.gov.au/privacy/privacy-guidance-for-organisations-and-government-agencies/handling-personal-information/dealing-with-requests-for-access-to-personal-information
  (official guidance; earlier-run search extract, not re-seen).
- **OAIC, APP Guidelines Chapter B (key concepts)**:
  https://www.oaic.gov.au/privacy/australian-privacy-principles/australian-privacy-principles-guidelines/chapter-b-key-concepts
  (official guidance; search extract quoting s6D(4)(b)).
- **OAIC, Statutory tort for serious invasions of privacy**:
  https://www.oaic.gov.au/privacy/your-privacy-rights/more-privacy-rights/statutory-tort-for-serious-invasions-of-privacy
  (official guidance; earlier-run search extract, not re-seen).
- **eSafety, Online Safety (Designated Internet Services—Class 1A and Class 1B Material) Industry Standard 2024**:
  https://www.esafety.gov.au/sites/default/files/2024-06/Online-Safety-DesignatedInternetServices-Class1AClass1B-IndustryStandard2024.pdf
  (official text; search extract; may be the draft). The 2-year record rule is quoted in L5.
- **eSafety, minimum-age regulatory guidance media release**:
  https://www.esafety.gov.au/newsroom/media-releases/new-regulatory-guidance-released-to-support-social-media-industry-ahead-of-minimum-age-law
  (official guidance; search extract).
- **OAIC, Privacy Guidance on Part 4A (Social Media Minimum Age)**:
  https://www.oaic.gov.au/__data/assets/pdf_file/0025/257146/OAIC-SMMA-Privacy-Guidance.pdf (title only seen).
- **Victoria, Health Records Act**: https://www.health.vic.gov.au/legislation/health-records-act (official guidance;
  search extract; no retention rule seen). **NSW, Health Records and Information Privacy Act 2002**:
  https://legislation.nsw.gov.au/view/whole/html/inforce/current/act-2002-071 (official text; search extract; no
  retention rule seen). The 7-year minimums in L7 are from memory.
- **Australian Consumer Law s18**, Competition and Consumer Act 2010 (Cth) Sch 2 (not opened; from memory). ACCC
  pages were seen only as search extracts.
- **The code**: as cited inline, re-checked at commit `0773d1e` (first drafted at `000c0cd`; the migrations cited
  by line are unchanged between the two).
