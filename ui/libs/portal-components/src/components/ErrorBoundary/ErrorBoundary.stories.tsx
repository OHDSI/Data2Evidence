import React from "react";
import { ComponentStory, ComponentMeta } from "@storybook/react";

import { ErrorBoundary } from "./ErrorBoundary";

// More on default export: https://storybook.js.org/docs/react/writing-stories/introduction#default-export
export default {
  title: "Components/ErrorBoundary",
  component: ErrorBoundary,
  // More on argTypes: https://storybook.js.org/docs/react/api/argtypes
  argTypes: {},
} as ComponentMeta<typeof ErrorBoundary>;

// More on component templates: https://storybook.js.org/docs/react/writing-stories/introduction#using-args
const Template: ComponentStory<typeof ErrorBoundary> = (args) => <ErrorBoundary {...args} />;

class ErrorComponent extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    if (true) {
      throw new Error("Error!");
    }
    return <div></div>;
  }
}

export const Error = Template.bind({});
Error.args = { name: "component", children: <ErrorComponent /> };
