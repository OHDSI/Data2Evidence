import { describe, expect, it } from 'vitest'
import { buildInsertedBookmark, buildUpdatedBookmark, isBookmarkSaveSuccess } from '../BookmarkUtils'

const PAYLOAD = JSON.stringify({ filter: { cards: [] }, axisSelection: ['n/a'] })

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

describe('buildInsertedBookmark', () => {
  const input = {
    result: { status: 'success', bmkId: 'bmk-1' },
    bookmarkname: 'My Cohort',
    bookmark: PAYLOAD,
    user_id: 'tester',
    shared: false,
    paConfigId: 'pa-1',
  }

  it('adopts the id the save returned', () => {
    expect(buildInsertedBookmark(input).bmkId).toBe('bmk-1')
  })

  it('matches the record bookmark-svc stores for a new bookmark', () => {
    const built = buildInsertedBookmark(input)

    // createBookmarkDto fixes these two for every insert.
    expect(built.viewname).toBeNull()
    expect(built.version).toBe(1)
    expect(built).toMatchObject({
      bookmarkname: 'My Cohort',
      bookmark: PAYLOAD,
      user_id: 'tester',
      shared: false,
      paConfigId: 'pa-1',
    })
    // A fresh bookmark has never been materialized.
    expect(built.cohortDefinitionId).toBeUndefined()
  })

  it('satisfies the bookmark schema the cohort list validates against', async () => {
    const { BookmarkSchema } = await import('@/schema/bookmarksSchema')

    expect(BookmarkSchema.safeParse(buildInsertedBookmark(input)).success).toBe(true)
  })

  it('returns null when the save did not succeed', () => {
    expect(buildInsertedBookmark({ ...input, result: undefined })).toBeNull()
  })
})

describe('buildUpdatedBookmark', () => {
  const active = {
    bmkId: 'bmk-9',
    bookmarkname: 'Existing Cohort',
    bookmark: '{"filter":{"cards":[]}}',
    viewname: null,
    modified: '2026-09-01T00:00:00.000Z',
    version: 3,
    user_id: 'tester',
    shared: false,
    cohortDefinitionId: 42,
    paConfigId: 'pa-1',
  }

  it('keeps the identity of the bookmark it updated', () => {
    const built = buildUpdatedBookmark(active, { bookmark: PAYLOAD, shared: true })

    expect(built.bmkId).toBe('bmk-9')
    expect(built.bookmarkname).toBe('Existing Cohort')
    // The cohort stays materialized across an update.
    expect(built.cohortDefinitionId).toBe(42)
  })

  it('carries the written payload and the new share flag', () => {
    const built = buildUpdatedBookmark(active, { bookmark: PAYLOAD, shared: true })

    expect(built.bookmark).toBe(PAYLOAD)
    expect(built.shared).toBe(true)
  })

  it('bumps the version the way _updateBookmark does', () => {
    expect(buildUpdatedBookmark(active, { bookmark: PAYLOAD, shared: false }).version).toBe(4)
  })

  it('treats a missing version as unversioned rather than NaN', () => {
    const built = buildUpdatedBookmark({ ...active, version: null }, { bookmark: PAYLOAD, shared: false })

    expect(built.version).toBe(1)
  })

  it('does not mutate the bookmark it was given', () => {
    buildUpdatedBookmark(active, { bookmark: PAYLOAD, shared: true })

    expect(active.bookmark).toBe('{"filter":{"cards":[]}}')
    expect(active.shared).toBe(false)
    expect(active.version).toBe(3)
  })
})
