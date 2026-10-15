# Hushmates · Crisis detection: a safer, maintainable design

**Status: an assessment and a plan. Nothing in it is a clinical claim.** The
safety screen has not been validated by a clinician. Until it is, it is a
floor, not a guarantee, and the app says so. ⚠️ **Independent safety review:
OUTSTANDING** (the proportionate plan is in `REVIEWS.md`).

> **Tier 0 findings (15 October 2026).** The full record is
> `docs/safety/TIER0_SELF_ASSESSMENT.md`.
> - **The screen misses much more than this page once implied.** On a new probe of 246
>   developer-written phrasings (`docs/clinical/tier0-probe-results.csv`), it showed crisis or
>   danger support for **25 of the 127** meant as crisis or danger, both before and after today's
>   fixes. It held 7 of 41 meant for care, and held back 20 of 54 everyday ones.
> - That is evidence of gaps, not a measured rate: the phrasings and their intended answers are
>   developers' guesses, not clinical labels.
> - Today's fixes repaired specific bugs (a fail-open in everyday-phrase blanking, contractions,
>   spacing, accents, invisible marks and look-alike letters, safety checked before length). They
>   added no new crisis vocabulary. That waits for the Tier A batch (§3, step 5).
> - The 379-phrasing sheet is the development and regression set, not a test set (§3, step 5).

## 1. Why the current approach has reached its limit

The screen today is keyword rules: the shared lexicon from the main app plus
Hushmates' own additions (`core/feeling-safety.js`).
- Five adversarial review rounds each found new phrasings, in both directions: risk the rules missed, and everyday feelings they held back.
- Every fix risked undoing another. `tests/fixtures/mallow-probes.json` (about 330 phrasings) now stops that, but it can only hold what someone thought of.
- A Tier 0 probe of new phrasings, written apart from the rules, released 102 of the 127 meant as crisis or danger (see the note above).
- Keyword rules can't understand meaning. "I'd be okay if I fell asleep and didn't wake up" and "I fell asleep and didn't wake up until noon" differ by context, not by keywords.

Adding more patterns won't fix this. What it needs is **a different shape**:
1. Fewer decisions resting on one guess.
2. Changes measured against labels a clinician agreed.
3. A process that stops when the numbers are good enough.

## 2. What the evidence says

Researched 15 October 2026. Sources and confidence levels are in §9.

- **Comparable services pair automated detection with people.**
  - Crisis Text Line and ReachOut's moderator assistant use a classifier to put risky messages first in the queue for trained humans.
  - A US telehealth triage system ran a keyword filter, then a classifier, then crisis specialists. Prospectively it found 98% of crisis messages, with about two in three flags real, and cut time to triage from hours to minutes.
- **Asking beats guessing in the uncertain middle.**
  - Wysa asks people to confirm before escalating.
  - Woebot deliberately over-detects; about a quarter of the people it flagged confirmed a crisis.
- **General-purpose models aren't built for this.**
  - The "self-harm" categories of hosted moderation tools (OpenAI, Azure, Llama Guard) mean content that *promotes or depicts* self-harm. That is not the same as a writer who may be unsafe.
  - None covers passive wishes ("I'd be fine if I didn't wake up") by definition.
  - A 2025 RAND study found chatbots don't distinguish intermediate risk levels the way clinicians do.
- **No open model found has clinical validation or Australian-English evaluation.** Most are trained on Reddit posts labelled by which forum they came from.
- **There is no published standard recall target** for this kind of screen. Practice reports sensitivity and positive predictive value against expert labels, with human review of what's flagged.
- **Regulation.**
  - The TGA lists suicide-prevention apps among examples of software that can be a medical device, when they are intended to predict or prevent.
  - From 10 December 2026, the Privacy Act requires automated decisions that significantly affect people to be described in the privacy policy.
  - Anthropic's usage policy (from 12 November 2026) treats assessing a mental-health condition as high-risk: it needs human review and disclosure.

  How Hushmates words this, and whether a classifier changes its position, are ⚖️ **legal and regulatory review: OUTSTANDING.**

## 3. The design: a floor, a check-in, measurement, and people

```
 feeling ──► 1 rules (in the function, no network) ──► crisis or danger ──► support screen (never sent)
                       │ clear
                       ▼
             2 "ask, don't guess" check-in  ◄── 3 meaning-based check (shadow first; can only add caution)
                       │ person says they're okay
                       ▼
                    released ──► 4 people: catchers can report "someone may be in danger" ──► the safety desk
                                                                  │
 5 measurement & governance: clinician-labelled set · thresholds · monthly batches ◄─────┘ (paraphrased misses)
```

