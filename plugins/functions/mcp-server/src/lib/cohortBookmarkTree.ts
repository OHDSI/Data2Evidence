import type { ConfigStamp } from "./cohortBuilder";

/**
 * Multi-card bookmark serializer for the PA cohort builder deep link.
 *
 * Ported and generalised from `wizards/src/utils/mriQuery.ts:buildMriBookmark`,
 * which is pinned against the real `BMv2Parser`. It takes constraints that have
 * already been resolved (attribute paths matched against the dataset config,
 * values resolved to the form PA expects) and emits the bookmark tree the loader
 * accepts: `filter.cards = AND > [ inclusion: OR > FilterCard, exclusion: NOT >
 * (OR > FilterCard) ]`.
 *
 * Two things this adds over the stiff age/gender builder:
 *  - any number of cards / interaction cards, grouped by `cardInstanceKey`;
 *  - card-level exclusion via a `NOT` container (confirmed: `BMv2Parser`
 *    `addNot`, and query.ts serialises `excludeFilter` as `Not([filterCard])`).
 *
 * Scope note: emits the minimal filter-only bookmark (no axisSelection/chartType)
 * — the cohort-definition deep link doesn't chart, matching the working POC.
 */

export interface CohortExpression {
  operator: string; // ">=", "<=", "=", "<", ">", "!="
  value: string | number;
}

/**
 * One resolved attribute constraint. `cardInstanceKey` groups constraints that
 * must live in the SAME filter-card instance (e.g. a measurement's concept name
 * + its numeric value), while two clauses with different keys on the same
 * `cardConfigPath` become separate cards ("Condition Occurrence A" / "B").
 */
export interface CohortConstraint {
  /** Generic card path: "patient" | "patient.interactions.<key>". */
  cardConfigPath: string;
  /** Display name for the card, e.g. "Basic Data", "Condition Occurrence". */
  cardName: string;
  /** Groups constraints into one card instance. */
  cardInstanceKey: string;
  /** Card-level exclusion → wrap in a NOT container. */
  exclude?: boolean;
  /** Generic attribute path, e.g. "patient.attributes.Age". */
  attributeConfigPath: string;
  /** Expressions for this attribute. */
  expressions: CohortExpression[];
  /** How to combine the expressions; defaults to OR (AND for numeric ranges). */
  combine?: "AND" | "OR";
}

interface Attribute {
  type: "Attribute";
  configPath: string;
  instanceID: string;
  constraints: {
    type: "BooleanContainer";
    op: "AND" | "OR";
    content: ({ type: "Expression" } & CohortExpression)[];
  };
}

interface FilterCard {
  type: "FilterCard";
  configPath: string;
  instanceNumber: number;
  instanceID: string;
  name: string;
  inactive: boolean;
  attributes: { type: "BooleanContainer"; op: "AND"; content: Attribute[] };
}

interface BooleanContainer {
  type: "BooleanContainer";
  op: "AND" | "OR" | "NOT";
  content: (BooleanContainer | FilterCard)[];
}

interface CohortBookmark {
  filter: {
    configMetadata: { id: string; version: string };
    cards: BooleanContainer;
  };
  metadata: { version: number };
}

/** Last path segment, e.g. "patient.attributes.Age" -> "Age". */
function attrKey(configPath: string): string {
  return configPath.split(".").pop() || configPath;
}

/**
 * Build the bookmark tree from resolved constraints. Constraints sharing a
 * `cardInstanceKey` are merged into one FilterCard; cards are letter-suffixed
 * per card type (mirroring buildMriBookmark) and excluded cards are wrapped in
 * NOT. The patient card keeps `instanceID:"patient"`, `instanceNumber:1`.
 */
export function buildCohortBookmarkTree(
  constraints: CohortConstraint[],
  config: ConfigStamp,
): CohortBookmark {
  // Group constraints by card instance, preserving first-seen order.
  const order: string[] = [];
  const groups = new Map<
    string,
    { cardConfigPath: string; cardName: string; exclude: boolean; attrs: CohortConstraint[] }
  >();
  for (const c of constraints) {
    let g = groups.get(c.cardInstanceKey);
    if (!g) {
      g = {
        cardConfigPath: c.cardConfigPath,
        cardName: c.cardName,
        exclude: !!c.exclude,
        attrs: [],
      };
      groups.set(c.cardInstanceKey, g);
      order.push(c.cardInstanceKey);
    }
    // Any constraint in the group marking exclude makes the card excluded.
    if (c.exclude) g.exclude = true;
    g.attrs.push(c);
  }

  // Letter suffix per card type ("Condition Occurrence A/B"); instance number
  // per generic card path (.1, .2) for unique instanceIDs.
  const typeCounters = new Map<string, number>();
  const instanceCounters = new Map<string, number>();
  const containers: BooleanContainer[] = [];

  for (const key of order) {
    const g = groups.get(key)!;
    const isPatient = g.cardConfigPath === "patient";

    let name = g.cardName;
    if (!isPatient) {
      const used = typeCounters.get(g.cardName) || 0;
      name = `${g.cardName} ${String.fromCharCode(65 + used)}`; // A, B, C...
      typeCounters.set(g.cardName, used + 1);
    }

    let instanceID: string;
    let instanceNumber: number;
    if (isPatient) {
      instanceID = "patient";
      instanceNumber = 1;
    } else {
      instanceNumber = (instanceCounters.get(g.cardConfigPath) || 0) + 1;
      instanceCounters.set(g.cardConfigPath, instanceNumber);
      instanceID = `${g.cardConfigPath}.${instanceNumber}`;
    }

    const attributes: Attribute[] = g.attrs.map((a) => {
      const combine: "AND" | "OR" =
        a.combine ?? (a.expressions.length > 1 ? "AND" : "OR");
      return {
        type: "Attribute",
        configPath: a.attributeConfigPath,
        instanceID: `${instanceID}.attributes.${attrKey(a.attributeConfigPath)}`,
        constraints: {
          type: "BooleanContainer",
          op: combine,
          content: a.expressions.map((e) => ({
            type: "Expression" as const,
            operator: e.operator,
            value: e.value,
          })),
        },
      };
    });

    const filterCard: FilterCard = {
      type: "FilterCard",
      configPath: g.cardConfigPath,
      instanceNumber,
      instanceID,
      name,
      inactive: false,
      attributes: { type: "BooleanContainer", op: "AND", content: attributes },
    };

    // Inclusion: OR > FilterCard. Exclusion: NOT > (OR > FilterCard).
    const inclusion: BooleanContainer = {
      type: "BooleanContainer",
      op: "OR",
      content: [filterCard],
    };
    containers.push(
      g.exclude
        ? { type: "BooleanContainer", op: "NOT", content: [inclusion] }
        : inclusion,
    );
  }

  return {
    filter: {
      configMetadata: { id: config.configId, version: config.configVersion },
      cards: { type: "BooleanContainer", op: "AND", content: containers },
    },
    metadata: { version: 3 },
  };
}
