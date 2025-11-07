import { Logger, createLogger as createWinstonLogger, format, transports } from 'winston'
import { env } from './env.ts'

export enum LOG_LEVEL {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4,
  OFF = 5,
}

export const createLogger = (className = ''): Logger => {
  return createWinstonLogger({
    level: env.PORTAL_SERVER_LOG_LEVEL || LOG_LEVEL.INFO,
    format: format.json(),
    transports: [
      new transports.Console({
        format: format.combine(
          format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
          format.colorize(),
          format.printf(nfo => {
            const cName = className ? `[${className}]` : ''
            return `[${nfo.timestamp}]${cName} ${nfo.level}: ${nfo.message}`
          })
        )
      })
    ]
  })
}

export const getLogLevels = () => {
  if (env.NODE_ENV === 'production') {
    return ['log', 'warn', 'error']
  }
  return ['log', 'warn', 'error', 'verbose', 'debug']
}
