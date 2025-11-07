import React from "react";
import { ComponentStory, ComponentMeta } from "@storybook/react";

import { TableRow } from "./TableRow";
import { TableCell } from "./TableCell";

// More on default export: https://storybook.js.org/docs/react/writing-stories/introduction#default-export
export default {
  title: "Components/TableRow",
  component: TableRow,
  subcomponents: { TableCell },
  // More on argTypes: https://storybook.js.org/docs/react/api/argtypes
  argTypes: {},
} as ComponentMeta<typeof TableRow>;

const sampleCell = <TableCell>Hello</TableCell>;
const sampleColSpanCell = (
  <TableCell colSpan={2} align="center">
    World
  </TableCell>
);

// More on component templates: https://storybook.js.org/docs/react/writing-stories/introduction#using-args
const singleRow: ComponentStory<typeof TableRow> = (args) => <TableRow {...args} />;
const twoRows: ComponentStory<typeof TableRow> = (args) => (
  <>
    <TableRow {...args}>{sampleColSpanCell}</TableRow>
    <TableRow {...args}>
      {sampleCell}
      {sampleCell}
    </TableRow>
  </>
);

export const Empty = singleRow.bind({});

export const WithChildren = singleRow.bind({});
// More on args: https://storybook.js.org/docs/react/writing-stories/args
WithChildren.args = {
  children: sampleCell,
};

export const ColSpan = twoRows.bind({});
// More on args: https://storybook.js.org/docs/react/writing-stories/args
WithChildren.args = {
  children: sampleCell,
};
