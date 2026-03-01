import { store } from '../datastore.js'
import { createRecord, updateRecord } from '../behaviors/actions.js'
import './combobox.js'

const css = /*css*/`
:host { display: contents; }

dialog {
    border: 1px solid var(--bg-border, #ccc);
    border-radius: 8px;
    background: var(--bg-surface, #fff);
    color: inherit;
    padding: 1.5rem;
    min-width: 420px;
    max-width: 90vw;
}

dialog::backdrop {
    background: rgba(0, 0, 0, 0.4);
}

h2 {
    margin: 0 0 1.25rem;
    font-size: 1.1rem;
}

.fields {
    display: grid;
    gap: 0.875rem;
}

label {
    display: grid;
    gap: 0.25rem;
    font-size: 0.9em;
}

input[type="text"],
input[type="url"] {
    padding: 0.25rem 0.5rem;
    border: 1px solid var(--bg-border, #ccc);
    border-radius: var(--control-border-radius, 4px);
    background: transparent;
    color: inherit;
    font: inherit;
}

input:focus {
    outline: 2px solid var(--focus-color, highlight);
    outline-offset: -1px;
}

.error {
    font-size: 0.8em;
    color: oklch(0.55 0.2 25);
    min-height: 1em;
}

.actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
    margin-top: 1.25rem;
}

button {
    padding: 0.3rem 0.75rem;
    border: 1px solid var(--bg-border, #ccc);
    border-radius: var(--control-border-radius, 4px);
    background: transparent;
    color: inherit;
    font: inherit;
    cursor: pointer;
}

button:hover:not(:disabled) {
    background: var(--bg-muted, #f5f5f5);
}

button:disabled {
    opacity: 0.45;
    cursor: default;
}
`

const template = /*html*/`
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
</dialog>
`

class LinkDialog extends HTMLElement {
    // DOM
    get _focusables() {
        // returns focusable items, skipping disabled ones
        const fields = [
            this._fieldSection,
            this._fieldSubsection,
            this._fieldUrl,
            this._fieldText,
            this._fieldDescription,
            this._btnSave,
        ]
        return fields.filter(el => !el.disabled && !el.hasAttribute('disabled'))
    }

    // life-cycle
    constructor() {
        this.attachShadow({ mode: 'open' })
        this.shadowRoot.innerHTML = template

        const sheet = new CSSStyleSheet()
        sheet.replaceSync(css)
        this.shadowRoot.adoptedStyleSheets = [sheet]

        this._dialog = this.shadowRoot.querySelector('dialog')
        this._title = this.shadowRoot.querySelector('h2')
        this._fieldSection = this.shadowRoot.querySelector('#f-sec')
        this._fieldSubsection = this.shadowRoot.querySelector('#f-sub')
        this._fieldUrl = this.shadowRoot.querySelector('#f-url')
        this._fieldText = this.shadowRoot.querySelector('#f-txt')
        this._fieldDescription = this.shadowRoot.querySelector('#f-desc')
        this._errorUrl = this.shadowRoot.querySelector('#err-url')
        this._errorTxt = this.shadowRoot.querySelector('#err-txt')
        this._btnSave = this.shadowRoot.querySelector('#btn-save')

        this._mode = null
        this._editId = null
        this._section = null  // combobox value: { id, isNew } | { name, isNew: true } | null
        this._subsection = null
    }

    connectedCallback() {
        this._setupListeners()
        this._unsub = store.subscribe(
            s => s.ui.dialog,
            d => { if (d?.table === 'links') this._open(d); else this._close() }
        )
    }

    disconnectedCallback() { this._unsub?.() }

    _setupListeners() {
        // backdrop click
        this._dialog.addEventListener('click', e => { if (e.target === this._dialog) this._requestClose() })

        this.shadowRoot.querySelector('#btn-cancel').addEventListener('click', () => this._requestClose())
        this._btnSave.addEventListener('click', () => this._save())

        // combobox events — auto-advance section→sub and sub→url on selection
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

        this.shadowRoot.addEventListener('keydown', e => this._onKeydown(e))
    }

    _onKeydown(e) {
        // alt+down/up: move between fields
        // (for comboboxes, plain arrow keys are reserved for the dropdown)
        if (e.altKey && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
            e.preventDefault()
            e.stopPropagation()
            this._moveFocus(e.key === 'ArrowDown' ? 1 : -1)
            return
        }

        if (e.key === 'Enter') {
            const t = e.target
            // text inputs: enter advances to next field (or submits from last)
            if (t === this._fieldUrl || t === this._fieldText) {
                e.preventDefault()
                this._moveFocus(1)
            } else if (t === this._fieldDescription) {
                e.preventDefault()
                if (!this._btnSave.disabled) this._save()
            }
        }
    }

    _moveFocus(dir) {
        // shadowRoot.activeElement returns the shadow host (e.g. combo-box) when
        // focus is nested inside a child shadow root, so indexOf works correctly
        const items = this._focusables
        const idx = items.indexOf(this.shadowRoot.activeElement)
        items[idx + dir]?.focus()
    }

    // open / close
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
            const link = store.state.links.records[config.id] ?? store.state.links.drafts[config.id]
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

    _close() { this._dialog.close() }
    _requestClose() { store.setState(['ui', 'dialog'], null) }

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

    // section / subsection helpers
    _secOptions() {
        return Object.values({ ...store.state.sections.records, ...store.state.sections.drafts })
            .map(s => ({ id: s.id, name: s.name }))
    }

    _loadSubOptions(sectionId) {
        this._fieldSubsection.options = Object.values({ ...store.state.subsections.records, ...store.state.subsections.drafts })
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

        // new section: no existing subsections, but still enable for creating one
        this._loadSubOptions(val.isNew ? '__none__' : val.id)
        requestAnimationFrame(() => this._fieldSubsection.focus())
    }

    // validation
    _validate() {
        const url = this._fieldUrl.value.trim()
        const txt = this._fieldText.value.trim()

        if (!this._section || !this._subsection || !url || !txt) {
            this._btnSave.disabled = true
            return
        }

        // duplicate check only applies to existing subsections
        // (a brand new subsection can't have duplicates yet)
        const subId = this._subsection.isNew ? null : this._subsection.id
        if (subId) {
            const existing = Object.values({ ...store.state.links.records, ...store.state.links.drafts })
                .filter(l => l.subsection_id === subId && l.id !== this._editId)
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

    // save
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
