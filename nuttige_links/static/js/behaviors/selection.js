import { store } from '../datastore.js'

let lastAction = null // { id, table, checked }

function getItem(checkbox) {
    return checkbox.closest('[data-tree-item]')
}

function getVisibleItems(root) {
    return [...root.querySelectorAll('[data-tree-item]:not([hidden])')]
}

function resolveRange(root, fromId, toId) {
    const items = getVisibleItems(root)
    const a = items.findIndex(el => el.getAttribute('record-id') === fromId)
    const b = items.findIndex(el => el.getAttribute('record-id') === toId)
    if (a === -1 || b === -1) return []
    const [start, end] = a < b ? [a, b] : [b, a]
    return items.slice(start, end + 1)
}

function applyChecked(items, checked) {
    const byTable = {}
    for (const el of items) {
        const table = el.dataset.table
        const id = el.getAttribute('record-id')
        if (!table || !id) continue
            ; (byTable[table] ??= []).push(id)
    }
    store.batch(() => {
        for (const [table, ids] of Object.entries(byTable)) {
            const next = new Set(store.state[table].checkedIds)
            for (const id of ids) {
                checked ? next.add(id) : next.delete(id)
            }
            store.setState([table, 'checkedIds'], next)
        }
    })
}

export function initSelection(root) {
    root.addEventListener('click', (e) => {
        if (!e.target.matches('.checkbox')) return

        const item = getItem(e.target)
        if (!item) return

        const table = item.dataset.table
        const id = item.getAttribute('record-id')

        if (e.shiftKey && lastAction) {
            const range = resolveRange(root, lastAction.id, id)
            if (range.length) {
                applyChecked(range, lastAction.checked)
            }
            lastAction = { id, table, checked: lastAction.checked }
        } else {
            const checked = e.target.checked
            const next = new Set(store.state[table].checkedIds)
            checked ? next.add(id) : next.delete(id)
            store.setState([table, 'checkedIds'], next)
            lastAction = { id, table, checked }
        }
    })
}

export function selectAllVisible(root) {
    applyChecked(getVisibleItems(root), true)
}

export function deselectAll() {
    store.batch(() => {
        for (const table of ['sections', 'subsections', 'links']) {
            store.setState([table, 'checkedIds'], new Set())
        }
    })
}

export function setSelectionAnchor(id, table, checked) {
    lastAction = { id, table, checked }
}

export function extendSelectionTo(id, table, root) {
    if (!lastAction) return
    const range = resolveRange(root, lastAction.id, id)
    if (range.length) applyChecked(range, lastAction.checked)
    lastAction = { id, table, checked: lastAction.checked }
}
