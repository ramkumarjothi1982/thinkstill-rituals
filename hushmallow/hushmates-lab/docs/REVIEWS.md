# Hushmates · Independent reviews: what the law requires, and the smallest safe safety review

**Status: a proposal. No review has been commissioned, nobody has been contacted,
and nothing has been spent.** Every external review needs the owner's approval
of its scope and its cost first (`DECISIONS.md`, D6).

**How far to trust this page:**
- It is the developer's research summary, **not legal or clinical advice**.
- The research was done on 15 October 2026. Every official site (OAIC, eSafety, TGA, legislation.gov.au, APS, AAPi) refused this environment's direct connections, so each fact comes from search-engine extracts of those official pages. **Nothing is rated higher than "medium" confidence.**
- A second pass checked the arithmetic and the claims against the quoted extracts, but couldn't re-open the sources.
- Before anyone relies on a figure or a legal classification, open the source in §10.

## 1. The answer in brief

- **No Australian law requires a clinical review** of a non-clinical emotional-companion app like Hushmallow. Two things would change that:
  - becoming a medical device through clinical claims;
  - choosing to accredit against the voluntary digital mental health standards.
- **Being non-clinical does not remove the safety duties.**
  - Hushmates already runs safety functions: the crisis screen, the support screens, and the danger-report queue. Under negligence law, a function it chose to run must be run with reasonable care.
  - The Online Safety Act codes expect a service to act on self-harm risk.
  - Consumer law forbids overstating safety.
- **The A$5,000–9,000 estimate bought more than a small beta needs.** It priced two clinicians independently labelling all 379 phrasings, so their agreement could be measured. That level of evidence is needed to tune the screen against labels, or to make any measured-performance claim. It isn't needed to decide whether a small invite-only beta is reasonably safe. §2 reconstructs how the figure was reached.
- **The smallest appropriate review ("Tier A")** is one registered psychologist or Accredited Mental Health Social Worker for **about 5–6 hours**. It covers:
  - the crisis categories and the 108 hardest and most representative phrasings;
  - all 342 Mallow lines;
  - the escalation procedure;
  - a written go/no-go memo.

  Indicative cost: **A$1,650–2,040 excl. GST** at the 2026-27 professional-association rates, and up to about A$2,830 at an organisational rate (§5). A leaner version labels only the 54 undecided phrasings, for about 4–5 hours (A$1,320–1,700). Tier A comes after **"Tier 0"**: free self-assessments the team can do now, for A$0.
- **Recommendation:**
  - Tier 0 now.
  - Tier A before anyone outside the team uses Hushmates.
  - Tier B or C only when a trigger in §5.4 happens.

## 2. How the A$5,000–9,000 estimate was calculated

It was a planning placeholder from Phase 3 (`CRISIS_DETECTION.md` §8). It was **not** a quote, and its hourly rate was **not researched**. The note at the time said only "roughly 20–30 hours … at common Australian consulting rates". The split below is a **reconstruction** of how those hours were reached, not a record of a calculation.

| Part | Hours assumed | How |
|---|---:|---|
| Two clinicians label every phrasing on the blind sheet, each alone | 12.6 | 379 phrasings × about 1 minute × 2 clinicians = 758 minutes |
| Everything else, as one rough allowance (never itemised):<br>• settling disagreements;<br>• agreeing acceptance thresholds;<br>• the support wording, the check-in and the escalation procedure;<br>• the Mallow library;<br>• a written memo and a meeting | about 7–17 | An allowance, not a breakdown |
| **Total** | **about 20–30** | |
| **× an assumed A$250–300 an hour** | | 20 h × A$250 = **A$5,000**; 30 h × A$300 = **A$9,000** |

What the research now shows (§10, medium confidence):
- The rate was low for that scope. The APS's suggested fee for 2026-27 is **A$330** for a 46–60 minute consultation; the AAPi's is **A$340**.
- The same 20–30 hours would cost **A$6,600–10,200 excl. GST**.
- The scope was also larger than the risk needs, because two-rater validation answers a different question (§5.4, Tier C).

