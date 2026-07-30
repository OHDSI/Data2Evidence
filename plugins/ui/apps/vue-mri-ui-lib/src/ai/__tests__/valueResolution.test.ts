import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'
import { alternateQueries, rankValues, MAX_ALTERNATE_QUERIES, type ValueRow } from '../valueResolution'

// The contract this module shares with the backend's cohortValueResolver.ts (Deno,
// the deep-link surface). Both suites read THIS file so a ranking change cannot
// improve one surface and silently leave the other behind — which is exactly what
// had happened: the backend resolved "ER visit" and the browser tools did not.
//
// Deliberately a cross-plugin path: if the fixture moves, this fails loudly
// rather than quietly testing nothing.
const VECTORS_URL = new URL(
  '../../../../../../functions/mcp-server/src/lib/__fixtures__/value-resolution-vectors.json',
  import.meta.url
)
// Vite serves modules over its own origin and rewrites import.meta.url to a
// "/@fs/<abs path>" URL, so this is only a file: URL outside the dev server.
const VECTORS_PATH =
  VECTORS_URL.protocol === 'file:'
    ? fileURLToPath(VECTORS_URL)
    : decodeURIComponent(VECTORS_URL.pathname).replace(/^\/@fs/, '')

interface RankingVector {
  name: string
  query: string
  rows: Array<{ value: string; label: string }>
  expectedOrder: string[]
}

interface AlternateQueryVector {
  name: string
  query: string
  mustInclude?: string[]
  mustNotInclude?: string[]
  maxLength?: number
}

const vectors: { ranking: RankingVector[]; alternateQueries: AlternateQueryVector[] } = (() => {
  try {
    return JSON.parse(readFileSync(VECTORS_PATH, 'utf8'))
  } catch (e) {
    throw new Error(
      `Could not read the shared value-resolution vectors at ${VECTORS_PATH}. ` +
        'They are shared with plugins/functions/mcp-server (see the header of src/ai/valueResolution.ts); ' +
        `if the file moved, update this path and the backend suite together. Cause: ${(e as Error).message}`
    )
  }
})()

// The neutral { value, label } row shape onto what the /values endpoint returns.
const toValueRow = ({ value, label }: { value: string; label: string }): ValueRow => ({
  value,
  text: label,
  display_value: label,
})

describe('valueResolution — the contract shared with the backend resolver', () => {
  it('found the shared vectors', () => {
    expect(vectors.ranking.length).toBeGreaterThan(0)
    expect(vectors.alternateQueries.length).toBeGreaterThan(0)
  })

  it.each(vectors.ranking)('$name', ({ query, rows, expectedOrder }) => {
    const ranked = rankValues(rows.map(toValueRow), query).map(m => String(m.row.value))
    expect(ranked).toEqual(expectedOrder)
  })

  it.each(vectors.alternateQueries)('$name', ({ query, mustInclude, mustNotInclude, maxLength }) => {
    const queries = alternateQueries(query)
    for (const expected of mustInclude ?? []) expect(queries).toContain(expected)
    for (const forbidden of mustNotInclude ?? []) expect(queries).not.toContain(forbidden)
    expect(queries.length).toBeLessThanOrEqual(maxLength ?? MAX_ALTERNATE_QUERIES)
  })
})

// Browser-side specifics, not part of the shared contract.
describe('valueResolution', () => {
  it('never returns the query itself as an alternate — it has already been tried', () => {
    expect(alternateQueries('Female')).not.toContain('Female')
  })

  it('ignores a row with no label and no value', () => {
    expect(rankValues([{ value: '', text: '', display_value: '' }], 'female')).toEqual([])
  })

  // A two-letter synonym as a substring rule would match half the column ("f" is
  // in "Left foot"), so short variants are matched by equality only.
  it('does not substring-match a short synonym', () => {
    const ranked = rankValues([{ value: 'LF', text: 'Left foot', display_value: 'Left foot' }], 'female')
    expect(ranked).toEqual([])
  })
})
