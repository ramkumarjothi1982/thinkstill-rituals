export const meta = {
  name: 'thinkstill-release-v2',
  description: 'Lean Release finish: close open review findings once, integrate I1-I3, fix every stalling/no-reveal game (UNFOLLOW first), one scripted regression of all 114 games + flows, targeted fixes, package the single .txt',
  phases: [
    { title: 'Close out', detail: 'one targeted fix pass for pieces with open serious findings' },
    { title: 'Integrate', detail: 'apply I1-I3 in place, smoke test' },
    { title: 'Unstick', detail: 'source fixes so every game completes (UNFOLLOW first), verified by playing them' },
    { title: 'Founder feedback', detail: 'fix every OPEN item in docs/founder/FEEDBACK_LOG.md, verified by playing' },
    { title: 'Regression', detail: 'scripted sweep of all 114 games at 390 + 1280 and the check-in flows' },
    { title: 'Fix', detail: 'targeted fixes for failures, re-run only failing games' },
    { title: 'Package', detail: 'single .txt + release notes' },
  ],
}

const ROOT = '/home/user/thinkstill-rituals/framer'
const DOCS = ROOT + '/docs'
const ST = DOCS + '/eos_status'
const DONE = new Set((args && args.done) || [])
const OPEN = (args && args.open) || {}   // {task: reviewFile} pieces whose latest review still has serious findings

const GIT = `Git: branch claude/jolly-hopper-ognrxj in /home/user/thinkstill-rituals. git add ONLY the paths you changed (never -A), message ends with exactly:\nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>\nClaude-Session: https://claude.ai/code/session_01SaGZSxDbxtpggsq88ET1Ri\nthen git push -u origin claude/jolly-hopper-ognrxj (on rejection pull --rebase then push; retry network errors 4x). No PRs, no model names anywhere.`
const CTX = `PROJECT: ThinkStill Release Console — Framer code component (React 18 + framer-motion, ONE file) built from src/00_arcade.jsx (original 110 games; 22.8k lines — never read whole: grep, then Read offset/limit) + src/eos/*.jsx (Emotional OS modules: check-in, router, arrows, readability, dots, mood, shift meter, rewards, safety, fixes, new games 111-114) + src/99_pixar.jsx. Build: cd ${ROOT} && python3 build.py (single file ThinkStillReleaseArcade_EOS_FULL.txt + dev/out.js). Integration edits are scripted in dev/eos_integrate.py (groups I1-I3; --check / --in-place --groups Ix). Test helpers: dev/drive.mjs (launch({dir,width,height})) and dev/eos_drive.mjs (launchEos, startGameById, finishGame, readProgress, runCheckin, ... usage at top). Tile screenshots with python3 dev/contact_sheet.py and Read the sheet. Chromium /opt/pw-browsers/chromium. Ignore agent-proxy noise.
OWNER POLICY (binding, docs/CREATIVE_STANDARDS.md "Delivery policy"): working games first; targeted gameplay testing instead of repeated review rounds; every game must complete without freezing, crashing or getting stuck on phone (390x844) and desktop (1280x860); NEVER remove existing functionality, animations, finales, sound, progress indicators or navigation; phone first. Do not touch src/pilot/ (Pilot A, separate) or anything outside framer/. Budget per agent: <= 90 tool calls, <= 10 image views; write progress notes to ${ST}/v2_<step>.progress.md every ~20 calls and read it first if it exists.`

const must = async (p, o) => { const r = await agent(p, o); if (r == null) throw new Error(`${o.label} returned nothing (limit/restart) - resume later`); return r }
const mark = (step, text) => agent(`Write the text between the markers EXACTLY to ${ST}/v2_${step}.done.md (overwrite), then git add that one file, commit "Release v2: ${step} done" and push. ${GIT}\n<<<BEGIN>>>\n${String(text).slice(0, 8000)}\n<<<END>>>`, { label: `mark:${step}`, model: 'haiku', effort: 'low' })

