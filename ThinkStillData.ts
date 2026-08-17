export type ThinkStillFlatRitual = {
  id: string
  bubble: "GLITCH" | "DROP" | "STILL" | "PATCH" | "LOOPIE" | "RUSH" | "SYNC"
  title: string
  playTime: string
  goal: string
  steps: string
  win: string
  mindBend: string
  formulaFlow: string
  formula_flow: string
  safety: string
  feedbackPrompt: string
  feedbackOptions: string
  trigger_play_time: string
  goal_why_game_move: string
  play_the_loop: string
  win_reward: string
  thinking_error: string
  precise_subpattern: string
  keywords: string[]
  [key: string]: any
}

export async function loadThinkStillFromManifest(manifestUrl: string) {
  const manifestRes = await fetch(manifestUrl, { cache: "no-store" })
  if (!manifestRes.ok) throw new Error(`Manifest failed: ${manifestRes.status}`)
  const manifest = await manifestRes.json()

  const base = new URL(".", manifestUrl)
  const ritualUrl = new URL(manifest.files?.rituals || "rituals.json", base)
  const ritualRes = await fetch(ritualUrl, { cache: "no-store" })
  if (!ritualRes.ok) throw new Error(`Ritual library failed: ${ritualRes.status}`)
  const rituals = (await ritualRes.json()) as ThinkStillFlatRitual[]

  if (!Array.isArray(rituals) || rituals.length !== manifest.row_count) {
    throw new Error(`Expected ${manifest.row_count} rituals; got ${Array.isArray(rituals) ? rituals.length : "non-array"}`)
  }

  return { manifest, rituals }
}
