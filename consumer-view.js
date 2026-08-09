/**
 * Returns ONLY the v36 consumer-facing structure.
 * Hook and Game Move are intentionally excluded.
 */
export function toConsumerRitual(ritual) {
    if (!ritual) return null

    return {
        id: ritual.id,
        bubble: ritual.bubble,
        title: ritual.display.title,
        goal: ritual.display.goal,
        steps: ritual.display.steps.map(({ number, label, instruction }) => ({
            number,
            label,
            instruction,
        })),
        win: ritual.display.win,
        formulaFlow: ritual.display.formulaFlow,
        safety: {
            pause: ritual.display.safety.pause,
            disclaimer: ritual.display.safety.disclaimer,
        },
        playTime: ritual.playTime,
    }
}
