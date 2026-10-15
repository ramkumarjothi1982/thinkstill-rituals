# Hushmates · Remaining risks, ranked by severity

The record of unresolved risks before any launch, kept up to date with each phase.
Updated 15 October 2026 with the Tier 0 self-assessment (`docs/safety/TIER0_SELF_ASSESSMENT.md`).

**How to read the ratings:**
- **Likelihood** and **harm** are each Low, Medium or High (1, 2, 3), given what's built today.
- **Severity** = likelihood × harm:
  - **Critical** 9;
  - **High** 6;
  - **Medium** 3–4;
  - **Low** 1–2.
- Within a level, risks of harm to people come first.
- **Blocks** names the earliest gate that can't go ahead until the risk is reduced (`LAUNCH_READINESS.md` §0):
  - G1 staging;
  - G2 the team-only beta;
  - G3 outside testers;
  - G4 a public launch.
- D-numbers are decisions in `DECISIONS.md`.

## Critical

| # | Risk | L | H | In place | Next | Blocks |
|---|---|---|---|---|---|---|
| S1 | **The screen misses words that mean someone isn't safe**, so the feeling travels to up to five strangers, and a library Mallow may answer it within 30 minutes. *Raised from High:* on a Tier 0 probe of new developer-written phrasings it showed support for **25 of 127** meant as crisis or danger. Today's fixes repaired bugs, not vocabulary, so the figure is unchanged. That is evidence of gaps, not a measured rate | H | H | <ul><li>Keyword rules, bug-fixed today</li><li>*Support* on every screen (since today)</li><li>"Someone may be in danger" reports, which pause the feeling</li><li>The app says the check misses things and reads English only</li><li>An invariant test so Hushmates' rules never hide the shared lexicon's crisis words</li></ul> | <ul><li>Tier A labels the 108, then the probe</li><li>One reviewed vocabulary batch, **or** the check-in (D2)</li><li>The owner may bring a developer batch forward (D18)</li></ul> | G3 |
| S3 | **Someone in danger can't be reached.** Hushmates is pseudonymous, the desk sees no identities, and the app has no contact route | H | H | <ul><li>Support lines on every screen</li><li>Honest copy: the team can't contact anyone, call 000</li><li>Priority reports first, with an overdue badge after 12 hours</li><li>Neutral support on a paused or removed feeling</li></ul> | <ul><li>Name the readers and the safety lead (D12)</li><li>A lawyer's view on using the account email in imminent danger (APP 6.2(c))</li><li>Tier A on what the writer is told</li></ul> | G3 |
| S7 | **A priority report sits unread.** Nobody is named, there are no alerts, and the desk only refreshes while open | H | H | <ul><li>The overdue badge</li><li>The desk-away setting, which tells reporters when it will be read</li><li>The away rule in `ESCALATION.md`</li></ul> | <ul><li>The owner names people, sets check times and a twice-daily reminder (A$0)</li><li>An email alert later (D5)</li></ul> | G2 |
| P7 | **Privacy duties aren't met yet.** Drafts now exist (`docs/legal/`): privacy policy, collection notice, consent, retention, breach plan. None is approved. Whether Hushmates is an APP entity needs a lawyer | H | H | <ul><li>Consent each time</li><li>Export, deletion, retention limits</li><li>Encryption</li><li>"Without my name", never "anonymous"</li><li>Draft documents</li></ul> | <ul><li>The owner approves the drafts</li><li>A self-run PIA with the OAIC template</li><li>A lawyer's check (D7)</li></ul> | G2 (the notice), G3 (the rest) |
| P3 | **No backups on the Free plan** | H on Free | H | `pg_dump` plus the recovery drill | Pro for outside testers (D3), or a weekly dump that a named person owns | G3, if on Free |

## High

