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
  // Map log level number to Winston level string
  const logLevelMap: Record<number, string> = {
    [LOG_LEVEL.DEBUG]: 'debug',
    [LOG_LEVEL.INFO]: 'info',
    [LOG_LEVEL.WARN]: 'warn',
    [LOG_LEVEL.ERROR]: 'error',
    [LOG_LEVEL.FATAL]: 'error',
    [LOG_LEVEL.OFF]: 'error',
  }
  const envLevel = env.PORTAL_SERVER_LOG_LEVEL
  const isOff = envLevel === LOG_LEVEL.OFF || envLevel === 'off'
  const level = typeof envLevel === 'string'
    ? envLevel
    : logLevelMap[envLevel as number] || 'info'

  return createWinstonLogger({
    level,
    silent: isOff,
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
