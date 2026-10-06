export const meta = {
  name: 'thinkstill-eos-build',
  description: 'Spec + critics, build every Emotional OS module and new game with dual review, integrate, full browser regression + adversarial review, fix until clean, package the single .txt',
  phases: [
    { title: 'Spec', detail: 'lead synthesises EOS_SPEC.md + build plan from the two designs and all research' },
    { title: 'Spec review', detail: '3 critics: user-ask coverage, code anchors/buildability, relief science + safety' },
    { title: 'Foundation', detail: 'freeze shared core + isolated preview harness' },
    { title: 'Build', detail: 'one builder per module / new game, isolated builds' },
    { title: 'Module review', detail: 'two reviewers per module (code + experience), fix loop' },
    { title: 'Integrate', detail: 'sequential surgical edits to 00_arcade.jsx / 99_pixar.jsx' },
    { title: 'Regression', detail: 'play every game + flows in a real browser (desktop, phone, reduced motion)' },
    { title: 'Adversarial review', detail: 'whole-product reviewers + skeptic verification of each finding' },
    { title: 'Fix', detail: 'single fixer applies confirmed findings, re-verify, loop until dry' },
    { title: 'Package', detail: 'final single .txt, release notes, commit + push' },
  ],
}

const ROOT = '/home/user/thinkstill-rituals/framer'
const SRC = ROOT + '/src/00_arcade.jsx'
const DOCS = ROOT + '/docs'
const ASK = args.ask
const COMMIT_RULE = `Git: work on branch claude/jolly-hopper-ognrxj in /home/user/thinkstill-rituals. When this prompt tells you to commit, run: git add framer && git commit -m "<clear message>" with the message ending in exactly these two trailer lines:\nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>\nClaude-Session: https://claude.ai/code/session_01SaGZSxDbxtpggsq88ET1Ri\nthen git push -u origin claude/jolly-hopper-ognrxj (retry up to 4x with 2/4/8/16s backoff on network errors). Never put model names anywhere else. Never create a PR.`

const CONTEXT = `
PROJECT CONTEXT:
- Product: "ThinkStill" — an emotional operating system. A Framer code component (React 18 + framer-motion, ONE single file pasted into Framer). Today: the user types/says a thought, picks (or lets ThinkStill pick) one of 110 "release" mini-games, their exact words become game objects they pop/crush/burn, then a reward/reveal.
- Repo ${ROOT}:
  * src/00_arcade.jsx — ORIGINAL arcade (~22,800 lines, owns imports). IMPORTANT routing fact: useLegacyGame sends ids 1-99 to GameEngineLegacy -> RoutedGameContentLegacy -> UniqueReleaseEngineLegacy (switch(game.id)); ids 100-110 use GameEngine -> RoutedGameContent -> UniqueReleaseEngine (109 -> CleanseEngine).
  * src/eos/*.jsx — Emotional OS modules, concatenated after the arcade in filename order, ONE shared file scope: NO import lines, every new top-level identifier prefixed Eos/EOS_/eos. Must not reference PX_B/pxNoise/PIXAR_CSS at module top level (99_pixar.jsx is evaluated after). src/eos/00_eos_core.jsx = shared core (store, storage keys eos_*, EOS_EMOTIONS, eosRegisterGame, EosGlobalStyle/eosCss, eosTarget, EOS_A/EOS_PX selector roots...). Read it before writing any module.
  * src/99_pixar.jsx — Pixar cinematic wrapper (light rig, bokeh, .tsPxDust motes, squash&stretch, Baloo 2) = the single export default ThinkStillReleaseArcadePixar.
  * build.py — full build: cd ${ROOT} && python3 build.py  (writes ThinkStillReleaseArcade_EOS_FULL.txt + dev/out.js). ISOLATED build for parallel work (never clobbers others; include only the modules you name): python3 build.py --dev-dir /tmp/eos_<yourtask> --modules 00_eos_core.jsx,<your files...>
  * dev/drive.mjs — Playwright helpers: launch({width,height,dir,reducedMotion}) -> {browser,page,errors}; listGames(page); startGame(page, NAME, text). Use dir:"/tmp/eos_<yourtask>" for isolated builds. Chromium at /opt/pw-browsers/chromium (never run playwright install). Write throwaway test scripts under /tmp, not in the repo (except reusable test tooling under dev/ when asked). Ignore "agent-proxy connect_rejected" noise.
- Research (read what is relevant): ${DOCS}/map_main.md (main component, stages, anchors), ${DOCS}/map_engine_hud.md (both game wrappers, HUD, guide, engine contract: onProgress takes 0-100, onDone(bonus) once, sfx("pop") is a function, explicit-progress list, root class "arena"), ${DOCS}/catalog_A.md + catalog_B.md (every game: gesture, target selector, emotion fit, weaknesses, wrong guide texts), ${DOCS}/audit_1.json, audit_2.json, audit_3.json (runtime audit of every game: tiny text selectors+px, primary targets, whether play registered, screenshots in ${ROOT}/dev/shots/audit/), ${DOCS}/design_relief.md (relief neuroscience + game-feel/dopamine/virality design), ${DOCS}/design_pixar.md (Pixar / Inside-Out world design).
`
const USER_ASK = `THE USER'S REQUEST (verbatim):\n"""${ASK}"""\nThe user explicitly asked for MAXIMUM quality and MAXIMUM review. Non-negotiable: do not omit or break ANY existing game or functionality (all 110 games, mic, image upload, sound, property controls, Pixar layer).`

