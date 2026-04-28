import { AxiosResponse } from 'axios'
import { saveAs } from 'file-saver'

/**
 * Creates CSV file format from data. If filename is not provided, saves as default name `download.csv`
 * @param response.data A long string containing the CSV content
 */
const processCSV = (response: AxiosResponse<string>, serverProvidedFileName?: string) => {
  const csvFile = new Blob(['\ufeff', response.data], { type: 'text/csv' })
  const header = response.headers['content-disposition']
  const parsed = header ? header.match(/filename=(.*?)(?:$|\s)/) : []
  let actualFileName = serverProvidedFileName
  if (parsed && parsed.length === 2) {
    actualFileName = parsed[1].replace(/['"]+/g, '')
  }
  saveAs(csvFile, actualFileName || 'download.csv')
}

export default processCSV
