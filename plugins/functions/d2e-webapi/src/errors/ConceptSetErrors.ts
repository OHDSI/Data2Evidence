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

/**
 * Thrown when fetching a concept set expression fails, typically due to
 * missing source configuration in WebAPI.
 */
export class ConceptSetExpressionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConceptSetExpressionError";
  }
}

/**
 * Thrown when WebAPI refuses a request because the caller has no permission.
 * Only a WebAPI 403 raises this error. A 401 is an authentication problem, not
 * a permission problem, so it stays on the generic error path.
 * Route handlers map this error to the upstream status, so that a denial does
 * not reach the browser as a 500.
 */
export class WebApiAccessDeniedError extends Error {
  constructor(
    public readonly status: number,
    public readonly operation: string,
  ) {
    super(`WebAPI denied the ${operation} request (${status})`);
    this.name = "WebApiAccessDeniedError";
  }
}
