# Phase 3b · Adversarial review of the new code and documents (15 October 2026)

**What was reviewed:** everything written in Phase 3b, from commit `6e0e35d` onwards:
- the staging tools (`staging-deploy`, `staging-env`, `staging-check`, `staging-e2e`, `pack-site`, `static-site`);
- the share safeguards (`ui/relay/share.js`);
- their tests;
- the new documents.

**How:** five independent reviewers, one per dimension:
- secrets and guards;
- the cloud path and the deploy;
- the share safeguards;
- whether the tests prove their claims;
- whether the documents are true.

Each was followed by a skeptic who tried to refute every finding. Most findings were reproduced in a scratch copy. The fixes were then reviewed again by two more reviewers, whose six further issues were also fixed.

**The reviewers were AI agents** working in this repository. This is not an independent professional review of any kind, and it doesn't replace the external security, accessibility, privacy, legal or clinical reviews in `REVIEWS.md`.

**Outcome:**
- 38 findings;
- 36 confirmed or partly confirmed by the skeptics;
- 2 refuted:
  - CLOUD-1 duplicated SECRETS-1, already fixed;
  - DOCS-6 was a count that wasn't actually wrong. The line was reworded anyway.
- All 36 were fixed.

## Findings, verdicts and fixes

| Id | Reviewer's / skeptic's severity | What was wrong | Fix |
|---|---|---|---|
| SECRETS-1 | high / high | The deploy command crashed before any request: a name re-exported but not imported | Imported (`c653a18`). `tests/staging-cli.test.mjs` now runs each command and fails on this exact error |
| SHARE-1 | high / medium | A video still recording when a writer withdrew was finished and handed over with their words | The choices are kept when Make is pressed. A recording stops the moment one goes, and anything made is checked with the service again before it is handed over. E2E: a writer stops sharing mid-recording, and the video is never handed over |
| SECRETS-7, CLOUD-3, DOCS-1 | medium | The Pages address was checked only after every Supabase change, and the project name was guessed from the address, a dead end for suffixed addresses | A read-only Cloudflare check before step 1, in the dry run too. It finds the owner's project by its address |
| CLOUD-2 | medium / medium | A migration edited after it was applied was skipped, so staging would test stale SQL | The deploy compares the recorded statements and stops: "add a new migration instead" |
| CLOUD-4 | medium / medium | An interrupted staging E2E left the shortened timings on staging for good | The real defaults are restored (pinned to the migration). Ctrl-C and SIGTERM run the clean-up |
| DOCS-2 | medium / medium | Tier A undercounted the Mallow library (342 lines, 179 of them Reframe's), so its hours and cost were understated | Tier A is now about 5–6 hours (A$1,650–2,040). The library goes to the reviewer as a sheet |
| SECRETS-2 | medium / low | Nothing guarded the Cloudflare side | Refuses an account holding any Pages project without "staging" in its name |
| SECRETS-3 | medium / low | The Supabase guard passed with other staging-named projects, or an empty list | The token must reach the staging project and nothing else |
| SECRETS-4 | medium / low | With a database address set, no staging guard ran even when a token was present | The guard runs whenever a token is present; without one, the tools say plainly what couldn't be checked |
| SHARE-2 | medium / low | The docs cited a unit test that doesn't cover retraction, and called the video tested | The citation is corrected, and the mid-recording E2E was added |
| SHARE-3 | medium / low | Keyboard focus was pulled away on every refresh, and lost when a part was removed | A refresh with nothing new repaints nothing. A part being removed hands focus to the heading. E2E checks it |
| TESTS-1 | medium / low | "A dry run changes nothing" wasn't proven | Every query is recorded and the dry run must be all reads. The extension and Vault steps run under test |
| TESTS-2 | medium / low | A test overwrote the real `dist/site` | The publisher builds into a temporary folder in tests |
| DOCS-3 | medium / low | The pass/fail report pointed at placeholders | Filled by this run (`LAUNCH_READINESS.md` §3, README) |
| SECRETS-5, CLOUD-6 | low | Wrangler (fetched by npx) received the root secret and the Supabase token | An allow-listed environment. The fix review found the same for the E2E's Chromium, now fixed too |
| SECRETS-6 | low | A leftover `.data/staging.env` silently won over the root secret | Refused unless both hold the same keys. The source is printed |
| SECRETS-8 | low | The database address checks could be passed with a repeated sslmode or a look-alike host | Only `sslmode=verify-full` (once) and `sslrootcert`, on the project's own host. Refusals never repeat a password |
| CLOUD-5 | low | The scheduler started before its Vault secrets and the function existed | Vault comes first. The checks judge results since the scheduler's first success |
| CLOUD-7 | low | A non-array query answer read as "no rows", so security checks could pass on nothing | It throws |
| SHARE-4 | low | Letting a feeling go was reported as "a writer stopped sharing" | A plain sentence for each cause |
| SHARE-5 | low | A refresh during the check removed a choice, but the picture was still made | Anything chosen at the press that is gone stops it |
| SHARE-6 | low | "So nothing was made" was shown when nothing had been attempted | "Nothing can be made from it" |
| TESTS-3 | low | The static site's traversal test never reached the guard | Literal paths, and a copy without the guard fails |
| TESTS-4 | low | "A second run changes nothing" was false | The claim is narrowed to what is true |
| TESTS-5 | low | A refusal was never reached by its test | Fixed |
| TESTS-6 | low | The Vault step never ran in tests | A minimal Vault in the test database. The secret never appears in SQL text |
| TESTS-7, DOCS-9 | low | The rehearsal didn't record whether the real Edge Function ran under Deno | The runtime is in the report. `staging:rehearse` needs Deno, or says "Node gateway" |
| DOCS-4 | low | "Invitation only, so this is enforced" overstated a procedure | Reworded: it is the owner's procedure (D12) |
| DOCS-5 | low | "The tools are tested" while no test ran a command | Each command is now run against the API stand-in |
| DOCS-7 | low | Tier C used different hours from the original estimate, which had been described as exact | 20–30 hours throughout. §2 is called a reconstruction |
| DOCS-8 | low | "`safety-eval.mjs` unchanged" was false; the duplicates were described wrongly | Corrected |
| DOCS-10 | low | A wrong cross-reference and wrong counts | Corrected |
| CLOUD-1 | high / refuted | Duplicate of SECRETS-1 | — |
| DOCS-6 | low / refuted | "Six adversarial reviews" | Reworded to name the reviews |

**Found when the fixes were reviewed, and fixed:**
- a Ctrl-C under Deno could hang the clean-up;
- a test person created during a stop could be missed by the clean-up;
- a dry run with Vault present was untested;
- a database password could leak into a refusal;
- a local database address was reported as matched against the project;
- the browser received secrets in its environment.

The full reviewer output is in the session's working files, not the repository.
