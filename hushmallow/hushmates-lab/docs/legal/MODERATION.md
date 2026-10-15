**DRAFT, not yet reviewed or approved. Not legal advice.**
**Date: 15 October 2026.**

# Hushmates · Moderation and escalation procedures

> **Status (internal).** This is the safety desk's operating procedure for the private beta. It is internal and
> operational: it is not shown to members. Nothing in it is final until the owner approves it. Parts marked
> **[needs legal advice]** must also be reviewed by an Australian lawyer, and the whole procedure is in the scope of
> the independent safety review (Tier A, `docs/REVIEWS.md`, `docs/REVIEW_QUOTES.md`). Hushmates is not live: there
> are no real members and no real reports yet.
>
> **Facts.** Every statement about what the app or the desk does was checked against the code at commit `0037d57`
> (15 October 2026), which includes the Tier 0 changes. File names are given so they can be checked again.
>
> **Classifications.** Each requirement is labelled:
> - **[verified obligation]**: the law requires it, and the source was seen (as a search extract, see §15);
> - **[depends: …]**: required only if a fact about Hushmallow is true, and the label says which fact;
> - **[needs legal advice]**: a lawyer must decide it;
> - **[recommended practice]**: guidance or good practice, not a legal duty.
>
> Recommendations are not obligations, and this document does not treat them as such. The full register of
> requirements is `docs/legal/LEGAL_REQUIREMENTS.md`.

---

## 1. What this document is, and how it fits with `ESCALATION.md`

`docs/ESCALATION.md` is the desk's short procedure. Its §3, the six steps for "Someone may be in danger", is the
same text the desk shows (`staff/desk-guide.js`, `URGENT_GUIDE`), and `tests/desk-guide.test.mjs` checks that the
two match. **This document does not change those six steps.** It repeats them in §6 and explains each one.

This document adds what `ESCALATION.md` doesn't cover:
- who monitors reports, by named role (§3);
- what each person must do, and must never do (§3.3, §3.4);
- what members are told about response times, word for word (§4);
- what happens when nobody can read the desk (§5);
- the urgent path in detail: when 000 is appropriate, who decides, the account email (§6);
- other serious reports: child sexual abuse material, terrorist material, a member who may be under 18, requests
  from police (§7);
- ordinary reports (§8);
- notices from eSafety (§9);
- looking after the people who read the desk (§10), and training (§11);
- records (§12) and review (§13).

**What supersedes what.**
- Where this document and `ESCALATION.md` cover the same thing, they say the same thing. If they ever seem to
  differ, **follow `ESCALATION.md` §3 at the desk** (it is what the desk shows), tell the safety lead, and fix
  whichever document is wrong.
- This document **supersedes** `ESCALATION.md` §2 ("Who, and when") and §6 ("After the beta's first month") where it
  is more detailed: the roles and minimum staffing (§3), the cover rules (§5) and the review cadence (§13). The
  blanks for names are the same blanks: fill in both documents together.
- This document **supersedes** any earlier wording about response times, including the app's old "we aim to look
  within 24 hours" and "within 48 hours" (removed in commit `0037d57`), and any project document that still says
  the team promises nothing to reporters. What reporters are told is in §4.
- Nothing here supersedes the Terms of Use, the Community Guidelines or the Privacy Policy. Those tell members what
  happens. This document tells the team how to make it true, and they must stay consistent.

---

## 2. What the desk can and can't do, and what works without anyone

### 2.1 The desk

| It can | It can't |
|---|---|
| Read a reported feeling or perspective, with when it was reported | See anyone's name, email or location, or who reported (`m_mod_get`, `supabase/migrations/20261014090100_hushmates_rules.sql`) |
| See how many earlier reports there were about the same account, how many were acted on, and whether it is restricted | Browse feelings, or read anything that hasn't been reported (there is no such method) |
| **Let it carry on**, **Take it out of circulation** (a feeling), **Remove the perspective**, **Restrict the person who wrote it**, or **Close: noted for the library** (a Mallow line) (`staff/desk-guide.js`) | Contact anyone, send help, or tell a reporter what was decided |
| Write team notes (encrypted; every moderator sees them) | Undo something already read, or recall a share picture someone already made |
| See the activity log (the last 200 entries, accounts by reference only) | Restrict another moderator, suspend an account, or lift a restriction (a team lead does that with `server/admin.mjs member <reference> active\|restricted\|suspended`) |

The account reference the desk shows ("Account reference (for a team lead)") is a random code. It is not a name and
it does not show an email.

### 2.2 What keeps working when nobody is at the desk

These run on their own, day and night (verified in the code):
- **The word check** (the safety screen, `core/feeling-safety.js`, run on the device and again on the server). Words
  that suggest someone might not be safe are never sent or stored, and the person sees support lines instead. Nobody
  is alerted, and nothing is recorded. It reads English only and it misses many phrasings (`docs/safety/TIER0_SELF_ASSESSMENT.md` §4).
- **Automatic pausing.** A feeling stops being offered, and every hold on it ends, as soon as one person reports it
  as "Someone may be in danger", or two different people report it for any reason (`reportsToPause 2`, `m_report_feeling`).
  It still comes home to its writer when its day is up.
- **A reported feeling leaves the reporter's sky,** and a reported perspective leaves the author's collection, at once.
- **Blocking** works at once, both ways.
- **The Support button** is in the header of every screen. It opens the crisis lines over whatever the person is
  doing, and works offline (`ui/relay/common.js`, `supportPill`, `openSupport`).
- **Every feeling comes home within a day of each trip**, and unsaved words are cleared 30 days after they come home.

**What doesn't happen on its own:** nothing tells anyone that a report has arrived. The desk refreshes every 60
seconds only while it is open and someone is signed in (`staff/desk.js`), and says so: "Nothing alerts anyone when
it’s closed, so check at the set times."

---

## 3. Who monitors reports

### 3.1 The roles

