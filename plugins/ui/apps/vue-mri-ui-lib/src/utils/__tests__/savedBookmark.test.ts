import { describe, expect, it } from 'vitest'
import { isBookmarkSaveSuccess } from '../BookmarkUtils'

describe('isBookmarkSaveSuccess', () => {
  // bookmark-svc answers the two commands differently: insert returns the object
  // { status: 'success', bmkId }, update returns the bare string 'success'.
  it('accepts the insert payload', () => {
    expect(isBookmarkSaveSuccess({ status: 'success', bmkId: 'bmk-1' })).toBe(true)
  })

  it('accepts the update payload', () => {
    expect(isBookmarkSaveSuccess('success')).toBe(true)
  })

  it.each([
    ['a swallowed failure', undefined],
    ['a null body', null],
    ['an empty object', {}],
    ['an error status', { status: 'error' }],
    ['unrelated text', 'saved'],
  ])('rejects %s', (_name, result) => {
    expect(isBookmarkSaveSuccess(result)).toBe(false)
  })
})
