# Hushmates · Decisions that need the owner

The recommendation is the developer's; the choice is yours. Costs are in A$
(`COSTS.md`; reviews in `REVIEWS.md`).

## Decided (Phase 3b instructions, 15 October 2026)

| # | Decision | What was approved | What it still needs from you |
|---|---|---|---|
| **D1** | Staging accounts | ✅ **Approved:** Supabase Free in Sydney and Cloudflare Free, completely isolated from production | Creating the accounts. It's your sign-up, so the developer can't do it (`STAGING_CLOUD.md` steps 1–3) |
| **D4** | Deploy to staging and verify it on real infrastructure | ✅ **Approved:** the real app and backend on staging; real Auth, RLS, permissions, Edge Function, scheduling, encryption, concurrency and deletion; the whole journey on desktop and mobile; negative security tests | Tokens in the environment's secret settings, and the allowed domains (`STAGING_CLOUD.md` steps 4–5). The developer then runs everything |
| **D6** (old) | A$5,000–9,000 clinical review | ❌ **Not approved.** Replaced by a risk-based proposal (D6a–D6d below; `REVIEWS.md`) | — |
| **D3** | Supabase Pro | ⏸ **Not now.** Staging stays Free | Revisit before testers outside the team |
| — | Spending | ⛔ **No paid service, AI, email, or professional review** without a separate approval of scope and cost | — |

**Unchanged:**
- production Hushmallow (its project, sign-in, Framer site, DNS, Cloudflare and users) is untouched;
- Reframe and Another Angle are unchanged;
- nothing is merged to `main`;
- nothing is public.

## Needed for the approved staging work (A$0)

| # | Decision | Recommendation | Cost |
|---|---|---|---|
| **D15** | How the staging deploy and tests run | **In the cloud session** (`STAGING_CLOUD.md`): you add four secrets and five allowed domains, and nothing has to be installed on your computer. Or on your computer (`STAGING.md`), sharing the reports | A$0 |
| **D11** | Who holds the staging root secret (it unlocks every stored staging word) | You, in your password manager; a second named person once the beta has real people | A$0 |

## Before testers outside the team

| # | Decision | Options | Recommendation | Cost |
|---|---|---|---|---|
| **D6a** | Tier 0 safety self-assessment | The developer maps the Mallow library and support screens against Mindframe, #chatsafe and Samaritans, and fills in the NSQDMH checklist. You run eSafety's free start-up tool, write the WHS assessment for the desk, and email Samaritans and Mindframe | **Yes, now** | A$0 |
| **D6b** | Moderator training | LivingWorks Start (about 90 min online) for each desk reader | Optional | about A$40 + tax a person |
| **D6c** | Ask for Tier A quotes | Two or three registered psychologists or AMHSWs; fixed fee; the draft email is in `REVIEWS.md` §8 | **Yes**. Asking commits to nothing | A$0 |
| **D6d** | Approve a Tier A review | One reviewer for 3.5–4.5 hours: crisis categories and 108 phrasings, every Mallow line, the escalation procedure, a go/no-go memo | Before outside testers | expected A$1,155–1,530 + GST |
| **D2** | The "are you safe right now?" check-in | Build it once Tier A sets the wording and routing | After D6d | A$0 |
| **D3** | The beta's Supabase plan | Free (A$0: no backups, can pause after a quiet week) or Pro (A$35.70 a month, about A$40 all-in: daily backups, never pauses) | Pro for any beta with outside testers | ≈ A$40/month |
| **D5** | Emails for testers outside the team | A provider's free tier (Resend: 3,000 a month, 100 a day; Brevo: 300 a day) | A free tier, sending from **a domain or subdomain set up only for Hushmates**. ⚠️ Email records on Hushmallow's production domain are a production DNS change: that needs its own approval, or use a separate domain | A$0 (a new domain ≈ A$20–30 a year, if chosen) |
| **D12** | Who tests, and who reads the desk | The team, then up to about 30 invited adults | Start with the team. Outside testers only after D6d's conditions are met. Name the desk readers and the safety lead in `ESCALATION.md` | A$0 |
| **D7a** | Privacy basics | Privacy policy, collection notice, consent wording, breach plan, self-run PIA | The developer drafts them from the OAIC's free guides, and you approve. A lawyer's check is D7 | A$0 |

## Before a public launch

| # | Decision | Recommendation | Cost |
|---|---|---|---|
| **D7** | Legal and privacy review | One scoped question set for an Australian lawyer (`READINESS.md` §2, `REVIEWS.md` §3) | not researched; get a quote |
| **D8** | "Share anonymously" | Change it: Hushmates is pseudonymous. Five places change with it (`READINESS.md` §2.7) | A$0 |
| **D9** | Under-16 law and age assurance | The lawyer's view first: health-purpose exclusion, s4A features | depends |
| **D10** | AI (Another Angle) | **Stays off.** Turning it on needs, in order: the costs, Another Angle's owner, consent wording naming the provider (APP 8), then the switch | A$0 off; ≈ A$0.06 a perspective on |
| **D13** | Accessibility audit | Hands-on screen-reader testing first (A$0); an external audit before launch | not researched |
| **D14** | Security test | Automated scanning first (A$0); a scoped penetration test before launch | not researched |
| **D16** | Captcha on sign-in codes | Cloudflare Turnstile (free), only if invitations stop being the way in | A$0 |
| **D17** | Production | A separate production project, merging to `main`, launch: only after the above, and with your final approval | Pro ≈ A$40/month and up |
