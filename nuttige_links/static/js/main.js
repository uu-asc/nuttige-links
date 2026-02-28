import { store } from './datastore.js'
import { sync } from './sync.js'
import { fetchAdapter } from './adapters/fetch-adapter.js'
import { computeVisibility } from './behaviors/filter.js'
import './vendor/darkmode-toggle.js'
import './components/link-tree.js'
import './components/toolbar.js'

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

    const saveBtn = document.querySelector('[data-action="save-all"]')
    const revertBtn = document.querySelector('[data-action="revert-all"]')

    store.subscribe(isDirty, (dirty) => {
        saveBtn.disabled = !dirty
        revertBtn.disabled = !dirty
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
