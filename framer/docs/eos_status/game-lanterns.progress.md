# game-lanterns progress
- [~17 calls] Read brief, core, sigh patterns, driver hold/choose logic; picked DROP faces from local bubble-expressions
  (start E80 sad / E70 lonely → E57 warming → E59 looking up → E28/E31 → E09 ask → E08 hugging heart).
- Design: dusk hill, DROP on crest (mid layer), 3 paper lanterns front row (word on hanging tag), sky with the
  user's past lanterns (eos_sessions_v1 rows for 114) + heart constellation: risen lanterns become stars on a heart,
  golden 4th lantern held by DROP asks "Send a little warmth?" → rises to the heart's cleft, heart draws.
- NEXT: write src/eos/24_eos_game_lanterns.jsx, isolated build, integrate build, tests, screenshots.
- [~33 calls] Module written + plays end to end in the integrated build (finishGame reaches the reveal, 0 errors,
  monotonic progress 0..100, both options equal size). Fixed: arcade button:hover transform (fly transform now on an
  inner .eosLanFly span), dt cap (wall-clock hold), stop-word tags, brighter hills/crest rim, desktop layout (DROP beside
  the lanterns). Machine load avg ~12 → finishGame times are noisy (46-59 s); use lite:true for timing.
- NEXT: re-shoot 1280/390, acceptance script (sky count 0/N, share stub + toast, safety copy, reduced, heartbeat twin,
  keyboard), smallText, commit.
- [~51 calls] Acceptance script /tmp/lan/t4.mjs passes at 390 (meta, markers hold→drag u 140→choose×2, sky count 0/3,
  equal buttons, share-stub reject → "Copied — paste it to someone", keep path, safety copy + neutral words, reduced rise
  without sway, heartbeat twin, sfx soft/chime×3/win, onDone once). Fixed .tsExactUserText max-width:88% wrapping tag words,
  side layout ≥ 820 px, keyboard focus to the finale option. finishGame lite: 390 35 s, 1280 46 s, keyboard 18 s at load ~13.
- NEXT: final t4 at 1280 + timing re-run, final screenshots, commit + push, build.md.
- [round 1 fix, ~20 calls] Read review_r1 (5 major, 9 minor). Measured: wrapper finish card is CENTRED on the stage
  (not at the tap) → finale = heart swells in the sky above the card band, DROP flies INTO the heart, closing line +
  toast go below the card (where the choice cards were). Ask stage: heart+DROP+golden lantern above the question, a
  ~92 px clear band for the guide chevron/label, cards at the bottom. Plan: single-layer past sky, cue scheduler
  (no remount, warm cue/face after 200 ms, hint ≥600 ms, true line delayed 900 ms + held 2.6 s), pending chime for
  flick-while-warming, calm soft glow instead of PremiumBurst, honest share copy, compact layout, scale read once,
  keyboard preventDefault only when acting, phrase builder (clauses, subject/boundary splits, measured 2-line fit,
  content/affect scoring), marker oy on paper/icon, rays + star embers + lub-dub heart pulse + amber dawn, fullMs 2900.
- [round 1 fix, ~44 calls] All findings applied. Measured (scratch int build incl. 30_eos_arrows): animated nodes play 40-46 /
  finale 46-50 with 120 past dots (normal), 9-15 reduced; tap-mash 2 mutations in 8 s, 1 face; ask arrow hand/chevron/label
  0 % over the question, DROP or the golden lantern; start arrow 0 % over the user's word; finale DROP/heart 0 % under the
  wrapper cards; share ok → "Sent with love", abort → "Saved for later", reject → copy toast + "Warmth, ready to send".
  PremiumBurst replaced by this game's own spark bursts (7 / 11 nodes). Committed as "EOS fix: game-lanterns round 1".
