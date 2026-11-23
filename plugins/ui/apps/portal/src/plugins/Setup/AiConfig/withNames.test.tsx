import React from "react";
import { render } from "@testing-library/react";
import { withNames } from "./withNames";

describe("withNames", () => {
  it("renders bold and plain placeholders in place", () => {
    const { container } = render(
      <p>{withNames("From {0} to {1} ({2}).", [{ bold: "A" }, { bold: "B" }, "model-b"])}</p>
    );
    expect(container.textContent).toBe("From A to B (model-b).");
    expect([...container.querySelectorAll("strong")].map((s) => s.textContent)).toEqual(["A", "B"]);
  });

  it("renders markup inside a name as literal text", () => {
    const { container } = render(<p>{withNames("Delete {0}?", [{ bold: "<b>x</b>" }])}</p>);
    expect(container.querySelector("b")).toBeNull();
    expect(container.querySelector("strong")?.textContent).toBe("<b>x</b>");
  });

  it("renders nothing for a placeholder with no argument", () => {
    const { container } = render(<p>{withNames("a{1}b", [])}</p>);
    expect(container.textContent).toBe("ab");
  });
});
