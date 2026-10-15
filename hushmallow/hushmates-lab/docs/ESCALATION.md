# Hushmates · Safety desk escalation procedure (beta draft)

**Status: a working draft for the private beta, written by the developer. It is
operational, not clinical advice.** It describes what the desk can and can't do
and what the team does with a report that someone may be in danger.
⚠️ **Independent review: OUTSTANDING.** It is in the scope of the smallest
review proposed in `REVIEWS.md` §5.2.

## 1. What the desk can and can't do

| It can | It can't |
|---|---|
| Read reported words, and the pattern of earlier reports about the same (unnamed) account | See anyone's name, email or location; contact anyone; know who reported |
| Take a feeling out of circulation; remove a perspective; restrict an account | Undo something already read; recall a picture someone already made |
| Write team notes; see the activity log | Call anyone on a person's behalf (Hushmates holds an email address only, and the desk never sees it) |

People are told this before they share: Hushmates isn't an emergency service,
and *Get support now* is on every screen.

## 2. Who, and when

- **Beta desk hours:** one named person checks the desk **every day, morning and evening, at fixed times** (at least twice in 24 hours). A second named person covers days off. Write both names here before the beta: ________ / ________.
- **Check times:** set by the owner before the beta: ________ and ________ (Sydney time).
- **There are no alerts.** Hushmates has no alerts today: the desk only refreshes while it's open and someone is signed in, and nothing tells anyone that a report has come in. That's why the readers check at the fixed times. A twice-daily phone reminder (an alarm or a calendar entry) is the free stop-gap.
- **The safety lead:** decides anything uncertain, owns this procedure, and checks the activity log weekly. Name: ________.
- **Target times (the team's own):**
  - priority reports ("Someone may be in danger"): looked at within **12 hours**. One still open after 12 hours is marked *Over 12 hours* on the desk;
  - everything else: within **48 hours**.

  These are realistic targets for a small beta. Review them with the independent reviewer (`REVIEWS.md`).
- **What the app tells reporters:** after a report, the app says:
  - the team is small and isn't there around the clock;
  - during the pilot we aim to read priority reports within a day, and nights, weekends and holidays can take longer;
  - other reports: within two days;
  - it can't see who wrote it, so it can't contact them or send help.

  The 12-hour target is the team's own, tighter than what reporters are told. It isn't promised to anyone.

### When nobody can read the desk

- If no reader can check the desk for **more than 24 hours** (holidays, illness), the owner marks it away first, with the day a reader will next check it:

  ```
  node server/admin.mjs set desk '{"awayUntil": "YYYY-MM-DD"}'
  ```

  Reporters are then told when it will be read. The app says "Our safety team is away until {day}…" instead of the usual times.
- If it will be **more than 72 hours**, or after any priority report that can't be read, the owner also:
  - pauses invitations (no new codes; revoke unused ones with `node server/admin.mjs revoke <CODE>`);
  - tells current testers.
- When a reader is back, the owner sets it back:

  ```
  node server/admin.mjs set desk '{"awayUntil": null}'
  ```

## 3. A report that someone may be in danger

These go to the top of the queue, marked *Priority*. In order:

1. **Read the words first.** The desk never shows who anyone is, and it can't contact anyone.
2. **If it's a feeling, take it out of circulation** (*Take it out of circulation*) unless it clearly isn't about danger. A "Someone may be in danger" report usually pauses it, but not always (a second report from the same person doesn't): check, and take it out of circulation if it's still travelling. Nobody else is offered it, and it goes home to its writer with whatever came back. **If it's a perspective, remove it** (*Remove the perspective*).
3. **If the words point to immediate danger AND the team independently holds information that identifies the person** (for example, they emailed us directly), call **000** and give what you know. This is expected to be very rare: the desk shows no identities.
4. **Write what you saw and did in the team notes** (no diagnosis, no guesses about who it is), and **tell the safety lead today**. If you can't decide, ring the safety lead now.
5. **If the screen should have caught these words**, add a paraphrase (never their words) to the review list for the next batch (`CRISIS_DETECTION.md` §3, step 5). The words should have been answered with support when they were written.
6. **Look after yourself too:** reading this is hard.
   - talk to the safety lead, or one of the services below;
   - Lifeline 13 11 14 and Beyond Blue 1300 22 4636 are there any time;
   - nobody reads the desk alone for long stretches.

The desk shows these same steps (`staff/desk-guide.js`), with the national lines:
000, Lifeline 13 11 14, Suicide Call Back Service 1300 659 467, Beyond Blue
1300 22 4636, 13YARN 13 92 76 and 1800RESPECT 1800 737 732.

## 4. Other reports

| Kind | Usual decision |
|---|---|
| Unkind, harassment or hate | Remove it; restrict the account after a second actioned report |
| Personal details | Remove it |
| Sexual content, spam, scams | Remove it; restrict the account |
| A Mallow perspective | *Close: noted for the library*. Write down what missed, so the line can be fixed or retired |

## 5. Records and privacy

- The activity log records each report opened and each decision, never anyone's words.
- Team notes are for the desk only. Write what you saw and did, never a diagnosis or a guess about a person.
- Retention clears report evidence after a decision (90 days), or after 180 days for a report nobody decided (`READINESS.md`).

## 6. After the beta's first month

The safety lead and the independent reviewer look at:
- the number of priority reports;
- how long each took;
- any missed crisis words;
- how the desk team is coping.

This procedure is then revised.
