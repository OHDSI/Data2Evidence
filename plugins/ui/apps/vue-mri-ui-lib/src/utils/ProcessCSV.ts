import { AxiosResponse } from 'axios'
import { getPendingSaveSignal, takePendingSaveTarget, writeBlobToSaveTarget } from './saveFile'

/**
 * Creates CSV file format from data and saves it. When a filename is provided it takes precedence;
 * otherwise the server's content-disposition header is used, falling back to `download.csv`.
 * If the user already chose a file through the save picker, the CSV is written there and the
 * returned promise resolves once it is on disk, or rejects with an AbortError if the export was cancelled.
 * @param response.data A long string containing the CSV content
 * @param fileName Optional frontend-generated filename
 */
const processCSV = (response: AxiosResponse<string>, fileName?: string): Promise<void> => {
  const csvFile = new Blob(['\ufeff', response.data], { type: 'text/csv' })
  let actualFileName = fileName
  if (!actualFileName) {
    const header = response.headers['content-disposition']
    const parsed = header ? header.match(/filename=(.*?)(?:$|\s)/) : []
    if (parsed && parsed.length === 2) {
      actualFileName = parsed[1].replace(/['"]+/g, '')
    }
  }
  // Cancelling the download dialog aborts this signal, which also stops a write already under way
  const signal = getPendingSaveSignal('csv')
  return writeBlobToSaveTarget(takePendingSaveTarget('csv', actualFileName || 'download.csv'), csvFile, signal)
}

export default processCSV
