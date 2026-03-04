export const fetchAdapter = {
    capabilities: { checkLinks: true },

    async load(table) {
        const response = await fetch(`api/${table}/load`, { method: 'POST' })
        if (!response.ok) return []
        const { records } = await response.json()
        return records
    },

    async save(table, upserts, deletes) {
        const response = await fetch(`api/${table}/save`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ upserts, deletes }),
        })
        if (!response.ok) return null
        return response.json()
    },

    async checkLinks(ids) {
        const response = await fetch('api/links/check', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(ids ? { ids } : {}),
        })
        if (!response.ok) return null
        return response.json()
    },
}
