export const meta = {
  name: 'thinkstill-quality-audit',
  description: 'Screenshot-based premium quality audit of all 110 existing ThinkStill games (desktop + phone, start/mid/finish) with rubric scores, performance metrics and a ranked QUALITY_REPORT with concrete improvements',
  phases: [
    { title: 'Capture', detail: 'scripted sweep: 3 moments x 2 sizes per game + frame-time/heap metrics + per-game contact sheets' },
    { title: 'Rate', detail: 'rater agents score each game on a premium rubric from its rendered contact sheet' },
    { title: 'Report', detail: 'ranked report, strongest/weakest, cross-cutting issues, prioritised polish plan' },
  ],
}

const ROOT = '/home/user/thinkstill-rituals/framer'
const QDIR = ROOT + '/docs/quality'
const SHOTS = ROOT + '/dev/shots/quality'
const GIT = `Git: branch claude/jolly-hopper-ognrxj in /home/user/thinkstill-rituals. Other agents are committing in parallel: git add ONLY the exact paths you own (never git add -A / -u), if git reports index.lock wait 5 s and retry, commit message must end with exactly these two trailer lines:\nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>\nClaude-Session: https://claude.ai/code/session_01SaGZSxDbxtpggsq88ET1Ri\nthen git push -u origin claude/jolly-hopper-ognrxj (retry 4x with 2/4/8/16 s backoff on network errors). If the push is rejected because the remote moved, git pull --rebase origin claude/jolly-hopper-ognrxj then push. Never create a PR. Never mention model names.`
const CTX = `PROJECT: ThinkStill Release Arcade — a Framer code component (React + framer-motion, one file) with 110 emotional-release mini-games; the owner wants a PREMIUM Pixar / Netflix-quality interactive experience (warm cinematic light, characterful Inside-Out-style emotion characters with expressive reactions, squash & stretch, distinctive environments and satisfying finales), NOT an ordinary collection of browser games. A separate build workflow is concurrently adding new modules under src/eos/ — do NOT edit any src file and do NOT run framer/build.py without --dev-dir (it would overwrite shared outputs).
Tooling: ${ROOT}/dev/drive.mjs (launch({width,height,dir}), listGames(page), startGame(page,NAME,text)); ${ROOT}/dev/eos_drive.mjs (launchEos, startGameById, finishGame, readProgress, ... usage at top of file); ${ROOT}/dev/contact_sheet.py OUT.png <pngs|globs> --cols N (tiles screenshots into one labelled image). Chromium at /opt/pw-browsers/chromium. Game catalog with mechanics/weaknesses: ${ROOT}/docs/catalog_A.md (ids 1-55) and catalog_B.md (56-110). Ignore "agent-proxy connect_rejected" noise. Keep throwaway scripts under /tmp/quality/.`

phase('Capture')
let games = (args && args.games) || []
if (!games.length) throw new Error('pass args.games (capture already completed on disk)')
log(`Capture already complete on disk: ${games.length} games, contact sheets in ${SHOTS}/sheets, metrics in ${QDIR}/metrics.json`)

