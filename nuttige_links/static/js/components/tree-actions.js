import { store } from '../datastore.js'
import { markForDelete } from '../behaviors/actions.js'

class TreeActions extends HTMLElement {
    get table() { return this.closest('[data-table]').dataset.table }
    get recordId() { return this.closest('[record-id]').getAttribute('record-id') }

    connectedCallback() {
        this.innerHTML = `
            <button data-action="edit" title="Edit">✎</button>
            <button data-action="delete" title="Delete">✕</button>
        `

        this.addEventListener('click', (e) => {
            const action = e.target.closest('[data-action]')?.dataset.action
            if (!action) return
            e.preventDefault()
            e.stopPropagation()

            if (action === 'edit') {
                store.setState(['ui', 'dialog'], {
                    mode: 'edit', table: this.table, id: this.recordId,
                })
            } else if (action === 'delete') {
                markForDelete(this.table, this.recordId)
            }
        })
    }
}

customElements.define('tree-actions', TreeActions)
