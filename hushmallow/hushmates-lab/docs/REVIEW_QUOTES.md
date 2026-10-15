# Hushmates · Requesting quotes for an independent safety review (D6c)

**Status:**
- Approved: asking for quotes.
- **Not approved: any engagement or payment.** Choosing and paying a reviewer is decision D6d, after you've compared the quotes.
- Nothing here commits Hushmallow to anything.

**Who sends them:** you, from Hushmallow's own email address (the approved contact process). This
session has no email or other outbound connector, and it shouldn't write to real people on your
behalf.

What's below is ready to send, with:
- where to find suitable reviewers;
- what to ask for;
- a table to compare the replies in.

## 1. Who to ask (two or three, to compare)

The review needs clinical judgement, so the reviewer must hold one of these:

| Qualification | How to check it | Where to find one |
|---|---|---|
| A **psychologist** registered with AHPRA (general or clinical registration), ideally with suicide-prevention, crisis or digital mental health experience | Search their name on the public AHPRA register (ahpra.gov.au, *Check a health practitioner's registration*): registration, conditions, endorsements | The APS *Find a Psychologist* directory (psychology.org.au); the AAPi directory (aapi.org.au). Filter for consulting or organisational work |
| An **Accredited Mental Health Social Worker** (AMHSW) | The AASW's credential register (aasw.asn.au) | The AASW *Find a Social Worker* directory |
| Optional extra, for a fuller review: a **lived-experience reviewer** (lived experience of suicidal thoughts or attempts) | Through an organisation's paid-participation process, with a briefing, an opt-out and a debrief | Roses in the Ocean (lived-experience organisation, Australia); state mental health commissions' lived-experience registers |

**Every reviewer must also:**
- hold **professional indemnity insurance** that covers advisory or consulting work, not only client sessions;
- have **no conflict of interest** (no stake in Hushmallow or a competitor);
- agree to keep the pack confidential. It contains no personal information: every phrasing is developer-written.

Prefer someone who knows:
- Mindframe's and #chatsafe's safe-messaging guidance;
- peer-support or online moderation.

No Working with Children Check is needed: the review involves no client contact.

## 2. The two options to quote

Ask each reviewer for **a fixed price per option**, their own estimate of the hours, and whether they
think the scope is right. **Don't tell them it takes 5–6 hours.** That is our own estimate, and the
point is to hear theirs.

| | **Option 1: limited, risk-based review** | **Option 2: full review** |
|---|---|---|
| What it is for | Deciding whether a small invite-only beta (up to about 30 adults) is reasonably safe, and what must change first | Settling the safety screen's decisions across every known phrasing, with measured agreement. Needed before any public safety claim or before tuning the screen against labels |
| Phrasings | The 108-row blind sheet: all 54 "undecided" rows, plus 54 others in proportion. Or the leaner 54 undecided only, if they judge that enough | All 379 rows, blind. Ideally **two** reviewers labelling independently, so their agreement can be measured |
| Mallow library | All 342 lines, as a sheet with ok · change · remove | Same |
| Support screens, crisis lines, the "are you safe right now?" check-in idea | Review the wording and routing | Same, plus acceptance thresholds for the screen |
| Escalation and moderation procedure | Review `ESCALATION.md` and what users are told | Same |
| Lived-experience input | — | Optional: a reviewer with lived experience reads the support wording and the library (3–6 hours, paid participation) |
| The memo | Go or no-go for the invite-only beta, the conditions, what must change, and **exactly what may be said publicly about the review** | The same, plus the labelled sheet's numbers and what they can and cannot support |
| Rough range from published rates (our estimate, to be replaced by their quotes) | A$1,320–2,040 excl. GST | A$7,275–11,400 excl. GST |

## 3. Is 108 phrasings enough? (ask the reviewer to answer this too)

**Our view, for them to confirm or correct:**
- **What 108 can do:** give a qualified person's judgement on every phrasing the developers couldn't decide (the 54 undecided, 36 of which the screen releases today), and spot-check 54 settled ones. That is enough to find serious mistakes before a small beta, and to set the wording of the check-in.
- **What 108 can't do:** measure how often the screen catches risk. Roughly 30 of the 108 are risk phrasings. Even if the screen caught all of them, that wouldn't show its catch rate is high across real writing. Developer-written phrasings also flatter the rules they were written alongside.
- **What happens to the remaining 271 rows** (`REVIEWS.md` §5.4):
  - **Now:** nothing is claimed about them. The screen stays a floor, and the app keeps saying it can miss things.
  - **Before any expansion beyond the invite-only beta, or after any confirmed miss:** Option 2, or a single reviewer labels all 379.
  - The **Tier 0 probe** (`docs/clinical/tier0-probe-results.csv`: new phrasings run through the real screen) goes to the reviewer as extra evidence of where the rules miss.

**Ask:** "Is the 108-row sample enough for a go/no-go on a 30-person invite-only beta? If not, what would be?"

## 4. What you'll send after a quote is accepted (not before)

The pack is ready in the repository:
- the blind sheets: `docs/clinical/tier-a-sample-for-review.csv` (108 rows), `crisis-phrasings-for-review.csv` (379), and the `--undecided` export (54);
- the library sheet: `docs/clinical/mallow-library-for-review.csv` (342 lines);
- screenshots of the support screens, *Get support now* and the crisis lines (`docs/screenshots/phase2/19-support-au.jpg` and others);
- `ESCALATION.md`, `docs/legal/MODERATION.md`, `docs/safety/TIER0_SELF_ASSESSMENT.md`;
- a short summary of what the screen does, from `CRISIS_DETECTION.md` §3.

## 5. The email (edit freely; send from Hushmallow's address)

> **Subject:** Quote request: independent safety review of a non-clinical wellbeing app (two options)
>
> Hello [name],
>
> I'm building Hushmallow, a non-clinical emotional-companion app for adults in Australia. People write a feeling; up to five other members can send a short, kind perspective back; and gentle characters ("Mallows") respond from a fixed library of about 340 lines when nobody answers. It isn't a health, counselling or crisis service, and it says so. A keyword screen holds back words suggesting someone isn't safe and shows Australian crisis lines, and a small team reads reports.
>
> Before inviting about 30 adults to a private beta, I'd like an independent registered psychologist or Accredited Mental Health Social Worker to review its safety design. There's no client contact. I'd be grateful for **fixed-price quotes for two options**:
>
> 1. **A limited review:**
>    - label a blind sheet of 108 example phrasings (or advise if a different number is needed);
>    - read the app's 342 fixed response lines;
>    - review the support screens, crisis lines and our escalation procedure;
>    - write a short memo with go/no-go conditions for the beta and what we may say publicly about your review.
> 2. **A full review:**
>    - label all 379 phrasings (and tell me whether two independent reviewers are needed);
>    - suggest acceptance thresholds for the screen;
>    - everything in option 1.
>
> For each, could you tell me:
> - your estimate of the hours;
> - the fixed price (and whether it includes GST);
> - your availability;
> - whether your professional indemnity insurance covers advisory work like this;
> - anything you would add or remove from the scope.
>
> This is a request for quotes only; I'll confirm in writing before any work starts.
>
> Thank you,
> [your name], Hushmallow

## 6. Comparing the replies

| | Reviewer A | Reviewer B | Reviewer C |
|---|---|---|---|
| Qualification, checked on AHPRA or AASW | | | |
| Relevant experience (crisis, suicide prevention, digital, moderation) | | | |
| PI insurance covers advisory work | | | |
| Option 1: hours / fixed price / GST | | | |
| Option 2: hours / fixed price / GST | | | |
| Their view on the 108-phrasing sample | | | |
| Scope changes they suggest | | | |
| Available from | | | |
| Conflicts declared | | | |

Then decide D6d with these in hand.
