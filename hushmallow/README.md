# hushmallow — Less noise. More magic.

*Your second brain for feelings.* The brand is always written **hushmallow**,
all lowercase, also at the start of a sentence (source of truth:
`src/brand.js`; `tests/brand.test.mjs` enforces it).

A mobile-first web app (plain ES modules, no build step) with seven living,
squeezable Mallows, the Hushfold, and two paid experiences:

- **hushmallow Flow** (plan id `paid`) — *A little more room for your
  feelings.* The seven Mallows with MallowTouch, cinematic conversations and
  Thought Mallows, continuous Hushflow through emotion-responsive worlds, the
  Memory Garden, and the ritual library (250 touch rituals, including ten
  signature rituals). Your own words and up to seven of your own photos
  (with none, the seven Mallows take their place).
- **hushmallow Beyond** (plan id `ultra`) — *There’s more than one way to
  see it.* Everything in Flow, plus **Another Angle**: fresh perspectives on
  your own situations, fact versus interpretation, alternative explanations
  and Belief Mallow investigation. Another Angle is the only part that may
  send a person's words anywhere (to our server, never a font or analytics
  service), and only the words they choose to share, after they say yes;
  everything else they type or feel is deterministic and stays on the phone.
  Until Another Angle goes live (`ANGLE_ENDPOINT` in `src/app/config.js`) it
  plays Zuzu's authored angles on the phone. See `docs/HUSHFOLD.md` (D10).

**Accounts are optional** (`docs/AUTH.md`). Guests keep everything exactly as
before and never load supabase-js. An account (Supabase, email and
password) keeps one person's things apart from another's on a shared phone
and, only if they switch it on, keeps their settings, favourite worlds,
Memory Garden and where a Hushflow paused with the account; never their
words, feelings or photos. Sign in from Settings → Privacy, or at
`/#account` (the only deep link the app honours); email links land on
`/auth/callback`. Builds without the two public Supabase values have
sign-in off.

Typography: self-hosted HM Nunito Sans (voice), HM Manrope (UI) and HM
Fraunces (cinematic titles), tokens in `src/ui/type.css` / `src/ui/type.js`.
The logo artwork lives in `assets/brand/` (light lettering for dark grounds,
ink for light ones); never re-type it.

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
shows **test purchases**. "Step into hushmallow Flow" unlocks Flow and
"Step into hushmallow Beyond" unlocks Beyond, without charging anything. Settings →
"Remove test plan" resets this. Test purchases only work on the hosts listed
in `src/app/config.js`, so a public site can't give plans away. The App
Store build swaps in StoreKit (see `src/app/entitlements.js`). Web
subscriptions through Stripe are built and switched off: `docs/PAYMENTS.md`.

Putting it on your Framer site: see `docs/FRAMER.md`.

Publishing: production is **Cloudflare Pages** (project `hushmallow`,
production branch `main` → `https://app.hushmallow.com`, previews on
`*.hushmallow.pages.dev`; it builds with the two public Supabase values, so
sign-in is on there; see `docs/AUTH.md`, "Cloudflare Pages"). Every push to
`main` also runs the tests and publishes a copy to GitHub Pages
(`.github/workflows/hushmallow-pages.yml`), built without those values, so
sign-in is off there. `tools/build-site.sh` puts each deploy in its own
folder (`v/<commit>/`) and writes `version.json`, so an open app moves itself
to the new version (at start or back on the home screen) instead of waiting
for the browser cache to expire. Settings shows the version that is running.
The sign-in flows also run in CI on a local Supabase stack
(`.github/workflows/hushmallow-auth-e2e.yml`).

### Try the two flagship experiences
Home is the **Hushfold**: one living Mallow you can squeeze, the **Tell**
pill, and the side panel (the handle at the top: Another Angle, Memory
Garden, More rituals, Your journey, Settings).
- **Experience A (Flow):** Home → *Tell* → type "I'm furious about what
  happened at work." → send: your words become a Thought Mallow and a
  Hushflow world begins (for anger, Static Storm, which can melt into
  Luminous Ocean); a tool you practise there can be kept in the Memory
  Garden. Without a plan, Tell leads to the plans page and back.
- **Experience B (Beyond):** Home → side panel → *Another Angle* (with
  Flow, the link is an invitation to the plans page) → tell Zuzu "My boss
  criticised my work. I think I'm terrible at my job."
- **The ritual library:** Home → side panel → *More rituals* → tap one and
  play. Or straight into one on localhost: `index.html?v3=HM-0001&photos=3`,
  or any engine × law pair: `index.html?engine=GE-07&law=3&photos=0`.
- The old home screen stays reachable for QA on localhost: Settings →
  *Classic home (QA)*.

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
| `src/ultra/` | hushmallow Beyond only (tier id `ultra`): the classic Another Angle, authored Reframe frameworks, rule engine |
| `src/hushfold/` | The Hushfold home: Tell overlay, input router, stage, subtitles, side panel, Memory Garden install and charms, and `flow/` (the Hushflow director and worlds) |
| `src/beyond/` | Another Angle in the Hushfold: consent and privacy, the endpoint and its one request, authored scenes and the ten mechanics |
| `src/auth/` | Optional sign-in: boot and local namespaces, the client, opt-in sync, the account Mallow, `/auth/callback` (`docs/AUTH.md`) |
| `auth/callback/` | The page email links open (confirm, reset, change email) |
| `legal/` | The Privacy Policy and the Terms of Use: static pages published at `/legal/`, linked from Settings, the plans page and the sign-up form (`src/app/legal.js`); drafts until the owner deletes the DRAFT SWITCH line in `src/ui/legal.css` |
| `supabase/` | Migrations `0001`–`0009`, rollback, RLS check, email templates, `config.toml` for the CI stack |
| `server/another-angle/` | Another Angle's server (a Cloudflare Worker) and its evaluation tools |
| `vendor/` | Vendored supabase-js (loaded only for sign-in screens and signed-in sessions) |
| `content/` | The V3 ritual workbook (source of the 1,000 rituals) and its corrected copy |
| `framer/` | `HushmallowEmbed.tsx`, the Framer code component |
| `src/app/` | App shell: scenes, world stage, entitlements, preferences, UI helpers, history layers (`layers.js`: Back closes the newest sheet or layer first), the shared privacy copy (`privacy.js`) |
| `src/ui/` | Design system tokens and app styles |
| `docs/` | Audit of the old app, status and roadmap |

The old ThinkStill Framer app (repository root: `framer/`,
`bubble-expressions/`, `rituals.json` …) is untouched. The quick tricks were
removed from hushmallow; its 1,000 rituals come from the V3 workbook in
`content/`.
