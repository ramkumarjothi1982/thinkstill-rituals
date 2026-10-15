**DRAFT, not yet reviewed or approved. Not legal advice.** It stays a draft until the owner approves it and an
Australian lawyer has reviewed every part marked for legal review.
**Date: 15 October 2026.**

# Hushmates terms of use

> **Status (internal, remove before publishing).** Nothing in this document is final until the owner approves it.
> Every part marked "needs legal advice", and every clause marked **[Lawyer to review]**, must also be reviewed by an
> Australian lawyer before it is published or relied on. Hushmates is not live: nothing is deployed, there are no
> members outside the team, and AI is off. The facts below were re-checked against the committed code at `9012d6f`
> (15 October 2026), which includes the Tier 0 changes (`docs/safety/TIER0_SELF_ASSESSMENT.md`). The source
> repository is public today; decision D19 recommends making it private (Part B, B3.1).
>
> **How to read this draft.**
> - The words members will read are in plain type, in Hushmallow's voice. They cover the invitation-only beta now
>   and the paid tier later (section 10 is a frame to finish before anyone pays).
> - Hidden comments (`<!-- [classification: ...] -->`) sit next to each part. They say whether it rests on a
>   verified obligation, depends on a fact about Hushmallow (and which fact), needs legal advice, or is recommended
>   practice. They don't show when the page is rendered.
> - Text in **[square brackets]** is a placeholder or a fact still to be confirmed. The terms can't be published
>   while any remain.
> - Part B at the end is internal: the tests, sources, code facts and gaps behind each section. Remove it before
>   publishing.
> - Companion drafts in this folder: `PRIVACY_POLICY.md`, `COMMUNITY_GUIDELINES.md`, `SAFETY_DISCLAIMERS.md`,
>   `COLLECTION_NOTICE_AND_CONSENT.md`, `MODERATION.md`, `AGE_ELIGIBILITY.md`, `RETENTION_AND_DELETION.md`,
>   `DATA_BREACH_RESPONSE_PLAN.md`, and the register `LEGAL_REQUIREMENTS.md`. Keep all of them saying the same thing.

---

# Part A: the terms

## Welcome

Thank you for being here. These terms are the agreement between you and us for Hushmates. We've tried to keep them
short and plain. Please read them, along with our **Community Guidelines** and our **Privacy Policy**, before you
join. The Community Guidelines are part of these terms. The Privacy Policy explains how we look after your
information.

If something here doesn't make sense, ask us at **[contact email, to be set up]**. We're happy to explain.

## 1. Who we are

Hushmates is part of Hushmallow. In these terms, "we", "us" and "Hushmallow" mean **[legal name of the business]**
(ABN **[ABN]**), who runs Hushmallow and Hushmates.

You can reach us at **[contact email, to be set up]**.

