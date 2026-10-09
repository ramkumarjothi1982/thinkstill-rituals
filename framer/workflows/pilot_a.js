export const meta = {
  name: 'thinkstill-pilot-a',
  description: 'Pilot A (POP, CLEANSE, CRUSH): design + critique, shared premium systems, rebuild the 3 games with in-world characters and unique finales, dual review to >=8/10, then the owner approval package (screens, playable build, videos, latency, sound sync)',
  phases: [
    { title: 'Design', detail: 'pilot spec: shared systems API + beat-by-beat game designs; 2 critics; revise' },
    { title: 'Systems', detail: 'character reaction layer, finale sequencer, environment + lighting kit, sound cues + sync log, gesture helpers' },
    { title: 'Games', detail: 'POP, CLEANSE, CRUSH rebuilt as pilot engines; code + experience review to >=8 on every axis' },
    { title: 'Package', detail: 'before/after screens, playable build, recordings, latency, sound sync, explainer, independent re-score' },
  ],
}

const ROOT = '/home/user/thinkstill-rituals/framer'
const DOCS = ROOT + '/docs'
const PDIR = DOCS + '/pilot'
const ST = PDIR + '/status'
const MEDIA = PDIR + '/media'
const DONE = new Set((args && args.done) || [])

const GIT = `Git: branch claude/jolly-hopper-ognrxj in /home/user/thinkstill-rituals. ANOTHER workflow (the release build) is committing in parallel: git add ONLY the exact paths you own (never -A/-u/.), on index.lock wait 5 s and retry, message ends with exactly:\nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>\nClaude-Session: https://claude.ai/code/session_01SaGZSxDbxtpggsq88ET1Ri\nthen git push -u origin claude/jolly-hopper-ognrxj (on rejection: git pull --rebase origin claude/jolly-hopper-ognrxj, then push; retry network errors 4x with 2/4/8/16 s). No PRs, no model names anywhere.`

const CTX = `PROJECT: ThinkStill Release Console — a Framer code component (React 18 + framer-motion, ONE file) of emotional-release mini-games. The owner wants a PREMIUM Pixar / Netflix-quality interactive experience on MOBILE first.
BINDING (read first, in this order): ${DOCS}/founder/CINEMATIC_REDESIGN_DIRECTIVE.md (the founder's redesign directive — premium game-studio bar, §14 quality challenge), ${DOCS}/founder/FOUNDER_REQUIREMENTS.md (incl. addenda), ${DOCS}/founder/FEEDBACK_LOG.md (F8 default bubble pictures etc.), ${DOCS}/CREATIVE_STANDARDS.md: characters are ACTIVE in-world participants that react to every player action and transform with progress (designed into the game's state machine, not overlays); each game has its OWN spectacular finale (the shared calm colour shift / flip-word bloom only as a supplement); look-alike games get different gameplay; bubble image rules (circular images, no black masks/boxes, readable text BELOW the image, no overlap, nothing clipped); cinematic and immersive; never remove features (progress indicators, sound, navigation, guide arrows, the user's own words); phone 390x844 first, desktop 1280x860 second.
EVIDENCE OF TODAY'S STATE: ${DOCS}/QUALITY_REPORT.md (§1 gaps, §6 character audit, §8 pilot designs for P1 POP, P3 CLEANSE, P5 CRUSH, §9 shared systems S1-S6), rater JSON ${DOCS}/quality/batch_*.json (grep the game id), contact sheets ${ROOT}/dev/shots/quality/sheets/<id>.png (1 POP, 109 CLEANSE, 2 CRUSH), raw shots ${ROOT}/dev/shots/quality/<id>_<w>_<moment>.png, catalog rows in ${DOCS}/catalog_A.md / catalog_B.md.
CODE: src/00_arcade.jsx (22.8k lines — NEVER read whole; grep then Read with offset/limit). POP (id 1) and CRUSH (id 2) run in the legacy wrapper GameEngineLegacy -> RoutedGameContentLegacy -> UniqueReleaseEngineLegacy branches; CLEANSE (id 109) runs in GameEngine -> RoutedGameContent -> CleanseEngine (~line 6143). Engine props contract: {game, entries, onDone(bonus) once, sfx(kind) function, reduced, onProgress(0..100 monotonic), ...}; root element class "arena". Release modules in src/eos/*.jsx (core 00_eos_core.jsx: EOS store, eosTone, pacer/breath, haptics, eosCss/EosGlobalStyle, EOS_EMO faces via eosFace/eosFaceFor; arrows 30_eos_arrows.jsx target per-game selectors in EOS_GESTURES — your pilot must expose matching targets or register its own arrow targets; mood 14 and dots 12 modules run on every game). Grep them; do not edit them.
PILOT RULES: pilot code lives ONLY in ${ROOT}/src/pilot/*.jsx (no imports, every top-level name prefixed EosPilot/eosPilot/EOS_PILOT). It never edits src/00_arcade.jsx or src/eos/. 70_pilot_core.jsx defines function EosPilotEngineFor(game) (returns the pilot engine for ids 1, 2, 109 when the pilot switch is on; ?pilot=off or localStorage eos_pilot=off returns null so the original game plays — keep that switch). Build + run: python3 ${ROOT}/dev/pilot_build.py --dev-dir /tmp/pilot_<you>  then Playwright via ${ROOT}/dev/drive.mjs launch({dir:'/tmp/pilot_<you>', width, height}) and ${ROOT}/dev/eos_drive.mjs helpers (startGameById, finishGame...). Screenshots: tile with python3 ${ROOT}/dev/contact_sheet.py OUT.png <pngs> --cols 4 and Read the sheet (never Read PNGs one by one). Budget: <=80 tool calls, <=12 image views per agent; write progress notes to ${ST}/<step>.progress.md every ~20 calls and read it first if it exists. Ignore "agent-proxy connect_rejected" noise. Another workflow is using the CPU in parallel: keep browser runs lean.`

