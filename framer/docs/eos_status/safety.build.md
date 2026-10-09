# safety — BUILD REPORT (finished)

## What I built
`/home/user/thinkstill-rituals/framer/src/eos/55_eos_safety.jsx` (≈720 lines, task `safety`, spec §10 + §2.6), committed as "EOS build: safety" (8da0d79) on `claude/jolly-hopper-ognrxj`. It contains the safety UI only. The lexicon, `EosSafetyScan`, `EosFlagSafety`, `eosSafetyStrong` and `EOS_NEUTRAL_WORDS` stay in core and are not redeclared.

- **Card `div.eosSafetyCard`**
  - Variants: `selfharm`, `abuse`, `threat`, `soft`, `numb` (the soft card after a numb loop; `open("numb-soft")` is an alias) and `info` (opened from the persistent link or the pill). Each uses the exact §10.3 copy.
  - Under a strong store flag it adds *"We've kept your words off the game for now."*
  - Look: cream card with warm light. STILL E15 (holding a heart) sits on a cream/peach orb with no dark rim, inside a halo that breathes over 6 s, with a small 💛. Text is Baloo 2: title 20 px, body 16 px, nothing under 13 px.
  - Motion: a 300 ms slide. Reduced motion or calm visuals switch it to a fade with a static halo.
  - Attributes: `role=alertdialog aria-modal=false aria-labelledby=eosSafetyTitle aria-describedby=eosSafetyBody`, plus `EOS_PRIVATE_ATTRS` and `fs-mask`.
  - Position: z 230 at the top of `.releaseStage`, `width:min(520px, 100% − 16px)`, scrolls inside itself if the stage is too short.
- **Buttons, all at least 48 px tall**
  - Primary one-tap line, e.g. "📞 Call or text 988 · Canada". It has a secondary `sms:988` "Text" button when the line is 988 or says "call or text".
  - **Text someone I trust**: uses `navigator.share`, falls back to `sms:?&body=…`.
  - **I'm safe — keep playing**: on the info card this reads "Back to ThinkStill".
  - "more lines ▾" opens the remaining lines. The footer shows `emergencyText`.
- **Lines, local line first**
  - `eosSafetyOrderLines(EOS_STORE.crisisLines)` parses the property-control string; an empty string falls back to `EOS_PROP_DEFAULTS`.
  - The region comes only from `Intl` time zones, with no network call. CA covers the spec list plus every Canadian zone id and `Canada/*`. Any other `America/` zone or `US/*` maps to US. `Europe/London|Dublin` (+ Belfast, Isle_of_Man, Jersey, Guernsey) maps to UK & IE, `Australia/` to Australia, `Asia/Kolkata|Calcutta` to India; anything else keeps the list order.
  - `text WORD to N` becomes `sms:N?&body=WORD`. A phone-like run of 3 or more digits in the **value** becomes `tel:` (so 988 works); digits in labels such as "24/7" are never dialled. A domain becomes an https link, pointing to `crisisUrl` when it is the same domain.
- **Layer `EosSafetyLayer({raw, stage, reduced})`**
  - Scans `raw` 400 ms after typing stops, and also immediately on every stage change. It never writes the store during render.
  - It remembers which trigger **types** were seen this app session, in memory only and never text. So dismissal works per type even though the store flag never downgrades: dismiss selfharm, type an abuse phrase, and the abuse card shows.
  - Text containing several types is detected per type (`scanAll`).
- **Focus**
  - Focus never moves while the user is typing (input, textarea or contenteditable) or while the stage is `play`. Instead an `aria-live=assertive` node says "Support options are open at the top of the screen."
  - Focus moves to the primary button on the first Tab or F6, or on the next stage change that is not `play`, 300 ms after it, so it lands after the shift meter's 80 ms orb autofocus.
  - Escape dismisses only when focus is inside the card.
  - When a card is opened by a tap, focus goes to the primary button and returns on dismiss. If that element is gone (the pill), focus goes back to the pill.
- **Pill `div.eosSupportPill`**
  - "💛 support", 44 px, z 230, top-left of the stage. It appears after any triggered card is dismissed and opens the info card.
  - It sits below the check-in chip and, in play, below the HUD and the `.literalProgress` counter (top 46/48 px), so it never covers them.
  - It hides while the check-in footer link or the Orb Shelf is on screen; both open the same card.
