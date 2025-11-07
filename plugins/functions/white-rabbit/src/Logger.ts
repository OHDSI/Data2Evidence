import { NextFunction, Request, Response } from 'express'

export const createLogger = (className = ''): any => {
  return console
}

const logger = createLogger()

const EXCLUSION_URLS = ['/check-readiness', '/check-liveness']

export const createLoggingMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const url = `${req.baseUrl}${req.url}`

  if (!EXCLUSION_URLS.some(excl => url.includes(excl))) {
    logger.info(`START ${req.method} ${req.baseUrl}${req.url}`)

    req.on('close', () => {
      logger.info(`END ${req.method} ${req.baseUrl}${req.url}`)
    })
  }

  next()
}
