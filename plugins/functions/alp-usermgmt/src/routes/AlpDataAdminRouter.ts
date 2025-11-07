import express, { NextFunction, Response } from 'express'
import { Service } from 'typedi'
import { ROLES } from '../const'
import { IAppRequest, IUserWithRolesInfo } from '../types'
import { SystemAdminService, NifiAdminService } from '../services'
import { createLogger } from '../Logger'
import { UserGroupExt } from '../dtos'
import { env } from '../env'

@Service()
export class AlpDataAdminRouter {
  public router = express.Router()
  private readonly logger = createLogger(this.constructor.name)

  constructor(
    private readonly systemAdminService: SystemAdminService,
    private readonly nifiAdminService: NifiAdminService
  ) {
    this.registerRoutes()
  }

  private registerRoutes() {
    this.router.get('/', async (req: IAppRequest, res: Response, next: NextFunction) => {
      const dataAdmins: { [userId: string]: IUserWithRolesInfo } = {}
      this.logger.info('Get ALP data admins')

      try {
        const nifiAdmins = await this.nifiAdminService.getUsers()
        this.mergeUserWithRoles(dataAdmins, nifiAdmins, ROLES.ALP_NIFI_ADMIN)

        return res.status(200).json(Object.values(dataAdmins))
      } catch (err) {
        this.logger.error(`Error when getting ALP data admins: ${JSON.stringify(err)}`)
        return next(err)
      }
    })

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
        if (roles.includes(ROLES.ALP_NIFI_ADMIN)) {
          await this.nifiAdminService.registerUser(userId, system)
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
        if (roles.includes(ROLES.ALP_NIFI_ADMIN)) {
          await this.nifiAdminService.withdrawUser(userId, system)
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

  private mergeUserWithRoles(
    target: { [userIdSystem: string]: IUserWithRolesInfo },
    usersToCombine: UserGroupExt[],
    assignToRole: string
  ) {
    for (const user of usersToCombine) {
      const key = `${user.userId}|${user.system}`
      if (!target[key]) {
        target[key] = {
          userId: user.userId,
          username: user.username,
          roles: [assignToRole],
          system: user.system,
          tenantId: user.tenantId,
          studyId: user.studyId
        }
      } else if (target[key] && !target[key].roles.includes(assignToRole)) {
        target[key].roles = [...target[key].roles, assignToRole]
      }
    }
  }
}
