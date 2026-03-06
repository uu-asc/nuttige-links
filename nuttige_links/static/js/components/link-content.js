import { copyRichLink } from '../behaviors/clipboard.js'
import { store } from '../datastore.js'

class LinkContent extends HTMLElement {
    static observedAttributes = ['show-status']

    constructor() {
        super()
        this.attachShadow({ mode: 'open' })
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: contents;
                }
                .anchor {
                    display: flex;
                    align-items: center;
                    gap: .25rem;
                    overflow: hidden;
                    min-width: 0;
                    anchor-name: --link;
                }
                .status-icon {
                    flex-shrink: 0;
                    width: 1rem;
                    text-align: center;
                    font-size: .7rem;
                    line-height: 1;
                    display: none;
                }
                :host([show-status]) .status-icon {
                    display: inline-block;
                }
                .status-icon[data-status="ok"]::after      { content: '✓'; color: oklch(0.6 0.24 145); }
                .status-icon[data-status="broken"]::after   { content: '✗'; color: oklch(0.6 0.28 25); }
                .status-icon[data-status="timeout"]::after  { content: '?'; color: oklch(0.72 0.2 85); }
                a {
                    cursor: inherit;
                    color: var(--fg-accent);
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }
                .link-popover {
                    position: fixed;
                    position-anchor: --link;
                    position-area: bottom; 
                    margin-block: .5rem 0;
                    position-try-fallbacks: --top;

                    width: anchor-size(width);
                    border: 1px solid var(--bg-strong);
                    border-radius: 4px;
                    padding: .5rem .75rem;
                    background: var(--bg);
                    color: var(--fg);
                    font-size: .8rem;
                }
                .link-popover:popover-open {
                    display: grid;
                }
                @position-try --top {
                    position-area: top;
                    margin-block: 0 .25rem;
                }
                .link-popover .title {
                    font-weight: 600;
                    margin-bottom: .125rem;
                }
                .link-popover .url {
                    opacity: 0.7;
                    color: var(--fg-accent);
                    word-break: break-all;
                }
                .link-popover .desc {
                    margin-top: .25rem;
                }
                .link-popover .meta {
                    margin-top: .25rem;
                    display: flex;
                    justify-content: space-between;
                    opacity: 0.5;
                    font-size: .6125rem;
                }
            </style>
            <span class="anchor">
                <span class="status-icon"></span>
                <a target="_blank" rel="noopener"></a>
            </span>
            <span class="link-popover" popover="manual">
                <span class="title" hidden></span>
                <span class="url"></span>
                <span class="desc" hidden></span>
                <span class="meta" hidden>
                    <span class="status"></span>
                    <span class="updated"></span>
                </span>
            </span>
        `
        this._icon = this.shadowRoot.querySelector('.status-icon')
        this._anchor = this.shadowRoot.querySelector('a')
        this._popover = this.shadowRoot.querySelector('.link-popover')
        this._popoverTitle = this._popover.querySelector('.title')
        this._popoverUrl = this._popover.querySelector('.url')
        this._popoverDesc = this._popover.querySelector('.desc')
        this._popoverMeta = this._popover.querySelector('.meta')
        this._popoverStatus = this._popoverMeta.querySelector('.status')
        this._popoverUpdated = this._popoverMeta.querySelector('.updated')

        this.addEventListener('mouseenter', () => this._showPopover())
        this.addEventListener('mouseleave', () => this._hidePopover())
        this._anchor.addEventListener('click', (e) => {
            if (!this._anchor.href) return
            if (!(e.ctrlKey || e.metaKey)) return
            e.preventDefault()
            e.stopPropagation()
            const record = this._getRecord()
            if (record) copyRichLink(record)
        })
        this._onParentFocusin = () => this._showPopover()
        this._onParentFocusout = () => this._hidePopover()
    }

    connectedCallback() {
        this._parentItem = this.closest('link-item')
        this._parentItem?.addEventListener('focusin', this._onParentFocusin)
        this._parentItem?.addEventListener('focusout', this._onParentFocusout)
    }

    disconnectedCallback() {
        this._parentItem?.removeEventListener('focusin', this._onParentFocusin)
        this._parentItem?.removeEventListener('focusout', this._onParentFocusout)
        this._parentItem = null
    }

    set url(v) {
        this._anchor.href = v ?? ''
        this._popoverUrl.textContent = v ?? ''
    }

    set text(v) {
        this._anchor.textContent = v ?? ''
        this._popoverTitle.textContent = v ?? ''
        this._popoverTitle.hidden = !v
    }

    set description(v) {
        this._popoverDesc.textContent = v ?? ''
        this._popoverDesc.hidden = !v
    }

    set updatedAt(v) {
        this._updatedAt = v ?? null
        this._popoverUpdated.textContent = v
            ? `Updated: ${new Date(v).toLocaleDateString()}`
            : ''
        this._syncMeta()
    }

    set status(v) {
        // icon in main view
        if (v === null || v === undefined) {
            delete this._icon.dataset.status
        } else if (v >= 200 && v < 400) {
            this._icon.dataset.status = 'ok'
        } else if (v === 408) {
            this._icon.dataset.status = 'timeout'
        } else {
            this._icon.dataset.status = 'broken'
        }

        // text in popover
        this._statusCode = v ?? null
        this._popoverStatus.textContent = v != null ? `Status: ${v}` : ''
        this._syncMeta()
    }

    _syncMeta() {
        this._popoverMeta.hidden = this._statusCode == null && !this._updatedAt
    }

    _showPopover() {
        if (!this._anchor.href) return
        this._popover.showPopover()
    }

    _hidePopover() {
        this._popover.hidePopover()
    }

    _getRecord() {
        const item = this.closest('link-item')
        if (!item) return null
        const id = item.recordId
        return store.state.links.drafts[id] ?? store.state.links.records[id]
    }
}

customElements.define('link-content', LinkContent)
