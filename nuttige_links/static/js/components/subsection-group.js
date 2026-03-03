import { store } from '../datastore.js'
import { ContainerGroup } from './container-group.js'
import './link-item.js'

class SubsectionGroup extends ContainerGroup {
    table = 'subsections'
    childTable = 'links'

    getAddDefaults() {
        return {
            section_id: this.record.section_id,
            subsection_id: this.recordId,
        }
    }

    buildChildren() {
        const children = Object.values({
            ...store.state.links.records,
            ...store.state.links.drafts,
        }).filter(r => r.subsection_id === this.recordId)
            .sort((a, b) => a.position - b.position)

        const existing = new Map()
        for (const el of this.childContainer.querySelectorAll(':scope > link-item')) {
            existing.set(el.getAttribute('record-id'), el)
        }

        for (const [id, el] of existing) {
            if (!children.find(child => child.id === id)) el.remove()
        }

        for (const link of children) {
            let el = existing.get(link.id)
            if (!el) {
                el = document.createElement('link-item')
                el.setAttribute('record-id', link.id)
            }
            this.childContainer.appendChild(el)
        }
    }
}

customElements.define('subsection-group', SubsectionGroup)
