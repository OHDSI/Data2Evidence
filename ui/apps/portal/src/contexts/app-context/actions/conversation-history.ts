import { AppState } from "../states";
import { ConversationHistoryState } from "../states";

export const setConversationHistory = (state: AppState, payload: ConversationHistoryState): AppState => {
  return {
    ...state,
    conversationHistory: [...state.conversationHistory, payload],
  };
};
