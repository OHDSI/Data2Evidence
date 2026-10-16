import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { D2eAlert, type D2eAlertSeverity } from "./D2eAlert";
import { D2eAlertBanner } from "./D2eAlertBanner";
import { D2eAlertToast } from "./D2eAlertToast";
import { D2eButton } from "./D2eButton";

const SEVERITIES: D2eAlertSeverity[] = ["error", "warning", "success", "info"];

const meta = {
  title: "Feedback/D2eAlert",
  component: D2eAlert,
  args: {
    severity: "info",
    variant: "inline",
    children: "Internal server error.",
  },
  argTypes: {
    severity: { control: "inline-radio", options: SEVERITIES },
    variant: { control: "inline-radio", options: ["inline", "banner"] },
  },
} satisfies Meta<typeof D2eAlert>;

export default meta;
type Story = StoryObj<typeof meta>;

const label = {
  margin: "4px 0 0",
  font: "600 13px/1.2 var(--d2e-font-family)",
  color: "var(--d2e-color-neutral)",
  textTransform: "uppercase",
} as const;

// Consolidated reference (Figma Alert: inline banner, with/without title & action).
export const Showcase: Story = {
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 720 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <p style={label}>Inline — message only</p>
        {SEVERITIES.map((s) => (
          <D2eAlert key={s} severity={s}>
            Internal server error.
          </D2eAlert>
        ))}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <p style={label}>Inline — title + action + close</p>
        {SEVERITIES.map((s) => (
          <D2eAlert
            key={s}
            severity={s}
            title="{Title}"
            action={<D2eButton variant="ghost">Label</D2eButton>}
            onClose={() => {}}
          >
            Internal server error.
          </D2eAlert>
        ))}
      </div>
    </div>
  ),
};

export const Banner: Story = {
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {SEVERITIES.map((s) => (
        <D2eAlertBanner
          key={s}
          severity={s}
          action={<D2eButton variant="ghost">Label</D2eButton>}
        >
          Internal server error.
        </D2eAlertBanner>
      ))}
    </div>
  ),
};

export const Toast: Story = {
  render: () => {
    const [state, setState] = useState<{
      open: boolean;
      closeButton: boolean;
    }>({ open: false, closeButton: true });
    return (
      <div style={{ display: "flex", gap: 12 }}>
        <D2eButton
          variant="primary"
          onClick={() => setState({ open: true, closeButton: true })}
        >
          Toast with close
        </D2eButton>
        <D2eButton
          variant="secondary"
          onClick={() => setState({ open: true, closeButton: false })}
        >
          Toast auto-dismiss (5s)
        </D2eButton>
        <D2eAlertToast
          open={state.open}
          onClose={() => setState((s) => ({ ...s, open: false }))}
          severity="success"
          closeButton={state.closeButton}
        >
          Internal server error.
        </D2eAlertToast>
      </div>
    );
  },
};

export const Playground: Story = {};
