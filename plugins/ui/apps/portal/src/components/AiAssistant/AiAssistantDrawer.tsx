import React, { FC, useEffect, useLayoutEffect, useState } from "react";
import classNames from "classnames";
import { Drawer } from "@portal/components";
import { useTranslation } from "../../contexts";
import { DrawerHeader } from "./DrawerHeader";
import { WelcomeView } from "./WelcomeView";
import { ConversationView } from "./ConversationView";
import { ChatComposer } from "./ChatComposer";
import { useCohortChat } from "./hooks/useCohortChat";
import { broadcastAiAssistantOpen, PA_LEFT_PANE_OPENED_EVENT } from "./aiAssistantEvents";
import "./AiAssistantDrawer.scss";

interface AiAssistantDrawerProps {
  open: boolean;
  onClose: () => void;
}

// Kept in step with the width transitions in AiAssistantDrawer.scss.
const PANEL_TRANSITION_MS = 250;

// Reads the sticky portal header height so the drawer sits directly below the navbar
// (matching the Figma layout where the panel starts under the top nav).
const useHeaderOffset = (): number => {
  const [offset, setOffset] = useState(72);

  useLayoutEffect(() => {
    const measure = () => {
      const header = document.querySelector<HTMLElement>(".portal__header");
      if (header) setOffset(header.offsetHeight);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  return offset;
};

// The agent transport surfaces a failed response's BODY as error.message, and not
// every failure comes from our JSON error handler: a 413/502 from the express or
// proxy layer is an HTML page, which rendered here as a wall of markup that buried
// the actual reason. Pull the readable text out and cap it.
export const toNoticeText = (message: string): string => {
  let text = message.trim();
  if (/^<(!doctype|html)/i.test(text)) {
    // Express's error page puts the message + stack in a <pre>; the first line is
    // the error itself ("PayloadTooLargeError: request entity too large").
    const pre = /<pre>([\s\S]*?)<\/pre>/i.exec(text);
    text = (pre ? pre[1] : text.replace(/<[^>]*>/g, " "))
      .replace(/<br\s*\/?>[\s\S]*/i, "")
      .replace(/<[^>]*>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }
  return text.length > 300 ? `${text.slice(0, 300)}…` : text;
};

// The D2E AI assistant side drawer. Conversation state lives in useCohortChat, which
// talks to the cohort agent and runs the live Patient Analytics tools in this tab. It
// is rendered persistently so the conversation survives closing/reopening the drawer
// (until the page is refreshed).
export const AiAssistantDrawer: FC<AiAssistantDrawerProps> = ({ open, onClose }) => {
  const { getText, i18nKeys } = useTranslation();
  const { messages, sendMessage, reset, isStreaming, liveEditing, datasetMismatch, datasetMissing, error } =
    useCohortChat();
  const [expanded, setExpanded] = useState(false);
  const headerOffset = useHeaderOffset();

  // While docked the panel takes width away from the page content. Embedded plugin apps only
  // re-layout on window resize, so nudge them once the panel has finished sliding. Harmless
  // when the panel is floating and the content width has not actually changed.
  useEffect(() => {
    const timer = window.setTimeout(() => window.dispatchEvent(new Event("resize")), PANEL_TRANSITION_MS);
    return () => window.clearTimeout(timer);
  }, [open, expanded]);

  // Tell the embedded plugin apps whether the panel is claiming page width, so they can give
  // way. Patient Analytics collapses its left filter pane while the panel is open.
  useEffect(() => {
    broadcastAiAssistantOpen(open);
  }, [open]);

  // Should the drawer be unmounted while open (portal type change, feature gate closing), the
  // flag it leaves behind would have plugins making room for a panel that is no longer there.
  useEffect(() => () => broadcastAiAssistantOpen(false), []);

  // The other half of that handshake: a plugin re-opening the pane it gave up takes the width
  // back, so the panel steps aside.
  useEffect(() => {
    if (!open) return undefined;
    const onPaneOpened = () => onClose();
    window.addEventListener(PA_LEFT_PANE_OPENED_EVENT, onPaneOpened);
    return () => window.removeEventListener(PA_LEFT_PANE_OPENED_EVENT, onPaneOpened);
  }, [open, onClose]);

  // Close on Escape, mirroring dialog behaviour.
  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  const hasConversation = messages.length > 0;

  // Say plainly what the assistant can and cannot do right now. Live cohort
  // editing depends on Patient Analytics being mounted on the same dataset, which
  // changes as the user navigates — leaving that implicit means the assistant
  // looks broken when it is merely out of reach of the builder.
  let notice: string | undefined;
  if (error) {
    notice = toNoticeText(error.message);
  } else if (datasetMissing) {
    notice = getText(i18nKeys.AI_ASSISTANT__NO_DATASET);
  } else if (datasetMismatch) {
    notice = getText(i18nKeys.AI_ASSISTANT__DATASET_MISMATCH);
  } else if (!liveEditing) {
    notice = getText(i18nKeys.AI_ASSISTANT__NO_LIVE_EDITING);
  }

  return (
    <Drawer
      variant="persistent"
      anchor="right"
      open={open}
      className={classNames("ai-assistant", {
        // Drives the content inset while docked — see AiAssistantDrawer.scss.
        "ai-assistant--open": open,
        "ai-assistant--expanded": expanded,
      })}
      PaperProps={{
        className: "ai-assistant__paper",
        style: { top: headerOffset, height: `calc(100% - ${headerOffset}px)` },
      }}
      data-testid="ai-assistant-drawer"
    >
      <DrawerHeader
        expanded={expanded}
        onClose={onClose}
        onToggleExpand={() => setExpanded((prev) => !prev)}
        onNewConversation={reset}
        data-test="test-build"
      />

      <div className="ai-assistant__content">
        {hasConversation ? <ConversationView messages={messages} /> : <WelcomeView onSelectSuggestion={sendMessage} />}
      </div>

      {notice && (
        <p className="ai-assistant__notice" role="status" data-testid="ai-assistant-notice">
          {notice}
        </p>
      )}

      <ChatComposer onSend={sendMessage} disabled={isStreaming || datasetMissing} />
    </Drawer>
  );
};
