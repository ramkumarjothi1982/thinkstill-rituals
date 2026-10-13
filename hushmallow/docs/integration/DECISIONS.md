# Owner decisions for the Hushfold pilot

Recorded during the integration. "Owner" means a decision the owner made; "default" means a decision taken on the owner's behalf that the owner can still reverse.

## 2026-10-12: Another Angle goes live (owner)

The owner approved the consent wording and asked for Another Angle to go live with the real model.

**Approved consent and privacy wording** (checked on 2026-10-12 against Anthropic's Commercial Terms, effective 17 June 2025, and the live API data-retention docs; the privacy-centre figures could only be read through search excerpts):

1. Consent card, `PROVIDER_RETENTION` (after "The provider receives your words to prepare the perspective."):
   > Anthropic doesn't use your words to train its AI. It usually deletes them within 30 days.
2. Consent card / privacy sheet:
   > If its automatic safety checks flag a message as breaking its rules, Anthropic can keep it for up to 2 years. It also keeps anything the law requires it to.
3. Consent card / privacy sheet:
   > Anthropic uses your words only to prepare your perspective, to keep its service safe, and where the law requires. It isn't sent your account or photos, but it sees anything you type, names included.
4. Delete-data sheet:
   > Anthropic's copy is usually deleted within 30 days (kept longer only if flagged or the law requires it). We can't delete it sooner from here.

The app shows these lines with typographic apostrophes (’) in place of the straight ones above; the words are the same.

Line 1 stays true only while the Anthropic organisation is not enrolled in the Development Partner Program and has no retention override; the owner should confirm this once in the Anthropic Console. "AI" and the provider's name appear only on the consent card, the privacy sheet and the delete sheet (brand language rule).

**Plans page sentence** (replaces "nothing leaves this phone" for Beyond):
> Another Angle asks first, then sends only the words you choose to our secure server. Never your photos.

**Go-live mechanics** (integration unit G1, after the Beyond client's review round and the server's lexicon sync):
- `src/app/config.js`: `ANGLE_ENDPOINT = 'https://hushmallow-another-angle.vibyfy-chat.workers.dev'`, `ANGLE_ALLOWED_HOSTS = ['hushmallow-another-angle.vibyfy-chat.workers.dev']`.
- The production Worker deploys from `main` (`.github/workflows/another-angle.yml`) when the pilot is merged, in the same push that publishes the site; the end-to-end check then runs against production.
- Until the Worker is reachable (a few minutes after the merge), the app plays Zuzu's authored angles, which is safe.
- Testing access stays open (no `TESTER_INVITE_CODES`), bounded by 20 angles a day per device, 10 sessions a day per network, 500 sessions a day and `DAILY_SPEND_CAP_USD = 10`. A tester-code row is built in Settings so codes can be switched on later by adding the secret.

## Defaults taken on the owner's behalf (2026-10-12)

| Topic | Default |
|---|---|
| Hi-res art (A-1) | Switch the five verified Mallows (glitzi, zuzu, boppo, blubi, noomi); pipzi and loomi stay on the old art; `?hires=0` turns it off |
| MallowTouch (P9) | The squeezable Mallow is the default everywhere; the rig is the fallback |
| After the ocean (P1) | "Stay as long as you like" plus Finish until a third world exists |
| Auto-flow (P10) | Off by default; Stay is the default |
| Crisis typed in a world (P3) | The world ends quietly; no Resume for that visit |
| Care typed in a world (P4) | The world pauses with Resume available; no Memory Garden offers while support is showing |
| Earlier thought after care/crisis (P5) | Drifts off gently; low stimulation while the Support pill is up |
| Thought Mallows on stage (P8) | At most 3, and 2 below 360 px wide |
| New words during a world (P7) | One Thought Mallow per world; the old one drifts off |
| Harm to others (P13) | Support first as `concern`; idioms such as "I could kill him" stay ordinary |
| Another Angle entry (P14) | Side-panel link for Beyond; Flow sees it as an invitation to the plans page |
| Prefill words into Another Angle (P15) | Yes, local only, sent only after consent and Send |
| Garden card on a small phone (H23 r2b, 2026-10-13) | The Thought Mallow makes way from the moment the card is placed and may rise into the subtitle band while the installation keeps the lines quiet; the lines and the band's ▶ pill come back only once it has left the band; the card is never seen over the thought or its words |
| A world's first arrival (H23 r2b, 2026-10-13) | The host sets off once the person's words have faded out of its way (0.9 s at most); a world's thought shows no words while the hero covers every place round it |

## Still open for the owner

- Monthly spend limit in the Anthropic Console.
- Development Partner Program: confirm not enrolled.
- Art: is the browless cyan drawing Loomi; do Blubi, Noomi and Loomi read as distinct.
- Does the ocean keep the feel of Drift and Dock's "Slow the wave".
