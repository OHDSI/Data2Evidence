import type { Meta, StoryObj } from "@storybook/react-vite";
import NotificationsOutlinedIcon from "@mui/icons-material/NotificationsOutlined";
import { Button } from "./Button";

const meta = {
  title: "Inputs/Button",
  component: Button,
  args: { children: "Button", variant: "primary", size: "md" },
  argTypes: {
    variant: {
      control: "select",
      options: ["primary", "secondary", "danger", "positive", "ghost"],
    },
    size: { control: "inline-radio", options: ["xs", "sm", "md", "lg"] },
  },
} satisfies Meta<typeof Button>;

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
              <Button key={size} variant={variant} size={size}>
                {size.toUpperCase()}
              </Button>
            ))}
            <Button variant={variant} prependIcon={<NotificationsOutlinedIcon />}>
              Icon front
            </Button>
            <Button variant={variant} appendIcon={<NotificationsOutlinedIcon />}>
              Icon back
            </Button>
            <Button variant={variant} disabled>
              Disabled
            </Button>
            <Button variant={variant} loading>
              Loading
            </Button>
          </div>
        </section>
      ))}
    </div>
  ),
};

export const Playground: Story = {};