1. **Rules stay as the floor, and they're frozen.**
   - They run first, inside the Edge Function, with no network call, so an outage can't make them fail open. (Tier 0 found and fixed one fail-open inside the rules themselves: everyday-phrase blanking hid crisis words.)
   - From now on they change only through the governance in step 5: no more one-off patterns. Tier 0's bug fixes added no vocabulary.
2. **"Ask, don't guess" for the uncertain middle.**
   - Phrasings that a clinician marks *unsure-risk* get a gentle check-in instead of a hard decision. For example: *"That sounds really heavy. Before this travels, are you safe right now?"*
   - The choices: *I'm okay, send it* · *I'm not sure* · *I'm not safe*. The last two go to the support screen.
   - This fits the people being served:
     - a false alarm becomes one kind question, not a refusal;
     - a miss gets a second chance, because the person answers for themselves;
     - Hushmates stays warm, not clinical.
   - 🩺 **The clinical adviser decides:**
     - the wording;
     - which phrasings get it;
     - whether *I'm okay, send it* sends the feeling to people as usual, or only to the Mallow.

   **Not built yet:** it waits on that decision (D2 in `DECISIONS.md`).
3. **A meaning-based check, on Supabase, at no extra cost (later, and only after measurement).**
   - What it is: Supabase Edge Functions have a built-in embedding model (`gte-small`) that runs inside the function, in the project's region (Sydney).
     - Words never leave Supabase.
     - Supabase states there is no charge beyond normal function usage.
   - How it would work:
     - It compares a feeling with a bank of clinician-labelled example phrasings.
     - It can **only add caution**: it can move a feeling from *released* to *check-in*, never from *support* to *released*.
     - If it errors or is slow, the rules' answer stands.
   - Shadow mode first: it scores feelings and keeps only counts (never words or embeddings), so its agreement with the rules and the labels can be measured before it changes anything anyone sees.
   - **Unknowns:**
     - its accuracy for this task (it's English only and untested here);
     - CPU time within the function's 2-second limit;
     - availability in every region.

     Staging measures them.
4. **People.**
   - Catchers can already report a feeling as *"Someone may be in danger"*. Such a report goes to the top of the safety desk's queue, so a crisis the screen missed can still become visible.
   - Reporters are told honestly what happens next (`core/relay.js` `_expectation`, `supabase/migrations/20261015090000_hushmates_tier0.sql`): a small team, not around the clock; priority reports read within a day during the pilot, though nights, weekends and holidays can take longer; the team can't see who wrote it or contact them; call 000 if someone is in danger now. While the owner marks the desk away (`settings.desk.awayUntil`), reporters are told when it will be read.
   - Each confirmed miss is paraphrased (never the person's words), added to the evaluation set and reviewed in the next batch.
   - Hushmates is pseudonymous, so the desk can't contact anyone. The escalation procedure is 🩺 **OUTSTANDING**.
5. **Measurement and governance: the end of the regex cycle.**
   - **The sheets:**
     - `docs/clinical/crisis-phrasings-for-review.csv`, 379 phrasings, shuffled and blind (no hint of what the screen does), is the screen's **development and regression set, not a test set.** CI pins 335 of its 379 rows to the screen's current answers, and they were written alongside the rules. Whole categories have no rows: eating disorders, threats to others, a minor disclosing, strangulation and coercive control, sexual assault without keywords, substances, third-party emergencies.
     - **The locked test set hasn't been built.** It has to be written apart from the rules and cover the missing categories. Only Tier A or a clinician can start it.
     - The Tier 0 probe (`docs/clinical/tier0-probe-results.csv`, 246 phrasings; blind copy `docs/clinical/tier0-probe-blind.csv`) is the only evidence so far written apart from the rules. It is developer-written, so it isn't a test set either.
   - **Labelling:** one reviewer labels the 108-row sample at Tier A (§8). Two clinicians labelling all 379 alone is Tier C.
   - `node tools/safety-eval.mjs --labels <sheet>` reports:
     - sensitivity for crisis and someone-in-danger;
     - the false-alarm rate on everyday feelings;
     - PPV (true on that sheet only);
     - the clinicians' agreement (Cohen's kappa), when there are two;
     - a confusion matrix of every label against every screen;
     - the rows labelled unsure;
     - risk sent to the wrong screen (crisis versus danger);
     - care rows the screen releases;
     - every miss and false alarm, by name.
   - **Acceptance thresholds are the clinical adviser's call.** A starting point to discuss, not a claim:
     - ≥ 95% of crisis and danger phrasings caught, counting the check-in as caught;
     - ≤ 2% of everyday feelings refused outright;
     - ≤ 10% of everyday feelings asked the check-in question.
   - **The rule for changes:**
     - no change to the rules, the check-in list or the example bank without the phrasings that motivated it being added to the sheet and labelled;
     - changes ship in monthly batches, and only if the numbers don't get worse;
     - a locked test set, written apart from the rules, is kept away from tuning. It doesn't exist yet, and the 379 can't become it;
     - the fixture test in CI keeps holding every past decision. It guards against regressions; it doesn't show the decisions are right;
     - **new vocabulary**, including the gaps the Tier 0 probe found, waits for the first batch after Tier A's labels.
   - **The shared lexicon:** the crisis rules start from the main app's lexicon (Reframe's), reused unchanged. A hash pin in `tests/tier0-screen.test.mjs` fails CI on any upstream change to it. The pin is updated only after Hushmates' safety lead has reviewed that change.
   - **When to stop:** when the thresholds are met on the locked set, once it exists. After that, only confirmed misses reopen the work.

