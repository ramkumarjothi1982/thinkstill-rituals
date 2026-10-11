// ThinkStill Release Console · Mobile V2 build
//
//   node tools/build.mjs            → dev build  (build/dev-app.js, unminified, for local testing)
//   node tools/build.mjs --release  → release/thinkstill-mobile-app.js (+ .json: sha256, size, controls)
//   node tools/build.mjs --loader <commitSha>
//                                   → ThinkStillReleaseMobile.tsx, the small Framer code file that loads the
//                                     release payload from this repo at that exact commit (SHA-256 checked)
//
// The payload is the desktop Release Console source (desktop/: the same ritual engines, router, rotation,
// check-in, rewards and safety as the desktop build) + the mobile shell (mobile/*.tsx), compiled into ONE
// factory function `__TS_F(React, addPropertyControls, ControlType, motion, FramerMotionNS)` — the same
// contract as the desktop loader, so Framer only ever holds a ~8 KB code file.
//
// Needs esbuild + typescript: set TSM_NODE_MODULES to a node_modules dir that has them (default ../../../.. dev).
import fs from "node:fs"
import path from "node:path"
import crypto from "node:crypto"
import { execFileSync } from "node:child_process"
import { createRequire } from "node:module"

const HERE = path.dirname(new URL(import.meta.url).pathname)
const ROOT = path.dirname(HERE)
const NM = process.env.TSM_NODE_MODULES || "/tmp/claude-0/dev/node_modules"
const ESB = path.join(NM, ".bin", "esbuild")
const TSC = path.join(NM, ".bin", "tsc")
const REPO = "ramkumarjothi1982/thinkstill-rituals"
const args = process.argv.slice(2)
const mode = args.includes("--release") ? "release" : args.includes("--loader") ? "loader" : "dev"

function read(p) {
    return fs.readFileSync(p, "utf8")
}

// ---------------------------------------------------------------- 1. desktop source (shared file scope)
function desktopSource() {
    const d = path.join(ROOT, "desktop")
    const eos = fs.readdirSync(path.join(d, "eos")).filter((f) => f.endsWith(".jsx")).sort()
    const parts = [path.join(d, "00_arcade.jsx"), ...eos.map((f) => path.join(d, "eos", f)), path.join(d, "99_pixar.jsx")]
    return parts
        .map((p, i) => {
            let body = read(p).trim()
            if (i && /^import\s/m.test(body)) throw new Error(`${p}: only 00_arcade.jsx may import`)
            if (p.endsWith("99_pixar.jsx")) body = body.replace(/^export default function /m, "function ")
            if (/^export\s/m.test(body)) throw new Error(`${p}: unexpected export`)
            return `// ===== desktop/${path.relative(d, p)} =====\n` + body
        })
        .join("\n\n")
}

// ---------------------------------------------------------------- 2. mobile shell (TypeScript, own scope)
function mobileModules() {
    const d = path.join(ROOT, "mobile")
    return fs
        .readdirSync(d)
        .filter((f) => /\.tsx?$/.test(f))
        .sort()
        .map((f) => ({ f, src: read(path.join(d, f)) }))
}
function mobileTs() {
    const mods = mobileModules()
    for (const m of mods) if (/^import\s/m.test(m.src)) throw new Error(`mobile/${m.f}: no imports (shared scope)`)
    const body = mods.map((m) => `// ===== mobile/${m.f} =====\n${m.src.trim()}`).join("\n\n")
    return body
}
function typecheck(ts) {
    const dir = path.join(ROOT, "build")
    fs.mkdirSync(dir, { recursive: true })
    const file = path.join(dir, "mobile-check.tsx")
    fs.writeFileSync(file, `import * as React from "react"\n${ts}\n`)
    const cfg = {
        compilerOptions: { target: "es2019", module: "esnext", moduleResolution: "bundler", jsx: "react", strict: true, noEmit: true, skipLibCheck: true, lib: ["dom", "es2020", "dom.iterable"], typeRoots: [path.join(NM, "@types")], types: ["react"], baseUrl: NM, paths: { react: [path.join(NM, "@types/react")] } },
        files: [path.join(HERE, "desktop-globals.d.ts"), file],
    }
    const cfgPath = path.join(dir, "tsconfig.json")
    fs.writeFileSync(cfgPath, JSON.stringify(cfg, null, 1))
    try {
        execFileSync(TSC, ["-p", cfgPath], { stdio: "pipe", maxBuffer: 1 << 26 })
        return ""
    } catch (e) {
        return String(e.stdout || "") + String(e.stderr || "")
    }
}
function mobileJs(ts) {
    // TS → JS with JSX preserved; wrapped in one block-scoped IIFE so nothing collides with desktop names.
    const js = execFileSync(ESB, ["--loader=tsx", "--jsx=preserve", "--target=es2018", "--log-level=error"], { input: ts, maxBuffer: 1 << 26 }).toString("utf8")
    return `// ===== mobile shell =====\nconst ThinkStillMobileShell = (function () {\n${js}\nreturn { ThinkStillReleaseMobile, TSM_CONTROLS };\n})();\n`
}

// ---------------------------------------------------------------- 3. entry
const ENTRY = `
// ===== entry =====
export default function ThinkStillReleaseMobileApp(props) {
    return React.createElement(ThinkStillMobileShell.ThinkStillReleaseMobile, props)
}
addPropertyControls(ThinkStillReleaseMobileApp, ThinkStillMobileShell.TSM_CONTROLS)
`

