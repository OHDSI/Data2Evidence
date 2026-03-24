import { PortalProps } from "./types";

const TEAM_MEMBERS = [
  { name: "Alice Chen", role: "Frontend Engineer", emoji: "👩‍💻" },
  { name: "Bob Martinez", role: "Backend Engineer", emoji: "👨‍💻" },
  { name: "Carol Singh", role: "Data Scientist", emoji: "👩‍🔬" },
  { name: "Dan Kowalski", role: "DevOps Engineer", emoji: "🛠️" },
];

export function TeamPage(props: PortalProps) {
  return (
    <div style={{ padding: "24px", fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ fontSize: "24px", marginBottom: "8px", color: "#1a1a2e" }}>
        Demo Team
      </h1>

      {/* Dataset badge — shows the active dataset from portal props */}
      <div
        style={{
          display: "inline-block",
          padding: "4px 12px",
          borderRadius: "16px",
          backgroundColor: "#e3f2fd",
          color: "#1565c0",
          fontSize: "13px",
          marginBottom: "20px",
        }}
      >
        Dataset: <strong>{props.datasetId || "none"}</strong>
      </div>

      {props.username && (
        <p style={{ color: "#666", fontSize: "14px", marginBottom: "16px" }}>
          Logged in as: {props.username}
        </p>
      )}

      {/* Team member cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "12px" }}>
        {TEAM_MEMBERS.map((member) => (
          <div
            key={member.name}
            style={{
              padding: "16px",
              borderRadius: "8px",
              border: "1px solid #e0e0e0",
              backgroundColor: "#fafafa",
            }}
          >
            <div style={{ fontSize: "24px", marginBottom: "8px" }}>{member.emoji}</div>
            <div style={{ fontWeight: 600, fontSize: "15px" }}>{member.name}</div>
            <div style={{ color: "#666", fontSize: "13px" }}>{member.role}</div>
          </div>
        ))}
      </div>

      {/* Debug info for demo purposes */}
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
