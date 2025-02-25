import React from "react";
import { render } from "@testing-library/react";
import "@testing-library/jest-dom/extend-expect";
import { Select } from "../Select";
import MenuItem from "@mui/material/MenuItem";

it("renders correctly", () => {
  const { queryByTestId } = render(
    <Select defaultValue="1">
      <MenuItem value="1">One</MenuItem>
    </Select>
  );
  expect(queryByTestId("select")).toBeTruthy();
});
