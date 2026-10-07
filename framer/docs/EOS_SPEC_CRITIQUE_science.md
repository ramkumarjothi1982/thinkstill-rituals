# EOS SPEC critique: relief science, safety, ethics, accessibility

**Reviewed:** `docs/EOS_SPEC.md` v1.1 and `src/eos/00_eos_core.jsx` v1.1.0.
**Lens:** Does each emotion get a mechanic that really shifts that state fast? That means down-regulation for panic, anger and anxiety; up-regulation for sadness, numbness and loneliness; defusion for overthinking; and self-kindness for shame. Are the timings right? Is the safety card correct and non-blocking? Are there dark patterns? Is it accessible?
**Companion doc:** `EOS_SPEC_CRITIQUE_asks.md` covers user-ask coverage and experience. Where an item overlaps it, this doc cites the ID (for example "asks D4") and adds only the science, safety or ethics part.

**How it was checked**
- **Spec text and core source.** Every claim below was checked against the spec text and the core source (line numbers are given).
- **Arcade source.** Checked against `src/00_arcade.jsx`:
  - `RELEASE_PHASE_EMOTIONS` L2972
  - storage keys L2367-2370
  - the mic at L21595 (Web Speech API)
  - 66 / 80 wait logic at L16277 / L16639
  - the header × (`releaseClose` → `clearForNext`)
- **Safety regexes.** The safety regexes were run in node: `/tmp/eos_critic_science/safety_lex.js` (16 must-match phrases, 15 must-not-match phrases, all pass with the fixes in S6).
- **Citations.** Each one is used only for the claim it supports.

**Severity**
- **P0:** fix in the spec or core before builders start; otherwise someone can be harmed, misled or locked out.
- **P1:** should ship in this build.
- **P2:** polish, or the next batch.

**What is already right (keep it).**
- The 12-state model, with lonely kept separate from numb.
- "High intensity → body first".
- The Kjærvik & Bushman 2024 reasoning behind a cool-down after discharge.
- The 111 exhale ratio (6 s out / 2.6 s in ≈ 2.3) and a cycle near the resonance rate (~6.5 breaths/min).
- 113 grounding for anxiety, 116 word repetition for overthinking, 115 self-compassion for shame, 117 behavioural activation for numb, and 114 with a real reach-out for loneliness.
- No fail states in new games.
- A non-blocking safety card with first-person phrasing.
- No fake social data, no notifications, I'M GOOD at least as large as ONE MORE, a 3-loop / 10-minute exit ramp, and no typed text in `eos_*` storage.
- The arcade itself persists no typed text: only score, played ids and media URLs (verified).

---------------------------------------------------------------------------------------------------
## Scorecard: does each state get the right regulation?

| state | needs | spec gives | verdict | issues |
|---|---|---|---|---|
| panic | down: long exhale, no threat cues | 111 BIG SIGH, then 109 / 102 / 36 | **Good idea, flawed execution.** The lift between the two inhales reads as an exhale; the opening heartbeat haptic is too fast; there is lightning flicker; 71 DEFUSE (a bomb) is routed at mid. | B1 B3 B6 A6 R9 |
| anger | short discharge, then arousal down | 112, then pure smash games | **At risk.** Recency penalties push regular users onto STOMP / SHRED / CRUSH; the companion "calms" while they smash (a pro-catharsis message). | R1 R10 |
| anxiety | down + attention to the present | 111 / 113 / 102 / 109 | **Good.** 113's missions exclude blind and deaf users. | A9 |
| overthinking | defusion | 116 + 61 / 43 / 34 | **Under-dosed.** 116 runs ~7 s and the app speaks the words, not the user. | B7 R5 P2 |
| overwhelm | offloading, one step | 111 / 93 / 95 / 21 / 87 / 85 | **OK** (ONE THING is deferred; asks G1). | — |
| sad | validate → soothe → gentle lift | 110 / 114 / 109, then 106 / 117 at low | **OK.** The dial asks "how loud" for a low-arousal state. | Q6 |
| lonely | warmth + real connection | 114 (reach-out) / 106 / 115 | **Good.** | S8 (safety finale) |
| shame | self-kindness, not hiding | 115, then **19 ERASE / 14 CRUMPLE / 18 BURN** at mid | **Mid band contradicts the design** ("erase/burn teaches hiding"). 115's hand-on-heart is the wrong dose and the wrong body. | R2 B8 |
| fear | approach, but graded | **118 at high**, which can also minimise a real threat | **Unsafe as specified.** | R4 S9 |
| jealous | self-affirmation / gratitude | 115 / 47 / 25 | **Weak** (no own-wins mechanic). | R7 |
| numb | **up**-regulation | 117 / 68 / 74 / 1 | **Games right, wrapper wrong.** The ambience is the slow 6 breaths/min field, and the "calm" face equals the loud face. | R6 Q6 |
| good | savour | 117 / 106 / **114** | 114's copy is about sadness and loneliness. | R3 |

---------------------------------------------------------------------------------------------------
## S. Safety card and crisis handling (§10, §6.6.6, core store)

**S1 [P0] The safety flag loses a race with the launch, and it never reaches the words on screen.**
- *Problem.*
  - `EosSafetyLayer` sets `safety` 400 ms after the last keystroke (§10.2).
    - Type "i want to die" and press Enter, or LET THINKSTILL CHOOSE, within 400 ms: `EosRouteGame` sees no flag and can route a destroy game.
  - During play, the arcade re-materialises entries on every `raw` change (map_main L21197). Words typed after launch land on the running game's objects before the flag exists.
  - Even with the flag, only 116 neutralises text (§10.2). Gentle games (110 RAIN OUT, 40 PAPER PLANE, 95, 114, 115…) still put "I want to die" or "my dad hits me" on objects that the player floats, rains or shelves "away". For self-harm and abuse, that is "just let it go" messaging.
- *Fix.*
  1. `EosRouteGame`, `EosMarkLaunch` and `EosEntries` each call `eosApi("safety").scan?.(text)` **synchronously**. The scan is pure regex, so it is safe in render.
     - `EosMarkLaunch` (a callback) writes the result to the store.
     - The router treats a synchronous hit exactly like the flag.
  2. `EosEntries(raw)`, before the "≥ 6 tokens → null" early return and regardless of `enrich`:
     ```js
     const st = EOS_STORE.get()
     const flag = eosApi("safety").scan?.(raw) || (st.safety === "selfharm" || st.safety === "abuse" ? st.safety : null)
     if (flag) return EOS_NEUTRAL_WORDS.slice()
     ```
     with `const EOS_NEUTRAL_WORDS = ["this feeling", "a heavy moment", "right now", "one breath", "still here", "a little space"]` (core). Every one of the 110 games gets its entries through `cleanEntries`, so this neutralises them all at once.
  3. Core `eosWords()`: return `EOS_NEUTRAL_WORDS.slice(0, n)` under the same condition, which covers games 111+.
  4. Card body adds one line: *"We've kept your words off the game for now."* This is transparent, so the change does not feel like the words were erased.
