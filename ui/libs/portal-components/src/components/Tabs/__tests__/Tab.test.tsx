import React from "react";
import { render } from "@testing-library/react";
import "@testing-library/jest-dom/extend-expect";
import { Tab } from "../Tab";

it("renders correctly", () => {
  const { queryByTestId } = render(<Tab value="new" label="New Tab" />);
  expect(queryByTestId("tab")).toBeTruthy();
  expect(queryByTestId("tab")).toHaveTextContent("New Tab");
});
