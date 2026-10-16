# Workstream `belief-mallows`: Belief Mallows in Another Angle (on this phone only)

Owner approved, 15 Oct 2026. Branch `claude/hm-belief-mallows`. Brief: REDESIGN_BRIEF §5 ("Introduce Belief Mallows").

## What it is

This is an authored, optional look at "a story that keeps coming back", inside Another Angle (hushmallow Beyond). It reuses the existing Belief Mallow model (`src/mallows/thought/belief.js`), its renderer, `ThoughtLayer` and the props.

1. **Entry.** Another Angle's invitation gains one answer: "A story that keeps coming back".
   - It opens the compact input in belief mode. The prompt is "What's the story that keeps coming back?" and the note says "Your words stay on this phone." (never the server clause).
   - If Belief Mallows are kept on this phone, it first asks: "Which story would you like to look at?". The answers are the kept ones, "Something new" and "Not now".
   - After an angle, the end choice gains "This one keeps coming back". It offers their own recent words from this visit, by their tap, and never heavy ones (`offerable`).
2. **Safety first, exactly as a Tell.**
   - Typed belief words are read by the compact input like any Tell. Crisis words bring urgent support at once.
   - Tapped words (recent or kept) go through Another Angle's own `afterTell`.
   - So these all route before anything plays, exactly as for a Tell: the risk screener, the lexicon (and its misspelling pass), the grief and backstop readings, care/crisis, the gentle loss path, the check-in, and an earlier "Not really".
   - Then comes the one question, in belief words: "Shall we look at how this story sits with you, or just be with it?" It has the same three equal answers ("Look at it together", "Just be with it", "I'm not okay"), the same clock, Back and Support pill. For check-in words, "Before we go on — are you okay right now?" replaces it, with "I'm okay — let's look at it" as its first answer.
   - A Belief Mallow plays only where a Tell would have reached an angle.
   - If crisis or care is seen at any moment, the stage ends at once (`endMechanic(true)`; `S.seq` moves on). Nothing is kept.
3. **The Belief Mallow.** The person picks what it carries: a heavy stone, a shell, a tangled thread, or a charm it holds onto. Then they choose any of these short experiences, in any order. "That's enough" is always one tap away.
   - **See how it shapes things.** Everyday moments ("No reply yet", "A small mistake", "A kind word", "Someone goes quiet") wait at the side. A tap or a drag sends one past. A heavy belief pulls it in and it rests against it ("That one leaned toward it."). Once the belief is loosened, moments curve past instead.
   - **Loosen its hold.** Squeeze, stroke, stretch or carry it (or use the assist pill). The prop gets lighter: the stone is set down beside it, the shell swings open, the thread loosens, the charm lightens. Nothing is ever removed.
   - **Give it some room.** A finger resting on the space around it grows a calm ring. The belief settles farther off, smaller in the sky: "It's still here. It just isn't the whole sky any more."
   - **Get to know it.** "What do you think it's been trying to do for you?" Answers: keep me safe / keep me going / keep things familiar / not sure. Each is met as it is.
   - **How it sits now.** "How does it sit with you now?" Every answer is fine.
   - **What next.** The person chooses:
     - "Keep it on this phone"
     - "Look at it from another angle": Another Angle's own path, with its own question, consent and server rules. No new server path.
     - "Finish", which says "Okay. It's not kept anywhere." if it wasn't kept.
     - "Delete it from this phone", for a kept one.
4. **Copy rules** (enforced by test):
   - Never a verdict ("wrong", "irrational", "distortion"…), a diagnosis, evidence weighing or a reframe. Those stay Another Angle's own.
   - No "should" or "must", nothing playful, no "!".
   - Zuzu keeps its attentive face throughout (the care mix, never the grin). The Support pill stays in the dock throughout.
5. **Privacy.**
   - The words are never sent from here: no fetch in `src/beyond/belief`, and the request log was clean in every browser run.
   - By default they live only in the visit's memory.
   - "Keep it on this phone" stores `{id, text, prop, explored, room, understood, kept: date}` (at most 3) under `beyond.belief.kept` in `app.store`. That store is this phone only, and is never synced, because the sync carries only its own listed keys.
   - It is deleted by its own "Delete it from this phone", by Settings → "Delete everything", and (after integration step 2 below) by the Another Angle delete row.
