# Hushmates · eSafety Safety by Design self-assessment (start-up): prepared answers

**Prepared 15 October 2026 against the repository at commit `000c0cd`, and updated the same day after the
Tier 0 fixes, for the owner to carry into eSafety's free Safety by Design start-up assessment tool.**
Tier 0 item D6a (`docs/DECISIONS.md:33`, `docs/REVIEWS.md:105-106`).

**Line numbers** (`file:line`) are at `000c0cd`. The Tier 0 fixes moved many of them. Where an answer
describes something fixed after `000c0cd`, it names the file (and function) without a line number.

> **Read this first: where these answers come from.**
> - **This was written from my own knowledge of the frameworks**: eSafety's three Safety by Design
>   principles and what its start-up assessment asks about, and the ACSQHC's National Safety and
>   Quality Digital Mental Health (NSQDMH) Standards. **This environment cannot open esafety.gov.au or
>   safetyandquality.gov.au.** The repository's own research hit the same block (`docs/REVIEWS.md:9`).
> - **So the live tool's question wording, order, number of questions and answer choices will differ
>   from this page.** Match each real question to the nearest area here *by meaning*. Where the tool
>   asks something this page doesn't cover, answer from the evidence index (§9) or answer "not yet".
> - **The NSQDMH part (§7) is a voluntary checklist only.** Hushmates is not accredited, isn't seeking
>   accreditation, and provides no clinical care. Nothing here may be used to say that it "meets",
>   "aligns with" or "complies with" those Standards.
> - **This is not legal or clinical advice.** Where an answer depends on a lawyer (the Online Safety
>   codes, the under-16 law, privacy) or on the Tier A clinical reviewer, it says so.
> - **Answer honestly, including "no".** The tool's report is for you. An inflated answer only gets you
>   a less useful report, and a record that could later read as an overstated safety claim
>   (Australian Consumer Law, `docs/REVIEWS.md:67`).
> - **Stage.** Nothing is deployed yet. Staging waits on the owner's accounts, and the next step is a
>   team-only beta (`docs/LAUNCH_READINESS.md:3-6`). Each answer below says what is **built**
>   (tested locally) and what is **planned before outside testers**. Where the tool asks "do you…",
>   answer for what is built, and use any free-text box for the plan.

## Changed since this was prepared

The Tier 0 fixes (15 October 2026) changed the items below. §1–§5 and the status line of each finding in
§6 already reflect them. The full Tier 0 record is `docs/safety/TIER0_SELF_ASSESSMENT.md`.

**Fixed:**
- **SBD-01, support on every screen.** A *Support* pill is now in the header of every screen
  (`ui/relay/common.js`: `supportPill` and `openSupport`, used by `top()` and `brandBar()`, and on the
  welcome, sign-in, invitation, offline and deleted screens). It opens the crisis lines in a sheet over
  the current screen. The support screen itself shows the lines directly. The E2E opens it on five
  screens (`tools/app-shots.mjs`).
- **SBD-02, abuse aimed at readers.** A feeling that tells readers to hurt themselves ("kys whoever
  catches this") is refused. One that quotes what someone said to the writer ("they keep telling me to
  kys") gets the harassment care screen (`core/feeling-safety.js`, `screenFeeling`). Perspectives that
  urge self-harm, give diet, medication or drinking advice, or ask someone's age or location, to meet,
  or for pictures are blocked (`screenReframe`).
- **SBD-06, response times.** Reporters are now told: a small team, not around the clock; priority
  reports read within a day during the pilot (nights, weekends and holidays can take longer), others
  within two days; the team can't see who wrote it or contact them; call 000 if someone is in danger
  now (`core/relay.js` `_expectation`; `supabase/migrations/20261015090000_hushmates_tier0.sql`). The
  team's own target stays 12 hours for priority reports, and `docs/ESCALATION.md` now describes what the
  app says. A new setting, `desk.awayUntil`, tells reporters when the desk will be read while nobody can.
- **SBD-13, the document.** `docs/CRISIS_DETECTION.md` §6 now says nothing counts support screens.
- **SBD-15, postcodes.** Australian postcodes with context ("postcode 3065", "VIC 3065") are refused.
  A bare suburb and number ("Fitzroy 3065") is still released: a bare four-digit number is usually a year.
- **SBD-16, `docs/SAFETY_AND_PRIVACY.md`.** Updated: Australian lines, no AI behind the Mallow, honest
  response times, postcodes, and the relay-wide pause marked not built.
- **SBD-21, the desk guide.** Its urgent steps now run in the same order as `docs/ESCALATION.md` §3
  (`staff/desk-guide.js`, checked by `tests/desk-guide.test.mjs`). The note box now says "No diagnosis,
  no guesses about who anyone is" (`staff/desk.js`).
- **D8, "Share anonymously".** The release consent now reads "Share with Hushmates participants, without
  my name" (`ui/relay/release.js`). The export file's key changed with it, to `agreedToShareWithoutYourNameAt`.

**Drafted, awaiting the owner's approval and legal review** (`docs/legal/`; none is in force or linked
in the app):
- SBD-03: terms of use and community guidelines (`TERMS_OF_USE.md`, `COMMUNITY_GUIDELINES.md`).
- SBD-05: the privacy policy, and the collection notice and consent wording (`PRIVACY_POLICY.md`,
  `COLLECTION_NOTICE_AND_CONSENT.md`). The breach-response plan is being drafted.
- SBD-10: the Online Safety risk-tier record, the eSafety contact and the police-request note are being
  drafted.
- SBD-12: a "Decisions made automatically" section in the draft privacy policy.

**Still open:**
- **SBD-04:** nobody is named as safety lead or desk reader. (The desk now marks a priority report still
  open after 12 hours *Over 12 hours*, and says that nothing alerts anyone while it's closed.)
- **SBD-07:** no contact channel and no appeal route in the app.
- **SBD-08, partly:** paused feelings, and feelings the safety team brought home, now show neutral wording
  and a *Get support now* button, the same whatever the reason (`ui/relay/journeys.js`,
  `ui/relay/returned.js`). Whether to say more to the writer is Tier A's call.
- **SBD-09:** the WHS psychosocial risk assessment for the desk.
- **SBD-11:** the relay-wide pause isn't built. The desk-away setting tells reporters when the desk will
  be read; pausing invitations is manual (no new codes, revoke unused ones).
- **SBD-14:** no reports summary.
- **SBD-17:** catching still starts on at the welcome. Whether to keep it is an owner decision.
- **SBD-18:** the support lines may leave out groups (Tier A).
- **SBD-19:** the label still says "Automatically generated". The welcome and You & safety now say Mallow
  lines are "chosen automatically from lines the Hushmates team wrote". Changing the label is an owner
  decision, pending.
- **SBD-20:** no incident and learning log.

**New since this was prepared: the Tier 0 probe.** On 246 new developer-written phrasings
(`docs/clinical/tier0-probe-results.csv`), the screen showed crisis or danger support for **25 of the 127**
meant as crisis or danger, both before and after the fixes. The fixes repaired bugs, not vocabulary. That
is evidence of gaps, not a measured rate. Answer every question about detection with this in mind.

---

## 1. About the service (for the tool's opening questions)

| Question the tool is likely to ask | Answer for Hushmates | Evidence |
|---|---|---|
| What is it? | A non-clinical, playful emotional-companion feature of Hushmallow. A person writes a short feeling. Up to five other members ("catchers") may each write one short, kind perspective. After 24 hours, or after five perspectives, the feeling comes home. If the writer opted in and nobody has written within 30 minutes, a Mallow (a cartoon character) offers one line from a fixed library | `core/relay-rules.js:11-14`, `ui/relay/welcome.js:19-24`, `ui/relay/parts.js:184` |
| Who is it for? | Adults (18+, self-declared), by invitation only, in Australia | `ui/relay/invite.js:45-50`, `supabase/migrations/20261014090000_hushmates_schema.sql:64` |
| How do users interact? | Text only, asynchronous, one-to-few. **No direct messages, reply threads, profiles, follower counts or "who caught it".** Pseudonyms are never shown to other people | `docs/SAFETY_AND_PRIVACY.md:76-79` |
| What can't be shared? | Images or files (there's no upload). Links, contact details, outside usernames and money requests are refused in feelings and in perspectives. A share picture is made on the person's own device and nothing is uploaded | `core/text-policy.js:25-62`, `docs/SAFETY_AND_PRIVACY.md:131` |
| Is there AI? | **No.** Mallow lines are chosen automatically from a fixed library. An optional AI path exists in the code, but it is off with a cap of A$0, and turning it on needs a separate owner decision (D10) | `docs/LAUNCH_READINESS.md:52`, `docs/DECISIONS.md:50`, `supabase/functions/_shared/ai-another-angle.js` |
| Moderation | Keyword rules ("the safety screen") run before anything travels, then people report, then a small human safety desk decides. **The desk is not staffed around the clock, and Hushmates is not an emergency service.** Reporters are told so | `core/feeling-safety.js:193-247`, `docs/ESCALATION.md:22-28`, `ui/relay/welcome.js:104`; now `core/relay.js` `_expectation` |
| Where is data held? | Supabase, Sydney region. Words are encrypted before they reach the database | `docs/READINESS.md:69`, `docs/DECISIONS.md:10` |
| Size and stage | Start-up, owner plus developer. Pre-staging. Team-only beta next, then up to about 30 invited adults (D12) | `docs/DECISIONS.md:40` |
| Recommender or engagement features? | None. Which feeling you catch is picked at random from the few that have waited longest. There are no streaks, scores, likes or live counts | `supabase/migrations/20261014090100_hushmates_rules.sql:560-576`, `ui/relay/you.js:67`, `docs/SAFETY_AND_PRIVACY.md:111-115` |
| Advertising or monetisation | Not described in the repository. Answer from the owner's plan | — |

