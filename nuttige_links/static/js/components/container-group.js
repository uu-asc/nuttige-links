import { store } from '../datastore.js'

export class ContainerGroup extends HTMLElement {
    table = null
    childTable = null

    get template() {
        return `
        <details open>
            <summary>
                <span class="name"></span>
                <tree-actions></tree-actions>
            </summary>
            <div class="children">
                <button class="add-item" data-action="add-link">+ Add link</button>
            </div>
        </details>
    `
    }

    // state
    get recordId() {
        return this.getAttribute('record-id')
    }

    get record() {
        return store.state[this.table].drafts[this.recordId]
            ?? store.state[this.table].records[this.recordId]
    }

    get collapsed() {
        return store.state[this.table].uiCollapsed.has(this.recordId)
    }

    getAddDefaults() {
        return {}
    }

    syncDirtyState() {
        const { records, drafts, pendingDeletes } = store.state[this.table]
        const id = this.recordId
        this.toggleAttribute('data-dirty', id in drafts && id in records)
        this.toggleAttribute('data-new', id in drafts && !(id in records))
        this.toggleAttribute('data-pending-delete', pendingDeletes.has(id))
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
        e.preventDefault()
        const collapsed = store.state[this.table].uiCollapsed
        const next = new Set(collapsed)
        next.has(this.recordId) ? next.delete(this.recordId) : next.add(this.recordId)
        store.setState([this.table, 'uiCollapsed'], next)
    }

    // life-cycle
    connectedCallback() {
        this.dataset.table = this.table
        this.dataset.treeItem = ''
        this.dataset.treeDepth = '0'
        this.innerHTML = this.template

        this.unsubs = [
            store.subscribe(
                s => s[this.table].drafts[this.recordId] ?? s[this.table].records[this.recordId],
                () => this.renderHeader()
            ),
            store.subscribe(
                s => [s[this.childTable].records, s[this.childTable].drafts],
                () => {
                    this.buildChildren()
                    this.toggleAttribute('data-empty', this.childContainer.children.length === 0)
                }
            ),
            store.subscribe(
                s => s[this.table].uiCollapsed.has(this.recordId),
                (isCollapsed) => {
                    this.container.toggleAttribute('open', !isCollapsed)
                }
            ),
            store.subscribe(
                s => s[this.table].uiVisible,
                (vis) => {
                    const isDraft = this.recordId in store.state[this.table].drafts
                    const isRecord = this.recordId in store.state[this.table].records
                    const isDraftOnly = isDraft && !isRecord
                    this.hidden = isDraftOnly ? false : (vis ? !vis.has(this.recordId) : false)
                },
            ),
            store.subscribe(
                s => s[this.table].drafts[this.recordId],
                () => this.syncDirtyState()
            ),
            store.subscribe(
                s => s[this.table].pendingDeletes,
                () => this.syncDirtyState()
            ),
        ]

        this.syncDirtyState()
        this.renderHeader()
        this.buildChildren()
        this.setupListeners()
    }

    disconnectedCallback() {
        this.unsubs?.forEach(fn => fn())
    }

    setupListeners() {
        this.header.addEventListener('click', (e) => {
            if (e.target.closest('tree-actions')) return
            this.handleToggle(e)
        })

        this.querySelector('.add-item').addEventListener('click', () => {
            store.setState(['ui', 'dialog'], {
                mode: 'add',
                table: 'links',
                defaults: this.getAddDefaults(),
            })
        })
    }

    // render
    renderHeader() {
        if (!this.record) return
        this.header.querySelector('.name').textContent = this.record.name
    }

    buildChildren() {
        throw new Error('Subclass must implement buildChildren')
    }
}