phase('Rate')
const RUBRIC = `RUBRIC (score 1-10 each, 10 = genuinely premium Pixar / Netflix level; 6 = decent web game; <=4 = looks cheap / broken):
A visual polish & lighting (cinematic light, depth, colour grading, materials, no flat/default UI look)
B environment distinctiveness (does this game have its own world/scene, or is it the same backdrop/effect as many others?)
C interaction feel & juice (does the core gesture look tactile, with anticipation / squash-stretch / particles / feedback; judge from mid frames + the catalog mechanic)
D character integration (are the existing emotion characters present and EXPRESSIVE — reacting, changing faces, squash — or absent/static decals?)
E finale & reward (is the finish/reveal a satisfying, distinctive payoff that flips negative -> positive, or a generic shared burst?)
F clarity & readability (would a first-time player know what to do in 2 seconds; text size; clutter)
G mobile layout (390 px: nothing cut off, overlapping, cramped; touch targets big)
H relief fit (does the mechanic + look actually help the intended emotion)
PERF: flag if p95 frame > 34 ms, any frame > 120 ms, heap growth > 25 MB, or errors (from metrics.json; note headless software rendering exaggerates costs — judge relatively).
BINDING STANDARDS: read ${ROOT}/docs/CREATIVE_STANDARDS.md once before rating. Judge PHONE (row 2) FIRST, desktop second. Characters must be ACTIVE PARTICIPANTS in the game world (reacting, transforming) — a static decal or corner companion scores D <= 4. Each game needs its OWN spectacular finale — a generic shared burst scores E <= 4. Bubble image rules: circular images, no black masks/boxes, readable text BELOW the image, no image/text overlap, nothing clipped — any violation fails visual readiness.
READINESS (all three required for 'complete'):
- functional_ready: finished on both sizes per metrics (finished=true), no errors, progress observed.
- visual_ready: text readable, bubble rules pass, nothing clipped/overlapping at 390 and 1280, coherent environment.
- premium_ready: every axis >= 8 and no perf flag.
WORK TYPE: 'structural' if the mechanic / feedback loop / finale / character role must change (incl. look-alike games whose core interaction duplicates another game), 'polish' if only visual/animation/lighting work is needed, 'none' if premium-ready.
Never inflate: cite the tile (e.g. "phone mid tile") for every problem and explain each low score.`
const RATE_SCHEMA = {
  type: 'object',
  properties: {
    games: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'number' }, name: { type: 'string' },
          scores: { type: 'object', properties: { A: { type: 'number' }, B: { type: 'number' }, C: { type: 'number' }, D: { type: 'number' }, E: { type: 'number' }, F: { type: 'number' }, G: { type: 'number' }, H: { type: 'number' } }, required: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'] },
          functional_ready: { type: 'boolean' },
          visual_ready: { type: 'boolean' },
          premium_ready: { type: 'boolean' },
          work_type: { type: 'string', enum: ['structural', 'polish', 'none'] },
          bubble_rules_ok: { type: 'boolean' },
          character_role: { type: 'string', description: 'how the emotion characters appear and behave in this game today (evidence)' },
          finale: { type: 'string', description: 'what the finish/reveal actually shows today and whether it is unique (evidence)' },
          score_rationale: { type: 'string', description: 'why each low score (<=6) was given, citing tiles' },
          perf_flags: { type: 'array', items: { type: 'string' } },
          looks_like: { type: 'string', description: 'which other games it is visually near-identical to (ids), if any' },
          strengths: { type: 'string' },
          problems: { type: 'string', description: 'specific, visible problems with screenshot evidence (which tile)' },
          improvements: { type: 'array', items: { type: 'string' }, description: 'concrete, implementable changes (what to draw/animate/change), most impactful first' },
          effort: { type: 'string', enum: ['S', 'M', 'L'] },
        },
        required: ['id', 'name', 'scores', 'functional_ready', 'visual_ready', 'premium_ready', 'work_type', 'bubble_rules_ok', 'character_role', 'finale', 'score_rationale', 'perf_flags', 'strengths', 'problems', 'improvements', 'effort'],
      },
    },
  },
  required: ['games'],
}
const BATCH = 14
const batches = []
for (let i = 0; i < games.length; i += BATCH) batches.push(games.slice(i, i + BATCH))
const rated = await parallel(batches.map((b, bi) => () => agent(`${CTX}\n\nRATER batch ${bi + 1}/${batches.length}. Be a demanding Pixar art director + premium mobile-game reviewer. For EACH game below, Read its contact sheet ${SHOTS}/sheets/<id>.png (row 1 desktop start/mid/finish/reveal, row 2 phone) — that one image per game is your primary evidence; look carefully. Read its catalog row (grep -n "| <id> |" in catalog_A.md or catalog_B.md) for the mechanic, and its metrics in ${QDIR}/metrics.json (grep by id). Only if a sheet is missing or unreadable, Read individual PNGs ${SHOTS}/<id>_*.png. Do not inflate scores; judge what is actually rendered. ${RUBRIC}\nGames: ${JSON.stringify(b)}\nAlso write your JSON result to ${QDIR}/batch_${bi + 1}.json. Do not commit.`, { label: `rate:batch${bi + 1}`, phase: 'Rate', schema: RATE_SCHEMA })))
const ok = rated.filter(Boolean)
if (ok.length < batches.length) throw new Error(`Only ${ok.length}/${batches.length} rater batches finished - resume later`)

phase('Report')
const all = ok.flatMap(r => r.games)
const report = await agent(`${CTX}\n\nREPORT. You have ${all.length} rated games in ${QDIR}/batch_*.json and metrics in ${QDIR}/metrics.json; contact sheets in ${SHOTS}/sheets/. Also read ${ROOT}/docs/briefs/router.md (section 7.2 EOS_EMOTION_ROUTES) to know which existing games users will meet first for each emotion. Write ${ROOT}/docs/QUALITY_REPORT.md for the owner (clear, non-technical where possible, but specific):\n1. Headline verdict: how many of 110 are premium-ready today, average score per rubric axis, the 3 biggest cross-cutting gaps (e.g. shared backdrop reused across N games, characters static/absent in N games, generic shared finale burst in N games, phone layout issues in N games).\n2. Ranked table of all games (id, name, overall = mean of A-H, weakest axis, premium_ready, perf flags).\n3. Top 10 strongest with why.\n4. Bottom 20 weakest with the specific improvements required (from the raters, sharpened), effort S/M/L.\n5. Visual-duplicate clusters (games that look the same) and how to differentiate each (distinct environment / finale per game).\n6. Character integration audit: where the existing emotion characters appear, where they are static, concrete reaction animations to add (face changes on progress, squash on hits, celebration on finish).\n7. Performance outliers with the metric and likely cause.\n0. READINESS TABLE: counts of functional-ready / visual-ready / premium-ready / complete (all three) out of 110, and structural vs polish vs none. Note that games 111-114 are new and are reviewed separately in the build pipeline.\n8. PILOT PROPOSAL: pick 6-8 representative pilot games (one per look-alike cluster, the most-routed per emotion, a few of the weakest) with, for each, what structural + visual changes the pilot would make, which reusable systems it would exercise (character reaction layer, finale toolkit, lighting rig, sound cues), and why it is representative.\n9. POLISH PLAN prioritised by user impact: first the games most-routed for each emotion in EOS_EMOTION_ROUTES (users meet these first), then the weakest; group into reusable polish components where possible (e.g. one premium finale system with per-family variants, a character-reaction layer, environment kits) so improvements scale across games without making them identical; give an effort/token estimate per item and recommend what goes into Release 1 vs Release 2.\nThen commit docs/QUALITY_REPORT.md, ${QDIR}/batch_*.json. ${GIT}\nReturn a 15-line summary for the owner.`, { label: 'report:synthesize', phase: 'Report' })
return { captured: games.length, rated: all.length, summary: report }
