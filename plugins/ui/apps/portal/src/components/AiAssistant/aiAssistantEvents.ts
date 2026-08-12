// Window CustomEvents the assistant drawer uses to stay out of the way of embedded plugin
// apps. The plugins are separate bundles loaded by single-spa into this same window, so there
// is no shared module to import these from — the Patient Analytics side mirrors this contract
// in apps/vue-mri-ui-lib/src/utils/aiAssistantPaneBridge.ts. Keep the two in step.

// Portal → plugins: the assistant drawer was opened or closed.
export const AI_ASSISTANT_TOGGLE_EVENT = "alp-ai-assistant-toggle";

// Plugins → portal: a plugin re-opened a pane that needs the width the assistant is using.
export const PA_LEFT_PANE_OPENED_EVENT = "alp-pa-left-pane-opened";

export interface AiAssistantToggleDetail {
  open: boolean;
}

declare global {
  interface Window {
    // Mirror of the last toggle event, so a plugin that mounts while the drawer is already
    // open (it missed the event) can still read the current state.
    __alpAiAssistantOpen?: boolean;
  }
}

export function broadcastAiAssistantOpen(open: boolean): void {
  window.__alpAiAssistantOpen = open;
  window.dispatchEvent(new CustomEvent<AiAssistantToggleDetail>(AI_ASSISTANT_TOGGLE_EVENT, { detail: { open } }));
}