const PLAN_SCHEMA = {
  type: 'object',
  properties: {
    tasks: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'short slug, e.g. arrows, checkin, game-breath' },
          title: { type: 'string' },
          kind: { type: 'string', enum: ['module', 'game'] },
          files: { type: 'array', items: { type: 'string' }, description: 'files this task exclusively owns, all under src/eos/ (or dev/ for test tooling)' },
          spec_sections: { type: 'string' },
          exports: { type: 'array', items: { type: 'string' } },
          acceptance: { type: 'string', description: 'concrete checks runnable in the isolated harness' },
        },
        required: ['id', 'title', 'kind', 'files', 'spec_sections', 'exports', 'acceptance'],
      },
    },
    integration_groups: {
      type: 'array',
      description: 'ordered, sequential integration steps that edit src/00_arcade.jsx and/or src/99_pixar.jsx',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          spec_sections: { type: 'string' },
          edits: { type: 'string', description: 'exact anchors + what to insert/replace' },
          acceptance: { type: 'string' },
        },
        required: ['id', 'title', 'spec_sections', 'edits', 'acceptance'],
      },
    },
  },
  required: ['tasks', 'integration_groups'],
}

const FINDINGS_SCHEMA = {
  type: 'object',
  properties: {
    verdict: { type: 'string', enum: ['ship', 'fix'] },
    findings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          severity: { type: 'string', enum: ['blocker', 'major', 'minor'] },
          area: { type: 'string' },
          file: { type: 'string' },
          evidence: { type: 'string', description: 'concrete repro / line / screenshot path' },
          fix: { type: 'string' },
        },
        required: ['severity', 'area', 'evidence', 'fix'],
      },
    },
  },
  required: ['verdict', 'findings'],
}

