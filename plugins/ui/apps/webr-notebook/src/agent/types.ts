export type EditOp =
  | {
      op: 'add_cell'
      cellType: 'code' | 'markdown'
      language?: 'python' | 'r'
      source: string
      position?: number
    }
  | { op: 'update_cell'; cellId: string; source: string }
  | { op: 'delete_cell'; cellId: string }

export type NotebookCellCtx = {
  id: string
  type: 'code' | 'markdown'
  language?: string
  source: string
  outputs?: string
}

export type AgentRequest = {
  cells: NotebookCellCtx[]
  userInput: string
  history?: { role: 'user' | 'assistant'; content: string }[]
}

export type EditSummary = {
  added: number
  updated: number
  deleted: number
  skipped: number
}
