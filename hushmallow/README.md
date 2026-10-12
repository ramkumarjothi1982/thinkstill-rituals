# hushmallow — Less noise. More magic.

*Feel it. Squish it. Shift it.*

A mobile-first web app (plain ES modules, no build step, no AI) with seven
living Mallows, the Hushfold fantasy world, and two paid experiences:

- **The Hushfold home**: open the app and a Mallow is right there to
  squeeze, stretch, flick and jiggle. Tell it what's on your mind and your
  exact words become a Thought Mallow you play with through Hushflow worlds
  (Glitzi's Static Storm, Loomi's Luminous Ocean). Tools you discover go in
  your Memory Garden. See `docs/HUSHFOLD.md`.
- **hushmallow Flow** ("A little more room for your feelings."): the
  Mallows, Hushflow worlds, your own words and up to 7 photos, and over
  1,000 interactive touch rituals.
- **hushmallow Beyond** ("There's more than one way to see it."):
  everything in Flow, plus **Another Angle**, which helps you separate what
  happened from what your mind added and try other plausible explanations.

See `docs/HUSHFOLD.md` for the new home and `docs/STATUS.md` for what's done, what's left and what needs you.

## Run it

```bash
# from the repository root (the folder that contains hushmallow/)
python3 -m http.server 8000
```

Then open on your computer or phone (same Wi-Fi, use your computer's IP):

| Page | What it is |
|---|---|
| `http://localhost:8000/hushmallow/index.html` | The app |
| `http://localhost:8000/hushmallow/touch-lab.html?m=glitzi` | MallowTouch lab: squeeze one Mallow on its own |
| `http://localhost:8000/hushmallow/studio.html` | Mallow Emotion Studio (every Mallow × every expression, touch, transition tests) |
| `http://localhost:8000/hushmallow/realms.html` | The seven Hushfold realms with mood controls |
| `http://localhost:8000/hushmallow/sound-lab.html` | Every Mallow sound, ritual sound and realm ambience |

A browser can't take real payments, so on `localhost` the Plans screen
shows **test purchases**. "Choose hushmallow" unlocks Paid and "Choose
hushmallow Beyond" unlocks Ultra, without charging anything. Settings →
"Remove test plan" resets this. Test purchases only work on the hosts listed
in `src/app/config.js`, so a public site can't give plans away. The App
Store build swaps in StoreKit (see `src/app/entitlements.js`).

Putting it on your Framer site: see `docs/FRAMER.md`.

Publishing: every push to `main` runs the tests and publishes to GitHub
Pages (`.github/workflows/hushmallow-pages.yml`). `tools/build-site.sh` puts
each deploy in its own folder (`v/<commit>/`) and writes `version.json`, so
an open app moves itself to the new version (at start or back on the home
screen) instead of waiting for the browser cache to expire. Settings shows
the version that is running.

### Try the two flagship experiences
- **Experience A (Paid):** Home → *What's on your mind?* → type "I'm
  furious about what happened at work." → *Meet a Mallow* → *Let's do it*.
- **Experience B (Ultra):** Home → *Another Angle* → *Look at a real
  situation* → "My boss criticised my work. I think I'm terrible at my job."
- **The 1,000 rituals:** Home → *Start hushmallow*, type what's on your mind,
  add photos from the offer card if you like, and play. Or straight into one
  on localhost: `index.html?v3=HM-0001&photos=3`, or any engine × law pair:
  `index.html?engine=GE-07&law=3&photos=0`.

### Tests
```bash
node --test hushmallow/tests/*.test.mjs
```

### Updating the 1,000 rituals
They come from `content/Hushmallow_1000_Rituals_V3.xlsx`: 50 touch engines ×
20 world laws (every pair once), each led by a Mallow in its realm and
practising one of 40 evidence-informed skills. After changing the workbook,
regenerate the data (needs `openpyxl`):
```bash
python3 -I hushmallow/tools/import_v3.py hushmallow/content/Hushmallow_1000_Rituals_V3.xlsx --workbook
```
The importer also corrects the workbook's copy mechanically (see
`docs/V3_CORRECTIONS.md`); `--workbook` writes a corrected copy of the
workbook with a CORRECTIONS sheet. Engines live in `src/v3/engines/` and
follow `docs/V3_ENGINE_CONTRACT.md`. QA: `tools/v3-lab.cjs` (one ritual,
screenshots) and `tools/v3-sweep.cjs` (plays every ritual to the end).

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
| `src/data/` | A–Z emotion taxonomy (334 terms), ritual schema, signature ritual library (`library/`, one file per ritual) |
| `src/rituals/` | The ten signature ritual modules |
| `src/v3/` | The 1,000 rituals: host, 20 world laws, 50 touch engines, photo system, words, effects library, generated catalogue and copy |
| `src/ultra/` | Ultra only: Another Angle, authored Reframe frameworks, rule engine |
| `content/` | The V3 ritual workbook (source of the 1,000 rituals) and its corrected copy |
| `framer/` | `HushmallowEmbed.tsx`, the Framer code component |
| `src/app/` | App shell: scenes, world stage, entitlements, preferences, UI helpers |
| `src/ui/` | Design system tokens and app styles |
| `docs/` | Audit of the old app, status and roadmap |

The old ThinkStill Framer app (repository root: `framer/`,
`bubble-expressions/`, `rituals.json` …) is untouched. The quick tricks were
removed from hushmallow; its 1,000 rituals come from the V3 workbook in
`content/`.