## 3. What is mandatory, advisable and optional

"Mandatory" means the law imposes it **given how Hushmates works today**. "Advisable"
means no law requires it, but it is cheap evidence of reasonable care. "Optional" means
not proportionate now. Confidence is medium unless marked *low*.

| Area | What it asks | Class | Why it applies (or doesn't) | Who can do it, and cost |
|---|---|---|---|---|
| **Privacy Act: the APPs and notifiable data breaches** | Privacy policy (APP 1); collection notice (APP 5); express consent for health information (APP 3.3); use only for the stated purpose (APP 6); overseas providers (APP 8); security (APP 11); access and correction within 30 days (APP 12–13); a breach plan with a 30-day assessment | **Mandatory**, on the likely reading | Turnover under A$3m normally exempts a small business. The exemption is lost by anyone who *provides a health service and holds health information* (s6D(4)(b)). "Health service" turns on whether the activity is intended or claimed to maintain or improve psychological health (s6FB), and the user's intention counts too. This is a legal judgement: comply as if bound | Owner and developer, using the OAIC's free guides: A$0. A lawyer's check of the policy and notice is advisable |
| **Automated decisions (APP 1.7–1.9), from 10 December 2026** | The privacy policy describes what the screen decides and what information it uses | **Mandatory** if Hushmates is an APP entity and the screen "significantly affects" people (uncertain); advisable regardless | The screen decides automatically whether a feeling travels | Policy wording: A$0 |
| **Privacy Impact Assessment** | A structured privacy risk review | **Advisable** | Mandatory only for government agencies | Self-run with the OAIC template; this repository's privacy audit is most of it: A$0 |
| **Online Safety Act: Phase 1 code** (class 1 material) | Terms that prohibit it; a way to report it; action on reports; a documented risk tier | **Mandatory** | Hushmates most plausibly counts as a "social media service". As a small, invite-only, text-only service it is probably Tier 3, the lowest | Mostly built already (reports, the desk). Write the tier decision down: A$0 |
| **Online Safety Act: Phase 2 codes** (from 9 March 2026; self-harm material) | A documented risk-tier assessment for self-harm material; terms prohibiting material that encourages or instructs self-harm; moderation of perspectives | **Mandatory** (*low*: the low-tier text wasn't retrieved) | Someone sharing distress isn't "self-harm material" (that means encouraging, promoting or instructing). The risk is foreseeable on this service | Owner and developer: A$0. Lawyer confirmation advisable |
| **eSafety removal notices** | Remove specified material within 24 hours | **Mandatory** when a notice arrives | Any service of this kind | A monitored contact address. The desk can already find and remove a feeling or perspective: A$0 |
| **Basic Online Safety Expectations** | Reasonable steps for safe use; reporting | **Advisable** (answering a reporting notice is mandatory) | Not directly enforceable | Already mapped by the design: A$0 |
| **Social media minimum age** (under 16s, from 10 December 2025) | If in scope: reasonable steps to keep under-16s off. A self-declared tick alone isn't enough | **Mandatory if in scope**; whether it is in scope is the key legal question | Hushmates arguably meets the base test. It may be outside scope through:<br>• the exclusion for services whose primary purpose is supporting users' health;<br>• the 2026 amendment (s4A), which leaves out services with no recommender feature and no logged-in-only feature.<br>Feelings that expire, and the matching, need checking against s4A | 🛑 **Needs a lawyer's view** before a public launch (D9). Not needed for a team-only beta |
| **Australian Consumer Law** | No misleading claims about privacy, security or safety; no unfair terms; services supplied with due care | **Mandatory** | Applies to anything said in trade, free or paid. "Pseudonymous", not "anonymous". Never "clinically reviewed" beyond what a review actually covered | A copy audit by the developer: A$0. Lawyer for the terms: advisable |
| **TGA (medical devices)** | Approval only if Hushmates claims to diagnose, screen, monitor, predict, prevent or treat | **Not applicable** while every claim stays non-clinical | Intended purpose is read from the copy, the app store and the website | Copy audit: A$0. Never "detects suicide risk", "reduces anxiety" or "CBT" |
| **Disability Discrimination Act** | No discrimination in providing the service | **Mandatory** (the duty). WCAG conformance itself is **advisable** | No law mandates WCAG for a private app; it is the evidence | Self-testing with screen readers: A$0. External audit before a public launch: advisable |
| **Cyber security (APP 11)** | Reasonable technical and organisational protection | **Mandatory** (the duty). A penetration test is **advisable** | No law mandates a penetration test for this kind of app | Self-review and automated scanning now: A$0. A scoped external test before a public launch: advisable |
| **Work health and safety (psychosocial)** | Identify and control the risk to anyone who reads distressing reports | **Mandatory** as soon as anyone other than the owner reads the desk, volunteers included | Desk work involves traumatic material | A written risk assessment, shift limits, debriefs and an opt-out: A$0. Training (e.g. LivingWorks Start, about A$39.95 + tax a person) is a purchase and needs approval |
| **Negligence** | Reasonable care in the safety functions Hushmates chose to run | **Applies** (a standard, not a review) | There is no general duty to prevent an adult's self-harm. A service that undertakes a crisis screen and a danger queue should run them carefully | Low-burden precautions: Tier 0 and Tier A are the evidence |
| **Clinical review** | — | **Not legally required** | No law found requires one for a non-clinical peer-support or wellbeing app | **Advisable: Tier A** (§5) |
| **National Safety and Quality Digital Mental Health Standards** | Accreditation | **Optional** (voluntary) | Peer-to-peer support apps are in scope, but implementing the Standards is voluntary. Accreditation would also cut against the non-clinical positioning | The free self-assessment, used as a checklist (Tier 0): A$0 |
| **Spam Act** | Consent and unsubscribe for commercial email | **Not applicable** to plain sign-in codes | Applies the moment an email carries promotion | Keep sign-in emails plain: A$0 |
| Also checked:<br>• ransomware reporting;<br>• smart-device rules;<br>• the Children's Online Privacy Code (draft);<br>• the Digital Duty of Care (draft) | — | **Not applicable now** | Under the A$3m turnover threshold; not a device; 18+ and probably excluded as a health service; not yet law | Watch items: re-check the Children's Code in December 2026 and the Duty of Care bill once it's introduced |
| Victoria's Health Records Act | Health Privacy Principles | **Possibly mandatory** (*low*) | No small-business exemption; it may reach Victorian users | APP-level compliance largely covers it; a lawyer can confirm |

## 4. Clinical review is not the same as the other reviews

Each review answers a different question and needs a different expert. A clinician
can't sign off a privacy policy, and a lawyer can't sign off crisis wording.

| Review | The question it answers | The right person | Proportionate form for Hushmates |
|---|---|---|---|
| 🩺 **Clinical safety** | When someone writes words suggesting risk: does Hushmates recognise them, and point to the right help? Could anything Hushmates or a Mallow says harm a person at a hard moment? Is the escalation procedure sound? | A registered psychologist (AHPRA) or an Accredited Mental Health Social Worker | Tier A (§5), before outside testers |
| ⚖️ **Privacy** | Is personal and health information collected, used, stored and disclosed lawfully? | Privacy lawyer; or a self-run PIA first | A self-run PIA, then a lawyer's check of the policy and the notice |
| ⚖️ **Legal** | Online safety codes, the under-16 law's scope, consumer law, the terms | Technology or online-safety lawyer | One scoped question set (`READINESS.md` §2), before a public launch |
| ♿ **Accessibility** | Can people with disabilities use every part, including *Get support now*? | Accessibility auditor, with screen-reader users | Self-testing now; an external audit before a public launch |
| 🔐 **Cyber security** | Can someone get at words, accounts or the desk who shouldn't? | Penetration tester | Self-review and automated scanning now; a scoped test before a public launch |

The earlier one-off figures for privacy and legal (A$8,000–20,000), accessibility
(A$3,000–8,000) and security (A$8,000–20,000) were **unresearched placeholders**. None is
needed for staging or a team-only beta. Each starts with the free self-run step above,
and none is authorised (`DECISIONS.md`).

## 5. The proposal: start free, then the smallest independent review

### 5.1 Tier 0: free self-assessment (now, A$0)

The developer can do these now, without spending anything:

| Step | What it gives | Who | Cost |
|---|---|---|---|
| eSafety *Safety by Design* start-up assessment (free; for organisations under 50 staff) | A tailored "safety health check" report | Owner, with the developer | A$0 |
| The NSQDMH Standards' free self-assessment (59 actions), as a checklist only | Gaps in incident handling, escalation and privacy governance | Developer | A$0 |
| Check the Mallow library, the support screens and the desk guide against three free guidelines:<br>• Mindframe (Everymind);<br>• #chatsafe (Orygen);<br>• Samaritans' guidelines for user-generated content | A documented mapping, and any line that fails | Developer | A$0 |
| Ask two free services whether they will comment:<br>• Mindframe's advice service, which is described as for media, so app copy may be outside it;<br>• Samaritans' Online Safety Advisory Service, which is UK-based, so eligibility is unconfirmed | Possibly free expert comment | 🛑 Owner sends the emails | A$0 |
| A written WHS risk assessment for the desk: shift limits, debriefs, an opt-out | The mandatory WHS duty, before anyone else reads the desk | Owner | A$0 |
| Optional: LivingWorks Start (about 90 minutes online), about **A$39.95 + tax a person**, for each desk reader | Basic suicide-safety training | 🛑 Owner approves the purchase | 3 people: A$119.85 + tax |

Owner and developer time: about 8–12 hours (an estimate). Tier 0 is documented due
diligence. **It is not an independent judgement**, which is why Tier A follows.

### 5.2 Tier A: the smallest appropriate independent review (before outside testers)

**Who:** one independent person, either:
- a psychologist with general or clinical registration (AHPRA), ideally with crisis or suicide-prevention experience;
- or an Accredited Mental Health Social Worker (AASW).

They must have no stake in Hushmallow. Ask them to confirm their professional indemnity insurance covers advisory work like this.

**Scope, about 5–6 hours:**

| Part | Hours | What they get | The question it answers |
|---|---:|---|---|
| 1. The pack | 0.75–1 | A 10-page summary:<br>• what the screen does;<br>• screenshots of every support screen and *Get support now*;<br>• the crisis lines shown;<br>• `ESCALATION.md`;<br>• the desk guide;<br>• the "You & safety" copy;<br>• what Hushmates says about itself | Is anything missing or unsafe in the overall design? |
| 2. Crisis recognition | 2–2.5 | The categories (crisis · someone in danger · care · release), plus the **shorter blind sheet**, `docs/clinical/tier-a-sample-for-review.csv` (`node tools/safety-eval.mjs --export <file> --sample`). It holds 108 rows at about a minute each:<br>• the 54 "undecided" rows (53 distinct phrasings);<br>• 54 others, in proportion to each group | Which of these must get support? Are the categories right? Is the planned "are you safe right now?" check-in (D2) appropriate, and with what wording and routing? |
| 3. The Mallow library | 1–1.5 | Every line, as a sheet with a column for the reviewer's call (ok · change · remove): `docs/clinical/mallow-library-for-review.csv` (`--library`). It holds 342 short lines:<br>• 49 openers;<br>• 70 lines by theme;<br>• 44 by feeling;<br>• 179 from Reframe's library, which Hushmates uses read-only and can leave out line by line | Could any line hurt someone at a hard moment? Is the rule keeping "chores" and "distance" lines away from grief, harm and health wide enough? |
| 4. Escalation and vulnerable users | 0.5 | `ESCALATION.md` | Are the 12-hour and 48-hour desk targets acceptable, given that in-app support, not the desk, carries imminent risk? Is "call 000 only if the team independently knows who it is" right? Should the account email ever be used in imminent danger? (That last one is also a privacy-law question: the "serious threat" exception, APP 6.2(c).) |
| 5. The memo | 0.5 | — | Go or no-go for an invite-only beta of up to about 30 adults, and on what conditions. What must change. **What may and may not be said publicly about this review** (consumer law: a few hours' review is not "clinical validation") |

For your information only (the sheet stays blind, so the reviewer doesn't see this):
- The 54 undecided rows hold 53 distinct phrasings; one is listed twice.
- Ten of them are also in the fixture's crisis list, so the screen already gives them support.
- Today the screen releases 36 of the 54 rows, gives crisis support for 17, and the "care" screen for 1 (`node tools/safety-eval.mjs`).
- The 36 released are where Tier A's answers matter most.

**The leaner version:**
- the reviewer labels only the 54 undecided rows (`--export <file> --undecided`);
- that saves about an hour, for about 4–5 hours in all;
- but it doesn't check the decisions the screen has already settled.

**How the reviewer labels:** they write one label per row in the `agreed` column (`crisis`, `danger`, `care`, `release` or `unsure`). Then `node tools/safety-eval.mjs --labels <their sheet>` reports, for those phrasings:
- what the screen catches;
- what it holds back;
- every miss, by name.

With one reviewer it measures no agreement and says so: it is an expert review of those phrasings, **not a validation of the screen**. The ids match the full 379-row sheet, so Tier B or C can build on these labels later.

**Indicative cost** (published rates, excl. GST; §10):

| Rate source | Rate (A$/h) | 5 h | 6 h |
|---|---:|---:|---:|
| APS suggested fee 2026-27 (46–60 min consultation) | 330 | **1,650.00** | 1,980.00 |
| AAPi recommended fee 2026-27 (40–60 min) | 340 | 1,700.00 | **2,040.00** |
| AASW consultancy (2022 schedule; 2025 figure unconfirmed) | 325 | 1,625.00 | 1,950.00 |
| AAPi organisational consultation (2024-25; the 2026-27 figure is unknown) | 471 | 2,355.00 | 2,826.00 |
| ReturnToWorkSA psychology, 1 July 2026 (a scheme rate, not a market rate; a reviewer may not accept it) | 265.20 | 1,326.00 | 1,591.20 |

- **Expect A$1,650–2,040 excl. GST** at the APS and AAPi rates. Ask for a **fixed fee** for the scope above.
- If the reviewer is GST-registered, add 10%: A$1,815–2,244. That is claimable back if the owner is GST-registered; ask an accountant.
- The ceiling at an organisational rate is about A$3,109 incl. GST.
- The leaner version, 4–5 hours: A$1,320–1,700 excl. GST.

An earlier draft of this page said 3.5–4.5 hours and A$1,155–1,530. That undercounted the Mallow library: it counted only the lines in `core/perspectives.js`, and missed Reframe's 179. It also undercounted the time to label 108 phrasings.

### 5.3 What Tier A does not do

- It doesn't measure how accurate the screen is. That needs two raters on the full sheet (Tier C).
- It doesn't support any public claim beyond "reviewed by a [psychologist] for [scope] on [date]", worded exactly as the memo allows.
- It doesn't replace the privacy, legal, accessibility or security reviews in §4.

### 5.4 Larger reviews, and what triggers them

| Tier | Who, and how long | Indicative cost (excl. GST) | When it becomes advisable |
|---|---|---|---|
| **B** | One clinician for 8–12 hours (the whole sheet by one person, thresholds, the check-in), plus a reviewer with lived experience of suicide for 3–6 hours, with a briefing, an opt-out and a debrief | Clinician 8 × 330 = A$2,640 to 12 × 340 = A$4,080. Lived-experience reviewer A$112.50–600 (3 h × A$37.50 to 6 h × A$100, published paid-participation rates). **Total about A$2,750–4,680** | Any of:<br>• a confirmed crisis the screen missed during the beta;<br>• the check-in about to go live beyond the team;<br>• more than about 100 testers;<br>• before opening sign-up beyond invitations |
| **C** (the original scope, plus a panel) | Two clinicians label all 379 phrasings blind, agree thresholds and review the wording (20–30 hours together, as in §2); a lived-experience panel of three, which the original didn't include | Clinicians A$6,600–10,200; panel A$675–1,200. **Total about A$7,275–11,400** | Before:<br>• a public launch that makes any measured safety claim;<br>• tuning the screen or the meaning-based check against labels (`CRISIS_DETECTION.md` §3) |

## 6. Lower-cost options investigated

Published prices only. **No provider was contacted**: asking for quotes is the owner's
call (§8 has a draft email).

| Option | Indicative cost | Suitable for Hushmates? |
|---|---|---|
| Free guidelines: Mindframe, #chatsafe, Samaritans, and WHO/IASP's media resource | A$0 | ✅ Yes, in Tier 0, as the benchmark |
| eSafety Safety by Design start-up tool; NSQDMH self-assessment | A$0 | ✅ Yes, in Tier 0 |
| Samaritans' Online Safety Advisory Service; Mindframe's advice line | A$0 | ❔ Worth one email each; eligibility unconfirmed |
| A single registered psychologist or AMHSW at the association rates (Tier A) | A$1,650–2,040 (leaner: A$1,320–1,700) | ✅ **The recommended independent review** |
| Lived-experience reviewers at published paid-participation rates:<br>• WA Mental Health Commission: A$37.50 or A$75 an hour;<br>• WAAMH: A$35 or A$65 an hour, 3-hour minimum;<br>• QMHC (interim): A$25, A$50 or A$100 an hour | A$112.50–300 for 3 hours | ✅ As part of Tier B |
| Moderator training:<br>• LivingWorks Start: A$39.95 + tax;<br>• Lifeline *Accidental Counsellor*: about A$250 + GST online to A$550 for two days | A$40–550 a person | ✅ Optional, for desk readers |
| Lived-experience organisations (Roses in the Ocean), Black Dog Institute consultancy | No published price ("some fees may apply") | ❔ Ask if Tier B is triggered |
| Lifeline, Beyond Blue, ReachOut, batyr | No app-review service found | ❌ |
| Psychology student placements (Monash, VU) | Free | ❌ Students can't advise. The next intake is mid-2027 |
| A university internship (APR.Intern) | About A$15,000–20,000 for 3 months | ❌ Disproportionate |
| Freelance marketplaces (e.g. US$12–38 an hour on Upwork for "clinical validation of content") | Low | ❌ Credentials and indemnity unverifiable; not for crisis sign-off |
| App-evaluation services (ORCHA) | "A small fee", unpublished | ❌ A generic app assessment, not a crisis-pathway review |

## 7. What stays the same

- **The 379-phrasing blind evaluation harness is kept as it is.**
  - The sheet, `docs/clinical/crisis-phrasings-for-review.csv`, and its scoring are unchanged. A test pins the sheet byte for byte (`tests/safety-eval.test.mjs`).
  - `tools/safety-eval.mjs` only gained ways to export subsets (with the same ids) and the Mallow library.
  - 11 rows repeat a phrasing:
    - ten are in a crisis list and again among the undecided;
    - one is listed twice among the undecided.

    This is harmless. Scores count each row, and a reviewer who labels both copies alike shows consistency.
- **Developer tests are not clinical validation.** About 330 fixture phrasings, the 379-row sheet and five adversarial review rounds show that the screen behaves *as the developers decided*. They say nothing about whether those decisions are clinically right. No document, screen or marketing line may say Hushmates' crisis handling is "validated", "clinically reviewed" or that it "detects" risk until a review supports exactly that wording.
- **Unreviewed crisis features stay behind safeguards:**
  - The keyword rules stay as the floor, frozen, and run first, with no network call.
  - The **check-in (D2) is not built**. It waits on Tier A's wording and routing.
  - The **meaning-based check is not built**. When it is built, it can only add caution, and it runs in shadow mode first.
  - **No AI is added for crisis detection.** There is no measured need yet. The harness is the way to show one, and the cost and privacy price of each option is in `CRISIS_DETECTION.md` §5.
  - *Get support now* stays on every screen, and the app keeps saying the screen can miss things.
  - **Testers stay within the team until Tier A is done and its conditions are met** (D12). This is a procedure the owner follows, not a technical lock:
    - Sign-in needs an invitation, and only the owner and admins can make them.
    - On staging, Supabase's built-in sender only emails team members, until an email provider is chosen (D5).
    - Nothing technical stops an invitation going to someone outside the team.

## 8. What the owner decides

| # | Decision | Cost |
|---|---|---|
| D6a | Approve Tier 0. The developer does the guideline mapping and the NSQDMH checklist; you do the eSafety tool and the WHS assessment, and send the two free emails | A$0 |
| D6b | Optional: buy LivingWorks Start for each desk reader | about A$40 + tax a person |
| D6c | Approve **asking for fixed-fee quotes** for Tier A from two or three reviewers. Asking costs nothing and commits to nothing | A$0 |
| D6d | Later: approve one Tier A quote | expected A$1,650–2,040 + GST (leaner: A$1,320–1,700) |

**A draft email for D6c** (for you to send; edit freely):

> Subject: Fixed-fee quote: 4-hour safety review of a non-clinical wellbeing app
>
> Hello [name],
>
> I'm building Hushmallow, a non-clinical emotional-companion app for adults: people write a feeling, a few other members offer a kind perspective, and characters called Mallows respond from a fixed library. It is not a health or counselling service. Before inviting outside testers I'd like an independent registered psychologist or AMHSW to review its safety design.
>
> Scope (about 5–6 hours, from a written pack):
> - the support screens and crisis lines;
> - about 108 example phrasings to label;
> - the app's fixed response lines (about 340 short lines);
> - our escalation procedure;
> - a short memo with go/no-go conditions for a beta of about 30 adults, and what we may say publicly about the review.
>
> No client contact is involved. Could you quote a fixed fee, your availability, and confirm that your professional indemnity covers advisory work like this?
>
> Thank you, [owner's name]

## 9. How this changes the other documents

- `DECISIONS.md`: D6 becomes D6a–D6d.
- `COSTS.md`: one-off review costs.
- `RISKS.md`: S1, S3 and S6.
- `CRISIS_DETECTION.md` §8: the plan now starts with Tier 0 and Tier A.
- `READINESS.md` §6: the review table.
- `LAUNCH_READINESS.md`: safety readiness.

## 10. Sources (seen as search extracts, 15 October 2026; medium confidence unless marked)

**Rates:**
- APS suggested fees 2026-27: [psychology.org.au](https://psychology.org.au/psychology/about-psychology/what-it-costs/private-practice-services) and [the schedule (PDF)](https://cdn.prod.website-files.com/69283787733607a2e953bbc1/69f4afa41093f06326cb000e_2026-27-APS-Suggested-Fee-Schedule-Final.pdf).
- AAPi 2026-27: [aapi.org.au](https://aapi.org.au/Web/About-AAPi/News/Articles/2026/May/26-27Recommended-Fees-Guide.aspx).
- AAPi 2024-25 (organisational rate): [PDF](https://www.aapi.org.au/common/Uploaded%20files/AAPi/2024-2025%20AAPi%20Recommended%20Fees%20detailed.pdf).
- ReturnToWorkSA, 1 July 2026: [psychology](https://www.rtwsa.com/media/documents/fee-schedules/Psychology-Fee-Schedule-1-July-2026.pdf) and [AMHSW](https://www.rtwsa.com/media/documents/fee-schedules/Accredited-Mental-Health-Social-Worker-Fee-Schedule-1-July-2026.pdf).
- AASW fees (2022–23): [via a practice's copy](https://www.forwardtherapy.com/wp-content/uploads/2023/02/Schedule-of-recommended-fees-for-Accredited-Social-Workers-in-private-practice-2023.pdf). AMHSW credential: [aasw.asn.au](https://aasw.asn.au/credentials/aasw-accredited-mental-health-social-worker).
- Paid participation: [WA MHC](https://mhc.wa.gov.au/about-us/news-and-media/news-updates/new-consumer-family-carer-and-community-paid-participation-policy), [WAAMH](https://waamh.org.au/assets/policies/Lived-Experience-Participation-Payments.pdf), [QMHC](https://www.qmhc.qld.gov.au/sites/default/files/interim_qmhc_paid_participation_rates.pdf).

**Free resources:**
- [eSafety Safety by Design for start-ups](https://www.esafety.gov.au/industry/safety-by-design/start-ups).
- [NSQDMH self-assessment](https://www.safetyandquality.gov.au/resources/self-assessment-tool-national-safety-and-quality-digital-mental-health-nsqdmh-standards).
- [#chatsafe](https://orygen.org.au/Training/Resources/Self-harm-and-suicide-prevention/Guidelines/chatsafe-A-young-person-s-guide-for-communicatin).
- [Mindframe quick reference guides](https://mindframe.org.au/quick-reference-guides).
- [Samaritans Online Harms Advisory Service](https://samaritans.org/about-samaritans/research-policy/internet-suicide/samaritans-online-harms-advisory-service).
- [LivingWorks Start](https://shopaus.livingworks.net/products/livingworks-start).

**Law:**
- Privacy Act [s6D](https://20.austlii.edu.au/au/legis/cth/consol_act/pa1988108/s6d.html) and [s6FB](https://20.austlii.edu.au/au/legis/cth/consol_act/pa1988108/s6fb.html); [OAIC, "what is a health service provider"](https://www.oaic.gov.au/privacy/your-privacy-rights/health-information/what-is-a-health-service-provider).
- Automated decisions: [Corrs](https://corrs.com.au/insights/automated-decision-making-preparing-for-the-new-transparency-obligation), [Allens](https://www.allens.com.au/insights-news/insights/2026/10/mandatory-automated-decision-making-disclosure-requirements-are-coming-key-takeaways-from-the-oaic-guidance/).
- Online safety codes: [Phase 1 regulatory guidance](https://esafety.gov.au/sites/default/files/2024-11/Phase-1-Codes-1A-and-1B-Regulatory-Guidance-Updated-Nov2024.pdf); [Phase 2 head terms](https://www.esafety.gov.au/sites/default/files/2025-09/Consolidated-Industry-Codes-of-Practice-for-the-Online-Industry-(Class-1C-and-Class-2-Material)-Head-Terms-9-September-2025.pdf) (*low*).
- Social media minimum age: [the Act](https://legislation.gov.au/C2024A00127/asmade/2024-12-10/text/original/pdf), [eSafety's self-assessment](https://www.esafety.gov.au/about-us/industry-regulation/social-media-age-restrictions/assessment), [the 2025 Rules' explanatory statement](https://www.legislation.gov.au/F2025L00889/asmade/2025-07-30/es/original/pdf).
- TGA: [the digital mental health exclusion](https://www.tga.gov.au/resources/guidance/understanding-digital-mental-health-tool-software-conditional-exclusion).
- Consumer law: [ACCC v Meta (2023)](https://www.judgments.fedcourt.gov.au/judgments/Judgments/fca/single/2023/2023fca0842).
- Accessibility: [AHRC advisory notes](https://www.humanrights.gov.au/our-work/disability-rights/world-wide-web-access-disability-discrimination-act-advisory-notes-ver-41-2014).
- WHS: [Safe Work Australia, PCBU duties](https://www.safeworkaustralia.gov.au/safety-topic/managing-health-and-safety/mental-health/whs-duties/pcbu-duties).
- Negligence: [Stuart v Kirkland-Veenstra](https://www.hcourt.gov.au/cases-and-judgments/judgments/judgments-2000-current/stuart-v-kirkland-veenstra); [NSW Civil Liability Act s5B](https://supremecourt.nsw.gov.au/about-us/publications/annotated-civil-liability-act/part-1a---negligence/division-2---duty-of-care.html) (*low*).
- NSQDMH voluntary: [ACSQHC](https://safetyandquality.gov.au/sub-brand/digital-mental-health-standards).

**Verify these provisions against the primary text first:**
- s6D(4)(b) and s6FB (health service);
- the Online Safety Act's service categories;
- the 2025 Rules' s5(1)(f) and the 2026 s4A;
- the Phase 1 code's Tier 3 measures;
- the Phase 2 code's low-tier obligations;
- the "serious threat" exception (s16A).
