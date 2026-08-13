# ThinkStill Ritual Chatbot

The complete, production-ready chatbot for the ThinkStill v40.5.3 ritual library.

Users describe what is happening in ordinary language. The app matches the moment to one complete ritual, guides the user through every step, checks whether anything shifted, and switches to a different mechanism when the first move misses.

## Included

- All **750/750** final rituals from `ThinkStill_750_v40_5_3_TRUE_100of10_FINAL_RELEASE_MASTER(2).xlsx`
- All seven worlds: CALM, CLEAR, FOCUS, CONNECT, WORK, PERFORM and MEANING
- All 56 specialist routing records and their keyword banks
- Full ritual display: name, play time, goal, every step, one WIN, all five tips, Mind Bend, Formula Flow and Safety
- Adaptive **BETTER / A LITTLE / NOT YET** feedback flow
- Different-mechanism retry when a ritual does not help
- No-repeat cycle stored locally until every eligible ritual has been served
- High-risk phrase guard that pauses the ordinary ritual loop and prioritises real-world support
- Dark and bright modes
- Responsive desktop, tablet and mobile layouts
- No paid API, database or environment variable required

## Run locally

Requirements:

- Node.js 22.13 or newer
- npm
- Linux or WSL for the included verified build scripts

```bash
npm ci
npm run validate:data
npm run dev
```

Open the local address printed by the development server.

## Production build

```bash
npm run validate:data
npm run build
```

The verified deployable artifact is written to `dist/`.

## Data integrity

The chatbot loads its complete library from:

```text
public/data/thinkstill-rituals.json
```

Run `npm run validate:data` after any data change. The validator blocks release if it finds:

- anything other than 750 rituals;
- duplicate IDs;
- missing consumer sections;
- incomplete full-ritual content;
- a ritual without all five tips; or
- an unexpected routing-map size.

## Matching and feedback logic

The matching engine runs in the browser and scores:

1. specialist and precise-pattern language;
2. each ritual’s routing keywords, moment, goal and mechanism;
3. the workbook’s 56 specialist keyword banks;
4. direct intent cues such as panic, overthinking, anger, rejection, focus, procrastination, deadlines, grief and cravings; and
5. first-line priority.

After a miss, the next selection favours the same specialist while excluding the previous ritual and mechanism. Ritual IDs already used in the current cycle remain excluded until the cycle completes.

## Privacy and safety

- User messages are processed in the browser. This package sends them to no AI API or analytics service.
- Theme and no-repeat history use browser `localStorage` only.
- ThinkStill is a self-help experience, not emergency, medical or mental-health care.
- The high-risk guard does not diagnose or assess danger. It stops ordinary matching and tells the user to bring in immediate real-world support.
- If you add accounts, analytics, a model API or cloud storage later, update the privacy notice and obtain the appropriate consent before collecting personal or health-related information.

## Project map

```text
app/
  globals.css                 Complete responsive visual system
  layout.tsx                  Metadata and app shell
  page.tsx                    Chat, routing, ritual player, feedback and safety flow
public/
  data/thinkstill-rituals.json 750 rituals plus routes, worlds and safety metadata
  favicon.svg
scripts/
  validate-data.mjs           Ritual completeness and integrity checks
  build-verified.sh           Production build gate
  validate-artifact.sh        Deployable artifact checks
tests/
  rendered-html.test.mjs      Server-rendered HTML smoke test
.github/workflows/
  quality.yml                 Automatic GitHub quality gate
.openai/hosting.json          Optional ChatGPT Sites identity
GITHUB_UPLOAD_GUIDE.txt       Plain-language upload instructions
```

## Customisation

- Brand and layout: edit `app/globals.css`.
- Starter prompts and intent hints: edit the constants at the top of `app/page.tsx`.
- Ritual content: update `public/data/thinkstill-rituals.json`, then run `npm run validate:data`.
- Emergency wording: have the final copy reviewed for every country where you launch.

## GitHub upload

Upload the contents of this folder as one repository. Do not upload `node_modules`, `.next`, `dist`, `.sites-runtime` or `.wrangler`; they are already excluded by `.gitignore`.
