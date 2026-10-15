**DRAFT, not yet reviewed or approved. Not legal advice.**
**Date: 15 October 2026.**

# Hushmates · Age eligibility (18+) and the under-16 law

> **Status (internal).** Nothing here is final until the owner approves it. Every part marked **needs legal advice**
> must be answered by an Australian lawyer before a public launch (G4), and before outside testers (G3) if the lawyer
> says so (decision D9, risk L1 in `docs/RISKS.md`). Hushmates is not live: there are no members outside the team.
>
> **What this is.** Why Hushmates is for adults only; how the social media minimum age law (Online Safety Act 2021,
> Part 4A) might apply, test by test, applied to the features Hushmates actually has; what "reasonable steps" would
> look like if it does apply; where the Children's Online Privacy Code stands; and what the team does if a member
> says, or seems, to be under 18. **It does not say the under-16 law applies, and it does not say it doesn't.** It
> sets out the tests, how the facts sit against them, and what a lawyer has to decide.
>
> **How to read it.** The analysis is internal and written plainly. The words members would see are in quoted boxes,
> in Hushmallow's voice. Facts about the app were checked in the code at commit `48c7e26` (15 October 2026, which
> includes the Tier 0 changes); paths are relative to `hushmallow/hushmates-lab/`. The research behind it is items
> U16-01 to U16-13 of the legal research, with the critic's corrections to U16-02 and U16-05 applied.
>
> **Sources.** No official site could be opened from this environment. Every legal source below was seen only as a
> **search extract** of the official page, sometimes paraphrased by the search tool, and is labelled that way. Some
> provisions were not seen at all and are marked **[not seen]** or **[from memory]**. Check each one against
> legislation.gov.au, esafety.gov.au and oaic.gov.au before relying on it (decision D20 would let the developer do
> that).

**Classifications** (the same four used across `docs/legal/`, plus one):

- **verified obligation**: the law was seen and binds Hushmallow on the known facts;
- **depends on Hushmallow's functionality or business circumstances**: binding only if a named fact is true;
- **needs legal advice**: a judgement, or a text nobody here has seen;
- **recommended practice**: guidance or good practice, not a legal duty;
- **not applicable on the facts (test checked)**: the test was applied and the facts don't meet it.

---

## Contents

1. The rule: adults only, and why
2. The social media minimum age law
3. If Hushmates is in scope: what "reasonable steps" would look like
4. The Children's Online Privacy Code
5. If a member says, or seems, to be under 18
6. What every document says about age
7. Questions for the lawyer
8. Facts checked in the code
9. Sources

---

## 1. The rule: adults only, and why

### 1.1 The rule

- **Everyone on Hushmates must be 18 or over:** people who release feelings, people who catch them, and the people
  who read the safety desk.
- **How it is checked today:**
  - one self-declared tick, "I’m 18 or over", when an invitation is redeemed (`ui/relay/invite.js:51`);
  - the "Join Hushmates" button stays off until it is ticked, and the server refuses anything else with "Hushmates is
    for adults (18+) during the pilot." (`supabase/migrations/20261014090100_hushmates_rules.sql:1037`);
  - the time of the tick is stored (`members.adult_confirmed_at`, `supabase/migrations/20261014090000_hushmates_schema.sql:64`);
  - desk readers tick the same box when they accept a safety-team invitation (`staff/desk.js:123`);
  - invitations themselves are the other gate: only the owner and admins make them (`server/admin.mjs invite`).
- **What is not checked:** there is no date of birth, no ID, no age estimation, and nothing reads age from anyone's
  words. If someone can't truthfully tick the box, nothing is recorded, and nothing stops them ticking it next time.

**Classification: recommended practice.** 18+ is Hushmallow's own rule. No law found in the research requires a
service like this to be 18+. The under-16 law (section 2) is about under-16s only, and only if Hushmates is in its
scope. Don't describe the 18+ rule as a legal requirement.

### 1.2 Why 18+

1. **What people share.** Feelings are adult, everyday and sometimes heavy. Catchers can be shown hard things. The word
   check holds back some words that suggest someone might not be safe, but it can miss things: the Tier 0
   self-assessment found it misses many new ways of saying them (`docs/safety/TIER0_SELF_ASSESSMENT.md`). That is not a
   place to put children, as writers or as readers.
2. **What Hushmates is built for.** The support lines shown were chosen with adults in mind, and none is a youth
   service: Kids Helpline isn't among them (`core/feeling-safety.js:129-135`). The safety desk is a small team, not around the clock, that can't see who anyone
   is and can't contact anyone. It isn't set up or trained for child safeguarding.
3. **Strangers in a private channel.** Adults who don't know each other exchange words about their feelings, with no
   names. Mixing children into that creates a grooming risk (`docs/RISKS.md`, S9). Perspectives are screened for some
   grooming-style questions, but a rule can be got around.
4. **Consent.** Feelings can be health information. Sharing them needs informed consent from someone able to give it.
   The OAIC says capacity can be presumed for adults unless something alerts the organisation otherwise, such as signs
   the person is a child (APP Guidelines, Chapter B, search extract). An adults-only rule supports that presumption;
   a sign that a member is a child undermines it (research item PRV-04). **Classification: depends on Hushmallow's
   functionality or business circumstances** (whether Hushmallow is bound by the APPs, `LEGAL_REQUIREMENTS.md` PRV-02).
