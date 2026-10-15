# Hushmates privacy policy

**DRAFT, not yet reviewed or approved. Not legal advice.**
**Date: 15 October 2026.**

> **Status (internal, remove before publishing).** Nothing in this document is final until the owner approves
> it. Every part marked "needs legal advice" must also be reviewed by an Australian privacy lawyer (decision D7)
> before it is published or relied on. Hushmates is not live: nothing is deployed, AI is off, and there are no
> members outside the team. The facts below describe the code at commit `9012d6f` (15 October 2026, after the
> Tier 0 changes), each re-checked against the files cited, plus the staging plan. The GitHub repository is
> public today; decision D19 recommends making it private.
>
> **How to read this draft.**
> - The words members will read are in plain type. They are written in Hushmallow's voice, as if Hushmallow is
>   bound by the Australian Privacy Principles (APPs). That is the recommended posture (PRV-03), not a
>   conclusion that it is bound.
> - Hidden comments (`<!-- [classification: ...] -->`) sit next to each part that depends on a fact, needs
>   legal advice, or is a recommendation. They do not show when the page is rendered. A fact "checked against the
>   code" is a verified fact about the app, not a verified legal duty: no legal duty in this policy is classed as
>   verified as binding Hushmallow today (Drafting notes A). Recommended practice is never written as a legal
>   obligation.
> - Text in **[square brackets]** is a placeholder or a fact still to be confirmed. The policy can't be published
>   while any remain.
> - The "Drafting notes" section at the end is internal. Remove it before publishing.

<!--
[classification: needs legal advice] THE THRESHOLD QUESTION. Every APP and Notifiable Data Breaches duty in this
policy applies only if Hushmallow is an "APP entity". With turnover far below A$3m it is a small business operator
and exempt (Privacy Act 1988 s6D), UNLESS an exception applies. The live exception is s6D(4)(b): an entity that
"provides a health service to another individual and holds any health information except in an employee record".
Test (s6FB, seen only as an earlier-run secondary extract of the Act and an OAIC paraphrase): an activity "intended
or claimed (expressly or otherwise) by the individual or the person performing it" to assess, maintain or improve the
individual's health, including psychological health. Facts pointing towards it: an "emotionally comforting"
companion; Mallow lines chosen by analysing the author's words for patterns of thinking; support lines on a word
match; members may use it intending to feel better. Facts against: explicitly non-clinical, no diagnosis, treatment
or monitoring claims. The test is entity-wide, so the main Hushmallow app counts too.
Other routes to being bound: opting in under s6EA (recommended practice, PRV-03); turnover above A$3m; trading in
personal information for a benefit (not today, PRV-01).
Do NOT tell members "we are not covered by the Privacy Act" unless advice confirms it (PRV-02).
Sources: OAIC, APP Guidelines Chapter B, https://www.oaic.gov.au/privacy/australian-privacy-principles/australian-privacy-principles-guidelines/chapter-b-key-concepts
(official guidance, seen only as a search extract, quoting s6D(4)(b)); OAIC, Guide to health privacy,
https://www.oaic.gov.au/privacy/privacy-guidance-for-organisations-and-government-agencies/health-service-providers/guide-to-health-privacy/introduction-and-key-concepts
(search extract); Privacy Act 1988 (Cth), https://www.legislation.gov.au/C2004A03712/latest/text (not opened in this
environment; the series id is from memory and must be checked).
-->

---

## The short version

- **You're known here by a name you choose.** Other members never see it, or your email. Your feelings and
  perspectives travel with no name at all.
- **Pseudonymous means we still know it's you.** We hold your email address, and we know which account wrote what.
  Words can also give people away, so please leave out names and details that could identify anyone.
- **Your words only travel when you say yes,** one feeling at a time.
- **Your words are locked (encrypted) before they're stored,** in Sydney. A very small number of people hold the
  keys. We tell you exactly who below.
- **We don't sell your information, show you ads, or use your words for marketing or to train AI.**
- **You can download your data, take things back, or delete everything,** at any time, in You & safety.
- **Hushmates isn't an emergency, crisis or counselling service.** Nobody is watching in real time, and our small
  safety team reads reports, but not around the clock. If you're not safe, call **000**, or Lifeline on
  **13 11 14**. Tap **Support** at the top of the screen for more lines, any time.

<!-- [classification: depends on functionality or business circumstances] "We don't sell ... ads ... marketing ...
train AI" is true on today's facts (no ads, analytics, data partners or AI: app-facts P22, §6; AI is off, schema
line 39). It must stay true, or this line must change. Any data-for-value arrangement would also remove the small
business exemption (PRV-01, s6D(4)(c)-(d), subsection letters from memory). Internal rule: no such arrangement without an owner decision and a legal
check first. -->
<!-- [classification: recommended practice] "Tap Support at the top of the screen": a "Support" button sits in the
header of every screen (ui/relay/common.js supportPill, used by top() and brandBar(); sign-in.js:94, invite.js:56,
welcome.js:44, you.js:42 and :125, away.js:31) and opens the crisis lines in a sheet over the current screen
(common.js openSupport, :41-44): first 000, Lifeline 13 11 14, Suicide Call Back Service 1300 659 467 and 13YARN
13 92 76, then under "More support lines" 1800RESPECT 1800 737 732, Beyond Blue 1300 22 4636 and findahelpline.com
(core/feeling-safety.js:166-180, SUPPORT_NOW_RESOURCES). The support screen shown instead of a release has no pill
(ui/relay/support.js:29, help: false) because it shows the lines itself. Numbers to re-check before publishing. -->


---

## Who we are

Hushmates is part of Hushmallow. In this policy, "we", "us" and "Hushmallow" mean **[legal name of the business]**
(ABN **[ABN]**), who runs Hushmallow and Hushmates.

**Contact us about privacy:** **[privacy contact email, to be set up]**
**Post:** **[postal address or PO box, if the owner wants one]**

Please write "Privacy" in the subject line, so it reaches the right person quickly. This address isn't watched
around the clock, so please don't use it in an emergency. If you or someone else is in danger, call **000**.

<!-- [classification: recommended practice] The contact address is decision D23 (DECISIONS.md: "A contact address
that isn't for emergencies ... a mailbox on a domain you control, checked at the desk's times", before G3).
[privacy contact email] is that address, or an alias on it. The "not for emergencies" sentence follows rule 5 of the
owner's instructions: nobody watches it continuously. -->
<!-- [classification: depends on functionality or business circumstances] APP 1.4 and APP 5.2(a) need the entity's
identity and contact details (APP 5.2 list from an earlier-run extract of OAIC APP Guidelines Chapter 5,
https://www.oaic.gov.au/__data/assets/pdf_file/0019/1198/app-guidelines-chapter-5-v1.2.pdf, not re-seen; APP 1.4
contents from memory). [GAP, still open] The app has no business name, contact address or complaint route anywhere
today (app-facts §0; re-checked in ui/relay/ at 9012d6f). A sole trader can give a registered business name, ABN and an email; a home address isn't needed
(PRV-08, researcher's reading, not verified). -->

## What this policy covers

This policy is about **Hushmates**: the app where you release a feeling, other members catch it, and it comes home
with their perspectives. It covers the Hushmates app and our safety team's work.

Hushmates is an invitation-only pilot for adults (18+), in Australia.

Your Hushmates account is separate from the Hushmallow app. We don't combine the two.
**[If the Hushmallow app has its own privacy policy, link it here.]**

<!-- [classification: depends on functionality or business circumstances] "Separate ... we don't combine" is true
today: Hushmates sign-in is its own isolated Supabase project (README "Boundaries kept"). The code keeps
"identities ready for a future Hushmallow login" (README); a shared login would change this sentence and needs a
fresh notice. -->

---

## Pseudonymous: what that means here

When you join, you choose a name for yourself in Hushmates. It can be anything from 3 to 20 letters or numbers.
Please don't use your real name.

- **Other members never see your name or email.** The only thing they see about you is the colour of the Mallow
  you chose, beside a perspective you wrote. Your feelings and perspectives reach them with no name at all.
- **Nobody can contact you through Hushmates,** and you can't contact anyone. There are no messages, profiles,
  followers or feeds.
- **But we know it's you.** We need your email address to sign you in, because that's where your code
  goes. We also keep a link between your account and what you write, so we can show you your own feelings, bring
  perspectives home to you, honour blocks, and act on reports.
- **Our safety team** reads words only when they've been reported, or paused for safety. They see an account
  reference (a string of letters and numbers), never your name or email.
- **The people who run Hushmates** **[the owner, and the developer while the pilot is being built]** can link
  that account reference to your email address. They only do that when they need to: to answer a request from
  you, to lift a pause on your account, to fix a problem, or when the law requires it.

<!-- [classification: depends on functionality or business circumstances] APP 2 (anonymity and pseudonymity; APP
2.2 exceptions where required or authorised by law or impracticable). Source: OAIC APP Guidelines Chapter 2,
https://www.oaic.gov.au/privacy/australian-privacy-principles/australian-privacy-principles-guidelines/chapter-2-app-2-anonymity-and-pseudonymity
(earlier-run search extract, not re-seen). The email is needed for the email-code sign-in, which is defensible as
"impracticable" to avoid (PRV-21). "Only do that when they need to" is a commitment, not a technical control:
[recommended practice] back it with an internal access rule and access logging before publishing. Facts (checked at
9012d6f): the desk sees a member UUID as "Account reference (for a team lead)" (staff/desk.js:283; rules.sql:1079-1098);
an operator can change an account's state by that reference (server/admin.mjs header: "member <reference>
active|restricted|suspended") and can join identities.subject to the Supabase Auth user (app-facts P1, inference
from the schema). The author sees each writer's Mallow as a petal colour (rules.sql:231; ui/relay/common.js:74-83
lights()). [GAP, still open] offer_view also sends the author's Mallow (journeys.mallow) to the catcher's device,
though the catch screen doesn't show it (rules.sql:300-306; ui/relay/catch.js:143-164 tints the orb by the feeling's
label only): drop it from offer_view, or say so here. -->

---

## What we collect, and why

We collect only what Hushmates needs to work and to stay gentle and safe. Here is all of it.

### When you sign in

- **Your email address.** We send a 6-digit code to it. The code works for 10 minutes. We use your email only to
  sign you in, to reply when you write to us, and, if we ever must, to tell you something important about your
  account, your information or the service (for example, if something went wrong with your data, if our safety team
  will be away for a while, or if Hushmates is closing). We don't send newsletters or marketing.
- **Sign-in records.** Our sign-in system (Supabase Auth) keeps a record of your account and sign-ins, such as when
  they happened. It may also record your device's internet address (IP address) and browser type.
  **[TO CONFIRM on staging: exactly what Supabase Auth records, and for how long.]**
- **A link between your sign-in and your Hushmates account,** and roughly when you last used Hushmates (updated
  at most once an hour).

