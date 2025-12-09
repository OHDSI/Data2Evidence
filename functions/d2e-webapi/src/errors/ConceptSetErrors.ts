/**
 * Domain-specific error classes for concept set operations.
 * These typed errors enable route handlers to distinguish error types
 * and return appropriate HTTP status codes.
 */

/**
 * Thrown when attempting to delete a concept set that is currently
 * referenced by cohort definitions or bookmarks.
 */
export class ConceptSetInUseError extends Error {
  constructor(
    public readonly cohortDefinitions: Array<{ id: number; name: string }>,
    public readonly bookmarks: Array<{ id: string; name: string }>
  ) {
    super("Concept set is currently in use");
    this.name = "ConceptSetInUseError";
  }
}

/**
 * Thrown when concept set validation fails (e.g., invalid ID format).
 */
export class ConceptSetValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConceptSetValidationError";
  }
}
