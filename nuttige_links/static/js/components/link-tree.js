import { store } from '../datastore.js'
import './section-group.js'

class LinkTree extends HTMLElement {
    connectedCallback() {
        this.setAttribute('role', 'tree')
        this.unsub = store.subscribe(
            s => [s.sections.records, s.sections.drafts],
            () => this.buildChildren()
        )
        this.buildChildren()
    }

    disconnectedCallback() {
        this.unsub?.()
    }

    buildChildren() {
        const sections = Object.values({
            ...store.state.sections.records,
            ...store.state.sections.drafts,
        }).sort((a, b) => a.position - b.position)

        const existing = new Map()
        for (const el of this.querySelectorAll(':scope > section-group')) {
            existing.set(el.getAttribute('record-id'), el)
        }

        // remove stale
        for (const [id, el] of existing) {
            if (!sections.find(s => s.id === id)) el.remove()
        }

        // add new
        for (const section of sections) {
            if (!existing.has(section.id)) {
                const el = document.createElement('section-group')
                el.setAttribute('record-id', section.id)
                this.appendChild(el)
            }
        }
    }
}

customElements.define('link-tree', LinkTree)