<!-- Facts: supabase/config.toml:17-18 (otp_length 6, otp_expiry 600); ui/relay/sign-in.js:108 "We’ll only use your
email to sign you in." and the privacy sheet "Your email is used only to sign you in" (ui/relay/parts.js:185): both
narrower than the uses listed here, so COLLECTION_NOTICE_AND_CONSENT.md §4.1 and §4.10 propose matching wording
[GAP until changed]; identities table with last_seen_at (schema.sql:72-80; api.sql:35-36). Supabase Auth's own records:
[NOT CONFIRMED] (app-facts P3). The "important notice" use covers a data breach notice (s26WL), a notice that the
safety desk is away (MODERATION.md §5.2) and the end of the beta (TERMS_OF_USE.md §9), and is narrower than
marketing. There is no sending tool yet: for G2 the owner emails team testers personally; before G3 it needs the email
provider (D5) or an in-app notice (DATA_BREACH_RESPONSE_PLAN.md R4). [classification: depends on functionality or
business circumstances] APP 7 / Spam Act: no marketing email today; a purely factual service notice is a designated
message under Schedule 1 cl 2 (SCW-12 as corrected) but must still identify the sender; any future premium-tier email
needs consent and an unsubscribe (SCW-12). -->

### When you join

- **Your invitation code.** We don't keep the code itself, only a scrambled check of it (a keyed hash), and which
  invitation you used. When we make an invitation we may add a short private note to it, such as who it was for.
- **The name you choose.** Only you see it.
- **Your "I'm 18 or over" tick,** and when you gave it.
- **Your Mallow,** the character who carries your feelings, and **your settings:** whether feelings may find you,
  and whether you'd like gentle notices.

<!-- Facts: invites.code_mac, members.invite_id, invites.note (operator free text, may hold a name or email, plain
text: app-facts P6) [GAP: recommend an internal rule that notes never hold names or emails]; members.pseudonym
(plain text); members.adult_confirmed_at; members.catching (default false), notify_return (default true). -->

### When you release a feeling

- **Your words** (3 to 500 characters), and the feeling's name if you choose one (like worry, joy or loneliness).
- **Your yes to sharing it,** and when you said it. If you allow a Mallow line, that yes too, and when.
- **Its journey:** when it left, who caught it (kept as account links, which no member ever sees), when perspectives
  arrived, when it came home and why, whether you sent it out again, saved it, or let it go, and which perspectives
  you kept.
- **A scrambled check of your words** (a keyed hash), so the same feeling isn't sent twice by mistake.

### When you catch a feeling

- **Which feelings were offered to you,** and whether you caught them or let them float past. We use this so a
  feeling never finds you twice, and so you hold only one at a time.
- **Your perspective** (8 to 280 characters), when you offered it, the Mallow you chose, and whether you allowed the
  author to include it in a share picture or video, and when.
- **If you take a perspective back,** a record that you did, without the words.

### Mallow lines

If you allow it, your Mallow can offer you one line when nobody has caught your feeling. Your Mallow **puts that line
together from a fixed set of pieces written in advance for Hushmallow:** an opening in your Mallow's voice and one
perspective, sometimes with a word for your feeling filled in (like "worried"). The pieces are chosen automatically,
by rules guided by your words. It isn't a person replying to you, and no AI is used to make it. In the app these
lines carry the label "Automatically generated". That means our code chose it for you from lines written in advance;
no AI is involved in making it.

We keep: the line, locked with your journey; a reference to which perspective it used (this shows the kind of theme
it matched, such as loss, money or study); and a daily count of Mallow lines, to keep things fair.

