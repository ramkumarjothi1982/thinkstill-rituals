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

## 2. Anonymity, honestly

- Pseudonymous, **not** perfectly anonymous. The interface says this in the
  welcome, on release ("Leave out names, places and anything that could identify
  you or someone else") and in You & safety.
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

## 3. AI, honestly

- The relay is human-first. A Mallow perspective exists only when:
  - the author opted in for that feeling, with the disclosure "This needs AI
    processing: your words are sent to an AI service for one reply";
  - nobody caught it for 30 minutes;
  - and the author then asks.
- **It is always labelled with its real source:**
  - "A Mallow perspective · AI-generated" only when the provider reports a real
    model;
  - "… · from the Reframe library, not AI";
  - "… · demo example, not live AI".
- It is drawn as a star, never a petal. It never counts as a person ("0 of 5 from
  people · plus a Mallow's") and gives way to five humans.
- **No invented humans, no inflated numbers.** There are no live counts, no "people
  online", and nothing decorative in the sky that implies other people's activity.
  The share picture uses the journey's real numbers.
- High-risk text is never sent to a generative provider as an ordinary fallback.
  The same applies to anything paused or removed by moderation.
- **In this lab no AI key is configured.** No output here is live AI, and none is
  labelled as if it were.

## 4. Your data

- **Download my data:** your feelings and what came back, and the perspectives you
  gave. Other people never appear in it.
- **Delete my journey**, **release this feeling** (words cleared; perspectives you
  kept stay), **delete my Hushmates data** (every feeling, every perspective you
  gave, your sessions).
- A Mallow answer that arrives after a deletion or a release is dropped, never
  written back.
- The proposed retention schedule is in `RELAY.md` §5. It needs the owner's
  approval.

## 5. Crisis resources

The support screens reuse the safety copy the main app already ships (emergency
numbers, Samaritans 116 123, 988 in the US, findahelpline.com). **They must be
reviewed for each launch region by a safety lead** before real people use
Hushmates; the interface marks them as a pilot placeholder.

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