5. **Laws that turn on children.** The under-16 law (section 2), the Children's Online Privacy Code (section 4), the
   Phase 2 online safety codes on age-restricted material (`LEGAL_REQUIREMENTS.md` SCW-04), and the Basic Online Safety
   Expectations' best interests of the child expectation (not researched). **An 18+ rule doesn't take Hushmates
   outside any of them.** It keeps the service clearly adult, which matters to several of their tests.

### 1.3 What the rule is not

- It is **not age verification.** Never call members "verified adults", and never say Hushmates is "age-checked" or
  "safe for" anyone, unless that becomes true (U16-13, recommended practice; misleading claims are an Australian
  Consumer Law matter, `LEGAL_REQUIREMENTS.md` SCW-07).
- Accurate words today: "Hushmates is for adults (18+). You confirm your age when you join. We don't ask for ID."

---

## 2. The social media minimum age law

### 2.1 What it requires, in short

- Since **10 December 2025**, a provider of an **age-restricted social media platform** must take reasonable steps to
  prevent Australian children **under 16** from having accounts (Online Safety Act 2021, s63D) **[s63D's wording and
  penalty not seen; described in eSafety's guidance, search extract]**.
- It applies by operation of law. eSafety doesn't have to name a service first (U16-10). **No size or turnover
  threshold** appeared in anything seen. A small, free, invite-only beta is not exempt by being small; eSafety says it
  prioritises enforcement against systemic failure, but that is about enforcement, not about whether the duty applies.
- **Whether Hushmates is in scope is a three-part question.** All three must point "in":
  - **A. The base test** in s63C(1)(a) (section 2.2);
  - **B. The additional condition** in s4A of the Rules, added in 2026 (section 2.3);
  - **C. The exclusions** in s5 of the 2025 Rules (section 2.4).
- **Under-16 versus under-18.** The law is about under-16s. If Hushmates is in scope, it must take reasonable steps to
  keep under-16s off. Keeping 16- and 17-year-olds off is Hushmallow's own rule.

### 2.2 A. The base test (s63C(1)(a))

The text seen (official text, search extract): "(i) the sole purpose, or a significant purpose, of the service is to
enable online social interaction between 2 or more end-users; (ii) the service allows end-users to link to, or interact
with, some or all of the other end-users; (iii) the service allows end-users to post material on the service." Item (iv)
is any further condition in the rules (section 2.3). The Explanatory Memorandum describes the definition as
deliberately wide, meant to be narrowed by the Minister's rules (official extrinsic material, paraphrase).

| Element | Hushmates' facts | For "met" | Against | Leaning |
|---|---|---|---|---|
| An electronic service with accounts | A web app; sign-in with an email code | — | — | Met |
| (iii) End-users can post material | Feelings (3 to 500 characters, with an optional label) and perspectives (8 to 280 characters) are text shown to other members | Plain words | — | Met |
| (ii) End-users can link to, or interact with, other end-users | A catcher's perspective reaches the author; later catchers on the same feeling read earlier perspectives. Nobody can find, follow or contact anyone | "Or interact with" is an alternative to "link to": interaction is enough | There is no linking at all | Met on the plain words |
| (i) Sole or a significant purpose is online social interaction between 2 or more end-users | The product is people answering other people's feelings. Without other members there is nothing; the Mallow line is only a fallback the author must allow | Person-to-person exchange is the product. eSafety: a significant purpose is "important and meaningful rather than ... merely incidental or subsidiary", and a service unsure whether social interaction is a significant purpose "should presume it is" (official guidance, search extract, partly paraphrased) | No profiles, following, feed, direct messages, comment threads or relationships. Matching is random and one-shot. It could be seen as a pseudonymous exchange of support about feelings, not "social" interaction. s63C(2) ("online social interaction" includes sharing material for social purposes) **[not seen]** | **Leans met** (judgement) |

**Result for A: needs legal advice, leaning met.** The more the product reads as meeting people ("community",
"friends", "meet"), the clearer this gets. Describe Hushmates accurately, as a pseudonymous, one-time exchange of
perspectives, but don't misdescribe it to avoid the law (U16-01).

### 2.3 B. The 2026 additional condition (Rules s4A)

**The instrument.** The Online Safety (Age-Restricted Social Media Platforms) Amendment Rules 2026 (F2026L00370, dated
25 March 2026) inserted s4A, "Additional condition a service must satisfy to be an age-restricted social media
platform". **Only that heading was seen on legislation.gov.au.** The operative text and its definitions were not. Two
secondary sources (not the law) say s4A fills s63C(1)(a)(iv) and took effect on 26 March 2026.

**What it adds, as eSafety and the department describe it** (official guidance, search extracts): a service is in scope
only if it **also** has a **recommender feature**, or a **logged-in feature**, or both. A logged-in feature is an
endless feed, a feedback feature or a time-limited feature available while logged in. "A service is not required to have
all these features to satisfy this condition": one is enough.

Each limb, applied to what Hushmates actually does:

#### Recommender feature: matching from the oldest waiting

- **The definition, as eSafety describes it:** the service can "select and display material to end-users based on any
  information associated with their account, while they are using the service". The department puts it as "based on
  that end-user's information", and describes the target as "account-based recommender systems (algorithms)".
- **What Hushmates does** (`m_find_feeling`, `supabase/migrations/20261014090100_hushmates_rules.sql:562-610`):
  - only members who switched on "Let feelings find me" are offered anything, one feeling at a time;
  - the candidates are feelings that are travelling and not paused, from an active owner, with room for another
    perspective, **not the member's own, not shown to them before, and not from anyone either of them has blocked**;
  - of those, the **3 longest-waiting** (by last progress, then by when they were released; `fairnessPool 3`) are taken,
    and **one is picked at random**;
  - nothing uses interests, history of what someone liked, labels they prefer, location or profile. There is no
    ranking for engagement.
- **For "met":** on a literal reading, "own feeling", "already shown" and "blocked" are information associated with
  the account, and they shape what is displayed.
- **Against:** that is exclusion filtering for safety and fairness, not recommending. Almost every service filters out
  blocked people. If that counted, the limb would cover almost everything, and the narrowing the department and the
  Minister describe would mean nothing.
- **Leaning: not met** (judgement). Adding any interest-based or history-based matching would very likely meet it.

#### Endless feed

- There is no feed. A catcher asks, and is offered one feeling. **Not met.**

#### Feedback feature: the counts people see

- **The definition, as eSafety describes it** (paraphrase): the service displays to the end-user how many end-users have
  viewed or engaged with **their** account, or with material posted to it, for example like counts.
- **The count a catcher sees.** Before catching, a catcher sees "n of 5 human perspectives so far" for the feeling on
  offer (`ui/relay/catch.js:159`, from `offer_view`). That count is about **someone else's** feeling. On eSafety's
  description, which is about the end-user's own account or material, **it does not fit** (critic's correction to
  U16-02). Leave it out of the argument.
