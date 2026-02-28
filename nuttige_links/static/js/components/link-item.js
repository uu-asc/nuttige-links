import { store } from '../datastore.js'

class LinkItem extends HTMLElement {
    table = 'links'

    // state
    get recordId() { return this.getAttribute('record-id') }

    get record() {
        return store.state[this.table].drafts[this.recordId]
            ?? store.state[this.table].records[this.recordId]
    }

    syncDirtyState() {
        const { records, drafts, pendingDeletes } = store.state.links
        const id = this.recordId
        this.toggleAttribute('data-dirty', id in drafts && id in records)
        this.toggleAttribute('data-new', id in drafts && !(id in records))
        this.toggleAttribute('data-pending-delete', pendingDeletes.has(id))
    }

    // life-cycle
    connectedCallback() {
        this.setAttribute('data-tree-item', '')
        this.setAttribute('data-tree-depth', '2')

        this.unsubs = [
            store.subscribe(
                s => s.links.drafts[this.recordId] ?? s.links.records[this.recordId],
                () => this.render()
            ),
            store.subscribe(
                s => s[this.table].uiVisible,
                (vis) => { this.hidden = vis ? !vis.has(this.recordId) : false }
            ),
            store.subscribe(
                s => s.links.drafts[this.recordId],
                () => this.syncDirtyState()
            ),
            store.subscribe(
                s => s.links.pendingDeletes,
                () => this.syncDirtyState()
            ),
        ]

        this.syncDirtyState()
        this.render()
    }

    disconnectedCallback() {
        this.unsubs?.forEach(fn => fn())
    }

    // render
    render() {
        if (!this.record) return

        this.textContent = ''

        // status dot
        const dot = document.createElement('span')
        dot.className = 'status-dot'
        if (this.record.last_status === null || this.record.last_status === undefined) {
            dot.dataset.status = 'unchecked'
        } else if (this.record.last_status >= 200 && this.record.last_status < 400) {
            dot.dataset.status = 'ok'
        } else {
            dot.dataset.status = 'broken'
        }
        this.appendChild(dot)

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
    }
}

customElements.define('link-item', LinkItem)
