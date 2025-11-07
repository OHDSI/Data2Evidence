import express, { NextFunction, Request, Response } from 'express'
import { Service } from 'typedi'
import { createLogger } from '../Logger'
import { SetupService } from '../services'
import { AzureADSetupRequest } from '../types'

@Service()
export class SetupRouter {
  public router = express.Router()
  private readonly logger = createLogger(this.constructor.name)

  constructor(private readonly setupService: SetupService) {
    this.registerRoutes()
  }

  private registerRoutes() {
    this.router.get('/azure-ad', async (req: Request, res: Response, next: NextFunction) => {
      try {
        const data = await this.setupService.getAzureADConfig()
        res.json(data)
      } catch (err) {
        this.logger.error(`Error when getting Azure AD configs: ${JSON.stringify(err)}`)
        next(err)
      }
    })

    this.router.post('/azure-ad', async (req: Request, res: Response, next: NextFunction) => {
      const { tenantViewerGroupId, systemAdminGroupId, userAdminGroupId } = req.body || {}

      if (!tenantViewerGroupId) {
        this.logger.warn(`Param 'tenantViewerGroupId' is required`)
        return res.status(400).send({ message: `Param 'tenantViewerGroupId' is required` })
      }

      if (!systemAdminGroupId) {
        this.logger.warn(`Param 'systemAdminGroupId' is required`)
        return res.status(400).send({ message: `Param 'systemAdminGroupId' is required` })
      }

      if (!userAdminGroupId) {
        this.logger.warn(`Param 'userAdminGroupId' is required`)
        return res.status(400).send({ message: `Param 'userAdminGroupId' is required` })
      }

      this.logger.info(`Setup Azure AD groups`)

      try {
        const request: AzureADSetupRequest = { tenantViewerGroupId, systemAdminGroupId, userAdminGroupId }
        await this.setupService.setupAzureAD(request)

        res.sendStatus(200)
      } catch (err) {
        this.logger.error(`Error when setting up Azure AD groups: ${JSON.stringify(err)}`)
        next(err)
      }
    })
  }
}
