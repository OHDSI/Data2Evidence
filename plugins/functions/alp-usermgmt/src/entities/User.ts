export class User {
  public id: string
  public username: string
  public idpUserId: string
  public active: boolean

  constructor({ id, username, idpUserId, active }: User) {
    this.id = id
    this.username = username
    this.idpUserId = idpUserId
    this.active = active
  }
}
