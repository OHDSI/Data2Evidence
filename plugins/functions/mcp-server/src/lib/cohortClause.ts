/**
 * The card-centric clause contract the LLM produces (using NAMES from
 * list_cohort_filters, never config paths). One clause = one filter-card
 * occurrence; the resolver turns clauses into resolved constraints.
 */

export interface ClauseConstraint {
  /** Catalog attribute NAME, e.g. "Age", "Value As Number", "Gender". */
  attribute: string;
  /** ">=" | "<=" | "=" | "<" | ">" | "!=" | "range". */
  op: string;
  /** number, string, or [low, high] for op "range". */
  value: number | string | (number | string)[];
}

export interface CohortClause {
  /** Catalog card NAME, e.g. "Basic Data", "Condition Occurrence". */
  card: string;
  /** Card-level include/exclude (exclude → NOT container). */
  exclude?: boolean;
  /** Plain-word phenotype for event cards, e.g. "hypertension". */
  concept?: string;
  /** Value constraints on this card's attributes. */
  constraints?: ClauseConstraint[];
}
