import { describe, it, expect } from "vitest";
import { buildMriBookmark } from "../mriQuery";
import type { FieldDefinition } from "../../types/wizard";
import type { ConfigMeta } from "../../config/cdwConfig";

const meta: ConfigMeta = { configId: "test-config", configVersion: "2" };

describe("buildMriBookmark", () => {
  it("should produce correct top-level structure", () => {
    const fields: FieldDefinition[] = [];
    const { bookmark } = buildMriBookmark(fields, {}, meta, "ds-1");

    expect(bookmark.filter.configMetadata).toEqual({ id: "test-config", version: "2" });
    expect(bookmark.chartType).toBe("stacked");
    expect(bookmark.metadata).toEqual({ version: 3 });
    expect(bookmark.datasetId).toBe("ds-1");
    expect(bookmark.axisSelection).toHaveLength(5);
  });

  it("should create attribute for num field with value", () => {
    const fields: FieldDefinition[] = [
      { id: "age", type: "num", label: "Age", required: false, configPath: "patient.attributes.Age" },
    ];
    const formData = { age: 65 };

    const { bookmark } = buildMriBookmark(fields, formData, meta, "ds-1");

    const filterCard = bookmark.filter.cards.content[0].content[0] as any;
    expect(filterCard.type).toBe("FilterCard");
    expect(filterCard.configPath).toBe("patient");
    expect(filterCard.name).toBe("Basic Data");
    expect(filterCard.inactive).toBe(false);
    expect(filterCard.attributes.content).toHaveLength(1);

    const attr = filterCard.attributes.content[0];
    expect(attr.type).toBe("Attribute");
    expect(attr.configPath).toBe("patient.attributes.Age");
    expect(attr.constraints.content[0]).toEqual({
      type: "Expression",
      operator: "=",
      value: 65,
    });
  });

  it("should create attribute for text field with selected option", () => {
    const fields: FieldDefinition[] = [
      {
        id: "gender",
        type: "text",
        label: "Gender",
        required: false,
        configPath: "patient.attributes.Gender",
        options: [
          { label: "Male", value: "M" },
          { label: "Female", value: "F" },
        ],
      },
    ];
    const formData = { gender: "M" };

    const { bookmark } = buildMriBookmark(fields, formData, meta, "ds-1");
    const filterCard = bookmark.filter.cards.content[0].content[0] as any;
    const attr = filterCard.attributes.content[0];

    expect(attr.configPath).toBe("patient.attributes.Gender");
    expect(attr.constraints.content[0].value).toBe("M");
  });

  it("should skip fields without configPath", () => {
    const fields: FieldDefinition[] = [{ id: "notes", type: "text", label: "Notes", required: false }];
    const formData = { notes: "some text" };

    const { bookmark } = buildMriBookmark(fields, formData, meta, "ds-1");
    const filterCard = bookmark.filter.cards.content[0].content[0] as any;
    expect(filterCard.attributes.content).toHaveLength(0);
  });

  it("should skip fields with empty values", () => {
    const fields: FieldDefinition[] = [
      { id: "age", type: "num", label: "Age", required: false, configPath: "patient.attributes.Age" },
    ];
    const formData = { age: "" };

    const { bookmark } = buildMriBookmark(fields, formData, meta, "ds-1");
    const filterCard = bookmark.filter.cards.content[0].content[0] as any;
    expect(filterCard.attributes.content).toHaveLength(0);
  });

  it("should AND multiple attributes in one FilterCard", () => {
    const fields: FieldDefinition[] = [
      { id: "age", type: "num", label: "Age", required: false, configPath: "patient.attributes.Age" },
      { id: "gender", type: "text", label: "Gender", required: false, configPath: "patient.attributes.Gender" },
    ];
    const formData = { age: 30, gender: "F" };

    const { bookmark } = buildMriBookmark(fields, formData, meta, "ds-1");
    const filterCard = bookmark.filter.cards.content[0].content[0] as any;
    expect(filterCard.attributes.op).toBe("AND");
    expect(filterCard.attributes.content).toHaveLength(2);
  });

  it("should use standard AND > OR > FilterCard nesting", () => {
    const { bookmark } = buildMriBookmark([], {}, meta, "ds-1");
    expect(bookmark.filter.cards.type).toBe("BooleanContainer");
    expect(bookmark.filter.cards.op).toBe("AND");
    expect(bookmark.filter.cards.content[0]).toMatchObject({
      type: "BooleanContainer",
      op: "OR",
    });
  });

  it("should have all n/a axis selections when no chartOptions provided", () => {
    const { bookmark } = buildMriBookmark([], {}, meta, "ds-1");
    for (const axis of bookmark.axisSelection) {
      expect(axis.attributeId).toBe("n/a");
      expect(axis.configPath).toBe("n/a");
      expect(axis.instanceID).toBe("n/a");
    }
    expect(bookmark.axisSelection.map((a) => a.axis)).toEqual(["x1", "x2", "x3", "stack", "y"]);
  });

  it("should set Y axis from chartOptions.initialAttributes.measures", () => {
    const chartOptions = {
      initialAttributes: {
        measures: ["patient.attributes.pcount"],
        categories: [],
      },
    };
    const { bookmark } = buildMriBookmark([], {}, meta, "ds-1", chartOptions);
    const yAxis = bookmark.axisSelection.find((a) => a.axis === "y");
    expect(yAxis?.attributeId).toBe("patient.attributes.pcount");
    expect(yAxis?.configPath).toBe("patient");
    expect(yAxis?.instanceID).toBe("patient.attributes.pcount");
  });

  it("should set X1 axis from chartOptions.initialAttributes.categories", () => {
    const chartOptions = {
      initialAttributes: {
        measures: [],
        categories: ["patient.attributes.monthOfBirth"],
      },
    };
    const { bookmark } = buildMriBookmark([], {}, meta, "ds-1", chartOptions);
    const x1Axis = bookmark.axisSelection.find((a) => a.axis === "x1");
    expect(x1Axis?.attributeId).toBe("patient.attributes.monthOfBirth");
    expect(x1Axis?.configPath).toBe("patient");
    expect(x1Axis?.instanceID).toBe("patient.attributes.monthOfBirth");
  });

  it("should use chartOptions.initialChart for chartType", () => {
    const chartOptions = { initialChart: "boxplot" };
    const { bookmark } = buildMriBookmark([], {}, meta, "ds-1", chartOptions);
    expect(bookmark.chartType).toBe("boxplot");
  });
});
