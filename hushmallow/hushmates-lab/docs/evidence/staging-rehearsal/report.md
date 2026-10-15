# Staging end-to-end: LOCAL REHEARSAL (not staging) · Edge Function: the real index.ts under Deno 2.9.6

Run on one machine: the packed site and a local stand-in for Supabase on two hosts. It proves the test and the cross-host set-up, not the real platform.

2026-10-15T08:06:09.113Z → 2026-10-15T08:07:37.792Z · Chromium (desktop and mobile emulation)

**57 passed, 0 failed.**

| Result | Area | Check |
|---|---|---|
| ✅ pass | site | the app is published |
| ✅ pass | site | its security policy lets pages talk to this project only, run no outside scripts, and refuses framing |
| ✅ pass | site | the protective headers are there |
| ✅ pass | site | the app’s settings name this project and its public key only (no secret key) |
| ✅ pass | site | /lab/ isn’t published |
| ✅ pass | site | /lab/index.html isn’t published |
| ✅ pass | site | /core/relay-seed.js isn’t published |
| ✅ pass | site | /.git/config isn’t published |
| ✅ pass | site | /server/server.mjs isn’t published |
| ✅ pass | site | /supabase/functions/_shared/gateway.js isn’t published |
| ✅ pass | site | the safety desk is published |
| ✅ pass | site | the site’s front door leads to the app |
| ✅ pass | security | the function refuses a call with no sign-in |
| ✅ pass | security | the scheduler’s route is “not found” without its secret |
| ✅ pass | security | a browser can’t call the database directly (permission denied) |
| ✅ pass | security | another website’s page isn’t allowed to call the function (no CORS for it) |
| ✅ pass | site | the app’s own site is allowed to call the function |
| ✅ pass | sign-in | a new person signs up on a phone: email code, invitation, name, 18+ |
| ✅ pass | sign-in | the session is recorded as an email-code sign-in |
| ✅ pass | sign-in | the account is theirs, under the name they chose |
| ✅ pass | sign-in | a second person signs up on a desktop and turns on catching |
| ✅ pass | relay | a feeling is released from the phone |
| ✅ pass | relay | the other person is offered it |
| ✅ pass | privacy | without learning who wrote it |
| ✅ pass | relay | the perspective is stored once |
| ✅ pass | encryption | the feeling is stored locked in the database |
| ✅ pass | safety | words that suggest someone isn’t safe get Australian crisis support |
| ✅ pass | safety | the lines can be tapped to call |
| ✅ pass | safety | and the words were never stored or sent |
| ✅ pass | scheduler | the Mallow’s perspective was prepared by the local scheduler with nobody calling |
| ✅ pass | mallow | it came from the free library (no AI) |
| ✅ pass | mallow | the Mallow’s perspective is labelled as automatic, never as a person’s |
| ✅ pass | scheduler | the first feeling came home when its time was up, with one person |
| ✅ pass | relay | the homecoming shows the perspective and the real count |
| ✅ pass | privacy | the share picture draws the allowed perspective and names nobody |
| ✅ pass | privacy | when its writer stops sharing, a new picture is not made with their words |
| ✅ pass | security | a wrong sign-in code is refused, kindly |
| ✅ pass | security | an invitation someone already used is refused |
| ✅ pass | sign-in | a third person signs up on a smaller phone |
| ✅ pass | security | words that look like code are shown as words, never run (refused by the screen) |
| ✅ pass | relay | a third person, on another phone, is offered the next feeling |
| ✅ pass | safety | they report it: “Someone may be in danger” |
| ✅ pass | safety | the safety desk sees it first, marked priority |
| ✅ pass | safety | the desk reads the words, never who wrote or reported them |
| ✅ pass | safety | the desk decides, and the decision is recorded |
| ✅ pass | safety | the activity log has the decision |
| ✅ pass | security | a member can’t use the safety desk’s methods |
| ✅ pass | security | a page on another website can’t use someone’s sign-in |
| ✅ pass | security | a forged token is refused |
| ✅ pass | security | one person can’t read another’s journey, even with its id |
| ✅ pass | security | a signed-in person can’t call the database’s door directly as someone else |
| ✅ pass | privacy | Your data shows the person’s own account, and nobody else by name |
| ✅ pass | deletion | deleting from the phone removes the sign-in from Supabase Auth |
| ✅ pass | deletion | and their words from the database |
| ✅ pass | deletion | test person B: deleted, sign-in included |
| ✅ pass | deletion | test person C: deleted, sign-in included |
| ✅ pass | deletion | test person M: deleted, sign-in included |

## Not checked by this run

- HSTS: the rehearsal site is plain http on this machine
- email delivery: the app’s “send me a code” call was answered by the test (no email sent); the staging guide’s hand test covers real emails
- Safari/WebKit and real phones: Chromium with phone sizes and touch only (run with real devices by hand)

## Screens

- 01-phone-390-signed-up.jpg (390 (mobile))
- 02-phone-390-released.jpg (390 (mobile))
- 03-desktop-1280-offered.jpg (1280)
- 04-desktop-1280-perspective-sent.jpg (1280)
- 05-phone-390-support.jpg (390 (mobile))
- 06-phone-390-mallow.jpg (390 (mobile))
- 07-phone-390-homecoming.jpg (390 (mobile))
- 08-phone-390-share-picture.jpg (390 (mobile))
- 09-phone-360-probe.jpg (360 (mobile))
- 10-phone-360-offered.jpg (360 (mobile))
- 11-phone-360-reported.jpg (360 (mobile))
- 12-desktop-1440-desk-queue.jpg (1440)
- 13-desktop-1440-desk-report.jpg (1440)
- 14-phone-390-your-data.jpg (390 (mobile))
- 15-phone-390-deleted.jpg (390 (mobile))
