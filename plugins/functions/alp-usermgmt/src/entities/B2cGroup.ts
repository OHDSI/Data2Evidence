export class B2cGroup {
  public id: string
  public role: string
  public tenantId: string | null
  public studyId: string | null
  public system: string | null

  constructor({ id, role, tenantId, studyId, system }: B2cGroup) {
    this.id = id
    this.role = role
    this.tenantId = tenantId
    this.studyId = studyId
    this.system = system
  }
}
