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

## 2026-10-14: Ask when unsure about a loss (owner)

Five independent reviews kept finding new ways of saying someone died that the word lists missed (for example "we had to let our dog go", "my mum isn't with us now", "cancer won in the end"). The owner chose **"Ask when unsure"** over shipping with known gaps or switching Another Angle's game off offline:

- When the words name a person, a pet or a pregnancy next to a softer loss word, and nothing clearer applies, the Mallow asks one gentle question first, on the main screen and in Another Angle: "Is this about losing someone?" Yes leads to the gentle path; "Something else" carries on as normal; no answer stays quietly at home. A false alarm costs one tap.
- A grief-family feeling the person picks (Grief, Mourning, Heartache, …) always means the gentle path.
- Crisis, care and the wish to follow someone who died still route to support first, as before.

**Superseded the same day by "Ask before every world" (owner).** A further independent review wrote 80 new death phrasings and about half still reached a playful world without the question (for example "my dad's time came last week", "said bye to Pepper at the vets"). The owner chose to ask everyone instead:

- After every Tell, before any Thought Mallow or world starts, the Mallow asks one gentle choice, "Shall we play with this, or just be with it?". Play carries on as before; "Just be with it" stays quiet (no Thought Mallow, no world), with the calm world on offer. One extra tap for everyone; a death is never played without the person choosing it.
- Detected losses and a chosen grief-family feeling still go straight to the gentle path with no question; crisis, care and the wish to follow someone who died still route to support first.
- Another Angle asks the same way before anything is sent or played (default taken on the owner's behalf; one constant switches it off).

## Defaults taken on the owner's behalf (2026-10-14)

| Topic | Default |
|---|---|
| Resume after something heavy | No Resume into a world after a loss or a care-level disclosure (abuse, violence, threat, unsafe); Resume stays after ordinary distress (P4) |
| Everyday "death" sayings on the main screen | "My plant died", "the party is dead", "this traffic is murder" stay ordinary; in Another Angle they still never get the guess game |
| Consent card at the largest text size on a 320 px phone | Reads in 6 steps (3 at normal text); the approved wording is kept in full |
| Feelings suggested beside a loss | Grief and Sad first, plus any feeling the person stated outright; nothing read from unrelated words |
| The two answers to "Shall we play with this, or just be with it?" | Equal visual weight (Play first in reading order), so nothing nudges towards play when the words might be about a loss |
| After "Just be with it" | One gentle line and a single optional "Somewhere calm" chip (no second question); inside a world, the world ends quietly unless the person taps it |
| The question left unanswered | The words are kept for the next Tell; inside a world, the world stays paused with its Resume pill; the rest of the visit stays quiet |
| Everyday "dead" sayings ("the party was dead", "my character died in the game") | Get the ordinary question, never the gentle path; the gentle path is kept for a person or a pet |
| The question's clock | About 45 s, paused while the page is hidden; focus moves to the first answer and back to Tell afterwards |
| Another Angle's two answers | Equal weight, "Another angle" first; after "Just be with it" the next Tell is asked again (`BE_ASKS_AGAIN`), and "See support" is offered only when something heavy was seen |
| Home after a quiet Another Angle visit | Stays quiet (no playful chatter, no Support pill); the next Tell is still asked, and Play ends the quiet |
| Home after a world ended quietly | Boppo says the existing orienting line ("Okay. I'm right here. Squeeze me whenever you like."), not a question |
| Another Angle after a death | The gentle path stays on the phone: the authored gentle lines, nothing sent to the server (default; the model's own gentle reply is switched off) |
| A suicide named, about anyone | Care on both screens: a gentle line that assumes nothing, the Support pill, no world for the rest of the visit, nothing sent ("…and I'm going to a support group tonight" is care too) |
| A death, then the speaker talking about ending, joining or following | Care; when the wording is less clear but carries a death, ending or afterlife word, the gentle path with support first (no world offered) and nothing sent |
| Changes to the shared safety word list | Strictly additive: nothing the list caught before may be caught less (checked by `tools/beyond/lexicon-diff.mjs` and `tools/beyond/detection-gate.mjs`); known false alarms are kept on the safe side: "beat me at chess" (care), "no one is in danger" (crisis), "I'm dead lol" (the gentle path), "the physio rubbed my thigh" (care) |
| A goodbye note or a wish to die, with no death named | Care on both screens ("by the time you read this I'll be gone", "this is my goodbye to everyone", "i wnat to dei"): the Support pill, no world, nothing sent, never the question. A goodbye or an absence with an everyday bound in its sentence or the next ("…I'll be at work", "see you Monday", "my train is here") gets the ordinary question; an unbounded one is care, on the safe side. A goodbye said to someone who died stays the gentle path |

## Defaults taken on the owner's behalf (2026-10-15)

| Topic | Default |
|---|---|
| How distress is read | A risk screener (`src/beyond/risk-screen.js`) reads meaning, not phrases: the words in one spelling (misspellings, leet, spaced letters, texting, fuzzy-corrected against a closed key vocabulary, never an ordinary word), then frames (the self ending, a means, a farewell, burden, a future absence, a time or decision, a death named) and how they combine. One frame alone asks first (the check-in); frames that combine are care. Everyday bounds ("see you Monday", "at work", "my train is here") soften a frame but never cancel the self ending or a means. It only ever adds to the lexicon and the grief rules, which also read the words in one spelling now |
| The check-in, main screen | When the screener reads the words as possibly at risk and nothing more serious applies, "Before we go on — are you okay right now?" replaces "Shall we play with this, or just be with it?", with the same equal-weight chips: [I'm okay — let's play] [Not really] [Just be with it]. The Support pill is visible while it is up and stays for the visit. Nothing is made or played before an answer; no answer or Back stays quiet. A false alarm costs no extra tap |
| The check-in, Another Angle | The same line with [I'm okay — show me another angle] [Not really] [Just be with it], before anything is sent or played; "I'm okay" sends the words, and the server checks them again |
| "Not really" | "Thank you for telling me. You don't have to hold this on your own.", with "See support" as the first chip; support first and no world (or angle) for the rest of the visit; nothing sent |
| The screener's care | The existing care path, never the question: the main screen's care line, the Support pill and no world for the visit; Another Angle's follow lines and nothing sent. Beside distress or a loss, its check-in means support first (no world offered), the gentle path otherwise unchanged |
| A death named beside a borderline wish | As decided above for a death, then words about ending, joining or following: the screener reads a bereavement's known risk, but a death named lifts a self frame only to the check-in's level, which beside a loss is the gentle path with support first (no world, nothing sent), as the earlier rounds held "my dad died, i want out", "dad died and im gonna do it tonight" and "planning how to get to her". Care when the words are care without the death, or the grief rules read the clause as explicit |
| Context across a visit | The screener reads the visit's last three Tells too, in memory only (never stored or sent), so "I'm so tired of everything" then "goodbye everyone" is care; a message with nothing of its own never inherits anything, and a time word alone ("see you tomorrow") rises to the check-in at most |
| Server parity | The server keeps a byte-identical copy of the screener (`npm run sync:screen`, a test fails while they differ) and runs it after the lexicon, with the lexicon again on the normalised words: its care never reaches the model; its check-in reading still asks the model, with a fixed note to judge safety first, and keeps support close. A client that skips its own check-in cannot bypass the lexicon or the screener's care |
| Free test purchases on the GitHub Pages copy | Removed for the pilot: `ramkumarjothi1982.github.io` no longer unlocks Flow or Beyond for free, so nobody there reaches the real model through Another Angle without a plan; only this machine (`localhost`, `127.0.0.1`) keeps test purchases. One line in `src/app/config.js` puts it back |
| Another Angle and a half-configured server | The app asks `/v1/health` before the first session and sends no words unless the server answers ok, as the Another Angle service, on this app's scene schema, with its keys configured and (in production) not the mock provider; otherwise Zuzu's authored angles play on the phone |
| Earlier angles sent back to the server | The server reads each `previous_angles` line with the same checks as the person's words (the lexicon, its normalised spelling and the risk screener): crisis or care there means support and no model call. Its own lines never read that way (0 of the 255 the real model wrote in `eval/runs`), so a second angle is unaffected |
| Sign-in on a project that is not ready | Hidden exactly as with sign-in off until the project answers that its tables exist and email sign-up with "Confirm email" is on (`src/auth/readiness.js`); Settings' About mentions accounts only once that is true |

## Still open for the owner

- Monthly spend limit in the Anthropic Console.
- Development Partner Program: confirm not enrolled.
- Art: is the browless cyan drawing Loomi; do Blubi, Noomi and Loomi read as distinct.
- Does the ocean keep the feel of Drift and Dock's "Slow the wave".
