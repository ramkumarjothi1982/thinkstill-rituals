// Wrangler bundles *.md as text ([[rules]] in wrangler.toml); the tests load
// them through test/md-loader.mjs.
declare module '*.md' {
  const text: string;
  export default text;
}