<!-- [classification: recommended practice] Accurate Mallow description (PRV-22 as corrected by the critic; SCW-07
ACL s18; TGA-5). Facts (checked at 9012d6f): AI is off ("enabled": false, "monthlyCapAud": 0, schema.sql:39); the
library builds what is shown as `${openerFor(voice, family, tender, feeling, ...)} ${c.text}` (core/perspectives.js:640
in libraryProvider :627-659; the vendored copy under supabase/functions/_shared/vendor/ is identical): an opener in the
Mallow's voice plus one perspective line, and some openers fill a {adj} slot ("It makes sense to feel {adj} about
this.") with an adjective from the label, chosen or inferred from the words (core/perspectives.js:67 ADJ, :75 OPENERS,
:502 inferLabel, :612-618 openerFor). Model "reframe-library:<line id>"; angle_id (like "hm-loss-1") records the
perspective part only, not the opener, and is stored in plain text (app-facts P12); usage_daily kept 7 days (up to
about 8). The library is 293 lines (51 openers, 114 Hushmates lines, 128 of Reframe's 179), each checked line by line
in the Tier 0 self-assessment, which is a developer self-assessment, not a clinical review (docs/safety/
TIER0_SELF_ASSESSMENT.md §3.2; docs/clinical/mallow-library-for-review.csv).
App wording now: "chosen automatically from a fixed set of lines written in advance for Hushmallow" (ui/relay/you.js:69;
parts.js:184 says "perspectives written in advance for Hushmallow"; welcome.js:104 "a fixed set of lines written in
advance") and "chooses it ... guided by your words" (ui/relay/returned.js:319, :348, :351). This section uses the same
words. The label shown on every Mallow line is still "A Mallow perspective · Automatically generated"
(core/relay-config.js:74-75; rules.sql:236; ui/relay/share-render.js:27, :37): decision D21 (keep it, or change it to
something like "From the Mallow library", after the lawyer's view) is open. The sentence explaining the label is here
because "generated" can suggest AI (D21); if D21 changes the label, change or drop that sentence. Avoid
"generated" (except when quoting the label), "writes", "therapy", "reframing" (TGA-10).
"No AI is used to make it" describes how a line reaches a member: no AI runs when a line is chosen or shown, because
AI runs only if settings.ai.enabled is true (schema.sql:39; supabase/functions/_shared/mallow.js:6-15, :78). It is
not a claim about how the pieces were drafted. Who wrote the pieces: the main app's Reframe lines and Hushmates' own; the Tier 0
rewrites (42 lines) were made by "the developer ... with AI agents working in this repository" (TIER0 header and
§3.2). So the owner must confirm how the lines were authored and reviewed before any draft says "the Hushmates team
wrote", "hand-written" (the code comment at core/perspectives.js:48-49 says "Every sentence is written by hand") or
"no AI was involved" (TERMS_OF_USE.md §2 comment). Until then, "written in advance for Hushmallow" only. -->

### Reports and blocks

- **If you report something:** what you reported, the reason you chose, and when. We keep a link to your account so
  reports can't be misused, but the person you reported is never told, and our safety team never sees who
  reported.
- **If something you wrote is reported:** the report, a locked copy of the reported words, and the outcome.
- **If you block someone:** that you blocked them. Neither of you is told who the other is.

### What our safety team keeps

- **Notes and decisions** about a report, locked like your words. Only the safety team sees them.
- **Whether an account is paused,** and a count of earlier reports about the same account, so the team can see a
  pattern.
- **A log of what the team does,** like opening a report or making a decision. It never contains anyone's words.

### Records that keep Hushmates running

- **An activity log** of key moments, such as joining, deleting your data, making a report, or taking a
  perspective back. It never holds anyone's words.
- **Short-lived request records,** to stop overuse (for example, at most 6 feelings an hour). Each request your
  app makes is noted with your account reference and the time, and cleared at the next daily tidy-up after 48
  hours (so up to 3 days).
- **If someone types a wrong invitation code,** we keep a scrambled reference to the network it came from (a keyed
  hash of the internet address, never the address itself), for the same time, to slow down guessing.
- **Server logs** from the services that host Hushmates. Our own server code logs errors only, never anyone's
  words. Our hosts keep their own technical logs, which usually include internet addresses and times.
  **[TO CONFIRM: what Supabase and Cloudflare keep, and for how long, on the plan we choose.]**
- **Daily service totals,** such as how many feelings found someone today. These aren't about any one person.

<!-- Facts: audit_log (kept 365 days); rate_events (kind rpc on every call; 48 h); net: HMAC prefix for invite-wrong
only (supabase/functions/_shared/gateway.js:252-256) [analysis: pseudonymised, not anonymous, since anyone with the MAC key could match a known
address]; Edge Function logs errors only (app-facts P21); platform logs [NOT CONFIRMED]; ops_daily aggregates. -->

### On your device

Hushmates keeps a few things in your browser's own storage on your device:

- **Your sign-in,** including your email address, until you sign out or delete your data.
- **The email address a code was just sent to,** for up to 15 minutes, in that browser tab only.
- **Whether soft sounds are on.**
- **What you're writing,** only in the page's memory. It's gone when you clear it or close Hushmates.

Hushmates doesn't use cookies, and it has no analytics, advertising or tracking tools.
**[TO CONFIRM: whether Cloudflare sets any cookie of its own, for example for bot protection.]**

<!-- Facts: localStorage hushmates.session {accessToken, refreshToken, expiresAt, user {id, email}};
sessionStorage hushmates.signin 15 min; localStorage hushmates.sound; draft in memory (app-facts P20). No cookies in
production: credentials 'omit', Bearer tokens (app-facts P23). No analytics (P22; CSP 'self' + the Supabase project).
-->

### What we don't collect

We don't ask for your real name, date of birth, ID, phone number, location, contacts or payment details. Hushmates
can't use your camera, your microphone or your location.

<!-- [classification: depends on functionality or business circumstances] True today: no payment code;
self-declared age only (app-facts §8); the site's Permissions-Policy is "camera=(), microphone=(), geolocation=(),
payment=()" (tools/pack-site.mjs:64, checked 15 October 2026). A premium tier or any age assurance would change this
section (U16-09: age-check data has its own Part 4A limits if the platform is in scope). -->

---

## Your feelings are sensitive, so we ask first

What you write may say something about your health, including how you're feeling in yourself. It may also say
something about other sensitive parts of your life. The law treats this kind of information as **sensitive** and
gives it extra protection.

So we treat **every feeling and every perspective as sensitive.** That means:

- **We only send a feeling on its journey after you tick to share it,** on the Release screen. The tick starts
  off. If you don't tick it, your feeling stays with you and nothing is sent. You tick once for each feeling. That
  yes also covers sending the same feeling out again, up to twice, which you choose each time with "Send it out
  again".
- **A Mallow line is a separate choice,** and it starts off too.
- **Letting your perspective appear in someone's share picture is a separate choice,** and it starts off too.
- **We only use what you share for the reasons in this policy.** If we ever want to use it for anything else, we'll
  ask you first, separately.

<!--
[classification: depends on functionality or business circumstances] APP 3.3: sensitive information may be collected
only with consent and only if reasonably necessary (objective test). Deciding facts: APP-entity status (PRV-02) and
whether a given feeling holds health information; if Hushmallow provides a health service, everything collected in
providing it is health information (OAIC: "All personal information collected in the course of providing a health
service is considered health information under the Privacy Act." Guide to health privacy, search extract).
Consent elements (OAIC APP Guidelines Chapter B, search extract): "adequately informed", "voluntarily", "current and
specific", "capacity"; "should generally seek express consent ... before handling ... sensitive information"; "cannot
infer consent simply because it provided ... notice". The full consent design, mapped to each screen, is in
COLLECTION_NOTICE_AND_CONSENT.md in this folder.
Resends: "Send it out again" asks for no new share tick and records no new consent. m_resend_check only requires the
original consent_at, and m_resend_commit leaves it unchanged; only the Mallow choice can be renewed for the new trip
(rules.sql:515-545). The bullet above says so. [recommended practice] A share tick on "Send it out again" that
refreshes consent_at would make each trip's consent current and provable (code change; not made here).
Wording note: this section says the law treats health information as sensitive. It deliberately does not say
Hushmates is, or is not, a health service: that is the PRV-02 question, and it must be answered consistently with the
TGA (TGA-1/TGA-4/TGA-5) and under-16 (U16-03) positions. Do not add health-benefit claims here.
-->

## Information about other people

Your feelings may mention other people: a partner, a friend, someone at work. Please don't name them, or share
details that could identify them.

Our word check asks you to take out some details, like phone numbers, email addresses, street addresses, postcodes
and "my name is...". (Naming a national helpline's number, like Lifeline's, is fine.) It can't catch everything. If
something that identifies another person is reported, our safety team can remove it.

<!-- [classification: needs legal advice] PRV-05: third-party sensitive information in feelings (APP 3.3 consent of
the person it is about; APP 3.6 from memory). Applies only if the third party is reasonably identifiable to
Hushmallow. Facts (checked at 9012d6f): screenFeeling refuses contact details, links and money requests through
checkMessage, and street addresses, UK and US-style postcodes, Australian postcodes with context ("postcode 2000",
"NSW 2000") and "my name is..." through IDENTIFYING (core/feeling-safety.js:227-236, :349-357); national helpline
numbers are taken out before the contact-detail rule reads the words, so they may be named (:221-225 HELPLINES);
"identifying" is a report reason ("Shares personal details", core/relay-config.js:63); the desk can remove a
perspective or take a feeling out of circulation. Internal rule: never combine feeling text with account data in a
way that would identify a third party. -->

---

## How we collect it

- **From you,** when you sign in, join, release a feeling, catch one, report or block, or change a setting.
- **From other members,** when they offer a perspective on your feeling, or report something you wrote.
- **Automatically,** as you use Hushmates: times, request records, and our hosts' technical logs.

We don't buy information about you, and we don't collect it from anywhere else. If someone sends us information
about you that we didn't ask for and don't need, we'll delete it.

<!-- [classification: depends on functionality or business circumstances] APP 1.4(b) (from memory), APP 5.2(b)
(perspectives and reports about a person come from other members). APP 4 (unsolicited information, from memory, not
seen): destroy or de-identify if it couldn't have been collected under APP 3. -->

## How we use it

We use your information to:

1. **Sign you in** and keep your account yours, on any device.
2. **Carry your feelings:** offer them to members who chose to catch feelings, bring perspectives home to you, and
   keep your journeys.
3. **Offer a Mallow line,** only if you allowed it.
4. **Check words for safety and personal details,** before anyone sees them (see "Decisions made automatically").
5. **Keep Hushmates gentle and fair:** honour blocks, never show you the same feeling twice, share feelings out
   fairly, and limit overuse.
6. **Handle reports:** our safety team reads what's reported, decides what to do, and can pause an account.
7. **Answer your requests,** like a copy of your data, a correction or a complaint.
8. **Keep Hushmates working and secure:** fix problems, restore from a backup, and look into misuse.
9. **Meet our legal obligations.**

**We will never, without asking you first and separately:** use your words for marketing, testimonials or examples;
use them for research; send them to an AI service; or share them with anyone for their own purposes.

**We don't sell your information,** and we don't use it for advertising.

<!-- [classification: depends on functionality or business circumstances] APP 6: use or disclose only for the
primary purpose, or a secondary purpose under an exception; for sensitive information a reasonably expected
secondary purpose must be "directly related" (OAIC APP Guidelines Chapter 6,
https://www.oaic.gov.au/privacy/australian-privacy-principles/australian-privacy-principles-guidelines/chapter-6-app-6-use-or-disclosure-of-personal-information,
search extract). Purposes 1-9 are drafted to be the primary purpose stated at collection (PRV-09). Not covered by
today's purposes, so each needs fresh, specific consent: AI processing (the code has an adapter, switched off),
analytics on feeling text, research, marketing, model training, case studies (PRV-09). Item 8 "restore from a
backup" uses the keys (see "How we keep it safe"). -->

---

## Who can see what

| | You | The members who catch your feeling | Other members | Our safety team | The people who run Hushmates |
|---|---|---|---|---|---|
| **Your email address** | Yes | No | No | No | Yes, through our sign-in system |
| **Your Hushmates name** | Yes | No | No | No | Yes |
| **Your feeling's words and its name** | Yes | Yes, while it's offered to them or they hold it | No | Only if it's reported or paused for safety | The words only with the keys; the feeling's name, yes |
| **A perspective's words** | The person who wrote it; the feeling's author once it's home; anyone who catches that feeling later, after they add their own | (they wrote them) | No | Only if it's reported | Only with the keys |
| **Your Mallow line** | Yes | No | No | Only if you report it | The line only with the keys; which line it was, yes |
| **Who made a report** | The person who made it | No | No | **Never** | Yes |
| **Who a report is about** | Not told | No | No | As an account reference | Yes |
| **Who you've blocked** | Yes, as a count in your data | No | No | No | Yes |
| **Safety team notes** | No | No | No | Yes | Only with the keys |
| **When you use Hushmates** | No | No | No | No | Yes |

A few more things about who sees your words:

- **Your feeling is offered to members who turned on "Let feelings find me",** one at a time, and never to the same
  person twice. Up to five of them can offer a perspective. Others may read it and let it float past, so more than
  five people may read it while it travels. They see the words, the feeling's name if you chose one, and how many
  perspectives it has so far.
- **When your feeling comes home,** you see each perspective, the colour of the Mallow each writer chose, and
  roughly when it arrived. Never who wrote it.
- **Nobody at Hushmates reads feelings as they travel.** Our safety team can only open words that have been
  reported, or paused for safety.
- **Share pictures and videos** are made on your own device. Hushmates doesn't upload or post them, and keeps
  nothing about them. You choose what goes in. A perspective can only appear if its writer allowed it. Once you
  share a picture, it's out of our hands.

<!-- Facts: app-facts §2c and P8-P10, P24, re-checked at 9012d6f. No cap on how many catchers may be offered a
feeling while it travels: only live holds plus perspectives are capped at 5 (rules.sql:548-556; privacy sheet "a few
may see it at the same time", ui/relay/parts.js:181). Offer view: words, label, "n of 5 human perspectives so far"
(ui/relay/catch.js:159). "Nobody at Hushmates reads feelings as they travel" matches You & safety: "Nobody on our team
reads feelings as they travel" (ui/relay/you.js:70). The author sees the writer's Mallow as a petal
colour (rules.sql:231). "Nobody at Hushmates reads feelings as they travel": the desk has no method to browse
journeys (app-facts §9); for key holders it is a practice, not a technical control [recommended practice: internal
rule plus access logging]. Share pictures: a use by the author on their device, not a disclosure by Hushmallow, while
nothing is uploaded (PRV-09, researcher's reading, not verified). -->

---

## Where your information is kept, and who helps us

We use a few service providers. They handle your information only to run Hushmates for us.

| Who | What they do | What they handle | Where |
|---|---|---|---|
| **Supabase** | Hosts our database, sign-in system, server code and scheduled jobs | Everything in this policy. Your words are locked before they reach the database. | Our project is in Supabase's **Sydney** region, Australia. **[TO CONFIRM: that our server code always runs in Sydney, and whether Supabase's support staff or its own providers can reach our project from outside Australia.]** |
| **Cloudflare** | Delivers the app's files (pages, fonts, pictures) to your device | Your device's requests for those files, including its internet address and browser type. Not your words or your account. | Cloudflare's global network, so possibly outside Australia **[TO CONFIRM]** |
| **[Email provider, to be chosen]** | Sends your sign-in codes | Your email address and the code | **[Country, to be confirmed]** |

We don't use any other service providers for your information. There's no analytics, advertising or AI service.

### Does anything go overseas?

**Your words, your name and your account records are stored in Australia.** We don't send your words overseas.

Some things may be handled outside Australia:

- **Your email address and sign-in codes,** by our email provider, in **[country]**.
- **Your device's requests for the app's files,** by Cloudflare's network.
- **[Anything else confirmed about Supabase support access or its providers.]**

Before anything goes overseas, we take reasonable steps to make sure the provider protects it, including a written
agreement. We stay responsible for it.

**AI is switched off.** Hushmates has an option to use an AI service for Mallow lines, but it's off, and no AI
provider is connected. If we ever want to switch it on, we'll update this policy first, and we'll ask you
separately, with a switch that names the provider and the country.

<!--
[classification: depends on functionality or business circumstances] APP 1.4(f)-(g) (from memory) and APP 5.2(i)-(j)
(OAIC APP Guidelines Chapter 1: overseas information in the policy "complements the obligation on an APP entity under
APP 5.2(j) and (i)", search extract); APP 8.1 reasonable steps and s16C accountability (OAIC APP Guidelines Chapter 8,
https://www.oaic.gov.au/__data/assets/pdf_file/0036/256959/APP-Guidelines-Chapter-8-Cross-border-disclosure-of-personal-information-October-2025-v1.3.PDF,
earlier-run extract, not re-seen). "Disclosure" = released from the entity's effective control; storage-only cloud
with retained control may be a "use" (secondary sources only, gtlaw.com.au; not the law).
Deciding facts (PRV-11): which email provider and where it processes (decision D5; candidates in docs: Resend, Brevo,
Amazon SES, regions not checked); Supabase support-access and sub-processor terms [NOT CONFIRMED]; where the Edge
Function executes: no region is pinned in the code (no x-region / forceFunctionRegion) [NOT CONFIRMED]. Recommended:
pin the function to Sydney, and prefer an Australian-region email provider, so the overseas list shrinks to the email
provider or to nothing.
"We don't send your words overseas" holds only if the function runs in Sydney: confirm before publishing.
Region facts: docs/STAGING.md:66 and docs/DECISIONS.md D1 (Sydney) [DOC]; tools/staging-deploy.mjs:11, 127 refuses a
project outside Sydney (code).
"A written agreement": [GAP] data processing terms with Supabase, the email provider and any AI provider are listed as
outstanding (docs/READINESS.md §2, item 9 "Contracts with providers"). Don't publish this sentence until they exist.
Nothing is deployed today; staging (G1) holds test words only (docs/LAUNCH_READINESS.md §0).
AI: decision D10 (stays off). Turning it on needs a switch naming the country (APP 5.2(i)-(j), if Hushmallow is an APP
entity) and, as [recommended practice], the provider; APP 8.1 reasonable steps (a contract) first
(COLLECTION_NOTICE_AND_CONSENT.md §8).
-->

## When the law requires or allows sharing

- **If the law requires it,** for example a court order, a warrant, or a notice from a regulator, we'll check that
  it's valid and share only what it asks for. We keep a record of each request.
- **The law also allows us to share information without asking, in a few narrow cases.** One is when we reasonably
  believe it's needed to lessen or prevent a serious threat to someone's life, health or safety, and it isn't
  reasonable or practicable to ask first. If that ever happens, we share only what's needed.

This doesn't make Hushmates a safety service. Nobody is watching in real time, and our small safety team reads
reports, but not around the clock. Our safety team can't see who wrote anything, and nobody from Hushmates will
contact you about what you write or to check on you. If you or someone else is in danger, call **000**.

<!--
[classification: depends on functionality or business circumstances] s16A item 1 permitted general situation (APP
6.2(c), APP 3.4(b)): (1) unreasonable or impracticable to obtain consent; (2) reasonable belief; (3) necessary to
lessen or prevent; (4) a "serious" threat, "one that poses a significant danger"; (5) not after the threat has passed.
Source: OAIC APP Guidelines Chapter C,
https://www.oaic.gov.au/privacy/australian-privacy-principles/australian-privacy-principles-guidelines/chapter-c-permitted-general-situations
(search extract). It is a permission, not a duty (PRV-10).
Deciding fact: whether the business adopts any identity-lookup step for danger reports (today: none; the desk sees no
identities). The draft desk guide tells moderators to call 000 if they hold identifying information because the person
contacted Hushmallow directly (staff/desk-guide.js:32; docs/ESCALATION.md §3 step 3): that is the only path where this
paragraph could apply, and the moderation procedure must match it (docs/legal/MODERATION.md §6.5, needs legal
advice). Nothing alerts anyone when a report arrives (docs/ESCALATION.md: "There are no alerts"), so this paragraph
must never be read as a promise that anyone will act quickly. Required-by-law disclosures: APP 6.2(b) (from memory). "We keep a record of each
request" is [recommended practice]; set up the log before publishing.
"Nobody from Hushmates will contact you about what you write or to check on you" is scoped on purpose: Hushmallow does
email members about their account, a data breach (s26WL, "If something goes wrong"), replies to their own requests,
and service notices ("When you sign in"). Don't widen it back to "will contact you" anywhere it is copied.
-->


---

## How we keep it safe

**Your words are locked (encrypted) before they're stored.** Our server code locks them with AES-256-GCM before
they reach the database. This covers the words of your feelings, your perspectives, your Mallow lines, any details
in reports, the copies of words kept with a report, and our safety team's notes. Anyone who looks inside the
database itself sees only locked text.

**Who holds the keys.** The keys are kept in our server's secret settings at Supabase, and by Hushmallow's owner, in
a password manager and on the owner's own computer **[TO CONFIRM: that computer's disk is encrypted]**. **[TO
CONFIRM for the live service. A second named person may hold them later in the pilot.]**
Anyone who holds the keys can unlock every stored word. So we keep the keys to as few people as possible, and we
use them only to run Hushmates, to restore from a backup or check that a backup works, or when the law requires it.

**Where your words are unlocked.** Inside our server code, while it's running the word check, choosing a Mallow line,
or showing words to the people they're meant for; on the devices of those people; and, when we restore a backup or
check that one works, on the owner's computer.

**What isn't locked this way.** Your Hushmates name, the feeling's name, your Mallow, your settings, times, the
journey steps, report reasons and who reported what. These are protected in other ways: the app and browsers can't
reach the database directly at all. Only our server code can, and it checks who you are on every request.

**Your email address** is kept by our sign-in system, protected by Supabase's own security. We don't lock it with
our keys.

**On the way,** everything travels over a secure (HTTPS) connection.

**Our safety team** uses separate staff accounts, which sign out after 30 minutes without use, and everything the
team opens or decides is logged.

No system can be perfectly secure, and we won't pretend otherwise. If something goes wrong, see "If something goes
wrong with your information".

<!--
[classification: depends on functionality or business circumstances] APP 11.1 reasonable steps, including technical
and organisational measures (2024 amendment; OAIC Guide to securing personal information,
https://www.oaic.gov.au/agencies-and-organisations/guides/guide-to-securing-personal-information, earlier-run extract,
not re-seen). The bar rises with sensitivity (mental-state text linked to email). No absolute claims ("100% secure",
"fully encrypted") (PRV-12).
Facts: fieldcrypt.js:6-13 (AES-256-GCM, fresh 12-byte IV, key id bound in); encrypted fields listed in app-facts §2b;
keys HUSHMATES_DATA_KEYS / HUSHMATES_DATA_KEY_ID / HUSHMATES_MAC_KEY are Edge Function secrets (index.ts:10-12, 50) and
derived from a root secret the owner holds (decision D11: "You, in your password manager; a second named person once
the beta has real people"); the owner also holds them in .data/staging.env (server/admin.mjs:131-136; app-facts §2b);
.data/ is git-ignored (hushmates-lab/.gitignore:3), so no key file is in the repository, which is public today (D19);
the recovery drill decrypts every stored word with them, outside the server (docs/READINESS.md:31; docs/STAGING.md:283-293).
The same list is in DATA_BREACH_RESPONSE_PLAN.md §4 and RETENTION_AND_DELETION.md E12. A cloud session's environment
secrets also hold the staging root secret, from which every staging key is derived (tools/staging-env.mjs): staging
holds test words only, so it isn't named to members, but delete it after staging (docs/STAGING_CLOUD.md;
DATA_BREACH_RESPONSE_PLAN.md §14) and never use that path for the live service unless this paragraph names it.
LEGAL_REQUIREMENTS.md PRV-12 uses the same list. RLS on every table
with no grants; the only way in is hushmates_api.rpc by the service role (app-facts §1-2). Email protection by
Supabase [NOT CONFIRMED].
"Use them only to ..." and "as few people as possible" are commitments: [recommended practice] write the internal key
rule (who, when, logged) before publishing. Gaps to close internally (PRV-12): MFA on the Supabase and Cloudflare
logins, least-privilege dashboard access, access logging, supplier security terms, confidentiality undertakings for
desk readers.
Done in the app: the old privacy sheet line "only Hushmates’ servers can unlock them" was not accurate (key holders
can too). At 9012d6f it reads "Your words are stored encrypted. Hushmates’ servers unlock them to show them to the
people they’re meant for, and the few people who hold Hushmates’ keys could unlock them too." (ui/relay/parts.js:185),
which matches this section. COLLECTION_NOTICE_AND_CONSENT.md §4.10 still proposes naming where the keys are kept.
Desk sign-out after 30 minutes without activity: staff/desk.js:14 (IDLE_MS) and :324-328.
-->

---

## Decisions made automatically

Some decisions in Hushmates are made by our code, using your information, with no person involved at that moment.
We want you to know what they are, what they use, and what you can do.

None of them is a diagnosis. The word check looks only at the words you've written, and it can miss things or get
them wrong. Our code doesn't restrict accounts: only a person on our safety team, or the people who run Hushmates,
can do that.

<!-- [classification: needs legal advice] TGA-4 as corrected: element (b) is arguably met, because the word check
tells a person something about their state: at 9012d6f the support screen says "What you’ve written sounds really
painful, and it matters" or "Someone might be in danger" (core/feeling-safety.js:198-215), a transient, unstored
statement. Don't
characterise the check as making no statement about the person's state, here or anywhere else. An earlier draft said
"None of them decides anything about your health"; that sentence was removed and is listed in README.md question 3
for the lawyer. Published wording counts towards intended purpose (s41BD, TGA-2) and bears on the PRV-02
health-service question. -->

### 1. The word check on feelings

- **What it decides:** whether your feeling can travel. If your words describe something that needs more than a new
  way of seeing it, like not feeling safe, someone else being in danger, abuse, violence, threats, harassment or being
  treated unfairly, it doesn't send your feeling. It shows you support lines instead. If your words tell someone to
  hurt themselves, it doesn't send your feeling either, and shows you support lines. If your words include things
  like contact details, links, a street address, a postcode or a request for money, it asks you to change them.
  Naming a national helpline's number is fine.
- **What it uses:** the words you've written. It runs on your device first, and again on our server.
- **Made by:** our code alone.
- **What happens to held-back words:** they're never sent to anyone or saved. Nobody is told.
- **Good to know:** the check uses fixed rules, not AI. It reads English only. It misses many ways people put
  things, so please don't rely on it, and it can sometimes hold back words that were fine. If it holds back your
  feeling and you think it got it wrong, you can change your words, or tell us at **[privacy contact email]**.

### 2. The word check on perspectives

- **What it decides:** whether a perspective can be sent. It turns away perspectives that tell anyone to hurt
  themselves, that are unkind, that diagnose anyone, that give advice about food, weight, medication, drinking or
  meeting up, that ask personal questions (like someone's age, where they live, or for pictures), that share contact
  or identifying details, links or money requests, or that nearly repeat one already given on the same feeling. It
  also turns away words about something that needs real support rather than a new angle, like abuse or violence.
  Naming a national helpline's number is fine. If a catcher's words suggest they, or someone else, might not be safe,
  it shows them support lines, and their words aren't saved. It may also suggest a gentler word, like swapping
  "definitely" for "maybe".
- **What it uses:** the words of the perspective, and the perspectives already given on that feeling.
- **Made by:** our code alone.

### 3. The name check when you join

- **What it decides:** whether a name can be used. It turns away names that look like contact details or long
  numbers, and names like "admin", "support" or "Hushmallow".
- **What it uses:** the name you type.
- **Made by:** our code alone.

### 4. Which feelings find which catchers

- **What it decides:** which feeling is offered to you when you look, and so who is offered yours.
- **What it uses:** whether you've turned on "Let feelings find me"; whether your account is active; your own
  feelings (you're never offered those); feelings you've already been offered; blocks, in either direction; and how
  long each feeling has been waiting.
- **How:** it takes the three feelings that have waited longest and picks one of them at random.
- **Made by:** our code alone.

### 5. Pausing a feeling after reports

- **What it decides:** whether a feeling stops travelling for now. A feeling is paused when two different people
  have reported it, or when one person reports that someone may be in danger. It stops being offered, and anyone
  holding it lets it go. It still comes home when its day ends. The person who reported it stops seeing it straight
  away. If it's your feeling, your journey shows that it's paused, with "Get support now" beside it. Our safety team
  will look at it, but they can't contact you.
- **What it uses:** reports about the feeling: how many, from how many different people, and the reason chosen.
- **Made by:** our code pauses it. A person on our safety team then reads it and decides what happens next.

### 6. The order our safety team reads reports in

- **What it decides:** reports that someone may be in danger go to the front of the queue. The rest are read
  oldest first.
- **What it uses:** the reason the reporter chose, and when.
- **Made by:** our code sets the order. People on our safety team make every decision about a report, such as
  removing a perspective or pausing an account.

### 7. Choosing a Mallow line

- **What it decides:** which line your Mallow offers you, if you allowed one.
- **What it uses:** the words of your feeling and its name (if you didn't choose one, the code makes its best guess
  from your words, and doesn't keep that guess, though a word for it may appear in the line itself); your Mallow; and
  the lines you've been offered recently, so they don't repeat.
- **How:** it looks for themes in your words (like loss, study, money or a busy home), familiar situations (like a
  message that hasn't been answered), and familiar ways of reading a situation (like expecting the worst, or
  guessing what someone else is thinking). Then it puts together a short line from a fixed set of pieces written in
  advance for Hushmallow: an opening in your Mallow's voice and one perspective that fits, sometimes with a word for
  your feeling filled in. It isn't a person, and no AI is used to make it.
- **When:** if nobody has caught your feeling after 30 minutes, even if Hushmates is closed, or when you ask your
  Mallow.
- **Made by:** our code alone. If a line is unhelpful, you can report it and it disappears straight away.

### 8. Limits on overuse

- **What it decides:** whether to pause a request for a moment. For example: at most 6 feelings an hour and 24 a
  day, 3 travelling at once, 12 perspectives an hour, 20 reports a day, and a limit on wrong invitation codes.
- **What it uses:** your recent requests, and, for wrong invitation codes only, a scrambled reference to your
  network.
- **Made by:** our code alone.

### 9. Tidying up on schedule

- **What it decides:** when feelings come home (after five perspectives or a day), when a held feeling is offered to
  someone else (after a few minutes), and when old words are cleared (see "How long we keep things").
- **What it uses:** times.
- **Made by:** our code alone, every minute and every night.

<!--
[classification: needs legal advice] APP 1.7-1.9 (from 10 December 2026). The policy must state (APP 1.8, paraphrase
of the OAIC APP 1 guidelines): (a) the kinds of personal information used in the operation of the programs; (b) the
kinds of decisions made solely by the programs; (c) the kinds of decisions where a program does something
substantially and directly related to making the decision. Each item above gives "What it uses" = (a); "Made by: our
code alone" = (b); items 5 and 6 (the human part after a pause; queue order) = (c).
In scope only where the decision "could reasonably be expected to significantly affect the individual's rights or
interests" and the entity is an APP entity. Which of items 1-9 meet "significantly affect" is the judgement for the
lawyer: the hold-back (item 1) and the pause (item 5) are the strongest candidates; matching and Mallow selection are
probably not significant. This section is included whatever the answer (PRV-07): it costs little and is required if
in scope. Human review doesn't take a decision out of scope; refusing or failing to decide is a decision (APP 1.9,
earlier-run fact-sheet extract); grouping is allowed but the detail "must be meaningful to a reasonable person".
Sources: OAIC, "New resources on transparency for use of AI and automated decision-making",
https://www.oaic.gov.au/news/media-centre/new-resources-on-transparency-for-use-of-ai-and-automated-decision-making
("On 10 December 2026, APP entities must include information in their privacy policy where they have arranged for a
computer program to make or inform decisions that significantly affect individuals' rights or interests", search
extract); OAIC APP 1 guidelines September 2026 v2,
https://www.oaic.gov.au/__data/assets/pdf_file/0027/269064/APP-Guidelines-APP-1-Open-and-transparent-management-of-personal-information-September-2026-v2.pdf
(search extract); APP 1.7-1.9 fact sheet,
https://www.oaic.gov.au/__data/assets/pdf_file/0021/269013/APP-1.7-1.9-Transparency-Obligation-Fact-Sheet.PDF
(listed; examples not readable). The statutory text of APP 1.7-1.9 was not seen.
Facts (checked at 9012d6f; core/ and its vendored copy under supabase/functions/_shared/vendor/ are identical): item 1
screenFeeling (core/feeling-safety.js:330-359) holds back every category the lexicon marks not reframeAppropriate,
each with its own support screen: crisis ("Let’s pause here"), someone in danger ("Someone might be in danger"), and
the care messages ending "It won’t be sent out for other perspectives" for abuse, violence, threats, harassment,
discrimination and "unsafe" (:184-216; quoted in SAFETY_DISCLAIMERS.md §3.3). Words telling the reader to hurt
themselves, or that someone shouldn't exist, are no longer refused with a request to change them: in a feeling they
get the crisis support screen, or the harassment care screen when someone else said them to the writer (REPORTED_SPEECH
and not SELF_TALK) (:238-265, :292-294, :339-344). Contact details, links, money requests, street addresses and
postcodes (Australian ones with context) are refused with a request to change them (:227-236, :349-357); national
helpline numbers are removed before that rule reads the words, so naming them is fine (:221-225). The gateway runs the
same screen again on the server, and again before any "Send it out again" (supabase/functions/_shared/gateway.js:75-78,
:107-108); the browser runs it first (ui/relay/release.js:157). "English only" and "can miss things" are the app's own
words at 9012d6f (ui/relay/welcome.js:105; ui/relay/you.js:70; ui/relay/parts.js:187). "It misses many ways people put
things" is stronger than the app, and is the honest summary of the Tier 0 developer probe: the screen showed crisis or
danger support for 25 of 127 developer-written crisis or danger phrasings (docs/safety/TIER0_SELF_ASSESSMENT.md §1
and §4.2). That is evidence of gaps, not a measured detection rate; don't quote it to members as a rate (D18 decides
whether a caution-only batch comes before Tier A).
Item 2: screenReframe (core/feeling-safety.js:367-392): crisis and someone-in-danger words get support for the writer
and are never stored (gateway.js:91-95); other care categories are refused ("needs real support rather than a new
angle", :374-376); incitement is refused (:377, INCITES_IN_PERSPECTIVE, which lets "don't hurt yourself over this" and
"it can feel like nobody would miss you" through, :251-261); HARMFUL_ADVICE refuses diet, weight, medication-stopping
and drinking advice and the age, location, school, meeting-up, pictures and "are you single" questions (:266-290,
:378); then length, unkindness, diagnosis, contact or identifying details, and similarity 0.8 to an earlier
perspective (:379-390); the certainty nudge (:309, :391). Item 3 text-policy.js:77-92. Item 4 m_find_feeling,
fairnessPool 3 (rules.sql:562-610). Item 5 reportsToPause 2 or reason 'safety' (rules.sql:905-912), a reporter already
answered can't re-pause alone; the author sees "Paused for now. Our safety team will look at it, but they can’t contact
you. It still comes home within …" and "Get support now" (ui/relay/journeys.js:134-137). Item 6 desk queue order, urgent first then oldest (rules.sql:1068-1077); the desk marks a
priority report still open after 12 hours "Over 12 hours" (staff/desk.js:187; docs/ESCALATION.md §2), but nothing
alerts anyone (no email or push: ESCALATION.md "There are no alerts"). Item 7 core/perspectives.js THEMES (:198),
matchScenarios and detectPatterns from the main app's Reframe engine (:585, :601; detectPatterns is skipped when the
words suggest harm at home, grief or worry about someone's welfare), inferLabel (:502), last 12 angle_ids (api.sql:104-109;
mallow.js:56), fallbackAfterMs 1800000 (schema.sql settings; core/relay-rules.js:13); the shown line is an opener plus
one perspective, with an optional {adj} filled from the label or the inferred label (core/perspectives.js:612-618, :640);
angle_id records the perspective part only. Item 8 schema.sql:30-36 limits (core/relay-rules.js:16-20). Item 9 pg_cron
jobs: 'hushmates-tick' every minute and 'hushmates-retention' at 03:17 daily (api.sql:349, :356).
The TGA bears on how items 1 and 7 are described: the in-app copy stays non-clinical, but the selection logic, the
public repository's design documents and Tier A question 10 (recognisable CBT exercises in plain words,
TIER0_SELF_ASSESSMENT.md §3.4) all go to the lawyer for the intended-purpose question (TGA-1, TGA-2, TGA-4, TGA-5;
LEGAL_REQUIREMENTS.md question 3). Nothing here says ARTG inclusion is or isn't needed.
System hold (hold_for_safety) when an AI provider's own check flags a feeling is left out: it is unreachable with AI
off; add it if AI is ever switched on.
Wording: "word check", not "screen", "detect", "assess risk" or "monitor" (TGA-4, TGA-10); never "CBT" or "therapy"
in anything members read. The "familiar ways of
reading a situation" sentence describes detectPatterns accurately without CBT vocabulary; the lawyer must still see
the selection logic itself (critic's correction to TGA-5).
If a classifier, LLM or "are you safe right now?" check-in is ever added (docs/CRISIS_DETECTION.md, D2), rewrite item 1
and re-check TGA status first (TGA-11).
-->

---

## How long we keep things

We keep things only as long as Hushmates needs them. Here's exactly how long.

| What | How long |
|---|---|
| A feeling while it travels | Up to a day each trip. You can send it out again up to twice. |
| A feeling that's come home, if you don't save it | Its words, its journey and your choices are cleared **30 days after it comes home**, with the words of every perspective and Mallow line on it. |
| A feeling you save | Until you delete it, let it go, or delete everything. |
| A feeling you let go | Its words are cleared straight away. Perspectives you chose to keep stay with you for **30 days after it came home**, or for as long as you like if you saved it first. |
| A journey you delete | Every word on it is cleared straight away, including perspectives you kept. |
| A perspective you offered | As long as the feeling it's on keeps its words (above). Cleared straight away if you take it back. If the author saved the feeling, it stays until they delete it or you take yours back. |
| A Mallow line | With its journey (above). |
| Words held back by the word check | Never stored. |
| Words copied into a report | Cleared **90 days after the report is decided**, or **180 days after it was made** if it's never decided. Cleared sooner if you delete your data. |
| Activity log (no words) | **365 days.** |
| Request records, and scrambled network references | Cleared at the next daily tidy-up after **48 hours**, so kept for up to **3 days**. |
| Daily Mallow counts | Up to **8 days.** |
| Your email address and sign-in | Until you delete your Hushmates data. |
| Backups | **[None on our current plan / daily backups kept for up to 7 days: owner to confirm (decision D3)].** |
| Manual copies of the database (to test we can restore it) | The words in them stay locked. The other records in them aren't locked (your Hushmates name, feeling names, which Mallow lines were used, report reasons and who reported whom), so copies are kept only on an encrypted computer and deleted within **[30 days]**. They don't include email addresses. |
| Our hosts' technical logs | **[TO CONFIRM for the chosen plans.]** |

**Some records have no end date yet.** They hold none of your words: the record that your account existed (after
you delete your data, without your name or email); the record of each feeling and perspective without its words
(for example its feeling name, its times and how its journey ended); which feelings were offered to you; blocks;
reports without their words (the reason, who made it, who it was about, and the outcome); our safety team's notes;
invitation records; which Mallow lines you were offered; and daily totals that aren't about anyone.
**We're setting end dates for these, and we'll update this policy when we do.**

**If you asked for a sign-in code but never joined,** your email address stays in our sign-in system until you ask
us to delete it at **[privacy contact email]**.

<!--
[classification: depends on functionality or business circumstances] APP 11.2: destroy or de-identify information no
longer needed for a permitted purpose, unless a law requires it to be kept (wording from memory and an earlier-run
extract). Deciding facts: APP-entity status; the approved schedule; the backup window (PRV-13).
Facts (all from code; app-facts §2a): settings.retention {returnedDays 30, evidenceDaysAfterResolution 90,
openEvidenceDays 180, auditDays 365, rateEventsHours 48}; usage_daily 7 days; job_retention daily at 03:17 (pg_cron
time zone [NOT CONFIRMED], normally UTC); journeyTtlMs 86400000, maxResends 2. Because the job runs once a day, rate
events last up to about 72 hours and daily Mallow counts up to about 8 days (RETENTION_AND_DELETION.md D1, B10); the
table says so. Alternative: move those deletions into the minute job and say "48 hours" and "7 days".
Let go: m_release_journey sets status 'released' and clears the feeling's words; job_retention then clears every
unsaved 'returned' or 'released' journey 30 days after it came home, with all its perspectives and Mallow words, kept
ones included (api.sql:169-177). A saved journey is skipped ("and not saved"), and the UI hides "Save my journey" once
a feeling is released (ui/relay/returned.js:235-236), so only a feeling saved before letting go keeps its kept
perspectives. [GAP, still open at 9012d6f] The app's own let-go confirmation says "Your words are cleared for good. Any
perspectives you chose to keep stay with you." (ui/relay/returned.js:293): it needs the same qualification.
Manual copies: a pg_dump holds the encrypted words plus every plain-text record (RETENTION_AND_DELETION.md E10;
DATA_BREACH_RESPONSE_PLAN.md §4). "Kept only on an encrypted computer" is a rule to adopt with the [30 days] rule.
[GAP] Kept with no limit today (app-facts §2a): journey and perspective rows' metadata (including label and consent
times); mallow_perspectives rows (angle_id shows the matched theme, e.g. hm-loss-1, hm-health-2: that alone can hint
at health); holds; exposures; blocks; report rows; report_notes (encrypted); members rows after deletion (including
adult_confirmed_at, invite_id); invites (including the free-text note); ai_usage; ops_daily. The table above discloses
this honestly. [recommended practice] Before outside testers, set limits: e.g. drop holds/exposures and
mallow_perspectives rows with the journey's words; delete blocks when either side deletes their data; clear desk
notes with the report evidence; delete member rows' remaining fields after a fixed period.
[GAP] Auth accounts of people who request a code but never redeem an invitation are kept indefinitely (app-facts P1);
deleteMyData needs a member. Fix (an expiry job) or keep the sentence above.
[GAP] Backups: Free plan has none, Pro keeps 7 days (docs, D3 undecided). The owner's manual pg_dump has no defined
retention (docs/STAGING.md:282): the "[30 days]" rule must be adopted before publishing. No procedure re-applies
deletions after a restore: write one.
-->

---

## Your choices: download, take back, delete

You can do all of these yourself, at any time, in **You & safety**.

- **Download your data.** You get a file of what Hushmates keeps that's yours: your feelings and what came back,
  the perspectives you offered, your reports (your own reasons only), your choices and settings, and when you agreed
  to each thing. Other people appear only as "A Hushmate".
- **Bring a feeling home early,** let it go, or delete its journey.
- **Take back a perspective you offered.** Your words are removed for good, including from the collection of the
  person whose feeling you caught.
- **Change whether your perspectives may appear in share pictures,** one by one.
- **Turn "Let feelings find me" off,** at any time.
- **Sign out** of one device. Your feelings keep travelling.
- **Delete all your Hushmates data.** This deletes, straight away: the words of every feeling you released, and every
  perspective on them; every perspective you gave, on anyone's feeling; your Mallow lines; your words in reports you
  made or that were made about you; and your sign-in and email address. Your name is replaced with "A former
  Mallow", and you're signed out everywhere. It can't be undone. If our sign-in system can't be reached at that
  moment, we keep trying automatically.

**What deleting can't reach:**

- **Pictures or videos someone already made** with your words, if you allowed it. They're on their device.
- **Words people have already read.** We can delete the words, but not the memory of reading them.
- **Records without your words** that have no end date yet (see "How long we keep things").
- **Backups,** until they're replaced **[within 7 days, if we use backups]**.
- **Our hosts' technical logs,** until they expire **[TO CONFIRM]**.

<!-- Facts: export (core/export-format.js:30-77, format version 2: the share consent is now
agreedToShareWithoutYourNameAt, :44, :54-55, never "anonymously"; app-facts §5). The export still leaves out the 18+
confirmation time (members.adult_confirmed_at is not in m_export_raw, rules.sql:969-993) [GAP: hence "just ask us" in
"Seeing and correcting"]. deleteMyData (rules.sql:995-1027) then the Auth user deleted by the Edge Function
(supabase/functions/hushmates/index.ts:64-67), retried at least 5 minutes apart up to 50 attempts (api.sql:201-210)
[GAP: after 50 failures nobody is alerted and the email stays: add an alert before publishing "we keep trying"].
Delete-everything confirmation copy: ui/relay/you.js:113. -->

## Seeing and correcting your information

You have the right to ask for the information we hold about you, and to ask us to correct it.

**Much of it is in your download.** For anything that isn't, just ask us at **[privacy contact email]**. That
includes your email address and sign-in records, when you confirmed you're 18 or over, which invitation you used,
reports made about things you wrote (we'll never say who made them), our safety team's notes about you, and the
records without words described above.

**To correct something:** you can't change your Hushmates name or your email address in the app yet, so please ask
us. Feelings and perspectives can't be edited once they're sent, but you can take them back or delete them. If you
think something we hold about you is wrong, out of date or misleading, tell us and we'll fix it, or explain why not.

**How it works:**

- Write to us from the email address you sign in with, so we know it's you. We won't ask for ID.
- Asking is free.
- **We'll reply within 5 business days to say we've got it, and give you a full answer within 30 days.** If we
  need longer, we'll tell you why.
- If we can't give you something, or can't make a change, we'll tell you why in writing, and how to complain. For
  example, we can't show you who made a report, or another person's words or identity.

<!--
[classification: depends on functionality or business circumstances] APP 12 (access) and APP 13 (correction).
OAIC: respond "within a reasonable period, in most cases not exceeding 30 calendar days"; must not charge for making a
request (OAIC, "Dealing with requests for access to personal information",
https://www.oaic.gov.au/privacy/privacy-guidance-for-organisations-and-government-agencies/handling-personal-information/dealing-with-requests-for-access-to-personal-information,
earlier-run extract, not re-seen). Written reasons for refusal and the APP 12.3 exceptions (e.g. unreasonable impact on
others' privacy) and APP 13 wording: from memory, not seen. Desk notes about the requester are their personal
information: refusing them needs a specific APP 12.3 exception (PRV-14).
"5 business days" acknowledgement is [recommended practice]: only publish it if someone is named to watch the inbox.
[GAP] No correction function: the display name can't change after joining (savePreferences accepts only catching,
notifyReturn, mallow, onboarded: rules.sql:332-353); no email-change route; no operator tool to read Auth records or to
delete a member's data on request (server/admin.mjs). Requests must be handled by hand until tools exist.
-->

## Questions and complaints

If you have a question or a worry about your privacy, please tell us first at **[privacy contact email]**. We'll
reply within 5 business days, and aim to sort it out within 30 days. We'll tell you what we found and what we'll do.

If you're not happy with our answer, or you haven't heard back within 30 days, you can complain to the **Office of
the Australian Information Commissioner (OAIC)**: **oaic.gov.au**, or **1300 363 992**.

<!--
[classification: depends on Hushmallow's functionality or business circumstances] An OAIC complaint route exists only if
Hushmallow is an APP entity (PRV-02, needs legal advice) or opts in under s6EA (PRV-03). Publish the OAIC sentence
above only once one of those is settled. If Hushmallow is exempt and hasn't opted in, telling members they can
complain to the OAIC would be an inaccurate statement about their rights: an ACL s18 and s29 risk (SCW-07; the same
logic as SCW-10's Booktopia point). See Drafting notes C.
APP 1.4(e) (from memory): how to complain and how
complaints are handled; APP 1.2: practices to handle enquiries and complaints. The OAIC phone number and its usual
expectation that a person complains to the entity first and waits 30 days are from memory: check on oaic.gov.au before
publishing.
[classification: needs legal advice] State health records laws: Victoria's Health Records Act 2001 (no small business
exemption; "applies regardless of the size of the business", https://www.health.vic.gov.au/legislation/health-records-act,
search extract) and NSW's Health Records and Information Privacy Act 2002 ("applies to every organisation that is a
health service provider or that collects, holds or uses health information",
https://legislation.nsw.gov.au/view/whole/html/inforce/current/act-2002-071, search extract). Territorial reach and the
NSW small-business cross-reference were not verified (PRV-17, PRV-18). If advice says either applies, add the Victorian
Health Complaints Commissioner and/or the NSW Information and Privacy Commission here. ACT Health Records (Privacy and
Access) Act 1997: unresearched, no source seen (PRV-19 as corrected).
-->

## If something goes wrong with your information

If we think there's been a data breach, we act straight away to contain it, and we work out within 30 days whether
it could seriously harm anyone. If it's likely to cause you serious harm, **we'll tell you directly, by email, as
soon as we can,** and we'll tell the OAIC. We'll say what happened, exactly what information was involved, and what
you can do.

<!--
[classification: depends on functionality or business circumstances] Notifiable Data Breaches scheme, Privacy Act Part
IIIC: assess within 30 calendar days (s26WH(2)); statement to the Commissioner as soon as practicable (s26WK(2)) with
(a) identity and contact details, (b) description, (c) the kinds of information, (d) recommended steps (s26WK(3));
notify individuals directly as soon as practicable (s26WL). "Within 30 days" above means taking all reasonable steps to
finish the assessment within 30 calendar days after becoming aware of the grounds to suspect a breach (s26WH(2), as
quoted by the OAIC). Source: OAIC, Part 4: Notifiable Data Breach (NDB) scheme,
https://www.oaic.gov.au/privacy/notifiable-data-breaches/preventing-preparing-for-and-responding-to-data-breaches/data-breach-preparation-and-response/part-4-notifiable-data-breach-ndb-scheme
(search extract quoting the sections). s26WE/s26WG wording not seen. Binds APP entities only (PRV-02); if exempt,
notifying is still recommended. The breach response plan is a separate internal document. Watch item: the Tranche 2
exposure draft's 72-hour rule is not law as of 15 October 2026 (secondary sources only).
-->

---

## Children and age

Hushmates is for **adults, 18 and over.** It's an invitation-only pilot.

When you join, you tick to confirm you're 18 or over. We don't ask for ID or your date of birth, and we don't check
your age in any other way.

If you're under 18, please don't use Hushmates. If you think someone under 18 is using it, please tell us at
**[privacy contact email]**.

If we learn that someone under 18 has joined, we'll pause their account, let them download their data if they'd
like, and then delete their account and everything they wrote.

<!--
[classification: needs legal advice] Under-16 social media minimum age (Online Safety Act 2021 Part 4A). Hushmates is
an "age-restricted social media platform" if all the s63C(1)(a) conditions are met and no exclusion applies: (i) the
sole or a significant purpose is enabling online social interaction between 2 or more end-users (eSafety: if unsure,
presume significant); (ii) end-users can link to or interact with other end-users (perspectives reach the author:
arguably met); (iii) end-users can post material (met); (iv) further conditions in the rules. The research leans "in
scope" (LEGAL_REQUIREMENTS.md question 2): the s63C base test leans met, and the 2026 additional condition (the
Rules' rule 4A, F2026L00370, seen only as a heading; operative text not seen) leans met through time-limited
features: a 3-minute offer, 10 minutes to write, then the catcher never sees the feeling again, and a 24-hour journey
(core/relay-rules.js:11-14; U16-02). Exclusion to test: Rules 2025 s5(1)(f), a service whose sole or primary purpose
is supporting the health of end-users (Explanatory Statement examples include journals and moderated peer forums;
s5's own text not seen) (U16-01 to U16-03). That exclusion cuts against the non-clinical positioning used everywhere
else, and must be answered consistently with the TGA and PRV-02 questions. Decision D9: the lawyer's view first.
This policy neither claims the law applies nor that it doesn't, and nothing here may be read as saying it doesn't
apply. If it applies, an 18+ tick alone is unlikely to be "reasonable steps" (eSafety does not consider
self-declaration alone reasonable), and age-assurance data would have its own use and destruction limits (s63F, not
seen; U16-09). Sources: Online Safety Act 2021,
https://www.legislation.gov.au/C2021A00076/2024-12-11/2024-12-11/text/original/epub/OEBPS/document_1/document_1.html
(official text, search extract); eSafety assessment guidance,
https://www.esafety.gov.au/about-us/industry-regulation/social-media-age-restrictions/assessment (search extract);
Rules 2025 Explanatory Statement, https://www.legislation.gov.au/F2025L00889/asmade/2025-07-30/es/original/pdf (search
extract); the 2026 amending Rules, https://www.legislation.gov.au/F2026L00370/asmade/text (heading only).
[classification: depends on functionality or business circumstances] Children's Online Privacy Code: must be registered
by 10 December 2026; not registered as of the OAIC's August 2026 update; excludes health service providers
(https://www.oaic.gov.au/privacy/privacy-registers/privacy-codes/childrens-online-privacy-code, search extract). Don't
claim compliance or exemption until the final text is known; re-check after 10 December 2026 (U16-11).
[classification: recommended practice] The under-18 handling above follows U16-12 (eSafety: "deactivate or remove those
accounts with kindness, care and clear communication", search extract). [GAP] There is no operator deletion tool and no
"may be under 18" report reason today (app-facts §8): both must exist before this paragraph is published. Age copy must
match what is actually checked (U16-13): never "verified" or "age-checked".
-->

## Not an emergency service

Hushmates isn't an emergency, crisis, counselling or therapy service. Nobody is watching in real time, and our small
safety team reads reports, but not around the clock and not straight away. It can't see who anyone is or contact
anyone, so it can't send help.

During the pilot, we aim to read reports that someone may be in danger within a day, and other reports within two
days. Nights, weekends and holidays can take longer. When our safety team will be away for more than a day, the message
you see after you report something says so.

If you might not be safe, please call **000**, or Lifeline on **13 11 14**, any time. Tap **Support** at the top of
the screen for more lines, like the Suicide Call Back Service and 13YARN, or "Get support now" in You & safety.

<!-- [classification: recommended practice] Honest statement of limits (SM-06; SCW-07; SCW-17 needs legal advice on
negligence). Never imply emergency help, monitoring, crisis support or contact. Matches the app at 9012d6f: the report
sheet "A person on our safety team reads reports, but not straight away and not around the clock. They can’t see who
anyone is, and they can’t contact anyone." (ui/relay/common.js:128) and its danger hint "Our team can’t see who wrote
it, so we can’t contact them or send help." (:114-115); You & safety "Rules first, then people ... during the pilot we
aim to do that within a day or two, and nights, weekends and holidays can take longer" (ui/relay/you.js:70) and "If
you’re not okay → Get support now" as its first section (:52-54); the Support button in every header
(ui/relay/common.js:45-49).
[classification: depends on functionality or business circumstances] The aims are the app's acknowledgement after a
report (supabase/migrations/20261015090000_hushmates_tier0.sql:45-47; core/relay.js:823-826): priority "during the
pilot we aim to read priority reports within a day, and nights, weekends and holidays can take longer", others "within
two days". While settings.desk.awayUntil is set (node server/admin.mjs set desk '{"awayUntil":"YYYY-MM-DD"}', validated
today to 90 days ahead in Sydney, server/admin.mjs:36-68), reporters see "Our safety team is away until {day}, so it
will be read when we’re back"; a value the database can't read as such a day still reads as away, with no date
(tier0.sql:25-43). The away notice appears only when the owner sets it: nothing sets it automatically, and the
procedure says to set it before any absence of more than 24 hours (docs/legal/MODERATION.md §5.2); the sentence above
is a commitment to do that. The "within a day" and "within two days" aims are aims, not promises, and they hold only
if readers are named and check at fixed times
(D12, not yet decided; docs/ESCALATION.md §2). The team's own internal target for priority reports stays 12 hours
(ESCALATION.md §2); it isn't promised to members. Nothing alerts anyone when a report arrives (no email or push). If
D12 isn't settled, or the aims can't be met, change this paragraph and the app together.
Support lines: core/feeling-safety.js:166-180 (SUPPORT_NOW_RESOURCES); re-check every number before publishing. -->

---

## Changes to this policy

We'll keep this policy up to date. When we change it, we'll change the date at the top.

If a change matters to you, for example a new use of your information, a new service provider, or something going
overseas that didn't before, we'll tell you in the app before it starts. **We'll never use feelings you've already
shared in a new way without asking you first.**

You can read this policy at any time, free, in the app and at **[web address]**. If you'd like it in another form,
just ask.

<!-- [classification: depends on functionality or business circumstances] APP 1.3 "clearly expressed and up-to-date"
policy (earlier-run extract of the OAIC APP 1 guidelines); APP 1.5 free and in an appropriate form, APP 1.6 another
form on request (from memory). [GAP, still open at 9012d6f] The app has no link to a full policy today;
COLLECTION_NOTICE_AND_CONSENT.md proposes where it goes. -->

---
---

## Drafting notes (internal: remove before publishing)

### A. What each part of this policy rests on

| Part | Classification | The fact or question it turns on |
|---|---|---|
| The whole policy (APPs, NDB) | **Needs legal advice** | Is Hushmallow an APP entity? s6D(4)(b) health-service exception (PRV-02); or opt-in under s6EA (PRV-03, recommended practice). Drafted as if bound. |
| Health information and consent | Depends on functionality or business circumstances | APP-entity status; whether a feeling holds health information. Treated as sensitive throughout (PRV-04). |
| Third parties in feelings | **Needs legal advice** | Whether third parties are reasonably identifiable to Hushmallow (PRV-05). |
| Purposes and "never without asking" | Depends on functionality or business circumstances | Stays true only while no new use of feeling text is added (AI, analytics, research) (PRV-09). |
| Service providers and overseas | Depends on functionality or business circumstances | Email provider and country (D5); Supabase support access and sub-processors; Edge Function region; data processing terms (PRV-11). |
| Law-required and serious-threat sharing | Depends on functionality or business circumstances | Whether any identity-lookup step for danger reports is adopted (PRV-10). |
| Security and keys | Depends on functionality or business circumstances | APP-entity status; internal key-access rule; MFA and logging (PRV-12). |
| Automated decisions | **Needs legal advice** | Which decisions "significantly affect" rights or interests; commences 10 December 2026 (PRV-07). Included regardless. |
| Retention | Depends on functionality or business circumstances | The approved schedule; backup plan D3; the no-end-date records (PRV-13). |
| Access and correction | Depends on functionality or business circumstances | APP-entity status; manual request handling until tools exist (PRV-14). |
| Complaints and state laws | Depends (complaints); **needs legal advice** (Vic, NSW, ACT health records laws) | Owner's state; territorial reach (PRV-17 to PRV-19). |
| Data breaches | Depends on functionality or business circumstances | APP-entity status (PRV-15). Breach plan: recommended practice (PRV-16). |
| Children and age | **Needs legal advice** (under-16 law); depends (Children's Code); recommended practice (handling) | U16-01 to U16-03, U16-11 to U16-13. The research leans "in scope" (s63C base test; the Rules' rule 4A time-limited condition); the health-purpose exclusion (Rules s5(1)(f)) is untested. D9. Nothing in this policy says the law doesn't apply. |
| How the word check and Mallow lines are described (TGA intended purpose) | **Needs legal advice** | TGA-1, TGA-2, TGA-4, TGA-5; s41BD. Published wording counts towards intended purpose; the public repository (D19) does too. Nothing in this policy says ARTG inclusion is or isn't needed. |
| Response-time aims and the away notice | Depends on functionality or business circumstances | The app's own aims (within a day for priority reports, within two days for others); named readers and check times (D12); the owner setting the away notice (MODERATION.md §5.2). |
| Accuracy of every statement | Recommended practice (and part of informed consent if bound; ACL s18 if in trade or commerce) | PRV-22, SCW-07. |
| Statutory tort for serious invasions of privacy | Depends on functionality or business circumstances (conduct) | Applies whatever the APP status, to intentional or reckless misuse (PRV-20, earlier-run extract only). Not mentioned to members; covered by internal access rules and the terms. |

No part of this policy is classed as a "verified obligation" binding Hushmallow today, because each APP duty turns on
APP-entity status, which is unresolved.

### B. Facts to confirm before publishing

1. The legal name, ABN, privacy contact email (decision D23) and web address (none exist in the app at 9012d6f).
2. What Supabase Auth records (IP address, browser, audit log), for how long, and what deleting a user removes.
3. Supabase and Cloudflare platform logs: contents and retention on the chosen plans; any Cloudflare cookie.
4. Where the Edge Function executes (pin it to Sydney if possible); Supabase staff access and sub-processors.
5. The email provider, where it processes data, and its terms (D5).
6. The backup plan (D3) and a written rule for manual copies.
7. Data processing terms with each provider (READINESS §2.9).
8. Who holds the keys now and later (D11), written as an internal rule with logging.
9. The OAIC phone number and complaint expectations (from memory).
10. That the Permissions-Policy in `tools/pack-site.mjs` still blocks camera, microphone and location at launch.
11. Who reads the desk and when (D12), so the "within a day" and "within two days" aims can be met.
12. Every support line's number and description (`core/feeling-safety.js:166-180`), from each service's own site.
13. How the Mallow lines were written and reviewed (owner), before any wording about who wrote them.

### C. Gaps that make a sentence untrue until fixed (or until the sentence changes)

| Sentence in this policy | Gap today | Fix |
|---|---|---|
| "If we learn that someone under 18 has joined, we'll ... delete their account" | No operator deletion tool; no "may be under 18" report reason | Add both, or change the sentence |
| "We keep trying automatically" (sign-in deletion) | Stops after 50 attempts with no alert | Add an alert |
| "Manual copies ... deleted within [30 days]" | No rule exists | Adopt the rule |
| "A written agreement" with overseas providers | No data processing terms yet | Sign them |
| "We keep a record of each request" (law enforcement) | No log exists | Start one |
| "Use them only to ..." (keys); "Nobody at Hushmates reads feelings as they travel" | A practice, not a technical control | Internal rule plus access logging |
| "We'll reply within 5 business days" | No one named to watch the inbox | Name someone, or drop the 5-day promise |
| "Some records have no end date yet" | True, and honest, but weak for APP 11.2 | Set end dates (see the retention comment) |
| "Complain to the OAIC" | APP-entity status unresolved (PRV-02); no opt-in (PRV-03) | Opt in, or get advice, before publishing |
| "Copies are kept only on an encrypted computer" (manual copies); "on the owner's own computer" (keys) | Disk encryption not confirmed | Confirm it, or change the sentence |
| "We aim to read reports that someone may be in danger within a day, and other reports within two days" | No readers named, no fixed check times, no alerts (D12; ESCALATION.md) | Name readers and times, or change the sentence and the app together |
| "When our safety team will be away for more than a day, the message you see ... says so" | Relies on the owner setting `awayUntil`; nothing sets it automatically | Make it part of the owner's routine (MODERATION.md §5.2) |
| "This address isn't watched around the clock" | No address exists yet (D23) | Set it up, checked at the desk's times |

### D. App wording that must change so the app matches this policy

These are proposals only; this drafting changed no code. Exact replacement wording is in
`COLLECTION_NOTICE_AND_CONSENT.md`. Checked against the app at `9012d6f`.

**Done in the app since the first draft:**
- ✅ "Share anonymously with Hushmates participants" and the other "anonymously" lines (D8): the tick now reads "Share
  with Hushmates participants, without my name" (`ui/relay/release.js:103`), with its resting line (`:70`), the server
  message (`core/relay-messages.js:23`), the Your data summary (`ui/relay/your-data.js:62`) and the export key
  `agreedToShareWithoutYourNameAt`, format version 2 (`core/export-format.js:44, 55`).
- ✅ The privacy sheet's "only Hushmates’ servers can unlock them": it now says the few people who hold Hushmates’ keys
  could unlock them too (`ui/relay/parts.js:185`).
- ✅ "Hushmates writes it" and "written automatically ... from your words" in the privacy sheet, "Send it out again"
  and "Explore another angle": these now say "chosen automatically from a fixed set of ... written in advance for
  Hushmallow" or "chooses it ... guided by your words" (`ui/relay/parts.js:184`; `ui/relay/returned.js:319, 348, 351`;
  `ui/relay/welcome.js:104`; `ui/relay/you.js:69`).
- ✅ Honest safety wording: "Not an emergency service" on the welcome (`ui/relay/welcome.js:105-106`), "Rules first, then
  people" in You & safety (`ui/relay/you.js:70`), the report sheet (`ui/relay/common.js:128`), the acknowledgements
  (`supabase/migrations/20261015090000_hushmates_tier0.sql`), and Support in every header (`ui/relay/common.js:45-49`).

**Still to change:**
- The Release screen's Mallow switch and note still say "an automatically generated perspective" and "Hushmates writes a
  perspective for you automatically" (`ui/relay/release.js:110, 117`): "writes" is not accurate.
- "Automatically generated" in the travelling note (`ui/relay/journeys.js:162, 175`), both report intros
  (`ui/relay/journeys.js:287`; `ui/relay/returned.js:257`), Your data (`ui/relay/your-data.js:59`), and the label itself,
  "A Mallow perspective · Automatically generated" (`core/relay-config.js:74-75`, `rules.sql:236`,
  `ui/relay/share-render.js:27, 37`): decision D21, open. Until it's decided, this policy explains the label ("Mallow
  lines").
- "Pseudonymous, not perfectly anonymous" (`ui/relay/welcome.js:102`; `ui/relay/you.js:48`) and the privacy sheet's "Not
  perfectly anonymous" (`ui/relay/parts.js:183`): they lean on the idea of anonymity.
- "We’ll only use your email to sign you in" (`ui/relay/sign-in.js:108`) and "Your email is used only to sign you in"
  (`ui/relay/parts.js:185`): this policy names two more uses (replies, and important notices).
- The let-go confirmation "Any perspectives you chose to keep stay with you." (`ui/relay/returned.js:293`): true only
  for 30 days after the feeling came home, unless it was saved before letting go (`api.sql:169-177`).
- No link to this policy, no contact route and no business name anywhere in the app.

### E. Sources

All sources below were seen **only as search-tool extracts** (usually paraphrased) unless stated otherwise. None was
opened directly, because this environment cannot reach legislation.gov.au or oaic.gov.au. Decision D20 (optional)
would add the official domains to the environment's allowed list, so each cited section can be checked against the
official text before the lawyer sees this draft.

- Privacy Act 1988 (Cth): https://www.legislation.gov.au/C2004A03712/latest/text (not opened; series id from memory;
  provisions cited through OAIC extracts or from memory, as marked in each comment).
- OAIC, APP Guidelines Chapter B (key concepts, consent):
  https://www.oaic.gov.au/privacy/australian-privacy-principles/australian-privacy-principles-guidelines/chapter-b-key-concepts
- OAIC, APP Guidelines Chapter 1 and the APP 1 guidelines (September 2026 v2):
  https://www.oaic.gov.au/privacy/australian-privacy-principles/australian-privacy-principles-guidelines/chapter-1-app-1-open-and-transparent-management-of-personal-information ;
  https://www.oaic.gov.au/__data/assets/pdf_file/0027/269064/APP-Guidelines-APP-1-Open-and-transparent-management-of-personal-information-September-2026-v2.pdf
- OAIC, automated decisions: https://www.oaic.gov.au/news/media-centre/new-resources-on-transparency-for-use-of-ai-and-automated-decision-making ;
  fact sheet https://www.oaic.gov.au/__data/assets/pdf_file/0021/269013/APP-1.7-1.9-Transparency-Obligation-Fact-Sheet.PDF (listed, not readable)
- OAIC, APP Guidelines Chapter 2 (earlier-run extract, not re-seen):
  https://www.oaic.gov.au/privacy/australian-privacy-principles/australian-privacy-principles-guidelines/chapter-2-app-2-anonymity-and-pseudonymity
- OAIC, APP Guidelines Chapter 3:
  https://www.oaic.gov.au/privacy/australian-privacy-principles/australian-privacy-principles-guidelines/chapter-3-app-3-collection-of-solicited-personal-information
- OAIC, APP Guidelines Chapter 5 (earlier-run extract, not re-seen): https://www.oaic.gov.au/__data/assets/pdf_file/0019/1198/app-guidelines-chapter-5-v1.2.pdf
- OAIC, APP Guidelines Chapter 6:
  https://www.oaic.gov.au/privacy/australian-privacy-principles/australian-privacy-principles-guidelines/chapter-6-app-6-use-or-disclosure-of-personal-information
- OAIC, APP Guidelines Chapter 8 (earlier-run extract, not re-seen):
  https://www.oaic.gov.au/__data/assets/pdf_file/0036/256959/APP-Guidelines-Chapter-8-Cross-border-disclosure-of-personal-information-October-2025-v1.3.PDF
- OAIC, APP Guidelines Chapter C (permitted general situations):
  https://www.oaic.gov.au/privacy/australian-privacy-principles/australian-privacy-principles-guidelines/chapter-c-permitted-general-situations
- OAIC, Guide to securing personal information (earlier-run extract, not re-seen):
  https://www.oaic.gov.au/agencies-and-organisations/guides/guide-to-securing-personal-information
- OAIC, access requests (earlier-run extract, not re-seen):
  https://www.oaic.gov.au/privacy/privacy-guidance-for-organisations-and-government-agencies/handling-personal-information/dealing-with-requests-for-access-to-personal-information
- OAIC, NDB scheme Part 4:
  https://www.oaic.gov.au/privacy/notifiable-data-breaches/preventing-preparing-for-and-responding-to-data-breaches/data-breach-preparation-and-response/part-4-notifiable-data-breach-ndb-scheme
- OAIC, Guide to health privacy:
  https://www.oaic.gov.au/privacy/privacy-guidance-for-organisations-and-government-agencies/health-service-providers/guide-to-health-privacy/introduction-and-key-concepts
- OAIC, small business: https://www.oaic.gov.au/privacy/privacy-guidance-for-organisations-and-government-agencies/organisations/small-business ;
  opting in (earlier-run extract): https://www.oaic.gov.au/privacy/privacy-guidance-for-organisations-and-government-agencies/organisations/opting-in-to-the-privacy-act
- OAIC, Children's Online Privacy Code: https://www.oaic.gov.au/privacy/privacy-registers/privacy-codes/childrens-online-privacy-code
- Online Safety Act 2021 (Cth): https://www.legislation.gov.au/C2021A00076/2024-12-11/2024-12-11/text/original/epub/OEBPS/document_1/document_1.html
- eSafety, social media age restrictions assessment: https://www.esafety.gov.au/about-us/industry-regulation/social-media-age-restrictions/assessment
- Online Safety (Age-Restricted Social Media Platforms) Rules 2025, Explanatory Statement (title from memory):
  https://www.legislation.gov.au/F2025L00889/asmade/2025-07-30/es/original/pdf ; the 2026 rules adding rule 4A
  (heading only): https://www.legislation.gov.au/F2026L00370/asmade/text
- Victoria, Health Records Act guidance: https://www.health.vic.gov.au/legislation/health-records-act
- NSW, Health Records and Information Privacy Act 2002: https://legislation.nsw.gov.au/view/whole/html/inforce/current/act-2002-071

Secondary sources (AustLII, gtlaw.com.au, lawhandbook.sa.gov.au) appear in the research only as leads. They are not
cited as the law here.
