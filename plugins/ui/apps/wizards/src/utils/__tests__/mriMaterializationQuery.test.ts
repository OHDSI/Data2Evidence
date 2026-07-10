import { describe, expect, it } from "vitest";
import type { ConfigMeta } from "../../config/cdwConfig";
import type { FieldDefinition } from "../../types/wizard";
import { buildMriBookmark, type MriBookmark } from "../mriQuery";
import { buildMriMaterializationQuery } from "../mriMaterializationQuery";

const meta: ConfigMeta = { configId: "test-config", configVersion: "2" };

describe("buildMriMaterializationQuery", () => {
  it("builds the stable Cohort Builder materialization shape", () => {
    const { bookmark } = buildMriBookmark([], {}, meta, "active-dataset");

    const query = buildMriMaterializationQuery(bookmark, "active-dataset");

    expect(query).toEqual({
      cohortDefinition: {
        cards: bookmark.filter.cards,
        configData: { configId: "test-config", configVersion: "2" },
        guarded: true,
        axes: [],
      },
      datasetId: "active-dataset",
    });
  });

  it("preserves interaction cards and numeric range expressions", () => {
    const fields: FieldDefinition[] = [
      {
        id: "measurement-range",
        type: "num",
        label: "Measurement range",
        required: false,
        configPath: "patient.interactions.measurement.attributes.value",
      },
    ];
    const { bookmark } = buildMriBookmark(fields, { "measurement-range": "[50-80]" }, meta, "dataset-1");

    const query = buildMriMaterializationQuery(bookmark, "dataset-1");
    const filterCard = query.cohortDefinition.cards.content[0].content[0];

    expect(filterCard).toMatchObject({
      type: "FilterCard",
      configPath: "patient.interactions.measurement",
    });
    if (filterCard.type !== "FilterCard") {
      throw new Error("Expected an interaction filter card");
    }
    expect(filterCard.attributes.content[0].constraints.content).toEqual([
      { type: "Expression", operator: ">=", value: 50 },
      { type: "Expression", operator: "<=", value: 80 },
    ]);
  });

  it("does not include chart or dashboard presentation settings", () => {
    const { bookmark } = buildMriBookmark([], {}, meta, "dataset-1", {
      initialChart: "boxplot",
      initialAttributes: {
        categories: ["patient.attributes.Gender"],
        measures: ["patient.attributes.pcount"],
      },
    });

    const query = buildMriMaterializationQuery(bookmark, "dataset-1");

    expect(query.cohortDefinition).not.toHaveProperty("chartType");
    expect(query.cohortDefinition).not.toHaveProperty("axisSelection");
    expect(query).not.toHaveProperty("metadata");
  });

  it.each([
    ["dataset", bookmarkFixture(), ""],
    ["matching dataset", bookmarkFixture(), "other-dataset"],
    ["config id", invalidBookmark({ id: "", version: "2" }), "dataset-1"],
    ["config version", invalidBookmark({ id: "test-config", version: "" }), "dataset-1"],
    [
      "filter cards",
      {
        ...bookmarkFixture(),
        filter: { ...bookmarkFixture().filter, cards: null },
      } as unknown as MriBookmark,
      "dataset-1",
    ],
  ])("rejects an invalid %s", (_label, bookmark, datasetId) => {
    expect(() => buildMriMaterializationQuery(bookmark, datasetId)).toThrow();
  });
});

function bookmarkFixture(): MriBookmark {
  return buildMriBookmark([], {}, meta, "dataset-1").bookmark;
}

function invalidBookmark(configMetadata: { id: string; version: string }): MriBookmark {
  const bookmark = bookmarkFixture();
  return {
    ...bookmark,
    filter: { ...bookmark.filter, configMetadata },
  };
}
