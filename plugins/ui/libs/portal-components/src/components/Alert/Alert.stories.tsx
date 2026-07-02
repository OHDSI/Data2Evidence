import React from "react";
import { ComponentStory, ComponentMeta } from "@storybook/react";

import { Alert, AlertSeverity } from "./Alert";

export default {
  title: "Components/Alert",
  component: Alert,
  // Storybook has no app header, so pin toasts 16px from the top instead of the
  // component's default header offset (the var inherits down to the fixed toast).
  decorators: [
    (Story) => (
      <div style={{ "--alp-alert-toast-top": "16px" } as React.CSSProperties}>
        <Story />
      </div>
    ),
  ],
  argTypes: {
    severity: {
      control: "select",
      options: ["error", "warning", "success", "info"],
    },
    variant: {
      control: "inline-radio",
      options: ["banner", "toast"],
    },
  },
} as ComponentMeta<typeof Alert>;

const Template: ComponentStory<typeof Alert> = (args) => <Alert {...args} />;

// --- Banner: full-width ---
export const Banner = Template.bind({});
Banner.args = {
  variant: "banner",
  severity: "error",
  message: "Internal server error.",
};

export const BannerInline = Template.bind({});
BannerInline.args = {
  variant: "banner",
  inline: true,
  severity: "warning",
  message: "Internal server error.",
};

export const BannerWithTitle = Template.bind({});
BannerWithTitle.args = {
  variant: "banner",
  inline: true,
  severity: "success",
  title: "{Title}",
  message: "Internal server error.",
};

export const BannerWithAction = Template.bind({});
BannerWithAction.args = {
  variant: "banner",
  inline: true,
  severity: "info",
  title: "{Title}",
  message: "Internal server error.",
  actionLabel: "Label",
  onAction: () => {},
};

// --- Toast ---
export const Toast = Template.bind({});
Toast.args = {
  variant: "toast",
  severity: "success",
  message: "Internal server error.",
};

export const ToastWithTitle = Template.bind({});
ToastWithTitle.args = {
  variant: "toast",
  severity: "info",
  title: "{Title}",
  message: "Internal server error.",
};

export const ToastDismissible = Template.bind({});
ToastDismissible.args = {
  variant: "toast",
  severity: "error",
  title: "{Title}",
  message: "Internal server error.",
  dismissible: true,
  actionLabel: "Label",
  onAction: () => {},
  onClose: () => {},
};

// Multi-severity showcase layout. Toast → a fixed top-right wrapper (reusing the
// decorator's --alp-alert-toast-* vars) holding `position: static` toasts so they
// stack instead of overlapping. Banner → a plain inline column.
const severities: AlertSeverity[] = ["error", "warning", "success", "info"];

const isToast = (variant?: string) => variant === "toast";

const gridWrapperStyle = (variant?: string): React.CSSProperties =>
  isToast(variant)
    ? {
        position: "fixed",
        top: "var(--alp-alert-toast-top, 84px)",
        right: "var(--alp-alert-toast-right, 16px)",
        zIndex: 5,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
        gap: 12,
      }
    : { display: "flex", flexDirection: "column", gap: 12 };

const childStyle = (variant?: string): React.CSSProperties | undefined =>
  isToast(variant) ? { position: "static" } : undefined;

const SeverityGrid: ComponentStory<typeof Alert> = (args) => (
  <div style={gridWrapperStyle(args.variant)}>
    {severities.map((severity) => (
      <Alert {...args} key={severity} severity={severity} style={childStyle(args.variant)} />
    ))}
  </div>
);

export const AllSeverities = SeverityGrid.bind({});
AllSeverities.args = {
  variant: "banner",
  inline: true,
  title: "{Title}",
  message: "Internal server error.",
  actionLabel: "Label",
  onAction: () => {},
};

// All severities as dismissible toasts, stacked in the fixed top-right corner.
// Visibility is managed locally so the close button actually removes each one.
const DismissibleGrid: ComponentStory<typeof Alert> = (args) => {
  const [visible, setVisible] = React.useState<Record<AlertSeverity, boolean>>({
    error: true,
    warning: true,
    success: true,
    info: true,
  });
  return (
    <div style={gridWrapperStyle(args.variant)}>
      {severities.map((severity) => (
        <Alert
          {...args}
          key={severity}
          severity={severity}
          visible={visible[severity]}
          onClose={() => setVisible((prev) => ({ ...prev, [severity]: false }))}
          style={childStyle(args.variant)}
        />
      ))}
    </div>
  );
};

export const AllSeveritiesDismissible = DismissibleGrid.bind({});
AllSeveritiesDismissible.args = {
  variant: "toast",
  dismissible: true,
  title: "{Title}",
  message: "Internal server error.",
  actionLabel: "Label",
  onAction: () => {},
};
