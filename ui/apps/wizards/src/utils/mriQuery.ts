import type { FieldDefinition } from "../types/wizard";
import type { ConfigMeta, ChartOptions, CdwConfig } from "../config/cdwConfig";

interface Expression {
  type: "Expression";
  operator: string;
  value: string | number;
}

interface Attribute {
  type: "Attribute";
  configPath: string;
  instanceID: string;
  constraints: {
    type: "BooleanContainer";
    op: "AND" | "OR";
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
/**
 * Look up the display name for an interaction from the CDW config.
 * Config stores names as: patient.interactions.<key>.name = [{ lang: "", value: "Display Name" }]
 * Falls back to the path key with first letter capitalized.
 */
function getFilterCardName(cardPath: string, config?: CdwConfig): string {
  if (cardPath === "patient") return "Basic Data";

  // Traverse config dynamically to find the object at cardPath
  const parts = cardPath.split(".");
  let current: any = config;
  for (const part of parts) {
    current = current?.[part];
  }

  // Config stores name as either a string or an array of { lang, value }
  const nameVal = current?.name;
  if (typeof nameVal === "string" && nameVal) {
    return nameVal;
  }
  if (Array.isArray(nameVal) && nameVal.length > 0 && nameVal[0].value) {
    return nameVal[0].value;
  }

  // Fallback: use the last path segment, capitalized
  const key = parts[parts.length - 1];
  return key.charAt(0).toUpperCase() + key.slice(1);
}

/**
 * Parse a numeric expression string into Expression objects.
 *
 * Supported formats (comma-separated):
 *   >=60        → { operator: ">=", value: 60 }
 *   >50,<=70    → two expressions
 *   [50-80]     → >=50, <=80
 *   [50-80[     → >=50, <80
 *   ]50-80]     → >50, <=80
 *   ]50-80[     → >50, <80
 *   60          → { operator: "=", value: 60 }
 */
function parseNumericExpressions(value: string): Expression[] {
  const v = value.trim();

  // Range syntax: [50-80], [50-80[, ]50-80], ]50-80[
  const rangeMatch = v.match(/^([[\]])\s*(-?\d+(?:\.\d+)?)\s*-\s*(-?\d+(?:\.\d+)?)\s*([[\]])$/);
  if (rangeMatch) {
    const lowerOp = rangeMatch[1] === "[" ? ">=" : ">";
    const upperOp = rangeMatch[4] === "]" ? "<=" : "<";
    return [
      { type: "Expression", operator: lowerOp, value: Number(rangeMatch[2]) },
      { type: "Expression", operator: upperOp, value: Number(rangeMatch[3]) },
    ];
  }

  // Operator + number: >=60, >50, <=70, <80, =60, !=60
  const opMatch = v.match(/^(>=|<=|>|<|=|!=)\s*(-?\d+(?:\.\d+)?)$/);
  if (opMatch) {
    return [{ type: "Expression", operator: opMatch[1], value: Number(opMatch[2]) }];
  }

  // Plain number defaults to "="
  return [{ type: "Expression", operator: "=", value: Number(v) }];
}

export function buildMriBookmark(
  fields: FieldDefinition[],
  formData: Record<string, any>,
  meta: ConfigMeta,
  datasetId: string,
  chartOptions?: ChartOptions,
  config?: CdwConfig,
): MriBookmark {
  // Group attributes by their filter card path (everything before ".attributes.")
  const cardGroups = new Map<string, Attribute[]>();

  for (const field of fields) {
    const value = formData[field.id];
    if (value === undefined || value === null || value === "") continue;
    if (!field.configPath) continue;

    const attrIndex = field.configPath.indexOf(".attributes.");
    const cardPath = field.filterCardPath
      || (attrIndex >= 0 ? field.configPath.substring(0, attrIndex) : "patient");

    if (!cardGroups.has(cardPath)) {
      cardGroups.set(cardPath, []);
    }

    const expressions: Expression[] =
      field.type === "num"
        ? parseNumericExpressions(String(value))
        : [{ type: "Expression", operator: "=", value: String(value) }];

    // Numeric ranges use AND (e.g. >=50 AND <=80), single values and text use OR
    const constraintOp = field.type === "num" && expressions.length > 1 ? "AND" : "OR";

    cardGroups.get(cardPath)!.push({
      type: "Attribute",
      configPath: field.configPath,
      instanceID: field.configPath,
      constraints: {
        type: "BooleanContainer",
        op: constraintOp,
        content: expressions,
      },
    });

    // Add fixed attributes for compound fields (e.g. measurement concept name/id)
    if (field.fixedAttributes) {
      for (const fixed of field.fixedAttributes) {
        cardGroups.get(cardPath)!.push({
          type: "Attribute",
          configPath: fixed.configPath,
          instanceID: fixed.configPath,
          constraints: {
            type: "BooleanContainer",
            op: "OR",
            content: [
              {
                type: "Expression",
                operator: fixed.operator,
                value: fixed.value,
              },
            ],
          },
        });
      }
    }
  }

  // Ensure patient card always exists
  if (!cardGroups.has("patient")) {
    cardGroups.set("patient", []);
  }

  // Build a FilterCard for each group, each wrapped in its own OR container
  // Track letter suffixes per interaction type: "Condition Occurrence A", "Condition Occurrence B", etc.
  const typeCounters = new Map<string, number>();
  const filterCardContainers: BooleanContainer[] = [];
  for (const [cardPath, attributes] of cardGroups) {
    const baseName = getFilterCardName(cardPath, config);
    let name = baseName;
    if (cardPath !== "patient") {
      const count = typeCounters.get(baseName) || 0;
      const letter = String.fromCharCode(65 + count); // A, B, C...
      name = `${baseName} ${letter}`;
      typeCounters.set(baseName, count + 1);
    }

    const filterCard: FilterCard = {
      type: "FilterCard",
      configPath: cardPath,
      instanceNumber: 1,
      instanceID: cardPath,
      name,
      inactive: false,
      attributes: {
        type: "BooleanContainer",
        op: "AND",
        content: attributes,
      },
    };

    filterCardContainers.push({
      type: "BooleanContainer",
      op: "OR",
      content: [filterCard],
    });
  }

  // Standard nesting: AND > [OR > FilterCard, OR > FilterCard, ...]
  const cards: BooleanContainer = {
    type: "BooleanContainer",
    op: "AND",
    content: filterCardContainers,
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
