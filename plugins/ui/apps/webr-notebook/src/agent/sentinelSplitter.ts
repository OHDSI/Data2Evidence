import type { EditOp } from './types'

export const SENTINEL = '<<<D2E_EDITS>>>'

/**
 * Streaming splitter for the agent response: everything before SENTINEL is
 * narration (forwarded to the chat as it arrives); everything after it is the
 * edits JSON (buffered, parsed at the end). Handles the sentinel landing across
 * chunk boundaries by holding back a tail that could be a partial sentinel.
 */
export function createSentinelSplitter() {
  let buffer = '' // narration not yet safe to emit (possible partial sentinel)
  let editsRaw = '' // text collected after the sentinel
  let sentinelSeen = false

  function push(chunk: string): string {
    if (sentinelSeen) {
      editsRaw += chunk
      return ''
    }
    buffer += chunk
    const idx = buffer.indexOf(SENTINEL)
    if (idx !== -1) {
      sentinelSeen = true
      const narration = buffer.slice(0, idx)
      editsRaw = buffer.slice(idx + SENTINEL.length)
      buffer = ''
      return narration
    }
    // Hold back the last (SENTINEL.length - 1) chars: they might begin a
    // sentinel that completes in the next chunk.
    const keep = SENTINEL.length - 1
    if (buffer.length <= keep) return ''
    const emit = buffer.slice(0, buffer.length - keep)
    buffer = buffer.slice(buffer.length - keep)
    return emit
  }

  /** Emit any held-back trailing text. Call once when the stream ends with no
   *  sentinel, so a tail that looked like a partial sentinel isn't lost. */
  function flush(): string {
    if (sentinelSeen) return ''
    const out = buffer
    buffer = ''
    return out
  }

  function getEdits(): EditOp[] {
    if (!sentinelSeen) return []
    try {
      const parsed = JSON.parse(editsRaw.trim())
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }

  return { push, flush, getEdits }
}
