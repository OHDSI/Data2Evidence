import { useState } from "react";
import { PortalProps } from "./types";

const PROJECTS = [
  { id: "P001", name: "Atlas Migration", status: "In Progress", color: "#fff3e0" },
  { id: "P002", name: "Cohort Builder v2", status: "Planning", color: "#e8f5e9" },
  { id: "P003", name: "OMOP ETL Pipeline", status: "Complete", color: "#e3f2fd" },
  { id: "P004", name: "Concept Set Search", status: "In Progress", color: "#fff3e0" },
];

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

      {/* Dataset badge */}
      <div
        style={{
          display: "inline-block",
          padding: "4px 12px",
          borderRadius: "16px",
          backgroundColor: "#e8f5e9",
          color: "#2e7d32",
          fontSize: "13px",
          marginBottom: "20px",
        }}
      >
        Dataset: <strong>{props.datasetId || "none"}</strong>
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
        <p style={{ fontSize: "12px", color: "#999", marginTop: "4px" }}>
          This dispatches a <code>"demo-notification-open"</code> CustomEvent that the
          always-mounted demo-notifications app listens for.
        </p>
      </div>

      {/* Project cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "12px" }}>
        {PROJECTS.map((project) => (
          <div
            key={project.id}
            style={{
              padding: "16px",
              borderRadius: "8px",
              border: "1px solid #e0e0e0",
              backgroundColor: project.color,
            }}
          >
            <div style={{ fontSize: "12px", color: "#999", marginBottom: "4px" }}>{project.id}</div>
            <div style={{ fontWeight: 600, fontSize: "15px", marginBottom: "4px" }}>{project.name}</div>
            <div style={{
              display: "inline-block",
              padding: "2px 8px",
              borderRadius: "12px",
              backgroundColor: "rgba(0,0,0,0.08)",
              fontSize: "12px",
            }}>
              {project.status}
            </div>
          </div>
        ))}
      </div>

      {/* Debug info */}
      <details style={{ marginTop: "24px", fontSize: "12px", color: "#999" }}>
        <summary>Portal Props (debug)</summary>
        <pre style={{ background: "#f5f5f5", padding: "12px", borderRadius: "4px", overflow: "auto" }}>
          {JSON.stringify(
            { appId: props.appId, datasetId: props.datasetId, username: props.username, locale: props.locale },
            null,
            2
          )}
        </pre>
      </details>
    </div>
  );
}
