import React, { FC, useEffect, useRef } from "react";
import type { ChatMessage, ToolStatus, ArtifactEvent } from "./types";

const ToolBadge: FC<{ status: ToolStatus }> = ({ status }) => {
  const icon = status.state === "pending" ? "⟳" : status.state === "ok" ? "✓" : "✕";
  const color =
    status.state === "pending" ? "#666" : status.state === "ok" ? "#2e7d32" : "#c62828";
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 5,
        fontSize: 11,
        color,
        padding: "2px 0",
      }}
    >
      <span style={{ fontFamily: "monospace" }}>{icon}</span>
      <span style={{ fontWeight: 500 }}>{status.name.replace(/_/g, " ")}</span>
      {status.summary && (
        <span style={{ color: "#888", fontStyle: "italic" }}>— {status.summary}</span>
      )}
    </div>
  );
};

const ArtifactCard: FC<{ artifact: ArtifactEvent }> = ({ artifact }) => (
  <div
    style={{
      marginTop: 6,
      padding: "6px 10px",
      background: "#e8f5e9",
      border: "1px solid #a5d6a7",
      borderRadius: 8,
      fontSize: 11,
      color: "#1b5e20",
      display: "flex",
      alignItems: "center",
      gap: 6,
    }}
  >
    <span>✓</span>
    <span style={{ fontWeight: 600 }}>{artifact.kind.replace(/_/g, " ")}</span>
  </div>
);

interface ChatLogProps {
  messages: ChatMessage[];
}

const ChatLog: FC<ChatLogProps> = ({ messages }) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#aaa",
          fontSize: 13,
          padding: 24,
          textAlign: "center",
        }}
      >
        Ask anything about cohorts for this dataset.
      </div>
    );
  }

  return (
    <div
      style={{
        flex: 1,
        overflowY: "auto",
        padding: "12px 16px",
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      {messages.map((msg) => (
        <div
          key={msg.id}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: msg.role === "user" ? "flex-end" : "flex-start",
          }}
        >
          <div
            style={{
              maxWidth: "85%",
              padding: "8px 12px",
              borderRadius: msg.role === "user" ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
              background: msg.role === "user" ? "#1976d2" : "#f0f0f0",
              color: msg.role === "user" ? "#fff" : "#111",
              fontSize: 13,
              lineHeight: 1.5,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}
          >
            {msg.content}
            {!msg.done && msg.role === "assistant" && (
              <span style={{ opacity: 0.4, marginLeft: 1 }}>▌</span>
            )}
          </div>

          {msg.toolStatuses.length > 0 && (
            <div style={{ marginTop: 4, paddingLeft: 2 }}>
              {msg.toolStatuses.map((t) => (
                <ToolBadge key={t.id} status={t} />
              ))}
            </div>
          )}

          {msg.artifacts.map((a, i) => (
            <ArtifactCard key={i} artifact={a} />
          ))}
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
};

export default ChatLog;