6. **Gate.**
   - `LIVE_FEATURES.beliefMallows` stays **false** in this branch, and the plans line stays hidden with it.
   - For review, the development host only (localhost / 127.0.0.1) can switch it on for one page load with `?beliefMallows=1`.
   - Beyond (`ultra`) is required either way.

## Files

- New: `src/beyond/belief/`
  - `lines.js`: the authored words
  - `store.js`: keep, validate, delete
  - `gate.js`: the switch
  - `stage.js`: the tactile stage on its own ThoughtLayer, drawn in Another Angle's canvas with a mechanic's shape
  - `hook.js`: the flow and the seams
- New: `tests/belief-mallows.test.mjs` (Node) and `tests/belief-mallows.probe.cjs` (Playwright; scenarios flow, crisis, care, check, notokay, wipe, off).
- `src/app/entitlements.js`: only the comment on the flag. The flag and the plan line are unchanged.
- `src/beyond/another-angle.js`: the entry hook, 10 lines (6 code lines and 1 comment added, 3 changed):
  ```js
  import { createBeliefHook } from './belief/hook.js';                                        // imports
  // (belief-mallows) Belief Mallows: … (src/beyond/belief/hook.js)                            // after careFace
  const belief = createBeliefHook({ app, S, root, say, choose, careFace, announce: announceSoon, dockShow, layout, measureBand, endMechanic, openTell, afterTell, startAngle, finish, rectOf,
    get: () => ({ g, area, zAd }), setMech: (m) => { mech = m; mechId = m ? 'belief' : null; } });
  options.push(...belief.inviteOptions());                                                  // invite(), after the share option
  photos: false, privacyNote: serverMode() ? SERVER_CLAUSE : null, ...belief.tell(),        // openTellNow(), in openInput's options
  const q = belief.question(kind) || FIRST_QUESTION[kind];                                  // askFirst()
  if (belief.active()) return belief.play();                                                // startAngle(), right after the question block, before `const seq = ++S.seq;`
  const opts = [...END.options.filter((o) => o.value !== 'keep' || !S.kept), ...belief.endOptions()];   // endChoice()
  belief.leave();                                                                           // view.leave(), after S.seq++
  ```

## Integration (coordinator)

1. **Switch it on.** In `src/app/entitlements.js`, set `LIVE_FEATURES = Object.freeze({ beliefMallows: true })`. The plans line appears with it, and `tests/brand.test.mjs` already expects it. Then update `tests/belief-mallows.test.mjs`: change the "off in the committed build" test's `assert.equal(LIVE_FEATURES.beliefMallows, false…)` and the `doesNotMatch` plans line to the on state.
2. **The Another Angle delete row** (`src/beyond/consent.js`, not owned here). The test for this is `todo` until it lands.
   ```diff
   -export const ANGLE_EXTRA_KEYS = Object.freeze(['ultra.sealedPredictions']);
   +export const ANGLE_EXTRA_KEYS = Object.freeze(['ultra.sealedPredictions', 'beyond.belief.kept']);
   ```
   In its delete sheet copy, change "…your feedback and any predictions you sealed." to "…your feedback, any predictions you sealed and any Belief Mallows you kept."
3. **Optional copy** (`src/app/scenes/settings.js`, Delete everything body). Change "favourites, history, sealed predictions, Memory Garden, …" to "favourites, history, sealed predictions, kept Belief Mallows, Memory Garden, …". `clearAll()` already removes the key.
4. **Merging with other branches editing `another-angle.js`.** Keep the 9 lines above. The one that matters for safety is `if (belief.active()) return belief.play();`. It must stay after every route in `startAngle` (gentle loss, "Not really", the check-in and the question) and before anything is spawned or sent. A test asserts that order.

## Verification

