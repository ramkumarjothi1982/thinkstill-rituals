# Hushmallow Sensory Lab (Hushmallow 2.0, development preview)

This is a standalone browser lab for the ten Hushmallow 2.0 companion and
sensory experiences. It runs separately from the production app: it isn't
linked from `index.html`, it has no auth, payments, network calls or AI calls,
and it doesn't change any file outside `hushmallow/sensory-lab/`.

| | |
|---|---|
| Base commit | `57c0a5d38ceeb06ce78ed27e6eec2f6da57108ef` (main, 12 Oct 2026, "Merge pull request #12") |
| Branch | `claude/epic-mendel-3lfmuy` (this session's authorised branch, see "Branch" below) |
| Phase | **1 of 6**: foundation + Mallow TouchTalk + SoftBody Lab, tuned on **Boppo** |

## Run it

```bash
# from the repository root (the folder that contains hushmallow/)
python3 -m http.server 8000
```

Then open `http://localhost:8000/hushmallow/sensory-lab/index.html`

On a phone on the same Wi-Fi, use your computer's IP address in place of
`localhost`. Useful URL options:

| Option | Effect |
|---|---|
| `#/touchtalk`, `#/softbody` | open an experience directly |
| `?mallow=blubi` (or any Mallow) | preview another Mallow. These aren't tuned yet (Phase 2) |
| `?quality=high\|medium\|low` | force a soft-body quality tier (the default is automatic) |

## Gestures

| Gesture | Touch | Mouse / desktop | Keyboard | Button |
|---|---|---|---|---|
| Tap | tap | click | Enter / Space | Tap |
| Double tap | double tap | double click | D | Double tap |
| Hold | press and rest | press and hold | hold H | Hold (press and hold) |
| Stroke | sweep across, or rub back and forth | same with the button down | P | Stroke |
| Squeeze | two-finger pinch in | scroll wheel over the stage | hold S | Squeeze / Squish (press and hold) |
| Stretch | two-finger spread, or drag | drag | T | Stretch |
| Press down (single-touch squeeze) | drag downward on the Mallow | drag down | — | — |
| Release | let go | let go | — | — |

## Tests

```bash
node --test hushmallow/sensory-lab/tests/*.test.mjs   # engines: physics, gestures, personality, prefs (Node only)
python3 -m http.server 8000 &                         # then, for browser tests:
node hushmallow/sensory-lab/tests/e2e.cjs             # 5 viewports, real pointer/touch/multitouch input, screenshots → docs/phase1/
node hushmallow/sensory-lab/tests/record-demo.cjs out # demo video (webm)
```

The main app's tests (`node --test hushmallow/tests/*.test.mjs`) don't look
in this folder, and the GitHub Pages workflow only deploys from `main`.

## Layout

```
sensory-lab/
  index.html, lab.js, lab-ui.js   the lab shell (router, home, settings)
  core/        the shared sensory engine (see docs/ARCHITECTURE.md)
  features/    one module per experience (lazy-loaded)
  adapters/    integration seams to the main app (rig contract for now)
  styles/      lab chrome (builds on src/ui/tokens.css)
  tests/       Node unit tests, Playwright browser tests, demo recorder
  docs/        architecture, phase reports, screenshots
```

## Isolation

- The lab only *imports* from the main app: `src/mallows/*` (rig, registry,
  expressions, reactions, particles), `src/engine/haptics.js`,
  `src/ui/tokens.css`, `assets/`. It doesn't modify any of them.
- Its storage is one localStorage key, `hm.sensorylab.v1`. It never reads or
  writes the main app's `hm2:*` keys, except that the shared haptics helper
  reads `hm2:haptics`.
- It has no Supabase, Cloudflare, Framer or payment code and no credentials.
- **Branch:** the brief asked for `feature/hushmallow-sensory-v2`. This cloud
  session can only push to `claude/epic-mendel-3lfmuy`, so the work lives
  there. It can be copied to `feature/hushmallow-sensory-v2` with one push
  once you approve that. Don't merge it into `main`.
- **Publishing:** `tools/build-site.sh` copies only `src/`, `assets/` and
  `index.html` into the published site, so this folder isn't published even
  if it is merged. Integrated features will go into `src/` through a
  separate, reviewed patch (see `docs/ARCHITECTURE.md` → Integration).
