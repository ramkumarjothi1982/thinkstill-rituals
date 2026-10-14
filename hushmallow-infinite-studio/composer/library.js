// The slice of the story library the composer reads, indexed without
// Node: beat clocks, templates by id, and the layout format. The planner's
// full index (planner/library.mjs) satisfies the same interface, so compose()
// accepts either.

export function indexLibraryLite(raw) {
  const templates = new Map(raw.templates.map((t) => [t.id, t]));
  const shortIds = new Map(raw.templates.map((t) => [t.id.split('-')[0], t.id]));
  const clocks = {};
  for (const d of Object.keys(raw.beatClocks)) if (!d.startsWith('$')) clocks[d] = raw.beatClocks[d];
  return {
    raw, version: raw.version, clocks,
    template: (id) => templates.get(id) || templates.get(shortIds.get(String(id).toUpperCase())) || null,
  };
}
