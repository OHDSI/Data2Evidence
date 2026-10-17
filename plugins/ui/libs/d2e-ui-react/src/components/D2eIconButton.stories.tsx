import type { Meta, StoryObj } from "@storybook/react-vite";
import NotificationsOutlinedIcon from "@mui/icons-material/NotificationsOutlined";
import { D2eIconButton } from "./D2eIconButton";
import {
  ICON_BUTTON_SIZE_MAP,
  type D2eIconButtonCategory,
  type D2eIconButtonSize,
} from "./iconButtonSizes";

const CATEGORIES: D2eIconButtonCategory[] = ["primary", "secondary", "no-stroke"];
const SIZES = Object.keys(ICON_BUTTON_SIZE_MAP) as D2eIconButtonSize[];

const meta = {
  title: "Inputs/D2eIconButton",
  component: D2eIconButton,
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
} satisfies Meta<typeof D2eIconButton>;

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
              <D2eIconButton
                key={size}
                category={category}
                size={size}
                ariaLabel={`Notifications ${size}`}
              >
                <NotificationsOutlinedIcon />
              </D2eIconButton>
            ))}
            <D2eIconButton category={category} ariaLabel="Disabled" disabled>
              <NotificationsOutlinedIcon />
            </D2eIconButton>
          </div>
        </section>
      ))}
    </div>
  ),
};

export const Playground: Story = {};
