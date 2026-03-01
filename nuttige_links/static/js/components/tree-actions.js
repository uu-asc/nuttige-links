import { store } from '../datastore.js'
import { markForDelete } from '../behaviors/actions.js'

class TreeActions extends HTMLElement {
    get table() { return this.closest('[data-table]').dataset.table }
    get recordId() { return this.closest('[record-id]').getAttribute('record-id') }

    connectedCallback() {
        this.innerHTML = `
            <button data-action="edit" title="Edit">✎</button>
            <button data-action="delete" title="Delete">✕</button>
            <input type="checkbox" data-action="check" />
        `

        this.addEventListener('click', (e) => {
            const action = e.target.closest('[data-action]')?.dataset.action
            if (!action || action === 'check') return
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

        this.addEventListener('change', (e) => {
            if (!e.target.matches('[data-action="check"]')) return
            e.stopPropagation()
            const t = this.table
            const id = this.recordId
            const next = new Set(store.state[t].checkedIds)
            next.has(id) ? next.delete(id) : next.add(id)
            store.setState([t, 'checkedIds'], next)
        })

        this._unsub = store.subscribe(
            s => s[this.table].checkedIds.has(this.recordId),
            (checked) => { this.querySelector('[data-action="check"]').checked = checked }
        )
    }

    disconnectedCallback() {
        this._unsub?.()
    }
}

customElements.define('tree-actions', TreeActions)
