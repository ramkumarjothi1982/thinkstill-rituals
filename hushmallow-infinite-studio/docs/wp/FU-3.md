# FU-3: Copy lint completeness (WP-06 gaps)

**Status: done.** All five FU-3 criteria are met, with the commands and measured numbers below. The work closes the WP-06 copy-lint gaps the Wave B review and the M0 audit found (M0-REPORT section 9, item 2; WP-06 integrator notes 2, 3, 4, 5, 6 and 8). The acceptance set was the reviewer's round-4 probes in `WORK/tmp/vr-wp06-r4/`. They were only read and run, never changed.

Measured on 2026-10-15 on the studio machine (4 cores, Node v22.22.0). Other agents (FU-2) were working in the same tree. The timed property run took the exclusive heavy lock, and the default and golden suites took shared slots. Scratch work went only to `/home/user/hm-work/tmp/fu3/`: probe outputs before and after, the library-verdict snapshots, the hashtag calibration, test logs, and a `git archive` copy of HEAD's planner used for the before/after comparisons.

## What was built

**1. Topic lemmas with a principled inflection model (`planner/morph.mjs`, new).**
- Every topic entry is a **lemma**. The lint matches it in all its regular English inflections:
  - endings: -s/-es/-ies, 's, -ed/-d/-ied, -ing/-ying, and -er/-est/-ier/-iest/-ers (comparative, superlative, agent noun);
  - English spelling rules: final e dropped (smoke → smoking), y to i (ugly → uglier), a doubled consonant after one short vowel (drug → drugged, cut → cutting), c to ck (panic → panicked).
- Irregular forms are data (`policy.lint.morphology.irregular`): bleed → bled, throw → threw/thrown, get → got, light → lit, lose → lost, eat → ate, catch → caught, have → has/had, and others.
- **Generation and stemming are one rule table read two ways.**
  - `forms(lemma)` generates the surface forms.
  - `lemmaCandidates(word)` is the inverse: a conservative suffix-stripping stemmer.
  - A unit test requires every generated form of every topic lemma to stem back to its lemma (3,000+ forms).
- **Derivation is never generated.** It changes meaning (grave → gravity, gravely; weed → weedy).
  - Derived words the lint must refuse are **lemmas of their own** in `planner/policy.json`: suicidal, sickly, feverish, alcoholic, alcoholism, idiotic, stupidity, disastrous, apocalyptic, anorexic, druggie, stoner, and others. This is the lemma list.
  - Words a rule would produce but that are innocent words of their own are in `morphology.notForms`: "weighted" (a weighted blanket), "weighting", "treats".
  - An entry written `=term` is matched only as written: `=rip` (ripped jeans), `=kms`, `=weed` (weeding the garden), `=abs`.
- Topic entries also match with a space or hyphen inside them as a space, a hyphen or nothing ("Self-harming.", "Selfharm.").
- The library's **banned medical terms are lemmas too**. This is a planner addition, reported under the same `medical` rule: "Diagnosed again.", "Panicking a bit.", "Healed by tea.", "holding my breath". The validator's exact patterns still run unchanged, so the superset is kept.
- `'term+'` names now go through the same generator. One morphology serves the whole lint.
- **The lemma list was extended** with the round-4 reviewer's misses, each category calibrated against the library:
  - self-harm: suicide, suicidal, "no reason to live", "want to vanish", "better off without me", razor, "thinking of ending it", …
  - death: cemetery, deceased, obituary, grief, grieve, mourn, "six feet under", …
  - illness: unwell, asthma, allergy, chemo, "food poisoning", injury, "broke my arm", ozempic, adderall, …
  - body/food: fasting, keto, bmi, "sugar crash", "junk food", "lost five pounds", "skipped lunch", "the scale says", "ate way too much", …
  - alcohol: margarita, mimosa, martini, liquor, bourbon, sober, nightcap, "day drinking", "bottle of red", …
  - drugs: heroin, meth, ketamine, shrooms, bong, "pot brownie", "lit a joint", "got baked", "pop a molly", …
  - appearance: "so pretty", "looking cute", "bad skin", "my big nose", …
  - self-hatred: moron, screw-up, "i suck", "nobody likes me", "hate my life", "i am a mess / the worst / trash", …
  - catastrophe: doomsday, armageddon, nuclear, war, earthquake, pandemic, "the world is ending", …
  - a new `violence` category;
  - claims: "one tap away", "your worries are gone", download;
  - names: tamagotchi, kleenex, band-aid, post-it, monopoly night, play-doh, …, "bad romance", "hotline bling", "blinding lights", "party in the usa", "don't stop believin'", rickroll+, "threads post";
  - breath: "gulp of air", "gasp and freeze", "hold till it hurts", "4 by 4".
