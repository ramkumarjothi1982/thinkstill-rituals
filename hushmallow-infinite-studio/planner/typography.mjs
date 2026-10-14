// The renderer's typography transform, shared by the planner's layout
// pre-check and the composer's real layout. Pure, no imports: it loads in the
// render page as well as in Node, and passes the determinism guard.
//
// Copy is stored as ASCII (story-library format.typography) and drawn with
// typographic quotes: an apostrophe or quote that opens a word becomes an
// opening mark, any other a closing one.

export function typographic(text) {
  return text
    .replace(/(^|[\s([{])'/g, '$1‘').replace(/'/g, '’')
    .replace(/(^|[\s([{])"/g, '$1“').replace(/"/g, '”');
}
