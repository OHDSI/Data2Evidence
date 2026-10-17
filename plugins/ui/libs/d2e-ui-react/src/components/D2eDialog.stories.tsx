import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { D2eDialog } from "./D2eDialog";
import { D2eButton } from "./D2eButton";

const meta = {
  title: "Feedback/D2eDialog",
  component: D2eDialog,
  args: { title: "Delete exploration", size: "s", open: false },
} satisfies Meta<typeof D2eDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

// Consolidated reference: a trigger per variant (dialogs are overlays and can't
// all be shown open at once). Covers sizes, title/no-title, action counts, busy
// and confirm-on-close.
export const Showcase: Story = {
  render: () => {
    const [open, setOpen] = useState<string | null>(null);
    const close = () => setOpen(null);
    const trigger = (key: string, label: string) => (
      <D2eButton variant="secondary" onClick={() => setOpen(key)}>
        {label}
      </D2eButton>
    );
    const cancelConfirm = (
      <>
        <D2eButton variant="secondary" onClick={close}>Cancel</D2eButton>
        <D2eButton variant="primary" onClick={close}>Confirm</D2eButton>
      </>
    );

    return (
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, maxWidth: 560 }}>
        {trigger("s", "Small")}
        {trigger("m", "Medium")}
        {trigger("l", "Large")}
        {trigger("notitle", "No title")}
        {trigger("busy", "Busy")}
        {trigger("confirm", "Confirm on close")}
        {trigger("one", "1 action")}
        {trigger("three", "3 actions")}

        <D2eDialog open={open === "s"} size="s" title="Small modal (540)" onClose={close} actions={cancelConfirm}>
          <p>Small dialogs split their action buttons full-width.</p>
        </D2eDialog>
        <D2eDialog open={open === "m"} size="l" title="Medium modal (900)" onClose={close} actions={cancelConfirm}>
          <p>Medium / large dialogs right-align their action buttons.</p>
        </D2eDialog>
        <D2eDialog open={open === "l"} size="xl" title="Large modal (1200)" onClose={close} actions={cancelConfirm}>
          <p>1200px wide, for content-heavy modals.</p>
        </D2eDialog>
        <D2eDialog open={open === "notitle"} size="s" onClose={close} actions={cancelConfirm}>
          <p>A dialog with no title row.</p>
        </D2eDialog>
        <D2eDialog open={open === "busy"} size="s" title="Saving…" busy onClose={close}>
          <p>Busy locks the dialog and shows a spinner overlay.</p>
        </D2eDialog>
        <D2eDialog
          open={open === "confirm"}
          size="l"
          title="Edit permissions"
          confirmOnClose
          onClose={close}
          actions={<D2eButton variant="primary" onClick={close}>Save</D2eButton>}
        >
          <p>Press × or Esc — you’ll be asked to confirm before discarding.</p>
        </D2eDialog>
        <D2eDialog
          open={open === "one"}
          size="s"
          title="Single action"
          onClose={close}
          actions={<D2eButton variant="primary" onClick={close}>Got it</D2eButton>}
        >
          <p>A single primary action.</p>
        </D2eDialog>
        <D2eDialog
          open={open === "three"}
          size="l"
          title="Three actions"
          onClose={close}
          actions={
            <>
              <D2eButton variant="ghost" onClick={close}>Tertiary</D2eButton>
              <D2eButton variant="secondary" onClick={close}>Secondary</D2eButton>
              <D2eButton variant="primary" onClick={close}>Primary</D2eButton>
            </>
          }
        >
          <p>A three-action layout.</p>
        </D2eDialog>
      </div>
    );
  },
};

export const Playground: Story = {
  render: (args) => {
    const [open, setOpen] = useState(false);
    return (
      <>
        <D2eButton variant="primary" onClick={() => setOpen(true)}>
          Open dialog
        </D2eButton>
        <D2eDialog
          {...args}
          open={open}
          onClose={() => setOpen(false)}
          actions={
            <>
              <D2eButton variant="secondary" onClick={() => setOpen(false)}>Cancel</D2eButton>
              <D2eButton variant="danger" onClick={() => setOpen(false)}>Delete</D2eButton>
            </>
          }
        >
          <p>This action cannot be undone. Are you sure?</p>
        </D2eDialog>
      </>
    );
  },
};
