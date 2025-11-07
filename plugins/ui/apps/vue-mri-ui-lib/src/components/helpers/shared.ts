/* Check if column or row delimiter like characters are present as part of the values retrieved from database, if yes surround the whole values
       with escape character and double quotes, so that the delimiter like characters present in the actual values are not treated
       as actual delimters but as a whole a single value of a column.
       Ex: value : ab;c must be \"ab;c\" so that semicolon is not used as a delimiter to split a column in a word processing software
    */
export function scanForCharsToEscapeAndSurroundQuotes({
  columnValue,
  separatorRegex,
  noValue,
}: {
  columnValue: any
  separatorRegex: RegExp
  noValue: string
}) {
  if (columnValue === noValue) {
    return ''
  }
  if (
    columnValue &&
    columnValue.constructor !== Number &&
    columnValue.constructor !== Boolean &&
    columnValue.constructor !== Date
  ) {
    if (columnValue.constructor === Array) {
      columnValue = columnValue.map(value => {
        return scanForCharsToEscapeAndSurroundQuotes({
          columnValue: value,
          separatorRegex,
          noValue,
        })
      })
      return columnValue
    } else if (typeof columnValue === 'string') {
      columnValue = columnValue.replace(/\\n/g, '\n')
      columnValue = columnValue.replace(/\\r/g, '\r')
      return _surroundWithQuotes(columnValue, separatorRegex)
    } else if (columnValue.constructor === Object) {
      const keys = Object.keys(columnValue)
      if (keys) {
        keys.forEach(key => {
          columnValue[key] = scanForCharsToEscapeAndSurroundQuotes({
            columnValue: columnValue[key],
            separatorRegex,
            noValue,
          })
        })
      }
      return columnValue
    }
  }
  return columnValue
}
function _surroundWithQuotes(columnValue: string, separatorRegex: RegExp) {
  columnValue = columnValue.replace(/\"/g, `""`)
  if (columnValue && columnValue.search(separatorRegex) !== -1) {
    columnValue = `\"${columnValue}\"`
  }
  return columnValue
}
