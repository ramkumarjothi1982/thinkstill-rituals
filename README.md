# ThinkStill 750 — v40.0 MIND FIRST

> **WHEN YOUR MIND HITS HARD, HIT THINKSTILL.**  
> **Built for DURING.**

This package rebuilds ThinkStill around real-time, in-the-moment mind support. The user describes what is happening **now**, ThinkStill routes to the strongest available mental move, checks whether anything shifted, and changes mechanism when the first move does not land.

## Product contract

**Input → best matched unused move → BETTER / A LITTLE / NOT YET → feedback refinement → different mechanism.**

The consumer ritual order is locked to:

**Ritual Name → GOAL → numbered moves → WIN → one TIPS box → MIND BEND → FORMULA FLOW → SAFETY / PAUSE**

There is no visible `TITLE` or `RITUAL` label. The Safety field itself starts with `PAUSE`; the UI creates the single visible `SAFETY` heading.

## What is in the package

- `index.html` — standalone ThinkStill NOW interface for GitHub Pages
- `styles.css` — final dark mind-first product skin
- `app.js` — full free-text routing, feedback, personal outcome memory, safety routing and no-repeat logic
- `manifest.json` — single source-of-truth manifest
- `rituals.json` — all 750 interventions
- `rituals-calm.json`, `rituals-clear.json`, `rituals-focus.json`, `rituals-connect.json`, `rituals-work.json`, `rituals-perform.json`, `rituals-meaning.json`
- `routing.json` — 56 specialist pathways, keywords, feedback options and high-risk signals
- `paths.json` — starter guided Path definitions
- `schema.json` — ritual data contract
- `ThinkStillUnifiedChat.tsx` — Framer/React direct component
- `ThinkStillNowEmbed.tsx` — simple Framer iframe component for the hosted GitHub app
- `ThinkStill_750_v40_MIND_FIRST_RELEASE_MASTER.xlsx` — source master workbook
- `validate.js` — data integrity gate
- `PACKAGE_VALIDATION.json` — generated validation result
- `SHA256SUMS.txt` — integrity hashes
- `.nojekyll`, `404.html`, `VERSION.txt`

## Deploy to GitHub Pages

1. Extract the ZIP.
2. Upload **all files to the repository root**.
3. In GitHub: **Settings → Pages → Deploy from a branch → main / root**.
4. Open the resulting Pages URL.

The files must remain beside each other. `index.html` loads `manifest.json`, which then loads `routing.json` and `rituals.json`.

## Framer — easiest production route

Deploy GitHub Pages first, then add `ThinkStillNowEmbed.tsx` to Framer and set **App URL** to your GitHub Pages URL.

This keeps GitHub and Framer on the exact same renderer and prevents the ritual-display parsing problems caused by maintaining two separate UI engines.

`ThinkStillUnifiedChat.tsx` is also included if you want Framer to load the raw manifest/data directly.

## Routing behaviour

The NOW engine:

1. normalises the user's free text;
2. ranks specialist pathways using exact phrases + semantic-ish token overlap;
3. ranks unused rituals by specialist fit, moment/pattern fit, first-line priority and the user's past feedback;
4. remembers every served ritual in browser `localStorage`;
5. never serves the same ritual again until all 750 IDs are exhausted;
6. records helpful/missed mechanisms and uses that history as a future tie-breaker;
7. after **A LITTLE** or **NOT YET**, asks what remains strongest and switches to a different mechanism.

## Acute/high-risk routing

Tier 3 is deliberately different. Signals involving possible immediate self-harm/violence risk, severe confusion/unusual experiences, severe activation, overdose/withdrawal or inability to stay safe route to **High-Risk Support Bridge** content rather than an ordinary self-help retry loop.

ThinkStill is not emergency care, does not diagnose, and should not be presented as replacing professional treatment.

## Content architecture

- **CALM** — acute emotion, panic/body alarm, urges and grounding
- **CLEAR** — overthinking, uncertainty, thought distance and perspective
- **FOCUS** — executive skills, attention, starting, time and follow-through
- **CONNECT** — communication, boundaries, conflict, relationships and social confidence
- **WORK** — teams, management, leadership, feedback and workplace conflict
- **PERFORM** — interviews, presentations, pressure, creativity and decisions
- **MEANING** — purpose, values, identity, acceptance and spirituality

The old 400 validated intervention core was migrated rather than discarded. **350 new mind-first interventions** expand the product into functioning, work, communication, performance and meaning.

## Validation

Run:

```bash
npm run validate
```

The validator checks the 750 count, ID/title uniqueness, five tips per ritual, exact tip uniqueness, unique Mind Bends, required fields and duplicate Safety headings.
