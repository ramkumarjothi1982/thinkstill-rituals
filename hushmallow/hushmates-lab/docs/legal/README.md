**DRAFT, not yet reviewed or approved. Not legal advice.**
**Date: 15 October 2026.**

# Hushmates · Legal and privacy drafts (`docs/legal/`)

> **Status.** Every document in this folder is a **DRAFT**. None has been approved by the owner, none has been seen by
> a lawyer, and none is in force or linked from the app. Hushmates is not live: there are no members outside the team.
> Nothing here is final until the owner approves it and, where a document or a part is marked **needs legal advice**,
> an Australian lawyer has reviewed it.
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
| `PRIVACY_POLICY.md` | The privacy policy, written as if Hushmallow is bound by the Australian Privacy Principles | Members | DRAFT; has placeholders; parts need legal advice | `000c0cd` | G3 (outside testers) |
| `COLLECTION_NOTICE_AND_CONSENT.md` | The short notices at each screen, and the consent design for feelings (health information) | Members (the wording); the developer (the design) | DRAFT | `000c0cd` | **G2** (team beta) |
| `TERMS_OF_USE.md` | The terms, for the beta now and a paid tier later. Part B holds the drafting notes and the tests behind each clause | Members (Part A); owner and lawyer (Part B) | DRAFT; clauses marked **[Lawyer to review]** | `000c0cd` | **G2** |
| `COMMUNITY_GUIDELINES.md` | How to be a good Hushmate, how reporting works, what happens if the rules are broken | Members | DRAFT | `000c0cd` | **G2** |
| `SAFETY_DISCLAIMERS.md` | Every piece of safety wording, place by place, with how prominent it is | Members (the words); the team | DRAFT; the independent safety reviewer should read it | `0037d57`; §3.1, §3.5, §3.7 and §3.9 re-quoted at `f8d7e4a` | **G2** |
| `MODERATION.md` | The safety desk's procedure: who reads reports, response times, the urgent path, notices from eSafety, looking after desk readers | Internal | DRAFT | `0037d57`; some §4.1 and §6 quotes re-checked at `f8d7e4a` | **G2** |
| `RETENTION_AND_DELETION.md` | Everything Hushmates keeps, for how long, and how it is removed | Internal | DRAFT; proposals for the owner | `000c0cd` | G3 |
| `DATA_BREACH_RESPONSE_PLAN.md` | What to do if personal information is lost or exposed | Internal | DRAFT; needs names | `000c0cd` | G3; it asks to be approved and rehearsed once **before G2** |
| `AGE_ELIGIBILITY.md` | The 18+ rule and why; the under-16 social media law applied to the features; reasonable steps if it applies; the Children's Online Privacy Code; what to do if a member seems under 18 | Internal (the analysis); members (the proposed messages) | DRAFT; the under-16 tests need legal advice | `48c7e26` | G3; the lawyer's view by G4 |
| `LEGAL_REQUIREMENTS.md` | The register: every legal and safety requirement, one row each, with its source, classification, what Hushmallow does now, what's needed, the covering draft and who acts | Internal | DRAFT | `48c7e26` | G3 |
| `README.md` | This index, the approvals, and the questions for a lawyer | Owner, lawyer | DRAFT | — | — |

The gates are defined in `docs/LAUNCH_READINESS.md` §0: **G1** staging (test words only), **G2** team-only beta (people
the owner knows), **G3** outside testers (up to about 30 invited adults), **G4** public launch.

**Commits.** Some drafts were checked against the code before the Tier 0 changes (`000c0cd`). The app has changed
since in ways the drafts expect: the consent tick now says "without my name", the report acknowledgements are honest
about a small team, and *Support* is on every screen. Before approving a draft, check its "Now" or "In the app now"
quotes against the current app.

### Words used in every draft

- **Classifications:** **verified obligation** (the law was seen and binds on the known facts); **depends on
  Hushmallow's functionality or business circumstances** (which fact is named); **needs legal advice**; **recommended
  practice** (not a legal duty); and, in the register, **not applicable on the facts (test checked)**. Recommendations
  are never presented as obligations.
- **Markers:** **[GAP]** the app or a procedure doesn't do something a draft needs; **[NOT CONFIRMED]** platform
  behaviour to check; **[PROPOSAL]** something for the owner to decide; **[from memory]** law that nobody here has seen.
