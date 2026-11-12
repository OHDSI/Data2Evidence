import { AiConfig } from "../../../types/aiConfig";
import { connectionSummary, deleteVariant, sortAiConfigs, upsertAiConfig } from "./aiConfigList";

const cfg = (id: number, name: string, isActive = false, extra: Partial<AiConfig> = {}): AiConfig => ({
  id,
  name,
  provider: "anthropic",
  model: "m",
  baseUrl: null,
  region: null,
  workspaceId: null,
  apiKey: "***REDACTED***",
  isActive,
  ...extra,
});
const names = (rows: AiConfig[]) => rows.map((r) => r.name);

describe("sortAiConfigs", () => {
  it("puts the active row first, then A-Z", () => {
    expect(names(sortAiConfigs([cfg(1, "Zeta"), cfg(2, "beta"), cfg(3, "Mid", true)]))).toEqual([
      "Mid",
      "beta",
      "Zeta",
    ]);
  });

  it("orders Prod and prod the same whatever the insertion order", () => {
    const a = names(sortAiConfigs([cfg(1, "Prod"), cfg(2, "prod")]));
    const b = names(sortAiConfigs([cfg(2, "prod"), cfg(1, "Prod")]));
    expect(a).toEqual(b);
  });
});

describe("upsertAiConfig + sort", () => {
  const rows = [cfg(1, "Mid", true), cfg(2, "Alpha"), cfg(3, "Zeta")];

  it("moves a renamed row to its new position", () => {
    expect(names(sortAiConfigs(upsertAiConfig(rows, cfg(2, "Zulu"))))).toEqual(["Mid", "Zeta", "Zulu"]);
  });

  it("keeps the position when the name is unchanged", () => {
    const out = sortAiConfigs(upsertAiConfig(rows, cfg(3, "Zeta", false, { model: "new" })));
    expect(names(out)).toEqual(["Mid", "Alpha", "Zeta"]);
    expect(out[2].model).toBe("new");
  });

  it("places a new row in A-Z order, or first when it is the first config", () => {
    expect(names(sortAiConfigs(upsertAiConfig(rows, cfg(4, "Beta"))))).toEqual(["Mid", "Alpha", "Beta", "Zeta"]);
    expect(names(sortAiConfigs(upsertAiConfig([], cfg(5, "Only", true))))).toEqual(["Only"]);
  });
});

describe("connectionSummary", () => {
  const labels = { apiKey: "API key", workspace: "Workspace" };

  it("covers the three providers", () => {
    expect(connectionSummary(cfg(1, "a", false, { provider: "bedrock", region: "us-east-2" }), labels)).toBe(
      "API key · us-east-2"
    );
    expect(connectionSummary(cfg(1, "a", false, { workspaceId: "wrkspc_1" }), labels)).toBe(
      "API key · Workspace wrkspc_1"
    );
    expect(connectionSummary(cfg(1, "a"), labels)).toBe("API key");
    expect(
      connectionSummary(
        cfg(1, "a", false, { provider: "openai-compatible", baseUrl: "https://llm.example.com:8443/v1" }),
        labels
      )
    ).toBe("API key · llm.example.com");
  });
});

describe("deleteVariant", () => {
  const rows = [cfg(1, "A", true), cfg(2, "B")];
  it("is plain for a non-active row", () => expect(deleteVariant(rows[1], rows)).toBe("plain"));
  it("is active for the active row among others", () => expect(deleteVariant(rows[0], rows)).toBe("active"));
  it("is plain for the only row", () => expect(deleteVariant(rows[0], [rows[0]])).toBe("plain"));
});