// ------------------------------------------------------------------ SPEC
phase('Spec')
const specPrompt = `${CONTEXT}\n${USER_ASK}\n\nYOU ARE THE LEAD. A previous attempt at this step was interrupted by a usage limit after drafting src/eos/00_eos_core.jsx (keep and refine it — it is good) and possibly a partial ${DOCS}/EOS_SPEC.md (overwrite/finish it). Read ${DOCS}/design_relief.md and ${DOCS}/design_pixar.md fully plus the research docs. Score both designs 1-10 on relief efficacy, fun/dopamine, Pixar/Inside-Out quality, first-time clarity, buildability; take the winner as backbone and graft the best of the other. Write ${DOCS}/EOS_SPEC.md with sections:\n1 Scores + rationale\n2 Experience overview (open app -> check-in -> matched relief game -> shift meter -> reward/share), step by step\n3 Guide arrows: EosGuideArrows overlay mounted once beside .releaseGameHost (covers both wrappers), per-gesture behaviour (tap/rapid-tap/hold/drag/swipe/slingshot/trace/rhythm/choose/tool-first), a per-game override table for ALL 110 ids built from the audits (target selector, gesture, short 2-4 word instruction, CORRECTED where the current guide text describes the wrong gesture), hide/fade rules (after first successful interaction, re-show on idle 4s, quieter for veterans), reduced motion, phone layout\n4 Readability: exact CSS overrides (selectors + min px: nothing a user must read below 12px desktop / 11px phone; HUD sparks/tokens/LVL/progress >= 13-14px), the 390px HUD overflow fix, the dead bubbleTextPx prop\n5 Converging background dots: ALL visible tiny dots (.tsPxDust, .cinemaDust, infinityField if made visible, any others found in the audit) drift and merge into the centre continuously (hypnotic gathering vortex), reduced-motion fallback\n6 Emotion check-in (overlay flag, not a new stage), intensity 1-10, optional words/voice, Inside-Out style emotion characters, NOT SURE option; emotion-aware router; before/after shift meter; how it hands words + emotion + game to the arcade (exact anchors)\n7 EOS_EMOTION_ROUTES object literal (every emotion -> ordered game ids incl. new ones; fix the emotion regexes e.g. "panicking")\n8 NEW games (the best 6-8; must cover panic breathing (physiological sigh), anger discharge->cool-down, anxiety grounding, sadness/loneliness comfort & warmth, shame->self-kindness, overthinking defusion, numbness up-regulation): for each a ready-to-paste GAMES entry (id 111+, all fields), engine name, mechanic, controls, <=45s win, juice, science, file src/eos/2x_eos_game_<slug>.jsx, registration via eosRegisterGame\n9 Rewards / healthy habit loop (streak w/o punishment, memory orbs collection, character bonds, mastery), share card ("I shifted ANGER 8->2 in 40s") rendered client-side, no dark patterns\n10 Safety card (keyword list incl. self-harm/suicide/abuse, gentle non-clinical copy, placeholder crisis line text the owner can edit via a property control, never blocks play)\n11 Existing-game fixes that improve guidance/relief WITHOUT removing anything: wrong guide texts, progress bar jumping backwards (make reported progress monotonic), hidden-order games that silently ignore taps (show which one next), tool-first games (arrow to the tool button first), 6x repeated words for short inputs — implemented as data tables/functions in eos modules and wired by integrators\n12 BUILD PLAN: independent tasks (each owns distinct files under src/eos/ — modules like 10_eos_readability.jsx, 12_eos_dots.jsx, 30_eos_arrows.jsx, 40_eos_checkin.jsx, 45_eos_router.jsx, 50_eos_rewards.jsx, 55_eos_safety.jsx, 60_eos_fixes.jsx, and one file per new game 2x_...) plus 2-4 ORDERED integration groups that are the ONLY steps allowed to edit src/00_arcade.jsx and src/99_pixar.jsx, each with exact unique anchors (verify with grep -c) and acceptance checks.\nAlso refine src/eos/00_eos_core.jsx so every module task has what it needs (shared store, register API, CSS helper, emotion list, preview helpers). Run python3 ${ROOT}/build.py to make sure everything compiles. Return the BUILD PLAN as JSON.`
let plan = await agent(specPrompt, { label: 'lead:spec', phase: 'Spec', schema: PLAN_SCHEMA })

