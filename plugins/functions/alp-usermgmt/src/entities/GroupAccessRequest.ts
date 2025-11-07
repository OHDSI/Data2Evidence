export class GroupAccessRequest {
  public id: string
  public userId: string
  public groupId: string

  constructor({ id, userId, groupId }: GroupAccessRequest) {
    this.id = id
    this.userId = userId
    this.groupId = groupId
  }
}
