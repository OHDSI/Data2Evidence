import React from "react";
import { render, fireEvent, screen } from "@testing-library/react";
import "@testing-library/jest-dom/extend-expect";
import { Snackbar } from "../Snackbar";

it("is hidden", () => {
  const { queryByTestId } = render(<Snackbar visible={false} />);
  expect(queryByTestId("snackbar")).toBeNull();
});

it("renders correctly", () => {
  const { queryByTestId } = render(<Snackbar visible={true} />);
  expect(queryByTestId("snackbar")).toBeTruthy();
});

it("shows message", () => {
  const { queryByTestId } = render(<Snackbar visible={true} message="Test message" />);
  expect(queryByTestId("snackbar-message")).toHaveTextContent("Test message");
});

it("shows close button", () => {
  const handleClose = jest.fn();
  const { queryByTestId } = render(<Snackbar visible={true} handleClose={handleClose} />);
  fireEvent.click(screen.getByTestId("snackbar-close"));

  expect(queryByTestId("snackbar-close")).toBeTruthy();
  expect(handleClose).toHaveBeenCalledTimes(1);
});
