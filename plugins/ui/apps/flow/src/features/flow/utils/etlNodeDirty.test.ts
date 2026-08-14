import { describe, expect, it } from "vitest";
import {
  ETL_NODE_TYPES,
  collectEtlNodeData,
  isEtlDirty,
} from "./etlNodeDirty";

describe("ETL_NODE_TYPES", () => {
  it("covers exactly the two ETL nodes in scope", () => {
    expect(Array.from(ETL_NODE_TYPES).sort()).toEqual([
      "rabbit_in_a_hat",
      "white_rabbit_node",
    ]);
  });
});

describe("collectEtlNodeData", () => {
  it("keeps only ETL node data, keyed by node id", () => {
    const nodes = [
      { id: "n1", type: "white_rabbit_node", data: { name: "WR" } },
      { id: "n2", type: "rabbit_in_a_hat", data: { name: "RiaH" } },
      { id: "n3", type: "python_node", data: { name: "Py" } },
    ];

    expect(collectEtlNodeData(nodes)).toEqual({
      n1: { name: "WR" },
      n2: { name: "RiaH" },
    });
  });

  it("returns an empty map for no nodes", () => {
    expect(collectEtlNodeData([])).toEqual({});
    expect(collectEtlNodeData(undefined)).toEqual({});
  });
});

describe("isEtlDirty", () => {
  const wr = (name: string) => [
    { id: "n1", type: "white_rabbit_node", data: { name } },
  ];

  it("is clean when ETL data matches the saved revision", () => {
    expect(isEtlDirty(wr("same"), wr("same"))).toBe(false);
  });

  it("is dirty when ETL data differs", () => {
    expect(isEtlDirty(wr("edited"), wr("saved"))).toBe(true);
  });

  it("is clean again when an edit is reverted", () => {
    expect(isEtlDirty(wr("saved"), wr("saved"))).toBe(false);
  });

  it("ignores changes to non-ETL nodes", () => {
    const live = [
      { id: "n1", type: "white_rabbit_node", data: { name: "same" } },
      { id: "n2", type: "python_node", data: { code: "changed" } },
    ];
    const saved = [
      { id: "n1", type: "white_rabbit_node", data: { name: "same" } },
      { id: "n2", type: "python_node", data: { code: "original" } },
    ];

    expect(isEtlDirty(live, saved)).toBe(false);
  });

  it("is dirty when a new ETL node has been added", () => {
    expect(isEtlDirty(wr("new"), [])).toBe(true);
  });

  it("is dirty when an ETL node has been deleted", () => {
    expect(isEtlDirty([], wr("gone"))).toBe(true);
  });

  it("is clean when neither side has ETL nodes", () => {
    const other = [{ id: "n9", type: "python_node", data: { code: "x" } }];
    expect(isEtlDirty(other, other)).toBe(false);
  });

  it("treats a missing saved revision as clean", () => {
    expect(isEtlDirty(wr("anything"), undefined)).toBe(false);
  });

  it("is order-independent", () => {
    const live = [
      { id: "n1", type: "white_rabbit_node", data: { name: "A" } },
      { id: "n2", type: "rabbit_in_a_hat", data: { name: "B" } },
    ];
    const saved = [
      { id: "n2", type: "rabbit_in_a_hat", data: { name: "B" } },
      { id: "n1", type: "white_rabbit_node", data: { name: "A" } },
    ];

    expect(isEtlDirty(live, saved)).toBe(false);
  });
});
