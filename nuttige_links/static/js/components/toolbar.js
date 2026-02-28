import { store } from '../datastore.js'
import { computeVisibility } from '../behaviors/filter.js'

class LinkToolbar extends HTMLElement {
    connectedCallback() {
        this.innerHTML = `
            <filter-input></filter-input>
            <button data-ref="expand-all">Expand all</button>
            <button data-ref="collapse-all">Collapse all</button>
        `

        this.filterInput = this.querySelector('[data-ref="filter"]')
        this.linksOnlyBox = this.querySelector('[data-ref="links-only"]')
        this.brokenOnlyBox = this.querySelector('[data-ref="broken-only"]')

        this.querySelector('filter-input').addEventListener('filter-change', (e) => {
            const { term, linksOnly, brokenOnly } = e.detail
            store.batch(() => {
                store.setState(['ui', 'filterTerm'], term)
                store.setState(['ui', 'linksOnly'], linksOnly)
                store.setState(['ui', 'showBrokenOnly'], brokenOnly)
            })
            computeVisibility()
        })

        this.querySelector('[data-ref="expand-all"]').addEventListener('click', () => {
            store.batch(() => {
                store.setState(['sections', 'uiCollapsed'], new Set())
                store.setState(['subsections', 'uiCollapsed'], new Set())
            })
        })

        this.querySelector('[data-ref="collapse-all"]').addEventListener('click', () => {
            store.batch(() => {
                const allSections = new Set(Object.keys(store.state.sections.records))
                const allSubs = new Set(Object.keys(store.state.subsections.records))
                store.setState(['sections', 'uiCollapsed'], allSections)
                store.setState(['subsections', 'uiCollapsed'], allSubs)
            })
        })
    }
}

customElements.define('link-toolbar', LinkToolbar)
