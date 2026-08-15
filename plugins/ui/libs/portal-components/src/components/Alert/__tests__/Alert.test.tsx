import React from "react";
import { render, fireEvent, screen, act } from "@testing-library/react";
import { Alert } from "../Alert";

it("renders message and title", () => {
  const { queryByTestId } = render(<Alert title="Heads up" message="Internal server error." />);
  expect(queryByTestId("alert-title")).toHaveTextContent("Heads up");
  expect(queryByTestId("alert-message")).toHaveTextContent("Internal server error.");
});

it("applies the severity class", () => {
  const { getByTestId } = render(<Alert severity="warning" message="msg" />);
  expect(getByTestId("alert").className).toContain("alp-alert--warning");
});

it("renders the action label and fires onAction", () => {
  const onAction = jest.fn();
  render(<Alert message="msg" actionLabel="Label" onAction={onAction} />);
  fireEvent.click(screen.getByTestId("alert-action"));
  expect(onAction).toHaveBeenCalledTimes(1);
});

it("does not render a close button when not dismissible", () => {
  const { queryByTestId } = render(<Alert variant="banner" message="msg" />);
  expect(queryByTestId("alert-close")).toBeNull();
});

it("shows close button on a dismissible banner and fires onClose", () => {
  const onClose = jest.fn();
  render(<Alert variant="banner" message="msg" dismissible onClose={onClose} />);
  fireEvent.click(screen.getByTestId("alert-close"));
  expect(onClose).toHaveBeenCalledTimes(1);
});

it("shows close button on a dismissible toast and fires onClose", () => {
  const onClose = jest.fn();
  render(<Alert variant="toast" message="msg" dismissible onClose={onClose} />);
  fireEvent.click(screen.getByTestId("alert-close"));
  expect(onClose).toHaveBeenCalledTimes(1);
});

it("auto-dismisses a non-dismissible toast after autoHideDuration", () => {
  jest.useFakeTimers();
  const onClose = jest.fn();
  render(<Alert variant="toast" message="msg" autoHideDuration={5000} onClose={onClose} />);
  expect(onClose).not.toHaveBeenCalled();
  act(() => {
    jest.advanceTimersByTime(5000);
  });
  expect(onClose).toHaveBeenCalledTimes(1);
  jest.useRealTimers();
});

it("does not auto-dismiss a dismissible toast", () => {
  jest.useFakeTimers();
  const onClose = jest.fn();
  render(<Alert variant="toast" message="msg" dismissible onClose={onClose} />);
  act(() => {
    jest.advanceTimersByTime(10000);
  });
  expect(onClose).not.toHaveBeenCalled();
  jest.useRealTimers();
});

it("is hidden when toast visible is false", () => {
  const { queryByTestId } = render(<Alert variant="toast" message="msg" visible={false} />);
  expect(queryByTestId("alert")).toBeNull();
});

it("plays the exit animation, then unmounts, when a visible toast is hidden", () => {
  jest.useFakeTimers();
  const { rerender, queryByTestId } = render(<Alert variant="toast" message="msg" visible />);
  expect(queryByTestId("alert")).not.toBeNull();

  // Flip to hidden: it stays mounted with the leaving class while the exit plays.
  act(() => {
    rerender(<Alert variant="toast" message="msg" visible={false} />);
  });
  expect(queryByTestId("alert")).not.toBeNull();
  expect(queryByTestId("alert")?.className).toContain("alp-alert--leaving");

  // After the exit animation window it unmounts.
  act(() => {
    jest.advanceTimersByTime(200);
  });
  expect(queryByTestId("alert")).toBeNull();
  jest.useRealTimers();
});