phase('Spec review')
const CRITICS = [
  { key: 'asks', lens: 'USER-ASK COVERAGE + EXPERIENCE: check the spec item by item against the user request (arrows in EVERY game, tiny text e.g. score/sparks readable, ALL background dots merge to centre, all games reviewed + new games, emotion-first instant relief for panic/anger/anxiety etc, non-clinical dopamine flip negative->positive, healthy addictive loop, viral share, hypnotic, Pixar / Inside-Out quality). Flag anything vague, missing, boring, or that would feel like therapy homework.' },
  { key: 'build', lens: 'BUILDABILITY: verify every anchor string the spec relies on exists EXACTLY once in src/00_arcade.jsx / src/99_pixar.jsx (grep -c), every referenced helper exists with the stated signature, game ids exist, the engine props contract matches both wrappers (legacy 1-99 and new 100+), task file ownership is disjoint, only integration groups touch 00_arcade.jsx/99_pixar.jsx, no module uses PX_B/pxNoise at top level, nothing removes existing functionality (property controls, mic, uploads, sound, all 110 games).' },
  { key: 'science', lens: 'RELIEF SCIENCE + SAFETY + ETHICS: does each emotion get a mechanic that really shifts that state fast (down-regulation for panic/anger/anxiety, up-regulation for sadness/numbness/loneliness, defusion for overthinking, self-kindness for shame)? Are timings right (e.g. physiological sigh = double inhale + long exhale, exhale longer than inhale)? Is the safety card correct and non-blocking? Any dark patterns (guilt, loss-aversion, infinite loops without exits, storing user text)? Accessibility (reduced motion, contrast, touch targets >=44px, screen-reader labels).' },
]
const critiques = await parallel(CRITICS.map(c => () =>
  agent(`${CONTEXT}\n${USER_ASK}\n\nYou are a critic. Read ${DOCS}/EOS_SPEC.md and src/eos/00_eos_core.jsx. LENS: ${c.lens}\nWrite ${DOCS}/EOS_SPEC_CRITIQUE_${c.key}.md listing every issue with the exact fix. Return the list concisely.`,
    { label: `critic:${c.key}`, phase: 'Spec review' }).then(r => ({ key: c.key, text: r }))))
const critText = critiques.filter(Boolean).map(c => `## ${c.key}\n${c.text}`).join('\n\n')
const revised = await agent(`${CONTEXT}\n${USER_ASK}\n\nYou are the lead. Apply EVERY valid fix from the critiques (${CRITICS.map(c => `${DOCS}/EOS_SPEC_CRITIQUE_${c.key}.md`).join(', ')}) to ${DOCS}/EOS_SPEC.md and src/eos/00_eos_core.jsx in place (re-grep anchors). Reject only critiques you can prove wrong, noting why at the end of EOS_SPEC.md. Run python3 ${ROOT}/build.py. Then commit ("EOS spec + core"). ${COMMIT_RULE}\nCritiques:\n${critText}\n\nReturn the final BUILD PLAN as JSON.`, { label: 'lead:revise-spec', phase: 'Spec review', schema: PLAN_SCHEMA })
if (revised && revised.tasks && revised.tasks.length) plan = revised
if (!plan || !plan.tasks || !plan.tasks.length) throw new Error('No build plan produced')
log(`Build plan: ${plan.tasks.length} tasks, ${plan.integration_groups.length} integration groups`)

