import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { MarkdownField } from "./MarkdownField";

const meta: Meta<typeof MarkdownField> = {
  title: "Components/MarkdownField",
  component: MarkdownField,
};
export default meta;

type Story = StoryObj<typeof MarkdownField>;

function Controlled(props: React.ComponentProps<typeof MarkdownField>) {
  const [value, setValue] = useState(props.value ?? "");
  return <MarkdownField {...props} value={value} onChange={setValue} />;
}

export const Showcase: Story = {
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 32, maxWidth: 720 }}>
      <Controlled label="Description" placeholder="Write something…" />
      <Controlled label="Required" required value="**Bold** start" />
      <Controlled label="With error" errorMessages="This field is required" />
      <Controlled label="Disabled" disabled value="Read-only content" />
    </div>
  ),
};

export const Playground: Story = {
  args: {
    label: "Description",
    placeholder: "Write something…",
    required: false,
    disabled: false,
    maxHeight: "150px",
  },
  render: (args) => <Controlled {...args} />,
};
