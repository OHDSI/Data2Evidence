import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { NotificationDrawerProps } from "./types";

const EVENT_NAME = "demo-notification-open";

export function NotificationDrawer() {
  const [drawerProps, setDrawerProps] = useState<NotificationDrawerProps | null>(null);
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationDrawerProps[]>([]);

  const listener = useCallback((e: Event) => {
    const customEvent = e as CustomEvent<{ props: NotificationDrawerProps }>;
    const eventProps = customEvent.detail.props;
    setDrawerProps(eventProps);
    setNotifications((prev) => [eventProps, ...prev]);
    setOpen(true);
  }, []);

  useEffect(() => {
    window.addEventListener(EVENT_NAME, listener);
    return () => {
      window.removeEventListener(EVENT_NAME, listener);
    };
  }, [listener]);

  const handleClose = () => {
    drawerProps?.onClose?.();
    setOpen(false);
    setDrawerProps(null);
  };

  // Use createPortal to render into document.body
  // This is critical: the parent container may have display: none
  // (because portal hides non-active apps), but the drawer must still appear.
  // In D2E, MUI's <Drawer> does this automatically via React Portal.
  return createPortal(
    <>
      {/* Backdrop */}
      {open && (
        <div
          onClick={handleClose}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.3)",
            zIndex: 9998,
            transition: "opacity 0.3s",
          }}
        />
      )}

      {/* Drawer panel */}
      <div
        style={{
          position: "fixed",
          top: 0,
          right: open ? "0" : "-400px",
          width: "380px",
          height: "100vh",
          backgroundColor: "white",
          boxShadow: open ? "-4px 0 20px rgba(0, 0, 0, 0.15)" : "none",
          zIndex: 9999,
          transition: "right 0.3s ease-in-out",
          display: "flex",
          flexDirection: "column",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid #e0e0e0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h2 style={{ margin: 0, fontSize: "18px", color: "#1a1a2e" }}>
            Notifications
          </h2>
          <button
            onClick={handleClose}
            style={{
              border: "none",
              background: "none",
              fontSize: "20px",
              cursor: "pointer",
              color: "#666",
              padding: "4px 8px",
            }}
          >
            &#x2715;
          </button>
        </div>

        {/* Explanation banner */}
        <div
          style={{
            padding: "12px 20px",
            backgroundColor: "#fff3e0",
            borderBottom: "1px solid #ffe0b2",
            fontSize: "12px",
            color: "#e65100",
          }}
        >
          This drawer is rendered via <code>ReactDOM.createPortal</code> into{" "}
          <code>document.body</code>, escaping the parent's <code>display: none</code>.
          It works from ANY route because demo-notifications has <code>autoMount: true</code>.
        </div>

        {/* Notification list */}
        <div style={{ flex: 1, overflow: "auto", padding: "16px 20px" }}>
          {notifications.length === 0 ? (
            <p style={{ color: "#999", fontSize: "14px", textAlign: "center", marginTop: "40px" }}>
              No notifications yet. Click "Send Notification" on the Projects page.
            </p>
          ) : (
            notifications.map((notif, i) => (
              <div
                key={`${notif.timestamp}-${i}`}
                style={{
                  padding: "12px",
                  marginBottom: "8px",
                  borderRadius: "8px",
                  backgroundColor: i === 0 ? "#e3f2fd" : "#f5f5f5",
                  border: i === 0 ? "1px solid #90caf9" : "1px solid #e0e0e0",
                }}
              >
                <div style={{ fontSize: "14px", fontWeight: i === 0 ? 600 : 400 }}>
                  {notif.message}
                </div>
                <div style={{ fontSize: "11px", color: "#999", marginTop: "4px" }}>
                  From: {notif.source} | {new Date(notif.timestamp).toLocaleTimeString()}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>,
    document.body
  );
}
