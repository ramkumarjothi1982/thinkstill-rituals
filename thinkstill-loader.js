export async function loadThinkStill(baseUrl = ".") {
  const url = (name) => `${baseUrl.replace(/\/$/, "")}/${name}`;
  const get = async (name) => {
    const res = await fetch(url(name), { cache: "no-store" });
    if (!res.ok) throw new Error(`ThinkStill load failed: ${name} (${res.status})`);
    return res.json();
  };

  const manifest = await get("manifest.json");
  const [rituals, backend, normalized, routing] = await Promise.all([
    get(manifest.files.rituals),
    get(manifest.files.backend),
    get(manifest.files.normalized),
    get(manifest.files.routing),
  ]);

  if (rituals.length !== manifest.row_count) {
    throw new Error(`ThinkStill row-count mismatch: expected ${manifest.row_count}, got ${rituals.length}`);
  }

  const backendById = new Map(backend.map(x => [x.id, x]));
  const normalizedById = new Map(normalized.map(x => [x.id, x]));

  return { manifest, rituals, backend, normalized, routing, backendById, normalizedById };
}