| Role | Name (write it here and in `ESCALATION.md` §2) | What they do |
|---|---|---|
| **Accountable owner** | ________ (Hushmallow's owner) | Runs the business, so carries the legal duties (WHS, privacy, consumer law). Names everyone below. Approves this procedure and the wording in §4. Does the operator tasks: invitations, the away setting, lifting restrictions, suspending. Gets legal advice where this document says so |
| **Safety lead** | ________ | Owns this procedure and `ESCALATION.md`. Decides anything uncertain. Hears about every priority report the same day. Runs debriefs (§10). Checks the activity log weekly. Keeps the rota, the eSafety log and the WHS log. May also be the owner |
| **Desk reader (main)** | ________ | Checks the desk at the set times, reads every open report, decides, records, escalates |
| **Desk reader (backup)** | ________ | Covers the main reader's days off, leave and illness. Reads at the same set times |
| **eSafety and legal contact** | ________ (backup ________) | Checks the contact address every day, including weekends and holidays (§9). May be the safety lead |

**Check times:** ________ and ________ (Sydney time), every day. They are set by the owner, in waking hours (§10),
and about 12 hours apart (for example 8 am and 8 pm), so the team's 12-hour target (§4.2) can be met.

**Minimum staffing.**
- **At least two different people must be able to read the desk.** One person alone isn't enough: nobody would cover
  illness or leave, and nobody could debrief them.
- For the **team-only beta (G2)**, two people is the minimum. The safety lead may also be the backup reader.
- For **testers outside the team (G3)**, three is recommended: two readers, and a safety lead who isn't the main reader.
- Until two names are written above, **nobody is responsible for reading a report**, and the beta shouldn't start
  (`docs/safety/TIER0_SELF_ASSESSMENT.md` §9; `docs/DECISIONS.md` D12).

<!-- [recommended practice] Named accountability and clear roles: Samaritans' platform guidelines (UK charity
guidance, not law; SM-10, SM-11, search extract); eSafety Safety by Design (voluntary). [depends: who staffs the desk,
and in which state] The WHS duties in §10 attach to these roles (SCW-15). -->

### 3.2 Access to the desk

- Each reader has a **separate safety-team account**, with a work email that is not used for a Hushmates member
  account. The desk refuses member accounts (`staff/desk.js`, "This desk is for the safety team").
- The owner makes a moderator invitation: `node server/admin.mjs invite --role moderator`. It works once.
- The desk session lives in that browser tab only, and signs out after 30 minutes without activity.
- **When someone leaves the team:** the owner suspends their account (`node server/admin.mjs member <reference> suspended`),
  which the desk then refuses. **[GAP]** There is no command that removes the moderator role, and the desk doesn't
  show a moderator their own reference, so the owner finds it in the database. Do this on the day they leave.

### 3.3 What desk readers do

**Reading**
- Open the desk at each set time. Read **every** open report, not only the priority ones.
- The queue lists priority reports ("Someone may be in danger") first, then the oldest. A priority report open for
  more than 12 hours is marked **Over 12 hours**: read those first.
- Reports about sexual content that may involve a child are not marked priority by the app. Read every "Sexual
  content" report straight away when you see it (§7.1).
- Read on a computer, in private. Not on a shared screen, and not in a public place.

**Deciding**
- Use the desk's decisions (§8). Take the smallest step that fixes the problem.
- Don't remove a feeling only because it is sad or heavy. Members may share that they're struggling (Community
  Guidelines). Remove things that break the rules.
- **Don't restrict someone because they may be at risk.** Restriction is for breaking the rules. It would cut them
  off and tell them nothing.
- If you can't decide, leave it open, write a note, and ask the safety lead. A priority feeling has already been
  paused, so it isn't travelling while you wait.

**Recording**
- Write a team note with each decision: what you saw, in your own words, and what you did.
- No diagnosis, no guesses about the person's health, and no guesses about who anyone is.
- Never copy reported words anywhere outside the desk: no screenshots, no photos of the screen, no pasting into
  email, chat, documents or AI tools.

**Escalating**
- "Someone may be in danger": follow §6, and tell the safety lead **the same day**.
- Possible child sexual abuse material or terrorist material: §7.1, and tell the safety lead **at once**.
- A member who may be under 18: §7.2.
- Anything you're unsure about: the safety lead.
- If the word check should have caught a feeling's words, add a paraphrase (never their words) to the review list
  (`docs/CRISIS_DETECTION.md` §3, step 5).

**Looking after yourself**
- Keep to the limits in §10. Stop whenever you need to, and hand over.
- Talk to the safety lead after anything that stays with you. Lifeline (13 11 14) and Beyond Blue (1300 22 4636) are
  there any time, for you too.

### 3.4 What nobody on the team ever does

1. **Try to identify a member, or contact them.** That means: no searching the database, no asking an operator for
   an email or to "look up" an account reference, no searching social media, no guessing from the writing, and no
   messages of any kind. The only exception is §6 step 3, which uses information a person gave us directly, never
   something looked up.
2. **Give clinical advice.** No diagnosis, no assessment of risk, no advice about anyone's health or treatment, in
   notes, to members or to each other. Readers aren't counsellors or crisis workers, and Hushmates isn't a health,
   counselling or crisis service.
3. **Promise outcomes.** Not to reporters, members or anyone else. Never "we'll make sure they're okay", "we've
   contacted them", "someone will check on you" or "we're always here".
4. **Talk about reports outside the team**, or keep copies of anything a member wrote.
5. **Read the desk while unwell, impaired or very upset**, or late at night (§10).
6. **Use the desk for anything else**, or read reports about someone you know. If you think you recognise someone,
   stop, hand the report to someone else and tell the safety lead. Don't try to confirm it.

<!-- [needs legal advice] Not contacting or identifying members follows from the privacy design and from the s16A point
in §6.5. [recommended practice] Role limits ("not crisis workers"), no promises: SCW-15, SCW-17, SM-12 as corrected,
TGA-4 (describe the danger path as a moderation priority read by people, not a crisis response). -->

---

## 4. What members are told about response times

### 4.1 The words, exactly as the app says them now