## 4. What changes for people

- **Nothing that feels clinical.** The check-in speaks in the app's own voice. The support screen keeps its warmth ("Let's pause here…"), and the crisis lines stay one tap away everywhere: the *Support* pill in each screen's header (§7).
- **Fewer refusals of ordinary feelings**, once the check-in replaces hard decisions in the uncertain middle.
- **Honesty.** The welcome and *You & safety* already say the screen can miss things. That stays until a clinician has signed off the numbers. Hushmates never says it "detects" or "predicts" risk; it says it shows support when words suggest someone might need it.

## 5. Options compared

| | Where words go | Extra cost (A$/month) | Clinical fit | Recommendation |
|---|---|---|---|---|
| Rules (today) | nowhere | 0 | known ceiling | keep as the floor |
| Check-in for the uncertain middle | nowhere | 0 | asks the person; needs 🩺 wording | **build next, after the clinical decision** |
| `gte-small` on Supabase, escalate-only, shadow first | stays in the Supabase project (Sydney) | ≈ 0 (normal function use) | untested; needs the labelled set | **trial on staging after labelling** |
| Claude Haiku 4.5 via AWS Bedrock, Australian region (`au.` profile) | AWS Sydney/Melbourne | per check ≈ A$0.003; 1,000 people ≈ A$12 if every feeling, ≈ A$1 for the uncertain middle only | general model; RAND: weak at intermediate risk | not for the beta; revisit only if the two above miss the thresholds |
| Claude Haiku 5.5, first-party API | US / global (APP 8); flagged content may be kept up to 2 years even under zero retention | per check ≈ A$0.0003; 1,000 people ≈ A$1.20 | as above | not recommended (data leaves Australia) |
| Azure AI Content Safety (Australia East) | Microsoft, Australia East (to confirm) | 5,000 checks free, then about A$0.55 per 1,000 (unverified) | "self-harm" = acts, not passive wishes | not recommended |
| OpenAI Moderation | US; logs kept up to 30 days | free | categories don't cover passive wishes | not recommended |
| An open classifier (e.g. RoBERTa suicidality models) on Cloud Run Sydney | your container, Sydney | free tier likely covers the beta; ops time | Reddit-forum labels, no clinical validation | not recommended |

How these were worked out:
- Per-check costs assume about 1,700 input tokens (instructions plus a 500-character feeling) and 30 output tokens, at A$1.45 per US$1.
- Bedrock's regional endpoint adds 10%.
- People release about 4 feelings a month (`COSTS.md`).
- Any hosted option needs, first:
  - 💰 the owner's approval;
  - a Privacy Impact Assessment;
  - updated consent wording;
  - a data processing agreement;
  - the APP 8 analysis.
- Every option still needs the rules underneath, and a fallback to them.

## 6. Privacy

