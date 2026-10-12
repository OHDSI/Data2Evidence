import { describe, expect, it } from 'vitest'
import { toPatientListLoadError } from '../patientListLoadError'

describe('toPatientListLoadError', () => {
  it('keeps the log ID of a logged database error', () => {
    const error = {
      response: { status: 500, data: { errorType: 'MRILoggedError', logId: 'abc-123', errorMessage: 'x' } },
    }

    expect(toPatientListLoadError(error)).toEqual({ logId: 'abc-123' })
  })

  it('has no log ID for other backend errors', () => {
    const error = { response: { status: 500, data: { errorMessage: 'failed' } } }

    expect(toPatientListLoadError(error)).toEqual({ logId: null })
  })

  it('has no log ID when the request fails without a response', () => {
    expect(toPatientListLoadError(new Error('Network Error'))).toEqual({ logId: null })
  })

  it('ignores an empty or non-string log ID', () => {
    const empty = { response: { status: 500, data: { errorType: 'MRILoggedError', logId: '' } } }
    const numeric = { response: { status: 500, data: { errorType: 'MRILoggedError', logId: 42 } } }

    expect(toPatientListLoadError(empty)).toEqual({ logId: null })
    expect(toPatientListLoadError(numeric)).toEqual({ logId: null })
  })

  it('accepts a missing error value', () => {
    expect(toPatientListLoadError(undefined)).toEqual({ logId: null })
  })
})
