import React from "react";
import { ComponentStory, ComponentMeta } from "@storybook/react";

import { ZipFileUpload } from "./ZipFileUpload";

// More on default export: https://storybook.js.org/docs/react/writing-stories/introduction#default-export
export default {
  ZipFileUpload: "Components/ZipFileUpload",
  component: ZipFileUpload,
} as ComponentMeta<typeof ZipFileUpload>;

// More on component templates: https://storybook.js.org/docs/react/writing-stories/introduction#using-args
const Template: ComponentStory<typeof ZipFileUpload> = (args) => <ZipFileUpload {...args} />;

export const Default = Template.bind({});
// More on args: https://storybook.js.org/docs/react/writing-stories/args
Default.args = {};