- **The count the author sees.** The author sees "3 of 5 human perspectives" on their own feeling, on the journeys
  screen and at homecoming (`ui/relay/journeys.js:25`, used at lines 48, 58, 114 and 132, and in `ui/relay/returned.js`).
  - **For:** it shows how many end-users engaged with material the author posted.
  - **Against:** it is private to the author, capped at five, not a like or popularity count, and there is no profile
    or account page "to which" material is posted. The app says "No scoreboards, no streaks. Nothing here counts how
    popular you are."
  - Removing the number wouldn't settle it: the perspectives themselves show the author how many people answered.
- **Leaning: arguable**, on the author's count only.

#### Time-limited feature: journeys that are visible only to participants, and only for a while

- **The definition, as eSafety describes it** (quoted): the service "enables end-users to view material that has been
  posted to the service but is only made available for a limited period. For example, where a service enables
  end-users to post 'Stories' or 'disappearing' messages."
- **What Hushmates does:**
  - a feeling is shown only to opted-in catchers it is offered to, one at a time; it is never public;
  - an offer lasts **3 minutes**; once caught, the catcher has **10 minutes** to write (`offerHoldMs 180000`,
    `catchHoldMs 600000`, `supabase/migrations/20261014090000_hushmates_schema.sql:31`);
  - after that the catcher never sees the feeling again: "Perspectives you’ve offered" shows only their own words
    (`m_my_gifts`, `supabase/migrations/20261014090100_hushmates_rules.sql:746-754`);
  - a feeling travels for at most **24 hours** a trip, with up to 2 more trips (`journeyTtlMs 86400000`,
    `maxResends 2`), then comes home to its author;
  - unless the author saves it, its words are cleared **30 days** after it comes home.
- **For "met":** on the plain words, material posted to the service is made available to the people who view it only
  for a limited period. A one-day journey looks a lot like a Story.
- **Against:** the Minister describes these features as "designed to create a sense of urgency and encourage constant
  checking". Hushmates' time limits are there for privacy, fairness and closure. Nobody is pushed to keep checking: the
  only notices are quiet in-app notes while the app is open, "never about other people’s activity"
  (`ui/relay/you.js:58`). The author keeps their own feeling. But eSafety describes the test by feature, not by intent.
- **Leaning: met** (judgement, on descriptions of a text nobody here has read).

#### "While logged in"

- Everything in Hushmates is behind sign-in, so any of these features is available while logged in.

**Result for B: needs legal advice.** If s4A says what eSafety and the department say it says, the 2026 narrowing very
likely **does not** take Hushmates out of scope. The deciding fact is the time-limited availability of feelings to
catchers, and it is hard to design out without changing the product. Dropping the author's count would remove the
weaker argument only. A lawyer must read the operative s4A text.

### 2.4 C. The exclusions (Online Safety (Age-Restricted Social Media Platforms) Rules 2025, s5)

**Only the Explanatory Statement and eSafety summaries were seen**, not the text of s5 itself.

