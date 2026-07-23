import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { useGuardedChange } from "../useGuardedChange";

const Harness: React.FC<{ commit: () => void }> = ({ commit }) => {
  const guard = useGuardedChange();
  return (
    <>
      <button data-testid="change" onClick={() => guard.request(commit)}>
        change
      </button>
      {guard.open && (
        <div data-testid="dialog">
          <button data-testid="leave" onClick={guard.onLeave}>
            leave
          </button>
          <button data-testid="cancel" onClick={guard.onCancel}>
            cancel
          </button>
        </div>
      )}
    </>
  );
};

const setupRegistry = (dirty: boolean) => {
  const clearAll = jest.fn();
  (window as any).__d2eUnsavedChangesRegistry = {
    hasAnyUnsavedChanges: () => dirty,
    getDirtyApps: () => (dirty ? ["mri"] : []),
    clearAll,
  };
  return { clearAll };
};

describe("useGuardedChange", () => {
  afterEach(() => {
    delete (window as any).__d2eUnsavedChangesRegistry;
  });

  it("commits immediately when nothing is dirty", () => {
    setupRegistry(false);
    const commit = jest.fn();
    render(<Harness commit={commit} />);

    fireEvent.click(screen.getByTestId("change"));

    expect(commit).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId("dialog")).toBeFalsy();
  });

  it("commits immediately when no registry is present", () => {
    const commit = jest.fn();
    render(<Harness commit={commit} />);

    fireEvent.click(screen.getByTestId("change"));

    expect(commit).toHaveBeenCalledTimes(1);
  });

  it("defers the commit and opens the dialog when dirty", () => {
    setupRegistry(true);
    const commit = jest.fn();
    render(<Harness commit={commit} />);

    fireEvent.click(screen.getByTestId("change"));

    expect(commit).not.toHaveBeenCalled();
    expect(screen.queryByTestId("dialog")).toBeTruthy();
  });

  it("commits and clears on Leave", () => {
    const { clearAll } = setupRegistry(true);
    const commit = jest.fn();
    render(<Harness commit={commit} />);

    fireEvent.click(screen.getByTestId("change"));
    fireEvent.click(screen.getByTestId("leave"));

    expect(clearAll).toHaveBeenCalledTimes(1);
    expect(commit).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId("dialog")).toBeFalsy();
  });

  it("does not commit on Cancel (stay)", () => {
    const { clearAll } = setupRegistry(true);
    const commit = jest.fn();
    render(<Harness commit={commit} />);

    fireEvent.click(screen.getByTestId("change"));
    fireEvent.click(screen.getByTestId("cancel"));

    expect(commit).not.toHaveBeenCalled();
    expect(clearAll).not.toHaveBeenCalled();
    expect(screen.queryByTestId("dialog")).toBeFalsy();
  });
});
