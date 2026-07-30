import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  AI_ASSISTANT_TOGGLE_EVENT,
  PA_LEFT_PANE_OPENED_EVENT,
  isAiAssistantOpen,
  notifyLeftPaneOpened,
  onAiAssistantToggle,
} from '../aiAssistantPaneBridge'

describe('utils/aiAssistantPaneBridge', () => {
  afterEach(() => {
    delete window.__alpAiAssistantOpen
  })

  it('reports the assistant open state to the handler', () => {
    const handler = vi.fn()
    const stop = onAiAssistantToggle(handler)

    window.dispatchEvent(new CustomEvent(AI_ASSISTANT_TOGGLE_EVENT, { detail: { open: true } }))
    window.dispatchEvent(new CustomEvent(AI_ASSISTANT_TOGGLE_EVENT, { detail: { open: false } }))

    expect(handler.mock.calls).toEqual([[true], [false]])

    stop()
  })

  // The portal is a separate bundle; a malformed payload must not throw inside PA's mounted hook.
  it('treats a missing payload as closed', () => {
    const handler = vi.fn()
    const stop = onAiAssistantToggle(handler)

    window.dispatchEvent(new CustomEvent(AI_ASSISTANT_TOGGLE_EVENT))

    expect(handler).toHaveBeenCalledWith(false)

    stop()
  })

  it('stops listening once torn down', () => {
    const handler = vi.fn()
    onAiAssistantToggle(handler)()

    window.dispatchEvent(new CustomEvent(AI_ASSISTANT_TOGGLE_EVENT, { detail: { open: true } }))

    expect(handler).not.toHaveBeenCalled()
  })

  // Patient Analytics can mount long after the drawer was opened, so the current state has to
  // be readable and not only observable as an event.
  it('reads the current assistant state for late mounters', () => {
    expect(isAiAssistantOpen()).toBe(false)

    window.__alpAiAssistantOpen = true

    expect(isAiAssistantOpen()).toBe(true)
  })

  it('announces that the left pane was re-opened', () => {
    const listener = vi.fn()
    window.addEventListener(PA_LEFT_PANE_OPENED_EVENT, listener)

    notifyLeftPaneOpened()

    expect(listener).toHaveBeenCalledTimes(1)

    window.removeEventListener(PA_LEFT_PANE_OPENED_EVENT, listener)
  })
})
