import React, { FC, useEffect, useRef } from "react";
import { ChatMessage, MessageOption } from "./types";
import { MessageBubble } from "./MessageBubble";

interface ConversationViewProps {
  messages: ChatMessage[];
  onSelectOption?: (option: MessageOption) => void;
  onToggleConcept?: (toolCallId: string, conceptId: number) => void;
}

// How close to the bottom still counts as "following along". A couple of lines of
// slack absorbs sub-pixel scroll heights and a stray wheel notch.
const FOLLOW_THRESHOLD_PX = 48;

// List of chat bubbles that keeps the latest message in view. The surrounding
// .ai-assistant__content is the scroll container.
export const ConversationView: FC<ConversationViewProps> = ({ messages, onSelectOption, onToggleConcept }) => {
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
  }, [messages]);

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
      <div ref={endRef} />
    </div>
  );
};
