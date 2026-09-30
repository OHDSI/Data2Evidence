export interface PatientListLoadError {
  logId: string | null
}

const LOGGED_ERROR_TYPE = 'MRILoggedError'

export const toPatientListLoadError = (error: any): PatientListLoadError => {
  const data = error?.response?.data
  const logId =
    data?.errorType === LOGGED_ERROR_TYPE && typeof data.logId === 'string' && data.logId ? data.logId : null
  return { logId }
}
