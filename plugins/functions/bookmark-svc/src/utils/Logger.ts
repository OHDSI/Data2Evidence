// tslint:disable:no-console
import { createGuid } from '@alp/alp-base-utils'
export enum LOG_LEVEL {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4,
  OFF = 5,
}
/**
 * returns a guid which gets logged in the trace file.
 * This guid is sent to the user when filing a report about the error
 */
export interface ILogger {
  level: LOG_LEVEL
  setLogLevel(level: LOG_LEVEL)
  log(level: LOG_LEVEL, msg: string | Error): string
  error(msg: string | Error): string
  warn(msg: string | Error): string
  info(msg: string | Error): string
  debug(msg: string | Error): string
  fatal(msg: string | Error): string
}

let globalLogger: ILogger
let separator = '-------------------------------------------------'

function formatErrorMsg(err: Error): string {
  return `${err.name}
        ${separator}
        ${err.message}
        ${separator}
        ${err.stack}`
}

export function CreateLogger(): ILogger {
  if (!globalLogger) {
    globalLogger = new ConsoleLogger()
  }

  return globalLogger
}

export function DisableLogger() {
  CreateLogger().setLogLevel(LOG_LEVEL.OFF)
}

class ConsoleLogger implements ILogger {
  public level: LOG_LEVEL = LOG_LEVEL.DEBUG

  public setLogLevel(level: LOG_LEVEL) {
    this.level = level
  }

  public log(level: LOG_LEVEL, msg: string | Error) {
    if (level < this.level) {
      return ''
    }
    let guid = createGuid()
    let errorMsg = `[${guid}]: ${typeof msg === 'string' ? msg : formatErrorMsg(msg)} `

    switch (level) {
      case LOG_LEVEL.INFO:
        console.info(errorMsg)
        break
      case LOG_LEVEL.DEBUG:
        console.trace(errorMsg)
        break
      case LOG_LEVEL.ERROR:
      case LOG_LEVEL.WARN:
      case LOG_LEVEL.FATAL:
      default:
        console.error(errorMsg)
        break
    }

    return guid
  }

  public error(msg: string | Error) {
    return this.log(LOG_LEVEL.ERROR, msg)
  }

  public warn(msg: string | Error) {
    return this.log(LOG_LEVEL.WARN, msg)
  }

  public info(msg: string | Error) {
    return this.log(LOG_LEVEL.INFO, msg)
  }

  public debug(msg: string | Error) {
    return this.log(LOG_LEVEL.DEBUG, msg)
  }

  public fatal(msg: string | Error) {
    return this.log(LOG_LEVEL.FATAL, msg)
  }
}