- *Acceptance (§10.4):*
  - "i want to die" + Enter within 100 ms → the routed id ∈ gentle list.
  - During play, typing "my dad hits me" → within 500 ms no arena element's text matches `EOS_SAFETY_LEX`.

**S2 [P0] There is no route to help unless the lexicon fires.**
- *Problem.* Support lines appear only when the words match the lexicon. These people never see them:
  - check-in-only users (tap SAD, type nothing)
  - voice users whose words were misrecognised
  - non-English speakers
  - anyone who phrases distress differently
  
  After a card is dismissed, nothing stays reachable.
- *Fix.*
  - **Persistent support link.** A "Need to talk to someone?" link (13 px text, ≥ 44 px hit area) in three places: the check-in footer, the reveal card and the Orb Shelf.
    - It opens `EosSafetyCard variant="info"`: lines + emergency text, no trigger copy.
  - **Pill after dismissal.** After a triggered card is dismissed, a 44 px "💛 support" pill stays at the top-left of the stage for the rest of the app session (z 70, never over the composer).
  - **Reveal in safety mode.** The reveal's button row adds **"💛 Talk to someone"**, the same size as I'M GOOD.

**S3 [P0] The card steals focus while the user is typing.**
- *Problem.*
  - The scan runs on the composer text, so the card appears while the cursor is in `input.releaseThoughtInput`.
  - §10.3 moves focus to the first button, and Escape = "I'm safe". The next Space or Enter keystroke activates a button, Escape dismisses the card, and the sentence is cut off.
  - In play, keyboard players of hold games (Space) lose control mid-hold.
- *Fix (§10.3 a11y).*
  - **Don't move focus while typing.** If `document.activeElement` matches `input, textarea, [contenteditable], .arena *`, leave focus where it is.
    - Announce through a visually hidden `aria-live="assertive"` node: "Support options are open at the top of the screen."
    - Move focus to the card only on the next stage change, or when the user presses Tab or F6.
  - **Markup.** `role="alertdialog" aria-modal="false" aria-labelledby="eosSafetyTitle" aria-describedby="eosSafetyBody"`.
  - **Escape** dismisses only when focus is inside the card.
- *Acceptance:* typing "i want to die and then some" in the composer leaves every character in the input.

**S4 [P1] The soft trigger misfires.**
- *Problem.* §6.6.6 fires the soft card on "after ≥ 9", or "after ≥ before on two consecutive loops". That breaks in three ways:
  1. **GOOD.** GOOD has `better:"up"`, so 9 is a great result, and it would show "Big feelings keep coming back?".
  2. **Low intensity.** 2 → 2 → 2 counts as "big feelings": it pathologises a small feeling.
  3. **Numb.** The copy talks about "big feelings" to someone who feels nothing.
- *Fix.*
  - **Rule.** Soft fires only when `EOS_EMO[emo].better === "down"` **and** either:
    - `after ≥ 9 && delta ≤ 1`, or
    - `after ≥ 7 && after ≥ before` on two consecutive rated loops of the same feeling.
  - **Numb copy.** *"Feeling far away for a while?"* / *"Talking to someone you trust can help bring the colour back."*
  - **Precedence.** `selfharm > abuse > soft`; a later soft never downgrades an earlier flag.

**S5 [P1] `safetyDismissed` is a boolean, but §10.2 needs per-type state.**
- *Problem.* "Re-shows for a new trigger type" cannot be represented with a boolean: once self-harm is dismissed, an abuse disclosure stays silent.
- *Fix (core `EOS_STORE_INITIAL`).*
  - `safetyDismissed: {}`.
  - The card shows when `safety && !safetyDismissed[safety]`.
  - Dismiss = `set({safetyDismissed: {...st.safetyDismissed, [safety]: true}})`.

**S6 [P0] Lexicon gaps and false positives beyond asks D4.**
All verified in `/tmp/eos_critic_science/safety_lex.js`.
- **Add `selfharm2`.**
  ```js
  /\b(unalive\w*|sewer\s*slide|end\s+(?:myself|things\s+tonight)|hang\s+myself|slit\s+my\s+wrists?|jump\s+off\s+(?:a|the)\s+(?:bridge|building|roof)|(?:been|started|keep|kept)\s+cutting|cutting\s+again|i'?m\s+going\s+to\s+(?:do\s+it|end\s+it)\s+tonight)\b/i
  ```
  "unalive" and "sewerslide" are the most common algospeak among teens.
- **Add `abuse2`.**
  ```js
  /\b(?:(?:he|she|they|my\s+(?:ex|parents?|dad|father|mum|mom|mother|step\w*|partner|husband|wife|boyfriend|girlfriend|bf|gf|uncle|aunt|cousin|grand\w*|guardian|carer|caregiver|brother|sister|teacher|coach))(?:'ll|\s+will|\s+is\s+going\s+to|\s+might|\s+keeps?|\s+always)?\s+(?:hit|slap|kick|punch|shove|chok|strangl|burn)\w*\s+me\b(?!\s+(?:up|out|with|back|to|into)\b)|(?:he|she|they)(?:'ll|\s+will|\s+is\s+going\s+to|\s+might)\s+(?:hurt|kill)\s+me\b(?!\s+if)|(?:he|she|they)\s+(?:hurt|touched|threatened)\s+me)\b/i
  ```
  - It covers "he'll hurt me again", "my ex hits me", "my parents hit me" and "my stepdad slapped me". The current lexicon misses all four.
- **False positive in the existing `abuse` regex: "she hit me up on whatsapp".** Append `\b(?!\s+(?:up|out|with|back|to|into)\b)` after `\s+me` in the `(hits?|beats?|…)\s+me` branch.
- **False positive: "kms" for kilometres** ("I ran 10 kms", "drove 300 kms"; very common in Indian and UK English).
  - Fix: in `EosSafetyScan`, `const s = norm(t).replace(/\b\d+(?:[.,]\d+)?\s*kms\b/gi, " ")` before testing. A bare "kms" still matches.
- **Still clean:** "this traffic is killing me", "my mom will kill me if i fail", "they'll kill me if i'm late", "he pushed me to do better", "my brother kicked me out of the group chat", "cutting vegetables", "hit me with your best shot".
- **Hard rule for all `src/eos/*` (add it to §0 / §12):**
  - Never use regex lookbehind (`(?<=` / `(?<!`). A lookbehind literal is a parse-time SyntaxError on iOS Safari < 16.4, and it would take down all 110 games, not just the safety check. Today the code has none (verified: 0 in arcade, Pixar and core).
  - Build check: `grep -n '(?<[=!]' src/eos/*.jsx` must print nothing.

