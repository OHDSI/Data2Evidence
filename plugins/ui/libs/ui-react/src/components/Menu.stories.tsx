import type { Meta, StoryObj } from "@storybook/react-vite";
import { Menu } from "./Menu";
import { Button } from "./Button";

const items = [
  { label: "Rename", value: "rename", icon: "mdi-account" },
  { label: "Duplicate", value: "dup", selected: true },
  { label: "Delete", value: "del", danger: true },
  { label: "Archived", value: "arc", disabled: true },
];

const meta = {
  title: "Feedback/Menu",
  component: Menu,
  args: { items, width: 260, onSelect: (v: string) => console.log("select", v) },
} satisfies Meta<typeof Menu>;

export default meta;
type Story = StoryObj<typeof meta>;

const heading = {
  margin: 0,
  textTransform: "uppercase",
  font: "600 13px/1.2 var(--d2e-font-family)",
  color: "var(--d2e-color-neutral)",
} as const;

// Consolidated reference: the inline list (always visible) and the popover,
// opened from an activator button. Items show the selected / danger / disabled states.
export const Showcase: Story = {
  render: () => (
    <div style={{ display: "flex", gap: 48, alignItems: "flex-start" }}>
      <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <h3 style={heading}>Inline</h3>
        <Menu items={items} width={260} />
      </section>
      <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <h3 style={heading}>Popover</h3>
        <Menu
          items={items}
          width={260}
          activator={({ open }) => (
            <Button variant="secondary" onClick={open}>
              Open menu ▾
            </Button>
          )}
        />
      </section>
    </div>
  ),
};

export const Playground: Story = {};
