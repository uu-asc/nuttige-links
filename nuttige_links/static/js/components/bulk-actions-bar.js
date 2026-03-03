import { store } from '../datastore.js'
import { bulkMarkForDelete } from '../behaviors/actions.js'
import { deselectAll, selectAllVisible } from '../behaviors/selection.js'

class BulkActionsBar extends HTMLElement {
    connectedCallback() {
        this.innerHTML = `
            <span data-ref="count"></span>
            <button data-ref="edit">Edit</button>
            <span data-ref="hint" hidden></span>
            <button data-ref="delete">Delete</button>
            <button data-ref="deselect">Deselect all</button>
        `

        this._countEl = this.querySelector('[data-ref="count"]')
        this._editBtn = this.querySelector('[data-ref="edit"]')
        this._hintEl = this.querySelector('[data-ref="hint"]')
        this._deleteBtn = this.querySelector('[data-ref="delete"]')

        this.querySelector('[data-ref="edit"]').addEventListener('click', () => {
            const { links } = this._selection()
            if (!links.size) return
            store.setState(['ui', 'dialog'], {
                mode: 'bulk',
                table: 'links',
                ids: [...links],
            })
        })

        this.querySelector('[data-ref="delete"]').addEventListener('click', () => {
            const { sections, subsections, links } = this._selection()
            store.batch(() => {
                if (sections.size) bulkMarkForDelete('sections', [...sections])
                if (subsections.size) bulkMarkForDelete('subsections', [...subsections])
                if (links.size) bulkMarkForDelete('links', [...links])
            })
        })

        this.querySelector('[data-ref="deselect"]').addEventListener('click', () => {
            store.batch(() => {
                store.setState(['sections', 'checkedIds'], new Set())
                store.setState(['subsections', 'checkedIds'], new Set())
                store.setState(['links', 'checkedIds'], new Set())
            })
        })

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

        this.hidden = total === 0
        if (total === 0) return

        const mixed = (sections.size + subsections.size) > 0 && links.size > 0
        const linksOnly = links.size > 0 && sections.size === 0 && subsections.size === 0
        const editDisabled = !linksOnly

        this._countEl.textContent = `${total} selected`
        this._editBtn.disabled = editDisabled
        this._hintEl.hidden = !mixed
        this._hintEl.textContent = mixed ? 'Select only links to edit' : ''
    }
}

customElements.define('bulk-actions-bar', BulkActionsBar)
