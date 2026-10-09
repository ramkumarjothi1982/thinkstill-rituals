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
