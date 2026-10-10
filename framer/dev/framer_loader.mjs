// SMALL Framer code file + hosted app (Framer kept rejecting the large single file: "Component file does not exist").
//
//   node dev/framer_loader.mjs payload [SRC.txt]       -> framer/release/thinkstill-app.js (+ .json with sha256, size, controls)
//   node dev/framer_loader.mjs loader <commitSha>      -> framer/ThinkStillRelease_LOADER.txt (the file pasted into Framer)
//
// The app (the 30-game launch build) is compiled into one function, exactly like dev/framer_single.mjs, and stored
// as a plain JavaScript file in this public GitHub repository (the character pictures are already served from it).
// The Framer code file is tiny: it registers the component and its property controls immediately, downloads the
// app from jsDelivr (GitHub CDN) or raw.githubusercontent.com, checks its SHA-256 before running it, then renders
// it. The URLs point at one exact commit, so the code that runs can never change under the site.
import fs from "node:fs"
import path from "node:path"
import crypto from "node:crypto"
import { execFileSync } from "node:child_process"
import { createRequire } from "node:module"

const HERE = path.dirname(new URL(import.meta.url).pathname)
const ROOT = path.dirname(HERE)
const REL = path.join(ROOT, "release")
const PAYLOAD = path.join(REL, "thinkstill-app.js")
const META = path.join(REL, "thinkstill-app.json")
const ESB = path.join(HERE, "node_modules", ".bin", "esbuild")
const REPO = "ramkumarjothi1982/thinkstill-rituals"
const mode = process.argv[2]

function compileApp(srcPath) {
    let src = fs.readFileSync(srcPath, "utf8")
    const importRe = /^import\s+(\*\s+as\s+([\w$]+)|\{([^}]*)\})\s+from\s+"([^"]+)"\s*;?\s*$/gm
    const imports = []
    src = src.replace(importRe, (line, _c, ns, named, mod) => {
        const names = ns ? [ns] : named.split(",").map((s) => s.trim()).filter(Boolean).map((s) => {
            const m = s.match(/^([\w$]+)(?:\s+as\s+([\w$]+))?$/)
            if (!m) throw new Error("unsupported import clause: " + s)
            return m[2] || m[1]
        })
        imports.push({ line: line.trim().replace(/;$/, ""), names, mod })
        return ""
    })
    if (!imports.length || /^\s*import\s/m.test(src)) throw new Error("imports not all recognised")
    const exp = src.match(/^export default function ([\w$]+)\s*\(/m)
    if (!exp || (src.match(/^export\s/gm) || []).length !== 1) throw new Error("expected exactly one `export default function Name(`")
    src = src.replace(/^export default function /m, "function ")
    const params = imports.flatMap((i) => i.names)
    const wrapped = `__TS_F = (function (${params.join(", ")}) {\n"use strict";\n${src}\nreturn ${exp[1]};\n});`
    const compiled = execFileSync(ESB, ["--loader=jsx", "--jsx=transform", "--jsx-factory=React.createElement",
        "--jsx-fragment=React.Fragment", "--target=es2018", "--minify", "--keep-names", "--legal-comments=none",
        "--charset=ascii", "--log-level=error"], { input: wrapped, maxBuffer: 1 << 28 }).toString("utf8").trim()
    if (!/(^|[;\n])__TS_F=/.test(compiled)) throw new Error("compiled output lost the __TS_F assignment")
    return { compiled, imports, params }
}

// property controls of the app, serialised to source (ControlType.X stays symbolic)
async function readControls(compiled, params) {
    const require = createRequire(path.join(HERE, "package.json"))
    const React = require("react")
    const FM = await import(require.resolve("framer-motion"))
    const CT = new Proxy({}, { get: (_, k) => `__CT__${String(k)}` })
    const captured = new Map()
    const apc = (c, ctrls) => { captured.set(c, ctrls); try { c.propertyControls = ctrls } catch (e) {} }
    const deps = { React, addPropertyControls: apc, ControlType: CT, motion: FM.motion, FramerMotionNS: FM }
    const factory = new Function("var __TS_F;" + compiled + ";return __TS_F")()
    const App = factory(...params.map((p) => { if (!(p in deps)) throw new Error("unknown import " + p); return deps[p] }))
    const controls = captured.get(App) || App.propertyControls
    if (!controls || !Object.keys(controls).length) throw new Error("no property controls on the app component")
    const ser = (v) => {
        if (typeof v === "function") throw new Error("a property control uses a function; cannot serialise")
        if (typeof v === "string" && v.startsWith("__CT__")) return "ControlType." + v.slice(6)
        if (Array.isArray(v)) return "[" + v.map(ser).join(", ") + "]"
        if (v && typeof v === "object") return "{ " + Object.entries(v).map(([k, x]) => `${JSON.stringify(k)}: ${ser(x)}`).join(", ") + " }"
        return JSON.stringify(v)
    }
    const src = "{\n" + Object.entries(controls).map(([k, v]) => `    ${JSON.stringify(k)}: ${ser(v)},`).join("\n") + "\n}"
    return { count: Object.keys(controls).length, src }
}

