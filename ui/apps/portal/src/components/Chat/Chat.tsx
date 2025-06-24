import React, { FC, useMemo, useCallback, useState } from "react";
import { AiChat, ChatItem, useAiChatApi, useAsStreamAdapter } from "@nlux/react";
import Collapse from "@mui/material/Collapse";
import "@nlux/themes/nova.css";

import { createSend, noOpSend } from "./Send";
import { useConversationHistory } from "../../contexts";
import "./Chat.scss";

export interface ChatProps {
  open?: boolean;
  onClose?: (chatHistory: ChatItem[]) => void;
  datasetId?: string;
  currentContent: () => any;
}

const Chat: FC<ChatProps> = ({ open, onClose, datasetId, currentContent }) => {
  const api = useAiChatApi();
  const content = currentContent();
  const [history, setHistory] = useState<ChatItem[]>([]);

  const send = useMemo(() => {
    return datasetId ? createSend(datasetId, content) : noOpSend;
  }, [datasetId, content]);

  const adapter = useAsStreamAdapter(send, [send]);
  const { conversationHistory } = useConversationHistory();

  const handleMessage = useCallback((role: "assistant" | "user", message: string | string[]) => {
    const newMessage = {
      role,
      message: Array.isArray(message) ? message.join("") : message,
    };
    setHistory((prev) => [...prev, newMessage]);
  }, []);

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

  const handleClose = useCallback(() => {
    if (onClose) {
      setHistory([]);
      onClose(history);
    }
  }, [onClose, history]);

  if (!datasetId) {
    return null;
  }

  return (
    <Collapse
      className="chat-container"
      in={open}
      onExited={() => {
        if (onClose) onClose(history);
      }}
      unmountOnExit
    >
      <AiChat
        api={api}
        adapter={adapter}
        displayOptions={{ colorScheme: "light" }}
        composerOptions={{ placeholder: "Type your query" }}
        events={{ messageReceived: onMessageReceived, messageSent: onMessageSent }}
        messageOptions={{ waitTimeBeforeStreamCompletion: 3000 }}
        initialConversation={conversationHistory}
      />
    </Collapse>
  );
};

export default Chat;
