import { store } from '../datastore.js'
import { computeVisibility } from '../behaviors/filter.js'

class LinkToolbar extends HTMLElement {
    connectedCallback() {
        this.innerHTML = `
            <input type="text" placeholder="Filter..." data-ref="filter">
            <label><input type="checkbox" data-ref="links-only"> Links only</label>
            <label><input type="checkbox" data-ref="broken-only"> Broken only</label>
            <button data-ref="expand-all">Expand all</button>
            <button data-ref="collapse-all">Collapse all</button>
        `

        this.filterInput = this.querySelector('[data-ref="filter"]')
        this.linksOnlyBox = this.querySelector('[data-ref="links-only"]')
        this.brokenOnlyBox = this.querySelector('[data-ref="broken-only"]')

        this.filterInput.addEventListener('input', () => {
            store.setState(['ui', 'filterTerm'], this.filterInput.value)
            computeVisibility()
        })

        this.linksOnlyBox.addEventListener('change', () => {
            store.setState(['ui', 'linksOnly'], this.linksOnlyBox.checked)
            computeVisibility()
        })

        this.brokenOnlyBox.addEventListener('change', () => {
            store.setState(['ui', 'showBrokenOnly'], this.brokenOnlyBox.checked)
            computeVisibility()
        })

        this.querySelector('[data-ref="expand-all"]').addEventListener('click', () => {
            const event = new CustomEvent('toggle-collapse', {
                detail: {
                    collapse: false
                }
            })
            document.dispatchEvent(event)
        })

        this.querySelector('[data-ref="collapse-all"]').addEventListener('click', () => {
            const event = new CustomEvent('toggle-collapse', {
                detail: {
                    collapse: true
                }
            })
            document.dispatchEvent(event)
        })
    }
}

customElements.define('link-toolbar', LinkToolbar)
