/* ================================================================== */
/* Entry + property controls                                           */
/* ================================================================== */

function ThinkStillReleaseMobile(props: any) {
    return <ThinkStillReleaseArcadePixar {...props} mobileUI={MobileConsole} />
}

const TSM_CONTROLS: Record<string, any> = {
    eosShowGameMenu: { type: ControlType.Boolean, title: "Show ritual library", defaultValue: false },
}
