import type { Meta, StoryObj } from "@storybook/react-vite";
import NotificationsOutlinedIcon from "@mui/icons-material/NotificationsOutlined";
import { IconButton } from "./IconButton";
import {
  ICON_BUTTON_SIZE_MAP,
  type IconButtonCategory,
  type IconButtonSize,
} from "./iconButtonSizes";

const CATEGORIES: IconButtonCategory[] = ["primary", "secondary", "no-stroke"];
const SIZES = Object.keys(ICON_BUTTON_SIZE_MAP) as IconButtonSize[];

const meta = {
  title: "Inputs/IconButton",
  component: IconButton,
  args: {
    ariaLabel: "Notifications",
    category: "primary",
    size: "md",
    children: <NotificationsOutlinedIcon />,
  },
  argTypes: {
    category: { control: "inline-radio", options: CATEGORIES },
    size: { control: "inline-radio", options: SIZES },
  },
} satisfies Meta<typeof IconButton>;

export default meta;
type Story = StoryObj<typeof meta>;

// Consolidated reference (Figma icon button). Hover/pressed are interactive and
// can't be shown statically here.
export const Showcase: Story = {
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
      {CATEGORIES.map((category) => (
        <section
          key={category}
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
            {category}
          </h3>
          <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
            {SIZES.map((size) => (
              <IconButton
                key={size}
                category={category}
                size={size}
                ariaLabel={`Notifications ${size}`}
              >
                <NotificationsOutlinedIcon />
              </IconButton>
            ))}
            <IconButton category={category} ariaLabel="Disabled" disabled>
              <NotificationsOutlinedIcon />
            </IconButton>
          </div>
        </section>
      ))}
    </div>
  ),
};

export const Playground: Story = {};
