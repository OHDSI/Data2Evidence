import React, { FC, useEffect, useRef } from "react";
import { ChatMessage, MessageOption } from "./types";
import { MessageBubble } from "./MessageBubble";

interface ConversationViewProps {
  messages: ChatMessage[];
  onSelectOption?: (option: MessageOption) => void;
}

// Scrollable list of chat bubbles that keeps the latest message in view.
export const ConversationView: FC<ConversationViewProps> = ({ messages, onSelectOption }) => {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  return (
    <div className="ai-assistant__conversation" data-testid="ai-assistant-conversation">
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} onSelectOption={onSelectOption} />
      ))}
      <div ref={endRef} />
    </div>
  );
};
