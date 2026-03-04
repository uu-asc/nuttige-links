const css = /*css*/`
:host {
    display: block;
    width: 100%;
}

:host *,
:host *::before,
:host *::after {
    box-sizing: border-box;
}

:host([disabled]) {
    pointer-events: none;
    opacity: 0.5;
    cursor: default;
    user-select: none;
}

.trigger {
    display: grid;
    grid-template-columns: 1fr auto auto;
    border: 1px solid var(--bg-strong, #ccc);
    border-radius: var(--control-border-radius, 4px);
    overflow: hidden;
    anchor-name: --combobox-trigger;
}

.trigger:focus-within {
    outline: 2px solid var(--fg-accent, highlight);
    outline-offset: -1px;
}

.trigger.open {
    border-bottom-left-radius: 0;
    border-bottom-right-radius: 0;
}

.trigger.creating {
    border-color: oklch(0.7 0.15 145);
}

input {
    border: none;
    background: transparent;
    color: inherit;
    font: inherit;
    padding: .25rem .5rem;
    min-width: 0;
    outline: none;
}

.new-badge {
    display: none;
    align-self: center;
    font-size: .65em;
    padding: .1rem .35rem;
    border-radius: 3px;
    background: oklch(0.7 0.15 145);
    color: white;
    user-select: none;
}

.trigger.creating .new-badge {
    display: block;
}

.chevron {
    display: grid;
    place-items: center;
    padding-inline: .375rem;
    cursor: pointer;
    background: var(--bg-muted, #f5f5f5);
    border: none;
    border-left: 1px solid var(--bg-strong, #ccc);
    color: inherit;
    font-size: .75em;
    user-select: none;
}

.chevron:hover {
    background: var(--bg-emphasis, #eee);
}

#dropdown {
    position-anchor: --combobox-trigger;
    width: anchor-size(width);
    margin: 0;
    top: anchor(bottom);
    left: anchor(left);
    max-height: 200px;
    overflow-y: auto;
    border: 1px solid var(--bg-strong, #ccc);
    border-top: none;
    border-radius: 0 0 var(--control-border-radius, 4px) var(--control-border-radius, 4px);
    background: var(--bg-surface, #fff);
    color: inherit;
    padding: 0;

    position-try-fallbacks: --flip-above;
}

@position-try --flip-above {
    top: auto;
    bottom: anchor(top);
    border-top: 1px solid var(--bg-strong, #ccc);
    border-bottom: none;
    border-radius: var(--control-border-radius, 4px) var(--control-border-radius, 4px) 0 0;
}

.option {
    cursor: pointer;
    padding: .25rem .5rem;
}

.option:hover,
.option:focus {
    background: var(--bg-muted, #f5f5f5);
    outline: none;
}

.option[aria-selected="true"] {
    background: var(--bg-emphasis, #eee);
}

.option.hidden {
    display: none;
}

.option-create {
    font-style: italic;
    opacity: 0.8;
}

.no-match {
    padding: .25rem .5rem;
    font-style: italic;
    opacity: 0.5;
    user-select: none;
}

.no-match.hidden {
    display: none;
}

mark {
    background: oklch(0.85 0.12 85);
    color: inherit;
    border-radius: 1px;
}
`

export class Combobox extends HTMLElement {
    static get observedAttributes() { return ['disabled'] }

    get template() {
        return `
            <div class="trigger">
                <input type="text" autocomplete="off" />
                <span class="new-badge">new</span>
                <button class="chevron" tabindex="-1">▾</button>
            </div>
            <div id="dropdown" popover="manual"></div>
        `
    }

    // state
    _options = []
    _value = null           // { id, isNew: false } | { name, isNew: true } | null
    _dropdownFilter = ''    // filter local to browsing the dropdown

    get disabled() { return this.hasAttribute('disabled') }
    set disabled(val) {
        val ? this.setAttribute('disabled', '') : this.removeAttribute('disabled')
    }

    get options() { return this._options }
    set options(list) {
        this._options = list ?? []
        if (this.isConnected) this.rebuildOptions()
    }

    get value() { return this._value }
    set value(v) {
        this._value = v
        this.syncInputDisplay()
        this.syncCreatingState()
        this.updateSelectedState()
    }

    get selectedId() { return this._value?.isNew === false ? this._value.id : null }
    set selectedId(id) {
        if (!id) { this.value = null; return }
        const opt = this._options.find(o => o.id === id)
        if (opt) this.value = Combobox.existing(opt.id)
    }

    get hasExactMatch() {
        const text = this.input?.value.trim().toLowerCase() ?? ''
        if (!text) return true
        return this._options.some(o => o.name.toLowerCase() === text)
    }

    get isCreating() {
        const text = this.input?.value.trim() ?? ''
        if (!text) return false
        return !this.hasExactMatch
    }

    get isOpen() { return this._open }

    // DOM
    get input() { return this.shadowRoot.querySelector('input') }
    get triggerEl() { return this.shadowRoot.querySelector('.trigger') }
    get chevron() { return this.shadowRoot.querySelector('.chevron') }
    get dropdown() { return this.shadowRoot.querySelector('#dropdown') }

