import { useState } from "react";
import { PortalProps } from "./types";

export function ProjectsPage(props: PortalProps) {
  const [lastNotification, setLastNotification] = useState<string | null>(null);

  const handleSendNotification = () => {
    const message = `New update from Projects (dataset: ${props.datasetId || "unknown"})`;

    // Dispatch cross-app event — the demo-notifications app listens for this
    // This is the same pattern as: window.dispatchEvent(new CustomEvent("alp-terminology-open", ...))
    window.dispatchEvent(
      new CustomEvent("demo-notification-open", {
        detail: {
          props: {
            message,
            source: "demo-projects",
            timestamp: new Date().toISOString(),
            onClose: () => {
              console.log("[Demo Projects] Notification drawer closed");
            },
          },
        },
      })
    );

    setLastNotification(message);
  };

  return (
    <div style={{ padding: "24px", fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ fontSize: "24px", marginBottom: "8px", color: "#1a1a2e" }}>
        Demo Projects
      </h1>
      <p style={{ color: "#666", fontSize: "14px", marginBottom: "16px" }}>
        Cross-app communication demo
      </p>

      {/* Badges — dataset + demo message */}
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "24px" }}>
        <div style={{
          padding: "4px 12px", borderRadius: "16px",
          backgroundColor: "#e8f5e9", color: "#2e7d32", fontSize: "13px",
        }}>
          Dataset: <strong>{props.datasetId || "none"}</strong>
        </div>
        {props.demoMessage && (
          <div style={{
            padding: "4px 12px", borderRadius: "16px",
            backgroundColor: "#fff3e0", color: "#e65100", fontSize: "13px",
          }}>
            Message: <strong>{props.demoMessage}</strong>
          </div>
        )}
      </div>

      {/* What this page demonstrates */}
      <div style={{
        padding: "20px", borderRadius: "8px",
        backgroundColor: "#f5f5f5", border: "1px solid #e0e0e0",
        fontSize: "14px", lineHeight: "1.8", marginBottom: "24px",
      }}>
        <h2 style={{ fontSize: "16px", marginTop: 0, marginBottom: "12px", color: "#1a1a2e" }}>
          What this demonstrates:
        </h2>
        <ul style={{ margin: 0, paddingLeft: "20px" }}>
          <li><strong>Cross-app communication</strong> — the button below dispatches a <code>CustomEvent</code> that the always-mounted demo-notifications app listens for</li>
          <li><strong>Same pattern as production</strong> — Wizards dispatches <code>"alp-terminology-open"</code> to open the Concept Sets terminology drawer</li>
          <li><strong>Prop updates via <code>updateCustomProps()</code></strong> — the "Demo message" input in the nav bar updates this app through the same mechanism as <code>datasetId</code></li>
          <li><strong>Hidden background app</strong> — demo-notifications has <code>visible: false</code> + <code>autoMount: true</code>, so it's not in the nav but still running</li>
        </ul>
      </div>

      {/* Cross-app communication button */}
      <div style={{ marginBottom: "20px" }}>
        <button
          onClick={handleSendNotification}
          style={{
            padding: "10px 20px",
            backgroundColor: "#1565c0",
            color: "white",
            border: "none",
            borderRadius: "6px",
            fontSize: "14px",
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          Send Notification (Cross-App Event)
        </button>
        {lastNotification && (
          <p style={{ fontSize: "12px", color: "#666", marginTop: "8px" }}>
            Last sent: {lastNotification}
          </p>
        )}
      </div>

      {/* Debug info */}
      <details style={{ marginTop: "24px", fontSize: "12px", color: "#999" }}>
        <summary>Portal Props (debug)</summary>
        <pre style={{ background: "#f5f5f5", padding: "12px", borderRadius: "4px", overflow: "auto" }}>
          {JSON.stringify(
            { appId: props.appId, datasetId: props.datasetId, username: props.username, demoMessage: props.demoMessage, locale: props.locale },
            null, 2
          )}
        </pre>
      </details>
    </div>
  );
}
