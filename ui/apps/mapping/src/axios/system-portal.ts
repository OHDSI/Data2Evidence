import request from "./request";
import { API_PATHS } from "../constants/api";

const SYSTEM_PORTAL_URL = API_PATHS.SYSTEM_PORTAL;

export class SystemPortal {
  public getDatasets() {
    return request({
      url: `${SYSTEM_PORTAL_URL}dataset/list`,
      method: "GET",
    });
  }
}
