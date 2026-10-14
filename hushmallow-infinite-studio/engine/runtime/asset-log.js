// Asset log: which rasters a render used, and how far each was magnified.
//
// Brand rule: approved art is never upscaled. The page records
//   - every raster the engine turns into a texture or draws (role, URL for
//     loaded images, pixel size), and
//   - the maximum magnification per raster: output pixels per source pixel,
//     taken over every sub-frame actually rendered.
// The worker reads snapshot() after each segment; Node joins each URL with the
// sha256 of the file the static server delivered (render/lib/provenance.mjs),
// so a job's provenance lists every texture URL with its hash.
//
// Magnification of the Mallow rasters (art, pristine, face, normal: they share
// the mesh UVs) is measured on the deformed mesh itself: for every grid cell the
// longest of its right, down and diagonal edges in world px, divided by the
// same edge in art px, times camera zoom × render scale. That covers squash,
// stretch, inflation, lean and camera push-ins.

class AssetLog {
  constructor() { this.reset(); }

  reset() {
    this.rasters = [];
    this.maxMag = Object.create(null);
  }

  /**
   * Record a raster. source: an HTMLImageElement (logged by URL path) or a
   * canvas (logged as procedural). extra: anything worth keeping (e.g. contentKey).
   */
  raster(role, source, extra = {}) {
    const src = source?.currentSrc || source?.src || '';
    this.rasters.push({
      role,
      url: src ? new URL(src, location.href).pathname : null,
      kind: src ? 'image' : 'canvas',
      width: source?.naturalWidth || source?.width || 0,
      height: source?.naturalHeight || source?.height || 0,
      ...extra,
    });
  }

  /** Alias kept for readability at texture-creation sites. */
  texture(role, source, extra) { this.raster(role, source, extra); }

  /** Note one observed magnification of `role` (output px per source px). */
  magnify(role, m) {
    if (Number.isFinite(m) && m > (this.maxMag[role] ?? 0)) this.maxMag[role] = m;
  }

  /**
   * Magnification of rasters drawn through a deformed grid mesh.
   * mesh: gl.js gridMesh (data interleaved, pos.xy first, in world px);
   * artSize: [w, h] of the raster in px; k: output px per world px.
   */
  meshMagnification(roles, mesh, artSize, k) {
    if (!roles?.length || !mesh) return;
    const { cols, rows, stride, data } = mesh;
    const ax = artSize[0] / cols, ay = artSize[1] / rows, ad = Math.hypot(ax, ay);
    const rowStride = (cols + 1) * stride;
    let m = 0;
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        const o = j * rowStride + i * stride;
        const x = data[o], y = data[o + 1];
        const r = Math.hypot(data[o + stride] - x, data[o + stride + 1] - y) / ax;
        const d = Math.hypot(data[o + rowStride] - x, data[o + rowStride + 1] - y) / ay;
        const g = Math.hypot(data[o + rowStride + stride] - x, data[o + rowStride + stride + 1] - y) / ad;
        if (r > m) m = r;
        if (d > m) m = d;
        if (g > m) m = g;
      }
    }
    for (const role of roles) this.magnify(role, m * k);
  }

  /** Plain-data copy for the worker. */
  snapshot() {
    return { rasters: this.rasters.map((r) => ({ ...r })), maxMagnification: { ...this.maxMag } };
  }
}

/** One log per page: a page renders one direction at a time (the worker reloads per video). */
export const assetLog = new AssetLog();