| Exclusion | The test (as described) | Applied to Hushmates | Classification |
|---|---|---|---|
| **s5(1)(f): sole or primary purpose is supporting the health of end-users** | The Explanatory Statement: "intended to capture physical and mental health care services"; examples include journals and moderated peer forums (official extrinsic material, search extract, partly paraphrased). "Primary" means the predominant purpose, judged objectively from design, features, marketing and use | **For:** a moderated peer exchange about feelings, with a safety desk, support lines, a word check and a library of kind lines; close to the "moderated peer forum" and "journal" examples. **Against:** Hushmates is positioned as a playful, premium, comforting companion; it is explicitly non-clinical and makes no health claims; a feelings-sharing product may be judged predominantly social. Marketing copy, not yet written, will be strong evidence either way | **needs legal advice** |
| s5(1)(h): a significant purpose of communication between health-care providers and the people using their services | Significant purpose, not sole or primary | There are no health-care providers on Hushmates. Members write to members; the safety desk is a moderation team, not clinicians. Would change only with something like a "talk to a counsellor" feature | **not applicable on the facts (test checked)** |
| Messaging, online games, product information, professional networking or development, education, education-institution communication | Sole or primary purpose (or significant purpose, for institution communication) | No member-to-member messaging, no game (the Mallows are characters with fixed lines), no product information, networking or education purpose | **not applicable on the facts (test checked)** (critic's correction to U16-05). Whoever reads the Rules for (f) should confirm the wording in passing |

**The health exclusion pulls against other positions.** Relying on a health purpose:

- points towards Privacy Act "health service" status, which would remove the small business exemption, so the APPs and
  the data breach scheme would apply (`LEGAL_REQUIREMENTS.md` PRV-02);
- needs checking against the TGA question, although "supporting health" is not the same as diagnosis or treatment
  (`LEGAL_REQUIREMENTS.md` TGA-1 to TGA-5);
- would take Hushmallow outside the Children's Online Privacy Code, which excludes health service providers
  (section 4).

All the documents must adopt **one** description of Hushmates' purpose. **Don't claim the health exclusion anywhere
public until a lawyer confirms it.** If the business relies on it, write down why in the self-assessment (2.6).

### 2.5 Where this leaves Hushmates

- **A, the base test:** leans met. **B, s4A:** leans met, through time-limited availability. **C, the exclusions:** the
  health exclusion is the only realistic one, and it needs advice and cuts against the non-clinical positioning.
- So **Hushmates may well be an age-restricted social media platform.** That is a leaning on extracts, not a
  conclusion. It needs legal advice **before a public launch (G4)**, and before outside testers (G3) if the lawyer says
  so.
- **For a team-only beta (G2)** of people the owner knows are adults, the practical risk is low. The law seen has no
  beta exemption, so that is a judgement about risk, not about scope, and it is the owner's to make.
- **If the lawyer says it applies,** the tick alone is not enough, and section 3 must be in place before more people
  join. **If the lawyer says it doesn't,** section 3 becomes recommended practice and section 5 still applies.

### 2.6 A written self-assessment (recommended practice)

- **No requirement to lodge or publish one** was seen. A short, dated, internal record is still worth keeping (U16-10).
  It shows good faith, and it supports a "reasonable steps" case if Hushmates is in scope.
- **What it holds:** each s63C element, each s4A limb and each exclusion applied to the features (sections 2.2 to 2.4
  are a first draft of it), the legal advice once received, and the date.
- **Re-do it when** any of these is planned: personalised or interest-based matching; a feed; any count, like or
  reaction; feelings or perspectives that stay visible to others for longer; direct messages; profiles; public posting;
  a health or wellbeing framing in marketing.

---

## 3. If Hushmates is in scope: what "reasonable steps" would look like

**Classification: depends on Hushmallow's functionality or business circumstances** (whether Hushmates is in scope,
section 2). If a lawyer confirms it isn't, everything here becomes recommended practice.

### 3.1 What eSafety says (official guidance, search extracts)

- **Self-declaration alone is not enough.** eSafety "does not consider the use of self-declaration, on its own without
  supporting validation mechanisms, to be reasonable". A listed example of steps that are not reasonable is an approach
  that "relies entirely on self-declaration to determine the age of existing or prospective account holders".
- **Layers can help.** "Self-declaration-based age-gates or certain age inference measures may be useful ... when
  layered with other measures."
- **No set method.** "There is no mandate on which method of age assurance age-restricted social media platforms must
  use." What is reasonable depends on context.
- **Government ID can't be the only way.** Platforms "must not collect government-issued identification (including
  Digital ID), for age assurance purposes, unless a reasonable alternate method is also offered" (eSafety FAQ,
  describing s63DB; **s63DB itself not seen**).
- **Handling under-16 accounts.** eSafety expects platforms to:
  - "deactivate or remove those accounts with kindness, care and clear communication";
  - give "clear and supportive messaging, including about review mechanisms" before acting on an account;
  - provide "accessible review mechanisms for users who believe they've been wrongly flagged";
  - stop people raising their declared age to keep an account (paraphrase);
  - not keep personal information from individual age checks: "Record-keeping should focus on systems and processes,
    not user-level data";
  - not move accounts to other services without explicit consent (paraphrase).
- **Not seen:** whether the September 2025 guidance was revised after eSafety's March 2026 compliance update.

### 3.2 Today against that standard

| Today | Against eSafety's description |
|---|---|
| A self-declared "I’m 18 or over" tick | Self-declaration alone is the listed example of steps that are not reasonable |
| Invitation-only | A supporting layer, but not age validation |
| No age report reason, no age message, no review route, nothing against re-declaring | The handling expectations in 3.1 aren't met |
| No age-check data kept | Consistent with "don't keep personal information from age checks" |
| No ID collected | Nothing triggered under s63DB |

### 3.3 A proportionate, layered set

This list is the research's synthesis for a small invite-only service. **It is not eSafety's list**, and nothing in it
is mandated. A lawyer should confirm what is enough.

1. **A neutral age question instead of a tick.** Ask for a date of birth with no hint of the threshold. Work out
   "18 or over: yes or no", keep only that answer and the time, and discard the date. (Keeping a date of birth would be
   new personal information, with its own limits: item 8.)
2. **No immediate second try.** After an under-age answer, don't let the same person try again straight away with a
   different date. Keep only a minimal flag, only for as long as the check needs it.
