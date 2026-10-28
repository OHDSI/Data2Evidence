/**
 * Wraps `text` onto multiple lines so no line's rendered width exceeds `maxWidth`
 * pixels, measured with `ctx`'s current font. Breaks on spaces where possible; a
 * single word wider than `maxWidth` is hard-broken character-by-character so it never
 * overflows.
 */
export const wrapTextByWidth = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] => {
  if (!text) return ['']
  const fits = (s: string) => ctx.measureText(s).width <= maxWidth
  const words = text.split(' ')
  const lines: string[] = []
  let currentLine = ''

  for (const word of words) {
    // Hard-break a single word that is too wide to fit on a line by itself.
    if (!fits(word)) {
      if (currentLine) {
        lines.push(currentLine)
        currentLine = ''
      }
      let chunk = ''
      for (const ch of word) {
        // Keep at least one char per line so an over-wide glyph can't loop forever.
        if (chunk && !fits(chunk + ch)) {
          lines.push(chunk)
          chunk = ''
        }
        chunk += ch
      }
      currentLine = chunk
      continue
    }

    const candidate = currentLine ? `${currentLine} ${word}` : word
    if (!fits(candidate)) {
      lines.push(currentLine)
      currentLine = word
    } else {
      currentLine = candidate
    }
  }
  if (currentLine) lines.push(currentLine)
  return lines.length ? lines : ['']
}

export const ELLIPSIS = '...'

/**
 * Shortens `text` until it plus a trailing ellipsis fits within `maxWidth` pixels.
 * Text that already fits is returned with the ellipsis appended, marking it as cut off.
 */
export const truncateTextToWidth = (
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  ellipsis: string = ELLIPSIS
): string => {
  const fits = (s: string) => ctx.measureText(s).width <= maxWidth
  let cut = text
  while (cut && !fits(cut + ellipsis)) cut = cut.slice(0, -1)
  return cut.replace(/\s+$/, '') + ellipsis
}

/**
 * Wraps `text` like `wrapTextByWidth`, but to at most `maxLines` lines. Whatever does not
 * fit is dropped and the last kept line is truncated with an ellipsis, so the block never
 * grows past `maxWidth` x `maxLines`.
 */
export const wrapTextToLineLimit = (
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number
): string[] => {
  if (maxLines < 1) return []
  const lines = wrapTextByWidth(ctx, text, maxWidth)
  if (lines.length <= maxLines) return lines

  const kept = lines.slice(0, maxLines)
  kept[maxLines - 1] = truncateTextToWidth(ctx, kept[maxLines - 1], maxWidth)
  return kept
}
