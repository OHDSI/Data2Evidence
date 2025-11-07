import React from "react";
import { ComponentStory, ComponentMeta } from "@storybook/react";

import { CollapsibleDrawer } from "./CollapsibleDrawer";

// More on default export: https://storybook.js.org/docs/react/writing-stories/introduction#default-export
export default {
  title: "Components/CollapsibleDrawer",
  component: CollapsibleDrawer,
  // More on argTypes: https://storybook.js.org/docs/react/api/argtypes
  argTypes: {},
} as ComponentMeta<typeof CollapsibleDrawer>;

// More on component templates: https://storybook.js.org/docs/react/writing-stories/introduction#using-args
const Template: ComponentStory<typeof CollapsibleDrawer> = (args) => <CollapsibleDrawer {...args} />;

export const Open = Template.bind({});
Open.args = {
  open: true,
  variant: "permanent",
};
