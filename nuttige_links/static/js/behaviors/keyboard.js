import { store } from '../datastore.js'
import { getVisibleItems } from './visibility.js'
import { markForDelete } from './actions.js'
import { setSelectionAnchor, extendSelectionTo, selectAllVisible } from './selection.js'

const navState = {
    zone: 'none',
    headerIndex: 0,
    treeIndex: 0,
    controlIndex: null,
}

// --- focus helpers ---

function isTextInput(el) {
    if (el.tagName === 'INPUT' && el.type === 'text') return true
    if (el.tagName === 'TEXTAREA') return true
    if (el.isContentEditable) return true
    return false
}

function activeIsTextInput() {
    const el = document.activeElement
    if (isTextInput(el)) return true
    const inner = el?.shadowRoot?.activeElement
    if (inner && isTextInput(inner)) return true
    return false
}

function unfocus() {
    document.activeElement?.blur()
    navState.zone = 'none'
    navState.controlIndex = null
}

function refocusCurrent() {
    if (navState.zone === 'tree') {
        requestAnimationFrame(() => focusTreeItem(navState.treeIndex))
    }
}

function getHeaderControls() {
    return [...document.querySelectorAll('[data-nav-header]')]
        .filter(el => !el.hidden && !el.closest('[hidden]') && el.offsetParent !== null && !el.disabled)
}

function focusHeader(index) {
    const controls = getHeaderControls()
    if (!controls.length) return
    navState.headerIndex = Math.max(0, Math.min(index, controls.length - 1))
    navState.zone = 'header'
    controls[navState.headerIndex].focus()
}

function focusTreeItem(index) {
    const items = getVisibleItems(store.state)
    if (!items.length) return

    navState.treeIndex = Math.max(0, Math.min(index, items.length - 1))
    navState.zone = 'tree'
    navState.controlIndex = null

    const item = items[navState.treeIndex]
    const el = document.querySelector(`[data-table="${item.table}"][record-id="${item.id}"]`)
    if (!el) return

    if (item.table === 'links') {
        el.setAttribute('tabindex', '-1')
        el.focus()
    } else {
        el.querySelector('summary')?.focus()
    }
}

// --- global keys (guarded) ---

const guardedGlobal = {
    '/': (e) => {
        e.preventDefault()
        const filterInput = document.querySelector('filter-input')
        if (filterInput) {
            filterInput.focus()
            navState.zone = 'header'
        }
        return true
    },
    'e': (e) => {
        e.preventDefault()
        store.setState(['ui', 'editMode'], !store.state.ui.editMode)
        return true
    },
    'f': (e) => {
        e.preventDefault()
        const secIds = Object.keys(store.state.sections.records)
        const subIds = Object.keys(store.state.subsections.records)
        const anyExpanded = secIds.some(id => !store.state.sections.uiCollapsed.has(id))
            || subIds.some(id => !store.state.subsections.uiCollapsed.has(id))
        store.batch(() => {
            if (anyExpanded) {
                store.setState(['sections', 'uiCollapsed'], new Set(secIds))
                store.setState(['subsections', 'uiCollapsed'], new Set(subIds))
            } else {
                store.setState(['sections', 'uiCollapsed'], new Set())
                store.setState(['subsections', 'uiCollapsed'], new Set())
            }
        })
        return true
    },
    'd': (e) => {
        e.preventDefault()
        document.querySelector('darkmode-toggle')?.toggle()
        return true
    },
    '?': (e) => {
        e.preventDefault()
        store.setState(['ui', 'dialog'], { mode: 'help' })
        return true
    },
}

// --- global keys (unguarded) ---

const unguardedGlobal = {
    'ctrl+s': (e) => {
        e.preventDefault()
        document.querySelector('[data-action="save-all"]')?.click()
        return true
    },
    'ctrl+u': (e) => {
        e.preventDefault()
        document.querySelector('filter-input')?.resetAll()
        return true
    },
    'ctrl+a': (e) => {
        if (!store.state.ui.editMode) return false
        e.preventDefault()
        selectAllVisible(document.querySelector('link-tree'))
        return true
    },
}

// --- Esc (unguarded, all zones) ---

function handleEscape(e) {
    e.preventDefault()
    unfocus()
    return true
}

// --- header zone ---

