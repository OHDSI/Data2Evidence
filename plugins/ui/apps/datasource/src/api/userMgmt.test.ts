import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { getUserGroupList } from './userMgmt'

const groups = { userId: 'u-1', alp_role_study_researcher: ['ds-1'] }
const syncFlags = (fetchMock: ReturnType<typeof vi.fn>) =>
  fetchMock.mock.calls.map(([, init]) => JSON.parse(init.body).sync)

describe('getUserGroupList', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('reads without syncing roles for a provisioned user', async () => {
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve(groups) })

    expect(await getUserGroupList('idp-1', 'tok')).toEqual(groups)
    expect(syncFlags(fetchMock)).toEqual([false])
  })

  it('retries once with sync when the user is not provisioned yet', async () => {
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>
    fetchMock
      .mockResolvedValueOnce({ ok: false, status: 500, statusText: 'Internal Server Error' })
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve(groups) })

    expect(await getUserGroupList('idp-1', 'tok')).toEqual(groups)
    expect(syncFlags(fetchMock)).toEqual([false, true])
  })
})
