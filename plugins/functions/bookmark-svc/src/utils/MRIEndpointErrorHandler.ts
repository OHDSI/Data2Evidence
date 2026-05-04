import { Logger } from '@alp/alp-base-utils'
import MRILoggedError from './MRILoggedError'
let MRIlogger = Logger.CreateLogger('bookmark-log')

export default function MRIEndpointErrorHandler({ err, language }: { err: Error; language: string }): {
  logId: string
  errorType: string
  errorMessage: string
} {
  const logId = MRIlogger.error(err)
  const { name, message } = new MRILoggedError(logId, language)
  return {
    logId,
    errorType: name,
    errorMessage: message,
  }
}
