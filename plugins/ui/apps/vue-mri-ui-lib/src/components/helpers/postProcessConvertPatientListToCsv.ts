import { scanForCharsToEscapeAndSurroundQuotes } from './shared'

export function postProcessConvertPatientListToCsv({
  result,
  delimiter,
  columnOrderList,
  NOVALUE,
}: {
  result: any
  delimiter?: string
  columnOrderList?: string[]
  NOVALUE: string
}) {
  const jsonObject = result.data
  const realDelimiter = delimiter || ','
  const rowSeparator = '\r\n'
  const universalNewLineSeparator = '\n'
  const separatorRegex = new RegExp(`${realDelimiter}|${rowSeparator}|${universalNewLineSeparator}`, 'g')
  const resultData = typeof jsonObject !== 'object' ? JSON.parse(jsonObject) : jsonObject
  if (resultData === null) {
    return null // No data found on the jsonObject
  }
  let str = ''
  // add headers
  let lineBits = []
  const headerList = columnOrderList
    ? columnOrderList.reduce((output: any, columnId) => {
        for (let i = 0; i < result.measures.length; i++) {
          // column names from both UI & DB are having the interaction indexes
          if (result.measures[i].id === columnId) {
            output.push(result.measures[i])
          }
        }
        return output
      }, [])
    : result.measures

  // Inserting header row
  if (headerList) {
    headerList.forEach(measure => {
      lineBits.push(
        scanForCharsToEscapeAndSurroundQuotes({
          columnValue: measure.name,
          separatorRegex,
          noValue: NOVALUE,
        })
      )
    })
  }

  // updating "NoValue" with empty string
  resultData.forEach(row => {
    for (const key in row) {
      if (row[key]) {
        if (typeof row[key] === 'string' && row[key] === NOVALUE) {
          row[key] = ''
        } else if (row[key][0] && row[key][0] === NOVALUE) {
          row[key][0] = ''
        }
      }
    }
  })

  // Inserting data rows
  str += lineBits.join(realDelimiter) + rowSeparator
  if (headerList) {
    for (let i = 0; i < resultData.length; i++) {
      lineBits = []
      headerList.forEach(measure => {
        lineBits.push(
          scanForCharsToEscapeAndSurroundQuotes({
            columnValue: resultData[i][measure.id],
            separatorRegex,
            noValue: NOVALUE,
          })
        )
      })
      str += lineBits.join(realDelimiter) + rowSeparator
    }
  }
  return result.categories.length === 0 && result.measures.length === 0 && result.data.length === 0 ? '' : str
}
