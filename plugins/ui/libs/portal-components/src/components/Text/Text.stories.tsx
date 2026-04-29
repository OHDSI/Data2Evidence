import React from "react";
import { ComponentStory, ComponentMeta } from "@storybook/react";

import { Text } from "./Text";

// More on default export: https://storybook.js.org/docs/react/writing-stories/introduction#default-export
export default {
  Text: "Components/Text",
  component: Text,
  // More on argTypes: https://storybook.js.org/docs/react/api/argtypes
  argTypes: {
    textWidth: { control: "text" },
    textFormat: {
      control: "radio",
      options: ["wrap", "double-wrap", "no-wrap"],
    },
    children: { control: "text" },
    textStyle: {
      control: "object",
    },
  },
} as ComponentMeta<typeof Text>;

// More on component templates: https://storybook.js.org/docs/react/writing-stories/introduction#using-args
const Template: ComponentStory<typeof Text> = (args) => <Text {...args} />;

export const Wrap = Template.bind({});
// More on args: https://storybook.js.org/docs/react/writing-stories/args
Wrap.args = {
  textWidth: "50px",
  textFormat: "wrap",
  children: "Hello world",
};

export const WrapStyled = Template.bind({});
// More on args: https://storybook.js.org/docs/react/writing-stories/args
WrapStyled.args = {
  textWidth: "50px",
  textFormat: "wrap",
  children: "Hello world",
  textStyle: { "font-weight": "bold" },
};

export const WrapCopy = Template.bind({});
// More on args: https://storybook.js.org/docs/react/writing-stories/args
WrapCopy.args = {
  textWidth: "50px",
  textFormat: "wrap",
  children: "Hello world",
  showCopy: true,
};

export const WrapCopyStyled = Template.bind({});
// More on args: https://storybook.js.org/docs/react/writing-stories/args
WrapCopyStyled.args = {
  textWidth: "50px",
  textFormat: "wrap",
  children: "Hello world",
  showCopy: true,
  buttonStyle: {
    paddingLeft: "1em",
  },
};

export const DoubleWrap = Template.bind({});
// More on args: https://storybook.js.org/docs/react/writing-stories/args
DoubleWrap.args = {
  textWidth: "50px",
  textFormat: "double-wrap",
  children: "Hello world",
};

export const DoubleWrapStyled = Template.bind({});
// More on args: https://storybook.js.org/docs/react/writing-stories/args
DoubleWrapStyled.args = {
  textWidth: "50px",
  textFormat: "double-wrap",
  children: "Hello world",
  textStyle: { "font-weight": "bold" },
};

export const DoubleWrapCopy = Template.bind({});
// More on args: https://storybook.js.org/docs/react/writing-stories/args
DoubleWrapCopy.args = {
  textWidth: "50px",
  textFormat: "double-wrap",
  children: "Hello world",
  showCopy: true,
};

export const DoubleWrapCopyStyled = Template.bind({});
// More on args: https://storybook.js.org/docs/react/writing-stories/args
DoubleWrapCopyStyled.args = {
  textWidth: "50px",
  textFormat: "double-wrap",
  children: "Hello world",
  showCopy: true,
  buttonStyle: {
    paddingLeft: "1em",
  },
};

export const NoWrap = Template.bind({});
// More on args: https://storybook.js.org/docs/react/writing-stories/args
NoWrap.args = {
  textWidth: "50px",
  textFormat: "no-wrap",
  children: "Hello world",
};

export const NoWrapStyled = Template.bind({});
// More on args: https://storybook.js.org/docs/react/writing-stories/args
NoWrapStyled.args = {
  textWidth: "50px",
  textFormat: "no-wrap",
  children: "Hello world",
  textStyle: { "font-weight": "bold" },
};

export const NoWrapCopy = Template.bind({});
// More on args: https://storybook.js.org/docs/react/writing-stories/args
NoWrapCopy.args = {
  textWidth: "50px",
  textFormat: "no-wrap",
  children: "Hello world",
  showCopy: true,
};

export const NoWrapCopyStyled = Template.bind({});
// More on args: https://storybook.js.org/docs/react/writing-stories/args
NoWrapCopyStyled.args = {
  textWidth: "50px",
  textFormat: "no-wrap",
  children: "Hello world",
  showCopy: true,
  buttonStyle: {
    paddingLeft: "1em",
  },
};
