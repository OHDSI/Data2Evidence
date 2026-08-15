import React from "react";
import { act, render } from "@testing-library/react";
import "@testing-library/jest-dom";
import { AppProvider } from "./AppContext";
import { useFeedback } from "./hooks/use-feedback";

// Captures the latest hook value so the test can call helpers directly.
let latestHook: ReturnType<typeof useFeedback> | null = null;
const CaptureComponent = (): JSX.Element => {
  latestHook = useFeedback();
  return <div>TEST</div>;
};

beforeEach(() => {
  latestHook = null;
});

test("setSuccessFeedback stores an Alert-variant success toast", () => {
  render(
    <AppProvider>
      <CaptureComponent />
    </AppProvider>
  );

  act(() => {
    latestHook!.setSuccessFeedback("User added successfully");
  });

  expect(latestHook!.getFeedback()).toEqual({
    variant: "alert",
    type: "success",
    message: "User added successfully",
    autoClose: 5000,
  });
});
