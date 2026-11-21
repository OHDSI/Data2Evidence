import React from "react";
import { render } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { NotFoundRedirect } from "../NotFoundRedirect";
import { NOT_FOUND_URL } from "../../../../utils/notFound";

jest.mock("../../../../env", () => ({}));

/** A section shaped like Researcher: one routed page plus a single-spa app outside <Routes>. */
const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/researcher/*">
          <Route path="overview" element={<div>overview page</div>} />
          <Route path="*" element={<NotFoundRedirect section="researcher" appRoutes={["notebook"]} />} />
        </Route>
        <Route path="*" element={<NotFoundRedirect />} />
      </Routes>
    </MemoryRouter>
  );

describe("NotFoundRedirect", () => {
  const original = window.location;
  let replace: jest.Mock;

  beforeEach(() => {
    replace = jest.fn();
    delete (window as any).location;
    (window as any).location = { ...original, replace };
  });

  afterEach(() => {
    (window as any).location = original;
  });

  it("sends an unknown top-level URL to the not-found page", () => {
    renderAt("/abc");
    expect(replace).toHaveBeenCalledWith(NOT_FOUND_URL);
  });

  it("sends an unknown URL inside a section to the not-found page", () => {
    renderAt("/researcher/abc");
    expect(replace).toHaveBeenCalledWith(NOT_FOUND_URL);
  });

  it("leaves a routed page alone", () => {
    const { getByText } = renderAt("/researcher/overview");
    expect(getByText("overview page")).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it("leaves a single-spa app's URL alone, though React Router does not know it", () => {
    renderAt("/researcher/notebook/some-notebook");
    expect(replace).not.toHaveBeenCalled();
  });
});
