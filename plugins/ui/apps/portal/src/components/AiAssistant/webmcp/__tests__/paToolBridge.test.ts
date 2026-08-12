import {
  arePaToolsAvailable,
  callPaTool,
  getPaDatasetId,
  listPaTools,
  subscribePaTools,
  PA_TOOLS_CHANGED_EVENT,
} from "../paToolBridge";

// Stand-in for the registry PatientAnalytics.vue publishes (see
// apps/vue-mri-ui-lib/src/ai/paToolBridge.ts). Kept structurally identical so a
// contract change on that side breaks here.
const publish = (overrides: Partial<any> = {}) => {
  const call = jest.fn(async (_name: string, _args?: any) => ({
    content: [{ type: "text", text: '{"opened":true}' }],
  }));
  (window as any).__d2ePaTools = {
    version: 1,
    datasetId: "ds-1",
    list: () => [{ name: "pa_open_cohort", description: "Open a cohort", inputSchema: { type: "object" } }],
    call,
    ...overrides,
  };
  return call;
};

describe("paToolBridge", () => {
  afterEach(() => {
    delete (window as any).__d2ePaTools;
    jest.restoreAllMocks();
  });

  it("reports tools as unavailable when Patient Analytics is not mounted", () => {
    expect(arePaToolsAvailable()).toBe(false);
    expect(listPaTools()).toEqual([]);
    expect(getPaDatasetId()).toBeNull();
  });

  it("exposes the published tools and dataset", () => {
    publish();

    expect(arePaToolsAvailable()).toBe(true);
    expect(listPaTools().map((t) => t.name)).toEqual(["pa_open_cohort"]);
    expect(getPaDatasetId()).toBe("ds-1");
  });

  // A registry from a mismatched PA bundle could have different argument
  // semantics; calling it blind would drive the cohort with the wrong contract.
  it("ignores a registry with an unsupported version", () => {
    jest.spyOn(console, "warn").mockImplementation(() => {});
    publish({ version: 99 });

    expect(arePaToolsAvailable()).toBe(false);
    expect(listPaTools()).toEqual([]);
  });

  it("unwraps the MCP text envelope so the model gets the payload", async () => {
    publish();

    await expect(callPaTool("pa_open_cohort", { bmkId: "abc" })).resolves.toBe('{"opened":true}');
  });

  it("passes the arguments through to the registry", async () => {
    const call = publish();

    await callPaTool("pa_open_cohort", { bmkId: "abc" });

    expect(call).toHaveBeenCalledWith("pa_open_cohort", { bmkId: "abc" });
  });

  // These strings go back to the model as a tool result. A rejected promise would
  // end the turn; an actionable message lets it recover or tell the user.
  it("returns an actionable error instead of throwing when PA is closed", async () => {
    const result = JSON.parse(await callPaTool("pa_open_cohort"));

    expect(result.error).toMatch(/Patient Analytics is not open/i);
  });

  it("returns an actionable error instead of throwing when the tool fails", async () => {
    publish({
      call: jest.fn().mockRejectedValue(new Error('No cohort named "Diabetics".')),
    });

    const result = JSON.parse(await callPaTool("pa_open_cohort", { name: "Diabetics" }));

    expect(result.error).toBe('No cohort named "Diabetics".');
  });

  describe("subscribePaTools", () => {
    it("reports the current state immediately, then on every change", () => {
      publish();
      const handler = jest.fn();

      const unsubscribe = subscribePaTools(handler);
      expect(handler).toHaveBeenLastCalledWith(true);

      delete (window as any).__d2ePaTools;
      window.dispatchEvent(new CustomEvent(PA_TOOLS_CHANGED_EVENT, { detail: { available: false } }));
      expect(handler).toHaveBeenLastCalledWith(false);

      unsubscribe();
    });

    it("stops listening after unsubscribe", () => {
      const handler = jest.fn();
      const unsubscribe = subscribePaTools(handler);
      unsubscribe();
      handler.mockClear();

      publish();
      window.dispatchEvent(new CustomEvent(PA_TOOLS_CHANGED_EVENT, { detail: { available: true } }));

      expect(handler).not.toHaveBeenCalled();
    });
  });
});
