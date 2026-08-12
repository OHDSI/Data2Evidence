import React from "react";
import { render, screen } from "@testing-library/react";
import { MessageBubble } from "../MessageBubble";
import { ChatMessage } from "../types";

const assistantMessage = (text: string): ChatMessage => ({ id: "m1", role: "assistant", text, tools: [] });

describe("MessageBubble links", () => {
  it("resolves a cohort deep link against this origin", () => {
    // What the agent produces when it prefixes the tool's path with a scheme: the "d2e"
    // path segment becomes the hostname.
    render(
      <MessageBubble
        message={assistantMessage(
          "Here you go: [Open the cohort](https://d2e/portal/researcher/cohort?datasetId=abc&linkType=cohort-definition&query=eJyr)"
        )}
      />
    );

    const link = screen.getByRole("link", { name: "Open the cohort" });
    expect(link).toHaveAttribute(
      "href",
      "http://localhost/d2e/portal/researcher/cohort?datasetId=abc&linkType=cohort-definition&query=eJyr"
    );
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("leaves an unrelated link untouched", () => {
    render(<MessageBubble message={assistantMessage("[Athena](https://athena.ohdsi.org/search-terms/terms/201826)")} />);

    expect(screen.getByRole("link", { name: "Athena" })).toHaveAttribute(
      "href",
      "https://athena.ohdsi.org/search-terms/terms/201826"
    );
  });

  it("does not render markdown in the user's own text", () => {
    render(<MessageBubble message={{ id: "m2", role: "user", text: "[not a link](https://example.com)", tools: [] }} />);

    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.getByText("[not a link](https://example.com)")).toBeInTheDocument();
  });
});
