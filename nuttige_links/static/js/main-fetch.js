import { createFetchAdapter } from './adapters/fetch-adapter.js'
import { init } from './main.js'
import { init as authInit, hasPermission, user, authFetch } from '/shared/auth.js'

let canEdit = true
let authUser = null
let fetchFn = fetch

try {
    await authInit()
    canEdit = hasPermission('nuttige-links', 'editor')
    authUser = user()
    fetchFn = authFetch
} catch {
    // no auth layer — full access
}

init(createFetchAdapter(fetchFn), { canEdit, user: authUser })
