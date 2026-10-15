# Hushmates · Remaining risks, ranked by severity

The record of unresolved risks before any launch, kept up to date with each phase.

**How to read the ratings:**
- **Likelihood** and **harm** are each Low, Medium or High (1, 2, 3), given what's built today.
- **Severity** = likelihood × harm:
  - **Critical** 9;
  - **High** 6;
  - **Medium** 3–4;
  - **Low** 1–2.
- Within a level, risks of harm to people come first.
- **Blocks** says the earliest stage that can't go ahead until the risk is reduced:
  - staging;
  - the team-only beta;
  - outside testers;
  - a public launch.
- D-numbers are decisions in `DECISIONS.md`.

## Critical

| # | Risk | L | H | In place | Next | Blocks |
|---|---|---|---|---|---|---|
| P7 | **Privacy duties aren't met yet.** Hushmates is probably bound by the Privacy Act because it holds health information as a health-related service (`REVIEWS.md` §3). Still missing:<br>• a privacy policy;<br>• a collection notice;<br>• reviewed consent wording for health information;<br>• a breach-response plan;<br>• the automated-decision wording, due from 10 December 2026 | H | H | Consent before a feeling travels; export; deletion; retention; encryption; "pseudonymous", never "anonymous" | Write the policy, the notice and the breach plan from the OAIC's free guides; a self-run PIA; then a lawyer's check (D7) | outside testers |
| P3 | **No backups if the beta runs on the Free plan** | H on Free | H | `pg_dump` plus the recovery drill (`STAGING.md` part 11) | Pro for a beta with outside testers (D3), or a weekly dump that someone owns | outside testers, if on Free |

## High

| # | Risk | L | H | In place | Next | Blocks |
|---|---|---|---|---|---|---|
| S1 | **The screen misses words that mean someone isn't safe**, so the feeling travels | M | H | Keyword rules held to about 330 phrasings; *Get support now* on every screen; catchers can report "someone may be in danger", which goes to the top of the desk; the app says the screen can miss things; the 379-phrasing blind harness | Tier A review of the categories and the 108-phrasing sheet; the check-in (D2) only after it (`REVIEWS.md` §5) | outside testers |
| S3 | **Someone in danger can't be reached.** Hushmates is pseudonymous and the desk sees no identities | M | H | Support lines shown at once; urgent reports first; a draft escalation procedure (`ESCALATION.md`) | Tier A reviews the procedure; name the desk readers and the safety lead (D12); a privacy view on using the account email in imminent danger | outside testers |
| L1 | **The under-16 social media law might apply.** A self-declared 18+ tick alone wouldn't be "reasonable steps" | M | H | The 18+ tick and the terms | 🛑 A lawyer's view on the health-purpose exclusion and the 2026 s4A features (D9) | public launch |
| L2 | **Online Safety Act code duties aren't documented.** Missing:<br>• the risk-tier decisions (class 1 material and self-harm material);<br>• terms that prohibit the material;<br>• a monitored contact for eSafety removal notices (24 hours) | H | M | Reports, the desk, removal and restriction already work | Write the tier assessments, the terms and the contact address (A$0); lawyer confirmation advisable | outside testers (terms and contact); public launch (the rest) |
| O2 | **A Free project pauses**, and feelings stop coming home | H on Free | M | — | Pro for the beta (D3), or someone checks weekly | outside testers, if on Free |
| O3 | **Sign-in emails don't arrive** for people outside the team (the built-in sender is team-only) | H | M | Team-only beta works | A provider's free tier on a domain that isn't production's (D5) | outside testers |

## Medium