- **`soft(shift)`**
  - Applies only to feelings with `better:"down"`. It fires when after ≥ 9 with delta ≤ 1, or when after ≥ 7 and after ≥ before on two consecutive **rated** loops of the same feeling. Skipped loops don't break the run; a rated loop of another feeling does.
  - It is idempotent for each shift row, never fires for GOOD, never at low numbers, and uses the numb copy for numb. Precedence never downgrades because core's `EosFlagSafety` handles that.
- Nothing is written to storage.

## Exports
- `EosSafetyLayer`, `EosSafetyCard({variant, reduced, onDismiss, primaryRef, cardRef, tz})` (works on its own; reads the lines from the store), `EosSupportPill({onOpen, reduced})`, `eosSafetyOrderLines(lines, {tz, url})`, `EOS_SAFETY_CSS` (registered as `eosCss("safety", …)`).
- `eosExpose("safety", {...})`:
  - `scan`: core's `EosSafetyScan`
  - `scanAll`
  - `soft`
  - `open(variant="info")`
  - `close`
  - `dismiss`
  - `holdsFocus`
  - `orderLines`
  - `parseLines`
  - `region(tz?)`
  - `lineAction`
  - `state()` (types only)
  - `_testReset` (works only when `eosIsDev()`; the app never calls it)
- Internal names are all namespaced: `EOS_SAFETY_*`, `eosSafety*`, `useEosSafetyUi`. Keyframes are `eosSafetySlide`, `eosSafetyFade` and `eosSafetyHalo`. There is no lookbehind.

## Integrator wiring (exact)
1. **I2-E2 (already in `dev/eos_integrate.py`):** keep `<EosSafetyLayer raw={raw} stage={stage} reduced={!!reduced} />` inside `.releaseStage`, mounted in **every** stage. Nothing else is needed. Core's `EosMarkLaunch` already flags launches synchronously, and `EosConfigSync` (I1) already feeds `crisisLines`, `crisisUrl` and `emergencyText` into the store.
2. **Recommended one-line change for the `shift` owner** (`50_eos_shift.jsx`, not my file): both automatic focus moves skip only when a text field has focus — the orb at 80 ms (~line 593) and the dial when the rate step opens (~line 1067). They should also skip while the safety card holds focus:
   `if (orbRef.current && !eosShiftTextFocused() && !eosApi("safety").holdsFocus?.())` and the same guard before `tr.focus(...)`.
   Without it, the rate dial takes focus away from an open safety card about 6 s into the reveal. Nothing breaks; the card stays visible.
3. The check-in, shift and rewards modules already call `eosApi("safety").open("info")` and `eosApi("safety").soft?.(shift)`. Both are verified working in the scratch builds.

## Verification
All runs were scratch integrated builds: `dev/eos_integrate.py --modules 55_eos_safety.jsx`, plus one with check-in + shift, plus one with all 13 eos modules. Zero page errors and zero "Cannot update…" warnings at both sizes. Test scripts are in `/tmp/eos_safety_t/` (`acc.mjs`, `full.mjs`, `all.mjs`, `pill2.mjs`, `foc.mjs`, `rev.mjs`, `unit2.mjs`).

| # | check | 390×844 | 1280×860 |
|---|---|---|---|
| 1 | All 43 §10.1 must-match phrases show the right variant with role/aria within 1 s (worst 464 ms); none of the 23 must-not-match phrases shows a card; the card shows in stage-play while the game keeps running; `button.releaseChoiceButton` stays clickable; the menu opens over the card | pass | pass |
| 2 | Typing "i want to die and then some" keeps every character and keeps focus in the input; the assertive live region announces; Tab moves focus to the primary button | pass | pass |
| 3 | Dismiss selfharm, then type "my dad hits me": abuse card; pill visible at z 230 and is the `elementFromPoint` hit | pass | pass |
| 4 | `open('info')` shows the info card from input, check-in (link), play, reveal and the pill | pass | pass |
| 5 | Soft card in stage-reveal is the `elementFromPoint` hit at its centre | pass | pass |
| 6 | Unit tests on soft() (13 cases) | pass (node) | |
| 7 | `America/Toronto` → Canada first, `tel:988`, secondary `sms:988`; London → `tel:116123`; Sydney → `tel:131114`; "text HOME to 741741" → `sms:741741?&body=HOME`; "24/7 Line · Help 0800 1111" → `tel:08001111` | pass | pass |
| 8 | localStorage identical before and after all card actions (later diffs come from the arcade and core finish); private attributes and `fs-mask` on the card | pass | pass |

