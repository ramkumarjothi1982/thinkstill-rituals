**DRAFT, not yet reviewed or approved. Not legal advice.**
**Date: 15 October 2026.**

# Hushmates · Safety wording, place by place

> **Status (internal).** This is the specification for every piece of safety wording members and desk readers see:
> the exact words, where they go, and how prominent they are. The words in the quoted boxes are what people read,
> in Hushmallow's voice. Everything else is for the team. Nothing here is final until the owner approves it. The
> wording should also be read by the independent safety reviewer (Tier A, `docs/REVIEWS.md`), and the parts marked
> **[needs legal advice]** by an Australian lawyer. Hushmates is not live.
>
> **Facts.** "In the app now" quotes the code at commit `0037d57` (15 October 2026), which includes the Tier 0 wording
> changes (`docs/safety/TIER0_SELF_ASSESSMENT.md` §6). §3.1, §3.5, §3.7 and §3.9 were re-quoted from the later commit
> `f8d7e4a` (15 October 2026), because those strings changed after `0037d57`. Re-check every other "In the app now"
> quote against the current code before the owner approves. "Proposed" is new wording, not built. File names are given
> so each line can be checked again.
>
> **Classifications.** **[verified obligation]**, **[depends: …]** (with the fact it depends on),
> **[needs legal advice]**, **[recommended practice]**. Recommendations are not obligations. The register is
> `docs/legal/LEGAL_REQUIREMENTS.md`; the desk procedure is `docs/legal/MODERATION.md`.

---

## 1. The rules for safety wording

### 1.1 What Hushmates is, in one line

- **Short (in the app):** "Hushmates isn’t an emergency service, and nobody here is watching in real time."
- **Long (terms, guidelines, help, store listing, website, marketing):** the intended-purpose statement, word for word,
  exactly as in `TERMS_OF_USE.md` §2 and `COMMUNITY_GUIDELINES.md`:
  "Hushmates is a space for sharing everyday feelings and receiving kind perspectives from other members. It is not
  intended to diagnose, screen for, prevent, monitor, predict, treat or alleviate any disease or mental health
  condition, and it is not a health, therapy or crisis service." It may be led in by one warm sentence ("Hushmates is
  for everyday feelings. In careful words:"). Don't paraphrase it, and don't change it here without changing it
  everywhere.
- Always followed by what to do: **"If you or someone else is in danger right now, call 000."**
- Every other line in this document (including the short one above) is checked against the long statement, so no
  channel says more than it does.

### 1.2 Never say or imply

- That Hushmates offers emergency help, crisis support, counselling, therapy, diagnosis or treatment.
- That anyone watches, monitors or checks on people, in real time or around the clock.
- That anyone from Hushmates will contact a person, check on them, send help or call anyone for them.
- That Hushmates keeps people safe, or is a "safe space".
- That members are anonymous. They are **pseudonymous**: other members never see their name, but Hushmates holds their
  email, and the safety team can read reported words.
- That a Mallow is a person, an AI, or "here with you" (or "right here"). Mallows are cartoon characters. Their lines
  are **put together automatically from pieces written in advance** (an opening in the Mallow's voice and one
  perspective). AI is off. Who wrote the pieces is for the owner to confirm before any wording says "the Hushmates team
  wrote" (`TERMS_OF_USE.md` §2 comment).

### 1.3 Words to leave out, and words to use

| Leave out | Use instead |
|---|---|
| monitor, watch over, keep an eye on, always here, 24/7, round the clock (about Hushmates) | "nobody is watching in real time"; "a small team, not here around the clock" |
| crisis support, counselling, therapy, treatment, help (as something Hushmates gives) | "support lines", "the people on these lines", "services that are free and there to talk" |
| detect, screen for risk, assess, predict, prevent, suicide prevention, crisis detection | "checks words for some signs that someone might not be safe" |
| we'll reach out, we'll check on you, someone will contact you | "we can’t see who wrote it, so we can’t contact them or send help" |
| anonymous, anonymously | "without my name"; "pseudonymous: other members never see your name, but we hold your email and know which account wrote what" |
| safe space, we keep you safe | "a gentle place", "a softer space for feelings" |
| "I’m right here with you", "I’ll be right here" (from a Mallow) | "The people on these lines are ready to listen" |
| AI, generated, "writes it from your words" (for Mallow lines) | "put together automatically from pieces written in advance" |
| condition names (anxiety, depression, trauma, suicidal thoughts) in claims about Hushmates | "feelings", "everyday moments", "something heavy" |

### 1.4 The voice

