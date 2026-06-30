import React from "react";
import { fireEvent, render } from "@testing-library/react";
import { UnsavedChangesDialog } from "../UnsavedChangesDialog";

describe("UnsavedChangesDialog", () => {
  it("renders when open", () => {
    const { getByTestId, queryByTestId } = render(
      <UnsavedChangesDialog open={true} onLeave={jest.fn()} onCancel={jest.fn()} />
    );
    expect(getByTestId("unsaved-changes-dialog")).toBeTruthy();
    expect(queryByTestId("unsaved-changes-close")).toBeTruthy();
    expect(queryByTestId("unsaved-changes-leave")).toBeTruthy();
    expect(queryByTestId("unsaved-changes-cancel")).toBeTruthy();
  });

  it("does not render when closed", () => {
    const { queryByTestId } = render(
      <UnsavedChangesDialog open={false} onLeave={jest.fn()} onCancel={jest.fn()} />
    );
    expect(queryByTestId("unsaved-changes-dialog")).toBeNull();
  });

  it("calls onLeave when leave button is clicked", () => {
    const onLeave = jest.fn();
    const { getByTestId } = render(
      <UnsavedChangesDialog open={true} onLeave={onLeave} onCancel={jest.fn()} />
    );
    fireEvent.click(getByTestId("unsaved-changes-leave"));
    expect(onLeave).toHaveBeenCalledTimes(1);
  });

  it("calls onCancel when stay button is clicked", () => {
    const onCancel = jest.fn();
    const { getByTestId } = render(
      <UnsavedChangesDialog open={true} onLeave={jest.fn()} onCancel={onCancel} />
    );
    fireEvent.click(getByTestId("unsaved-changes-cancel"));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("calls onCancel when close icon is clicked", () => {
    const onCancel = jest.fn();
    const { getByTestId } = render(
      <UnsavedChangesDialog open={true} onLeave={jest.fn()} onCancel={onCancel} />
    );
    fireEvent.click(getByTestId("unsaved-changes-close"));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