- **Sizes now:**

  | List | Now | WP-06 round 3 |
  |---|---|---|
  | Topics | 419 entries in 12 categories (4 exact, 16 patterns) | 272 in 11 |
  | Names | 238 | 214 |
  | Breath-hold patterns | 38 | 33 |
  | Hashtag carriers | 58 | 36 |

- **Hashtags.**
  - Every topic and banned medical lemma is searched in all its glued inflections (#smoking, #selfharming; #suicidal is a listed lemma). A phrase varies one content word at a time, so the search never builds the product of all combinations.
  - Each term is reported once.
  - A tag may not name a time of day (#2am, #latenight, #bedtime, #4pmslump; rule `time-word`), because the owner's one list in `library/brand.json` goes on every video, whatever its time of day.
  - Carriers were added for innocent words the glued search hit: buddies, studies, candies, ladies, original, singing, weeding, awareness, software, forward, and others.
- **The brand is one word.** "Hush Mallow", "hush-mallow" and a hook split over its rows ("HUSH" / "MALLOW") fail `brand-case`.

**2. Copy lint is a true superset of `templates/validate-library.mjs` for time words.**
- `timeReading()` in `planner/lint-copy.mjs` computes the planner's reading: the keyword classes on the text with clock phrases masked, intersected with the clock classes.
- It then intersects that with **the validator's own reading as a floor**: the library's `timeWords` on the whole text, exactly as the script computes them.
- "TWO O'CLOCK IN THE MORNING", "3 IN THE MORNING AND / STILL SCROLLING" and "UP AT 4 THIS MORNING" are therefore refused on every time of day. The validator reads MORNING, the clock reads small hours, and the message says so and suggests "3 AM".
- Readings that agree are untouched ("2 O'CLOCK IN THE AFTERNOON" → afternoon|midday).
- This reverses WP-06 deviation 16, which let the masked reading replace the validator's.
- `hm lib validate` now refuses a time-word exemption on a hook or end text. The validator checks those, so an exemption there would break the superset.
- **Clock parser additions** (`planner/time-words.mjs`, WP-06 integrator note 8): "Two-ish AM.", "At 3 in the a.m." and spelled military time ("oh-two-hundred", "zero two hundred hours", "twenty-three hundred hours"). "twelve hundred people" stays a count.
- **The planner refuses to plan from a library the validator rejects.**
  - `planner/library-check.mjs` (new) restates the validator rule for rule, with the same messages, and never mutates the library.
  - `planBatch`/`planSpec` throw, naming the errors.
  - G-SPEC fails every spec with the new rule `library`.
  - `hm lib validate` reports the restatement's verdict.
  - A unit test runs the **real script** on four what-if libraries and requires the two to report exactly the same lines.

**3. `hm export` refuses draft and proof quality, and `metadata.json` records quality.**
- `exportBlockers` refuses a spec whose `quality` is not `final`, also under `--skip-qa`, with the reason (a draft is a half-resolution render with the DRAFT mark; a proof is stills).
- `--mark-posted` refuses one too.
- If the render farm left a `provenance.json` next to `final.mp4`, it must describe this very video (`final.sha256`) and a full-quality, unmarked profile (`final` or `exact`, scale 1, no mark).
- `metadata.json` gains:
  - `quality`;
  - `render`: profile, scale, mark, encoder and the provenance file's sha256, or `profile: null` with a note naming the evidence when there is no provenance.
- `hm plan --quality` and `hm spec new --quality` reject an unknown value as a usage error (exit 2). `planBatch` throws on one.

**4. G-SPEC does not pass a spec that empties its pins.**
- `packPinProblems()` (`planner/gspec.mjs`) requires `pins.packs` to name **exactly** the Mallow pack and realm preset files `library/capabilities.json` gives for the spec's Mallow and home realm.
- Each pin must carry the file's current sha256. A null hash is allowed only while the file does not exist, as a warning.
- An emptied, re-pointed, extra or hash-stripped pin is an error (`pins:pack`), and so is a wrong hash.
- New rules: `pins:engine` (the planner pins no engine; it must be null) and `pins:capabilities` (an empty capabilities hash).

**5. Tests.**
- New files:
  - `tests/unit/planner-morph.test.mjs` (3 tests);
  - `tests/unit/planner-library-check.test.mjs` (3 tests; it runs the real validator script).
- New tests in existing files:
  - `planner-lint.test.mjs`: 5 FU-3 tests;
  - `planner-gspec.test.mjs`: the pins test;
  - `planner-cli.test.mjs`: export quality and provenance, end to end through `node cli/hm.mjs`;
  - `tests/property/specs.test.mjs`: 1,000 committed-capability specs × 5 pin mutations, and two pin mutators added to the 600-mutation fuzz.
- Deliberate changes to existing assertions:
  - "3 in the morning", "Two o'clock in the morning", "Up at 3 this morning" and "Half past two in the morning" now fit no time of day;
  - the joined hook "ME HOLDING MY / BREATH AT 2 AM" now also reports `medical` ("holding my breath");
  - the golden-v2 expressibility test pins its packs properly instead of `packs: {}`.

## Files

New:
```
planner/morph.mjs  planner/library-check.mjs
tests/unit/planner-morph.test.mjs  tests/unit/planner-library-check.test.mjs
docs/wp/FU-3.md
```
Changed:
```
planner/{lint-copy,policy,gspec,export,pick,time-words,validate-lib}.mjs  planner/policy.json
cli/commands/plan.mjs  cli/commands/spec.new.mjs  cli/commands/export.mjs (comment)
tests/unit/planner-{lint,gspec,cli}.test.mjs  tests/property/specs.test.mjs
docs/SPEC.md
```
- Nothing frozen was changed, and nothing in the app or outside the studio.
- `cli/commands/export.mjs` changed only in its header comment: the refusals live in `planner/export.mjs`, which it calls.

## Acceptance criteria

### 1. The topic blocklist catches inflections and derived forms, with a principled stemmer and lemma list, and no false positives on the 652 library lines: met

**Commands:**
- `node /home/user/hm-work/tmp/vr-wp06-r4/{inflect-probe,lint-probe,tag-probe,whatif}.mjs`, before (HEAD) and after; outputs are in `WORK/tmp/fu3/{before,after}-*.out`;
- `node --test tests/unit/planner-lint.test.mjs tests/unit/planner-morph.test.mjs`;
- `node /home/user/hm-work/tmp/fu3/baseline.mjs` (the WP-06 snapshot script) before and after, diffed;
- `node /home/user/hm-work/tmp/fu3/tags-cmp.mjs` (240 innocent hashtags, HEAD planner against the working tree).

| Probe | Before (HEAD) | After |
|---|---|---|
| `inflect-probe.mjs`: "Smoked again.", "Vomiting.", "Starved by noon.", "Puking again.", "Self harming.", "Overdosed." … (39 lines) | **31 MISS** | **0 MISS** (each on its topic) |
| `lint-probe.mjs` line groups (174 lines) | 97 misses | **7 misses, all deliberate** (below) |
| `tag-probe.mjs`: #suicidal, #suicidalthoughts, #heroin, #cemetery, #nuclearwar, #ozempic, #kleenex, #bedtime, #2am, #latenight, #bodypositivity | all 11 PASS | all refused (topic, name or `time-word`) |
| `tag-probe.mjs`, the rest | — | 8 PASS, all innocent: #selfcare #sadgirlhours #cozy #sleepytime #calmdown #relax #overthinking #selflove |
| `whatif.mjs`: banned copy added to T01, 400 review specs | **459 picks of 7 banned texts** ("SUICIDAL THOUGHTS / AT 2 AM AGAIN" 38×; G-SPEC passed it) | **0 picks** (`{}`) |

**No false positives:**
- The library still passes: 652/652 texts (`every library string passes the planner lint (652 texts)`).
- The snapshot of every library text's time classes and lint verdict per (ToD, duration) shows **0 changes out of 28,935 entries** (643 distinct texts; `baseline-before.json` against `baseline-after.json`). The sampler therefore sees exactly the options it saw before. The wide Noomi property run plans the same distinct counts as WP-06 (hooks 125, line triples 663, end texts 46).
- Innocent words that only look like a listed lemma pass: "Weighted blanket mode.", "Ripped jeans again.", "Weeding the garden.", "Gravity wins again.", "Ginger tea, please.", "Singing loudly.", "Public speaking.", "Warm hugs only.", "Award night.", "Little treats.", "Shooting star!", "Dinner was good.", "The winner is me.", "Post it later.", "A monopoly on naps.", "Threads of thought.".
- Hashtags, 240 plausible innocent brand tags (time tags excluded): HEAD flagged 9, the working tree flags **1**. The one left is #healthyhabits, on "heal"; WP-06 flags health words deliberately. The five tags that died on "die" (#cuddlebuddies, #studies, …), the two on "gin" (#singing, #originalcharacter) and #weeding are now covered by carriers.

**The principle, tested:**
- `planner-morph.test.mjs` requires every generated form of every topic lemma (more than 300 content lemmas, more than 3,000 forms) to stem back to its lemma.
- It shows that derivation is never generated (grave ↛ gravity, suicide ↛ suicidal, sick ↛ sickly).
- It shows that notForms hold (weight ↛ weighted) and that `=` entries are exact.

**Deliberate passes (documented, unchanged from the library's own vocabulary):**

| Line | Why it passes |
|---|---|
| "One more round." | round is library vocabulary |
| "Snorting it." | a laughing snort |
| "Freckles everywhere." | a neutral feature, not a criticism |
| "I ruin everything." | the library's own T05 line is "Did I ruin everything?" |
| "Total meltdown." | the brand's big-feelings territory (T26) |
| "Don't let it out." | emotional expression, with no air or breath word |
| "Pause at the top." | ambiguous |

From the round-3 probe, these still pass, as WP-06 listed:
- everyday words: "Let It Go", "Frozen", "Humming Yesterday", "Excel at it.", "Scrolling X again.";
- people's names: "Beethoven at night.", "Mini golf with Jin.";
- library vocabulary: "Feeling so sad.", "Crying in the shower.", "Ate the whole cake.", "Too many snacks.", "Got hurt.";
- "Lit at the party." (lit is also a candle or lights) and "Broken heart." (T14 territory).

### 2. Copy lint is a true superset of `templates/validate-library.mjs` for clock phrases; the planner refuses to plan from a library that fails it: met

**Commands:**
- `node /home/user/hm-work/tmp/vr-wp06-r4/superset-time.mjs`;
- `node --test tests/unit/planner-library-check.test.mjs tests/unit/planner-lint.test.mjs`;
- `node cli/hm.mjs lib validate`.

**`superset-time.mjs`:**

| Hook | Validator | Planner, before | Planner, after |
|---|---|---|---|
| "TWO O'CLOCK IN THE MORNING" | morning\|pre-dawn\|misty-morning | `late-night,night`: **clean on late night** | `[]`: `time-word` on late night and on morning |
| "3 IN THE MORNING AND STILL SCROLLING" | (same) | clean on late night | refused on late night and on morning |
| "UP AT 4 THIS MORNING" | (same) | clean on late night | refused on late night and on morning |
| "2 O'CLOCK IN THE AFTERNOON" | afternoon\|midday | afternoon\|midday | afternoon\|midday (unchanged) |

**End to end against the real script** (`copy lint is a superset of the real validator…`):
1. 13 hooks, 6 resolutions and 4 lines are added to T01 in a what-if library.
2. The real `validate-library.mjs` is copied next to it and run.
3. Every text the script rejects is refused by the planner's lint in **every** time of day open to the cast. That covers 15 texts, the script's time rule included ("fit no cast Mallow's ToD" for the three clock phrases, "GOOD MORNING SUNSHINE" and "ME AFTER LUNCH AGAIN").
4. A clean late-night hook passes both, so the floor does not over-refuse.

A property over 3,000 seeded texts built from 23 time fragments shows the planner's allowed set is always within the validator's classes (2,000+ texts with validator time words).

**Refusing an invalid library:**
- `library-check reports exactly what the real templates/validate-library.mjs reports` holds for 4 libraries: the committed one (0 errors, 1 warning, identical), the probe library, one with duplicates, and one with clock and ritual faults. Errors and warnings are equal line for line.
- `planBatch` and `planSpec` throw `the story library fails templates/validate-library.mjs with 1 error(s) … fit no cast Mallow's ToD` on a library with one such hook.
- G-SPEC reports `library` on a spec checked against it. The same spec passes against the committed library.
- `hm lib validate`: `planner: library validator: the planner's restatement agrees (0 errors, 1 warning(s)); planning is allowed`, then `planner inputs OK`.

### 3. `hm export` refuses draft and proof quality, and `metadata.json` records quality: met

**Command:** `node --test --test-name-pattern="FU-3" tests/unit/planner-cli.test.mjs` (end to end through `node cli/hm.mjs`).

- For `--quality draft` and `--quality proof` production plans:
  - approval works: approving content is allowed;
  - `hm export` exits 1 with `spec quality is "draft": only final-quality renders are exported (a draft is a review render at half resolution with the DRAFT mark burned in)…`, and writes no `export/`;
  - `--skip-qa` does not lift the refusal;
  - `--mark-posted` exits 1 (`only final-quality videos are exported`).
- `hm plan --quality ultra` exits 2.
- A final spec with a `provenance.json` next to `final.mp4`:
  - one naming `profile: draft, scale 0.5, mark DRAFT` is refused with all three reasons;
  - one naming another video's sha256 is refused (`provenance.json describes another video`);
  - with the matching final provenance the export succeeds. `metadata.json` has `quality: "final"` and `render: {profile: "final", scale: 1, mark: null, encoder: "qp15", provenance: {file, sha256}}`.
- Without a provenance file, metadata has `quality: "final"` and `render: {profile: null, note: "no provenance.json next to final.mp4: …"}`.

### 4. G-SPEC does not pass a spec that empties its pins: met

**Commands:**
- `node /home/user/hm-work/tmp/vr-wp06-r4/tamper.mjs`;
- `node --test tests/unit/planner-gspec.test.mjs`;
- the property suite (criterion 5).

| Mutation (`tamper.mjs`) | Before | After |
|---|---|---|
| `pins.packs` emptied | **PASSES** (warning only) | refused `pins:pack` |
| `pins.packs` re-pointed at another file | **PASSES** | refused `pins:pack` |
| `pins.engine` set to a string | **PASSES** | refused `pins:engine` |
| the other 7 mutations | refused | refused (unchanged) |

- The unit test refuses 8 pin tampers on a committed-capability spec, each by its rule: emptied, re-pointed, hash stripped, wrong preset hash, preset dropped, extra pin, engine pinned, capabilities hash emptied.
- With open capabilities (no pack files) the pins are exactly `{file: null, sha256: null}` and pass. A forged file pin is refused.
- Property: **1,000 committed-capability specs × 5 pin mutations = 5,000 tampered specs, 0 pass**, each with a `pins:*` error. The 600-mutation fuzz now includes two pin mutators.
- The golden spec `specs/golden/t01-v2.json` and the QA fixture spec `qa/fixtures/v2/spec.production.json` still pass G-SPEC (`hm spec check`: `PASS … 0 errors, 2 warnings`; the warnings are `pins:policy`, because `policy.json` changed, and `assets-manifest-missing`).
- The QA fixtures that depend on G-SPEC behave as before:
  - `breath-hold-line` fails G-SPEC with `lint:breath-hold`;
  - `two-am-afternoon` fails with `lint:time-word`; its spec re-plans to the same id `T12-loomi-afternoon-10s-8093ea` as the built fixture;
  - `missing-draft-mark` uses the golden spec, which passes G-SPEC, so it still fails only its own gate.

### 5. Property tests over 10k specs stay green: met

**Command:** `node render/lib/heavy-lock.mjs --exclusive --label fu3-property -- node --test --test-reporter=spec 'tests/property/**/*.test.mjs'` (log: `WORK/tmp/fu3/property-1.log`).

Result: **11 pass, 0 fail, 0 skipped**, in 115 s.

| Test | Result |
|---|---|
| 1,000 committed-cell specs | `G-SPEC 1000/1000; G-DIR ran 1000, passed 1000; compile {"pass":1000}` |
| Stub composer wiring | unchanged |
| Wide Noomi set | G-SPEC 1000/1000; 2 composable specs pass G-DIR, 998 refused as not built yet (as before) |
| Whole library | 3,000 specs clean |
| 90-day plans | 3 seeds, independent check |
| Q1 | passes |
| 600 mutations | passes |
| 5,000 pin mutations | passes |
| **10k specs through `hm plan`** | **planning 924 ms; whole command 1,753 / 1,477 ms; byte-reproducible across two processes** |
| Fingerprints | stable |

### Hard rules and regressions

| Check | Command | Result |
|---|---|---|
| Default suites (guard, unit, parity, property) | `node render/lib/heavy-lock.mjs --shared --label fu3-hmtest -- node cli/hm.mjs test` | **573 tests: 572 pass, 0 fail, 1 skipped** (the opt-in 25-min sequential render), 3 min 42 s. Log: `WORK/tmp/fu3/hmtest-1.log`. Includes the golden T01 exact parity and the machine-wide write audit. The run included FU-2's in-progress changes in the same tree |
| Golden suite (QA on v2 runs G-SPEC) | `node cli/hm.mjs test golden` | **14 pass, 1 skipped** (the opt-in fixture suite), 7 min 34 s |
| Guard | `node cli/hm.mjs guard` | ok: frozen v2 (tree 8d0627dfee6d, local 9a740db17b29), live app untouched, nothing outside the studio root changed, nothing written outside the studio and WORK |
| Goldens | `node render/lib/heavy-lock.mjs --shared -- node cli/hm.mjs golden verify` | ok, pixel tolerance 0/255, state tolerance 1e-9 |
| Planner unit tests | `node --test tests/unit/planner-*.test.mjs` (in the write jail) | 97/97 (84 before FU-3) |
| `hm lib validate` | — | exit 0: story library OK (1 warning, as before); planner inputs OK |
| `hm lib coverage` | — | unchanged: 1/28 plannable; T01 hooks 8, lines 4/4/4, resolutions 2 |
| QA fault fixtures (G-SPEC is one of the QA gates) | `HM_QA_FIXTURES=1 node render/lib/write-jail.mjs -- node --test --test-name-pattern="fault fixture" tests/golden/qa-suite.test.mjs` | **pass**: every fault fixture fails exactly its own gate, 5 min 16 s (log `WORK/tmp/fu3/qa-fixtures.log`) |
| Round-3 verifier probes | `WORK/tmp/verify-wp06-r3/probe/{lint,split}-probe.mjs` | no regression: the remaining passes are the listed deliberate ones |

## Deviations, with reasons

1. **Derived forms are listed, not generated.** The brief asks for "a principled stemmer/lemma list". Inflection is generated (it never changes meaning). Derivation is listed per word (suicidal, sickly, alcoholic, apocalyptic), because generated derivation over-reaches: grave → gravity and gravely, weed → weedy, fat → fatal.
2. **The validator's floor makes some clock phrases unplannable on every time of day.** "3 in the morning" clearly means 3 AM, but the library validator reads its MORNING keyword. A superset may not accept in a late-night template what the validator rejects there, so the planner refuses it everywhere and says to write "3 AM". This reverses WP-06 deviation 16. No library text is affected (0 of 28,935 verdicts changed).
3. **Hashtags may not name a time of day.** This is a new rule (`time-word` in `lintHashtag`), from WP-06 integrator note 8. One owner list goes on every video, so "#2am" on a morning video would contradict it. The owner may later want per-ToD tag lists; that would be a schema change to `library/brand.json`.
4. **Inflections of the library's banned medical terms are refused** (a planner addition under the rule `medical`). This follows the library's own intent ("diagnosed", "panicking", "healed"). One noun is exempt: "treats" is a snack or reward (`morphology.notForms`).
5. **Lemma-list additions go beyond inflection.** The acceptance set is the reviewer's round-4 probe, so its misses were added: new vocabulary, a `violence` category, some names and breath patterns. Each was calibrated against the library (0 verdict changes) and against 240 innocent hashtags (no new false positive).
6. **`hm export` also checks a render `provenance.json` when one exists.** Spec quality alone cannot prove how the video was rendered. Today the farm's job folder and the variant folder are separate (M0-REPORT section 10), so most exports carry no provenance yet; `metadata.json` then says so.
7. **G-SPEC requires `pins.engine` to be null.** The planner never sets it, and the render's `provenance.json` records the engine. A future package that pins engines must change the `pins:engine` rule in `planner/gspec.mjs` and `docs/SPEC.md` together.

## Open issues and notes for the integrator

1. **Owner decisions** (planner defaults, all in `planner/policy.json`):
   - the deliberate passes listed above;
   - meal-time and other day words ("Lunchtime already.", "Breakfast time.", "Rush hour.", "In broad daylight.") still pin no time of day, as in WP-06; the owner has not confirmed this;
   - the no-time-in-hashtags rule;
   - `notForms` ("treats", "weighted");
   - the new `violence` and claims entries.
2. **Not in FU-3's scope, still open from WP-06 integrator note 7:** `docs/SPEC.md` differs from the plan's `hm-variant/1` data model in three ways: `cells` holds a bare status rather than `approved@sha:<cell version>`, `sound.panSeed` replaces `panWidth`, and `pins.packs` holds `{file, sha256}` objects. The pins rule here enforces the `{file, sha256}` shape as it stands.
3. **Spec pins after a policy change.** `specs/golden/t01-v2.json` and `qa/fixtures/v2/spec.production.json` now show a `pins:policy` warning, because `planner/policy.json` changed. It is a warning by design (copy and capabilities are re-checked live). Re-sealing them is optional and would change their hashes, so it is left to the integrator.
4. **The hashtag lint fails closed.** A future innocent tag with a listed term inside it needs a carrier entry (`policy.lint.hashtags.carriers`). #healthyhabits stays flagged on "heal", as WP-06 decided.
