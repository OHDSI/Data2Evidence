/* eslint-disable */
import { ref } from 'vue'
import { useValidationNotifications } from '../composables/useValidationNotifications'
import { validateCohortDefinition } from '../services/validationApi'
import type { ValidationResponse } from '../types/ValidationTypes'

jest.mock('../services/validationApi')
const mockedValidate = validateCohortDefinition as jest.MockedFunction<typeof validateCohortDefinition>

describe('useValidationNotifications', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Mock console.warn to avoid cluttering test output
    jest.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('initial state', () => {
    it('has empty warnings array', () => {
      const getCohortDef = () => ({})
      const baseUrl = ref('http://localhost/WebAPI')
      const { warnings } = useValidationNotifications(getCohortDef, baseUrl)

      expect(warnings.value).toEqual([])
    })

    it('has isValidating false', () => {
      const getCohortDef = () => ({})
      const baseUrl = ref('http://localhost/WebAPI')
      const { isValidating } = useValidationNotifications(getCohortDef, baseUrl)

      expect(isValidating.value).toBe(false)
    })

    it('has null error', () => {
      const getCohortDef = () => ({})
      const baseUrl = ref('http://localhost/WebAPI')
      const { error } = useValidationNotifications(getCohortDef, baseUrl)

      expect(error.value).toBe(null)
    })

    it('has null lastValidated', () => {
      const getCohortDef = () => ({})
      const baseUrl = ref('http://localhost/WebAPI')
      const { lastValidated } = useValidationNotifications(getCohortDef, baseUrl)

      expect(lastValidated.value).toBe(null)
    })

    it('has all counts as zero', () => {
      const getCohortDef = () => ({})
      const baseUrl = ref('http://localhost/WebAPI')
      const { totalCount, criticalCount, warningCount, infoCount } = useValidationNotifications(getCohortDef, baseUrl)

      expect(totalCount.value).toBe(0)
      expect(criticalCount.value).toBe(0)
      expect(warningCount.value).toBe(0)
      expect(infoCount.value).toBe(0)
    })

    it('has all boolean flags as false', () => {
      const getCohortDef = () => ({})
      const baseUrl = ref('http://localhost/WebAPI')
      const { hasCriticalWarnings, hasWarnings, hasInfo } = useValidationNotifications(getCohortDef, baseUrl)

      expect(hasCriticalWarnings.value).toBe(false)
      expect(hasWarnings.value).toBe(false)
      expect(hasInfo.value).toBe(false)
    })
  })

  describe('validate()', () => {
    it('calls API with cohort definition and base URL', async () => {
      const cohortDef = { criteria: 'test' }
      const getCohortDef = () => cohortDef
      const baseUrl = ref('http://localhost/WebAPI')

      mockedValidate.mockResolvedValue({ warnings: [] })

      const { validate } = useValidationNotifications(getCohortDef, baseUrl)
      await validate()

      expect(mockedValidate).toHaveBeenCalledWith(cohortDef, 'http://localhost/WebAPI')
    })

    it('sets isValidating to true during API call', async () => {
      const getCohortDef = () => ({})
      const baseUrl = ref('http://localhost/WebAPI')

      let isValidatingDuringCall = false
      mockedValidate.mockImplementation(async () => {
        // Capture isValidating value during API call
        isValidatingDuringCall = isValidating.value
        return { warnings: [] }
      })

      const { validate, isValidating } = useValidationNotifications(getCohortDef, baseUrl)

      expect(isValidating.value).toBe(false)
      await validate()

      expect(isValidatingDuringCall).toBe(true)
      expect(isValidating.value).toBe(false)
    })

    it('updates warnings array on success', async () => {
      const getCohortDef = () => ({})
      const baseUrl = ref('http://localhost/WebAPI')

      const mockResponse: ValidationResponse = {
        warnings: [
          {
            type: 'DefaultWarning',
            severity: 'CRITICAL',
            message: 'No entry events',
          },
          {
            type: 'PerformanceWarning',
            severity: 'WARNING',
            message: 'Complex query',
          },
        ],
      }

      mockedValidate.mockResolvedValue(mockResponse)

      const { validate, warnings } = useValidationNotifications(getCohortDef, baseUrl)
      const result = await validate()

      expect(result).toBe(true)
      expect(warnings.value).toHaveLength(2)
      expect(warnings.value[0].severity).toBe('CRITICAL')
      expect(warnings.value[1].severity).toBe('WARNING')
    })

    it('updates lastValidated timestamp on success', async () => {
      const getCohortDef = () => ({})
      const baseUrl = ref('http://localhost/WebAPI')

      mockedValidate.mockResolvedValue({ warnings: [] })

      const beforeTime = Date.now()
      const { validate, lastValidated } = useValidationNotifications(getCohortDef, baseUrl)
      await validate()
      const afterTime = Date.now()

      expect(lastValidated.value).not.toBe(null)
      expect(lastValidated.value).toBeGreaterThanOrEqual(beforeTime)
      expect(lastValidated.value).toBeLessThanOrEqual(afterTime)
    })

    it('returns true on successful validation', async () => {
      const getCohortDef = () => ({})
      const baseUrl = ref('http://localhost/WebAPI')

      mockedValidate.mockResolvedValue({ warnings: [] })

      const { validate } = useValidationNotifications(getCohortDef, baseUrl)
      const result = await validate()

      expect(result).toBe(true)
    })

    it('sets error on API failure', async () => {
      const getCohortDef = () => ({})
      const baseUrl = ref('http://localhost/WebAPI')

      const apiError = new Error('API call failed')
      mockedValidate.mockRejectedValue(apiError)

      const { validate, error } = useValidationNotifications(getCohortDef, baseUrl)
      const result = await validate()

      expect(result).toBe(false)
      expect(error.value).toEqual(apiError)
    })

    it('clears warnings on API failure', async () => {
      const getCohortDef = () => ({})
      const baseUrl = ref('http://localhost/WebAPI')

      // First, add some warnings
      mockedValidate.mockResolvedValue({
        warnings: [{ type: 'Test', severity: 'CRITICAL', message: 'Test' }],
      })

      const { validate, warnings } = useValidationNotifications(getCohortDef, baseUrl)
      await validate()
      expect(warnings.value).toHaveLength(1)

      // Then, simulate API failure
      mockedValidate.mockRejectedValue(new Error('API failed'))
      await validate()

      expect(warnings.value).toEqual([])
    })

    it('returns false on API failure', async () => {
      const getCohortDef = () => ({})
      const baseUrl = ref('http://localhost/WebAPI')

      mockedValidate.mockRejectedValue(new Error('API failed'))

      const { validate } = useValidationNotifications(getCohortDef, baseUrl)
      const result = await validate()

      expect(result).toBe(false)
    })

    it('converts non-Error exceptions to Error objects', async () => {
      const getCohortDef = () => ({})
      const baseUrl = ref('http://localhost/WebAPI')

      mockedValidate.mockRejectedValue('String error')

      const { validate, error } = useValidationNotifications(getCohortDef, baseUrl)
      await validate()

      expect(error.value).toBeInstanceOf(Error)
      expect(error.value?.message).toBe('String error')
    })

    it('prevents concurrent validation calls', async () => {
      const getCohortDef = () => ({})
      const baseUrl = ref('http://localhost/WebAPI')

      // Make API call slow
      mockedValidate.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ warnings: [] }), 100)))

      const { validate } = useValidationNotifications(getCohortDef, baseUrl)

      // Start first validation
      const promise1 = validate()

      // Try to start second validation immediately
      const promise2 = validate()

      const [result1, result2] = await Promise.all([promise1, promise2])

      // First call should succeed, second should return false (prevented)
      expect(result1).toBe(true)
      expect(result2).toBe(false)

      // API should only be called once
      expect(mockedValidate).toHaveBeenCalledTimes(1)
    })

    it('logs warning when validation is already in progress', async () => {
      const getCohortDef = () => ({})
      const baseUrl = ref('http://localhost/WebAPI')

      const warnSpy = jest.spyOn(console, 'warn')
      mockedValidate.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ warnings: [] }), 50)))

      const { validate } = useValidationNotifications(getCohortDef, baseUrl)

      const promise1 = validate()
      const promise2 = validate()

      await Promise.all([promise1, promise2])

      expect(warnSpy).toHaveBeenCalledWith('[useValidationNotifications] Validation already in progress')
    })
  })

  describe('computed properties - warnings by severity', () => {
    it('hasCriticalWarnings is true when CRITICAL warnings exist', async () => {
      const getCohortDef = () => ({})
      const baseUrl = ref('http://localhost/WebAPI')

      mockedValidate.mockResolvedValue({
        warnings: [{ type: 'Test', severity: 'CRITICAL', message: 'Critical issue' }],
      })

      const { validate, hasCriticalWarnings } = useValidationNotifications(getCohortDef, baseUrl)
      await validate()

      expect(hasCriticalWarnings.value).toBe(true)
    })

    it('hasCriticalWarnings is false when no CRITICAL warnings', async () => {
      const getCohortDef = () => ({})
      const baseUrl = ref('http://localhost/WebAPI')

      mockedValidate.mockResolvedValue({
        warnings: [{ type: 'Test', severity: 'WARNING', message: 'Just a warning' }],
      })

      const { validate, hasCriticalWarnings } = useValidationNotifications(getCohortDef, baseUrl)
      await validate()

      expect(hasCriticalWarnings.value).toBe(false)
    })

    it('hasWarnings is true when WARNING level warnings exist', async () => {
      const getCohortDef = () => ({})
      const baseUrl = ref('http://localhost/WebAPI')

      mockedValidate.mockResolvedValue({
        warnings: [{ type: 'Test', severity: 'WARNING', message: 'Warning message' }],
      })

      const { validate, hasWarnings } = useValidationNotifications(getCohortDef, baseUrl)
      await validate()

      expect(hasWarnings.value).toBe(true)
    })

    it('hasInfo is true when INFO warnings exist', async () => {
      const getCohortDef = () => ({})
      const baseUrl = ref('http://localhost/WebAPI')

      mockedValidate.mockResolvedValue({
        warnings: [{ type: 'Test', severity: 'INFO', message: 'Info message' }],
      })

      const { validate, hasInfo } = useValidationNotifications(getCohortDef, baseUrl)
      await validate()

      expect(hasInfo.value).toBe(true)
    })
  })

  describe('computed properties - counts', () => {
    it('totalCount sums all warnings', async () => {
      const getCohortDef = () => ({})
      const baseUrl = ref('http://localhost/WebAPI')

      mockedValidate.mockResolvedValue({
        warnings: [
          { type: 'Test', severity: 'CRITICAL', message: 'Critical' },
          { type: 'Test', severity: 'WARNING', message: 'Warning' },
          { type: 'Test', severity: 'INFO', message: 'Info' },
        ],
      })

      const { validate, totalCount } = useValidationNotifications(getCohortDef, baseUrl)
      await validate()

      expect(totalCount.value).toBe(3)
    })

    it('criticalCount counts only CRITICAL warnings', async () => {
      const getCohortDef = () => ({})
      const baseUrl = ref('http://localhost/WebAPI')

      mockedValidate.mockResolvedValue({
        warnings: [
          { type: 'Test', severity: 'CRITICAL', message: 'Critical 1' },
          { type: 'Test', severity: 'CRITICAL', message: 'Critical 2' },
          { type: 'Test', severity: 'WARNING', message: 'Warning' },
        ],
      })

      const { validate, criticalCount } = useValidationNotifications(getCohortDef, baseUrl)
      await validate()

      expect(criticalCount.value).toBe(2)
    })

    it('warningCount counts only WARNING level warnings', async () => {
      const getCohortDef = () => ({})
      const baseUrl = ref('http://localhost/WebAPI')

      mockedValidate.mockResolvedValue({
        warnings: [
          { type: 'Test', severity: 'WARNING', message: 'Warning 1' },
          { type: 'Test', severity: 'WARNING', message: 'Warning 2' },
          { type: 'Test', severity: 'CRITICAL', message: 'Critical' },
        ],
      })

      const { validate, warningCount } = useValidationNotifications(getCohortDef, baseUrl)
      await validate()

      expect(warningCount.value).toBe(2)
    })

    it('infoCount counts only INFO warnings', async () => {
      const getCohortDef = () => ({})
      const baseUrl = ref('http://localhost/WebAPI')

      mockedValidate.mockResolvedValue({
        warnings: [
          { type: 'Test', severity: 'INFO', message: 'Info 1' },
          { type: 'Test', severity: 'INFO', message: 'Info 2' },
          { type: 'Test', severity: 'INFO', message: 'Info 3' },
          { type: 'Test', severity: 'WARNING', message: 'Warning' },
        ],
      })

      const { validate, infoCount } = useValidationNotifications(getCohortDef, baseUrl)
      await validate()

      expect(infoCount.value).toBe(3)
    })
  })

  describe('computed properties - grouped warnings', () => {
    it('criticalWarnings returns only CRITICAL severity warnings', async () => {
      const getCohortDef = () => ({})
      const baseUrl = ref('http://localhost/WebAPI')

      mockedValidate.mockResolvedValue({
        warnings: [
          { type: 'Test1', severity: 'CRITICAL', message: 'Critical 1' },
          { type: 'Test2', severity: 'WARNING', message: 'Warning 1' },
          { type: 'Test3', severity: 'CRITICAL', message: 'Critical 2' },
        ],
      })

      const { validate, criticalWarnings } = useValidationNotifications(getCohortDef, baseUrl)
      await validate()

      expect(criticalWarnings.value).toHaveLength(2)
      expect(criticalWarnings.value.every(w => w.severity === 'CRITICAL')).toBe(true)
    })

    it('warningLevelWarnings returns only WARNING severity warnings', async () => {
      const getCohortDef = () => ({})
      const baseUrl = ref('http://localhost/WebAPI')

      mockedValidate.mockResolvedValue({
        warnings: [
          { type: 'Test1', severity: 'WARNING', message: 'Warning 1' },
          { type: 'Test2', severity: 'CRITICAL', message: 'Critical 1' },
          { type: 'Test3', severity: 'WARNING', message: 'Warning 2' },
        ],
      })

      const { validate, warningLevelWarnings } = useValidationNotifications(getCohortDef, baseUrl)
      await validate()

      expect(warningLevelWarnings.value).toHaveLength(2)
      expect(warningLevelWarnings.value.every(w => w.severity === 'WARNING')).toBe(true)
    })

    it('infoWarnings returns only INFO severity warnings', async () => {
      const getCohortDef = () => ({})
      const baseUrl = ref('http://localhost/WebAPI')

      mockedValidate.mockResolvedValue({
        warnings: [
          { type: 'Test1', severity: 'INFO', message: 'Info 1' },
          { type: 'Test2', severity: 'WARNING', message: 'Warning 1' },
          { type: 'Test3', severity: 'INFO', message: 'Info 2' },
        ],
      })

      const { validate, infoWarnings } = useValidationNotifications(getCohortDef, baseUrl)
      await validate()

      expect(infoWarnings.value).toHaveLength(2)
      expect(infoWarnings.value.every(w => w.severity === 'INFO')).toBe(true)
    })
  })

  describe('clear()', () => {
    it('resets warnings to empty array', async () => {
      const getCohortDef = () => ({})
      const baseUrl = ref('http://localhost/WebAPI')

      mockedValidate.mockResolvedValue({
        warnings: [{ type: 'Test', severity: 'CRITICAL', message: 'Critical' }],
      })

      const { validate, clear, warnings } = useValidationNotifications(getCohortDef, baseUrl)

      await validate()
      expect(warnings.value).toHaveLength(1)

      clear()
      expect(warnings.value).toEqual([])
    })

    it('resets error to null', async () => {
      const getCohortDef = () => ({})
      const baseUrl = ref('http://localhost/WebAPI')

      mockedValidate.mockRejectedValue(new Error('Test error'))

      const { validate, clear, error } = useValidationNotifications(getCohortDef, baseUrl)

      await validate()
      expect(error.value).not.toBe(null)

      clear()
      expect(error.value).toBe(null)
    })

    it('resets lastValidated to null', async () => {
      const getCohortDef = () => ({})
      const baseUrl = ref('http://localhost/WebAPI')

      mockedValidate.mockResolvedValue({ warnings: [] })

      const { validate, clear, lastValidated } = useValidationNotifications(getCohortDef, baseUrl)

      await validate()
      expect(lastValidated.value).not.toBe(null)

      clear()
      expect(lastValidated.value).toBe(null)
    })
  })

  describe('reactivity with baseUrl ref', () => {
    it('uses updated baseUrl in API calls', async () => {
      const getCohortDef = () => ({})
      const baseUrl = ref('http://localhost/WebAPI')

      mockedValidate.mockResolvedValue({ warnings: [] })

      const { validate } = useValidationNotifications(getCohortDef, baseUrl)

      // First call with initial URL
      await validate()
      expect(mockedValidate).toHaveBeenCalledWith({}, 'http://localhost/WebAPI')

      // Update URL
      baseUrl.value = 'http://newhost/WebAPI'

      // Second call with updated URL
      await validate()
      expect(mockedValidate).toHaveBeenCalledWith({}, 'http://newhost/WebAPI')
    })
  })
})