function compileFactory(src, minify) {
    const importRe = /^import\s+(\*\s+as\s+([\w$]+)|\{([^}]*)\})\s+from\s+"([^"]+)"\s*;?\s*$/gm
    const imports = []
    src = src.replace(importRe, (line, _c, ns, named, mod) => {
        const names = ns ? [ns] : named.split(",").map((s) => s.trim()).filter(Boolean)
        imports.push({ names, mod })
        return ""
    })
    if (/^\s*import\s/m.test(src)) throw new Error("imports not all recognised")
    const exp = src.match(/^export default function ([\w$]+)\s*\(/m)
    if (!exp || (src.match(/^export\s/gm) || []).length !== 1) throw new Error("expected exactly one export default function")
    src = src.replace(/^export default function /m, "function ")
    const params = imports.flatMap((i) => i.names)
    const want = ["React", "addPropertyControls", "ControlType", "motion", "FramerMotionNS"]
    if (params.join(",") !== want.join(",")) throw new Error("unexpected import order: " + params.join(","))
    const wrapped = `__TS_F = (function (${params.join(", ")}) {\n"use strict";\n${src}\nreturn ${exp[1]};\n});`
    const flags = ["--loader=jsx", "--jsx=transform", "--jsx-factory=React.createElement", "--jsx-fragment=React.Fragment", "--target=es2018", "--keep-names", "--legal-comments=none", "--charset=ascii", "--log-level=error"]
    if (minify) flags.push("--minify")
    const out = execFileSync(ESB, flags, { input: wrapped, maxBuffer: 1 << 28 }).toString("utf8").trim()
    if (!/(^|[;\n])__TS_F\s*=/.test(out)) throw new Error("compiled output lost __TS_F")
    return out
}

async function readControls(compiled) {
    const require = createRequire(path.join(NM, "x.js"))
    const React = require("react")
    const FM = await import(require.resolve("framer-motion"))
    const CT = new Proxy({}, { get: (_, k) => `__CT__${String(k)}` })
    const captured = new Map()
    const apc = (c, ctrls) => captured.set(c, ctrls)
    const factory = new Function("var __TS_F;" + compiled + "\n;return __TS_F")()
    const App = factory(React, apc, CT, FM.motion, FM)
    return captured.get(App) || {}
}

function header(kind) {
    return `// ThinkStill Release Console · Mobile V2 (${kind}). Built by framer/mobile-v2/tools/build.mjs from desktop/ + mobile/. Do not edit.\n`
}

const ts = mobileTs()
if (mode !== "loader") {
    const errs = args.includes("--no-check") ? "" : typecheck(ts)
    if (errs) {
        console.error(errs.split("\n").slice(0, 60).join("\n"))
        if (!args.includes("--force")) process.exit(1)
    }
    const full = desktopSource() + "\n\n" + mobileJs(ts) + ENTRY
    if (mode === "dev") {
        const out = compileFactory(full, false)
        const dir = path.join(ROOT, "build")
        fs.mkdirSync(dir, { recursive: true })
        fs.writeFileSync(path.join(dir, "dev-app.js"), header("dev") + out)
        console.log(`dev build: build/dev-app.js (${(out.length / 1024).toFixed(0)} KB)`)
    } else {
        const out = header("release payload") + compileFactory(full, true)
        fs.mkdirSync(path.join(ROOT, "release"), { recursive: true })
        const file = path.join(ROOT, "release", "thinkstill-mobile-app.js")
        fs.writeFileSync(file, out)
        const sha = crypto.createHash("sha256").update(out).digest("hex")
        const controls = await readControls(out)
        fs.writeFileSync(path.join(ROOT, "release", "thinkstill-mobile-app.json"), JSON.stringify({ payload: "release/thinkstill-mobile-app.js", bytes: Buffer.byteLength(out), sha256: sha, controls }, null, 1))
        console.log(JSON.stringify({ bytes: Buffer.byteLength(out), sha256: sha, controls: Object.keys(controls).length }))
    }
} else {
    const commit = args[args.indexOf("--loader") + 1]
    if (!/^[0-9a-f]{40}$/.test(commit || "")) throw new Error("--loader needs a full 40-char commit sha")
    const meta = JSON.parse(read(path.join(ROOT, "release", "thinkstill-mobile-app.json")))
    const p = `framer/mobile-v2/release/thinkstill-mobile-app.js`
    const urls = [`https://cdn.jsdelivr.net/gh/${REPO}@${commit}/${p}`, `https://raw.githubusercontent.com/${REPO}/${commit}/${p}`]
    const ctl = (c) =>
        JSON.stringify(c, null, 4)
            .replace(/"__CT__(\w+)"/g, "ControlType.$1")
            .replace(/\n/g, "\n")
    const loader = read(path.join(HERE, "loader.template.tsx"))
        .replace("__URLS__", JSON.stringify(urls, null, 4))
        .replace("__SHA__", meta.sha256)
        .replace("__COMMIT__", commit.slice(0, 12))
        .replace("__BYTES__", String(Math.round(meta.bytes / 1024)))
        .replace("__CONTROLS__", ctl(meta.controls))
    fs.writeFileSync(path.join(ROOT, "ThinkStillReleaseMobile.tsx"), loader)
    console.log("wrote ThinkStillReleaseMobile.tsx for commit " + commit)
}
