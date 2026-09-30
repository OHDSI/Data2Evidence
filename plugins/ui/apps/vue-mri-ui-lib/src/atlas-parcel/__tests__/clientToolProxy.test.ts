import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  publishPaClientToolProxy,
  type ClientToolRegistry,
  type ClientToolResult,
} from '../clientToolProxy'

type PaFrameWindow = Window & { __d2ePaTools?: ClientToolRegistry }

const createFrame = () => {
  const frame = document.createElement('iframe')
  document.body.appendChild(frame)
  return frame
}

const frameWindow = (frame: HTMLIFrameElement) => frame.contentWindow as PaFrameWindow

const createRegistry = (resultText = 'done'): ClientToolRegistry => ({
  version: 1,
  list: vi.fn(() => [
    {
      name: 'pa_get_current_cohort',
      description: 'Read the current cohort',
      inputSchema: { type: 'object' },
    },
  ]),
  call: vi.fn(async (): Promise<ClientToolResult> => ({
    content: [{ type: 'text', text: resultText }],
  })),
})

describe('publishPaClientToolProxy', () => {
  afterEach(() => {
    delete window.__pythiaClientTools
    document.body.replaceChildren()
    vi.restoreAllMocks()
  })

  it('looks up the iframe registry live for each list call', () => {
    const frame = createFrame()
    publishPaClientToolProxy(frame)

    expect(window.__pythiaClientTools?.list()).toEqual([])

    const firstRegistry = createRegistry()
    frameWindow(frame).__d2ePaTools = firstRegistry
    expect(window.__pythiaClientTools?.list()).toEqual(firstRegistry.list())

    const replacementRegistry = createRegistry()
    frameWindow(frame).__d2ePaTools = replacementRegistry
    window.__pythiaClientTools?.list()

    expect(replacementRegistry.list).toHaveBeenCalled()
  })

  it('forwards tool names and arguments and returns the iframe result', async () => {
    const frame = createFrame()
    const registry = createRegistry('cohort result')
    frameWindow(frame).__d2ePaTools = registry
    publishPaClientToolProxy(frame)

    const args = { cohortId: 'cohort-1' }
    const result = await window.__pythiaClientTools?.call('pa_get_current_cohort', args)

    expect(registry.call).toHaveBeenCalledWith('pa_get_current_cohort', args)
    expect(result).toEqual({ content: [{ type: 'text', text: 'cohort result' }] })
  })

  it('throws when the iframe registry is unavailable', () => {
    const frame = createFrame()
    publishPaClientToolProxy(frame)

    expect(() => window.__pythiaClientTools?.call('pa_get_current_cohort')).toThrow(
      'PA client tools are unavailable.'
    )
  })

  it('removes its proxy during teardown', () => {
    const teardown = publishPaClientToolProxy(createFrame())

    teardown()

    expect(window.__pythiaClientTools).toBeUndefined()
  })

  it('does not remove a newer proxy during stale teardown', () => {
    const staleTeardown = publishPaClientToolProxy(createFrame())
    publishPaClientToolProxy(createFrame())
    const currentProxy = window.__pythiaClientTools

    staleTeardown()

    expect(window.__pythiaClientTools).toBe(currentProxy)
  })
})
