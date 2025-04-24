import React from "react";
import { ComponentStory, ComponentMeta } from "@storybook/react";

import { TablePaginationActions } from "./TablePaginationActions";

// More on default export: https://storybook.js.org/docs/react/writing-stories/introduction#default-export
export default {
  title: "Components/TablePaginationActions",
  component: TablePaginationActions,
  // More on argTypes: https://storybook.js.org/docs/react/api/argtypes
  argTypes: {},
} as ComponentMeta<typeof TablePaginationActions>;

// More on component templates: https://storybook.js.org/docs/react/writing-stories/introduction#using-args
const Template: ComponentStory<typeof TablePaginationActions> = (args) => <TablePaginationActions {...args} />;

export const Default = Template.bind({});
