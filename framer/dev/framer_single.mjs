// ONE Framer code file under Framer's 1 MB per-file limit (founder: "must be 1 file").
//
//   node dev/framer_single.mjs [SRC.txt] [OUT.txt]
//   default: ThinkStillReleaseArcade_EOS_FULL.txt -> ThinkStillRelease_FRAMER.txt
//
// The app compiles to ~1.75 MB of minified JavaScript, above Framer's limit (1,048,576 bytes uncompressed per code
// file). This build compiles the whole app into one function (its imports become the function's parameters, its
// default export becomes the return value), deflates it and embeds it as base64. At module load the file inflates it
// synchronously (fflate, MIT), creates the function with `new Function`, passes React / framer / framer-motion in,
// and exports a real `export default function ThinkStillRelease` that renders the app, with the app's own property
// controls attached. Same code, same behaviour, one file of about 0.6 MB.
import fs from "node:fs"
import path from "node:path"
import zlib from "node:zlib"
import { execFileSync } from "node:child_process"

const HERE = path.dirname(new URL(import.meta.url).pathname)
const ROOT = path.dirname(HERE)
const SRC = path.resolve(process.argv[2] || path.join(ROOT, "ThinkStillReleaseArcade_EOS_FULL.txt"))
const OUT = path.resolve(process.argv[3] || path.join(ROOT, "ThinkStillRelease_FRAMER.txt"))
const ESB = path.join(HERE, "node_modules", ".bin", "esbuild")
const LIMIT = 1048576

let src = fs.readFileSync(SRC, "utf8")
// 1. the import lines -> function parameters (outer file keeps the same imports and passes them in)
const importRe = /^import\s+(\*\s+as\s+([\w$]+)|\{([^}]*)\})\s+from\s+"([^"]+)"\s*;?\s*$/gm
const imports = []
src = src.replace(importRe, (line, _clause, ns, named, mod) => {
    const names = ns ? [ns] : named.split(",").map((s) => s.trim()).filter(Boolean).map((s) => {
        const m = s.match(/^([\w$]+)(?:\s+as\s+([\w$]+))?$/)
        if (!m) throw new Error("unsupported import clause: " + s)
        return m[2] || m[1]
    })
    imports.push({ line: line.trim().replace(/;$/, ""), names, mod })
    return ""
})
if (!imports.length || /^\s*import\s/m.test(src)) throw new Error("imports not all recognised")
const params = imports.flatMap((i) => i.names)
// 2. the default export -> return value
const exp = src.match(/^export default function ([\w$]+)\s*\(/m)
if (!exp || (src.match(/^export\s/gm) || []).length !== 1) throw new Error("expected exactly one `export default function Name(`")
const appName = exp[1]
src = src.replace(/^export default function /m, "function ")
// assigned to a marker so the minifier keeps it (an unused function expression would be dropped as dead code)
const wrapped = `__TS_F = (function (${params.join(", ")}) {\n"use strict";\n${src}\nreturn ${appName};\n});`
// 3. compile JSX away + minify (plain ES2018 JavaScript)
const compiled = execFileSync(ESB, ["--loader=jsx", "--jsx=transform", "--jsx-factory=React.createElement",
    "--jsx-fragment=React.Fragment", "--target=es2018", "--minify", "--keep-names", "--legal-comments=none",
    "--charset=utf8", "--log-level=error"], { input: wrapped, maxBuffer: 1 << 28 }).toString("utf8").trim().replace(/;$/, "")
// esbuild may put small helpers (e.g. keep-names) before the assignment: keep the whole program, read __TS_F at the end
if (!/(^|[;\n])__TS_F=/.test(compiled)) throw new Error("compiled output lost the __TS_F assignment: " + compiled.slice(0, 80))
const fnText = compiled
// 4. deflate + base64, in lines of 4000 chars
const z = zlib.deflateRawSync(Buffer.from(fnText, "utf8"), { level: 9 })
const b64 = z.toString("base64")
const lines = b64.match(/.{1,4000}/g)
// 5. synchronous inflate (fflate inflateSync, tree-shaken) as an inline IIFE
const inflateIife = execFileSync(ESB, ["--bundle", "--format=iife", "--global-name=__tsInflate", "--minify",
    "--target=es2018", "--log-level=error"], {
    input: 'export { inflateSync } from "fflate"', cwd: HERE, maxBuffer: 1 << 26,
}).toString("utf8").trim()
// 6. the file Framer sees
const args = params.map((p) => (p === "addPropertyControls" ? "__tsAddControls" : p))
const hasAPC = params.includes("addPropertyControls")
if (!hasAPC) throw new Error("the app must import addPropertyControls from framer")
const out = `// ThinkStill Release Console - Framer code component. ONE file: paste ALL of it into one Framer code file.
// The app (all 114 games) is stored compressed below and unpacked when the component loads, because Framer allows
// at most 1 MB per code file. Built by framer/dev/framer_single.mjs from framer/ThinkStillReleaseArcade_EOS_FULL.txt.
// Includes fflate (inflateSync) - MIT License, Copyright (c) 2023 Arjun Barrett.
${imports.map((i) => i.line).join("\n")}

${inflateIife}

const __TS_APP_Z = [
${lines.map((l) => JSON.stringify(l)).join(",\n")},
].join("")

const __tsControls = new Map()
function __tsAddControls(component, controls) {
    try { __tsControls.set(component, controls) } catch (e) {}
    return addPropertyControls(component, controls)
}

let __TS_APP = null
let __TS_ERROR = null
try {
    const bin = atob(__TS_APP_Z)
    const bytes = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
    const code = new TextDecoder().decode(__tsInflate.inflateSync(bytes))
    const factory = new Function("var __TS_F;" + code + ";return __TS_F")()
    __TS_APP = factory(${args.join(", ")})
} catch (e) {
    __TS_ERROR = e
    if (typeof console !== "undefined") console.error("ThinkStill could not start", e)
}

export default function ThinkStillRelease(props) {
    if (!__TS_APP) {
        return React.createElement("div", { style: { width: "100%", height: "100%", display: "grid", placeItems: "center", background: "#0b0f1e", color: "#eef1ff", font: "600 14px system-ui, sans-serif", padding: 16, textAlign: "center" } },
            "ThinkStill could not start: " + String((__TS_ERROR && __TS_ERROR.message) || __TS_ERROR || "unknown error"))
    }
    return React.createElement(__TS_APP, props)
}

if (__TS_APP) addPropertyControls(ThinkStillRelease, __tsControls.get(__TS_APP) || __TS_APP.propertyControls || {})
`
fs.writeFileSync(OUT, out)
const bytes = Buffer.byteLength(out)
console.log(JSON.stringify({ out: path.relative(ROOT, OUT), bytes, kb: Math.round(bytes / 1024), underLimit: bytes < LIMIT, compiledKB: Math.round(fnText.length / 1024), deflatedKB: Math.round(z.length / 1024), base64KB: Math.round(b64.length / 1024), params }))
if (bytes >= LIMIT) process.exit(1)
