// Published at the old address src/app/main.js. A page cached before
// versioned folders existed still loads this file: it jumps to the current
// version, bypassing the cache.
const root = new URL('../../', import.meta.url);
fetch(new URL('version.json', root), { cache: 'no-store' })
  .then((r) => r.json())
  .then(({ v }) => { if (v) location.replace(new URL(`./?v=${encodeURIComponent(v)}`, root).href); })
  .catch(() => {});
