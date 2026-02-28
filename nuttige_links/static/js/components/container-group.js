import { store } from '../datastore.js'

export class ContainerGroup extends HTMLElement {
    table = null
    childTable = null

    get template() {
        return `
            <details open>
                <summary></summary>
                <div class="children"></div>
            </details>
        `
    }

    // State
    get recordId() {
        return this.getAttribute('record-id')
    }

    get record() {
        return store.state[this.table].records[this.recordId]
    }

    get collapsed() {
        return store.state[this.table].uiCollapsed.has(this.recordId)
    }

    // DOM
    get container() {
        return this.querySelector("details")
    }

    get header() {
        return this.querySelector("summary")
    }

    get childContainer() {
        return this.querySelector(".children")
    }

    // handlers
    handleToggle = (e) => {
        this.container.toggleAttribute("open", !e.detail.collapse)
    }

    // life-cycle
    connectedCallback() {
        this.innerHTML = this.template
        this.setAttribute('data-tree-item', '')
        this.setAttribute('data-tree-depth', '0')

        this.unsubs = [
            store.subscribe(
                s => s[this.table].records[this.recordId],
                () => this.renderHeader()
            ),
            store.subscribe(
                s => s[this.childTable].records,
                () => this.buildChildren()
            ),
            store.subscribe(
                s => s[this.table].uiVisible,
                (vis) => { this.hidden = vis ? !vis.has(this.recordId) : false }
            ),
        ]

        this.renderHeader()
        this.buildChildren()
        this.setupListeners()
    }

    disconnectedCallback() {
        this.unsubs?.forEach(fn => fn())
    }

    setupListeners() {
        document.addEventListener("toggle-collapse", this.handleToggle)
    }

    renderHeader() {
        if (!this.record) return
        this.header.textContent = this.record.name
    }

    buildChildren() {
        throw new Error('Subclass must implement buildChildren')
    }
}