---

## 2. Summary

### Strengths you can state with confidence

1. **Safety by architecture.** The common online-harm routes (grooming, sextortion, pile-ons and doxxing by direct contact) have no channel. There is no messaging, no profiles, no images and no links, contact details are refused, nobody can contact anyone, and a feeling reaches at most five people for at most a day (`docs/SAFETY_AND_PRIVACY.md:76-79`, `core/text-policy.js:25-62`, `core/relay-config.js:9-16`).
2. **Support comes before sharing.** Words the screen recognises as a sign someone may not be safe are never sent and never stored. The person sees Australian crisis lines they can tap to call instead. This happens on the device and again on the server (`ui/relay/release.js:157-158`, `supabase/functions/_shared/gateway.js:71-77`, `core/feeling-safety.js:107-150`). It applies to catchers too (`supabase/functions/_shared/gateway.js:85-95`). A *Support* pill in the header of every screen opens the crisis lines at any time (now `ui/relay/common.js`).
3. **Reporting at the point of harm**, with a priority lane. "Someone may be in danger" goes to the top of the desk's queue and pauses the feeling straight away (`core/relay-config.js:33-41`, `supabase/migrations/20261014090100_hushmates_rules.sql:905-911`, `supabase/migrations/20261014090000_hushmates_schema.sql:204-208`).
4. **Honest framing in the app.** It says "pseudonymous, not perfectly anonymous", "not an emergency service" and "it can miss things". Mallow lines are always labelled and never counted as people (`ui/relay/welcome.js:101-104`, `ui/relay/you.js:49,66`, `core/relay-config.js:45-49`). Reporters are told the team is small, isn't there around the clock, and can't see who anyone is or contact them (now `core/relay.js` `_expectation`).
5. **Privacy-protective defaults and user control**: consent each time, the Mallow off by default, share-picture permission off by default, export, delete everything, and retention limits (`ui/relay/release.js:26,101-117`, `ui/relay/you.js:73-76,112-117`, `supabase/migrations/20261014090000_hushmates_schema.sql:40`).

### The biggest gaps

1. **Nobody is named yet** as safety lead or desk reader. A priority report raises no alert, and the desk is to be checked twice a day (`docs/ESCALATION.md:22-23`, `docs/READINESS.md:186`).
2. **The screen misses many natural phrasings.** On the Tier 0 probe it showed crisis or danger support for 25 of 127 phrasings meant as crisis or danger (developer-written, so evidence of gaps, not a measured rate). New vocabulary waits for the batch after Tier A (`docs/CRISIS_DETECTION.md` §3, step 5).
3. **No terms of use or community guidelines are in force**, and there is no published route to ask for a review of a decision. Drafts now exist in `docs/legal/`, awaiting the owner's approval and legal review (SBD-03, SBD-07).
4. **The legal paperwork isn't approved**: the privacy policy and collection notice are drafts; the breach plan, the Online Safety risk-tier record and the eSafety contact address are still being drafted (SBD-05, SBD-10).
5. **The desk team's wellbeing** (a WHS duty) and the **escalation procedure** are drafts with no independent review (SBD-09, `docs/ESCALATION.md:6-7`).

### The smallest free actions, in order

| # | Action | Who | Finding |
|---|---|---|---|
| 1 | Write the safety lead's and two desk readers' names into `docs/ESCALATION.md:22-23`, and give each a moderator invitation (`node server/admin.mjs invite --role moderator`) | Owner | SBD-04 |
| 2 | **Done (Tier 0):** *Support* is in the header of every screen, and the documents that relied on it are correct now | Developer | SBD-01 |
| 3 | **Done (Tier 0):** feelings that tell readers to hurt themselves never travel: they get crisis support (the writer may be talking to themselves), and quoted ones get the harassment care screen. Both directions are tested | Developer | SBD-02 |
| 4 | **Done (Tier 0):** the reporter's response-time message and the escalation procedure agree (the app: within a day; the team's own target: 12 hours). The owner can still change the wording | Developer; owner to confirm | SBD-06 |
| 5 | **Drafted:** a community guideline and short terms (`docs/legal/`). Approve them, then link them at the invitation and in You & safety | Developer drafted, owner approves | SBD-03 |
| 6 | Create one monitored safety mailbox. Use it as the eSafety contact, and show it in You & safety for questions and reviews of decisions | Owner | SBD-07, SBD-10 |
| 7 | Write the one-page WHS psychosocial risk assessment for the desk | Owner | SBD-09 |
| 8 | Finish the Online Safety risk-tier record and the breach-response plan from free official templates (being drafted) | Developer drafts, owner approves | SBD-05, SBD-10 |
| 9 | Add a switch that pauses the whole relay (not built) | Developer | SBD-11 |
| 10 | **Done (Tier 0):** the documents that drifted from the code were corrected, and Australian postcodes with context are refused | Developer | SBD-13, 15, 16 |

---

## 3. Principle 1: Service provider responsibility

### 1.1 Named responsibility for user safety

- **Today:**
  - Two roles are defined. The **desk readers** check the desk "every day, morning and evening", with a second person for days off. The **safety lead** decides anything uncertain, owns the procedure and checks the activity log weekly (`docs/ESCALATION.md:22-23`).
  - Moderator is a separate role, enforced on the server (`supabase/migrations/20261014090000_hushmates_schema.sql:57`, `supabase/functions/_shared/gateway.js:26`).
  - Desk accounts are kept apart from member accounts (`staff/desk.js:129-135`).
  - The owner's decisions are logged (`docs/DECISIONS.md`).
- **Gap:** every name is blank (`docs/ESCALATION.md:22-23`), and D12 is open (`docs/DECISIONS.md:40`).
- **Smallest free action:** the owner fills in the names and issues the moderator invitations (`server/admin.mjs:6`).
- **Suggested answer:** *In progress*. The roles are defined; the people are named before the team beta.

### 1.2 Risk assessment

- **Today:**
  - `docs/RISKS.md` ranks every open risk by likelihood × harm, with the stage each one blocks (`docs/RISKS.md:3-20`). It covers:
    - the screen missing words (S1, `:31`);
    - someone in danger who can't be reached (S3, `:32`);
    - harm to moderators (S5, `:42`);
    - unkind perspectives (S4, `:44`);
    - people identifying themselves (P6, `:45`).
  - `docs/REVIEWS.md:57-77` maps each legal duty as mandatory, advisable or optional.
  - `docs/CRISIS_DETECTION.md:8-19` assesses the screen's ceiling.
  - Five adversarial review rounds have been run (`docs/RISKS.md:52`), and a Tier 0 self-assessment (`docs/safety/TIER0_SELF_ASSESSMENT.md`).
- **Gaps:**
  - (a) There is no harm-by-harm risk-tier record in the form the Online Safety codes expect, for class 1 and self-harm material (`docs/RISKS.md:34`, `docs/REVIEWS.md:62-63`). It is being drafted (SBD-10).
  - (b) At `000c0cd` the register didn't cover harmful content carried **in feelings** to catchers. The register now has a row for it (S11).
  - (c) There is no PIA (`docs/RISKS.md:24`) and no WHS assessment (`docs/RISKS.md:42`).
- **Smallest free action:**
  - Turn the harm table in §1.3 into the risk-tier record.
  - Self-run the PIA with the OAIC's template (D7a, `docs/DECISIONS.md:41`).
- **Suggested answer:** *Partly*. A written risk register exists; the code-specific tier record, the PIA and the WHS assessment don't yet.

### 1.3 Safety in product design (what the design rules out)

This is the strongest part of the assessment. Use it for any "how did you design for safety" question.

| Harm | Could it happen on Hushmates? | What prevents or limits it today | What's left |
|---|---|---|---|
| Grooming, sextortion, unwanted contact | Only through words | No DMs, profiles or reply threads (`docs/SAFETY_AND_PRIVACY.md:78-79`). Contact details, @handles, messaging-app names and links are refused in feelings and perspectives (`core/text-policy.js:25-51`, `core/feeling-safety.js:206-211,240-242`). Perspectives that ask someone's age or location, to meet, or for pictures are blocked (now `screenReframe`). 18+, invitation-only | Identity can be described in words (P6). Australian postcodes are refused only with context ("postcode 3065", "VIC 3065"); a bare suburb and number isn't (SBD-15) |
| Image-based abuse | No | There is no upload. Share pictures are drawn on the person's own device from consented text (`docs/SAFETY_AND_PRIVACY.md:131-138`) | A picture already made can't be recalled (P4, by design; people are told) |
| A catcher harassing or bullying a writer | Through a perspective | Every perspective is screened for unkindness, diagnosing and near-copies (`core/feeling-safety.js:163-174,238-245`), and now for urging self-harm and for diet, medication or drinking advice. The writer can report it, which hides it at once, and can block (`ui/relay/returned.js:255-258`). Restriction (`staff/desk-guide.js:12-13`) | Unkindness the patterns don't know. Reports cover it |
| A writer abusing catchers, or urging them to self-harm | Through a feeling | Crisis words are held back. A feeling that tells readers to hurt themselves never travels; it gets crisis support ("kys whoever catches this"); one that quotes what someone said to the writer gets the harassment care screen (now `screenFeeling`). Catchers can let it float past, report or block (`ui/relay/catch.js:163,445-456`). Two reports pause it (`core/relay-rules.js:26`) | Other insults aimed at readers ("whoever reads this, you are pathetic") are still released. Reports cover them |
| Someone disclosing suicide or self-harm risk | Yes; this is the central risk | Held back with tappable support lines, never stored (`core/feeling-safety.js:193-204`). Methods said with intent are in the rules (`:63-70`). Someone else in danger gets its own screen (`:73-79,134-140`). *Support* on every screen | Keyword rules miss things (S1): on the Tier 0 probe, support for 25 of 127 crisis or danger phrasings. The "are you safe?" check-in isn't built (`docs/CRISIS_DETECTION.md:61-73`) |
| Contagion: method detail, pointers to pro-harm sites | Limited | Method phrasings are held back. Links are refused | Methods described in ways the rules don't know |
| Sexual content | Through words | "Sexual content" is a report reason (`core/relay-config.js:37`). There are no images | No text rule for sexual content was found in `core/feeling-safety.js`, `core/text-policy.js` or the shared lexicon. Reports only |
| Scams, money requests | Through words | Money and payment patterns are refused (`core/text-policy.js:52-61`) | — |
| Hate | Through words | Report reason "Harassment or hate". A feeling *about* discrimination gets a care screen (`core/feeling-safety.js:130`) | No hate-speech rule for perspectives beyond the unkindness patterns. Reports only |
| Harm from the Mallow's automatic lines | Low | A fixed library, screened like a person's words. Grief, harm and health never get "unfair load" lines (`core/perspectives.js:148`). At Tier 0 all 342 lines were read twice: 40 rewritten, 51 left out, 32 kept. Harm or control at home now gets tender openers only | Not yet reviewed by a clinician: Tier A reads the 291 lines in use (`docs/clinical/mallow-library-for-review.csv`) |
| Leaning on the app instead of real help | Possible | "Not an emergency service" before anyone begins (`ui/relay/welcome.js:104`); crisis lines in the app, and *Support* in every screen's header (SBD-01, fixed) | — |
| Compulsive use | Low | No streaks, scores, likes or recommender (`ui/relay/you.js:67`). Rate limits (`core/relay-rules.js:16-20`). At most three feelings travelling at once (`core/relay-config.js:11`) | — |
| Harm to moderators | Yes | Only reported content is shown, with no identities (`staff/desk.js:264-282`). A self-care step (`docs/ESCALATION.md:39-42`) | WHS assessment outstanding (SBD-09) |

