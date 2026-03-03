import { store } from '../datastore.js'
import { createRecord, bulkSetFields } from '../behaviors/actions.js'
import { BaseDialog } from './base-dialog.js'
import './combobox.js'

class BulkLinkDialog extends BaseDialog {
    get _template() {
        return /*html*/`
        <dialog>
            <h2>Edit links</h2>
            <div class="fields">
                <div class="field-row">
                    <input type="checkbox" id="chk-sec" class="field-toggle">
                    <label>
                        <span class="field-label">Section</span>
                        <combo-box id="f-sec" disabled></combo-box>
                    </label>
                </div>
                <div class="field-row">
                    <input type="checkbox" id="chk-sub" class="field-toggle">
                    <label>
                        <span class="field-label">Subsection</span>
                        <combo-box id="f-sub" disabled></combo-box>
                    </label>
                </div>
                <div class="field-row">
                    <input type="checkbox" id="chk-desc" class="field-toggle">
                    <label>
                        <span class="field-label">Description</span>
                        <input type="text" id="f-desc" autocomplete="off" disabled>
                    </label>
                </div>
            </div>
            <div class="actions">
                <button id="btn-cancel">Cancel</button>
                <button id="btn-save" disabled>Save</button>
            </div>
        </dialog>`
    }

    get _extraCss() {
        return /*css*/`
        .field-row {
            display: grid;
            grid-template-columns: auto 1fr;
            gap: 0.5rem;
            align-items: start;
        }
        .field-toggle {
            margin-top: 1.6em;
        }
        .field-label {
            font-size: 0.9em;
        }
        `
    }

    get _focusables() {
        return [
            this._chkSec,
            this._fieldSection,
            this._chkSub,
            this._fieldSubsection,
            this._chkDesc,
            this._fieldDescription,
            this._btnSave,
        ].filter(el => !el.disabled && !el.hasAttribute('disabled'))
    }

    _shouldOpen(config) {
        return config.mode === 'bulk' && config.table === 'links'
    }

    _setupListeners() {
        this._chkSec = this.shadowRoot.querySelector('#chk-sec')
        this._chkSub = this.shadowRoot.querySelector('#chk-sub')
        this._chkDesc = this.shadowRoot.querySelector('#chk-desc')
        this._fieldSection = this.shadowRoot.querySelector('#f-sec')
        this._fieldSubsection = this.shadowRoot.querySelector('#f-sub')
        this._fieldDescription = this.shadowRoot.querySelector('#f-desc')

        this._ids = []
        this._sharedSectionId = null
        this._sectionsMixed = false

        this._chkSec.addEventListener('change', () => {
            const on = this._chkSec.checked
            this._fieldSection.disabled = !on
            if (on) {
                this._activateSubsection()
                this._fieldSubsection.value = null
            } else {
                this._deactivateSubsection()
                this._fieldSection.value = null
                this._fieldSubsection.value = null
            }
            this._validate()
        })

        this._chkSub.addEventListener('change', () => {
            const on = this._chkSub.checked
            this._fieldSubsection.disabled = !on
            if (!on) {
                this._fieldSubsection.value = null
            } else if (this._sharedSectionId) {
                this._loadSubOptions(this._sharedSectionId)
            }
            this._validate()
        })

        this._chkDesc.addEventListener('change', () => {
            const on = this._chkDesc.checked
            this._fieldDescription.disabled = !on
            if (!on) this._fieldDescription.value = ''
            this._validate()
        })

        this.shadowRoot.addEventListener('combobox-change', e => {
            if (e.target === this._fieldSection) {
                this._onSecChange(e.detail)
            }
            this._validate()
        })

        this._fieldDescription.addEventListener('input', () => this._validate())
    }

    // --- open ---

    _open(config) {
        this._ids = config.ids ?? []
        this._analyze()
        this._resetFields()
        this._prefill()
        this._validate()
        this._dialog.showModal()
    }