Also checked:
- Game 2 played to the reveal with a card open at both sizes.
- A card that appears during play gets focus at the reveal.
- Escape returns focus to the check-in link.
- `smallText(13)` inside the card finds nothing.
- Reduced motion and calm visuals give a fade and a static halo.

## Screenshots (`/home/user/thinkstill-rituals/framer/dev/shots/eos/`)
- `safety_selfharm_input_{390,1280}.png`
- `safety_selfharm_checkin_all_{390,1280}.png`
- `safety_selfharm_play_{390,1280}.png`
- `safety_abuse_input_{390,1280}.png`
- `safety_abuse_menu_all_{390,1280}.png`
- `safety_abuse_reveal_1280.png`
- `safety_threat_calm_{390,1280}.png`
- `safety_soft_reveal_{390,1280}.png`
- `safety_numb_reveal_{390,1280}.png`
- `safety_info_checkin_{390,1280}.png`
- `safety_info_custom_{390,1280}.png`
- `safety_pill_info_all_390.png`
- `safety_pill_input_{390,1280}.png`
- `safety_pill_play_{390,1280}.png`

## Known limitations
- **Phone coverage:** on a phone the triggered card covers about the top 55 % of the stage (375–430 px). Game targets under it cannot be tapped until "I'm safe — keep playing" (one tap); for example, game 7 at 390 stalled with the card open. The game keeps running underneath, and at 1280 game 2 played to the end with the card open.
- **Not verified here:** the router "Enter within 100 ms → `EOS_GENTLE_IDS`" race and the neutral words on the arena (§10.4) belong to the router and `EosEntries`. My isolated build stubs them, and in the all-modules build Enter in check-in mode opened the menu, so neither was checked in this task.
- **No focus move into `play`:** focus is deliberately not moved into the card on a stage change *into* play. A keyboard game's Space or Enter would otherwise activate the call link. It waits for Tab/F6 or the next non-play stage.
- **Spec deviation — pill hides:** the pill is hidden while the check-in or the Orb Shelf is open, because it covered the check-in title and both screens show the same "Need to talk to someone?" link.
- **Region matching:** following the spec, any other `America/` zone maps to US, so São Paulo puts US 988 first. Zones with no matching line, such as NZ, keep the list order. The owner must verify the lines for their region and add youth lines if under-18s are in the audience.
- **Headless screenshots:** the card fades in from opacity 0 over 300 ms, so a headless screenshot taken in the first ~300 ms can show no card. Wait about 1 s before capturing.
- **Not testable here:** that `window.__eos` is undefined on an https page is core's dev gate and cannot be tested from `file://`.
- **Duplicate ids:** the card's element ids are fixed, so rendering `EosSafetyCard` twice at once would duplicate them. Only the layer renders it.

## Review r1 close-out (all 12 findings; only `src/eos/55_eos_safety.jsx` changed)
Verified in an isolated integrated build with all 15 eos modules (`dev/eos_integrate.py --dev-dir /tmp/v2_safety --modules <all>`), at 390×844 and then 1280×860. Zero page errors and zero eos or "Cannot update" warnings in every run. Scripts: `/tmp/v2_safety_t/t1.mjs` (lines), `t2.mjs` (layout, play, reveal, focus), `t3.mjs` (copy, guard, share, dismiss).

