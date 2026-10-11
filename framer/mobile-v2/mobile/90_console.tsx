/* ================================================================== */
/* Mobile console (rendered by ThinkStillReleaseArcade via mobileUI)   */
/* ================================================================== */

function MobileConsole({ api }: { api: any }) {
    const n = api.nodes
    return (
        <div className="shell tsmShell">
            <section className="releaseStage">
                {n.thoughtFlow}
                {n.checkIn}
                {n.checkInChip}
                {n.worldChips}
                {n.safety}
                {n.game}
                {n.eosPlay}
                {n.pickBridge}
                {n.textFloor}
                {api.stage === "reveal" ? <div className="tsmReveal">{n.shiftMeter}</div> : null}
            </section>
            <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, zIndex: 300, display: "flex", gap: 8, padding: 8 }}>
                <input className="releaseThoughtInput" value={api.raw} onChange={(e) => api.setRaw(e.target.value.slice(0, 2000))} placeholder="Put your emotion, feeling or thought into words to release it." style={{ flex: 1, height: 44 }} />
                <button onClick={() => api.launchRelease()}>Begin</button>
                {n.fileInput}
            </div>
        </div>
    )
}
