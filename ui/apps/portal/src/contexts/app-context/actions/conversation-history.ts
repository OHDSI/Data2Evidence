import { ChatItem } from "@nlux/react";
import { AppState } from "../states";

export const setConversationHistory = (state: AppState, payload: ChatItem[]): AppState => {
  return {
    ...state,
    conversationHistory: [...state.conversationHistory, ...payload],
  };
};