if (mode === "payload") {
    const SRC = path.resolve(process.argv[3] || path.join(ROOT, "ThinkStillReleaseArcade_EOS_FULL.txt"))
    const { compiled, imports, params } = compileApp(SRC)
    fs.mkdirSync(REL, { recursive: true })
    const body = "// ThinkStill Release Console app (30-game launch build). Loaded by the ThinkStillRelease Framer code file; do not edit.\n" + compiled + "\n"
    fs.writeFileSync(PAYLOAD, body)
    const sha256 = crypto.createHash("sha256").update(Buffer.from(body, "utf8")).digest("hex")
    const controls = await readControls(compiled, params)
    fs.writeFileSync(META, JSON.stringify({ sha256, bytes: Buffer.byteLength(body), imports: imports.map((i) => i.line), params, controlsCount: controls.count, controlsSrc: controls.src }, null, 1))
    console.log(JSON.stringify({ payload: path.relative(ROOT, PAYLOAD), bytes: Buffer.byteLength(body), sha256, controls: controls.count }))
} else if (mode === "loader") {
    const sha = process.argv[3]
    if (!/^[0-9a-f]{40}$/.test(sha || "")) throw new Error("usage: node dev/framer_loader.mjs loader <40-char commit sha>")
    const meta = JSON.parse(fs.readFileSync(META, "utf8"))
    const rel = "framer/release/thinkstill-app.js"
    const urls = [`https://cdn.jsdelivr.net/gh/${REPO}@${sha}/${rel}`, `https://raw.githubusercontent.com/${REPO}/${sha}/${rel}`]
    const args = meta.params.map((p) => (p === "addPropertyControls" ? "__tsAddControls" : p))
    const out = `// ThinkStill Release Console - Framer code component (30-game launch build).
// Paste ALL of this into ONE Framer code file named ThinkStillRelease, then drag ThinkStillRelease onto the page.
// The app itself (about 1.7 MB) is too large for a Framer code file, so this small file loads it from the
// ThinkStill GitHub repository (commit ${sha.slice(0, 12)}), checks its SHA-256 fingerprint, and runs it.
${meta.imports.join("\n")}

const TS_APP_URLS = ${JSON.stringify(urls, null, 4)}
const TS_APP_SHA256 = "${meta.sha256}"

let tsApp = null
let tsError = null
let tsPromise = null
const tsControls = new Map()
function __tsAddControls(component, controls) {
    try { tsControls.set(component, controls) } catch (e) {}
    return addPropertyControls(component, controls)
}
async function tsSha256(text) {
    if (typeof crypto === "undefined" || !crypto.subtle || typeof TextEncoder === "undefined") return null
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text))
    return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("")
}
function tsLoadApp() {
    if (tsPromise) return tsPromise
    tsPromise = (async () => {
        let lastError = null
        for (const url of TS_APP_URLS) {
            try {
                const res = await fetch(url, { cache: "force-cache", credentials: "omit" })
                if (!res.ok) throw new Error("HTTP " + res.status + " from " + url)
                const code = await res.text()
                const hash = await tsSha256(code)
                if (hash && hash !== TS_APP_SHA256) throw new Error("fingerprint mismatch from " + url)
                const factory = new Function("var __TS_F;" + code + "\\n;return __TS_F")()
                tsApp = factory(${args.join(", ")})
                return tsApp
            } catch (e) {
                lastError = e
            }
        }
        throw lastError || new Error("could not load the app")
    })()
    tsPromise.catch((e) => { tsError = e; tsPromise = null })
    return tsPromise
}
if (typeof window !== "undefined") tsLoadApp().catch(() => {})

export default function ThinkStillRelease(props) {
    const [, setTick] = React.useState(0)
    React.useEffect(() => {
        if (tsApp) return
        let alive = true
        tsLoadApp().then(() => alive && setTick((n) => n + 1), () => alive && setTick((n) => n + 1))
        return () => { alive = false }
    }, [])
    if (tsApp) return React.createElement(tsApp, props)
    const box = { width: "100%", height: "100%", minHeight: 320, display: "grid", placeItems: "center", background: "#0b0f1e", color: "#eef1ff", font: "600 15px system-ui, -apple-system, sans-serif", textAlign: "center", padding: 16, boxSizing: "border-box" }
    if (tsError) {
        return React.createElement("div", { style: box },
            React.createElement("div", null,
                React.createElement("div", { style: { marginBottom: 12 } }, "ThinkStill could not load. Check your connection and try again."),
                React.createElement("button", { type: "button", onClick: () => { tsError = null; setTick((n) => n + 1); tsLoadApp().then(() => setTick((n) => n + 1), () => setTick((n) => n + 1)) }, style: { font: "700 15px system-ui, sans-serif", padding: "12px 20px", borderRadius: 999, border: 0, background: "#ffc86b", color: "#1a1030", cursor: "pointer" } }, "Try again"),
                React.createElement("div", { style: { marginTop: 12, opacity: 0.6, fontSize: 12 } }, String((tsError && tsError.message) || tsError))))
    }
    return React.createElement("div", { style: box, "aria-busy": "true" }, "ThinkStill is getting ready…")
}

addPropertyControls(ThinkStillRelease, ${meta.controlsSrc})
`
    const file = path.join(ROOT, "ThinkStillRelease_LOADER.txt")
    fs.writeFileSync(file, out)
    console.log(JSON.stringify({ loader: path.relative(ROOT, file), bytes: Buffer.byteLength(out), urls, controls: meta.controlsCount }))
} else {
    console.log("usage: node dev/framer_loader.mjs payload [SRC.txt] | loader <commitSha>")
    process.exit(2)
}
