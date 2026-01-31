import type { FieldDefinition } from "../types/wizard";
import type { ConfigMeta } from "../config/cdwConfig";

interface Expression {
  type: "Expression";
  operator: string;
  value: string;
}

interface Attribute {
  type: "Attribute";
  configPath: string;
  instanceID: string;
  constraints: {
    type: "BooleanContainer";
    op: "OR";
    content: Expression[];
  };
}

interface FilterCard {
  type: "FilterCard";
  configPath: string;
  instanceNumber: number;
  instanceID: string;
  name: string;
  inactive: boolean;
  attributes: {
    type: "BooleanContainer";
    op: "AND";
    content: Attribute[];
  };
}

interface BooleanContainer {
  type: "BooleanContainer";
  op: "AND" | "OR";
  content: (BooleanContainer | FilterCard)[];
}

interface AxisSelection {
  attributeId: string;
  axis: string;
  configPath: string;
  instanceID: string;
  seq: number;
}

interface MriBookmark {
  filter: {
    configMetadata: { id: string; version: string };
    cards: BooleanContainer;
  };
  chartType: string;
  axisSelection: AxisSelection[];
  metadata: { version: number };
  datasetId: string;
}

/**
 * Build an MRI bookmark JSON that the cohort builder can understand.
 */
export function buildMriBookmark(
  fields: FieldDefinition[],
  formData: Record<string, any>,
  meta: ConfigMeta,
  datasetId: string,
): MriBookmark {
  const attributes: Attribute[] = [];

  for (const field of fields) {
    const value = formData[field.id];
    if (value === undefined || value === null || value === "") continue;
    if (!field.configPath) continue;

    attributes.push({
      type: "Attribute",
      configPath: field.configPath,
      instanceID: field.configPath,
      constraints: {
        type: "BooleanContainer",
        op: "OR",
        content: [
          {
            type: "Expression",
            operator: "=",
            value: String(value),
          },
        ],
      },
    });
  }

  const filterCard: FilterCard = {
    type: "FilterCard",
    configPath: "patient",
    instanceNumber: 1,
    instanceID: "patient",
    name: "Basic Data",
    inactive: false,
    attributes: {
      type: "BooleanContainer",
      op: "AND",
      content: attributes,
    },
  };

  // Standard nesting: AND > OR > FilterCard
  const cards: BooleanContainer = {
    type: "BooleanContainer",
    op: "AND",
    content: [
      {
        type: "BooleanContainer",
        op: "OR",
        content: [filterCard],
      },
    ],
  };

  const defaultAxisSelection: AxisSelection[] = Array.from({ length: 5 }, (_, i) => ({
    attributeId: "n/a",
    axis: ["x", "y", "color", "shape", "size"][i],
    configPath: "n/a",
    instanceID: "n/a",
    seq: i,
  }));

  return {
    filter: {
      configMetadata: { id: meta.configId, version: meta.configVersion },
      cards,
    },
    chartType: "stacked",
    axisSelection: defaultAxisSelection,
    metadata: { version: 3 },
    datasetId,
  };
}
