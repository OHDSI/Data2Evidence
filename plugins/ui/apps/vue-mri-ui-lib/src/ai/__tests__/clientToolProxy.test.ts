import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  D2E_CLIENT_TOOLS_CHANGED_EVENT,
  publishClientToolProxy,
  type ClientToolRegistry,
} from '../clientToolProxy'

afterEach(() => {
  delete window.__d2eClientTools
})

describe('publishClientToolProxy', () => {
  it('re-reads the child registry for list and call', async () => {
    let child: ClientToolRegistry | undefined
    const teardown = publishClientToolProxy(() => child)

    expect(window.__d2eClientTools?.list()).toEqual([])

    const call = vi.fn().mockResolvedValue({ content: [{ type: 'text', text: 'current cohort' }] })
    child = {
      version: 1,
      list: () => [{ name: 'pa_get_current_cohort', description: 'Get it', inputSchema: { type: 'object' } }],
      call,
    }

    expect(window.__d2eClientTools?.list()).toEqual([
      { name: 'pa_get_current_cohort', description: 'Get it', inputSchema: { type: 'object' } },
    ])
    await expect(window.__d2eClientTools?.call('pa_get_current_cohort')).resolves.toEqual({
      content: [{ type: 'text', text: 'current cohort' }],
    })
    expect(call).toHaveBeenCalledWith('pa_get_current_cohort', undefined)

    teardown()
  })

  it('fails clearly when the child registry is unavailable', async () => {
    publishClientToolProxy(() => undefined)
    await expect(window.__d2eClientTools?.call('pa_get_current_cohort')).rejects.toThrow(
      'Data Exploration is not ready',
    )
  })

  it('announces publish and teardown without deleting a newer proxy', () => {
    const events: boolean[] = []
    const listener = (event: Event) => events.push((event as CustomEvent).detail.available)
    window.addEventListener(D2E_CLIENT_TOOLS_CHANGED_EVENT, listener)

    const teardownOld = publishClientToolProxy(() => undefined)
    const newer = window.__d2eClientTools
    const teardownNew = publishClientToolProxy(() => undefined)
    teardownOld()
    expect(window.__d2eClientTools).not.toBe(newer)
    teardownNew()

    expect(events).toEqual([true, true, false])
    window.removeEventListener(D2E_CLIENT_TOOLS_CHANGED_EVENT, listener)
  })
})
