import React, { FC, useState } from "react";
import ChatLog from "./ChatLog";
import Composer from "./Composer";
import { useAiAssistantSession } from "./hooks/useAiAssistantSession";
import { useStreamMessage } from "./hooks/useStreamMessage";
import { useActiveDataset } from "../../contexts";
import type { ChatMessage } from "./types";
import "./AiAssistantPanel.scss";

const AiAssistantPanel: FC = () => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  // Read the active dataset from the canonical portal context — same source as PluginContainer
  const { activeDataset } = useActiveDataset();
  const datasetId = activeDataset?.id || undefined;

  const { sessionId, loading: sessionLoading, error: sessionError, recreateSession } = useAiAssistantSession(datasetId);

  const { send, isStreaming } = useStreamMessage(sessionId, setMessages, recreateSession);

  const hasDataset = Boolean(datasetId);

  return (
    <>
      {/* Floating Action Button */}
      <button
        className="ai-fab"
        onClick={() => setOpen((v) => !v)}
        title={hasDataset ? "AI Assistant" : "Select a dataset to use AI Assistant"}
        aria-label="Toggle AI Assistant"
      >
        ✦
      </button>

      {/* Floating chat panel */}
      {open && (
        <div className="ai-panel" role="dialog" aria-label="AI Assistant">
          {/* Header */}
          <div className="ai-panel__header">
            <span className="ai-panel__title">
              <span className="ai-panel__icon">✦</span>
              AI Assistant
            </span>
            <button className="ai-panel__close" onClick={() => setOpen(false)} aria-label="Close AI Assistant">
              ✕
            </button>
          </div>

          {/* Status banners */}
          {!hasDataset && <div className="ai-panel__banner">Select a dataset to begin.</div>}
          {hasDataset && sessionLoading && <div className="ai-panel__banner">Starting session…</div>}
          {hasDataset && sessionError && <div className="ai-panel__banner ai-panel__banner--error">{sessionError}</div>}

          {/* Message list */}
          <ChatLog messages={messages} />

          {/* Input composer */}
          <Composer
            onSend={send}
            disabled={!sessionId || isStreaming}
            placeholder={
              !hasDataset
                ? "Select a dataset first…"
                : sessionLoading
                ? "Starting session…"
                : "Ask about cohorts… (Enter to send)"
            }
          />
        </div>
      )}
    </>
  );
};

export default AiAssistantPanel;
