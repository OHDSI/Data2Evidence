import React from "react";
import { ComponentStory, ComponentMeta } from "@storybook/react";
import TrashIcon from "../Icons/Trash";
import { IconButton } from "./IconButton";

// More on default export: https://storybook.js.org/docs/react/writing-stories/introduction#default-export
export default {
  title: "Components/IconButton",
  component: IconButton,
} as ComponentMeta<typeof IconButton>;

// More on component templates: https://storybook.js.org/docs/react/writing-stories/introduction#using-args
const Template: ComponentStory<typeof IconButton> = (args) => <IconButton {...args} />;

export const Icon = Template.bind({});
// More on args: https://storybook.js.org/docs/react/writing-stories/args
Icon.args = {
  startIcon: <TrashIcon />,
};

export const TextIcon = Template.bind({});
// More on args: https://storybook.js.org/docs/react/writing-stories/args
TextIcon.args = {
  startIcon: <TrashIcon />,
  title: "Delete",
};

export const TextIconOutlined = Template.bind({});
// More on args: https://storybook.js.org/docs/react/writing-stories/args
TextIconOutlined.args = {
  startIcon: <TrashIcon />,
  title: "Delete",
  variant: "outlined",
};

export const TextIconContained = Template.bind({});
// More on args: https://storybook.js.org/docs/react/writing-stories/args
TextIconContained.args = {
  startIcon: <TrashIcon />,
  title: "Delete",
  variant: "contained",
};

export const Loading = Template.bind({});
// More on args: https://storybook.js.org/docs/react/writing-stories/args
Loading.args = {
  startIcon: <TrashIcon />,
  loading: true,
};

export const Disabled = Template.bind({});
// More on args: https://storybook.js.org/docs/react/writing-stories/args
Disabled.args = {
  startIcon: <TrashIcon />,
  disabled: true,
};
