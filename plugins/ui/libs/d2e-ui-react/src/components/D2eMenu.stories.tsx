import type { Meta, StoryObj } from "@storybook/react-vite";
import { D2eMenu } from "./D2eMenu";
import { D2eButton } from "./D2eButton";

const items = [
  { label: "Rename", value: "rename", icon: "mdi-account" },
  { label: "Duplicate", value: "dup", selected: true },
  { label: "Delete", value: "del", danger: true },
  { label: "Archived", value: "arc", disabled: true },
];

const meta = {
  title: "Feedback/D2eMenu",
  component: D2eMenu,
  args: { items, width: 260, onSelect: (v: string) => console.log("select", v) },
} satisfies Meta<typeof D2eMenu>;

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
        <D2eMenu items={items} width={260} />
      </section>
      <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <h3 style={heading}>Popover</h3>
        <D2eMenu
          items={items}
          width={260}
          activator={({ open }) => (
            <D2eButton variant="secondary" onClick={open}>
              Open menu ▾
            </D2eButton>
          )}
        />
      </section>
    </div>
  ),
};

export const Playground: Story = {};
