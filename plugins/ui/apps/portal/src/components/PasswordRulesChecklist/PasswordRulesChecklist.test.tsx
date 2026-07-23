import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { AppProvider } from "../../contexts/app-context/AppContext";
import { PasswordRulesChecklist } from "./PasswordRulesChecklist";

jest.mock("../../axios/api", () => ({
  api: {
    translation: {
      getTranslation: jest.fn(),
    },
  },
}));

const renderChecklist = (password: string, showErrors = false) =>
  render(
    <AppProvider>
      <PasswordRulesChecklist password={password} showErrors={showErrors} />
    </AppProvider>
  );

describe("PasswordRulesChecklist", () => {
  it("renders all four rules", () => {
    renderChecklist("");
    expect(screen.getAllByRole("listitem")).toHaveLength(4);
  });

  it("marks satisfied rules as met", () => {
    renderChecklist("abcdefgh"); // meets minLength + letter only
    const items = screen.getAllByRole("listitem");
    expect(items[0]).toHaveClass("password-rules-checklist__item--met"); // min length
    expect(items[1]).toHaveClass("password-rules-checklist__item--met"); // letter
    expect(items[2]).not.toHaveClass("password-rules-checklist__item--met"); // number
    expect(items[3]).not.toHaveClass("password-rules-checklist__item--met"); // special
  });

  it("marks unmet rules as errors only when showErrors is set", () => {
    renderChecklist("abcdefgh", true);
    const items = screen.getAllByRole("listitem");
    expect(items[2]).toHaveClass("password-rules-checklist__item--error");
    expect(items[0]).not.toHaveClass("password-rules-checklist__item--error");
  });
});