3. **The inviter confirms.** Whoever sends an invitation confirms the person is an adult they know, and the owner
   keeps a simple log of who was invited and when (no more than that). Today invitations carry an optional free-text
   note (`server/admin.mjs`); don't put names or emails in it.
4. **A report reason: "This person may be under 18".** It goes to the desk as an age concern (section 5).
5. **Signals in words, only if advice says it's needed.** A rule could pass phrases like "I'm 15" or "year 9" to the
   desk. This adds reading of people's words for a new purpose, so it needs a privacy check, and it will be inaccurate
   both ways. Recommended only if the lawyer says the layers above aren't enough.
6. **Age estimation by a third party, only if advice says it's needed,** always with a non-ID alternative, never ID
   alone (s63DB, as eSafety describes it). This would be a new processor, probably overseas, and a cost: it needs the
   owner's approval and its own privacy notice.
7. **A written process for under-16 accounts**, with kind notice, a review route and deletion: section 5 is the draft.
8. **Age-check information used only for checking age, and destroyed afterwards.** Part 4A restricts using and
   disclosing information collected for the minimum age obligation and requires its destruction (s63F), and the OAIC
   has published privacy guidance on Part 4A. **Neither s63F nor the OAIC guidance was seen** (only the guidance's
   title). **Needs legal advice** before any age-check information is designed or stored (U16-09). From memory, and
   unverified: s63F may apply whether or not Hushmallow is otherwise bound by the APPs.

**If these are adopted,** the terms and the privacy policy must describe the actual method, what is collected, what it
is used for and when it is destroyed. The app must not let someone change an under-age answer and carry straight on
(U16-06).

---

## 4. The Children's Online Privacy Code

**Classification: depends on Hushmallow's functionality or business circumstances** (whether the Code is in force,
whether Hushmallow is an APP entity, whether it provides a health service, and whether Hushmates is likely to be
accessed by children).

### 4.1 Where it stands (OAIC, updated August 2026; official guidance, search extract, paraphrased)

- The OAIC must register the Code by **10 December 2026**. As of its August 2026 update there was **no registered Code
  and no commencement date.** Consultation on the exposure draft ran from 31 March to 5 June 2026.
- **Scope, as the OAIC describes it:** APP entities that provide a social media service, a relevant electronic service
  or a designated internet service that is **likely to be accessed by children**, or is primarily concerned with
  children's activities. **Entities providing a health service are excluded.**
- The OAIC says the Code is separate from the under-16 social media restrictions and covers a much wider range of
  services.
