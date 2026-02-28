import { store } from '../datastore.js'

class LinkItem extends HTMLElement {
    get recordId() { return this.getAttribute('record-id') }

    get record() {
        return store.state.links.records[this.recordId]
    }

    connectedCallback() {
        this.setAttribute('data-tree-item', '')
        this.setAttribute('data-tree-depth', '2')

        this.unsub = store.subscribe(
            s => s.links.records[this.recordId],
            () => this.render()
        )
        this.render()
    }

    disconnectedCallback() {
        this.unsub?.()
    }

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