| Where | The words (commit `0037d57`) |
|---|---|
| After a **"Someone may be in danger"** report (`hushmates.expectation`, `supabase/migrations/20261015090000_hushmates_tier0.sql`; the same in `core/relay.js` `_expectation`) | "Thank you for telling us. This goes to the front of the queue for a person on our safety team. We’re a small team and we’re not here around the clock: during the pilot we aim to read priority reports within a day, and nights, weekends and holidays can take longer. We can’t see who wrote it, so we can’t contact them or send help. If you know someone is in danger right now, call 000. If this has stayed with you, Lifeline is there any time on 13 11 14. Nobody is told who reported." |
| After **any other** report (same places) | "Thank you for telling us. A person on our safety team will read it. We’re a small team, not here around the clock: during the pilot we aim to read reports within two days. Nobody is told who reported." |
| After any report **while the desk is marked away** (`hushmates.expectation` only: the lab's in-memory relay has no away setting) | "Thank you for telling us. Our safety team is away until {Tuesday 29 December}, so it will be read when we’re back. We can’t see who wrote it, so we can’t contact them or send help. If someone is in danger right now, call 000. Nobody is told who reported." After a "Someone may be in danger" report, "If this has stayed with you, Lifeline is there any time on 13 11 14." comes before the last sentence. The day is read in Sydney, written `YYYY-MM-DD`; `server/admin.mjs` takes only a real day from today to 90 days ahead |
| After any report **while the desk is marked away, with no day the database can read** (anything else stored in `awayUntil`, such as "29/12/2026", "soon" or a day more than 90 days ahead) | "Thank you for telling us. Our safety team is away for now and may not be able to read it straight away. It will be read when we’re back. We can’t see who wrote it, so we can’t contact them or send help. If someone is in danger right now, call 000. Nobody is told who reported." (with the Lifeline sentence after a priority report, as above). It never falls back to the usual times while someone has marked the desk away |
| The report sheet, before sending (`ui/relay/common.js`, `reportSheet`) | "A person on our safety team reads reports, but not straight away and not around the clock. They can’t see who anyone is, and they can’t contact anyone. Nobody is told who reported. If someone is in danger right now, call 000." |
| The report sheet, when "Someone may be in danger" is chosen | "Our team can’t see who wrote it, so we can’t contact them or send help. If you know someone is in danger right now, call 000." |
| You & safety (`ui/relay/you.js:70`; re-checked at `f8d7e4a`) | "…When something is reported, a person on our small safety team reads it: during the pilot we aim to do that within a day or two, and nights, weekends and holidays can take longer. They aren’t counsellors, and they can’t see who anyone is or contact anyone. If someone is in danger right now, call 000." (At `0037d57` it said "usually within a day or two", with no 000. "Usually" reports a track record there isn't, and broke §4.2; the committed wording fixes it. Keep it, or use `SAFETY_DISCLAIMERS.md` §3.5's shorter form.) |
| The privacy sheet, "Safety" (`ui/relay/parts.js`) | "Reported words are read by people on our small safety team, not around the clock. …" |
| A paused feeling, to its writer (`ui/relay/journeys.js:134`; re-checked at `f8d7e4a`) | "Paused for now. Our safety team will look at it, but they can’t contact you. It still comes home within {time}." |
| Terms of Use and Community Guidelines (drafts) | "During the beta we aim to read priority reports within a day, and others within two days. Nights, weekends and holidays can take longer. That's an aim, not a promise." |

`SAFETY_DISCLAIMERS.md` has the rest of the safety wording, place by place.

### 4.2 The rules for this wording

- **Public aims:** priority reports within a day; others within two days; never around the clock.
- **The team's own targets** (`ESCALATION.md` §2): priority within **12 hours**, the rest within **48 hours**. The
  12 hours is the team's own target. It isn't stated to members. While the repository is public (D19), this document
  and `ESCALATION.md` are publicly readable, so describe 12 hours only as an internal target, never as a commitment
  (SCW-07 as corrected: what is published, here included, is what the consumer-law analysis looks at). The desk marks
  a priority report open past 12 hours as **Over 12 hours** (`staff/desk-guide.js`, `isOverdue`).
- **The aims are true only while §3 is staffed.** With two checks a day, about 12 hours apart, every day, a priority
  report waits at most about 12 hours. If the rota can't keep that up, **change the words first** (in the code and in the drafts,
  together), then the rota. Never leave a promise in the app that the team can't keep.
- **Always "aim", never "will"** for a time. Always next to "call 000". Never "monitor", "watch", "24/7", "always
  here", "check on you" or "someone will contact you".
- **Proposed** (not yet in the app): add "If anyone is in danger right now, call 000." to the ordinary
  acknowledgement, so every statement about the desk sits next to 000 (`SAFETY_DISCLAIMERS.md` §5).

<!-- [depends: whether the rota in §3 is actually staffed] A published aim is a representation about a future matter.
From memory (ACL s4, not seen this run), such a representation is taken to be misleading unless there were
reasonable grounds for it; the prohibition on misleading conduct (ACL s18) binds now (SCW-07 as corrected). ACCC
guidance seen only as a search extract. [needs legal advice] Negligence and reliance (SCW-17, from memory, nothing
searched): promising response times or monitoring increases reliance; honest limits reduce it. [recommended practice]
Publish a realistic target, put 000 and Lifeline beside it, say the same thing everywhere (SM-09, SM-15; Samaritans and
eSafety Safety by Design, search extracts; the Beyond Blue Forums benchmark is a secondary source, one operator's own
practice). -->

---

## 5. When nobody can read the desk

Nights, weekends, holidays, illness, leave, a power or internet outage, or a reader who needs to step away.

### 5.1 What happens on its own

- **The queue waits.** Reports are received and kept. Nothing is lost.
- **The safeguards in §2.2 keep working:** the word check, automatic pausing, reported items leaving the reporter's
  view, blocking, the Support button on every screen, homecoming within a day.
- **Reporters are told honestly** that the team is small and not there around the clock (§4).
- **The app never says that someone is watching.** It says the opposite: "nobody is watching in real time".

### 5.2 What the team does

| How long nobody can read the desk | What happens |
|---|---|
| **A missed check** (up to about 24 hours) | The backup reader takes the check. If neither can, the safety lead does. If a reader falls ill during a shift, they stop and tell the backup or the lead; nobody finishes a shift while unwell |
| **More than 24 hours** | Before it starts, the owner marks the desk away, with the day a reader will next check it: `node server/admin.mjs set desk '{"awayUntil": "YYYY-MM-DD"}'`. Reporters are then told when it will be read (§4.1). The date is read in Sydney time, and the message shows through that whole day |
| **More than 72 hours**, or after any priority report that couldn't be read | The owner also pauses invitations (no new codes; revoke unused ones with `node server/admin.mjs revoke <CODE>`) and tells current testers, in plain words, that the desk is away and when it's back (`ESCALATION.md` §2). **The channel:** for G2, the owner emails team testers personally (as `DATA_BREACH_RESPONSE_PLAN.md` R4 assumes). Before G3 this needs the in-app notice or the email provider (D5) **[GAP]**: there is no in-app notice feature and no sending tool today. The privacy policy ("When you sign in") and the terms (§9) list this as a use of the email address |
| **The reader is back** | The owner clears the setting: `node server/admin.mjs set desk '{"awayUntil": null}'`. The reader reads the oldest priority reports first |