Short sentences. Warm and plain. Say what happened, what we can't do, and what the person can do now. No blame. No
clinical words. One idea at a time, because it is hard to take in a lot when you're upset.

**Rests on:**
- [depends: the words used and what the service really does] The ban on misleading or deceptive conduct (Australian
  Consumer Law s18; s29 for false representations) binds now, for free and paid services. Whether a line misleads
  turns on its overall impression. "Anonymous", "safe space", "someone is always there" and "real people answer" when
  a Mallow answered are the high-risk phrases (SCW-07). The ACL text was not retrieved; ACCC guidance was seen only as a
  search extract.
- [needs legal advice] Negligence and reliance (SCW-17, from memory, nothing searched): the more the wording implies
  that Hushmates watches over people, the stronger a reliance argument becomes. Prominent, honest limits reduce it.
- [needs legal advice] TGA: how a product is described counts towards its intended purpose. The word check and the
  "Someone may be in danger" report are best described as content safety with signposting, and a moderation priority
  read by people, not as risk detection or a crisis response (TGA-4, TGA-10; TGA guidance seen only as search
  extracts). Whether any part of Hushmates is a medical device is for the lawyer.
- [recommended practice] Mindframe, Samaritans and #chatsafe (guidance, not law): plain, concise, non-stigmatising
  language; honest limits; emergency contacts next to them (SM-01, SM-04, SM-06).

---

## 2. The support lines

These are the entries the app shows, in this order, as written in `core/feeling-safety.js` (and, for the desk,
`staff/desk-guide.js`). Each number is a tappable `tel:` link; the chat and helpline links open the service's own site.

| Line | The words people see |
|---|---|
| **Right now** | "If you or someone else is in immediate danger, call 000." **Call 000** |
| **Lifeline** | "Call 13 11 14, any time, day or night, or chat online at lifeline.org.au." **Call 13 11 14** · **Chat online** |
| **Suicide Call Back Service** | "Call 1300 659 467, any time." |
| **13YARN** | "Call 13 92 76: crisis support by and for Aboriginal and Torres Strait Islander people, any time." |
| **1800RESPECT** | "Call 1800 737 732 about family, domestic or sexual violence, any time." |
| **Beyond Blue** | "Call 1300 22 4636 to talk things through with a counsellor, any time." |
| **Lifeline** (someone else in danger) | "Call 13 11 14, any time. They help people who are worried about someone else, too." |
| **Outside Australia** | "findahelpline.com lists free, confidential helplines in many countries." **Find a helpline** |

**Which lines go where** (`core/feeling-safety.js`):
- **The support screen, crisis:** 000, Lifeline, Suicide Call Back Service, 13YARN, Outside Australia.
- **The support screen, someone else in danger:** 000, Lifeline (worried about someone), Outside Australia.
- **The support screen, abuse, violence, threats and "unsafe":** 000, 1800RESPECT, Lifeline, Outside Australia.
- **The support screen, harassment and discrimination:** 000, Lifeline, Beyond Blue, Outside Australia. For
  harassment that describes being followed or stalked, the abuse list instead (000, 1800RESPECT, Lifeline, Outside
  Australia).
- **Get support now:** 000, Lifeline, Suicide Call Back Service and 13YARN first; then, under "More support lines",
  1800RESPECT, Beyond Blue and Outside Australia.

**Checking them.** The numbers are the services' own published numbers as the developer recorded them. They could not
be re-checked from this environment, except Beyond Blue's "24 hours a day / 7 days a week", which was seen on Beyond
Blue's site as a search extract. **Check every number, every description and every "any time" against the service's
own website before the beta, and every three months after** (`MODERATION.md` §13). A line that changes is changed in
`core/feeling-safety.js` and `staff/desk-guide.js` together, and in the drafts that copy them.

"Beyond Blue … to talk things through with a counsellor" describes Beyond Blue's own service, not Hushmates'. Keep
it that way.

**Rests on:** [recommended practice] Mindframe: at least two 24/7 services wherever mental health concerns are
discussed (SM-03; Mindframe quick reference, search extract). Samaritans: emergency services, 24-hour support and
specialist lines (SM-04; UK guidance, search extract).

---

## 3. The wording, place by place

### 3.1 Welcome (before entering, `ui/relay/welcome.js`)

**In the app now** (`f8d7e4a`, `ui/relay/welcome.js:101-105`). Heading "Before you begin"; the Mallow says "A few
promises, before we begin." Four promises:

> **Pseudonymous, not perfectly anonymous.** Other participants never see your name or account, and can’t contact
> you. Leave out names and details that could identify anyone.
>
> **Possibilities, not verdicts.** No diagnosis, no judgement, no telling anyone what to do.
>
> **People first.** A Mallow perspective is offered only if you allow it. It’s chosen automatically from a fixed set
> of lines written in advance, always labelled, and never counted as a person.
>
> **Not an emergency service.** Hushmates checks words for some signs that someone might not be safe, and shows
> numbers to call. The check reads English only, it can miss things, and nobody is watching in real time. If you’re
> not safe, call 000, or Lifeline on 13 11 14, any time.

**Proposed.**
- Replace the first promise with the collection notice's wording (`COLLECTION_NOTICE_AND_CONSENT.md` §4.3), so the
  welcome uses "pseudonymous" only and says plainly what Hushmallow holds:

  > **Pseudonymous: your name stays with you.** Other participants never see your name or account, and can’t
  > contact you. We hold your email and know which account is yours. Words can give people away, so leave out names
  > and details that could identify anyone.

- "People first": the collection notice's wording (§4.3), "put together automatically from pieces written in
  advance".
- Keep the other two. Add one short sentence to the last, so people know where support lives:

  > … If you’re not safe, call 000, or Lifeline on 13 11 14, any time. **Support is at the top of every screen.**

