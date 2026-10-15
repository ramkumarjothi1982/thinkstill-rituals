# Hushmates collection notices and consent design

**DRAFT, not yet reviewed or approved. Not legal advice.**
**Date: 15 October 2026.**

> **Status.** Nothing here is final until the owner approves it. Parts marked "needs legal advice" must also be
> reviewed by an Australian privacy lawyer (decision D7). This document proposes wording only: **this drafting changed
> no code.** It goes with `PRIVACY_POLICY.md` in this folder. Hushmates is not live: nothing is deployed, AI is off,
> and the GitHub repository is public today (D19 recommends private). Each requirement is classified in hidden
> comments as verified, depending on Hushmallow's functionality or business circumstances, needing legal advice, or
> recommended practice; recommended practice is never written as a legal obligation.

## 1. What this is, and how to use it

This document does two things:

1. It sets out the **short, just-in-time collection notices** (APP 5) that people see at the moment Hushmates
   collects something: at sign-in and joining, before the first feeling travels, before each feeling travels,
   before catching, before writing a perspective, for the Mallow line, for share pictures and for reports.
2. It sets out a **consent design for health information** that meets APP 3.3 and follows the OAIC's guidance:
   express, unbundled, informed, current, specific and revocable. It maps that design onto the app's existing
   screens.

For each screen it gives:

- **Now:** the current wording, quoted with its file and line at commit `9012d6f` (15 October 2026, after the Tier 0
  changes), read from the code itself.
- **Done:** where the app has adopted a proposal since the first draft (written against `000c0cd`), it's marked
  **Done** with the wording the app now uses. Where it adopted part of one, it's marked **Partly done**, and the rest
  stays proposed.
- **Proposed:** exact replacement wording, in the app's voice, ready to paste. Curly apostrophes (’) match the code.
- **Why:** which APP 5 matter or consent element it serves.

Paths are relative to `hushmallow/hushmates-lab/`.

<!--
[classification: needs legal advice] Whether any of this is legally required turns on whether Hushmallow is an APP
entity (Privacy Act 1988 s6D(4)(b), the health-service exception to the small business exemption; PRV-02). The design
is drafted as if bound (PRV-03, recommended practice). If Hushmallow is bound, APP 3.3 and APP 5 make most of this a
legal requirement; if not, it is recommended practice, and accuracy is still required under the Australian Consumer
Law (s18, if in trade or commerce; SCW-07) and is the basis of informed consent.
-->

---

## 2. The rules this design follows

