import { store } from '../datastore.js'
import { computeVisibility } from '../behaviors/filter.js'

class LinkToolbar extends HTMLElement {
    connectedCallback() {
        this.innerHTML = `
            <filter-input></filter-input>
            <div class="buttons">
                <button data-action="expand-all">Expand all</button>
                <button data-action="collapse-all">Collapse all</button>
                <hr>
                <button data-action="reorder-sections">⇅ Sections</button>
                <button data-action="add-link">+ Add link</button>
                <hr>
                <button data-action="save-all" disabled>Save</button>
                <button data-action="revert-all" disabled>Revert</button>
            </div>
        `

        this.filterInput = this.querySelector('[data-action="filter"]')
        this.linksOnlyBox = this.querySelector('[data-action="links-only"]')
        this.brokenOnlyBox = this.querySelector('[data-action="broken-only"]')

        this.querySelector('filter-input').addEventListener('filter-change', (e) => {
            const { term, linksOnly, brokenOnly } = e.detail
            store.batch(() => {
                store.setState(['ui', 'filterTerm'], term)
                store.setState(['ui', 'linksOnly'], linksOnly)
                store.setState(['ui', 'showBrokenOnly'], brokenOnly)
            })
            computeVisibility()
        })

        this.querySelector('[data-action="expand-all"]').addEventListener('click', () => {
            store.batch(() => {
                store.setState(['sections', 'uiCollapsed'], new Set())
                store.setState(['subsections', 'uiCollapsed'], new Set())
            })
        })

        this.querySelector('[data-action="collapse-all"]').addEventListener('click', () => {
            store.batch(() => {
                const allSections = new Set(Object.keys(store.state.sections.records))
                const allSubs = new Set(Object.keys(store.state.subsections.records))
                store.setState(['sections', 'uiCollapsed'], allSections)
                store.setState(['subsections', 'uiCollapsed'], allSubs)
            })
        })

        this.querySelector('[data-action="reorder-sections"]').addEventListener('click', () => {
            store.setState(['ui', 'dialog'], {
                mode: 'reorder-sections',
            })
        })

        this.querySelector('[data-action="add-link"]').addEventListener('click', () => {
            store.setState(['ui', 'dialog'], { mode: 'add', table: 'links', defaults: {} })
        })
    }
}

customElements.define('link-toolbar', LinkToolbar)
