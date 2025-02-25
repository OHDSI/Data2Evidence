import React from "react";
import { ComponentStory, ComponentMeta } from "@storybook/react";

import { Snackbar } from "./Snackbar";

// More on default export: https://storybook.js.org/docs/react/writing-stories/introduction#default-export
export default {
  title: "Components/Snackbar",
  component: Snackbar,
  // More on argTypes: https://storybook.js.org/docs/react/api/argtypes
  argTypes: {},
} as ComponentMeta<typeof Snackbar>;

// More on component templates: https://storybook.js.org/docs/react/writing-stories/introduction#using-args
const Template: ComponentStory<typeof Snackbar> = (args) => <Snackbar {...args} />;

export const Success = Template.bind({});
// More on args: https://storybook.js.org/docs/react/writing-stories/args
Success.args = {
  visible: true,
  type: "success",
  message: "Success!",
};

export const SuccessDescription = Template.bind({});
// More on args: https://storybook.js.org/docs/react/writing-stories/args
SuccessDescription.args = {
  visible: true,
  type: "success",
  message: "Success!",
  description: "Message Description",
};

export const SuccessWithClose = Template.bind({});
// More on args: https://storybook.js.org/docs/react/writing-stories/args
SuccessWithClose.args = {
  visible: true,
  type: "success",
  message: "Success!",
  handleClose: () => {},
};

export const Error = Template.bind({});
// More on args: https://storybook.js.org/docs/react/writing-stories/args
Error.args = {
  visible: true,
  type: "error",
  message: "Error!",
};

export const ErrorDescription = Template.bind({});
// More on args: https://storybook.js.org/docs/react/writing-stories/args
ErrorDescription.args = {
  visible: true,
  type: "error",
  message: "Error!",
  description: "Error Description",
};

export const ErrorWithClose = Template.bind({});
// More on args: https://storybook.js.org/docs/react/writing-stories/args
ErrorWithClose.args = {
  visible: true,
  type: "error",
  message: "Error!",
  handleClose: () => {},
};

export const NotVisible = Template.bind({});
// More on args: https://storybook.js.org/docs/react/writing-stories/args
NotVisible.args = {
  visible: false,
};