**Rests on:** [recommended practice] State the limits at onboarding, with emergency contacts beside them (SM-06);
eSafety Safety by Design's "social contract" at sign-up (voluntary, search extract). [recommended practice]
"Pseudonymous", never "anonymous": "not perfectly anonymous" still leans on the idea of anonymity, and Hushmallow holds
the email and knows which account wrote what (PRV-04, PRV-22; the critic's overall point 3). [depends: the words used]
An overall impression of near-anonymity is an ACL s18 risk (SCW-07).

### 3.2 Before release (`ui/relay/release.js`)

**In the app now.** No safety line on this screen. The Support button is in the header. The consent tick is about
privacy:

> **Share with Hushmates participants, without my name**
> Your words may be shown to other people who can offer different perspectives. Please leave out identifying details.
> *Privacy details*

**Proposed.** One quiet line under the Release button. Not a tick, not a pop-up, and never blocking the button:

> Hushmates is for everyday feelings. If you’re not safe right now, Support is at the top of the screen, any time.

It is short on purpose: most feelings are everyday ones, and the line shouldn't make every release feel like a
warning. The owner may leave it out, because the welcome and the Support button already cover it.

**Not safety wording, but on this screen:** the Mallow note ("Hushmates writes a perspective for you automatically")
describes a fixed library inaccurately. Its new wording is in `COLLECTION_NOTICE_AND_CONSENT.md`.

**Rests on:** [recommended practice] Help-seeking information wherever emotional content is explored (Mindframe,
SM-03); keep it concise (Samaritans).

### 3.3 The support screen (when words are held back, `ui/relay/support.js`, `core/feeling-safety.js`)

This screen appears **only** when the word check holds words back: a feeling before release, a feeling sent out
again, or a catcher's perspective. Nothing was sent or stored.

**In the app now, by kind.**

*Crisis.* Title "Let’s pause here":

> What you’ve written sounds really painful, and it matters. It won’t be sent to anyone: you deserve real support with
> this, right now. If you might act on these thoughts, or you’re not safe, please call 000. If you can, tell someone
> near you how you’re feeling. You don’t need the right words first.

*Someone else in danger.* Title "Someone might be in danger":

> If someone might be about to hurt themselves, or is in danger right now, that comes before anything else: call 000.
> If it’s safe to, stay with them or keep talking to them. You don’t have to handle this alone: a helpline can talk
> you through what to do.

*Care* (each says "It won’t be sent out for other perspectives." in the middle). Title "This one deserves real
support" (or "Your safety comes first" for "unsafe"):

> **Abuse:** What you’re describing sounds like it could be abuse. It won’t be sent out for other perspectives. It’s
> not your fault, and you don’t deserve it. If you can, tell someone you trust or contact a support service, at your
> own pace.
>
> **Violence:** Nobody has the right to hurt you. This is something that happened to you, and it matters. It won’t be
> sent out for other perspectives. If you can, tell someone you trust, and reach out to a support service or the
> police when you feel ready.
>
> **Threats:** Being threatened is serious, and it isn’t something to talk yourself out of. It won’t be sent out for
> other perspectives. Keep any messages or notes, tell someone you trust, and contact the police or a support service
> if you feel at risk.
>
> **Harassment:** Being harassed or bullied isn’t something to see differently, and it isn’t on you to fix. It won’t
> be sent out for other perspectives. If you can, save screenshots or notes, tell someone you trust, and use the
> reporting routes at school, at work or on the app or site.
>
> **Discrimination:** Being treated unfairly because of who you are is real, and it isn’t something to explain away.
> Your reaction makes sense. It won’t be sent out for other perspectives. If you want to, keep a record of what
> happened and talk to someone you trust, HR, a union or an advice organisation.
>
> **Unsafe:** Not feeling safe is important information. Please trust it. It won’t be sent out for other
> perspectives. If you can, talk to someone you trust or a support service about what’s going on.

*Under every message*, after the lines:

> When you’re ready, Hushmates will still be here for the lighter things. For this, the people on these lines are
> ready to listen now.

*What happened to the words* (one of three):

> **A feeling:** Your words weren’t sent to anyone or saved, so nobody at Hushmates will see them or be in touch.
> They’re only in your draft here, and they’re gone when you clear them or close Hushmates.
>
> **A catcher's perspective:** What you wrote wasn’t passed on or saved, so nobody at Hushmates will see it or be in
> touch. The feeling has floated on to someone else. Right now, this is about you.
>
> **Sending a feeling out again:** This feeling wasn’t sent out again. It’s still with you in Returned, where you can
> keep it, let it go or delete it.

*The Mallow says:* "There are real people ready to listen, right now."

*Buttons:* "Go back to my words" and "Clear my words and go back" (a feeling); "Take a pause" and "Back to Catch" (a
catcher); "Back to this feeling" (sending again).

**Proposed.**
- The Mallow's line, so it can't be read as people at Hushmates:

  > The people on these lines are ready to listen, right now.

- For Tier A to decide: the crisis screen shows five entries at once. Samaritans suggests two or three at a time for
  someone in high distress. One option is 000, Lifeline and the Suicide Call Back Service first, with 13YARN and
  Outside Australia under "More support lines", as Get support now already does.

**Rests on:** [recommended practice] When content is held back, say so plainly, explain why without blame, say what
the person can do next, and show support (Samaritans, SM-05). Signpost few at a time (SM-04). [needs legal advice]
TGA-4: the screen tells a person their words "suggest" they might not be safe; keep it a statement about the words,
not an assessment of the person.

### 3.4 Get support now (the Support button and its sheet, `ui/relay/common.js`)

**In the app now.**
- A small **Support** button in the header of every screen (sign-in, invitation, welcome, every main place, the
  offline and deleted screens). Its spoken label: "Support: crisis lines, any time". It isn't shown on the support
  screen itself, which already shows the lines.
- It opens a sheet over the current screen. Drafts and catches are kept, and it works offline.

Sheet title "You deserve support":

> Hushmates isn’t an emergency service, and nobody here is watching in real time. If you or someone else is in danger
> right now, call 000. If you’re not okay, or you’re worried about someone, these services are free and there to talk.

Then 000, Lifeline, Suicide Call Back Service and 13YARN; then **More support lines**: 1800RESPECT, Beyond Blue,
Outside Australia.

**Proposed.** No change.

**Rests on:** [recommended practice] A support route reachable from every screen that shows emotional content
(Mindframe, SM-03). [verified obligation] Not to discriminate, directly or indirectly, against people with
disability in providing the service, free or paid (Disability Discrimination Act 1992 s24; legislation.gov.au and the
AHRC, search extracts). A Support button or sheet that people with disability can't use risks indirect discrimination.
The specific measures (labels, tap size, keyboard focus, working at 320 px, offline) are [recommended practice], and
whether a given barrier is unlawful [depends: reasonableness and unjustifiable hardship] (SCW-13 as corrected).

### 3.5 You & safety (`ui/relay/you.js`)

**In the app now** (`f8d7e4a`, `ui/relay/you.js:48-70`).
- Near the top:

  > **Pseudonymous, not perfectly anonymous.** Words can give people away, so leave out names, places and details.
  > Our safety team can see reported words.

- The first section, **"If you’re not okay"**, has one row: **Get support now** · "Crisis lines, any time, and what
  to do if you’re not safe". (The crisis lines are the services' own, not Hushmates'.)
- Under "How Hushmates stays gentle":

  > **Rules first, then people.** Words are checked for safety and personal details by rules that read English only
  > and can miss things. Nobody on our team reads feelings as they travel. When something is reported, a person on our
  > small safety team reads it: during the pilot we aim to do that within a day or two, and nights, weekends and
  > holidays can take longer. They aren’t counsellors, and they can’t see who anyone is or contact anyone. If someone
  > is in danger right now, call 000.
  >
  > **Mallow perspectives are labelled.** They’re chosen automatically from a fixed set of lines written in advance
  > for Hushmallow (only if you allow it), never presented as a person, and never counted as one.

- At the end: "Hushmates is an invitation-only pilot for adults (18+)."

(At `0037d57` the "Rules first" line said "usually within a day or two", with no 000. "Usually" reports past
performance, and there is none. The code has since moved to "we aim to", next to 000.)

**Proposed.**
- The note near the top, in the same form as the welcome (§3.1):

  > **Pseudonymous: your name stays with you.** We hold your email and know which account is yours. Words can give
  > people away, so leave out names, places and details. Our safety team can see reported words.

- "Rules first, then people": keep the current wording, which is a qualified aim next to 000, as `MODERATION.md`
  §4.2 requires. If it is ever shortened, use:

  > When something is reported, a person on our small safety team reads it. We aim to read it within a day or two,
  > and we’re not here around the clock. If someone is in danger right now, call 000.

  Never "usually" (there is no track record) and never "will" for a time.
- "Mallow perspectives are labelled": "put together automatically from pieces written in advance" (§1.3), once the
  owner has confirmed who wrote them.

**Rests on:** [depends: the desk rota being staffed] A response time is a representation about a future matter
(SCW-07 as corrected); it matches the one settled position on response times (`LEGAL_REQUIREMENTS.md` X-2;
`TERMS_OF_USE.md` §4; `COMMUNITY_GUIDELINES.md`). [recommended practice] SM-06, SM-15. [recommended practice]
"Pseudonymous" only (PRV-04, PRV-22); [depends: the words used] ACL s18 (SCW-07).

### 3.6 The catcher's screens (`ui/relay/catch.js`)

**In the app now.**
- The switch: **Let feelings find me** · "Always voluntary. Letting a feeling float past is always fine, and you can
  turn this off any time."
- When a feeling arrives: "Catch this feeling" / "Let it float past", and "It waits a few minutes for you. Letting it
  float past is always fine."
- Writing a perspective: "No diagnosis, judgement or orders. The person who released it will read your words, and so
  will anyone who adds a perspective after you; nobody sees who wrote it, and nobody can contact anyone."
- **More** (on the offer and while writing), titled "Something not right?":

  > You can report this feeling to a person on our safety team, or make sure feelings from this person never find you
  > again. They won’t be told either way.

- If a catcher's own words are held back: the support screen (§3.3, the catcher's version).
- If their account is restricted: "Our safety team has paused catching for your account for now. Feelings you already
  released still come home to you." (and, on Release, "Your account can’t release feelings right now.").

