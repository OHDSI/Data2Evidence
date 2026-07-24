import { describe, expect, it } from "vitest";
import { parseDataflowJson } from "../parseDataflowJson";

const validExport = {
  id: "df-1",
  name: "My flow",
  nodes: [
    { id: "a", type: "sql_node", position: { x: 0, y: 0 }, data: {} },
    { id: "b", type: "sql_node", position: { x: 100, y: 0 }, data: {} },
  ],
  edges: [{ id: "e1", source: "a", target: "b" }],
  variables: [{ key: "k", value: "v" }],
  importLibs: ["lib1"],
  databases: [],
  schemas: [],
};

describe("parseDataflowJson", () => {
  it("parses a valid exported dataflow", () => {
    const result = parseDataflowJson(JSON.stringify(validExport));
    expect(result.nodes).toHaveLength(2);
    expect(result.edges).toHaveLength(1);
    expect(result.variables).toEqual([{ key: "k", value: "v" }]);
    expect(result.importLibs).toEqual(["lib1"]);
    expect(result.databases).toEqual([]);
    expect(result.schemas).toEqual([]);
  });

  it("defaults missing optional arrays to empty", () => {
    const result = parseDataflowJson(
      JSON.stringify({ nodes: validExport.nodes, edges: validExport.edges })
    );
    expect(result.variables).toEqual([]);
    expect(result.importLibs).toEqual([]);
    expect(result.databases).toEqual([]);
    expect(result.schemas).toEqual([]);
  });

  it("drops edges pointing to unknown nodes", () => {
    const result = parseDataflowJson(
      JSON.stringify({
        ...validExport,
        edges: [
          { id: "e1", source: "a", target: "b" },
          { id: "e2", source: "a", target: "missing" },
        ],
      })
    );
    expect(result.edges).toHaveLength(1);
    expect(result.edges[0].id).toBe("e1");
  });

  it("throws on invalid JSON", () => {
    expect(() => parseDataflowJson("{ not json")).toThrow();
  });

  it("throws when the file is not a dataflow export object", () => {
    expect(() => parseDataflowJson(JSON.stringify([1, 2, 3]))).toThrow();
    expect(() => parseDataflowJson(JSON.stringify(null))).toThrow();
    expect(() => parseDataflowJson(JSON.stringify({ foo: "bar" }))).toThrow();
  });
});
