# Variant spec `hm-variant/1`

A spec is one planned video. The planner (`planner/pick.mjs`) writes it, G-SPEC (`planner/gspec.mjs`) judges it, and the composer compiles it into `direction.json`, `cues.json` and curves. It is the only input of compile. The machine-readable contract is `planner/schema/hm-variant-1.schema.json`; this page explains what each field means and how the composer should use it.

```
templates/story-library.json + library/capabilities.json + planner/policy.json + ledger/
        │  hm plan / hm spec new                     (seeded, capability-gated, lint-clean)
        ▼
runs/<batch>/<id>/spec.json  ──►  G-SPEC  ──►  composer: direction.json, cues.json  ──►  G-DIR, G-COST  ──►  render
                                  hm spec check     hm spec compile (G-SPEC only until the composer exists)
```

## Invariants

- **Everything is explicit.** No field is optional, and the composer needs no other planner input. The only randomness left is what the composer derives from `seed` through named streams. The composer reads the library for structure (beat clock, staging notes), never for choices.
- **Copy comes only from the story library.** Every string is a library string, checked for membership by G-SPEC. Strings are stored as plain ASCII/Latin-1, exactly as the library holds them. The renderer applies the typography transform (see Copy).
- **Deterministic.** The same inputs give byte-identical specs in any process: the library, capabilities, policy, ledger, seed, batch, count and dates. The planner core never reads the wall clock. Dates and timestamps are inputs, and the CLI is the only place that reads the time.
- **Identity.** `fingerprint` is the sha256 of the visible slots plus the seed, so key order never matters. `id` is derived from it. Editing a visible field without re-sealing breaks both, and G-SPEC refuses the spec.
- **Gated.** Every move cell, Mallow pack and realm/time-of-day/duration preset must be enabled in `library/capabilities.json`:
  - production specs need `approved`;
  - review specs may also use `candidate` move cells.
  G-SPEC re-checks this against the capabilities of today, not of plan time.

## Fields

