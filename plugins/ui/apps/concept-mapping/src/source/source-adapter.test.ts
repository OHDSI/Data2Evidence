import { describe, expect, test } from "vitest";
import {
  extractColumns,
  parseSqlResultColumns,
  buildNodeSourceData,
  buildCsvSourceData,
  sourceDataToCsvData,
} from "./source-adapter";
import { SourceData, SourceNodeDTO } from "../types/source";

describe("extractColumns", () => {
  test("py2table_node → map keys", () => {
    const node: SourceNodeDTO = {
      name: "Py2Table",
      type: "py2table_node",
      description: "",
      map: { person_id: ["id"], gender: ["sex"] },
    };
    expect(extractColumns(node)).toEqual(["person_id", "gender"]);
  });

  test("py2table_node with empty map → null", () => {
    const node: SourceNodeDTO = {
      name: "x",
      type: "py2table_node",
      description: "",
      map: {},
    };
    expect(extractColumns(node)).toBeNull();
  });

  test("sql_node with parseable result → row keys", () => {
    const node: SourceNodeDTO = {
      name: "SQL",
      type: "sql_node",
      description: "",
      result: JSON.stringify([{ code: "A", name: "Aspirin" }]),
    };
    expect(extractColumns(node)).toEqual(["code", "name"]);
  });

  test("sql_node without result → null (manual-confirm fallback)", () => {
    const node: SourceNodeDTO = {
      name: "SQL",
      type: "sql_node",
      description: "",
    };
    expect(extractColumns(node)).toBeNull();
  });

  test("unknown node type → null", () => {
    const node: SourceNodeDTO = {
      name: "x",
      type: "python_node",
      description: "",
    };
    expect(extractColumns(node)).toBeNull();
  });
});

describe("parseSqlResultColumns", () => {
  test("array of rows", () => {
    expect(parseSqlResultColumns(JSON.stringify([{ a: 1, b: 2 }]))).toEqual([
      "a",
      "b",
    ]);
  });
  test("single object", () => {
    expect(parseSqlResultColumns(JSON.stringify({ a: 1 }))).toEqual(["a"]);
  });
  test("garbage → null", () => {
    expect(parseSqlResultColumns("not json")).toBeNull();
    expect(parseSqlResultColumns(undefined)).toBeNull();
    expect(parseSqlResultColumns(JSON.stringify([]))).toBeNull();
  });
});

describe("buildSourceData", () => {
  test("node source carries columns + nodeMeta", () => {
    const node: SourceNodeDTO = {
      name: "Py2Table",
      type: "py2table_node",
      description: "desc",
      map: { a: [], b: [] },
    };
    expect(buildNodeSourceData(node)).toEqual({
      type: "node",
      columns: ["a", "b"],
      nodeMeta: {
        name: "Py2Table",
        type: "py2table_node",
        description: "desc",
      },
    });
  });

  test("node source with unknown columns yields empty columns", () => {
    const node: SourceNodeDTO = {
      name: "SQL",
      type: "sql_node",
      description: "",
    };
    expect(buildNodeSourceData(node).columns).toEqual([]);
  });

  test("csv source carries name + columns + rows", () => {
    expect(buildCsvSourceData("f.csv", ["a"], [{ a: 1 }])).toEqual({
      type: "csv",
      name: "f.csv",
      columns: ["a"],
      rows: [{ a: 1 }],
    });
  });
});

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

describe("sourceDataToCsvData", () => {
  test("csv source with rows becomes csvData with every row tagged status 'unchecked'", () => {
    const source: SourceData = {
      type: "csv",
      name: "codes.csv",
      columns: ["code", "name"],
      rows: [
        { code: "A1", name: "Aspirin" },
        { code: "B2", name: "Bacitracin" },
      ],
    };
    const result = sourceDataToCsvData(source);
    // Assert the fields we control exactly, and check sourceRowId shape separately below -
    // a full-object toEqual would be brittle against the freshly-generated UUID value.
    expect(result.data).toEqual([
      { code: "A1", name: "Aspirin", status: "unchecked", sourceRowId: result.data[0].sourceRowId },
      { code: "B2", name: "Bacitracin", status: "unchecked", sourceRowId: result.data[1].sourceRowId },
    ]);
    expect(result.name).toBe("codes.csv");
    expect(result.columns).toEqual(["code", "name"]);
  });

  test("every row gets a non-empty, unique sourceRowId", () => {
    const source: SourceData = {
      type: "csv",
      name: "codes.csv",
      columns: ["code", "name"],
      rows: [
        { code: "A1", name: "Aspirin" },
        { code: "A1", name: "Aspirin" }, // identical content - must still get a distinct id
      ],
    };
    const result = sourceDataToCsvData(source);
    const ids = result.data.map((r) => r.sourceRowId);
    ids.forEach((id) => {
      expect(id).toMatch(UUID_RE);
    });
    expect(new Set(ids).size).toBe(ids.length);
  });

  test("a row that already carries a sourceRowId keeps it (no regeneration on reload)", () => {
    const existingId = "11111111-1111-1111-1111-111111111111";
    const source: SourceData = {
      type: "csv",
      name: "codes.csv",
      columns: ["code", "name"],
      rows: [
        { code: "A1", name: "Aspirin", sourceRowId: existingId },
        { code: "B2", name: "Bacitracin" },
      ],
    };
    const result = sourceDataToCsvData(source);
    expect(result.data[0].sourceRowId).toBe(existingId);
    expect(result.data[1].sourceRowId).toMatch(UUID_RE);
    expect(result.data[1].sourceRowId).not.toBe(existingId);
  });

  test("node source (no rows client-side) yields an empty data array - a known, accepted limitation", () => {
    const source: SourceData = {
      type: "node",
      columns: ["a", "b"],
      nodeMeta: { name: "N", type: "py2table_node", description: "" },
    };
    expect(sourceDataToCsvData(source)).toEqual({ name: "", columns: ["a", "b"], data: [] });
  });
});