| # | Risk | L | H | In place | Next | Blocks |
|---|---|---|---|---|---|---|
| S8 | **Threats to harm others have no rule** ("I'm going to hurt my baby", "bringing a knife in tomorrow"): such feelings travel and get a Mallow line. *New* | M | H | The desk's 000 step, once someone reports it | Tier A designs an outward-harm route; a lawyer on any duty to act | G3 |
| S9 | **A minor joins and discloses abuse, or is groomed.** No rule reads a stated age; adult lines are shown. *New* | M | H | <ul><li>Invitations and an 18+ tick</li><li>Grooming-style questions blocked in perspectives (since today)</li></ul> | <ul><li>Lawyer: L1, class 1 material, reporting</li><li>Tier A: a disclosure route with Kids Helpline</li></ul> | G3 |
| S10 | **Family violence, strangulation, sexual assault without the keywords, eating disorders and an overdose already taken** mostly travel. *New, split out of S1* | H | H | 1800RESPECT now on the threat, safety and stalking screens and in *Support* | Tier A: categories, lines (Butterfly, Poisons Information; verify first) | G3 |
| E1 | **The evaluation can't measure the screen.** The 379 are the development set, pinned in CI and written alongside the rules. No locked test set exists. Whole categories are missing. *New* | H | M | <ul><li>Relabelled</li><li>The tool now shows what it hid</li><li>A display-id Tier A sheet</li><li>The probe kept apart as a held-out sheet</li></ul> | <ul><li>Tier A's memo is qualitative, by category</li><li>A clinician-written locked set before any measured claim</li></ul> | G4 (any safety claim) |
| L1 | **The under-16 social media law might apply**, and a self-declared 18+ tick alone wouldn't be "reasonable steps". The research leans towards Hushmates meeting two tests: the "online social interaction" purpose (Online Safety Act s 63C), and the Rules' "time-limited feature" condition (rule 4A: an offer lasts 3 minutes, a feeling travels for a day). Choosing feelings at random from the longest-waiting, not from personal data, argues against a "recommender feature". The health-purpose exclusion (Rules s 5(1)(h)) is the realistic way out. Rule 4A's own text wasn't seen | M | H | The 18+ tick and invitations. Draft terms and an age-eligibility note (`docs/legal/AGE_ELIGIBILITY.md`) | 🛑 A lawyer's view on the exclusions and the tests (D9) | G4; G3 if the lawyer says so |
| L4 | **The TGA could treat Hushmates as software with a therapeutic purpose.** That depends on its intended purpose, which includes what is published. **The repository is public**, and its design documents describe CBT, DBT and ACT foundations. Mallow lines are chosen by analysing the author's words. *New* | M | H | <ul><li>The app calls itself reflection and comfort</li><li>No clinical claims; a word list to avoid (`REVIEWS.md` §7)</li><li>Mallow copy now says "chosen from lines the team wrote"</li></ul> | <ul><li>🛑 Make the repository private (owner)</li><li>A lawyer's view (`docs/legal/LEGAL_REQUIREMENTS.md`)</li><li>Tier A question 10 on CBT-like lines</li></ul> | G3 |
| L2 | **Online Safety Act code duties aren't documented:** risk-tier decisions; a monitored contact for eSafety notices (24 hours). The terms and guidelines are now drafted, not in force | H | M | Reports, the desk, removal and restriction | Tier records (from the SbD harm table); a contact address; approve the terms | G3 |
| O2 | **A Free project pauses** after a quiet week, and feelings stop coming home | H on Free | M | — | Pro (D3), or someone checks weekly | G3, if on Free |
| O3 | **Sign-in emails don't arrive** for people outside the team | H | M | The team beta works | A provider's free tier, on a domain that isn't production's (D5) | G3 |

## Medium