    // handlers
    handleInput = () => {
        this.syncCreatingState()
        if (!this.isOpen) this.open()
        // input typing filters dropdown as a preview
        this.applyFilter(this.input.value.trim().toLowerCase(), { allowCreate: true })
    }

    handleChevronMousedown = (e) => {
        e.preventDefault()
        if (this.isOpen) {
            this.close()
        } else {
            this.open()
        }
    }

    handleInputKeydown = (e) => {
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault()
                if (!this.isOpen) this.open()
                this.focusFirstVisibleOption()
                break
            case 'ArrowUp':
                e.preventDefault()
                if (this.isOpen) this.focusLastVisibleOption()
                break
            case 'Escape':
                if (this.isOpen) {
                    e.preventDefault()
                    e.stopPropagation()
                    this.close()
                }
                break
            case 'Enter':
                e.preventDefault()
                if (this.isOpen) {
                    const sel = this.dropdown.querySelector('.option:not(.hidden)[aria-selected="true"]')
                        ?? this.dropdown.querySelector('.option:not(.hidden)')
                    if (sel) this.selectOption(sel)
                }
                break
        }
    }

    handleDropdownKeydown = (e) => {
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault()
                this.focusNextVisible(e.target)
                break
            case 'ArrowUp':
                e.preventDefault()
                this.focusPrevVisible(e.target)
                break
            case 'Enter':
                e.preventDefault()
                this.selectOption(e.target)
                break
            case 'Escape':
                e.preventDefault()
                e.stopPropagation()
                this.close()
                this.input.focus()
                break
            case 'Backspace':
                e.preventDefault()
                this.applyTypeAhead(this._dropdownFilter.slice(0, -1))
                break
            default:
                if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
                    e.preventDefault()
                    this.applyTypeAhead(this._dropdownFilter + e.key)
                }
                break
        }
    }

    handleDropdownClick = (e) => {
        const opt = e.target.closest('.option')
        if (opt) this.selectOption(opt)
    }

    handleFocusOut = (e) => {
        if (!this.shadowRoot.contains(e.relatedTarget)) {
            this.close()
            this.commitInputText()
        }
    }

    // life-cycle
    constructor() {
        super()
        this.attachShadow({ mode: 'open' })
        this._open = false
    }

    connectedCallback() {
        const sheet = new CSSStyleSheet()
        sheet.replaceSync(css)
        this.shadowRoot.adoptedStyleSheets = [sheet]
        this.shadowRoot.innerHTML = this.template

        this.input.addEventListener('input', this.handleInput)
        this.input.addEventListener('keydown', this.handleInputKeydown)
        this.chevron.addEventListener('mousedown', this.handleChevronMousedown)
        this.dropdown.addEventListener('keydown', this.handleDropdownKeydown)
        this.dropdown.addEventListener('click', this.handleDropdownClick)
        this.shadowRoot.addEventListener('focusout', this.handleFocusOut)

        this.rebuildOptions()
        this.syncInputDisplay()
        this.syncCreatingState()

        if (this.hasAttribute('disabled')) {
            this.input.toggleAttribute('disabled', true)
            this.triggerEl.toggleAttribute('disabled', true)
        }
    }

    attributeChangedCallback(name, _, val) {
        if (name === 'disabled') {
            const off = val !== null
            this.input?.toggleAttribute('disabled', off)
            this.triggerEl?.toggleAttribute('disabled', off)
            if (off) this.close()
        }
    }

    // open / close
    open() {
        if (this._open || this.disabled) return
        this._open = true
        this.dropdown.showPopover()
        this.triggerEl.classList.add('open')
        this.chevron.textContent = '▴'
        this.clearDropdownFilter()

        // scroll current selection into view
        requestAnimationFrame(() => {
            const sel = this.dropdown.querySelector('.option[aria-selected="true"]:not(.hidden)')
            sel?.scrollIntoView({ block: 'nearest' })
        })
    }

    close() {
        if (!this._open) return
        this._open = false
        this.dropdown.hidePopover()
        this.triggerEl.classList.remove('open')
        this.chevron.textContent = '▾'
        this.clearDropdownFilter()
    }

    // option selection
    selectOption(el) {
        const id = el.dataset.id
        const createName = el.dataset.createName

        if (createName) this.value = Combobox.newEntry(createName)
        else if (id) this.value = Combobox.existing(id)
        else this.value = null

        this.updateSelectedState()
        this.close()
        this.input.focus()
        this.emitChange()
    }

    commitInputText() {
        const text = this.input.value.trim()
        if (!text) {
            if (this._value) {
                this._value = null
                this.syncCreatingState()
                this.emitChange()
            }
            return
        }

        const exact = this._options.find(o => o.name.toLowerCase() === text.toLowerCase())
        if (exact) {
            this.value = Combobox.existing(exact.id)
        } else {
            if (!this._value?.isNew || this._value?.name !== text) {
                this._value = { name: text, isNew: true }
                this.syncCreatingState()
                this.emitChange()
            }
        }
    }

    emitChange() {
        this.dispatchEvent(new CustomEvent('combobox-change', {
            bubbles: true,
            detail: this._value,
        }))
    }

    // filtering

    applyFilter(term, { allowCreate = false } = {}) {
        const anyVisible = this.updateOptionVisibility(term)
        const createVisible = this.updateCreateOption(term, allowCreate)
        this.updateNoMatch(term, anyVisible, createVisible)
    }

    updateOptionVisibility(term) {
        let anyVisible = false
        for (const el of this.dropdown.querySelectorAll('.option:not(.option-create)')) {
            const name = el.dataset.name ?? ''
            if (!term) {
                el.classList.remove('hidden')
                el.innerHTML = esc(name)
                anyVisible = true
                continue
            }
            const idx = name.toLowerCase().indexOf(term)
            if (idx === -1) {
                el.classList.add('hidden')
            } else {
                el.classList.remove('hidden')
                const before = name.slice(0, idx)
                const match = name.slice(idx, idx + term.length)
                const after = name.slice(idx + term.length)
                el.innerHTML = `${esc(before)}<mark>${esc(match)}</mark>${esc(after)}`
                anyVisible = true
            }
        }
        return anyVisible
    }

    updateCreateOption(term, allowCreate) {
        const createEl = this.dropdown.querySelector('.option-create')
        if (!createEl) return false
        const show = allowCreate && !!term && !this._options.some(o => o.name.toLowerCase() === term)
        createEl.classList.toggle('hidden', !show)
        if (show) { createEl.dataset.createName = term; createEl.textContent = `Create: ${term}` }
        return show
    }

    updateNoMatch(term, anyVisible, createVisible) {
        const noMatch = this.dropdown.querySelector('.no-match')
        if (!noMatch) return
        const show = !!term && !anyVisible && !createVisible
        noMatch.classList.toggle('hidden', !show)
        if (show) noMatch.textContent = `No match: ${term}`
    }

    clearDropdownFilter() {
        this._dropdownFilter = ''
        this.applyFilter('', { allowCreate: false })
    }

    // render
    syncInputDisplay() {
        if (!this.input) return
        if (!this._value) {
            this.input.value = ''
            return
        }
        if (this._value.isNew) {
            this.input.value = this._value.name
        } else {
            const opt = this._options.find(o => o.id === this._value.id)
            this.input.value = opt?.name ?? ''
        }
    }

    syncCreatingState() {
        this.triggerEl?.classList.toggle('creating', this.isCreating)
    }

    rebuildOptions() {
        if (!this.dropdown) return
        const currentId = this._value?.isNew === false ? this._value.id : null
        const fragment = document.createDocumentFragment()

        for (const opt of this._options) {
            const el = document.createElement('div')
            el.className = 'option'
            el.setAttribute('tabindex', '-1')
            el.dataset.id = opt.id
            el.dataset.name = opt.name
            el.textContent = opt.name
            if (opt.id === currentId) el.setAttribute('aria-selected', 'true')
            fragment.appendChild(el)
        }

        // create placeholder (hidden by default)
        const createEl = document.createElement('div')
        createEl.className = 'option option-create hidden'
        createEl.setAttribute('tabindex', '-1')
        fragment.appendChild(createEl)

        // no-match indicator (hidden by default)
        const noMatchEl = document.createElement('div')
        noMatchEl.className = 'no-match hidden'
        noMatchEl.setAttribute('tabindex', '-1')
        fragment.appendChild(noMatchEl)

        this.dropdown.replaceChildren(fragment)
    }

    updateSelectedState() {
        if (!this.dropdown) return
        const currentId = this._value?.isNew === false ? this._value.id : null
        for (const el of this.dropdown.querySelectorAll('.option')) {
            el.toggleAttribute('aria-selected',
                el.dataset.id ? el.dataset.id === currentId : false
            )
        }
    }

    // helpers
    static existing(id) { return { id, isNew: false } }
    static newEntry(name) { return { name, isNew: true } }

    applyTypeAhead(filter) {
        this._dropdownFilter = filter
        this.applyFilter(filter.toLowerCase(), { allowCreate: false })
        this.focusFirstAfterFilter()
    }

    // focus helpers
    focusFirstVisibleOption() {
        this.dropdown.querySelector('.option:not(.hidden)')?.focus()
    }

    focusLastVisibleOption() {
        const opts = this.dropdown.querySelectorAll('.option:not(.hidden)')
        opts[opts.length - 1]?.focus()
    }

    focusNextVisible(current) {
        let el = current.nextElementSibling
        while (el && el.classList.contains('hidden')) el = el.nextElementSibling
        el?.focus()
    }

    focusPrevVisible(current) {
        let el = current.previousElementSibling
        while (el && el.classList.contains('hidden')) el = el.previousElementSibling
        if (el) el.focus()
        else this.input.focus()
    }

    focusFirstAfterFilter() {
        if (!this.dropdown.contains(this.shadowRoot.activeElement)) return
        const first = this.dropdown.querySelector('.option:not(.hidden):not(.option-create)')
        if (first) first.focus()
        else this.dropdown.querySelector('.no-match:not(.hidden)')?.focus()
    }

    focus() {
        this.input?.focus()
    }
}

function esc(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

customElements.define('combo-box', Combobox)
