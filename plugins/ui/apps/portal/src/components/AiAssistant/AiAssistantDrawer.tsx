import React, { FC, useCallback, useEffect, useLayoutEffect, useState } from "react";
import classNames from "classnames";
import { Drawer } from "@portal/components";
import { ChatMessage, MessageOption, QuickReply } from "./types";
import { DrawerHeader } from "./DrawerHeader";
import { WelcomeView } from "./WelcomeView";
import { ConversationView } from "./ConversationView";
import { ChatComposer } from "./ChatComposer";
import { buildAssistantReply, buildQuickReplies, nextId } from "./mockConversation";
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

// The D2E AI assistant side drawer. UI-only proof of concept: conversation state lives
// here and assistant replies are canned. It is rendered persistently so the conversation
// survives closing/reopening the drawer (until the page is refreshed).
export const AiAssistantDrawer: FC<AiAssistantDrawerProps> = ({ open, onClose }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([]);
  const [expanded, setExpanded] = useState(false);
  const headerOffset = useHeaderOffset();

  const sendMessage = useCallback((text: string) => {
    const userMessage: ChatMessage = { id: nextId("user"), role: "user", text };
    setMessages((prev) => [...prev, userMessage, buildAssistantReply()]);
    setQuickReplies(buildQuickReplies());
  }, []);

  const handleNewConversation = useCallback(() => {
    setMessages([]);
    setQuickReplies([]);
  }, []);

  const handleSelectOption = useCallback(
    (option: MessageOption) => {
      sendMessage(option.index != null ? `${option.index}` : option.title);
    },
    [sendMessage]
  );

  const handleQuickReply = useCallback(
    (reply: QuickReply) => {
      sendMessage(reply.label);
    },
    [sendMessage]
  );

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
        onNewConversation={handleNewConversation}
        data-test="test-build"
      />

      <div className="ai-assistant__content">
        {hasConversation ? (
          <ConversationView messages={messages} onSelectOption={handleSelectOption} />
        ) : (
          <WelcomeView onSelectSuggestion={sendMessage} />
        )}
      </div>

      <ChatComposer
        quickReplies={hasConversation ? quickReplies : undefined}
        onSend={sendMessage}
        onQuickReply={handleQuickReply}
      />
    </Drawer>
  );
};
