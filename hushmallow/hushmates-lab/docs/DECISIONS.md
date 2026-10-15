# Hushmates · Decisions that need the owner

The recommendation is the developer's; the choice is yours. Costs are in A$ (`COSTS.md`;
reviews in `REVIEWS.md` and `REVIEW_QUOTES.md`). The gates G1–G4 are in `LAUNCH_READINESS.md` §0.

## Decided (Phase 3c instructions, 15 October 2026)

| # | Decision | What was approved | Done, and what it still needs from you |
|---|---|---|---|
| **D6a** | Tier 0 free safety self-assessment | ✅ **Approved and done** (`docs/safety/TIER0_SELF_ASSESSMENT.md`) | You run eSafety's start-up tool with the prepared answers (`SBD_SELF_ASSESSMENT.md`, about 2–3 hours), and write the one-page WHS assessment for the desk |
| **D6c** | Ask for Tier A quotes | ✅ **Approved:** quotes only, fixed prices, limited vs full | The pack and email are ready (`REVIEW_QUOTES.md`). You send them from Hushmallow's address; this session has no email |
| **D6d** | Engage a Tier A reviewer | ⏸ **Deferred** until you've compared the quotes | — |
| **D7a** | Draft the privacy and legal documents | ✅ **Approved and drafted** (`docs/legal/`) | You read and approve them. Each requirement is labelled verified, depends on Hushmates, needs a lawyer, or recommended practice (`docs/legal/LEGAL_REQUIREMENTS.md`) |
| **D3** | Supabase Pro | ⏸ **Deferred** until the app has been shown working on real staging, and only for a clear reason | — |
| **D5** | Email provider | ⏸ **Deferred**, as D3 | — |
| **D6b** | Moderator training | ⏸ **Deferred.** Responsibilities, response times, cover and urgent handling are documented first (`docs/legal/MODERATION.md`, `ESCALATION.md`) | — |
| **D8** | "Share anonymously" | ✅ **Changed** to "Share with Hushmates participants, without my name", as recommended. It was misleading wording within Tier 0's scope | Undo it if you disagree |
| — | Spending | ⛔ **No paid service, AI, email, training or professional review** without a separate approval of scope and cost | — |

## Decided earlier (Phase 3b, 15 October 2026)

| # | Decision | What was approved | What it still needs from you |
|---|---|---|---|
| **D1** | Staging accounts | ✅ Supabase Free in Sydney and Cloudflare Free, completely separate from production | Creating the accounts (`STAGING_CLOUD.md` steps 1–3) |
| **D4** | Deploy to staging and verify it on real infrastructure | ✅ Approved | Tokens in the environment's secret settings, and the allowed domains (`STAGING_CLOUD.md` steps 4–5) |
| **D6** (old) | A$5,000–9,000 clinical review | ❌ Not approved; replaced by Tier 0 → Tier A | — |

**Unchanged:**
- production Hushmallow (its project, sign-in, Framer site, DNS, Cloudflare and users) is untouched;
- Reframe and Another Angle are unchanged;
- nothing is merged to `main`;
- nothing is public.

## New decisions from Phase 3c

