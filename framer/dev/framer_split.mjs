// Split the ThinkStill Framer component into several code files that each stay under Framer's 1 MB per-file limit.
//
//   node dev/framer_split.mjs [SRC.txt] [OUT_DIR] [--name ThinkStillRelease] [--max 700000]
//
// How it works. The whole app is ONE module scope (23 source parts share top-level names). The compiled program is
// parsed (acorn) and scope-analysed (eslint-scope); every top-level binding `foo` becomes a property `S.foo` of one
// shared object, so the statements can live in any file. Each part file exports one function that (1) defines that
// part's hoisted function declarations on S and (2) returns a runner for its remaining top-level statements, in the
// original order. The main file imports the parts, runs all definitions first (JS function hoisting), then all
// runners in source order, and keeps the real `export default function` + addPropertyControls so Framer sees one
// component with its property controls. Behaviour is otherwise identical to the single-file build.
import fs from "node:fs"
import path from "node:path"
import { execFileSync } from "node:child_process"
import * as acorn from "acorn"
import * as eslintScope from "eslint-scope"
import MagicString from "magic-string"

const HERE = path.dirname(new URL(import.meta.url).pathname)
const ROOT = path.dirname(HERE)
const args = process.argv.slice(2)
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d }
const positional = args.filter((a, i) => !a.startsWith("--") && (i === 0 || !args[i - 1].startsWith("--")))
const SRC = path.resolve(positional[0] || path.join(ROOT, "ThinkStillReleaseArcade_EOS_FULL.txt"))
const OUT = path.resolve(positional[1] || path.join(ROOT, "framer_files"))
const NAME = opt("--name", "ThinkStillRelease")
const MAX = Number(opt("--max", 700000)) // target bytes per minified part (Framer's hard limit is 1,048,576)
const ESB = path.join(HERE, "node_modules", ".bin", "esbuild")

// 1. compile JSX away (plain ES2018 JavaScript, not minified, one module)
const compiled = execFileSync(ESB, [SRC, "--loader:.txt=jsx", "--jsx=transform", "--jsx-factory=React.createElement",
    "--jsx-fragment=React.Fragment", "--format=esm", "--target=es2018", "--legal-comments=none", "--charset=utf8",
    "--log-level=error"], { maxBuffer: 1 << 28 }).toString("utf8")

// 2. parse + scope analysis
const ast = acorn.parse(compiled, { ecmaVersion: 2022, sourceType: "module", ranges: true, locations: true })
const scopeManager = eslintScope.analyze(ast, { ecmaVersion: 2022, sourceType: "module", nodejsScope: false, impliedStrict: true })
const moduleScope = scopeManager.globalScope.childScopes.find((s) => s.type === "module")
if (!moduleScope) throw new Error("no module scope")

// parent links (for shorthand properties and for-heads)
;(function link(node, parent) {
    if (!node || typeof node.type !== "string") return
    node.parent = parent
    for (const k of Object.keys(node)) {
        if (k === "parent") continue
        const v = node[k]
        if (Array.isArray(v)) v.forEach((c) => c && typeof c.type === "string" && link(c, node))
        else if (v && typeof v.type === "string") link(v, node)
    }
})(ast, null)

const body = ast.body
const imports = body.filter((n) => n.type === "ImportDeclaration")
// esbuild emits either `export default function Name` or a trailing `export { Name as default }`
let exportDefault = body.find((n) => n.type === "ExportDefaultDeclaration")
let mainName, exportStmt = null
if (exportDefault) {
    if (exportDefault.declaration.type !== "FunctionDeclaration") throw new Error("expected `export default function Name(props)`")
    mainName = exportDefault.declaration.id.name
} else {
    exportStmt = body.find((n) => n.type === "ExportNamedDeclaration" && !n.declaration && n.specifiers.some((sp) => sp.exported.name === "default"))
    if (!exportStmt) throw new Error("no default export found")
    const sp = exportStmt.specifiers.find((sp) => sp.exported.name === "default")
    if (exportStmt.specifiers.length !== 1) throw new Error("unexpected named exports next to the default export")
    mainName = sp.local.name
    exportDefault = body.find((n) => n.type === "FunctionDeclaration" && n.id && n.id.name === mainName)
    if (!exportDefault) throw new Error(`default export ${mainName} is not a top-level function declaration`)
}
const exportIdx = body.indexOf(exportDefault)
const named = body.filter((n) => (n.type === "ExportNamedDeclaration" && n !== exportStmt) || n.type === "ExportAllDeclaration")
if (named.length) throw new Error("unexpected named exports: " + named.map((n) => compiled.slice(n.start, n.start + 60)).join(" | "))

