import { store } from '../datastore.js'

export function computeVisibility() {
    const { filterTerm, showBrokenOnly, linksOnly } = store.state.ui
    const term = filterTerm.toLowerCase().trim()

    const sections = store.state.sections.records
    const subsections = store.state.subsections.records
    const links = store.state.links.records

    // no filter active — null signals "show everything"
    if (!term && !showBrokenOnly) {
        store.batch(() => {
            store.setState(['sections', 'uiVisible'], null)
            store.setState(['subsections', 'uiVisible'], null)
            store.setState(['links', 'uiVisible'], null)
        })
        return
    }

    const visSec = new Set()
    const visSub = new Set()
    const visLink = new Set()

    // index subsections and links by parent
    const subsBySec = {}
    for (const s of Object.values(subsections)) {
        (subsBySec[s.section_id] ??= []).push(s)
    }
    const linksBySub = {}
    for (const l of Object.values(links)) {
        (linksBySub[l.subsection_id] ??= []).push(l)
    }

    function linkMatchesBroken(link) {
        if (!showBrokenOnly) return true
        return link.last_status !== null
            && link.last_status !== undefined
            && (link.last_status < 200 || link.last_status >= 400)
    }

    function linkMatchesTerm(link) {
        if (!term) return true
        return link.text.toLowerCase().includes(term)
            || link.url.toLowerCase().includes(term)
            || (link.description ?? '').toLowerCase().includes(term)
    }

    function markSection(secId) {
        visSec.add(secId)
    }

    function markSubsection(sub) {
        visSub.add(sub.id)
        visSec.add(sub.section_id)
    }

    function markAllDescendants(secId) {
        markSection(secId)
        for (const sub of subsBySec[secId] ?? []) {
            visSub.add(sub.id)
            for (const link of linksBySub[sub.id] ?? []) {
                if (linkMatchesBroken(link)) visLink.add(link.id)
            }
        }
    }

    function markAllLinks(sub) {
        markSubsection(sub)
        for (const link of linksBySub[sub.id] ?? []) {
            if (linkMatchesBroken(link)) visLink.add(link.id)
        }
    }

    // 1. section name match (unless links-only)
    if (term && !linksOnly) {
        for (const sec of Object.values(sections)) {
            if (sec.name.toLowerCase().includes(term)) {
                markAllDescendants(sec.id)
            }
        }
    }

    // 2. subsection name match (unless links-only)
    if (term && !linksOnly) {
        for (const sub of Object.values(subsections)) {
            if (sub.name.toLowerCase().includes(term)) {
                markAllLinks(sub)
            }
        }
    }

    // 3. link field match
    for (const link of Object.values(links)) {
        if (!linkMatchesBroken(link)) continue
        if (term && !linkMatchesTerm(link)) continue
        visLink.add(link.id)
        const sub = subsections[link.subsection_id]
        if (sub) markSubsection(sub)
    }

    store.batch(() => {
        store.setState(['sections', 'uiVisible'], visSec)
        store.setState(['subsections', 'uiVisible'], visSub)
        store.setState(['links', 'uiVisible'], visLink)
    })
}
