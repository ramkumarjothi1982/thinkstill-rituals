export const meta = {
  name: 'thinkstill-pilot-a-v2',
  description: 'Pilot A to the founder Emotional Shift Standard (F9): undo EOS layers over approved bursts, per-game redesign addendum, upgrade POP + CLEANSE and finish CRUSH from scratch, lean 2-lens review to >=8, approval package + playable preview build',
  phases: [
    { title: 'Prep', detail: 'release regressions R1-R8 (EOS layers off the approved bursts) + redesign addendum for the 3 games' },
    { title: 'Games', detail: 'POP, CLEANSE, CRUSH built/upgraded to the Emotional Shift Standard; code + experience review, up to 3 rounds' },
    { title: 'Package', detail: 'before/after, recordings, latency, sound-sync scheduling, explainer, playable preview build' },
  ],
}

const ROOT = '/home/user/thinkstill-rituals/framer'
const DOCS = ROOT + '/docs'
const PDIR = DOCS + '/pilot'
const ST = PDIR + '/status'
const MEDIA = PDIR + '/media'
const RST = DOCS + '/eos_status'
const DONE = new Set((args && args.done) || [])

const GIT = `Git: branch claude/jolly-hopper-ognrxj in /home/user/thinkstill-rituals. Another agent may be committing in parallel: git add ONLY the exact paths you changed (never -A/-u/.), on index.lock wait 5 s and retry, message ends with exactly:\nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>\nClaude-Session: https://claude.ai/code/session_01SaGZSxDbxtpggsq88ET1Ri\nthen git push -u origin claude/jolly-hopper-ognrxj (on rejection: git pull --rebase origin claude/jolly-hopper-ognrxj, then push; retry network errors 4x with 2/4/8/16 s). No PRs, no model names anywhere.`

const CTX = `PROJECT: ThinkStill Release Console — a Framer code component (React 18 + framer-motion, ONE file) of emotional-release mini-games. The founder wants every game redesigned FROM SCRATCH to be ultra viral, healthily addictive and hypnotic, so users FEEL an instant emotional shift — Pilot A (POP id 1, CLEANSE id 109, CRUSH id 2) is the benchmark the founder personally plays and approves before any other game is redesigned.
BINDING (read first, newest wins): ${DOCS}/CREATIVE_STANDARDS.md — especially the LAST section "Emotional Shift Standard (founder, 2026-10-09)" (Mirror -> Release -> Transform -> Payoff) and the founder rules; ${DOCS}/founder/FEEDBACK_LOG.md (F8 default bubble pictures MANDATORY: picture inside every emotional bubble/object, user text BELOW the picture INSIDE the same object, true circles, full image visible, no black masks/boxes, faces negative -> positive with progress, six-image upload rule; F6 guide arrows at every stage; F7/C2 finale structure; F9); ${DOCS}/founder/CINEMATIC_REDESIGN_DIRECTIVE.md (premium game-studio bar, §14 quality challenge); ${DOCS}/founder/FOUNDER_REQUIREMENTS.md.
FINALE STRUCTURE (founder decision C2/F7 option a): the game's OWN unique climax first (mechanic-specific, spectacular, no text in its core), THEN the founder-approved dopamine burst exactly as in baseline git 485500c (RewardSurgeBurst / .tsRewardSurge.mega, triggered by the wrapper's wrappedDone when the engine calls onDone), THEN the end screen. Nothing may paint over the approved burst (no pilot afterglow layers, words or grades on top of it while it is mounted); the climax must start within 300 ms of the final action and be done (or fully settled behind) by the time onDone fires.
CODE: src/00_arcade.jsx (23k lines — NEVER read whole; grep then Read offset/limit). POP (1) and CRUSH (2) run in GameEngineLegacy -> RoutedGameContentLegacy; CLEANSE (109) in GameEngine -> RoutedGameContent. Engine props: {game, entries, onDone once, sfx(kind), reduced, onProgress(0..100 monotonic)}; root class "arena". Shared release modules src/eos/*.jsx (do not edit from a pilot task): 16_eos_bubble_face.jsx = the F8 shared picture resolver tsBubbleFaceSources({game, entries, uploads, progress}) + useTsBubbleFaces (hosts list TS_FACE_HOSTS incl. .tsFaceObject; .tsNoBubbleFace opts out) — pilot games MUST take their pictures from tsBubbleFaceSources (or render .tsFaceObject hosts) so defaults/uploads/removal all work; 30_eos_arrows.jsx = guide arrows (EOS_GESTURES targets; pilot games must expose/register targets for EVERY stage); 46_eos_pick.jsx = ThinkStill picks the game (no user menu; tests start games with window.__eos.pick.start(id) after typing in the composer; eos_drive startGameById handles it).
PILOT: code lives ONLY in ${ROOT}/src/pilot/*.jsx (no imports; top-level names prefixed EosPilot/eosPilot/EOS_PILOT): 70_pilot_core.jsx (EosPilotEngineFor + registry + switch: ?pilot=off or localStorage eos_pilot=off plays the original), 71_pilot_fx.jsx (shared systems S0-S6: actor, stage kits, finale sequencer, sound + sync log, gesture, play box), 72_pilot_pop.jsx ("Balloon Morning"), 73_pilot_cleanse.jsx ("Moon Pool"), 74_pilot_crush.jsx ("The Press", draft). Spec ${PDIR}/PILOT_A_SPEC.md (123 KB: grep sections, do not read whole). Earlier build reports ${ST}/game-pop.build.md, ${ST}/game-cleanse.build.md, CRUSH notes ${ST}/game-crush.progress.md. Build + run: python3 ${ROOT}/dev/pilot_build.py --dev-dir /tmp/pilot_<you>, then Playwright via ${ROOT}/dev/drive.mjs launch({dir:'/tmp/pilot_<you>', width, height}) and ${ROOT}/dev/eos_drive.mjs (startGameById, finishGame, readProgress, arrow helpers; dev/f6_probe.mjs checks arrows per stage; dev/f8_probe.mjs checks bubble faces). Screenshots: tile with python3 ${ROOT}/dev/contact_sheet.py OUT.png <pngs> --cols 4 and Read the SHEET (never Read PNGs one by one). Headless Chromium has no GPU and no audio: never claim sound was heard — sound evidence is scheduling logs only. Budget: <= 100 tool calls, <= 12 image views per agent; write progress notes to ${ST}/<step>.progress.md every ~20 calls and READ IT FIRST if it exists (you may be resuming after a restart). Ignore "agent-proxy connect_rejected" noise. Phone 390x844 first, desktop 1280x860 second.`

