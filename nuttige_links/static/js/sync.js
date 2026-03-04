
import { store } from './datastore.js'
import { validateDraft } from './behaviors/validation.js'

class SyncManager {
    setAdapter(adapter) {
        this._adapter = adapter
    }

    get capabilities() {
        return this._adapter?.capabilities ?? {}
    }

    async _persist(table, upserts, deletes) {
        return this._adapter.save(table, upserts, deletes)
    }

    _cleanupPendingDeletes(table) {
        const { drafts, pendingDeletes } = store.state[table]
        for (const id of pendingDeletes) {
            if (id in drafts) {
                store.deleteState([table, 'drafts', id])
                store.deleteState([table, 'errors', id])
            }
        }
    }

    _validateDrafts(table, drafts) {
        const errors = {}
        for (const draft of drafts) {
            const draftErrors = validateDraft(table, draft)
            if (Object.keys(draftErrors).length) {
                errors[draft.id] = draftErrors
            }
        }
        return errors
    }

    _applyResult(table, result, deleteIds) {
        store.batch(() => {
            for (const record of result.records) {
                store.setState([table, 'records', record.id], record)
                store.deleteState([table, 'drafts', record.id])
                store.deleteState([table, 'errors', record.id])
            }

            if (deleteIds.length) {
                if (deleteIds.includes(store.state[table].selectedId)) {
                    store.setState([table, 'selectedId'], null)
                }
                const next = new Set(store.state[table].pendingDeletes)
                for (const id of deleteIds) {
                    store.deleteState([table, 'records', id])
                    store.deleteState([table, 'drafts', id])
                    store.deleteState([table, 'errors', id])
                    next.delete(id)
                }
                store.setState([table, 'pendingDeletes'], next)
            }
        })
    }

    async save(table) {
        this._cleanupPendingDeletes(table)
        const { drafts, pendingDeletes } = store.state[table]
        const upserts = Object.values(drafts).filter(d => !pendingDeletes.has(d.id))
        const deletes = [...pendingDeletes]

        if (!upserts.length && !deletes.length) return { ok: true }

        const errors = this._validateDrafts(table, upserts)
        if (Object.keys(errors).length) {
            store.setState([table, 'errors'], errors)
            return { ok: false, errors }
        }

        store.setState([table, 'errors'], {})

        const result = await this._persist(table, upserts, deletes)
        if (!result) return { ok: false }

        this._applyResult(table, result, deletes)
        return { ok: true }
    }

    async saveCurrent(table) {
        this._cleanupPendingDeletes(table)
        const id = store.state[table].selectedId
        if (!id) return { ok: false }

        const draft = store.state[table].drafts[id]
        const isPendingDelete = store.state[table].pendingDeletes.has(id)

        if (!draft && !isPendingDelete) return { ok: true }

        if (draft && !isPendingDelete) {
            const errors = this._validateDrafts(table, [draft])
            if (Object.keys(errors).length) {
                store.setState([table, 'errors', id], errors[id])
                return { ok: false, errors }
            }
        }

        const result = await this._persist(
            table,
            draft ? [draft] : [],
            isPendingDelete ? [id] : []
        )
        if (!result) return { ok: false }

        this._applyResult(table, result, isPendingDelete ? [id] : [])
        return { ok: true }
    }

    async saveFiltered(table, filterFn) {
        this._cleanupPendingDeletes(table)
        const { drafts, pendingDeletes, records } = store.state[table]

        const upserts = Object.values(drafts)
            .filter(filterFn)
            .filter(d => !pendingDeletes.has(d.id))
        const deletes = [...pendingDeletes].filter(id => filterFn(records[id]))

        if (!upserts.length && !deletes.length) return { ok: true }

        const errors = this._validateDrafts(table, upserts)
        if (Object.keys(errors).length) {
            store.setState([table, 'errors'], errors)
            return { ok: false, errors }
        }

        const result = await this._persist(table, upserts, deletes)
        if (!result) return { ok: false }

        this._applyResult(table, result, deletes)
        return { ok: true }
    }

    async load(table) {
        const records = await this._adapter.load(table)
        const map = Object.fromEntries(records.map(r => [r.id, r]))
        store.setState([table, 'records'], map)
    }

    async checkLinks(ids) {
        if (!this._adapter?.capabilities?.checkLinks) return
        store.setState(['ui', 'checkingLinks'], true)
        try {
            const result = await this._adapter.checkLinks(ids)
            if (result?.records) {
                store.batch(() => {
                    for (const record of result.records) {
                        store.setState(['links', 'records', record.id], record)
                    }
                })
            }
        } finally {
            store.setState(['ui', 'checkingLinks'], false)
        }
    }
}

export const sync = new SyncManager()
