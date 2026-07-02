import { Constants, SAMPLE_USER_JWT } from "@alp/alp-base-utils";
import { IMRIRequest } from "../../src/types";

export default class MockRequest implements Partial<IMRIRequest> {
  public swagger = {
    params: {},
  };
  public body: any = {};
  public dbConnections = {
    analyticsConnection: null,
    analyticsWriteConnection: null,
  };

  constructor() {
    this[Constants.SESSION_CLAIMS_PROP] = JSON.stringify(SAMPLE_USER_JWT);
  }

  public setSwaggerParams(params) {
    this.swagger.params = { ...params };
  }

  public setBody(body) {
    this.body = { ...body };
  }

  public setConnections({ analyticsConnection, analyticsWriteConnection }) {
    this.dbConnections.analyticsWriteConnection = analyticsWriteConnection;
    this.dbConnections.analyticsConnection = analyticsConnection;
  }
}
