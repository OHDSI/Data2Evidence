import { describe, it, expect } from 'vitest'
import { truncateTextToWidth, wrapTextByWidth, wrapTextToLineLimit } from '../textWrap'

// Stub context whose measured width equals the string's character count, so
// `maxWidth` behaves like a character limit and the assertions read naturally.
const charWidthCtx = {
  measureText: (s: string) => ({ width: s.length }),
} as unknown as CanvasRenderingContext2D

describe('wrapTextByWidth', () => {
  it('keeps short text on a single line', () => {
    expect(wrapTextByWidth(charWidthCtx, 'Short label', 80)).toEqual(['Short label'])
  })

  it('wraps on word boundaries so no line exceeds the width', () => {
    const lines = wrapTextByWidth(charWidthCtx, 'one two three four five', 8)
    expect(lines).toEqual(['one two', 'three', 'four', 'five'])
    lines.forEach(line => expect(line.length).toBeLessThanOrEqual(8))
  })

  it('wraps a long label at the given width', () => {
    const text = 'a '.repeat(60).trim() // 60 single-char words → 119 chars total
    const lines = wrapTextByWidth(charWidthCtx, text, 80)
    expect(lines.length).toBeGreaterThan(1)
    lines.forEach(line => expect(line.length).toBeLessThanOrEqual(80))
  })

  it('hard-breaks a single word wider than the limit', () => {
    const lines = wrapTextByWidth(charWidthCtx, 'x'.repeat(25), 10)
    expect(lines).toEqual(['xxxxxxxxxx', 'xxxxxxxxxx', 'xxxxx'])
  })

  it('hard-breaks a wide word while preserving surrounding words', () => {
    const lines = wrapTextByWidth(charWidthCtx, `start ${'y'.repeat(12)} end`, 10)
    expect(lines).toEqual(['start', 'yyyyyyyyyy', 'yy end'])
  })

  it('returns a single empty line for empty input', () => {
    expect(wrapTextByWidth(charWidthCtx, '', 80)).toEqual([''])
  })

  it('measures rendered width, not character count', () => {
    // Each glyph is 2px wide here, so a 10px limit fits at most 5 characters.
    const wideCtx = {
      measureText: (s: string) => ({ width: s.length * 2 }),
    } as unknown as CanvasRenderingContext2D
    const lines = wrapTextByWidth(wideCtx, 'aaa bbb ccc', 10)
    expect(lines).toEqual(['aaa', 'bbb', 'ccc'])
    lines.forEach(line => expect(line.length * 2).toBeLessThanOrEqual(10))
  })
})

describe('truncateTextToWidth', () => {
  it('shortens text until it fits alongside the ellipsis', () => {
    expect(truncateTextToWidth(charWidthCtx, 'abcdefgh', 5)).toBe('ab...')
  })

  it('marks text that already fits as cut off', () => {
    expect(truncateTextToWidth(charWidthCtx, 'ab', 10)).toBe('ab...')
  })

  it('drops the whitespace exposed by the cut', () => {
    expect(truncateTextToWidth(charWidthCtx, 'abc def', 7)).toBe('abc...')
  })

  it('returns just the ellipsis when nothing else fits', () => {
    expect(truncateTextToWidth(charWidthCtx, 'abc', 1)).toBe('...')
  })
})

describe('wrapTextToLineLimit', () => {
  it('leaves text that fits within the limit untouched', () => {
    expect(wrapTextToLineLimit(charWidthCtx, 'one two three', 10, 3)).toEqual(['one two', 'three'])
  })

  it('caps the line count and ellipsises the last kept line', () => {
    const lines = wrapTextToLineLimit(charWidthCtx, 'one two three four five six seven', 10, 3)
    expect(lines).toEqual(['one two', 'three four', 'five si...'])
    lines.forEach(line => expect(line.length).toBeLessThanOrEqual(10))
  })

  it('keeps a hard-broken long word within the line limit', () => {
    const lines = wrapTextToLineLimit(charWidthCtx, 'x'.repeat(50), 10, 3)
    expect(lines).toEqual(['xxxxxxxxxx', 'xxxxxxxxxx', 'xxxxxxx...'])
  })

  it('returns a single empty line for empty input', () => {
    expect(wrapTextToLineLimit(charWidthCtx, '', 10, 3)).toEqual([''])
  })
})
