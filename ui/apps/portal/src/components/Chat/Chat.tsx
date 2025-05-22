import React, { FC, useMemo, useCallback } from "react";
import { AiChat, useAiChatApi, useAsStreamAdapter } from "@nlux/react";
import { Drawer } from "@mui/material";
import "@nlux/themes/nova.css";

import { createSend, noOpSend } from "./Send";
import { useConversationHistory } from "../../contexts";
export interface ChatProps {
  open?: boolean;
  onClose?: () => void;
  datasetId?: string;
  currentContent: () => any;
}

const Chat: FC<ChatProps> = ({ open, onClose, datasetId, currentContent }) => {
  const api = useAiChatApi();
  const content = currentContent();

  const send = useMemo(() => {
    return datasetId ? createSend(datasetId, content) : noOpSend;
  }, [datasetId, content]);

  const adapter = useAsStreamAdapter(send, [send]);
  const { conversationHistory, setConversationHistory } = useConversationHistory();

  const handleMessage = useCallback(
    (role: "assistant" | "user", message: string | string[]) => {
      setConversationHistory({
        role,
        message: Array.isArray(message) ? message.join("\n") : message,
      });
    },
    [setConversationHistory]
  );

  const onMessageReceived = useCallback(
    (payload: any) => {
      handleMessage("assistant", payload.message);
    },
    [handleMessage]
  );

  const onMessageSent = useCallback(
    (payload: any) => {
      handleMessage("user", payload.message);
    },
    [handleMessage]
  );

  const memoizedHistory = useMemo(() => {
    return conversationHistory.map((item) => ({
      role: item.role as "assistant" | "user",
      message: item.message,
    }));
  }, [open]);

  if (!datasetId) {
    return null;
  }

  return (
    <Drawer
      variant="temporary"
      open={open}
      onClose={onClose}
      anchor="right"
      PaperProps={{
        sx: { width: "35%", overflowY: "hidden" },
      }}
    >
      <AiChat
        api={api}
        adapter={adapter}
        displayOptions={{ colorScheme: "light" }}
        composerOptions={{ placeholder: "Type your query" }}
        events={{ messageReceived: onMessageReceived, messageSent: onMessageSent }}
        messageOptions={{ waitTimeBeforeStreamCompletion: "never" }}
        initialConversation={memoizedHistory}
      />
    </Drawer>
  );
};

export default Chat;
