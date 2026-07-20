import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { Routes, Route, Link } from "react-router-dom";
import { createMemoryHistory } from "@remix-run/router";
import { NavigationGuardRouter } from "../NavigationGuardRouter";

interface Registry {
  hasAnyUnsavedChanges: () => boolean;
  getDirtyApps: () => string[];
  clearAll: () => void;
}

const setupRegistry = (dirty = false) => {
  const state = { dirty };
  const clearAll = jest.fn();
  const registry: Registry = {
    hasAnyUnsavedChanges: () => state.dirty,
    getDirtyApps: () => (state.dirty ? ["mri"] : []),
    clearAll,
  };
  (window as any).__d2eUnsavedChangesRegistry = registry;
  return { clearAll, setDirty: (value: boolean) => (state.dirty = value) };
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
  const { clearAll, setDirty } = setupRegistry(dirty);
  const history = createMemoryHistory({ initialEntries: ["/"], v5Compat: true });
  return {
    history,
    clearAll,
    setDirty,
    ...render(
      <NavigationGuardRouter history={history}>
        <TestApp />
      </NavigationGuardRouter>
    ),
  };
};

describe("NavigationGuardRouter", () => {
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

  it("asks every dirty app to clear its state when the user chooses Leave", () => {
    const { clearAll } = renderWithRouter(true);

    fireEvent.click(screen.getByTestId("nav-link"));
    fireEvent.click(screen.getByTestId("unsaved-changes-leave"));

    expect(clearAll).toHaveBeenCalledTimes(1);
  });

  it("stays on the current page when the user chooses Cancel", () => {
    renderWithRouter(true);

    fireEvent.click(screen.getByTestId("nav-link"));
    fireEvent.click(screen.getByTestId("unsaved-changes-cancel"));

    expect(screen.queryByTestId("home")).toBeTruthy();
    expect(screen.queryByTestId("other")).toBeFalsy();
  });
});