const RUBRIC = `RUBRIC (1-10, phone first; 10 = genuinely premium Pixar / Netflix level): A light & polish, B distinct world, C interaction feel & juice, D characters as active participants, E unique finale, F clarity, G mobile layout, H relief fit. TARGET: every axis >= 8, no perf flag, bubble rules pass, all features preserved. Cite the screenshot/recording moment for every score <= 7.`

const FIND = {
  type: 'object',
  properties: {
    verdict: { type: 'string', enum: ['ship', 'fix'] },
    scores: { type: 'object', properties: { A: { type: 'number' }, B: { type: 'number' }, C: { type: 'number' }, D: { type: 'number' }, E: { type: 'number' }, F: { type: 'number' }, G: { type: 'number' }, H: { type: 'number' } } },
    findings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          severity: { type: 'string', enum: ['blocker', 'major', 'minor'] },
          area: { type: 'string' }, evidence: { type: 'string' }, fix: { type: 'string' },
        },
        required: ['severity', 'area', 'evidence', 'fix'],
      },
    },
  },
  required: ['verdict', 'findings'],
}

const must = async (p, o) => { const r = await agent(p, o); if (r == null) throw new Error(`${o.label} returned nothing (usage limit / restart) - resume later`); return r }
const mark = (step, text) => agent(`Write the text between the markers EXACTLY to ${ST}/${step}.done.md (overwrite), then git add that one file and commit "Pilot A: ${step} done". ${GIT}\n<<<BEGIN>>>\n${text}\n<<<END>>>`, { label: `mark:${step}`, model: 'haiku', effort: 'low' })

