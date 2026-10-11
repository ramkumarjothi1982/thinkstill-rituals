# ThinkStill Release — V21

`ThinkStillRelease-v21.tsx` is a complete, self-contained Framer code component.
It replaces the V19 bundle + V20 skin: no external script is loaded.

## Install in Framer
1. Assets → Code → **New file** → name it `ThinkStillRelease`.
2. Paste the full contents of `ThinkStillRelease-v21.tsx` and save.
3. Drag the component onto a frame (390 × 844 for phone; it is fully responsive).
4. Turn on **Full-screen app** if the console should cover the whole viewport.

Imports used: `react`, `framer`, `framer-motion` (all provided by Framer).

## Properties
| Property | Purpose |
| --- | --- |
| Theme | Auto / Bright / Dark default (people can change it in Settings) |
| Launch splash, Full-screen app | App presentation |
| Sound effects, Haptics, Music on, Music volume | Defaults for the Settings popover |
| Fallback music | Used only if the shared ThinkStill music source (`__ts_reset_shared_media_v1`) is empty |
| Emotion check-in | Ask "how loud is it" before and after each ritual |
| Burn · Melt · Cleanse · Vacuum · Slingshot | Adds these 5 rituals to the 30 V19 launch rituals |
| Character images / Character assets | Bubble character art (defaults to this repo's `bubble-expressions/`) |
| Support lines / link / emergency text | Support sheet content (`|` separates lines, `Place · number`) |
| Share link | Shows "Share ThinkStill" on the finish screen |
| On Close | Framer interaction fired by the Close button |

## Testing a single ritual
Open Preview with `?tsrdev=1&ritual=18&emotion=anger&text=your+words&before=7`
to jump straight into a ritual (ids: 1 6 15 16 18 22 23 24 25 29 32 36 39 40 41 47 52 61 75 79 87 88 97 100 101 102 105 106 107 109 110 111 112 113 114).

## Compatibility
Reads and writes the same storage as V19: `eos_sessions_v1`, `eos_days_v1`, `eos_prefs_v1`,
`eos_rotation_strict_v2`, `__ts_release_arcade_played_v1`, `ts_release_haptics`, `ts_release_music_volume`,
and still exposes `window.__tsUploadedThoughtImage(s)`. New keys: `ts_release_theme`, `ts_release_sfx`,
`ts_release_music`, `ts_release_motion`, `ts_release_lanterns_v1`.
