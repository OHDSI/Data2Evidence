import { PortalProps } from "./types";

export function TeamPage(props: PortalProps) {
  return (
    <div style={{ padding: "24px", fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ fontSize: "24px", marginBottom: "8px", color: "#1a1a2e" }}>
        Demo Team
      </h1>
      <p style={{ color: "#666", fontSize: "14px", marginBottom: "16px" }}>
        Route-based micro-frontend
      </p>

      {/* Badges — dataset + demo message from portal props */}
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "24px" }}>
        <div style={{
          padding: "4px 12px", borderRadius: "16px",
          backgroundColor: "#e3f2fd", color: "#1565c0", fontSize: "13px",
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
        fontSize: "14px", lineHeight: "1.8",
      }}>
        <h2 style={{ fontSize: "16px", marginTop: 0, marginBottom: "12px", color: "#1a1a2e" }}>
          What this demonstrates:
        </h2>
        <ul style={{ margin: 0, paddingLeft: "20px" }}>
          <li><strong>Lifecycle exports</strong> — <code>bootstrap</code>, <code>mount</code>, <code>unmount</code> via <code>singleSpaReact()</code></li>
          <li><strong>Prop passing</strong> — <code>datasetId</code>, <code>username</code>, <code>demoMessage</code> received from portal shell</li>
          <li><strong>Runtime prop updates</strong> — type in the "Demo message" input in the nav bar and watch the orange badge update in real-time</li>
          <li><strong>Props persist across navigation</strong> — navigate to Demo Projects and back — the message stays because it's passed via <code>updateCustomProps()</code></li>
          <li><strong>Route-based mounting</strong> — this app only renders when its route (<code>/demo-team</code>) is active</li>
        </ul>
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