| # | finding | fix | verified |
|---|---|---|---|
| 1 | major · 988 led the card outside North America | `EOS_SAFETY_US_TZ` now maps only US zones (plus `US/*`, Honolulu, Puerto Rico and USVI) to US. When there is no region, or no line label matches it, the first web line ("Anywhere · findahelpline.com") goes first with `local:false`. If the list has no web line, a line built from `crisisUrl` is added first. | Paris, Tokyo, Lagos, Auckland, São Paulo, Mexico City and Bogotá all lead with `https://findahelpline.com`. New York, Indianapolis, `US/East-Indiana`, Puerto Rico, Honolulu and Toronto lead with `tel:988`. London leads with 116123, Sydney with 131114, Kolkata with 14416. A custom list with no web line gets the synthetic finder first. |
| 2, 8 | major/minor · on a phone the card hid the game, the check-in and the reveal | Compact card: title, one-tap line plus Text, and "I'm safe ✓" + "more ▾". The body, "Text someone I trust", more lines and the emergency text open from "more ▾". It is used on a phone (stage ≤ 560 px) in play and reveal, and with the check-in open at any width. The layer docks the card (`data-eos-dock` top, bottom, right or left) where it covers the least of: the arrow's target (weight 4), the check-in orbs and press button, and the shift dial and buttons. A dock only changes when another is clearly better. | At 390: 176 px tall, 27 % of the arena (was 56–63 %). The arrow target is never covered (games 2 and 7). Games 2, 7 and 111 play to the reveal with the card open (game 7 used to stall). Check-in docks at the bottom with PANIC/ANGRY/ANXIOUS free (3/12 orb centres covered, was 9). Reveal leaves the dial uncovered. At 1280: check-in docks left beside the ring with 0/12 orbs covered (PANIC and ANGRY were covered). The reveal card moves right when the dial appears (0/1 covered). |
| 3 | minor · automatic hand-over focused the `tel:` link | An automatic hand-over now focuses the card itself (`tabIndex=-1`, reads the alertdialog). Only a tap, Tab or F6 focuses the primary line. An automatic hand-over also waits (pending, announced) when the user tapped or typed within 1.2 s, or when the stage turned to play. This fixes a card raised at launch that took focus while the menu was open and lost the reveal hand-over. | Reveal `activeElement` is the card container (not the link) at both sizes and in reduced motion. During play focus stays in the input or body. |
| 4 | minor · a blocked share sheet did nothing | `navigator.share` rejection other than `AbortError` falls back: `sms:` on a touch-first device, the clipboard on desktop. | `share` stubbed to reject with `NotAllowedError` at 1280 gives "Copied — paste it to someone you trust."; with `AbortError` nothing happens. |
| 5 | minor · parsing dropped words from service names | Only a leading or trailing verb phrase (call / call or text / text / or) is stripped. | "NZ · Need to talk? 1737" gives "Call Need to talk? 1737". "Lifeline: call 13 11 14" gives "Call Lifeline 13 11 14". `text HOME to 741741` and 988 are unchanged. |
| 6 | minor · shift autofocus pulled focus off the card | Fixed on the safety side, with no edit to the shift file. While a card is up, a focus move from the card into `[class*="eosShift"]` with no pointer or key input in the last 250 ms is sent back. The user's own taps and Tab still win. The shift owner's one-line `holdsFocus()` guard is still welcome but no longer required. | Programmatic `.focus()` on a shift control returns to the card at both sizes. A user Tab or click moves out. After 8 s in the reveal, focus is still in the card. |
| 7, 9 | minor · the soft card said "keep coming back" on a first mention | `softKind` records where the soft card came from: `text` for words (composer, launch, router flag) or `soft`/`numb` for the shift loop. Words show "That sounds like a lot to carry." with the same body. The loop keeps "Big feelings keep coming back?" and takes over if it fires later. `data-eos-variant` stays `soft`. | Launching 113 with "i can't do this anymore" shows the warm title. `soft()` with anger 8→9 then switches to the loop title, at both sizes. |
| 10 | minor · STILL was a static sticker | STILL now breathes (scale 1→1.04 over 6 s, in phase with the halo). It nods (squash, 300 ms) on Call, Text, Text someone I trust, other lines and "I'm safe"; "I'm safe" dismisses 190 ms later so the nod shows. Calm visuals and reduced motion keep it static, and "I'm safe" then dismisses at once. | `animationName` is `eosSafetyBreath`, or `none` when calm or reduced. The card is still present 100 ms after "I'm safe" and gone by 600 ms, and immediately in reduced motion. The pill then shows. |
| 11 | minor · Text someone I trust did nothing on desktop | With no share sheet on a non-touch device, the tap copies the message (`navigator.clipboard`, then `execCommand`). The card shows "Copied — paste it to someone you trust." in a 14 px polite live region for 3.5 s. If both copies fail it shows the message to send instead. Phones keep `sms:`. | At 1280: the clipboard holds the message, the note shows, and it clears after 3.5 s. |
| 12 | minor · "more lines" repeated 988 | Rows whose action href matches the primary are dropped. Rows that repeat an earlier row merge their labels. | Toronto shows UK & IE, Australia, India, Anywhere. London shows "US & Canada · 988", Australia, India, Anywhere. Paris shows "US & Canada", UK & IE, Australia, India. |

**Spec deviations that need lead sign-off (§10.3 text):**
- Finding 1: the US mapping is limited to US zones, and the finder goes first when the region is unknown.
- Findings 7 and 9: a second soft title is used for word triggers.

**Unchanged:**
- The info card, opened by a tap, is always the full card.
- Desktop play and reveal keep the full card (it docks right when the dial needs the space).
- Every existing button, link, animation, live region, pill and focus rule is kept.
