import type { NotebookHandle } from 'react-notebook'
import type { CellLanguage, CellType } from 'react-notebook/src/types/notebook'
import type { EditOp, EditSummary } from './types'

export function applyEdits(
  handle: NotebookHandle,
  edits: EditOp[]
): EditSummary {
  const summary: EditSummary = { added: 0, updated: 0, deleted: 0, skipped: 0 }

  for (const edit of edits) {
    switch (edit.op) {
      case 'add_cell': {
        const newId = handle.addCell(
          edit.cellType as CellType,
          edit.position,
          edit.language as CellLanguage | undefined
        )
        handle.updateCellSource(newId, edit.source)
        summary.added++
        break
      }
      case 'update_cell': {
        if (!handle.getCellData(edit.cellId)) {
          summary.skipped++
          break
        }
        handle.updateCellSource(edit.cellId, edit.source)
        summary.updated++
        break
      }
      case 'delete_cell': {
        if (!handle.getCellData(edit.cellId)) {
          summary.skipped++
          break
        }
        handle.deleteCell(edit.cellId)
        summary.deleted++
        break
      }
    }
  }

  return summary
}
