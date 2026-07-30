// Bridge between the portal's AI assistant drawer (React, apps/portal) and the Patient
// Analytics splitter. Both run in the same window under single-spa but are separate bundles
// with no shared module graph, so window CustomEvents are the only channel they have.
//
// The two sides must never claim the page width at the same time: the assistant docks on the
// right and insets the page content, while the PA left pane holds the filters. Opening one
// therefore collapses the other.
//
// Event names and payloads are mirrored in
// apps/portal/src/components/AiAssistant/aiAssistantEvents.ts — keep the two in step.

// Portal → plugins: the assistant drawer was opened or closed.
export const AI_ASSISTANT_TOGGLE_EVENT = 'alp-ai-assistant-toggle'

// Plugins → portal: a plugin re-opened a pane that needs the width the assistant is using.
export const PA_LEFT_PANE_OPENED_EVENT = 'alp-pa-left-pane-opened'

export interface AiAssistantToggleDetail {
  open: boolean
}

declare global {
  interface Window {
    // Mirror of the last toggle event, so a plugin that mounts while the drawer is already
    // open (it missed the event) can still read the current state.
    __alpAiAssistantOpen?: boolean
  }
}

export function isAiAssistantOpen(): boolean {
  return Boolean(window.__alpAiAssistantOpen)
}

export function notifyLeftPaneOpened(): void {
  window.dispatchEvent(new CustomEvent(PA_LEFT_PANE_OPENED_EVENT))
}

// Returns a teardown function; call it when the host component unmounts.
export function onAiAssistantToggle(handler: (open: boolean) => void): () => void {
  const listener = (event: Event) => {
    const detail = (event as CustomEvent<AiAssistantToggleDetail>).detail
    handler(Boolean(detail?.open))
  }
  window.addEventListener(AI_ASSISTANT_TOGGLE_EVENT, listener)
  return () => window.removeEventListener(AI_ASSISTANT_TOGGLE_EVENT, listener)
}
