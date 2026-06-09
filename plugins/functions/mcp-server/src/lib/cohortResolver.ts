import type { CohortClause, ClauseConstraint } from "./cohortClause";
import type { CohortCatalog, CatalogCard, CatalogAttribute } from "./cohortCatalog";
import type { CohortConstraint, CohortExpression } from "./cohortBookmarkTree";

/**
 * Resolve card-centric clauses (LLM intent, by name) into the resolved
 * constraints the serializer consumes. Pure orchestration: value/concept-set
 * lookups are injected (ResolverDeps) so this is testable offline and so the
 * I/O (analytics-svc values endpoint, terminology service) stays at the edge.
 *
 * Grouping rules (enforced here, NOT by the LLM):
 *  - all "Basic Data" clauses merge into the single patient card instance;
 *  - each interaction clause becomes its own card instance.
 *
 * A clause's `concept` maps to the card's PRIMARY concept-set attribute (the
 * conceptSet attribute with cohortDefinitionKey === "CodesetId").
 */

export interface ResolverDeps {
  /** category/text attribute: plain word -> the dataset's coded value. */
  resolveValue: (
    card: CatalogCard,
    attr: CatalogAttribute,
    raw: string,
  ) => Promise<string>;
  /** conceptSet attribute: phenotype/word -> concept-set id (as string). */
  resolveConceptSet: (
    card: CatalogCard,
    attr: CatalogAttribute,
    conceptText: string,
  ) => Promise<string>;
}

const NUM_OPS = new Set([">=", "<=", "<", ">", "=", "!="]);

function norm(s: string): string {
  return s.trim().toLowerCase();
}

/** Find a card by display name (exact ci, then substring). */
function findCard(catalog: CohortCatalog, name: string): CatalogCard | undefined {
  const n = norm(name);
  return (
    catalog.cards.find((c) => norm(c.name) === n) ??
    catalog.cards.find((c) => norm(c.name).includes(n) || n.includes(norm(c.name)))
  );
}

/** Find an attribute within a card by display name (exact ci, then substring). */
function findAttr(card: CatalogCard, name: string): CatalogAttribute | undefined {
  const n = norm(name);
  return (
    card.attributes.find((a) => norm(a.name) === n) ??
    card.attributes.find((a) => norm(a.name).includes(n) || n.includes(norm(a.name)))
  );
}

/** The card's primary concept-set attribute (cohortDefinitionKey "CodesetId"). */
function primaryConceptAttr(card: CatalogCard): CatalogAttribute | undefined {
  return card.attributes.find(
    (a) => a.kind === "conceptSet" && a.cohortDefinitionKey === "CodesetId",
  );
}

/** Build numeric expressions from a structured op/value. */
function numExpressions(
  c: ClauseConstraint,
): { expressions: CohortExpression[]; combine: "AND" | "OR" } {
  if (c.op === "range") {
    if (!Array.isArray(c.value) || c.value.length !== 2) {
      throw new Error(
        `Range constraint on "${c.attribute}" needs a [low, high] value.`,
      );
    }
    const [lo, hi] = c.value.map(Number);
    if (Number.isNaN(lo) || Number.isNaN(hi)) {
      throw new Error(`Range bounds for "${c.attribute}" must be numbers.`);
    }
    if (lo > hi) {
      throw new Error(`Range low (${lo}) must not exceed high (${hi}).`);
    }
    return {
      expressions: [
        { operator: ">=", value: lo },
        { operator: "<=", value: hi },
      ],
      combine: "AND",
    };
  }
  if (!NUM_OPS.has(c.op)) {
    throw new Error(
      `Unsupported operator "${c.op}" for numeric attribute "${c.attribute}".`,
    );
  }
  const v = Number(c.value);
  if (Number.isNaN(v)) {
    throw new Error(`Value for "${c.attribute}" must be a number.`);
  }
  return { expressions: [{ operator: c.op, value: v }], combine: "OR" };
}

/**
 * Resolve clauses to constraints. Throws an actionable Error on any clause that
 * can't be resolved (unknown card/attribute, missing concept attribute,
 * unsupported kind) — never silently drops a filter.
 */
export async function resolveClausesToConstraints(
  clauses: CohortClause[],
  catalog: CohortCatalog,
  deps: ResolverDeps,
): Promise<CohortConstraint[]> {
  const out: CohortConstraint[] = [];

  for (let i = 0; i < clauses.length; i++) {
    const clause = clauses[i];
    const card = findCard(catalog, clause.card);
    if (!card) {
      throw new Error(
        `Unknown filter card "${clause.card}". Available: ${catalog.cards
          .map((c) => c.name)
          .join(", ")}.`,
      );
    }
    const isPatient = card.key === "patient";
    // Patient card always merges into one instance; interactions get one per clause.
    const cardInstanceKey = isPatient ? "patient" : `${card.key}#${i}`;
    const base = {
      cardConfigPath: card.configPath,
      cardName: card.name,
      cardInstanceKey,
      exclude: clause.exclude,
    };

    if (!clause.concept && (!clause.constraints || clause.constraints.length === 0)) {
      throw new Error(
        `Clause for "${clause.card}" has no concept or constraints — nothing to filter.`,
      );
    }

    // 1. concept -> the card's primary concept-set attribute.
    if (clause.concept) {
      const attr = primaryConceptAttr(card);
      if (!attr) {
        throw new Error(
          `Card "${card.name}" has no concept set to attach "${clause.concept}" to.`,
        );
      }
      const id = await deps.resolveConceptSet(card, attr, clause.concept);
      out.push({
        ...base,
        attributeConfigPath: attr.configPath,
        expressions: [{ operator: "=", value: id }],
        combine: "OR",
      });
    }

    // 2. explicit attribute constraints.
    for (const cc of clause.constraints ?? []) {
      const attr = findAttr(card, cc.attribute);
      if (!attr) {
        throw new Error(
          `Card "${card.name}" has no attribute "${cc.attribute}". Available: ${card.attributes
            .map((a) => a.name)
            .join(", ")}.`,
        );
      }

      let expressions: CohortExpression[];
      let combine: "AND" | "OR";
      if (attr.kind === "num") {
        ({ expressions, combine } = numExpressions(cc));
      } else if (attr.kind === "category") {
        const resolved = await deps.resolveValue(card, attr, String(cc.value));
        expressions = [{ operator: cc.op === "!=" ? "!=" : "=", value: resolved }];
        combine = "OR";
      } else if (attr.kind === "conceptSet") {
        const id = await deps.resolveConceptSet(card, attr, String(cc.value));
        expressions = [{ operator: "=", value: id }];
        combine = "OR";
      } else {
        // datetime not supported yet.
        throw new Error(
          `Filtering on "${attr.name}" (${attr.kind}) is not supported yet.`,
        );
      }

      out.push({
        ...base,
        attributeConfigPath: attr.configPath,
        expressions,
        combine,
      });
    }
  }

  return out;
}
