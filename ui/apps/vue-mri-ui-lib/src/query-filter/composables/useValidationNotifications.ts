import { ref, computed, Ref } from 'vue'
import { validateCohortDefinition } from '../services/validationApi'
import { ValidationWarning } from '../types/ValidationTypes'

/**
 * Composable for managing cohort validation notifications
 *
 * Provides reactive state management for cohort definition validation,
 * including warnings, loading states, and computed properties for
 * filtering warnings by severity.
 *
 * @param getCohortDefinition - Function that returns current cohort definition JSON
 * @param webApiBaseUrl - Reactive reference to WebAPI base URL
 * @returns Validation state, computed properties, and methods
 *
 * @example
 * ```typescript
 * const {
 *   warnings,
 *   hasCriticalWarnings,
 *   validate,
 *   clear
 * } = useValidationNotifications(
 *   () => criteriaManager.getCriteria(),
 *   computed(() => props.webApiBaseUrl)
 * )
 *
 * // Run validation
 * const success = await validate()
 * if (success && hasCriticalWarnings.value) {
 *   // Show modal with warnings
 * }
 * ```
 */
export function useValidationNotifications(getCohortDefinition: () => unknown, webApiBaseUrl: Ref<string>) {
  // State
  const warnings = ref<ValidationWarning[]>([])
  const isValidating = ref(false)
  const error = ref<Error | null>(null)
  const lastValidated = ref<number | null>(null)

  // Computed properties - boolean flags
  const hasCriticalWarnings = computed(() => warnings.value.some(w => w.severity === 'CRITICAL'))

  const hasWarnings = computed(() => warnings.value.some(w => w.severity === 'WARNING'))

  const hasInfo = computed(() => warnings.value.some(w => w.severity === 'INFO'))

  // Computed properties - counts
  const totalCount = computed(() => warnings.value.length)

  const criticalCount = computed(() => warnings.value.filter(w => w.severity === 'CRITICAL').length)

  const warningCount = computed(() => warnings.value.filter(w => w.severity === 'WARNING').length)

  const infoCount = computed(() => warnings.value.filter(w => w.severity === 'INFO').length)

  // Computed properties - grouped warnings
  const criticalWarnings = computed(() => warnings.value.filter(w => w.severity === 'CRITICAL'))

  const warningLevelWarnings = computed(() => warnings.value.filter(w => w.severity === 'WARNING'))

  const infoWarnings = computed(() => warnings.value.filter(w => w.severity === 'INFO'))

  /**
   * Call validation API and update state
   *
   * @returns true if validation succeeded (API call successful), false otherwise
   */
  const validate = async (): Promise<boolean> => {
    if (isValidating.value) {
      console.warn('[useValidationNotifications] Validation already in progress')
      return false
    }

    isValidating.value = true
    error.value = null

    try {
      const cohortDef = getCohortDefinition()
      const response = await validateCohortDefinition(cohortDef, webApiBaseUrl.value)

      warnings.value = response.warnings
      lastValidated.value = Date.now()

      return true
    } catch (err) {
      error.value = err instanceof Error ? err : new Error(String(err))
      warnings.value = [] // Clear warnings on error
      return false
    } finally {
      isValidating.value = false
    }
  }

  /**
   * Clear all warnings and reset state
   */
  const clear = () => {
    warnings.value = []
    error.value = null
    lastValidated.value = null
  }

  return {
    // State
    warnings,
    isValidating,
    error,
    lastValidated,

    // Computed - boolean flags
    hasCriticalWarnings,
    hasWarnings,
    hasInfo,

    // Computed - counts
    totalCount,
    criticalCount,
    warningCount,
    infoCount,

    // Computed - grouped warnings
    criticalWarnings,
    warningLevelWarnings,
    infoWarnings,

    // Methods
    validate,
    clear,
  }
}
