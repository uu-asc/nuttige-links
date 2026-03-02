import { store } from '../datastore.js'
import { updateRecord } from '../behaviors/actions.js'
import { BaseDialog } from './base-dialog.js'

const LABELS = { sections: 'section', subsections: 'subsection' }

class ContainerDialog extends BaseDialog {
    get _template() {
        return /*html*/`
        <dialog>
            <h2></h2>
            <label>
                Name
                <input type="text" id="f-name" autocomplete="off">
                <span class="error" id="err-name"></span>
            </label>
            <div class="actions">
                <button id="btn-cancel">Cancel</button>
                <button id="btn-save" disabled>Save</button>
            </div>
        </dialog>`
    }

    get _focusables() {
        return [this._nameInput, this._btnSave]
    }

    _shouldOpen(config) {
        return config.mode === 'edit' && !!LABELS[config.table]
    }

    _setupListeners() {
        this._nameInput = this.shadowRoot.querySelector('#f-name')
        this._errorName = this.shadowRoot.querySelector('#err-name')
        this._table = null
        this._editId = null

        this._nameInput.addEventListener('input', () => this._validate())
    }

    _open(config) {
        this._table = config.table
        this._editId = config.id

        this._title.textContent = `Edit ${LABELS[this._table]}`

        const record = store.state[this._table].drafts[this._editId]
            ?? store.state[this._table].records[this._editId]

        this._nameInput.value = record?.name ?? ''
        this._errorName.textContent = ''
        this._validate()
        this._dialog.showModal()
        requestAnimationFrame(() => {
            this._nameInput.focus()
            this._nameInput.select()
        })
    }

    _validate() {
        const name = this._nameInput.value.trim()
        if (!name) {
            this._btnSave.disabled = true
            this._errorName.textContent = ''
            return
        }

        const all = { ...store.state[this._table].records, ...store.state[this._table].drafts }
        let candidates = Object.values(all).filter(r => r.id !== this._editId)

        if (this._table === 'subsections') {
            const current = all[this._editId]
            candidates = candidates.filter(r => r.section_id === current.section_id)
        }

        const dup = candidates.some(r => r.name.toLowerCase() === name.toLowerCase())

        this._errorName.textContent = dup ? 'Name already exists' : ''
        this._btnSave.disabled = dup
    }

    _save() {
        const name = this._nameInput.value.trim()
        updateRecord(this._table, this._editId, { name })
        this._requestClose()
    }
}

customElements.define('container-dialog', ContainerDialog)
