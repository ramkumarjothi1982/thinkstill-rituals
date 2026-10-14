# Hushmates 2.0 · Safety and privacy

Hushmates passes real feelings between strangers, so safety is the product, not a
feature. This is what the prototype does, what it only simulates, and what must be
true before anyone real uses it.

**Pilot stance:** an adult (18+), invitation-only pilot, pseudonymous. **A real-user
launch must not happen until moderation, privacy controls and abuse handling are
genuinely staffed and ready** (§6). The lab uses only simulated test identities and
safe, fictional words written for the demonstration.

## 1. Layers, in order

1. **On the device:** the release screen runs the screening before anything is
   sent. Words that suggest someone may not be safe never leave the phone; the person
   sees support instead (crisis lines, what to do now) and is told plainly that
   nothing was sent or saved.
2. **In the service:** every rule runs again on the server side. A client that
   skips the interface (tested with forged and replayed requests) gets the same
   answers. Support is always returned first, even for a reused request id or a
   restricted account.
3. **Rules that don't stop at the obvious:**
   - The app's shared safety lexicon (the one Reframe uses) is reused unchanged,
     plus Hushmates' own additions for overdose, self-harm and "no point going on".
   - Every rule reads an NFKC-normalised copy, so stylised or full-width letters
     can't slip past.
   - Contact details, links, money requests, addresses, postcodes and ZIP codes,
     and "my name is…" are refused, in feelings and in perspectives.
   - Perspectives are also checked for unkindness, diagnosis and near-copies.
4. **The Mallow provider's own gate:** Another Angle has its own lexicon and its
   own model check. If it says a feeling is a crisis:
   - the feeling stops travelling and every hold on it ends;
   - an urgent report goes to a person on the safety team;
   - the author is shown support.
   What the provider writes must pass the same rules as a person's words before
   anyone sees it.
5. **People:**
   - **Catchers** can report a feeling, which leaves their sky at once. Two
     independent reports, or one "someone may be in danger", pause it for review.
     Only open reports from distinct people count, and someone a moderator has
     already answered can't re-pause it alone.
   - **Authors** can report a perspective, which disappears from their collection
     at once.
   - **Moderators** (a separate role) see report evidence only, never browse
     journeys, and every look and decision is audited. Their decisions are:
     resume, remove the feeling, remove the perspective, or restrict the account.
     Restricting ends that account's holds and stops it catching.

Rules are a floor, not a guarantee. The interface says so, and the human layer is
not optional.

## 2. Consent, and anonymity, honestly

