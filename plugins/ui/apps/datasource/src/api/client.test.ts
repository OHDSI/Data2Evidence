import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { apiFetch } from './client'

describe('apiFetch', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('attaches the Bearer token and returns parsed JSON on success', async () => {
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ hello: 'world' }),
    })

    const result = await apiFetch<{ hello: string }>('/system-portal/dataset', { token: 'tok-123' })

    expect(result).toEqual({ hello: 'world' })
    expect(fetchMock).toHaveBeenCalledWith(
      '/system-portal/dataset',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({ Authorization: 'Bearer tok-123' }),
      }),
    )
  })

  it('omits the Authorization header when token is null', async () => {
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve({}) })

    await apiFetch('/system-portal/dataset', { token: null })

    const [, init] = fetchMock.mock.calls[0]
    expect(init.headers.Authorization).toBeUndefined()
  })

  it('sends a JSON body on POST', async () => {
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>
    fetchMock.mockResolvedValue({ ok: true, status: 201, json: () => Promise.resolve({}) })

    await apiFetch('/usermgmt/api/study/access-request', {
      method: 'POST',
      body: { userId: 'u1', studyId: 's1', role: 'RESEARCHER' },
      token: 'tok-123',
    })

    const [, init] = fetchMock.mock.calls[0]
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body)).toEqual({ userId: 'u1', studyId: 's1', role: 'RESEARCHER' })
    expect(init.headers['Content-Type']).toBe('application/json')
  })

  it('throws on a non-ok response', async () => {
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>
    fetchMock.mockResolvedValue({ ok: false, status: 403, statusText: 'Forbidden', json: () => Promise.resolve({}) })

    await expect(apiFetch('/system-portal/dataset', { token: null })).rejects.toThrow('403')
  })
})
