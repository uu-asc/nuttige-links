import { store } from '../datastore.js'
import { createRecord, updateRecord } from '../behaviors/actions.js'
import { BaseDialog } from './base-dialog.js'
import './combobox.js'

class LinkDialog extends BaseDialog {
    get _template() {
        return /*html*/`
        <dialog>
            <h2></h2>
            <div class="fields">
                <label>
                    Section
                    <combo-box id="f-sec"></combo-box>
                </label>
                <label>
                    Subsection
                    <combo-box id="f-sub"></combo-box>
                </label>
                <label>
                    URL
                    <input type="url" id="f-url" autocomplete="off">
                    <span class="error" id="err-url"></span>
                </label>
                <label>
                    Text
                    <input type="text" id="f-txt" autocomplete="off">
                    <span class="error" id="err-txt"></span>
                </label>
                <label>
                    Description
                    <input type="text" id="f-desc" autocomplete="off">
                </label>
            </div>
            <div class="actions">
                <button id="btn-cancel">Cancel</button>
                <button id="btn-save" disabled>Save</button>
            </div>
        </dialog>`
    }

    get _focusables() {
        return [
            this._fieldSection,
            this._fieldSubsection,
            this._fieldUrl,
            this._fieldText,
            this._fieldDescription,
            this._btnSave,
        ].filter(el => !el.disabled && !el.hasAttribute('disabled'))
    }

    _shouldOpen(config) {
        return (config.mode === 'add' || config.mode === 'edit') && config.table === 'links'
    }

    _setupListeners() {
        this._fieldSection = this.shadowRoot.querySelector('#f-sec')
        this._fieldSubsection = this.shadowRoot.querySelector('#f-sub')
        this._fieldUrl = this.shadowRoot.querySelector('#f-url')
        this._fieldText = this.shadowRoot.querySelector('#f-txt')
        this._fieldDescription = this.shadowRoot.querySelector('#f-desc')
        this._errorUrl = this.shadowRoot.querySelector('#err-url')
        this._errorTxt = this.shadowRoot.querySelector('#err-txt')

        this._mode = null
        this._editId = null
        this._section = null
        this._subsection = null

        this.shadowRoot.addEventListener('combobox-change', e => {
            if (e.target === this._fieldSection) {
                this._onSecChange(e.detail)
            } else if (e.target === this._fieldSubsection) {
                this._subsection = e.detail
                if (e.detail) requestAnimationFrame(() => this._fieldUrl.focus())
            }
            this._validate()
        })

        this._fieldUrl.addEventListener('input', () => this._validate())
        this._fieldText.addEventListener('input', () => this._validate())
    }

    // --- open / populate ---

    _open(config) {
        this._mode = config.mode
        this._editId = config.id ?? null
        this._section = null
        this._subsection = null

        this._title.textContent = config.mode === 'edit' ? 'Edit link' : 'Add link'
        this._fieldSection.options = this._secOptions()
        this._resetFields()

        if (config.mode === 'add') {
            const { defaults = {} } = config
            if (defaults.section_id) {
                this._section = { id: defaults.section_id, isNew: false }
                this._fieldSection.value = this._section
                this._loadSubOptions(defaults.section_id)
                if (defaults.subsection_id) {
                    this._subsection = { id: defaults.subsection_id, isNew: false }
                    this._fieldSubsection.value = this._subsection
                }
            }
        } else if (config.mode === 'edit') {
            const link = store.state.links.drafts[config.id]
                ?? store.state.links.records[config.id]
            if (link) {
                const sub = store.state.subsections.records[link.subsection_id]
                if (sub?.section_id) {
                    this._section = { id: sub.section_id, isNew: false }
                    this._fieldSection.value = this._section
                    this._loadSubOptions(sub.section_id)
                }
                this._subsection = { id: link.subsection_id, isNew: false }
                this._fieldSubsection.value = this._subsection
                this._fieldUrl.value = link.url
                this._fieldText.value = link.text
                this._fieldDescription.value = link.description ?? ''
            }
        }

        this._validate()
        this._dialog.showModal()

        requestAnimationFrame(() => {
            if (!this._section) this._fieldSection.focus()
            else if (!this._subsection) this._fieldSubsection.focus()
            else this._fieldUrl.focus()
        })
    }

    _resetFields() {
        this._fieldSection.value = null
        this._fieldSection.options = this._secOptions()
        this._fieldSubsection.options = []
        this._fieldSubsection.value = null
        this._fieldSubsection.disabled = true
        this._fieldUrl.value = ''
        this._fieldText.value = ''
        this._fieldDescription.value = ''
        this._errorUrl.textContent = ''
        this._errorTxt.textContent = ''
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
        this._fieldSubsection.disabled = false
    }

    _onSecChange(val) {
        this._section = val
        this._subsection = null
        this._fieldSubsection.value = null

        if (!val) {
            this._fieldSubsection.options = []
            this._fieldSubsection.disabled = true
            return
        }

        this._loadSubOptions(val.isNew ? '__none__' : val.id)
        requestAnimationFrame(() => this._fieldSubsection.focus())
    }

    // --- validation ---

    _validate() {
        const url = this._fieldUrl.value.trim()
        const txt = this._fieldText.value.trim()

        if (!this._section || !this._subsection || !url || !txt) {
            this._btnSave.disabled = true
            return
        }

        const subId = this._subsection.isNew ? null : this._subsection.id
        if (subId) {
            const existing = Object.values({
                ...store.state.links.records,
                ...store.state.links.drafts,
            }).filter(l => l.subsection_id === subId && l.id !== this._editId)

            const urlDup = existing.some(l => l.url === url)
            const txtDup = existing.some(l => l.text === txt)
            this._errorUrl.textContent = urlDup ? 'URL already exists in this subsection' : ''
            this._errorTxt.textContent = txtDup ? 'Text already exists in this subsection' : ''
            if (urlDup || txtDup) { this._btnSave.disabled = true; return }
        } else {
            this._errorUrl.textContent = ''
            this._errorTxt.textContent = ''
        }

        this._btnSave.disabled = false
    }

    // --- save ---

    _save() {
        const url = this._fieldUrl.value.trim()
        const txt = this._fieldText.value.trim()
        const desc = this._fieldDescription.value.trim() || null

        const secId = this._section.isNew
            ? createRecord('sections', { name: this._section.name, position: null })
            : this._section.id

        const subId = this._subsection.isNew
            ? createRecord('subsections', { name: this._subsection.name, section_id: secId, position: null })
            : this._subsection.id

        if (this._mode === 'add') {
            createRecord('links', { subsection_id: subId, url, text: txt, description: desc, position: null })
        } else {
            updateRecord('links', this._editId, { subsection_id: subId, url, text: txt, description: desc })
        }

        this._requestClose()
    }
}

customElements.define('link-dialog', LinkDialog)
