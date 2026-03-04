import { store } from '../datastore.js'
import { sync } from '../sync.js'
import { computeVisibility } from '../behaviors/filter.js'

class LinkToolbar extends HTMLElement {
    connectedCallback() {
        this.innerHTML = `
            <filter-input data-nav-header></filter-input>
            <div>
                <div class="view-actions">
                    <button data-action="expand-all" data-nav-header>Expand all</button>
                    <button data-action="collapse-all" data-nav-header>Collapse all</button>
                    <hr>
                    <button data-action="toggle-status" data-nav-header hidden>Show status</button>
                </div>
                <div class="edit-actions">
                    <button data-action="reorder-sections">⇅ Sections</button>
                    <button data-action="add-link">+ Add link</button>
                    <button data-action="check-links" hidden>Check links</button>
                    <hr>
                    <button data-action="save-all" disabled>Save</button>
                    <button data-action="revert-all" disabled>Revert</button>
                    <hr>
                    <button data-action="import">Import</button>
                    <button data-action="export">Export</button>
                </div>
                <bulk-actions-bar hidden></bulk-actions-bar>
            </div>
        `

        this.filterInput = this.querySelector('filter-input')
        this.linksOnlyBox = this.querySelector('[data-action="links-only"]')
        this.brokenOnlyBox = this.querySelector('[data-action="broken-only"]')
        this.checkBtn = this.querySelector('[data-action="check-links"]')
        this.onstatusBtn = this.querySelector('[data-action="toggle-status"]')
        this.statusBtn = this.querySelector('[data-action="toggle-status')
        this.viewActions = this.querySelector('.view-actions')
        this.editActions = this.querySelector('.edit-actions')
        this.bulkBar = this.querySelector('bulk-actions-bar')

        store.subscribe(
            s => s.sections.checkedIds.size + s.subsections.checkedIds.size + s.links.checkedIds.size,
            (count) => {
                this.editActions.hidden = count > 0
                this.bulkBar.hidden = count === 0
                for (const btn of this.editActions.querySelectorAll('button')) {
                    btn.toggleAttribute('data-nav-header', count === 0)
                }
                for (const btn of this.bulkBar.querySelectorAll('button')) {
                    btn.toggleAttribute('data-nav-header', count > 0)
                }
            }
        )
        store.subscribe(
            s => s.ui.editMode,
            (on) => {
                for (const btn of this.editActions.querySelectorAll('button')) {
                    btn.toggleAttribute('data-nav-header', on)
                }
                for (const btn of this.viewActions.querySelectorAll('button')) {
                    btn.toggleAttribute('data-nav-header', !on)
                }
            }
        )
        store.subscribe(
            s => s.ui.canCheckLinks,
            (can) => {
                this.checkBtn.hidden = !can
                this.statusBtn.hidden = !can
            }
        )

        this.filterInput.addEventListener('filter-change', (e) => {
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

        this.checkBtn.addEventListener('click', () => sync.checkLinks())

        this.statusBtn.addEventListener('click', () => {
            const next = !store.state.ui.showLinkStatus
            store.setState(['ui', 'showLinkStatus'], next)
            this.statusBtn.classList.toggle('active', next)
        })

        store.subscribe(
            s => s.ui.checkingLinks,
            (busy) => {
                this.checkBtn.disabled = busy
                this.checkBtn.textContent = busy ? 'Checking…' : 'Check links'
            }
        )
    }
}

customElements.define('link-toolbar', LinkToolbar)