- **The drafting rules all of them keep:** Hushmates is pseudonymous, never "anonymous". It isn't an emergency, crisis,
  counselling or therapy service. Nobody is watching in real time, and the small safety team reads reports, but not
  around the clock. Nobody from Hushmates contacts a member about what they wrote or to check on them (replies to a
  member's own email, and notices about their account, a data breach or the service, are the only contact). Mallow lines are put together from a
  fixed library written in advance; AI is off; who wrote the library is for the owner to confirm before any draft says
  "the team wrote". One intended-purpose statement is used word for word in the Terms, the Community Guidelines and
  every public channel (store listing, website, marketing: `SAFETY_DISCLAIMERS.md` §1.1); every other safety line is
  checked against it.

---

## 2. What needs the owner

### 2.1 Approvals

- **Before G2 (team beta):** read and approve the collection notice and consent wording, the terms, the community
  guidelines, the safety disclaimers and the moderation procedure, for a team beta. Approve the breach plan with names
  and rehearse it once. **Or** let the team beta wait for a lawyer (`docs/LAUNCH_READINESS.md` §4).
- **Before G3 (outside testers):** every draft approved; the lawyer's answers to questions 1 to 3 below
  (`docs/LAUNCH_READINESS.md` §4), and to question 4 if the lawyer says so; a contact address; the Online Safety
  records (category, risk tier). On question 2, the lawyer may say the full answer can wait until G4, as long as
  nothing more is needed for outside testers (`docs/RISKS.md` L1).
- **Before G4 (public launch):** the lawyer's view on all six groups below (D7, D9); final documents.

### 2.2 Decisions the drafts depend on

| # | Decision | Why it matters to the drafts |
|---|---|---|
| D19 | **Make the repository private** (A$0) | The public repository publishes "crisis detection" plans and the main app's CBT, DBT and ACT framing. Under the TGA's rules these may count towards Hushmates' intended purpose (`LEGAL_REQUIREMENTS.md` TGA-2R). It is the cheapest risk reduction in this folder |
| D23 | **A contact address** that isn't for emergencies | The drafts hold placeholders for it (**[contact address]**, **[privacy contact email]** and similar): privacy requests, complaints, reviews of restrictions and age decisions, accessibility help, eSafety notices |
| D12 | **Who reads the desk, and the safety lead** | The app tells reporters "we aim to read priority reports within a day". That needs a staffed rota behind it (consumer law, SCW-07) |
| D21 | **The Mallow label** | "A Mallow perspective · Automatically generated" can suggest AI. The lines are put together from a fixed library written in advance (an opener in the Mallow's voice plus one perspective). The owner should also confirm how the 342 lines were authored and reviewed, before any wording says "the Hushmates team wrote" (`TERMS_OF_USE.md` §2) |
| D20 | **Allow the official domains** | So the cited sections can be checked against the official text before the lawyer sees them |
| D5 | **The email provider** | Decides where email addresses go (the privacy policy's overseas section, APP 8) |
| D3 | **The Supabase plan (backups)** | Decides how long deleted data can persist in backups (retention schedule) |
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
- The names for the desk and the safety lead.

### 2.4 Fixes to other documents (not made here)

These documents are outside this folder, so this drafting didn't change them. The owner (or the developer, with the
owner's approval) should:

- `docs/REVIEWS.md`: change TGA from "Not applicable while every claim stays non-clinical" to "Not a medical device on
  current materials, subject to the final copy, the technical documentation and the word-check framing; regulatory
  advice recommended; item 14E not relied on" (TGA-12). Change the Phase 1 online safety code's terms and reporting
  from "Mandatory" to "depends on the risk tier" (SCW-03).
- `docs/RISKS.md` L1: the health-purpose exclusion is Rules **s5(1)(f)**, not s5(1)(h).
- The app (developer, with approval): the Mallow label and the hints that say "Hushmates writes it ... from your
  words" (D21); the export key `agreedToShareAnonymouslyAt`; "Your feelings are safe" on the offline screen; and the
  privacy sheet's "only Hushmates’ servers can unlock them" (people holding the keys can too). Details in
  `LEGAL_REQUIREMENTS.md` X-3, X-4, PRV-22 and SCW-07.

---

## 3. Questions for a lawyer

Grouped, in order of priority. Each points to the rows and drafts that hold the facts and the tests. The first three
decide most of the rest, and they pull against each other, so ask them together.

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

- Is online social interaction its "sole purpose, or a significant purpose" (Online Safety Act s63C(1)(a)(i))?
- On the operative text of Rules s4A: is a feeling shown to a catcher for a 3-minute offer and 10 minutes to write, on
  a 24-hour journey, a "time-limited feature"? Is the author's private "n of 5 human perspectives" a "feedback
  feature"? Is random matching among the three longest-waiting eligible feelings a "recommender feature"?
- Could the health exclusion (Rules 2025 s5(1)(f)) apply, and what would relying on it mean for questions 1 and 3?
- If it is in scope: which layered steps are reasonable for a small invitation-only service, and by which gate? What
  do s63F and the OAIC's Part 4A guidance require of any age-check information?

**3. What is Hushmates' intended purpose for the TGA, and does the Mallow selection change it?**
(`LEGAL_REQUIREMENTS.md` TGA-1 to TGA-6, TGA-11; `TERMS_OF_USE.md` B3.1)

- Do the public repository's documents count as "technical documentation describing the mechanism of action", or as
  "advertising material" (s41BD)? In particular `docs/CRISIS_DETECTION.md`, and the main app's
  `hushmallow/docs/REDESIGN_BRIEF.md` and `hushmallow/docs/V3_SKILLS.md`. Does making the repository private now
  help, given it has been public?
- Is the word check, which holds back a feeling and shows support lines, closer to content moderation with
  signposting or to a "suicide prevention app"? It tells a person their words "suggest you might not be safe", a
  transient statement about their state (TGA-4 as corrected: element (b) arguably met). An earlier privacy policy draft
  said of the automated decisions "None of them decides anything about your health"; that sentence was removed
  (`PRIVACY_POLICY.md`, "Decisions made automatically") so the lawyer, not the draft, decides how to frame it. Which
  framing may the documents use?
- Mallow lines are chosen by analysing the author's words for thinking patterns (mind-reading, worst-case-jump and
  others) and returning a matched line from a fixed library. Is that therapy for TGA purposes while no condition is
  named anywhere?
- Which changes must trigger a re-check: AI, a paid tier, a classifier or an "are you safe right now?" check-in?
- **Across questions 1 to 3:** which single description of Hushmates' purpose should every document use? (The
  under-16 health exclusion, health-service status under the Privacy Act and the Children's Code exclusion move
  together, and against the TGA position.)

### Priority 2: before G4, or before G3 if the lawyer says so

**4. Which Online Safety Act category, and which risk tier?** (SCW-01 to SCW-06; `MODERATION.md` §7.1, §9)

- Social media service, relevant electronic service or designated internet service?
- Is Hushmates "deemed" Tier 3 under the Phase 1 code, or does it need a risk assessment, and what does Tier 3 make
  mandatory?
- Under the Phase 2 age-restricted material codes, does Hushmates "allow" self-harm material if members may share
  that they're struggling but nothing that encourages, promotes or instructs? What applies at the lowest tier?
- Is a desk that isn't watched around the clock, with a contact address checked daily, enough to meet a 24-hour
  removal notice?

**5. The terms' liability clauses.** (SCW-07 to SCW-10, SCW-17; `TERMS_OF_USE.md` §4, §8, §11, §12, §15)

- Do the consumer guarantees apply to the free invitation-only beta?
- Are the variation, suspension, content-licence and optional liability-cap clauses fair in a standard form consumer
  contract?
- Could Hushmallow owe a duty of care because it runs a word check and a "Someone may be in danger" queue? Are the
  stated limits (not an emergency service, the check can miss things, nobody watching in real time, the desk can't
  contact anyone) enough, and is "we aim to read priority reports within a day" safe to say?

**6. Using an email address in a serious threat.** (PRV-10; `MODERATION.md` §6.5; `PRIVACY_POLICY.md` "When the law
requires or allows sharing")

- If Hushmallow is an APP entity, when may it link a danger report to an account email and give it to police or an
  ambulance service (s16A item 1, APP 6.2(c))? Should it ever do so?
- If it isn't an APP entity, what do the statutory privacy tort and state health-records laws say?
- What must the privacy policy and the collection notice say before any such step exists? Today the rule is: nobody
  looks up an email because of a report.

### Priority 3: narrower questions to send with the others

7. Information about other people in feelings (spouses, children, colleagues): what does APP 3 require when they
   can't consent (PRV-05)?
8. From 10 December 2026, do holding back a feeling and pausing it after reports "significantly affect" members'
   interests, for the automated-decision wording (PRV-07)?
9. Cross-border disclosure: the email provider, Supabase's support access and sub-processors, Cloudflare (PRV-11).
10. If invitations are emailed by Hushmallow, are they commercial messages under the Spam Act (SCW-12)?
11. Work health and safety for desk readers, including volunteers, in the owner's state (SCW-15, SCW-16).
12. The Children's Online Privacy Code (the OAIC must register it by 10 December 2026; no commencement date yet): once
    registered, could it reach Hushmates (U16-11)?

### What to give the lawyer

- Every draft in this folder, including the internal Part B notes, and `LEGAL_REQUIREMENTS.md`.
- The repository documents that may count as information supplied: `docs/CRISIS_DETECTION.md`, the main app's
  `hushmallow/docs/REDESIGN_BRIEF.md` and `hushmallow/docs/V3_SKILLS.md`, `docs/clinical/`, and `docs/REVIEWS.md`.
- The Mallow selection logic (`core/perspectives.js`, and the main app's `hushmallow/src/ultra/reframe-engine.js` and
  `hushmallow/src/ultra/frameworks.js`), not only the list of lines.
- Screenshots of the current app (`docs/screenshots/`), and any marketing copy, website or store listing once drafted.
- The owner's business facts (2.3).
