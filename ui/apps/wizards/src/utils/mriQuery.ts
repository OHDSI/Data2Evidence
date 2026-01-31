import type { FieldDefinition } from "../types/wizard";
import type { ConfigMeta, ChartOptions } from "../config/cdwConfig";

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
  chartOptions?: ChartOptions,
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

  const axisNames = ["x1", "x2", "x3", "stack", "y"];
  const initialAttrs = chartOptions?.initialAttributes;

  const axisSelection: AxisSelection[] = axisNames.map((axis, i) => {
    let attributePath: string | undefined;

    // Index 0-2: categories (x1, x2, x3)
    if (i <= 2) {
      attributePath = initialAttrs?.categories?.[i];
    }
    // Index 3: stackCategory
    else if (i === 3) {
      attributePath = initialAttrs?.stackCategory?.[0];
    }
    // Index 4: measures (y)
    else if (i === 4) {
      attributePath = initialAttrs?.measures?.[0];
    }

    if (attributePath) {
      // Extract configPath (filter card path) and instanceID from the attribute path
      // e.g. "patient.attributes.pcount" -> configPath "patient", instanceID "patient.attributes.pcount"
      const parts = attributePath.split(".");
      const filterCardPath = parts[0];
      return {
        attributeId: attributePath,
        axis,
        configPath: filterCardPath,
        instanceID: attributePath,
        seq: i,
      };
    }

    return {
      attributeId: "n/a",
      axis,
      configPath: "n/a",
      instanceID: "n/a",
      seq: i,
    };
  });

  return {
    filter: {
      configMetadata: { id: meta.configId, version: meta.configVersion },
      cards,
    },
    chartType: chartOptions?.initialChart || "stacked",
    axisSelection,
    metadata: { version: 3 },
    datasetId,
  };
}
