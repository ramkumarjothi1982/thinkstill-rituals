# Hushmallow — your second brain for feelings

A mobile-first web app (plain ES modules, no build step, no AI) with seven
living Mallows, the Hushfold fantasy world, and two paid experiences:

- **Hushmallow** (paid): express a feeling, meet a Mallow, do an
  interactive ritual, notice how it feels.
- **Hushmallow Ultra**: everything above, plus **Another Angle** (Reframe):
  separate what happened from what your brain added, weigh the evidence and
  try other plausible explanations.

See `docs/STATUS.md` for what's done, what's left and what needs you.

## Run it

```bash
# from the repository root (the folder that contains hushmallow/)
python3 -m http.server 8000
```

Then open on your computer or phone (same Wi-Fi, use your computer's IP):

| Page | What it is |
|---|---|
| `http://localhost:8000/hushmallow/index.html` | The app |
| `http://localhost:8000/hushmallow/studio.html` | Mallow Emotion Studio (every Mallow × every expression, touch, transition tests) |
| `http://localhost:8000/hushmallow/realms.html` | The seven Hushfold realms with mood controls |
| `http://localhost:8000/hushmallow/sound-lab.html` | Every Mallow sound, ritual sound and realm ambience |

A browser can't take real payments, so the Plans screen shows **test
purchases**. "Choose Hushmallow" unlocks Paid and "Choose Hushmallow Ultra"
unlocks Ultra, without charging anything. Settings → "Remove test plan"
resets this. The App Store build swaps in StoreKit (see
`src/app/entitlements.js`).

### Try the two flagship experiences
- **Experience A (Paid):** Home → *What's on your mind?* → type "I'm
  furious about what happened at work." → *Meet a Mallow* → *Let's do it*.
- **Experience B (Ultra):** Home → *Another Angle* → "My boss criticised my
  work. I think I'm terrible at my job."

### Tests
```bash
node --test hushmallow/tests/*.test.mjs
```

## Map of the code

| Folder | Contents |
|---|---|
| `assets/mallows/` | The seven approved transparent Mallows (source of truth) |
| `assets/rig/` | Face-cleaned bodies and iris/spiral sprites derived from the approved art |
| `assets/source/` | Your original approved artwork and the Human Emotion Atlas |
| `tools/` | Python scripts that cut the Mallows and derive the rig layers (`extract.py`, `detect.py`, `derive.py`) |
| `src/mallows/` | Living Mallow engine: registry, expressions, rig renderer, reactions, particles, voices |
| `src/world/` | Hushfold realm engine (seven procedural realms) |
| `src/engine/` | Feeling finder (rule-based), recommender + rotation, storage, audio, haptics |
| `src/data/` | A–Z emotion taxonomy (334 terms), ritual schema, ritual library |
| `src/rituals/` | Paid ritual modules (interactive experiences) |
| `src/ultra/` | Ultra only: Another Angle, 22 authored Reframe frameworks, rule engine |
| `src/app/` | App shell: scenes, world stage, entitlements, preferences, UI helpers |
| `src/ui/` | Design system tokens and app styles |
| `docs/` | Audit of the old app, status and roadmap |

The old ThinkStill Framer app (repository root: `framer/`,
`bubble-expressions/`, `rituals.json` …) is untouched. Its 1,000 rituals
are the source for Ultra's quick-trick library.