// ---------------------------------------------------------------- DESIGN
phase('Design')
if (!DONE.has('design')) {
  await must(`${CTX}\n\nLEAD DESIGNER. Write ${PDIR}/PILOT_A_SPEC.md — the buildable blueprint for Pilot A (games 1 POP, 109 CLEANSE, 2 CRUSH). Start from QUALITY_REPORT §8 (P1, P3, P5) and §9 S1-S6; LOOK at the three contact sheets first. Sections:
1 Goals + acceptance (rubric target, preserved features list per game: progress bar/HUD, guide + arrows, sound toggle, reveal hand-off, user words >=15 px, round counter in step, ?pilot=off switch).
2 Shared systems API (exact function/component names, props, events) — S1 EosPilotActor (character reaction layer: roles holder / inside / breath; event -> anticipation, squash/stretch, recoil, recover, face step by progress loud->soft->calm/happy, celebration; circular image + label below, never boxed), S2 EosPilotFinale (sequencer: climax beat -> family transformation -> character celebration -> loud->calm grade -> hand-off to the shared bloom + reveal; skippable by tap; reduced-motion variant; total <= 5 s), S3 EosPilotStage (environment kit: layered parallax backgrounds drawn with CSS/SVG gradients, key + rim light, particles; kits: sunlit sky/bath, moonlit pool -> dawn, industrial workshop), S4 EosPilotSound (named cues per game built on the arcade's sfx + eosTone; every cue logged as {t, action, cue, inputT} for the sync evidence, target <= 50 ms), S5 EosPilotGesture (direct tap on object, hold-on-object with pointer capture, no text selection, forgiving hit areas >= 64 px).
3 One section per game with a beat-by-beat storyboard (0 s -> finale), the character's role and its reaction to EACH input with timings (anticipation/impact/recovery ms), the progress -> transformation map, the unique finale shot list with timings, the environment layers + palette + light direction, the sound cue table, the phone 390 layout (thumb zone, safe areas) and desktop layout, reduced motion, perf budget (<= 40 animated nodes, transforms/opacity only, no layout thrash), what makes it distinct from its look-alike cluster.
4 File plan: src/pilot/70_pilot_core.jsx (switch + EosPilotEngineFor + registry), 71_pilot_fx.jsx (S1-S5), 72_pilot_pop.jsx, 73_pilot_cleanse.jsx, 74_pilot_crush.jsx — exports and contracts; how arrows find the targets (reuse EOS_GESTURES selectors or register pilot targets via the arrows API — grep 30_eos_arrows.jsx for how targets are resolved).
Commit the spec. ${GIT} Return a 10-line summary.`, { label: 'design:lead', phase: 'Design' })
  const crit = await parallel([
    () => agent(`${CTX}\n\nCRITIC — Pixar story artist + premium mobile game designer. Read ${PDIR}/PILOT_A_SPEC.md and the three contact sheets. Is each game a genuinely different, delightful scene? Are the characters truly acting (anticipation, reaction, transformation) on every input? Is each finale spectacular, specific to its mechanic and emotionally resolving (negative -> positive) within ~5 s? Is the phone layout thumb-friendly? Does anything feel like a template or like therapy homework? Give concrete fixes. Write ${PDIR}/PILOT_A_CRITIQUE_creative.md and return the list.`, { label: 'design:critic-creative', phase: 'Design' }),
    () => agent(`${CTX}\n\nCRITIC — senior front-end/game engineer. Read ${PDIR}/PILOT_A_SPEC.md. Check buildability in ONE Framer file with React + framer-motion only; that the pilot hook/switch, arrows targets, progress contract (monotonic 0-100, onDone once), reveal hand-off, sound toggle and the legacy vs new wrapper differences are handled; perf on mid-range phones (animated node counts, compositor-only properties, no per-frame React re-render storms, cleanup of timers/rAF/listeners); reduced motion; memory; the sound-sync logging approach. Give concrete fixes. Write ${PDIR}/PILOT_A_CRITIQUE_eng.md and return the list.`, { label: 'design:critic-eng', phase: 'Design' }),
  ])
  await must(`${CTX}\n\nLEAD DESIGNER again. Apply every valid fix from ${PDIR}/PILOT_A_CRITIQUE_creative.md and ${PDIR}/PILOT_A_CRITIQUE_eng.md to ${PDIR}/PILOT_A_SPEC.md (note rejected ones with reasons at the end). Commit. ${GIT}\nCritiques:\n${crit.filter(Boolean).join('\n\n').slice(0, 12000)}`, { label: 'design:revise', phase: 'Design' })
  await mark('design', 'Pilot A spec written, critiqued (creative + engineering) and revised: docs/pilot/PILOT_A_SPEC.md')
}

// ---------------------------------------------------------------- SYSTEMS
phase('Systems')
if (!DONE.has('systems')) {
  const rep = await must(`${CTX}\n\nSYSTEMS BUILDER. Implement exactly the shared systems in ${PDIR}/PILOT_A_SPEC.md §2 and §4 as src/pilot/70_pilot_core.jsx and src/pilot/71_pilot_fx.jsx (premium quality: weighty easing, squash/stretch, layered light, particles on transforms/opacity only; reduced-motion paths; cleanup everything). Add a tiny dev demo (only active with ?pilotdemo=1) that shows each system so reviewers can see it. Build with dev/pilot_build.py, test at 390 and 1280, zero page errors, and confirm ?pilot=off still plays the originals of 1, 2, 109. Commit ONLY your files. ${GIT} Return: API summary, demo instructions, screenshots paths.`, { label: 'systems:build', phase: 'Systems' })
  await mark('systems', rep.slice(0, 6000))
}

