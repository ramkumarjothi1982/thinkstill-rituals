# ledger/

The studio's append-only record of owner decisions and posts (PHASE2-PLAN data model 7). Written only through `planner/ledger.mjs`, which validates every line before it is appended and again when it is read. A corrupt or truncated line is a hard error with its line number. Lines are never rewritten or deleted: a correction is a new line, and the latest decision for a spec wins.

The `*.jsonl` data files are git-ignored (`ledger/.gitignore`): they are the owner's operational record on this machine, not source. Back them up with the batch archive. Tests never touch this directory; they use `HM_LEDGER_DIR` or `--ledger <dir>` under `WORK/tmp`.

| File | One line per | Written by | Read by |
|---|---|---|---|
| `decisions.jsonl` | owner verdict: `{id, batch, fingerprint, specHash, mode, internal, visible, verdict: approve\|reject, reasons[], note, by, at, gspec: {pass, errors[]}}`. `specHash` is the sha256 of the whole spec judged; an approval needs `gspec.pass: true` | `hm approve`, `hm reject` (WP-25 adds `hm review import`, which must fill the same fields) | G-SPEC (fingerprint never reused), `hm export` and `--mark-posted` (the latest decision must approve this exact `specHash`) |
| `fingerprints.jsonl` | exact fingerprint of a decided spec: `{id, fingerprint, source, at}` (WP-25 adds the perceptual signature: cover hash, 7 anchor hashes, audio signature) | `hm approve`, `hm reject` | G-SPEC |
| `published.jsonl` | a post the owner made by hand: `{id, fingerprint, specHash, channel, postedAt, visible, family, valence, batch}` | `hm export <id> --mark-posted --channel <c>` | sequencing, cadence and 14-day distance rules |
| `copy-usage.jsonl` | each copy string of a post: `{text, kind: hook\|line\|resolution\|closer\|nameWord, id, channel, at}` | `hm export --mark-posted` | hook (90 days, semantic), line (3 per 30 days) and resolution (1 per 7 days) cooldowns |
| `reservations.jsonl` | copy held by a planned production batch: `{text, kind, batch, channel, until}` | `hm plan --reserve` | other batches on the channel avoid it until `until` |
| `cells.jsonl` | tuning-cell status change: `{move, mallow, from, to, evidence, at}` | WP-13 tools | audits |

Rules the ledger enforces: reason codes are `acting, timing, copy, world, face, sameness, brand, other`; a reject needs at least one; an approval needs a passing G-SPEC. Repeating the latest decision for a spec (same verdict, same `specHash`, same reasons) is a no-op. Only approved, non-internal specs can be exported or recorded as posted, and only while `spec.json` still hashes to the approved `specHash`. Nothing is ever posted automatically.
