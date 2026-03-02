import { store } from '../datastore.js'

const sharedCss = /*css*/`
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

export class BaseDialog extends HTMLElement {
    // --- subclass interface ---
    // get _template()            – dialog HTML
    // get _extraCss()            – additional CSS (optional)
    // get _focusables()          – ordered focusable elements
    // _shouldOpen(config)        – return true to claim this dialog config
    // _setupListeners()          – cache DOM refs, wire field-specific listeners
    // _open(config)              – populate fields, showModal
    // _save()                    – gather values, persist, close
    // _validate()                – toggle _btnSave.disabled

    constructor() {
        super()
        this.attachShadow({ mode: 'open' })
    }

    connectedCallback() {
        const sheet = new CSSStyleSheet()
        sheet.replaceSync(sharedCss + (this._extraCss ?? ''))
        this.shadowRoot.adoptedStyleSheets = [sheet]
        this.shadowRoot.innerHTML = this._template

        this._dialog = this.shadowRoot.querySelector('dialog')
        this._title = this.shadowRoot.querySelector('h2')
        this._btnSave = this.shadowRoot.querySelector('#btn-save')

        this._dialog.addEventListener('click', e => {
            if (e.target === this._dialog) this._requestClose()
        })
        this._dialog.addEventListener('cancel', e => {
            e.preventDefault()
            this._requestClose()
        })
        this.shadowRoot.querySelector('#btn-cancel')
            .addEventListener('click', () => this._requestClose())
        this._btnSave.addEventListener('click', () => this._save())
        this.shadowRoot.addEventListener('keydown', e => this._onKeydown(e))

        this._setupListeners()

        this._unsub = store.subscribe(
            s => s.ui.dialog,
            d => {
                if (d && this._shouldOpen(d)) this._open(d)
                else if (this._dialog.open) this._close()
            }
        )
    }

    disconnectedCallback() { this._unsub?.() }

    // --- shared behaviour ---

    get _extraCss() { return '' }
    get _focusables() { return [] }
    _setupListeners() { }
    _shouldOpen() { return false }
    _open() { }
    _save() { }
    _validate() { }

    _close() { this._dialog.close() }

    _requestClose() { store.setState(['ui', 'dialog'], null) }

    _onKeydown(e) {
        if (e.altKey && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
            e.preventDefault()
            e.stopPropagation()
            this._moveFocus(e.key === 'ArrowDown' ? 1 : -1)
            return
        }

        if (e.key === 'Enter' && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) {
            e.preventDefault()
            const items = this._focusables
            const idx = items.indexOf(e.target)
            const next = items[idx + 1]
            if (!next || next === this._btnSave) {
                if (!this._btnSave.disabled) this._save()
            } else {
                this._moveFocus(1)
            }
        }
    }

    _moveFocus(dir) {
        const items = this._focusables
        const idx = items.indexOf(this.shadowRoot.activeElement)
        items[idx + dir]?.focus()
    }
}
