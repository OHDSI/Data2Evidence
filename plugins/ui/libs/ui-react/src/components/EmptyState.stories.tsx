import type { Meta, StoryObj } from "@storybook/react-vite";
import { EmptyState } from "./EmptyState";
import { Button } from "./Button";

const meta = {
  title: "Data display/EmptyState",
  component: EmptyState,
  args: {
    size: "m",
    title: "No datasets yet",
    description: "Datasets you create will appear here.",
  },
} satisfies Meta<typeof EmptyState>;

export default meta;
type Story = StoryObj<typeof meta>;

const heading = {
  margin: 0,
  font: "600 16px/1.2 var(--d2e-font-family)",
  color: "var(--d2e-color-primary)",
} as const;

export const Showcase: Story = {
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 40 }}>
      <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <h3 style={heading}>Sizes (title + description + action)</h3>
        <div style={{ display: "flex", gap: 48, alignItems: "flex-start", flexWrap: "wrap" }}>
          {(["s", "m", "l"] as const).map((size) => (
            <EmptyState
              key={size}
              size={size}
              title="No datasets yet"
              description="Datasets you create will appear here."
              action={<Button variant="secondary">Create dataset</Button>}
            />
          ))}
        </div>
      </section>

      <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <h3 style={heading}>Without title / without action</h3>
        <div style={{ display: "flex", gap: 48, alignItems: "flex-start", flexWrap: "wrap" }}>
          <EmptyState description="No results found." />
          <EmptyState
            title="Nothing here"
            description="Try adjusting your filters."
          />
        </div>
      </section>
    </div>
  ),
};

export const Playground: Story = {
  args: {
    action: undefined,
  },
};
