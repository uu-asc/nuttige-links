import { store } from '../datastore.js'
import { updateRecord } from '../behaviors/actions.js'
import { BaseDialog } from './base-dialog.js'
import './sortable-list.js'

const LABELS = { sections: 'section', subsections: 'subsection' }

const CHILD_CONFIG = {
    sections: {
        childTable: 'subsections',
        parentKey: 'section_id',
        childLabel: 'Subsections',
        displayField: 'name',
    },
    subsections: {
        childTable: 'links',
        parentKey: 'subsection_id',
        childLabel: 'Links',
        displayField: 'text',
    },
}

class ContainerDialog extends BaseDialog {
    get _template() {
        return /*html*/`
        <dialog>
            <h2></h2>
            <div class="fields">
                <label>
                    Name
                    <input type="text" id="f-name" autocomplete="off">
                    <span class="error" id="err-name"></span>
                </label>
                <label id="children-label" hidden>
                    <span id="children-title"></span>
                    <sortable-list id="children-list"></sortable-list>
                </label>
            </div>
            <div class="actions">
                <button id="btn-cancel">Cancel</button>
                <button id="btn-save" disabled>Save</button>
            </div>
        </dialog>`
    }

    // --- DOM refs ---

    get _nameInput() { return this.shadowRoot.querySelector('#f-name') }
    get _errorName() { return this.shadowRoot.querySelector('#err-name') }
    get _childrenLabel() { return this.shadowRoot.querySelector('#children-label') }
    get _childrenTitle() { return this.shadowRoot.querySelector('#children-title') }
    get _childrenList() { return this.shadowRoot.querySelector('#children-list') }

    get _focusables() {
        return [this._nameInput, this._btnSave]
    }

    // --- dialog lifecycle ---

    _shouldOpen(config) {
        return config.mode === 'edit' && !!LABELS[config.table]
    }

    _setupListeners() {
        this._table = null
        this._editId = null
        this._childConfig = null
        this._pendingOrder = null

        this._nameInput.addEventListener('input', () => this._validate())
        this._childrenList.addEventListener('reorder', (e) => {
            this._pendingOrder = e.detail.orderedIds
        })
    }

    _open(config) {
        this._table = config.table
        this._editId = config.id
        this._childConfig = CHILD_CONFIG[this._table]
        this._pendingOrder = null

        this._title.textContent = `Edit ${LABELS[this._table]}`

        this._populateName()
        this._populateChildren()
        this._validate()

        this._dialog.showModal()
        requestAnimationFrame(() => {
            this._nameInput.focus()
            this._nameInput.select()
        })
    }

    _save() {
        this._saveName()
        this._saveChildOrder()
        this._requestClose()
    }

    // --- populate fields ---

    _populateName() {
        const record = this._currentRecord()
        this._nameInput.value = record?.name ?? ''
        this._errorName.textContent = ''
    }

    _populateChildren() {
        const { childTable, parentKey, childLabel, displayField } = this._childConfig

        const children = this._sortedChildren(childTable, parentKey)
        this._childrenTitle.textContent = childLabel

        if (children.length) {
            this._childrenLabel.hidden = false
            this._childrenList.items = children.map(c => ({
                id: c.id,
                label: c[displayField] ?? c.url ?? c.id,
            }))
        } else {
            this._childrenLabel.hidden = true
            this._childrenList.items = []
        }
    }

    // --- save logic ---

    _saveName() {
        const name = this._nameInput.value.trim()
        updateRecord(this._table, this._editId, { name })
    }

    _saveChildOrder() {
        if (!this._pendingOrder) return
        const { childTable } = this._childConfig
        store.batch(() => {
            this._pendingOrder.forEach((id, i) => {
                updateRecord(childTable, id, { position: i })
            })
        })
    }

    // --- validation ---

    _validate() {
        const name = this._nameInput.value.trim()
        if (!name) {
            this._btnSave.disabled = true
            this._errorName.textContent = ''
            return
        }

        const dup = this._hasDuplicateName(name)
        this._errorName.textContent = dup ? 'Name already exists' : ''
        this._btnSave.disabled = dup
    }

    _hasDuplicateName(name) {
        const all = { ...store.state[this._table].records, ...store.state[this._table].drafts }
        let candidates = Object.values(all).filter(r => r.id !== this._editId)

        if (this._table === 'subsections') {
            const current = all[this._editId]
            candidates = candidates.filter(r => r.section_id === current.section_id)
        }

        return candidates.some(r => r.name.toLowerCase() === name.toLowerCase())
    }

    // --- helpers ---

    _currentRecord() {
        return store.state[this._table].drafts[this._editId]
            ?? store.state[this._table].records[this._editId]
    }

    _sortedChildren(childTable, parentKey) {
        return Object.values({
            ...store.state[childTable].records,
            ...store.state[childTable].drafts,
        })
            .filter(r => r[parentKey] === this._editId)
            .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    }
}

customElements.define('container-dialog', ContainerDialog)
