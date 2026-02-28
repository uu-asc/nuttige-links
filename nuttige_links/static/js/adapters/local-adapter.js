export const localAdapter = {
    async load(table) { return [] },
    async save(table, upserts, deletes) { return { status: 'ok', records: [] } },
}