| # | Decision | Options | Recommendation | Cost |
|---|---|---|---|---|
| **D19** | **Make the repository private** | It's public today. It contains Hushmates' design documents (some describe CBT, DBT and ACT as the "psychological foundation"), the safety screen's rules, the Tier 0 probe and the review sheets | **Private, now.** Under the TGA's rules, how a product is described can count towards its intended purpose. The rules and the probe also show exactly what gets past the screen. *Settings → General → Danger Zone → Change visibility*. Nothing in the app depends on the repository being public | A$0 |
| **D18** | **The screen's vocabulary gaps** (Tier 0 §4.2: 25 of 127) | (a) Keep the rule: no new patterns until Tier A labels, then one batch. (b) Bring a developer-written, caution-only batch forward for the clearest gaps (slang such as "top myself", an overdose with brand names, method and plan, someone else in danger). Measure it on a held-out half of the probe, and let Tier A review it | **(a) for outside testers; (b) is reasonable before the team beta** if you want more cover for it. Either way, the team is told the screen misses many ways of saying things | A$0 |
| **D12** | Who reads the desk, the safety lead, check times | Names in `ESCALATION.md` | **Before the team beta.** Also confirm the app's promise can be met: "during the pilot we aim to read priority reports within a day" (the team's own target is 12 hours) | A$0 |
| **D20** | Let this environment open official sites, to check the primary texts | Add `legislation.gov.au`, `oaic.gov.au`, `esafety.gov.au`, `tga.gov.au` and `safetyandquality.gov.au` to the environment's *Allowed domains* | **Optional.** The legal drafts relied on search extracts. With access, the developer can check each cited section against the official text before the lawyer sees them | A$0 |
| **D21** | The label on Mallow perspectives | Keep "Automatically generated", or change it to something like "From the Mallow library" | **Change it, after the lawyer's view.** "Generated" can suggest AI. The app's other wording now says "chosen automatically from lines the team wrote". It's pinned in share pictures and tests | A$0 |
| **D22** | "Let feelings find me" is on at the welcome | Keep it on, with the welcome explaining it; or make it an explicit choice with nothing preset | **An explicit choice.** Safety by Design asks for the safest setting by default. It's a small change, and it may lower how many feelings are caught | A$0 |
| **D23** | A contact address that isn't for emergencies | For questions, appeals, eSafety notices and privacy requests. The drafts refer to it as [contact address] | **Before G3** (L2, P7). A mailbox on a domain you control, checked at the desk's times | A$0–30 a year |

## Before testers outside the team (G3)

| # | Decision | Options | Recommendation | Cost |
|---|---|---|---|---|
| **D6d** | Approve a Tier A review | Option 1 (limited) or Option 2 (full), from the quotes | Option 1 before G3, unless the reviewer says it isn't enough | the quote |
| **D2** | The "are you safe right now?" check-in | Build it once Tier A sets the wording and routing | After D6d | A$0 |
| **D3** | The beta's Supabase plan | Free (A$0: no backups; pauses after a quiet week) or Pro (about A$40 a month all-in: daily backups, never pauses) | Pro for any beta with outside testers | ≈ A$40/month |
| **D5** | Emails for testers outside the team | A provider's free tier (Resend, Brevo) | A free tier, sending from a domain set up only for Hushmates. ⚠️ Email records on Hushmallow's production domain are a production DNS change | A$0 (a new domain ≈ A$20–30 a year) |
| **D11** | Who holds the staging root secret | You; a second named person once real people use it | — | A$0 |
| **D6b** | Moderator training | LivingWorks Start (about 90 minutes online) per desk reader | Optional; reconsider after Tier A | about A$40 + tax a person |

## Before a public launch (G4)

| # | Decision | Recommendation | Cost |
|---|---|---|---|
| **D7** | Legal and privacy review | One scoped question set for an Australian lawyer (`docs/legal/LEGAL_REQUIREMENTS.md`) | not researched; get a quote |
| **D9** | The under-16 law and age assurance | The lawyer's view first: the health-purpose exclusion and the Rules' conditions | depends |
| **D10** | AI (Another Angle) | **Stays off.** Turning it on needs, in order: the costs, Another Angle's owner, consent wording naming the provider (APP 8), then the switch. It's also a TGA change trigger | A$0 off; ≈ A$0.06 a perspective on |
| **D13** | Accessibility audit | Hands-on screen-reader testing first (A$0); an external audit before launch | not researched |
| **D14** | Security test | Automated scanning first (A$0); a scoped penetration test before launch | not researched |
| **D16** | Captcha on sign-in codes | Cloudflare Turnstile (free), only if invitations stop being the way in | A$0 |
| **D17** | Production | A separate production project, merging to `main`, launch: only after the above, and with your final approval | Pro ≈ A$40/month and up |