phase('Close out')
const openTasks = Object.entries(OPEN).filter(([t]) => !DONE.has(`close-${t}`))
await pipeline(openTasks, async ([t, file]) => {
  const r = await must(`${CTX}\n\nCLOSE OUT piece "${t}". Its latest two-reviewer review is ${file} (read it). Fix every blocker/major finding and every clearly-correct minor in the piece's own file(s) under src/eos/ (see ${ST}/${t}.build.md for which files). Verify each fix by actually running it in an isolated integrated build (python3 dev/eos_integrate.py --dev-dir /tmp/v2_${t} --modules <all src/eos files>) at 390 then 1280 — targeted tests only. Zero page errors. Commit only the files you changed + ${ST}/${t}.*. ${GIT} Return what you fixed and how you verified it (one line per finding).`, { label: `close:${t}`, phase: 'Close out' })
  await mark(`close-${t}`, r)
  return r
})

phase('Integrate')
if (!DONE.has('integrate')) {
  const r = await must(`${CTX}\n\nINTEGRATE. cd ${ROOT}; run python3 dev/eos_integrate.py --check, then apply in order: --in-place --groups I1, then I2, then I3 (each must report OK/SKIP, never BAD). Run python3 build.py. Smoke test the real build (dev/index.html via launch({dir: '${ROOT}/dev'})) at 390x844 and 1280x860: home check-in renders, run the check-in for panic, anger, anxiety and sad (runCheckin) and confirm the routed game starts; play POP (1), CRUSH (2), HOT POTATO (100), CLEANSE (109) and the four new games 111-114 to their reveal with finishGame; the shift meter appears after the reveal; the mic, + upload, sound toggle and LET THINKSTILL CHOOSE / manual game menu still work; zero page errors. Fix any integration breakage minimally. Commit src/00_arcade.jsx, src/99_pixar.jsx, ThinkStillReleaseArcade_EOS_FULL.txt and anything you fixed. ${GIT} Return results per check.`, { label: 'integrate:I1-I3', phase: 'Integrate' })
  await mark('integrate', r)
}

phase('Unstick')
const STALL_GROUPS = [
  { key: 'a', ids: [47, 34, 107, 8, 14, 17, 21, 28], note: 'UNFOLLOW (47) FIRST - it is the only jealousy route. Phone stalls caused by text selection / native drag / missing pointer capture, off-screen controls, hidden handles.' },
  { key: 'b', ids: [45, 48, 51, 71, 77, 103, 37, 63], note: 'stalls + broken progress' },
  { key: 'c', ids: [67, 68, 69, 96, 42, 70, 74, 109], note: 'progress reaches 100% but the reveal never fires, or progress logic broken; 109 CLEANSE may already be fixed - verify' },
]
for (const g of STALL_GROUPS) {
  if (DONE.has(`unstick-${g.key}`)) continue
  const r = await must(`${CTX}\n\nUNSTICK games ${g.ids.join(', ')} (${g.note}). Evidence from the quality audit: ${DOCS}/QUALITY_REPORT.md §0 and §9 W0-3 (grep each id), metrics ${DOCS}/quality/metrics.json (grep "id": N). For EACH game: reproduce with eos_drive finishGame at 390x844 and 1280x860 on the CURRENT build (python3 build.py first); find the root cause in src/00_arcade.jsx (grep the game's branch); make the smallest behaviour-preserving source fix (pointer capture, touch-action, user-select none, keep controls on screen, forgiving hit areas, correct progress/onDone hand-off) — never remove the game's mechanic, animation, sound or finale; rebuild and prove it completes on BOTH sizes (finishGame reaches the reveal, progress never goes backwards, zero errors). Note: a real human must be able to finish it too — if the auto-player needed a trick, make the real gesture easier instead. Commit src/00_arcade.jsx + the rebuilt .txt. ${GIT} Return a table: id | cause | fix | 390 result | 1280 result.`, { label: `unstick:${g.key}`, phase: 'Unstick' })
  await mark(`unstick-${g.key}`, r)
}

