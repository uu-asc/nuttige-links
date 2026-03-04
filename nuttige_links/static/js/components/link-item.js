import { store } from '../datastore.js'
import { markForDelete } from '../behaviors/actions.js'

class LinkItem extends HTMLElement {
    get recordId() { return this.getAttribute('record-id') }

    get record() {
        return store.state.links.drafts[this.recordId]
            ?? store.state.links.records[this.recordId]
    }

    syncDirtyState() {
        const { records, drafts, pendingDeletes } = store.state.links
        const id = this.recordId

        const draft = drafts[id]
        const record = records[id]
        const posOnly = this.isPositionOnlyDraft(draft, record)

        this.toggleAttribute('data-dirty', id in drafts && id in records && !posOnly)
        this.toggleAttribute('data-new', id in drafts && !(id in records))
        this.toggleAttribute('data-pending-delete', pendingDeletes.has(id))
    }

    syncVisibility() {
        const vis = store.state.links.uiVisible
        const isDraft = this.recordId in store.state.links.drafts
        const isRecord = this.recordId in store.state.links.records
        const isDraftOnly = isDraft && !isRecord
        this.hidden = isDraftOnly ? false : (vis ? !vis.has(this.recordId) : false)
    }

    connectedCallback() {
        this.dataset.table = 'links'
        this.dataset.treeItem = ''
        this.dataset.treeDepth = '2'

        this.unsubs = [
            store.subscribe(
                s => s.links.drafts[this.recordId] ?? s.links.records[this.recordId],
                () => this.render()
            ),
            store.subscribe(
                s => s.links.uiVisible,
                (vis) => {
                    const isDraft = this.recordId in store.state.links.drafts
                    const isRecord = this.recordId in store.state.links.records
                    const isDraftOnly = isDraft && !isRecord
                    this.hidden = isDraftOnly ? false : (vis ? !vis.has(this.recordId) : false)
                },
            ),
            store.subscribe(
                s => s.links.drafts[this.recordId],
                () => this.syncDirtyState()
            ),
            store.subscribe(
                s => s.links.pendingDeletes,
                () => this.syncDirtyState()
            ),
            store.subscribe(
                s => s.links.checkedIds.has(this.recordId),
                (checked) => {
                    const cb = this.querySelector('.checkbox')
                    if (cb) cb.checked = checked
                }
            ),
            store.subscribe(
                s => s.ui.showLinkStatus,
                (on) => {
                    const el = this.querySelector('link-content')
                    if (el) el.toggleAttribute('show-status', on)
                }
            ),
        ]

        this.syncDirtyState()
        this.syncVisibility()
        this.render()
        this.setupListeners()
    }

    disconnectedCallback() {
        this.unsubs?.forEach(fn => fn())
    }

    setupListeners() { }

    render() {
        if (!this.record) return

        this.textContent = ''

        const cb = document.createElement('input')
        cb.type = 'checkbox'
        cb.className = 'checkbox'
        cb.checked = store.state.links.checkedIds.has(this.recordId)
        this.appendChild(cb)

        const spacer = document.createElement('span')
        spacer.className = 'chevron-spacer'
        this.appendChild(spacer)

        const content = document.createElement('link-content')
        content.url = this.record.url
        content.text = this.record.text
        content.description = this.record.description
        content.status = this.record.last_status
        content.updatedAt = this.record.updated_at
        if (store.state.ui.showLinkStatus) content.setAttribute('show-status', '')
        this.appendChild(content)

        const actions = document.createElement('tree-actions')
        this.appendChild(actions)
    }

    isPositionOnlyDraft(draft, record) {
        if (!draft || !record) return false
        return Object.keys(draft).every(k =>
            k === 'position' || draft[k] === record[k]
        )
    }
}

customElements.define('link-item', LinkItem)
