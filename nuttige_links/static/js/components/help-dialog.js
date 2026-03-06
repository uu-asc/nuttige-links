import { BaseDialog } from './base-dialog.js'

class HelpDialog extends BaseDialog {
    get _template() {
        return /*html*/`
        <dialog>
            <h2>Keyboard shortcuts</h2>
            <div class="content">
                <section>
                    <h3>General</h3>
                    <dl>
                        <dt>/</dt>          <dd>Focus filter</dd>
                        <dt>e</dt>          <dd>Toggle edit mode</dd>
                        <dt>f</dt>          <dd>Fold / unfold all sections</dd>
                        <dt>d</dt>          <dd>Toggle dark mode</dd>
                        <dt>?</dt>          <dd>This help dialog</dd>
                        <dt>Ctrl+S</dt>     <dd>Save all changes</dd>
                        <dt>Ctrl+U</dt>     <dd>Reset filter</dd>
                        <dt>Esc</dt>        <dd>Unfocus / close dialog</dd>
                    </dl>
                </section>

                <section>
                    <h3>Navigation</h3>
                    <dl>
                        <dt>↑ / ↓</dt>          <dd>Move between items</dd>
                        <dt>← / →</dt>          <dd>Move between header controls</dd>
                        <dt>↓ from header</dt>  <dd>Enter tree</dd>
                        <dt>↑ from top</dt>     <dd>Return to header</dd>
                        <dt>Page Up / Down</dt> <dd>Jump to previous / next section</dd>
                        <dt>Home / End</dt>     <dd>Jump to first / last item</dd>
                    </dl>
                </section>

                <section>
                    <h3>Normal mode</h3>
                    <dl>
                        <dt>Space</dt>       <dd>Collapse / expand section</dd>
                        <dt>Enter</dt>       <dd>Follow link (opens in new tab)</dd>
                    </dl>
                </section>

                <section>
                    <h3>Edit mode</h3>
                    <dl>
                        <dt>Space</dt>       <dd>Toggle checkbox</dd>
                        <dt>Shift+Space</dt> <dd>Extend selection to item</dd>
                        <dt>Ctrl+A</dt>      <dd>Select all visible items</dd>
                        <dt>← / →</dt>       <dd>Navigate inline controls</dd>
                        <dt>Enter</dt>       <dd>Edit item</dd>
                        <dt>+</dt>           <dd>Add link at current position</dd>
                        <dt>Delete</dt>      <dd>Mark item for deletion</dd>
                    </dl>
                </section>

                <section>
                    <h3>Dialogs</h3>
                    <dl>
                        <dt>↑ / ↓</dt>      <dd>Move between fields</dd>
                        <dt>Alt+↑ / ↓</dt>  <dd>Move between fields (always)</dd>
                        <dt>← / →</dt>      <dd>Move between action buttons</dd>
                        <dt>Enter</dt>      <dd>Next field / save</dd>
                        <dt>Esc</dt>        <dd>Close dialog</dd>
                    </dl>
                </section>

                <section>
                    <h3>Reorder lists</h3>
                    <dl>
                        <dt>↑ / ↓</dt>      <dd>Navigate items</dd>
                        <dt>Alt+↑ / ↓</dt>  <dd>Move item up / down</dd>
                    </dl>
                </section>

                <section>
                    <h3>Filter</h3>
                    <dl>
                        <dt>Esc</dt>         <dd>Clear filter text</dd>
                        <dt>Ctrl+Delete</dt> <dd>Reset all filters</dd>
                        <dt>← / →</dt>       <dd>Move between filter controls (when input empty)</dd>
                        <dt>Alt+← / →</dt>   <dd>Move between filter controls (always)</dd>
                    </dl>
                </section>
            </div>
            <div class="actions">
                <button id="btn-cancel">Close</button>
                <button id="btn-save" hidden></button>
            </div>
        </dialog>`
    }

    get _extraCss() {
        return /*css*/`
        dialog { min-width: 480px; }

        .content {
            max-height: 65vh;
            overflow-y: auto;
            padding-right: 0.5rem;
        }

        h3 {
            margin: 1.25rem 0 0.5rem;
            font-size: 0.95rem;
        }

        section:first-child h3 { margin-top: 0; }

        dl {
            display: grid;
            grid-template-columns: 9rem 1fr;
            gap: 0.2rem 1rem;
            margin: 0;
            font-size: 0.875em;
        }

        dt {
            font-family: monospace;
            white-space: nowrap;
        }

        dd { margin: 0; }
        `
    }

    get _focusables() {
        return [this.shadowRoot.querySelector('#btn-cancel')]
    }

    _shouldOpen(config) {
        return config.mode === 'help'
    }

    _open() {
        this._dialog.showModal()
    }
}

customElements.define('help-dialog', HelpDialog)
