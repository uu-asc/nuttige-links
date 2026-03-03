import { store } from '../datastore.js'
import { updateRecord } from '../behaviors/actions.js'
import { BaseDialog } from './base-dialog.js'
import './sortable-list.js'

class ReorderSectionsDialog extends BaseDialog {
    get _template() {
        return /*html*/`
        <dialog>
            <h2>Reorder sections</h2>
            <sortable-list id="sections-list"></sortable-list>
            <div class="actions">
                <button id="btn-cancel">Cancel</button>
                <button id="btn-save">Apply</button>
            </div>
        </dialog>`
    }

    // --- DOM refs ---

    get _sectionsList() { return this.shadowRoot.querySelector('#sections-list') }

    get _focusables() {
        return [this._sectionsList, this._btnSave]
    }

    // --- dialog lifecycle ---

    _shouldOpen(config) {
        return config.mode === 'reorder-sections'
    }

    _setupListeners() {
        this._pendingOrder = null

        this._sectionsList.addEventListener('reorder', (e) => {
            this._pendingOrder = e.detail.orderedIds
        })
    }

    _open() {
        this._pendingOrder = null
        this._populateList()
        this._dialog.showModal()
    }

    _save() {
        if (this._pendingOrder) {
            store.batch(() => {
                this._pendingOrder.forEach((id, i) => {
                    updateRecord('sections', id, { position: i })
                })
            })
        }
        this._requestClose()
    }

    // --- populate ---

    _populateList() {
        const sections = Object.values({
            ...store.state.sections.records,
            ...store.state.sections.drafts,
        }).sort((a, b) => (a.position ?? 0) - (b.position ?? 0))

        this._sectionsList.items = sections.map(s => ({
            id: s.id,
            label: s.name,
        }))
    }
}

customElements.define('reorder-sections-dialog', ReorderSectionsDialog)
