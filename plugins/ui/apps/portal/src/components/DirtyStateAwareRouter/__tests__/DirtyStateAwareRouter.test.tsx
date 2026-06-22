import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { Routes, Route, Link } from "react-router-dom";
import { createMemoryHistory } from "@remix-run/router";
import { DirtyStateAwareRouter } from "../DirtyStateAwareRouter";

interface Registry {
  hasAnyUnsavedChanges: () => boolean;
  getDirtyApps: () => string[];
}

const setupRegistry = (dirty = false) => {
  const registry: Registry = {
    hasAnyUnsavedChanges: () => dirty,
    getDirtyApps: () => (dirty ? ["mri"] : []),
  };
  (window as any).__d2eUnsavedChangesRegistry = registry;
};

const TestApp: React.FC = () => (
  <>
    <Routes>
      <Route path="/" element={<div data-testid="home">Home</div>} />
      <Route path="/other" element={<div data-testid="other">Other</div>} />
    </Routes>
    <Link to="/other" data-testid="nav-link">
      Go
    </Link>
  </>
);

const renderWithRouter = (dirty = false) => {
  setupRegistry(dirty);
  const history = createMemoryHistory({ initialEntries: ["/"], v5Compat: true });
  return {
    history,
    ...render(
      <DirtyStateAwareRouter history={history}>
        <TestApp />
      </DirtyStateAwareRouter>
    ),
  };
};

describe("DirtyStateAwareRouter", () => {
  afterEach(() => {
    delete (window as any).__d2eUnsavedChangesRegistry;
  });

  it("navigates normally when no app is dirty", () => {
    renderWithRouter(false);

    fireEvent.click(screen.getByTestId("nav-link"));

    expect(screen.queryByTestId("other")).toBeTruthy();
    expect(screen.queryByTestId("unsaved-changes-dialog")).toBeFalsy();
  });

  it("blocks navigation and shows the unsaved-changes dialog when an app is dirty", () => {
    renderWithRouter(true);

    fireEvent.click(screen.getByTestId("nav-link"));

    expect(screen.queryByTestId("home")).toBeTruthy();
    expect(screen.queryByTestId("other")).toBeFalsy();
    expect(screen.queryByTestId("unsaved-changes-dialog")).toBeTruthy();
  });

  it("resumes navigation when the user chooses Leave", () => {
    renderWithRouter(true);

    fireEvent.click(screen.getByTestId("nav-link"));
    fireEvent.click(screen.getByTestId("unsaved-changes-leave"));

    expect(screen.queryByTestId("other")).toBeTruthy();
  });

  it("stays on the current page when the user chooses Cancel", () => {
    renderWithRouter(true);

    fireEvent.click(screen.getByTestId("nav-link"));
    fireEvent.click(screen.getByTestId("unsaved-changes-cancel"));

    expect(screen.queryByTestId("home")).toBeTruthy();
    expect(screen.queryByTestId("other")).toBeFalsy();
  });
});