**Proposed.**
- The switch hint, so catchers know they might meet something hard and what to do:

  > Always voluntary. Now and then a feeling may be heavy to read. Letting it float past is always fine, and Support is
  > at the top if you need it. You can turn this off any time.

- One line at the end of the **More** sheet:

  > Worried they may not be safe? Choose “Someone may be in danger” when you report.

- The restricted-account message (on Catch and on Release), once the contact address exists (D23):

  > Our safety team has paused your account for now, so you can’t release or catch feelings. Feelings you already
  > released still come home to you. If you think we got it wrong, email [contact address] with “Review” in the
  > subject. If things feel heavy, Support is at the top of the screen, any time.

**Rests on:** [recommended practice] Tell catchers they may see something hard, and that they can pass, get support or
flag it (Samaritans, SM-07). It's fine not to respond; use the danger route rather than handling a crisis alone
(#chatsafe, written for young people, applied by analogy, SM-08). Restrictions: explain, signpost and offer a review
(Samaritans and Safety by Design, SM-13). [depends: whether a contract exists and its terms] Suspension terms and unfair
contract terms (SCW-08).

### 3.7 After a report, and while a feeling waits

**In the app now** (`f8d7e4a`).
- The report sheet (`ui/relay/common.js:128`): "A person on our safety team reads reports, but not straight away and not
  around the clock. They can’t see who anyone is, and they can’t contact anyone. Nobody is told who reported. If
  someone is in danger right now, call 000."
- When "Someone may be in danger" is chosen (`ui/relay/common.js:115`): "Our team can’t see who wrote it, so we can’t contact them or send help.
  If you know someone is in danger right now, call 000."
- After sending: the acknowledgements, word for word in `MODERATION.md` §4.1 (priority, ordinary, and desk away).
- A paused feeling, to its writer (`ui/relay/journeys.js:134-137`):

  > Paused for now. Our safety team will look at it, but they can’t contact you. It still comes home within {time}.
  > If anything feels heavy, people on these lines are ready to listen now. **Get support now**

  The words are the same for every pause, so the reason is never revealed.
- A feeling the team brought home (`ui/relay/returned.js:125, 137`):

  > Our safety team brought it home early. Sometimes a feeling needs more care than a new way of seeing it. If that’s
  > true for you right now, crisis lines are there any time. **Get support now**

- The Mallow, when it won't offer a line (`ui/relay/journeys.js:187-197`): "This one needs a person, not a Mallow."
  (with the support lines); "I won’t offer a perspective on this one. If things feel heavy, real people are there to
  listen: tap Support at the top of the screen."; "This one is waiting for our safety team to read it, so I’ll hold
  off for now."

**Proposed.**
- Add 000 to the ordinary acknowledgement, so every statement about the desk sits next to it:

  > Thank you for telling us. A person on our safety team will read it. We’re a small team, not here around the clock:
  > during the pilot we aim to read reports within two days. If anyone is in danger right now, call 000. Nobody is told
  > who reported.

- The Mallow's line: the app now names the button correctly ("tap Support at the top of the screen"). What remains
  is to point at the lines, not at Hushmates, since "real people are there to listen" could be read as people at
  Hushmates:

  > I won’t offer a perspective on this one. If things feel heavy, the people on the support lines are there to
  > listen: tap Support at the top of the screen.

**Rests on:** [recommended practice] Acknowledge reports, say what happens next, give emergency contacts and the
reporter's own support (Samaritans, SM-09). [depends: the desk rota being staffed] the aims (`MODERATION.md` §4.2).

### 3.8 The safety desk (`staff/desk.js`, `staff/desk-guide.js`)

For desk readers, not members.

**In the app now.**
- The empty queue: "Nothing is waiting. New reports appear here by themselves while this page is open and you’re
  signed in. Nothing alerts anyone when it’s closed, so check at the set times."
- Opening a report: "Choose a report to read it. Every report you open is recorded in the activity log."
- The note box: "A note for the team (optional, only the team sees it) · What you saw and did. No diagnosis, no
  guesses about who anyone is."
- On every priority report, **Someone may be in danger**, the six steps of `ESCALATION.md` §3 (also in
  `MODERATION.md` §6.2), then the lines: "Emergency: 000 (police, ambulance, fire)." "Lifeline: 13 11 14, any time,
  day or night." "Suicide Call Back Service: 1300 659 467, any time." "Beyond Blue: 1300 22 4636, any time." "13YARN
  (Aboriginal and Torres Strait Islander crisis support): 13 92 76." "1800RESPECT (family, domestic and sexual
  violence): 1800 737 732."
- The badge **Over 12 hours** on a priority report still open after 12 hours.
- After 30 minutes without activity: "You were signed out after 30 minutes without activity."

**Proposed.** One standing note at the top of the queue, so the role's limits and the right to stop are always in
view:

> You read words and make content decisions. You’re not a counsellor or a crisis worker. The desk can’t see who anyone
> is, or contact anyone. You can stop at any time: hand over to the safety lead.

**Rests on:** [depends: who reads the desk, and in which state] WHS duties to desk readers, including volunteers;
psychosocial hazards (SCW-15, SCW-16; Safe Work Australia, search extracts). [recommended practice] A written role
limit and the right to step away (`MODERATION.md` §10).

### 3.9 Elsewhere

- **The privacy sheet**, "Safety" (`ui/relay/parts.js:186`), in the app now (`f8d7e4a`):

  > Reported words are read by people on our small safety team, not around the clock. The team reads feelings only
  > when they’re reported, and it can’t see who anyone is or contact anyone. Words are checked by rules that read
  > English only and can miss things. Hushmates isn’t an emergency service: if you might not be safe, call 000, or a
  > crisis line such as Lifeline on 13 11 14, any time.

  **Proposed:** the collection notice's version (`COLLECTION_NOTICE_AND_CONSENT.md` §4.10), which says "The team reads
  words only when they’ve been reported, or paused for safety", the same sentence as the privacy policy.

- **The offline screen** (`ui/relay/away.js`), in the app now (`f8d7e4a`): the Mallow says "I’ll be right here."
  (`:17`), and the line under the heading says "Your feelings are safe and keep travelling. We’ll try again as soon as
  you’re back online." (`:33`). "Right here" breaks §1.2 (a Mallow is never "here with you"), and "safe" is a claim.
  **Proposed:**

  > *The Mallow:* Your feelings are still travelling. Come back whenever you’re ready.
  >
  > *The line:* Your feelings keep travelling while you’re offline. We’ll try again as soon as you’re back.

- **The Terms of Use** ("Please read this part closely") and the **Community Guidelines** ("If someone is in danger
  right now") carry the long form. They copy the lines and aims above; keep them identical.
- **Emails, the app store and any marketing** (none written yet). Use the long statement in §1.1, word for word, and
  the lists in §1.3. An app-store listing is advertising material, so it is exactly where one statement matters.
  Suggested store wording:

  > Hushmates is for everyday feelings. In careful words: Hushmates is a space for sharing everyday feelings and
  > receiving kind perspectives from other members. It is not intended to diagnose, screen for, prevent, monitor,
  > predict, treat or alleviate any disease or mental health condition, and it is not a health, therapy or crisis
  > service. If you or someone else is in danger right now, call 000.

  Don't choose a "Medical" store category, and don't name conditions or therapy methods (TGA-10).

**Rests on:** [depends: the words used] ACL s18 (SCW-07). [depends: what each channel says] s41BD reads a product's
purpose from its labelling, instructions, advertising and technical documentation (TGA-2, as corrected). The avoid and
prefer lists are [recommended practice] (TGA-10). Device status [needs legal advice] (TGA-4, TGA-5).

---

## 4. Prominence: always one tap away, never in the way

**Always one tap away**
- The **Support** button is in the header of every screen, opens over whatever the person is doing, keeps their
  draft or catch, and works offline. Keep it there in every new screen.
- **Get support now** is the first section of You & safety, and sits beside a paused or brought-home feeling.
- Every number is a tappable call link. 000 always comes first, Lifeline next.
- The lines are part of the app, so they never depend on the connection.

**Never in the way of ordinary use**
- No pop-ups, banners, forced reading or extra ticks during ordinary use.
- The support screen appears **only** when the word check holds words back, or when someone taps Support.
- No repeated "are you okay?" prompts. A check-in waits for Tier A's wording (`docs/DECISIONS.md` D2).
- No support lines inside celebrations (a homecoming, a share picture), except beside a paused or brought-home
  feeling.
- One short safety line per screen at most, and only where §3 puts one.

**Easy to take in**
- Few lines at a time on the support screen (Samaritans suggests two or three; Tier A decides, §3.3).
- The same numbers, names and descriptions everywhere, from one source (`core/feeling-safety.js`).
- Readable at 320 pixels wide, with keyboard focus, labels for screen readers, reduced motion and no meaning carried by
  colour alone.

**Rests on:** [recommended practice] Mindframe (SM-03), Samaritans (SM-04), Safety by Design (voluntary).
[verified obligation] DDA s24 for the duty not to discriminate in providing the service; the specific measures are
[recommended practice] (SCW-13 as corrected). SCW-14: no law was found that mandates WCAG for a private app (only the
AHRC material was searched); the AHRC's 2025 Guidelines, which are not legally binding, recommend WCAG 2.2 AA
(search extract).

---

## 5. Summary of proposed changes

| # | Place | Change | Why | Classification |
|---|---|---|---|---|
| 1 | Welcome | Add "Support is at the top of every screen." | People learn where support lives | Recommended practice |
| 2 | Before release | One quiet line under the button (optional) | Help-seeking information where feelings are written | Recommended practice |
| 3 | Support screen | Mallow: "The people on these lines are ready to listen, right now." | Can't be read as people at Hushmates | Recommended practice; ACL s18 (depends on the words) |
| 4 | Support screen | Fewer lines at once on the crisis screen | Signpost two or three at a time | Recommended practice; Tier A decides |
| 5 | Catcher's switch | Say a feeling may be heavy, and where Support is | Catchers may meet hard words | Recommended practice |
| 6 | Catcher's More sheet | Point to "Someone may be in danger" | Use the danger route, not a crisis alone | Recommended practice |
| 7 | Paused account | A review route and Support | Explain, signpost, review | Recommended practice; needs the contact address (D23) |
| 8 | Ordinary acknowledgement | Add "If anyone is in danger right now, call 000." | 000 beside every statement about the desk | Recommended practice |
| 9 | Mallow on a held feeling | "the people on the support lines are there to listen" (the app already says "tap Support at the top of the screen") | Can't be read as people at Hushmates | Recommended practice |
| 10 | Desk | A standing note on the role's limits and the right to stop | WHS psychosocial controls | Depends on who reads the desk |
| 11 | Offline screen | Drop "safe"; replace the Mallow's "I’ll be right here." | A claim; a Mallow is never "here with you" | Depends on the words (ACL s18); recommended practice |
| 12 | Welcome, first promise | "Pseudonymous: your name stays with you." with "We hold your email and know which account is yours." | "Not perfectly anonymous" still leans on anonymity | Recommended practice; ACL s18 (depends on the words) |
| 13 | You & safety, the note near the top | The same "Pseudonymous: your name stays with you." form | As 12 | Recommended practice; ACL s18 (depends on the words) |
| 14 | Welcome and You, Mallow lines | "Put together automatically from pieces written in advance" | Matches how lines are made; authorship to confirm | Recommended practice; ACL s18 (depends on the words) |
| 15 | Privacy sheet, Safety | "reads words only when they’ve been reported, or paused for safety" | One sentence everywhere | Recommended practice |
| 16 | Store listing and long form | The intended-purpose statement, word for word | One statement in every channel | Recommended practice (TGA-2, TGA-10); device status needs legal advice |

Each change is made in the code (with its test, where one checks the words) and in any draft that quotes it, at the
same time.

---

## 6. Sources

Official sources were **not opened directly**; each was seen **only as a search-tool extract**. Points marked "from
memory" were not seen at all. Guidance from Mindframe, Samaritans, Orygen and eSafety's Safety by Design is **not law**.

- Competition and Consumer Act 2010 (Cth) Sch 2 (Australian Consumer Law) ss 18 and 29: text not retrieved; ACCC
  guidance, https://www.accc.gov.au/consumers/buying-products-and-services/contracts (search extract).
- Disability Discrimination Act 1992 (Cth) s24, compilation of 14 October 2024,
  https://www.legislation.gov.au/C2004A04426/2024-10-14/2024-10-14/text/original/epub/OEBPS/document_1/document_1.html
  (search extract; "whether for payment or not" seen only through the AHRC); AHRC, *Guidelines on equal access to
  digital goods and services* (2025), https://humanrights.gov.au/__data/assets/file/0027/47358/Guidelines-equal-access-digital-goods-services.pdf
  (guidance, search extract).
- TGA, *Understanding the digital mental health device rules*,
  https://www.tga.gov.au/resources/guidance/understanding-digital-mental-health-device-rules ; *Advertising
  software-based medical devices*, https://www.tga.gov.au/resources/guidance/advertising-software-based-medical-devices-australia
  (search extracts).
- Safe Work Australia, *Duties of a PCBU*, https://www.safeworkaustralia.gov.au/law-and-regulation/duties-under-whs-laws/duties-pcbu ;
  model Code of Practice *Managing psychosocial hazards at work*,
  https://www.safeworkaustralia.gov.au/sites/default/files/2022-08/model_code_of_practice_-_managing_psychosocial_hazards_at_work_25082022_0.pdf
  (search extracts).
- eSafety, *Safety by Design* principles (voluntary),
  https://www.esafety.gov.au/sites/default/files/2019-10/SBD%20-%20%20Principles.pdf (search extract).
- Mindframe, quick reference, https://cdn.mindframe.org.au/assets/src/uploads/Mindframe_Quick_Ref_AIHW_09.pdf
  (guidance, search extract).
- Samaritans (UK), *Supporting user wellbeing*,
  https://www.samaritans.org/about-samaritans/research-policy/internet-suicide/guidelines-tech-industry/supporting-user-wellbeing/ ;
  *User-friendly reporting*,
  https://www.samaritans.org/about-samaritans/research-policy/internet-suicide/guidelines-tech-industry/user-friendly-reporting/
  (guidance, search extracts).
- Orygen, #chatsafe, https://www.orygen.org.au/chatsafe/talking (guidance, search extract).
- Beyond Blue, national helplines page, https://www.beyondblue.org.au/get-support/national-mental-health-helplines-and-support-groups
  (the 24/7 support line, search extract).

**Project files:** `core/feeling-safety.js`, `ui/relay/common.js`, `ui/relay/support.js`, `ui/relay/welcome.js`,
`ui/relay/you.js`, `ui/relay/release.js`, `ui/relay/catch.js`, `ui/relay/journeys.js`, `ui/relay/returned.js`,
`ui/relay/parts.js`, `ui/relay/away.js`, `staff/desk.js`, `staff/desk-guide.js`,
`supabase/migrations/20261015090000_hushmates_tier0.sql`, `core/relay.js`, `docs/safety/TIER0_SELF_ASSESSMENT.md`,
`docs/legal/MODERATION.md`.