// ------------------------------------------------------------------ FOUNDATION
phase('Foundation')
await agent(`${CONTEXT}\n${USER_ASK}\n\nFOUNDATION. Read ${DOCS}/EOS_SPEC.md. (1) Finalise src/eos/00_eos_core.jsx so it fully supports these tasks: ${JSON.stringify(plan.tasks.map(t => ({ id: t.id, exports: t.exports, files: t.files })))} — after this step it is FROZEN for module builders. (2) Create reusable test tooling: ${ROOT}/dev/eos_drive.mjs exporting helpers on top of drive.mjs: startGameById(page, id, text) (works for new ids 111+ too once registered, falling back to name), openCheckin(page), runCheckin(page, {emotion, intensity, words}), finishGame(page, {timeoutMs}) that tries to complete any game generically (tap/hold/drag the guide-arrow target or common targets until progress reaches 100 or reveal shows), readProgress(page), smallText(page, minPx) returning offenders, arrowState(page) returning {visible, targetSelector, targetInViewport}. And a standalone preview: ${ROOT}/dev/eos_preview.html + eos_preview.jsx that mounts a single Eos game engine (by id from ?id=) with mock props {game, entries, onDone, sfx, reduced, onProgress} OUTSIDE the arcade, built via a small python helper dev/eos_preview.py --dev-dir /tmp/eos_x --modules ... so new games can be tested before integration. Document usage at the top of each file. Validate: python3 build.py passes, a smoke test of POP via eos_drive works. Commit ("EOS foundation: core + test tooling"). ${COMMIT_RULE} Return a short summary of the helper APIs.`, { label: 'foundation', phase: 'Foundation' })

// ------------------------------------------------------------------ BUILD + MODULE REVIEW (pipelined)
const REVIEW_LENSES = [
  { key: 'code', text: 'CODE CORRECTNESS: React hooks rules, cleanup of timers/listeners/rAF, no memory leaks, no top-level PX_B/pxNoise, identifier collisions with 00_arcade.jsx (grep every new top-level name in src/00_arcade.jsx and other src/eos files), pointer events on touch + mouse, works at 390px and 1280px, prefers-reduced-motion path, no user text persisted, performance (no layout thrash, <=60 animated nodes), spec conformance (exports/contract exactly as EOS_SPEC.md).' },
  { key: 'experience', text: 'EXPERIENCE QUALITY: take screenshots at several moments (start, mid, finish) desktop + phone and LOOK at them (Read the png). Judge against: Pixar / Inside-Out cinematic quality (warm light, characterful, squash & stretch, glow), instantly understandable with zero reading (arrow/cue obvious), juicy dopamine feedback, the specific relief mechanic actually delivered (timings, pacing), text readable (>=12px), finishes in <=45s, feels like play not therapy.' },
]
const eosFiles = (t) => t.files.filter(f => f.endsWith('.jsx') && !f.includes('dev/')).map(f => f.split('/').pop()).join(',')
const buildOne = (t) => agent(`${CONTEXT}\n${USER_ASK}\n\nBUILD TASK "${t.id}": ${t.title}\nYou exclusively own: ${t.files.join(', ')} (create them; do NOT edit any other src file — 00_eos_core.jsx is frozen, 00_arcade.jsx/99_pixar.jsx are for integrators only; if you need something from them, expose a hook/function/data the integrator can wire and describe it in your report).\nImplement exactly ${DOCS}/EOS_SPEC.md sections: ${t.spec_sections}. Exports: ${t.exports.join(', ')}.\nQuality bar: production-grade, Pixar / Inside-Out cinematic polish, juicy, zero-reading clarity, phone + desktop, reduced motion, no dark patterns.\nTest in isolation: python3 ${ROOT}/build.py --dev-dir /tmp/eos_${t.id} --modules 00_eos_core.jsx,${eosFiles(t).join(',')} ; for games also use the dev/eos_preview tooling; run the acceptance checks: ${t.acceptance}. Take screenshots into ${ROOT}/dev/shots/eos/${t.id}_*.png and LOOK at them; iterate until it looks and plays great. Ensure zero page errors. Do NOT commit (parallel builders). Final answer: what you built, exports, anything the integrator must wire (exact), screenshots paths, known limitations.`, { label: `build:${t.id}`, phase: 'Build' })