| # | Risk | L | H | In place | Next | Blocks |
|---|---|---|---|---|---|---|
| S5 | **Moderators are harmed by what they read.** Managing this is a WHS duty once anyone else reads the desk | M | M | Reports show only what's needed; the activity log; the procedure's self-care step | A written WHS risk assessment, shift limits, debriefs, an opt-out (Tier 0); optional training (D6b) | outside testers |
| S2 | **The screen holds back ordinary feelings**, and people feel judged | M | M | 121 everyday sentences pinned as released; a warm support screen | The check-in turns refusals into one kind question (D2, after Tier A) | — |
| S4 | **Unkind or harmful perspectives** reach someone | M | M | Every perspective screened; reports, automatic pausing, blocking; the desk | Desk staffing (D12) | outside testers |
| P6 | **People reveal who they are** in their own words | M | M | Contact details refused; "shares personal details" is a report reason; the release hint | Review with the PIA (D7) | — |
| P4 | **A shared picture can't be recalled** once made | M | M | Only perspectives their writers still allow, re-checked just before drawing. Since Phase 3b, a feeling that was let go or deleted, a writer who stopped sharing, or a Mallow perspective no longer on the journey can't reach a new picture or video (`tests/share-render.test.mjs`, E2E) | — (by design; writers are told) | — |
| A1 | **Screen-reader users hit barriers** no automated check finds | M | M | Labels, roles, live regions, focus order and keyboard paths tested in the browser; reduced motion respected | Hands-on screen-reader testing (A$0); an external audit before launch (D13) | public launch |
| O1 | **Real Supabase behaves differently** from the local stand-ins | M | M | The real `index.ts` under Deno; a full rehearsal of the staging topology across two origins (57/57); the deploy tool checked against Supabase's own API spec | 🛑 The staging accounts (D1), then `staging:deploy`, `staging:check` and `staging:e2e` on the real platform | the beta |
| L3 | **The wording reads as a health or clinical claim**, bringing in the TGA, or misleads (consumer law) | L | H | Hushmates calls itself reflection; it never says it "detects" risk; `REVIEWS.md` §7 lists words never to use | A copy audit against the TGA and consumer-law lists (A$0); the lawyer (D7) | public launch |
| P1 | **The data key is lost**: every stored word becomes unreadable | L | H | The key in a private file, checked against a backup by the recovery drill | Two key holders (D11); the drill monthly | outside testers |
| P2 | **The data key leaks** | L | H | Only in Supabase's function secrets and the owner's file; never in the app or the repository; words encrypted before the database sees them | Rotation steps on staging | — |
| A2 | **Security weaknesses** no internal review found | L | H | Six adversarial reviews; access tested role by role; a strict CSP; secrets server-side; negative tests in the staging E2E | Automated scanning (A$0); a scoped penetration test before launch (D14) | public launch |
| O4 | **Production is touched by mistake** | L | H | A separate account and organisation; the deploy tool refuses a token that can see any project not named "staging", a region other than Sydney, and AI settings; nothing deploys by itself | Keep production's credentials off any machine or environment used for staging | — |

## Low

| # | Risk | L | H | In place | Next |
|---|---|---|---|---|---|
| S6 | Mallow lines say the wrong thing at a hard moment | L | M | Lines avoid diagnosis and certainty; each is screened; a death or harm never gets "chores" or "distance" lines | Tier A reads every line |
| O5 | Costs grow faster than expected | L | M | AI off with a cap of A$0; per-person limits; the Spend Cap on Pro; the cost model (`COSTS.md`) | Realtime before 10,000 people; a weekly look at usage |
| O7 | The staging keys are kept in a cloud environment's secret settings (only if the cloud path is chosen) | L | M | Staging holds test data only; the tools never print a secret; nothing from production goes there | Delete the environment's secrets after staging, or rotate them |
| P5 | A reader screenshots someone's private perspective on the homecoming screen | M | L | The "private" choice covers the share picture only, and says so | — (no technical fix exists) |
| O6 | Bots ask for many sign-in codes | L | L | Invitations; Supabase's rate limits | Turnstile if sign-up opens up (D16) |

## Changed since Phase 3

- **New:**
  - L1 and L2, from the legal research;
  - O7, from the cloud path.
- **Re-ranked:** P7 (privacy duties) is now Critical. The research found the Privacy Act probably applies despite Hushmates' size.
- **Reduced:** P4 (share pictures). Retracted content can't reach new share content.
- **Replaced:** "⛔ clinical review (D6)" is now the Tier 0 / Tier A plan in `REVIEWS.md`. A review is still needed before outside testers; it is no longer A$5,000–9,000.