| Field | Type | Meaning | Read by |
|---|---|---|---|
| `schema` | `"hm-variant/1"` | Contract version. Any new field is a schema bump (`additionalProperties: false`). | all |
| `id` | string | `<Txx>-<mallow>-<tod>-<D>s-<6 hex of fingerprint>`, e.g. `T01-noomi-late-night-15s-fdde38`. Folder name under `runs/<batch>/`. | all |
| `batch`, `index` | string, int | Batch id and position in it. In production, `index` is post order. | farm, gallery, G-SPEC |
| `mode` | `production` \| `review` | Production: a post on `channel` on `plannedFor`, checked against the posting rules. Review: an internal look, which may use candidate cells. | G-SPEC, export |
| `internal` | bool | Exactly `mode === "review"`. The engine burns the INTERNAL mark into the frame (G-FINAL checks it). Internal specs are never exported or posted. | engine (`runtime/marks.js`), QA |
| `quality` | `final` \| `draft` \| `proof` | Render profile (PHASE2-PLAN Profiles). Draft carries the DRAFT mark. Only `final` is ever exported (`hm export` refuses `draft` and `proof`; `metadata.json` records the quality). | farm, engine, export |
| `channel`, `plannedFor` | string\|null, `YYYY-MM-DD`\|null | Production only: the channel and planned post date. Both are null in review. | G-SPEC, export |
| `template` | string | Full library id (`T01-brain-at-2am`). Gives the staging notes, the beat structure and the cast. | composer, score |
| `mallow`, `realm` | slug | The Mallow and its home realm. No guest realms. | composer (pack, face style), engine (world module) |
| `tod` | slug | Time of day of the realm preset (`late-night`, `dusk` and so on). Selects the palette triple and light rig. | composer, engine |
| `weather` | slug | One of the realm's approved weather states (`clear` today). | composer (world dials), engine |
| `dressing` | `[{id, variant}]` | Up to `dressingBudget.maxItems` set pieces from the realm's approved dressing, sorted by id. Empty today. | composer, engine |
| `duration` | 10 \| 12 \| 15 \| 20 | Selects the beat clock `library.beatClocks[duration]`. | composer, score |
| `seed` | uint32 | Root of every remaining random choice in the composer: micro-timing within ±80 ms on non-sync beats, blinks, glances, orbit slots, motes, decoys. | composer |
| `gag` | `{id, intensity}` | Gag move and its intensity in (0, 1]. The planner caps intensity per template (T14/T26 ≤ 0.4, T09 and gentle-comic ≤ 0.6) and samples it in [0.8·cap, cap]. The move maps intensity onto its approved parameter range. | composer move |
| `metaphor`, `turn`, `ritual`, `loop`, `camera`, `arc` | move ids | One move per slot: `composer/moves/<kind>/<ID>.js`. `loop` is the template's strategy (LP-BASE always applies on top). `arc` is the template's palette arc. `turn` is one of TURN-SQUEEZE, TURN-STOP or TURN-SIGH. | composer |
| `worldJitter` | `{hue °, warmth, exposure}` | World-only grade jitter within ±6°, ±0.1 and ±0.05. The Mallow is never recoloured. G-DIR still limits exposure change to ≤ 12%. | composer (world dials) |
| `copy.hook` | 1–2 strings | ALL-CAPS cover caption, shown 0..HOOK_OUT and again from HOOK_IN. | composer (TextBlock), export |
| `copy.lines` | 3–4 strings | Escalation thoughts L1, L2, L3, and at 20 s an optional L4. Each line comes from its own pool, and L4 from any unused pool line. A bubble wraps to ≤ 2 rows of ≤ 17 characters, using the same rule as the validator. | composer (metaphor props) |
| `copy.end` | `{kind, text[1-2]}` | `resolution` (a template line) or `closer` (a brand closer), never both. Shown RESOLVE..CARD_OUT above the logo card. | composer, export |
| `copy.nameWord` | string\|null | Only with R-NAMEIT: a lowercase everyday feeling word from the template. | composer |
| `sound` | `{motifs, contour, tickTempo, panSeed}` | `motifs` is the template's motif list (MO-CLOSE always included). `contour` is one of rise-1, rise-2, arch-1 or arch-2. `tickTempo` is ×0.9–1.1. `panSeed` seeds the pans. These are audio-only slots, so `hm remux` can change them. | score (WP-04) |
| `cells` | `{"<move>/<mallow>": "approved"\|"candidate"}` | Status of the 7 move cells at plan time. G-SPEC requires it to equal today's status. | provenance, gallery |
| `pins` | object | `library` (version), `librarySha256`, `capabilitiesSha256` and `policySha256`. `packs` maps exactly the Mallow pack and the realm preset to `{file, sha256}`: the files `library/capabilities.json` gives for `mallow` and `realm`, with the sha256 of each as planned (`null` only while the file does not exist). `engine` is null: the render's `provenance.json` records the engine SHA. G-SPEC refuses emptied, re-pointed or hash-stripped pins (FU-3). | G-SPEC, provenance |
| `fingerprint` | `sha256:<hex>` | See Identity. | G-SPEC, ledger, G-DUPES |

## Copy, as the composer should draw it

- **Typography transform.** Strings are ASCII. Draw them through `typographic()` from `planner/typography.mjs`: an ASCII quote that opens a word becomes ‘ or “, and any other becomes ’ or ”. The planner's layout pre-check measures the transformed text, so the composer must apply the same transform. That module is pure, with no imports, so it loads in the render page.
- **Styles** (story-library `format.layout`):
  - hook: 600 weight, tracking 2, auto-fit 76 → 50 px inside 960 px;
  - bubbles: 500 weight, 50 px, 38 px horizontal padding;
  - end card: 500 weight, 62 px.
  The planner guarantees every hook fits at 50 px and every end line fits at 62 px, with a 4% margin over the Fredoka metrics. The model's worst error on the 1,582 library strings is 1.79% (`planner/metrics/fredoka-metrics.json`, `libraryCheck`).
- **Reading time.** Every copy element is one readable text, however it wraps into rows: a thought line, the whole hook (both rows joined by a space), the whole end card. Each is guaranteed max(min, 0.25 s + 0.05 s × characters) inside its clock window (G-DIR re-measures the real visibility on the alpha curves, which is slightly shorter because fades take time):
  - hook: (D − HOOK_IN) + HOOK_OUT, minimum 2.0 s. The hook returns at HOOK_IN and stays through the loop seam until HOOK_OUT (`policy.reading.hookWindow: "cyclic"`; `"first-view"` counts 0..HOOK_OUT only);
  - thought Lk: Lk..RITUAL[0], minimum 1.0 s;
  - end card: RESOLVE..CARD_OUT, minimum 2.0 s.
  The rule bites: of the hooks of templates offering that duration, 32/128 fail at 10 s and 5/221 at 12 s; of the resolutions, 12/48 at 10 s, 13/84 at 12 s, 7/84 at 15 s and 2/84 at 20 s. For example, none of T01's three resolutions fits the 12 s card (2.3 s), so a T01 12 s spec ends on the closer "Your second brain for feelings.".
