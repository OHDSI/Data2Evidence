/**
 * Validation Types for WebAPI /cohortdefinition/checkV2 endpoint
 *
 * This module defines TypeScript types for cohort definition validation.
 * These types correspond to the response structure from the WebAPI validation endpoint.
 */

/**
 * Severity levels returned by WebAPI validation.
 *
 * - CRITICAL: Blocks save operation, must be resolved before saving
 * - WARNING: Advisory warning, allows save but suggests improvement
 * - INFO: Informational message, provides suggestions or best practices
 */
export type ValidationSeverity = 'CRITICAL' | 'WARNING' | 'INFO'

/**
 * Individual validation warning from WebAPI.
 *
 * Represents a single validation issue found in a cohort definition.
 * Each warning has a type identifier, severity level, and user-facing message.
 */
export interface ValidationWarning {
  /**
   * Warning type identifier (e.g., "DefaultWarning", "MissingConceptSet")
   * Used to categorize and handle different types of validation issues.
   */
  type: string

  /**
   * Severity level of the validation warning.
   * - CRITICAL: Blocks save operation
   * - WARNING: Advisory, allows save
   * - INFO: Informational only
   */
  severity: ValidationSeverity

  /**
   * User-facing error message describing the validation issue.
   * Should be clear and actionable to help users resolve the problem.
   */
  message: string
}

/**
 * Response structure from POST /WebAPI/cohortdefinition/checkV2.
 *
 * Contains an array of validation warnings for a cohort definition.
 * An empty warnings array indicates the cohort definition is valid.
 */
export interface ValidationResponse {
  /**
   * Array of validation warnings found in the cohort definition.
   * Empty array if no validation issues were found.
   */
  warnings: ValidationWarning[]
}

/**
 * Validation state managed by the useValidationNotifications composable.
 *
 * Represents the current state of validation including warnings,
 * loading status, errors, and timestamp of last validation.
 */
export interface ValidationState {
  /**
   * Array of validation warnings from the latest API call.
   * Updated after each successful validation request.
   */
  warnings: ValidationWarning[]

  /**
   * Indicates whether a validation API call is currently in progress.
   * Used to prevent concurrent validation requests and show loading UI.
   */
  isValidating: boolean

  /**
   * Error object from the last validation attempt.
   * Null if no error occurred or if validation succeeded.
   * Contains details about network failures or API errors.
   */
  error: Error | null

  /**
   * Timestamp (milliseconds since epoch) of the last successful validation.
   * Null if validation has never been performed.
   * Used for caching and freshness checks.
   */
  lastValidated: number | null
}
