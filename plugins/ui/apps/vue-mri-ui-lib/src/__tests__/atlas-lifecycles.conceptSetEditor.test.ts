import { vi, describe, expect, it, beforeEach, afterEach } from 'vitest'

vi.mock('../lifecycles', () => ({
  bootstrap: vi.fn(),
  mount: vi.fn().mockResolvedValue('mounted'),
  unmount: vi.fn().mockResolvedValue(undefined),
  update: vi.fn().mockResolvedValue('updated'),
}))
vi.mock('../stores/notifications', () => ({
  useNotificationStore: () => ({ setAlertMessage: vi.fn(), setToastMessage: vi.fn() }),
}))

import { mount, unmount } from '../atlas-lifecycles'

const OPEN_EVENT = 'alp-terminology-open'
const MINUTE = 60 * 1000

type Request = (type: string, payload?: unknown) => Promise<unknown>

const mountWithBus = (request: Request) => mount({ messageBus: { request }, domElement: null })

const open = (
  onClose: (values?: unknown) => void,
  { mode = 'CONCEPT_SET', selectedConceptSetId }: { mode?: string; selectedConceptSetId?: string | number } = {}
) => window.dispatchEvent(new CustomEvent(OPEN_EVENT, { detail: { props: { mode, selectedConceptSetId, onClose } } }))

const deferred = <T>() => {
  let resolve!: (value: T) => void
  const promise = new Promise<T>(res => {
    resolve = res
  })
  return { promise, resolve }
}

describe('atlas-lifecycles: the Atlas3 concept set editor drawer', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => [] } as unknown as Response))
  })

  afterEach(async () => {
    await unmount({})
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('opens a new set for "+", and puts the saved set on the card as a WebAPI ref', async () => {
    const request = vi.fn().mockResolvedValue({ conceptSetId: 12, name: 'Type 2 diabetes' })
    const onClose = vi.fn()
    await mountWithBus(request)

    open(onClose)
    await vi.advanceTimersByTimeAsync(0)

    expect(request).toHaveBeenCalledWith('conceptSet:edit', {})
    expect(onClose).toHaveBeenCalledWith({ currentConceptSet: { id: 'webapi:12', name: 'Type 2 diabetes' } })
  })

  it('sends Atlas3 the bare WebAPI id for a set picked from the dropdown', async () => {
    const request = vi.fn().mockResolvedValue({ conceptSetId: 7, name: 'Asthma (edited)' })
    const onClose = vi.fn()
    await mountWithBus(request)

    open(onClose, { selectedConceptSetId: 'webapi:7' })
    await vi.advanceTimersByTimeAsync(0)

    expect(request).toHaveBeenCalledWith('conceptSet:edit', { conceptSetId: 7 })
    expect(onClose).toHaveBeenCalledWith({ currentConceptSet: { id: 'webapi:7', name: 'Asthma (edited)' } })
  })

  it('decodes an offset-encoded bare WebAPI id', async () => {
    const request = vi.fn().mockResolvedValue(null)
    await mountWithBus(request)

    open(vi.fn(), { selectedConceptSetId: '1000000007' })
    await vi.advanceTimersByTimeAsync(0)

    expect(request).toHaveBeenCalledWith('conceptSet:edit', { conceptSetId: 7 })
  })

  it.each(['legacy:5', '5', 5])(
    'does not ask Atlas3 to open legacy set %s, which is not in WebAPI',
    async selectedConceptSetId => {
      const request = vi.fn()
      const onClose = vi.fn()
      await mountWithBus(request)

      open(onClose, { selectedConceptSetId })
      await vi.advanceTimersByTimeAsync(0)

      expect(request).not.toHaveBeenCalled()
      expect(onClose).toHaveBeenCalledWith(undefined)
    }
  )

  it('does not send an id it cannot parse', async () => {
    const request = vi.fn()
    const onClose = vi.fn()
    await mountWithBus(request)

    open(onClose, { selectedConceptSetId: 'foo:1' })
    await vi.advanceTimersByTimeAsync(0)

    expect(request).not.toHaveBeenCalled()
    expect(onClose).toHaveBeenCalledWith(undefined)
  })

  it('treats an empty id as a new set', async () => {
    const request = vi.fn().mockResolvedValue(null)
    await mountWithBus(request)

    open(vi.fn(), { selectedConceptSetId: '' })
    await vi.advanceTimersByTimeAsync(0)

    expect(request).toHaveBeenCalledWith('conceptSet:edit', {})
  })

  it('reports no change when the drawer closes without a save', async () => {
    const onClose = vi.fn()
    await mountWithBus(vi.fn().mockResolvedValue(null))

    open(onClose)
    await vi.advanceTimersByTimeAsync(0)

    expect(onClose).toHaveBeenCalledWith(undefined)
  })

  it('waits for as long as the person edits', async () => {
    const reply = deferred<unknown>()
    const onClose = vi.fn()
    await mountWithBus(vi.fn().mockReturnValue(reply.promise))

    open(onClose)
    await vi.advanceTimersByTimeAsync(20 * MINUTE)
    expect(onClose).not.toHaveBeenCalled()

    reply.resolve({ conceptSetId: 3, name: 'Slow edit' })
    await vi.advanceTimersByTimeAsync(0)

    expect(onClose).toHaveBeenCalledWith({ currentConceptSet: { id: 'webapi:3', name: 'Slow edit' } })
  })

  it('closes cleanly on an Atlas3 without the handler, which times the request out', async () => {
    const request = vi.fn().mockRejectedValue(new Error('Request timeout for conceptSet:edit'))
    const onClose = vi.fn()
    await mountWithBus(request)

    open(onClose)
    await vi.advanceTimersByTimeAsync(0)

    expect(request).toHaveBeenCalledTimes(1)
    expect(onClose).toHaveBeenCalledWith(undefined)
  })

  it('does not call back into the app after it unmounts', async () => {
    const reply = deferred<unknown>()
    const onClose = vi.fn()
    await mountWithBus(vi.fn().mockReturnValue(reply.promise))

    open(onClose)
    await unmount({})
    reply.resolve({ conceptSetId: 1, name: 'Late' })
    await vi.advanceTimersByTimeAsync(0)

    expect(onClose).not.toHaveBeenCalled()
  })

  it('leaves CONCEPT_MULTI_SELECT alone, because the drawer edits sets, not a concept pick', async () => {
    const request = vi.fn()
    const onClose = vi.fn()
    await mountWithBus(request)

    open(onClose, { mode: 'CONCEPT_MULTI_SELECT' })
    await vi.advanceTimersByTimeAsync(0)

    expect(request).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
  })
})