- **Suggested answer:** *Yes*. Describe the architecture above.

### 1.4 Detecting, limiting and removing harmful content

- **Today:**
  - Every rule reads a normalised copy (NFKC), so stylised or full-width letters can't slip past (`core/feeling-safety.js:12-17`). Since Tier 0 it also drops accents, combining marks and invisible characters, reads Cyrillic and Greek look-alike letters as Latin, and reads runs of spaces as one. Safety is checked before length.
  - Rules run on the device and again in the server function (`ui/relay/release.js:157-158`, `supabase/functions/_shared/gateway.js:75-77`).
  - Perspectives are screened too (`core/feeling-safety.js:224-247`).
  - Feelings that tell readers to hurt themselves never travel; they get crisis support (SBD-02, fixed).
  - Automatic pausing: two independent reports, or one "Someone may be in danger" (`supabase/migrations/20261014090100_hushmates_rules.sql:905-911`).
  - The desk can resume, take a feeling out of circulation, remove a perspective, or restrict an account (`staff/desk-guide.js:8-24`, `supabase/migrations/20261014090100_hushmates_rules.sql:1100-1133`).
  - About 330 phrasings are pinned in CI, plus a 379-phrasing blind sheet (`tests/fixtures/mallow-probes.json`, `docs/clinical/crisis-phrasings-for-review.csv`). The 379 are the development and regression set, not a test set.
  - A hash pin on the shared lexicon fails CI until Hushmates' safety lead reviews any upstream change (now `tests/tier0-screen.test.mjs`).
- **Gaps:**
  - The rules have a ceiling (`docs/CRISIS_DETECTION.md:8-19`) and haven't been independently reviewed (`docs/LAUNCH_READINESS.md:46`). The Tier 0 probe: support for 25 of 127 crisis or danger phrasings.
  - There's no way to pause the whole relay (SBD-11).
- **Smallest free action:** SBD-11. Then Tier A (D6c/D6d).
- **Suggested answer:** *Yes, for this stage*: rules, then reports, then human review. Say plainly that the screen isn't independently reviewed, and that a developer probe found it misses many natural phrasings.

### 1.5 Reporting, triage and escalation

- **Today:**
  - People report from where they see the content: a catcher reports a feeling (`ui/relay/catch.js:445-466`), and a writer reports a perspective (`ui/relay/returned.js:255-258`). Either way it leaves the reporter's view at once (`ui/relay/catch.js:461`, `supabase/migrations/20261014090100_hushmates_rules.sql:924-935`).
  - There are seven reasons (`core/relay-config.js:33-41`). "Someone may be in danger" marks the report urgent, and the queue puts urgent reports first (`supabase/migrations/20261014090100_hushmates_rules.sql:877-881`, `supabase/migrations/20261014090000_hushmates_schema.sql:204-208`).
  - The desk marks these *Priority* and shows the urgent guide (`staff/desk.js:188,268-270`, `staff/desk-guide.js:26-41`). It now marks a priority report still open after 12 hours *Over 12 hours* (`staff/desk-guide.js` `isOverdue`).
  - There is a written procedure (`docs/ESCALATION.md:30-46`), with the team's own targets of 12 hours for priority reports and 48 hours for others (`docs/ESCALATION.md:24-28`).
  - Reporters are told honestly what to expect: a small team, not around the clock; priority reports read within a day during the pilot (nights, weekends and holidays can take longer), others within two days; the team can't see who wrote it or contact them; call 000 if someone is in danger now (SBD-06, fixed).
  - While nobody can read the desk, the owner sets `desk.awayUntil`, and reporters are told when it will be read (`node server/admin.mjs set desk '{"awayUntil": "YYYY-MM-DD"}'`).
- **Gaps:**
  - The desk isn't staffed around the clock, and nothing alerts anyone when a priority report arrives (`docs/READINESS.md:186`). The desk now says so on screen.
  - The procedure hasn't been reviewed (`docs/ESCALATION.md:6-7`).
  - Nobody is named (SBD-04).
- **Smallest free action:**
  - Name the people.
  - Set two fixed daily desk times in the readers' calendars.
  - Until there's an alert, add urgent open reports to the `ops` summary (see SBD-14) and make checking it part of the morning and evening routine.
- **Suggested answer:** *Yes (built), part-time desk.* In the free text: "Out of hours, the in-app crisis lines (24/7 national services) carry imminent risk. The desk is not an emergency service, and reporters are told it isn't there around the clock."

### 1.6 Working with emergency services, support services, eSafety and police

- **Today:**
  - The team calls 000 only when the words point to immediate danger *and* the team independently holds information that identifies the person (`docs/ESCALATION.md:36`, `staff/desk-guide.js:30`).
  - Crisis lines are shown in the app (`core/feeling-safety.js:109-123`), from the *Support* pill on every screen, and on the desk (`staff/desk-guide.js:34-41`).
- **Gaps:**
  - No monitored contact for eSafety removal notices, which must be actioned within 24 hours (`docs/RISKS.md:34`, `docs/REVIEWS.md:64`).
  - No written procedure for a police or court request for information (being drafted, SBD-10).
  - Still open: whether the account email may ever be used in imminent danger (the "serious threat" exception) (`docs/REVIEWS.md:130`, `docs/RISKS.md:32`).
  - The two free emails to Mindframe and Samaritans haven't been sent (`docs/REVIEWS.md:108`).
- **Smallest free action:**
  - Create one safety mailbox and monitor it daily.
  - Write a half-page "requests from police or eSafety" note: who receives them, how to verify the requester, disclose the minimum, record it, and get legal advice before disclosing anything.
  - Put the email question to Tier A and the lawyer.
- **Suggested answer:** *Partly.*

### 1.7 Terms, community standards and the "social contract" at sign-up

- **Today:**
  - Sign-up asks for an invitation, a private name and an 18+ confirmation (`ui/relay/invite.js:43-50`).
  - The welcome makes four promises: pseudonymous, possibilities not verdicts, people first, not an emergency service (`ui/relay/welcome.js:101-104`).
  - There is consent at every release (`ui/relay/release.js:101-106`).
  - The desk's decision table is in effect the internal enforcement guide (`docs/ESCALATION.md:48-55`).
  - Draft terms of use and community guidelines now exist (`docs/legal/TERMS_OF_USE.md`, `docs/legal/COMMUNITY_GUIDELINES.md`), awaiting the owner's approval and legal review.
- **Gap:**
  - **No terms of use or community guidelines are in force**, and the app doesn't link any. At `000c0cd` nothing in `ui/`, `app/`, `staff/` or `docs/` contained them (`docs/READINESS.md:159`, `docs/LAUNCH_READINESS.md:68`).
  - At `000c0cd`, `docs/RISKS.md:33` listed "the terms" as in place. That was not accurate (SBD-03). The register now says the drafts aren't in force.
