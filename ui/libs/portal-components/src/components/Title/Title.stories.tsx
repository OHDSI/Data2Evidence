import React from "react";
import { ComponentStory, ComponentMeta } from "@storybook/react";

import { Title } from "./Title";

// More on default export: https://storybook.js.org/docs/react/writing-stories/introduction#default-export
export default {
  title: "Components/Title",
  component: Title,
  // More on argTypes: https://storybook.js.org/docs/react/api/argtypes
  argTypes: {
    defaultValue: { control: "text" },
  },
} as ComponentMeta<typeof Title>;

// More on component templates: https://storybook.js.org/docs/react/writing-stories/introduction#using-args
const Template: ComponentStory<typeof Title> = (args) => <Title {...args}>{args.defaultValue || "Title"}</Title>;

export const Default = Template.bind({});
// More on args: https://storybook.js.org/docs/react/writing-stories/args
Default.args = {
  type: "default",
};

export const NoType = Template.bind({});
// More on args: https://storybook.js.org/docs/react/writing-stories/args
NoType.args = {};
