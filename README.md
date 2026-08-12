# ThinkStill v38.4.3 — TRUE 10/10 FINAL LOCK

This package is the production GitHub + Framer release built from the locked 400-ritual master.

## Critical display contract

The user must see the **complete ritual** in this order:

1. Ritual name (no `TITLE` label)
2. Play time
3. `GOAL`
4. Every numbered ritual step (no `RITUAL` heading)
5. `WIN`
6. Five **unlabelled** short counselling hits, each on its own line
7. `FORMULA FLOW`
8. `SAFETY` / `PAUSE`

Nothing in the ritual body is collapsed or intentionally omitted.

## Important renderer fix

Older Framer code recognised `WIN SIGNAL` but not the v38.4.3 `WIN` heading. That could merge the counselling hits into WIN. The included Framer component fixes this and also consumes `stepsArray` and `supportsArray` directly when available.

Use `ThinkStill_Framer_FULL_v38_4_3_COMPLETE_RITUAL_DISPLAY.tsx` in Framer. The `.txt` copy is identical for easy copy/paste.

## GitHub upload

Upload **all files in this folder to the same repository level**. Do not combine the package with older v37/v38.2/v38.3 JSON files.

`manifest.json` is the canonical manifest. `rituals.json` contains all 400 rituals. The seven bubble files are split copies for manifest-driven clients.

## No-repeat policy

The packaged web renderer persists served ritual IDs in `localStorage`. No ritual repeats until all 400 have been served; the global pool then resets.


## Single Safety heading fix
All 400 ritual data records now omit standalone `SAFETY` content lines. The UI owns the one visible Safety heading; ritual content begins with `PAUSE`.


## v38.4.3 Tips presentation update
The five post-WIN counselling lines are rendered inside one consolidated **TIPS** card, with five clean bullets. They are no longer five separate mini-cards.
