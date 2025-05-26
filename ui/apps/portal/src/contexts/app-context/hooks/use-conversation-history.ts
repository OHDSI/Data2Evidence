import { useCallback, useContext } from "react";
import { AppContext, AppDispatchContext } from "../AppContext";
import { ACTION_TYPES } from "../reducer";
import { ChatItem } from "@nlux/react";

export const useConversationHistory = () => {
  const { conversationHistory } = useContext(AppContext);
  const dispatch = useContext(AppDispatchContext);

  const setConversationHistory = useCallback((conversationHistory: ChatItem[]) => {
    dispatch({ type: ACTION_TYPES.SET_CONVERSATION_HISTORY, payload: conversationHistory });
  }, []);

  return { conversationHistory, setConversationHistory };
};
