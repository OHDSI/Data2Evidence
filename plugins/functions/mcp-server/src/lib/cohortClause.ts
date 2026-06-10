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
  /**
   * Concept-set id for an event card, already resolved by the agent (via
   * search_concepts → check_concept_coverage_in_dataset → create_concept_set,
   * or the phenotype library). Dropped into the card's primary concept-set
   * attribute. The agent owns concept-set selection; this is just the id.
   */
  conceptSetId?: number;
  /** Value constraints on this card's attributes. */
  constraints?: ClauseConstraint[];
}
