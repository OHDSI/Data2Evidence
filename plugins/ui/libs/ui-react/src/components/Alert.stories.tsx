import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Alert, type AlertSeverity } from "./Alert";
import { AlertBanner } from "./AlertBanner";
import { AlertToast } from "./AlertToast";
import { Button } from "./Button";

const SEVERITIES: AlertSeverity[] = ["error", "warning", "success", "info"];

const meta = {
  title: "Feedback/Alert",
  component: Alert,
  args: {
    severity: "info",
    variant: "inline",
    children: "Internal server error.",
  },
  argTypes: {
    severity: { control: "inline-radio", options: SEVERITIES },
    variant: { control: "inline-radio", options: ["inline", "banner"] },
  },
} satisfies Meta<typeof Alert>;

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
          <Alert key={s} severity={s}>
            Internal server error.
          </Alert>
        ))}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <p style={label}>Inline — title + action + close</p>
        {SEVERITIES.map((s) => (
          <Alert
            key={s}
            severity={s}
            title="{Title}"
            action={<Button variant="ghost">Label</Button>}
            onClose={() => {}}
          >
            Internal server error.
          </Alert>
        ))}
      </div>
    </div>
  ),
};

export const Banner: Story = {
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {SEVERITIES.map((s) => (
        <AlertBanner
          key={s}
          severity={s}
          action={<Button variant="ghost">Label</Button>}
        >
          Internal server error.
        </AlertBanner>
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
        <Button
          variant="primary"
          onClick={() => setState({ open: true, closeButton: true })}
        >
          Toast with close
        </Button>
        <Button
          variant="secondary"
          onClick={() => setState({ open: true, closeButton: false })}
        >
          Toast auto-dismiss (5s)
        </Button>
        <AlertToast
          open={state.open}
          onClose={() => setState((s) => ({ ...s, open: false }))}
          severity="success"
          closeButton={state.closeButton}
        >
          Internal server error.
        </AlertToast>
      </div>
    );
  },
};

export const Playground: Story = {};
