import { store } from './datastore.js'
import { sync } from './sync.js'
import { fetchAdapter } from './adapters/fetch-adapter.js'
import { computeVisibility } from './behaviors/filter.js'
import { initSelection, selectAllVisible, deselectAll } from './behaviors/selection.js'
import { initKeyboard } from './behaviors/keyboard.js'
import './vendor/darkmode-toggle.js'
import './components/combobox.js'
import './components/sortable-list.js'
import './components/link-tree.js'
import './components/toolbar.js'
import './components/bulk-actions-bar.js'
import './components/filter-input.js'
import './components/tree-actions.js'
import './components/link-dialog.js'
import './components/bulk-link-dialog.js'
import './components/container-dialog.js'
import './components/reorder-sections-dialog.js'

function isTableDirty(state, table) {
    return Object.keys(state[table].drafts).length > 0
        || state[table].pendingDeletes.size > 0
}

function isDirty(state) {
    return isTableDirty(state, 'sections')
        || isTableDirty(state, 'subsections')
        || isTableDirty(state, 'links')
}

async function init() {
    sync.setAdapter(fetchAdapter)

    await sync.load('sections')
    await sync.load('subsections')
    await sync.load('links')
    computeVisibility()
    initSelection(document.querySelector('link-tree'))

    const editBtn = document.querySelector('[data-action="toggle-edit"]')
    const saveBtn = document.querySelector('[data-action="save-all"]')
    const revertBtn = document.querySelector('[data-action="revert-all"]')
    const linkTree = document.querySelector('link-tree')

    store.subscribe(
        s => s.ui.editMode,
        (on) => {
            document.body.toggleAttribute('data-edit-mode', on)
            editBtn.textContent = on ? '✎ Done' : '✎ Edit'
        }
    )
    store.subscribe(isDirty, (dirty) => {
        saveBtn.disabled = !dirty
        revertBtn.disabled = !dirty
    })

    store.subscribe(
        s => s.sections.checkedIds.size + s.subsections.checkedIds.size + s.links.checkedIds.size,
        count => linkTree.toggleAttribute('data-any-checked', count > 0)
    )

    editBtn.addEventListener('click', () => {
        store.setState(['ui', 'editMode'], !store.state.ui.editMode)
    })

    saveBtn.addEventListener('click', async () => {
        await sync.save('sections')
        await sync.save('subsections')
        await sync.save('links')
    })

    revertBtn.addEventListener('click', () => {
        for (const table of ['sections', 'subsections', 'links']) {
            store.batch(() => {
                store.setState([table, 'drafts'], {})
                store.setState([table, 'pendingDeletes'], new Set())
                store.setState([table, 'errors'], {})
            })
        }
    })

    console.log('Loaded:', {
        sections: Object.keys(store.state.sections.records).length,
        subsections: Object.keys(store.state.subsections.records).length,
        links: Object.keys(store.state.links.records).length,
    })
}

init()
initKeyboard()
