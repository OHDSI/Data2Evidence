import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import { Tabs, Tab } from "./Tab";
import { TAB_SIZE_MAP, type TabSize } from "./tabSizes";

const SIZES = Object.keys(TAB_SIZE_MAP) as TabSize[];

const meta = {
  title: "Data display/Tab",
  component: Tabs,
  args: { size: "default" },
  argTypes: {
    size: { control: "inline-radio", options: SIZES },
  },
} satisfies Meta<typeof Tabs>;

export default meta;
type Story = StoryObj<typeof meta>;

type IconMode = "none" | "front" | "back";

function Rail({ size, icon }: { size: TabSize; icon: IconMode }) {
  const [value, setValue] = useState(0);
  const iconEl = icon === "none" ? undefined : <CheckCircleOutlineIcon />;
  const position = icon === "back" ? "back" : "front";
  return (
    <Tabs size={size} value={value} onChange={setValue}>
      <Tab label="Concept Sets" icon={iconEl} iconPosition={position} />
      <Tab label="Search" icon={iconEl} iconPosition={position} />
      <Tab label="Import" icon={iconEl} iconPosition={position} />
      <Tab label="Disabled" icon={iconEl} iconPosition={position} disabled />
    </Tabs>
  );
}

// Each size × icon placement. Hover / focus / pressed are interactive — select a
// tab, hover, or Tab-key to a tab to see the 4% / 12% overlays and navy indicator.
export const Showcase: Story = {
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 32, maxWidth: 720 }}>
      {SIZES.map((size) => (
        <section
          key={size}
          style={{ display: "flex", flexDirection: "column", gap: 20 }}
        >
          <h3
            style={{
              margin: 0,
              textTransform: "capitalize",
              font: "600 16px/1.2 var(--d2e-font-family)",
              color: "var(--d2e-color-primary)",
            }}
          >
            {size}
          </h3>
          {(["none", "front", "back"] as IconMode[]).map((icon) => (
            <Rail key={icon} size={size} icon={icon} />
          ))}
        </section>
      ))}
    </div>
  ),
};

export const Playground: Story = {
  render: ({ size }) => (
    <div style={{ maxWidth: 720 }}>
      <Rail size={size} icon="front" />
    </div>
  ),
};
