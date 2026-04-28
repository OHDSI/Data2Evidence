export class UserGroup {
  public id: string
  public userId: string
  public b2cGroupId: string

  constructor({ id, userId, b2cGroupId }: UserGroup) {
    this.id = id
    this.userId = userId
    this.b2cGroupId = b2cGroupId
  }
}