const reviewAndFix = async (buildReport, t) => {
  let report = buildReport
  for (let round = 1; round <= 3; round++) {
    const reviews = (await parallel(REVIEW_LENSES.map(L => () =>
      agent(`${CONTEXT}\n${USER_ASK}\n\nREVIEW task "${t.id}" (${t.title}), round ${round}. Files: ${t.files.join(', ')}. Spec sections: ${t.spec_sections}. Builder's report:\n${report}\n\nLENS: ${L.text}\nBuild in isolation yourself (python3 ${ROOT}/build.py --dev-dir /tmp/eos_rev_${t.id}_${L.key} --modules 00_eos_core.jsx,${eosFiles(t).join(',')}) and actually run/play it in the browser. Do NOT edit files. verdict "ship" only if there is no blocker/major finding.`,
        { label: `review:${t.id}:${L.key}:r${round}`, phase: 'Module review', schema: FINDINGS_SCHEMA })))).filter(Boolean)
    const serious = reviews.flatMap(r => r.findings.filter(f => f.severity !== 'minor'))
    const minor = reviews.flatMap(r => r.findings.filter(f => f.severity === 'minor'))
    if (!serious.length && round > 1) return { id: t.id, report, rounds: round, open: minor }
    if (!serious.length && !minor.length) return { id: t.id, report, rounds: round, open: [] }
    report = await agent(`${CONTEXT}\n${USER_ASK}\n\nFIX task "${t.id}" (${t.title}). You own ONLY: ${t.files.join(', ')}. Apply every finding below (blockers and majors mandatory; minors too unless clearly wrong — say why). Re-test in isolation (python3 ${ROOT}/build.py --dev-dir /tmp/eos_${t.id} --modules 00_eos_core.jsx,${eosFiles(t).join(',')}), re-screenshot and LOOK. Do NOT commit.\nFindings:\n${JSON.stringify([...serious, ...minor], null, 1)}\n\nReturn an updated builder report (same format as before) listing what changed.`, { label: `fix:${t.id}:r${round}`, phase: 'Module review' })
  }
  return { id: t.id, report, rounds: 3, open: [] }
}

const built = (await pipeline(plan.tasks, (_, t) => buildOne(t), (rep, t) => reviewAndFix(rep, t))).filter(Boolean)
log(`Built + reviewed ${built.length}/${plan.tasks.length} tasks`)

// ------------------------------------------------------------------ INTEGRATE (sequential)
phase('Integrate')
const builtReports = built.map(b => `### ${b.id}\n${b.report}\n${b.open && b.open.length ? 'Open minor notes: ' + JSON.stringify(b.open) : ''}`).join('\n\n')
for (const g of plan.integration_groups) {
  await agent(`${CONTEXT}\n${USER_ASK}\n\nINTEGRATION STEP "${g.id}": ${g.title}. You are the only agent editing src/00_arcade.jsx / src/99_pixar.jsx right now. Spec sections: ${g.spec_sections}. Planned edits:\n${g.edits}\n\nModule builders' reports (what each exposes and needs wired):\n${builtReports}\n\nRules: surgical edits with unique anchors (grep -c == 1 before each replacement); never delete existing games, controls or features; keep input.releaseThoughtInput / button.releaseChoiceButton / button.releaseChoiceItem working; preserve the single export default. Run the FULL build (cd ${ROOT} && python3 build.py), then acceptance: ${g.acceptance}; plus a smoke test: the input stage loads, POP, CRUSH (legacy wrapper) and a 100+ game start without page errors, and every new game id starts. Screenshot to ${ROOT}/dev/shots/eos/integrate_${g.id}_*.png and LOOK. Commit ("EOS integrate: ${g.title}"). ${COMMIT_RULE} Return what you wired and test results.`, { label: `integrate:${g.id}`, phase: 'Integrate' })
}

