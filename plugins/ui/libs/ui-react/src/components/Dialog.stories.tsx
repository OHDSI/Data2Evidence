import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Dialog } from "./Dialog";
import { Button } from "./Button";

const meta = {
  title: "Feedback/Dialog",
  component: Dialog,
  args: { title: "Delete exploration", size: "s", open: false },
} satisfies Meta<typeof Dialog>;

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
      <Button variant="secondary" onClick={() => setOpen(key)}>
        {label}
      </Button>
    );
    const cancelConfirm = (
      <>
        <Button variant="secondary" onClick={close}>Cancel</Button>
        <Button variant="primary" onClick={close}>Confirm</Button>
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

        <Dialog open={open === "s"} size="s" title="Small modal (540)" onClose={close} actions={cancelConfirm}>
          <p>Small dialogs split their action buttons full-width.</p>
        </Dialog>
        <Dialog open={open === "m"} size="l" title="Medium modal (900)" onClose={close} actions={cancelConfirm}>
          <p>Medium / large dialogs right-align their action buttons.</p>
        </Dialog>
        <Dialog open={open === "l"} size="xl" title="Large modal (1200)" onClose={close} actions={cancelConfirm}>
          <p>1200px wide, for content-heavy modals.</p>
        </Dialog>
        <Dialog open={open === "notitle"} size="s" onClose={close} actions={cancelConfirm}>
          <p>A dialog with no title row.</p>
        </Dialog>
        <Dialog
          open={open === "busy"}
          size="s"
          title="Edit profile"
          busy
          onClose={close}
          actions={
            <>
              <Button variant="secondary" disabled>Cancel</Button>
              <Button variant="primary" loading>Save</Button>
            </>
          }
        >
          <p>Busy locks the dialog (× and Esc disabled); the spinner sits on the action button.</p>
        </Dialog>
        <Dialog
          open={open === "confirm"}
          size="l"
          title="Edit permissions"
          confirmOnClose
          onClose={close}
          actions={<Button variant="primary" onClick={close}>Save</Button>}
        >
          <p>Press × or Esc — you’ll be asked to confirm before discarding.</p>
        </Dialog>
        <Dialog
          open={open === "one"}
          size="s"
          title="Single action"
          onClose={close}
          actions={<Button variant="primary" onClick={close}>Got it</Button>}
        >
          <p>A single primary action.</p>
        </Dialog>
        <Dialog
          open={open === "three"}
          size="l"
          title="Three actions"
          onClose={close}
          actions={
            <>
              <Button variant="ghost" onClick={close}>Tertiary</Button>
              <Button variant="secondary" onClick={close}>Secondary</Button>
              <Button variant="primary" onClick={close}>Primary</Button>
            </>
          }
        >
          <p>A three-action layout.</p>
        </Dialog>
      </div>
    );
  },
};

export const Playground: Story = {
  render: (args) => {
    const [open, setOpen] = useState(false);
    return (
      <>
        <Button variant="primary" onClick={() => setOpen(true)}>
          Open dialog
        </Button>
        <Dialog
          {...args}
          open={open}
          onClose={() => setOpen(false)}
          actions={
            <>
              <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
              <Button variant="danger" onClick={() => setOpen(false)}>Delete</Button>
            </>
          }
        >
          <p>This action cannot be undone. Are you sure?</p>
        </Dialog>
      </>
    );
  },
};
