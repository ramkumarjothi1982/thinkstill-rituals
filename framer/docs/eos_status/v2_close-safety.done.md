All 12 findings from safety review r1 are fixed, all in `src/eos/55_eos_safety.jsx`. I tested each fix in an isolated build with all 15 eos modules (`/tmp/v2_safety`), first at 390×844 and then at 1280×860, with zero page errors and zero eos warnings. Committed as d6df6b4 and pushed to `claude/jolly-hopper-ognrxj`.

1. **(major) 988 was the main button outside North America:** only US zones (plus Honolulu, Puerto Rico, USVI and `US/*`) now map to the US. When no line matches the region, the "Anywhere · findahelpline.com" line goes first, or a line built from `crisisUrl` if the list has none. Checked: Paris, Tokyo, Lagos, Auckland, São Paulo, Mexico City and Bogotá lead with findahelpline; New York, Indiana, Puerto Rico, Honolulu and Toronto lead with `tel:988`; London, Sydney and Kolkata lead with their own lines.
2. **(major/minor) Card hid the game, check-in and reveal on phone:** added a compact card (title, call + Text, "I'm safe ✓", "more ▾"). It is used on phones in play and reveal, and with the check-in open at any width. The card now docks top, bottom, left or right, wherever it covers least of the arrow's target, the check-in orbs and the shift dial.
   - At 390 it is 176 px, 27% of the arena (was 56–63%), and the arrow target is never covered.
   - Games 2, 7 (which used to get stuck) and 111 play through to the reveal with the card open.
   - Check-in: it docks at the bottom with PANIC visible (3 of 12 orbs covered, was 9). At 1280 it sits beside the ring with 0 of 12 covered.
   - Reveal: the shift dial stays uncovered.
3. **(minor) Automatic focus landed on the `tel:` link:** automatic hand-overs now focus the card itself; only a tap, Tab or F6 focuses the call button. Tests also showed a card raised at game launch could take focus while the menu was open, so automatic focus now waits when the user tapped or typed in the last 1.2 s. Checked: at the reveal, focus is on the card container at both sizes and with reduced motion.
4. **(minor) A blocked share sheet did nothing:** any error other than the user cancelling now falls back to `sms:` on phones and the clipboard on desktop. Checked at 1280 with sharing stubbed to fail ("Copied" note shows) and stubbed to cancel (nothing happens).
5. **(minor) Service names lost words:** only a leading or trailing "call / call or text / text / or" is removed. "Need to talk? 1737" now reads "Call Need to talk? 1737".
6. **(minor) Shift meter could pull focus off the card:** fixed from the safety side, without touching the shift file. If focus moves from the card into the shift meter with no tap or key in the last 250 ms, it goes back to the card. Checked: a scripted focus on a shift control returns to the card, a real user move still works, and focus is still on the card 8 s into the reveal. The shift owner's one-line guard is no longer required.
7. **(minor, two findings) "Keep coming back?" title on a first mention:** when the soft card comes from typed words it now says "That sounds like a lot to carry." (same body). The shift-loop title is kept and takes over if the loop fires later. Checked on game 113 at both sizes.
8. **(minor) STILL was static:** STILL now breathes in time with the halo and nods when Call, Text, Text someone I trust or "I'm safe" is tapped. "I'm safe" closes the card 190 ms later so the nod shows. Calm visuals and reduced motion stay static and close at once. Checked: card still there at 100 ms, gone by 600 ms, pill shows.
9. **(minor) "Text someone I trust" did nothing on desktop:** with no share sheet on a non-touch device it now copies the message and shows "Copied — paste it to someone you trust." for 3.5 s. If copying fails, it shows the message itself. Checked at 1280: the clipboard holds the message.
10. **(minor) Duplicate 988 rows in "more lines":** rows repeating the main line are dropped and repeats are merged ("US & Canada"). Checked with Toronto, London and Paris time zones.

Two of these change wording that the spec fixes (§10.3), so they need a one-line sign-off from the lead: the US-only mapping with the findahelpline line first (1), and the second soft title (7). Both are noted in the build report.

Everything else in the card is unchanged. The info card opened by a tap is always full size, and the full card stays on desktop during play and reveal.

Test scripts are in `/tmp/v2_safety_t/` (`t1.mjs`–`t4.mjs`). Before I committed, a shared "WIP checkpoint" commit (bbf9cc4) had already picked up part of my in-progress edit to `55_eos_safety.jsx`; d6df6b4 holds the rest.

Files are in `/home/user/thinkstill-rituals/framer`:
- `src/eos/55_eos_safety.jsx`
- `docs/eos_status/safety.build.md` (close-out table added)
- `docs/eos_status/v2_safety.progress.md`