// module-scope variables declared by our code (not imports, not the default export)
const vars = moduleScope.variables.filter((v) => v.defs.length && v.defs.every((d) => d.type !== "ImportBinding") && v.name !== mainName)
const importNames = new Set(moduleScope.variables.filter((v) => v.defs.some((d) => d.type === "ImportBinding")).map((v) => v.name))
const renamed = new Set(vars.map((v) => v.name))
if (renamed.has("S")) throw new Error("a top-level binding is called S")

const ms = new MagicString(compiled)
// 3a. references -> S.name
for (const v of vars) {
    for (const ref of v.references) {
        const id = ref.identifier
        // declaration identifiers are rewritten with their declarations below; skip the ones eslint-scope lists as refs
        if (ref.init && id.parent && id.parent.type === "VariableDeclarator" && id.parent.id === id) continue
        if (id.parent && id.parent.type === "Property" && id.parent.shorthand && id.parent.value === id) {
            ms.overwrite(id.start, id.end, `${v.name}: S.${v.name}`)
        } else {
            ms.overwrite(id.start, id.end, `S.${v.name}`)
        }
    }
}
// 3b. declarations
const topLevel = new Set(body)
const phase1 = new Set() // FunctionDeclaration statements (hoisted)
function rewriteVarDecl(node) {
    // VariableDeclaration whose declarators are module-scope bindings
    const parent = node.parent
    const inForHead = parent && ((parent.type === "ForStatement" && parent.init === node) || ((parent.type === "ForInStatement" || parent.type === "ForOfStatement") && parent.left === node))
    const parts = []
    let needsBlock = false
    for (const d of node.declarations) {
        if (d.id.type === "Identifier") {
            if (inForHead && !d.init) parts.push(`S.${d.id.name}`)
            else parts.push(`S.${d.id.name} = ${d.init ? ms.slice(d.init.start, d.init.end) : "void 0"}`)
        } else {
            needsBlock = true
        }
    }
    if (needsBlock) {
        if (inForHead) throw new Error("destructuring declaration in a for-head at module scope: " + compiled.slice(node.start, node.start + 80))
        // keep the original destructuring inside a block, then copy the bindings onto S
        const names = []
        ;(function collect(p) {
            if (!p) return
            if (p.type === "Identifier") names.push(p.name)
            else if (p.type === "ObjectPattern") p.properties.forEach((q) => collect(q.type === "RestElement" ? q.argument : q.value))
            else if (p.type === "ArrayPattern") p.elements.forEach(collect)
            else if (p.type === "AssignmentPattern") collect(p.left)
            else if (p.type === "RestElement") collect(p.argument)
        })(node.declarations.length === 1 ? node.declarations[0].id : null)
        if (node.declarations.length !== 1) throw new Error("mixed destructuring declaration at module scope: " + compiled.slice(node.start, node.start + 80))
        const d = node.declarations[0]
        ms.overwrite(node.start, node.end, `{ const ${ms.slice(d.id.start, d.id.end)} = ${ms.slice(d.init.start, d.init.end)}; ${names.map((n) => `S.${n} = ${n};`).join(" ")} }`)
        return
    }
    ms.overwrite(node.start, node.end, inForHead ? parts.join(", ") : parts.join(", ") + ";")
}
const handledDecls = new Set()
for (const v of vars) {
    for (const def of v.defs) {
        const node = def.node
        if (def.type === "FunctionName") {
            if (node.type !== "FunctionDeclaration" || !topLevel.has(node)) throw new Error("function binding not at top level: " + v.name)
            phase1.add(node)
            ms.overwrite(node.start, node.id.end, `S.${v.name} = ${node.async ? "async " : ""}function${node.generator ? "*" : ""} ${v.name}`)
            ms.appendRight(node.end, ";")
        } else if (def.type === "ClassName") {
            if (node.type !== "ClassDeclaration" || !topLevel.has(node)) throw new Error("class binding not at top level: " + v.name)
            ms.overwrite(node.start, node.id.end, `S.${v.name} = class ${v.name}`)
            ms.appendRight(node.end, ";")
        } else if (def.type === "Variable") {
            const decl = def.parent // VariableDeclaration
            if (handledDecls.has(decl)) continue
            handledDecls.add(decl)
            rewriteVarDecl(decl)
        } else {
            throw new Error(`unsupported module-scope definition ${def.type} for ${v.name}`)
        }
    }
}
// the default export stays a real function declaration (its own name is not renamed)
const defaultRefs = moduleScope.variables.find((v) => v.name === mainName)
const refsBeforeExport = defaultRefs ? defaultRefs.references.filter((r) => r.identifier.start < exportDefault.start) : []
if (refsBeforeExport.length) throw new Error(`${mainName} is referenced before its declaration (would land in a part file)`)

