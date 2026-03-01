class DataStore {
    constructor() {
        this.state = {
            sections: {
                records: {},
                drafts: {},
                pendingDeletes: new Set(),
                checkedIds: new Set(),
                errors: {},
                uiVisible: null,
                uiCollapsed: new Set(),
            },
            subsections: {
                records: {},
                drafts: {},
                pendingDeletes: new Set(),
                checkedIds: new Set(),
                errors: {},
                uiVisible: null,
                uiCollapsed: new Set(),
            },
            links: {
                records: {},
                drafts: {},
                pendingDeletes: new Set(),
                checkedIds: new Set(),
                selectedId: null,
                errors: {},
                uiVisible: null,
            },
            ui: {
                dialog: null,
                filterTerm: '',
                showBrokenOnly: false,
                linksOnly: false,
            },
        }
        this.listeners = new Set()
        this._batching = false
    }

    subscribe(selectorFn, callbackFn) {
        let lastValue = selectorFn(this.state)
        const listener = (state) => {
            const newValue = selectorFn(state)
            if (newValue !== lastValue) {
                callbackFn(newValue, lastValue, state)
                lastValue = newValue
            }
        }
        this.listeners.add(listener)
        return () => this.listeners.delete(listener)
    }

    setState(path, value) {
        this.state = this._setPath(this.state, path, value)
        if (!this._batching) this.listeners.forEach(fn => fn(this.state))
    }

    deleteState(path) {
        this.state = this._deletePath(this.state, path)
        if (!this._batching) this.listeners.forEach(fn => fn(this.state))
    }

    _setPath(obj, path, value) {
        if (path.length === 0) return value
        const [key, ...rest] = path
        return { ...obj, [key]: this._setPath(obj[key] ?? {}, rest, value) }
    }

    _deletePath(obj, path) {
        if (path.length === 0) return obj
        const [key, ...rest] = path
        if (rest.length === 0) {
            const { [key]: _, ...remaining } = obj
            return remaining
        }
        return { ...obj, [key]: this._deletePath(obj[key], rest) }
    }

    batch(fn) {
        const prev = this._batching
        this._batching = true
        try { fn() }
        finally {
            this._batching = prev
            if (!this._batching) this.listeners.forEach(l => l(this.state))
        }
    }
}

export const store = new DataStore()
