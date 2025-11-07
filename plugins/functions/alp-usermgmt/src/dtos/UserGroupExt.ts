import { UserGroup } from '../entities'

export class UserGroupExt extends UserGroup {
  public username: string
  public role: string
  public tenantId: string | null
  public studyId: string | null
  public system: string | null
  public active: Boolean

  constructor({ id, userId, username, b2cGroupId, role, tenantId, studyId, system, active }: UserGroupExt) {
    super({ id, userId, b2cGroupId })

    this.username = username
    this.role = role
    this.tenantId = tenantId
    this.studyId = studyId
    this.system = system
    this.active = active
  }
}
