(function (global) {
  "use strict";
  const DEFAULT_MANIFEST = "./manifest.json";
  async function getJSON(url) {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`ThinkStill fetch failed: ${res.status} ${url}`);
    return res.json();
  }
  function baseFrom(url) {
    return new URL(".", new URL(url, window.location.href)).href;
  }
  async function load(manifestUrl = DEFAULT_MANIFEST) {
    const manifest = await getJSON(manifestUrl);
    const base = baseFrom(manifestUrl);
    const [rituals, routing] = await Promise.all([
      getJSON(new URL(manifest.files.rituals, base)),
      getJSON(new URL(manifest.files.routing, base))
    ]);
    return { manifest, rituals, routing, base };
  }
  global.ThinkStillLoader = { load, getJSON };
})(window);
