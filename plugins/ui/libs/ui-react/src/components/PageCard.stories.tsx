import type { Meta, StoryObj } from "@storybook/react-vite";
import { PageCard } from "./PageCard";
import { PageHeader } from "./PageHeader";

const meta = {
  title: "Layout/PageCard",
  component: PageCard,
} satisfies Meta<typeof PageCard>;

export default meta;
type Story = StoryObj<typeof meta>;

const page = {
  padding: 24,
  height: 360,
  boxSizing: "border-box",
  background: "var(--d2e-color-neutral-lightest)",
} as const;

export const Showcase: Story = {
  render: () => (
    <div style={page}>
      <PageCard>
        <PageHeader overline="Admin" title="Data sources" />
      </PageCard>
    </div>
  ),
};

export const Playground: Story = {
  render: () => (
    <div style={page}>
      <PageCard>
        <div style={{ padding: 24, font: "400 14px var(--d2e-font-family)" }}>Content</div>
      </PageCard>
    </div>
  ),
};
