import JSZip from 'jszip'

import { scanForCharsToEscapeAndSurroundQuotes } from './shared'
import { Zip, AsyncZipDeflate } from 'fflate'
import { generateDownloadFileName } from '../../utils/generateDownloadFileName'
import { openSaveTargetStream, takePendingSaveTarget } from '../../utils/saveFile'

/**
 * Streams the entity responses into a ZIP written to the save target chosen when the export was
 * started (or a browser download when there is none).
 * @returns resolves once the archive has been fully written and the file closed
 */
export async function createZip({ responses, cohortName }: { responses: any; cohortName?: string }): Promise<void> {
  const fileName = generateDownloadFileName(cohortName, 'patientlist', 'zip')
  const fileStream = await openSaveTargetStream(takePendingSaveTarget('zip', fileName))
  const writer = fileStream.getWriter()

  await new Promise<void>((resolve, reject) => {
    const fail = err => {
      writer.abort(err).catch(() => undefined)
      reject(err)
    }

    const zip = new Zip()
    zip.ondata = (err, chunk, final) => {
      if (err) {
        fail(err)
        return
      }
      writer.write(chunk).catch(fail)
      if (final) {
        // close() resolves only after every queued chunk has been written
        writer.close().then(resolve, fail)
      }
    }

    responses.forEach((response, index) => {
      const entityFile = new AsyncZipDeflate(response.filename)
      zip.add(entityFile)
      const reader = response.response.body.getReader()
      const pump = () => {
        reader
          .read()
          .then(({ done, value }) => {
            if (done) {
              // If there is no more data to read
              entityFile.push(new Uint8Array([]), done)
              return
            }
            entityFile.push(value)
            pump()
          })
          .catch(fail)
      }
      pump()
      if (responses.length === index + 1) {
        zip.end() // Must be called after all the files are added
      }
    })
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
