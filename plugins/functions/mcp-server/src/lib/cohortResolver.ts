import type {
  CohortClause,
  ClauseConstraint,
  CohortCatalog,
  CatalogCard,
  CatalogAttribute,
} from "./cohortModel";
import {
  findAttributeAcrossCards,
  findAttributeByName,
  findCardByName,
  primaryConceptAttribute,
} from "./cohortModel";
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
  /**
   * True iff `id` is a persisted concept-set id in this dataset
   * (portal.user_artifact concept_sets). Used to reject raw OMOP concept ids /
   * phenotype-library ids that the agent may pass instead of a real concept-set
   * id — a positive integer alone cannot be distinguished from a concept id.
   */
  conceptSetExists: (id: number) => Promise<boolean>;
}

const NUM_OPS = new Set([">=", "<=", "<", ">", "=", "!="]);

/** Ops a category/text attribute accepts. `in` OR-s a list of stored tokens. */
const CATEGORY_OPS = new Set(["=", "!=", "in", "not in"]);

/**
 * "Card X has no attribute Y" — plus, when Y exists elsewhere, where to put it.
 *
 * The bare version of this error is what ended a real session with "the Visit
 * card doesn't have an age attribute" and no cohort: age is a patient
 * attribute, one clause away, and the model had no way to know that from the
 * rejection alone.
 */
function unknownAttributeError(
  catalog: CohortCatalog,
  card: CatalogCard,
  requested: string,
): Error {
  const available = card.attributes.map((a) => a.name).join(", ") || "(none)";
  const elsewhere = findAttributeAcrossCards(catalog, requested).filter(
    (hit) => hit.card.key !== card.key,
  );
  const hint = elsewhere.length
    ? ` "${elsewhere[0].attribute.name}" IS available on card "${elsewhere[0].card.name}"` +
      `${
        elsewhere.length > 1
          ? ` (also: ${elsewhere.slice(1).map((h) => `"${h.card.name}"`).join(", ")})`
          : ""
      } — move that constraint into its own clause for that card instead of ` +
      `dropping it. Demographics (age, gender, race) always live on the patient card.`
    : "";
  return new Error(
    `Card "${card.name}" has no attribute "${requested}". Available: ${available}.${hint}`,
  );
}

/**
 * A concept-set id must be a positive integer that maps to a persisted concept
 * set in this dataset (portal.user_artifact). Two failure modes are caught here:
 *  - the "unset" sentinel 0 (or any non-positive / non-integer value); and
 *  - a positive integer that is NOT a real concept set — typically a raw OMOP
 *    concept id (e.g. 9201 "Inpatient Visit") or a phenotype/library/cohort id
 *    the agent passed instead of calling create_concept_set. A positivity check
 *    alone cannot distinguish these, so we verify existence via deps.
 * Letting either through serializes an unresolvable concept-set reference that
 * fails downstream (terminology-svc -> portal 400). Reject with actionable text.
 */
async function assertValidConceptSetId(
  id: unknown,
  cardName: string,
  deps: ResolverDeps,
): Promise<void> {
  const n = Number(id);
  if (!Number.isInteger(n) || n <= 0) {
    throw new Error(
      `Card "${cardName}" references concept set "${id}", which is not a valid ` +
        `persisted concept set id. Create the concept set first with ` +
        `create_concept_set and use the id it returns.`,
    );
  }
  const exists = await deps.conceptSetExists(n);
  if (!exists) {
    throw new Error(
      `Card "${cardName}" references concept set id ${n}, which is not a ` +
        `persisted concept set in this dataset. Do NOT use a raw OMOP concept id ` +
        `or a phenotype/library/cohort id as a concept-set id. Resolve the term ` +
        `with search_concepts, then create_concept_set, and use the id it returns.`,
    );
  }
}

