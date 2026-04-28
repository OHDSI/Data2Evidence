import { NextFunction, Response } from 'express'
import { Container } from 'typedi'
import { UserGroupService } from '../services'
import { AlpTenantUserRoleMapType, IAppRequest } from '../types'
import { createLogger } from '../Logger'
import { ROLES } from '../const'
import  * as _  from 'lodash-es'

interface TenantCheckOptions {
  tenantIdPath: string
}

const DEFAULT_TENANT_CHECK_OPTIONS: TenantCheckOptions = {
  tenantIdPath: 'params.tenantId'
}

const logger = createLogger('PermittedTenantCheck')

export const permittedTenantCheck =
  (roles: (keyof AlpTenantUserRoleMapType)[], options: TenantCheckOptions = DEFAULT_TENANT_CHECK_OPTIONS) =>
  async (req: IAppRequest, res: Response, next: NextFunction) => {
    const opts = { ...DEFAULT_TENANT_CHECK_OPTIONS, ...options }
    const tenantId = _.get(req, opts.tenantIdPath || 'params.tenantId')

    try {
      const { userId: ctxUserId } = req.user
      const userGroupService = Container.get(UserGroupService)
      const ctxUserGroups = await userGroupService.getUserGroupsMetadata(ctxUserId)

      if (ctxUserGroups.alp_role_user_admin) {
        // Bypass for ALP_USER_ADMIN
        logger.debug(`ctxUser is ${ROLES.ALP_USER_ADMIN}}`)
        return next()
      }

      let allTenantIds: string[] = []

      for (const role of roles) {
        if (Array.isArray(ctxUserGroups.alpRoleMap[role])) {
          allTenantIds = allTenantIds.concat(ctxUserGroups.alpRoleMap[role] as string[])
        }
      }

      const authorizedTenant = allTenantIds.includes(tenantId)
      if (!authorizedTenant) {
        logger.warn(`SECURITY INCIDENT: User (${ctxUserId}) does not belong to tenant (${tenantId})`)
        return res.status(403).send('You do not have enough privileges to manage this tenant')
      }

      return next()
    } catch (err) {
      logger.error(`Error when check permitted tenant: ${err}`)
      return res.status(500).send()
    }
  }
