import React, { createContext, FC, ReactNode, useContext, useState } from "react";
import { ChatItem } from "@nlux/react";

interface ConversationHistoryContextValue {
  conversationHistory: ChatItem[];
  setConversationHistory: (history: ChatItem[]) => void;
}

const ConversationHistoryContext = createContext<ConversationHistoryContextValue | undefined>(undefined);

export const ConversationHistoryProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [conversationHistory, setConversationHistory] = useState<ChatItem[]>([]);

  return (
    <ConversationHistoryContext.Provider value={{ conversationHistory, setConversationHistory }}>
      {children}
    </ConversationHistoryContext.Provider>
  );
};

export const useConversationHistory = (): ConversationHistoryContextValue => {
  const context = useContext(ConversationHistoryContext);
  if (!context) {
    throw new Error("useConversationHistory must be used within a ConversationHistoryProvider");
  }
  return context;
};
