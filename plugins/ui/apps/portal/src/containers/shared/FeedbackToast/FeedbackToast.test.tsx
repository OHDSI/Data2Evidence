import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { FeedbackToast } from "./FeedbackToast";

let mockFeedback: Record<string, unknown> | undefined;
const mockClear = jest.fn();
jest.mock("../../../contexts", () => ({
  useFeedback: () => ({ getFeedback: () => mockFeedback, clearFeedback: mockClear }),
}));

describe("FeedbackToast alert", () => {
  it("is visible and renders messageNode when only messageNode is set", () => {
    mockFeedback = { variant: "alert", type: "success", messageNode: <b>Prod is active</b> };
    render(<FeedbackToast />);
    expect(screen.getByText("Prod is active").tagName).toBe("B");
  });

  it("renders message when only message is set", () => {
    mockFeedback = { variant: "alert", type: "success", message: "Saved" };
    render(<FeedbackToast />);
    expect(screen.getByText("Saved")).toBeInTheDocument();
  });
});

describe("FeedbackToast stacked alert", () => {
  beforeEach(() => mockClear.mockReset());

  it("renders two toasts in one stack when stackedMessageNode is set", () => {
    mockFeedback = { variant: "alert", type: "success", messageNode: "First", stackedMessageNode: <b>Second</b> };
    const { container } = render(<FeedbackToast />);
    expect(screen.getAllByTestId("alert")).toHaveLength(2);
    const stack = container.querySelector(".feedback-toast-stack") as HTMLElement;
    expect(stack).toHaveTextContent("FirstSecond");
    expect(screen.getByText("Second").tagName).toBe("B");
  });

  it("one close clears the feedback for both", () => {
    mockFeedback = { variant: "alert", type: "success", messageNode: "First", stackedMessageNode: "Second" };
    render(<FeedbackToast />);
    fireEvent.click(screen.getAllByRole("button")[0]);
    expect(mockClear).toHaveBeenCalledTimes(1);
  });

  it("renders exactly one toast, with no stack, without stackedMessageNode", () => {
    mockFeedback = { variant: "alert", type: "success", messageNode: "Only" };
    const { container } = render(<FeedbackToast />);
    expect(screen.getAllByTestId("alert")).toHaveLength(1);
    expect(container.querySelector(".feedback-toast-stack")).toBeNull();
  });

  it("keeps the legacy Snackbar path for a non-alert feedback", () => {
    mockFeedback = { type: "success", message: "Legacy" };
    const { container } = render(<FeedbackToast />);
    expect(screen.queryByTestId("alert")).toBeNull();
    expect(container.querySelector(".feedback-toast-stack")).toBeNull();
  });
});
