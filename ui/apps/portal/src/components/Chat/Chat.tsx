import React, { FC } from "react";
import { AiChat, useAsStreamAdapter } from "@nlux/react";
import { Drawer } from "@mui/material";
import "@nlux/themes/nova.css";

import { createSend, noOpSend } from "./Send";

export interface ChatProps {
  open?: boolean;
  onClose?: () => void;
  datasetId?: string;
}

const Chat: FC<ChatProps> = ({ open, onClose, datasetId }) => {
  const send = datasetId ? createSend(datasetId) : noOpSend;
  const adapter = useAsStreamAdapter(send, [datasetId]);

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
        adapter={adapter}
        displayOptions={{ colorScheme: "light" }}
        composerOptions={{ placeholder: "Type your query" }}
      />
    </Drawer>
  );
};

export default Chat;
