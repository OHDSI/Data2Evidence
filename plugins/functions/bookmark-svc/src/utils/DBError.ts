export class DBError extends Error {
  constructor(public logId: string, public message: string) {
    super(message)
    this.name = 'MRIDBError'
  }
}