- "Child" means under 18 **[from memory, not seen]**. Industry submissions hosted by the OAIC (not the OAIC's view) say
  the "likely to be accessed by children" threshold is unclear.

### 4.2 How it would apply

| Question | Hushmates | Result |
|---|---|---|
| 1. Is the Code registered and in force? | Not as of August 2026 | No obligation today |
| 2. Is Hushmallow an APP entity? | Turnover is far below A$3m, so it is exempt unless an exception applies (`LEGAL_REQUIREMENTS.md` PRV-01, PRV-02). The main exception argued is health service, and health service providers are excluded from the Code | Usually the Code would not reach Hushmates. It could if Hushmallow opted in to the APPs (s6EA) or became an APP entity another way, without being a health service provider |
| 3. A social media, relevant electronic or designated internet service? | Likely one of them (`LEGAL_REQUIREMENTS.md` SCW-01) | Likely yes |
| 4. Likely to be accessed by children? | 18+, invitation-only, nothing designed for children. A tick-only gate weakens the argument | Arguably not, but not settled |
| 5. Not providing a health service? | The same open question as PRV-02 | Depends on advice |

**What to do now:** nothing is required. **Re-check after 10 December 2026**, once the final text and commencement are
known. Don't claim compliance with the Code, or exemption from it, anywhere until then (U16-11).

---

## 5. If a member says, or seems, to be under 18

**Classification: recommended practice.** No statutory process for under-18s on an out-of-scope service was found. If
Hushmates is in scope of the under-16 law, this process is also how eSafety expects reasonable steps to be carried out
for under-16s (section 3), and it becomes **depends on Hushmallow's functionality or business circumstances**. It
matches `MODERATION.md` §7.2; if the two ever differ, change both.

### 5.1 The principles

- **Danger comes first, always.** If the words suggest someone might not be safe, follow the urgent path
  (`MODERATION.md` §6, `docs/ESCALATION.md` §3). The age question waits.
- **Kindness.** A young person who found their way in hasn't done anything terrible. Nobody is told off.
- **No proof is asked for.** Never ask for ID, a photo, a date-of-birth document, a school, or anything else that
  would prove age.
- **As little as possible is kept.** Record the decision, not the evidence.
- **Honest limits.** The desk can't see who anyone is and can't contact anyone. Nothing said to the member may suggest
  that someone will contact them, or that anyone is watching.

### 5.2 How the team might find out, today

- A catcher reports a feeling, or an author reports a perspective, because the words say or suggest the writer is
  under 18. There is no age reason yet, so it would come in as "Something else" **[GAP]**.
- A desk reader notices it while reading a report about something else.
- Someone writes to Hushmallow. There is no contact address yet **[GAP: decision D23]**.
- **Nothing reads age from words automatically, and nobody browses feelings.** The desk sees only what is reported.

### 5.3 The steps

| # | Who | What | What it does, in the app today |
|---|---|---|---|
| 1 | Desk reader | **Danger first.** If the words suggest danger, follow `MODERATION.md` §6 and come back to age afterwards | — |
| 2 | Desk reader | **Restrict the account** with "Restrict the person who wrote it" on the report. If the reported item is a perspective that shouldn't stay, also "Remove the perspective" | They can no longer release or catch feelings, ask their Mallow, or write. Catching is switched off, and live offers end, on their feelings and their own. Feelings already travelling stop being offered and still come home to them (`supabase/migrations/20261014090100_hushmates_rules.sql:1122-1131`; `staff/desk-guide.js`) |
| 3 | Desk reader | **Team note:** "Decision: restrict · age concern". Nothing else: no age, school, place, or anything that could identify them | Desk notes are encrypted and seen by every moderator who opens the report. They have **no end date today [GAP]** (`RETENTION_AND_DELETION.md`), so keep them minimal |
| 4 | Desk reader | **Tell the safety lead the same day** | — |
| 5 | Safety lead | **Show the member a kind message** (5.5) | **[GAP]** Today they see only the general wording: "Our safety team has paused catching for your account for now. Feelings you already released still come home to you." (`ui/relay/catch.js:434`) and "Your account can’t release feelings right now." (`ui/relay/release.js:129`). There is no way to show a reason |
| 6 | Safety lead | **Review, if they ask.** Look again at what was reported and at what the person says. Never ask for proof. If it was a mistake, lift the restriction and say sorry (5.5). **We reply to the person's email, and once it's built, they also see the answer in the app.** Replying to an email they sent isn't the kind of contact §5.4 rules out. Nobody contacts them otherwise | Lifting is an operator task: `node server/admin.mjs member <reference> active` |
| 7 | Member, then owner | **Download, then delete.** The member can download their data and delete everything themselves: both work for a restricted account (`m_export_raw`, `m_delete_my_data` allow active, restricted and suspended). If they haven't after **[14] days [PROPOSAL, owner to decide]**, Hushmallow deletes the account | **[GAP]** There is no tool for an operator to delete an account for someone (`RETENTION_AND_DELETION.md` §3.4). It must exist before G3 |
| 8 | Owner | **Don't let them straight back in.** If the owner knows who it was (for example, because the person said so in a review), don't send them a new invitation. Don't look anyone up to find out | **[GAP]** Nothing records an under-age refusal or a closure for age, and nothing stops a new tick. Invitations are single-use by default |

**What deletion does and doesn't remove.** "Delete my Hushmates data" clears the words of every feeling they released
and every perspective they gave, including on other people's feelings, and deletes their sign-in. The member row stays,
with its 18+ time, invitation link and preferences; journey and perspective rows stay without words; report rows and
desk notes stay **[GAP]** (`RETENTION_AND_DELETION.md` §4). A share picture or video someone else already made on their
own device can't be taken back. Mallow lines are put together from a fixed library written in advance, so nobody's
words, a minor's included, ever become Mallow material.

**What is kept about the case:** the decision and its date in the team note; the report row; the restriction and
deletion in the activity log (kept 365 days). Report evidence is cleared 90 days after the report is resolved
(`supabase/migrations/20261014090200_hushmates_api.sql`). Nothing about the person's age is written down.

### 5.4 What nobody on the team ever does

- Ask for ID, a photo, a birth certificate, a school, or anything else to prove age.
- Try to find out who the person is, or link the account to an email because of an age concern.
- Contact the person outside the app (other than replying to an email they sent us), or contact a parent, a school or
  anyone else about them.
- Tell other members, or the person who reported, what was decided about someone's age.
- Use their words anywhere, for any purpose.
- Keep the evidence beyond the retention schedule.

If the words point to immediate danger, `MODERATION.md` §6 governs, including what the team may do with information it
independently holds.

### 5.5 The words members would see (proposed)

These are proposals, in Hushmallow's voice, for the owner to approve. Check every phone number on the service's own
website before it goes into the app. Kids Helpline's number and the age range it serves come from the research notes and
from memory, not from Kids Helpline's own site.

**When an account is paused for age** (a new message, shown in the app the next time they open it):

> **Hushmates is for adults**
>
> We think you might be under 18. Hushmates is only for adults, so we’ve paused your account. You haven’t done anything
> wrong, and you’re not in trouble.
>
> Feelings you already sent will still come home to you. In **Your data**, you can download everything you wrote, and
> then delete it all.
>
> If we’ve got this wrong, tell us at **[contact address]**. A person on our team will look again. We’ll reply to your
> email, and once it’s built, you’ll also see the answer here in the app. We’ll never ask you for ID.
>
> If you’d like someone to talk to, **Kids Helpline** is there any time on **1800 55 1800**. They talk with young
> people up to 25. If you’re not safe right now, call **000**.

**In the report menu** (a new reason):

> **This person may be under 18**
> Hushmates is for adults. If something here makes you think the writer is younger, a person on our safety team will
> take a look. Nobody is told who reported.

**At joining, under the tick** (a new hint):

> Hushmates is for adults, 18 and over. If you’re younger, Kids Helpline is there for you any time on 1800 55 1800.

**If the review finds a mistake:**

> **Sorry about that**
>
> We looked again, and your account is back to normal. Thank you for your patience.

**If the review doesn't change the decision:**

> **We looked again**
>
> We still think you might be under 18, so your account stays paused. You can download what you wrote, and delete it,
> in **Your data**. On **[date]** we’ll delete the account and everything in it.
>
> Kids Helpline is there any time on **1800 55 1800**. If you’re not safe right now, call **000**.

**Wording rules for all of these:**

- Never "we'll contact you", "we're watching", "verified" or "age-checked".
- Never ask for, or hint that someone could send, proof of age.
- Say "paused", not "banned".
- Always end with somewhere to turn: Kids Helpline, and 000.

### 5.6 What to build, in order (none of it exists yet)

1. The report reason "This person may be under 18", with the desk showing it as an age concern.
2. A way to show a restricted member a short reason message (5.5).
3. A contact address the team reads at the desk's times (D23), for reviews.
4. An operator tool to delete an account for someone.
5. A minimal record that stops an immediate second try after an under-age answer or a closure for age, kept only as
   long as needed (it would hold no age evidence).
6. The hint under the joining tick (5.5).
7. A short invitation log: who was invited and when, and the inviter's confirmation that they are an adult.

---

## 6. What every document says about age

All of these must say the same thing. Today they do, on the points below.

| Document | What it says | Must stay true |
|---|---|---|
| `TERMS_OF_USE.md` §3, §8 | 18+; how age is checked (a tick, no ID, no date of birth); accounts of under-18s are closed kindly | Matches the actual method. Changes if section 3 is adopted |
| `PRIVACY_POLICY.md`, "Children and age" | 18+; the tick; no ID or date of birth; how to tell us; pause, download, then delete | Needs the contact address, the report reason and the deletion tool before it is published |
| `MODERATION.md` §7.2 | The desk steps in 5.3 | Same steps as here |
| `COMMUNITY_GUIDELINES.md` | Adults only | Same rule |
| The app | "Hushmates is a small, invitation-only pilot for adults." (`ui/relay/invite.js:46`); "Hushmates is an invitation-only pilot for adults (18+)." (`ui/relay/you.js:82`) | Never "verified adults" |

None of them, and nothing public, may say that the under-16 law applies or that it doesn't, that Hushmates is
excluded from it, or that it complies with the Children's Online Privacy Code.

---

## 7. Questions for the lawyer

In order of importance. They also appear, with the other areas, in `README.md` in this folder.

1. **The base test.** Is online social interaction "the sole purpose, or a significant purpose" of Hushmates
   (s63C(1)(a)(i)), given the facts in 2.2? Does s63C(2) change the answer?
2. **s4A.** On the operative text: are feelings shown to catchers for a limited time (a 3-minute offer, 10 minutes to
   write, a 24-hour journey) a "time-limited feature"? Is the author's private "n of 5 human perspectives" a "feedback
   feature"? Is random matching from the three longest-waiting eligible feelings, with blocks and history excluded, a
   "recommender feature"?
3. **The health exclusion (Rules 2025 s5(1)(f)).** Could Hushmates' sole or primary purpose be "supporting the health
   of end-users"? If Hushmallow relied on it, what would that mean for Privacy Act health-service status, the TGA
   question and the Children's Online Privacy Code? Which single description of purpose should every document use?
4. **Reasonable steps.** If Hushmates is in scope, which layers in 3.3 are enough for a small invitation-only service?
   Is anything needed before outside testers (G3), or only before a public launch (G4)?
5. **s63F and the OAIC's Part 4A guidance.** What limits apply to any age-check information, and do they apply even if
   Hushmallow isn't bound by the APPs?
6. **The Children's Online Privacy Code.** Once registered, could it reach Hushmates, and is an 18+ invitation-only
   service "likely to be accessed by children"?
7. **Minors who get in.** Do the Phase 2 age-restricted material codes, or the Basic Online Safety Expectations, add
   anything for a minor who slips through (neither was researched for this)?

---

## 8. Facts checked in the code

At commit `48c7e26` (15 October 2026):

- The 18+ tick and the disabled button: `ui/relay/invite.js:34-35, 51`. Server refusal:
  `supabase/migrations/20261014090100_hushmates_rules.sql:1037`. Stored time: `members.adult_confirmed_at`,
  `supabase/migrations/20261014090000_hushmates_schema.sql:64`.
- A second adult tick at the welcome appears only if no confirmation is on record: `ui/relay/welcome.js:110`.
- Desk readers' tick: `staff/desk.js:123`.
- Pilot wording: `ui/relay/invite.js:46`; `ui/relay/you.js:82`.
- "Never about other people’s activity": `ui/relay/you.js:58`. "No scoreboards, no streaks": `ui/relay/you.js:71`.
- Perspectives screened for some grooming-style questions: `core/feeling-safety.js:206` onwards.
- Matching: `m_find_feeling`, `supabase/migrations/20261014090100_hushmates_rules.sql:562-610`, with
  `fairnessPool 3`, `supabase/migrations/20261014090000_hushmates_schema.sql:35`.
- Hold and journey times: `offerHoldMs 180000`, `catchHoldMs 600000`, `journeyTtlMs 86400000`, `maxResends 2`:
  `supabase/migrations/20261014090000_hushmates_schema.sql:31-32`. 30-day clearing: `returnedDays 30`, line 40.
- What a catcher sees: `offer_view` (words, label, Mallow, "perspectives so far"),
  `supabase/migrations/20261014090100_hushmates_rules.sql:300-306`; shown at `ui/relay/catch.js:159`. Afterwards,
  only their own words: `m_my_gifts`, lines 746-754.
- The author's count: `humanProgress`, `ui/relay/journeys.js:25`, used at lines 48, 58, 114, 132 and in
  `ui/relay/returned.js`.
- Restriction: `supabase/migrations/20261014090100_hushmates_rules.sql:1122-1131`; `staff/desk-guide.js`. Messages:
  `ui/relay/catch.js:434`, `ui/relay/release.js:129`. Lifting: `server/admin.mjs member <reference> active`.
- Export and deletion for restricted accounts: `m_export_raw` and `m_delete_my_data` call
  `actor(m, array['active', 'restricted', 'suspended'])`.
- Report reasons (no age reason): `core/relay-config.js:33-41`.
- Support lines (Kids Helpline isn't one of them): `core/feeling-safety.js:129-135`.
- Nothing reads age from words: no age rule in `core/feeling-safety.js` or `core/text-policy.js`.

---

## 9. Sources

All official sources were seen **only as search extracts**; none was opened directly. "Paraphrase" means the search
tool's own summary, not the official wording.

**Law and legislative instruments**

- Online Safety Act 2021, s63C(1)(a), compilation of 11 December 2024:
  https://www.legislation.gov.au/C2021A00076/2024-12-11/2024-12-11/text/original/epub/OEBPS/document_1/document_1.html
  (official text, search extract). **Not seen:** s63C(2), s63D (wording and penalty), s63DB, s63F.
- Online Safety (Age-Restricted Social Media Platforms) Amendment Rules 2026 (F2026L00370):
  https://www.legislation.gov.au/F2026L00370/asmade/text (official text: **heading of s4A only**).
- Online Safety (Age-Restricted Social Media Platforms) Rules 2025, Explanatory Statement (F2025L00889):
  https://www.legislation.gov.au/F2025L00889/asmade/2025-07-30/es/original/pdf (official extrinsic material, search
  extract, partly paraphrased). **The text of s5 was not seen.**
- Explanatory Memorandum to the Online Safety Amendment (Social Media Minimum Age) Bill 2024:
  https://parlinfo.aph.gov.au/parlInfo/search/display/display.w3p;query=Id:%22legislation/ems/r7284_ems_b9c134ac-a19a-47b2-9879-b03dda6e3c1a%22
  (official extrinsic material, paraphrase).

**Official guidance**

- eSafety, "How to assess if a service is an age-restricted social media platform":
  https://www.esafety.gov.au/about-us/industry-regulation/social-media-age-restrictions/assessment (search extract,
  partly paraphrased).
