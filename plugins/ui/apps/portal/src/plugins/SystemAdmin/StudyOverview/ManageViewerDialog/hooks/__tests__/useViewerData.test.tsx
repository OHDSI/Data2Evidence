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
  const { name, code, initialLoading, updateName, updateCode } = useViewerData({
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
      <div data-testid="loading">{String(initialLoading)}</div>
      <button data-testid="type-name" onClick={() => updateName(DASHBOARD_NAME)}>
        type name
      </button>
      <button data-testid="type-code" onClick={() => updateCode("print('hi')")}>
        type code
      </button>
    </>
  );
};

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
});