- **Smallest free action:** the owner approves the drafts (a lawyer's check is advisable, D7). They should cover:
  - what's welcome;
  - what isn't, mirroring the seven report reasons;
  - what the team may do (pause, remove, restrict);
  - how to ask for a review.

  Then link both from the invitation screen and You & safety.
- **Suggested answer:** *Not yet* (drafts written, not in force).

### 1.8 Staff training and wellbeing

- **Today:**
  - The procedure has a self-care step (`docs/ESCALATION.md:39-42`), and the desk guide repeats it (`staff/desk-guide.js:32`).
  - The desk shows only reported words, never identities (`supabase/migrations/20261014090100_hushmates_rules.sql:1087-1095`).
  - It signs out after 30 minutes idle (`staff/desk.js:14,320-324`).
  - Optional training is proposed: LivingWorks Start, about A$40 a person (`docs/DECISIONS.md:34`).
- **Gaps:**
  - The WHS psychosocial risk assessment is outstanding. It is a legal duty once anyone but the owner reads the desk (`docs/READINESS.md:225`, `docs/RISKS.md:42`, `docs/REVIEWS.md:71`).
  - "Nobody reads the desk alone for long stretches" (`docs/ESCALATION.md:42`) is backed by no control.
  - Priority evidence is shown in full the moment a report opens (`staff/desk.js:271-275`).
  - There's no debrief process.
- **Smallest free action:** the owner writes a one-page WHS assessment:
  - the hazard: reading distressing words;
  - a maximum sitting length the team agrees;
  - a debrief after every priority report;
  - opting out with no penalty;
  - support lines for the reader;
  - rotation.

  Optional for the developer: a "show the words" step on priority reports.
- **Suggested answer:** *In progress.*

### 1.9 Security, incidents and continuity

- **Today:**
  - Words are encrypted with AES-256-GCM before the database sees them (`docs/READINESS.md:69`).
  - RLS is on every table with no grants (`docs/READINESS.md:68`).
  - A strict CSP (`docs/READINESS.md:128`).
  - Passwordless email-code sign-in plus an invitation (`docs/READINESS.md:84-85`).
  - Every desk view and decision is audited (`supabase/migrations/20261014090100_hushmates_rules.sql:1086,1138`).
  - Retention limits (`supabase/migrations/20261014090000_hushmates_schema.sql:40`).
  - A backup-restore drill (`docs/READINESS.md:76`).
- **Gaps:**
  - No breach-response plan (`docs/RISKS.md:24`). Being drafted (SBD-05).
  - No backups on the Free plan (`docs/RISKS.md:25`).
  - No relay-wide pause (`docs/SAFETY_AND_PRIVACY.md` §6 now marks it not built). The operator tool has no such command (`server/admin.mjs:6-11`); the new `desk` setting only changes what reporters are told.
  - No external penetration test (`docs/RISKS.md:52`).
  - One key holder (D11).
- **Smallest free action:**
  - A one-page breach plan from the OAIC's Notifiable Data Breaches guidance.
  - The pause switch (SBD-11).
  - A weekly `pg_dump` with a named owner while on Free.
- **Suggested answer:** *Partly.*

---

## 4. Principle 2: User empowerment and autonomy

### 2.1 User controls: blocking, muting, skipping, stepping away

- **Today:**

  | Control | Evidence |
  |---|---|
  | *Let it float past* (skip a feeling) | `ui/relay/catch.js:163` |
  | *Don't show me their feelings*: works both ways and never tells the other person | `ui/relay/catch.js:455`, `ui/relay/returned.js:255`, `supabase/migrations/20261014090100_hushmates_rules.sql:938`, `docs/SAFETY_AND_PRIVACY.md:83-87` |
  | Turn catching off entirely | `ui/relay/you.js:53` |
  | Reporting hides the item from the reporter at once | `ui/relay/catch.js:461`, `ui/relay/returned.js:258` |
  | Keep a feeling, or let it go | `ui/relay/returned.js:224-225` |
  | Delete a journey | `docs/SAFETY_AND_PRIVACY.md:167-170` |
  | Delete all your data | `ui/relay/you.js:112-117` |
  | Take back a perspective you gave | `ui/relay/you.js:100-104` |
  | Decide, per perspective, whether it may appear in a share picture | `ui/relay/you.js:94-97` |
  | The Mallow is opt-in | `ui/relay/release.js:108-117` |
  | Sounds and notices | `ui/relay/you.js:54-55` |

- **Gap:**
  - Muting is all or nothing. A catcher can't avoid a *kind* of feeling (for example sadness) without turning catching off.
  - A restricted person isn't told why (see 2.4).
- **Smallest free action:** none needed for the beta. Later, let catchers skip feeling labels they'd rather not receive. The labels already exist (`core/relay-config.js:18-27`).
- **Suggested answer:** *Yes.*

### 2.2 Privacy and safety by default

- **Today:**
  - Pseudonymous: the name is never shown to anyone else (`ui/relay/you.js:48`, `docs/SAFETY_AND_PRIVACY.md:76-77`).
  - Consent is unticked for every feeling (`ui/relay/release.js:26,101-106,147`), and the server refuses a release without it (`core/relay-messages.js:23`).
  - The consent reads "Share with Hushmates participants, without my name" (D8, applied after Tier 0).
  - The Mallow is off by default (`ui/relay/release.js:26`).
  - A contributor's share permission is off by default (`docs/SAFETY_AND_PRIVACY.md:135-138`).
  - Share pictures are made on the device (`docs/SAFETY_AND_PRIVACY.md:131`).
  - The email address is used only to sign in (`ui/relay/parts.js:185`).
  - Networks are kept only as keyed hashes, for rate limits (`docs/READINESS.md:120`).
  - Export and delete (`ui/relay/you.js:73-76`); retention (`supabase/migrations/20261014090000_hushmates_schema.sql:40`).
- **Gaps:**
  - "Let feelings find me" starts on at the welcome (`ui/relay/welcome.js:32,107`), so new members can receive strangers' feelings unless they switch it off (SBD-17).
  - There's no approved privacy policy or collection notice. Drafts exist in `docs/legal/` (SBD-05).
- **Smallest free action:**
  - Consider making catching an explicit choice at the welcome.
  - D7a: approve the privacy policy and notice.
- **Suggested answer:** *Yes*, with the missing policy noted.

### 2.3 Prompts and nudges at the moment of risk

- **Today:**
  - The release hint: "Please leave out identifying details" (`ui/relay/release.js:104`).
  - Each refusal says why (`core/feeling-safety.js:207-214`, `core/text-policy.js:28,42,54`).
  - Perspectives get gentle redirects ("Offer a possibility, not a verdict", "Please don't diagnose anyone"), a near-copy prompt and a certainty nudge (`core/feeling-safety.js:238-246`). Since Tier 0, a perspective that urges self-harm, or gives diet, medication or drinking advice, or asks personal questions, is stopped with a reason.
  - A support screen appears instead of a release, and says plainly that nothing was sent or saved (`ui/relay/support.js:32-37`).
  - Catchers are told who will read their words before they write (`ui/relay/parts.js:182`).
- **Gap:** the "are you safe right now?" check-in for the uncertain middle isn't built. It waits on Tier A (`docs/CRISIS_DETECTION.md:61-73`).
- **Suggested answer:** *Yes.*

### 2.4 Reporting tools that report back: status, outcomes, appeals

- **Today:**
  - After a report, a thank-you sheet sets an honest expectation (`ui/relay/catch.js:466`, `supabase/migrations/20261014090100_hushmates_rules.sql:858-862`; the wording is now in `supabase/migrations/20261015090000_hushmates_tier0.sql`) and says "Nobody is told who reported" (`ui/relay/common.js:102`). The report sheet itself now says the team isn't there around the clock and can't contact anyone, and, when "Someone may be in danger" is chosen, to call 000 if someone is in danger right now.
  - Writers whose feeling was removed now see "Our safety team brought it home early. Sometimes a feeling needs more care than a new way of seeing it. If that's true for you right now, support is here any time", with a *Get support now* button (`ui/relay/returned.js`).
  - A paused feeling now reads "Paused for now, until a person on our safety team can read it", with a *Get support now* button (`ui/relay/journeys.js`).
- **Gaps:**
  - Reporters never hear an outcome.
  - A restricted person sees only "Our safety team has paused your account for now" (`ui/relay/catch.js:434`), with no reason and no route to ask.
  - Lifting a restriction is an operator command, not something the desk can do (`docs/READINESS.md:207`, `server/admin.mjs:11`).
  - **There is no contact channel anywhere in the app.** No address, no form, no `mailto:` in `ui/`. Yet the procedure's 000 example assumes someone "emailed us directly" (`docs/ESCALATION.md:36`).
  - No appeal process (`docs/READINESS.md:159`). See SBD-07.
- **Smallest free action:**
  - The monitored safety mailbox from 1.6, shown in You & safety ("Questions about a decision, or want us to look again?") and in the restricted and removed messages.
  - A three-line review rule in the guidelines: a different team member looks again, and replies within a stated time.
- **Suggested answer:** *Partly.*

### 2.5 Clear consequences for breaking the rules

- **Today:**
  - Internal ladder (`docs/ESCALATION.md:48-55`):
    - unkindness: removed, then the account restricted after a second actioned report;
    - sexual content, spam and scams: removed and restricted.
  - The desk sees earlier reports about the same person without their identity (`staff/desk.js:276-278`).
- **Gaps:**
  - Users are told none of this.
  - Restriction has no review date.
- **Smallest free action:**
  - Put the ladder into the guidelines (1.7).
  - Add "review each restriction after 30 days" to `ESCALATION.md` §4 (the owner picks the period).
- **Suggested answer:** *Partly (internal only).*

### 2.6 Age and vulnerable users

- **Age today:**
  - Invitation-only, and only the owner and admins make invitations (`docs/REVIEWS.md:218-221`).
  - 18+ is self-declared at the invitation (`ui/relay/invite.js:50`) and at the welcome (`ui/relay/welcome.js:108`), and recorded as required (`supabase/migrations/20261014090000_hushmates_schema.sql:64`).
  - Desk staff confirm too (`staff/desk.js:123`).
- **Age gap:**
  - Self-declaration is proportionate for a team beta. Whether the under-16 social media law applies is open, and a tick alone wouldn't be "reasonable steps" (`docs/RISKS.md:33`, `docs/REVIEWS.md:66`).
  - Nothing helps a minor who gets in anyway.
- **Vulnerable users today.** People in distress are the main vulnerable group, and the design centres them:
  - tappable Australian lines (`core/feeling-safety.js:107-123`, `ui/relay/common.js:67-74`), and a *Support* pill in the header of every screen (SBD-01, fixed);
  - 13YARN for Aboriginal and Torres Strait Islander people (`core/feeling-safety.js:113`);
  - 1800RESPECT for abuse and violence (`:114,122`), and since Tier 0 for threats, fear and stalking too;
  - findahelpline.com outside Australia (`:117`);
  - separate care screens for abuse, violence, threats, harassment and discrimination (`:125-132`);
  - crisis words win over abuse words in the same feeling (`docs/READINESS.md:168`);
  - catchers who write crisis words get support too (`core/feeling-safety.js:231-234`);
  - paused and removed feelings show neutral wording and a *Get support now* button (SBD-08, partly).
- **Vulnerable-user gaps:**
  - Whether a writer whose feeling was paused after a danger report should be told more is Tier A's call (SBD-08).
  - English only (`docs/READINESS.md:204`). The app now says the check reads English only.
  - Lines that Tier A could consider (SBD-18). **I took these numbers from memory: verify each on the service's own site before using it.**
    - TIS National interpreting: 131 450;
    - QLife (LGBTIQ+): 1800 184 527;
    - Kids Helpline (ages 5–25, for a minor who gets in): 1800 55 1800;
    - Lifeline's text service.
  - The lines and their wording await Tier A (`docs/READINESS.md:96`).
- **Smallest free action:**
  - Keep invitations to people the owner knows are adults, with a simple log of who was invited and when.
  - Add the candidate lines to the Tier A pack as a question.
  - The lawyer before a public launch (D9).
- **Suggested answer:** *Partly.*

### 2.7 Accessibility and inclusion

- **Today:**
  - Labels, roles, live regions, focus order, keyboard-only release and reduced motion are tested in the browser (`docs/RISKS.md:47`, `docs/LAUNCH_READINESS.md:102`).
  - Layouts are checked from 320 to 1440 px wide.
- **Gaps:**
  - No hands-on screen-reader testing (`docs/RISKS.md:47`).
  - Safari and real phones haven't been tested (`docs/LAUNCH_READINESS.md:34`).
- **Smallest free action:** one hour with VoiceOver and TalkBack along release → support screen → the *Support* pill.
- **Suggested answer:** *Partly.*

---

## 5. Principle 3: Transparency and accountability

### 3.1 Rules people can find and understand

- **Today:**
  - *Privacy details* is one tap away from the invitation, the welcome, the release and You & safety (`ui/relay/parts.js:178-187`, `ui/relay/invite.js:54`, `ui/relay/welcome.js:105`, `ui/relay/release.js:105`, `ui/relay/you.js:50`).
  - Promises appear at the welcome and in You & safety (`ui/relay/welcome.js:101-104`, `ui/relay/you.js:61-67`).
  - The report reasons are, in effect, the list of what isn't allowed.
- **Gaps:**
  - No guidelines, terms, privacy policy or collection notice in force. Drafts await approval (SBD-03, SBD-05).
  - No way to tell people when rules change.
- **Smallest free action:** approve SBD-03's drafts, plus a line saying the app will tell people when the guidelines change.
- **Suggested answer:** *Partly.*

### 3.2 Openness about automated decisions

- **Today:**
  - The screen is described honestly. The welcome now says "Hushmates checks words for some signs that someone might not be safe, and shows numbers to call. The check reads English only, it can miss things, and nobody is watching in real time" (`ui/relay/welcome.js`). You & safety says the same (`ui/relay/you.js`).
  - Mallow lines are labelled "Automatically generated" and never counted as a person (`core/relay-config.js:45-49`, `docs/SAFETY_AND_PRIVACY.md:102-110`). The welcome and You & safety describe them as "chosen automatically from lines the Hushmates team wrote".
  - The privacy sheet says they come from Hushmates' own library (`ui/relay/parts.js:184`).
  - The documents forbid "detects", "validated" and "clinically reviewed" (`docs/REVIEWS.md:211`, `docs/CRISIS_DETECTION.md:116`).
- **Gaps:**
  - No approved policy text yet describes the three automated decisions:
    - the screen;
    - automatic pausing after reports (`supabase/migrations/20261014090100_hushmates_rules.sql:908`);
    - Mallow lines.

    Such a description is likely to be required from **10 December 2026** (APP 1.7; `docs/CRISIS_DETECTION.md:151`, `docs/READINESS.md:143`). The draft privacy policy now has a "Decisions made automatically" section (`docs/legal/PRIVACY_POLICY.md`), awaiting approval and legal review (SBD-12).
  - "Automatically *generated*" may suggest generative AI for what is a line picked from a fixed library (SBD-19). Changing it is an owner decision, pending.
- **Smallest free action:** approve the draft section (D7a).
- **Suggested answer:** *Partly.*

### 3.3 Transparency about enforcement

- **Today:**
  - The activity log records every look and decision, never anyone's words (`staff/desk.js:297-316`, `docs/ESCALATION.md:59`).
  - Each report row has its reason, the urgent flag, its status and when it was decided (`supabase/migrations/20261014090000_hushmates_schema.sql:203-208`).
- **Gaps:**
  - The operator summary shows only the number of open reports (`supabase/migrations/20261014090200_hushmates_api.sql:273-281`). The first-month review needs priority counts and response times (`docs/ESCALATION.md:63-71`).
  - The support screen is counted nowhere (SBD-13). The documents now say so.
  - Nothing is published.
- **Smallest free action:**
  - A read-only reports summary: counts by reason, priority count, time to decision, and the number over target (SBD-14).
  - After the first month, a short counts-only note to testers.
- **Suggested answer:** *Not yet (planned).*

### 3.4 Honest claims

- **Today:**
  - "Pseudonymous, not perfectly anonymous" (`ui/relay/welcome.js:101`, `ui/relay/you.js:49`, `ui/relay/parts.js:183`).
  - "Share with Hushmates participants, without my name" at every release (D8, applied).
  - "Not an emergency service".
  - "It can miss things", and "the check reads English only".
  - Reporters are told the team is small, isn't there around the clock, and can't contact anyone.
  - A list of clinical claims never to make (`docs/REVIEWS.md:68,211`, `docs/RISKS.md:49`).
  - Share stories use the journey's real numbers (`docs/SAFETY_AND_PRIVACY.md:111-115`).
- **Gaps:**
  - The "Automatically generated" label (SBD-19, owner decision).
  - At `000c0cd` several documents overstated the code (§6: SBD-01, 03, 13, 15, 16). They were corrected after Tier 0.
- **Smallest free action:** decide SBD-19.
- **Suggested answer:** *Yes* for the app's own copy, with SBD-19 noted.

### 3.5 Engaging experts, users and lived experience

- **Today:**
  - The Tier 0 → Tier A plan (`docs/REVIEWS.md:97-149`). Tier 0's developer part is done (`docs/safety/TIER0_SELF_ASSESSMENT.md`).
  - The blind sheets are ready: the Tier A sheet with display ids (`docs/clinical/tier-a-sample-display.csv`, 108 rows; its key stays with the developers), the Mallow library (`docs/clinical/mallow-library-for-review.csv`, the 291 lines in use; 342 were reviewed at Tier 0), and the Tier 0 probe as a supplementary sheet (`docs/clinical/tier0-probe-blind.csv`, 246 rows).
  - A quote request pack (`docs/REVIEW_QUOTES.md`).
- **Gap:** no outside expert, user or lived-experience input yet (`docs/LAUNCH_READINESS.md:54`). Lived experience comes in only at Tier B, on a trigger (`docs/REVIEWS.md:178`).
- **Smallest free action:**
  - Send the D6c quote requests and the two free emails (`docs/REVIEWS.md:108`).
  - After the team beta, a five-question feedback form for testers.
- **Suggested answer:** *Planned.*

### 3.6 Continuous improvement

- **Today:**
  - Governance for the screen (`docs/CRISIS_DETECTION.md:105-110`):
    - no change without the motivating phrasings added and labelled;
    - changes in monthly batches;
    - a locked test set nobody tunes against. **It hasn't been built yet**: the 379 are the development and regression set, not a test set.
  - The CI fixture holds every past decision (`docs/CRISIS_DETECTION.md:13`).
  - A hash pin on the shared lexicon fails CI until Hushmates' safety lead reviews any upstream change (`tests/tier0-screen.test.mjs`).
  - Confirmed misses are paraphrased into the set (`docs/ESCALATION.md:38`).
  - A Mallow line that missed is noted for the library (`staff/desk-guide.js:21-23`).
  - A review after the first month (`docs/ESCALATION.md:63-71`).
  - The risk register is updated each phase (`docs/RISKS.md:65-74`).
- **Gap:** no incident and learning log. The activity log records actions, not lessons. There's no feedback channel for users.
- **Smallest free action:** a one-table log kept by the safety lead (SBD-20), never holding anyone's words. Columns:
  - date;
  - report reference;
  - category;
  - hours to first look;
  - outcome;
  - what we learnt;
  - what changed.
- **Suggested answer:** *Yes* for the screen's process; *partly* overall.

### 3.7 Safety built into roles and daily practice

- **Today:**
  - The urgent guide is on the desk itself (`staff/desk.js:268-270`), in the same order as the procedure (SBD-21, fixed).
  - Every action explains its effect (`staff/desk-guide.js:8-24`).
  - Guidance for team notes (`docs/ESCALATION.md:60`), and the note box now repeats it: "No diagnosis, no guesses about who anyone is".
- **Gaps:** none found beyond naming the people (SBD-04).
- **Smallest free action:** none.
- **Suggested answer:** *Yes.*

---

## 6. Problems found while preparing this (fix before you answer)

Each was checked against the code at `000c0cd`. "Free now" means the developer can do it today, at no cost, without the clinician, the lawyer or an owner decision. The **Now:** line at the start of each problem is its status after the Tier 0 fixes; the rest of each row is as found at `000c0cd`.

| ID | Severity | Problem | Evidence | Fix | Free now |
|---|---|---|---|---|---|
| SBD-01 | High | **Now: fixed.** *Support* is in the header of every screen. At `000c0cd`: *Get support now* wasn't on every screen, although `ESCALATION.md:18`, `CRISIS_DETECTION.md:157`, `LAUNCH_READINESS.md:47`, `REVIEWS.md:217` and the S1 mitigation (`RISKS.md:31`) all said it was | It existed only inside You & safety (`ui/relay/you.js:69-71`). The main screens showed a shield labelled "You and safety" (`ui/relay/common.js:45-49`), so it was two taps away. Catching and writing (`ui/relay/catch.js:147,245`), the journey detail (`ui/relay/journeys.js:111`), homecoming (`ui/relay/returned.js:118,468`), share (`ui/relay/share.js:33`) and Your data (`ui/relay/your-data.js:28`) had only a back button. The E2E reached it through You & safety (`tools/app-shots.mjs:674-681`) | Done: a *Support* pill in `top()` and `brandBar()` and the other headers, using the same sheet (`ui/relay/common.js` `supportPill`). The E2E checks it on five screens | Yes |
| SBD-02 | High | **Now: fixed.** At `000c0cd`: feelings weren't screened for abuse or self-harm incitement aimed at catchers | `screenFeeling` applied no unkindness check (`core/feeling-safety.js:193-216`). `UNKIND` (`:163-168`, including "kill yourself"/"kys") ran only on perspectives (`:238`). Probe run here: "kys whoever catches this" and "Whoever reads this, you are pathetic and should kill yourself" were both **released**. S4 (`RISKS.md:44`) covered perspectives only | Done: a feeling that tells readers to hurt themselves never travels. It gets crisis support, because the writer may be saying it to themselves ("I keep telling myself kys"); quoted harassment ("they keep telling me to kys") gets the harassment care screen (`core/feeling-safety.js`, `screenFeeling`). This reuses the existing incitement pattern and adds no crisis vocabulary, so the frozen-floor rule (`CRISIS_DETECTION.md` §3) isn't broken. Add the wording and the routing to the Tier A pack | Yes |
| SBD-03 | High | **Now: drafted, not in force** (`docs/legal/TERMS_OF_USE.md`, `docs/legal/COMMUNITY_GUIDELINES.md`). At `000c0cd`: no terms of use or community guidelines, yet `RISKS.md:33` listed "the terms" as in place | No terms or guidelines in `ui/`, `app/` or `staff/`. `READINESS.md:159`, `LAUNCH_READINESS.md:68` | The owner approves the drafts (lawyer advisable), then link them at the invitation and in You & safety. The risk register now says the drafts aren't in force | No (owner approves; lawyer advisable) |
| SBD-04 | High | **Now: open.** No named safety lead or desk readers. Twice-daily checks with no alert for a priority report | `ESCALATION.md:22-23` (blank), `DECISIONS.md:40` (D12), `READINESS.md:186` (no alerts) | Name the people. Set fixed desk times. Make urgent open reports visible in `admin ops` (SBD-14) until an alert exists. (The desk now marks a priority report *Over 12 hours*) | No (owner) |
| SBD-05 | High | **Now: partly drafted.** The privacy policy and the collection notice and consent wording are drafts (`docs/legal/`); the breach plan is being drafted. None is approved. At `000c0cd`: none of these was written | `RISKS.md:24` (rated Critical), `REVIEWS.md:59`, `LAUNCH_READINESS.md:67` | D7a: the developer drafts from the OAIC's free guides, the owner approves, and a lawyer checks later | No (owner, D7a) |
| SBD-06 | Medium | **Now: fixed.** At `000c0cd`: reporters were told one response time and the procedure said another; the procedure also claimed the app promised nothing | The app said "we aim to look within **24 hours**" for priority reports and 48 hours otherwise (`supabase/migrations/20261014090100_hushmates_rules.sql:858-862`, `core/relay.js:820-824`). `ESCALATION.md:25-28` said **12 hours**, and that "the app does not promise them to anyone". `SAFETY_AND_PRIVACY.md:189` said 24 | Done: the app says priority reports are read "within a day" during the pilot (nights, weekends and holidays can take longer) and others within two days, that the team is small and not around the clock, and that it can't contact anyone. The 12-hour target stays the team's own. `ESCALATION.md` and `SAFETY_AND_PRIVACY.md` agree. Still ask Tier A whether "If you know someone is in danger right now, call 000" is the right line for a catcher who can't know who wrote the feeling | Yes (aligning the documents); the number is the owner's |
| SBD-07 | Medium | **Now: open.** No feedback loop, appeal or contact channel | Restricted people see "Our safety team has paused your account for now" with no reason or route (`ui/relay/catch.js:434`). Removed content: `ui/relay/returned.js:26,125`. Restrictions are lifted only by command (`READINESS.md:207`). No address, form or `mailto:` anywhere in `ui/`. `ESCALATION.md:36` assumes people can email the team | A monitored mailbox, shown in You & safety and in the restricted and removed messages. A review-of-decision rule in the guidelines. Later, an in-app outcome for reporters (the status is already stored) | No (owner creates the mailbox) |
| SBD-08 | Medium | **Now: partly done.** Paused and removed feelings show neutral wording and a *Get support now* button, whatever the reason (`ui/relay/journeys.js`, `ui/relay/returned.js`). At `000c0cd`: a writer whose feeling was paused or removed after "Someone may be in danger" was never offered support. That is the only channel to someone the desk can't contact | `READINESS.md:106` ("not built"). Paused: `ui/relay/journeys.js:59,133`. Removed: `ui/relay/returned.js:125`. Auto-pause: `supabase/migrations/20261014090100_hushmates_rules.sql:908` | The neutral interim is done. Tier A decides whether to say more | No (Tier A, owner) |
| SBD-09 | Medium | **Now: open.** Moderator wellbeing is procedural only | WHS assessment outstanding (`READINESS.md:225`, `RISKS.md:42`). Evidence shown at once (`staff/desk.js:271-275`). Nothing backs "nobody reads the desk alone for long stretches" (`ESCALATION.md:42`) | A one-page WHS assessment (1.8). Optionally, a "show the words" step for priority reports | No (owner) |
| SBD-10 | Medium | **Now: being drafted.** Online Safety Act records are missing: risk tiers, an eSafety removal-notice contact, a police-request procedure | `RISKS.md:34`, `REVIEWS.md:62-64`. Nothing in the repository covered police requests | A tier record (§1.3 table), the mailbox (SBD-07), and a half-page request procedure (1.6) | No (owner; lawyer confirmation advisable) |
| SBD-11 | Medium | **Now: open (not built).** No switch to pause the whole relay in an incident | `SAFETY_AND_PRIVACY.md:201` (unchecked). The operator commands (`server/admin.mjs:6-11`) have none. The new `desk.awayUntil` setting only changes what reporters are told; pausing invitations is manual | A `relay.paused` setting, checked by release and find, set with `admin set`. Test it | Yes |
| SBD-12 | Medium | **Now: drafted.** A "Decisions made automatically" section is in the draft privacy policy (`docs/legal/PRIVACY_POLICY.md`), awaiting approval. At `000c0cd`: the automated decisions weren't described for users in a policy. Likely due from 10 December 2026 | The screen; automatic pausing (`supabase/migrations/20261014090100_hushmates_rules.sql:908`); Mallow lines. `CRISIS_DETECTION.md:151`, `READINESS.md:143` | The owner approves the section (D7a) | No (owner, D7a) |
| SBD-13 | Low | **Now: the document is fixed.** At `000c0cd`: nothing counted how often the support screen was shown, though the documents said "only counts are kept (`ops_daily`)". Still nothing counts it | `CRISIS_DETECTION.md:145`. The only counters are `find`, `mallow-*` and `job-tick` (`supabase/migrations/20261014090100_hushmates_rules.sql:604,848,853`, `supabase/migrations/20261014090200_hushmates_api.sql:128`). The support path returns without counting (`supabase/functions/_shared/gateway.js:77,95,108`). The device-side screen (`ui/relay/release.js:158`) sends nothing | Done: `CRISIS_DETECTION.md` §6 corrected. With the PIA, decide whether to count server-side support answers per day, unlinked to anyone | Yes (the document) |
| SBD-14 | Low | **Now: open.** There's no reports summary for the first-month review or a transparency note | `supabase/migrations/20261014090200_hushmates_api.sql:273-281` (only `openReports`); `ESCALATION.md:63-71` | A read-only query or `admin.mjs reports`: counts by reason, priority, median and maximum time to decision, and the number over target | Yes |
| SBD-15 | Low | **Now: fixed.** Australian postcodes with context are refused. At `000c0cd`: Australian postcodes weren't refused, though `SAFETY_AND_PRIVACY.md:30` said postcodes were | `IDENTIFYING` covered street addresses, UK postcodes and US ZIP codes only (`core/feeling-safety.js:155-161`). Probe run here: "I live in Fitzroy 3065 and I feel so lonely lately" was **released** (it still is: a bare suburb and number) | Done: an Australian rule with context ("postcode 3065", "VIC 3065"; a bare four-digit number is usually a year), tested both ways (`tests/tier0-screen.test.mjs`), and `SAFETY_AND_PRIVACY.md` corrected | Yes |
| SBD-16 | Low | **Now: fixed.** At `000c0cd`: `SAFETY_AND_PRIVACY.md` was out of date | `:179` listed Samaritans 116 123 and 988, but the code ships Australian lines (`core/feeling-safety.js:109-123`). `:33,91` described AI behind the Mallow, but AI is off and the Mallow uses a library (`LAUNCH_READINESS.md:52`, `ui/relay/parts.js:184`). `:189` gave 24 h. This document is likely to reach the Tier A reviewer | Done: §1, §3, §5 and §6 now match the code | Yes |
| SBD-17 | Low | **Now: open (owner decision).** Catching starts on at the welcome, so new members are opted in to reading strangers' feelings | `ui/relay/welcome.js:32,107` (`p.catching !== false`) | Make it an explicit choice (no preset), or keep it with the owner's reason recorded | Yes (with the owner's nod) |
| SBD-18 | Low | **Now: open (Tier A).** The support lines may leave out groups Hushmates will serve | Today: 000, Lifeline, Suicide Call Back, 13YARN, 1800RESPECT, Beyond Blue, findahelpline (`core/feeling-safety.js:109-123`). English only (`READINESS.md:204`) | Ask Tier A about interpreting, LGBTIQ+, text-based and under-25 lines (numbers in 2.6, from memory; verify them) | No (Tier A) |
| SBD-19 | Low | **Now: open (owner decision).** The welcome and You & safety now say "chosen automatically from lines the Hushmates team wrote", but the label still says "Automatically **generated**", which may suggest generative AI for a line picked from a fixed library | `core/relay-config.js:47-48`. The privacy sheet explains the library (`ui/relay/parts.js:184`). The label is pinned in share pictures and tests | Consider "Chosen automatically from Hushmates' library". Owner and legal view (it's a transparency claim) | No (owner) |
| SBD-20 | Low | **Now: open.** No incident and learning log | The activity log holds actions only (`staff/desk.js:297-316`) | The one-table log in 3.6, kept by the safety lead | Yes (the template) |
| SBD-21 | Low | **Now: fixed.** At `000c0cd`: the desk's urgent steps didn't match the procedure, and the note box gave no guidance | `ESCALATION.md:35-37` took the feeling out of circulation first, then 000 if identifiable. `staff/desk-guide.js:30-31` put 000 first and said "Otherwise take the feeling out of circulation". The note label (`staff/desk.js:286`) didn't say "no diagnosis or guesses" (`ESCALATION.md:60`). A danger report already pauses the feeling (`supabase/migrations/20261014090100_hushmates_rules.sql:908`), so the step order is about clarity, not exposure | Done: the desk guide follows the procedure's order (checked by `tests/desk-guide.test.mjs`), and the note label carries the reminder | Yes |

---

## 7. NSQDMH Standards: a voluntary checklist, not accreditation

> **Status.**
> - The ACSQHC's National Safety and Quality Digital Mental Health Standards (2020) are voluntary.
>   Peer-to-peer services fall within their scope, but implementing them is optional
>   (`docs/REVIEWS.md:74`).
> - Hushmates **is not accredited, is not seeking accreditation, and provides no clinical care.**
>   Saying publicly that it "meets" or "is aligned with" these Standards would also cut against its
>   non-clinical, non-therapeutic positioning: TGA intended purpose and consumer law (`docs/RISKS.md:49`,
>   `docs/REVIEWS.md:68`).
> - It is used here only as a list of good questions.
>
> **What I worked from.**
> - My own knowledge of the three Standards and their criteria headings (as best I recall them),
>   summarised as action *themes*.
> - The ACSQHC's free self-assessment tool lists the individual numbered actions. The repository records
>   59 (`docs/REVIEWS.md:106`).
> - **I have deliberately not given action numbers**, because I couldn't check them. When you fill in
>   the real tool, map each numbered action to the nearest theme below.
>
> **How to rate in the real tool.**
> - Mark the clinical actions "not applicable", with the reason "Hushmates provides no clinical care".
> - Never mark "met" where only a plan exists.

Key: **Applies** = it makes sense as written. **Adapted** = the intent applies to a non-clinical
peer service in a reworded form. **No** = it is about clinical care, and Hushmates must not claim it.

### Standard 1: Clinical and Technical Governance

| Criterion / action theme | Applies? | Hushmates today | Gap → smallest free action |
|---|---|---|---|
| **Governance, leadership, culture:** an accountable owner of safety and quality, and a safety culture | Adapted | The owner decides and the developer recommends (`docs/DECISIONS.md:3`). The safety lead's role is defined (`docs/ESCALATION.md:23`) | Names blank → SBD-04. Write a one-paragraph "who decides safety" statement |
| Clinical leadership | No | No clinicians deliver anything | Don't claim it. The Tier A adviser advises; they don't govern |
| **Safety and quality systems:** policies and procedures | Applies | `ESCALATION.md`, the desk guide, the screen's governance (`docs/CRISIS_DETECTION.md:93-110`) | Terms, guidelines and privacy policy are drafts awaiting approval; the breach plan is being drafted → SBD-03, SBD-05 |
| Measurement and quality improvement | Applies | The evaluation harness (`tools/safety-eval.mjs`), about 330 fixture phrasings, and the Tier 0 probe (246 phrasings written apart from the rules) | No locked test set yet. No live safety metrics → SBD-13, SBD-14 |
| Risk management | Applies | `docs/RISKS.md` | Online Safety tier record → SBD-10 |
| Incident management, and being open when things go wrong | Adapted | The desk handles reports. Misses are paraphrased into the set (`docs/ESCALATION.md:38`) | No incident log → SBD-20. Decide what you'd tell testers after a serious incident |
| Feedback and complaints | Applies | Reports | No complaint or appeal route → SBD-07 |
| Diversity and high-risk groups | Applies | 13YARN, 1800RESPECT, care screens (`core/feeling-safety.js:113-132`) | CALD, LGBTIQ+, screen readers → SBD-18, 2.7 |
| Health care records | No (as clinical records) | Not a health record. Data handling is covered under privacy below | — |
| **Performance and effectiveness:** safety training for the workforce | Adapted | The desk guide; optional LivingWorks (`docs/DECISIONS.md:34`) | Decide on D6b |
| Credentialing and scope of clinical practice | No (for Hushmates). Adapted for the reviewer | — | Check the Tier A reviewer's registration and indemnity (`docs/REVIEWS.md:117-121`) |
| Safety roles and responsibilities | Applies | `docs/ESCALATION.md:20-28` | SBD-04 |
| Evidence-based practice | Adapted | Design choices cite research (`docs/CRISIS_DETECTION.md:21-42`). No efficacy claims | Keep it that way: never "reduces anxiety" (`docs/REVIEWS.md:68`) |
| **Safe digital environment:** information security | Applies | Encryption, RLS, CSP, audit (`docs/READINESS.md:68-69,128`) | Breach plan → SBD-05. Penetration test before launch (D14) |
| Privacy and data management | Applies | Consent, export, deletion, retention (`docs/READINESS.md:112-120`) | Policy (drafted), PIA, automated-decision wording (drafted) → SBD-05, SBD-12 |
| Reliability, testing, change and release control | Applies | At `000c0cd`: 377 of 379 tests passing (2 optional skips); staging guards (`docs/LAUNCH_READINESS.md:96-103`). Tier 0 added tests (`tests/tier0-screen.test.mjs`, `tests/desk-guide.test.mjs`, `tests/lexicon-invariant.test.mjs`) | Not yet on real infrastructure (`docs/LAUNCH_READINESS.md:81`). Alerts (`docs/READINESS.md:186`) |
| Business continuity and backups | Applies | Restore drill (`docs/READINESS.md:76`) | No backups on Free (`docs/RISKS.md:25`), no pause switch → SBD-11 |
| Suppliers and third parties | Applies | Supabase, Sydney | Data processing terms (`docs/READINESS.md:159-163`) |
| Usability and accessibility | Applies | Browser checks (`docs/RISKS.md:47`) | Hands-on screen-reader testing (2.7) |
| Accurate information about the service | Applies | The no-claims list (`docs/REVIEWS.md:211`) | Copy audit; SBD-19 → 3.4 |

### Standard 2: Partnering with Healthcare Consumers

| Criterion / action theme | Applies? | Hushmates today | Gap → smallest free action |
|---|---|---|---|
| **Governance and improvement systems support partnering with users** | Adapted | — | Nothing yet → a tester feedback form after the team beta |
| **Partnering in their own care:** rights and informed consent | Adapted (as user rights and consent) | Consent before a feeling travels and for the Mallow. The server refuses without it (`ui/relay/release.js:101-117`, `core/relay-messages.js:23`). Privacy details before any choice (`ui/relay/parts.js:178-187`) | No written "your rights here" in force → fold it into the guidelines and the privacy policy (both drafted) |
| Shared decisions and care planning | No | There is no care | — |
| Information about purpose, limits, who it's for and not for | Applies | The welcome's four promises (`ui/relay/welcome.js:101-104`) | Say plainly, in one line, who it isn't for: "If you're in crisis right now, Hushmates can't help in time; here's who can" (Tier A wording) |
| **Health literacy:** communication people can understand and use | Applies | Plain, warm copy | No reading-age check, English only → run a free readability check on the support screen and the privacy details |
| **Partnering in organisational design and governance:** users and lived experience involved in design and evaluation | Applies | None yet (`docs/REVIEWS.md:178`) | Ask two or three team-beta testers to review the support screens. Lived experience at Tier B |
| Training staff to partner with users | Adapted | — | Not proportionate at this size |

### Standard 3: Model of Care

| Criterion / action theme | Applies? | Hushmates today | Gap → smallest free action |
|---|---|---|---|
| **Define the model:** purpose, target users, how it works, its limits, its evidence | Adapted (as a "service model", not a model of care) | `docs/RELAY.md`, the welcome | No one-page description of the service and its limits → write one. It also serves as part 1 of the Tier A pack (`docs/REVIEWS.md:127`) |
| Eligibility, and who it isn't suitable for | Applies | 18+, invitation-only | State the "not for crisis" limit at the welcome (Partnering, above) |
| Assessment, diagnosis, treatment planning, clinical interventions | **No** | None, by design. Perspectives that diagnose are refused (`core/feeling-safety.js:170-174,239`) | Must stay out (TGA, `docs/REVIEWS.md:68`) |
| **Minimise harm:** identify and manage safety risks, including harmful content | Applies | The screen, reports, the desk. Reader-directed incitement refused in feelings (SBD-02, fixed) | The screen's vocabulary gaps (Tier 0 probe) → Tier A, then one batch |
| Support for people in distress | Applies | Support screens with tappable lines; *Support* in every screen's header (SBD-01, fixed) | SBD-08 (partly done) |
| **Communicating for safety:** identifying the user correctly | No | Pseudonymous by design. A deliberate trade-off (S3, `docs/RISKS.md:32`) | Document the trade-off. Don't adopt clinical identification |
| Passing on critical information, handover, referral | Adapted | "Referral" means showing national lines. No warm handover is possible | Say so honestly. Tier A reviews it |
| **Recognise and respond to acute risk** of harm to self or others | Adapted | Rules plus danger reports. The procedure (`docs/ESCALATION.md:30-46`) | Tier A review of the categories, the 108 phrasings, the Tier 0 probe and the procedure (D6d) |
| Escalation pathways, including 24/7 options | Applies | The lines shown are 24/7 services. The desk isn't, and the app says Hushmates isn't an emergency service and that the team isn't there around the clock | Name the desk (SBD-04). Keep the "not 24/7" honesty |
| Follow-up after a risk event | Adapted | The person can't be contacted (`docs/ESCALATION.md:13-15`) | The neutral support on paused and removed screens (SBD-08, partly done) is the only possible follow-up |

**Tally (my 37 themes, not the tool's actions):**

| | Standard 1 | Standard 2 | Standard 3 | Total |
|---|---:|---:|---:|---:|
| Applies | 13 | 3 | 4 | **20** |
| Adapted | 4 | 3 | 4 | **11** |
| No | 3 | 1 | 2 | **6** |

The six "No" themes are clinical leadership, clinical records, credentialing, care planning,
clinical assessment and treatment, and user identification.

In the real tool, the clinical actions should come out as "not applicable". Most of the open items
reappear as SBD findings above, so fixing those moves both assessments.

---

## 8. Wording for the tool and for anything public

| Say | Don't say |
|---|---|
| "pseudonymous: other members never see your name" | "anonymous" (the consent now says "without my name": D8) |
| "a safety screen that shows support when words suggest someone might need it, and can miss things" | "detects / predicts / monitors suicide risk"; "AI moderation" |
| "a small human safety team reads reports, not around the clock" | "24/7 moderation"; "monitored"; "we'll always respond" |
| "not an emergency service: call 000 or Lifeline 13 11 14" | "a safe space" as a guarantee; "you're safe here" |
| "Mallow lines are chosen automatically from a fixed library the Hushmates team wrote, and always labelled" | "AI companion", "therapy", "CBT", "reframing" |
| "we used the eSafety Safety by Design start-up assessment and the NSQDMH self-assessment as internal checklists" | "compliant with", "aligned with", "accredited", "meets the Standards" |
| After Tier A, only the memo's own words, e.g. "reviewed by a registered psychologist for [scope] on [date]" (`docs/REVIEWS.md:171`) | "clinically reviewed" or "validated" beyond exactly that (`docs/REVIEWS.md:211`) |

---

## 9. Evidence index (file:line, at `000c0cd`)

These line numbers are at commit `000c0cd`, before the Tier 0 fixes. Many have moved since. The files
changed by the Tier 0 fixes are listed at the end, without line numbers.

**Product and safety code**
- `core/feeling-safety.js`:
  - 12–17: normalisation;
  - 22–70: extra crisis rules;
  - 73–79: someone else in danger;
  - 107–123: Australian lines;
  - 125–150: care and support copy;
  - 155–161: identifying details;
  - 163–174: unkindness and diagnosis;
  - 193–216: `screenFeeling`;
  - 224–247: `screenReframe`.
- `core/text-policy.js:25-62`: contact details, links, money.
- `core/relay-config.js`:
  - 9–16: shown limits;
  - 33–41: report reasons;
  - 45–49: Mallow labels.
- `core/relay-rules.js`:
  - 11–14: timings;
  - 16–20: rate limits;
  - 25: fair pick;
  - 26: reports to pause.
- `core/relay.js:820-824` and `supabase/migrations/20261014090100_hushmates_rules.sql:858-862`: the reporter's expectation copy.
- `supabase/migrations/20261014090100_hushmates_rules.sql`:
  - 560–576: random fair pick;
  - 865–885: report creation and the urgent flag;
  - 905–911: automatic pause;
  - 924–935: a reported perspective hidden from its reader;
  - 938: block;
  - 1087–1095: the desk sees no reporter and no identities;
  - 1100–1133: moderator decisions.
- `supabase/migrations/20261014090000_hushmates_schema.sql`:
  - 40: retention;
  - 57–58: roles and states;
  - 64: 18+ required;
  - 203–208: reports and the urgent queue.
- `supabase/migrations/20261014090200_hushmates_api.sql:273-281`: the operator summary.
- `supabase/functions/_shared/gateway.js`:
  - 26: moderator methods;
  - 71–108: server-side screening.

**App screens**
- `ui/relay/welcome.js`:
  - 32, 107: catching starts on;
  - 101–104: promises;
  - 108: 18+.
- `ui/relay/invite.js:43-54`: invitation, 18+, privacy details.
- `ui/relay/release.js`:
  - 26: defaults;
  - 101–117: consent and the Mallow choice;
  - 157–158: screening on the device.
- `ui/relay/support.js:32-51`: the support screen.
- `ui/relay/common.js`:
  - 45–49: the top bar's shield;
  - 67–74: tappable lines;
  - 88–107: the report sheet.
- `ui/relay/catch.js`:
  - 163: float past;
  - 434: restricted copy;
  - 445–466: report and block.
- `ui/relay/returned.js`:
  - 26, 125: removed copy;
  - 224–225: keep or let go;
  - 255–258: report and block a perspective.
- `ui/relay/journeys.js:59,133`: paused copy.
- `ui/relay/you.js`:
  - 48–50: pseudonymous;
  - 53–55: controls;
  - 61–67: promises;
  - 69–71: *Get support now*;
  - 73–76, 112–117: data and delete;
  - 94–104: share permission and take back.
- `ui/relay/parts.js:178-187`: privacy details.

**Safety desk**
- `staff/desk-guide.js`:
  - 8–24: actions;
  - 26–41: urgent guide.
- `staff/desk.js`:
  - 14, 320–324: idle sign-out;
  - 123: 18+;
  - 129–135: separate accounts;
  - 188, 268–270: priority;
  - 271–286: evidence and notes;
  - 297–316: activity log.
- `server/admin.mjs:6-11`: operator commands.

**Documents**
- `docs/ESCALATION.md`, `docs/CRISIS_DETECTION.md`, `docs/READINESS.md`, `docs/RISKS.md`, `docs/REVIEWS.md`, `docs/DECISIONS.md`, `docs/LAUNCH_READINESS.md`, `docs/SAFETY_AND_PRIVACY.md`, at the lines cited above (at `000c0cd`).

**Changed by the Tier 0 fixes** (files and functions named; no line numbers, because they moved):
- `ui/relay/common.js`: `supportPill`, `openSupport`, `top()`, `brandBar()`, and the report sheet's wording (SBD-01, SBD-06).
- `ui/relay/welcome.js`, `ui/relay/sign-in.js`, `ui/relay/invite.js`, `ui/relay/away.js`, `ui/relay/you.js` (`deleted`): the *Support* pill on screens without `top()` (SBD-01).
- `ui/relay/journeys.js`, `ui/relay/returned.js`: neutral paused and removed wording, with *Get support now* (SBD-08).
- `ui/relay/release.js`: "Share with Hushmates participants, without my name" (D8).
- `core/feeling-safety.js`: `probeOf` normalisation, `INCITEMENT`, `HARMFUL_ADVICE`, `REPORTED_SPEECH`, the Australian postcode rule in `IDENTIFYING`, `HELPLINES`, `STALKING`, `STILL_HERE`, `SUPPORT_NOW_RESOURCES` (SBD-02, SBD-15).
- `core/relay.js` `_expectation` and `supabase/migrations/20261015090000_hushmates_tier0.sql` (`hushmates.expectation`, `settings.desk.awayUntil`): what reporters are told (SBD-06).
- `server/admin.mjs`: the `desk` setting.
- `staff/desk-guide.js` (`URGENT_GUIDE`, `isOverdue`) and `staff/desk.js` (the *Over 12 hours* badge, the note label) (SBD-21).
- `core/perspectives.js` (`SKIP`, `HARM_CROWDS`): the Mallow library's Tier 0 decisions (`docs/clinical/tier0-library-decisions.csv`).
- Tests: `tests/tier0-screen.test.mjs` (including the shared lexicon's hash pin), `tests/desk-guide.test.mjs`, `tests/lexicon-invariant.test.mjs`, `tests/mallow-probes.test.mjs`; the E2E checks *Support* in `tools/app-shots.mjs`.
- Documents: `docs/CRISIS_DETECTION.md`, `docs/READINESS.md`, `docs/REVIEWS.md`, `docs/SAFETY_AND_PRIVACY.md`, `docs/ESCALATION.md`, `docs/RISKS.md`; drafts in `docs/legal/`; `docs/safety/TIER0_SELF_ASSESSMENT.md`.

**Probes run for this assessment** (outside the repository; no repository file was changed):
- `/tmp/claude-0/-home-user-thinkstill-rituals/229be02c-84e1-51ab-a4d6-40174a784923/scratchpad/tier0/safety-by-design/probe.mjs`
- `/tmp/claude-0/-home-user-thinkstill-rituals/229be02c-84e1-51ab-a4d6-40174a784923/scratchpad/tier0/safety-by-design/probe2.mjs`

Both call `screenFeeling` and `screenReframe` directly.