// ------------------------------------------------------------------ REGRESSION + ADVERSARIAL REVIEW, loop until clean
const REG_CHUNKS = [[0, 30], [30, 60], [60, 90], [90, 400]]
const FLOWS = `Flows to test end to end (desktop 1280x860 AND phone 390x844, plus one pass with reducedMotion): open app -> emotion check-in for EACH emotion in EOS_EMOTIONS (choose emotion, intensity, optional words) -> routed game starts and matches EOS_EMOTION_ROUTES -> play to finish (eos_drive finishGame) -> shift meter (after rating) -> reward / memory orb / streak -> share card renders -> next. Also: skipping the check-in still allows the old free-typing flow and manual game picking; LET THINKSTILL CHOOSE works; safety card appears for a self-harm phrase and does not block play; mic and image-upload buttons still present; sound toggle works; Framer property controls object still contains every original control.`
const regressionRound = (round) => parallel([
  ...REG_CHUNKS.map(([a, b]) => () => agent(`${CONTEXT}\n${USER_ASK}\n\nREGRESSION round ${round}, games [${a}, ${b}) of the full ordered list (use listGames; include new games). Full build first if ${ROOT}/dev/out.js is older than any src file (cd ${ROOT} && python3 build.py) — do not edit src files. For EACH game at 1280x860 (and every 3rd game also at 390x844): start it, record page errors; check the guide arrow overlay is visible and its target exists, is visible and inside the viewport; list text a user must read that is < 12px (desktop) / < 11px (phone); try to play to completion with eos_drive finishGame (record max progress reached and whether reveal/finish happened within 60s); check progress never decreases; check the background dots are converging toward centre (sample .tsPxDust / .cinemaDust positions at two times: distance to centre should shrink); screenshot to ${ROOT}/dev/shots/regression/r${round}_<name>.png. Write ${DOCS}/regression_r${round}_${a}.json. Do NOT edit src files.`,
    { label: `regress:r${round}:[${a}-${b})`, phase: 'Regression', schema: FINDINGS_SCHEMA })),
  () => agent(`${CONTEXT}\n${USER_ASK}\n\nFLOW REGRESSION round ${round}. ${FLOWS} Screenshot every step to ${ROOT}/dev/shots/regression/r${round}_flow_*.png and LOOK at them. Do NOT edit src files. Report every failure as a finding.`, { label: `regress:r${round}:flows`, phase: 'Regression', schema: FINDINGS_SCHEMA }),
])
const ADV_LENSES = [
  { key: 'regressions', text: 'LOST/BROKEN FUNCTIONALITY + BUGS: diff src/00_arcade.jsx and src/99_pixar.jsx against git commit fd4cd72 (git diff fd4cd72 -- framer/src). Verify nothing existing was removed or broken (all 110 GAMES entries intact, all property controls, mic, uploads, sounds, legacy + new wrappers, reveal flow). Hunt for real bugs in every src/eos module and every integration edit: stale closures, missing cleanup, race conditions between check-in and stage changes, localStorage failures, SSR/Framer canvas safety (window/document guards at module top level), z-index/pointer-events overlays blocking play.' },
  { key: 'experience', text: 'WHOLE-PRODUCT EXPERIENCE vs the user\'s vision: play the full journey for panic, anger, anxiety, sadness, overthinking on desktop and phone; LOOK at screenshots. Is it instantly clear (arrows everywhere), readable, hypnotic, juicy, Pixar / Inside-Out quality, does it deliver a felt negative->positive flip in under a minute, is the healthy loop compelling and the share card viral-worthy, and does it NEVER feel like boring therapy? Be demanding; propose concrete changes.' },
  { key: 'safety', text: 'SAFETY, ETHICS, ACCESSIBILITY, PERFORMANCE: safety card triggers on self-harm/suicide/abuse phrases (test several phrasings) and never blocks; no user text stored in localStorage; no dark patterns; reduced motion honoured everywhere new; contrast; touch targets >= 44px; keyboard focus on check-in; animation cost (count animated nodes, check frame time with performance.now sampling during play) on phone viewport.' },
]
const adversarialRound = (round) => parallel(ADV_LENSES.map(L => () => agent(`${CONTEXT}\n${USER_ASK}\n\nADVERSARIAL REVIEW round ${round}. LENS: ${L.text}\nUse the full build (cd ${ROOT} && python3 build.py if stale). Do NOT edit src files. Only report findings you have evidence for.`, { label: `adversarial:r${round}:${L.key}`, phase: 'Adversarial review', schema: FINDINGS_SCHEMA })))

