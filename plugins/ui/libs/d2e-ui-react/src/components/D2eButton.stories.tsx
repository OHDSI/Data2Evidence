import type { Meta, StoryObj } from "@storybook/react-vite";
import NotificationsOutlinedIcon from "@mui/icons-material/NotificationsOutlined";
import { D2eButton } from "./D2eButton";

const meta = {
  title: "Inputs/D2eButton",
  component: D2eButton,
  args: { children: "Button", variant: "primary", size: "md" },
  argTypes: {
    variant: {
      control: "select",
      options: ["primary", "secondary", "danger", "positive", "ghost"],
    },
    size: { control: "inline-radio", options: ["xs", "sm", "md", "lg"] },
  },
} satisfies Meta<typeof D2eButton>;

export default meta;
type Story = StoryObj<typeof meta>;

const SHOWCASE_VARIANTS = [
  "primary",
  "secondary",
  "danger",
  "positive",
  "ghost",
] as const;
const SHOWCASE_SIZES = ["xs", "sm", "md", "lg"] as const;

// Consolidated reference grid (Figma button page). Hover/focus/pressed are
// interactive states and can't be shown statically here.
export const Showcase: Story = {
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
      {SHOWCASE_VARIANTS.map((variant) => (
        <section
          key={variant}
          style={{ display: "flex", flexDirection: "column", gap: 12 }}
        >
          <h3
            style={{
              margin: 0,
              textTransform: "capitalize",
              font: "600 16px/1.2 var(--d2e-font-family)",
              color: "var(--d2e-color-primary)",
            }}
          >
            {variant}
          </h3>
          <div
            style={{
              display: "flex",
              gap: 16,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            {SHOWCASE_SIZES.map((size) => (
              <D2eButton key={size} variant={variant} size={size}>
                {size.toUpperCase()}
              </D2eButton>
            ))}
            <D2eButton variant={variant} prependIcon={<NotificationsOutlinedIcon />}>
              Icon front
            </D2eButton>
            <D2eButton variant={variant} appendIcon={<NotificationsOutlinedIcon />}>
              Icon back
            </D2eButton>
            <D2eButton variant={variant} disabled>
              Disabled
            </D2eButton>
            <D2eButton variant={variant} loading>
              Loading
            </D2eButton>
          </div>
        </section>
      ))}
    </div>
  ),
};

export const Playground: Story = {};
