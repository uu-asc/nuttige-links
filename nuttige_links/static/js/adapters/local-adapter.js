export const localAdapter = {
    capabilities: { checkLinks: false },

    async load(table) { return [] },
    async save(table, upserts, deletes) { return { status: 'ok', records: [] } },
}
