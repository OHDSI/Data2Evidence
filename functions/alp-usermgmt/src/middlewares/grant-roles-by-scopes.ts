import { IDP_SCOPE_ROLE, CONTAINER_KEY, ROLES } from '../const'
import { NextFunction, Request, Response } from 'express'
import { Container } from 'typedi'
import jwt from 'jsonwebtoken'
import { v4 as uuidv4 } from 'uuid'
import { createLogger } from '../Logger'
import { B2cGroupService, UserGroupService, UserService } from '../services'
import { env } from '../env'
import { LogtoAPI } from '../api'
import { IDataset, ITokenUser } from '../types'
import { UserField } from '../repositories'

const logger = createLogger('GrantRolesByScopes')
const subProp = env.USER_MGMT_IDP_SUBJECT_PROP

export const grantRolesByScopes = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const bearerToken = req.headers.authorization as string
    if (!bearerToken) {
      return next()
    }

    const token = jwt.decode(bearerToken.replace(/bearer /i, '')) as jwt.JwtPayload
    if (!(subProp in token)) {
      return next()
    }

    const userService = Container.get(UserService)

    const { scope, email } = token as { scope: string; email: string }
    const sub = token[subProp]
    let user = await userService.getUserByIdpUserId(sub)
    let userId = user?.id

    let username = email
    if (!user) {
      if (env.IDP_FETCH_USER_INFO_TYPE === 'logto') {
        // Fetch user info as Logto's access_token does not contain username
        const logtoApi = Container.get(LogtoAPI)
        const logtoUser = await logtoApi.getUser(sub)
        if (logtoUser != null) {
          // Use username in Logto context (fallback to email if empty)
          username = logtoUser.username ?? logtoUser.primaryEmail
        }
      }

      user = await userService.getUserByUsername(username)
      userId = user?.id

      if (user == null) {
        if (env.IDP_RELYING_PARTY !== 'azure') {
          logger.error(`User "${sub}" or "${username}" does not exist`)
          return res.status(500).send({ message: `User "${sub}" or "${username}" does not exist` })
        }

        logger.info(`First time login for new user, create user: "${sub}"`)
        const newUser: Partial<UserField> = { id: uuidv4(), username: username, idp_user_id: sub }
        await userService.createUser(newUser)
        userId = newUser.id

        const tokenUser: ITokenUser = {
          userId: newUser.id || '',
          idpUserId: sub
        }
        req.user = tokenUser
        Container.set(CONTAINER_KEY.CURRENT_USER, tokenUser)
      } else if (!user.idpUserId) {
        logger.info(`First time login for existing user, update idp_user_id: "${sub}"`)
        await userService.updateUser({ id: user.id, idp_user_id: sub })

        const tokenUser: ITokenUser = {
          userId: user.id || '',
          idpUserId: sub
        }
        req.user = tokenUser
        Container.set(CONTAINER_KEY.CURRENT_USER, tokenUser)
      }
    }

    if (!userId) {
      return next()
    }

    if (env.IDP_RELYING_PARTY === 'azure') {
      const tenantId = env.APP_TENANT_ID
      if (!tenantId) {
        logger.error(`Tenant not found`)
        return res.status(500).send({ message: `Tenant not found` })
      }

      const scopes = scope?.split(" ") || []
      await grantOrRevokeTenantRole(userId, tenantId, ROLES.TENANT_VIEWER, scopes.includes(IDP_SCOPE_ROLE.TENANT_VIEWER))
      await grantOrRevokeSystemRole(userId, ROLES.ALP_SYSTEM_ADMIN, scopes.includes(IDP_SCOPE_ROLE.SYSTEM_ADMIN))
      await grantOrRevokeSystemRole(userId, ROLES.ALP_USER_ADMIN, scopes.includes(IDP_SCOPE_ROLE.USER_ADMIN))
      await grantOrRevokeSystemRole(userId, ROLES.ALP_DASHBOARD_VIEWER, scopes.includes(IDP_SCOPE_ROLE.DASHBOARD_VIEWER))
      
      const datasets = await getDatasets()
      if (datasets.length > 0) {
        const grantDatasetCodes = scopes
          .filter(x => x.startsWith(IDP_SCOPE_ROLE.DATASET_RESEARCHER_PREFIX))
          .map(x => x.replace(IDP_SCOPE_ROLE.DATASET_RESEARCHER_PREFIX, ''))
          
        await grantOrRevokeResearcherRole(userId, tenantId, ROLES.STUDY_RESEARCHER, datasets, grantDatasetCodes)
      }
    }

    next()
  } catch (err) {
    logger.error(`Error when assigning roles: ${err}`)
    next(err)
  }
}

const grantOrRevokeTenantRole = async (userId: string, tenantId: string, role: string, isGrant: boolean) => {
  const groupService = Container.get(B2cGroupService)

  let group = await groupService.getGroupByTenantRole(tenantId, role)
  if (!group?.id) {
    await groupService.createGroup({ role, tenantId })
    group = await groupService.getGroupByTenantRole(tenantId, role)
  }

  if (isGrant) {
    await addUserToGroup(userId, group!.id)
  } else {
    await removeUserFromGroup(userId, group!.id)
  }
}

const grantOrRevokeSystemRole = async (userId: string, role: string, isGrant: boolean) => {
  const groupService = Container.get(B2cGroupService)

  const system = env.ALP_SYSTEM_NAME!
  const group = await groupService.getGroupBySystemRole(system, role)

  if (isGrant) {
    await addUserToGroup(userId, group!.id)
  } else {
    await removeUserFromGroup(userId, group!.id)
  }
}

const grantOrRevokeResearcherRole = async (userId: string, tenantId: string, role: string, datasets: IDataset[], grantDatasetCodes: string[]) => {
  const groupService = Container.get(B2cGroupService)

  for (const dataset of datasets) {
    let group = await groupService.getGroupByStudyRole(dataset.id, role)
    if (!group?.id) {
      await groupService.createGroup({ role, tenantId, studyId: dataset.id })
      group = await groupService.getGroupByStudyRole(dataset.id, role)
    }

    if (!group?.id) {
      continue;
    }

    const isGrant = grantDatasetCodes.includes(dataset.token_dataset_code)
    if (isGrant) {
      await addUserToGroup(userId, group!.id)
    } else {
      await removeUserFromGroup(userId, group!.id)
    }
  }
}

const addUserToGroup = async (userId: string, groupId: string) => {
  const userGroupService = Container.get(UserGroupService)

  const member = await userGroupService.getUserGroup(userId, groupId)
  if (!member?.id) {
    logger.info(`Grant ${userId} to ${groupId}`)
    await userGroupService.addUserToGroup(userId, groupId)
  }
}

const removeUserFromGroup = async (userId: string, groupId: string) => {
  const userGroupService = Container.get(UserGroupService)
  
  const member = await userGroupService.getUserGroup(userId, groupId)
  if (member?.id) {
    logger.info(`Revoke ${userId} from ${groupId}`)
    await userGroupService.withdrawUserFromGroup(userId, groupId)
  }
}

const getDatasets = async () => {
  const db = Container.get(CONTAINER_KEY.DB_CONNECTION);

  try {
    const datasets: { rows: IDataset[] } = await db.raw('SELECT * FROM portal.dataset')
    return datasets?.rows || []
  } catch (error) {
    console.error('An error when getting datasets', error)
    return []
  }
}