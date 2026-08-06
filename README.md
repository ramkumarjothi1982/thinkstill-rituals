# ThinkStill Rituals — Full Engagement Release

A GitHub-ready data package for the **400 ThinkStill mental-game rituals**.

## Release

- Version: `18.1.0`
- Rituals: `400`
- Bubbles: `GLITCH`, `DROP`, `STILL`, `PATCH`, `LOOPIE`, `RUSH`, `SYNC`
- Language: simple, mobile-friendly and imagination-first
- Play mode: solo
- Writing or drawing required: no
- Routing: thinking error → precise subpattern → weighted best unplayed ritual

## Package structure

```text
.
├── data/
│   ├── rituals.json
│   ├── ritual.schema.json
│   ├── match-data.json
│   ├── taxonomy.json
│   ├── final-taxonomy.json
│   ├── balanced-routing.json
│   └── product-audit.json
├── scripts/
│   └── validate.mjs
├── source/
│   └── ThinkStill_400_FULL_ENGAGEMENT_REWRITE_FINAL.xlsx
├── src/
│   └── index.js
├── manifest.json
├── package.json
└── README.md
```


## Bubble JSON files

Each Bubble now has its own standalone JSON file:

```text
data/bubbles/glitch.json
data/bubbles/drop.json
data/bubbles/still.json
data/bubbles/patch.json
data/bubbles/loopie.json
data/bubbles/rush.json
data/bubbles/sync.json
```

The Bubble index is available at:

```text
data/bubbles.json
```

Each Bubble file contains its Bubble name, ritual count, and complete ritual records for that Bubble.

## Install locally

```bash
npm install
npm run validate
```

## Use in JavaScript

```js
import {
  rituals,
  getRitualById,
  getRitualsByBubble,
  getRitualsByThinkingError,
  chooseBestUnplayed
} from "@thinkstill/rituals";

const ritual = getRitualById("T-001");

const glitchRituals = getRitualsByBubble("GLITCH");

const candidates = getRitualsByThinkingError("Black-and-white thinking");
const selected = chooseBestUnplayed(candidates, ["T-006"]);
```

## Direct JSON use

The main app-ready file is:

```text
data/rituals.json
```

Each record includes:

- stable technique ID;
- title and Bubble;
- trigger and play-time text;
- hook, mission and game move;
- full ritual play text;
- win and reward;
- formula flow;
- safety pause rule;
- private share card;
- return cue;
- routing metadata and balanced selection weight.

## Recommended chatbot flow

1. Detect the user-facing thinking error.
2. Refine to the precise subpattern.
3. Filter matching rituals.
4. Exclude rituals already viewed by the user.
5. Select from the remaining candidates using `routingWeight`.
6. Save the chosen ritual ID to persistent browser or account history.
7. If every candidate has been played, allow the pool to reset.

## Safety

These rituals are self-help experiences, not emergency, medical or mental-health treatment. Preserve each ritual's safety text in the user interface. Do not remove crisis escalation logic from the chatbot.

## Ownership

This package is private and unlicensed. Do not publish it as an open-source npm package unless ThinkStill intentionally chooses a licence.