const RCTX = `PROJECT: ThinkStill Release Console — Framer code component built from src/00_arcade.jsx (original 110 games; never read whole: grep, then Read offset/limit) + src/eos/*.jsx (Emotional OS modules) + src/99_pixar.jsx. Build: cd ${ROOT} && python3 build.py (single file ThinkStillReleaseArcade_EOS_FULL.txt + dev/out.js). Test helpers: dev/drive.mjs, dev/eos_drive.mjs (launchEos, startGameById, finishGame, readProgress, runCheckin ...). Tile screenshots with python3 dev/contact_sheet.py and Read the sheet. OWNER POLICY: never remove functionality, animations, finales, sound, progress indicators or navigation; phone 390x844 first. Do NOT touch src/pilot/ (another agent is working there in parallel). Budget <= 90 tool calls, <= 10 image views; progress notes to ${RST}/v2_gap-regressions.progress.md every ~20 calls, read it first if it exists. Headless has no audio: sound checks are scheduling logs only.`

const RUBRIC = `RUBRIC (1-10, phone first; 10 = genuinely premium, Pixar / Netflix / top mobile-game level): A light & polish, B distinct world, C interaction feel & juice, D characters as active performers, E unique climax (+ approved burst intact after it), F clarity (first-time player knows what to do within 2 s), G mobile layout, H relief fit, I EMOTIONAL SHIFT (Mirror -> Release -> Transform visibly lands; would a stressed player feel different after 60 s?), J hypnotic + replay pull (absorbing flow, surprise, variation on replay, a moment worth sharing — without pressure mechanics). TARGET: every axis >= 8, no perf flag, F8 bubble rules pass, arrows at every stage, approved burst unchanged and unobstructed, all features preserved. Cite the screenshot/recording moment for every score <= 7.`

