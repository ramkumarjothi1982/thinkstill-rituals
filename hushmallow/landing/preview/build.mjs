// Bundles the Framer component into dist/ for a local browser preview.
//   node build.mjs            → dist/index.html + dist/app.js + dist/assets/
//   node build.mjs --inline   → also dist/standalone.html (one file, art inlined)
import { build } from "esbuild"
import { cpSync, mkdirSync, readFileSync, writeFileSync, readdirSync } from "node:fs"
import { fileURLToPath } from "node:url"
import path from "node:path"

const here = path.dirname(fileURLToPath(import.meta.url))
const dist = path.join(here, "dist")
mkdirSync(dist, { recursive: true })
await build({
    entryPoints: [path.join(here, "main.tsx")],
    bundle: true,
    minify: true,
    format: "iife",
    target: "es2020",
    outfile: path.join(dist, "app.js"),
    alias: { framer: path.join(here, "framer-shim.ts") },
    nodePaths: [path.join(here, "node_modules")],
    define: { "process.env.NODE_ENV": '"production"' },
    logLevel: "warning",
})
cpSync(path.join(here, "..", "assets"), path.join(dist, "assets"), { recursive: true })
const page = (script) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<title>hushmallow</title>
<style>html,body{margin:0;background:#FFF8F3}</style>
</head>
<body>
<div id="root"></div>
${script}
</body>
</html>
`
writeFileSync(path.join(dist, "index.html"), page('<script src="app.js"></script>'))

if (process.argv.includes("--inline")) {
    let js = readFileSync(path.join(dist, "app.js"), "utf8")
    for (const f of readdirSync(path.join(dist, "assets"))) {
        const b64 = readFileSync(path.join(dist, "assets", f)).toString("base64")
        js = js.split(`assets/${f}`).join(`data:image/webp;base64,${b64}`)
        js = js.split(`assets/"+"${f}`).join(`data:image/webp;base64,${b64}`)
    }
    writeFileSync(path.join(dist, "standalone.html"), page(`<script>${js.replace(/<\/script/g, "<\\/script")}</script>`))
}
console.log("built", dist)
