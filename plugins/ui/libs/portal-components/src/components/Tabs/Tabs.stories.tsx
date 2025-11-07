import React from "react";
import { ComponentStory, ComponentMeta } from "@storybook/react";

import { Tabs } from "./Tabs";
import { Tab } from "./Tab";

// More on default export: https://storybook.js.org/docs/react/writing-stories/introduction#default-export
export default {
  title: "Components/Tabs",
  component: Tabs,
  subcomponents: { Tab },
  // More on argTypes: https://storybook.js.org/docs/react/api/argtypes
  argTypes: {},
} as ComponentMeta<typeof Tabs>;

// More on component templates: https://storybook.js.org/docs/react/writing-stories/introduction#using-args
const Template: ComponentStory<typeof Tabs> = (args) => (
  <Tabs {...args}>
    <Tab value="Hello" label="Hello"></Tab>
    <Tab value="World" label="World"></Tab>
  </Tabs>
);

export const Default = Template.bind({});
