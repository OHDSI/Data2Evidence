import React from "react";
import { render } from "@testing-library/react";
import "@testing-library/jest-dom/extend-expect";
import { Title, SubTitle } from "../Title";

it("renders title correctly", () => {
  const { queryByTestId } = render(<Title>Heading</Title>);
  expect(queryByTestId("title")).toBeTruthy();
  expect(queryByTestId("title")).toHaveTextContent("Heading");
});

it("renders subtitle correctly", () => {
  const { queryByTestId } = render(<SubTitle>Sub Heading</SubTitle>);
  expect(queryByTestId("title")).toBeTruthy();
  expect(queryByTestId("title")).toHaveClass("alp-title--subtitle");
});
