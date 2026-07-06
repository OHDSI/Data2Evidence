import React from "react";
import { render } from "@testing-library/react";
import { AiAssistantButton } from "../AiAssistantButton";
import { AppProvider } from "../../../contexts";

const mockUseEnabledFeatures = jest.fn();

// Only the feature-flag hook needs stubbing; the translated label comes from the
// real AppProvider (default locale), so we verify the actual i18n wiring.
jest.mock("../../../hooks", () => ({
  useEnabledFeatures: () => mockUseEnabledFeatures(),
}));

const renderButton = () =>
  render(
    <AppProvider>
      <AiAssistantButton />
    </AppProvider>
  );

describe("AiAssistantButton", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("does not render when the aiAssistant feature is disabled", () => {
    mockUseEnabledFeatures.mockReturnValue([[], false, undefined]);

    const { queryByRole } = renderButton();

    expect(queryByRole("button")).toBeNull();
  });

  it("renders with the translated label when the aiAssistant feature is enabled", () => {
    mockUseEnabledFeatures.mockReturnValue([["aiAssistant"], false, undefined]);

    const { getByRole } = renderButton();

    expect(getByRole("button")).toHaveTextContent("AI assistant");
  });
});
