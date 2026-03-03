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

        // const dot = document.createElement('span')
        // dot.className = 'status-dot'
        // if (this.record.last_status === null || this.record.last_status === undefined) {
        //     dot.dataset.status = 'unchecked'
        // } else if (this.record.last_status >= 200 && this.record.last_status < 400) {
        //     dot.dataset.status = 'ok'
        // } else {
        //     dot.dataset.status = 'broken'
        // }
        // this.appendChild(dot)

        const a = document.createElement('a')
        a.href = this.record.url
        a.target = '_blank'
        a.rel = 'noopener'
        a.textContent = this.record.text
        this.appendChild(a)

        if (this.record.description) {
            const desc = document.createElement('span')
            desc.className = 'link-description'
            desc.textContent = this.record.description
            this.appendChild(desc)
        }

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