**S7 [P1] Support lines: lead with the local line, call in one tap, add missing regions.**
- *Problem.* The list always starts with the US line, the number sits behind a second tap ("Talk to someone now" → expand), Canada is missing, and every number becomes a `tel:` link, even text-only services.
- *Fix (§10.3, core `EOS_PROP_DEFAULTS`).*
  - **Local line first.** `eosOrderLines(lines)` puts first the line whose label matches the region from `Intl.DateTimeFormat().resolvedOptions().timeZone`. No network call.
    - `America/Toronto|Vancouver|…` → Canada
    - other `America/` → US
    - `Europe/London|Dublin` → UK & IE
    - `Australia/` → Australia
    - `Asia/Kolkata|Calcutta` → India
  - **One-tap call.** That line renders as the primary button "Call 988" (US / CA: "Call or text 988"). Other lines sit under "more lines ▾".
  - **Add Canada:** `Canada · 988` (call or text, the 9-8-8 line since Nov 2023).
  - **Text-only services.** Parse `text WORD to NNNNN` into `sms:NNNNN?&body=WORD`, not `tel:`, so an owner can add "Crisis Text Line · text HOME to 741741".
  - **Labels with digits.** Never build `tel:` from digits that sit inside the label text (such as "24/7").
  - **Release note.** If the audience includes under-18s, add youth lines: Childline UK 0800 1111, Kids Help Phone CA (text 686868), CHILDLINE India 1098.

**S8 [P1] What the gentle list contains in safety mode.**
- *Problem.*
  - 33 FLOAT AWAY is "SNIP THIS STRING" with scissors: cutting imagery right after a self-harm (cutting) disclosure.
  - 117 COLOUR RUSH (beat, confetti, "the crew dances") is the jarring tone right after a disclosure.
  - Grounding, the standard crisis skill, is not first.
  - 114's finale sends "Thinking of you 💛" (a nice text, but not a request for help).
  - 115's line bank includes "You did the best you could" and "I'd forgive a friend for this", which imply fault: wrong after an abuse disclosure.
- *Fix.*
  - `EOS_GENTLE_IDS = [113, 111, 109, 110, 102, 95, 114, 115, 106, 40]` (no 33, no 117, no 118, no 116).
  - In safety mode, 114's finale reads **"Text someone you trust"** → `"Hey, can you talk? I'm having a hard time."`
  - In safety mode, 115 uses a dedicated bank: *"It's not your fault."* · *"You deserve to be safe."* · *"You matter, right now."* · *"You don't have to carry this alone."*

**S9 [P1] Fear games can minimise a real threat.**
- *Problem.* The abuse lexicon does not catch "I'm scared he'll hurt me" (verified; S6 adds it), but many variants will always slip through. 118 then turns the words into "a tiny sock puppet" with *"oh. that's it?"*. 105 DRAMA MACHINE and 53 CARTOONIFY (fear low / mid) make them silly. Approach messaging is wrong when the danger is real.
- *Fix.*
  - **Route rule.** Add to `EOS_ROUTE_RULES` for 118, 105 and 53: `(t) => !EOS_REAL_THREAT.test(t)`, with
    `const EOS_REAL_THREAT = /\b(he|she|they|him|her|someone|somebody|my\s+\w+)\b[^.!?]{0,40}\b(hurt|hit|kill|attack|follow|stalk|threat|beat|touch)\w*/i`.
  - **Soft safety.** When `EOS_REAL_THREAT` matches but the abuse lexicon doesn't, set `safety:"soft"` with the abuse copy: "If someone might hurt you, you deserve to be safe."
  - **118's reveal copy.** *"smaller up close."* / *"you looked right at it."* Never "that's it?" (see C2).

---------------------------------------------------------------------------------------------------
## B. Breathing, timing and haptics

**B1 [P0] 111: the lift between the two inhales breaks "finger down = air in, finger up = air out".**
- *Problem.*
  - §8.1: "Release and press again within 1.0 s = sip 2", and "let go" later means the long exhale. Everywhere else in the app (Still Moment, 109, 65), lifting the finger means breathing out.
  - Most people will exhale when they lift. The double inhale (the active ingredient of the physiological sigh: a second inhale on top of the first, with no exhale between) becomes inhale → exhale → inhale.
  - In the no-second-press path, the "automatic top-up" plays while the finger is already up and the user is already exhaling.
- *Fix (§8.1 controls).* The finger stays down for both inhales.
  1. **Inhale 1.** Hold: fills to 72 % over 2.0 s.
  2. **Sip cue.** At 72 % the notch pulses: "…one more sip ↑".
  3. **Sip 2.** **Slide the thumb up ≥ 24 px while still pressed**, or tap anywhere with a second finger: 72 → 100 % in 0.6 s.
     - If neither happens within 1.0 s, the top-up plays automatically **while the finger is still down**.
  4. **Exhale.** Lift = exhale. Lifting before 72 % = a small puff, "bigger breath in, then let go".
  - **Arrow.** `{g:"hold", ms:2000, label:"HOLD · BREATHE IN"}` → `{g:"drag", dir:"u", d:30, label:"SIP MORE ↑"}` → (no target during the exhale).
  - **Keyboard.** Space down = inhale, ↑ = sip, Space up = exhale.
  - **Cue copy.** "in through the nose… one more sip… slowly out through the mouth" (the protocol in Balban et al. 2023).

**B2 [P0] The Still Moment sigh's exhale is too short, and the drains are eased the wrong way.**
- *Problem.*
  - §2.4 / §6.6 use 2 s in + 0.6 s sip + 4 s out. That is a ratio of 1.5, and 6.6 s total although it is called "6 s". A physiological sigh needs the exhale clearly longer than both inhales together, ≈ 2× (111 gets this right at 2.3×).
  - Neither section names an easing for the drain; the design sketch uses ease-in-out. That is fastest in the middle, so it cues a quick puff rather than a long, even exhale.
