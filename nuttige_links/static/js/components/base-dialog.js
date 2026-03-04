import { store } from '../datastore.js'

const sharedCss = /*css*/`
:host { display: contents; }

dialog {
    border: 1px solid var(--bg-strong, #ccc);
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
    border: 1px solid var(--bg-strong, #ccc);
    border-radius: var(--control-border-radius, 4px);
    background: transparent;
    color: inherit;
    font: inherit;
}

input:focus {
    outline: 2px solid var(--fg-accent, highlight);
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
    border: 1px solid var(--bg-strong, #ccc);
    border-radius: var(--control-border-radius, 4px);
    background: transparent;
    color: inherit;
    font: inherit;
    cursor: pointer;
}

button:hover:not(:disabled) {
    background: var(--bg-muted, #f5f5f5);
}

button:focus-visible {
    outline: 2px solid var(--fg-accent, highlight);
    outline-offset: -1px;
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
        this._btnCancel = this.shadowRoot.querySelector('#btn-cancel')

        this._dialog.addEventListener('click', e => {
            if (e.target === this._dialog) this._requestClose()
        })
        this._dialog.addEventListener('cancel', e => {
            e.preventDefault()
            this._requestClose()
        })
        this._btnCancel.addEventListener('click', () => this._requestClose())
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

    _allowsArrowNav(el) {
        const tag = el.tagName
        return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'BUTTON'
    }

    _onKeydown(e) {
        // alt+arrows always navigate between fields
        if (e.altKey && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
            e.preventDefault()
            e.stopPropagation()
            this._moveFocus(e.key === 'ArrowDown' ? 1 : -1)
            return
        }

        // plain up/down for elements that don't use arrows internally
        if (!e.altKey && (e.key === 'ArrowDown' || e.key === 'ArrowUp')
            && this._allowsArrowNav(e.target)) {
            e.preventDefault()
            this._moveFocus(e.key === 'ArrowDown' ? 1 : -1)
            return
        }

        // left/right between action buttons
        if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight')
            && e.target.closest('.actions')) {
            e.preventDefault()
            this._moveActionButton(e.key === 'ArrowRight' ? 1 : -1, e.target)
            return
        }

        // Enter advances through fields / saves
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

    _getNavItems() {
        const items = [...this._focusables]
        const cancel = this._btnCancel

        if (cancel && !items.includes(cancel)) {
            const saveIdx = items.indexOf(this._btnSave)
            if (saveIdx === -1) items.push(cancel)
            else items.splice(saveIdx, 0, cancel)
        }

        return items.filter(el => !el.disabled && !el.hidden)
    }

    _moveFocus(dir) {
        const items = this._getNavItems()
        const idx = items.indexOf(this.shadowRoot.activeElement)
        items[idx + dir]?.focus()
    }

    _moveActionButton(dir, current) {
        const btns = [...this.shadowRoot.querySelectorAll('.actions button')]
            .filter(b => !b.hidden && !b.disabled)
        const idx = btns.indexOf(current)
        btns[idx + dir]?.focus()
    }
}
