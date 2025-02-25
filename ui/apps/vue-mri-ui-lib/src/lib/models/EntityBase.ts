import Guid from '../../utils/Guid'

export default class EntityBase {
  public parentId: string
  public id: string
  constructor() {
    this.parentId = ''
    this.id = Guid()
  }
}