### 5.3 Pausing new feelings while the desk is away

When the desk is away for a long time, people can still release and catch feelings, and nobody reads reports. Samaritans'
guidance suggests closing comments during periods of limited moderation capacity.

- **Today the app has no switch that pauses new feelings.** [GAP]
- **Don't use the rate limits as a pause.** People would see "That’s a lot in a short time. Please pause for a moment.",
  which wouldn't be true.
- **Recommended:** build a "quiet" setting before outside testers (G3). While it's on, Release and Catch would rest,
  with an honest note ("Hushmates is resting until {day}, while our safety team is away. Your feelings that are
  travelling still come home."), and Support stays on every screen.
- **The threshold is the owner's decision.** Recommended: turn it on when the desk will be unread for more than
  **72 hours** in the team beta, and more than **48 hours** once outside testers join.
- Until it's built, the 72-hour step in §5.2 (pause invitations, tell testers) is the only lever.

<!-- [recommended practice] Samaritans, "managing social media locations of concern" (UK guidance, search extract):
close comments when moderation capacity is limited (SM-15). The 72-hour step is ESCALATION.md §2. [depends: desk
staffing] SCW-17 (needs legal advice): a safety function the team has taken on should be run as documented. -->

### 5.4 The stop-gap for alerts

- There are no alerts. Each reader sets a **phone reminder** (an alarm or a calendar entry) for each check time.
- **Recommended:** once an email provider exists (D5), a short email to the rota when a priority report arrives. It
  would contain no words and no account reference: only "A priority report is waiting on the desk."

---

## 6. "Someone may be in danger": the urgent path

### 6.1 What has already happened before a reader sees it

- The reporter was told, at once: we can't see who wrote it, we can't contact them or send help, call 000 if someone
  is in danger right now, and Lifeline is there any time (§4.1).
- **If it's a feeling:** it was paused at once. Nobody else is offered it, and live holds ended. Its writer sees
  "Paused for now. Our safety team will look at it, but they can’t contact you…" with **Get support now** beside it
  (`ui/relay/journeys.js:134-137`, at `f8d7e4a`). The words are
  the same for every pause, so the reason isn't revealed.
- **If it's a perspective:** only a feeling's author can report one, after the feeling is home. It left their
  collection at once. Its writer isn't told.
- It is at the top of the queue, marked **Priority**.

### 6.2 The steps (the same six as `ESCALATION.md` §3 and the desk)

1. **Read the words first.** The desk never shows who anyone is, and it can’t contact anyone.
2. **If it’s a feeling, take it out of circulation** (*Take it out of circulation*) unless it clearly isn’t about
   danger. A “Someone may be in danger” report has already paused it. Nobody else is offered it, and it goes home to
   its writer with whatever came back; they then see "Our safety team brought it home early. Sometimes a feeling needs
   more care than a new way of seeing it. If that’s true for you right now, crisis lines are there any time.", with
   **Get support now** (`ui/relay/returned.js:125, 137`, at `f8d7e4a`). **If it’s a perspective, remove it** (*Remove the perspective*).
3. **If the words point to immediate danger and the team independently holds information that identifies the person**
   (for example, they emailed us directly), **call 000 and give what you know.** This is expected to be very rare:
   the desk shows no identities. See §6.3 and §6.4.
4. **Write what you saw and did in the team notes** (no diagnosis, no guesses about who it is), and **tell the safety
   lead today.** If you can’t decide, ring the safety lead now.
5. **If the screen should have caught these words**, add a paraphrase (never their words) to the review list.
6. **Look after yourself too:** reading this is hard. Talk to the safety lead, or one of the services on the desk.

### 6.3 When 000 is appropriate, and who decides

- **000 is for immediate danger:** someone is about to hurt themselves or someone else, or is being hurt, right now.
  It is the same test the app gives members: "If someone might be about to hurt themselves, or is in danger right
  now… call 000."
- **A call can only help if there is something emergency services can act on:** who the person is, or where they
  are. So step 3 needs **both**: words that point to immediate danger, **and** identifying information the team
  already holds independently, because the person gave it to us directly (for example, they emailed Hushmallow with
  their name or where they are).
- **Who decides:** the reader on the desk, in the moment. **In an immediate emergency, don't wait** for the safety
  lead's approval: call, then tell the lead. If you aren't sure whether it's immediate, or whether what you hold is
  enough, **ring the safety lead now**, and the lead decides.
- **When you call:** say you're calling from an online service, explain what the person wrote, and give the
  identifying information you hold. Share only what's needed. Then write in the team notes that you called and when
  (not the person's details: the safety lead keeps those, §12).
- **When the team holds nothing that identifies the person** (almost always): there is nobody to send help to. Take
  the content out of circulation, write the note, tell the lead. **Don't look for an identity.** The reporter has
  already been told to call 000 if they know the person.
- **What members are told about this.** Member documents describe this rare case only through the privacy policy's
  serious-threat paragraph (`PRIVACY_POLICY.md`, "When the law requires or allows sharing"). The terms and the
  guidelines say the team can't see who anyone is, so it can't contact anyone or send help; they don't say flatly
  that it never calls anyone, and nothing says or implies that it will.

<!-- [needs legal advice] Passing on information a person gave us is a disclosure. Where Hushmallow is bound by the
APPs, the serious-threat permission (Privacy Act 1988 s16A item 1; APP 6.2(c)) can cover it when its tests are met
(§6.5). A lawyer should confirm how it applies, but a genuine, immediate emergency call should never wait for advice.
[recommended practice] Emergency services first when someone is in immediate danger (#chatsafe and Samaritans, guidance,
search extracts; SM-08, SM-12). -->

### 6.4 Why the desk usually can't identify anyone

It is deliberate, and members are told so:
- Feelings and perspectives travel with no name. The word check asks people to take out names, addresses, phone
  numbers and other details.
- The desk shows no name, no email and no location, and never who reported. The account reference is a random code.
- The email address is held by the sign-in service (Supabase Auth), not in Hushmates' own tables, and the desk never
  sees it.
- Words that trip the word check are never stored, so there is nothing to look at later.

An operator with database access could, in principle, link an account reference to its sign-in record and so to an
email. **That is not a feature, and nobody does it for a report** (§6.5).

### 6.5 The account email, and the serious-threat exception **[needs legal advice]**

- The Privacy Act allows an organisation bound by the APPs to use or disclose personal information without consent
  when it is unreasonable or impracticable to get consent, **and** it reasonably believes the use or disclosure is
  necessary to lessen or prevent a serious threat to the life, health or safety of any individual, or to public health
  or safety (s16A item 1, a "permitted general situation"; APP 6.2(c)).
- The OAIC's guidance reads it as five tests: (1) consent is unreasonable or impracticable (urgency, the level of harm,
  the source of the threat, and whether the person can be contacted; not just inconvenience or cost); (2) the belief
  is reasonable; (3) the use or disclosure is necessary; (4) the threat is serious, "one that poses a significant
  danger"; (5) the threat hasn't already passed.
- It is **a permission, not a duty**. Whether it binds Hushmallow at all depends on whether Hushmallow is an APP
  entity, which needs legal advice (small business exemption and the health-service question). The statutory privacy
  tort and state health-records laws may matter either way.

**The rule until legal advice is received and the owner approves a written procedure:**
- **Nobody looks up an account email, or links an account reference to a sign-in record, because of a report.** Not
  the desk, not an operator, not the owner.
- Before that could ever change, all of these must be in place:
  1. a lawyer's advice on whether and how the exception applies to Hushmallow;
  2. Tier A's view on whether it should be done at all;
  3. a written procedure: only the safety lead and the owner together decide, never a reader alone; each of the five
     tests is checked and written down; only the minimum is disclosed (for example, the email, to police or an
     ambulance service); every decision is recorded;
  4. the Privacy Policy and the collection notice updated to say so, before it is used.
- The Privacy Policy draft already describes the permission in general terms and says nobody from Hushmates will
  contact the member about what they wrote or to check on them (`PRIVACY_POLICY.md`, "When the law requires or allows
  sharing"). It must not describe a lookup
  until the steps above are done.

<!-- [needs legal advice] PRV-10 (s16A and APP 6.2(c); OAIC APP Guidelines Chapter C and Chapter 6, official guidance,
seen as search extracts). PRV-01 and PRV-02 (whether Hushmallow is an APP entity). PRV-20 (statutory tort), PRV-17 to
PRV-19 (state health records laws). SM-12: whether to build a controlled route to identity is a privacy-law decision.
docs/safety/TIER0_SELF_ASSESSMENT.md §6.3 and §8 item 9 list this as open. -->

### 6.6 Records for a priority report

In the team note, every time:
- when you read it;
- what you saw, in your own words (no quotes, no diagnosis, no guesses about who);
- what you decided;
- whether 000 was called, by whom and when;
- when you told the safety lead.

The activity log records the opening and the decision on its own.

### 6.7 The safety lead, the same day

- Reads the report and the note.
- Checks the decision, and changes it if needed.
- Calls the reader for a short debrief, about how they are, not about the case (§10).
- Checks whether the word check should have caught it, and that the paraphrase is on the review list.
- If the report was open past 12 hours, writes down why, for the weekly log check.

### 6.8 Edge cases

- **A Mallow line reported as "Someone may be in danger".** The reporter is the feeling's author. Read the feeling's
  words too. The desk can only close a Mallow report; the author was already shown 000 and Lifeline. Tell the safety
  lead, and add the line to the library review if it played a part.
- **A catcher whose own words tripped the word check** never reaches the desk: their words weren't stored, and they
  saw support straight away.
- **Several reports on the same feeling:** each is its own row on the desk, and each needs a decision. The first
  *Take it out of circulation* already covers the feeling; close the others with the same decision and a short note.

---

## 7. Other serious reports

### 7.1 Child sexual abuse material, or terrorist material

The app has no separate reason for these. Members are asked to choose "Sexual content" (Community Guidelines), which
the app does **not** mark as priority.

- **Read every "Sexual content" report as soon as you see it.** If it may involve a child, or it promotes or
  instructs terrorism, treat it as urgent.
- **Don't copy, screenshot, photograph, download, forward or show it to anyone.** Possessing or passing on child
  sexual abuse material is a serious crime (from memory; the lawyer to confirm how it applies to reviewing a report).
- **Take it out of circulation** (a feeling), or **remove** it (a perspective), and **restrict** the account.
- **Tell the safety lead at once,** by phone.
- **The safety lead reports it:** to the Australian Centre to Counter Child Exploitation (ACCCE) for child sexual
  abuse material, to eSafety, and to police. If a child may be in immediate danger, **000**. (The reporting addresses
  are from memory: check them on accce.gov.au and esafety.gov.au before the beta.)
- **Preservation.** A copy of the reported words stays with the report for 90 days after it's decided, or 180 days if
  it's never decided. It is cleared sooner if the writer deletes their data. **[GAP]** There is no "legal hold" to keep
  it longer if police ask. A lawyer should say what is needed before the beta.
- **Record** that it was found, what was done and that it was reported. Never the material.

<!-- [depends: the Online Safety Act category and tier] SCW-03: the Phase 1 Social Media Services Code (class 1A/1B)
includes, for every social media service, notifying appropriate entities when child sexual exploitation or
pro-terror material suggests an immediate threat (eSafety, official text, search extract; the "appropriate entity"
wording was not seen). Whether Hushmates is a social media service needs legal advice (SCW-01). [needs legal advice]
what may be passed on with a report (APP 6.2(b) and (c)), and the legal hold. [recommended practice] A separate
"child safety" report reason, marked priority (owner decision; not built). -->

### 7.2 A member who may be under 18 **[recommended practice; scope needs legal advice]**

Hushmates is for adults (18+). Today there is no age report reason, no message for an under-age member, no review route
for an age decision, and no tool to delete an account for someone [GAP].

- **Danger first.** If the words suggest danger, follow §6. The age question waits.
- **If the words suggest the writer is under 18:** restrict the account (it stops catching, and live holds end). Write
  "age concern" in the team note, and nothing that would identify them. Tell the safety lead the same day.
- **The safety lead and the owner decide** what happens next. Before the beta, they need: a kind message with youth
  support (to check before use: Kids Helpline 1800 55 1800, which serves young people up to 25), a way to ask for a
  review, the chance to download their data, then deletion. Record the decision, not the evidence.
- **Whether the social media minimum age law** (Online Safety Act 2021, Part 4A) **applies to Hushmates needs legal
  advice.** It turns on whether Hushmates is an age-restricted social media platform, including the 2026 additional
  condition and the health-purpose exclusion. If it applies, eSafety's guidance on handling under-16 accounts would
  shape this procedure (deactivation with notice, a review route, no re-declaration, no keeping of age-check data).
  Don't assume either way.

<!-- [recommended practice] U16-12 (a recommended flow; no statutory process found for under-18s on an out-of-scope
service). [needs legal advice] U16-01 to U16-03 (SMMA scope: s63C, s4A, commencement 26 March 2026 per secondary sources only, Rules 2025
s5(1)(f));
[depends: whether in scope] U16-06 and U16-08 (eSafety SMMA Regulatory Guidance, official guidance, search extract). -->

### 7.3 Requests from police, courts and regulators

- Answer only when the law requires it, and only with what is asked for. The owner decides, with legal advice.
- Keep a log of every request: who, when, what was asked, what was given, and the legal basis.
- eSafety notices follow §9.

<!-- [depends: the request] APP 6.2(b) (required or authorised by law, from memory); PRIVACY_POLICY.md "When the law
requires or allows sharing"; PRV-10's note that law-enforcement requests are answered only on a legal requirement and
logged ([recommended practice] for the log). -->

---

## 8. Ordinary reports

| Kind | Usual decision (`ESCALATION.md` §4) |
|---|---|
| Unkind, harassment or hate | Remove it. Restrict the account after a second actioned report |
| Personal details | Remove it |
| Sexual content, spam, scams | Remove it, and restrict the account (but see §7.1 first) |
| A perspective that encourages self-harm or suicide | Remove it, and restrict the account |
| A Mallow perspective | *Close: noted for the library.* Write down what missed, so the line can be fixed or retired |
| Something else | Read it, decide by the Community Guidelines, ask the safety lead if unsure |
| Breaks no rule | *Let it carry on* (a feeling) or *No action needed* (a perspective) |

**After a restriction:** when the person tries to catch, they see "Our safety team has paused catching for your
account for now. Feelings you already released still come home to you."; on Release, "Your account can’t release
feelings right now." They aren't told why, and there is no review route or support line in those messages yet [GAP]
(proposed wording: `SAFETY_DISCLAIMERS.md` §3.6). Review requests go to the contact address in the Terms of Use, once it exists (D23). A different person
from the one who decided looks at a review where possible. Only a team lead lifts a restriction.

<!-- [recommended practice] Suspension a last resort; explain, signpost and offer an appeal (Samaritans and eSafety
Safety by Design, search extracts; SM-13). [depends: whether a contract exists and its terms] unfair contract terms for
suspension (SCW-08). [needs legal advice] SCW-04: the Phase 2 Age-Restricted Material codes; the terms prohibit
material that encourages, promotes or instructs suicide, self-harm or eating disorders. -->

---

## 9. Notices from eSafety

- **A monitored contact address**, not for emergencies: **[contact address, to be set up (D23)]**. It is published in
  the Terms of Use and on the contact page.
- **A named person checks it every day, including weekends and holidays:** the eSafety and legal contact in §3.1.
- **When a notice arrives:**
  1. Write it in the eSafety log: when it arrived, what kind of notice it is, what it asks for, and the deadline.
     Treat a removal notice as due **24 hours** from when it arrived, unless the notice gives longer.
  2. Phone the safety lead and the owner straight away, whatever the day.
  3. Find the material. If it was reported, it's on the desk. **[GAP]** There is no tool to find something that
     wasn't reported, and the desk can't browse. The owner needs a tested way to find a feeling or perspective from
     the words a notice quotes before outside testers join (for example, matching the keyed hash the database already
     keeps for duplicate checks, which works only for the exact words).
  4. Remove or disable it: take a feeling out of circulation, remove a perspective, restrict or suspend the account.
  5. If the material is already gone (its day ended, its words were cleared, or its writer deleted it), say so.
  6. Reply to eSafety in writing, before the deadline, with what was done and when.
  7. Keep the log, and the reply, for at least two years after the end of the calendar year.
- **Practise it once** before outside testers join, with a made-up notice.
- **Reporting notices** under the Basic Online Safety Expectations are answered by the date they give.

<!-- [depends: a notice being received, and the Online Safety Act category] SCW-06. eSafety's Online Safety Act fact
sheet (official guidance, search extract) says the Act "halves the time" to respond to a removal notice; the 24-hour
figure, ss 88 and 109 and the penalties were not seen (from memory). The Online Safety Act 2021 compilation of
12 September 2026 on legislation.gov.au was seen only as a search extract. BOSE guidance (February 2026, search extract):
responding to a reporting notice is enforceable with civil penalties. [depends: whether the DIS Standard applies]
records kept at least 2 years after the end of the calendar year (SCW-02, official text, search extract); keeping the
log that long is [recommended practice] otherwise. -->

---

## 10. Looking after the people who read the desk

### 10.1 Why

Desk readers may read words about danger, self-harm, abuse or violence. They can't help the person, and they may
think about it afterwards. Those are psychosocial hazards.

<!-- [depends: who reads the desk besides the owner, and in which state] A business that runs Hushmallow is a PCBU
(person conducting a business or undertaking). It must ensure, so far as reasonably practicable, the health and safety
of its workers, including psychological health, and "worker" includes volunteers (Safe Work Australia, "Duties of a
PCBU", official guidance, search extract; s19 of the model WHS Act from memory). If only the owner reads the desk, the
self-employed person's duty applies instead (from memory). Victoria has its own law, the Occupational Health and Safety
Act 2004 (from memory). The model WHS Regulations define a psychosocial hazard and require controls chosen with "the
duration, frequency and severity of the exposure" in mind (r55D, quoted in Safe Work Australia's Code of Practice on
sexual and gender-based harassment, search extract). The model Code of Practice "Managing psychosocial hazards at work"
(Safe Work Australia, July 2022, search extract) is an approved code and evidence of what is known about hazards and
controls. Whether each state has adopted r55A-55D was not verified. SCW-15, SCW-16. -->

### 10.2 The controls

| Hazard | Control | Status |
|---|---|---|
| Exposure to distressing words | The word check holds back crisis words, so the desk sees fewer. The queue shows only the kind and reason, not the words, until a report is opened | Built |
| Too much at once | **At most two desk sittings a day per reader, at the set times, each normally no longer than 45 minutes.** After a priority report, take a break before reading on | Recommended |
| The same person carrying it every day | **Rotation:** the two readers alternate (for example, week about), and nobody is the main reader for more than **[7]** days in a row. Priority reports are shared, not always one person's | Recommended |
| Being alone with it | **A debrief the same day** after every priority report (a short call with the safety lead, about how the reader is). **A monthly check-in** on how the team is coping | Recommended (the same-day call is `ESCALATION.md` §3 step 4) |
| No way out | **Anyone can step out** of a report, a sitting or the role, at any time, without giving a reason and without any consequence. They hand over to the backup or the lead. If nobody can take over, the owner marks the desk away (§5) | Recommended |
| After-hours worry | **No after-hours expectation.** Check times are in waking hours. Nobody reads the desk between 10 pm and 7 am, or in bed on a phone. Nobody is expected to think about the desk between checks | Recommended |
| Responsibility without control | **A written role limit:** "You read words and make content decisions. You're not a counsellor or a crisis worker, and you can't help the person directly." The limits in §3.4 | This document |
| Support | Lifeline 13 11 14 and Beyond Blue 1300 22 4636, any time; the reader's own GP. Hushmallow has no employee assistance programme today. **Owner's choice:** offer to pay for a few sessions with a psychologist after a hard report | Recommended; cost needs approval |
| Seeing the words before choosing to | **Show priority words only after a click** ("Show the words"), so a reader can prepare | Not built [GAP] |
| Not noticing harm building up | **Incidents:** a reader tells the lead about any report that stayed with them. The lead writes it in the WHS log (with no member details) and reviews these controls | Recommended |

### 10.3 Written records the owner keeps

- **A one-page psychosocial risk assessment for the desk role** (`docs/DECISIONS.md` D6a says the owner writes it):
  the hazards above, who is exposed, the controls, and the review date. It refers to the Code of Practice.
  Review it after every incident and at each review in §13.
- **A short volunteer agreement** for any unpaid helper, recording the role, its limits, the support available, and
  that the WHS duty covers them.
- **The WHS log:** incidents and debriefs, with dates and no member details.

<!-- [depends: who staffs the desk, and in which state] SCW-15 and SCW-16: "a written psychosocial risk assessment for
the desk role, with its controls, a review after each incident"; "a volunteer agreement for unpaid helpers". The
specific numbers (two sittings, 45 minutes, 7 days, 10 pm to 7 am) are [recommended practice]: starting points for the
owner and Tier A, not legal limits. [recommended practice] Samaritans: human moderators need training and support for
their wellbeing (SM-10, search extract). -->

---

## 11. Training to consider

Nothing has been bought. Moderator training is deferred (`docs/DECISIONS.md` D6b), and no spend on training is
authorised.

**Free, before anyone reads the desk (required by this procedure):**
- Read this document, `ESCALATION.md`, the desk guide, the Community Guidelines and `SAFETY_DISCLAIMERS.md`.
- A walk-through of the desk on the local stack or on staging, with made-up reports only (never real people's words):
  an ordinary report, a priority report, the "Over 12 hours" badge, a team note, and the away setting.
- A practice run of §6 with the safety lead, including the decision about 000.
- The safety lead signs off each reader before they start.

**Paid options for the owner to consider later (not researched in depth, not purchased):**
- **LivingWorks Start**, about 90 minutes online, listed in `docs/DECISIONS.md` D6b at about A$40 plus tax per person
  (price not re-checked).
- A mental health first aid course for workplaces (from memory; check the providers and prices).
- Training on vicarious trauma for people who review distressing content (not researched).
- Whatever the Tier A reviewer recommends.

**Refreshers:** whenever this procedure changes, and once a year.

<!-- [recommended practice] Samaritans: high-quality training and support for human moderators (SM-10, search extract).
SCW-15: training as part of the desk WHS procedure. No source here makes any particular course a legal requirement. -->

---

## 12. Records

| Record | Where | Kept for | Notes |
|---|---|---|---|
| The activity log (reports opened, decisions, log views) | The desk, automatic | 365 days | Accounts by reference only |
| Team notes | The desk, encrypted | **No limit today** [GAP] | Every moderator who opens the report sees them. A retention rule is needed |
| Report evidence (copies of the words) | The database, encrypted | 90 days after a decision; 180 days if never decided | Cleared sooner if the writer deletes their data |
| The rota and check times | This document and `ESCALATION.md` | Current | |
| The eSafety and legal-request log | Kept by the eSafety and legal contact, outside the app | At least 2 years after the end of the calendar year | No member's words |
| Details of a 000 call (what was passed on) | The safety lead only | Until legal advice says otherwise | Minimum detail |
| The WHS log and risk assessment | The owner | As the owner's records | No member details |
| Monthly numbers (§13) | The safety lead | Ongoing | Counts only |

**What a note must never contain:** a diagnosis, a guess about anyone's health or who they are, or the member's
words copied out. **Nothing about members is kept outside the desk**, except the minimum in the eSafety log and the
safety lead's record of a 000 call.

<!-- [recommended practice] Record decisions, not evidence (U16-08, U16-12); follow the documented procedures and record
decisions (SCW-17, needs legal advice for the negligence question). [depends: APP entity status] APP 11.2 destruction
or de-identification when no longer needed (PRV-13): the indefinite team notes are a gap. -->

---

## 13. Review

**When:**
- after the beta's first month (`ESCALATION.md` §6);
- then every three months;
- and straight away after any of these:
  - a priority report that went past 12 hours;
  - any 000 call;
  - any eSafety notice or police request;
  - any child sexual abuse or terrorist material;
  - a reader who was harmed or very upset;
  - a change to the staffing;
  - a change to reporting, the word check, matching, or the app's features (images, links, messages or open sign-up
    would change the risks, and the Online Safety risk assessment too);
  - legal advice or the Tier A review arriving;
  - before outside testers (G3) and before a public launch (G4).

**What the safety lead looks at (with the Tier A reviewer once engaged):**
- the number of reports, and of priority reports;
- how long each priority report waited, and every one past 12 hours;
- any missed crisis words found;
- how the desk team is coping;
- whether the wording in §4 is still true for the rota;
- whether the support numbers are still right (check each service's own website every three months).

**Who approves changes:** the owner. A change to §4's wording changes the app's code and the drafts at the same time.

---

## 14. Open items for the owner

| Item | Why | Status |
|---|---|---|
| Names for §3.1 and check times | Nobody is responsible for reading a report until then | ⛔ Before the team beta (D12) |
| A contact address that isn't for emergencies | eSafety notices, reviews, privacy requests | ⛔ Before outside testers (D23) |
| The one-page WHS assessment and a volunteer agreement | §10 | ⛔ Before outside testers |
| Legal advice: the account email and s16A; what may be passed on with child abuse material; the Online Safety category; the under-16 law; negligence | §6.5, §7, §9 | ⛔ Before outside testers |
| Tier A review of this procedure | `docs/REVIEWS.md` | ⏸ Quotes ready |
| A "quiet" setting that pauses new feelings while the desk is away | §5.3 | Recommended before outside testers |
| A priority email to the rota | §5.4 | Needs an email provider (D5) |
| A restriction message with a reason in general terms, a review route and support lines | §8 | Recommended |
| A "child safety" report reason, marked priority; an "under 18" reason | §7 | Recommended |
| A legal hold on report evidence | §7.1 | Ask the lawyer |
| A tool to find content named in a notice, and an operator deletion tool | §9, §7.2 | Before outside testers |
| A retention rule for team notes | §12 | Recommended |
| "Show the words" on priority reports | §10 | Recommended |
| A command that removes the moderator role | §3.2 | Recommended |

---

## 15. Sources

Official sources were **not opened directly**: this environment can't reach legislation.gov.au, oaic.gov.au,
esafety.gov.au or safeworkaustralia.gov.au. Each was seen **only as a search-tool extract** of the official page,
which mixes quotation and paraphrase. Points marked "from memory" were not seen at all. Before relying on any of this,
the lawyer should read the primary text.

**Law and official guidance (search extracts only)**
- Privacy Act 1988 (Cth) s16A item 1 and APP 6.2(c): OAIC, *APP Guidelines*, Chapter C (permitted general situations),
  https://www.oaic.gov.au/privacy/australian-privacy-principles/australian-privacy-principles-guidelines/chapter-c-permitted-general-situations ;
  Chapter 6, https://www.oaic.gov.au/privacy/australian-privacy-principles/australian-privacy-principles-guidelines/chapter-6-app-6-use-or-disclosure-of-personal-information
- Online Safety Act 2021 (Cth), compilation of 12 September 2026,
  https://www.legislation.gov.au/C2021A00076/2026-09-12/2026-09-12/text/original/epub/OEBPS/document_1/document_1.html
  (ss 88 and 109, removal notices, not seen).
- eSafety, *What is the Online Safety Act 2021?* fact sheet,
  https://www.esafety.gov.au/sites/default/files/2021-07/Online%20Safety%20Act%20-%20Fact%20sheet.pdf
- eSafety, *Basic Online Safety Expectations: regulatory guidance* (February 2026),
  https://www.esafety.gov.au/sites/default/files/2026-02/Basic-Online-Safety-Expectations-regulatory-guidance-February-2026.pdf
- eSafety, Social Media Services Online Safety Code (Class 1A and 1B), Schedule 1,
  https://www.esafety.gov.au/sites/default/files/2023-06/Schedule-1%E2%80%93Social-Media-Services-Online-Safety-Code-(Class-1A-and-Class-1B-Material).pdf ;
  DIS Standard fact sheet, https://www.esafety.gov.au/sites/default/files/2024-06/Fact-sheet-registration-DIS-Standard.pdf
- eSafety, *Social Media Minimum Age Regulatory Guidance*,
  https://www.esafety.gov.au/sites/default/files/2025-09/eSafety-SMMA-Regulatory-Guidance.pdf
- eSafety, *Safety by Design* principles (voluntary),
  https://www.esafety.gov.au/sites/default/files/2019-10/SBD%20-%20%20Principles.pdf
- Safe Work Australia, *Duties of a PCBU*,
  https://www.safeworkaustralia.gov.au/law-and-regulation/duties-under-whs-laws/duties-pcbu
- Safe Work Australia, model Code of Practice *Managing psychosocial hazards at work* (2022),
  https://www.safeworkaustralia.gov.au/sites/default/files/2022-08/model_code_of_practice_-_managing_psychosocial_hazards_at_work_25082022_0.pdf ;
  model Code of Practice *Sexual and gender-based harassment* (quoting r55D),
  https://www.safeworkaustralia.gov.au/sites/default/files/2023-12/model_code_of_practice_-_sexual_and_gender-based_harassment.pdf
- ACCC guidance on misleading claims (the ACL text itself was not seen):
  https://www.accc.gov.au/consumers/buying-products-and-services/contracts

**Guidance that is not law (search extracts)**
- Samaritans (UK), *Guidelines for sites and platforms hosting user-generated content*,
  https://media.samaritans.org/documents/Online_Harms_guidelines_FINAL_1.pdf , and *Managing social media locations of
  concern*, https://www.samaritans.org/about-samaritans/research-policy/internet-suicide/managing-social-media-locations-of-concern/
- Orygen, #chatsafe, https://www.orygen.org.au/chatsafe/talking
- Beyond Blue Forums, *How are my posts moderated?* (a secondary source: one operator's own practice, used only as a
  benchmark), https://forums.beyondblue.org.au/t5/custom/page/page-id/How-are-my-posts-moderated

**Project documents and code:** `docs/ESCALATION.md`, `staff/desk-guide.js`, `staff/desk.js`,
`supabase/migrations/20261015090000_hushmates_tier0.sql`, `supabase/migrations/20261014090100_hushmates_rules.sql`,
`core/relay.js`, `core/feeling-safety.js`, `ui/relay/common.js`, `server/admin.mjs`,
`docs/safety/TIER0_SELF_ASSESSMENT.md`, `docs/DECISIONS.md`, `docs/CRISIS_DETECTION.md`, and the drafts in
`docs/legal/`.