- *Fix.*
  - **Timing.** Sigh moment = **1.6 s in + 0.5 s sip + 4.4 s out (6.5 s; ratio 2.1)**. State "≈ 6.5 s".
  - **Easing.** Every exhale drain (111, Still Moment, 112's rain-out phase, the `wait` ring) uses `linear` easing: an even flow, "like through a straw".
  - **Shared numbers.** Write all of them as core constants so no builder drifts: `EOS_BREATH = { sighIn: 1.6, sip: 0.5, sighOut: 4.4, coreIn: 4, coreOut: 6 }`.

**B3 [P1] 111's first exhale is too long at high panic, and there is no dizziness guard.**
- *Problem.* At a heart rate of 120+, a 6 s exhale on cycle 1 is hard. Failing to keep up with the pacer feeds the thought "I can't even breathe right". Repeated maximal double inhales can also cause light-headedness in someone who is already over-breathing.
- *Fix.*
  - **Graduated exhale:** 4.5 s → 5.5 s → 6 s over cycles 1-3; cycle 4 stays at 6 s. The ratio stays ≥ 1.7, then ≥ 2.1.
  - **Cycle 1 cue:** "as long as feels ok".
  - **Two early releases in a row** → *"Breathe however feels easy — the slow out is what matters."*
  - **One-time line** in the intro: *"Dizzy or tingly? Just breathe normally for a moment."*

**B4 [P0] Two breathing pacers at once.**
- *Problem.* During 111 (self-paced sighs of ~8.6 s), the Still Point keeps its own 10 s 4-in / 6-out cycle behind the game (§5.2, opacity .45). 112's rain pulses on yet another 10 s clock, the `wait` ring on a third. A pacer only works if the eye follows one rhythm; out-of-phase pacers on screen at the same time work against each other.
- *Fix (§5.2 API).*
  - **`breath(phase)`.** `eosApi("dots").breath(phase)` with `phase ∈ "in" | "hold" | "out" | null`.
    - 111, the Still Moment and 112's cool phase drive the core with it while they run. `null` hands control back to the autonomous 10 s cycle.
    - The autonomous cycle pauses while a game owns the breath.
  - **`phase()`.** `eosApi("dots").phase()` returns the global `{phase, t}`. The `wait` ring and 112's rain read it, so every pacer on screen is in phase.

**B5 [P1] The 66 BUFFERING / 80 DON'T TAP `wait` ring can't fit its rounds.**
- *Problem.*
  - The arrow ring breathes 4 s in / 6 s out, but the rounds are 3 s (66) and 5 s (80); a tap restarts the round (verified, L16277 / L16639).
  - The label "HANDS OFF · BREATHE" over a ring that never finishes a breath is confusing.
  - Scaling the ring to the round instead would pace 20 breaths/min (faster than normal breathing).
- *Fix.*
  - The ring follows the global phase (B4). The countdown arc shows the round.
  - Label: "HANDS OFF · BREATHE WITH THE GLOW".
  - Never pace breaths shorter than 8 s.
  - `EosLegacyGuards`: after 2 restarts in a row, show "almost — hands off for a moment" (never "wrong").

**B6 [P0] The heartbeat haptics are too fast, and they are the wrong cue for panic.**
- *Problem.*
  - Core `EOS_HAPTIC.heart = [10, 90, 10, 600]` (L486) is a 710 ms cycle, about **85 bpm**: an elevated heart. 111 starts at that same pattern.
    - Heartbeat-like vibration calms only when it is **slower than the wearer's resting rate** (Azevedo et al. 2017). Faster rhythms raise arousal.
    - In panic specifically, drawing attention to heartbeat sensations is the classic trigger (catastrophic misreading of bodily sensations; Clark 1986).
  - `EOS_HAPTIC.exhale = [10, 60, 10, 60, 10]` lasts 150 ms. That is not an exhale.
- *Fix.*
  - **Core:**
    - `heart: [12, 140, 12, 836]` (1000 ms = 60 bpm).
    - New `eosHeartbeat(fromBpm = 60, toBpm = 52, ms)`: re-issues one beat per period and slows across `ms`; cleanup is returned.
    - `exhale: [8, 300, 8, 450, 8, 600, 8, 800, 8, 1000]`: ≈ 3.2 s, decaying.
  - **111 (panic): no heartbeat at all.** An 8 ms tick at each inhale notch plus the `exhale` train during the exhale.
  - **115:** the visual heartbeat goes 72 → 56 bpm, not 90 → 60.
  - **Twins.** iOS Safari has no `navigator.vibrate`, so every haptic cue needs a visual or audio twin; the spec should say so in §8.0.

**B7 [P1] 116 SQUEAKY THOUGHT: the dose is too small, and the user isn't the one repeating.**
- *Problem.*
  - The defusion effect comes from the person **saying** the word aloud quickly and repeatedly, and it grows with time: the clearest effects are at ~20-30 s (Masuda et al. 2004, and the 2009 parametric follow-up).
  - 20 fast taps take ~6-8 s, and on taps 1, 8 and 15 the *app* says the word, not the user.
- *Fix (§8.6).*
  - **Time under repetition.** The MEANING-O-METER drains over **≥ 18 s of active tapping**, in two 9 s rounds: "normal voice" → "chipmunk voice". Tapping runs at ~1.5-3 taps/s.
  - **Cue:** "say it with each tap — out loud or in your head".
  - **Auto-complete** at 30 s if there were ≥ 10 taps (no fail).
  - **Arrow:** `{g:"taps", n:20, label:"SAY IT · TAP"}`; the badge shows seconds left, not taps.
  - **TTS:** see P2 and asks E13.

**B8 [P1] Hand on heart and "warm mug" (115, the heart Still Moment, 114) is the wrong body and the wrong dose.**
- *Problem.*
  - The evidence (Dreisoerner et al. 2021) is for touching **your own body** (hand on chest, or a self-hug) for ~20 s. Pressing PATCH's heart on glass for 3 s is neither.
  - The "warmth" claim borrows the warm-cup priming literature, which has replicated poorly. Nothing in the spec should rest on it.
- *Fix.*
  - **Copy.** *"Thumb on PATCH's heart — and if you like, your other hand on your own chest."*
  - **Timing.** After the 3 s game hold, add an optional 5 s "stay here" with two slow breaths (skippable, never required).
  - **Heart Still Moment** uses the same two-hands copy.
  - **Science lines** say "invites supportive self-touch". Never "blunts cortisol".

**B9 [P2] Scope the science claims to what the game actually does.**
- The 111 note says "exhale ≈ 2.3 × inhale" right after the Balban citation. That ratio is our design choice; the paper's protocol is 5 minutes a day. Reword: "modelled on cyclic sighing (Balban et al. 2023); we claim a fast downshift, not the 5-minute effect."
- These rationales are internal only and must never be shown in the UI (C3).

---------------------------------------------------------------------------------------------------
## R. Routing and mechanism fit (§7.2, §6.5, core `EOS_EMOTIONS`)

**R1 [P0] Anger at high intensity drifts onto pure smash games.**
- *Problem.*
  - `anger.high = [112, 100, 4, 15, 2]`, and §7.3 scores `1 − rank×.1 − played(last 6)×.15 − last3sessions×.4`. If the user played 112 in their last 6 games, 112 scores **.85**, below 100 HOT POTATO at **.90**. If 112 and 100 were both in the last 3 sessions, 4 STOMP (.80) wins.
  - So the more often someone comes back angry, the less often they get the cool-down. And smashing your own grievance words is exactly the condition that *increases* anger: venting while ruminating on the provocation (Bushman 2002). Arousal-raising activities do not reduce anger (Kjærvik & Bushman 2024).
  - The "↻ same game" button turns any smash game into an unlimited loop.
- *Fix.*
  1. **High band:** apply only the `st.path` penalty; drop the played and recent-session penalties. That is what "reliability beats novelty" in §7.3 means.
  2. `anger.high = [112, 109, 65, 111, 100]`. Move 4, 15 and 2 to `anger.mid`.
  3. **After any `EOS_DISCHARGE_IDS` game with emotion anger:**
     - The Still Moment runs the **cool** variant: 2 sighs ≈ 13 s, skip from 1.5 s.
     - ONE MORE ▶ reads **"COOL IT DOWN ▶"** (= 112), whatever the delta.
     - "↻ same game" allows one replay, then reads "↻ cool it down".
  4. **Conflict with asks E7.** Scale the eruption's *juice* (rock size, shake, pitch) with intensity, not its *length*. The eruption stays ≤ 8 s and ≤ 30 % of 112's time.

**R2 [P1] Shame at mid routes concealment.**
- *Problem.* `shame.mid` contains 19 ERASE, 14 CRUMPLE and 18 BURN. `design_relief` §1 says to avoid exactly these for shame ("teaches 'hide it'"), because shame's action tendency is to hide.
- *Fix:* `shame.mid = [115, 104, 84, 110, 109, 79]`.

**R3 [P1] GOOD is routed to sadness copy.**
- *Problem.* 114's prompt is "What feels heavy or lonely right now?" and its mindBend is "Missing someone means you loved something". A good mood gets mood-incongruent priming.
- *Fix:* `good: {high:[117,106,88], mid:[117,106,88], low:[117,106,88]}`. Or give 114 a savour mode: prompt "What are you thankful for?", the lanterns become thank-yous, and the finale reads "Tell someone thanks?".

**R4 [P1] Fear at peak gets exposure with a looming monster.**
- *Problem.*
  - 118 is #2 in `fear.high`.
  - The shadow starts at 3× and regrows when the light points away.
  - Exposure works best when it is graded and chosen, not when it punishes looking away at the peak.
- *Fix.*
  - `fear.high = [111, 102, 113]`; `fear.mid = [118, 31, 97, 53, 86, 89]`.
  - 118 starts at 2×.
  - Replace "regrows 5 %" with "the light drifts a little closer by itself". There is no consequence for looking away.

**R5 [P2] Overthinking at high skips "body first"; the classic defusion game sits at #7.**
- `overthinking.high = [111, 61, 116, 34]`.
- `mid = [116, 34, 61, 104, 43, 41, 22, 29, 99]`.
- 34 RIVER is the "leaves on a stream" exercise.

**R6 [P1] Numb gets the wrong target state and the same face before and after.**
- *Problem.*
  - **Same face.** Core L160 `numb: {loud: 34, calm: 34}`. SYNC's face 34 is in the **positive** pool (`RELEASE_PHASE_EMOTIONS.positive.sync`, L2989), so the before → after flip only removes greyscale.
  - **Wrong target.** "Calm" is not the goal for numbness; up-regulation is.
  - **Wrong ambience.** Thought Flow and the companion give numb the same slow 6 breaths/min field and calming dust that `design_relief` §1 says to avoid ("slow, dim, silent").
- *Fix.*
  - **Core:** `numb.calm = 61` (the dancing face 117 already uses).
  - **§5.2:** when `EOS_EMO[emo].moment === "spark"` (numb, good):
    - lanes 8-12 s
    - a warm hue cycle
    - the core pulses at 72 bpm instead of breathing
    - 117 can drive it with `eosApi("dots").beat(bpm)`
  - **§6.5:** the companion's target face for numb is `numb.calm` ("awake"), not a calm face.

**R7 [P2] Jealousy has no evidence-matched mechanic.**
- *Problem.* The evidence points to self-affirmation (Cohen & Sherman 2014) and gratitude. The spec's jealousy routes are mostly avoidance (47 UNFOLLOW, 25 SWIPE AWAY).
- *Interim fix:* 115's jealous bank uses own-wins prompts: *"Name one thing you did this week that took guts."* · *"What's one thing you have that you'd miss?"*
- The real game is asks G1 (119 YOUR SPOTLIGHT).

**R8 [P2] Late night.**
- After 23:00 local time, prefer low-light, slow games: no 117 unless the feeling is numb.
- Use the warm palette.

**R9 [P1] Panic at mid routes a bomb.**
- *Problem.* 71 DEFUSE (`panic.mid` #6) uses bomb, timer and wire imagery. The catalog notes that "bomb imagery can prime threat", and `design_relief` says to avoid bombs for fear.
- *Fix:* `panic.mid = [111, 102, 36, 77, 113, 65, 55, 11]`. This also takes asks D1's reorder. 71 stays in the menu.

**R10 [P1] The companion teaches catharsis.**
- *Problem.* §6.5 turns the companion loud → calm as progress rises in *every* game, including STOMP and SHRED. The on-screen message is "smashing calms you". Pro-catharsis messages *increase* later aggression (Bushman, Baumeister & Stack 1999).
- *Fix (§6.5, §11.9).*
  - For emotion anger in an `EOS_DISCHARGE_IDS` game, the companion goes loud → "spent" (a lower-energy negative face from `eosFacePool(char,"negative")`).
  - It reaches the calm face only during the cool-down (Still Moment or 112 act B).
  - Its bubble on finish reads "nice hit — now let it cool".

---------------------------------------------------------------------------------------------------
## Q. Measurement integrity (core `EosIntensityDial`, §6.6, §9)

The before → after shift is the product's proof, and it feeds the router (`personalDelta`) and the share card. If it is biased, the router learns the wrong thing and users see false progress.

**Q1 [P0] The dial's digit keys turn a 10 into a 0.**
- *Problem.* Core L719: `next = e.key === "0" ? (min === 0 ? 0 : 10) : Number(e.key)`. On the after-dial (`min 0`), typing "1" then "0" for 10 ends at **0 ("gone")**. The result:
  - Δ = before
  - a gold CORE MEMORY
  - a share card "8 → 0"
  - the router learns the game "works"
  
  Keyboard, switch and screen-reader users hit this most.
- *Fix (core).* Add a 700 ms digit buffer:
  ```js
  const digitRef = React.useRef({ k: "", t: 0 })
  // in onKeyDown, digits branch:
  const now = Date.now(), prev = digitRef.current
  if (e.key === "0" && prev.k === "1" && now - prev.t < 700) next = 10
  else if (e.key === "0") next = min === 0 ? 0 : 10
  else next = Number(e.key)
  digitRef.current = { k: e.key, t: now }
  ```

**Q2 [P1] The dial ignores a repeated pick after the parent resets it.**
- *Problem.*
  - `lastRef` is set once (L657), and `set()` returns early when `next === lastRef.current`.
  - If the parent resets `value` to `null` (a new loop in the same mounted meter) and the user picks the same number as last time, `onChange` never fires: the dial shows "–" and the CTA stays disabled.
- *Fix (core):* `React.useEffect(() => { lastRef.current = value }, [value])`.

**Q3 [P1] The after-rating is anchored and nudged.**
- *Problem.* The spec doesn't say where the after-dial starts. Several things push the after-number down:
  - "Naming it already turns it down a notch" (§6.2)
  - the companion's "ooh, lighter" during play
  - gold tiers given for Δ ≥ 3 (Q5)
- *Fix.*
  - **Start empty.** The after-dial starts empty (`value=null`, "–"), with only the ghost marker at *before*. No pre-fill, and the CTA is disabled until a value is set.
  - **Skip.** A "skip" text link is allowed. ⚡ is paid for finishing the loop, not for rating (§9.2: "when an after-rating is given" → "when the reveal is reached").
  - **Copy.** Change the micro-copy to *"Naming it is the first move."*

**Q4 [P1] A "before" given after the game is recall-biased.**
- *Problem.* With no check-in, §6.6.2 asks "Before you started" *after* the game. People rate how bad it was higher once relief has set in, so Δ is inflated.
- *Fix.*
  - **Flag the row.** The session row gets `retro: 1`. It is a number, so the "never text" rule still holds; `eosPushSession` needs this field added to its whitelist.
  - **Exclude it.** Retro rows are excluded from `personalDelta` and from any Δ-based copy tier.
  - **Prefill.** Use `intensityGuess` as the prefilled before chip (asks E4).

**Q5 [P1] Rewards depend on Δ, despite §9.4.**
- *Problem.* Rule §9.4.5 says variable rewards never depend on the size of Δ, but three things do:
  - the gold "CORE MEMORY" tier (Δ ≥ 3)
  - "personal best: fastest with Δ ≥ 2"
  - the share headline, which is the Δ
  
  This rewards inflating ratings, which corrupts the router. "Fastest cool-down" also puts speed pressure on a feeling.
- *Fix.*
  - **Orb rarity comes from the loop, never from Δ:** gold for the first orb of the day, a new game, a new emotion or a bond level-up; silver otherwise.
  - **Δ changes only words and the stamp animation:** "big shift" / "a little lighter" / "still here with you".
  - **Remove** the "fastest" personal best. Replace it with "the move that helps you most", from history counts.
  - **Cap** the `personalDelta` weight at ±0.15. Today `0.05 × mean Δ` can reach +0.5, five rank steps.

**Q6 [P1] "How loud is…" is the wrong question for low-arousal states.**
- *Problem.* "How loud is NUMB / SAD / LONELY?" with words up to "ROARING" (core L654): someone at their most shut down may answer "not loud", which makes Δ meaningless.
- *Fix (core).* Add `dialQ` and `dialWords` (5 anchors mapped onto 0-10) per emotion, and pass them to `EosIntensityDial` as `label` / `words`:
  - **numb:** "How far away do you feel?" `["right here","a bit flat","flat","far away","totally blank"]`
  - **sad:** "How heavy is it?" `["light","a little heavy","heavy","really heavy","crushing"]`
  - **lonely:** "How alone does it feel?" `["connected","a bit alone","alone","very alone","completely alone"]`
  - **good:** "How good is it?" `["meh","nice","good","really good","glowing"]`
  - **all others:** keep the loudness words.

---------------------------------------------------------------------------------------------------
## E. Ethics of the habit loop (§9)

**E1 [P1] "☀ 4/7 this week" plus a 7/7 milestone is a weekly streak under another name.**
- *Problem.* A denominator of 7 and a reward for every day of the week create daily-use pressure, and a missed day reads as failure. §9.4.3 forbids streaks that can break.
- *Fix:* show "☀ 4 days this week" (no denominator). Grant milestones on lifetime days 3 / 10 / 30 / 100. Drop the 7/7 milestone.

**E2 [P1] Mastery and bonds grow only with suffering.**
- *Problem.* "Panic Master" takes 40 panic loops, and bonds count only rated loops of that emotion. The collection rewards coming back distressed, while `design_relief` G.2 says skills should be practised when calm.
- *Fix (§9.2).*
  - **Skills, not emotions.** Mastery counts **skills** by mechanism, whatever the check-in emotion: "Sigh skill" (111, 109, 65, the sigh moment), "Cool-down skill", "Grounding skill", "Kind-voice skill", "Loop-breaker skill", "Spark skill". GOOD and NOT SURE plays count too.
  - **Bonds.** Bonds grow on any loop where that character appears (companion or scene).
  - **Copy:** *"Practise when calm — it works better when you need it."*

**E3 [P1] The share button appears at a vulnerable moment.**
- *Problem.* SHARE MY SHIFT is a top-level button right after shame, lonely, sad or fear loops, which nudges people to broadcast a sensitive state.
- *Fix.* For those four emotions:
  - Share becomes a secondary text link, "make a card".
  - The card defaults to the character plus "a shift", without the emotion label; a toggle offers "show the feeling name".

**E4 [P2] The heart and spark Still Moments can stall.**
- *Problem.* §6.6.1 waits for a press or taps, and "skip ›" appears only after 1.5 s.
- *Fix:* both auto-complete at 6.5 s with no interaction, and skip is available from 0 s (aligns with asks E3).

---------------------------------------------------------------------------------------------------
## C. Copy, claims and disclaimers

**C1 [P1] Starters and seeds put appraisals and self-judgements in the user's mouth.**
This extends asks D5 from panic to every emotion.
- *Problem.*
  - Seeds and starters become **big on-screen game words the user never typed**.
  - Several are anger-fuelling appraisals: "so unfair", "nobody listens". Ruminating on the provocation fuels anger.
  - Some are brooding prompts: "why did I", "should have".
  - Some are self-criticisms or beliefs: "my fault", "I failed", "not enough", "nobody gets it", "less than", "why not me".
  - Some are threat or catastrophe words: "danger", "worst case", "can't breathe".
  - Naming sensations and feelings is what helps (affect labelling, Lieberman 2007). Adding new negative beliefs does not.
- *Fix (core `EOS_EMOTIONS`).*

  | emotion | `starter` | `seeds` |
  |---|---|---|
  | panic | "racing heart tight chest too fast right now" | "racing heart", "tight chest", "too fast", "shaky", "what if", "right now" |
  | anger | "so angry hot face clenched jaw had enough" | "hot face", "clenched jaw", "tight fists", "had enough", "boiling over", "fast breath" |
  | anxiety | "nervous what if tight shoulders busy stomach" | "what if", "on edge", "tight shoulders", "can't settle", "busy stomach", "too many maybes" |
  | overthinking | (keep) | "on replay", "going round", "that thought", "busy mind", "can't switch off", "again and again" |
  | lonely | "lonely quiet room want some company" | "all alone", "left out", "want company", "quiet room", "far from friends", "miss people" |
  | shame | "ashamed that moment keeps replaying" | "that moment", "the cringe", "harsh voice", "hot cheeks", "want to hide", "replaying it" |
  | fear | (keep) | "so scared", "dread", "shaky", "that shape", "unknown", "racing mind" |
  | jealous | "jealous that pang when I compare" | "that pang", "comparing", "their highlight reel", "want that too", "scrolling", "green feeling" |
  
  - **Rule (add to §2):** starters and seeds are sensations, situations or feeling names. Never beliefs, blame, predictions or self-judgements.

**C2 [P1] There is no list of invalidating phrases.**
- *Problem.* §2 bans clinical words but not invalidating ones. 118's "oh. that's it?" minimises the fear.
- *Fix.* Add banned copy: *calm down, relax, cheer up, don't worry, just (as in "just breathe"), should, get over it, not a big deal, that's it?, look on the bright side, at least*.
  - For sad and grief, the "positive flip" means *lighter / warmer*, never *happy*.

**C3 [P1] Claims and the disclaimer.**
- *Problem.*
  - The §2 banned-word list includes *therapy* and *diagnosis*, which would strip the required disclaimer ("not therapy, diagnosis or a crisis service"; §9.3 Orb Shelf footer) if a builder or lint enforces the list literally.
  - The disclaimer lives only inside the Orb Shelf.
- *Fix.*
  - **Exemption.** Exempt `EosSafetyCard` and the disclaimer string from the banned-word list, explicitly.
  - **Visible disclaimer.** Also show the disclaimer as a 12 px "about ThinkStill" link in the check-in footer, next to the S2 support link.
  - **Banned user-facing claims:** *treat(s), cure, clinically proven, reduces anxiety disorder, therapy-grade, doctor-approved*.
  - **Internal-only text.** The §8 "Science" lines never appear in the UI, captions or share text. Medical claims would change the product's regulatory class.

---------------------------------------------------------------------------------------------------
## P. Privacy of the user's words and state

**P1 [P0] `window.__eos` publishes the live emotional state to every script on the owner's page.**
- *Problem.*
  - `eosExpose` always assigns `window.__eos = EOS_DEV` (core L114), and `EOS_DEV.core.EOS_STORE` is included. Any analytics, chat or session-replay script on the Framer site can read the current emotion, before / after and `safety:"selfharm"`.
  - That contradicts §10.1 ("in memory only; never stored or sent").
- *Fix (core).*
  - `eosApi` keeps reading `EOS_DEV` internally.
  - Assign `window.__eos` only when `eosIsDev()`:
    ```js
    function eosIsDev() {
        try {
            return location.protocol === "file:" || /^(localhost|127\.0\.0\.1)$/.test(location.hostname) || /[?&]eosdev=1\b/.test(location.search)
        } catch { return false }
    }
    ```
  - The Playwright harness uses `file://` (verified in `dev/drive.mjs` L17), so tests keep working.
  - Apply the same gate to `window.__eosPreview` and `window.__eosArrowMiss`.

**P2 [P1] 116's text-to-speech can send the user's words to a cloud service.**
- *Problem.* Chrome's "Google …" voices are network voices (`voice.localService === false`).
- *Fix (§8.6):*
  - Speak only with `speechSynthesis.getVoices().find(v => v.localService && v.lang.startsWith(lang))`. If there is none, use squeak tones only.
  - Speech is off by default (asks E13).

**P3 [P1] The check-in mic: say where the voice goes.**
- *Problem.* The arcade's mic is the Web Speech API (L21595); in Chrome, audio is processed by the browser vendor's servers. The check-in adds a new 🎙 entry point.
- *Fix:* the first use shows one line under the chip, *"Voice typing uses your browser's speech service."*. Store a once-flag in `eos_prefs_v1`.

**P4 [P1] Session-replay tools can record typed feelings.**
- *Fix.*
  - **EOS-owned DOM.** Put `data-private="true" data-hj-suppress="" data-clarity-mask="true"` and class `fs-mask` on these roots: `.eosCheckIn`, `.eosShiftMeter`, `.eosSafetyCard`, `.eosOrbShelf`, `.eosCompanion` and `.eosArena`.
  - **The composer.** `EosConfigSync` sets the same attributes on `input.releaseThoughtInput` once on mount. This is an attribute-only DOM write: the arcade's MutationObservers don't watch it (map_engine_hud §1.2), and behaviour is unchanged.

**P5 [P2] History on shared devices.**
- *Problem.* The Orb Shelf shows "PANIC 8 → 3 · Tue 9:41" to anyone holding the phone.
- *Fix.*
  - **History toggle.** `eos_prefs_v1.keepHistory` (default true), with a toggle in the shelf: "Don't keep history on this device". When off, no session or orb rows are written; this session's rewards are shown in memory only.
  - **Timestamps.** The shelf shows the day, not the minute, by default.
  - **Owner note.** The owner's release notes state that history is local and that clearing site data or "reset my history" removes it.

---------------------------------------------------------------------------------------------------
## A. Accessibility

**A1 [P1] Dial segment numbers fail contrast.**
- *Problem.*
  - `.eosDialSeg.on span{color:#fff}` sits on `hsl(190→h, 95%, 64%)`:
    - **1.61:1** at the cyan end
    - **1.40:1** for GOOD's gold
    
    WCAG 1.4.3 needs 4.5:1.
  - Dimmed check-in orbs (`.eosOrb.isDim{opacity:.28}`) stay clickable, but their labels become unreadable.
- *Fix (core).*
  - **Segment numbers:** `${EOS_A} .eosDialSeg.on span{color:var(--eos-ink)}`. #0E0C2E on that fill = **11.8:1**.
  - **Dimmed orbs:** dim only the ball, so the label stays readable:
    ```css
    ${EOS_A} .eosOrb.isDim{opacity:1;filter:none}
    ${EOS_A} .eosOrb.isDim .eosOrbBall{opacity:.35;filter:saturate(.4)}
    ${EOS_A} .eosOrb.isDim :is(.eosOrbLabel,.eosOrbSub){opacity:.8}
    ```

**A2 [P1] Touch targets for EOS controls are not specified.**
- *Problem.* "skip ›", "more feelings ▾", "← back", "pick a game myself", "↻ same game", shelf orbs and "reset my history" have no size.
- *Fix (core CSS).*
  ```css
  ${EOS_A} :is(.eosCheckIn,.eosShiftMeter,.eosStillMoment,.eosSafetyCard,.eosOrbShelf,.eosWorldChips,.eosCheckInChip) :is(button,a,[role=button]){min-height:44px;min-width:44px}
  ```
  - Leave ≥ 8 px between adjacent targets.
  - New games' primary targets are ≥ 64 px (§8.0).

**A3 [P1] Screen-reader users get no guidance in games.**
- *Problem.* The arrow is visual only, and the new games' phase cues ("breathe in", "sigh it out", "keep looking…") are not announced.
- *Fix.*
  - **Core:** add `.eosSrOnly` (the standard visually-hidden class).
  - **`EosGuideArrows`:** renders `<div className="eosSrOnly" aria-live="polite">` with the current label (+ " · 3 left" for `taps`). It updates only when the label changes, at most every 1.5 s.
  - **§8.0, every engine:**
    - Cue text in an `aria-live="polite"` node.
    - An action-stating `aria-label` on each interactive object, for example: "Breath orb. Press and hold to breathe in."
  - WCAG 4.1.3.

**A4 [P1] New games need single-pointer and keyboard alternatives.**
- *Problem.* WCAG 2.5.7 and 2.5.1.
  - 112's cool-down requires dragging back and forth.
  - 118's flashlight requires a drag path; the tap version exists only with reduced motion.
- *Fix.*
  - **112:** press-and-hold on the cloud = gentle rain at the slow rate.
  - **118:** the "three tap-steps" mode is always available. Tapping the shadow steps the light closer.
  - **Keyboard:** arrow keys move the cloud or lamp; Space holds.
  - **112's speed threshold** is in CSS px normalised by `eosStageScale` (not raw screen px), so a scaled Framer canvas doesn't change the rule.

**A5 [P1] Reduced motion is unspecified for several new surfaces.**
- *Problem.* No reduced-motion behaviour is given for the `EosCompanion` squash, the `EosStillMoment` swell, the payoff (count-down, stamp, rim burst), the world chips or the orb shelf.
- *Fix.*
  - Reduced = opacity and colour cross-fades only.
  - A breath pacer is essential motion, so it keeps opacity plus scale ≤ 4 %, with a numeric "in 2… out 4…" countdown.

**A6 [P0] New games contain flashes and startle cues.**
- *Problem.*
  - 111, the panic hero, has a "lightning flicker". That is flashing (WCAG 2.3.1) and a startle cue for someone already over-aroused.
  - 117's scribble can fire large splashes many times a second.
  - 112's rapid taps stack bursts and shakes.
- *Fix (§8.0, new rule).*
  - **No full-field flashes:** no luminance change over 10 % of the arena more than 3 times a second.
  - **111:** no lightning; the storm glows softly at ≤ 1 Hz and low contrast.
  - **117:** big splashes are rate-limited to 3 per second and ≤ 10 % of the arena each; scribbling paints small dabs.
  - **112:** shake only on alternate taps when taps come < 300 ms apart.

**A7 [P2] Add an in-app "calm visuals" toggle.**
- *Problem.* `reduced` comes only from the OS setting (arcade `useReducedMotion`). Most panicking users have never set it, and the spiral dust (designed to be "hypnotic") increases the sense of self-motion (vection).
- *Fix.*
  - `eos_prefs_v1.calmVisuals`: a "◐ calm visuals" chip in the check-in footer and the shelf. When on, every EOS component gets `reduced`, and the dust drifts straight in, with no rotation.
  - For panic and fear in the high band, the dust drops the spiral by default.

**A8 [P2] Colour-only cues.**
- *Problem.* 11 PRESSURE POP's green window.
- *Fix:* `.pressureCapsule` gets a striped window (`repeating-linear-gradient`) plus the "LET GO!" text from the live hold ring (§3.6).
  - Check 64 RED LIGHT the same way: the lamp's position plus the "NOW!" label already carry it.

**A9 [P2] 113's missions assume sight and hearing.**
- *Problem.* "Find something BLUE" and "farthest sound" exclude blind, low-vision and deaf users.
- *Fix:* every beacon gets an "↻ another" swap. The pool includes touch, temperature and body options ("something cool to touch", "your back against the chair").

---------------------------------------------------------------------------------------------------
## Change index (who edits what)

| owner | items |
|---|---|
| **core** (`00_eos_core.jsx`, lead) | Q1 digit buffer · Q2 lastRef sync · Q6 `dialQ` / `dialWords` · R6 `numb.calm = 61` · B6 `EOS_HAPTIC.heart` / `exhale` + `eosHeartbeat` · B2 `EOS_BREATH` · S5 `safetyDismissed: {}` · S1 `EOS_NEUTRAL_WORDS` + `eosWords` safety check · S7 Canada line · C1 starters / seeds · P1 `eosIsDev()` gate · A1 dial ink + dim orbs · A2 44 px rule · A3 `.eosSrOnly` · Q4 `retro` field in `eosPushSession` |
| `safety` | S2 S3 S4 S6 S7 S8 (114 / 115 safety modes via store) S9 · P4 attributes |
| `router` | R1 R2 R3 R4 R5 R9 · S1 sync scan · S9 `EOS_REAL_THREAT` rule · Q5 `personalDelta` cap |
| `shift` | B2 timing · R1 cool variant + COOL IT DOWN · Q3 empty after-dial, skip · Q4 · Q5 copy tiers · S2 reveal button · E3 · E4 · A5 |
| `rewards` | Q5 rarity · E1 · E2 · E3 · P5 |
| `checkin` | S2 footer link · C3 disclaimer · P3 · Q3 copy · A1 dim · A7 chip · R10 companion |
| `dots` | B4 `breath()` / `phase()` · R6 spark mode · A7 |
| `arrows` | A3 live region · B5 ring |
| `fixes` | S1 `EosEntries` neutral words · B5 66 / 80 guard |
| game builders | B1 B3 (111) · R1 / A4 / A6 (112) · A9 (113) · S8 (114) · B8 / S8 (115) · B7 / P2 (116) · A6 (117) · R4 / S9 / A4 (118) · §8.0 rules: A3 A4 A6 B6 |
| spec text | B9 · C2 · C3 · S6 no-lookbehind rule + grep check |
