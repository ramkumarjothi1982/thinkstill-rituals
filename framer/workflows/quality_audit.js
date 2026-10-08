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
const cap = await agent(`${CTX}\n\nCAPTURE (scripted, unattended). 1) Build an isolated BASELINE (core only, no in-progress modules): cd ${ROOT} && python3 build.py --dev-dir /tmp/quality_base --modules 00_eos_core.jsx . 2) Write ONE node script /tmp/quality/sweep.mjs that, for every game in listGames order (all 110), at 1280x860 AND 390x844, using text "my boss yelled at me and I feel panic": starts the game; waits 2.5 s and saves START screenshot; then plays it with eos_drive's finishGame-style interaction but captures a MID screenshot at the first moment progress >= 40% (or after 12 s of play if progress cannot be read), then continues to the finish and saves FINISH (the moment the finish/reward fires) and REVEAL (2.5 s into the reveal) screenshots; caps each game at 75 s. During play, sample animation smoothness for 3 s with requestAnimationFrame (frame interval p50/p95/max ms, count of frames > 50 ms) and record long tasks via PerformanceObserver; record performance.memory.usedJSHeapSize at start and end (MB) and DOM node count; record page errors. Save PNGs to ${SHOTS}/<id>_<w>_<moment>.png (id = the game's GAMES id; resolve it from the name via window GAMES if exposed or from the source GAMES array), and metrics to ${QDIR}/metrics.json (array of {id,name,size,progressMax,finished,secondsToFinish,frame:{p50,p95,max,over50},longTasks,heapStartMB,heapEndMB,domNodes,errors}). Run two browser workers in parallel (split the list) to halve wall time; restart the browser every 20 games to avoid leaks; continue on per-game failure. 3) Then for every game build one contact sheet ${SHOTS}/sheets/<id>.png with the 8 shots (desktop start/mid/finish/reveal on row 1, phone on row 2): python3 ${ROOT}/dev/contact_sheet.py <out> <8 pngs> --cols 4 --width 2000. 4) Sanity-check by viewing 2 sheets yourself. 5) Commit ${QDIR}/metrics.json and the sheets directory only (not the raw PNGs). ${GIT}\nReturn: count of games captured per size, games that failed/never finished, top 10 worst p95 frame times and heap growth, and the ordered list of game ids with their names as JSON at the end of your answer (format: IDS_JSON=[{"id":1,"name":"POP"},...]).`, { label: 'capture:sweep', phase: 'Capture' })
if (!cap) throw new Error('capture failed (likely usage limit) - resume later')
const m = cap.match(/IDS_JSON=(\[[\s\S]*?\])/)
let games = []
try { games = m ? JSON.parse(m[1]) : [] } catch (e) { games = [] }
if (games.length < 100) { games = Array.from({ length: 110 }, (_, i) => ({ id: i + 1, name: '' })) ; log('Could not parse game list; falling back to ids 1-110') }
log(`Captured ${games.length} games`)

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
PREMIUM_READY = true only if every axis >= 8 and no perf flag.`
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
          premium_ready: { type: 'boolean' },
          perf_flags: { type: 'array', items: { type: 'string' } },
          looks_like: { type: 'string', description: 'which other games it is visually near-identical to (ids), if any' },
          strengths: { type: 'string' },
          problems: { type: 'string', description: 'specific, visible problems with screenshot evidence (which tile)' },
          improvements: { type: 'array', items: { type: 'string' }, description: 'concrete, implementable changes (what to draw/animate/change), most impactful first' },
          effort: { type: 'string', enum: ['S', 'M', 'L'] },
        },
        required: ['id', 'name', 'scores', 'premium_ready', 'perf_flags', 'strengths', 'problems', 'improvements', 'effort'],
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
const report = await agent(`${CTX}\n\nREPORT. You have ${all.length} rated games in ${QDIR}/batch_*.json and metrics in ${QDIR}/metrics.json; contact sheets in ${SHOTS}/sheets/. Also read ${ROOT}/docs/briefs/router.md (section 7.2 EOS_EMOTION_ROUTES) to know which existing games users will meet first for each emotion. Write ${ROOT}/docs/QUALITY_REPORT.md for the owner (clear, non-technical where possible, but specific):\n1. Headline verdict: how many of 110 are premium-ready today, average score per rubric axis, the 3 biggest cross-cutting gaps (e.g. shared backdrop reused across N games, characters static/absent in N games, generic shared finale burst in N games, phone layout issues in N games).\n2. Ranked table of all games (id, name, overall = mean of A-H, weakest axis, premium_ready, perf flags).\n3. Top 10 strongest with why.\n4. Bottom 20 weakest with the specific improvements required (from the raters, sharpened), effort S/M/L.\n5. Visual-duplicate clusters (games that look the same) and how to differentiate each (distinct environment / finale per game).\n6. Character integration audit: where the existing emotion characters appear, where they are static, concrete reaction animations to add (face changes on progress, squash on hits, celebration on finish).\n7. Performance outliers with the metric and likely cause.\n8. POLISH PLAN prioritised by user impact: first the games most-routed for each emotion in EOS_EMOTION_ROUTES (users meet these first), then the weakest; group into reusable polish components where possible (e.g. one premium finale system with per-family variants, a character-reaction layer, environment kits) so improvements scale across games without making them identical; give an effort/token estimate per item and recommend what goes into Release 1 vs Release 2.\nThen commit docs/QUALITY_REPORT.md, ${QDIR}/batch_*.json. ${GIT}\nReturn a 15-line summary for the owner.`, { label: 'report:synthesize', phase: 'Report' })
return { captured: games.length, rated: all.length, summary: report }