function handleHeader(e) {
    switch (e.key) {
        case 'ArrowLeft':
            if (activeIsTextInput()) return false
            e.preventDefault()
            focusHeader(navState.headerIndex - 1)
            return true
        case 'ArrowRight':
            if (activeIsTextInput()) return false
            e.preventDefault()
            focusHeader(navState.headerIndex + 1)
            return true
        case 'ArrowDown':
            e.preventDefault()
            focusTreeItem(0)
            return true
        case 'Escape':
            return handleEscape(e)
    }
    return false
}

// --- tree zone (normal mode) ---

function handleTreeNormal(e) {
    const items = getVisibleItems(store.state)
    if (!items.length) return false

    switch (e.key) {
        case 'ArrowUp':
            e.preventDefault()
            if (navState.treeIndex === 0) {
                focusHeader(0)
            } else {
                focusTreeItem(navState.treeIndex - 1)
            }
            return true
        case 'ArrowDown':
            e.preventDefault()
            focusTreeItem(navState.treeIndex + 1)
            return true
        case ' ':
            e.preventDefault()
            toggleCollapse(items[navState.treeIndex])
            refocusCurrent()
            return true
        case 'Enter': {
            e.preventDefault()
            const item = items[navState.treeIndex]
            if (item.table === 'links') followLink(item)
            return true
        }
        case 'PageUp':
            e.preventDefault()
            focusTreeItem(prevSection(items, navState.treeIndex))
            return true
        case 'PageDown':
            e.preventDefault()
            focusTreeItem(nextSection(items, navState.treeIndex))
            return true
        case 'Home':
            e.preventDefault()
            focusTreeItem(0)
            return true
        case 'End':
            e.preventDefault()
            focusTreeItem(items.length - 1)
            return true
        case 'Escape':
            return handleEscape(e)
    }
    return false
}

// --- tree zone (edit mode) ---

function handleTreeEdit(e) {
    const items = getVisibleItems(store.state)
    if (!items.length) return false

    switch (e.key) {
        case 'ArrowUp':
            e.preventDefault()
            if (navState.treeIndex === 0) {
                focusHeader(0)
            } else {
                focusTreeItem(navState.treeIndex - 1)
            }
            return true
        case 'ArrowDown':
            e.preventDefault()
            focusTreeItem(navState.treeIndex + 1)
            return true
        case 'ArrowRight': {
            e.preventDefault()
            const controls = getInlineControls(items[navState.treeIndex])
            if (!controls.length) return true
            if (navState.controlIndex === null) {
                navState.controlIndex = 0
            } else {
                navState.controlIndex = Math.min(navState.controlIndex + 1, controls.length - 1)
            }
            controls[navState.controlIndex].focus()
            return true
        }
        case 'ArrowLeft': {
            e.preventDefault()
            if (navState.controlIndex === null || navState.controlIndex === 0) {
                navState.controlIndex = null
                focusTreeItem(navState.treeIndex)
            } else {
                navState.controlIndex--
                const controls = getInlineControls(items[navState.treeIndex])
                controls[navState.controlIndex]?.focus()
            }
            return true
        }
        case ' ':
            e.preventDefault()
            if (e.shiftKey) {
                const item = items[navState.treeIndex]
                extendSelectionTo(item.id, item.table, document.querySelector('link-tree'))
            } else {
                toggleCheck(items[navState.treeIndex])
            }
            refocusCurrent()
            return true
        case 'Enter': {
            e.preventDefault()
            const item = items[navState.treeIndex]
            store.setState(['ui', 'dialog'], {
                mode: 'edit', table: item.table, id: item.id,
            })
            return true
        }
        case '+': {
            e.preventDefault()
            const item = items[navState.treeIndex]
            store.setState(['ui', 'dialog'], {
                mode: 'add', table: 'links', defaults: resolveAddDefaults(item),
            })
            return true
        }
        case 'Delete': {
            e.preventDefault()
            const item = items[navState.treeIndex]
            markForDelete(item.table, item.id)
            refocusCurrent()
            return true
        }
        case 'PageUp':
            e.preventDefault()
            focusTreeItem(prevSection(items, navState.treeIndex))
            return true
        case 'PageDown':
            e.preventDefault()
            focusTreeItem(nextSection(items, navState.treeIndex))
            return true
        case 'Home':
            e.preventDefault()
            focusTreeItem(0)
            return true
        case 'End':
            e.preventDefault()
            focusTreeItem(items.length - 1)
            return true
        case 'Escape':
            return handleEscape(e)
    }

    return false
}

