/**
 * Full consumer ritual object.
 * Hook and Game Move stay internal but the entire consumer ritual is returned.
 */
export function toConsumerRitual(r) {
    if (!r) return null

    return {
        id: r.id,
        bubble: r.bubble,
        title: r.title,
        trigger: r.trigger,
        pattern: r.pattern,
        playTime: r.playTime,

        goal: r.goal,
        steps: r.steps,
        stepsStructured: r.stepsStructured,
        finish: r.finish,
        win: r.win,
        formulaFlow: r.formulaFlow,
        pause: r.pause,
        disclaimer: r.disclaimer,
        safety: r.safety,

        ritual: r.ritual,
        ritualText: r.ritualText,
        fullRitual: r.fullRitual,
        content: r.content,
    }
}

/**
 * Recommended render order:
 * title → goal → steps → win → formula flow → safety.
 */
export function renderRitualText(r) {
    return r?.ritualText || r?.fullRitual || r?.content || ""
}