- eSafety, Social Media Minimum Age Regulatory Guidance (September 2025):
  https://www.esafety.gov.au/sites/default/files/2025-09/eSafety-SMMA-Regulatory-Guidance.pdf (search extract).
- eSafety, Social Media Minimum Age compliance update (March 2026):
  https://www.esafety.gov.au/sites/default/files/2026-03/SocialMediaMinimumAgeComplianceUpdateMarch2026.pdf (search
  extract, partly paraphrased).
- eSafety, media release, 16 September 2025:
  https://www.esafety.gov.au/newsroom/media-releases/new-regulatory-guidance-released-to-support-social-media-industry-ahead-of-minimum-age-law
  (search extract).
- eSafety, Social media age restrictions FAQs:
  https://www.esafety.gov.au/about-us/industry-regulation/social-media-age-restrictions/faqs (search extract, partly
  paraphrased).
- Department of Infrastructure, Transport, Regional Development, Communications, Sport and the Arts, "Social media
  minimum age": https://www.infrastructure.gov.au/media-communications/internet/online-safety/social-media-minimum-age
  and https://www.infrastructure.gov.au/department/media/news/updates-social-media-minimum-age-rules (search extracts).
- Minister for Communications, media release:
  https://minister.infrastructure.gov.au/wells/media-release/social-media-minimum-age-update-targets-harmful-tools
  (search extract, partly paraphrased).