| # | Risk | L | H | In place | Next | Blocks |
|---|---|---|---|---|---|---|
| S4 | **Unkind or harmful perspectives** reach a writer. *Reduced:* incitement, health advice and grooming questions are now blocked | M | M | Every perspective screened; block lists; reports; automatic pausing; blocking; the desk | Tier A on the wider list (victim-blaming, advice) | G3 |
| S11 | **Harmful words in a feeling reach catchers.** *Reduced:* words telling readers to hurt themselves are now refused | L | M | The block; catchers can pass and report | Tier A | — |
| S5 | **Moderators are harmed by what they read.** A WHS duty once anyone else reads the desk | M | M | Reports show only what's needed; the guide's self-care step | A one-page WHS assessment, sitting limits, debriefs, an opt-out (owner); optional training (D6b) | G3 |
| S2 | **The screen holds back ordinary feelings**, and people feel judged ("I'm not suicidal", "cut myself shaving"; 20 of 54 everyday probe sentences) | M | M | 121 everyday sentences pinned as released; a warm support screen | The check-in (D2) turns a refusal into one kind question | — |
| S6 | **A Mallow line says the wrong thing at a hard moment.** *Reduced by Tier 0:* 40 rewritten, 51 left out, routing fixed | L | M | All 342 lines checked twice; routing tests | Tier A reads the 291 lines and answers 11 questions | G3 |
| P6 | **People reveal who they are** in their own words | M | M | Contact details refused; Australian postcodes with context refused; a report reason | Review with the PIA | — |
| P4 | **A shared picture can't be recalled** once made | M | M | Only perspectives their writers still allow. Retracted content never reaches a new picture or video | — (by design; writers are told) | — |
| A1 | **Screen-reader users hit barriers** no automated check finds | M | M | Labels, roles, headings, live regions and keyboard paths tested; *Support* has a visible label | Hands-on VoiceOver and TalkBack (A$0); arrow keys in the radio groups; an external audit (D13) | G3 (hands-on), G4 (audit) |
| O1 | **Real Supabase behaves differently** from the local stand-ins | M | M | The real `index.ts` under Deno; a full rehearsal; the deploy checked against Supabase's own API spec | 🛑 The staging accounts, then the three staging commands | G2 |
| O8 | **Free's call quota runs out under high use.** High use at 100 people is about 570,000 calls against 500,000 | M on Free | M | The idle back-off; the cost model | Watch usage weekly; Pro for outside testers (D3) | G3, if on Free |
| L3 | **The wording reads as a health claim** (TGA) or misleads (consumer law) | L | H | The copy audit at Tier 0; honest response times; "without my name" | The lawyer (D7) | G4 |
| P1 | **The data key is lost**: every stored word becomes unreadable | L | H | The key in a private file, checked against a backup by the recovery drill | Two key holders (D11); a monthly drill | G3 |
| P2 | **The data key leaks** | L | H | Only in Supabase's function secrets and the owner's file | Rotation steps on staging | — |
| A2 | **Security weaknesses** no internal review found | L | H | Six adversarial reviews of the relay, privacy, access and staging tools; a strict CSP; secrets server-side | Automated scanning (A$0); a scoped penetration test (D14) | G4 |
| O4 | **Production is touched by mistake** | L | H | Separate accounts. The tools refuse any token or account that reaches more than staging. Nothing deploys by itself | Keep production's credentials off any machine used for staging | — |
| O9 | **Abuse or a flood of calls runs up the bill** | L | M | Per-person rate limits; AI off with an A$0 cap; Free can't bill; Pro's Spend Cap | Turnstile if sign-up opens (D16); a weekly usage check | G4 |

## Low

| # | Risk | L | H | In place | Next |
|---|---|---|---|---|---|
| L5 | **The shared Reframe lexicon changes upstream** and silently changes what Hushmates holds back | L | M | A hash pin fails CI until Hushmates' safety lead reviews the change | — |
| O5 | Costs grow faster than expected | L | M | AI off; the cost model with high-use and worst cases (`COSTS.md`) | Realtime before 10,000 people; a weekly usage check |
| O7 | The staging keys sit in a cloud environment's secret settings | L | M | Staging holds test data only; the tools never print a secret | Delete or rotate after staging |
| P5 | A reader screenshots a private perspective on the homecoming screen | M | L | The "private" choice covers the share picture only, and says so | — |
| O6 | Bots ask for many sign-in codes | L | L | Invitations; Supabase's rate limits | Turnstile if sign-up opens (D16) |

## Changed in Phase 3c (Tier 0)

- **Raised:**
  - S1 to Critical, from the probe;
  - S3 to Critical: no contact route, nobody named;
  - P7 stays Critical until the drafts are approved.
- **New:**
  - S7, a report sits unread;
  - S8, threats to others;
  - S9, minors;
  - S10, the uncovered categories;
  - S11, harm aimed at catchers;
  - E1, the evaluation;
  - L4, the TGA and the public repository;
  - L5, the shared lexicon;
  - O8, Free's quota;
  - O9, abuse costs.
- **Reduced:**
  - S4 (block lists);
  - S6 (the library checked and fixed);
  - S11 (feelings aimed at readers refused).
- **Corrected:**
  - S1's "Get support now on every screen" was not true before today; it is now.
  - L1 and L2 listed "the terms" as in place; none existed until today's drafts, which are not yet in force.
