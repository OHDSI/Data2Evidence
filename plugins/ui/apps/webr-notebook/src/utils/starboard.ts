import type { NotebookData, CellLanguage } from '@/types/notebook'
import { createCodeCell, createMarkdownCell } from '@/types/notebook'
import { parseIpynb } from '@/index'

/**
 * Detect whether source code looks like R (vs Python).
 * Checks for common R patterns like `library(...)`, `<-` assignment, `$` accessor.
 */
function looksLikeR(source: string): boolean {
  return /\blibrary\s*\(/.test(source) || /\w+\s*<-\s/.test(source)
}

export function parseStarboard(content: string): NotebookData {
  let body = content
  const metadata: NotebookData['metadata'] = {}

  // Parse YAML front matter
  const frontMatterMatch = body.match(/^---\n([\s\S]*?)\n---\n/)
  if (frontMatterMatch) {
    const yaml = frontMatterMatch[1]
    const titleMatch = yaml.match(/^title:\s*(.+)$/m)
    if (titleMatch) {
      metadata.title = titleMatch[1].trim().replace(/^['"]|['"]$/g, '')
    }
    body = body.slice(frontMatterMatch[0].length)
  }

  // Find all cell delimiters — supports both `# %% [type]` and `# %%--- [type]`
  const cellDelimiter = /^# %%(?:---)?[ \t]*\[(\w+)\]/gm
  const delimiters: { type: string; index: number; fullMatchLength: number }[] = []
  let match: RegExpExecArray | null
  while ((match = cellDelimiter.exec(body)) !== null) {
    delimiters.push({
      type: match[1].toLowerCase(),
      index: match.index,
      fullMatchLength: match[0].length,
    })
  }

  if (delimiters.length === 0) {
    // No cells found — treat entire content as a single markdown cell if non-empty
    const trimmed = body.trim()
    return {
      metadata,
      cells: trimmed ? [createMarkdownCell(trimmed)] : [],
    }
  }

  const cells = delimiters.map((delim, i) => {
    const sourceStart = delim.index + delim.fullMatchLength
    const sourceEnd = i < delimiters.length - 1 ? delimiters[i + 1].index : body.length
    let source = body.slice(sourceStart, sourceEnd)

    // Strip cell metadata blocks: `# properties: {...}\n# ---%%` or `%%---...---%%`
    source = source.replace(/^[\s\S]*?#\s*---%%\s*\n?/, '')
    source = source.replace(/%%---[\s\S]*?---%%/g, '')

    // Trim leading newline and trailing whitespace between cells
    source = source.replace(/^\n/, '').replace(/\n$/, '')

    if (delim.type === 'markdown') {
      return createMarkdownCell(source)
    }

    // `[jupyter]` is the generic code cell type in old starboard — detect language from content
    let language: CellLanguage
    if (delim.type === 'r') {
      language = 'r'
    } else if (delim.type === 'jupyter' && looksLikeR(source)) {
      language = 'r'
    } else {
      language = 'python'
    }
    return createCodeCell(language, source)
  })

  return { metadata, cells }
}

export function serializeStarboard(notebook: NotebookData): string {
  const parts: string[] = []

  if (notebook.metadata.title) {
    parts.push(`---\ntitle: ${notebook.metadata.title}\n---`)
  }

  for (const cell of notebook.cells) {
    if (cell.type === 'markdown') {
      parts.push(`# %% [markdown]\n${cell.source}`)
    } else {
      const lang = cell.language === 'r' ? 'r' : 'python'
      parts.push(`# %% [${lang}]\n${cell.source}`)
    }
  }

  return parts.join('\n')
}

export function detectNotebookFormat(content: string): 'ipynb' | 'starboard' {
  try {
    const parsed = JSON.parse(content)
    if (parsed && typeof parsed === 'object' && 'nbformat' in parsed) {
      return 'ipynb'
    }
  } catch {
    // Not valid JSON — must be starboard
  }
  return 'starboard'
}

export function parseNotebookContent(content: string): NotebookData {
  if (detectNotebookFormat(content) === 'ipynb') {
    return parseIpynb(content)
  }
  return parseStarboard(content)
}