// ---------------------------------------------------------------- GAMES (build -> dual review -> fix loop)
phase('Games')
const GAMES = [
  { id: 1, slug: 'pop', file: 'src/pilot/72_pilot_pop.jsx', name: 'POP' },
  { id: 109, slug: 'cleanse', file: 'src/pilot/73_pilot_cleanse.jsx', name: 'CLEANSE' },
  { id: 2, slug: 'crush', file: 'src/pilot/74_pilot_crush.jsx', name: 'CRUSH' },
]
const LENSES = [
  { key: 'code', text: `CODE + FEATURES: hooks rules, cleanup of timers/rAF/listeners, no leaks, monotonic onProgress 0-100 and onDone exactly once, the reveal hand-off works, sound toggle respected, guide arrows point at the real targets at every stage, user words visible >=15 px, bubble rules, ?pilot=off shows the original, works with touch + mouse at 390 and 1280, reduced motion, perf (animated node count, compositor-only properties; sample frame times during play and finale with rAF), no identifier collisions (grep new names in src/).` },
  { key: 'experience', text: `EXPERIENCE (premium bar): play it fully at 390x844 FIRST, then 1280x860; capture start / each interaction / finale sequence frames and LOOK at them as contact sheets. Judge against CREATIVE_STANDARDS and the spec's storyboard: does the character visibly act on every input and transform with progress? Is the finale unique, spectacular and resolving? Is the world cinematic and distinct from its look-alike cluster? Is it instantly clear and satisfying on a phone? Compare with the BEFORE contact sheet. Answer the founder's §14 FINAL QUALITY CHALLENGE (10 questions in CINEMATIC_REDESIGN_DIRECTIVE.md) yes/no with evidence; any 'no' on fun, satisfying interaction, alive world, expressive characters, surprise, extraordinary finale or replay is a major finding. ${RUBRIC} verdict "ship" ONLY if every axis >= 8 and no blocker/major.` },
]
const runGame = async (g) => {
  const tag = `game-${g.slug}`
  if (DONE.has(tag)) return { id: g.id, ok: true }
  let report = (args && args.built && args.built[g.slug]) || null
  if (!report) {
    report = await must(`${CTX}\n\nGAME BUILDER: ${g.name} (id ${g.id}) — implement ${PDIR}/PILOT_A_SPEC.md §3 (${g.name}) as ${g.file} using the shared systems (71_pilot_fx.jsx) and register it in the pilot registry. If ${g.file} exists it is your earlier draft: continue it. Premium bar: the storyboard beat by beat, in-world character acting on every input, the unique finale, the environment kit, the sound cues with sync logging, phone-first layout; preserve every feature in spec §1. Test with dev/pilot_build.py at 390 then 1280 (full playthrough incl. finale and reveal), compare against the BEFORE sheet ${ROOT}/dev/shots/quality/sheets/${g.id}.png, iterate until it looks and plays premium. Zero page errors. Commit ONLY ${g.file} and ${ST}/${tag}.* . ${GIT} Final answer: what you built, how each standard is met, screenshots, known gaps. Also write it to ${ST}/${tag}.build.md as your LAST step.`, { label: `build:${g.slug}`, phase: 'Games' })
  }
  let prev = []
  for (let round = 1; round <= 3; round++) {
    const focus = round > 1 ? `\nTARGETED RE-REVIEW round ${round}: verify each previous finding is fixed and re-score; check only what changed for regressions. Previous findings:\n${JSON.stringify(prev).slice(0, 6000)}` : ''
    const rs = (await parallel(LENSES.map(L => () => agent(`${CTX}\n\nREVIEW ${g.name} (id ${g.id}, ${g.file}), round ${round}. Builder report:\n${String(report).slice(0, 5000)}\nLENS: ${L.text}${focus}\nBuild your own copy: python3 ${ROOT}/dev/pilot_build.py --dev-dir /tmp/pilot_rev_${g.slug}_${L.key}. Do NOT edit files.`, { label: `review:${g.slug}:${L.key}:r${round}`, phase: 'Games', schema: FIND })))).filter(Boolean)
    if (rs.length < LENSES.length) throw new Error(`review incomplete for ${g.slug} r${round} - resume later`)
    const serious = rs.flatMap(r => r.findings.filter(f => f.severity !== 'minor'))
    const minor = rs.flatMap(r => r.findings.filter(f => f.severity === 'minor'))
    const lowScores = rs.flatMap(r => Object.entries(r.scores || {}).filter(([, v]) => v < 8).map(([k, v]) => `${r === rs[1] ? 'experience' : 'code'} ${k}=${v}`))
    log(`${g.name} r${round}: ${serious.length} serious, ${minor.length} minor, low scores: ${lowScores.join(', ') || 'none'}`)
    if (!serious.length && !lowScores.length && (round > 1 || !minor.length)) {
      await mark(tag, `PASSED review round ${round}. Scores: ${JSON.stringify(rs.map(r => r.scores))}\nOpen minors: ${JSON.stringify(minor).slice(0, 3000)}`)
      return { id: g.id, ok: true, scores: rs.map(r => r.scores) }
    }
    if (round === 3) {
      await mark(tag, `NOT PASSED after 3 rounds — owner must be told. Scores: ${JSON.stringify(rs.map(r => r.scores))}\nOpen: ${JSON.stringify([...serious, ...minor]).slice(0, 5000)}`)
      return { id: g.id, ok: false, scores: rs.map(r => r.scores), open: [...serious, ...minor] }
    }
    prev = [...serious, ...minor, ...lowScores.map(s => ({ severity: 'major', area: 'rubric below 8', evidence: s, fix: 'raise this axis to >= 8' }))]
    report = await must(`${CTX}\n\nFIX ${g.name} (${g.file}; you may also adjust src/pilot/71_pilot_fx.jsx if a shared-system change is needed — then re-test all three pilot games quickly). Apply every finding and raise every axis below 8:\n${JSON.stringify(prev, null, 1).slice(0, 14000)}\nRe-test at 390 then 1280 with dev/pilot_build.py, LOOK at contact sheets. Commit ONLY the files you changed + ${ST}/${tag}.*. ${GIT} Return the updated builder report and overwrite ${ST}/${tag}.build.md with it.`, { label: `fix:${g.slug}:r${round}`, phase: 'Games' })
  }
}
const results = (await pipeline(GAMES, (g) => runGame(g))).filter(Boolean)
if (results.length < GAMES.length) throw new Error('a pilot game did not finish - resume later')

