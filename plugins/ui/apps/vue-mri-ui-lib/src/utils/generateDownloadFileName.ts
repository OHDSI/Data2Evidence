function sanitize(name: string, fallback = ''): string {
  return (name || fallback)
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
}

/**
 * Builds a download filename matching the ZIP naming convention:
 * `{safeCohortName}_{segment}_{DD-MM-YYYY}.{extension}`
 * @param cohortName The active bookmark/cohort name (falls back to `cohort`)
 * @param segment The middle segment, e.g. the chart type or `patientlist`
 * @param extension The file extension without the leading dot
 */
export function generateDownloadFileName(cohortName: string, segment: string, extension: string): string {
  const now = new Date()
  const day = String(now.getDate()).padStart(2, '0')
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const year = now.getFullYear()
  const dateStr = `${day}-${month}-${year}`
  const safeCohortName = sanitize(cohortName, 'cohort')
  const safeSegment = sanitize(segment)
  const middle = safeSegment ? `${safeSegment}_` : ''
  return `${safeCohortName}_${middle}${dateStr}.${extension}`
}

export default generateDownloadFileName