- **Time words agree with `tod`**, in thought lines too (`planner/time-words.mjs`, `planner/lint-copy.mjs` `timeReading`):
  - every explicit clock time is read as one phrase and mapped by its hour through `policy.lint.clockTimes`: "2:00 AM", "2.30am", "3 a.m.", "TWO AM", "two-thirty a.m.", "2 o'clock AM", "quarter to three AM" (2:45, so hour 2), "half past two in the morning", "3 in the night", "10 at night", "02:00", "0200 hours", "noon", "midnight";
  - the keyword patterns (the library's `timeWords` plus `policy.lint.timePhrases`: "late night", "witching hour", "after dark", "sunrise", "dawn", "sunset", "golden hour", …) are read on the text with its clock phrases blanked out, so the planner reads "two o'clock in the morning" as 2 AM, not the library's bare MORNING;
  - the planner's allowed times of day are the keyword classes intersected with the clock classes, and then with **the library validator's own reading** (its `timeWords` on the whole text) as a floor, so copy lint never allows a time of day `templates/validate-library.mjs` would not (FU-3). Where the readings disagree, nothing fits: "TWO O'CLOCK IN THE MORNING", "3 IN THE MORNING", "UP AT 4 THIS MORNING" are refused on every time of day (write "2 AM"). Times without AM/PM ("6:30", "three o'clock", "at 3") pin nothing, as in the library, and so do counts and prices ("1000 hours", "19.99"). Contradictory time words ("MORNING? IT IS 2 A.M.") fit no time of day and are never planned. The one exemption is T02's "Alarm at 6:30.", a thought about tomorrow, listed in `planner/policy.json`; an exemption may only name a thought line (the validator time-checks hooks and end texts), which `hm lib validate` checks.
- **A hook or end card is one text.** Every phrase rule (medical, caution, topics, names, breath-hold, the split brand "HUSH / MALLOW") reads its rows one by one and joined by a space, so a banned phrase split over the row break ("WHEN YOU WANT TO END" / "IT ALL", "Calm your nervous" / "system tonight.") is refused like one inside a row. No hook or end card names the breath at all (`policy.lint.breathWords`).
- **Topic entries are lemmas** (FU-3, `planner/morph.mjs`): each matches all its regular inflections (smoke → "Smoked again.", smokers; vomit → "Vomiting."; starve → "Starved by noon."), the irregular forms `policy.lint.morphology.irregular` lists (bleed → bled), with a space or hyphen inside matching a space, a hyphen or nothing ("Self-harming.", "Selfharm."). Derived words are lemmas of their own (suicidal, sickly, alcoholic), never generated, because derivation changes meaning (grave → gravity). The library's banned medical terms inflect the same way (diagnosed, panicking). The planner refuses to plan from a story library that fails `templates/validate-library.mjs` (`planner/library-check.mjs`, a restatement checked line for line against the real script).

## Randomness in the composer

Derive every composer stream from `spec.seed` with a name, never from a shared generator. Use `planner/rng.mjs`: it is pure, has no imports, has no wall clock and passes the determinism guard. For example, `stream(spec.seed, 'composer/blinks')`. Adding a draw to one stream then never shifts another. The planner already uses these stream names, so pick new names for the composer: `template`, `mallow`, `tod`, `duration`, `gag`, `intensity`, `metaphor`, `turn`, `ritual`, `camera`, `weather`, `dressing`, `hook`, `lines`, `end`, `nameWord`, `worldJitter`, `sound`.

## Visible and invisible slots

- **Visible**: template, mallow, realm, tod, weather, dressing (as a set), duration, gag id, metaphor, turn, ritual, loop, camera, hook, lines, end (kind and text) and nameWord. These feed the fingerprint and the distance rule. Compared with the plan's list, realm, turn and nameWord are added: the viewer sees them too.
- **Invisible**: seed (part of the fingerprint, but not of distance), gag intensity, worldJitter, sound, quality, batch and pins.
- **Distance**: two posts on a channel within 14 days must differ in at least 3 of {mallow, hook, lines, ritual, gag, realm/tod, metaphor}, one of them the Mallow or the hook. Their weighted distance must also be ≥ 6.0 (weights in `planner/policy.json`). Hooks compare by token Jaccard: 0.5 or more counts as the same hook.

## G-SPEC rule ids (`hm spec check`)

| Rule | Fails when |
|---|---|
| `schema` | The shape does not match `planner/schema/hm-variant-1.schema.json`. |
| `slot:template`, `slot:mallow`, `slot:realm`, `slot:tod`, `slot:duration`, `slot:gag`, `slot:intensity`, `slot:metaphor`, `slot:turn`, `slot:ritual`, `slot:loop`, `slot:camera`, `slot:arc`, `slot:sound`, `slot:jitter` | The slot is not legal for the template, Mallow, realm and duration, or a value is outside the policy range. |
| `ritual-window` | The ritual's `minDur` exceeds the RITUAL window of the clock. |
| `internal`, `mode` | The INTERNAL mark does not equal review mode, or the channel/date do not match the mode. |
| `capability:pack`, `capability:preset`, `capability:tod`, `capability:duration`, `capability:weather`, `capability:dressing`, `capability:cell` | The capability is not enabled today (in production, approved only). |
| `cells` | `spec.cells` differs from today's cell status. |
| `library` | The story library itself fails `templates/validate-library.mjs` (FU-3): no spec passes until it is fixed. |
| `copy:hook`, `copy:lines`, `copy:end`, `copy:nameWord` | A string is not from the right library pool. |
| `lint:<rule>` | Copy lint error in context (time of day, duration). Rules include: `medical`, `caution`, `topic:*`, `name:*` (plain, inflected, spacing variants and app-context names), `breath-hold`, `breath-word` (hook and end card), `latin1`, `brand-case`, `time-word`, `reading-time` (whole hook, whole end card, each thought line), `layout-*`, `lines-*`, `grief-pairing`, and the validator's own per-string rules. Phrase rules on a 2-row hook or end card also read the rows joined. |
| `fingerprint`, `id` | They do not recompute from the visible slots and seed. |
| `fingerprint-used` | The fingerprint is already decided or published under another id, or appears twice in the batch. |
| `sequence:*`, `cadence`, `cooldown:*`, `reservation`, `distance`, `fingerprint-repeat` | Production only: a posting rule fails against the batch's earlier posts and the channel's ledger. |
| `pins:library`, `pins:pack`, `assets` | The library version changed; `pins.packs` does not name exactly the pack and preset files the capabilities give for the spec's Mallow and realm, names another file, or holds a hash that is missing (the file exists) or no longer matches; or an asset hash differs from `library/assets-manifest.json`. |
| `pins:engine`, `pins:capabilities` | `pins.engine` is not null (the planner pins no engine), or `pins.capabilitiesSha256` is empty. |

Warnings never fail the gate: `pins:pack` while the pack file does not exist yet, `assets-manifest-missing`, `pins:capabilities` (changed since planning) and `pins:policy`.

## Files next to a spec

- `runs/<batch>/plan.json` (`hm-plan/1`) is the batch manifest. It holds the seed, mode, channel, start, perWeek, constraints, pins, what was plannable, the spec index and any failures with the constraints that blocked them. Each spec entry carries `hash`, the sha256 of the canonical JSON of the whole spec as planned. Like the specs, it is byte-reproducible.
- `runs/<batch>/<id>/compile.json` (`hm-compile/1`) follows the QA report shape: `{status, pass, pending, gates: {"G-SPEC": {pass, warn, errors, warnings, metrics}, "G-DIR": {pass, status, errors, ...}, "G-COST": {...}}}`. The top-level verdict is honest about what ran: `status: "fail", pass: false` when a gate that ran failed; `status: "incomplete", pass: null` when everything that ran passed but gates are pending; `status: "pass", pass: true` only when every gate ran and passed. A gate that did not run is `{pass: null, status: "not-run", reason}`. `hm spec compile` exits 1 only on a failure and prints INCOMPLETE and the reason otherwise.

## Compile: the composer seam (for WP-03)

`hm spec compile` and `planner/compile.mjs` run G-SPEC, then hand the spec to the composer through one module, `planner/composer-bridge.mjs`. As soon as these files exist, G-DIR and G-COST run on every spec that passed G-SPEC (never on one G-SPEC refused), and the property test's G-DIR half (`tests/property/specs.test.mjs`: 1,000 specs over the enabled cells, and the wide Noomi set) stops being skipped and must pass:

| Module | Export | Returns |
|---|---|---|
| `composer/compose.js` | `compose(spec, { lib })` (sync or async) | the compiled direction (whatever `gdir` and `gcost` take) |
| `composer/validate.js` | `gdir(compiled, { spec, lib })` | `{ pass: boolean, errors: [{ rule, message }], warnings?, metrics? }` |
| `composer/cost.js` (optional) | `gcost(compiled, { spec, lib })` | the same shape; without it G-COST stays not run and the compile stays incomplete |

A gate that reports errors fails whatever its `pass` says; a result without a boolean `pass` is a failure (`G-DIR:result`); a `compose()` that throws fails G-DIR (`compose`). If WP-03 settles on another shape, it changes only `composer-bridge.mjs`. `HM_COMPOSER_DIR` points the planner at another composer directory: the property suite drives the whole path through a stub composer in `tests/property/fixtures/` (1,000 specs to `status: "pass"`, a strict stub's failures to `status: "fail"`, and `hm spec compile` end to end). The stub proves the seam and the verdicts; it is not G-DIR.
- `final.mp4` and `qa/report.json` are written by the farm and QA. `export/{final.mp4, caption.txt, metadata.json}` is written by `hm export`.

## Approval and export (what `hm approve` and `hm export` trust)

A fingerprint covers only the visible slots and the seed, so it cannot see edits to `mode`, `internal`, `channel`, intensity, jitter or quality. The owner-facing steps therefore check more (`planner/integrity.mjs`):

- **`hm approve`** needs a well-formed spec whose fingerprint and id recompute, **G-SPEC passing today** (in its batch, against today's capabilities and ledger), and, for a spec of a planned batch, the spec to be **exactly what `hm plan` wrote** (its `plan.json` hash; a hand edit re-sealed with `hm spec seal` is caught, also when re-sealing changed its id). The decision record names the spec: `specHash` (whole-spec hash), `mode`, `internal` and `gspec: {pass, errors}`. **`hm reject`** needs only an intact spec and records its G-SPEC result, so the owner can reject what G-SPEC also refuses.
- **`hm export`** refuses unless: the spec is production and not INTERNAL, of `final` quality (never `draft` or `proof`, also not with `--skip-qa`; FU-3); a render `provenance.json` next to `final.mp4`, if there is one, describes this very video (`final.sha256`) rendered with a full-quality, unmarked profile (`final` or `exact`, scale 1, no mark); G-SPEC passes again now; the spec still matches its `plan.json` entry; the latest decision approves **this exact spec hash**; `final.mp4` exists and is not empty; and `qa/report.json` passes the QA contract below (or the owner passes `--skip-qa`, which `metadata.json` records as `qa: {status: "skipped"}`).
- **The caption** is assembled from the library's own entries: the spec's hook and end text are located in `templates/story-library.json` (the template's `hook.primary|variants[i]`, `resolution.primary|variants[i]`, or `brand.closers[i]`), and those library arrays are what is written, followed by `library/brand.json` `hashtags.list`. `metadata.json` lists those exact library paths as `caption.sources`.
- **`metadata.json`** records `quality` and `render` (the provenance's profile, scale, mark, encoder and the provenance file's sha256, or `profile: null` with a note when there is no `provenance.json`).
- **Hashtags** come from `library/brand.json` only: `hm export` has no option to read another file. `exportVariant` reads the brand file itself and `metadata.json` records the file it actually read: `hashtags: {file, sha256, curatedBy, count, lint: "pass"}` and, when there are tags, a third `caption.sources` entry naming that file and hash. Every tag must pass the copy lint, including inside its glued words (`lintHashtag`): every medical, caution, topic and name term is searched as a substring of the tag ("#anxietyrelief", "#therapytok", "#tiktokmademebuyit" fail), excused only by a longer carrier word that covers it (a word of the library's own copy such as "still", or `policy.lint.hashtags.carriers` such as "pillow"). Topic and banned medical lemmas are searched in every glued inflection ("#smoking", "#selfharming"; "#suicidal" is a listed lemma). A tag may not name a time of day ("#2am", "#latenight", "#bedtime": rule `time-word`), because the one list goes on every video, whatever its time of day. `hm lib validate` runs the same check on the committed list.
- **`hm export --mark-posted`** records a post the owner already made. It needs the latest decision to approve this exact spec hash (and a production, non-INTERNAL, final-quality spec, once per channel). Posting-rule breaches for that channel and post date are printed as warnings, because the post has already happened.

**QA contract for `qa/report.json` (WP-05).** `{video: {sha256}, spec: {fingerprint}, gates: {<name>: {pass, warn, metrics, artefacts}}}`:
- `video.sha256` (hex, optionally `sha256:`-prefixed) must be the sha256 of the `final.mp4` being exported, and `spec.fingerprint` the spec's fingerprint, so a stale report or one from another render never counts;
- `gates` must list at least one gate, and every gate needs `pass: true`. `false` is a failure; `null`, a missing `pass` or any other value means the gate did not run, and blocks the export;
- every gate in `planner/policy.json` `export.requiredQaGates` (today `G-FINAL` and `G-AUDIO`, the post-render gates of the data flow) must be present, by name or as sub-gates named `<gate>:<part>` (also `-`, `/`, `.` or a space as separator), e.g. `G-FINAL:flash`.

## Hand-written specs

The composer's golden spec (`specs/golden/t01-v2.json`, WP-03) is written by hand. Write the JSON, then run `hm spec seal <file> --write` to fill in `fingerprint` and `id`, then `hm spec check <file>`. The approved v2 fits the contract with:
- T01 on Noomi, late night, 15 s;
- G-JOLT at intensity 1, M-ORBIT, TURN-SQUEEZE, R-BREATH, LP-RETURN, C-DRIFT-IN and A-COLD-DIP-WARM;
- the primary hook, the primary line triple and the primary resolution;
- zero world jitter.

`tests/unit/planner-gspec.test.mjs` proves that this spec passes G-SPEC.

## Example (abridged)

```json
{
  "schema": "hm-variant/1", "id": "T01-noomi-late-night-15s-fdde38", "batch": "2026-11-03-tiktok-s42", "index": 0,
  "mode": "production", "internal": false, "quality": "final", "channel": "tiktok", "plannedFor": "2026-11-03",
  "template": "T01-brain-at-2am", "mallow": "noomi", "realm": "moonmilk-cove", "tod": "late-night", "weather": "clear", "dressing": [],
  "duration": 15, "seed": 1959558267,
  "gag": { "id": "G-JOLT", "intensity": 0.83 }, "metaphor": "M-ORBIT", "turn": "TURN-SQUEEZE", "ritual": "R-BREATH",
  "loop": "LP-RETURN", "camera": "C-DRIFT-IN", "arc": "A-COLD-DIP-WARM",
  "worldJitter": { "hue": 2.76, "warmth": -0.089, "exposure": 0.017 },
  "copy": { "hook": ["TRYING TO SLEEP BUT MY", "BRAIN HAS OTHER PLANS"],
            "lines": ["What I said at lunch.", "Should I explain?", "Time to replay it again."],
            "end": { "kind": "resolution", "text": ["Not every thought", "needs an answer tonight."] }, "nameWord": null },
  "sound": { "motifs": ["MO-GLASS-RISE", "MO-ORBIT", "MO-TICK", "MO-HUM", "MO-WARMPAD", "MO-CLOSE"], "contour": "arch-2", "tickTempo": 1.028, "panSeed": 458852382 },
  "cells": { "G-JOLT/noomi": "approved", "M-ORBIT/noomi": "approved", "...": "approved" },
  "pins": { "library": "1.0.0", "librarySha256": "30e3ad…", "capabilitiesSha256": "e81d3b…", "policySha256": "…",
            "packs": { "noomi": { "file": "library/mallows/noomi.json", "sha256": null }, "moonmilk-cove": { "file": "library/realms/moonmilk-cove.json", "sha256": null } },
            "engine": null },
  "fingerprint": "sha256:fdde38f3e7a133c724839009dc56245241dbb6880aaf502e5edca7eea6baf94a"
}
```
