/* eslint-disable */
import axios from 'axios'
import { validateCohortDefinition } from '../services/validationApi'
import type { ValidationResponse } from '../types/ValidationTypes'

jest.mock('axios')
const mockedAxios = axios as jest.Mocked<typeof axios>

describe('validationApi', () => {
  beforeEach(() => {
    // Mock console.error to avoid cluttering test output
    jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('validateCohortDefinition', () => {
    it('returns validation warnings on success', async () => {
      const mockResponse: ValidationResponse = {
        warnings: [
          {
            type: 'DefaultWarning',
            severity: 'CRITICAL',
            message: 'No entry events',
          },
        ],
      }

      mockedAxios.post.mockResolvedValue({ data: mockResponse })

      const result = await validateCohortDefinition({}, 'http://localhost/WebAPI')

      expect(result.warnings).toHaveLength(1)
      expect(result.warnings[0].severity).toBe('CRITICAL')
      expect(result.warnings[0].message).toBe('No entry events')
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'http://localhost/WebAPI/cohortdefinition/checkV2',
        {},
        expect.objectContaining({
          headers: { 'Content-Type': 'application/json' },
        })
      )
    })

    it('returns empty warnings array when cohort is valid', async () => {
      const mockResponse: ValidationResponse = {
        warnings: [],
      }

      mockedAxios.post.mockResolvedValue({ data: mockResponse })

      const result = await validateCohortDefinition({ criteria: 'valid' }, 'http://localhost/WebAPI')

      expect(result.warnings).toHaveLength(0)
    })

    it('throws error with status code on HTTP 400', async () => {
      const error = {
        isAxiosError: true,
        response: {
          status: 400,
          statusText: 'Bad Request',
        },
      }

      mockedAxios.post.mockRejectedValue(error)
      mockedAxios.isAxiosError.mockReturnValue(true)

      await expect(validateCohortDefinition({}, 'http://localhost/WebAPI')).rejects.toThrow(
        'Validation API returned 400: Bad Request'
      )
    })

    it('throws error with status code on HTTP 500', async () => {
      const error = {
        isAxiosError: true,
        response: {
          status: 500,
          statusText: 'Internal Server Error',
        },
      }

      mockedAxios.post.mockRejectedValue(error)
      mockedAxios.isAxiosError.mockReturnValue(true)

      await expect(validateCohortDefinition({}, 'http://localhost/WebAPI')).rejects.toThrow(
        'Validation API returned 500: Internal Server Error'
      )
    })

    it('throws error on network failure', async () => {
      mockedAxios.post.mockRejectedValue(new Error('Network request failed'))
      mockedAxios.isAxiosError.mockReturnValue(false)

      await expect(validateCohortDefinition({}, 'http://localhost/WebAPI')).rejects.toThrow('Network request failed')
    })

    it('throws error if response is missing warnings array', async () => {
      mockedAxios.post.mockResolvedValue({ data: { invalidField: 'no warnings' } })

      await expect(validateCohortDefinition({}, 'http://localhost/WebAPI')).rejects.toThrow(
        'Invalid validation response: missing warnings array'
      )
    })

    it('throws error if warnings is not an array', async () => {
      mockedAxios.post.mockResolvedValue({ data: { warnings: 'not an array' } })

      await expect(validateCohortDefinition({}, 'http://localhost/WebAPI')).rejects.toThrow(
        'Invalid validation response: missing warnings array'
      )
    })

    it('sends cohort definition as JSON in request body', async () => {
      const cohortDef = {
        criteria: { entry: ['test'] },
      }

      mockedAxios.post.mockResolvedValue({ data: { warnings: [] } })

      await validateCohortDefinition(cohortDef, 'http://localhost/WebAPI')

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'http://localhost/WebAPI/cohortdefinition/checkV2',
        cohortDef,
        expect.objectContaining({
          headers: { 'Content-Type': 'application/json' },
        })
      )
    })
  })
})
