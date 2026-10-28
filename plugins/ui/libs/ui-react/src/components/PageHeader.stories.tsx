import type { ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import AddIcon from "@mui/icons-material/Add";
import { PageHeader } from "./PageHeader";
import { Button } from "./Button";

const meta = {
  title: "Layout/PageHeader",
  component: PageHeader,
  args: {
    overline: "Admin",
    title: "Page title",
    description:
      "Short description of what the user can do on this page. Keep it to one or two sentences.",
  },
} satisfies Meta<typeof PageHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

const primaryAction = (
  <Button variant="primary" prependIcon={<AddIcon />}>
    Primary action
  </Button>
);
const secondaryAction = <Button variant="secondary">Secondary action</Button>;

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <span
        style={{
          font: "600 13px/1.2 var(--d2e-font-family)",
          color: "var(--d2e-color-neutral)",
        }}
      >
        {title}
      </span>
      <div style={{ border: "1px solid var(--d2e-color-neutral-lighter)", borderRadius: 8 }}>
        {children}
      </div>
    </section>
  );
}

// Consolidated reference (Figma "Page header" Actions variants). The actions
// slot composes buttons, a view toggle, a data-source Select, etc.; primary is
// always right-most.
export const Showcase: Story = {
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, minWidth: 900 }}>
      <Section title="No actions">
        <PageHeader overline="Admin" title="Page title" description="Short description of what the user can do on this page." />
      </Section>
      <Section title="Primary action">
        <PageHeader overline="Admin" title="Page title" description="Short description of what the user can do on this page." actions={primaryAction} />
      </Section>
      <Section title="Secondary action">
        <PageHeader overline="Admin" title="Page title" description="Short description of what the user can do on this page." actions={secondaryAction} />
      </Section>
      <Section title="Secondary + primary">
        <PageHeader
          overline="Admin"
          title="Page title"
          description="Short description of what the user can do on this page."
          actions={
            <>
              {secondaryAction}
              {primaryAction}
            </>
          }
        />
      </Section>
      <Section title="Sub-overline">
        <PageHeader overline="D2E" subOverline="Data exploration" title="Page title" description="Short description of what the user can do on this page." actions={primaryAction} />
      </Section>
      <Section title="Without description">
        <PageHeader overline="Admin" title="Page title" actions={primaryAction} />
      </Section>
    </div>
  ),
};

export const Playground: Story = {
  args: { actions: primaryAction },
};
