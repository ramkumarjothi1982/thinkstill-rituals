# ThinkStill v38.11 Routing QA

## Fixed root cause

The pre-fix router treated broad everyday nouns such as `drugs`, `weed`, `alcohol`, `smoking`, and `relapse` as neutral unless the exact word already existed in ritual metadata. The locked ritual library uses canonical terms such as `urge`, `craving`, `habit`, `compulsion`, `temptation`, and `addiction`, so low-context user language could lose relevance scoring.

v38.11 translates high-confidence everyday language into the canonical workbook routing vocabulary before parent/subpattern/ritual scoring. It also adds a dedicated `urge` intent and, when unused rituals are available, scopes that intent to the canonical `Urges / Habit Loops` parent.

## Release smoke cases

| User input | Expected route |
|---|---|
| `drugs` | Urges / Habit Loops |
| `I want weed` | Urges / Habit Loops |
| `alcohol` | Urges / Habit Loops |
| `I keep relapsing` | Urges / Habit Loops |
| `argument with my partner` | Communication / Boundaries |
| `my breakup` | Values / Meaning / Grief |
| `debt and bills` | Uncertainty / Future Worry / Reassurance |
| `job interview tomorrow` | Performance / Confidence |
| `I keep getting flashbacks` | Mental Imagery |

## Safety precedence

Immediate danger/body-alarm language is evaluated before generic substance routing. `overdose`, `withdrawal`, `detox`, seizure/chest-pain language and the existing self-harm/harm/emergency signals stay inside SUPPORT FIRST handling. Panic/body-alarm language also takes precedence over the generic substance alias.

## Preservation

- Locked 750 ritual content is unchanged.
- Global no-replay logic is preserved.
- Bubble visuals still follow the final selected ritual.
- Existing slab reveal skin, motion, video transition behavior and no-initial-prompt behavior are preserved.
- Router storage key advanced from `v1900` to `v2000` to prevent stale pre-fix route state from carrying into the corrected release.
