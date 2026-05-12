import request from "./request";

const SYSTEM_PORTAL_URL = "system-portal/";

export class SystemPortal {
  public getDatasets() {
    return request({
      url: `${SYSTEM_PORTAL_URL}dataset/list`,
      method: "GET",
    });
  }
}
