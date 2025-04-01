import React from "react";
import { ComponentStory, ComponentMeta } from "@storybook/react";

import { Dialog } from "./Dialog";
import { Feedback } from "../../types";

// More on default export: https://storybook.js.org/docs/react/writing-stories/introduction#default-export
export default {
  title: "Components/Dialog",
  component: Dialog,
  // More on argTypes: https://storybook.js.org/docs/react/api/argtypes
  argTypes: {},
} as ComponentMeta<typeof Dialog>;

// More on component templates: https://storybook.js.org/docs/react/writing-stories/introduction#using-args
const Template: ComponentStory<typeof Dialog> = (args) => <Dialog {...args} />;
const openClosable = { open: true, closable: true };
const sampleChildren = <p style={{ marginLeft: "1.5em" }}>Hello world</p>;
const sampleSuccessFeedback: Feedback = { type: "success", message: "Feedback", description: "Success Description" };
const sampleErrorFeedback: Feedback = { type: "error", message: "Feedback", description: "Error Description" };

export const Open = Template.bind({});
// More on args: https://storybook.js.org/docs/react/writing-stories/args
Open.args = {
  ...openClosable,
  title: "Open",
};

export const WithChildren = Template.bind({});
// More on args: https://storybook.js.org/docs/react/writing-stories/args
WithChildren.args = {
  ...openClosable,
  title: "With Children",
  children: sampleChildren,
};

export const NotClosable = Template.bind({});
// More on args: https://storybook.js.org/docs/react/writing-stories/args
NotClosable.args = {
  open: true,
  closable: false,
  title: "Not closable",
  children: sampleChildren,
};

export const Closed = Template.bind({});
// More on args: https://storybook.js.org/docs/react/writing-stories/args
Closed.args = {
  open: false,
  title: "Closed",
};

export const WithSuccessSnackbar = Template.bind({});
// More on args: https://storybook.js.org/docs/react/writing-stories/args
WithSuccessSnackbar.args = {
  ...openClosable,
  title: "Success Snackbar",
  children: sampleChildren,
  feedback: sampleSuccessFeedback,
};

export const WithErrorSnackbar = Template.bind({});
// More on args: https://storybook.js.org/docs/react/writing-stories/args
WithErrorSnackbar.args = {
  ...openClosable,
  title: "Error Snackbar",
  children: sampleChildren,
  feedback: sampleErrorFeedback,
};
