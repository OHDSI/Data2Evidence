import { Request, Response } from 'express'
import type { Knex } from '../types'
import { createLogger } from './Logger'
import { Container } from 'typedi'

const logger = createLogger('HealthCheck')

// TODO: Replace this with the one in mri-utils when the typescript config is aligned
export const healthCheckMiddleware = async (_req: Request, res: Response): Promise<void> => {
  const healthcheck = {
    uptime: process.uptime(),
    message: 'OK',
    timestamp: Date.now()
  }
  try {
    // Check db connection
    const db = Container.get<Knex>('DB_CONNECTION')
    await db.raw('SELECT 1')

    res.send(healthcheck)
  } catch (e) {
    healthcheck.message = e
    logger.error(e.message)
    res.send(503)
  }
}