- **Sharing is an active, recorded choice.** On the release screen the person
  ticks "Share anonymously with Hushmates participants" ("Your words may be
  shown to other people who can offer different perspectives. Please leave out
  identifying details."). The button stays off until they do, and the service
  refuses any release without it (`consent-required`), so a modified client
  can't skip it. The time is recorded, nothing circulates without it, and it
  is in the person's data export.
- **Privacy details are one tap away before any choice** ("Privacy details" on
  the release screen, the welcome and You & safety): who sees your words, why
  it isn't perfectly anonymous, what happens if you allow a Mallow
  perspective, your choices, and safety.
- **Withdrawal:** bring a feeling home early, let it go, delete it, delete
  everything, withdraw the Mallow choice on a resend, or, as a writer, take
  back a perspective you gave or stop your words appearing in share stories.
- **Catchers are told who reads their words** before they write: the person
  who released the feeling, and anyone who adds a perspective after them,
  never with names.
- Pseudonymous, **not** perfectly anonymous. The interface says this in the
  welcome, in the privacy details and in You & safety.
- **Nobody is shown who released a feeling or who wrote a perspective.** The
  pseudonym is never shown to other people at all.
- Nobody can contact anyone: there is no messaging, no reply thread, no profile
  page, no "who caught it".
- The data model keeps the links (who wrote what) because moderation needs them.
  Moderators see them only through reports.
- Realtime events carry `{ type, scope, id }` only: no words and no people.
- **Blocking**, from either side, never reveals who:
  - the other person's feelings never find you, and yours never find them;
  - their words, including ones already written on your other feelings, are
    hidden from you;
  - any feeling of yours they are holding drifts on.

## 3. Automated perspectives, honestly

- The relay is human-first, and the AI behind the Mallow is never promoted:
  no "AI companion", chatbot, therapy or "AI reframing" language, and no
  model, provider, token or latency details anywhere a person sees.
- A Mallow perspective exists only when the author:
  - opted in for that feeling ("Let a Mallow offer another perspective if
    nobody responds." — off by default; the privacy details explain that the
    words are then sent to an automated service, that the reply is not written
    by a person, and that it is deleted with the journey);
  - then asks: after 30 minutes with nobody while it travels, or with
    "Explore another angle" once it is home (confirmed again there, with the
    same disclosure if they hadn't opted in).
- **It is always labelled.** "A Mallow perspective · Automatically generated",
  and "Automatically generated · not written by a person" next to the button
  that asks for it. A canned development example is never called generated:
  "A Mallow perspective · Example for testing, not generated". In the lab
  only, a tag under it names the real source so testers can tell a live test
  response from a canned example.
- It is drawn as a star, never a petal. It never counts as a person ("0 of 5
  human perspectives") and gives way to five people, moving to its own
  optional section.
- **No invented humans, no inflated numbers.** There are no live counts, no
  "people online", and nothing decorative in the sky that implies other
  people's activity. When nobody caught a feeling the copy says so kindly
  ("No one caught it this time. Want to give it another journey?" and "Sometimes
  the sky is just quiet. It says nothing about you or your feeling."). Share
  stories use the journey's real numbers.
- **High-risk text never reaches the relay or the Mallow.** Crisis words are
  answered with support on the device and again by the service (before the
  consent check), are never stored, and never go to a provider. The same holds
  for a catcher: if their perspective suggests *they* may not be safe, they are
  shown support, their words are not passed on or saved, and the feeling floats
  on to someone else. Support screens use Hushmates' own words (never
  "reframe"), and each category gets fitting resources (bullying gets general
  lines, not domestic-abuse lines); a safety lead must review them per region. Anything paused
  or removed by moderation can't be sent to a provider either.
- **In this lab no AI key is configured.** No output here is live AI, and none
  is labelled as if it were.

## 3a. Share stories

- Private by default: the picture or video is made on the device and nothing
  is uploaded or posted.
- The author chooses what it shows. The feeling's name and their own words are
  off by default.
- **Contributors' consent:** a perspective can appear only if its writer
  allowed it when they wrote it ("They may include my words in a share
  picture", off by default). Writers can change their mind any time in You &
  safety. Nobody is ever named.
- A Mallow's perspective keeps its own label ("Automatically generated") and is
  never presented as a stranger's. "Five strangers saw it differently" appears
  only when five people did.

## 4. Your data

- **Your data** (You & safety): a short summary in plain words (how many
  feelings, what came back, what you offered, when you agreed, your choices)
  and **Download my data**, a file for the person's device in a standard format.
  Nothing technical is shown on screen. The file (`exportMyData`, format v1) is
  built from an allow-list: other people appear only as "A Hushmate". It never
  holds their names, Mallows, ids or order, words you were never shown, the
  text of feelings you caught or reported, the safety team's notes, or who you
  blocked. Details and tests: `ACCESS.md`.
- **Delete my journey**, **release this feeling** (words cleared, a Mallow
  perspective you didn't keep wiped with them; perspectives you kept stay),
  **delete my Hushmates data** (every feeling, every perspective you gave, your
  sessions).
- A Mallow answer that arrives after a deletion or a release is dropped, never
  written back.
- The proposed retention schedule is in `RELAY.md` §5. It needs the owner's
  approval.

## 5. Crisis resources

The support screens reuse the safety copy the main app already ships (emergency
numbers, Samaritans 116 123, 988 in the US, findahelpline.com). **They must be
reviewed for each launch region by a safety lead** before real people use
Hushmates. In the lab, a note says so under them; the note lives in
`lab/lab-notes.js`, which the customer app never loads. When a Mallow
provider's own safety check flags a feeling, the person sees Hushmates' own
reviewed support words, never the provider's text.

## 6. Before any real person uses it

- [ ] A named safety lead, and moderators on a rota that meets the stated review
      times (urgent within 24 hours, others within 48 hours during the pilot).
- [ ] An escalation path for "someone may be in danger" reports, including what
      happens outside working hours.
- [ ] Crisis resources reviewed per region; age and invitation checks through the
      real auth flow.
- [ ] Privacy notice and data-protection review (special-category data: mental
      health), including the AI processing disclosure and the provider's data terms.
- [ ] Retention schedule approved and implemented with scheduled deletion.
- [ ] The Another Angle service agreement for server-to-server use (origin, limits,
      spend cap) and its safety gate reviewed for this use.
- [ ] Abuse testing on the real backend: concurrency, replay and rate limits,
      repeated against Supabase.
- [ ] A way to pause the whole relay instantly (kill switch) and to purge content.

## 7. Known limits and risks

- **Lexicons miss things.** Rules can't understand context, and some distress will
  get past them. That's why reports, the provider's gate and the human team exist,
  and why "not an emergency service" is said plainly.
- **Words can identify people** despite the rules: a distinctive story can be
  recognisable. The pilot should stay small and invitation-only, and the guidance
  must stay visible.
- **Perspectives can still land badly** without breaking a rule. Mitigations: "keep
  or let go", instant report-and-hide, blocking, and a calm return moment rather
  than a feed.
- **Brigading** (several accounts reporting a feeling to suppress it) pauses it for
  review rather than removing it. Moderators can resume it, and reporters a
  moderator has already answered can't re-pause it alone.
- **Timing side channels:** a blocked person's hold silently ends. The design avoids
  telling either side who is involved, but a determined person might infer a little
  from timing. This is acceptable for a pilot and should be documented.
