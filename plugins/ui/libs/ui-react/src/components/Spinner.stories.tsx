import type { Meta, StoryObj } from "@storybook/react-vite";
import { Spinner } from "./Spinner";

const meta = {
  title: "Feedback/Spinner",
  component: Spinner,
  args: { size: 48 },
} satisfies Meta<typeof Spinner>;

export default meta;
type Story = StoryObj<typeof meta>;

const heading = {
  margin: 0,
  font: "600 16px/1.2 var(--d2e-font-family)",
  color: "var(--d2e-color-primary)",
} as const;

export const Showcase: Story = {
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <h3 style={heading}>Sizes</h3>
        <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
          <Spinner size={20} />
          <Spinner size={32} />
          <Spinner size={48} />
          <Spinner size={160} />
        </div>
      </section>
      <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <h3 style={heading}>Page loading</h3>
        <div
          style={{
            height: 320,
            border: "1px solid var(--d2e-color-neutral-lighter)",
            borderRadius: 8,
          }}
        >
          <Spinner center size={160} />
        </div>
      </section>
    </div>
  ),
};

export const Playground: Story = {};
