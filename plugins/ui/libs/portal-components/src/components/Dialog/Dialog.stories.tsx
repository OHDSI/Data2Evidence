import React, { useState } from "react";
import { ComponentStory, ComponentMeta } from "@storybook/react";

import { Dialog } from "./Dialog";
import { Button } from "../Button/Button";
import { Tabs } from "../Tabs/Tabs";
import { Tab } from "../Tabs/Tab";
import { Feedback } from "../../types";

export default {
  title: "Components/Dialog",
  component: Dialog,
  argTypes: {
    size: { control: "select", options: [undefined, "small", "medium", "large", "xlarge"] },
    confirmOnClose: { control: "boolean" },
    loading: { control: "boolean" },
    bodyPadded: { control: "boolean" },
  },
  // Stories default to the standard body inset; content helpers carry no padding of their own.
  args: { bodyPadded: true },
} as ComponentMeta<typeof Dialog>;

const Template: ComponentStory<typeof Dialog> = (args) => <Dialog {...args} />;

const openClosable = { open: true, closable: true };
const sampleChildren = <p style={{ margin: 0 }}>Hello world</p>;

// Body + a footer row of action buttons.
const dialogBody = <p style={{ margin: 0 }}>Are you sure you want to continue?</p>;

// Feedback renders inline via the Dialog's Alert banner: `message` → title, `description` → body, no `type` → "info".
const successFeedback: Feedback = { type: "success", message: "Saved", description: "Your changes were saved." };
const errorFeedback: Feedback = { type: "error", message: "Something went wrong", description: "Please try again." };
const infoFeedback: Feedback = { description: "No changes were made." };
const errorWithAction: Feedback = {
  type: "error",
  description: "Unable to update",
  actionLabel: "Try again",
  onAction: () => {},
};

export const DialogClosable = Template.bind({});
DialogClosable.args = { ...openClosable, title: "Dialog", children: sampleChildren };

export const DialogNotClosable = Template.bind({});
DialogNotClosable.args = { open: true, closable: false, title: "Not closable", children: sampleChildren };

export const WithSuccessFeedback = Template.bind({});
WithSuccessFeedback.args = {
  ...openClosable,
  title: "Success",
  children: sampleChildren,
  feedback: successFeedback,
};

export const WithErrorFeedback = Template.bind({});
WithErrorFeedback.args = {
  ...openClosable,
  title: "Error",
  children: sampleChildren,
  feedback: errorFeedback,
};

export const WithInfoFeedback = Template.bind({});
WithInfoFeedback.args = {
  ...openClosable,
  title: "Info",
  children: sampleChildren,
  feedback: infoFeedback,
};

export const WithFeedbackAction = Template.bind({});
WithFeedbackAction.args = {
  ...openClosable,
  title: "Error + action",
  children: sampleChildren,
  feedback: errorWithAction,
};

// --- Header description line ---
export const WithDescription = Template.bind({});
WithDescription.args = {
  ...openClosable,
  title: "With description",
  description: "A short paragraph that explains what this dialog is for.",
  children: sampleChildren,
};

// --- Opt-out: unpadded body (consumer supplies its own spacing). ---
// Full-width tabs sit flush against the dialog edges, while the table below carries
// its own padding — the layout `bodyPadded: false` is meant for.
const accessRows = Array.from({ length: 10 }, (_, i) => ({
  id: i,
  username: "researchername_123",
  role: "Researcher",
}));

const requestRows = Array.from({ length: 2 }, (_, i) => ({
  id: i,
  username: "requestername_456",
  role: "Researcher",
}));

const headerCellStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "16px 24px",
  color: "var(--color-primary)",
  fontWeight: 600,
  background: "#eef3fc",
};

const bodyCellStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "16px 24px",
  color: "#1a1a1a",
};

