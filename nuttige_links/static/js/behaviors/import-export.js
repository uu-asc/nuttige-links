import { store } from '../datastore.js'
import { sync } from '../sync.js'
import { computeVisibility } from './filter.js'

const TABLES = ['sections', 'subsections', 'links']

function pickFile(accept = '.json') {
    return new Promise((resolve) => {
        const input = document.createElement('input')
        input.type = 'file'
        input.accept = accept
        input.addEventListener('change', () => {
            resolve(input.files[0] ?? null)
        })
        input.click()
    })
}

function readFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result)
        reader.onerror = () => reject(reader.error)
        reader.readAsText(file)
    })
}

function download(data, filename = 'nuttige-links-export.json') {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
}

function collectParents(checkedIds) {
    const records = {
        sections: new Set(checkedIds.sections),
        subsections: new Set(checkedIds.subsections),
        links: new Set(checkedIds.links),
    }

    // walk up from links -> add parent subsection + section
    for (const id of checkedIds.links) {
        const link = store.state.links.records[id]
        if (!link) continue
        records.subsections.add(link.subsection_id)
        const sub = store.state.subsections.records[link.subsection_id]
        if (sub) records.sections.add(sub.section_id)
    }

    // walk up from subsections -> add parent section
    for (const id of records.subsections) {
        const sub = store.state.subsections.records[id]
        if (sub) records.sections.add(sub.section_id)
    }

    return records
}

function gatherRecords(idSets) {
    const data = {}
    for (const table of TABLES) {
        data[table] = [...idSets[table]]
            .map(id => store.state[table].records[id])
            .filter(Boolean)
    }
    return data
}

export function exportAll() {
    const data = sync.exportAll()
    download(data)
}

export function exportSelected() {
    const checkedIds = {
        sections: store.state.sections.checkedIds,
        subsections: store.state.subsections.checkedIds,
        links: store.state.links.checkedIds,
    }
    const idSets = collectParents(checkedIds)
    const data = gatherRecords(idSets)
    download(data)
}

export async function importFromFile() {
    const file = await pickFile()
    if (!file) return

    const text = await readFile(file)
    const data = JSON.parse(text)
    await sync.importAll(data)
    computeVisibility()
}
