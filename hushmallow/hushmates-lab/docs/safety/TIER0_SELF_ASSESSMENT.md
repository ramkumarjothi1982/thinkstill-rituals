# Hushmates · Tier 0 free safety self-assessment (D6a)

**15 October 2026.** Approved by the owner as D6a: free self-assessment only, no paid AI and no new
infrastructure.

**Who did it, and what it is not:**
- The developer did it, with AI agents working in this repository. Each part was read by at least
  two of them, and each claim below was checked against the code.
- This is **not** an independent, professional or clinical review. It doesn't replace Tier A
  (`REVIEW_QUOTES.md`) or a lawyer (D7).
- Every test phrasing in it was written by developers. None is a real person's words.
- Australian government and guidance sites couldn't be opened from this environment, so the
  guidance was read through search extracts (§7).

## 1. The answer in brief

| Area | What Tier 0 found | What changed today | Still open |
|---|---|---|---|
| **The crisis screen** | Much weaker than the documents said. On 246 new developer-written phrasings it showed crisis or danger support for **25 of 127** meant as crisis or danger (20%), and held **7 of 41** meant for care. It also had bugs: one fail-open, one contraction, whitespace and look-alike letters | Seven bug fixes that only add caution. Block lists for catchers' perspectives. 1800RESPECT on the threat and safety screens. A hash pin on the shared lexicon (§4) | **The vocabulary gaps.** Still 25 of 127 after the fixes, because they repaired bugs, not vocabulary. They wait for one batch after Tier A (`CRISIS_DETECTION.md` §3, step 5) |
| **The 379-phrasing set** | It can't measure the screen. CI pins 335 of its 379 rows to the screen's own answers, they were written alongside the rules, and whole categories are missing (§5) | Now called the development and regression set. The scoring tool shows what it used to hide. A blind Tier A sheet with display ids. The probe kept as a separate supplementary sheet | A locked, independently written test set. Only Tier A or a clinician can start one |
| **The Mallow library** (all 342 lines) | 123 lines were flagged. Most problems came from *where* a line could reach (harm at home, the bereaved, someone worried about a person at risk, a hint of not wanting to be here), not from its words | 40 rewritten, 51 of Reframe's lines left out, 32 kept. Routing protects people hurt at home, the bereaved and people worried about someone. 291 lines now (§3) | 11 questions for Tier A (§3.4) |
| **Reporting, escalation, moderation** | The app promised "within 24 hours" while the procedure said 12. Several lines implied someone is watching. "Get support now" was two taps deep, not on every screen as five documents claimed. Nobody is named, and nothing alerts anyone | Honest wording everywhere (§6). *Support* in the header of every screen. Neutral support on paused and removed feelings. A "desk away" setting. The desk guide reordered to match the procedure. An "Over 12 hours" badge | Named readers and a safety lead. Fixed check times. A contact address. The WHS assessment. An alert (D5). §6.3 |
| **Safety by Design** (eSafety) | The design rules out most contact harms. The gaps are people, paperwork and honest claims | Prepared answers for the owner to enter (`SBD_SELF_ASSESSMENT.md`) | The owner runs eSafety's start-up tool (about 2–3 hours) |

**What this means for launch** (`LAUNCH_READINESS.md`):
- Safety and moderation readiness stays **red** for anyone outside the team.
- The screen alone isn't a safe floor for outside testers.
- A team-only beta on staging is still reasonable, once the four conditions in §9 are met.

## 2. What was checked, and how

| Part (D6a) | How | Evidence in the repository |
|---|---|---|
| The eSafety assessment | Each Safety by Design principle mapped to what the code does, with prepared answers for the start-up tool | `docs/safety/SBD_SELF_ASSESSMENT.md` |
| Digital mental health guidance | Mindframe, #chatsafe, Samaritans' platform guidelines, the NSQDMH Standards (as a voluntary checklist), and Beyond Blue's forum practice, compared with the app (§7) | §7; `SBD_SELF_ASSESSMENT.md` §7 |
| All 342 Mallow lines | Two independent readings of every line: harm, and misleading or clinical. Each flagged line was tried in its worst context through the real library and screen, then decided | `docs/clinical/tier0-library-decisions.csv`; `docs/clinical/mallow-library-for-review.csv`; `tests/mallow-probes.test.mjs` |
| The crisis rules | About 230 probes against the real functions | §4; `tests/tier0-screen.test.mjs` |
| A fresh probe | 246 new phrasings in 15 categories through the real screen. None duplicates a known phrasing | `docs/clinical/tier0-probe-results.csv` (intended answer, the screen at `000c0cd`, the screen now); `docs/clinical/tier0-probe-blind.csv` (for a reviewer) |
| The 379-phrasing set and the 108 | Each sheet rebuilt and compared byte for byte; composition, duplicates, authorship and statistical limits | §5; `tools/safety-eval.mjs` |
| Reporting, escalation and moderation | `ESCALATION.md`, the desk and its guide, and every safety string people see | §6; `docs/legal/MODERATION.md` |
| Unsafe assumptions, unresolved risks | One synthesis of the above, checked again against the code | §8; `RISKS.md` |