phase('Founder feedback')
if (!DONE.has('founder-feedback')) {
  const r = await must(`${CTX}\n\nFOUNDER FEEDBACK (highest priority). Read ${DOCS}/founder/FEEDBACK_LOG.md and fix EVERY item whose status is OPEN, in order. Also follow ${DOCS}/founder/FOUNDER_REQUIREMENTS.md and the founder rules at the end of ${DOCS}/CREATIVE_STANDARDS.md (bubble picture + user text below it INSIDE the bubble, no black masks, true circles, real-looking tools, approved bursts frozen except shared generic ones which get a game-specific burst). Make the fix structural where needed (e.g. measure the real bubble positions so strings attach). Rebuild (python3 build.py) and verify by PLAYING each fixed game to its finale at 390x844 then 1280x860; save before/after screenshots to ${DOCS}/founder/fix_<item>_*.png. Then set each item's status in FEEDBACK_LOG.md to FIXED (<commit>) with a one-line verification note (or NEEDS-APPROVAL with the reason if it would change an approved finale). Commit the source, the rebuilt .txt, the screenshots and the log. ${GIT} Return per item: what was wrong, what you changed, how you verified.`, { label: 'founder-feedback', phase: 'Founder feedback' })
  await mark('founder-feedback', r)
}

const SWEEP = (round, extra) => `${CTX}\n\nREGRESSION round ${round}. python3 build.py, then write ONE unattended node sweep (reuse dev/eos_drive.mjs) over ${extra || 'ALL games in the menu (110 + 111-114)'} at 390x844 and 1280x860: start, play to the reveal with finishGame (75 s cap), record finished/stuck, max progress, progress decreasing, page errors, arrow visible at start, and a START + FINISH screenshot (contact sheet per 20 games). Then the FLOWS at 390x844 (and spot-check 1280): check-in for every emotion -> routed game -> finish -> shift meter (after rating) -> reward / orb -> share card; skip check-in -> free typing -> manual pick; LET THINKSTILL CHOOSE; safety card for a self-harm phrase does not block play; sound toggle; mic and + buttons present. Look at the failure contact sheets yourself. Write ${DOCS}/regression_v2_r${round}.json and return: counts, the exact failing games/flows with cause hints. Do NOT edit src files.`
const FAILS = { type: 'object', properties: { pass: { type: 'number' }, fail: { type: 'number' }, failing_games: { type: 'array', items: { type: 'number' } }, failures: { type: 'array', items: { type: 'object', properties: { what: { type: 'string' }, size: { type: 'string' }, evidence: { type: 'string' }, hint: { type: 'string' } }, required: ['what', 'evidence'] } } }, required: ['pass', 'fail', 'failing_games', 'failures'] }

let failing = null
for (let round = 1; round <= 3; round++) {
  phase('Regression')
  const rep = await must(SWEEP(round, failing && failing.length ? `ONLY these previously failing games: ${failing.join(', ')} plus the flows` : null), { label: `regress:r${round}`, phase: 'Regression', schema: FAILS })
  log(`Regression r${round}: ${rep.pass} pass, ${rep.fail} fail; failing games ${rep.failing_games.join(', ') || 'none'}; ${rep.failures.length} failures`)
  if (!rep.failures.length) { failing = []; break }
  failing = rep.failing_games
  if (round === 3) break
  phase('Fix')
  const fx = await must(`${CTX}\n\nFIX regression failures (round ${round}). Fix each with the smallest behaviour-preserving change (src/00_arcade.jsx or the owning src/eos module), rebuild, and re-run ONLY the failing game/flow at the failing size to prove it now passes. Never remove functionality. Commit. ${GIT}\nFailures:\n${JSON.stringify(rep.failures, null, 1).slice(0, 14000)}`, { label: `fix:r${round}`, phase: 'Fix' })
  await mark(`fix-r${round}`, fx)
}

phase('Package')
const pkg = await must(`${CTX}\n\nPACKAGE. python3 build.py; confirm ThinkStillReleaseArcade_EOS_FULL.txt is one self-contained file (imports at top, exactly one export default, all original property controls + new ones, compiles). Final smoke at 390 and 1280 (check-in -> panic -> BIG SIGH -> reveal -> shift meter; POP; UNFOLLOW). Write ${DOCS}/RELEASE_NOTES_v1.md for the owner (plain language): how to paste into Framer, what is new, what was fixed (list the unstuck games), property controls, KNOWN ISSUES honestly (remaining failures: ${JSON.stringify(failing)}; premium polish of existing games pending Pilot A approval; real-device performance and audible sound to be confirmed on the owner's phone). Commit both. ${GIT} Return path, size, test results.`, { label: 'package', phase: 'Package' })
await mark('package', pkg)
return { failing, pkg }