function handleTree(e) {
    return store.state.ui.editMode
        ? handleTreeEdit(e)
        : handleTreeNormal(e)
}

// --- zone dispatch ---

const handleZone = {
    none: () => false,
    header: handleHeader,
    tree: handleTree,
}

// --- action helpers ---

function getInlineControls(item) {
    const el = document.querySelector(`[data-table="${item.table}"][record-id="${item.id}"]`)
    if (!el) return []
    const root = item.table === 'links' ? el : el.querySelector('summary')
    return [...root.querySelectorAll('input.checkbox, .add-item, tree-actions button')]
}

function toggleCollapse(item) {
    if (item.table === 'links') return
    const collapsed = store.state[item.table].uiCollapsed
    const next = new Set(collapsed)
    next.has(item.id) ? next.delete(item.id) : next.add(item.id)
    store.setState([item.table, 'uiCollapsed'], next)
}

function toggleCheck(item) {
    const checked = store.state[item.table].checkedIds
    const next = new Set(checked)
    const willCheck = !next.has(item.id)
    willCheck ? next.add(item.id) : next.delete(item.id)
    store.setState([item.table, 'checkedIds'], next)
    setSelectionAnchor(item.id, item.table, willCheck)
}

function followLink(item) {
    const record = store.state.links.drafts[item.id]
        ?? store.state.links.records[item.id]
    if (record?.url) window.open(record.url, '_blank')
}

function prevSection(items, from) {
    for (let i = from - 1; i >= 0; i--) {
        if (items[i].table === 'sections') return i
    }
    return 0
}

function nextSection(items, from) {
    for (let i = from + 1; i < items.length; i++) {
        if (items[i].table === 'sections') return i
    }
    return items.length - 1
}

function resolveAddDefaults(item) {
    const record = store.state[item.table].drafts[item.id]
        ?? store.state[item.table].records[item.id]
    if (item.table === 'sections') return { section_id: item.id }
    if (item.table === 'subsections') return { section_id: record.section_id, subsection_id: item.id }
    if (item.table === 'links') {
        const sub = store.state.subsections.drafts[record.subsection_id]
            ?? store.state.subsections.records[record.subsection_id]
        return { section_id: sub?.section_id, subsection_id: record.subsection_id }
    }
    return {}
}

// --- main listener + zone sync ---

function handleGlobal(e) {
    const combo = `${e.ctrlKey ? 'ctrl+' : ''}${e.key.toLowerCase()}`

    if (unguardedGlobal[combo]) return unguardedGlobal[combo](e)

    if (e.key === 'Escape') return handleEscape(e)

    if (activeIsTextInput()) return false

    if (guardedGlobal[e.key.toLowerCase()]) return guardedGlobal[e.key.toLowerCase()](e)

    return false
}

export function initKeyboard() {
    const header = document.querySelector('header')
    const tree = document.querySelector('link-tree')

    // sync zone on focus entry
    header.addEventListener('focusin', (e) => {
        navState.zone = 'header'
        const control = e.target.closest('[data-nav-header]')
        if (control) {
            const idx = getHeaderControls().indexOf(control)
            if (idx !== -1) navState.headerIndex = idx
        }
    })

    tree.addEventListener('focusin', (e) => {
        navState.zone = 'tree'
        const el = e.target.closest('[data-tree-item]')
        if (el) {
            const id = el.getAttribute('record-id')
            const table = el.dataset.table
            const items = getVisibleItems(store.state)
            const idx = items.findIndex(i => i.id === id && i.table === table)
            if (idx !== -1) navState.treeIndex = idx
        }
    })

    // handle nav-overflow from filter-input
    header.addEventListener('nav-overflow', (e) => {
        const controls = getHeaderControls()
        const filterIdx = controls.indexOf(e.target.closest('[data-nav-header]'))
        if (filterIdx === -1) return
        focusHeader(filterIdx + e.detail.direction)
    })

    // refocus after dialog close
    store.subscribe(
        s => s.ui.dialog,
        (dialog, prev) => {
            if (!dialog && prev) refocusCurrent()
        }
    )

    // refocus after edit mode toggle
    store.subscribe(
        s => s.ui.editMode,
        () => refocusCurrent()
    )

    // main keydown
    document.addEventListener('keydown', e => {
        if (store.state.ui.dialog) return
        if (handleGlobal(e)) return
        handleZone[navState.zone]?.(e)
    })
}