## 3. The Mallow library

### 3.1 What was found

- **What's good:**
  - Hushmates' own lines are warm, gently hedged, non-clinical and spelled the Australian way.
  - No Mallow claims to be a person, promises it will be fine, diagnoses anyone, or mentions death or a method.
  - The seven voices are distinct.
- **What was wrong is mostly reach, not wording.** Lines are chosen by single words ("trying", "test today", "what if", "always", "stopped texting"). So everyday lines could land on:
  - someone hurt or controlled at home;
  - someone worried about a person at risk;
  - the bereaved, including after a pregnancy loss;
  - someone seriously ill;
  - someone hinting at not wanting to be here (words the screen misses).
- **Examples:**
  - "Ooh, can we turn this over together?" opening "He calls me names and puts me down every night".
  - "Could a small thread of contact help, like a message?" for someone missing an abusive ex.
  - "Feeling torn often means both options hold something you care about… two good reasons" for "I'm not sure if I can keep going".
  - Reframe lines that excuse a harmer ("they might have been having a bad day"), or discourage checking on someone who has gone silent.

### 3.2 What changed

| | Lines | What happened |
|---|---|---|
| Flagged | 123 of 342 | 38 high, 54 medium, 31 low |
| Rewritten | 40 (Hushmates' own) | Same voice and idea, without the harm. For example, "Ooh, can we turn this over…" became "Can we look at this together for a second, really gently?" |
| Left out | 51 (all Reframe's) | Reframe's library is read-only, so these go in the `SKIP` list in `core/perspectives.js`. Tier A can return any of them line by line |
| Kept | 32 | Fine where they're meant to be used. In their worst context they mismatch rather than endanger. Each reason is recorded |
| **The library now** | **291** | 49 openers, 114 Hushmates lines, 128 of Reframe's 179. Every feeling label still has its own lines |

**Routing changes** (code, tested in `tests/mallow-probes.test.mjs`; the old library fails every case):
- **Harm or control at home** gets only tender openers. It is never offered:
  - Reframe's lines about family arguments, someone seeming annoyed, criticism, appearance, not being listened to, or future worry;
  - any "thinking habit" line.
- **A worrying silence** never gets "they're probably just busy" lines. That covers "thanks for everything" and then nothing, someone who's been really low, or someone missing overnight.
- **A mistake that hurt or killed someone** never gets "everyone makes mistakes" lines.
- **A medical or pregnancy test** isn't an exam.
- **Cancer, chemo and palliative care** count as health.
- **Grief told with "he" or "she"** ("since he passed") is recognised as grief.
- **Tiredness, health, nerves, rejection, trying and exams** step aside for a death.

All of it preserves the Mallows and their voices. No line was made clinical.

### 3.3 Not changed (for Tier A)

- A support-kind sadness line, and a Hushmates line for mistakes with real consequences.
- Bright openers can still be inferred from "can't wait for this all to be over".
- The 32 kept lines' worst contexts are listed in the decisions sheet.

### 3.4 Questions for the Tier A reviewer

1. When the words describe harm or control at home, should a Mallow offer any perspective at all, or always a support card? If one is allowed, what may it say?
2. These passed the screen in the probes and got library lines. Which should be held for care?
   - "What if I just was not here anymore?"
   - "Nobody cares whether I am here or not"
   - "I'm not sure if I can keep going like this"
   - "I just want everything to stop"
   - "I am such a waste of space"
3. Worry about someone else's safety (a goodbye message then silence, someone "talking about being a burden"): should it always route to "check on them, or call 000 or Lifeline"?
4. Are "go easy on big conclusions" and "leave big decisions for later" adequate for ideation the screen misses? Or should a line name Lifeline, and is that right in a Mallow's voice?
5. Urgent medical cues ("she has not moved much today"): "contact your maternity unit or doctor now" rather than a worry line?
6. Self-blame after serious harm: self-compassion, or a support card first?
7. Are the grief lines suitable for pregnancy loss, anticipatory grief and the death of an abusive parent? Is a grief-support signpost needed?
8. Body-image and eating cues: withhold appearance and tiredness lines and show support instead?
9. Money hardship and gambling: is "a free financial counsellor" enough, or name the National Debt Helpline or Gambling Help, and who keeps them current?
10. Are recognisable CBT exercises in plain words acceptable in a non-clinical app? See lines 329 (best, worst and most likely case), 331 (swapping "should" for "I'd like to") and 322 (relabelling). This also bears on the TGA question (`docs/legal/LEGAL_REQUIREMENTS.md`).
11. Should bright openers be blocked when ending or escape words appear?

## 4. The crisis rules

### 4.1 Fixed today (each only adds caution or fixes a bug in the rule's own intent)

Pinned in `tests/tier0-screen.test.mjs`. The 325 developer decisions and 54 undecided rows in the fixture are unchanged.

| Bug | Example, before → now |
|---|---|
| **A fail-open.** Hushmates' everyday-phrase blanking hid the shared lexicon's own crisis rule | "I don't want to live at all" (also "…with this anymore", "…at this point", "…be here for another day"): released → crisis support. "I don't want to live in Melbourne anymore" is still released |
| "Not breathing" missed the contracted forms | "He's not breathing": released → *Someone might be in danger* (not for a pet) |
| Hushmates' rules didn't collapse whitespace | "I wanna  die" (two spaces), or a line break: released → crisis support |
| Accents, combining marks, invisible characters, Cyrillic and Greek look-alike letters | "kíll myself", "k͏ill myself", "kіll myself": released → crisis support. The probe only; the words are stored as written |
| Length was checked before safety | A 520-character feeling starting "I want to kill myself": "Try the heart of it" → crisis support |
| Threats, "afraid to go home" and stalking had no family-violence line | Now 000, 1800RESPECT, Lifeline |
| **Perspectives could incite self-harm, or groom** | Now refused: "Go hang yourself", "k y s", "No one would miss you", "Try skipping dinner", "Stop taking your antidepressants", "Drink until you forget", "How old are you? We should meet up", "Send me a pic" |
| A feeling could tell its readers to hurt themselves | "kys whoever catches this" is refused. Quoted ("people at school keep telling me to kys") gets the harassment care screen |
| Catchers couldn't give a helpline number | "You could call 1800RESPECT on 1800 737 732" now passes; other phone numbers are still refused |
| An Australian postcode with its context | "VIC 3065", "postcode 3065" refused as identifying |
| **The shared lexicon could change unseen** (it belongs to Reframe) | A hash pin. Any upstream change fails CI until Hushmates' safety lead reviews it |
| The screen's "still here" line came from Reframe ("The Mallows are still here…") | Hushmates' own: "…For this, the people on these lines are ready to listen now." |

`tests/lexicon-invariant.test.mjs` now checks every fixture and probe phrasing. If the shared lexicon alone calls a phrasing crisis, the screen may release it only if it is one of five pinned everyday sentences, such as "I don't want to go on the school camp."

### 4.2 Not fixed today, and why

**The vocabulary gaps.** On the probe, by category (developer guesses at the right answer, not clinical labels):

| Category | Phrasings | Shown support | Released |
|---|---|---|---|
| Wishing not to be here (passive) | 20 | 3 | 12 (5 unsure) |
| Active intent | 16 | 5 | 9 (2 unsure) |
| Self-harm | 16 | 3 | 11 (2 unsure) |
| Method, plan or means | 15 | 1 | 14 |
| Someone else in danger | 18 | 5 | 13 |
| Family and domestic violence | 15 | 4 | 11 |
| Sexual assault | 10 | 2 | 8 |
| A child or teenager disclosing | 10 | 1 | 9 |
| Eating disorders | 10 | 1 | 8 (1 unsure) |
| An overdose already taken | 11 | 2 | 9 |
| Threats to harm others | 10 | 0 | 6 (4 unsure or fine) |
| Slang, spacing and spelling ("kms", "unalive", "top myself", "k1ll") | 31 | 4 | 23 |
| Everyday sentences built to look risky | 47 | — | 20 held back (false alarms) |

- **Why not add patterns now?**
  - The project's rule (`CRISIS_DETECTION.md` §3) is that the screen changes only in reviewed batches, with the motivating phrasings labelled. That rule exists to end the cycle of one-off patterns.
  - The probe is the only evidence written apart from the rules. Tuning the rules on it would destroy its value as a test.
  - New patterns also bring new false alarms (risk S2). A clinician should weigh that.
- **What happens instead:**
  - The probe goes to Tier A as a supplementary blind sheet, on its own, after the main labelling and before this report (which shows our results for it).
  - New categories (threats to others, a minor disclosing, eating disorders, an overdose already taken, third-party emergencies) need routes and wording that Tier A designs.
  - The owner can choose to bring a developer batch forward (D18 in `DECISIONS.md`).

**Smaller open points for Tier A:**
- a friend's crisis gets the writer's own screen, not *Someone might be in danger* (4 probe rows);
- no negation ("I'm not suicidal" is held back);
- English only (the app now says so);
- someone can reword until a feeling travels;
- bereavement by suicide is handled inconsistently.

## 5. The 379-phrasing set, and whether 108 is enough

**What the 379 are:** the screen's development and regression set.
- CI pins 335 of the 379 rows to the screen's current answers.
- The everyday rows are the rules' exceptions written as sentences.
- The crisis rows step through the rules' own alternatives: one rule catches 23 rows.
- Every row is one tidy sentence, about 8 words long.
- There are 11 exact duplicates, so 368 distinct phrasings.
- **No rows at all** for: suicide by name, eating disorders, threats to others, a minor disclosing, strangulation and coercive control, sexual assault without the keywords, substances, third-party emergencies, negation, other languages, or long posts.

**What the 108-row Tier A sample is:**
- the 54 phrasings the developers couldn't decide (53 distinct, 36 released today);
- plus 54 settled rows drawn in proportion: 28 crisis, 2 crisis-not-care, 3 danger, 1 care and 20 everyday.

(`REVIEW_QUOTES.md` previously said "roughly 30 of the 108 are risk phrasings". It is 34 developer-filed risk rows plus most of the 54 undecided.)

**Is 108 enough?**

| For | Enough? | Why |
|---|---|---|
| A clinician's call on every phrasing the developers couldn't decide, and a spot-check of 54 of their decisions | **Yes** | Each undecided phrasing gets a qualified judgement |
| A conditional, qualitative go or no-go for about 30 invited adults | **Probably**, with the Tier 0 probe and a category-by-category answer | The decision rests on named misses and missing categories, not on a percentage |
| **Any catch rate** | **No** | With about 70 risk rows, even 70 of 70 caught only shows "at least 95%" at 95% confidence. They cluster around a few dozen rules, so they behave like 17–35 independent tests. Danger has about 8 rows and care about 2. Showing ≤2% false alarms needs at least 149 everyday rows with none |

**What happens to the other 271 rows:**
1. **Now:** they stay CI regression tests. The only claim is "the screen behaves as the developers decided".
2. **After Tier A:** an internal statement naming the misses fixed. Never a percentage, never "validated".
3. **On a trigger** (a confirmed miss, more than about 100 testers, or open sign-up): the same clinician labels them (about 4.5 hours), deduplicated.
4. **Before any measured claim:** a second clinician labels all 379 blind. A new, independently written, locked set (at least 60–150 risk rows and 150 everyday rows, covering the missing categories) is the only place a threshold can be tested.

**The tooling now:**
- `tools/safety-eval.mjs` prints the confusion matrix, rows labelled unsure, crisis-versus-danger routing mistakes and released care rows.
- The PPV figure is labelled as true "on this sheet only".
- Counts are given by distinct phrasing.
- The reviewer gets `docs/clinical/tier-a-sample-display.csv`, freshly shuffled with display ids, because the old sheet's ids gave away which rows were undecided. The key stays out of the pack.
- **The reviewer labels first, then reads the pack.**

## 6. Reporting, escalation and moderation

### 6.1 What was wrong

- **Response times.** Reporters were told "we aim to look within 24 hours" (priority) and "48 hours". `ESCALATION.md` set 12 hours and wrongly said the app promised no times. Nothing said the team isn't there at night or at weekends, or that it can't see who wrote something or contact anyone.
- **Lines that implied watching or presence:**
  - "looks out for words";
  - "Rules first, people behind them… every report goes to a person";
  - on the crisis screen, "Noomi, staying close" and "I'm right here with you".
- **Support was hard to reach.** "Get support now" was the sixth section of You & safety, behind an unlabelled shield. Five documents and the risk register counted it as being "on every screen".
- **The person who might be at risk was never offered support.** If a report paused their feeling, they saw "Paused while our safety team takes a look".
- **The desk guide disagreed with the procedure.** Its urgent steps were in a different order, and they didn't fit reports about a perspective.

### 6.2 What changed (all in the app, wording in the Mallows' tone)

| Where | Now |
|---|---|
| Every screen | A small **Support** pill in the header opens the crisis lines over the current screen. Drafts and catches are kept, and it works offline. First 000, Lifeline, Suicide Call Back Service and 13YARN; then, under *More support lines*, 1800RESPECT, Beyond Blue and findahelpline. Samaritans' platform guidance is to keep signposts few at a time, so the order goes to Tier A |
| After a report | "Thank you for telling us… We're a small team and we're not here around the clock: during the pilot we aim to read priority reports within a day, and nights, weekends and holidays can take longer. We can't see who wrote it, so we can't contact them or send help. If you know someone is in danger right now, call 000…" (`supabase/migrations/20261015090000_hushmates_tier0.sql`) |
| When the desk is away | `node server/admin.mjs set desk '{"awayUntil": "2026-12-29"}'` tells reporters "Our safety team is away until Tuesday 29 December, so it will be read when we're back…" |
| Choosing "Someone may be in danger" | "Our team can't see who wrote it, so we can't contact them or send help. If you know someone is in danger right now, call 000." |
| A paused feeling | "Paused for now, until a person on our safety team can read it…", with *Get support now* beside it. The words are the same for every pause, so the reason is never revealed |
| A feeling the team brought home | "…Sometimes a feeling needs more care than a new way of seeing it. If that's true for you right now, support is here any time.", with *Get support now* |
| The welcome, You & safety, the privacy sheet | "…checks words for some signs… The check reads English only, it can miss things, and nobody is watching in real time." Reports are read "usually within a day or two" by people who "aren't counsellors, and can't see who anyone is or contact anyone". *Get support now* is first in You & safety, and its section names are headings |
| The crisis screen | The Mallow says "There are real people ready to listen, right now". Plus: "…so nobody at Hushmates will see them or be in touch." |
| The release consent | "Share with Hushmates participants, without my name" (it was "anonymously"; D8) |
| The desk | Its urgent steps match `ESCALATION.md` §3 and cover perspectives. An **Over 12 hours** badge on priority reports. The note box says "no diagnosis, no guesses". It says plainly that nothing alerts anyone while the desk is closed |

### 6.3 Still open (the owner's, all A$0)

- **Name** the safety lead, two desk readers and a backup in `ESCALATION.md`, and set fixed check times. Until then nobody is responsible for reading a report.
- **The free stop-gap for alerts:** a twice-daily phone reminder. A real alert needs email (D5).
- **A contact address that isn't for emergencies**, for questions, appeals and eSafety notices.
- **Whether the account email may ever be used** when a life may be in danger: a lawyer's view (APP 6.2(c)) and Tier A's.
- **The one-page WHS assessment** for desk readers.

`docs/legal/MODERATION.md` sets out who monitors, their duties, what users are told, what happens when no one is available, and how urgent concerns are handled.

## 7. Guidance, compared with the app

All sources are guidance, not law. All were seen through search extracts, because the sites couldn't be opened from this environment.

| Guidance | What it asks | Hushmates now |
|---|---|---|
| Mindframe | No method or location detail; "died by suicide"; at least two 24/7 services wherever mental health is discussed | No Mallow line mentions suicide, a method or a place. The support screens show 000 plus 24/7 lines. *Support* is on every screen ✅ |
| #chatsafe (written for young people; applies by analogy) | Acknowledge feelings; never present suicide as a solution; it's OK not to respond; call emergency services if someone is in danger | Catchers can pass, report "Someone may be in danger", and are told to call 000. Guidance for catchers is not written yet ⬜ |
| Samaritans (UK platform guidelines) | Named accountability; a written content policy; user-friendly reporting with a category for someone at risk; acknowledge reports and give emergency contacts; keep signposts to two or three at a time; human moderation is acceptable at low volume if trained and supported; close comments when moderation is thin | A priority category and honest acknowledgements ✅. Four lines first ✅. A desk-away notice ✅. Community guidelines drafted (`docs/legal/COMMUNITY_GUIDELINES.md`) 🟡. Named people, training and support ⬜ |
| eSafety Safety by Design | Responsibility, user empowerment, transparency; feedback and appeals; a "social contract" at sign-up | `SBD_SELF_ASSESSMENT.md`. Appeals and an outcome for reporters ⬜. Terms drafted 🟡 |
| NSQDMH Standards (voluntary) | Governance, partnering with consumers, model of care | A checklist only. Hushmates isn't accredited and claims nothing (`SBD_SELF_ASSESSMENT.md` §7) |
| Beyond Blue forums (one operator's practice) | "A couple of hours" in business hours, "up to 12 hours" outside them; "immediate support is not available" | Hushmates says "within a day" and "not around the clock". It's slower, and honest about it |

## 8. Unsafe assumptions

| # | The assumption | Why it's unsafe | Status |
|---|---|---|---|
| 1 | "Reports and moderators are the safety layer behind the rules" | When the screen misses something, nobody stands between the miss and the writer. The feeling reaches up to five strangers, a library Mallow answers within 30 minutes, and the desk reads twice a day and can't contact anyone | 🟡 Honest copy and *Support* everywhere. Named readers, Tier A and the check-in (D2) are needed |
| 2 | "*Get support now* is on every screen" | It wasn't | ✅ It is now, and the E2E checks it from five scenes |
| 3 | "Danger means the writer's own suicide or self-harm" | No rules exist for threats to others, a minor disclosing, eating disorders, an overdose already taken, strangulation and most family violence | ⛔ Tier A designs these routes |
| 4 | "Perspectives only need screening for the catcher's risk" | Incitement, health advice and grooming questions reached the writer | ✅ Blocked (§4.1). The wider list goes to Tier A |
| 5 | "Hushmates' additions only add caution" | The everyday blanking hid lexicon crisis hits | ✅ Fixed and pinned by an invariant test |
| 6 | "People understand what the safety team is" | The copy implied watching and a 24-hour promise | ✅ Reworded (§6.2). The owner confirms "within a day" can be staffed |
| 7 | "The 379-phrasing set tells us when the screen is good enough" | It can't measure the screen (§5) | 🟡 Relabelled and the tooling fixed. A locked set is still to be built |
| 8 | "An 18+ tick keeps minors out, so adult screens are enough" | No rule reads a stated age; adult lines are shown | ⛔ Lawyer (L1) and Tier A. Grooming questions are now blocked |
| 9 | "In imminent danger the team can call 000 with identifying information" | The app has no contact route, and the use of the account email is undecided | ⛔ Lawyer and Tier A |
| 10 | "NFKC is enough, and the order of checks doesn't matter" | Spaces, marks and length all let crisis words through | ✅ Fixed |
| 11 | "People write in English" | Other languages travel unscreened | 🟡 The app now says the check reads English only. Tier A decides whether to hold other scripts |
| 12 | "The desk is staffed and will notice" | No names, no alerts, no away rule | 🟡 An away setting and an overdue badge. Names and check times are the owner's |

## 9. Before the team-only beta on staging

The team beta is people the owner knows, by invitation.
1. **Names.** The owner names the safety lead and desk readers, sets the check times and a phone reminder.
2. **Briefing.** Team testers are told plainly that the screen misses many ways of saying things (§4.2), and how to use *Support* and "Someone may be in danger".
3. **Paperwork.** The owner approves the drafts in `docs/legal/` that the beta needs: the collection notice, the terms and community guidelines, the safety wording.
4. **Staging.** Staging passes its checks (`STAGING_CLOUD.md`).

**Before anyone outside the team:**
- Tier A with its conditions met, including the vocabulary batch or the check-in;
- the WHS assessment;
- a contact address;
- the legal items in `LAUNCH_READINESS.md` §3.

## 10. Files

**Safety and clinical:**
- `docs/safety/SBD_SELF_ASSESSMENT.md`: answers for eSafety's start-up tool, for the owner to enter.
- `docs/clinical/tier0-library-decisions.csv`: all 123 decisions, before and after, with reasons.
- `docs/clinical/mallow-library-for-review.csv`: the 291 lines in use, for Tier A.
- `docs/clinical/tier0-probe-results.csv`: the 246 probe phrasings and outcomes (developer-written).
- `docs/clinical/tier0-probe-blind.csv`: the same, with no outcomes, for the reviewer after the main labelling and before the pack.
- `docs/clinical/tier-a-sample-display.csv`: the Tier A sheet with display ids. Its key, `tier-a-display-key.csv`, isn't sent.

**Tests:**
- `tests/tier0-screen.test.mjs`, `tests/lexicon-invariant.test.mjs`: the screen fixes and the invariant.
- `tests/mallow-probes.test.mjs`: the library's routing.
- `tests/desk-guide.test.mjs`: the desk guide.