const VERDICT = { type: 'object', properties: { real: { type: 'boolean' }, reason: { type: 'string' } }, required: ['real', 'reason'] }
let round = 0, clean = false, lastOpen = []
while (round < 4 && !clean) {
  round++
  const [reg, adv] = await parallel([() => regressionRound(round), () => adversarialRound(round)])
  const all = [...(reg || []), ...(adv || [])].filter(Boolean).flatMap(r => r.findings || [])
  const serious = all.filter(f => f.severity !== 'minor')
  const minor = all.filter(f => f.severity === 'minor')
  log(`Round ${round}: ${serious.length} blocker/major, ${minor.length} minor findings`)
  // skeptic verification of serious findings (refute if not reproducible)
  const verified = (await parallel(serious.map((f, i) => () => agent(`${CONTEXT}\n\nSKEPTIC: try to REFUTE this finding by reproducing it against the current full build (do not edit src). If you cannot reproduce it or it is not actually a problem for the user, real=false. Finding:\n${JSON.stringify(f, null, 1)}`, { label: `verify:r${round}:${i}`, phase: 'Adversarial review', schema: VERDICT, effort: 'medium' }).then(v => (v && v.real ? f : null))))).filter(Boolean)
  const toFix = [...verified, ...minor]
  lastOpen = toFix
  if (!verified.length && (round > 1 || !minor.length)) { clean = true; break }
  phase('Fix')
  await agent(`${CONTEXT}\n${USER_ASK}\n\nFIXER round ${round}. You may edit any file under ${ROOT}/src (carefully; keep edits minimal and never remove existing functionality). Apply ALL verified blocker/major findings and every minor finding that is clearly correct (list skipped ones with reasons). After fixing: full build (cd ${ROOT} && python3 build.py), re-run the specific repro for each finding, and a smoke test (input stage, POP, CRUSH, a 100+ game, every new game, the check-in flow). Commit ("EOS fixes round ${round}"). ${COMMIT_RULE}\nFindings:\n${JSON.stringify(toFix, null, 1)}`, { label: `fixer:r${round}`, phase: 'Fix' })
}

// ------------------------------------------------------------------ PACKAGE
phase('Package')
const pkg = await agent(`${CONTEXT}\n${USER_ASK}\n\nPACKAGE. (1) cd ${ROOT} && python3 build.py — confirm ThinkStillReleaseArcade_EOS_FULL.txt is ONE self-contained file: starts with the React/framer/framer-motion imports, exactly one export default (ThinkStillReleaseArcadePixar), addPropertyControls present with ALL original controls + new ones, compiles with esbuild (externals framer, react, framer-motion). (2) Final smoke test in the harness: input stage, check-in -> panic -> game -> finish -> shift meter, POP, every new game; zero page errors. (3) Count GAMES at runtime (must be >= 110 + new). (4) Write ${DOCS}/EOS_RELEASE_NOTES.md for the owner (non-technical): how to paste into Framer, what is new (arrows, readability, converging dots, check-in, routing, new games with names, rewards, share card, safety card + where to edit crisis line text), new property controls, what was fixed in existing games, known limitations. (5) Commit ("EOS: final packaged single-file build") and push. ${COMMIT_RULE}\nUnresolved items from the last review round (mention honestly in known limitations if not fixed): ${JSON.stringify(lastOpen).slice(0, 6000)}\nReturn: file path, size, games count, test results, and the release notes summary.`, { label: 'package', phase: 'Package' })

return { tasks: plan.tasks.map(t => t.id), rounds: round, clean, open: lastOpen, pkg }
