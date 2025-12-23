import { canModifyBookmark } from '../BookmarkUtils'

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
