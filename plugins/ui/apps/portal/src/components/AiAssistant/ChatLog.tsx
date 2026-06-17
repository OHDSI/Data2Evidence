import { FC, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import type { ChatMessage, ToolStatus, ArtifactEvent } from "./types";

// Canonical cohort deep link is /d2e/portal/researcher/cohort?...
// (wizards/src/utils/deepLinks.ts). Keep the optional /d2e prefix inside the
// match so it's part of the URL, not spilled into preceding text.
const COHORT_URL_RE = /(?:\/d2e)?\/portal\/researcher\/cohort\?[^\s")']+/g;

// Turn bare cohort URLs into markdown links so they render as a "View Cohort"
// anchor (handled by the custom `a` component below). Skip URLs already inside
// a markdown link target — i.e. preceded by "](" — to avoid double-wrapping.
const linkifyCohortUrls = (content: string): string =>
  content.replace(COHORT_URL_RE, (url, offset: number, full: string) =>
    full.slice(Math.max(0, offset - 2), offset) === "](" ? url : `[View Cohort](${url})`
  );

const isCohortUrl = (href?: string): boolean =>
  !!href && new RegExp(COHORT_URL_RE.source).test(href);

const markdownComponents: Components = {
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        color: "inherit",
        textDecoration: "underline",
        fontWeight: 600,
      }}
    >
      {isCohortUrl(href) ? "View Cohort" : children}
    </a>
  ),
  // Tighten default margins so markdown fits inside the chat bubble.
  p: ({ children }) => <p style={{ margin: "0 0 8px" }}>{children}</p>,
  ul: ({ children }) => <ul style={{ margin: "0 0 8px", paddingLeft: 18 }}>{children}</ul>,
  ol: ({ children }) => <ol style={{ margin: "0 0 8px", paddingLeft: 18 }}>{children}</ol>,
  li: ({ children }) => <li style={{ marginBottom: 2 }}>{children}</li>,
  code: ({ inline, children }) =>
    inline ? (
      <code
        style={{
          background: "rgba(0,0,0,0.06)",
          borderRadius: 4,
          padding: "1px 4px",
          fontFamily: "monospace",
          fontSize: "0.9em",
        }}
      >
        {children}
      </code>
    ) : (
      <pre
        style={{
          background: "rgba(0,0,0,0.06)",
          borderRadius: 6,
          padding: 8,
          overflowX: "auto",
          margin: "0 0 8px",
          fontSize: 12,
        }}
      >
        <code style={{ fontFamily: "monospace" }}>{children}</code>
      </pre>
    ),
};

const MarkdownContent: FC<{ content: string }> = ({ content }) => (
  <ReactMarkdown components={markdownComponents}>{linkifyCohortUrls(content)}</ReactMarkdown>
);

const ToolBadge: FC<{ status: ToolStatus }> = ({ status }) => {
  const icon = status.state === "pending" ? "⟳" : status.state === "ok" ? "✓" : "✕";
  const color =
    status.state === "pending"
      ? "var(--color-ui-light-text, #595757)"
      : status.state === "ok"
      ? "var(--color-feedback-success, #2e7d32)"
      : "var(--color-mri-error, #c00000)";
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
        <span style={{ color: "var(--color-ui-light-text, #595757)", fontStyle: "italic" }}>— {status.summary}</span>
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
      color: "var(--color-feedback-success, #1b5e20)",
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
          color: "var(--color-ui-extra-light-text, #bbbbbb)",
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
              background:
                msg.role === "user"
                  ? "var(--color-primary, #000080)"
                  : "var(--color-mri-select-list-item-hoverable-light, #f0f0f0)",
              color: msg.role === "user" ? "var(--color-ui-lightest-bg, #ffffff)" : "var(--color-ui-darkest-text, #000080)",
              fontSize: 13,
              lineHeight: 1.5,
              whiteSpace: msg.role === "user" ? "pre-wrap" : "normal",
              wordBreak: "break-word",
            }}
          >
            {msg.role === "user" ? msg.content : <MarkdownContent content={msg.content} />}
            {!msg.done && msg.role === "assistant" && <span style={{ opacity: 0.4, marginLeft: 1 }}>▌</span>}
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
