import { createFetchAdapter } from './adapters/fetch-adapter.js'
import { init } from './main.js'
import { init as authInit, initAuthUI, hasPermission, authFetch } from '/auth/static/js/auth.js'

let canEdit = true
let fetchFn = fetch

try {
    await authInit()
    initAuthUI()
    canEdit = hasPermission('nuttige-links', 'editor')
    fetchFn = authFetch
} catch {
    // no auth layer — full access
}

init(createFetchAdapter(fetchFn), { canEdit })
