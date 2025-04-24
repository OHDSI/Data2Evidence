import React from "react";
import { render } from "@testing-library/react";
import "@testing-library/jest-dom/extend-expect";
import { Dialog } from "../Dialog";

it("renders correctly", () => {
  const { queryByTestId } = render(<Dialog open={true} title="Title" closable={true} />);
  expect(queryByTestId("dialog")).toBeTruthy();
});

it("is hidden", () => {
  const { queryByTestId } = render(<Dialog open={false} title="Title" closable={true} />);
  expect(queryByTestId("dialog")).toBeNull();
});

it("has title prop set", () => {
  const { queryByTestId } = render(<Dialog title="Title" closable={true} open={true} />);
  expect(queryByTestId("dialog-title")).toHaveTextContent("Title");
});

it("has close button", () => {
  const { queryByTestId } = render(<Dialog closable={true} title="Title" open={true} />);
  expect(queryByTestId("dialog-close")).toBeTruthy();
});
