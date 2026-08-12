import React from "react";
import { render } from "@testing-library/react";
import { AskAiButton } from "../AskAiButton";
import { AppProvider } from "../../../../contexts";

const renderButton = (onClick?: () => void) =>
  render(
    <AppProvider>
      <AskAiButton onClick={onClick} />
    </AppProvider>
  );

describe("AskAiButton", () => {
  it("renders with the translated label", () => {
    const { getByRole } = renderButton();

    expect(getByRole("button")).toHaveTextContent("Ask D2E AI");
  });

  it("calls onClick when clicked", () => {
    const onClick = jest.fn();
    const { getByRole } = renderButton(onClick);

    getByRole("button").click();

    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