- **Today:** words that trigger support are never stored, circulated or sent to any AI. **Nothing counts them either.** `ops_daily` counts finds, Mallow perspectives and scheduler runs, not support screens, and the screen on the device sends nothing. Whether to count server-side support answers per day, linked to nobody, is a question for the Privacy Impact Assessment.
- **The check-in:** it stores nothing new. Whether the person chose *I'm okay* is a count, not a record tied to them, unless the clinical adviser asks otherwise.
- **The meaning-based check:**
  - Embeddings are computed in memory and thrown away. Embeddings can be partly reversed, so they are never stored.
  - Only the score band is counted, for evaluation.
- **The evaluation sheet** holds developer-written and clinician-written phrasings, never a real person's words. Confirmed misses enter it only as paraphrases agreed by the safety lead.
- ⚖️ **The privacy policy** must describe the screen as an automated decision (APP 1.7, from 10 December 2026). **OUTSTANDING.**

## 7. Reliability and fallback

- The rules run synchronously in the function, before anything else. If the rules themselves throw, the feeling is not sent, and the person sees the "something went wrong, try again" message: the safe direction.
- The check-in and the meaning-based check are additive. A timeout, an error or an outage leaves the rules' answer in place, and is counted so it can be noticed (an alert in the monitoring plan, `READINESS.md` §4).
- *Get support now* doesn't depend on any of this. A *Support* pill is in the header of every screen (`ui/relay/common.js`: `supportPill` and `openSupport`, used by `top()` and `brandBar()`, and on the welcome, sign-in, invitation, offline and deleted screens). The support screen itself shows the lines directly.
  - It opens the crisis lines in a sheet over the current screen, so a draft or a catch isn't lost.
  - First: 000, Lifeline 13 11 14, the Suicide Call Back Service 1300 659 467 and 13YARN 13 92 76. Under "More support lines": 1800RESPECT 1800 737 732, Beyond Blue 1300 22 4636 (any time) and findahelpline.com.
  - The lines are in the app's own code, so it works offline.

## 8. What to do, in order

The review plan changed in Phase 3b: the owner did not approve the A$5,000–9,000
two-clinician review. `REVIEWS.md` explains how that estimate was reached, and what
replaces it.

1. **Now, free (Tier 0):** done by the developer on 15 October 2026, except the owner's part (`docs/safety/TIER0_SELF_ASSESSMENT.md`):
   - map the support screens, the Mallow library and the desk guide against Mindframe, #chatsafe and Samaritans' guidelines;
   - fill in the NSQDMH self-assessment as a checklist;
   - the owner runs eSafety's Safety by Design start-up tool. Prepared answers: `docs/safety/SBD_SELF_ASSESSMENT.md`. **Not yet run.**
2. **Before anyone outside the team (Tier A):** one registered psychologist or AMHSW, after the owner approves a quote. Our own estimate was about 5–6 hours. **It isn't confirmed, and it may not be enough: the reviewers' quotes will say** (`REVIEW_QUOTES.md`). In this order, they:
   - **label first**, before reading the pack, on the display-id sheet (`docs/clinical/tier-a-sample-display.csv`, 108 rows, from `node tools/safety-eval.mjs --export <file> --sample --display-ids <key.csv>`): the 54 phrasings the developers couldn't decide (53 distinct), plus 54 settled ones drawn in proportion. The key (`docs/clinical/tier-a-display-key.csv`) stays with the developers and is not in the pack;
   - read all 291 Mallow lines in use (`docs/clinical/mallow-library-for-review.csv`). All 342 lines were reviewed at Tier 0, and 51 were left out (`docs/clinical/tier0-library-decisions.csv`);
   - after the blind labelling, label the Tier 0 probe as a separate, supplementary sheet (`docs/clinical/tier0-probe-blind.csv`, 246 phrasings), as far as the agreed time allows;
   - review the support wording, the check-in idea (D2) and `ESCALATION.md`;
   - write a go/no-go memo.

   `node tools/safety-eval.mjs --labels <sheet> --key docs/clinical/tier-a-display-key.csv` then scores the screen on those phrasings, by the full sheet's ids. With one reviewer that is an expert review, not a validation.
