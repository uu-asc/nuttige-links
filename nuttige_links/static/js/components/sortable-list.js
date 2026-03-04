const css = /*css*/`
:host {
    display: block;
}

:host *,
:host *::before,
:host *::after {
    box-sizing: border-box;
}

.list {
    display: grid;
    gap: 2px;
}

.sortable-item {
    display: grid;
    grid-template-columns: auto 1fr;
    align-items: center;
    gap: 0.5rem;
    padding: 0.35rem 0.5rem;
    border-radius: 4px;
    border: 2px solid transparent;
    background: var(--bg-muted, #f5f5f5);
    cursor: grab;
    user-select: none;
}

.sortable-item:focus-visible {
    outline: 2px solid var(--fg-accent, highlight);
    outline-offset: -1px;
}

.sortable-item.dragging {
    opacity: 0.3;
}

.sortable-item.insert-before {
    border-top-color: var(--fg-accent, highlight);
}

.sortable-item.insert-after {
    border-bottom-color: var(--fg-accent, highlight);
}

.handle {
    font-size: 1rem;
    line-height: 1;
    opacity: 0.5;
}

.label {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.empty {
    padding: 0.5rem;
    font-style: italic;
    opacity: 0.5;
}
`

export class SortableList extends HTMLElement {
    _items = []
    _dragItem = null
    _insertTarget = null
    _insertPosition = null

    get items() { return this._items }
    set items(list) {
        this._items = [...(list ?? [])]
        this._render()
    }

    get orderedIds() {
        return this._items.map(item => item.id)
    }

    constructor() {
        super()
        this.attachShadow({ mode: 'open' })
    }

    connectedCallback() {
        const sheet = new CSSStyleSheet()
        sheet.replaceSync(css)
        this.shadowRoot.adoptedStyleSheets = [sheet]
        this.shadowRoot.innerHTML = '<div class="list"></div>'
        this._list = this.shadowRoot.querySelector('.list')

        this._list.addEventListener('dragstart', this._onDragStart)
        this._list.addEventListener('dragover', this._onDragOver)
        this._list.addEventListener('dragleave', this._onDragLeave)
        this._list.addEventListener('drop', this._onDrop)
        this._list.addEventListener('dragend', this._onDragEnd)
        this._list.addEventListener('keydown', this._onKeydown)

        this._render()
    }

    // --- rendering ---

    _render() {
        if (!this._list) return

        if (!this._items.length) {
            this._list.innerHTML = '<div class="empty">No items</div>'
            return
        }

        const fragment = document.createDocumentFragment()
        for (const item of this._items) {
            const el = document.createElement('div')
            el.className = 'sortable-item'
            el.draggable = true
            el.dataset.id = item.id
            el.setAttribute('tabindex', '0')
            el.innerHTML = `<span class="handle">≡</span><span class="label">${esc(item.label)}</span>`
            fragment.appendChild(el)
        }
        this._list.replaceChildren(fragment)
    }

    // --- drag handlers ---

    _onDragStart = (e) => {
        const item = e.target.closest('.sortable-item')
        if (!item) return
        this._dragItem = item
        item.classList.add('dragging')
        e.dataTransfer.effectAllowed = 'move'
    }

    _onDragOver = (e) => {
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'

        const target = e.target.closest('.sortable-item')
        if (!target || target === this._dragItem) {
            this._clearInsertIndicator()
            return
        }

        const rect = target.getBoundingClientRect()
        const midpoint = rect.top + rect.height / 2
        const position = e.clientY < midpoint ? 'before' : 'after'

        if (target !== this._insertTarget || position !== this._insertPosition) {
            this._clearInsertIndicator()
            this._insertTarget = target
            this._insertPosition = position
            target.classList.add(position === 'before' ? 'insert-before' : 'insert-after')
        }
    }

    _onDragLeave = (e) => {
        if (!this._list.contains(e.relatedTarget)) {
            this._clearInsertIndicator()
        }
    }

    _onDrop = (e) => {
        e.preventDefault()
        if (!this._dragItem || !this._insertTarget) return

        const fromId = this._dragItem.dataset.id
        const toId = this._insertTarget.dataset.id
        const position = this._insertPosition

        this._applyMove(fromId, toId, position)
    }

    _onDragEnd = () => {
        this._dragItem?.classList.remove('dragging')
        this._clearInsertIndicator()
        this._dragItem = null
    }

    _clearInsertIndicator() {
        this._insertTarget?.classList.remove('insert-before', 'insert-after')
        this._insertTarget = null
        this._insertPosition = null
    }

    // --- keyboard handlers ---

    _onKeydown = (e) => {
        const item = e.target.closest('.sortable-item')
        if (!item) return

        switch (true) {
            case e.altKey && e.key === 'ArrowUp':
                e.preventDefault()
                this._moveByKeyboard(item, -1)
                break
            case e.altKey && e.key === 'ArrowDown':
                e.preventDefault()
                this._moveByKeyboard(item, 1)
                break
            case e.key === 'ArrowUp':
                e.preventDefault()
                item.previousElementSibling?.focus()
                break
            case e.key === 'ArrowDown':
                e.preventDefault()
                item.nextElementSibling?.focus()
                break
        }
    }

    _moveByKeyboard(el, direction) {
        const id = el.dataset.id
        const idx = this._items.findIndex(i => i.id === id)
        const targetIdx = idx + direction

        if (targetIdx < 0 || targetIdx >= this._items.length) return

        const targetId = this._items[targetIdx].id
        const position = direction < 0 ? 'before' : 'after'

        this._applyMove(id, targetId, position)

        // re-focus moved item
        requestAnimationFrame(() => {
            this._list.querySelector(`[data-id="${id}"]`)?.focus()
        })
    }

    // --- shared logic ---

    _applyMove(fromId, toId, position) {
        if (fromId === toId) return

        const fromIdx = this._items.findIndex(i => i.id === fromId)
        const [moved] = this._items.splice(fromIdx, 1)

        let toIdx = this._items.findIndex(i => i.id === toId)
        if (position === 'after') toIdx += 1

        this._items.splice(toIdx, 0, moved)
        this._render()
        this._emitReorder()
    }

    _emitReorder() {
        this.dispatchEvent(new CustomEvent('reorder', {
            bubbles: true,
            detail: { orderedIds: this.orderedIds },
        }))
    }
}

function esc(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

customElements.define('sortable-list', SortableList)
