export async function loadThinkStill(baseUrl = ".") {
  const base = baseUrl.replace(/\/$/, "");
  const getJson = async (name) => {
    const res = await fetch(`${base}/${name}`, { cache: "no-store" });
    if (!res.ok) throw new Error(`ThinkStill load failed: ${name} (${res.status})`);
    return res.json();
  };

  const manifest = await getJson("manifest.json");
  const rituals = await getJson(manifest.files?.rituals || "rituals.json");

  if (!Array.isArray(rituals) || rituals.length !== manifest.row_count) {
    throw new Error(`Expected ${manifest.row_count} rituals; received ${Array.isArray(rituals) ? rituals.length : "non-array"}`);
  }

  return { manifest, rituals };
}
