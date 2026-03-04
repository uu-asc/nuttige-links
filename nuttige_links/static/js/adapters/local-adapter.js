export const STORAGE_KEY = 'nuttige_links'

function readTable(table) {
    const raw = localStorage.getItem(`${STORAGE_KEY}_${table}`)
    return raw ? JSON.parse(raw) : []
}

function writeTable(table, records) {
    localStorage.setItem(`${STORAGE_KEY}_${table}`, JSON.stringify(records))
}

export const localAdapter = {
    capabilities: { checkLinks: false },

    async load(table) {
        return readTable(table)
    },

    async save(table, upserts, deletes) {
        const existing = readTable(table)
        const byId = Object.fromEntries(existing.map(r => [r.id, r]))
        const now = new Date().toISOString()
        const saved = []

        for (const record of upserts) {
            const isNew = !(record.id in byId)
            const merged = {
                ...byId[record.id],
                ...record,
                created_at: isNew ? now : byId[record.id].created_at,
                updated_at: now,
            }
            byId[merged.id] = merged
            saved.push(merged)
        }

        for (const id of deletes) delete byId[id]

        writeTable(table, Object.values(byId))
        return { records: saved }
    },
}
