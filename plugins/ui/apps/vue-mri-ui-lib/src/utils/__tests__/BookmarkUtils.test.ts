import { D2eExplorationCardStatus } from '@d2e/ui'
import { BookmarkSchema } from '@/schema/bookmarksSchema'
import { canModifyBookmark, formatBookmark, isBookmarkSaveSuccess, processBookmarksData } from '../BookmarkUtils'

describe('BookmarkUtils - canModifyBookmark', () => {
  describe('canModifyBookmark', () => {
    it('returns true when bookmark username matches current username', () => {
      const bookmark = { username: 'alice', id: '123' }
      const currentUsername = 'alice'

      expect(canModifyBookmark(bookmark, currentUsername)).toBe(true)
    })

    it('returns false when bookmark username does not match current username', () => {
      const bookmark = { username: 'alice', id: '123' }
      const currentUsername = 'bob'

      expect(canModifyBookmark(bookmark, currentUsername)).toBe(false)
    })

    it('returns false when bookmark is null', () => {
      const bookmark = null
      const currentUsername = 'alice'

      expect(canModifyBookmark(bookmark, currentUsername)).toBe(false)
    })

    it('returns false when bookmark is undefined', () => {
      const bookmark = undefined
      const currentUsername = 'alice'

      expect(canModifyBookmark(bookmark, currentUsername)).toBe(false)
    })

    it('returns false when currentUsername is null', () => {
      const bookmark = { username: 'alice', id: '123' }
      const currentUsername = null

      expect(canModifyBookmark(bookmark, currentUsername)).toBe(false)
    })

    it('returns false when currentUsername is undefined', () => {
      const bookmark = { username: 'alice', id: '123' }
      const currentUsername = undefined

      expect(canModifyBookmark(bookmark, currentUsername)).toBe(false)
    })

    it('returns false when currentUsername is empty string', () => {
      const bookmark = { username: 'alice', id: '123' }
      const currentUsername = ''

      expect(canModifyBookmark(bookmark, currentUsername)).toBe(false)
    })

    it('returns false when bookmark username is undefined', () => {
      const bookmark = { id: '123' }
      const currentUsername = 'alice'

      expect(canModifyBookmark(bookmark, currentUsername)).toBe(false)
    })

    it('returns false when bookmark username is null', () => {
      const bookmark = { username: null, id: '123' }
      const currentUsername = 'alice'

      expect(canModifyBookmark(bookmark, currentUsername)).toBe(false)
    })

    it('returns false when bookmark username is empty string', () => {
      const bookmark = { username: '', id: '123' }
      const currentUsername = 'alice'

      expect(canModifyBookmark(bookmark, currentUsername)).toBe(false)
    })

    it('handles bookmark with user_id field instead of username', () => {
      const bookmark = { user_id: 'alice', id: '123' }
      const currentUsername = 'alice'

      expect(canModifyBookmark(bookmark, currentUsername)).toBe(true)
    })

    it('prefers username over user_id when both are present', () => {
      const bookmark = { username: 'alice', user_id: 'bob', id: '123' }
      const currentUsername = 'alice'

      expect(canModifyBookmark(bookmark, currentUsername)).toBe(true)
    })

    it('returns false when user_id does not match', () => {
      const bookmark = { user_id: 'alice', id: '123' }
      const currentUsername = 'bob'

      expect(canModifyBookmark(bookmark, currentUsername)).toBe(false)
    })

    it('is case-sensitive for usernames', () => {
      const bookmark = { username: 'Alice', id: '123' }
      const currentUsername = 'alice'

      expect(canModifyBookmark(bookmark, currentUsername)).toBe(false)
    })

    it('works with AtlasCohortDefinition structure', () => {
      const atlasCohortDef = { username: 'alice', id: 123, name: 'Test Cohort' }
      expect(canModifyBookmark(atlasCohortDef, 'alice')).toBe(true)
      expect(canModifyBookmark(atlasCohortDef, 'bob')).toBe(false)
    })
  })
})

describe('BookmarkUtils - isBookmarkSaveSuccess', () => {
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

describe('BookmarkUtils - materializationStatus', () => {
  const rawBookmark = (materializationStatus?: D2eExplorationCardStatus): FormattedBookmark => ({
    bmkId: 'bmk-1',
    bookmarkname: 'SNRI Users',
    bookmark: JSON.stringify({ filter: { cards: { content: [] } }, chartType: 'stacked' }),
    viewname: null,
    modified: '2026-10-20T10:00:00.000Z',
    version: '2',
    user_id: 'alice',
    shared: false,
    materializationStatus,
  })

  it('formatBookmark keeps the status', () => {
    expect(formatBookmark(rawBookmark(D2eExplorationCardStatus.STALE)).materializationStatus).toBe(
      D2eExplorationCardStatus.STALE
    )
  })

  it('formatBookmark leaves the status undefined when the backend does not send it', () => {
    expect(formatBookmark(rawBookmark()).materializationStatus).toBeUndefined()
  })

  it('processBookmarksData keeps the status on the bookmark', () => {
    const item: IBookmark = { ...rawBookmark(D2eExplorationCardStatus.STALE), version: 2, paConfigId: 'pa-1' }
    const { bookmarks } = processBookmarksData([item], 'pa-1')
    expect(bookmarks[0].materializationStatus).toBe(D2eExplorationCardStatus.STALE)
  })

  it('BookmarkSchema accepts an unknown or null status, so the bookmark stays in the list', () => {
    for (const materializationStatus of ['archived', null, 3]) {
      const item = { ...rawBookmark(), version: 2, materializationStatus }
      expect(BookmarkSchema.safeParse(item).success).toBe(true)
    }
  })
})
