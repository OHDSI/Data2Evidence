import { PortalProps } from "./types";

export function NotificationsPage(props: PortalProps) {
  const handleTestNotification = () => {
    window.dispatchEvent(
      new CustomEvent("demo-notification-open", {
        detail: {
          props: {
            message: "Test notification from the Notifications page itself",
            source: "demo-notifications",
            timestamp: new Date().toISOString(),
            onClose: () => {
              console.log("[Demo Notifications] Drawer closed from own page");
            },
          },
        },
      })
    );
  };

  return (
    <div style={{ padding: "24px", fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ fontSize: "24px", marginBottom: "8px", color: "#1a1a2e" }}>
        Demo Notifications
      </h1>

      {/* Dataset badge */}
      <div
        style={{
          display: "inline-block",
          padding: "4px 12px",
          borderRadius: "16px",
          backgroundColor: "#fce4ec",
          color: "#c62828",
          fontSize: "13px",
          marginBottom: "20px",
        }}
      >
        Dataset: <strong>{props.datasetId || "none"}</strong>
      </div>

      {/* Explanation */}
      <div
        style={{
          padding: "16px",
          borderRadius: "8px",
          backgroundColor: "#f3e5f5",
          border: "1px solid #ce93d8",
          marginBottom: "20px",
          fontSize: "14px",
          lineHeight: "1.6",
        }}
      >
        <strong>autoMount: true</strong> — This app is always mounted by single-spa,
        even when you navigate to other routes. The portal hides this container with{" "}
        <code>display: none</code>, but the <code>NotificationDrawer</code> component
        remains active and listening for events.
        <br />
        <br />
        Try navigating to <strong>Demo Projects</strong> and clicking "Send Notification" —
        the drawer will appear even though you're not on this page.
        <br />
        <br />
        In D2E, this is how <strong>Concept Sets</strong> works: it's always mounted so
        its <code>TerminologyWithEventListener</code> can respond to the{" "}
        <code>"alp-terminology-open"</code> event from any other app.
      </div>

      <button
        onClick={handleTestNotification}
        style={{
          padding: "10px 20px",
          backgroundColor: "#7b1fa2",
          color: "white",
          border: "none",
          borderRadius: "6px",
          fontSize: "14px",
          cursor: "pointer",
          fontWeight: 600,
        }}
      >
        Test: Open Drawer from This Page
      </button>
    </div>
  );
}