- OAIC, Children's Online Privacy Code (updated August 2026):
  https://www.oaic.gov.au/privacy/privacy-registers/privacy-codes/childrens-online-privacy-code (search extract,
  paraphrased); exposure draft release:
  https://www.oaic.gov.au/news/media-centre/oaic-releases-exposure-draft-of-the-childrens-online-privacy-code
  (paraphrase).
- OAIC, Privacy Guidance on Part 4A (Social Media Minimum Age):
  https://www.oaic.gov.au/__data/assets/pdf_file/0025/257146/OAIC-SMMA-Privacy-Guidance.pdf (**title only**).
- OAIC, APP Guidelines Chapter B (consent and capacity):
  https://www.oaic.gov.au/privacy/australian-privacy-principles/australian-privacy-principles-guidelines/chapter-b-key-concepts
  (search extract).

**Secondary sources (not the law; used only for the s4A commencement date)**

- Clayton Utz, May 2026:
  https://www.claytonutz.com/insights/2026/may/social-media-minimum-age-restrictions-the-net-widens-enforcement-begins-and-gaming-platforms-in-the-frame
- Digital Policy Alert:
  https://digitalpolicyalert.org/event/38894-online-safety-age-restricted-social-media-platforms-amendment-rules-2026-enters-into-force
- Industry submissions hosted on the OAIC's consultation page (not the OAIC's view):
  https://www.oaic.gov.au/engage-with-us/consultations/draft-childrens-online-privacy-code-consultation-for-industry,-civil-society,-academia

**Not seen at all:** Kids Helpline's own site (the number and age range here must be checked there before use).
