import { useEffect, useRef, useState } from "react"
import { ControlType, addPropertyControls } from "framer"
import { motion } from "framer-motion"

interface Props {
    video?: string
    delay?: number
    messageX?: number
    messageY?: number
    align?: "center" | "topLeft" | "topRight" | "bottomLeft" | "bottomRight"
    redirectUrl?: string
    message?: string
}

export default function RedirectGlitch(props: Props) {
    const {
        video,
        delay = 500,
        messageX = 0,
        messageY = 0,
        align = "center",
        redirectUrl = "https://vibyfy-gate-worker.vibyfy-chat.workers.dev/gate/glitch",
        message = "⚡ Letting Go… Entering the Glitch...",
    } = props

    const [shouldRedirect, setShouldRedirect] = useState(false)
    const redirectedRef = useRef(false)

    useEffect(() => {
        if (typeof window === "undefined") return

        const isFramerPreview =
            window.location.hostname.includes("framer.app") ||
            window.self !== window.top

        if (isFramerPreview) {
            console.log("🟡 In Framer preview — redirect disabled")
            return
        }

        const timer = window.setTimeout(
            () => setShouldRedirect(true),
            Math.max(100, delay)
        )

        return () => window.clearTimeout(timer)
    }, [delay])

    useEffect(() => {
        if (
            typeof window !== "undefined" &&
            shouldRedirect &&
            !redirectedRef.current
        ) {
            redirectedRef.current = true
            window.location.replace(redirectUrl)
        }
    }, [shouldRedirect, redirectUrl])

    const positionStyle: React.CSSProperties = {
        position: "absolute",
        transform: `translate(${messageX}px, ${messageY}px)`,
    }

    switch (align) {
        case "topLeft":
            positionStyle.top = "24px"
            positionStyle.left = "24px"
            break
        case "topRight":
            positionStyle.top = "24px"
            positionStyle.right = "24px"
            break
        case "bottomLeft":
            positionStyle.bottom = "24px"
            positionStyle.left = "24px"
            break
        case "bottomRight":
            positionStyle.bottom = "24px"
            positionStyle.right = "24px"
            break
        default:
            positionStyle.top = "50%"
            positionStyle.left = "50%"
            positionStyle.transform =
                `translate(${messageX}px, ${messageY}px) translate(-50%, -50%)`
            break
    }

    return (
        <div
            aria-label="Redirecting to Glitch experience"
            style={{
                width: "100%",
                height: "100%",
                display: "flex",
                background: "#000",
                overflow: "hidden",
                position: "relative",
            }}
        >
            {video ? (
                <video
                    src={video}
                    autoPlay
                    loop
                    muted
                    playsInline
                    style={{
                        position: "absolute",
                        inset: 0,
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        zIndex: 1,
                    }}
                />
            ) : (
                <div
                    style={{
                        position: "absolute",
                        inset: 0,
                        background: "#000",
                        zIndex: 0,
                    }}
                />
            )}

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                style={{
                    ...positionStyle,
                    zIndex: 999,
                    color: "#f0f",
                    fontFamily: "monospace",
                    fontSize: 18,
                    background: "rgba(0,0,0,0.7)",
                    padding: "16px 24px",
                    borderRadius: "12px",
                    boxShadow: "0 0 12px #f0f",
                    textAlign: "center",
                    whiteSpace: "nowrap",
                }}
            >
                {message}
            </motion.div>
        </div>
    )
}

addPropertyControls(RedirectGlitch, {
    video: {
        type: ControlType.File,
        allowedFileTypes: ["mp4", "webm"],
        title: "Background MP4",
    },
    delay: {
        type: ControlType.Number,
        title: "Redirect Delay (ms)",
        min: 100,
        max: 5000,
        defaultValue: 500,
    },
    messageX: {
        type: ControlType.Number,
        title: "Overlay X Offset",
        defaultValue: 0,
        min: -200,
        max: 200,
    },
    messageY: {
        type: ControlType.Number,
        title: "Overlay Y Offset",
        defaultValue: 0,
        min: -200,
        max: 200,
    },
    align: {
        type: ControlType.Enum,
        options: ["center", "topLeft", "topRight", "bottomLeft", "bottomRight"],
        optionTitles: [
            "Center",
            "Top Left",
            "Top Right",
            "Bottom Left",
            "Bottom Right",
        ],
        title: "Overlay Position",
        defaultValue: "center",
    },
    redirectUrl: {
        type: ControlType.String,
        title: "Redirect URL",
        defaultValue:
            "https://vibyfy-gate-worker.vibyfy-chat.workers.dev/gate/glitch",
    },
    message: {
        type: ControlType.String,
        title: "Overlay Message",
        defaultValue: "⚡ Letting Go… Entering the Glitch...",
    },
})
