class LinkContent extends HTMLElement {
    static observedAttributes = ['show-status']

    constructor() {
        super()
        this.attachShadow({ mode: 'open' })
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: flex;
                    align-items: center;
                    gap: .25rem;
                    overflow: hidden;
                    min-width: 0;
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
                    color: var(--fg-accent);
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }
                .desc-trigger {
                    flex-shrink: 0;
                    background: none;
                    border: none;
                    cursor: pointer;
                    font-size: .75rem;
                    opacity: 0.5;
                    padding: 0 .125rem;
                    color: inherit;
                    anchor-name: --desc;
                }
                .desc-trigger:hover { opacity: 1; }
                .link-popover {
                    position: fixed;
                    position-anchor: --desc;
                    position-area: bottom span-right;
                    margin: 0;
                    width: max-content;
                    max-width: 20rem;
                    padding: .5rem .75rem;
                    border: 1px solid var(--bg-strong);
                    border-radius: 5px;
                    background: var(--bg);
                    color: var(--fg);
                    font-size: .8rem;
                }
            </style>
            <span class="status-icon"></span>
            <a target="_blank" rel="noopener"></a>
        `
        this._icon = this.shadowRoot.querySelector('.status-icon')
        this._anchor = this.shadowRoot.querySelector('a')
        this._trigger = null
        this._popover = null
    }

    set url(v) { this._anchor.href = v ?? '' }
    set text(v) { this._anchor.textContent = v ?? '' }

    set description(v) {
        if (v) {
            if (!this._trigger) {
                this._trigger = document.createElement('button')
                this._trigger.className = 'desc-trigger'
                this._trigger.textContent = 'ⓘ'

                this._popover = document.createElement('span')
                this._popover.popover = 'auto'
                this._popover.className = 'link-popover'
                this._trigger.popoverTargetElement = this._popover

                this.shadowRoot.appendChild(this._trigger)
                this.shadowRoot.appendChild(this._popover)
            }
            this._popover.textContent = v
        } else if (this._trigger) {
            this._trigger.remove()
            this._popover.remove()
            this._trigger = null
            this._popover = null
        }
    }

    set status(v) {
        if (v === null || v === undefined) {
            delete this._icon.dataset.status
        } else if (v >= 200 && v < 400) {
            this._icon.dataset.status = 'ok'
        } else if (v === 408) {
            this._icon.dataset.status = 'timeout'
        } else {
            this._icon.dataset.status = 'broken'
        }
    }
}

customElements.define('link-content', LinkContent)
