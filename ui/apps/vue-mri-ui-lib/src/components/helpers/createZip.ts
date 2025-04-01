import JSZip from 'jszip'

import { scanForCharsToEscapeAndSurroundQuotes } from './shared'
import { Zip, AsyncZipDeflate } from 'fflate'
import streamSaver from 'streamsaver'

export function createZip(
  {
    // resultSet,
    // selectedAttributes,
    // noValue,
    responses,
  }: {
    // resultSet: any[]
    // selectedAttributes: any[]
    // noValue: string
    responses: any
  },
  cb: any
) {
  const fileStream = streamSaver.createWriteStream(`PatientAnalytics_Patient-List_${new Date().toISOString()}.zip`)

  const writer = fileStream.getWriter()

  const zip = new Zip()
  zip.ondata = (err, chunk, final) => {
    if (err) {
      writer.close()
      throw err
    }
    writer.write(chunk)
    if (final) {
      writer.close()
      cb() // End of Archiving
    }
  }

  responses.forEach((response, index) => {
    const entityFile = new AsyncZipDeflate(response.filename)
    zip.add(entityFile)
    const reader = response.response.body.getReader()
    const pump = () => {
      reader.read().then(({ done, value }) => {
        if (done) {
          // If there is no more data to read
          entityFile.push(new Uint8Array([]), done)
          return
        }
        entityFile.push(value)
        pump()
      })
    }
    pump()
    if (responses.length === index + 1) {
      zip.end() // Must be called after all the files are added
    }
  })
}

/**Converts datasets to CSV format */
// private _buildCSV(headers: string[], result: any[], callback): string {
export function _buildCSV({
  headers,
  result,
  delimiter = ',',
  noValue,
}: {
  headers: string[]
  result: any[]
  delimiter?: string
  noValue: string
}): string {
  result = _updatePidHeaderInResults(result)
  let csv = ''
  let line = []
  const rowSeparator = '\r\n'
  const universalNewLineSeparator = '\n'
  const separatorRegex = new RegExp(`${delimiter}|${rowSeparator}|${universalNewLineSeparator}`, 'g')
  if (headers.filter(h => h === 'patient.attributes.pid').length === 0) {
    headers.push('patient.attributes.pid')
  }
  if (headers.length > 0) {
    headers.forEach(header =>
      line.push(scanForCharsToEscapeAndSurroundQuotes({ columnValue: header, separatorRegex, noValue }))
    )
    csv += line.join(delimiter) + rowSeparator
    result.forEach((r, idx) => {
      line = []
      headers.forEach(header => {
        line.push(scanForCharsToEscapeAndSurroundQuotes({ columnValue: result[idx][header], separatorRegex, noValue }))
      })
      csv += line.join(delimiter) + rowSeparator
    })
  }
  return csv
}

export function _getCSVHeaders(attributeList: any[], entityName: string): string[] {
  return attributeList.reduce((header, currAttr) => {
    if (currAttr.configPath === entityName) {
      header.push(currAttr.id)
    }
    return header
  }, [])
}

export function _updatePidHeaderInResults(result): any[] {
  if (result && result.length > 0) {
    let pidHeaderChangeRequired = false
    let oldPidHeader = ''
    Object.keys(result[0]).forEach(h => {
      if (h.indexOf('attributes.pid') !== -1 && h !== 'patient.attributes.pid') {
        pidHeaderChangeRequired = true
        oldPidHeader = h
      }
    })

    if (pidHeaderChangeRequired && oldPidHeader !== '') {
      result.forEach(el => {
        const pid = el[oldPidHeader]
        delete el[oldPidHeader]
        el[`patient.attributes.pid`] = pid
      })
    }
  }
  return result
}