- **Unit tests.** `node --test hushmallow/tests/belief-mallows.test.mjs`: 20 pass, 1 todo. The todo is the Another Angle delete row, which waits for integration step 2. The tests cover:
  - the copy rules;
  - the store: validation, the cap of 3, delete, clearAll;
  - the switch;
  - the belief question's equal answers;
  - recent-word filtering;
  - the flow with a mocked host (crisis or care mid-flow, keep and finish, the hand-over to Another Angle, a kept belief revisited and deleted);
  - the hook's placement after every safety route in `startAngle` and `afterTell`;
  - no network or storage APIs anywhere in `src/beyond/belief`;
  - the pull physics for each prop.
- **Whole suite.** `node --test hushmallow/tests/*.test.mjs`: 1128 tests, 1127 pass, 0 fail, 1 todo.
- **Chromium probe** (`tests/belief-mallows.probe.cjs`, CDP touch, SwiftShader). All passing, with a clean request log in every run: only GETs of the app's own files, and never the words.
  - **Flow, end to end** (invite, belief Tell, question or check-in, prop, shape, loosen, room, get to know it, how it sits, keep, finish, revisit, delete): 390x844, 390x844 with reduced motion, 360x780, 320x568 at the largest text, the same with reduced motion, and 390x844 at 4x CPU throttle.
  - **Crisis words**: urgent sheet, no question, no Belief Mallow. Run at 390x844 and 320x568 largest.
  - **Care words**: care lines, Support, no question. Run at 390x844 and 320x568 largest.
  - **Check-in words, then "Not really"**: support first, no Belief Mallow. Run at 390x844 and 390x844 with reduced motion.
  - **"I'm not okay"**: support first. Run at 390x844, 360x780 and 320x568 largest.
  - **Keep, then Settings → Delete everything**: the record is gone. Run at 390x844 and 320x568 largest.
  - **Committed default** (no `?beliefMallows=1`): no belief answer.
  - **Tap targets**: every tapped chip and pill measured at least 44 px.
- **Frame times.** SwiftShader renders everything on the CPU here, so whole-page numbers mostly measure the rasteriser.
  - At 4x CPU throttle: invite baseline p50 183 ms / p95 253 ms; with the Belief stage up, p50 150 ms / p95 533 ms.
  - The Belief stage's own frame (its ThoughtLayer, moments, ring and checks), measured in place at 4x: p50 3.3 ms, p95 6.8 ms.
- **Screenshot notes.**
  - 390x844: the belief sits clear of Zuzu, and its words plate sits clear of the subtitles. Moments rest against the heavy stone. Loosened, the stone sits beside it, and the room ring is subtle and dashed.
  - 320x568 at the largest text: Zuzu sits small in the corner. The moment label waits on the left, clear of the belief, which moves right of centre for "See how it shapes things". Where three rows of chips would cover the words plate, the words fade out while the choice is up and return once it is answered. The source chooser shows Zuzu's attentive face and the Support pill.
  - The probe photographs a few subtitle lines mid-transition (soft blur). That is the subtitles' own fade, not a fault.

## Independent review

An adversarial subagent reviewed the first commit (9328e86). Its verdict: "safe and private as built, but not ready to ship" until finding 1 (High) and finding 2 (Medium) were fixed, ideally with finding 3 too. Everything below is fixed in fae9bc6.

1. **High: experience chips covered the belief's words at 320x568 with the largest text.**
   - The band now makes room for the tallest chip set wherever that still leaves 470 px.
   - Elsewhere, the stage fades the words out only while chips or a line actually overlap them.
   - The probe now checks for overlap while chips are up.
2. **Medium: the source chooser could drop the very recent words it was opened for.** Recent words now come first, and kept beliefs are trimmed to fit.
3. **Medium: focus fell to the page when an experience started.** The assist pill now takes a lost focus.
4. **Low: a finger resting on the words opened the reader instead of growing the room.** The words plate now lets the touch through during "Give it some room".
5. **Low: room and moment speed depended on the frame rate.** Room is counted in real time, and the moments' time step can reach 0.1 s.
6. **Low: belief mode was lost when the question was let go.** It is now kept for the next Tell when the belief's words are kept.
7. **Low: the words plate popped at the hand-over to Another Angle.** It now fades out first.
8. **Low: the source chooser showed Zuzu's grin and no Support pill.** It now shows the attentive face and the Support pill.
9. **Low: a recent Tell was pushed twice into the screener's history.** The duplicate is removed.
10. **Low: the delete line was said even when the delete failed.** The result is checked, and a failure line is said instead.
11. **Low: a stale stage could be reused.** The stage is reset before mounting.
12. **Low: a kept stone replayed being set down.** A kept stone now comes back already set down.

