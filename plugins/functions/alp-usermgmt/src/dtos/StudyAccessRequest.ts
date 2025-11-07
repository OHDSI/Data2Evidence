import { GroupAccessRequest } from '../entities'

export class StudyAccessRequest extends GroupAccessRequest {
  public role: string
  public username: string
  public tenantId: string
  public studyId: string
  public requestedOn: string

  constructor({ id, userId, groupId, username, role, tenantId, studyId, requestedOn }: StudyAccessRequest) {
    super({ id, userId, groupId })

    this.username = username
    this.role = role
    this.tenantId = tenantId
    this.studyId = studyId
    this.requestedOn = requestedOn
  }
}
