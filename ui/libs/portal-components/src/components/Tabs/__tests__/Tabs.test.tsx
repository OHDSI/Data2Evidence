import React from "react";
import { render } from "@testing-library/react";
import "@testing-library/jest-dom/extend-expect";
import { Tabs } from "../Tabs";
import { Tab } from "../Tab";

it("renders correctly", () => {
  const { queryByTestId } = render(
    <Tabs value="new">
      <Tab value="new" label="New Tab" />
    </Tabs>
  );
  expect(queryByTestId("tabs")).toBeTruthy();
});