// ---------------------------------------------------------------- PACKAGE
phase('Package')
const pkg = await must(`${CTX}\n\nAPPROVAL PACKAGE for the owner (see the "Pilot approval package" section of CREATIVE_STANDARDS.md). Build: python3 ${ROOT}/dev/pilot_build.py --dev-dir /tmp/pilot_pkg. Produce into ${MEDIA}/ (create it):
1. BEFORE/AFTER screenshots per game at 390x844 and 1280x860 (start, mid-play, finale peak, reveal): BEFORE = the original via ?pilot=off (or the audit shots in dev/shots/quality/<id>_*), AFTER = pilot. One comparison contact sheet per game: ${MEDIA}/<slug>_before_after.png.
2. RECORDINGS: Playwright recordVideo of a complete natural playthrough per game at 390x844 (required) and 1280x860, from game start through the full finale and reveal; human-like pacing (not instant); save ${MEDIA}/<slug>_390.webm and <slug>_1280.webm (keep each < 15 MB).
3. RESPONSIVENESS: Event Timing API (PerformanceObserver type 'event', durationThreshold 16) during each playthrough: per interaction input delay + processing + presentation; plus rAF frame-time p50/p95/max and long frames during play and during the finale. Save ${MEDIA}/metrics.json.
4. SOUND SYNC: the pilot sound logger output per playthrough (action time, cue, offset ms; target <= 50 ms) -> ${MEDIA}/sound_sync.json (headless has no speakers: this is scheduling evidence; say so).
5. INDEPENDENT RE-SCORE: you are not the builder — score each game with the RUBRIC from the recordings + screenshots, phone first, honestly. ${RUBRIC}
6. Write ${PDIR}/PILOT_A_REPORT.md for the owner (plain language): per game — before/after summary, what makes the mechanic, world, character role and finale distinct (vs its look-alike cluster), rubric scores before -> after with evidence, latency + smoothness numbers, sound sync numbers, known gaps; how to play the pilot (the hosted playable link will be added by the lead; locally: open /tmp/pilot_pkg/index.html; ?pilot=off shows the originals); caveat that headless cloud measurements understate real-device smoothness. Also copy the playable build files into ${MEDIA}/playable/ (index.html, out.js) for hosting.
Commit ${PDIR}/PILOT_A_REPORT.md and ${MEDIA}/metrics.json, ${MEDIA}/sound_sync.json, ${MEDIA}/*_before_after.png only (media/ is gitignored, so force-add just those small files with git add -f). ${GIT} Return a 15-line summary with the after-scores.`, { label: 'package:approval', phase: 'Package' })
await mark('package', pkg.slice(0, 6000))
return { results, pkg }
