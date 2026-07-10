import { describe, expect, it } from "vitest";
import { areMriQueriesEquivalent, getMriQueryIdentity } from "../mriQueryComparator";

const cards = {
  type: "BooleanContainer",
  op: "AND",
  content: [
    {
      type: "BooleanContainer",
      op: "OR",
      content: [
        {
          type: "FilterCard",
          configPath: "patient",
          instanceNumber: 1,
          instanceID: "patient",
          name: "Basic Data",
          inactive: false,
          attributes: {
            type: "BooleanContainer",
            op: "AND",
            content: [
              {
                type: "Attribute",
                configPath: "patient.attributes.Age",
                instanceID: "patient.attributes.Age",
                constraints: {
                  type: "BooleanContainer",
                  op: "OR",
                  content: [{ type: "Expression", operator: ">=", value: 50 }],
                },
              },
            ],
          },
        },
      ],
    },
  ],
};

const bookmark = {
  filter: {
    configMetadata: { id: "test-config", version: "2" },
    cards,
  },
  chartType: "stacked",
  axisSelection: [],
  metadata: { version: 3 },
  datasetId: "dataset-1",
};

const materializationQuery = {
  cohortDefinition: {
    cards,
    configData: { configId: "test-config", configVersion: "2" },
    axes: [],
    guarded: true,
  },
  datasetId: "dataset-1",
};

describe("MRI query comparison", () => {
  it("matches a bookmark with its equivalent materialization query", () => {
    expect(areMriQueriesEquivalent(bookmark, materializationQuery)).toBe(true);
  });

  it("matches serialized bookmark JSON and bookmark API records", () => {
    expect(areMriQueriesEquivalent(JSON.stringify(bookmark), materializationQuery)).toBe(true);
    expect(areMriQueriesEquivalent(bookmark, JSON.stringify(materializationQuery))).toBe(true);
    expect(
      areMriQueriesEquivalent(
        {
          bmkId: "bookmark-1",
          bookmarkname: "wizards-1783670400000",
          bookmark: JSON.stringify(bookmark),
        },
        materializationQuery
      )
    ).toBe(true);
  });

  it("ignores object property order", () => {
    const reorderedBookmark = {
      datasetId: "dataset-1",
      filter: {
        cards: {
          content: cards.content,
          op: "AND",
          type: "BooleanContainer",
        },
        configMetadata: { version: "2", id: "test-config" },
      },
    };

    expect(getMriQueryIdentity(reorderedBookmark)).toBe(getMriQueryIdentity(bookmark));
  });

  it("ignores bookmark presentation fields and materialization request extras", () => {
    const differentPresentation = {
      ...bookmark,
      chartType: "boxplot",
      axisSelection: [{ axis: "x1", attributeId: "patient.attributes.Gender" }],
      metadata: { version: 999 },
    };
    const requestWithDifferentExtras = {
      ...materializationQuery,
      cohortDefinition: {
        ...materializationQuery.cohortDefinition,
        axes: [{ axis: "x1" }],
        columns: [{ configPath: "patient.attributes.Gender" }],
      },
    };

    expect(areMriQueriesEquivalent(differentPresentation, requestWithDifferentExtras)).toBe(true);
  });

  it.each([
    ["dataset", { ...bookmark, datasetId: "dataset-2" }],
    [
      "config id",
      {
        ...bookmark,
        filter: { ...bookmark.filter, configMetadata: { id: "other-config", version: "2" } },
      },
    ],
    [
      "config version",
      {
        ...bookmark,
        filter: { ...bookmark.filter, configMetadata: { id: "test-config", version: "3" } },
      },
    ],
    [
      "filter value",
      {
        ...bookmark,
        filter: {
          ...bookmark.filter,
          cards: JSON.parse(JSON.stringify(cards).replace('"value":50', '"value":60')),
        },
      },
    ],
    [
      "guarded mode",
      {
        ...materializationQuery,
        cohortDefinition: { ...materializationQuery.cohortDefinition, guarded: false },
      },
    ],
  ])("does not match when the %s changes", (_label, changedQuery) => {
    expect(areMriQueriesEquivalent(changedQuery, materializationQuery)).toBe(false);
  });

  it("preserves primitive types", () => {
    const stringValueQuery = JSON.parse(JSON.stringify(bookmark).replace('"value":50', '"value":"50"'));

    expect(areMriQueriesEquivalent(stringValueQuery, materializationQuery)).toBe(false);
  });

  it("preserves array order", () => {
    const twoExpressionBookmark = JSON.parse(JSON.stringify(bookmark));
    const expressions = twoExpressionBookmark.filter.cards.content[0].content[0].attributes.content[0].constraints
      .content as unknown[];
    expressions.push({ type: "Expression", operator: "<=", value: 80 });

    const reversedBookmark = JSON.parse(JSON.stringify(twoExpressionBookmark));
    reversedBookmark.filter.cards.content[0].content[0].attributes.content[0].constraints.content.reverse();

    expect(areMriQueriesEquivalent(twoExpressionBookmark, reversedBookmark)).toBe(false);
  });

  it.each([null, undefined, "not-json", {}, { bookmark: "not-json" }])(
    "returns no identity for invalid input %#",
    (invalidInput) => {
      expect(getMriQueryIdentity(invalidInput)).toBeNull();
      expect(areMriQueriesEquivalent(invalidInput, invalidInput)).toBe(false);
    }
  );

  it("rejects cyclic query values", () => {
    const cyclicCards: Record<string, unknown> = { type: "BooleanContainer" };
    cyclicCards.self = cyclicCards;

    expect(
      getMriQueryIdentity({
        ...bookmark,
        filter: { ...bookmark.filter, cards: cyclicCards },
      })
    ).toBeNull();
  });
});
