// Stand-in for Framer's "framer" package so the landing component can be
// previewed and screenshotted outside Framer. Only what the component uses.
export const ControlType = {
    String: "string",
    Boolean: "boolean",
    Number: "number",
    Color: "color",
    Image: "image",
    File: "file",
    Enum: "enum",
    EventHandler: "eventhandler",
} as const

export function addPropertyControls(_component: unknown, _controls: Record<string, unknown>) {}

const params = typeof location !== "undefined" ? new URLSearchParams(location.search) : new URLSearchParams()
const target = params.get("target") || "preview"

export const RenderTarget = {
    canvas: "CANVAS",
    export: "EXPORT",
    thumbnail: "THUMBNAIL",
    preview: "PREVIEW",
    current: () => (target === "canvas" ? "CANVAS" : target === "live" ? "EXPORT" : "PREVIEW"),
}
