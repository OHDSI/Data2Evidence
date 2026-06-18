import React from "react";
import { render, fireEvent } from "@testing-library/react";
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

it("close button calls onClose for info modal", () => {
  const onClose = jest.fn();
  const { getByTestId } = render(<Dialog open={true} title="Title" closable onClose={onClose} />);
  fireEvent.click(getByTestId("dialog-close"));
  expect(onClose).toHaveBeenCalledTimes(1);
});

it("close button routes to onRequestDiscard when confirmOnClose is set", () => {
  const onClose = jest.fn();
  const onRequestDiscard = jest.fn();
  const { getByTestId } = render(
    <Dialog open={true} title="Title" closable confirmOnClose onClose={onClose} onRequestDiscard={onRequestDiscard} />
  );
  fireEvent.click(getByTestId("dialog-close"));
  expect(onRequestDiscard).toHaveBeenCalledTimes(1);
  expect(onClose).not.toHaveBeenCalled();
});

it("backdrop click never dismisses (onClose not called)", () => {
  const onClose = jest.fn();
  const { baseElement } = render(<Dialog open={true} title="Title" onClose={onClose} />);
  const backdrop = baseElement.querySelector(".MuiBackdrop-root");
  expect(backdrop).toBeTruthy();
  fireEvent.click(backdrop as Element);
  expect(onClose).not.toHaveBeenCalled();
});

it("applies the size modifier class to the paper", () => {
  const { baseElement } = render(<Dialog open={true} title="Title" size="large" />);
  expect(baseElement.querySelector(".alp-dialog__paper--large")).toBeTruthy();
});

it("renders the description line", () => {
  const { getByTestId } = render(<Dialog open={true} title="Title" description="Some description" />);
  expect(getByTestId("dialog-description")).toHaveTextContent("Some description");
});

it("applies body padding only when bodyPadded is set", () => {
  const { baseElement, rerender } = render(<Dialog open={true} title="Title" />);
  expect(baseElement.querySelector(".alp-dialog__body--padded")).toBeNull();
  rerender(<Dialog open={true} title="Title" bodyPadded />);
  expect(baseElement.querySelector(".alp-dialog__body--padded")).toBeTruthy();
});

it("applies the block footer class only when block is set", () => {
  const { baseElement, rerender } = render(
    <Dialog open={true} title="Title" footerSlots={{ primary: <button>OK</button> }} />
  );
  expect(baseElement.querySelector(".alp-dialog__footer--block")).toBeNull();

  rerender(<Dialog open={true} title="Title" footerSlots={{ primary: <button>OK</button>, block: true }} />);
  expect(baseElement.querySelector(".alp-dialog__footer--block")).toBeTruthy();
});

it("renders footerSlots and disables the primary while loading", () => {
  const { getByTestId } = render(
    <Dialog
      open={true}
      title="Title"
      loading
      footerSlots={{
        actionLabel: "Action",
        onAction: () => {},
        primary: <button data-testid="primary-btn">Confirm</button>,
      }}
    />
  );
  expect(getByTestId("dialog-footer-action")).toHaveTextContent("Action");
  expect(getByTestId("dialog-loading")).toBeTruthy();
  expect(getByTestId("primary-btn")).toBeDisabled();
});
