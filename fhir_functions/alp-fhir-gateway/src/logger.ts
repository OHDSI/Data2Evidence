import winston from 'winston'
import { NextFunction, Request, Response } from 'express'
import { env } from './env'

export const createLogger = (className = '') => {
  return winston.createLogger({
    level: env.FHIR__LOG_LEVEL,
    format: winston.format.json(),
    transports: [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
          winston.format.colorize(),
          winston.format.printf(nfo => {
            const cName = className ? `[${className}]` : ''
            return `[${nfo.timestamp}]${cName} ${nfo.level}: ${nfo.message}`
          })
        )
      })
    ]
  })
}

const logger = createLogger()

const EXCLUSION_URLS = ['/check-readiness', '/check-liveness']

export const createLoggingMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const url = `${req.baseUrl}${req.url}`

  if (!EXCLUSION_URLS.some(excl => url.includes(excl))) {
    logger.info(`START ${req.method} ${req.baseUrl}${req.url}`)

    req.on('close', () => {
      logger.info(`END ${req.method} ${req.baseUrl}${req.url}`)
    })
  }

  next()
}
