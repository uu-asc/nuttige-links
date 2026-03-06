const css = /*css*/`
:host {
    display: grid;
    grid-template-columns: 1fr auto;
}

:host *,
:host *::before,
:host *::after {
    box-sizing: border-box;
}

.search-container {
    display: grid;
    grid-template-columns: 1fr auto auto;
    gap: .125rem;
    align-items: center;
    padding-inline: .125rem;
    padding-block: .125rem;
    border: 1px solid var(--bg-strong);
    border-right: none;
    border-radius: 5px 0 0 5px;
    background-color: var(--bg-surface);
}

input[type="text"] {
    padding-block: .125rem;
    padding-inline: .5rem;
    border: none;
    border-radius: 4px;
    background-color: transparent;
    font-size: .875em;
    outline: none;
    min-width: 0;
    color: inherit;

    &:focus-within {
        outline: 2px solid var(--fg-accent);
    }
}

button {
    display: grid;
    place-items: center;
    padding-block: .25rem;
    font-family: monospace;
    font-size: .65em;
    user-select: none;
    cursor: pointer;
    border: none;
    border-radius: 2px;
    background-color: transparent;
    padding-inline: .5rem;
    color: inherit;

    &:hover {
        background-color: var(--bg-muted);
    }
    &:focus-visible {
        outline: 2px solid var(--fg-accent);
    }
    &:active, &.active {
        background-color: var(--bg-emphasis);
    }
}

button[data-command="clear"] {
    border-radius: 0 5px 5px 0;
    border: 1px solid var(--bg-strong);
    font-size: 1em;
    line-height: 1;
}
`

const template = /*html*/`
<div class="search-container">
    <input type="text" placeholder="Filter..." aria-label="filter">
    <button data-command="toggle-links-only" title="filter links only">[links]</button>
    <button data-command="toggle-broken-only" title="filter broken only">[broken]</button>
</div>
<button data-command="clear" title="clear filter (ctrl+delete)">&Cross;</button>
`

class FilterInput extends HTMLElement {
    static sheet = new CSSStyleSheet()
    static { this.sheet.replaceSync(css) }

    // state
    _linksOnly = false
    _brokenOnly = false

    get term() {
        return this.searchbox.value
    }

    get linksOnly() {
        return this._linksOnly
    }

    get brokenOnly() {
        return this._brokenOnly
    }

    get state() {
        return {
            term: this.term,
            linksOnly: this._linksOnly,
            brokenOnly: this._brokenOnly,
        }
    }

    // DOM
    get searchbox() {
        return this.shadowRoot.querySelector("input[type=text]")
    }

    get focusableItems() {
        return [...this.shadowRoot.querySelectorAll('input[type="text"], button')]
    }

    // handlers
    handleInput = (e) => {
        if (e.target !== this.searchbox) return
        clearTimeout(this._debounce)
        this._debounce = setTimeout(() => this.dispatchFilterChange(), 100)
    }

    handleClick = (e) => {
        const btn = e.target.closest("button")
        if (!btn) return

        if (btn.dataset.command === "toggle-links-only") {
            this._linksOnly = !this._linksOnly
            btn.classList.toggle("active", this._linksOnly)
            this.dispatchFilterChange()
        }
        if (btn.dataset.command === "toggle-broken-only") {
            this._brokenOnly = !this._brokenOnly
            btn.classList.toggle("active", this._brokenOnly)
            this.dispatchFilterChange()
        }
        if (btn.dataset.command === "clear") {
            this.clearText()
        }
    }

    handleKeyDown = (e) => {
        if (e.target === this.searchbox && !this.isNavKey(e)) {
            if (e.key === "Escape") {
                this.clearText()
                e.preventDefault()
                e.stopPropagation()
            }
            if (e.ctrlKey && e.key === "Delete") {
                this.resetAll()
                e.preventDefault()
                e.stopPropagation()
            }
            return
        }

        switch (true) {
            case e.key === "Escape":
                this.clearText()
                break
            case e.ctrlKey && e.key === "Delete":
                this.resetAll()
                break
            case e.key === "Enter":
                e.target.closest("button")?.click()
                break
            case e.altKey && e.key === "ArrowLeft":
            case e.altKey && e.key === "ArrowRight":
                this.moveFocus(e.key === "ArrowRight" ? 1 : -1)
                break
            case e.key === "ArrowLeft":
            case e.key === "ArrowRight":
                if (!this.shouldAllowNavigation(e)) return
                this.moveFocus(e.key === "ArrowRight" ? 1 : -1)
                break
            default:
                return
        }

        e.preventDefault()
        e.stopPropagation()
    }

    // lifecycle
    constructor() {
        super()
        this.attachShadow({ mode: "open" })
    }

    connectedCallback() {
        this.shadowRoot.adoptedStyleSheets = [this.constructor.sheet]
        this.shadowRoot.innerHTML = template
        this.shadowRoot.addEventListener("keydown", this.handleKeyDown)
        this.shadowRoot.addEventListener("click", this.handleClick)
        this.shadowRoot.addEventListener("input", this.handleInput)
    }

    disconnectedCallback() {
        this.shadowRoot.removeEventListener("keydown", this.handleKeyDown)
        this.shadowRoot.removeEventListener("click", this.handleClick)
        this.shadowRoot.removeEventListener("input", this.handleInput)
    }

    // helpers
    dispatchFilterChange() {
        this.dispatchEvent(new CustomEvent("filter-change", {
            detail: this.state,
            bubbles: true,
            composed: true,
        }))
    }

    clearText() {
        if (this.searchbox.value === "") return
        this.searchbox.value = ""
        clearTimeout(this._debounce)
        this.searchbox.focus()
        this.dispatchFilterChange()
    }

    resetAll() {
        this.searchbox.value = ""
        this._linksOnly = false
        this._brokenOnly = false
        clearTimeout(this._debounce)
        this.shadowRoot.querySelectorAll("button.active")
            .forEach(btn => btn.classList.remove("active"))
        this.searchbox.focus()
        this.dispatchFilterChange()
    }

    focus() {
        this.searchbox.focus()
    }

    isNavKey(e) {
        if (e.altKey && ["ArrowLeft", "ArrowRight"].includes(e.key)) return true
        if (["ArrowLeft", "ArrowRight"].includes(e.key) && this.shouldAllowNavigation(e)) return true
        if (e.ctrlKey && e.key === "Delete") return true
        return false
    }

    shouldAllowNavigation(e) {
        if (e.target !== this.searchbox) return true
        if (this.searchbox.value === "") return true
        const atStart = this.searchbox.selectionStart === 0
        const atEnd = this.searchbox.selectionStart === this.searchbox.value.length
        return (e.key === "ArrowLeft" && atStart) || (e.key === "ArrowRight" && atEnd)
    }

    moveFocus(direction) {
        const items = this.focusableItems
        const idx = items.indexOf(this.shadowRoot.activeElement)
        const next = items[idx + direction]
        if (next) {
            next.focus()
        } else {
            this.dispatchEvent(new CustomEvent('nav-overflow', {
                detail: { direction },
                bubbles: true, composed: true,
            }))
        }
    }
}

customElements.define("filter-input", FilterInput)
