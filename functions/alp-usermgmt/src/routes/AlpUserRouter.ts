import express, { NextFunction, Response } from 'express'
import { Service } from 'typedi'
import { ROLES } from '../const'
import { IAppRequest, IUserWithRoles } from '../types'
import { UserAdminService, DashboardViewerService, JobRunnerService } from '../services'
import { createLogger } from '../Logger'
import { User } from '../entities'

@Service()
export class AlpUserRouter {
  public router = express.Router()
  private readonly logger = createLogger(this.constructor.name)

  constructor(
    private readonly userAdminService: UserAdminService,
    private readonly dashboardViewerService: DashboardViewerService,
    private readonly jobRunnerService: JobRunnerService
  ) {
    this.registerRoutes()
  }

  private registerRoutes() {
    this.router.get('/', async (req: IAppRequest, res: Response, next: NextFunction) => {
      const alpUsers: { [userId: string]: IUserWithRoles } = {}
      this.logger.info('Get ALP users')

      try {
        const userAdmins = await this.userAdminService.getUsers()
        this.mergeUserWithRoles(alpUsers, userAdmins, ROLES.ALP_USER_ADMIN)

        return res.status(200).json(Object.values(alpUsers))
      } catch (err) {
        this.logger.error(`Error when getting ALP users: ${JSON.stringify(err)}`)
        return next(err)
      }
    })

    this.router.post('/register', async (req: IAppRequest, res: Response, next: NextFunction) => {
      const { userId, roles } = req.body || {}

      if (!userId) {
        this.logger.warn(`Param 'userId' is required`)
        return res.status(400).send(`Param 'userId' is required`)
      }

      try {
        if (roles.includes(ROLES.ALP_USER_ADMIN)) {
          await this.userAdminService.registerUser(userId)
        }
        if (roles.includes(ROLES.STUDY_WRITE_DQD_RESEARCHER)) {
          await this.jobRunnerService.registerUser(userId)
        }
        if (roles.includes(ROLES.ALP_DASHBOARD_VIEWER)) {
          await this.dashboardViewerService.registerUser(userId)
        }

        return res.status(200).json({ userId })
      } catch (err) {
        this.logger.error(`Error when granting user ${userId} roles ${JSON.stringify(roles)}: ${JSON.stringify(err)}`)
        return next(err)
      }
    })

    this.router.post('/withdraw', async (req: IAppRequest, res: Response, next: NextFunction) => {
      const { userId, roles } = req.body || {}

      if (!userId) {
        this.logger.warn(`Param 'userId' is required`)
        return res.status(400).send(`Param 'userId' is required`)
      }

      try {
        if (roles.includes(ROLES.ALP_USER_ADMIN)) {
          await this.userAdminService.withdrawUser(userId)
        }
        if (roles.includes(ROLES.STUDY_WRITE_DQD_RESEARCHER)) {
          await this.jobRunnerService.withdrawUser(userId)
        }
        if (roles.includes(ROLES.ALP_DASHBOARD_VIEWER)) {
          await this.dashboardViewerService.withdrawUser(userId)
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
    target: { [userId: string]: IUserWithRoles },
    usersToCombine: User[],
    assignToRole: string
  ) {
    for (const user of usersToCombine) {
      if (!target[user.id]) {
        target[user.id] = { userId: user.id, username: user.username, roles: [assignToRole] }
      } else if (target[user.id] && !target[user.id].roles.includes(assignToRole)) {
        target[user.id].roles = [...target[user.id].roles, assignToRole]
      }
    }
  }
}
