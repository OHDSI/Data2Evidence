import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { useViewerData } from "../useViewerData";
import { ConfigStrategy } from "../../configStrategies";

const DASHBOARD_NAME = "cross-sectional-demographics";

type StrategyOverrides = Partial<ConfigStrategy>;

const makeStrategy = (overrides: StrategyOverrides = {}): ConfigStrategy => ({
  fetchTemplates: jest.fn().mockResolvedValue([]),
  fetchCodes: jest.fn().mockResolvedValue([]),
  fetchStrategusCode: jest.fn().mockResolvedValue(""),
  saveCode: jest.fn().mockResolvedValue(undefined),
  supportsMultipleCodes: true,
  supportsQueries: true,
  ...overrides,
});

const Harness: React.FC<{
  strategy: ConfigStrategy;
  open: boolean;
  codeType: "dashboard" | "cohort";
}> = ({ strategy, open, codeType }) => {
  const { name, code, language, initialLoading, updateName, updateCode, updateLanguage, selectCode } = useViewerData({
    open,
    configId: "cfg-1",
    configType: "dashboard",
    codeType,
    strategy,
  });
  return (
    <>
      <div data-testid="name">{name}</div>
      <div data-testid="code">{code}</div>
      <div data-testid="language">{language}</div>
      <div data-testid="loading">{String(initialLoading)}</div>
      <button data-testid="type-name" onClick={() => updateName(DASHBOARD_NAME)}>
        type name
      </button>
      <button data-testid="type-code" onClick={() => updateCode("print('hi')")}>
        type code
      </button>
      <button data-testid="pick-r" onClick={() => updateLanguage("r")}>
        pick r
      </button>
      <button data-testid="select-r-app" onClick={() => selectCode("r-app")}>
        select r-app
      </button>
      <button data-testid="select-new" onClick={() => selectCode("__new__")}>
        select new
      </button>
    </>
  );
};

const PYTHON_AND_R_CODES = [
  { datasetId: "ds-1", name: "python-app", code: "python code", type: "dashboard", language: "python", queries: [] },
  { datasetId: "ds-1", name: "r-app", code: "r code", type: "dashboard", language: "r", queries: [] },
];

