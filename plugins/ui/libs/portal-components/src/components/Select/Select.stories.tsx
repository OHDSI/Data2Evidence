import React from "react";
import { ComponentStory, ComponentMeta } from "@storybook/react";

import { Select } from "./Select";
import MenuItem from "@mui/material/MenuItem";

// More on default export: https://storybook.js.org/docs/react/writing-stories/introduction#default-export
export default {
  Text: "Components/Select",
  component: Select,
  subcomponents: { MenuItem },
  // More on argTypes: https://storybook.js.org/docs/react/api/argtypes
  argTypes: {},
} as ComponentMeta<typeof Select>;

export const Empty = (args) => <Select {...args} />;

// More on component templates: https://storybook.js.org/docs/react/writing-stories/introduction#using-args
const Template: ComponentStory<typeof Select> = (args) => (
  <Select {...args}>
    <MenuItem>Hello</MenuItem>
    <MenuItem>World</MenuItem>
  </Select>
);

export const SelectMenu = Template.bind({});
// More on args: https://storybook.js.org/docs/react/writing-stories/args
SelectMenu.args = {};
