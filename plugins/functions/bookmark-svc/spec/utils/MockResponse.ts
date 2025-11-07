export default class MockResponse {
  public statusCode: number
  public sendObject: any
  public jsonObject: any

  constructor() {}
  public status(statusCode: number) {
    this.statusCode = statusCode
    return this
  }

  public send(objToSend) {
    this.sendObject = objToSend
    return this
  }

  public json(jsonObj) {
    this.jsonObject = jsonObj
    return this
  }
}
