# Hushmates · Remaining risks

Each risk is rated L/M/H for how likely it is and how much harm it would do,
given what's built today. "Next" is what reduces it further; D-numbers are
decisions in `DECISIONS.md`.

## Safety

| # | Risk | Likely | Harm | Already in place | Next |
|---|---|---|---|---|---|
| S1 | The screen misses words that mean someone isn't safe, so the feeling travels | M | H | Keyword rules held to ~330 phrasings; *Get support now* on every screen; catchers can report "someone may be in danger" (urgent at the desk); the app says the screen can miss things | Clinical labels and thresholds (D6), the check-in (D2), measurement instead of patches (`CRISIS_DETECTION.md`) |
| S2 | The screen holds back ordinary feelings ("false alarms") and people feel judged | M | M | 121 everyday sentences pinned as released; the support screen is warm, never accusing | The check-in (D2) turns refusals into one kind question |
| S3 | Someone in danger can't be reached: Hushmates is pseudonymous | M | H | Support lines shown at once; urgent reports go to the top of the desk | ⛔ An escalation procedure and on-call arrangement (D6, D12) |
| S4 | Unkind or harmful perspectives reach someone | M | M | Every perspective screened; reports, automatic pausing, blocking; the desk | Desk staffing during the beta (D12) |
| S5 | Moderators are harmed by what they read | M | M | Reports show only what's needed; the activity log | ⛔ Rotation, debriefs and support for moderators (WHS) |
| S6 | Mallow lines say the wrong thing at a hard moment | L | M | Lines avoid diagnosis and certainty, each is screened, a death or harm never gets "chores" or "distance" lines | 🩺 Clinical review of the library (D6) |

## Privacy and data

| # | Risk | Likely | Harm | Already in place | Next |
|---|---|---|---|---|---|
| P1 | The data key is lost: every stored word becomes unreadable | L | H | The key lives in `.data/staging.env` (private), the recovery drill checks it against a backup, and the staging check confirms the saved key is the deployed one | Two key holders (D11); monthly drill |
| P2 | The data key leaks | L | H | Only in Supabase's function secrets and the owner's file; never in the app or the repository; words are encrypted before the database sees them | Rotation steps on staging (add a key id, keep old ones) |
| P3 | No backups (Free plan) | H on Free | H | `pg_dump` plus the recovery drill (`STAGING.md` part 11) | Pro for the beta (D3) |
| P4 | A shared picture can't be recalled once made | M | M | Only perspectives their writers allowed, re-checked with the server just before drawing; no names, no writer's Mallow; writers are told a picture already made can't be taken back | — (by design) |
| P5 | A reader screenshots someone's private perspective on the homecoming screen | M | L | The "private" choice covers the share picture only, and says so | — (no technical fix exists) |
| P6 | People reveal who they are in their own words | M | M | Contact details are refused; "shares personal details" is a report reason; the release hint asks people to leave identifying details out | 🩺⚖️ Review with the PIA (D7) |
| P7 | Legal duties for health information aren't met | M | H | Consent before travel, export, deletion, retention, encryption; "pseudonymous", never "anonymous", in the app's own words | ⛔ Legal and privacy review (D7); "Share anonymously" wording (D8) |

## Platform and operations

| # | Risk | Likely | Harm | Already in place | Next |
|---|---|---|---|---|---|
| O1 | Real Supabase behaves differently from the local stand-ins (Auth, PostgREST, pg_cron, the Edge runtime) | M | M | The real `index.ts` runs under Deno against stand-ins that follow Supabase's documented behaviour; the full E2E passes through it; both key styles handled | The staging check (`STAGING.md` part 9) proves each piece on the real platform |
| O2 | A Free project pauses, and feelings stop coming home | H on Free | M | — | Pro for the beta (D3) |
| O3 | Sign-in emails don't arrive (built-in sender limits) | H for outside testers | M | The team-only beta works within the limits | An email provider (D5) |
| O4 | Production is touched by mistake | L | H | Separate organisation and account; the staging tools ask for the project reference and refuse a mismatched database address; nothing in this branch deploys by itself | Keep production's credentials off the computer used for staging |
| O5 | Costs grow faster than expected | L (beta) | M | AI off, caps and per-person limits; costs forecast | Realtime instead of polling before 10,000 people |
| O6 | Bots ask for many sign-in codes | L | L | Invitations; Supabase's rate limits | Turnstile if sign-up opens up (D16) |

## Product and access

| # | Risk | Likely | Harm | Already in place | Next |
|---|---|---|---|---|---|
| A1 | Screen-reader users hit barriers no automated check finds | M | M | Labels, roles, live regions, focus order and keyboard paths tested in the browser; reduced motion respected | ⛔ An accessibility audit with real users (D13) |
| A2 | Security weaknesses no internal review found | L | H | Five adversarial reviews; access tested role by role; strict CSP; secrets kept server-side | ⛔ A penetration test (D14) |
| A3 | The age rule (18+ tick) isn't enough under Australian law | M | H | The tick and the terms | ⛔ The lawyer's view (D9) |
| A4 | Wording reads as a health service or suicide prevention (TGA) | L | H | Hushmates describes itself as reflection; it never says it "detects" risk | ⛔ Legal and regulatory review of the wording (D7) |

⛔ means it is outstanding and blocks a public launch (`READINESS.md` §6).
