import React from "react";
import { render, screen } from "@testing-library/react";
import { FeedbackToast } from "./FeedbackToast";

let mockFeedback: Record<string, unknown> | undefined;
jest.mock("../../../contexts", () => ({
  useFeedback: () => ({ getFeedback: () => mockFeedback, clearFeedback: jest.fn() }),
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