Low 13 (per-frame allocation) was measured rather than changed: the stage costs 3.3 ms p50 at 4x throttle.

Re-check after the fixes: **Verdict: nothing Medium or worse remains.**

- Findings 1, 2 and 3 are confirmed fixed, in the browser at 320x568 with the largest text and in the reviewer's simulation.
- Low 9 (whitespace in the history dedupe) was also fixed afterwards.

Two design notes remain:

- On a small phone at the largest text size, the belief's words fade out while a choice or line overlaps them, and come back once it is answered.
- The press-on-words-during-room path is right by code, but no probe step exercises it.

## Integration (16 Oct 2026, owner-authorised)

Done on `claude/hm-belief-mallows`, then fast-forwarded onto the integration branch `claude/upbeat-pasteur-b0aqg1`. `main` was not touched: a push there deploys the published site (`hushmallow-pages.yml`).

**Changes**

- **Switched on.** `LIVE_FEATURES.beliefMallows = true`.
  - Beyond sells "Belief Mallow investigation for the stories that keep coming back". The line sits behind Beyond's "Everything included" disclosure, beside "Perspective-changing worlds made for Another Angle", because Beyond now has 5 lines of its own.
  - Flow never sells it.
  - `gate.js` still requires 'ultra'.
- **The Another Angle delete row.** `consent.js` `ANGLE_EXTRA_KEYS` lists `beyond.belief.kept`.
  - `deleteAngleData` removes kept Belief Mallows, and `hasAngleData` counts them.
  - Its sheet and Settings' three "Delete everything" sheets name them.
  - `tests/beyond-fix-angle.test.mjs` is updated to match. The former todo test now runs for real.
- **Privacy hardening from the regression review.** A belief Tell stays a belief even if Beyond ends before its question is answered. It never falls through to an angle, and nothing is sent; it ends quietly.

**Checks**

- **Full suite on 58c4052:** 1129 of 1129 pass, 0 fail, 0 todo.
  - An earlier run, with two agents also using the CPU, failed one timing budget (`r4.test.mjs`, grief-rule cost). That test passes alone, and so does the uncontended run.
- **Browser, live build, no dev switch:**
  - full flow at 390x844 and 320x568 with the largest text;
  - crisis at 320x568 with the largest text;
  - Flow plan: Another Angle opens the plans page, with no Another Angle and no Belief Mallow; Beyond sells the line and Flow never does;
  - crisis, care and wipe at 390x844 (run by the reviewer).
  - The request log was clean in every run.
- **Independent regression review:** "ready for production". No Blocker or High findings.
  - Payments: product ids, purchase, restore and test purchase are untouched; `LIVE_FEATURES` is read only by the plans line and `gate.js`.
  - Published-site build: `build-site.sh` copies `src` wholesale. There is no service worker to update.
  - Lows fixed: the downgrade race above and two stale comments.
  - Low noted: Beyond's disclosure (above).
- **Compatibility trial merge** (local only):
  - With `hm-prod-security`, `hm-world-moonmilk-cove` and `hm-hires-loomi`: clean, and the combined suite passed 1160 of 1160.
  - `hm-world-raindrop-lagoon` and `hm-world-sunpop-orchard` conflict with moonmilk-cove, and with each other, in `src/hushfold/flow/lab.js` (the lab-world registry). That is between world branches, not with Belief Mallows. Each merges cleanly onto this branch alone.
  - prod-security's Content Security Policy allows everything Belief Mallows uses: a same-origin `import()`, plus an inline `<style>` allowed by its `'unsafe-inline'`.
