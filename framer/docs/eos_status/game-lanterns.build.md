BUILD game-lanterns: ROUND 1 FIXES DONE. 114 SKY LANTERNS (sad / lonely hero). File: /home/user/thinkstill-rituals/framer/src/eos/24_eos_game_lanterns.jsx
All 14 review_r1 findings were handled. The 5 majors and 8 minors are fixed in this file. 1 minor (the wrapper's step words) is outside this file and is handed on below.

ROUND 1: WHAT CHANGED (per finding)
- [major] Past-lantern performance: the sky now brightens as ONE layer.
  - .eosLanPast transitions only its own opacity (.64 → 1), and a single .eosLanPastHaze layer fades in.
  - The per-dot opacity/transform/box-shadow transitions and the --d stagger are gone.
  - The flicker runs on at most 4 of 120 dots.
  - Measured with 120 dots at 390: play peak 44-46 animated nodes, finale 46-50, ask 39. Reduced motion: 9-15.
  - With 0 past lanterns: 40-41 during play and 42-46 at the finale. At 1280: 46 and 48.
  - Also: the arcade PremiumBurst (25-35 nodes) is replaced by this game's own spark bursts. A released lantern gets a ring + 6 sparks (7 nodes). The golden choice gets a ring + 9 sparks + a bloom (11 nodes).
  - During fly/done the dusk twinkles and the hill fireflies rest; the embers and rays take over.
  - Horizon and hill glow now animate opacity (composited) instead of background.
- [major] DOM churn when the player taps instead of holds:
  - There is one cue span, which is never remounted. Its fade restarts through a data-cv="a|b" toggle.
  - A small cue scheduler (setCue) sets minimum display times: hints ("Almost…", "Hold gently…") stay at least 600 ms, and true lines stay at least 2.6 s. A request made during a hold waits its turn.
  - The "warming" line and DROP's hopeful face (E57) appear only after 200 ms of holding (ui.warming), so quick taps never strobe the line or the face.
  - Measured: 12 quick taps in 8 s gave 2 mutations (2 characterData, 0 childList, 0 src), at most 1 per second, and 1 face total. Before: 72 mutations and 25 face changes.
- [minor] Non-soft sfx from rAF: lit() runs inside rAF. When the lantern was already flicked up, it now launches with rise(i, false) and sets pendingChime. The scored sfx("chime") then plays on the next pointermove or pointerup (a user event, valid for 5 s). sfx stays soft + chime ×3 + win.
- [minor] Reduced / calm visuals: no PremiumBurst and no sparks. A soft opacity-only glow (.eosLanSoftBurst) plays instead. The embers, ray spin and constellation/DROP glides are off: they cross-fade at the new pose. The heart pulse is opacity only.
- [minor] Honest share copy:
  - After the choice the line stays blank for 1 s (the step card is floating there).
  - It then reads "A little warmth, on its way 💛" until the share settles.
  - When the share resolves: "Sent with love. 💛" and the label WARMTH SENT.
  - On AbortError: "Saved for later — send it anytime. 💛" and SAVED FOR LATER.
  - On a reject or no share: the copy fallback, the toast "Copied — paste it to someone" (or "Send them: …"), the line "Warmth, ready to send 💛" and READY TO SEND.
  - The 90 % label is WARMTH ON ITS WAY.
  - All 4 paths were verified with navigator.share stubbed to ok, abort and reject, and with share undefined.
- [minor] Short arenas (phone landscape):
  - boxT is clamped to ≤ 22 % of H, and boxB to ≤ H − 8.
  - A compact layout applies when boxH < 300: lanterns 44-70 px, one-line tags (the fitter uses 1 line), DROP beside the lanterns (side) and cards ≤ boxH − 8.
  - The lanterns always stay inside the arena.
- [minor] Forced layout on every pointermove: the stage scale is read once on pointerdown (s.k).
- [minor] Keyboard scroll: preventDefault fires only when the key acts. That means Space starting a press or held for a key-press, and ↑ raising a lit, held lantern. Space and ↑ with nothing to do (or outside play) are left alone.
- [major + minor] Words on the lanterns (eosLanWords + eosLanFitter):
  - Phrases are rebuilt from the user's whole sentence (the entries joined back; cycled short inputs are deduplicated).
  - The sentence is split at punctuation and at joining words (and/but/since/because/when/…, dropped).
  - A long clause splits where a new subject starts (i/he/she/they/we/nobody/everyone), else before a natural boundary (last/at/for/feels/…), else where both halves fit and still mean something.
  - Every phrase is MEASURED with canvas measureText in the tag's real font, and must fit the tag's width in ≤ 2 lines (1 in compact).
  - Phrases are scored by content words ×2 + feeling words ×3 (alone, empty, miss, lost, left, nobody, …), with later clauses winning ties. The best 3 are kept in the user's order.
  - When there are fewer than 3, the longest phrase splits at a subject or boundary before seeds are used. Seeds never repeat a word that is already on a lantern.
  - The stop list now includes pronouns, particles and time words (they/them/she/her/him/you/we/us/all/back/out/up/off/anymore/last/week/…).
  - Words freeze once the first lantern is touched. A strong safety flag still yields EOS_NEUTRAL_WORDS through core eosWords. EosWord rendering is unchanged.
  - Phone results:
    - "nobody texted me back they all left" → nobody texted me | they all left
    - "i miss my dad and nobody calls me anymore" → i miss my dad | nobody calls me
    - "i lost my dog last week and the house feels empty" → i lost my dog | the house | feels empty
    - "i feel so lonely since she left me" → i feel so lonely | she left me
    - "i feel like nobody cares…, and i'm tired of pretending" → nobody cares | i'm tired of pretending
  - Desktop (wider tags): "nobody texted me back | they all left", "i miss my dad | nobody calls me anymore".
  - The narrow tag padding is 8 px, and tags are (W−24)/3 wide.
- [major] Arrows at the two decision points:
  - The lantern marker carries oy = (0.46·lh − uh/2)/uh (≈ −0.22), so the ring and hand sit on the paper. The word is covered 0 % at start (390 and 1280).
  - The choice cards carry ox 0.36 / oy −0.34, so the demo hand taps the card's top corner, not its copy.
  - The ask composition leaves a clear band (92 px phone, 96 desktop) between the question and the cards for the chevron and the "YOUR CHOICE" label. Measured: hand, chevron and label cover 0 % of the question, DROP and the golden lantern.
- [major] The finale is its own composition, clear of the wrapper cards. Measured: the finish card is CENTRED on the stage (≈101 px tall on phone, 63 on desktop), and the step card sits at the tap.
  - gather/ask: the constellation group (one transform) glides to the ask pose. DROP flies INTO the heart holding the golden lantern, with the question under it.
  - fly/done: the heart swells into the sky above the centre band. With 0 past lanterns on phone the heart is ~180 px wide and DROP 85 px.
  - The golden lantern rises to the cleft, the line draws, DROP hugs (E08) with a heart pop at 1.1 s, and 12 embers shower from the four stars.
  - A slow ray burst turns behind the heart, an amber dawn layer warms the horizon to peach/amber, and every past lantern glows (one layer).
  - At 2.4 s the heart beats twice (lub-dub pulses + tones + a haptic).
  - The closing line + toast sit in the middle band (free while the step card is at the tap). At 2.85 s they glide below where the finish card will land.
  - Timing: 100 % arrives at 2.9 s (was 1.8 s) and onDone at 3.35 s, so the peak plays before the finish card.
  - Measured on the timeline (390 and 1280, all 3 share outcomes): DROP 0 %, heart 0 %, line 0 %, toast 0 % under the step or finish card in normal motion. In reduced motion one 0.3 overlap of the line occurs for ~0.3 s while the static step card is up.
- [minor] The true line under each rise now waits 900 ms (lineDelay) for the step card to float away, then holds for 2.6 s. The next lantern's hints wait their turn, and gather waits until the 3rd line has shown for ~2.4 s.
- [minor, NOT this file] The wrapper's step words in 114 ('RESET ✓', 'SPACE ✓', 'RELEASED ✓') read cold. This goes to the rewards/wrapper owner: give 114 / sad / lonely a warm set ('GLOWING ✓', 'WARMER ✓', 'LIT ✓', 'SENT WITH LOVE').

WHAT THE GAME IS (unchanged core)
- The scene:
  - A dusk hill in 3 depth layers: a sky with the user's own past lanterns (eos_sessions_v1 rows for 114, up to 120 drawn, the "N lanterns lit here" pill, never fake strangers), hills with DROP on the crest (warm key light, cool moon rim), and 3 paper lanterns carrying the user's words.
- Playing:
  - Hold 1.2 s (0.7 s after 2 early lifts or 9 s idle) and the glow fills from the fingers, with a warm hum and a slowing heartbeat (60 → 52 bpm) that has a visual twin.
  - Flick it up, or let go, and it rises (2.2 s sway, or a calm 1.5 s fade) into a star on a heart constellation.
  - Each rise is followed by a true line (loved / same sky / everyone carries something). No fail state.
  - Keyboard: Space/Enter hold, ↑ or letting go releases.
- The finish:
  - A golden 4th lantern asks "Send a little warmth?" with 2 equal cards (share "Thinking of you 💛" with a copy fallback, or "Keep it for me"). Both finish the game, with the same bonus (270-350).
  - Safety copy: "Reach out to someone?" / "Text someone you trust", and neutral words on the lanterns.
- Progress: 0 → 3/10/18/25 per lantern → 82 → 90 → 100. It is strictly increasing, with onDone once.
- DROP's faces: E80/E70 → E57 (now after 200 ms of holding) → E59 → E28/E31 → E09 → E08.

EXPORTS (no import/export lines)
- Public names: EOS_GAME_114, EosSkyLanternsEngine, EOS_LANTERNS_CSS. Every other name is EOS_LAN_* / EosLan* / eosLan*.
- eosExpose("lanterns", {state, EOS_GAME_114, layout, words: eosLanWords, fitter: eosLanFitter}).
  - layout(W, H, safeTop, safeBottom, pill) now also returns compact, qY, lineY, toastY, lineRise, askH, finH and the --ca*/--cf*/--da*/--df* pose variables.
- Registration is unchanged: eosRegisterGame(EOS_GAME_114, …, {gesture:"hold", char:"drop", seconds:25}).

INTEGRATOR: NOTHING NEW TO WIRE
- The marker contract is unchanged: hold (ms 1200/700) → drag u 140 → choose on both cards. Only the oy/ox target offsets were added.
- Router: sad and lonely → 114. GOOD never routes here.
- Do not add .eosLanLantern to PX_SQUASH_TARGETS.
- Rewards owner: see the step-word note above.

ACCEPTANCE (round 1)
- Builds:
  - Isolated: python3 build.py --dev-dir /tmp/eos_game-lanterns --modules 00_eos_core.jsx,24_eos_game_lanterns.jsx → OK.
  - Scratch integrated with the real arrows: dev/eos_integrate.py --dev-dir /tmp/eos_game-lanterns_int --modules 24_eos_game_lanterns.jsx,30_eos_arrows.jsx → OK.
- Scripts: /tmp/lanfix/flow.mjs (journey, nodes, arrows, finale overlap timeline, share stubs), mash.mjs (tap churn), words.mjs (phrases).
- Every run passed with:
  - 0 page errors and 0 warnings.
  - plog 0,3,10,18,25,28,35,43,50,53,60,68,75,82,90,100.
  - sfx soft,chime,soft,chime,soft,chime,win (including the flick-while-warming lantern, whose chime comes on the next pointer event).
  - onDone once (done:true).
  - At 390: normal send-ok, send-reject and send-abort; normal keep with 130 past lanterns; reduced keep with 130 past lanterns.
  - At 1280: normal send-ok and send-abort.

SCREENSHOTS (/home/user/thinkstill-rituals/framer/dev/shots/eos/, git-ignored)
- Round 1: game-lanterns_r1_390_normal_send_0_{1start,3ask,4peak,5finish}, game-lanterns_r1_390_normal_keep_130_2mid, game-lanterns_r1_390_reduced_keep_130_{4peak,5finish}, game-lanterns_r1_1280_normal_send_0_{1start,3ask,4peak}.png.
- What I checked on them:
  - The start hand is on the paper, with the word readable.
  - Ask: heart, DROP, the golden lantern, the question, the "YOUR CHOICE" label and the chevron sit in clean bands above the cards.
  - Peak: a big heart with rays, DROP hugging, an amber dawn, and the line + toast clear of the cards.
  - The earlier round's shots are kept.

KNOWN LIMITATIONS
- The wrapper's step-card words for 114 are cold (wrapper/rewards owner).
- In reduced motion the wrapper keeps its step card fully opaque until the finish card. While it sits at the tap, the closing line can be partly covered for a moment (measured once at 0.3 for ~0.3 s).
- On phone with past lanterns (pill shown), the ask-stage DROP inside the heart is ~57 px (the 390 box is 390 px tall, and the cards, the arrow band and the question take ~250 px). It grows to ~73-85 px at the finale.
- The finish-card band is modelled from measurements (centred, ~101 px phone / 63 px desktop). If the wrapper changes that card, the cardC/cardHalf constants in eosLanLayout need retuning.
- The real navigator.share sheet was not exercised (it was stubbed ok/abort/reject/undefined). Headless timings depend on load. Image-only input is still not exercised at runtime.
- Compact (landscape) layout: placement and the 1-line fit are computed in eosLanLayout and checked by reading the code. It was not re-run at 844×390 this round.
