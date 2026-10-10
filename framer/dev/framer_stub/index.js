// Local test stub of Framer's runtime API (property controls are inert outside Framer).
export function addPropertyControls(component, controls) { try { component.propertyControls = controls } catch {} }
export const ControlType = new Proxy({}, { get: (_, k) => String(k) })
export const RenderTarget = { current: () => "PREVIEW", canvas: "CANVAS", preview: "PREVIEW", export: "EXPORT", thumbnail: "THUMBNAIL" }
export default { addPropertyControls, ControlType, RenderTarget }
