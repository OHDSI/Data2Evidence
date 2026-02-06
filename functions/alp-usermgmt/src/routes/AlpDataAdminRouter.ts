import express, { NextFunction, Response } from 'express'
import { Service } from 'typedi'
import { ROLES } from '../const'
import { IAppRequest } from '../types'
import { SystemAdminService } from '../services'
import { createLogger } from '../Logger'
import { env } from '../env'

@Service()
export class AlpDataAdminRouter {
  public router = express.Router()
  private readonly logger = createLogger(this.constructor.name)

  constructor(private readonly systemAdminService: SystemAdminService) {
    this.registerRoutes()
  }

  private registerRoutes() {
    this.router.post('/register', async (req: IAppRequest, res: Response, next: NextFunction) => {
      const { userId, roles } = req.body || {}
      const system = env.ALP_SYSTEM_NAME!

      if (!userId) {
        this.logger.warn(`Param 'userId' is required`)
        return res.status(400).send(`Param 'userId' is required`)
      }

      try {
        if (roles.includes(ROLES.ALP_SYSTEM_ADMIN)) {
          await this.systemAdminService.register(userId, system)
        }

        return res.status(200).json({ userId })
      } catch (err) {
        this.logger.error(`Error when granting user ${userId} roles ${JSON.stringify(roles)}: ${JSON.stringify(err)}`)
        return next(err)
      }
    })

    this.router.post('/withdraw', async (req: IAppRequest, res: Response, next: NextFunction) => {
      const { userId, roles } = req.body || {}
      const system = env.ALP_SYSTEM_NAME!

      if (!userId) {
        this.logger.warn(`Param 'userId' is required`)
        return res.status(400).send(`Param 'userId' is required`)
      }

      try {
        if (roles.includes(ROLES.ALP_SYSTEM_ADMIN)) {
          await this.systemAdminService.withdraw(userId, system)
        }

        return res.status(200).json({ userId })
      } catch (err) {
        this.logger.error(
          `Error when withdrawing user ${userId} roles ${JSON.stringify(roles)}: ${JSON.stringify(err)}`
        )
        return next(err)
      }
    })
  }
}