// 4. chunk the statements
const stmts = body.filter((n) => n.type !== "ImportDeclaration" && n !== exportStmt)
const importText = imports.map((n) => compiled.slice(n.start, n.end)).join("\n")
const textOf = (n) => ms.slice(n.start, n.end)
const beforeExport = stmts.filter((n) => body.indexOf(n) < exportIdx)
const fromExport = stmts.filter((n) => body.indexOf(n) >= exportIdx)
const chunks = []
let cur = [], curLen = 0
const RATIO = 0.62 // minified / unminified size for this code (measured); keep the parts under MAX after minify
for (const n of beforeExport) {
    const t = textOf(n)
    if (cur.length && (curLen + t.length) * RATIO > MAX) { chunks.push(cur); cur = []; curLen = 0 }
    cur.push(n); curLen += t.length
}
if (cur.length) chunks.push(cur)

fs.mkdirSync(OUT, { recursive: true })
const partNames = chunks.map((_, i) => `${NAME}Part${i + 1}`)
const files = []
chunks.forEach((chunk, i) => {
    const defs = chunk.filter((n) => phase1.has(n)).map(textOf).join("\n")
    const run = chunk.filter((n) => !phase1.has(n)).map(textOf).join("\n")
    const code = `// ${partNames[i]} - part ${i + 1} of ${chunks.length} of the ThinkStill Release Console. Not a component: do not add it to a page. Imported by ${NAME}.\n${importText}\nexport function ${partNames[i]}(S) {\nif (!S || !S.__thinkstill) return null; // dragged onto a page by mistake: render nothing\n${defs}\nreturn function run() {\n${run}\n}\n}\n`
    files.push({ name: partNames[i], code })
})
const mainDefs = fromExport.filter((n) => phase1.has(n) && n !== exportDefault).map(textOf).join("\n")
const mainRun = fromExport.filter((n) => !phase1.has(n) && n !== exportDefault).map(textOf).join("\n")
const mainCode = `// ${NAME} - the ThinkStill Release Console component (add THIS one to the page). It imports ${partNames.join(", ")}.\n${importText}\n${partNames.map((p) => `import { ${p} } from "./${p}"`).join("\n")}\nconst S = Object.create(null)\nS.__thinkstill = true\nconst __runners = [${partNames.map((p) => `${p}(S)`).join(", ")}]\n${mainDefs}\nfor (const r of __runners) r()\n${mainRun}\n${exportStmt ? "export default " + textOf(exportDefault) : textOf(exportDefault)}\n`
files.push({ name: NAME, code: mainCode })

// 5. minify each file separately and check Framer's limit
const LIMIT = 1048576
const report = []
for (const f of files) {
    if (f.name === NAME) { // the main file is small: keep it readable, with a plain `export default function`
        const file = path.join(OUT, f.name + ".txt")
        fs.writeFileSync(file, f.code)
        report.push({ file: path.basename(file), bytes: Buffer.byteLength(f.code), ok: Buffer.byteLength(f.code) < LIMIT })
        continue
    }
    const raw = path.join(OUT, f.name + ".raw.js")
    fs.writeFileSync(raw, f.code)
    const min = execFileSync(ESB, [raw, "--format=esm", "--target=es2018", "--minify", "--legal-comments=none", "--charset=utf8", "--log-level=error"], { maxBuffer: 1 << 28 }).toString("utf8")
    fs.unlinkSync(raw)
    const header = f.code.split("\n")[0] + "\n"
    const out = header + min
    const file = path.join(OUT, f.name + ".txt")
    fs.writeFileSync(file, out)
    report.push({ file: path.basename(file), bytes: Buffer.byteLength(out), ok: Buffer.byteLength(out) < LIMIT })
}
console.log(JSON.stringify({ parts: chunks.length, topLevelBindings: vars.length, files: report }, null, 1))
if (report.some((r) => !r.ok)) { console.error("a file is over Framer's 1 MB limit"); process.exit(1) }