const FIND = {
  type: 'object',
  properties: {
    verdict: { type: 'string', enum: ['ship', 'fix'] },
    scores: { type: 'object', properties: { A: { type: 'number' }, B: { type: 'number' }, C: { type: 'number' }, D: { type: 'number' }, E: { type: 'number' }, F: { type: 'number' }, G: { type: 'number' }, H: { type: 'number' }, I: { type: 'number' }, J: { type: 'number' } } },
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
const mark = (dir, step, text, msg) => agent(`Write the text between the markers EXACTLY to ${dir}/${step}.done.md (overwrite), then git add that one file and commit "${msg}". ${GIT}\n<<<BEGIN>>>\n${String(text).slice(0, 7000)}\n<<<END>>>`, { label: `mark:${step}`, model: 'haiku', effort: 'low' })

// ---------------------------------------------------------------- PREP A: release regressions (EOS layers off the approved bursts)
const regressions = async () => {
  if (DONE.has('gap-regressions')) return 'already done'
  const r = await must(`${RCTX}\n\nGAP-AUDIT FIXES batch "regressions" (needed now so the founder's Pilot A finales show the approved burst cleanly). Read ${DOCS}/founder/GAP_AUDIT.md (rows R1-R8 and the plan row "0. Undo the regressions") and ${DOCS}/founder/gap_rows.json. Fix every row with status REGRESSION: (a) while .tsRewardSurge.mega is mounted, EOS layers (.eosMoodGrade, .eosMoodAir, .eosMoodFlip, .eosCompanion, the .eosThoughtFlow glow, dots, Still Point glow, 100-110 finish card) are opacity 0 / unmounted and EOS rAF loops pause; the flip-word bloom and any EOS chime start only AFTER the burst unmounts (no second finale sound before the burst); (b) remove the reveal-nav hide rule (<= 3 primaries, navigation visible on phones); (c) Still Moment uses its own breath sound, not rain; (d) the check-in keeps the how-Release-works explanation; (e) phone header title centred; (f) revert the 105/106 picture shrink; (g) the readability word floor never breaks wrapping or pushes letters outside circles; (h) no dark mask on game 6 ZAP counter. Rules: the approved baseline is git 485500c (framer/src/00_arcade.jsx) — the burst must look exactly as there; never remove features; shared fixes in src/eos/* only. Verify with the tests named in the rows (frozen-frame diff at mega +0.6 s vs a baseline build on 1, 18, 100, 109, 110 — all-EOS diff <= 3% in the burst rect, 0 text nodes in the burst core from mount to +1.8 s; scheduled-sound log shows no non-burst cue between progress 100 and mega unmount) at 390x844 then 1280x860. python3 build.py; zero page errors. Update row statuses in gap_rows.json (FIXED + commit) and append a "Fixed" section to GAP_AUDIT.md. Commit the changed src/eos files, the rebuilt .txt and the docs. ${GIT} Return a table: row | fix | verification.`, { label: 'prep:regressions', phase: 'Prep' })
  await mark(RST, 'v2_gap-regressions', r, 'Release v2: gap-regressions done')
  return r
}

// ---------------------------------------------------------------- PREP B: redesign addendum, then GAMES
const GAMES = [
  { id: 1, slug: 'pop', file: 'src/pilot/72_pilot_pop.jsx', name: 'POP' },
  { id: 109, slug: 'cleanse', file: 'src/pilot/73_pilot_cleanse.jsx', name: 'CLEANSE' },
  { id: 2, slug: 'crush', file: 'src/pilot/74_pilot_crush.jsx', name: 'CRUSH' },
]
const LENSES = [
  { key: 'code', text: `CODE + FEATURES + RULES: hooks rules, cleanup of timers/rAF/listeners, no leaks, monotonic onProgress 0-100, onDone exactly once; FINALE STRUCTURE: own climax starts <= 300 ms after the final action, then the approved burst (.tsRewardSurge.mega) mounts and NOTHING from the pilot paints over it (sample elementFromPoint / screenshots at mega +0.3/+0.6/+1.2 s and compare with the same game under ?pilot=off), then the reveal/end screen; sound toggle respected; no double finale sound; guide arrows visible and pointing at the real next target at EVERY stage (dev/f6_probe.mjs style); F8: run dev/f8_probe.mjs-style checks with no upload, 1 and 3 uploads, and upload-then-remove (pictures in every emotional object, circle, full image, text below inside, no dark mask, faces negative at start -> positive at finish); user words >= 15 px; ?pilot=off shows the original; touch + mouse at 390 and 1280; reduced motion; perf (animated node count, compositor-only properties; rAF frame times during play and climax); no identifier collisions (grep new names in src/).` },
  { key: 'experience', text: `EXPERIENCE (premium bar + Emotional Shift Standard): play it fully at 390x844 FIRST as three different players (emotions panic, anger, sad via the session emotion), then 1280x860; capture start (first 2 s), each interaction, the transform at ~34/67/100%, climax frames and burst; LOOK at them as contact sheets. Judge: MIRROR — does the opening instantly reflect the player's state and their own words/pictures? RELEASE — is the central physical interaction irresistibly satisfying (anticipation, squash/stretch, resistance, chain reactions), escalating, with a genuine surprise and characters reacting to every input? TRANSFORM — does the world visibly shift loud -> calm/bright with progress? PAYOFF — unique, shareable climax then the approved burst untouched? HYPNOTIC + REPLAY — absorbing flow, variation on a second play, a moment worth showing a friend, no pressure mechanics? Compare with the BEFORE sheet ${ROOT}/dev/shots/quality/sheets/<id>.png. Answer the founder's §14 FINAL QUALITY CHALLENGE (CINEMATIC_REDESIGN_DIRECTIVE.md) yes/no with evidence — any 'no' on fun, satisfying interaction, alive world, expressive characters, surprise, extraordinary finale, emotional release or replay is a major finding. ${RUBRIC} verdict "ship" ONLY if every axis >= 8 and no blocker/major.` },
]

const runGame = async (g) => {
  const tag = `v2-game-${g.slug}`
  if (DONE.has(tag)) return { id: g.id, ok: true, cached: true }
  let report = await must(`${CTX}\n\nGAME BUILDER: ${g.name} (id ${g.id}) -> ${g.file}. Implement ${PDIR}/PILOT_A_ADDENDUM.md §${g.name} (the from-scratch redesign deltas to the Emotional Shift Standard) on top of the spec's §3 (${g.name}) using the shared systems in 71_pilot_fx.jsx (you may extend 71 if the addendum says so — then re-check the other two pilot games still build and play). If ${g.file} exists it is the earlier build/draft: keep what already meets the bar, rebuild whatever the addendum says falls short (be bold: this is a from-scratch redesign where needed, not a patch). Must-haves: the four beats (Mirror within 2 s using the session emotion + the player's own words/pictures; Release with premium game feel, escalation and a surprise; visible Transform loud -> calm; Payoff = own climax, then onDone so the approved burst plays unobstructed); characters perform on every input; F8 pictures via tsBubbleFaceSources with text below inside each object; arrows for every stage; sound cues with the sync log; phone-first layout; ?pilot=off still plays the original; zero page errors. Test with dev/pilot_build.py at 390 then 1280 (full playthrough incl. climax, burst and reveal), compare against the BEFORE sheet ${ROOT}/dev/shots/quality/sheets/${g.id}.png, iterate until it looks, feels and plays premium. Commit ONLY ${g.file} (+ 71_pilot_fx.jsx/70_pilot_core.jsx if you changed them) and ${ST}/${tag}.* . ${GIT} Final answer: what you built beat by beat, how each standard is met, screenshot paths, known gaps. Write the same report to ${ST}/${tag}.build.md as your LAST step.`, { label: `build:${g.slug}`, phase: 'Games' })
  let prev = []
  for (let round = 1; round <= 3; round++) {
    const focus = round > 1 ? `\nTARGETED RE-REVIEW round ${round}: verify each previous finding is fixed and re-score; check only what changed for regressions. Previous findings:\n${JSON.stringify(prev).slice(0, 6000)}` : ''
    const rs = (await parallel(LENSES.map(L => () => agent(`${CTX}\n\nREVIEW ${g.name} (id ${g.id}, ${g.file}), round ${round}. Builder report:\n${String(report).slice(0, 5000)}\nLENS: ${L.text}${focus}\nBuild your own copy: python3 ${ROOT}/dev/pilot_build.py --dev-dir /tmp/pilot_rev_${g.slug}_${L.key}. Do NOT edit files. Use progress file ${ST}/${tag}.review_${L.key}_r${round}.progress.md.`, { label: `review:${g.slug}:${L.key}:r${round}`, phase: 'Games', schema: FIND })))).filter(Boolean)
    if (rs.length < LENSES.length) throw new Error(`review incomplete for ${g.slug} r${round} - resume later`)
    const serious = rs.flatMap(r => r.findings.filter(f => f.severity !== 'minor'))
    const minor = rs.flatMap(r => r.findings.filter(f => f.severity === 'minor'))
    const lowScores = rs.flatMap((r, i) => Object.entries(r.scores || {}).filter(([, v]) => v < 8).map(([k, v]) => `${LENSES[i] ? LENSES[i].key : 'lens'} ${k}=${v}`))
    log(`${g.name} r${round}: ${serious.length} serious, ${minor.length} minor, low scores: ${lowScores.join(', ') || 'none'}`)
    if (!serious.length && !lowScores.length && (round > 1 || !minor.length)) {
      await mark(ST, tag, `PASSED review round ${round}. Scores: ${JSON.stringify(rs.map(r => r.scores))}\nOpen minors: ${JSON.stringify(minor).slice(0, 3000)}`, `Pilot A v2: ${tag} done`)
      return { id: g.id, ok: true, scores: rs.map(r => r.scores) }
    }
    if (round === 3) {
      await mark(ST, tag, `NOT PASSED after 3 rounds — the founder must be told. Scores: ${JSON.stringify(rs.map(r => r.scores))}\nOpen: ${JSON.stringify([...serious, ...minor]).slice(0, 5000)}`, `Pilot A v2: ${tag} reviewed (open items)`)
      return { id: g.id, ok: false, scores: rs.map(r => r.scores), open: [...serious, ...minor] }
    }
    prev = [...serious, ...minor, ...lowScores.map(s => ({ severity: 'major', area: 'rubric below 8', evidence: s, fix: 'raise this axis to >= 8' }))]
    report = await must(`${CTX}\n\nFIX ${g.name} (${g.file}; you may also adjust src/pilot/71_pilot_fx.jsx if a shared-system change is needed — then re-check the other pilot games still build and play). Apply every finding and raise every axis below 8:\n${JSON.stringify(prev, null, 1).slice(0, 14000)}\nRe-test at 390 then 1280 with dev/pilot_build.py, LOOK at contact sheets. Commit ONLY the files you changed + ${ST}/${tag}.*. ${GIT} Return the updated builder report and overwrite ${ST}/${tag}.build.md with it. Progress file: ${ST}/${tag}.fix_r${round}.progress.md.`, { label: `fix:${g.slug}:r${round}`, phase: 'Games' })
  }
}

const gamesTrack = async () => {
  if (!DONE.has('v2-addendum')) {
    const r = await must(`${CTX}\n\nCREATIVE DIRECTOR + LEAD GAME DESIGNER. The founder now wants every game redesigned FROM SCRATCH to the Emotional Shift Standard (CREATIVE_STANDARDS.md, last section) — Pilot A sets the benchmark. Review the CURRENT pilot builds against it: read ${ST}/game-pop.build.md, ${ST}/game-cleanse.build.md, ${ST}/game-crush.progress.md, look at the after sheets (${ST}/game-pop.after.jpg, ${ST}/game-cleanse.after_390.png) and BEFORE sheets (${ROOT}/dev/shots/quality/sheets/1.png, 109.png, 2.png), and grep the spec. Known gaps to resolve: POP's bubbles currently have NO pictures (violates F8 — every emotional bubble shows the default character picture or the upload with the text below inside); POP's 'Calm Bubble' finale and CLEANSE's 'Clearest Night' must become the game's own climax that completes BEFORE onDone so the approved burst plays unobstructed afterwards (no afterglow painted over it); CLEANSE puts the word under the orb — it must be inside the object; MIRROR beat (instant reflection of the player's emotion + own words in the first 2 s) and visible TRANSFORM are not yet designed explicitly; CRUSH is only a draft. Write ${PDIR}/PILOT_A_ADDENDUM.md (concise, buildable, no essay): §Shared (changes to 71_pilot_fx.jsx if any: e.g. a per-emotion Mirror palette/weather preset, the F8 face renderer for pilot objects using tsBubbleFaceSources, the climax-then-burst hand-off in the S2 finale sequencer, arrows registration per stage); then §POP, §CLEANSE, §CRUSH, each with: verdict per beat (keep / strengthen / rebuild from scratch) with reasons; the beat-by-beat storyboard 0 s -> burst for the redesigned version (Mirror for panic / anger / sad / anxious variants, Release interaction + game feel with timings, the surprise, Transform map at 0/34/67/100%, the unique shareable climax shot list <= 2.5 s ending before onDone, what varies on replay); the F8 picture placement; the arrow targets per stage; what makes it unlike every other ThinkStill game; the §14 questions answered for the design. Be bold and specific — this is the premium benchmark. Commit it. ${GIT} Return a 12-line summary.`, { label: 'prep:addendum', phase: 'Prep' })
    await mark(ST, 'v2-addendum', r, 'Pilot A v2: addendum done')
  }
  return (await pipeline(GAMES, (g) => runGame(g))).filter(Boolean)
}

phase('Prep')
const [regr, results] = await parallel([() => regressions(), () => gamesTrack()])
if (regr == null) throw new Error('regressions batch did not finish - resume later')
if (!results || results.length < GAMES.length) throw new Error('a pilot game did not finish - resume later')

// ---------------------------------------------------------------- PACKAGE
phase('Package')
let pkg = 'already done'
if (!DONE.has('v2-package')) {
  pkg = await must(`${CTX}\n\nAPPROVAL PACKAGE for the founder (CREATIVE_STANDARDS.md "Pilot approval package" + Directive §13 stage 3). Build: python3 ${ROOT}/dev/pilot_build.py --dev-dir /tmp/pilot_pkg. Produce into ${MEDIA}/ (create it; progress file ${ST}/v2-package.progress.md):
1. BEFORE/AFTER per game at 390x844 and 1280x860 (start/Mirror, mid-play, transform ~67%, climax peak, burst, end screen): BEFORE = the original via ?pilot=off, AFTER = pilot. One comparison contact sheet per game: ${MEDIA}/<slug>_before_after.png.
2. RECORDINGS: Playwright recordVideo of a complete natural playthrough per game at 390x844 (required) and 1280x860, from game start through climax, burst and end screen; human-like pacing; ${MEDIA}/<slug>_390.webm and <slug>_1280.webm (each < 12 MB).
3. RESPONSIVENESS: Event Timing API (PerformanceObserver 'event', durationThreshold 16) per interaction (input delay + processing + presentation) and rAF frame-time p50/p95/max + long frames during play and climax -> ${MEDIA}/metrics.json.
4. SOUND SYNC: the pilot sound logger output per playthrough (action time, cue, offset ms; target <= 50 ms) -> ${MEDIA}/sound_sync.json, clearly labelled SCHEDULING evidence (headless has no speakers).
5. INDEPENDENT RE-SCORE (you are not the builder): ${RUBRIC} from the recordings + screenshots, phone first, honestly.
6. PLAYABLE PREVIEW BUILD for hosting: python3 ${ROOT}/dev/preview_build.py ${MEDIA}/playable --pilot (production app.js + img packs), then in ${MEDIA}/playable/app.js replace width:"100vw",height:"100vh" with width:"100%",height:"100%" if present. Verify the hosted-style page works: copy ${ROOT}/preview/index.html next to it, serve with python3 -m http.server, and confirm in Playwright that after typing a thought, window.__eos.pick.start(1|109|2) starts each pilot game and that localStorage eos_pilot=off + reload plays the originals. Do not commit the playable folder.
7. ${PDIR}/PILOT_A_REPORT.md for the founder (plain language, short): per game — what it is now beat by beat (Mirror / Release / Transform / Climax -> approved burst), what makes it different from every other game, before -> after scores with evidence, latency + smoothness numbers, sound-sync scheduling numbers, known gaps; how to play (hosted link added by the lead; originals via the 'Original' switch); caveat that headless cloud measurements understate real-device smoothness and audio was not heard.
Commit ${PDIR}/PILOT_A_REPORT.md, ${MEDIA}/metrics.json, ${MEDIA}/sound_sync.json and ${MEDIA}/*_before_after.png only (media/ may be gitignored: git add -f just those files). ${GIT} Return a 15-line summary with the after-scores and the playable folder path.`, { label: 'package:approval', phase: 'Package' })
  await mark(ST, 'v2-package', pkg, 'Pilot A v2: package done')
}
return { regr: String(regr).slice(0, 3000), results, pkg: String(pkg).slice(0, 4000) }
