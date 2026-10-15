# Hushmates · Decisions that need the owner

Nothing below has been done. Each needs your explicit approval; the
recommendation is mine, and the choice is yours. Costs are in A$ (`COSTS.md`).

## To start staging (A$0)

| # | Decision | Options | Recommendation | Cost |
|---|---|---|---|---|
| **D1** | Create the staging accounts | A new Supabase organisation and project on the Free plan (Sydney); a separate free Cloudflare account for the web app | Yes, exactly as `STAGING.md` parts 2 and 7 describe: nothing shared with Hushmallow | A$0 |
| **D4** | Deploy to staging | Part 6 (the Edge Function) and part 7 (the web app), then the staging check (part 9) | Yes, once D1 is done; share the check's report | A$0 |
| **D11** | Who holds the keys | `.data/staging.env` (and later production's) locks every word | Two named people, each with a copy in a password manager; the recovery drill monthly | A$0 |
| **D15** | Optional: let the cloud session run checks | Environment secrets and allowed hosts (`STAGING.md`, optional section) | Not needed: run the check yourself and share the report. Keep the data keys off the cloud | A$0 |

## Before real testers use it

| # | Decision | Options | Recommendation | Cost |
|---|---|---|---|---|
| **D3** | The beta's Supabase plan | Free (A$0: no backups, pauses after a quiet week) or Pro (≈ A$36 a month: daily backups, never pauses) | **Pro** for any beta with real people. Free only for staging | ≈ A$36/month |
| **D5** | Emails for testers outside the team | Supabase's built-in sender (team only, a few an hour), or a provider with a free tier (e.g. Resend, about 3,000 emails a month free; Amazon SES) | A provider's free tier, sending from **a domain or subdomain set up only for Hushmates**. ⚠️ Adding email records (SPF, DKIM, DMARC) to Hushmallow's production domain is a change to production DNS. That needs its own approval, or use a separate domain | A$0 for the beta (a new domain ≈ A$20–30 a year if you choose one) |
| **D12** | Who tests, and who answers the desk | The team only, or invited testers; how many; for how long; who reads the safety desk, and when | Start with the team; then up to ~30 invited adults; a named person checks the desk daily, with the escalation procedure agreed first (D6) | A$0 |
| **D6** | A clinical adviser | Two clinicians label `docs/clinical/crisis-phrasings-for-review.csv` (blind), agree thresholds, review the support wording, the check-in (D2) and the escalation procedure | **Yes, before anyone outside the team uses it** | ≈ A$5,000–9,000, one-off (estimate; get quotes) |
| **D2** | The "ask, don't guess" check-in | When the screen is unsure, ask "are you safe right now?" instead of guessing. If the person says they're okay, the feeling either travels as usual or goes only to their Mallow | Build it after the clinical adviser sets the wording, the phrasings and the routing (`CRISIS_DETECTION.md` §3) | A$0 |

## Before a public launch

| # | Decision | Options | Recommendation | Cost |
|---|---|---|---|---|
| **D7** | Legal and privacy review | Privacy policy and collection notice, terms, a Privacy Impact Assessment, the Online Safety Act, the social media minimum age law, APP 1.7 (automated decisions) | Engage an Australian privacy lawyer; the questions are in `READINESS.md` §2 | ≈ A$8,000–20,000 (estimate) |
| **D8** | "Share anonymously" | Keep the brief's wording, or "Share with Hushmates participants, without my name" | Change it, since Hushmates is pseudonymous, not anonymous; the lawyer decides (D7). Five places change with it (`READINESS.md` §2.7) | A$0 |
| **D9** | Age assurance | The 18+ tick, or stronger checks | The lawyer's view first (D7); it depends on whether Hushmates counts as an age-restricted platform | depends |
| **D10** | AI (Another Angle) | Stays off, or on with a monthly cap | **Stays off** for the beta: the free library answers. Turning it on needs, in order: costs, Another Angle's owner, consent wording naming the provider (APP 8), then the switch | A$0 off; ≈ A$0.06 a perspective on |
| **D13** | Accessibility audit | An external WCAG 2.2 AA audit with screen-reader users | Before launch | ≈ A$3,000–8,000 (estimate) |
| **D14** | Security test | An external penetration test of the staging copy | Before launch | ≈ A$8,000–20,000 (estimate) |
| **D16** | Captcha on sign-in codes | Cloudflare Turnstile (free) | Only if invitations stop being the way in; needs the widget built, and a site key from you | A$0 |
| **D17** | Production | A separate production Supabase project, merging this branch into `main`, launch | Only after the reviews above, and with your final approval | Pro ≈ A$36/month and up (`COSTS.md`) |

**Already decided, and unchanged:**
- production Hushmallow (its project, sign-in, Framer site, Cloudflare and users) is untouched;
- Reframe and Another Angle are unchanged;
- no paid service, AI call or email provider is switched on.
