import type { NotebookData } from 'react-notebook/src/types/notebook'
import type { NotebookCellCtx } from './types'

/** Flatten a cell's outputs into a compact text blob for the agent context. */
function outputsToText(outputs: unknown[]): string {
  const parts: string[] = []
  for (const o of outputs as any[]) {
    if (!o || typeof o !== 'object') continue
    if (o.type === 'error') {
      parts.push(`${o.ename ?? 'Error'}: ${o.evalue ?? ''}`)
    } else if (o.type === 'stream') {
      parts.push(String(o.text ?? ''))
    } else if (o.data) {
      const txt = o.data['text/plain']
      if (txt) parts.push(Array.isArray(txt) ? txt.join('') : String(txt))
    }
  }
  return parts.join('\n')
}

export function serializeCellsForRequest(data: NotebookData): NotebookCellCtx[] {
  return data.cells.map((c: any) => {
    const ctx: NotebookCellCtx = {
      id: c.id,
      type: c.type,
      source: c.source,
    }
    if (c.type === 'code') {
      if (c.language) ctx.language = c.language
      if (Array.isArray(c.outputs) && c.outputs.length > 0) {
        const text = outputsToText(c.outputs)
        if (text) ctx.outputs = text
      }
    }
    return ctx
  })
}