describe("useViewerData", () => {
  it("keeps a name the user typed while the initial fetch is still in flight", async () => {
    let resolveCodes: (value: []) => void = () => undefined;
    const codesPromise = new Promise<[]>((resolve) => {
      resolveCodes = resolve;
    });
    const strategy = makeStrategy({ fetchCodes: jest.fn(() => codesPromise as never) });

    render(<Harness strategy={strategy} open codeType="dashboard" />);

    fireEvent.click(screen.getByTestId("type-name"));
    expect(screen.getByTestId("name")).toHaveTextContent(DASHBOARD_NAME);

    await act(async () => {
      resolveCodes([]);
    });

    expect(screen.getByTestId("name")).toHaveTextContent(DASHBOARD_NAME);
  });

  it("reports loading on the first render when opened, before the fetch resolves", () => {
    const strategy = makeStrategy({
      fetchCodes: jest.fn(() => new Promise(() => undefined) as never),
    });

    // render() wraps in act(), which flushes the effect before it returns, so a
    // DOM assertion cannot see the first paint — the exact frame the E2E's
    // toBeHidden() check slips through. Record what the hook returned per render.
    const loadingPerRender: boolean[] = [];
    const Probe: React.FC = () => {
      const { initialLoading } = useViewerData({
        open: true,
        configId: "cfg-1",
        configType: "dashboard",
        codeType: "dashboard",
        strategy,
      });
      loadingPerRender.push(initialLoading);
      return null;
    };

    render(<Probe />);

    expect(loadingPerRender[0]).toBe(true);

    render(<Harness strategy={strategy} open codeType="dashboard" />);

    expect(screen.getByTestId("loading")).toHaveTextContent("true");
  });

  it("preserves typed edits across the refetch caused by a config-type switch", async () => {
    const strategy = makeStrategy({
      fetchCodes: jest.fn().mockResolvedValue([
        {
          datasetId: "ds-1",
          name: "server-side-name",
          code: "server code",
          type: "dashboard",
          queries: [],
        },
      ]),
    });

    const { rerender } = render(<Harness strategy={strategy} open codeType="dashboard" />);
    await act(async () => undefined);

    fireEvent.click(screen.getByTestId("type-name"));
    fireEvent.click(screen.getByTestId("type-code"));

    // Switching config type re-creates fetchData and re-runs the effect.
    rerender(<Harness strategy={strategy} open codeType="cohort" />);
    await act(async () => undefined);

    expect(screen.getByTestId("name")).toHaveTextContent(DASHBOARD_NAME);
    expect(screen.getByTestId("code")).toHaveTextContent("print('hi')");
  });

  it("still loads server data when the user has typed nothing", async () => {
    const strategy = makeStrategy({
      fetchCodes: jest.fn().mockResolvedValue([
        {
          datasetId: "ds-1",
          name: "server-side-name",
          code: "server code",
          type: "dashboard",
          queries: [],
        },
      ]),
    });

    render(<Harness strategy={strategy} open codeType="dashboard" />);
    await act(async () => undefined);

    expect(screen.getByTestId("name")).toHaveTextContent("server-side-name");
    expect(screen.getByTestId("code")).toHaveTextContent("server code");
    expect(screen.getByTestId("loading")).toHaveTextContent("false");
  });

  it("ignores a slow earlier fetch that resolves after a newer one", async () => {
    let resolveFirst: (value: never) => void = () => undefined;
    const firstCall = new Promise((resolve) => {
      resolveFirst = resolve as (value: never) => void;
    });
    const fetchCodes = jest
      .fn()
      .mockImplementationOnce(() => firstCall)
      .mockImplementationOnce(() =>
        Promise.resolve([
          {
            datasetId: "ds-1",
            name: "second-result",
            code: "second code",
            type: "dashboard",
            queries: [],
          },
        ])
      );
    const strategy = makeStrategy({ fetchCodes: fetchCodes as never });

    const { rerender } = render(<Harness strategy={strategy} open codeType="dashboard" />);
    // Let the first request get past `await fetchTemplates()` and actually reach
    // fetchCodes. Without this flush the first request is short-circuited by the
    // stale check before it ever calls fetchCodes, and the *second* request would
    // be the one handed the pending `firstCall` promise — inverting the scenario.
    await act(async () => undefined);
    expect(fetchCodes).toHaveBeenCalledTimes(1);

    rerender(<Harness strategy={strategy} open codeType="cohort" />);
    await act(async () => undefined);

    // The stale first request now lands; it must not overwrite the newer result.
    await act(async () => {
      resolveFirst([
        {
          datasetId: "ds-1",
          name: "first-result",
          code: "first code",
          type: "dashboard",
          queries: [],
        },
      ] as never);
    });

    expect(screen.getByTestId("name")).toHaveTextContent("second-result");
  });

  it("loads the language saved with the first code on open", async () => {
    const strategy = makeStrategy({ fetchCodes: jest.fn().mockResolvedValue(PYTHON_AND_R_CODES) });

    render(<Harness strategy={strategy} open codeType="dashboard" />);
    await act(async () => undefined);

    expect(screen.getByTestId("name")).toHaveTextContent("python-app");
    expect(screen.getByTestId("language")).toHaveTextContent("python");
  });

  it("switches to the language saved with the selected code", async () => {
    const strategy = makeStrategy({ fetchCodes: jest.fn().mockResolvedValue(PYTHON_AND_R_CODES) });

    render(<Harness strategy={strategy} open codeType="dashboard" />);
    await act(async () => undefined);

    fireEvent.click(screen.getByTestId("select-r-app"));
    expect(screen.getByTestId("language")).toHaveTextContent(/^r$/);

    fireEvent.click(screen.getByTestId("select-new"));
    expect(screen.getByTestId("language")).toBeEmptyDOMElement();
  });

  it("keeps a language the user picked while the initial fetch is still in flight", async () => {
    let resolveCodes: (value: typeof PYTHON_AND_R_CODES) => void = () => undefined;
    const codesPromise = new Promise<typeof PYTHON_AND_R_CODES>((resolve) => {
      resolveCodes = resolve;
    });
    const strategy = makeStrategy({ fetchCodes: jest.fn(() => codesPromise as never) });

    render(<Harness strategy={strategy} open codeType="dashboard" />);

    fireEvent.click(screen.getByTestId("pick-r"));

    await act(async () => {
      resolveCodes(PYTHON_AND_R_CODES);
    });

    expect(screen.getByTestId("language")).toHaveTextContent(/^r$/);
  });
});
