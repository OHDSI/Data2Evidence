import React from "react";
import { ComponentStory, ComponentMeta } from "@storybook/react";

import { Card } from "./Card";
import { ProfileIcon } from "../Icons";

// More on default export: https://storybook.js.org/docs/react/writing-stories/introduction#default-export
export default {
  title: "Components/Card",
  component: Card,
  // More on argTypes: https://storybook.js.org/docs/react/api/argtypes
  argTypes: {},
} as ComponentMeta<typeof Card>;

// More on component templates: https://storybook.js.org/docs/react/writing-stories/introduction#using-args
const Template: ComponentStory<typeof Card> = (args) => <Card {...args} />;
const sampleChildren = <p style={{ marginLeft: "1.5em" }}>Hello world</p>;

export const NoTitle = Template.bind({});
// More on args: https://storybook.js.org/docs/react/writing-stories/args
NoTitle.args = {
  children: sampleChildren,
};

export const WithTitle = Template.bind({});
// More on args: https://storybook.js.org/docs/react/writing-stories/args
WithTitle.args = {
  title: "With Title",
  children: sampleChildren,
};

export const WithCustomRadius = Template.bind({});
// More on args: https://storybook.js.org/docs/react/writing-stories/args
WithCustomRadius.args = {
  title: "With Custom Radius",
  children: sampleChildren,
  borderRadius: 20,
};

export const WithIcon = Template.bind({});
// More on args: https://storybook.js.org/docs/react/writing-stories/args
WithIcon.args = {
  title: "With Icon",
  children: sampleChildren,
  icon: ProfileIcon,
};