3. **When Tier A is back:** fix only what it found, in one batch, with the phrasings added to the fixture. This batch is also where the vocabulary gaps the Tier 0 probe found are first addressed.
4. **The check-in:** build it with Tier A's wording and routing (D2). A small change: one sheet and one rule set.
5. **On staging:** trial `gte-small` in shadow mode: CPU time, region, and agreement with the labels.
6. **Only on a trigger** (`REVIEWS.md` §5.4):
   - Tier B: one clinician over the whole sheet, plus a lived-experience reviewer;
   - Tier C: two clinicians label all 379 phrasings blind, the original design of step 5 in §3. That, plus a locked test set written apart from the rules, is needed before any measured safety claim, or before tuning against labels.
7. **Before launch:** the escalation procedure signed off, the privacy-policy wording (APP 1.7), and the legal view on how the screen is described (TGA, consumer law).

**Cost of the plan:** A$0 in services, and no AI calls. Reviewer time, as estimates:
- Tier 0: A$0;
- Tier A: an estimate of A$1,650–2,040 excl. GST, if 5–6 hours is enough, at the 2026-27 APS and AAPi rates (a leaner 4–5 hour version: A$1,320–1,700);
- Tier B: an estimate of A$2,750–4,680;
- Tier C: an estimate of A$7,275–11,400.

These are indicative estimates from published rates, not quotes (`REVIEWS.md` §5). The quotes replace them.

## 9. Sources (seen 15 October 2026)

Confidence follows the research notes: **High** means the primary text was read; **Medium** means search extracts or several secondary sources.

- **Supabase:**
  - AI models in Edge Functions: [guides/functions/ai-models](https://supabase.com/docs/guides/functions/ai-models) (High).
  - Launch post, "no extra cost": [blog](https://supabase.com/blog/ai-inference-now-available-in-supabase-edge-functions) (High that it was stated; Medium that it still holds).
  - Limits: [functions/limits](https://supabase.com/docs/guides/functions/limits) (High).
  - Regional invocation: [regional-invocation](https://supabase.com/docs/guides/functions/regional-invocation) (High).
- **Anthropic:**
  - Pricing: [pricing](https://platform.claude.com/docs/en/about-claude/pricing) (High).
  - Data residency (`inference_geo` is global or US only): [data-residency](https://platform.claude.com/docs/en/manage-claude/data-residency) (High).
  - Retention, including up to 2 years for flagged content: [api-and-data-retention](https://platform.claude.com/docs/en/manage-claude/api-and-data-retention) (High).
  - Usage policy, effective 2026-11-12: [aup](https://www.anthropic.com/legal/aup) (Medium).
- **AWS:** Bedrock cross-region inference for Haiku 4.5 in Australia: [blog](https://aws.amazon.com/blogs/machine-learning/introducing-amazon-bedrock-cross-region-inference-for-claude-sonnet-4-5-and-haiku-4-5-in-japan-and-australia/) (Medium).
- **Moderation tools:**
  - OpenAI moderation categories: [openai-openapi](https://github.com/openai/openai-openapi) (High).
  - Azure Content Safety: [data privacy](https://learn.microsoft.com/en-us/legal/cognitive-services/content-safety/data-privacy) (Medium).
  - Llama Guard 3 model card: [PurpleLlama](https://github.com/meta-llama/PurpleLlama/blob/main/Llama-Guard3/1B/MODEL_CARD.md) (High).
- **Evaluation and practice:**
  - Swaminathan et al. 2023, *npj Digital Medicine*: [PMC10663535](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10663535/) (Medium).
  - Milne et al. 2019, ReachOut: [JMIR](https://www.jmir.org/2019/4/e11410/) (Medium).
  - RAND 2025: [EP71040](https://www.rand.org/pubs/external_publications/EP71040.html) (Medium).
  - Chancellor & De Choudhury 2020: [PMC7093465](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC7093465/) (Medium).
- **Australia:**
  - Privacy Act s 6FB: [AustLII](https://www.austlii.edu.au/au/legis/cth/consol_act/pa1988108/s6fb.html) (Medium).
  - OAIC APP 8 guidelines: [chapter 8](https://www.oaic.gov.au/privacy/australian-privacy-principles-guidelines/chapter-8-app-8-cross-border-disclosure-of-personal-information) (Medium).
  - TGA digital mental health guidance: [fact sheet](https://www.tga.gov.au/sites/default/files/digital-mental-health-software-based-medical-devices.pdf) (Medium).
  - ACSQHC NSQDMH Standards (Medium).
  - Automated-decision transparency from 10 December 2026: [Corrs](https://corrs.com.au/insights/automated-decision-making-preparing-for-the-new-transparency-obligation) (Medium).
