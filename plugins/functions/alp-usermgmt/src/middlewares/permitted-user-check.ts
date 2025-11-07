import { NextFunction, Response } from 'express'
import { Container } from 'typedi'
import { UserGroupService, UserService } from '../services'
import { createLogger } from '../Logger'
import { IAppRequest } from '../types'
import * as _  from 'lodash-es'
import { ROLES } from '../const'

interface RoleCheckOptions {
  userIdPath?: string
  userMustWithinTenant?: boolean
  isReadAccess?: boolean
  isIdpUserId?: boolean // indicate the userId in the request body is an IDP user ID
}

const DEFAULT_ROLE_CHECK_OPTIONS: RoleCheckOptions = {
  userIdPath: 'body.userId',
  userMustWithinTenant: true,
  isReadAccess: false,
  isIdpUserId: false
}

const logger = createLogger('PermittedUserCheck')

export const permittedUserCheck =
  (options: RoleCheckOptions = DEFAULT_ROLE_CHECK_OPTIONS) =>
  async (req: IAppRequest, res: Response, next: NextFunction) => {
    const opts = { ...DEFAULT_ROLE_CHECK_OPTIONS, ...options }

    try {
      const { userId: ctxUserId } = req.user
      const userGroupService = Container.get(UserGroupService)
      const ctxUserGroups = await userGroupService.getUserGroupsMetadata(ctxUserId)
      const url = `${req.baseUrl}${req.url}`

      if (ctxUserGroups.alp_role_user_admin) {
        // Bypass for ALP_USER_ADMIN
        logger.debug(`ctxUser is ${ROLES.ALP_USER_ADMIN}}`)
        return next()
      }

      // Generic permission check
      // Any specific permission check should be done at the route level
      let userId = _.get(req, opts.userIdPath || 'body.userId') as string
      if (userId) {
        if (opts.isIdpUserId) {
          const userService = Container.get(UserService)
          const user = await userService.getUserByIdpUserId(userId)
          if (!user) {
            logger.error(`IDP user ID ${userId} not found`)
            throw `IDP user ID ${userId} not found`
          }
          userId = user.id
        }

        if (userId === req.user.userId) {
          // Bypass for SELF
          return next()
        }

        logger.info(`Permitted user check for ${req.user.userId} on ${userId}`)

        // UserID and UserGroups are referred to requested user
        const userGroups = await userGroupService.getUserGroupsMetadata(userId)

        if (ctxUserGroups.alp_role_tenant_admin.length > 0) {
          if (opts.userMustWithinTenant) {
            // Tenant admin can query all users within his tenants
            if (!ctxUserGroups.alp_role_tenant_admin.some(t => userGroups.alp_tenant_id.includes(t))) {
              logger.error(`SECURITY INCIDENT: Tenant admin (${ctxUserId}) access ${url} with user ID ${userId}`)
              return res.status(403).send()
            }
          }
        } else {
          // Other roles can only query himself
          if (ctxUserId !== userId) {
            logger.error(`SECURITY INCIDENT: User (${ctxUserId}) access ${url} with user ID ${userId}`)
            return res.status(403).send()
          }
        }
      }

      return next()
    } catch (err) {
      logger.error(`Error when check permitted user: ${err}`)
      return res.status(500).send()
    }
  }
