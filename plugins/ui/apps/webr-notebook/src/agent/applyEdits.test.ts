import { describe, it, expect, vi } from 'vitest'
import { applyEdits } from './applyEdits'
import type { EditOp } from './types'

function mockHandle(existingIds: string[]) {
  const ids = new Set(existingIds)
  return {
    addCell: vi.fn((_type: string, _pos?: number, _lang?: string) => {
      const id = `new-${ids.size}`
      ids.add(id)
      return id
    }),
    updateCellSource: vi.fn(),
    deleteCell: vi.fn((id: string) => ids.delete(id)),
    getCellData: vi.fn((id: string) =>
      ids.has(id) ? { id, type: 'code', source: '' } : undefined
    ),
  } as any
}

describe('applyEdits', () => {
  it('adds a cell then sets its source, and counts it', () => {
    const handle = mockHandle([])
    const edits: EditOp[] = [
      { op: 'add_cell', cellType: 'code', language: 'r', source: 'library(rD2E)' },
    ]
    const summary = applyEdits(handle, edits)
    expect(handle.addCell).toHaveBeenCalledWith('code', undefined, 'r')
    expect(handle.updateCellSource).toHaveBeenCalledWith('new-0', 'library(rD2E)')
    expect(summary.added).toBe(1)
  })

  it('updates an existing cell', () => {
    const handle = mockHandle(['c1'])
    const summary = applyEdits(handle, [
      { op: 'update_cell', cellId: 'c1', source: '2+2' },
    ])
    expect(handle.updateCellSource).toHaveBeenCalledWith('c1', '2+2')
    expect(summary.updated).toBe(1)
    expect(summary.skipped).toBe(0)
  })

  it('skips update/delete for a missing cell without throwing', () => {
    const handle = mockHandle([])
    const summary = applyEdits(handle, [
      { op: 'update_cell', cellId: 'gone', source: 'x' },
      { op: 'delete_cell', cellId: 'gone' },
    ])
    expect(handle.updateCellSource).not.toHaveBeenCalled()
    expect(handle.deleteCell).not.toHaveBeenCalled()
    expect(summary.skipped).toBe(2)
  })

  it('deletes an existing cell', () => {
    const handle = mockHandle(['c1'])
    const summary = applyEdits(handle, [{ op: 'delete_cell', cellId: 'c1' }])
    expect(handle.deleteCell).toHaveBeenCalledWith('c1')
    expect(summary.deleted).toBe(1)
  })

  it('applies edits in order and aggregates the summary', () => {
    const handle = mockHandle(['c1', 'c2'])
    const summary = applyEdits(handle, [
      { op: 'update_cell', cellId: 'c1', source: 'a' },
      { op: 'delete_cell', cellId: 'c2' },
      { op: 'add_cell', cellType: 'markdown', source: '# new' },
    ])
    expect(summary).toEqual({ added: 1, updated: 1, deleted: 1, skipped: 0 })
  })
})
