import { AxiosResponse } from 'axios'
import { saveAs } from 'file-saver'

/**
 * Creates CSV file format from data. When a filename is provided it takes precedence;
 * otherwise the server's content-disposition header is used, falling back to `download.csv`.
 * @param response.data A long string containing the CSV content
 * @param fileName Optional frontend-generated filename
 */
const processCSV = (response: AxiosResponse<string>, fileName?: string) => {
  const csvFile = new Blob(['\ufeff', response.data], { type: 'text/csv' })
  let actualFileName = fileName
  if (!actualFileName) {
    const header = response.headers['content-disposition']
    const parsed = header ? header.match(/filename=(.*?)(?:$|\s)/) : []
    if (parsed && parsed.length === 2) {
      actualFileName = parsed[1].replace(/['"]+/g, '')
    }
  }
  saveAs(csvFile, actualFileName || 'download.csv')
}

export default processCSV
