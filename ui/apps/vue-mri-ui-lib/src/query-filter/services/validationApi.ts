import axios from 'axios'
import type { ValidationResponse } from '../types/ValidationTypes'

/**
 * Calls WebAPI cohort definition validation endpoint
 *
 * @param cohortDefinition - Atlas cohort definition JSON
 * @param baseUrl - WebAPI base URL (e.g., "http://localhost:8080/WebAPI")
 * @returns Validation response with warnings array
 * @throws Error if API call fails
 */
export async function validateCohortDefinition(
  cohortDefinition: unknown,
  baseUrl: string
): Promise<ValidationResponse> {
  const url = `${baseUrl}/cohortdefinition/checkV2`

  try {
    const response = await axios.post<ValidationResponse>(url, cohortDefinition, {
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const data = response.data

    // Validate response structure
    if (!data.warnings || !Array.isArray(data.warnings)) {
      throw new Error('Invalid validation response: missing warnings array')
    }

    return data
  } catch (error) {
    console.error('[validationApi] Validation failed:', error)

    // Re-throw axios errors with better messages
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(`Validation API returned ${error.response.status}: ${error.response.statusText}`)
    }

    throw error
  }
}