<!-- [classification: depends on Hushmallow's functionality or business circumstances] Deciding facts: the legal
entity (sole trader or company), its ABN and its state or territory. None is in the code or the docs (app-facts §0,
[GAP]: no business name, contact address, terms or complaint route anywhere in the app or the desk). Same placeholders
as PRIVACY_POLICY.md "Who we are". -->

## 2. What Hushmates is, and what it isn't

Hushmates is for everyday feelings. In careful words:

> Hushmates is a space for sharing everyday feelings and receiving kind perspectives from other members. It is not
> intended to diagnose, screen for, prevent, monitor, predict, treat or alleviate any disease or mental health
> condition, and it is not a health, therapy or crisis service.

<!-- [classification: recommended practice] The statement above is the intended-purpose statement from the TGA
research (TGA-1), repeated word for word. Repeating one statement in every channel is recommended practice, not a
legal duty (critic's correction to TGA-2). What it protects against is real: under the Therapeutic Goods Act 1989
s41BD, a product's purpose is read from the information the supplier gives in its labelling, instructions, advertising
and technical documentation. Whether Hushmates is a medical device needs legal advice (TGA-4, TGA-5 as corrected).
This draft does not say TGA approval is unnecessary. See Part B, B3.1. Do not edit the statement here without
changing it everywhere else it appears. -->

### How it works

- **You release a feeling.** You write what's on your mind, from 3 to 500 characters. You can add a feeling's name
  (like worry or joy) if you want to. It only travels if you tick to say you're happy to share it.
- **Other members may catch it.** Members who've chosen to let feelings find them may be offered it, and each of
  them sees one feeling at a time. Some will read it and let it float past. Up to five different members can each
  offer one short perspective.
- **It comes home.** After five perspectives, or after a day, your feeling comes home to you with whatever came
  back. You keep what helps. If nobody caught it, you can send it out again, up to twice.
- **Other members never see who you are.** They never see your name or your email. The only thing they see about
  you is the colour of the Mallow you chose, beside a perspective you wrote. They can't contact you, and you can't
  contact them. There are no messages, profiles, followers or feeds.

<!-- [classification: depends on Hushmallow's functionality or business circumstances] Facts at 9012d6f: 3 to 500
characters (schema.sql:33); optional label; the consent tick "Share with Hushmates participants, without my name" is
required (ui/relay/release.js:103; rules.sql:364); up to five perspectives (perspectivesPerFeeling 5); home after five
or a day (journeyTtlMs); resend only if nobody caught it, at most twice (rules.sql:515; maxResends 2).
[Check] "The only thing they see about you is the colour of the Mallow you chose": that is what the screens show
(ui/relay/returned.js: a dot in the contributor's Mallow colour). The catcher's device is also sent the feeling's Mallow
(offer_view, rules.sql:300-306), which the catch screen doesn't display (ui/relay/catch.js:146-160). Either stop sending
it, or keep this sentence to what is shown and say so in PRIVACY_POLICY.md. Accuracy: ACL s18 (SCW-07). -->

### The Mallows

Mallows are the cartoon characters you choose from when you join. They're part of the app. A Mallow isn't a person.

If you allow it, and nobody catches your feeling within 30 minutes, your Mallow can offer one perspective. You can
also ask your Mallow yourself.

Today, every Mallow perspective is put together from **a fixed set of pieces written in advance**: an opening in
your Mallow's voice and one perspective, sometimes with a word for your feeling filled in. Hushmates chooses the
pieces automatically, using rules that look at your words, the feeling's name if you chose one, and your Mallow.
**No AI is used.** A Mallow perspective is always labelled as coming from a Mallow, is never counted as one of the five, and
is never presented as a person. Nobody else sees it unless you share it, or report it to our safety team.

A Mallow perspective isn't advice or therapy. Because it's picked by rules, it can miss the mark. If one is
unhelpful or hurtful, report it, and it disappears straight away.

If we ever change how Mallow lines are made, for example by using AI, we'll update these terms and tell you before
it happens.

<!-- [classification: depends on Hushmallow's functionality or business circumstances] Deciding fact: AI is off (no
provider configured; schema.sql:39 "enabled": false, "monthlyCapAud": 0). While that holds, "a fixed set of lines
written in advance ... no AI" is accurate. Accuracy is an Australian Consumer Law s18 matter (SCW-07, binding once in
trade or commerce) and part of informed consent (PRV-04, PRV-22 as corrected).
What the app says at 9012d6f, checked string by string:
- done: the welcome, "It’s chosen automatically from a fixed set of lines written in advance" (ui/relay/welcome.js:104);
  You & safety, "chosen automatically from a fixed set of lines written in advance for Hushmallow" (ui/relay/you.js:69);
  the privacy sheet, "Hushmates chooses it automatically from a fixed set of perspectives written in advance for
  Hushmallow, on its own servers" (ui/relay/parts.js:184); sending again and "Explore another angle", "Hushmates
  chooses it ... from lines written in advance, guided by your words" (ui/relay/returned.js:319, 348, 351).
- [GAP] still open: the label on every Mallow line is "A Mallow perspective · Automatically generated"
  (core/relay-config.js:47-48; rules.sql:236; ui/relay/share-render.js:27). Whether to change it is decision D21, open
  ("generated" can suggest AI; the lawyer's view first). The release screen still says "Your Mallow can offer an
  automatically generated perspective" and "Hushmates writes a perspective for you automatically"
  (ui/relay/release.js:110, 117). "Automatically generated" also appears in My journeys (ui/relay/journeys.js:162, 175),
  both Mallow report sheets ("Mallow perspectives are automatically generated and can get things wrong",
  ui/relay/journeys.js:287, ui/relay/returned.js:257), Your data (ui/relay/your-data.js:59), and the desk ("The Mallow
  perspective (written automatically)", staff/desk.js:278). "Writes" conflicts with this section; "generated" is the
  D21 question. Change "writes" before these terms are used, and settle D21.
- "Nobody else sees it unless you share it, or report it": a reported Mallow line is shown on the desk
  (staff/desk.js:278), and the app's own "Nobody else sees it unless you choose to share it" (ui/relay/returned.js:351)
  leaves the report out. The words here say both.
[classification: needs legal advice] TGA-5 as corrected: the line is chosen partly by matching the author's words to
thinking patterns from the main app's library (detectPatterns in core/perspectives.js:601, and the same lines in the
vendored copy under supabase/functions/_shared/vendor/hushmates-lab/core/). This section describes that neutrally
("rules that look at your words") on purpose; the app's own phrase is "guided by your words". The lawyer should see the
selection logic, not just this wording.
"We'll tell you before it happens" is a commitment: owner to approve. Turning on AI is also a TGA re-check trigger
(TGA-11) and a privacy change (PRV-11, PRV-22). AI is off: no provider is configured (supabase/functions/_shared/
mallow-setup.js:33-35) and the setting is "enabled": false, "monthlyCapAud": 0 (schema.sql:39); D10 keeps it off.
"Written in advance": owner to confirm who wrote the lines before using "hand-written" or "the Hushmates team wrote"
anywhere. If the library was drafted with AI tools during development, pairing "the team wrote" with "it isn't AI"
could mislead (ACL s18, SCW-07). Every draft in this folder says "written in advance" only, as the app does at
9012d6f. [Check] DECISIONS.md D21 and RISKS.md L4 say the app's copy is "chosen automatically from lines the team
wrote"; the code doesn't say that (see the strings above). The library in use is 293 lines (51 openers, 114 Hushmates
lines, 128 of Reframe's; counted from libraryCatalogue() in core/perspectives.js), cut down from 342 after every line
was checked at Tier 0 (TIER0_SELF_ASSESSMENT.md §3). That check was done by the developer with AI agents, not by an
independent or clinical reviewer (TIER0 §1), so don't describe the lines as "reviewed" or "checked by the Hushmates
team" either until the owner confirms who did what. Once confirmed, use one phrase everywhere.
"Put together from pieces": the library shows an opener in the Mallow's voice joined to one perspective line, and
some openers fill a slot with a feeling word from the label, chosen or inferred (openerFor and libraryProvider,
core/perspectives.js:612-661). Every piece is written in advance, so "no AI" holds. The app's "chosen ... from a fixed
set of lines" is close enough not to mislead, but less exact. -->


### What other members write

Perspectives come from other members. They're people like you, not professionals, and what they write isn't advice.
It's one person's way of seeing things, offered as a possibility, not a verdict.

Please don't rely on a perspective or a Mallow line for decisions about your health, your safety, money or the law.

<!-- [classification: recommended practice] TGA-3 (describe the relay as sharing feelings and receiving perspectives;
say members are not professionals; never describe catchers as counsellors or supporters) and U16-04 (don't describe
anyone as health-care providers). Also lowers reliance for negligence purposes (SCW-17, needs legal advice). -->

## 3. Who can join

- **You must be 18 or over.** Hushmates is for adults only.
- **You need an invitation.** During the beta (the app calls it the pilot), you can only join with an invitation
  code from us. Each code is for the person it was given to. Please don't sell or post it.
- **One account each.** Please don't make a second account, or use someone else's.
- **Hushmates is made for people in Australia.** The support lines it shows are Australian. If you're somewhere else,
  findahelpline.com can help you find support where you are.

**How we check your age.** When you join, you tick to confirm you're 18 or over. We don't ask for ID or your date of
birth, and we don't check your age in any other way. If we learn you're under 18, we'll close your account kindly
(section 8).

**Your name here.** You choose a name when you join: 3 to 20 letters or numbers. Only you see it. Please don't use
your real name, someone else's name, or a name that sounds like our team. Right now you can't change it later, so
choose one you like.

**Signing in.** You sign in with your email address and a 6-digit code we send to it. Anyone who can open your email
can get a code, so please keep your email account secure. Signing out ends your session on that device only.

**Pseudonymous, and what that means.** Other members never see your name or your email, and your words travel with
no name at all. But we hold your email address, and we know which account wrote what. Our safety team sees reported
words with an account reference, never your name or email. The people who run Hushmates can link that reference to
your email, and only do so when they need to, as our Privacy Policy explains. Words can give people away, so please
leave out names, places and anything else that could identify you or someone else.

<!-- [classification: recommended practice] 18+ is Hushmallow's own rule. The age description is accurate on the
facts: a single self-declared tick, "I’m 18 or over" when joining (ui/relay/invite.js:51), or "I’m 18 or over, and I was
invited to the pilot" at the welcome if it wasn't given then (ui/relay/welcome.js:110), server-enforced (rules.sql:1037;
members.adult_confirmed_at); no date of birth, ID or estimation (app-facts §8). U16-13: never "verified" or
"age-checked".
[classification: needs legal advice] Whether the under-16 social media minimum age law (Online Safety Act 2021
Part 4A) applies. The research leans towards Hushmates being in scope: the s 63C base test (online social interaction
as a significant purpose, interaction with other end-users, posting material) leans met, and so does the Rules'
additional condition in rule 4A through its time-limited-feature limb (a 3-minute offer, a day's journey). The
realistic way out is the exclusion for a service whose sole or primary purpose is supporting the health of end-users
(Rules s 5(1)(f)), which cuts against the non-clinical positioning. None of these tests has been settled; the
operative rule 4A text and the s 5 text were not seen (B3.2; AGE_ELIGIBILITY.md §2; RISKS.md L1; D9). If the law
applies, eSafety's guidance says self-declaration alone is not "reasonable steps", and this section must change with
the age process (U16-06, depends on Hushmallow's functionality). This draft does not say the law doesn't apply.
"Made for people in Australia": there is no location check in the code, so this is a description, not a rule.
Name rules: core/text-policy.js:77-92 (3 to 20 characters; contact details, four or more digits in a row, reserved
words such as admin, moderat, support, staff, official, hushmallow); can't be changed after joining (savePreferences
accepts only catching, notifyReturn, mallow, onboarded: rules.sql:332-354) [GAP: no correction route;
PRIVACY_POLICY.md covers APP 13].
Sign-in: 6 digits, 10 minutes (supabase/config.toml:17-18, otp_length 6, otp_expiry 600); "Sign out" is this device
only (client/supabase-auth.js:288-296, logout scope=local).
Pseudonymity wording matches PRIVACY_POLICY.md "Pseudonymous: what that means here" (APP 2, PRV-21; the operator
can link words to an account, PRV-22). Never "anonymous". -->

## 4. Hushmates isn't an emergency service

Please read this part closely.

- **Hushmates isn't an emergency, crisis, health, counselling or therapy service.** If you or someone else is in
  danger right now, call **000**.
- **Hushmates checks words for some signs that someone might not be safe.** If your words describe something that
  needs more than a new way of seeing it, like not feeling safe, abuse, violence, threats, harassment or being treated
  unfairly, or if they tell someone to hurt themselves, Hushmates won't send them. It shows you support lines
  instead. Those words aren't saved, so nobody at Hushmates sees them or will be in touch about them.
- **The word check is a set of word rules,** not a person. It reads English only. It can miss things, even words
  that clearly mean someone isn't safe, and it can sometimes hold back words that were fine.
- **Nobody watches Hushmates in real time.** Nobody on our team reads feelings as they travel, unless one is
  reported or paused for a safety review.
- **Our safety team is small, and isn't there around the clock.** It reads reports, but not straight away. During
  the beta we aim to read priority reports within a day and others within two days, and nights, weekends and
  holidays can take longer. That's an aim, not a promise. If the team is away for a while, the message you see after
  reporting says so.
- **Our safety team can't see who anyone is,** so it can't contact you or send help to you.

So please don't rely on Hushmates to notice if you're not okay, or to get help to you or anyone else.

**Support, any time:** Lifeline **13 11 14** (or chat online at lifeline.org.au), the Suicide Call Back Service
**1300 659 467**, and Beyond Blue **1300 22 4636**. In an emergency, **000**. You'll find these and more under
**Support**, at the top of every screen in the app, and in our Community Guidelines.

<!-- [classification: depends on Hushmallow's functionality or business circumstances] Every sentence here is a
representation about the service, so ACL s18 applies (SCW-07: binds now; whether it misleads turns on the words and
what the service really does). The "aim" is a representation about a future matter: it needs reasonable grounds,
i.e. a staffed desk rota (SCW-07 as corrected). Deciding facts: desk staffing (ESCALATION.md names are blank: D12),
and the acknowledgement wording these lines copy, committed since 0037d57 (hushmates.expectation in
supabase/migrations/20261015090000_hushmates_tier0.sql; core/relay.js _expectation, :823-826): priority, "…during the
pilot we aim to read priority reports within a day, and nights, weekends and holidays can take longer. We can’t see who
wrote it, so we can’t contact them or send help. If you know someone is in danger right now, call 000. If this has
stayed with you, Lifeline is there any time on 13 11 14. Nobody is told who reported."; others, "…during the pilot we
aim to read reports within two days. Nobody is told who reported." "If the team is away ... says so": while
settings.desk.awayUntil is set (node server/admin.mjs set desk '{"awayUntil":"YYYY-MM-DD"}', accepted only from today
to 90 days ahead in Sydney: server/admin.mjs deskProblem), reporters see "Our safety team is away until {day}, so it
will be read when we’re back…"; any other stored value reads as away with no day ("away for now and may not be able to
read it straight away"), never the usual times. The words say "says so", not "tells you when", because the day isn't
always shown. Internally the team's target for a priority report is 12 hours (docs/ESCALATION.md §2), tighter than the
public aim and not promised to anyone; the desk marks a priority report open past 12 hours "Over 12 hours"
(staff/desk-guide.js isOverdue), and nothing alerts anyone (no email or push: staff/desk.js:15, 169, 224).
"Paused for a safety review": a feeling can also be paused without a report from a member, when a Mallow's own check
flags it (hold_for_safety, rules.sql:810-822; gateway.js:177-178), and the desk then sees it.
"Can miss things, even words that clearly mean someone isn't safe": on the Tier 0 probe the screen showed crisis or
danger support for 25 of 127 developer-written crisis or danger phrasings (TIER0_SELF_ASSESSMENT.md §1, §4.2;
docs/clinical/tier0-probe-results.csv; RISKS.md S1). That is evidence of gaps, not a measured rate (RISKS.md E1), so
never quote a number to members; the stronger words here are the honest reading of it. The app's welcome says only "it
can miss things" (ui/relay/welcome.js:105; SAFETY_DISCLAIMERS.md §3.1 and §5).
"Tell someone to hurt themselves": a feeling with words telling a reader to hurt themselves gets the crisis support
screen, or the harassment one when the words are what someone said to the writer (core/feeling-safety.js:339-344).
[classification: needs legal advice] Negligence and reliance (SCW-17, from memory, no source searched): prominent,
honest limits reduce reliance; promising monitoring, crisis support or response times increases it.
[classification: recommended practice] Safe-messaging guidance on stating limits and signposting (SM-03, SM-04,
SM-06; Mindframe, Samaritans: guidance, not law). TGA-4: "Do not use: detect, screen, assess risk, monitor, suicide
prevention" in positive claims, so this says "checks words for some signs".
Facts: words held back are never stored, and nobody is alerted (supabase/functions/_shared/gateway.js:75-77, P25);
screenFeeling holds back every category the lexicon marks not reframeAppropriate (crisis, someone in danger, abuse,
violence, threats, harassment, discrimination, "unsafe"), each with its own support message (core/feeling-safety.js:
198-216; SAFETY_DISCLAIMERS.md §3.3), so the bullet names them; English-only regex rules (core/feeling-safety.js); no
alert reaches a moderator when a report arrives (staff/desk.js:15, 169, [GAP]); the desk sees no identities and can't
contact anyone (staff/desk-guide.js:30). "Unless one is reported" matches section 6 (the safety team sees reported
words). "Can't see who anyone is, so it can't contact you or send help to you" is stated as a consequence on purpose:
the desk procedure has one rare exception, a 000 call when the words point to immediate danger and the team already
holds identifying information because the person contacted Hushmallow directly (MODERATION.md §6.2 step 3, §6.3;
staff/desk-guide.js). Member documents describe that only through PRIVACY_POLICY.md's serious-threat paragraph; don't
state flatly here that the team never calls anyone, and never imply that it will.
"Support" button: committed (ui/relay/common.js:41-49, supportPill and openSupport), in the header of every screen
(sign-in, invitation, welcome, the main places, You & safety, Your data, Share, the offline and deleted screens), but
not on the support screen itself, which already shows the lines (ui/relay/support.js:29). It opens a sheet over the
current screen: 000, Lifeline, the Suicide Call Back Service and 13YARN first, then under "More support lines"
1800RESPECT, Beyond Blue and findahelpline (core/feeling-safety.js:179). You & safety also starts with "If you’re not
okay" → "Get support now" (ui/relay/you.js:52-54). Numbers from core/feeling-safety.js:166-175; check each against the
service's own site before launch (SM-04). -->

## 5. Being a good Hushmate

Hushmates only works if people are kind. When you use it, please follow our **Community Guidelines**. In short,
please don't:

- harass, bully, threaten or demean anyone, or attack people for who they are;
- post sexual content of any kind;
- post anything that encourages or gives instructions for suicide, self-harm or disordered eating;
- post material involving the sexual abuse or exploitation of children, material that supports terrorism, extreme
  violence or cruelty, or instructions for crime or for making or using illegal drugs;
- share personal details, yours or anyone else's, or try to find out who someone is;
- copy, screenshot or post someone else's feeling or perspective anywhere outside Hushmates;
- scam, spam, advertise, sell or ask for money;
- present yourself as a counsellor, doctor or other professional, or pretend to be our team;
- get around a restriction, a block or a limit, use more than one account, or use bots or scripts;
- try to break, overload or get into parts of Hushmates you weren't given, or interfere with anyone else's use;
- break the law.

The word check stops some of these automatically. Our safety team acts on the rest when they're reported (section 7).

<!-- [classification: depends on Hushmallow's functionality or business circumstances] Online Safety Act 2021 industry
codes and standards. Whether published terms banning class 1A/1B material are required depends on the service's
category (social media service, relevant electronic service or designated internet service: needs legal advice,
SCW-01) and its Phase 1 risk tier (required at Tier 2, recommended at Tier 3; SCW-02, SCW-03, from search extracts that
may mix draft and registered text). Drafted as if required.
[classification: needs legal advice] The self-harm, suicide and disordered-eating ban follows SCW-04 (Phase 2
Age-Restricted Material codes, in force 9 March 2026): whether a service "allows" self-harm material turns partly on its
terms, and the definition of "self-harm material" was not seen. The Community Guidelines also say members may share
that they're struggling.
[classification: recommended practice] BOSE (s6 core expectation, not enforceable in court: SCW-05); the copying
and identifying ban supports members' protection under the statutory privacy tort (PRV-20; the tort applies to anyone
who misuses information, so it also protects members from each other) and APP 6 (PRV-09).
Disability: the conduct rules must not exclude people with disability (DDA s24, SCW-13).
"The word check stops some of these automatically": in perspectives (screenReframe, core/feeling-safety.js:367-392),
words telling anyone to hurt themselves, advice about eating less, weight, stopping medication or drinking to cope,
questions about age, where someone lives or their school, asking to meet up or for pictures, some victim-blaming,
unkind phrases, diagnoses, contact details, links, usernames, money requests, street addresses, Australian postcodes
given with context ("postcode 2000", "NSW 2000") and near-copies of an earlier perspective; national helpline numbers
are allowed (:221-225). In feelings, contact details, links, money requests and identifying details (:349-357).
Threats to harm others have no rule (RISKS.md S8), and much else is left to reports. "Some" is the honest word. -->

## 6. Your words stay yours

You own what you write on Hushmates. We don't. To run Hushmates, you give us permission to do a few specific things
with your words, and only these.

**When you release a feeling, you let us:**

- keep it, locked (encrypted), while it travels and for as long as our Privacy Policy says;
- run the word check on it;
- show it, with the feeling's name if you chose one, to members who've chosen to catch feelings. A few may see it
  at the same time, and some read a feeling and let it float past. It stops being offered once five have offered a
  perspective, or when its day is up;
- if you allow or ask for a Mallow perspective, use your words to pick a Mallow line;
- show it back to you, with what came back, in your journeys and in Download my data;
- show it to our safety team if someone reports it, or if it's paused for safety.

**When you offer a perspective, you let us:**

- keep it, locked (encrypted), with the feeling it belongs to;
- run the word check on it;
- show it, with no name, to the person whose feeling it is when it comes home, and to anyone who adds a perspective
  to that feeling after you;
- show it back to you, in Perspectives you've offered;
- show it to our safety team if someone reports it.

**Share pictures and videos.** If you tick "They may include my words in a share picture or video", you also let the
person whose feeling you caught put your words, with no name, into a picture or video they make on their own device,
and share it wherever they choose. You can untick it at any time. A picture or video they've already made can't be
taken back.

**This permission is narrow.** It's free. It isn't exclusive, so you can use your own words anywhere you like. And
it's only for running Hushmates for you and the members you're writing to.

**We never:** sell your words; use them for advertising or marketing; use them to train AI; publish them; or show
your name with them. We won't use them for anything new, like research or examples, without asking you first, on
its own, and you can say no.

**When it ends.** The permission ends when your words are deleted. A few things can't be undone, so please know
them before you write:

- members who've already read your words can't unread them;
- a share picture or video someone already made stays with them;
- if your words were reported, a copy stays with the report for our safety team until it's cleared, 90 days after
  the team decides, or 180 days after the report if it's never decided. Deleting all your Hushmates data removes
  your words from reports straight away;
- copies in our backups are cleared as our Privacy Policy says;
- if the law requires us to keep something, we keep it only as long as it requires.

**How long things stay.** Feelings you don't save are cleared 30 days after they come home, with every perspective
and Mallow line on them. Feelings you save stay until you let them go, delete them, or delete everything. You can
take back a perspective you offered at any time in You & safety, and its words are removed for good. Your
perspective belongs with the feeling it answers: if that feeling's writer deletes the journey, or all their data,
your perspective goes too. Our Privacy Policy has the full list.

**Other people's words.** The perspectives that come home to you belong to the members who wrote them. You can read
them, keep them in Hushmates and, where their writer allowed it, put them in your share picture or video. Please
don't copy them anywhere else.

**Hushmates itself.** The app, the Mallows, the orbs and the rest of Hushmates' design belong to Hushmallow. You're
welcome to use them in Hushmates, and in the share pictures and videos it makes for you.

<!-- [classification: depends on Hushmallow's functionality or business circumstances] Unfair contract terms (ACL,
prohibited since 9 November 2023 in standard form consumer contracts: SCW-08). A broad licence over feelings is one of
the terms most likely to be scrutinised. Whether a contract exists for the free beta is arguable; it is certain once
the paid tier exists. Drafted as if the regime applies. Source: ACCC media release (search extract).
Accuracy: ACL s18 (SCW-07). Every "when it ends" exception is a fact from the code:
- feelings offered one at a time to opted-in catchers, with no cap on how many different catchers are offered it while
  it travels; only live holds plus perspectives are capped at five (rules.sql:548-556; ui/relay/parts.js:181 "a few may
  see it at the same time"). The brief's "deliver to up to five members" is a cap on perspectives, not on readers:
  this section says so;
- up to five perspectives per feeling in all (schema.sql:151, 168), resend only if nobody caught it, at most twice
  (rules.sql:515-516);
- later catchers see earlier perspectives after offering theirs (rules.sql:656-668);
- report evidence: encrypted copies, cleared 90 days after resolution or 180 days if undecided (api.sql:178-184);
  "Delete this journey" and "Take it back" do not clear report copies (rules.sql:474-484, 757-771); deleting all data
  does (rules.sql:1009-1016);
- 30-day clearing of unsaved returned journeys (api.sql:169-177); saved journeys have no limit (P11, [GAP]);
- share pictures made on the device, nothing uploaded (ui/relay/share.js:245-272); contributor tick off by default
  (ui/relay/catch.js:280-285);
- backups: Free plan none, Pro 7 days, undecided (D3). [GAP] No procedure re-applies deletions after a restore.
"We never ... train AI ... sell": true today (no ads, analytics, data partners or AI: app-facts P22, §6) and must
stay true. Any data-for-value arrangement would also remove the small business exemption (PRV-01). Matches
PRIVACY_POLICY.md "The short version".
[classification: recommended practice] No new use without separate consent (PRV-09; PRV-20). -->

## 7. Looking after Hushmates: what our safety team can do

To keep Hushmates kind, we can act on what's written here.

**What happens automatically**

- The word check can stop words being sent.
- A feeling is paused if two different members report it, or if one member reports that someone may be in danger.
  (A member's new report on a feeling they've reported before waits for our safety team instead.) While it's paused,
  nobody else is offered it, and it still comes home to its writer when its day is up. Its writer sees that it's
  paused for a safety review, but never who reported it.

**What our safety team can do after reading a report**

- Let a feeling carry on.
- Take a feeling out of circulation. Nobody else is offered it, and it comes home to its writer now, with whatever
  came back.
- Remove a perspective. Its words are wiped for good.
- Restrict an account. The person can't release or catch feelings, ask their Mallow, or write perspectives.
  Feelings they already released stop being offered, and still come home to them.

**What a team lead can do**

- Suspend an account, which is a stronger pause.
- Lift a restriction or a suspension.
- Close an account (section 8).

**When we act.** We act when something breaks these terms or the Community Guidelines, when someone could be hurt,
or when the law requires it. We try to take the smallest step that fixes the problem. We'll follow lawful directions
from regulators such as eSafety, including directions to remove something.

**If your account is restricted or suspended,** the app tells you that our safety team has paused it, and that you
can't release or catch feelings for now. You can still sign in, see your journeys, download your data, take back
perspectives you offered, and delete everything.

**Asking for a review.** If you think we got something wrong, for example we restricted your account or removed
something of yours, please tell us:

1. Email **[contact email, to be set up]** from the email address you sign in with, with "Review" in the subject.
2. Tell us what happened and why you think it's wrong. You don't need to know any account references.
3. Where we can, someone who didn't make the first decision looks at it again. Our team is small, so during the
   beta that may be **[the owner]**.
4. We aim to reply within **[14 days]**. We'll reply to your email, and once it's built, you'll also see the answer
   in the app. If we got it wrong, we'll undo what we can.

If this is a hard time for you, please reach out to Lifeline on **13 11 14**, any time, while you wait.

<!-- [classification: recommended practice] Samaritans (suspension a last resort; signposts and appeal information
when it happens; UK guidance, not law) and eSafety Safety by Design (outcomes and an opportunity for appeal;
voluntary): SM-13, SM-09. BOSE's examples seen include blocking and muting (SCW-05); its expectations on reporting
and complaints were not seen [from memory]. Not enforceable in court.
[classification: depends on Hushmallow's functionality or business circumstances] Unfair contract terms: suspension
or termination only for stated reasons, with notice where safe (SCW-08); applies if a contract exists (certain for
paid users).
[classification: depends on Hushmallow's functionality or business circumstances] eSafety removal notices: an
obligation arises only when a notice is received; the 24-hour clock and penalty wording were not seen (SCW-06, from
memory). Procedure in MODERATION.md must include a monitored address checked daily, including weekends.
Facts: automatic pause (reportsToPause 2 distinct reporters with open reports, or one "safety" report, and only if
that member hasn't reported the feeling before: m_report_feeling, rules.sql:888-912; the same rule ESCALATION.md §3
step 2 and the desk guide describe as "usually pauses it, but not always"); "Paused for a safety review"
(ui/relay/journeys.js:59); desk decisions (staff/desk-guide.js:8-24); lifting a restriction is an operator task
(server/admin.mjs member <ref> active|restricted|suspended; api.sql:303-319); restricted and suspended members can still
call m_me, m_list_journeys, m_my_gifts, m_withdraw_perspective, m_set_gift_sharing, report, block, export and delete
(rules.sql actor lists at lines 327-999). What the app says today: on Catch, "Catching is paused for your account." and
"Our safety team has paused catching for your account for now. Feelings you already released still come home to
you." (ui/relay/catch.js:434); on Release, "Your account can’t release feelings right now." (ui/relay/release.js:129);
in My journeys, "While your account is paused it isn’t offered to anyone." (ui/relay/journeys.js:133). The members'
text above says no more than those together.
[GAP] Today there is no review route, no contact address, no reason in the restriction message and no support lines on
it. Add the address and the review step before the beta. "[14 days]" and who reviews are owner decisions. Emailing
from the sign-in address lets the operator find the account; that is one of the "need to" uses PRIVACY_POLICY.md lists
("to answer a request from you, to lift a pause on your account"). Replying to an email the person sent is not the
kind of contact the drafts rule out (nobody contacts a member about what they wrote or to check on them). The same
answer route is used in AGE_ELIGIBILITY.md §5.3 and §5.5. [GAP] There is no way to show one member a message in the
app today (AGE_ELIGIBILITY.md §5.6 item 2), so "in the app" waits for that build (B1). -->

## 8. Leaving, and closing accounts

**You can leave at any time.** In You & safety, choose **Delete my Hushmates data**. Every feeling you released and
every perspective you gave is deleted straight away, your sign-in is deleted, and you're signed out. This can't be
undone, so download your data first if you'd like a copy. Some records that hold none of your words are kept, as our
Privacy Policy explains. Signing out isn't the same as leaving: your feelings keep travelling while you're away.

**When we may close an account.** We may close an account if:

- the person is under 18;
- they've seriously or repeatedly broken these terms or the Community Guidelines;
- keeping it open would put someone at risk; or
- the law requires it.

Unless it wouldn't be safe or lawful, we'll pause the account first, tell you in the app **[needs a way to show one
member a message: Part B, B1]**, and give you the chance to download your data. Then we'll delete your Hushmates
data, as if you'd done it yourself. You can ask for a review (section 7). We'll reply to your email, and once it's
built, you'll also see the answer in the app.

**If you're under 18.** Hushmates is only for adults, so it isn't for you yet. If we learn you're under 18, we'll
pause your account, let you download your data if you'd like, and then delete your account and everything you wrote.
If we've got it wrong, please ask for a review.

**If we end Hushmates or the beta,** see section 9.

<!-- [classification: depends on Hushmallow's functionality or business circumstances] Unfair contract terms: closure
only for stated reasons, with notice where safe (SCW-08).
[classification: recommended practice] Under-18 handling: U16-12 (eSafety's guidance on deactivating accounts "with
kindness, care and clear communication", a review route, no retention of age-check data). It becomes the expected way
to meet s63D for under-16s only if Hushmates is in scope of Part 4A (U16-06, U16-08: depends; scope needs legal advice).
Matches PRIVACY_POLICY.md "Children and age".
Facts: deletion is immediate and in one transaction (rules.sql:995-1027); the Auth user is then deleted, with retries
(supabase/functions/hushmates/index.ts:62-67); confirmation copy ui/relay/you.js:113; what remains (member row, rows
without words, blocks, report rows, desk notes, audit for 365 days): app-facts §5.
[GAP] There is no operator tool to delete a member's data for them (server/admin.mjs has invite, revoke, settings, set,
ops and member state only). Until one exists, "we'll delete your Hushmates data" for a closure or an under-18 account
means a manual database operation. Build the tool before the beta, or change this section. Also no "may be under 18"
report reason and no block on re-declaring age (app-facts §8). -->

## 9. The beta: what to expect

Hushmates is in an invitation-only beta. That means:

- **It's free while it's a beta.** We won't ever start charging you without asking first (section 10).
- **It's still being built.** Features may change, be added or be taken away. Limits, like how many feelings can
  travel at once, may change too.
- **Things may sometimes go wrong.** Hushmates may be slow, unavailable, or paused for maintenance, and there may be
  mistakes. We work hard to keep it running and to look after your words, but we can't promise it will always be
  there. If something goes wrong with a feeling of yours, please tell us.
- **We'd love your feedback.** If you send us ideas, we may use them to improve Hushmates without paying you. We
  won't publish your feedback in a way that identifies you without asking.
- **We may end the beta.** If we do, or if we close Hushmates, we'll tell you in the app at least **[30 days]**
  before, unless something outside our control makes that impossible, so you have time to download your data. If
  it's important, we may also email you.

**How we tell you things.** We tell you things in the app. We use your email only to sign you in, to reply when you
write to us, and, if we ever must, to tell you something important about your account, your information or the
service, for example if our safety team will be away for a while or the beta is ending. We don't send newsletters
or marketing.

<!-- [classification: depends on Hushmallow's functionality or business circumstances] Unfair contract terms:
changes to the service and ending it need fair notice (SCW-08). Consumer guarantees (due care and skill) may apply even
to the free beta (SCW-10, needs legal advice), so this section says "we can't promise", which is a statement of fact,
and does not say "as is" or "no guarantees" (SCW-10: that wording risks a false representation about consumer rights).
[classification: depends on Hushmallow's functionality or business circumstances] Spam Act 2003: sign-in emails
with only a code are not commercial electronic messages on the facts (SCW-11, test checked). Any promotional content
in them, or any premium-launch or newsletter email, needs consent, sender identification and an unsubscribe (SCW-12).
Email-use wording copies PRIVACY_POLICY.md "When you sign in"; [GAP] the sign-in screen still says "We’ll only use
your email to sign you in." (ui/relay/sign-in.js:108), and the privacy sheet "Your email is used only to sign you in"
(ui/relay/parts.js:185), both narrower. Make them match.
"If our safety team will be away" covers MODERATION.md §5.2 and ESCALATION.md §2 (desk away more than 72 hours: the
owner tells current testers). Reporters are told in the app by the desk-away setting (section 4 comment). [GAP] There is no
sending tool: for G2 the owner emails team testers personally; before G3 it needs the email provider (D5) or the in-app
notice (DATA_BREACH_RESPONSE_PLAN.md R4). A purely factual service email is a designated message under the Spam Act's
Schedule 1 cl 2 (SCW-12 as corrected), but must still identify the sender.
[GAP] There is no in-app announcement feature (no notice, banner or terms screen in ui/relay). "We'll tell you in the
app" needs one before it can be relied on. "[30 days]": owner decision. -->

## 10. Paying for Hushmates (later)

Hushmates is free during the beta. If we offer a paid tier, these promises apply:

- **You choose.** We'll never move you onto a paid plan without your clear agreement.
- **No surprises.** Before you pay, we'll show you the price in Australian dollars, what you get, how often you'll be
  charged, how renewal works and how to cancel.
- **Easy to stop.** You can cancel at any time, in the app. **[How cancellation takes effect: owner to decide, for
  example at the end of the period you've paid for.]**
- **Fair changes.** If we change the price or take away something important from the paid tier, we'll tell you at
  least **[30 days]** before. If you don't want the change, you can cancel and get a refund for the unused part.
- **If we end the paid tier,** you'll get a refund for the unused part.
- **If we close your account,** **[refund of the unused part: Lawyer to review, including closures for serious
  breaches]**.
- **Your rights under the Australian Consumer Law** always apply (section 11).

**[To complete before anyone pays: payment provider, billing, taxes, renewal reminders, and the paid features
themselves. Lawyer to review.]**

<!-- [classification: depends on Hushmallow's functionality or business circumstances] Deciding fact: the paid tier's
launch. Once it exists, the services guarantees apply with near certainty and remedies can't be limited for a service
ordinarily acquired for personal use (SCW-09; s64A from memory); unfair contract terms apply (SCW-08: auto-renewal,
price changes without notice and forfeiting prepaid fees are scrutinised terms). Marketing emails about it need
consent and an unsubscribe (SCW-12).
[classification: recommended practice] Re-run the TGA check before the paid tier launches, and never name or frame it
around therapy techniques such as "structured cognitive reframing" (TGA-10, TGA-11). Billing identity is handled through
the payment provider (PRV-21). No payment code exists today (tools/pack-site.mjs:64 payment=()). -->

## 11. Your rights under the Australian Consumer Law

Hushmates comes with guarantees under the Australian Consumer Law that can't be excluded, to the extent they apply
to you. Nothing in these terms takes them away.

For example, services must be provided with due care and skill. If you're paying for Hushmates and there's a major
failure, you can cancel and get a refund for the unused part, or compensation for its reduced value. For other
failures, you can ask us to fix the problem within a reasonable time, and if we don't, cancel and get a refund for
the unused part. You can also get compensation for any other loss or damage that was reasonably foreseeable.

<!-- [classification: depends on Hushmallow's functionality or business circumstances] For the paid tier: the
guarantees apply with near certainty (SCW-09). Terms that purport to exclude them are void (s64, from memory).
[classification: needs legal advice] For the free beta: whether a free supply is a "supply to a consumer" is not
settled by anything seen (SCW-10). Hence "to the extent they apply to you".
Source for not limiting guarantees: ACCC, "don't have terms that seek to avoid your business's obligations under the
Australian Consumer Law, such as terms that seek to limit your customers' consumer guarantees rights"
(https://www.accc.gov.au/media-release/franchisors-warned-to-remove-unfair-contract-terms-or-risk-legal-action,
search extract; exact page not confirmed by the search tool). Misstating these rights is itself misleading (Booktopia,
A$6m, from an ACCC search summary).
[Lawyer to review] The second paragraph paraphrases, from memory, the remedies for services and the wording
prescribed for warranties against defects. Neither the ACL text (s60-s64A, s267) nor the regulations were seen in this
research. Hushmallow gives no separate warranty, so the prescribed text may not be required; the lawyer should settle
the exact words. -->

## 12. What we're responsible for

- **Your rights come first.** Nothing in these terms limits a right you have under the Australian Consumer Law, or
  any other law that can't be excluded.
- **We're responsible for our part.** We'll run Hushmates with reasonable care and skill. If we don't, or we break
  these terms, and you lose something because of it that was reasonably foreseeable, we're responsible for that.
- **What other members write is theirs.** Perspectives are other members' own words, not ours, and we don't read
  them before they reach you, beyond the word check. We're not responsible for what a member chooses to write. We
  are responsible for how we handle it once it's reported to us.
- **Things outside our control.** We're not responsible for a delay or failure caused by something we couldn't
  reasonably control, like a widespread internet or power outage. We'll tell you if it affects you, and fix what we
  can.
- **What Hushmates isn't.** Because Hushmates isn't an emergency, health, therapy or crisis service, please don't use
  it as one (section 4).
- **We won't ask you to cover our losses or legal costs.**

**[Paid tier only, optional: if the law allows us to limit what we owe for a failure, and the failure isn't covered
by a consumer guarantee, our total liability is limited to the fees you paid us in the 12 months before the claim.
Lawyer to review: keep, change or remove.]**

<!-- [classification: depends on Hushmallow's functionality or business circumstances] Unfair contract terms (SCW-08):
blanket exclusions and one-sided indemnities are among the terms most likely to be found unfair; so there is no
indemnity, no exclusion of negligence, and no "as is". Liability limits only "to the extent permitted by law" and
never covering the guarantees (SCW-09). Applies if a contract exists (certain once paid; arguable for the beta).
[classification: needs legal advice] Negligence (SCW-17): whether Hushmallow owes a duty of care to people who rely
on the word check or the danger reports is fact-sensitive. This section does not try to exclude it; section 4 lowers
reliance with honest limits instead. Civil Liability Acts were not searched. The optional cap is a judgement for the
lawyer: caps are common, but a cap in a standard form consumer contract can be unfair, and for a personal-use service
it can't limit guarantee remedies.
No "entire agreement" clause on purpose: the ACCC warns against terms that "seek to disclaim any representations your
business may have made outside of the contract" (same ACCC extract as section 11). What we say in the app and
elsewhere still counts. -->

## 13. Complaints and problems

If something's gone wrong, please tell us first at **[contact email, to be set up]**. Tell us what happened and what
you'd like us to do. We'll reply within 5 business days, and aim to sort it out within 30 days. If we can't, we'll
tell you why, and what you can do next.

If you're still not happy, you can go to:

- **for privacy:** the Office of the Australian Information Commissioner (OAIC), **oaic.gov.au**;
- **for serious online abuse or illegal content:** eSafety, **esafety.gov.au**;
- **for problems with what you paid for:** the consumer protection agency in your state or territory. The ACCC,
  **accc.gov.au**, can point you to it.

For a restriction or a removal, please ask for a review (section 7).

<!-- [classification: recommended practice] A complaint route and a contact point (SCW-05 BOSE; SM-09). Times copy
PRIVACY_POLICY.md "Questions and complaints" so members get one answer.
[classification: depends on Hushmallow's functionality or business circumstances] Privacy complaint handling (APP
1.2) binds only if Hushmallow is an APP entity, which needs legal advice (PRV-02, PRV-06). The OAIC line above is a
statement about members' rights: an OAIC complaint route exists only if Hushmallow is an APP entity (PRV-02, needs
legal advice) or opts in under s6EA (PRV-03). Publish it only once one of those is settled; otherwise it is an ACL s18
and s29 risk (SCW-07, SCW-10). Same rule as PRIVACY_POLICY.md "Questions and complaints" and its Drafting notes C.
eSafety's adult cyber-abuse scheme generally expects a complaint to the service first (SCW-06, from memory).
Not checked in this research: the OAIC's and eSafety's own complaint pages, and the ACCC's page listing state and
territory agencies. Check each address before publishing. [GAP] The app has no complaint route today. -->

## 14. Accessibility

We want Hushmates to work for everyone. If anything is hard to use, including the time limits for catching and
writing, please tell us at **[contact email, to be set up]**. We'll try to help, and we'll use what you tell us to make
Hushmates better.

<!-- [classification: verified obligation] Disability Discrimination Act 1992 s24: it is unlawful to discriminate on
the ground of disability in providing services, "whether for payment or not", including in the terms or conditions
and the manner of providing them (SCW-13 as corrected; official text and AHRC guidance, seen only as search extracts).
The specific help offered here, and an accessibility statement, are [recommended practice] (SCW-13, SCW-14). Whether
any particular barrier is unlawful turns on reasonableness and unjustifiable hardship.
Facts: an offer waits 3 minutes and a catch gives 10 minutes to write (offerHoldMs 180000, catchHoldMs 600000), and
they can't be extended today (WCAG 2.2.1, SCW-14). -->

## 15. Changes to these terms

We may change these terms when there's a good reason: a change to Hushmates itself, a change in the law or in a
regulator's guidance, a safety or security need, or to make them clearer.

- **If a change could make things worse for you,** we'll tell you in the app at least **[30 days]** before it starts,
  and explain what's changing.
- **If you don't want to carry on under the new terms,** you can delete your Hushmates data before then. On a paid
  plan, you can also cancel and get a refund for the unused part.
- **Some changes can't wait,** for example a change the law or safety needs straight away. Then we'll tell you as
  soon as we can.
- **The date at the top** always shows when these terms last changed. If you'd like an earlier version, just ask.

<!-- [classification: depends on Hushmallow's functionality or business circumstances] Unfair contract terms:
unilateral variation is the main scrutinised term (SCW-08; ACCC v Amazon over Prime Video ads, title seen only).
Limited reasons, notice, and a right to leave with a pro-rata refund for paid users are what the research recommends.
"[30 days]": owner decision. [GAP] Needs the in-app notice feature (section 9 comment). -->

## 16. The law that applies

These terms are governed by the law of **[state or territory where Hushmallow is based]**. You can bring a claim in
the courts there, or anywhere else the law allows. Nothing here takes away the protection of the laws where you
live.

<!-- [classification: recommended practice] Deciding fact for the placeholder: the business's state or territory
(not in the code). Jurisdiction is non-exclusive on purpose: an exclusive-jurisdiction clause in a standard form
consumer contract can be unfair (SCW-08 principle; no specific source seen). The same state decides which WHS law
covers desk readers (SCW-15) and possibly which state health-records law matters (PRV-17, PRV-18). -->

## 17. Contact

**[legal name of the business]**, ABN **[ABN]**
Email: **[contact email, to be set up]**
For privacy: **[privacy contact email]** (see our Privacy Policy)

If you or someone else is in danger right now, please don't email us. Call **000**.

---
---

# Part B: drafting notes for the owner and the lawyer (internal: remove before publishing)

## B1. Before these terms can be used

1. **Owner approval** of every commitment in Part A. The ones that go beyond what the code does today:
   - the review route and its time (section 7);
   - closing accounts and deleting data for under-18s or serious breaches (section 8), which needs an operator
     deletion tool;
   - "we'll tell you in the app" for changes and for ending the beta (sections 9 and 15), which needs an in-app notice
     feature;
   - "tell you in the app" for a closure, and "you'll also see the answer in the app" for a review (sections 7 and 8),
     which need a way to show one member a message (`AGE_ELIGIBILITY.md` §5.6 item 2);
   - emailing members about the service, for example when the desk is away (section 9), which needs a way to email
     members individually (`DATA_BREACH_RESPONSE_PLAN.md` R4);
   - "we'll tell you before it happens" if Mallow lines ever change (section 2);
   - "we never ... train AI" and "nothing new without asking" (section 6);
   - every paid-tier promise (section 10).
2. **Lawyer review** of every part marked "needs legal advice" or **[Lawyer to review]**: sections 2 (TGA), 3
   (under-16 law), 5 (Online Safety codes), 10 to 12 (consumer guarantees, liability, unfair terms), and the
   negligence position behind section 4.
3. **App changes** so that the app matches these terms (B4.2). The terms must not be published while the app says
   something different.
4. **Show and accept at sign-up.** The invitation screen has no link to terms or guidelines, and no agreement step
   (`ui/relay/invite.js`; nothing found for "terms" or "guidelines" in `ui/`, `app/` or `staff/`). Add links to the
   Terms, Community Guidelines and Privacy Policy, and a clear "By joining, you agree to the Terms and Community
   Guidelines" next to "Join Hushmates" ([recommended practice]: eSafety Safety by Design "social contracts at the
   point of registration", SM-11; also needed for the terms to bind at all, which is a contract-formation question for
   the lawyer).

## B2. What each part rests on

| Part A | What it does | Classification | Deciding fact or reason | Official source (how seen) |
|---|---|---|---|---|
| 1 | Names the business and a contact | Depends on Hushmallow's functionality or business circumstances | Entity, ABN, state: owner facts, not in the code | None needed |
| 2 | Intended-purpose statement, repeated exactly | Recommended practice (the consistency); the device question itself needs legal advice | What every channel says, including the public repository's technical documents | Therapeutic Goods Act 1989 s41BD (legislation.gov.au, search extract); TGA guidance pages (search extracts) |
| 2 | Mallow lines: fixed set, picked by rules, no AI | Depends on Hushmallow's functionality or business circumstances | AI off; the live labels say otherwise today | ACL s18 (text not seen; ACCC guidance, search extract) |
| 3 | 18+, invitation, self-declared tick described honestly | Recommended practice (18+ is our own rule); under-16 law needs legal advice | s 63C base test (leans met); the Rules' rule 4A additional condition (leans met, time-limited feature); the Rules s 5(1)(f) health exclusion | Online Safety Act 2021 s63C (legislation.gov.au, search extract); F2026L00370 (heading only); eSafety SMMA Regulatory Guidance and assessment page (search extracts); 2025 Rules Explanatory Statement (search extract) |
| 4 | Not an emergency service; word check limits; nobody watching; small team; can't contact | Depends on Hushmallow's functionality or business circumstances (ACL accuracy); negligence needs legal advice; signposting is recommended practice | Desk staffing; the published aim; what the code does | ACCC (search extracts); Mindframe, #chatsafe, Samaritans (guidance, not law) |
| 5 | Conduct rules, class 1 ban | Depends on Hushmallow's functionality or business circumstances | Online Safety Act category (needs legal advice) and Phase 1 risk tier (required at Tier 2, recommended at Tier 3) | eSafety Phase 1 Social Media Services Code and DIS Standard (search extracts, possibly mixing drafts) |
| 5 | Self-harm, suicide, disordered-eating ban | Needs legal advice | Phase 2 "self-harm material" definition and "allows" test not seen | eSafety Online Safety Codes and Standards Regulatory Guidance, April 2026 (search extract) |
| 6 | Narrow content licence and its exceptions | Depends on Hushmallow's functionality or business circumstances | Whether a contract exists (certain once paid); the facts listed in the comment | ACCC unfair contract terms release (search extract) |
| 6 | No selling, ads, marketing or AI training | Depends on Hushmallow's functionality or business circumstances | True only while there are no data-for-value arrangements | OAIC small business guidance (search extract) |
| 7 | Desk powers, reasons, review route | Recommended practice; unfair-terms fairness depends on whether a contract exists | No review route in the app today | eSafety Safety by Design Principles (search extract); Samaritans (UK guidance) |
| 7 | Follows regulator directions | Depends on Hushmallow's functionality or business circumstances | Arises only on receiving a notice | eSafety Online Safety Act fact sheet 2021 (search extract) |
| 8 | Leaving; closures; under-18s | Recommended practice; depends on Part 4A scope for under-16s | No operator deletion tool | eSafety SMMA Regulatory Guidance (search extract) |
| 9 | Beta, availability, notice of ending | Depends on Hushmallow's functionality or business circumstances | Unfair-terms fairness; no in-app notice feature | ACCC (search extract) |
| 9 | Email only for sign-in and important notices | Depends on Hushmallow's functionality or business circumstances | Sign-in emails stay purely transactional | Spam Act 2003 (as made, legislation.gov.au, search extract); ACMA investigation reports (search extracts) |
| 10 | Paid-tier promises | Depends on Hushmallow's functionality or business circumstances | The paid tier's launch | ACCC (search extracts) |
| 11 | Consumer guarantees can't be excluded | Depends (paid tier: apply with near certainty); needs legal advice (free beta) | Whether a free supply is "to a consumer" | ACCC (search extract); ACL text not seen |
| 12 | Fair liability; no indemnity; optional cap | Depends on Hushmallow's functionality or business circumstances; cap and negligence need legal advice | Contract formation; duty of care | ACCC (search extract); Civil Liability Acts not searched |
| 13 | Complaints route | Recommended practice; privacy complaint handling depends on APP-entity status (needs legal advice) | Small business exemption and the health-service exception | OAIC (search extracts, via PRIVACY_POLICY.md) |
| 14 | Accessibility contact | Verified obligation (DDA s24, not to discriminate, free or paid); the help offered is recommended practice | Reasonableness and unjustifiable hardship | Disability Discrimination Act 1992 (legislation.gov.au, search extract); AHRC guidelines (search extract) |
| 15 | Changes with reasons, notice and exit | Depends on Hushmallow's functionality or business circumstances | Contract formation; in-app notice feature | ACCC (search extract; Amazon case title only) |
| 16 | Governing law, non-exclusive | Recommended practice | The business's state | None |

"Search extract" means the official page was seen only through a web-search summary: this environment could not
open legislation.gov.au, oaic.gov.au, esafety.gov.au or tga.gov.au directly. **No finding behind these terms has been
read in full.** Mindframe (Everymind), #chatsafe (Orygen) and Samaritans are guidance bodies, not law; Samaritans is a
UK charity.

## B3. Tests that still need legal advice

### B3.1 Therapeutic goods (TGA)

- **The test.** Software is a medical device if the supplier intends it to be used for, among other things,
  "diagnosis, prevention, monitoring, prediction, prognosis, treatment or alleviation of disease" (Therapeutic Goods
  Act 1989 s41BD(1)(a)(i), seen verbatim in a search extract). Its purpose "is to be ascertained from the information
  supplied" in the labelling, the instructions for use, any advertising material, and technical documentation
  describing the mechanism of action. Unless an exemption applies, a medical device that isn't excluded must be on
  the ARTG before it is supplied (TGA guidance, search extract); "supply" includes free supply, so a free beta is
  still supply (TGA-9).
  - Sources: https://www.legislation.gov.au/C2004A03952/2025-03-21/2025-03-21/text/original/epub/OEBPS/document_2/document_2.html
    (official text, search extract);
    https://www.tga.gov.au/resources/guidance/understanding-digital-mental-health-device-rules,
    https://www.tga.gov.au/resources/guidance/advertising-software-based-medical-devices-australia,
    https://www.tga.gov.au/sites/default/files/digital-mental-health-software-based-medical-devices.pdf (official
    guidance, search extracts).
- **How it applies.** The core relay (write, deliver at random, one perspective each, homecoming) records and
  displays; on the guidance seen, that alone is not a device (TGA-3). Two features need advice:
  - **The word check** analyses text and tells a person their words suggest they "might not be safe", then holds the
    feeling back and shows support lines. TGA lists "suicide prevention apps" among devices. Framed as a content rule
    with signposting, no stored risk data and no alerts, it is closer to "information sources/resources", but this is
    a judgement (TGA-4 as corrected: needs legal advice).
  - **Mallow line selection** matches the author's words to thinking patterns from the main app's library and returns
    a matched line (`detectPatterns` in `core/perspectives.js:601`; the app's own words are "guided by your words"):
    the shape of cognitive restructuring, kept outside the definition today only by the absence of any purpose tied to
    a condition (TGA-5 as corrected: needs legal advice). The library in use is 293 lines (51 openers, 114 Hushmates
    lines, 128 of Reframe's), checked line by line at Tier 0 by the developer with AI agents, not clinically
    (`docs/safety/TIER0_SELF_ASSESSMENT.md` §1, §3).
- **Facts that raise the risk.** The source repository is public today (`docs/DECISIONS.md` D19; `docs/RISKS.md` L4;
  first seen through the GitHub API on 15 October 2026). It publishes `docs/CRISIS_DETECTION.md` (titled "Crisis
  detection: a safer, maintainable design", with classifier and "unsure-risk" check-in plans), the screen's rules and
  the Tier 0 probe, and the main app's briefs (for example `docs/REDESIGN_BRIEF.md` in the parent repository) that call
  CBT, DBT, ACT and behavioural activation the "psychological foundation". Those are arguably "technical
  documentation" supplied by Hushmallow. D19 recommends making the repository private now (an owner action, A$0;
  nothing in the app depends on it being public). That is recommended practice, not a legal duty: whether those
  documents count towards intended purpose is for the lawyer. Whatever happens to the repository, give the lawyer the
  documents and the selection logic, not just these terms; making it private doesn't undo what has already been
  published.
- **Release gates** (TGA-11, recommended practice): re-check before turning on AI, launching the paid tier, adding
  any mood history or questionnaire, any partnership with a health service, or any change to the word check that grades
  risk, uses a classifier or asks people whether they're safe.
- **These terms deliberately avoid**: "TGA approved", "excluded from TGA regulation", "clinically reviewed",
  "evidence-based", therapy and condition words, and "detect", "screen", "monitor" or "prevent" as claims (TGA-6, TGA-9,
  TGA-10). The only use of those verbs is the negated intended-purpose statement.

### B3.2 The under-16 social media minimum age law

- **The test.** An "age-restricted social media platform" (Online Safety Act 2021 Part 4A, s63C(1)(a)) is a service
  where (i) "the sole purpose, or a significant purpose, of the service is to enable online social interaction between
  2 or more end-users"; (ii) end-users can "link to, or interact with, some or all of the other end-users"; (iii)
  end-users can "post material on the service"; and (iv) any further conditions in the rules apply. The Online Safety
  (Age-Restricted Social Media Platforms) Amendment Rules 2026 (F2026L00370) added rule 4A (headed as s4A in the
  official text, of which only the heading was seen): the service must also have a recommender feature or a logged-in
  feature (an endless feed, a feedback count, or time-limited material), per eSafety's and the department's
  descriptions; the operative rule 4A text was not seen. Exclusions in the 2025 Rules include a service whose sole or
  primary purpose is supporting the health of end-users (Rules s 5(1)(f); the s 5 text was not seen, only the
  Explanatory Statement, as a search extract). `docs/RISKS.md` L1 once cited it as s 5(1)(h), which is the exclusion
  for communication with health-care providers (`LEGAL_REQUIREMENTS.md` X-5).
  - Sources: https://www.legislation.gov.au/C2021A00076/2024-12-11/2024-12-11/text/original/epub/OEBPS/document_1/document_1.html
    (official text, search extract); https://www.legislation.gov.au/F2026L00370/asmade/text (heading only);
    https://www.esafety.gov.au/about-us/industry-regulation/social-media-age-restrictions/assessment and
    https://www.esafety.gov.au/sites/default/files/2025-09/eSafety-SMMA-Regulatory-Guidance.pdf (official guidance,
    search extracts); https://www.legislation.gov.au/F2025L00889/asmade/2025-07-30/es/original/pdf (Explanatory
    Statement, search extract).
- **How it applies.** (ii) and (iii) are met (perspectives reach the author; feelings and perspectives are posted
  text). (i) is a judgement, and eSafety says to presume a significant purpose if unsure, so the s 63C base test leans
  met. Under rule 4A, feelings are shown to catchers only for a limited time (a 3-minute offer, 10 minutes to write, a
  day's journey: `offerHoldMs`, `catchHoldMs`, `journeyTtlMs` in `schema.sql:31-32`), which leans towards the
  time-limited feature being met; the author's private "n of 5" count is arguably a feedback feature; matching at random
  among the three longest-waiting feelings, not from personal data, argues against a recommender feature. The research
  therefore leans towards Hushmates being in scope. The health exclusion (Rules s 5(1)(f)) is the realistic way out,
  and it pulls against the non-clinical positioning (and towards Privacy Act health-service status). **Result: needs
  legal advice (D9).** These terms neither say the law applies nor that it doesn't.
- **If it applies,** a self-declared tick alone is not "reasonable steps" by eSafety's guidance (U16-06), and the age
  process, section 3 and section 8 must change before more people join.

### B3.3 Online Safety Act category and codes

Whether Hushmates is a social media service, a relevant electronic service or a designated internet service decides
which codes apply (SCW-01: needs legal advice; s13, s13A and s14 not seen). It appears not to be "deemed Tier 3", so a
written Phase 1 risk assessment is needed (SCW-02). At Tier 3, published terms are recommended, not required; at Tier 2
they are required (SCW-03). Phase 2's Age-Restricted Material codes turn partly on whether the terms "allow" self-harm
material (SCW-04). These terms are drafted to work under any outcome.

### B3.4 Consumer law for a free beta

Whether click-wrap terms for a free beta form a contract, and whether a free service is "supplied to a consumer", are
unsettled on what was seen (SCW-08, SCW-10). These terms are drafted as if both the unfair contract terms regime and the
guarantees apply. The ACL text itself (s18, s29, s23 to s27, s60 to s64A) was not retrieved.

### B3.5 Negligence

Whether Hushmallow owes a duty of care to members who rely on the word check or danger reports was not researched
(SCW-17, from memory). The approach here is honest limits (section 4), no exclusion of negligence (section 12), and
following the documented desk procedures (`MODERATION.md`, `docs/ESCALATION.md`).

## B4. Facts checked in the code, and where the app doesn't match yet

### B4.1 Facts these terms state (checked against `9012d6f`)

| Fact | Where |
|---|---|
| Feeling 3 to 500 characters; perspective 8 to 280 | `supabase/migrations/20261014090000_hushmates_schema.sql:33`; app-facts P8, P10 |
| At most five perspectives per feeling, ever | `schema.sql:151, 168` (slot 1 to 5, unique per journey) |
| Send out again only if nobody caught it, at most twice | `supabase/migrations/20261014090100_hushmates_rules.sql:515-516`; `maxResends 2` |
| A day per trip; offer waits 3 minutes; 10 minutes to write | `journeyTtlMs`, `offerHoldMs`, `catchHoldMs` in `schema.sql:31-36` |
| No cap on how many catchers are offered a feeling | `rules.sql:548-556`; `ui/relay/parts.js:181` |
| Mallow after 30 minutes only if allowed; or on request | `rules.sql:194-201`; `ui/relay/journeys.js:157-160` |
| Mallow lines: an opener plus one line, a feeling word filled in, from 293 lines written in advance | `core/perspectives.js:612-661`, `libraryCatalogue()`; `docs/safety/TIER0_SELF_ASSESSMENT.md` §3 |
| AI off | `schema.sql:39`; `supabase/functions/_shared/mallow-setup.js:33-35` |
| Words held back are never stored; nobody alerted | `supabase/functions/_shared/gateway.js:75-77`; app-facts P25 |
| A feeling telling readers to hurt themselves gets support, not release | `core/feeling-safety.js:339-344` |
| Automatic pause after 2 reports or 1 danger report (not on a member's repeat report) | `rules.sql:888-912` |
| A Mallow's own check can pause a feeling and send it to the desk | `rules.sql:810-822, 838-841`; `supabase/functions/_shared/gateway.js:177-178` |
| Desk decisions; restrict; team lead lifts | `staff/desk-guide.js:8-24`; `server/admin.mjs`; `supabase/migrations/20261014090200_hushmates_api.sql:303-319` |
| Restricted and suspended members can still view, export, take back, delete | `rules.sql` actor lists (lines 327 to 999) |
| Report copies kept 90 or 180 days; cleared by deleting all data, not by deleting a journey or taking back | `api.sql:178-184`; `rules.sql:474-484, 757-771, 1009-1016` |
| 30-day clearing of unsaved journeys | `api.sql:169-177` |
| Share pictures made on the device; contributor tick off by default | `ui/relay/share.js:245-272`; `ui/relay/catch.js:280-285` |
| Display name can't be changed | `rules.sql:332-354` |
| Report acknowledgement times ("within a day", "within two days") | `supabase/migrations/20261015090000_hushmates_tier0.sql:45-47`; `core/relay.js:823-826` (committed since `0037d57`) |
| The desk-away message, and an unreadable value reading as away with no day | `supabase/migrations/20261015090000_hushmates_tier0.sql:25-43`; `server/admin.mjs` `deskProblem` (today to 90 days, Sydney) |
| Internal 12-hour target; "Over 12 hours" badge; no alerts | `docs/ESCALATION.md` §2; `staff/desk-guide.js:47-56`; `staff/desk.js:185-187, 224` |
| Support lines, and the Support pill on every screen | `core/feeling-safety.js:166-183`; `ui/relay/common.js:41-66` |
| Consent wording "without my name"; export key `agreedToShareWithoutYourNameAt` (format version 2) | `ui/relay/release.js:103`; `core/export-format.js:44, 54-55` |

### B4.2 Where the app and these terms disagree today (fix before publishing)

Re-checked at `9012d6f`. Items marked **Done** are kept so the history is visible.

1. **Mallow wording. Partly done.** Done: the welcome, You & safety and the privacy sheet now say "chosen automatically
   from a fixed set of lines (or perspectives) written in advance" (`ui/relay/welcome.js:104`, `ui/relay/you.js:69`,
   `ui/relay/parts.js:184`), and sending again and "Explore another angle" say "chooses it ... from lines written in
   advance, guided by your words" (`ui/relay/returned.js:319, 348, 351`). Still open: "Hushmates writes a perspective
   for you automatically" and "an automatically generated perspective" on the release screen (`ui/relay/release.js:110,
   117`) conflict with section 2; and the label "A Mallow perspective · Automatically generated" (`core/relay-config.js:
   47-48`, `rules.sql:236`, `ui/relay/share-render.js:27`), repeated in `ui/relay/journeys.js:162, 175, 287`,
   `ui/relay/returned.js:257` and `ui/relay/your-data.js:59`, is decision D21 (open: change it after the lawyer's view,
   PRV-22 as corrected).
2. **The release consent label. Done.** "Share with Hushmates participants, without my name" (`ui/relay/release.js:103`;
   also `core/relay-messages.js:23` and `ui/relay/your-data.js:62`, D8), and the export key is now
   `agreedToShareWithoutYourNameAt`, format version 2 (`core/export-format.js:44, 54-55`). Two places still say "not
   perfectly anonymous" (the welcome's first promise and the note in You & safety, `ui/relay/welcome.js:102`,
   `ui/relay/you.js:48`; the privacy sheet's heading, `ui/relay/parts.js:183`): accurate, but `SAFETY_DISCLAIMERS.md` §3.1
   and §3.5 propose "Pseudonymous: your name stays with you" instead.
3. **No terms, guidelines, contact, complaint or review route** anywhere in the app (B1.4; app-facts §0; D23 for the
   contact address). Still open.
4. **The restriction message** gives no reason, no support lines and no review route (`ui/relay/catch.js:434`,
   `ui/relay/release.js:129`). Recommended: a general reason, Support, and "ask for a review" (SM-13;
   `SAFETY_DISCLAIMERS.md` §3.6). Still open.
5. **No operator deletion tool**, no "may be under 18" report reason, no block on re-declaring age (section 8). Still
   open (`server/admin.mjs` has invite, revoke, settings, set, ops and member only).
6. **No in-app notice feature** for changes to the terms or the end of the beta (sections 9, 15). Still open.
7. **Sign-in copy** "We’ll only use your email to sign you in." (`ui/relay/sign-in.js:108`) and the privacy sheet's
   "Your email is used only to sign you in" (`ui/relay/parts.js:185`) are narrower than section 9 and the privacy
   policy. Still open.
8. **Response times. Done.** The app says "within a day" (priority) and "within two days" (others), with nights,
   weekends and holidays, and "we aim to" (Tier 0 migration; `core/relay.js:823-826`; `ui/relay/you.js:70`).
   `docs/ESCALATION.md` §2, committed, lists the same public aims and calls 12 hours the team's own, tighter target,
   "not promised to anyone", which is consistent with section 4 (SCW-07 as corrected). The aims still need a staffed
   rota behind them (D12).
9. **Tier 0 changes. Done: committed** (`0037d57`, refined in `1fba09a`, `f8d7e4a`, `7b92ee8` and `9012d6f`). Section 4
   relies on the acknowledgement wording, the Support pill in every header and the English-only welcome copy, all now
   in the code.
10. **The offline screen. Done.** "Your feelings are safe and keep travelling." is gone; it now says "Your feelings keep
    travelling while you’re offline. We’ll try again as soon as you’re back online.", and the Mallow says "Let’s try
    again when you’re back online." (`ui/relay/away.js:17, 35`).
11. **Timers can't be extended** (section 14; WCAG 2.2.1). Still open.
12. **The ordinary report acknowledgement has no 000** ("…we aim to read reports within two days. Nobody is told who
    reported.", Tier 0 migration line 47). Section 4 is fine as it stands; `SAFETY_DISCLAIMERS.md` §3.7 proposes adding
    "If anyone is in danger right now, call 000." Still open.
13. **What the welcome says about the word check** ("it can miss things", `ui/relay/welcome.js:105`) is milder than
    section 4 ("even words that clearly mean someone isn't safe"). Both are true; the stronger form is the honest reading
    of the Tier 0 probe. `SAFETY_DISCLAIMERS.md` §5 has it as an optional proposal. Owner and Tier A to decide.

## B5. Placeholders to fill

- **[legal name of the business]**, **[ABN]**, **[state or territory where Hushmallow is based]**
- **[contact email, to be set up]** (one monitored address for questions, reviews, complaints, accessibility and
  regulators such as eSafety, checked every day including weekends: SCW-06), and **[privacy contact email]** (may be the
  same)
- **[the owner]** as reviewer; **[14 days]** to reply to a review; **[30 days]** notice for changes and for ending the
  beta
- Section 10: cancellation timing, refunds on closure, and everything about billing

## B6. What could not be confirmed

- The text of the Australian Consumer Law (s18, s29, s23 to s27, s60 to s64A) and the prescribed guarantee wording:
  section 11's second paragraph is from memory.
- Whether a free beta forms a contract, and whether the guarantees apply to it.
- The Online Safety Act s13, s13A, s14 and s106 (class 1), the registered Phase 1 Tier 3 duties, and Phase 2's
  "self-harm material" definition.
- The operative s4A text, s63D, s63DB and s63F.
- TGA device status for the word check and the Mallow selection; the Excluded Goods Determination's own words.
- The OAIC, eSafety and ACCC complaint pages named in section 13.
- The support numbers against each service's own site (they come from the app's code).
- Owner facts: entity, ABN, state, who staffs the desk, the backup plan, and whether the paid tier will keep a free
  version.
