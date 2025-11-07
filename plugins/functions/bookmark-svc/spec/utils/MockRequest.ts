import { Constants, SAMPLE_USER_JWT } from '@alp/alp-base-utils'
import { IMRIRequest } from '../../src/types'
export default class MockRequest implements Partial<IMRIRequest> {
  public body: any = {}
  public dbConnections = {
    configConnection: null,
    analyticsConnection: null,
  }

  constructor() {
    this[Constants.SESSION_CLAIMS_PROP] = this.encode(JSON.stringify(SAMPLE_USER_JWT))
  }

  public encode(string: string) {
    return Buffer.from(string).toString('base64')
  }

  public setBody(body) {
    this.body = { ...body }
  }

  public setConnections({ configConnection, analyticsConnection }) {
    this.dbConnections.configConnection = configConnection
    this.dbConnections.analyticsConnection = analyticsConnection
  }
}
