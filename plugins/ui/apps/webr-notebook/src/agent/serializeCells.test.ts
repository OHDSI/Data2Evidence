import { describe, it, expect } from 'vitest'
import { serializeCellsForRequest } from './serializeCells'
import type { NotebookData } from 'react-notebook/src/types/notebook'

const data: NotebookData = {
  metadata: {},
  cells: [
    {
      id: 'c1',
      type: 'code',
      language: 'r',
      source: 'stop("boom")',
      executionCount: 1,
      executionState: 'error',
      outputs: [
        { type: 'error', ename: 'Error', evalue: 'boom', traceback: ['boom'] },
      ],
    },
    { id: 'c2', type: 'markdown', source: '# hi' },
  ],
} as NotebookData

describe('serializeCellsForRequest', () => {
  it('maps id/type/language/source for each cell', () => {
    const out = serializeCellsForRequest(data)
    expect(out[0]).toMatchObject({
      id: 'c1',
      type: 'code',
      language: 'r',
      source: 'stop("boom")',
    })
    expect(out[1]).toMatchObject({ id: 'c2', type: 'markdown', source: '# hi' })
  })

  it('includes a string outputs field for code cells that have outputs', () => {
    const out = serializeCellsForRequest(data)
    expect(typeof out[0].outputs).toBe('string')
    expect(out[0].outputs).toContain('boom')
  })

  it('omits outputs for markdown cells', () => {
    const out = serializeCellsForRequest(data)
    expect(out[1].outputs).toBeUndefined()
  })
})
