// hushmallow for Framer — paste this file into a Framer code component.
// (The brand is always lowercase: hushmallow. The component keeps the name
// HushmallowEmbed because Framer instances are bound to it.)
//
// Framer: Assets → Code → "+" → New component → name it HushmallowEmbed →
// replace everything with this file → drag the component onto a page and
// set its size to Fill (width and height). Then put your hosted hushmallow
// address in the "App URL" property on the right.
//
// hushmallow is a complete web app (seven living, squeezable Mallows and
// the Hushfold), so it is hosted as its own static site and shown here
// full-bleed. Its fonts load inside the frame from the app's own origin, so
// nothing font-related goes in this file. See hushmallow/docs/FRAMER.md.

import * as React from "react"
import { addPropertyControls, ControlType } from "framer"

type Props = {
    url: string
    background: string
    rounded: number
}

/**
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight any-prefer-fixed
 * @framerIntrinsicWidth 390
 * @framerIntrinsicHeight 844
 */
export default function HushmallowEmbed({ url, background, rounded }: Props) {
    const [loaded, setLoaded] = React.useState(false)
    const src = (url || "").trim()
    const valid = /^https:\/\//.test(src) || /^http:\/\/(localhost|127\.0\.0\.1)/.test(src)

    const frame: React.CSSProperties = {
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "hidden",
        background,
        borderRadius: rounded,
    }

    if (!valid) {
        return (
            <div style={{ ...frame, display: "grid", placeItems: "center", color: "#f7f3ff", font: "600 15px/1.4 system-ui, sans-serif", textAlign: "center", padding: 24 }}>
                <div>
                    <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 6, textTransform: "none" }}>hushmallow</div>
                    Add your hosted hushmallow address (https://…) in the
                    “App URL” property.
                </div>
            </div>
        )
    }

    return (
        <div style={frame}>
            <iframe
                title="hushmallow"
                src={src}
                onLoad={() => setLoaded(true)}
                // sound needs autoplay after a tap; share cards and copied lines
                // need web-share and clipboard; vibration is used for haptics
                allow="autoplay; clipboard-write; web-share; fullscreen; vibrate"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
                style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    border: 0,
                    display: "block",
                    background,
                    opacity: loaded ? 1 : 0,
                    transition: "opacity 400ms ease",
                }}
            />
        </div>
    )
}

HushmallowEmbed.defaultProps = {
    url: "",
    background: "#0a0818",
    rounded: 0,
}

addPropertyControls(HushmallowEmbed, {
    url: {
        type: ControlType.String,
        title: "App URL",
        placeholder: "https://you.github.io/thinkstill-rituals/",
    },
    background: { type: ControlType.Color, title: "Background" },
    rounded: { type: ControlType.Number, title: "Radius", min: 0, max: 60, unit: "px" },
})
