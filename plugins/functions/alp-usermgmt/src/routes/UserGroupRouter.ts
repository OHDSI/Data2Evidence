import express, { Response, NextFunction } from 'express'
import { Service } from 'typedi'
import { B2cGroupService, UserGroupService, UserService } from '../services'
import { IAppRequest } from '../types'
import { UserGroupExtCriteria, UserGroupExtCriteriaKeys } from '../repositories'
import { camelToSnakeCase } from '../utils'
import { createLogger } from '../Logger'
import { permittedUserCheck } from '../middlewares/permitted-user-check'
import { permittedTenantCheck } from '../middlewares/permitted-tenant-check'
import { PortalAPI } from '../api'
import { grantRolesByScopes } from '../middlewares/grant-roles-by-scopes'
import { env } from '../env'

@Service()
export class UserGroupRouter {
  public router = express.Router()
  private readonly logger = createLogger(this.constructor.name)

  constructor(
    private readonly userGroupService: UserGroupService,
    private readonly groupService: B2cGroupService,
    private readonly userService: UserService,
    private readonly portalAPI: PortalAPI
  ) {
    this.registerRoutes()
  }

  private registerRoutes() {
    this.router.post(
      '/list',
      grantRolesByScopes,
      permittedUserCheck({ isReadAccess: true, isIdpUserId: true }),
      async (req: IAppRequest, res: Response, next: NextFunction) => {
        const { userId, tenantId, system } = req.body || {}

        if (!userId) {
          this.logger.warn(`Param 'userId' is required`)
          return res.status(400).send({ message: `Param 'userId' is required` })
        }

        const user = await this.userService.getUserByIdpUserId(userId)
        if (!user) {
          this.logger.error(`IDP user ID ${userId} not found`)
          return res.status(400).send({ message: `IDP user ID ${userId} not found` })
        }

        this.logger.info(`Get membership of ${userId}${tenantId ? ` for tenant ${tenantId}` : ''}`)

        try {
          const groups = await this.userGroupService.getUserGroupsMetadata(user.id, tenantId, system)
          return res.status(200).json(groups)
        } catch (err) {
          this.logger.error(`Error when getting membership metadata ${userId}: ${JSON.stringify(err)}`)
          return next(err)
        }
      }
    )

    this.router.get(
      '/',
      permittedUserCheck({ isReadAccess: true }),
      async (req: IAppRequest, res: Response, next: NextFunction) => {
        this.logger.info(`Get memberships ${JSON.stringify(req.query)}`)

        const criteria: Partial<UserGroupExtCriteria> = {}
        Object.keys(req.query || {}).map((k: string) => {
          const field = camelToSnakeCase(k) as keyof UserGroupExtCriteria
          if (UserGroupExtCriteriaKeys.includes(field)) {
            const value = req.query[k]
            if (typeof value === 'string') {
              if (value.includes(',')) {
                criteria[field] = value.split(',')
              } else {
                criteria[field] = value
              }
            }
            // else: ignore non-string values for security
          }
        })

        try {
          const userGroups = await this.userGroupService.getUserGroupExtList(criteria)
          return res.status(200).json(userGroups)
        } catch (err) {
          this.logger.error(`Error when getting membership ${JSON.stringify(req.query)}: ${JSON.stringify(err)}`)
          return next(err)
        }
      }
    )

    this.router.get(
      '/overview',
      permittedUserCheck({ isReadAccess: true }),
      async (req: IAppRequest, res: Response, next: NextFunction) => {
        const { tenantId } = req.query

        this.logger.info(`Get user overview ${tenantId ? `by tenant ${tenantId}` : ''}`)
        const criteria = tenantId ? { tenant_id: tenantId as string } : undefined

        try {
          const userGroups = await this.userGroupService.getUserGroupExtList(criteria)
          return res.status(200).json(userGroups)
        } catch (err) {
          this.logger.error(
            `Error when getting overview ${tenantId ? `by tenant ${tenantId}` : ''}: ${JSON.stringify(err)}`
          )
          return next(err)
        }
      }
    )

    this.router.post(
      '/register-tenant-roles',
      permittedTenantCheck(['TENANT_ADMIN'], { tenantIdPath: 'body.tenantId' }),
      async (req: IAppRequest, res: Response, next: NextFunction) => {
        const { userId, roles } = req.body || {}
        const tenantId = env.APP_TENANT_ID!

        if (!userId) {
          this.logger.warn(`Param 'userId' is required`)
          return res.status(400).send({ message: `Param 'userId' is required` })
        }

        if (!tenantId) {
          this.logger.warn(`Param 'tenantId' is required`)
          return res.status(400).send({ message: `Param 'tenantId' is required` })
        }

        if (!roles || roles.length == 0) {
          this.logger.warn(`Param 'roles' is required`)
          return res.status(400).send({ message: `Param 'roles' is required` })
        }

        const tenants = await this.portalAPI.getTenants()
        const tenant = tenants.find(t => t.id === tenantId)
        if (!tenant || !tenant.id) {
          this.logger.warn(`Tenant '${tenantId}' is not exist`)
          return res.status(400).send({ message: `Tenant '${tenantId}' does not exist` })
        }

        for (const role of roles) {
          const check = await this.groupService.getGroupByTenantRole(tenantId, role)
          if (check == null) {
            this.logger.info(`Group ${role} does not exist. Creating role...`)
            await this.groupService.createGroup({ role, tenantId })
          }
        }

        try {
          const groupIds: string[] = []
          for (const role of roles) {
            const group = await this.groupService.getGroupByTenantRole(tenantId, role)
            if (!group) {
              this.logger.error(`Group for role ${roles} and tenant ${tenantId} does not exist`)
              return res.status(500).send({ message: `Group for role ${roles} and tenant ${tenantId} does not exist` })
            }
            groupIds.push(group.id)
          }

          const response = await this.userGroupService.registerUsersToGroups([userId], groupIds)
          return res.status(200).json(response)
        } catch (err) {
          this.logger.error(
            `Error adding user ${userId} to roles ${roles} for tenant ${tenantId}: ${JSON.stringify(err)}`
          )
          return next(err)
        }
      }
    )

    this.router.post(
      '/register-study-roles',
      permittedTenantCheck(['TENANT_ADMIN'], { tenantIdPath: 'body.tenantId' }),
      async (req: IAppRequest, res: Response, next: NextFunction) => {
        const { userIds, tenantId, studyId, roles } = req.body || {}

        if (!userIds || userIds.length === 0) {
          this.logger.warn(`Param 'userIds' is required`)
          return res.status(400).send({ message: `Param 'userIds' is required` })
        }

        if (!studyId) {
          this.logger.warn(`Param 'studyId' is required`)
          return res.status(400).send({ message: `Param 'studyId' is required` })
        }

        if (!roles || roles.length === 0) {
          this.logger.warn(`Param 'roles' is required`)
          return res.status(400).send({ message: `Param 'roles' is required` })
        }

        const myTenants = await this.portalAPI.getMyTenants()
        const tenant = myTenants.find(t => t.id === tenantId)
        if (!tenant || !tenant.id) {
          this.logger.warn(`Tenant '${tenantId}' does not exist`)
          return res.status(400).send({ message: `Tenant '${tenantId}' does not exist` })
        }

        const study = await this.portalAPI.getDataset(studyId)
        if (!study || !study.id) {
          this.logger.warn(`Study '${studyId}' does not exist`)
          return res.status(400).send({ message: `Study '${studyId}' does not exist` })
        }

        for (const role of roles) {
          const check = await this.groupService.getGroupByStudyRole(studyId, role)
          if (check == null) {
            this.logger.info(`Group ${role} does not exist. Creating role...`)
            await this.groupService.createGroup({ role, tenantId, studyId })
          }
        }

        try {
          const groupIds: string[] = []
          for (const role of roles) {
            const group = await this.groupService.getGroupByStudyRole(studyId, role)
            if (!group) {
              this.logger.error(`Group for role ${JSON.stringify(roles)} and study ${studyId} does not exist`)
              return res
                .status(500)
                .send({ message: `Group for role ${JSON.stringify(roles)} and study ${studyId} does not exist` })
            }
            groupIds.push(group.id)
          }

          const response = await this.userGroupService.registerUsersToGroups(userIds, groupIds)

          return res.status(200).json(response)
        } catch (err) {
          this.logger.error(
            `Error adding user ${JSON.stringify(userIds)} to roles ${JSON.stringify(
              roles
            )} for study ${studyId}: ${JSON.stringify(err)}`
          )
          return next(err)
        }
      }
    )

    this.router.post(
      '/withdraw-tenant-roles',
      permittedUserCheck(),
      permittedTenantCheck(['TENANT_ADMIN'], { tenantIdPath: 'body.tenantId' }),
      async (req: IAppRequest, res: Response, next: NextFunction) => {
        const { userId, roles } = req.body || {}
        const tenantId = env.APP_TENANT_ID!

        if (!userId) {
          this.logger.warn(`Param 'userId' is required`)
          return res.status(400).send({ message: `Param 'userId' is required` })
        }

        if (!tenantId) {
          this.logger.warn(`Param 'tenantId' is required`)
          return res.status(400).send({ message: `Param 'tenantId' is required` })
        }

        if (!roles || roles.length == 0) {
          this.logger.warn(`Param 'roles' is required`)
          return res.status(400).send({ message: `Param 'roles' is required` })
        }

        try {
          const groupIds: string[] = []
          for (const role of roles) {
            const group = await this.groupService.getGroupByTenantRole(tenantId, role)
            if (!group) {
              this.logger.error(`Group for role ${roles} and tenant ${tenantId} does not exist`)
              return res.status(500).send({ message: `Group for role ${roles} and tenant ${tenantId} does not exist` })
            }
            groupIds.push(group.id)
          }

          const response = await this.userGroupService.withdrawUserFromGroups(userId, groupIds)
          return res.status(200).json(response)
        } catch (err) {
          this.logger.error(
            `Error withdrawing user ${userId} from roles ${roles} for tenant ${tenantId}: ${JSON.stringify(err)}`
          )
          return next(err)
        }
      }
    )

    this.router.post(
      '/withdraw-study-roles',
      permittedTenantCheck(['TENANT_ADMIN'], { tenantIdPath: 'body.tenantId' }),
      async (req: IAppRequest, res: Response, next: NextFunction) => {
        const { userId, studyId, roles } = req.body || {}

        if (!userId) {
          this.logger.warn(`Param 'userId' is required`)
          return res.status(400).send({ message: `Param 'userId' is required` })
        }

        if (!studyId) {
          this.logger.warn(`Param 'studyId' is required`)
          return res.status(400).send({ message: `Param 'studyId' is required` })
        }

        if (!roles || roles.length === 0) {
          this.logger.warn(`Param 'roles' is required`)
          return res.status(400).send({ message: `Param 'roles' is required` })
        }

        try {
          const groupIds: string[] = []
          for (const role of roles) {
            const group = await this.groupService.getGroupByStudyRole(studyId, role)
            if (!group) {
              this.logger.error(`Group for role ${JSON.stringify(roles)} and study ${studyId} does not exist`)
              return res
                .status(500)
                .send({ message: `Group for role ${JSON.stringify(roles)} and study ${studyId} does not exist` })
            }
            groupIds.push(group.id)
          }

          const response = await this.userGroupService.withdrawUserFromGroups(userId, groupIds)

          return res.status(200).json(response)
        } catch (err) {
          this.logger.error(
            `Error adding user ${userId} to roles ${JSON.stringify(roles)} for study ${studyId}: ${JSON.stringify(err)}`
          )
          return next(err)
        }
      }
    )
  }
}
