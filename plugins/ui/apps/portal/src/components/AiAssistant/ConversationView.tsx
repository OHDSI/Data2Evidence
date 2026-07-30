import React, { FC, useEffect, useRef } from "react";
import { useTranslation } from "../../contexts";
import { ChatMessage, MessageOption } from "./types";
import { MessageBubble } from "./MessageBubble";

interface ConversationViewProps {
  messages: ChatMessage[];
  /** A turn is in flight with nothing else on screen to show it — see useCohortChat. */
  thinking?: boolean;
  onSelectOption?: (option: MessageOption) => void;
  onToggleConcept?: (toolCallId: string, conceptId: number) => void;
}

/**
 * What the panel says while the model is working and nothing else is rendering:
 * between the prompt going out and the first token, and again after a tool returns
 * while the model decides what to do with it. Both gaps take seconds on a cohort
 * query, and an empty panel through them reads as a request that went nowhere.
 *
 * It sits at the tail of the conversation, where the reply it precedes will appear,
 * and is built like a tool row — same spinner, same status slot — because it belongs
 * to the same trail of "here is what is happening" lines as "Running search_concepts".
 */
const ThinkingRow: FC = () => {
  const { getText, i18nKeys } = useTranslation();

  return (
    <div className="ai-assistant__thinking" role="status" data-testid="ai-assistant-thinking">
      <span className="ai-assistant__thinking-status" aria-hidden="true">
        <span className="ai-assistant__thinking-spinner" />
      </span>
      {getText(i18nKeys.AI_ASSISTANT__THINKING)}
    </div>
  );
};

// How close to the bottom still counts as "following along". A couple of lines of
// slack absorbs sub-pixel scroll heights and a stray wheel notch.
const FOLLOW_THRESHOLD_PX = 48;

// List of chat bubbles that keeps the latest message in view. The surrounding
// .ai-assistant__content is the scroll container.
export const ConversationView: FC<ConversationViewProps> = ({
  messages,
  thinking,
  onSelectOption,
  onToggleConcept,
}) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  // The reply streams in a chunk at a time, so this effect runs on every token. Pinning to
  // the bottom unconditionally would drag the user back down mid-scroll each time they went
  // up to re-read something, so follow the tail only while they are already at it.
  const following = useRef(true);

  useEffect(() => {
    const scroller = rootRef.current?.closest<HTMLElement>(".ai-assistant__content");
    if (!scroller) return undefined;
    const onScroll = () => {
      const distanceToBottom = scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight;
      following.current = distanceToBottom <= FOLLOW_THRESHOLD_PX;
    };
    scroller.addEventListener("scroll", onScroll, { passive: true });
    return () => scroller.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    // "nearest" scrolls the conversation only as far as it has to, and leaves scroll
    // containers that already have the tail in view — the page behind the drawer — alone.
    if (following.current) endRef.current?.scrollIntoView({ block: "nearest" });
    // `thinking` is in here too: the row appears and disappears at the tail, and a
    // conversation already filling the panel would otherwise hide it below the fold.
  }, [messages, thinking]);

  return (
    <div className="ai-assistant__conversation" ref={rootRef} data-testid="ai-assistant-conversation">
      {messages.map((message) => (
        <MessageBubble
          key={message.id}
          message={message}
          onSelectOption={onSelectOption}
          onToggleConcept={onToggleConcept}
        />
      ))}
      {thinking && <ThinkingRow />}
      <div ref={endRef} />
    </div>
  );
};