const UnpaddedTabsTable: React.FC = () => {
  const [tab, setTab] = useState("Access");
  const isAccess = tab === "Access";
  const rows = isAccess ? accessRows : requestRows;
  const action = isAccess
    ? { label: "Revoke", symbol: "✕", color: "var(--color-error, #d32f2f)" }
    : { label: "Approve", symbol: "✓", color: "var(--color-success, #2e7d32)" };
  return (
    <>
      {/* Sticky inside the dialog's scrolling body keeps the tabs pinned while rows scroll under them. */}
      <div style={{ position: "sticky", top: 0, zIndex: 1, background: "#fff", borderBottom: "1px solid #e0e0e0" }}>
        <Tabs value={tab} onChange={(_e, value) => setTab(value)} variant="fullWidth">
          <Tab value="Access" label={`Access (${accessRows.length})`} sx={{ textTransform: "none" }} />
          <Tab value="Request" label={`Request (${requestRows.length})`} sx={{ textTransform: "none" }} />
        </Tabs>
      </div>
      <div style={{ padding: "16px 24px" }}>
        <div style={{ border: "1px solid #e0e0e0", borderRadius: 8, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={headerCellStyle}>Username</th>
                <th style={headerCellStyle}>Role</th>
                <th style={headerCellStyle}>Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={row.id} style={{ background: i % 2 === 1 ? "#f7f8fa" : "#fff" }}>
                  <td style={bodyCellStyle}>{row.username}</td>
                  <td style={bodyCellStyle}>{row.role}</td>
                  <td style={bodyCellStyle}>
                    <button
                      type="button"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 8,
                        padding: 0,
                        border: "none",
                        background: "none",
                        cursor: "pointer",
                        fontWeight: 500,
                        color: action.color,
                      }}
                    >
                      <span aria-hidden="true">{action.symbol}</span>
                      {action.label}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};

export const BodyUnpadded = Template.bind({});
BodyUnpadded.args = {
  ...openClosable,
  title: "Body unpadded",
  bodyPadded: false,
  children: <UnpaddedTabsTable />,
  footerSlots: { primary: <Button text="Primary action" /> },
};

// --- Size tiers. Long content shows fixed header/footer + scrolling body. ---
const longContent = (
  <>
    {Array.from({ length: 20 }).map((_, i) => (
      <p key={i}>
        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore
        magna aliqua. Paragraph {i + 1}.
      </p>
    ))}
  </>
);
const sizeFooter = {
  primary: <Button text="Primary action" />,
  actionLabel: "Action",
  onAction: () => {},
};

export const SizeSmall = Template.bind({});
SizeSmall.args = {
  ...openClosable,
  size: "small",
  title: "Small (540px)",
  children: longContent,
  footerSlots: sizeFooter,
};

export const SizeMedium = Template.bind({});
SizeMedium.args = {
  ...openClosable,
  size: "medium",
  title: "Medium (800px)",
  children: longContent,
  footerSlots: sizeFooter,
};

export const SizeLarge = Template.bind({});
SizeLarge.args = {
  ...openClosable,
  size: "large",
  title: "Large (1200px)",
  children: longContent,
  footerSlots: sizeFooter,
};

export const SizeXLarge = Template.bind({});
SizeXLarge.args = {
  ...openClosable,
  size: "xlarge",
  title: "XLarge (responsive)",
  children: longContent,
  footerSlots: sizeFooter,
};

// --- Footer layouts (footerSlots) ---
// Two axes: `block` (full-width) vs right-aligned (default), × which slots are filled.

// Single primary, full width.
export const FooterBlockPrimary = Template.bind({});
FooterBlockPrimary.args = {
  ...openClosable,
  title: "Block · Primary",
  children: dialogBody,
  footerSlots: { primary: <Button text="Primary action" />, block: true },
};

// Secondary + primary, split full width.
export const FooterBlockSecondaryPrimary = Template.bind({});
FooterBlockSecondaryPrimary.args = {
  ...openClosable,
  title: "Block · Secondary + Primary",
  children: dialogBody,
  footerSlots: {
    secondary: <Button text="Secondary action" variant="outlined" />,
    primary: <Button text="Primary action" />,
    block: true,
  },
};

// Primary, right-aligned.
export const FooterPrimary = Template.bind({});
FooterPrimary.args = {
  ...openClosable,
  title: "Primary",
  size: "medium",
  children: dialogBody,
  footerSlots: { primary: <Button text="Primary action" /> },
};

// Action link + primary.
export const FooterActionAndPrimary = Template.bind({});
FooterActionAndPrimary.args = {
  ...openClosable,
  title: "Action + Primary",
  size: "medium",
  children: dialogBody,
  footerSlots: { actionLabel: "Action", onAction: () => {}, primary: <Button text="Primary action" /> },
};

// Action link + secondary + primary.
export const FooterActionSecondaryPrimary = Template.bind({});
FooterActionSecondaryPrimary.args = {
  ...openClosable,
  title: "Action + Secondary + Primary",
  size: "medium",
  children: dialogBody,
  footerSlots: {
    actionLabel: "Action",
    onAction: () => {},
    secondary: <Button text="Secondary action" variant="outlined" />,
    primary: <Button text="Primary action" />,
  },
};

// Action link only.
export const FooterActionOnly = Template.bind({});
FooterActionOnly.args = {
  ...openClosable,
  title: "Action only",
  children: dialogBody,
  footerSlots: { actionLabel: "Action", onAction: () => {} },
};

// --- Action-in-progress (spinner overlay + primary disabled) ---
export const Loading = Template.bind({});
Loading.args = {
  ...openClosable,
  title: "Action in progress",
  loading: true,
  children: dialogBody,
  footerSlots: {
    block: true,
    secondary: <Button text="Cancel" variant="outlined" />,
    primary: <Button text="Confirm" />,
  },
};
