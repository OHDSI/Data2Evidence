import React from "react";
import { render } from "@testing-library/react";
import "@testing-library/jest-dom/extend-expect";
import { Switch } from "../Switch";

it("renders correctly", () => {
  const { queryByTestId } = render(<Switch title="1" />);
  expect(queryByTestId("switch")).toBeTruthy();
});
