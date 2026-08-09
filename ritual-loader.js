/**
 * ThinkStill v36.1 loader — backward-compatible.
 * The JSON contains both top-level legacy fields and structured display fields.
 */
export class ThinkStillRituals {
    constructor(rawBase) {
        this.rawBase = rawBase.replace(/\/+$/, "")
        this.manifest = null
        this.rituals = null
    }

    async loadManifest() {
        const res = await fetch(`${this.rawBase}/manifest.json`, { cache: "no-store" })
        if (!res.ok) throw new Error(`Manifest failed: ${res.status}`)
        this.manifest = await res.json()
        return this.manifest
    }

    async loadAll() {
        if (!this.manifest) await this.loadManifest()
        const res = await fetch(`${this.rawBase}/${this.manifest.files.all}`, {
            cache: "no-store",
        })
        if (!res.ok) throw new Error(`Ritual data failed: ${res.status}`)
        this.rituals = await res.json()
        return this.rituals
    }

    async loadBubble(bubble) {
        if (!this.manifest) await this.loadManifest()
        const key = String(bubble).toUpperCase()
        const file = this.manifest.files.bubbles[key]
        if (!file) throw new Error(`Unknown bubble: ${bubble}`)
        const res = await fetch(`${this.rawBase}/${file}`, { cache: "no-store" })
        if (!res.ok) throw new Error(`Bubble data failed: ${res.status}`)
        return res.json()
    }

    async getById(id) {
        if (!this.rituals) await this.loadAll()
        return this.rituals.find(r => r.id === id) ?? null
    }

    async findCandidates({ bubble, trigger, pattern } = {}) {
        if (!this.rituals) await this.loadAll()
        return this.rituals.filter(r => {
            if (bubble && r.bubble !== String(bubble).toUpperCase()) return false
            if (trigger && r.trigger !== trigger) return false
            if (pattern && r.pattern !== pattern) return false
            return true
        })
    }

    async randomCandidate(filters = {}) {
        const candidates = await this.findCandidates(filters)
        if (!candidates.length) return null
        return candidates[Math.floor(Math.random() * candidates.length)]
    }
}
