import React from "react";
import { act, render } from "@testing-library/react";
import { PaToolsState, usePaTools } from "../usePaTools";
import { PA_TOOLS_CHANGED_EVENT } from "../paToolBridge";

// The portal's active dataset, driven per test: the mismatch guard compares it
// against whatever dataset Patient Analytics has loaded.
let mockActiveDatasetId: string | undefined;

jest.mock("../../../../contexts", () => ({
  useActiveDataset: () => ({ activeDataset: mockActiveDatasetId ? { id: mockActiveDatasetId } : undefined }),
}));

// Stand-in for the registry PatientAnalytics.vue publishes on mount (see
// apps/vue-mri-ui-lib/src/ai/paToolBridge.ts).
const publish = (datasetId: string | null = "ds-1") => {
  const registry = {
    version: 1,
    datasetId,
    list: () => [{ name: "pa_get_current_cohort", description: "Read the cohort", inputSchema: { type: "object" } }],
    call: jest.fn(),
  };
  (window as any).__d2ePaTools = registry;
  return registry;
};

const announce = () => window.dispatchEvent(new CustomEvent(PA_TOOLS_CHANGED_EVENT));

// The latest hook value, so assertions can read the derived state.
let state: PaToolsState;

const Probe = () => {
  state = usePaTools();
  return null;
};

// One tick of the safety-net interval.
const passTime = () => act(() => void jest.advanceTimersByTime(1500));

describe("usePaTools", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockActiveDatasetId = undefined;
  });

  afterEach(() => {
    jest.useRealTimers();
    delete (window as any).__d2ePaTools;
  });

  it("reports the tools as soon as PA announces itself", () => {
    render(<Probe />);
    expect(state.available).toBe(false);

    publish();
    act(() => announce());

    expect(state.available).toBe(true);
    expect(state.tools.map((t) => t.name)).toEqual(["pa_get_current_cohort"]);
  });

  // The reported bug: navigating off the cohort route and back re-mounts PA, and
  // any lost mount announcement used to leave the drawer telling the user to open
  // a builder that was already on screen — with no way back short of a refresh.
  it("picks up a builder that mounted without an announcement reaching it", () => {
    render(<Probe />);
    expect(state.available).toBe(false);

    publish();
    passTime();

    expect(state.available).toBe(true);
    expect(state.tools).toHaveLength(1);
  });

  it("notices the builder going away without an announcement", () => {
    publish();
    render(<Probe />);
    expect(state.available).toBe(true);

    delete (window as any).__d2ePaTools;
    passTime();

    expect(state.available).toBe(false);
    expect(state.tools).toEqual([]);
  });

  it("re-reads PA's dataset, which can resolve after the announcement", () => {
    mockActiveDatasetId = "ds-1";
    // PA announces before its own dataset has landed, so the ids agree at first.
    const registry = publish(null);
    render(<Probe />);
    expect(state.datasetMismatch).toBe(false);
    expect(state.tools).toHaveLength(1);

    registry.datasetId = "ds-2";
    passTime();

    expect(state.datasetMismatch).toBe(true);
    expect(state.tools).toEqual([]);
  });

  it("stops re-reading once unmounted", () => {
    const { unmount } = render(<Probe />);
    unmount();

    publish();
    passTime();

    expect(state.available).toBe(false);
  });
});
