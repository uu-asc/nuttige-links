import { store } from '../datastore.js'
import { ContainerGroup } from './container-group.js'
import './subsection-group.js'

class SectionGroup extends ContainerGroup {
    table = 'sections'
    childTable = 'subsections'

    getAddDefaults() {
        return { section_id: this.recordId }
    }

    buildChildren() {
        const children = Object.values({
            ...store.state.subsections.records,
            ...store.state.subsections.drafts,
        }).filter(r => r.section_id === this.recordId)
            .sort((a, b) => a.position - b.position)

        const existing = new Map()
        for (const el of this.childContainer.querySelectorAll(':scope > subsection-group')) {
            existing.set(el.getAttribute('record-id'), el)
        }

        for (const [id, el] of existing) {
            if (!children.find(child => child.id === id)) el.remove()
        }

        for (const sub of children) {
            let el = existing.get(sub.id)
            if (!el) {
                el = document.createElement('subsection-group')
                el.setAttribute('record-id', sub.id)
            }
            this.childContainer.appendChild(el)
        }
    }
}

customElements.define('section-group', SectionGroup)

