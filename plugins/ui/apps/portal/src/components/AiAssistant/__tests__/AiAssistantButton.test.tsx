import React from "react";
import { render } from "@testing-library/react";
import { AiAssistantButton } from "../AiAssistantButton";
import { AppProvider } from "../../../contexts";

// The button is now a dumb component; feature-gating is handled by the parent.
// No hook mocking needed — just verify the label renders correctly.
const renderButton = () =>
  render(
    <AppProvider>
      <AiAssistantButton />
    </AppProvider>
  );

describe("AiAssistantButton", () => {
  it("renders with the translated label", () => {
    const { getByRole } = renderButton();

    expect(getByRole("button")).toHaveTextContent("AI assistant");
  });
});
