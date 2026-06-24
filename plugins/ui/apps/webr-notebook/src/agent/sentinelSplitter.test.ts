import { describe, it, expect } from 'vitest'
import { createSentinelSplitter, SENTINEL } from './sentinelSplitter'

function feed(chunks: string[]) {
  const s = createSentinelSplitter()
  let narration = ''
  for (const c of chunks) narration += s.push(c)
  narration += s.flush()
  return { narration, edits: s.getEdits() }
}

describe('createSentinelSplitter', () => {
  it('returns all text as narration when there is no sentinel', () => {
    const { narration, edits } = feed(['Hello ', 'world'])
    expect(narration).toBe('Hello world')
    expect(edits).toEqual([])
  })

  it('splits narration from edits in a single chunk', () => {
    const { narration, edits } = feed([
      `Done.${SENTINEL}[{"op":"delete_cell","cellId":"c1"}]`,
    ])
    expect(narration).toBe('Done.')
    expect(edits).toEqual([{ op: 'delete_cell', cellId: 'c1' }])
  })

  it('handles the sentinel split across chunk boundaries', () => {
    const half = SENTINEL.slice(0, 5)
    const rest = SENTINEL.slice(5)
    const { narration, edits } = feed([
      'hi',
      half,
      `${rest}[{"op":"update_cell","cellId":"c2","source":"x"}]`,
    ])
    expect(narration).toBe('hi')
    expect(edits).toEqual([{ op: 'update_cell', cellId: 'c2', source: 'x' }])
  })

  it('never emits text that appears after the sentinel as narration', () => {
    const { narration } = feed([`a${SENTINEL}[]`])
    expect(narration).toBe('a')
  })

  it('returns [] for malformed edits JSON', () => {
    const { edits } = feed([`done${SENTINEL}not json`])
    expect(edits).toEqual([])
  })

  it('returns [] when there is no sentinel at all', () => {
    const { edits } = feed(['plain text'])
    expect(edits).toEqual([])
  })

  it('flush emits held-back trailing text when no sentinel arrives', () => {
    const s = createSentinelSplitter()
    let n = s.push('end<<<') // looks like a partial sentinel, held back
    n += s.flush()
    expect(n).toBe('end<<<')
  })
})
