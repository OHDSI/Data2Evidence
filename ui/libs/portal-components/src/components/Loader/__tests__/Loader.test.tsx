import React from "react";
import { render } from "@testing-library/react";
import "@testing-library/jest-dom/extend-expect";
import { Loader } from "../Loader";

it("renders correctly", () => {
  const { queryByTestId } = render(<Loader />);
  expect(queryByTestId("loader")).toBeTruthy();
});
