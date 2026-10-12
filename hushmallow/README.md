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

A browser can't take real payments, so on `localhost` the Plans screen
shows **test purchases**. "Choose Hushmallow" unlocks Paid and "Choose
Hushmallow Ultra" unlocks Ultra, without charging anything. Settings →
"Remove test plan" resets this. Test purchases only work on the hosts listed
in `src/app/config.js`, so a public site can't give plans away. The App
Store build swaps in StoreKit (see `src/app/entitlements.js`).

Putting it on your Framer site: see `docs/FRAMER.md`.

### Try the two flagship experiences
- **Experience A (Paid):** Home → *What's on your mind?* → type "I'm
  furious about what happened at work." → *Meet a Mallow* → *Let's do it*.
- **Experience B (Ultra):** Home → *Another Angle* → *Look at a real
  situation* → "My boss criticised my work. I think I'm terrible at my job."
- **Quick tricks:** Meet a Mallow → *Only got a minute? Quick trick*, or the
  Ultra door → *Ready for the plot twist?*

### Tests
```bash
node --test hushmallow/tests/*.test.mjs
```

### Updating the 1,000 tricks
The tricks come from the locked ThinkStill workbook in `content/`. After
changing the workbook, regenerate the content modules (needs `openpyxl`):
```bash
python3 -I hushmallow/tools/import_tricks.py hushmallow/content/ThinkStill_MASTER_1000_PRODUCTION_LOCKED_FINAL.xlsx
```
Attention and getting-started tricks go to Paid; tricks about thoughts,
meaning and relationships (reframing) go to Ultra only.

### Adding a ritual
Two files and two list entries, no app changes: the content in
`src/data/library/<id>.js`, the interaction in `src/rituals/<id>.js`, then
list it in `src/data/library/index.js` and `src/rituals/index.js`. The tests
check that every library file is listed and every module exists.

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
| `src/data/` | A–Z emotion taxonomy (334 terms), ritual schema, ritual library (`library/`, one file per ritual), Paid quick tricks (`tricks/`) |
| `src/rituals/` | Paid ritual modules (interactive experiences) and the quick-trick player |
| `src/ultra/` | Ultra only: Another Angle, authored Reframe frameworks, rule engine, the 709 plot twists |
| `content/` | The locked ThinkStill master workbook (source of the 1,000 tricks) |
| `framer/` | `HushmallowEmbed.tsx`, the Framer code component |
| `src/app/` | App shell: scenes, world stage, entitlements, preferences, UI helpers |
| `src/ui/` | Design system tokens and app styles |
| `docs/` | Audit of the old app, status and roadmap |

The old ThinkStill Framer app (repository root: `framer/`,
`bubble-expressions/`, `rituals.json` …) is untouched. The 1,000 tricks in
Hushmallow come from the newer locked workbook in `content/`, not from the
old `rituals.json`.