/** Build numeric expressions from a structured op/value. */
function numExpressions(c: ClauseConstraint): {
  expressions: CohortExpression[];
  combine: "AND" | "OR";
} {
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
 * Build category/text expressions, resolving each raw term to the token the
 * dataset actually stores.
 *
 * A list (`op:"in"`, or an array value) becomes several OR-ed expressions on the
 * one attribute. That matters for real questions: an encounter-type column
 * splits "an ER visit" across several tokens ("Emergency Room Visit",
 * "Emergency Room and Inpatient Visit"), and forcing one token per constraint
 * would quietly answer a narrower question than the user asked. Negation is
 * AND-ed instead — "neither A nor B" is not "not A or not B".
 */
async function categoryExpressions(
  c: ClauseConstraint,
  card: CatalogCard,
  attr: CatalogAttribute,
  deps: ResolverDeps,
): Promise<{ expressions: CohortExpression[]; combine: "AND" | "OR" }> {
  const op = String(c.op ?? "=").trim().toLowerCase();
  if (!CATEGORY_OPS.has(op)) {
    throw new Error(
      `Unsupported operator "${c.op}" for text attribute "${attr.name}". Use ` +
        `"=" (or "in" with a list of values to match any of them), or "!=" / ` +
        `"not in" to exclude.`,
    );
  }
  const raws = (Array.isArray(c.value) ? c.value : [c.value])
    .map((v) => String(v ?? "").trim())
    .filter(Boolean);
  if (raws.length === 0) {
    throw new Error(`Constraint on "${attr.name}" has no value.`);
  }

  const negate = op === "!=" || op === "not in";
  const resolved: string[] = [];
  // Sequential on purpose: the resolver's fetches share a per-attribute cache,
  // so the second token reuses the first one's domain read instead of racing it.
  for (const raw of raws) {
    const value = await deps.resolveValue(card, attr, raw);
    if (!resolved.includes(value)) resolved.push(value);
  }

  return {
    expressions: resolved.map((value) => ({
      operator: negate ? "!=" : "=",
      value,
    })),
    combine: negate ? "AND" : "OR",
  };
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
  const seenAttributes = new Set<string>();

  const appendConstraint = (
    constraint: CohortConstraint,
    attributeName: string,
  ) => {
    const key =
      `${constraint.cardInstanceKey}::${constraint.attributeConfigPath}`;
    if (seenAttributes.has(key)) {
      throw new Error(
        `Attribute "${attributeName}" appears more than once in ` +
          `"${constraint.cardName}". Use one constraint per attribute; for a ` +
          `numeric lower and upper bound, use op "range" with [low, high].`,
      );
    }
    seenAttributes.add(key);
    out.push(constraint);
  };

  for (let i = 0; i < clauses.length; i++) {
    const clause = clauses[i];
    const card = findCardByName(catalog, clause.card);
    if (!card) {
      throw new Error(
        `Unknown filter card "${clause.card}". Available: ${catalog.cards
          .map((c) => c.name)
          .join(", ")}.`,
      );
    }
    const isPatient = card.key === "patient";
    if (isPatient && clause.exclude) {
      throw new Error(
        `Basic Data does not support "exclude: true" because all patient ` +
          `attributes share one filter card. Use "!=" or an inverse numeric ` +
          `comparison on the attribute instead.`,
      );
    }
    // Patient card always merges into one instance; interactions get one per clause.
    const cardInstanceKey = isPatient ? "patient" : `${card.key}#${i}`;
    const base = {
      cardConfigPath: card.configPath,
      cardName: card.name,
      cardInstanceKey,
      exclude: clause.exclude,
    };

    const hasConcept = clause.conceptSetId != null;
    if (
      !hasConcept &&
      (!clause.constraints || clause.constraints.length === 0)
    ) {
      throw new Error(
        `Clause for "${clause.card}" has no conceptSetId or constraints — nothing to filter.`,
      );
    }

    // 1. conceptSetId -> the card's primary concept-set attribute (passthrough;
    //    the agent already resolved the id via the concept-set tools).
    if (hasConcept) {
      await assertValidConceptSetId(clause.conceptSetId, card.name, deps);
      const attr = primaryConceptAttribute(card);
      if (!attr) {
        throw new Error(
          `Card "${card.name}" has no concept set to attach concept set ${clause.conceptSetId} to.`,
        );
      }
      appendConstraint(
        {
          ...base,
          attributeConfigPath: attr.configPath,
          expressions: [{ operator: "=", value: String(clause.conceptSetId) }],
          combine: "OR",
        },
        attr.name,
      );
    }

    // 2. explicit attribute constraints.
    for (const cc of clause.constraints ?? []) {
      const attr = findAttributeByName(card, cc.attribute);
      if (!attr) {
        throw unknownAttributeError(catalog, card, cc.attribute);
      }

      let expressions: CohortExpression[];
      let combine: "AND" | "OR";
      if (attr.kind === "num") {
        ({ expressions, combine } = numExpressions(cc));
      } else if (attr.kind === "category") {
        ({ expressions, combine } = await categoryExpressions(
          cc,
          card,
          attr,
          deps,
        ));
      } else if (attr.kind === "conceptSet") {
        // value IS the concept-set id (agent-resolved), e.g. a unit set.
        await assertValidConceptSetId(cc.value, card.name, deps);
        expressions = [{ operator: "=", value: String(cc.value) }];
        combine = "OR";
      } else {
        // datetime not supported yet.
        throw new Error(
          `Filtering on "${attr.name}" (${attr.kind}) is not supported yet.`,
        );
      }

      appendConstraint(
        {
          ...base,
          attributeConfigPath: attr.configPath,
          expressions,
          combine,
        },
        attr.name,
      );
    }
  }

  return out;
}