    _analyze() {
        const links = store.state.links
        const subsections = store.state.subsections

        const sectionIds = new Set()
        const subsectionIds = new Set()

        for (const id of this._ids) {
            const link = links.drafts[id] ?? links.records[id]
            if (!link) continue
            subsectionIds.add(link.subsection_id)
            const sub = subsections.drafts[link.subsection_id] ?? subsections.records[link.subsection_id]
            if (sub) sectionIds.add(sub.section_id)
        }

        this._sectionsMixed = sectionIds.size > 1
        this._sharedSectionId = sectionIds.size === 1 ? [...sectionIds][0] : null
        this._subsectionsMixed = subsectionIds.size > 1
        this._sharedSubsectionId = subsectionIds.size === 1 ? [...subsectionIds][0] : null
    }

    _resetFields() {
        this._chkSec.checked = false
        this._chkSub.checked = false
        this._chkDesc.checked = false
        this._fieldSection.disabled = true
        this._fieldSubsection.disabled = true
        this._fieldDescription.disabled = true
        this._fieldSection.value = null
        this._fieldSubsection.value = null
        this._fieldDescription.value = ''
        this._fieldSection.options = this._secOptions()
        this._fieldSubsection.options = []
    }

    _prefill() {
        if (this._sharedSectionId) {
            this._fieldSection.selectedId = this._sharedSectionId
            this._loadSubOptions(this._sharedSectionId)
        }

        if (this._sharedSubsectionId) {
            this._fieldSubsection.selectedId = this._sharedSubsectionId
        }

        // if sections are mixed, subsection cannot be activated standalone
        if (this._sectionsMixed) {
            this._chkSub.disabled = true
        } else {
            this._chkSub.disabled = false
        }
    }

    // --- section / subsection helpers ---

    _secOptions() {
        return Object.values({
            ...store.state.sections.records,
            ...store.state.sections.drafts,
        }).map(s => ({ id: s.id, name: s.name }))
    }

    _loadSubOptions(sectionId) {
        this._fieldSubsection.options = Object.values({
            ...store.state.subsections.records,
            ...store.state.subsections.drafts,
        })
            .filter(s => s.section_id === sectionId)
            .map(s => ({ id: s.id, name: s.name }))
    }

    _onSecChange(val) {
        this._fieldSubsection.value = null
        if (!val) {
            this._fieldSubsection.options = []
            return
        }
        this._loadSubOptions(val.isNew ? '__none__' : val.id)
    }

    _activateSubsection() {
        this._chkSub.checked = true
        this._chkSub.disabled = true
        this._fieldSubsection.disabled = false
    }

    _deactivateSubsection() {
        if (this._sectionsMixed) {
            this._chkSub.checked = false
            this._chkSub.disabled = true
            this._fieldSubsection.disabled = true
        } else {
            this._chkSub.disabled = false
            this._chkSub.checked = false
            this._fieldSubsection.disabled = true
        }
    }

    // --- validation ---

    _validate() {
        const secActive = this._chkSec.checked
        const subActive = this._chkSub.checked
        const descActive = this._chkDesc.checked

        // at least one field must be activated
        if (!secActive && !subActive && !descActive) {
            this._btnSave.disabled = true
            return
        }

        // if section is active, both section and subsection must have values
        if (secActive) {
            const secVal = this._fieldSection.value
            const subVal = this._fieldSubsection.value
            if (!secVal || !subVal) {
                this._btnSave.disabled = true
                return
            }
        }

        // if only subsection is active, it must have a value
        if (subActive && !secActive) {
            const subVal = this._fieldSubsection.value
            if (!subVal) {
                this._btnSave.disabled = true
                return
            }
        }

        this._btnSave.disabled = false
    }

    // --- save ---

    _save() {
        const updates = {}

        if (this._chkSec.checked || this._chkSub.checked) {
            const secVal = this._chkSec.checked ? this._fieldSection.value : null
            const subVal = this._fieldSubsection.value

            let secId
            if (secVal) {
                secId = secVal.isNew
                    ? createRecord('sections', { name: secVal.name, position: null })
                    : secVal.id
            } else {
                secId = this._sharedSectionId
            }

            const subId = subVal.isNew
                ? createRecord('subsections', { name: subVal.name, section_id: secId, position: null })
                : subVal.id

            updates.subsection_id = subId
        }

        if (this._chkDesc.checked) {
            updates.description = this._fieldDescription.value.trim() || null
        }

        if (Object.keys(updates).length) {
            bulkSetFields('links', this._ids, updates)
        }

        this._requestClose()
    }
}

customElements.define('bulk-link-dialog', BulkLinkDialog)
