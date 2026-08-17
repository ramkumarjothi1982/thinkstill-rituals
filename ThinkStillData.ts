export type ThinkStillStep = { n: number; text: string }

export type ThinkStillRitual = {
  id: string
  title: string
  playTime: string
  goal: string
  steps: ThinkStillStep[]
  win: string
  mindBend: string
  formulaFlow: string
  safety: { raw: string; pause: string; disclaimer: string }
  feedback: { prompt: string; options: string[] }
  bubble: "GLITCH" | "DROP" | "STILL" | "PATCH" | "LOOPIE" | "RUSH" | "SYNC"
}

export async function loadThinkStillFromManifest(manifestUrl: string) {
  const manifestRes = await fetch(manifestUrl, { cache: "no-store" })
  if (!manifestRes.ok) throw new Error(`Manifest failed: ${manifestRes.status}`)
  const manifest = await manifestRes.json()

  const base = new URL(".", manifestUrl)
  const fetchJson = async (name: string) => {
    const res = await fetch(new URL(name, base), { cache: "no-store" })
    if (!res.ok) throw new Error(`${name} failed: ${res.status}`)
    return res.json()
  }

  const [rituals, backend, normalized, routing] = await Promise.all([
    fetchJson(manifest.files.rituals),
    fetchJson(manifest.files.backend),
    fetchJson(manifest.files.normalized),
    fetchJson(manifest.files.routing),
  ])

  if (rituals.length !== manifest.row_count) {
    throw new Error(`Expected ${manifest.row_count} rituals; got ${rituals.length}`)
  }

  return { manifest, rituals: rituals as ThinkStillRitual[], backend, normalized, routing }
}
