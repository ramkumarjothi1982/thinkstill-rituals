# v1 zap (F4 ZAP id 6) — progress
- calls ~20: read F4/P13.26-c; ZapEngine at src/00_arcade.jsx ~L7190 (Tesla towers, field zap x3). Plan: new module src/eos/26_eos_game_zap.jsx (EosZapperEngine: handheld zapper tool-first, angry RUSH helper, per-bubble bolt, face neg->pos via data-tsf-mood opt-in in 16_eos_bubble_face), ZapEngine delegates to it (original kept as ZapEngineClassic); arrows table 6 -> tool + tap; hint 60_eos_fixes[6].
- commit plan: stage only my hunks (index built from HEAD + my replacements) since 00_arcade.jsx has another agent's uncommitted hunks.
