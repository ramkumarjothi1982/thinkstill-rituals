// Fresh versions after every deploy. The published site keeps each version
// in its own folder (v/<version>/src, v/<version>/assets) and names the
// current one in version.json (see tools/build-site.sh), so this checks
// that file, bypassing every cache, and moves to the newer version. Run
// locally there is no version folder, and nothing happens.

const folder = new URL('../../', import.meta.url);
const match = folder.pathname.match(/\/v\/([0-9a-zA-Z_-]+)\/$/);

/** The version this page is running, or null when run from the source tree. */
export const RUNNING = match ? match[1] : null;

/** The newest published version if it differs from this one, else null. */
export async function newerVersion() {
  if (!RUNNING) return null;
  try {
    const r = await fetch(new URL('../../version.json', folder), { cache: 'no-store' });
    if (!r.ok) return null;
    const { v } = await r.json();
    if (!v || v === RUNNING) return null;
    // already asked for it and the server still sent this page: don't loop
    if (new URLSearchParams(location.search).get('v') === v) return null;
    return v;
  } catch { return null; }
}

/** Reloads into version v, keeping any other query parameters. */
export function moveTo(v) {
  const url = new URL(location.href);
  url.searchParams.set('v', v);
  url.hash = '';
  location.replace(url.href);
}
