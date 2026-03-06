import { store } from '../datastore.js'
import { sync } from '../sync.js'
import { bulkMarkForDelete } from '../behaviors/actions.js'
import { deselectAll } from '../behaviors/selection.js'
import { exportSelected } from '../behaviors/import-export.js'

class BulkActionsBar extends HTMLElement {
    connectedCallback() {
        this.innerHTML = `
            <span data-ref="count"></span>
            <button data-action="edit">Edit</button>
            <button data-action="check" hidden>Check</button>
            <span data-ref="hint" hidden></span>
            <button data-action="export">Export</button>
            <button data-action="delete">Delete</button>
            <hr>
            <button data-action="deselect">Deselect all</button>
        `

        this._countEl = this.querySelector('[data-ref="count"]')
        this._editBtn = this.querySelector('[data-action="edit"]')
        this._checkBtn = this.querySelector('[data-action="check"]')
        this._hintEl = this.querySelector('[data-ref="hint"]')
        this._deleteBtn = this.querySelector('[data-action="delete"]')
        this._exportBtn = this.querySelector('[data-action="export"]')
        this._deselectBtn = this.querySelector('[data-action="deselect"]')

        this._editBtn.addEventListener('click', () => {
            const { links } = this._selection()
            if (!links.size) return
            store.setState(['ui', 'dialog'], {
                mode: 'bulk',
                table: 'links',
                ids: [...links],
            })
        })

        this._deleteBtn.addEventListener('click', () => {
            const { sections, subsections, links } = this._selection()
            store.batch(() => {
                if (sections.size) bulkMarkForDelete('sections', [...sections])
                if (subsections.size) bulkMarkForDelete('subsections', [...subsections])
                if (links.size) bulkMarkForDelete('links', [...links])
            })
        })

        this._deselectBtn.addEventListener('click', () => deselectAll())

        this._checkBtn.addEventListener('click', () => {
            const ids = [...store.state.links.checkedIds]
            if (ids.length) sync.checkLinks(ids)
        })

        this._exportBtn.addEventListener('click', () => exportSelected())

        store.subscribe(
            s => s.ui.checkingLinks,
            (busy) => {
                this._checkBtn.disabled = busy
                this._checkBtn.textContent = busy ? 'Checking…' : 'Check'
            }
        )

        store.subscribe(
            s => s.ui.canCheckLinks,
            (can) => { this._checkBtn.hidden = !can }
        )

        store.subscribe(
            s => `${[...s.sections.checkedIds]}|${[...s.subsections.checkedIds]}|${[...s.links.checkedIds]}`,
            () => this._sync()
        )

        this._sync()
    }

    disconnectedCallback() {
        this._unsub?.()
    }

    _selection() {
        const s = store.state
        return {
            sections: s.sections.checkedIds,
            subsections: s.subsections.checkedIds,
            links: s.links.checkedIds,
        }
    }

    _sync() {
        const { sections, subsections, links } = this._selection()
        const total = sections.size + subsections.size + links.size

        if (total === 0) return

        const mixed = (sections.size + subsections.size) > 0 && links.size > 0
        const linksOnly = links.size > 0 && sections.size === 0 && subsections.size === 0
        const editDisabled = !linksOnly

        this._countEl.textContent = `${total} selected`
        this._editBtn.disabled = editDisabled
        this._checkBtn.disabled = editDisabled
        this._hintEl.hidden = !mixed
        this._hintEl.textContent = mixed ? 'Select only links to edit' : ''
    }
}

customElements.define('bulk-actions-bar', BulkActionsBar)