| Element | What it means | Source (how seen) | Classification |
|---|---|---|---|
| **Collection notice (APP 5)** | At or before collection, or as soon as practicable after, take reasonable steps to tell the person the APP 5.2 matters, or make sure they're aware of them. | OAIC APP Guidelines Chapter 5 (earlier-run search extract, not re-seen); APP 5.2 lettering from memory, except that (i) and (j) are the overseas items (OAIC APP 1 guidance, search extract) | Depends on functionality or business circumstances (APP-entity status) |
| **Sensitive information needs consent (APP 3.3)** | Collect sensitive information (health information included) only with consent, and only if reasonably necessary for the entity's functions. "Reasonably necessary" is objective: would a properly informed reasonable person agree? | OAIC APP Guidelines Chapter 3 (search extract) | Depends on functionality or business circumstances (APP-entity status; whether the words hold health information) |
| **Express** | "An APP entity should generally seek express consent from an individual before handling the individual's sensitive information." | OAIC APP Guidelines Chapter B (search extract) | **Recommended practice** (OAIC guidance: "should generally"). APP 3.3 itself requires consent, which under the Act may be express or implied; whether APP 3.3 binds depends on APP-entity status |
| **Not inferred from a notice** | "An APP entity cannot infer consent simply because it provided an individual with notice." | Chapter B (search extract) | The OAIC's reading of valid consent under APP 3.3; depends on APP-entity status |
| **Informed** | The person is "properly and clearly informed about how their personal information will be handled", in plain English, "without legal or industry jargon". | Chapter B (search extract) | The OAIC's reading of valid consent under APP 3.3 (one of its four key elements); depends on APP-entity status |
| **Voluntary** | "A genuine chance to give or withhold it". | Chapter B (search extract) | As for Informed (one of the four key elements) |
| **Unbundled** | Ask whether it is "practicable and reasonable to give the individual the opportunity to refuse consent to one or more proposed collections, uses and/or disclosures". | Chapter B (search extract) | **Recommended practice** (the OAIC's guidance on voluntary consent, not a separate rule) |
| **Current and specific** | Consent "cannot be assumed to endure indefinitely"; no "consent for undefined future uses, or consent to 'all legitimate uses or disclosures'". | Chapter B (search extract) | As for Informed (one of the four key elements) |
| **Revocable** | A person can withdraw consent at any time, and withdrawing should be easy. | **From memory** (OAIC Chapter B); not seen in any extract | Recommended practice until confirmed |
| **Capacity** | An entity "can ordinarily presume that an individual has the capacity to consent, unless there is something to alert it otherwise, for example, the individual is a child or young person". | Chapter B (search extract) | As for Informed (one of the four key elements) |

The design below goes further than APP 3.3 strictly needs (express, unbundled consent for every feeling), because the
OAIC recommends it for sensitive information and because it is cheap here. Where a row above is recommended practice,
the design follows it as practice, not as a legal duty.

**Sources:**
- OAIC, APP Guidelines Chapter B: https://www.oaic.gov.au/privacy/australian-privacy-principles/australian-privacy-principles-guidelines/chapter-b-key-concepts
- OAIC, APP Guidelines Chapter 3: https://www.oaic.gov.au/privacy/australian-privacy-principles/australian-privacy-principles-guidelines/chapter-3-app-3-collection-of-solicited-personal-information
- OAIC, APP Guidelines Chapter 5 (PDF): https://www.oaic.gov.au/__data/assets/pdf_file/0019/1198/app-guidelines-chapter-5-v1.2.pdf
- OAIC, APP Guidelines Chapter 1: https://www.oaic.gov.au/privacy/australian-privacy-principles/australian-privacy-principles-guidelines/chapter-1-app-1-open-and-transparent-management-of-personal-information

All were seen **only as search-tool extracts**, usually paraphrased. None was opened directly. The Privacy Act's own
text (https://www.legislation.gov.au/C2004A03712/latest/text, series id from memory) was not seen.

### The design in one table

| Choice | Express? | Unbundled? | Informed by | Current and specific | How to withdraw |
|---|---|---|---|---|---|
| **Share this feeling** (the per-feeling tick) | Yes: an unticked box the person ticks | Yes: separate from the terms and from every other choice | The one-time "Before your first feeling travels" sheet, the tick's hint, and the privacy sheet | One feeling. The tick covers its first trip and up to two resends; each resend is a deliberate "Send it out again" choice, but asks for no new tick and records no new consent time (`rules.sql:515-545`). **[recommended practice]** a share tick on "Send it out again" that refreshes `consent_at` | Bring it home early, let it go, delete the journey, or delete everything |
| **Let feelings find me** (catching) | Yes: a switch that starts off for a new member, plus a one-time sheet with a tick | Yes | The one-time "Before you catch" sheet | Stays on until turned off | Switch it off in Catch or You & safety |
| **Add my perspective** (the catcher's own words) | Yes: the person presses "Add my perspective" right after a clear statement | Yes: separate from catching and from share pictures | The statement above the button | One perspective | Take it back in You & safety |
| **A Mallow line** | Yes: a switch that starts off, or "Ask {Mallow}" | Yes: separate from sharing | The switch's note and "How this works" | One feeling, one trip | Switch it off on "Send it out again"; bring it home early; **[proposed]** a switch while it travels |
| **My words in a share picture** (catcher) | Yes: an unticked box | Yes: separate from writing | The tick's hint | One perspective | Switch it off in You & safety, or take the perspective back. Pictures already made can't be recalled, and the person is told that before saying yes |
| **I'm 18 or over** | Yes: an unticked box | Kept with joining, because the age rule is a condition of the service, not a privacy choice | The tick's hint | Once | Not applicable (delete the account) |

<!-- [classification: depends on functionality or business circumstances] Every "Yes" above is true of the code at
9012d6f except where marked [proposed], and except the one-time sheets, which are new. Facts: consent off by default
and required (ui/relay/release.js:26, 69-70, 101-107; schema.sql:102 consent_at not null; rules.sql:364 refuses
without consent); fallback off by default (release.js:26), fallback_consent_at recorded (rules.sql:382-386); catching
default false (schema.sql:61; core/relay.js:121), and the welcome's switch shows the stored value, so it starts off
for a new member (ui/relay/welcome.js:33, 109) [note: DECISIONS.md D22 describes the switch as "on at the welcome";
the code read here shows it starting off for a newly joined member; the owner should check which is meant before D22
is decided]; share consent off by default and share_consent_at recorded (rules.sql:713, 726-730); adult tick
required to enable Join (ui/relay/invite.js:35) and checked by the server (rules.sql:1037). -->

---

## 3. Three layers

1. **Layer 1: one or two lines at the control itself.** The tick's hint, the switch's note, the sentence above a
   button.
2. **Layer 2: a short sheet.** The existing "Privacy details" sheet (one tap from sign-in, joining, welcome, Release
   and You: `ui/relay/sign-in.js:112`, `invite.js:55`, `welcome.js:107`, `release.js:105` and `:118`, `you.js:49`),
   plus two new one-time sheets: "Before your first feeling travels" and "Before you catch".
3. **Layer 3: the full privacy policy** (`PRIVACY_POLICY.md`). **[GAP, still open at 9012d6f]** The app has no link
   to a full policy, no business name and no contact route today. Proposed: a "Read the full privacy policy" link at
   the bottom of the privacy sheet, on sign-in, and in You & safety.

Separate from these layers, and not a collection notice: since Tier 0, a **Support** button in the header of every
screen opens the crisis lines in a sheet over the current screen (`ui/relay/common.js:41-49`), and You & safety opens
with "If you’re not okay → Get support now" (`ui/relay/you.js:52-54`). The proposals below point to it where they
mention support.

### Where each APP 5 matter is covered

| APP 5.2 matter (lettering from memory) | Covered by |
|---|---|
| (a) Who we are, and how to contact us | Sign-in notice (new); privacy sheet "Who we are" (new); both one-time sheets |
| (b) Collected from someone else | Privacy sheet "If you catch a feeling" (perspectives about your feeling come from other members); reports about you come from other members (privacy policy) |
| (c) Required or authorised by law | None known. No notice needed unless that changes. |
| (d) Why we collect it | Each Layer 1 line; the one-time sheets |
| (e) What happens if you don't give it | Sign-in (no email, no sign-in); Release (no tick, nothing is sent) |
| (f) Who it usually goes to | Release sheet and tick (catchers; the safety team if reported); sign-in (the email provider); privacy sheet (Supabase as host) |
| (g)-(h) The policy explains access, correction and complaints | Link to the full privacy policy; privacy sheet "Questions" |
| (i)-(j) Overseas, and which countries | Sign-in notice (the email provider's country); privacy sheet "Where it's kept" |

<!-- [classification: depends on functionality or business circumstances] (f), (i) and (j) change with the email
provider (decision D5) and with any Supabase support access or Edge Function region outside Australia [NOT CONFIRMED;
PRV-11]. -->

---

## 4. Screen by screen

### 4.1 Sign-in: your email (`ui/relay/sign-in.js`)

**Collected:** the email address; the sign-in records Supabase Auth keeps **[NOT CONFIRMED: which]**.

**Now (9012d6f):** unchanged since the first draft.
- Heading and subline: "Your email". "We’ll send you a short code. That’s all you need to come in, on this device or
  any other." (`ui/relay/sign-in.js:105-106`)
- Field hint: "We’ll only use your email to sign you in." (`:108`)
- A "Privacy details" link (`:112`), and the Support button in the header (`:94`).

**What's missing:** who we are (a), that the email is kept in Australia and sent through an email provider, which
may be overseas (f, i, j), and a link to the full policy (g, h). The hint is also narrower than the privacy policy,
which uses the email to reply and for important notices too. Also, a person who asks for a code but never joins
keeps a sign-in account with no end date (app-facts P1, **[GAP]**).

**Proposed:**
- Subline: keep as it is.
- Field hint:
  > We’ll only use your email to sign you in, to reply when you write to us, and to tell you something important
  > about your account or the service if we ever must. Nobody else in Hushmates sees it.
- New line under the "Send code" button, above the links:
  > Hushmates is run by [business name]. Your email is kept in Australia. Your code is sent by [email provider], in
  > [country].
- Links: "Privacy details" (keep) and **"Privacy policy"** (new).

**Why:** APP 5.2(a), (d), (e), (f), (i), (j). The email is collected the moment a code is requested, before the
person has joined, so the notice must be here, not later.

<!-- [classification: depends on functionality or business circumstances] The email-provider sentence depends on D5.
"Your email is kept in Australia" depends on the Supabase project staying in Sydney (D1; tools/staging-deploy.mjs
refuses another region) and on where Supabase Auth and the email provider process it [NOT CONFIRMED; PRV-11].
[business name] and the contact address depend on the business details and D23.
While staging uses Supabase's built-in sender (team-only), say "Your code is sent by our sign-in service." Fix the
never-joined gap with an expiry job, or add to the privacy sheet: "If you never join, your email stays in our sign-in
system until you ask us to delete it." -->

### 4.2 Joining: invitation, name and 18+ (`ui/relay/invite.js`)

**Collected:** which invitation was used (and any note the team wrote on it), the chosen name, the 18+ tick and its
time.

**Now (000c0cd):**
- "You’re invited". "Hushmates is a small, invitation-only pilot for adults. Send a feeling, and see it
  differently." (`ui/relay/invite.js:44-45`)
- Code hint: "It’s in the invitation you were sent." (`:48`)
- Name hint: "3 to 20 letters or numbers. Only you see it. Your feelings and perspectives travel with no name at
  all." (`:49`)
- Tick: "I’m 18 or over" (`:50`). "Join Hushmates" stays disabled until there's a code, a name and the tick
  (`:33-34`).

**Proposed:**
- Name hint:
  > 3 to 20 letters or numbers. Please don’t use your real name. Only you see it: your feelings and perspectives
  > travel with no name at all.
- Tick label: keep "I’m 18 or over". Add a hint under it:
  > Hushmates is for adults. We don’t ask for ID. We take your word for it.
- New line above "Join Hushmates" (the terms, kept apart from privacy choices):
  > Joining means you agree to the Hushmates [terms] and [community guidelines]. Your privacy choices come
  > separately, one at a time.
- Keep the "Privacy details" link.

**Why:** APP 5.2(d) for the name and age; capacity (adults are presumed to have capacity); honest age claims
(U16-13: never "verified" or "age-checked"). Agreeing to the terms is a contract matter. It is deliberately **not**
bundled with consent to share sensitive words, which is asked for feeling by feeling.

<!-- [classification: recommended practice] The age hint follows U16-13 (age copy matches what is checked).
[classification: needs legal advice] Whether an 18+ tick is enough depends on whether Hushmates is an age-restricted
social media platform (Online Safety Act 2021 Part 4A, s63C; U16-01 to U16-03). This wording claims nothing either way.
[GAP] Nothing is recorded when someone can't tick; their sign-in account stays (app-facts §8). -->

### 4.3 Welcome: the promises and "Let feelings find me" (`ui/relay/welcome.js`)

**Now (000c0cd)** (`ui/relay/welcome.js:101-104, 107`):
- "**Pseudonymous, not perfectly anonymous.** Other participants never see your name or account, and can’t contact
  you. Leave out names and details that could identify anyone."
- "**Possibilities, not verdicts.** No diagnosis, no judgement, no telling anyone what to do."
- "**People first.** A Mallow perspective is offered only if you allow it. It’s automatically generated, always
  labelled, and never counted as a person."
- "**Not an emergency service.** Hushmates looks out for words that suggest you might not be safe and shows real
  support, but it can miss things. If you’re not safe, call 000 or Lifeline on 13 11 14."
- Switch "Let feelings find me": "Catch other people’s feelings when you choose to look. You can change this any
  time." It starts off.

**In progress (working tree):** "People first" now says "It’s chosen automatically from lines the Hushmates team
wrote, always labelled, and never counted as a person." "Not an emergency service" now says "Hushmates checks words
for some signs that someone might not be safe, and shows numbers to call. The check reads English only, it can miss
things, and nobody is watching in real time. If you’re not safe, call 000, or Lifeline on 13 11 14, any time."

**Proposed:**
- First promise:
  > **Pseudonymous: your name stays with you.** Other participants never see your name or account, and can’t
  > contact you. We hold your email and know which account is yours. Words can give people away, so leave out names
  > and details that could identify anyone.
- "People first":
  > **People first.** A Mallow line is offered only if you allow it. It’s put together automatically from pieces
  > written in advance, always labelled, and never counted as a person.

  (At `f8d7e4a` the app already says "chosen automatically from a fixed set of lines written in advance". Who wrote
  the lines is for the owner to confirm before any wording says "the Hushmates team wrote": `TERMS_OF_USE.md` §2.)
- "Not an emergency service": adopt the in-progress wording above. It is accurate and doesn't imply monitoring.
- The switch: keep its wording. Turning it on opens "Before you catch" (4.5) before it saves.

**Why:** "not perfectly anonymous" still leans on the idea of anonymity; this says plainly what is true (PRV-22,
SCW-07), and uses "pseudonymous" only. The Mallow line comes from a fixed library, so "automatically generated" is
not accurate (critic's correction to PRV-22).

### 4.4 Release: before a feeling travels (`ui/relay/release.js`)

This is the main consent. Nothing a person writes reaches another member without it.

**Now (000c0cd)** (`ui/relay/release.js:101-107, 69-70`):
- Tick label: **"Share anonymously with Hushmates participants"**
- Hint: "Your words may be shown to other people who can offer different perspectives. Please leave out
  identifying details."
- A "Privacy details" link. The tick starts off. The button rests until it's ticked: "Tick “Share anonymously with
  Hushmates participants” to release."
- The server refuses without it: "Please confirm you’re happy to share this anonymously first."
  (`core/relay-messages.js:23`), and records `consent_at` (`rules.sql:384`).

**In progress (working tree):** the label now reads "Share with Hushmates participants, without my name" (decision
D8), the resting line follows it, and the server message reads "Please confirm you’re happy to share this without
your name first."

**What's missing:** the hint doesn't say who reads it, that the safety team may, that a word check runs first, how
long it's kept, or that the words may be sensitive. There's no notice of who we are.

**Proposed: the per-feeling tick (every feeling)**
- Label:
  > Share this with Hushmates participants, without my name
- Hint:
  > People who chose to catch feelings will read it, and up to five can offer a perspective. They never see your
  > name. If it’s reported, a person on our safety team reads it too. Please leave out names and anything that
  > could identify anyone.
- Link: "Privacy details" (keep).
- Resting line:
  > Tick “Share this with Hushmates participants, without my name” to release.
- Server message (`consent-required`): adopt the in-progress wording.

**Proposed: a one-time sheet, "Before your first feeling travels"**

Shown the first time someone ticks the share box (and again if this wording changes in a way that matters). The
tick only takes effect after "I understand". It informs the consent. The tick, every time, is the consent.

> **Before your first feeling travels**
>
> Here’s what happens when you share a feeling.
>
> **Who reads it.** People who turned on “Let feelings find me” are offered it, one at a time. Up to five can offer
> a perspective. Some will read it and let it float past. Nobody sees your name or your email.
>
> **It’s yours to choose.** What you write may say something about your health, or how you’re feeling in yourself.
> That’s sensitive, so we only send a feeling when you tick to share it, once for each feeling. If you don’t tick,
> nothing is sent.
>
> **A word check reads it first.** If your words describe something that needs more than a new way of seeing it,
> like not feeling safe, abuse, violence, threats, harassment or being treated unfairly, Hushmates won’t send it. It
> shows you support lines instead, and your words aren’t saved. The check reads English only, and it can miss things.
>
> **If it’s reported,** a person on our small safety team reads it. They see an account reference, never your name
> or email, and they can’t contact you.
>
> **We know it’s you.** We hold your email, and we know which account wrote what. Your words are locked
> (encrypted) before they’re stored, in Australia. Only a very few people hold the keys.
>
> **How long.** It travels for up to a day. Once it’s home, its words are cleared after 30 days, unless you save
> it. You can bring it home early, let it go or delete it whenever you like.
>
> Hushmates is run by [business name]. Questions: [privacy contact email].
>
> [I understand] [Not now]
> Privacy details · Privacy policy

**Why:** informed (Chapter B), express (an unticked box the person ticks), current and specific (one feeling; a resend
of the same feeling is confirmed each time with "Send it out again"), unbundled (separate from the terms and from the
Mallow choice), notice not mistaken for consent (the sheet informs; the tick consents). APP 5.2(a), (d), (e), (f) and
the policy link (g), (h). The word-check sentence names what is actually held back: screenFeeling holds back every
category the lexicon marks not reframeAppropriate (crisis, someone in danger, abuse, violence, threats, harassment,
discrimination, "unsafe"), not only safety words (`core/feeling-safety.js`; `SAFETY_DISCLAIMERS.md` §3.3).

<!--
[classification: depends on functionality or business circumstances] APP 3.3 express consent for sensitive information
(PRV-04). "Reasonably necessary" is met for feelings: the service can't work without the words.
[classification: recommended practice] Record which version of the notice the person saw with each consent_at (for
example a notice_version column): it makes the consent provable when wording changes. Code change for the developer;
not made here.
[classification: needs legal advice] Whether the one-time sheet plus a per-feeling tick is valid express consent for
health information under APP 3.3 (and under the Victorian or NSW health privacy principles, if they apply).
"Only a very few people hold the keys": true today (the owner, D11); must stay true, or change.
-->

### 4.5 Catching: what catchers agree to (`ui/relay/welcome.js`, `ui/relay/catch.js`, `ui/relay/you.js`)

Catchers read other people's feelings, which can be personal or heavy. They also write their own words.

**Now (000c0cd):**
- Catch screen: "Let feelings find you". "Catch a feeling someone released and offer another way of seeing it."
  Switch "Let feelings find me": "Always voluntary. Letting a feeling float past is always fine, and you can turn
  this off any time." (`ui/relay/catch.js:64-70`)
- You & safety: "Catch other people’s feelings when you choose to look. Always voluntary." (`ui/relay/you.js:53`)
- An offered feeling: "Catch this feeling" / "Let it float past", and "It waits a few minutes for you. Letting it
  float past is always fine." (`ui/relay/catch.js:162-164`)

**What's missing:** nothing asks catchers to keep what they read private, or tells them it may be heavy.

**Proposed: a one-time sheet, "Before you catch"**

Shown the first time someone turns on "Let feelings find me", wherever they do it. The switch only saves once
they've ticked and tapped.

> **Before you catch**
>
> When you catch a feeling, you’ll read words someone wrote about what’s on their mind. Some may be heavy.
>
> **Keep what you read private.** Please don’t copy, screenshot or share someone’s feeling, and don’t try to work
> out who wrote it.
>
> **You never have to answer.** Letting a feeling float past is always fine.
>
> **If you write a perspective,** the person who released the feeling reads it when it comes home, and so does
> anyone who adds one after you. Nobody sees who wrote it. Our word check reads it first, and if it’s reported, a
> person on our safety team reads it.
>
> **It stays with their feeling.** Your words are cleared when the feeling is cleared, usually 30 days after it
> comes home. If they save it, your words stay until they delete it or you take yours back. You can take yours back
> in You & safety at any time.
>
> **Look after yourself.** If something you read worries you, you can report it. If you’re not okay, Get support now
> is always one tap away.
>
> ☐ I’ll keep what I read private, and I won’t try to find out who wrote it.
>
> [Let feelings find me] [Not now]

- The switch hint (all three places):
  > Catch other people’s feelings when you choose to look. Always voluntary. Feelings can be personal, so please keep
  > what you read private.

**Why:** the catcher's commitment is a terms and community-guidelines matter. It supports the authors' reasonable
expectation of privacy (the statutory tort, PRV-20) and the terms' ban on copying or identifying (PRV-09). It is
informed and voluntary, and it is separate from the catcher's own words (4.6) and from share pictures (4.8).

<!-- [classification: recommended practice] The tick is a commitment, not privacy consent. Record it with a time (for
example catching_agreed_at): today "catching" has no timestamp (schema.sql:61). Code change for the developer; not
made here.
Retention facts behind "It stays with their feeling": a perspective is cleared with its journey at the 30-day clearing
of unsaved returned or released journeys, including perspectives the author kept after letting the feeling go
(api.sql:169-177); a saved journey keeps them with no time limit until the author deletes it or the writer takes
theirs back (app-facts P10, P11 [GAP]). "Their feeling's words are cleared" was wrong after a let-go, when the
feeling's own words go at once but kept perspectives stay up to 30 days. -->


### 4.6 Writing a perspective (`ui/relay/catch.js`)

**Collected:** the catcher's own words, which may include sensitive information about themselves ("I went through
something like this too").

**Now (000c0cd)** (`ui/relay/catch.js:295`, button at `:255`):
> No diagnosis, judgement or orders. The person who released it will read your words, and so will anyone who adds a
> perspective after you; nobody sees who wrote it, and nobody can contact anyone.

The button reads "Add my perspective".

**Proposed** (same place, just above the button):
> No diagnosis, judgement or orders. The person who released it will read your words when it comes home, and so will
> anyone who adds a perspective after you. Nobody sees who wrote it, and nobody can contact anyone. Our word check
> reads it first, and if it’s reported, a person on our safety team reads it. Please leave out anything that could
> identify you.

Keep the button "Add my perspective". Pressing it, right after this statement, is the express act.

**Why:** APP 5.2(d), (f); express consent through a clear affirmative act straight after an informed statement.

<!-- [classification: needs legal advice] Whether "Add my perspective" right after this statement is express consent
for any sensitive information in a perspective, or whether a separate tick is needed (PRV-04: "a catcher's pre-send
statement or tick"). The statement is the lighter option; a tick is the safer one. -->

### 4.7 The Mallow line (`ui/relay/release.js`, `ui/relay/journeys.js`, `ui/relay/returned.js`, `ui/relay/parts.js`)

The Mallow line is put together by rules from a **fixed library written in advance**: an opener in the Mallow's
voice joined to one perspective line, and some openers fill in a feeling word taken from the label, chosen or inferred
from the words (vendored `perspectives.js:569-597`). The pieces are picked by analysing the author's words. **AI is
off.** Today's wording calls it "automatically generated" and says Hushmates "writes it", which isn't
accurate.

**Now (000c0cd):**
- Release switch: "Let a Mallow offer another perspective if nobody responds." Hint: "Your Mallow can offer an
  automatically generated perspective if no one catches your feeling." (`ui/relay/release.js:108-113`)
- Release note: "If you turn this on and nobody catches it within 30 minutes, Hushmates writes a perspective for you
  automatically. It isn’t a person, and your words stay with Hushmates." + "How this works" (`:116-118`)
- While travelling: "Nobody’s caught it yet. Want me to offer another way to see it?" / "Ask {Mallow}" / "Automatically
  generated · not written by a person" (`ui/relay/journeys.js:157-160`; also `:173`)
- "Send it out again" switch hint: "If no one catches your feeling, your Mallow offers an automatically generated
  perspective. Hushmates writes it, not a person, and your words stay with Hushmates." (`ui/relay/returned.js:316-323`)
- "Explore another angle": "{Mallow} will offer one automatically generated perspective. It isn’t written by a
  person, and it isn’t counted as one." If the author hadn't opted in: "Hushmates writes it automatically from your
  words, on its own servers. The perspective is kept with this journey and deleted with it." "How this works": "Your
  Mallow’s perspective is written automatically by Hushmates from your words, once. It isn’t written by a person,
  it’s always labelled “Automatically generated”, and it never counts as one of the five. Nobody else sees it unless
  you choose to share it." (`ui/relay/returned.js:345-351`)
- Report sheet: "Mallow perspectives are automatically generated and can get things wrong. If this one was unhelpful
  or hurtful, report it and it disappears straight away." (`ui/relay/returned.js:256`; similar at
  `ui/relay/journeys.js:285`)
- The stored label: "A Mallow perspective · Automatically generated" (`core/relay-config.js:47-48`;
  `supabase/migrations/20261014090100_hushmates_rules.sql:236`; share pictures `ui/relay/share-render.js:27`)
- Your data: "Automatically generated, only because you allowed it" (`ui/relay/your-data.js:59`)

**In progress (working tree):** the privacy sheet's Mallow section now says "Hushmates chooses it automatically from
its own library of perspectives the team wrote" but still says "always labelled “Automatically generated”". The other
lines above are unchanged so far.

**Proposed:**

| Place | Proposed wording |
|---|---|
| Release switch label | Let my Mallow offer a line if nobody catches it |
| Release switch hint | Off unless you choose. |
| Release note | If nobody catches your feeling within 30 minutes, your Mallow puts together a short line for you from pieces written in advance, chosen to fit your words. It isn’t a person, and it isn’t AI. Your words stay with Hushmates. **How this works** |
| While travelling, the Mallow's offer | Nobody’s caught it yet. Want me to pick a line for you? |
| While travelling, the note under "Ask {Mallow}" | From the Mallow library · not a person |
| "Send it out again" switch hint | If no one catches it this time, your Mallow puts together a short line for you from pieces written in advance. It isn’t a person and it isn’t AI, and your words stay with Hushmates. |
| "Explore another angle" | {Mallow} will put together a short line for you from pieces written in advance. It isn’t a person, and it isn’t counted as one. |
| "Explore another angle", if not opted in | To choose it, Hushmates reads your words on its own servers. The line is kept with this journey and deleted with it. |
| "How this works" (both places) | Your Mallow’s line is put together once, automatically, from pieces written in advance: an opening in your Mallow’s voice and one perspective, sometimes with a word for your feeling filled in. The pieces are picked by rules that look at the words of your feeling. It isn’t written for you by a person, and it isn’t AI. It’s always labelled, it never counts as one of the five, and nobody else sees it unless you put it in a share picture. We keep a note of which perspective it used. |
| Report sheet intro | Mallow lines are chosen automatically and can miss the mark. If this one was unhelpful or hurtful, report it and it disappears straight away. |
| Stored and shown label | A Mallow perspective · From the Mallow library |
| Your data | From the Mallow library, only because you allowed it |

**Withdrawing:** today a person can switch it off for the next trip ("Send it out again"), or stop it by bringing the
feeling home early or letting it go. While a feeling travels there's no switch to take the yes back
(`rules.sql:538-541` only changes it on a resend). **[GAP]** Proposed: in the journey's detail, a switch with the
release label ("Let my Mallow offer a line if nobody catches it"), working both ways.

**Why:** informed (accurate description: fixed library, chosen to fit the words, not AI); specific and unbundled (its
own switch, off by default); revocable (the proposed switch). The label change also matters for misleading-conduct risk
(SCW-07) and keeps clear of therapy wording (TGA-5, TGA-10).

<!--
[classification: recommended practice] PRV-22 as corrected by the critic: replace "automatically generated" and
"writes it automatically from your words" with "a line chosen automatically from a fixed set written in advance",
adding "picked to fit your words" because selection analyses the words (vendored perspectives.js: THEMES,
matchScenarios, detectPatterns). Never call the lines AI or generated while AI is off (schema.sql:39).
"We keep a note of which perspective it used": mallow_perspectives.angle_id (for example hm-loss-1) records the
perspective part only, not the opener; it is stored in plain text and shows the matched theme, with no end date today
(app-facts P12, [GAP]).
"Picks one line" was replaced: what is shown is `${openerFor(...)} ${c.text}` (vendored perspectives.js:597), an opener
in the Mallow's voice plus a perspective, with an optional {adj} slot ("It makes sense to feel {adj} about this.").
"Written in advance", not "the Hushmates team wrote": the owner must confirm how the lines were authored and
reviewed first (TERMS_OF_USE.md §2 comment); the app at f8d7e4a says "written in advance" too.
Developer note: changing the label touches core/relay-config.js:46-48, rules.sql:236 (a new migration), the share
renderer's check (ui/relay/share-render.js:27 and :37, which today accepts a Mallow label only if it matches
/automatically generated/), and the tests that pin these strings.
-->

### 4.8 Share pictures and videos (`ui/relay/catch.js`, `ui/relay/you.js`, `ui/relay/share.js`)

A share picture or video is made on the author's own device. Nothing is uploaded. A human perspective can appear only
if its writer said yes.

**Now (000c0cd), the catcher's side:**
- Tick: **"They may include my words in a share picture or video"**. Hint: "Off unless you choose. It never shows who
  you are. A picture they’ve made can’t be taken back." (`ui/relay/catch.js:280-285`)
- You & safety, per perspective: "May appear in their share picture or video". Note: "Only you can see these. You
  decide whether the person whose feeling you caught may include your words in a share picture or video; they never
  learn who you are. A picture or video already made stays with them: it can’t be taken back." (`ui/relay/you.js:90,
  94-97`)
- "Take it back": "Your words are removed for good, including from the collection of the person whose feeling you
  caught. A share picture or video they already made can’t be taken back. They aren’t told who you are."
  (`ui/relay/you.js:101`)

**Now (000c0cd), the author's side** (`ui/relay/share.js:107-109, 245-250`):
- "Private until you choose." "Nothing is posted from here. You choose what your story shows, and nothing in it is
  made up."
- "Include my own words": "Off unless you choose. Leave out anything that could identify you or anyone else."
  "Show the feeling’s name". Both start off.
- "Made on this device. You decide if and where to post it."

**Proposed, the catcher's side:**
- Tick label:
  > They may show my words in a picture or video they make
- Tick hint:
  > Off unless you choose. Your name is never on it. Once they’ve made one, it’s theirs to keep or post, and it
  > can’t be taken back, even if you change your mind.
- You & safety note:
  > Only you can see these. You decide whether the person whose feeling you caught may show your words in a picture
  > or video they make. They never learn who you are. Changing your mind stops new ones; one already made stays with
  > them.
- "Take it back": keep as it is.

**Proposed, the author's side** (add one line under "Nothing is posted from here…"):
> Pictures and videos are made on this device. Hushmates doesn’t upload them or keep anything about them. Only
> perspectives whose writers said yes can appear. Once you post one, it’s out of our hands.

**Why:** specific (per perspective), express (unticked box), unbundled (separate from writing), informed about the one
thing that can't be undone, and revocable for every future picture.

<!-- [classification: depends on functionality or business circumstances] The share picture is a use by the author on
their own device, not a disclosure by Hushmallow, while nothing is uploaded (PRV-09, researcher's reading, not
verified). Facts: share.js asks the server for the journey as it is now, so withdrawn words are never drawn (app-facts
P24); Mallow lines are always allowed in the author's share (share.js:43). -->

### 4.9 Reports and blocks (`ui/relay/common.js`, `ui/relay/catch.js`, `ui/relay/returned.js`)

**Collected:** the reporter's account link, the reason, the time, and a locked copy of the reported words.

**Now (000c0cd):** the report sheet's note: "Reports go to a person on the safety team. Nobody is told who reported."
(`ui/relay/common.js:102`)

**In progress (working tree):** "A person on our safety team reads reports, but not straight away and not around the
clock. They can’t see who anyone is, and they can’t contact anyone. Nobody is told who reported. If someone is in
danger right now, call 000."

**Proposed:** adopt the in-progress note, and add one sentence at the end:
> We keep a record that you made this report, so reports can’t be misused. The person is never told it was you, and
> our safety team doesn’t see who you are.

Blocking: keep the current wording ("Neither of you is told who the other is."). Check one claim: "your perspectives
won’t reach them" (`ui/relay/catch.js:472`) is true for new perspectives only. Proposed:
> Feelings from this person won’t find you again, and new perspectives from you won’t reach them. Neither of you is
> told who the other is.

<!-- [classification: depends on functionality or business circumstances] APP 5.2(d): the reporter's own information.
Facts: reports.by_member kept; the desk never sees it (rules.sql:1087-1097); blocks kept with no end date (app-facts
P14, [GAP]). The block correction follows app-facts §3 "[Check]". -->

### 4.10 The privacy sheet, "Your privacy in Hushmates" (`ui/relay/parts.js:181-187`)

This is Layer 2, one tap from sign-in, joining, welcome, Release and You.

**Now (000c0cd):** seven sections ("Who sees your words", "If you catch a feeling", "Not perfectly anonymous", "If you
allow a Mallow perspective", "Your account", "Your choices", "Safety"), quoted in app-facts §4. Two lines aren't
accurate:
- "Your words are stored encrypted, and only Hushmates’ servers can unlock them to show them to the people they’re
  meant for." (`:185`) The key holders can unlock them too.
- "Hushmates writes it automatically from its own library…" and "always labelled “Automatically generated”" (`:184`).

It also lacks who we are, where things are kept, how long, the sensitive-information point and a link to the policy.

**In progress (working tree):** the Mallow and Safety sections have new wording (see 4.7 and 4.9).

**Proposed: the whole sheet**

> **Your privacy in Hushmates**
>
> **Who we are.** Hushmates is part of Hushmallow, run by [business name]. Questions or worries about privacy:
> [privacy contact email]. We reply within 5 business days.
>
> **Who reads your feeling.** When you tick to share, your feeling is offered to people who turned on “Let feelings
> find me”, one at a time. Up to five can offer a perspective, and some will read it and let it float past. It comes
> home after five perspectives, or within a day. Nobody sees your name or your email.
>
> **Your words are sensitive.** What you write may say something about your health or how you’re feeling in
> yourself. So you choose, feeling by feeling, and we use your words only to carry your feeling, keep Hushmates safe, and show
> you your data. We’ll ask you first before using them for anything else.
>
> **The word check.** Before anyone sees them, rules check your words for some signs that someone might not be safe,
> and for contact or identifying details. If your words describe something that needs more than a new way of seeing
> it, like not feeling safe, abuse, violence, threats, harassment or being treated unfairly, Hushmates won’t send
> your feeling. It shows you support lines instead, and your words aren’t saved. The rules read English only and can
> miss things.
>
> **If you catch a feeling.** The person who released it reads your perspective when it comes home, and so does
> anyone who adds one after you. Nobody sees who wrote it. You choose whether it may appear in their share picture or
> video, and you can change your mind in You & safety. Your words stay with their feeling. They’re cleared when the
> feeling is cleared, usually 30 days after it comes home. If they save it, your words stay until they delete it or
> you take yours back.
>
> **Pseudonymous: your name stays with you.** Other people never see your name, but we hold your email and know
> which account wrote what. Words can give people away, so leave out names, places, workplaces and anything that
> could identify you or someone else. Hushmates checks for some of these and will ask you to remove them.
>
> **If you allow a Mallow line.** If nobody has caught your feeling after 30 minutes, your Mallow puts together a
> short line for you, even if the app is closed. It’s made from pieces written in advance: an opening in your Mallow’s
> voice and one perspective, chosen by rules that look at your words. It isn’t a person and it isn’t AI, and your
> words aren’t sent anywhere else for this. It’s always labelled, and it never counts as one of the five. We keep a
> note of which perspective it used.
>
> **Your account and your words.** You sign in with your email and a code. We use your email to sign you in, to
> reply when you write to us, and to tell you something important if we ever must. Nobody else in Hushmates sees it.
> Your words are locked (encrypted) before they’re stored. Our server unlocks them to show them to the people they’re
> meant for. The keys are kept in our server’s secret settings and by Hushmallow’s owner, in a password manager and
> on the owner’s own computer. Anyone who holds them can unlock every stored word. We use them only to run Hushmates,
> to restore or test a backup, or when the law requires it.
>
> **Where it’s kept.** Your words and your account are kept in Australia, in Sydney. Your email address and sign-in
> code are sent by [email provider], in [country].
>
> **How long.** A feeling travels for up to a day. Once it’s home, its words and the perspectives on it are cleared
> after 30 days, unless you save it. Words held back by the word check are never stored. Reported words are cleared
> 90 days after the report is decided, or 180 days after it was made if it’s never decided.
>
> **Your choices.** You can bring a feeling home early, delete a journey, see and download your data, or delete all
> your Hushmates data at any time in You & safety. Deleting everything also deletes your sign-in. For anything else,
> write to us.
>
> **Safety.** Reported words are read by people on our small safety team, not around the clock. The team reads words
> only when they’ve been reported, or paused for safety, and it can’t see who anyone is or contact anyone. Hushmates isn’t an emergency
> service: if you might not be safe, call 000, or a crisis line such as Lifeline on 13 11 14, any time.
>
> **Read the full privacy policy**

<!--
[classification: depends on functionality or business circumstances] Each statement must match PRIVACY_POLICY.md and
the code. Placeholders depend on D5 (email provider) and the business details. "Kept in Australia" also depends on the
Edge Function running in Sydney ([NOT CONFIRMED]; no region pinned). "Uses them only to ..." needs an internal key
rule (recommended practice). "Reported words are cleared 90 days after the report is decided, or 180 days ..."
(evidenceDaysAfterResolution 90; openEvidenceDays 180: api.sql:178-184), matching PRIVACY_POLICY.md, TERMS_OF_USE.md §6
and MODERATION.md §12. "We reply within 5 business days" only if someone is named to watch the inbox.
"The team reads words only when they've been reported, or paused for safety": the same sentence as PRIVACY_POLICY.md
("Pseudonymous: what that means here") and the app's privacy sheet (ui/relay/parts.js:186); the desk has no method to
read anything not reported (app-facts §9). A system hold is possible in principle, but unreachable with AI off.
The key holders match PRIVACY_POLICY.md "How we keep it safe" (Edge Function secrets; the owner's password manager and
.data/staging.env; server/admin.mjs:90-93). "On the owner's own computer" needs disk encryption confirmed.
The catcher's retention sentence matches 4.5 and PRIVACY_POLICY.md (api.sql:169-177; app-facts P11).
-->

### 4.11 Your data (`ui/relay/your-data.js`, `core/export-format.js`)

**Now (000c0cd):** "You agreed to share {your feeling / each of your n feelings} anonymously{, and to a Mallow
perspective on …}. The dates are in your file." (`ui/relay/your-data.js:62`); the Mallow row "Automatically generated,
only because you allowed it" (`:59`); the export key `agreedToShareAnonymouslyAt` (`core/export-format.js:44`).

**In progress (working tree):** the summary now says "without your name". The export key is unchanged.

**Proposed:**
- Summary: adopt "without your name".
- Mallow row: "From the Mallow library, only because you allowed it".
- Export key: rename to `agreedToShareWithoutYourNameAt` in a new format version (`hushmates-personal-data` v2),
  keeping the old key for one version if anything reads it. This is a format change, so its tests and
  `docs/ACCESS.md` change too.
- Add to the export: the 18+ confirmation time (today it's left out: app-facts P5, **[GAP]**), and, once recorded,
  the catching agreement time and the notice version.

**Why:** the record of each consent should say what was agreed in accurate words, and the person should be able to
see every consent we hold (APP 12, and "current" consent).

---

## 5. What a person must agree to before their words reach anyone

Before a feeling reaches another member, the person has:

1. **Signed in** with an email code, having been told who we are, why we need the email, and where the code is sent
   (4.1).
2. **Joined** with an invitation, chosen a name, confirmed they're 18 or over, and agreed to the terms, separately
   from any privacy choice (4.2).
3. **Read "Before your first feeling travels"** once (4.4), which tells them: who reads it; that it may be sensitive
   and is their choice; the word check; the safety team; that we know which account wrote it; encryption and where
   it's kept; how long; and who we are.
4. **Ticked "Share this with Hushmates participants, without my name"** for this feeling (4.4). The server refuses
   the feeling without it and records when it was given. This already works today.
5. Optionally, **allowed a Mallow line** for this feeling, as a separate switch that starts off (4.7).

Nothing else is bundled into the tick. Safety screening and the safety team's review of reported words aren't
separate choices: they're part of how the service works, and the person is told about them before the tick.

<!-- [classification: depends on functionality or business circumstances] PRV-04(3)(ii): screening and desk review as
conditions of the service are acceptable if disclosed as part of the primary purpose. -->

## 6. Withdrawing consent

| What you said yes to | How to take it back | What happens | What can't be undone |
|---|---|---|---|
| Sharing a feeling | Bring it home early, let it go, or delete the journey (Journeys); or delete everything (You & safety) | It stops being offered at once. Let go: its words are cleared at once. Delete: every word on it is cleared at once. | People who already read it can't un-read it. If you let it go, perspectives you kept stay with you for 30 days after it came home, or for as long as you like if you saved it first. |
| A Mallow line | Switch it off on "Send it out again"; or bring the feeling home early or let it go. **[Proposed]** a switch while it travels | No line is prepared for that trip | A line already shown stays with the journey until you let it go or delete it (or report it) |
| Letting feelings find you | Switch "Let feelings find me" off (Catch or You & safety) | You're not offered feelings any more | Perspectives you already gave stay with those feelings until you take them back |
| A perspective you wrote | "Take it back" (You & safety) | Your words are removed for good, including from the author's collection | They may already have read it |
| Your words in share pictures | Switch it off per perspective (You & safety), or take the perspective back | New pictures and videos can't include it | Pictures or videos already made stay with the person who made them. You're told this before you say yes. |
| Gentle notices | Switch off (You & safety) | No more in-app notes | Nothing |
| Everything | "Delete my Hushmates data" (You & safety) | Your words everywhere, your sign-in and your email are deleted at once, and you're signed out | See "What deleting can't reach" in the privacy policy |
| Anything, by asking | Write to [privacy contact email] | We'll do it, or explain what we can't, within 30 days | As above |

<!-- [classification: recommended practice] Withdrawal (from memory: OAIC Chapter B says a person can withdraw consent
at any time and it should be easy; not seen in an extract). Facts: app-facts §3 and §5. [GAP] No operator tool exists
to delete a member's data on their behalf (server/admin.mjs), so "by asking" relies on manual work until one exists. -->

## 7. Records of consent

**Recorded today:** `journeys.consent_at` and `fallback_consent_at` (per feeling), `perspectives.share_consent_at`,
`members.adult_confirmed_at`. All are set by the server, not the browser.

**Not recorded today:** when catching was turned on (or the catcher's agreement), and which version of the wording
the person saw.

**Recommended (code changes for the developer; not made here):**
1. Record the notice version with each consent time.
2. Record the catcher's agreement with a time.
3. Keep each consent record while the content it covers exists, and delete it with that content. **[GAP]** Today the
   journey row, with its consent times, stays after the words are cleared and after the account is deleted
   (app-facts P8).
4. Show every consent in "Your data" and the download, including the 18+ time.
5. Optionally, a share tick on "Send it out again" that refreshes `consent_at`, so each trip has its own consent time.
   Today a resend relies on the first trip's consent (`rules.sql:515-545`), and the privacy policy says so.

## 8. If AI is ever switched on

None of the consents above covers sending words to an AI service. AI is off, and decision D10 keeps it off. If it's
ever proposed:

- It needs **its own switch,** off by default, separate from the library Mallow line.
- The switch must say **where the words are processed** (the country: APP 5.2(i)-(j), if Hushmallow is an APP entity)
  and, as recommended practice, **name the provider**, before the first use. APP 8.1's reasonable steps (usually a
  contract with the provider) must be in place first.
  <!-- [classification: depends on Hushmallow's functionality or business circumstances] The country: APP 5.2(i)-(j)
  (PRV-08, PRV-11), and APP 8.1 reasonable steps, bind only if Hushmallow is an APP entity (PRV-02). [classification:
  recommended practice] Naming the provider in the switch: neither APP 5.2 nor APP 8.1, as researched, requires it; it
  is good practice for informed consent (PRV-04). -->
- The privacy policy, the privacy sheet and the labels change first. An AI line must be labelled differently from a
  library line.
- TGA status must be re-checked first (TGA-11).

Draft for later (do not use while AI is off):
> Let my Mallow write a new line with AI. Your words, without your name, are sent to [provider], in [country], to
> write it. Off unless you choose.

## 9. Changes for the developer (summary; no code was changed)

| File | Change |
|---|---|
| `ui/relay/sign-in.js` | New hint and notice line; a "Privacy policy" link |
| `ui/relay/invite.js` | Name hint; 18+ hint; terms line |
| `ui/relay/welcome.js` | First and third promises; "Before you catch" before saving catching |
| `ui/relay/release.js` | Tick label, hint and resting line; "Before your first feeling travels"; Mallow switch, hint and note |
| `ui/relay/catch.js` | Pre-send statement; share tick label and hint; "Before you catch"; block wording |
| `ui/relay/journeys.js` | Mallow offer and note; report intro; **[new]** the Mallow switch while travelling |
| `ui/relay/returned.js` | Resend hint; "Explore another angle" text and details; report intro |
| `ui/relay/you.js` | Catching hint; share note; "Before you catch"; a "Privacy policy" link |
| `ui/relay/share.js` | One added line |
| `ui/relay/common.js` | One added sentence in the report sheet |
| `ui/relay/parts.js` | The whole privacy sheet |
| `ui/relay/your-data.js` | Mallow row |
| `core/relay-config.js`, `supabase/migrations/…_rules.sql` (new migration), `ui/relay/share-render.js` | The Mallow label and the renderer's check |
| `core/export-format.js`, `docs/ACCESS.md` | Export key and new fields (format v2) |
| Schema (new migration) | Notice version; catching agreement time; a way to change the Mallow choice while travelling |
| Tests | Every test that pins these strings (for example `tests/audit-fixes.test.mjs`) |

The vendored copies under `supabase/functions/_shared/vendor/` must follow any change to `core/`
(`tools/sync-edge.mjs --check`).

## 10. Questions for the lawyer

1. Is Hushmallow an APP entity (s6D(4)(b))? This decides whether this design is required or recommended.
2. Is the one-time sheet plus a per-feeling tick valid express consent for health information under APP 3.3, and
   under the Victorian or NSW health privacy principles if they apply?
3. Is "Add my perspective" straight after a clear statement enough for sensitive information in a perspective, or is a
   tick needed?
4. Feelings that mention other people (PRV-05): is asking people to leave out identifying details, plus the word
   check and removal, a reasonable approach?
5. Is telling a catcher up front that a share picture can't be recalled enough, given that their later withdrawal
   can't reach it?
6. The identity to give in notices: the legal entity, and whether a sole trader must give more than a business name,
   ABN and email.
7. Whether the Mallow line selection, which analyses the author's words, is adequately described by "chosen to fit
   your words", for informed consent and for APP 1.7-1.9.

## 11. Sources

All seen **only as search-tool extracts** (usually paraphrased), or from memory where marked. None was opened
directly, because this environment cannot reach legislation.gov.au, oaic.gov.au, esafety.gov.au or tga.gov.au.

- Privacy Act 1988 (Cth): https://www.legislation.gov.au/C2004A03712/latest/text (not opened; series id from memory)
- OAIC, APP Guidelines Chapter B (consent): https://www.oaic.gov.au/privacy/australian-privacy-principles/australian-privacy-principles-guidelines/chapter-b-key-concepts
- OAIC, APP Guidelines Chapter 3: https://www.oaic.gov.au/privacy/australian-privacy-principles/australian-privacy-principles-guidelines/chapter-3-app-3-collection-of-solicited-personal-information
- OAIC, APP Guidelines Chapter 5 (earlier-run extract, not re-seen): https://www.oaic.gov.au/__data/assets/pdf_file/0019/1198/app-guidelines-chapter-5-v1.2.pdf
- OAIC, APP Guidelines Chapter 1: https://www.oaic.gov.au/privacy/australian-privacy-principles/australian-privacy-principles-guidelines/chapter-1-app-1-open-and-transparent-management-of-personal-information
- OAIC, APP Guidelines Chapter 6: https://www.oaic.gov.au/privacy/australian-privacy-principles/australian-privacy-principles-guidelines/chapter-6-app-6-use-or-disclosure-of-personal-information
- OAIC, APP Guidelines Chapter 8 (earlier-run extract, not re-seen): https://www.oaic.gov.au/__data/assets/pdf_file/0036/256959/APP-Guidelines-Chapter-8-Cross-border-disclosure-of-personal-information-October-2025-v1.3.PDF
- OAIC, Guide to health privacy: https://www.oaic.gov.au/privacy/privacy-guidance-for-organisations-and-government-agencies/health-service-providers/guide-to-health-privacy/introduction-and-key-concepts
- eSafety, social media minimum age regulatory guidance: https://www.esafety.gov.au/sites/default/files/2025-09/eSafety-SMMA-Regulatory-Guidance.pdf

The research items cited (PRV-, U16-, SCW-, TGA-, SM-) are in the team's research file. Where its final "corrections"
entry changed an item (PRV-19, PRV-22, TGA-5, SCW-07), this document follows the correction.
