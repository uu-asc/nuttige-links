import { store } from '../datastore.js'

function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export async function copyUrl(record) {
    await navigator.clipboard.writeText(record.url)
    showFeedback(record.id)
}

export async function copyRichLink(record) {
    const text = record.text || record.url
    const html = `<a href="${escapeHtml(record.url)}">${escapeHtml(text)}</a>`
    await navigator.clipboard.write([
        new ClipboardItem({
            'text/html': new Blob([html], { type: 'text/html' }),
            'text/plain': new Blob([record.url], { type: 'text/plain' }),
        })
    ])
    showFeedback(record.id)
}

function showFeedback(id) {
    const el = document.querySelector(`link-item[record-id="${id}"]`)
    if (!el) return
    el.toggleAttribute('data-copied', true)
    setTimeout(() => el.toggleAttribute('data-copied', false), 600)
}

export function getRecordForItem(item) {
    if (item.table !== 'links') return null
    return store.state.links.drafts[item.id]
        ?? store.state.links.records[item.id]
}

export function initCtrlTracking() {
    const update = (e) => {
        document.body.toggleAttribute('data-ctrl', e.ctrlKey || e.metaKey)
    }
    document.addEventListener('keydown', update)
    document.addEventListener('keyup', update)
    window.addEventListener('blur', () => {
        document.body.toggleAttribute('data-ctrl', false)
    })
}
