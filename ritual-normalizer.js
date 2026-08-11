// ThinkStill v37.9 full-ritual compatibility normalizer.
// Use normalizeThinkStillRitual(raw) before rendering if your Framer code
// currently reads older JSON field names.

export function normalizeThinkStillRitual(raw = {}) {
  const pick = (...keys) => {
    for (const key of keys) {
      const value = raw?.[key]
      if (value !== undefined && value !== null && String(value).trim() !== "") return value
    }
    return ""
  }

  const display = raw.display || {}

  const title = pick("title", "ritualTitle", "ritual_title", "Ritual Title", "displayTitle") || display.title
  const bubble = pick("bubble", "bubbleName", "bubble_name", "Bubble") || display.bubble
  const playTime = pick("play_time", "playTime", "Play Time") || display.play_time
  const goal = pick("goal", "goalConsumer", "consumerGoal", "Goal", "Goal — Consumer") || display.goal
  const steps = pick(
    "steps", "ritualSteps", "integratedRitualSteps", "howToPlay",
    "Ritual Steps", "Integrated Ritual Steps", "ritual", "body", "ritual_text"
  ) || display.steps
  const win = pick("win", "winConsumer", "consumerWin", "Win", "Win — Consumer") || display.win
  const supports = pick(
    "supports", "supportsText", "supportStack",
    "5 Ritual-Matched Supports — plain lines, no subtitles",
    "5-Line Ritual-Matched Support Stack — Always Render; No Labels"
  ) || display.supports
  const formulaFlow = pick("formula_flow", "formulaFlow", "Formula Flow") || display.formula_flow
  const safety = pick("safety", "safetyConsumer", "consumerSafety", "Safety", "Safety — Consumer") || display.safety
  const fullRitual = pick(
    "final_consumer_ritual", "finalConsumerRitual", "full_ritual", "fullRitual",
    "Final Consumer Ritual", "content"
  ) || display.full_ritual

  return {
    ...raw,
    bubble,
    title,
    playTime,
    goal,
    steps,
    win,
    supports,
    formulaFlow,
    safety,
    fullRitual
  }
}
