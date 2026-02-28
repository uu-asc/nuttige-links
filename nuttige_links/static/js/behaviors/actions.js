import { store } from '../datastore.js'

// helpers
function getDescendants(table, id) {
    const ids = { sections: [], subsections: [], links: [] }

    if (table === 'sections') {
        const subs = Object.values(store.state.subsections.records)
            .filter(s => s.section_id === id)
        for (const sub of subs) {
            ids.subsections.push(sub.id)
            const links = Object.values(store.state.links.records)
                .filter(l => l.subsection_id === sub.id)
            for (const link of links) ids.links.push(link.id)
        }
    }

    if (table === 'subsections') {
        const links = Object.values(store.state.links.records)
            .filter(l => l.subsection_id === id)
        for (const link of links) ids.links.push(link.id)
    }

    return ids
}

function addToPendingDeletes(table, id) {
    const current = store.state[table].pendingDeletes
    const next = new Set(current)
    next.add(id)
    store.setState([table, 'pendingDeletes'], next)
    store.deleteState([table, 'errors', id])
}

function removeFromPendingDeletes(table, id) {
    const current = store.state[table].pendingDeletes
    if (!current.has(id)) return
    const next = new Set(current)
    next.delete(id)
    store.setState([table, 'pendingDeletes'], next)
}

// public API
export function createRecord(table, defaults = {}) {
    const id = crypto.randomUUID()
    store.setState([table, 'drafts', id], { id, ...defaults })
    return id
}

export function updateRecord(table, id, updates) {
    const { drafts, records } = store.state[table]
    const current = drafts[id] ?? records[id]
    if (!current) return
    store.setState([table, 'drafts', id], { ...current, ...updates })
}

export function markForDelete(table, id) {
    const isPending = store.state[table].pendingDeletes.has(id)
    const desc = getDescendants(table, id)

    store.batch(() => {
        if (isPending) {
            // unmark this + descendants
            removeFromPendingDeletes(table, id)
            for (const subId of desc.subsections) removeFromPendingDeletes('subsections', subId)
            for (const linkId of desc.links) removeFromPendingDeletes('links', linkId)
        } else {
            // mark this + descendants
            addToPendingDeletes(table, id)
            for (const subId of desc.subsections) addToPendingDeletes('subsections', subId)
            for (const linkId of desc.links) addToPendingDeletes('links', linkId)
        }
    })
}

export function revertRecord(table, id) {
    const { records, drafts, pendingDeletes } = store.state[table]
    const desc = getDescendants(table, id)

    store.batch(() => {
        // revert self
        if (id in drafts) {
            store.deleteState([table, 'drafts', id])
            store.deleteState([table, 'errors', id])
        }
        removeFromPendingDeletes(table, id)

        // revert descendants
        for (const subId of desc.subsections) {
            if (subId in store.state.subsections.drafts) {
                store.deleteState(['subsections', 'drafts', subId])
                store.deleteState(['subsections', 'errors', subId])
            }
            removeFromPendingDeletes('subsections', subId)
        }
        for (const linkId of desc.links) {
            if (linkId in store.state.links.drafts) {
                store.deleteState(['links', 'drafts', linkId])
                store.deleteState(['links', 'errors', linkId])
            }
            removeFromPendingDeletes('links', linkId)
        }
    })
}

export function revertAll() {
    store.batch(() => {
        for (const table of ['sections', 'subsections', 'links']) {
            store.setState([table, 'drafts'], {})
            store.setState([table, 'pendingDeletes'], new Set())
            store.setState([table, 'errors'], {})
        }
    })
}

export function bulkMarkForDelete(table, ids) {
    store.batch(() => {
        for (const id of ids) {
            if (!store.state[table].pendingDeletes.has(id)) {
                addToPendingDeletes(table, id)
                const desc = getDescendants(table, id)
                for (const subId of desc.subsections) addToPendingDeletes('subsections', subId)
                for (const linkId of desc.links) addToPendingDeletes('links', linkId)
            }
        }
        store.setState([table, 'checkedIds'], new Set())
    })
}

export function bulkSetFields(table, ids, updates) {
    store.batch(() => {
        for (const id of ids) {
            if (store.state[table].pendingDeletes.has(id)) continue
            const { drafts, records } = store.state[table]
            const current = drafts[id] ?? records[id]
            if (!current) continue
            store.setState([table, 'drafts', id], { ...current, ...updates })
        }
        store.setState([table, 'checkedIds'], new Set())
    })
}
