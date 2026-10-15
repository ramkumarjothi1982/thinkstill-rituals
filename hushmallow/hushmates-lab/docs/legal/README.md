**DRAFT, not yet reviewed or approved. It stays a draft until the owner approves it and, where marked, an Australian
lawyer has reviewed it. Not legal advice.**
**Date: 15 October 2026.**

# Hushmates · Legal and privacy drafts (`docs/legal/`)

> **Status.** Every document in this folder is a **DRAFT**, and each says so at the top. None has been approved by the
> owner, none has been seen by a lawyer, and none is in force or linked from the app. Hushmates is not live: there are
> no members outside the team, nothing is deployed, and AI is off. The GitHub repository is public today (decision
> D19 recommends making it private). Nothing here is final until the owner approves it and, where a document or a part
> is marked **needs legal advice**, an Australian lawyer has reviewed it.
>
> **How the drafts were made.** From legal research done on 15 October 2026 and from the code. No official site could
> be opened from this environment, so every legal source was seen only as a **search extract** of the official page
> (legislation.gov.au, oaic.gov.au, esafety.gov.au, tga.gov.au, accc.gov.au, safeworkaustralia.gov.au and others). Each
> draft says how each source was seen. Decision D20 (allowing those domains) would let the developer check the primary
> texts before a lawyer sees them.
>
> **Paths** are relative to `hushmallow/hushmates-lab/`, except those starting with `hushmallow/` (the main Hushmallow
> app's files, in the same repository).

---

## 1. What's in this folder

| Document | What it is | Who reads it | Status | Facts checked at | The owner approves it for |
|---|---|---|---|---|---|
| `PRIVACY_POLICY.md` | The privacy policy, written as if Hushmallow is bound by the Australian Privacy Principles | Members | **DRAFT**; has placeholders; the threshold question and several parts need legal advice | `9012d6f` | G3 (outside testers) |
| `COLLECTION_NOTICE_AND_CONSENT.md` | The short notices at each screen, and the consent design for feelings (health information) | Members (the wording); the developer (the design) | **DRAFT**; its §10 holds consent questions for the lawyer | `9012d6f` | **G2** (team beta) |
| `TERMS_OF_USE.md` | The terms, for the beta now and a paid tier later. Part B holds the drafting notes and the tests behind each clause | Members (Part A); owner and lawyer (Part B) | **DRAFT**; clauses marked **[Lawyer to review]**; Part B's tests need legal advice | `9012d6f` | **G2** |
| `COMMUNITY_GUIDELINES.md` | How to be a good Hushmate, how reporting works, what happens if the rules are broken | Members | **DRAFT**; parts marked "needs legal advice" | `9012d6f` | **G2** |
| `SAFETY_DISCLAIMERS.md` | Every piece of safety wording, place by place, with how prominent it is | Members (the words); the team | **DRAFT**; parts marked **[needs legal advice]**; the independent safety reviewer (Tier A) should read it | `9012d6f` | **G2** |
| `MODERATION.md` | The safety desk's procedure: who reads reports, response times, the urgent path, notices from eSafety, looking after desk readers | Internal | **DRAFT**; parts marked **[needs legal advice]**; in Tier A's scope | `0773d1e` (the same code as `9012d6f`) | **G2** |
| `RETENTION_AND_DELETION.md` | Everything Hushmates keeps, for how long, and how it is removed | Internal | **DRAFT**; proposals for the owner; parts need legal advice | `0773d1e` (the same code as `9012d6f`); first drafted at `000c0cd` | G3 |
| `DATA_BREACH_RESPONSE_PLAN.md` | What to do if personal information is lost or exposed | Internal | **DRAFT**; needs names; parts need legal advice | `000c0cd` (**not yet re-checked** against the current code) | G3; it asks to be approved and rehearsed once **before G2** |
| `AGE_ELIGIBILITY.md` | The 18+ rule and why; the under-16 social media law applied to the features; reasonable steps if it applies; the Children's Online Privacy Code; what to do if a member seems under 18 | Internal (the analysis); members (the proposed messages) | **DRAFT**; the under-16 tests need legal advice | `9012d6f` | G3; the lawyer's view by G4 |
| `LEGAL_REQUIREMENTS.md` | The register: every legal and safety requirement, one row each, with its source, classification, what Hushmallow does now, what's needed, the covering draft and who acts | Internal | **DRAFT** | `9012d6f` | G3 |
| `README.md` | This index, the approvals, and the questions for a lawyer | Owner, lawyer | **DRAFT** | `9012d6f` | With the drafts it indexes |

"Facts checked at" is what each draft's own header said when this index was updated; the header is the authority. The
gates are defined in `docs/LAUNCH_READINESS.md` §0: **G1** staging (test words only), **G2** team-only beta (people
the owner knows), **G3** outside testers (up to about 30 invited adults), **G4** public launch.

**Commits.** The app's code last changed at `9012d6f` (15 October 2026). Later commits (`bd653b0`, `0773d1e`) changed
only documents, so `0773d1e` and `9012d6f` describe the same app. Since the first drafts (`000c0cd`) the app has changed
in ways the drafts expected: the consent tick says "Share with Hushmates participants, without my name"; the report
acknowledgements are honest about a small team; a *Support* pill sits in the header of every screen; the welcome says
the check "reads English only, it can miss things, and nobody is watching in real time"; Mallow lines are described as
chosen automatically from a fixed set of lines written in advance. `DATA_BREACH_RESPONSE_PLAN.md` hasn't been re-checked
since `000c0cd`. Before approving any draft, check its "Now" or "In the app now" quotes against the current app.

### Words used in every draft

- **Classifications:** **verified obligation** (the law was seen, as a search extract, and binds on the known facts);
  **depends on Hushmallow's functionality or business circumstances** (which fact is named); **needs legal advice**;
  **recommended practice** (not a legal duty); and, in the register, **not applicable on the facts (test checked)**.
  Recommendations are never presented as obligations.
- **Markers:** **[GAP]** the app or a procedure doesn't do something a draft needs; **[NOT CONFIRMED]** platform
  behaviour to check; **[PROPOSAL]** something for the owner to decide; **[from memory]** law that nobody here has seen.
- **The drafting rules all of them keep:**
  - Hushmates is pseudonymous ("without my name"), never "anonymous".
  - It isn't an emergency, crisis, counselling or therapy service, and no draft makes a clinical claim.
  - Nobody is watching in real time. The small safety team reads reports, but not around the clock: during the pilot
    it *aims* to read priority reports within a day and others within two days; nights, weekends and holidays can take
    longer, and nothing alerts anyone to a new report. That is an aim, never a promise.
  - Nobody from Hushmates contacts a member about what they wrote or to check on them, and the team can't see who
    anyone is (replies to a member's own email, and notices about their account, a data breach or the service, are the
    only contact).
  - Mallow lines are chosen automatically from a fixed set of lines written in advance for Hushmallow (an opener in
    the Mallow's voice plus one perspective, 293 lines in all); AI is off. Who wrote the library is for the owner to
    confirm before any draft says "the team wrote".
  - No draft says that TGA approval or ARTG inclusion is unnecessary, or that the under-16 social media minimum age law
    does or doesn't apply. Both need legal advice.
  - One intended-purpose statement is used word for word in the Terms, the Community Guidelines and every public
    channel (store listing, website, marketing: `SAFETY_DISCLAIMERS.md` §1.1); every other safety line is checked
    against it.

---

## 2. What needs the owner

### 2.1 Approvals

**How to approve a draft** (the same steps for each one):

1. Read it in full, including the internal notes (Part B, drafting notes, hidden classification comments).
2. Check its "Now" or "In the app now" quotes against the current app; ask the developer to re-check any draft whose
   "Facts checked at" commit is older than the current code.
3. Decide each **[PROPOSAL]**, and fill each placeholder (**[contact address]**, names, the entity and ABN).
4. Confirm the facts only the owner can supply (2.3).
5. For every part marked **needs legal advice**, either have the lawyer's answer, or record that the draft is approved
   for a gate that doesn't need that answer yet (for example, a team beta).
6. Write the approval at the top of the draft: the owner's name, the date, the commit it was checked against, and the
   gate it is approved for. Until then it stays a DRAFT.
7. Re-check an approved draft whenever the app's wording or features change, and before each new gate.

**By gate:**

- **Before G2 (team beta):** read and approve the collection notice and consent wording, the terms, the community
  guidelines, the safety disclaimers and the moderation procedure, for a team beta (`docs/LAUNCH_READINESS.md` §4,
  §5). The breach plan asks to be approved with names and rehearsed once before G2 (recommended practice, PRV-16).
  **Or** let the team beta wait for a lawyer (`docs/LAUNCH_READINESS.md` §4). G2 also needs the desk readers and
  safety lead named (D12). `MODERATION.md` §7.1 asks for the lawyer's view on holding report evidence when police ask
  before the beta (question 7); if no lawyer is engaged by then, the owner decides whether the team beta goes ahead
  without it, and records that decision.
- **Before G3 (outside testers):** every draft approved; the lawyer's answers to questions 1 to 3 below
  (`docs/LAUNCH_READINESS.md` §4), to question 4 if the lawyer says so, and (recommended) to question 7; a contact
  address (D23); the Online Safety records (category, risk tier). On question 2, the lawyer may say the full answer
  can wait until G4, as long as nothing more is needed for outside testers (`docs/RISKS.md` L1).
- **Before G4 (public launch):** the lawyer's view on every question below (D7, D9); final documents.

### 2.2 Decisions the drafts depend on

| # | Decision | Why it matters to the drafts |
|---|---|---|
| D19 | **Make the repository private** (A$0) | The public repository publishes "crisis detection" plans and the main app's CBT, DBT and ACT framing. Under the TGA's rules these may count towards Hushmates' intended purpose (`LEGAL_REQUIREMENTS.md` TGA-2R). It is the cheapest risk reduction in this folder (recommended practice, not a legal duty; whether the documents count is question 3) |
| D23 | **A contact address** that isn't for emergencies | The drafts hold placeholders for it (**[contact address]**, **[privacy contact email]** and similar): privacy requests, complaints, reviews of restrictions and age decisions, accessibility help, eSafety notices |
| D12 | **Who reads the desk, the safety lead, and check times** | The app tells reporters "during the pilot we aim to read priority reports within a day, and nights, weekends and holidays can take longer", and "within two days" for other reports (`supabase/migrations/20261015090000_hushmates_tier0.sql:45-47`). The team's own target is 12 hours for priority reports (`docs/ESCALATION.md` §2), and the desk marks one open longer *Over 12 hours*, but nothing alerts anyone (`staff/desk.js:186-193, 224`). The aim needs a staffed rota behind it (consumer law, SCW-07). When nobody can read the desk, the owner sets the away notice (`node server/admin.mjs set desk '{"awayUntil":"YYYY-MM-DD"}'`, today to 90 days ahead) |
| D21 | **The Mallow label** | "A Mallow perspective · Automatically generated" can suggest AI. The app's other wording now says the lines are "chosen automatically from a fixed set of lines written in advance for Hushmallow" (`ui/relay/you.js:69`) and "guided by your words" (`ui/relay/returned.js:319, 348, 351`). The library is 293 lines (51 openers, 114 Hushmates lines, 128 of Reframe's), checked line by line at Tier 0. The owner should also confirm how those lines were authored and reviewed, before any wording says "the Hushmates team wrote" (`TERMS_OF_USE.md` §2). `docs/DECISIONS.md` D21 still quotes the older wording ("lines the team wrote") |
| D18 | **The screen's vocabulary gaps** | On a Tier 0 developer probe the screen showed crisis or danger support for 25 of 127 developer-written crisis or danger phrasings (evidence of gaps, not a measured rate). Every draft says the check can miss things; the team beta's testers must be told so (`docs/LAUNCH_READINESS.md` §5) |
| D22 | **"Let feelings find me" at the welcome** | `docs/DECISIONS.md` D22 describes the switch as "on at the welcome", but the code shows it starting **off** for a newly joined member (`members.catching` defaults to false, `supabase/migrations/20261014090000_hushmates_schema.sql:61`; the welcome copies it, `ui/relay/welcome.js:33, 109`). The owner should check which is meant before deciding D22. The collection notice and consent design describe what catchers agree to (`COLLECTION_NOTICE_AND_CONSENT.md` §4.3, §4.5) |
| D20 | **Allow the official domains** | So the cited sections can be checked against the official text before the lawyer sees them |
| D5 | **The email provider** | Decides where email addresses go (the privacy policy's overseas section, APP 8), and whether a breach notice can be emailed to members at all (`DATA_BREACH_RESPONSE_PLAN.md` §8.2) |
| D3 | **The Supabase plan (backups)** | Decides how long deleted data can persist in backups (retention schedule) |
| D7, D9 | **The lawyer** (legal and privacy review; the under-16 law first) | Every part marked needs legal advice waits on it (section 3) |
| — | **The retention schedule** | Several records have no end date today; `RETENTION_AND_DELETION.md` §10 proposes some |
| — | **The age process** | The report reason, the age message, the review route and an operator deletion tool (`AGE_ELIGIBILITY.md` §5.6), and the days a paused under-18 account waits before deletion ([14] proposed) |
| — | **Identity look-ups for danger reports** | The rule until a lawyer advises: nobody looks up an account email because of a report (`MODERATION.md` §6.5) |

### 2.3 Facts only the owner can supply

- The legal entity (sole trader or company), its name and ABN.
- The state or territory the business is in, and where desk readers work.
- Annual turnover, counting the whole entity.
- Whether the main Hushmallow app is run by the same entity, and how it is described.
- How invitations reach people (emailed by Hushmallow, or passed on personally).
- The email provider and where it processes data, once chosen.
- The names for the desk and the safety lead, and the check times.
- Who wrote the Mallow library's lines and how they were reviewed.

### 2.4 Fixes to other documents (not made here)

These documents are outside this folder, so this drafting didn't change them. Each item was checked against the files
at `0773d1e` (the code as at `9012d6f`).

**Done since the drafts first asked for them:**

- ✅ `docs/REVIEWS.md` TGA row (line 73): no longer "Not applicable while every claim stays non-clinical". It now reads
  "**Depends** on intended purpose: 🛑 **needs legal advice** (TGA-1 to TGA-7)", names the public repository and the
  Mallow selection, and says item 14E is "**not relied on**" (TGA-12).
- ✅ `docs/REVIEWS.md` Online Safety code rows: the Phase 1 code is now "**Depends** on the service category and risk
  tier: 🛑 **needs legal advice**" (line 67), and the Phase 2 codes "**Depends** on the risk tier" (line 68), instead of
  "Mandatory" (SCW-03).
- ✅ `docs/RISKS.md` L1 (line 39): now cites the health-purpose exclusion as Rules s 5(1)(f), not s 5(1)(h).
- ✅ The export key: `agreedToShareAnonymouslyAt` is now `agreedToShareWithoutYourNameAt`, export format version 2
  (`core/export-format.js:44, 54-55`).
- ✅ The offline screen: "Your feelings are safe" is gone. It now says "Your feelings keep travelling while you’re
  offline. We’ll try again as soon as you’re back online." (`ui/relay/away.js:35`).
- ✅ The privacy sheet: no longer "only Hushmates’ servers can unlock them". It now says "Hushmates’ servers unlock them
  to show them to the people they’re meant for, and the few people who hold Hushmates’ keys could unlock them too"
  (`ui/relay/parts.js:185`).
- ✅ **Partly done:** the homecoming hints no longer say "Hushmates writes it automatically from your words" or
  "Hushmates writes it, not a person"; they say Hushmates "chooses it ... from lines written in advance, guided by your
  words" (`ui/relay/returned.js:319, 348, 351`).

**Still to do** (the owner, or the developer with the owner's approval):

- The release screen's note still says "If you turn this on and nobody catches it within 30 minutes, Hushmates writes a
  perspective for you automatically" (`ui/relay/release.js:117`). Bring it in line with the homecoming hints
  (`LEGAL_REQUIREMENTS.md` X-4, PRV-22, SCW-07).
- The Mallow label itself, "A Mallow perspective · Automatically generated", is still decision **D21**
  (`core/relay-config.js:47-48`; `supabase/migrations/20261014090100_hushmates_rules.sql:236`;
  `ui/relay/share-render.js:27`; also `ui/relay/journeys.js:162, 175` and `ui/relay/your-data.js:59`).
- `docs/DECISIONS.md` D21: update the quoted app wording from "chosen automatically from lines the team wrote" to the
  current "chosen automatically from a fixed set of lines written in advance for Hushmallow".
- `docs/DECISIONS.md` D22: it describes "Let feelings find me" as "on at the welcome"; the code starts it off for a
  newly joined member (2.2). Correct the description, or the code, once the owner says which is meant.
- `docs/REVIEWS.md`, where it still overstates (its §3 says the register wins where they differ, but the summary is
  what people read): line 69 says "The desk can already find and remove a feeling or perspective", but it can act only
  on reported items (SCW-06 **[GAP]**); line 72 marks the consumer law, including "services supplied with due care",
  "Mandatory", but whether the guarantees reach a free beta needs advice (SCW-10); line 75 marks APP 11 "Mandatory",
  but it depends on APP-entity status (PRV-12); line 77 says "There is no general duty to prevent an adult's
  self-harm", which nobody here researched (SCW-17). **[PROPOSAL]** The TGA row (line 73) still opens "Not a medical
  device on the current in-app copy"; "The in-app copy makes no therapeutic claim" avoids reading as a conclusion
  before the lawyer's view (TGA-12).
- **[PROPOSAL, recommended practice]** The app says "Pseudonymous, not perfectly anonymous" (`ui/relay/welcome.js:102`,
  `ui/relay/you.js:48`) and "Not perfectly anonymous" (`ui/relay/parts.js:183`). "Pseudonymous, not anonymous" is
  plainer, because "not perfectly" can read as "nearly" (`LEGAL_REQUIREMENTS.md` X-3).
- The screenshots in `docs/screenshots/` were refreshed at `0747220`, before later wording changes (the privacy sheet,
  the offline screen, the Mallow hints). Refresh them before they go to the lawyer.

---

## 3. Questions for a lawyer

Grouped, in order of priority. Each points to the rows and drafts that hold the facts and the tests. The first three
decide most of the rest, and they pull against each other, so ask them together. Every legal source behind them was
seen only as a search extract; several provisions weren't seen at all (`LEGAL_REQUIREMENTS.md` §K).

### Priority 1: threshold questions (before G3)

**1. Is Hushmallow an APP entity?** (`LEGAL_REQUIREMENTS.md` PRV-01 to PRV-03, PRV-17 to PRV-19; `PRIVACY_POLICY.md`
threshold note)

- Turnover is far below A$3m. Does Hushmallow "provide a health service ... and hold any health information"
  (Privacy Act s6D(4)(b), s6FB), given that the test counts what the individual intends as well as what the provider
  claims, and covers "maintaining" psychological health? (The "by the individual" limb and "psychological" were seen
  only in a secondary AustLII extract from an earlier research run; this run's OAIC extract mentioned only the
  performer's intention. Check s6FB on legislation.gov.au.)
- Does the answer change if the main Hushmallow app is run by the same entity?
- If it isn't an APP entity, should it opt in (s6EA)?
- Do the Victorian Health Records Act 2001, the NSW Health Records and Information Privacy Act 2002 or the ACT Health
  Records (Privacy and Access) Act 1997 apply, given where the business is and where members live?

**2. Is Hushmates an age-restricted social media platform?** (`AGE_ELIGIBILITY.md` §2 and §7; U16-01 to U16-03,
U16-06, U16-09)

The research leans "in scope" on both tests, but nothing seen settles it, and no draft says the law applies or that it
doesn't.

- Is online social interaction its "sole purpose, or a significant purpose" (Online Safety Act s63C(1)(a)(i))? Does
  s63C(2) (not seen) change the answer?
- On the operative text of Rules s4A (seen only as a heading; `docs/RISKS.md` and `docs/REVIEWS.md` call it rule 4A):
  is a feeling shown to a catcher for a 3-minute offer and 10 minutes to write, on a 24-hour journey, a "time-limited
  feature"? Is the author's private "n of 5 human perspectives" a "feedback feature"? Is random matching among the
  three longest-waiting eligible feelings a "recommender feature"?
- Could the health exclusion (Rules 2025 s5(1)(f), seen only through the Explanatory Statement) apply, and what would
  relying on it mean for questions 1 and 3?
- If it is in scope: which layered steps are reasonable for a small invitation-only service, and by which gate? What
  do s63F and the OAIC's Part 4A guidance (neither seen) require of any age-check information?

**3. What is Hushmates' intended purpose for the TGA, and does the Mallow selection change it?**
(`LEGAL_REQUIREMENTS.md` TGA-1 to TGA-6, TGA-11; `TERMS_OF_USE.md` B3.1)

Nothing in the drafts says ARTG inclusion is unnecessary; that is for the lawyer.

- Do the public repository's documents count as "technical documentation describing the mechanism of action", or as
  "advertising material" (s41BD)? In particular `docs/CRISIS_DETECTION.md`, and the main app's
  `hushmallow/docs/REDESIGN_BRIEF.md` and `hushmallow/docs/V3_SKILLS.md`. Does making the repository private now
  (D19) help, given it has been public?
- Is the word check, which holds back a feeling and shows support lines, closer to content moderation with
  signposting or to a "suicide prevention app"? The welcome says "Hushmates checks words for some signs that someone
  might not be safe, and shows numbers to call" (`ui/relay/welcome.js:105`); the support screen says what the person
  wrote "sounds really painful", and to call 000 "if you might act on these thoughts, or you’re not safe"
  (`core/feeling-safety.js:209`): a transient statement about their state (TGA-4 as corrected: element (b) arguably
  met). An earlier privacy policy draft said of the automated decisions "None of them decides anything about your
  health"; that sentence was removed (`PRIVACY_POLICY.md`, "Decisions made automatically") so the lawyer, not the
  draft, decides how to frame it. Which framing may the documents use?
- Mallow lines are chosen by analysing the author's words for thinking patterns (mind-reading, worst-case-jump and
  others) and returning a matched line from a fixed library of 293 lines written in advance (`core/perspectives.js:585,
  601`). The app calls this "guided by your words". Is that therapy for TGA purposes while no condition is named
  anywhere?
- Which changes must trigger a re-check: AI, a paid tier, a classifier or an "are you safe right now?" check-in (D2)?
- **Across questions 1 to 3:** which single description of Hushmates' purpose should every document use? (The
  under-16 health exclusion, health-service status under the Privacy Act and the Children's Code exclusion move
  together, and against the TGA position.)

### Priority 2: before G4, or before G3 if the lawyer says so (question 7 by G3 at the latest, and before the beta if possible: `MODERATION.md` §7.1)

**4. Which Online Safety Act category, and which risk tier?** (SCW-01 to SCW-06; `MODERATION.md` §7.1, §9)

- Social media service, relevant electronic service or designated internet service?
- Is Hushmates "deemed" Tier 3 under the Phase 1 code, or does it need a risk assessment, and what does Tier 3 make
  mandatory?
- Under the Phase 2 age-restricted material codes, does Hushmates "allow" self-harm material if members may share
  that they're struggling but nothing that encourages, promotes or instructs? What applies at the lowest tier?
- Is a desk that isn't watched around the clock, with nothing that alerts anyone and a contact address checked daily,
  enough to meet a 24-hour removal notice? The desk can't yet find unreported content named in a notice
  (`MODERATION.md` §9 **[GAP]**).

**5. The terms, consumer law and duty of care.** (SCW-07 to SCW-10, SCW-17; `TERMS_OF_USE.md` §4, §8, §11, §12, §15;
`COLLECTION_NOTICE_AND_CONSENT.md` §10 question 8)

- Do the consumer guarantees apply to the free invitation-only beta?
- Are the variation, suspension, content-licence and optional liability-cap clauses fair in a standard form consumer
  contract?
- Could Hushmallow owe a duty of care because it runs a word check and a "Someone may be in danger" queue? Are the
  stated limits (not an emergency service, the check can miss things, nobody watching in real time, the desk can't
  contact anyone) enough?
- The response-time wording. Reporters are told "during the pilot we aim to read priority reports within a day, and
  nights, weekends and holidays can take longer", and "within two days" for other reports; You & safety says "within a
  day or two". Nothing alerts anyone to a new report, and nobody is named for the desk yet (D12). Are there reasonable
  grounds for these statements about a future matter (ACL s4, from memory)? Is the away notice ("Our safety team is
  away until {day}, so it will be read when we’re back") enough for times nobody can read the desk?
- The Mallow label (D21): is "A Mallow perspective · Automatically generated" misleading while no AI is used and the
  lines come from a fixed library written in advance? Is something like "From the Mallow library" better? The owner
  decides after this answer.

**6. Using an email address in a serious threat.** (PRV-10; `MODERATION.md` §6.5; `PRIVACY_POLICY.md` "When the law
requires or allows sharing")

- If Hushmallow is an APP entity, when may it link a danger report to an account email and give it to police or an
  ambulance service (s16A item 1, APP 6.2(c))? Should it ever do so?
- If it isn't an APP entity, what do the statutory privacy tort and state health-records laws say?
- What must the privacy policy and the collection notice say before any such step exists? Today the rule is: nobody
  looks up an email because of a report.

**7. Child sexual abuse material and terrorist material, and holds on evidence.** (SCW-03; `MODERATION.md` §7.1,
§7.3; `RETENTION_AND_DELETION.md` §9)

- How may a desk reader handle a report that may contain child sexual abuse material without committing an offence?
  The procedure tells readers not to copy, screenshot, download or forward it, and says possessing or passing it on is
  a serious crime; that statement is from memory, and nobody here researched how it applies to reviewing a report.
- What must be reported, to whom (police, the ACCCE, eSafety) and how fast, and what may be passed on with a report
  (APP 6.2(b) and (c))?
- Report evidence is cleared 90 days after a decision (180 if undecided), or sooner if the writer deletes their data.
  What legal hold is needed when police ask, and how long?

### Priority 3: narrower questions to send with the others

8. Information about other people in feelings (spouses, children, colleagues): what does APP 3 require when they
   can't consent (PRV-05)?
9. From 10 December 2026, do holding back a feeling and pausing it after reports "significantly affect" members'
   interests, for the automated-decision wording (PRV-07)?
10. Cross-border disclosure: the email provider, Supabase's support access and sub-processors, Cloudflare (PRV-11).
11. If invitations are emailed by Hushmallow, are they commercial messages under the Spam Act (SCW-12)?
12. Work health and safety for desk readers, including volunteers, in the owner's state (SCW-15, SCW-16). Ask before
    anyone other than the owner reads the desk.
13. The Children's Online Privacy Code (the OAIC must register it by 10 December 2026; no commencement date yet): once
    registered, could it reach Hushmates, and is an 18+ invitation-only service "likely to be accessed by children"
    (U16-11; `AGE_ELIGIBILITY.md` §4)?
14. The consent design (`COLLECTION_NOTICE_AND_CONSENT.md` §10, questions 2, 3 and 5 to 7): is a one-time sheet plus a
    per-feeling tick valid express consent for health information (APP 3.3, and the Victorian or NSW principles if
    they apply)? Is "Add my perspective" after a clear statement enough for a perspective? Is telling a catcher up
    front that a share picture can't be recalled enough? Which identity must the notices give? Is "guided by your
    words" an adequate description of the Mallow selection, for informed consent and APP 1.7-1.9?
15. Destruction and de-identification (`RETENTION_AND_DELETION.md` §6): are cleared fields, with remnants in the
    database's own clean-up and in backups, "reasonable steps to destroy" (APP 11.2)? Are the rows kept after an
    account is deleted "de-identified"?
16. The breach plan (`DATA_BREACH_RESPONSE_PLAN.md` §8): may Hushmallow rely on a supplier's assessment or notice
    (s26WJ, s26WK(4), from memory)? When may it publish a statement instead of notifying people directly (s26WL)?
    Which exceptions could apply (s26WF, s26WN, s26WP, s26WQ, from memory)? Should it notify voluntarily if it isn't
    bound?
17. Minors who get in (`AGE_ELIGIBILITY.md` §7, questions 7 and 8): do the Phase 2 codes or the Basic Online Safety
    Expectations add anything for a minor who slips through? If a reported feeling suggests a child is being harmed,
    does any reporting or child-safety law in the owner's state, or where a desk reader works, reach Hushmallow or a
    desk reader? Nothing on this was researched.

### What to give the lawyer

- Every draft in this folder, including the internal Part B notes and the hidden classification comments, and
  `LEGAL_REQUIREMENTS.md`.
- The repository documents that may count as information supplied: `docs/CRISIS_DETECTION.md`, the main app's
  `hushmallow/docs/REDESIGN_BRIEF.md` and `hushmallow/docs/V3_SKILLS.md`, `docs/clinical/`, and `docs/REVIEWS.md`.
- The Mallow selection logic (`core/perspectives.js`, and the main app's `hushmallow/src/ultra/reframe-engine.js` and
  `hushmallow/src/ultra/frameworks.js`), and the 293 lines in use (`docs/clinical/mallow-library-for-review.csv`), not
  only the list of lines.
- The safety picture: `docs/safety/TIER0_SELF_ASSESSMENT.md` (including the 25 of 127 probe result),
  `docs/ESCALATION.md`, `docs/RISKS.md`, `docs/DECISIONS.md` and `docs/LAUNCH_READINESS.md`.
- Screenshots of the current app (`docs/screenshots/`, refreshed first: 2.4), and any marketing copy, website or store
  listing once drafted.
- The owner's business facts (2.3).
