function getRecord(table, id, state) {
    return state[table].drafts[id] ?? state[table].records[id]
}

function isDraftOnly(id, table, state) {
    return id in state[table].drafts && !(id in state[table].records)
}

function passesFilter(id, table, state) {
    if (isDraftOnly(id, table, state)) return true
    const vis = state[table].uiVisible
    return vis ? vis.has(id) : true
}

export function isVisible(id, table, state) {
    const record = getRecord(table, id, state)
    if (!record) return false

    if (!passesFilter(id, table, state)) return false

    if (table === 'links') {
        if (state.subsections.uiCollapsed.has(record.subsection_id)) return false
        const sub = getRecord('subsections', record.subsection_id, state)
        if (sub && state.sections.uiCollapsed.has(sub.section_id)) return false
    }

    if (table === 'subsections') {
        if (state.sections.uiCollapsed.has(record.section_id)) return false
    }

    return true
}

export function getVisibleItems(state) {
    const items = []

    const sections = mergedSorted('sections', state)
    const subsBySec = groupBy(mergedSorted('subsections', state), 'section_id')
    const linksBySub = groupBy(mergedSorted('links', state), 'subsection_id')

    for (const sec of sections) {
        if (!passesFilter(sec.id, 'sections', state)) continue
        items.push({ id: sec.id, table: 'sections' })

        if (state.sections.uiCollapsed.has(sec.id)) continue

        for (const sub of subsBySec[sec.id] ?? []) {
            if (!passesFilter(sub.id, 'subsections', state)) continue
            items.push({ id: sub.id, table: 'subsections' })

            if (state.subsections.uiCollapsed.has(sub.id)) continue

            for (const link of linksBySub[sub.id] ?? []) {
                if (!passesFilter(link.id, 'links', state)) continue
                items.push({ id: link.id, table: 'links' })
            }
        }
    }

    return items
}

function mergedSorted(table, state) {
    const { records, drafts } = state[table]
    return Object.values({ ...records, ...drafts })
        .sort((a, b) => a.position - b.position)
}

function groupBy(arr, key) {
    const map = {}
    for (const item of arr) {
        (map[item[key]] ??= []).push(item)
    }
    return map
}
