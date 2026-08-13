import React, { FC, useCallback, useEffect, useLayoutEffect, useState } from "react";
import classNames from "classnames";
import { Drawer } from "@portal/components";
import { useTranslation } from "../../contexts";
import { DrawerHeader } from "./DrawerHeader";
import { WelcomeView } from "./WelcomeView";
import { ConversationView } from "./ConversationView";
import { ChatComposer } from "./ChatComposer";
import {
  conceptSetAllId,
  conceptSetNoneId,
  conceptSetOptionId,
  conceptSetSelectedId,
  useCohortChat,
} from "./hooks/useCohortChat";
import { downloadChatHistory } from "./chatTranscript";
import { QuickReply } from "./types";
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
  const {
    messages,
    sendMessage,
    reset,
    isStreaming,
    isThinking,
    liveEditing,
    datasetMismatch,
    datasetMissing,
    pendingConceptSelection,
    toggleConcept,
    submitConceptSelection,
    pendingConceptSetChoice,
    toggleConceptSetOption,
    submitConceptSetChoice,
    error,
  } = useCohortChat();
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

  // The conversation only lives in this tab: a refresh, or starting a new one, takes it.
  // Saving it is how the reasoning behind a cohort built here survives that.
  const handleDownloadHistory = useCallback(() => downloadChatHistory(messages, getText), [messages, getText]);

  // Say plainly what the assistant can and cannot do right now. Live cohort
  // editing depends on Patient Analytics being mounted on the same dataset, which
  // changes as the user navigates — leaving that implicit means the assistant
  // looks broken when it is merely out of reach of the builder.
  let notice: string | undefined;
  if (error) {
    notice = toNoticeText(error.message);
  } else if (pendingConceptSelection) {
    notice = getText(i18nKeys.AI_ASSISTANT__CONCEPTS_AWAITING_REVIEW);
  } else if (pendingConceptSetChoice) {
    notice = getText(i18nKeys.AI_ASSISTANT__CONCEPT_SET_AWAITING_CHOICE);
  } else if (datasetMissing) {
    notice = getText(i18nKeys.AI_ASSISTANT__NO_DATASET);
  } else if (datasetMismatch) {
    notice = getText(i18nKeys.AI_ASSISTANT__DATASET_MISMATCH);
  } else if (!liveEditing) {
    notice = getText(i18nKeys.AI_ASSISTANT__NO_LIVE_EDITING);
  }

  // While a concept list is awaiting review the agent's turn is parked on that tool
  // call, and a free-text message sent into that gap would reach the model as a
  // transcript with an unanswered call in it. So the chips ARE the reply: answering
  // is the only way on, and it takes one click either way.
  let quickReplies: QuickReply[] | undefined;
  if (pendingConceptSelection) {
    quickReplies = [
      {
        id: "approve-concepts",
        label: getText(i18nKeys.AI_ASSISTANT__CONCEPTS_APPROVE),
        confirm: true,
        // Untick everything and "approve" would mean the opposite of what it says;
        // "None of these fit" is the button for that.
        disabled: pendingConceptSelection.selectedIds.length === 0,
      },
      { id: "reject-concepts", label: getText(i18nKeys.AI_ASSISTANT__CONCEPTS_REJECT), dismiss: true },
    ];
  } else if (pendingConceptSetChoice) {
    // The chips mirror the numbered cards one-for-one and ANSWER on click, where the
    // cards themselves only tick. That split is deliberate: picking a single set —
    // the common case, and the one the design shows — stays one click, while ticking
    // cards is how "1 and 3 but not 2" gets expressed once there are more than two.
    // Chip labels use the model's short form where it gave one; a full concept-set
    // name wraps a chip into a paragraph.
    const { toolCallId, options, selectedIds } = pendingConceptSetChoice;
    const isSubset = selectedIds.length > 0 && selectedIds.length < options.length;
    quickReplies = [
      // Only offered for a genuine subset: with everything ticked "Include all" says
      // the same thing, and with one ticked so does that set's own chip.
      ...(isSubset
        ? [
            {
              id: conceptSetSelectedId(toolCallId),
              label: getText(i18nKeys.AI_ASSISTANT__CONCEPT_SET_USE_SELECTED, [String(selectedIds.length)]),
              confirm: true,
            },
          ]
        : []),
      ...options.map((option, index) => ({
        id: conceptSetOptionId(toolCallId, option.conceptSetId),
        label: `${index + 1}. ${option.shortLabel ?? option.name}`,
        selected: selectedIds.includes(option.conceptSetId),
      })),
      ...(options.length > 1
        ? [
            {
              id: conceptSetAllId(toolCallId),
              label: `${options.length + 1}. ${
                options.length === 2
                  ? getText(i18nKeys.AI_ASSISTANT__CONCEPT_SET_BOTH_CHIP)
                  : getText(i18nKeys.AI_ASSISTANT__CONCEPT_SET_ALL_CHIP, [String(options.length)])
              }`,
              selected: selectedIds.length === options.length,
            },
          ]
        : []),
      { id: conceptSetNoneId(toolCallId), label: getText(i18nKeys.AI_ASSISTANT__CONCEPT_SET_REJECT), dismiss: true },
    ];
  }

  const onQuickReply = (reply: QuickReply) => {
    if (pendingConceptSelection) {
      submitConceptSelection(reply.id === "approve-concepts");
      return;
    }
    submitConceptSetChoice(reply.id);
  };

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
        onDownloadHistory={handleDownloadHistory}
        canDownloadHistory={hasConversation}
        data-test="test-build"
      />

      <div className="ai-assistant__content">
        {hasConversation ? (
          <ConversationView
            messages={messages}
            thinking={isThinking}
            // Cards tick; the chips below are what actually sends the answer.
            onSelectOption={(option) => toggleConceptSetOption(option.id)}
            onToggleConcept={toggleConcept}
          />
        ) : (
          <WelcomeView onSelectSuggestion={sendMessage} />
        )}
      </div>

      {notice && (
        <p className="ai-assistant__notice" role="status" data-testid="ai-assistant-notice">
          {notice}
        </p>
      )}

      <ChatComposer
        quickReplies={quickReplies}
        onQuickReply={onQuickReply}
        onSend={sendMessage}
        disabled={isStreaming || datasetMissing || Boolean(pendingConceptSelection) || Boolean(pendingConceptSetChoice)}
      />
    </Drawer>
  );
};
