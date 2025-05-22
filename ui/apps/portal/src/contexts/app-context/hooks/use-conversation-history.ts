import { useCallback, useContext } from "react";
import { AppContext, AppDispatchContext } from "../AppContext";
import { ACTION_TYPES } from "../reducer";
import { ConversationHistoryState } from "../states";

export const useConversationHistory = () => {
  const { conversationHistory } = useContext(AppContext);
  const dispatch = useContext(AppDispatchContext);

  const setConversationHistory = useCallback((conversationHistory: ConversationHistoryState) => {
    dispatch({ type: ACTION_TYPES.SET_CONVERSATION_HISTORY, payload: conversationHistory });
  }, []);

  return { conversationHistory, setConversationHistory };
};
