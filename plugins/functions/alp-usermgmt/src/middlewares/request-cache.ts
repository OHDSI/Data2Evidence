import { IAppRequest, UserGroupMetadata } from '../types'
import { UserGroupService } from '../services'

export const getUserGroupsCached = (
  req: IAppRequest,
  userGroupService: UserGroupService,
  idpUserId: string
): Promise<UserGroupMetadata> => {
  if (!req.userGroupsCache) {
    req.userGroupsCache = new Map()
  }
  const existing = req.userGroupsCache.get(idpUserId)
  if (existing) return existing
  const promise = userGroupService.getUserGroupsMetadataByIdpUserId(idpUserId)
  req.userGroupsCache.set(idpUserId, promise)
  return promise
}
