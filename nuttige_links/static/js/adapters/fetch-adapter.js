export function createFetchAdapter(fetchFn = fetch) {
    return {
        capabilities: { checkLinks: true },

        async load(table) {
            const response = await fetch(`api/${table}/load`, { method: 'POST' })
            if (!response.ok) return []
            const { records } = await response.json()
            return records
        },

        async save(table, upserts, deletes) {
            const response = await fetchFn(`api/${table}/save`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ upserts, deletes }),
            })
            if (!response) return null
            if (!response.ok) return null
            return response.json()
        },

        async checkLinks(ids) {
            const response = await fetchFn('api/links/check', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(ids ? { ids } : {}),
            })
            if (!response) return null
            if (!response.ok) return null
            return response.json()
        },
    }
}
