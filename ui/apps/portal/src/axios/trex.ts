import { request } from "./request";
import { TrexPlugin } from "../types";
import { LogResponseType } from "../constant";
import { API_PATHS } from "../constants/api";

const TREX_URL = API_PATHS.TREX;

export class Trex {
  public getPlugins() {
    return request<TrexPlugin[]>({
      baseURL: TREX_URL,
      url: "plugins",
      method: "GET",
    });
  }

  public installPlugin(name: string) {
    const encodedName = encodeURIComponent(name);
    return request<TrexPlugin>({
      baseURL: TREX_URL,
      url: `plugins/${encodedName}`,
      method: "POST",
    });
  }

  public updatePlugin(name: string) {
    const encodedName = encodeURIComponent(name);
    return request<TrexPlugin>({
      baseURL: TREX_URL,
      url: `plugins/${encodedName}`,
      method: "PUT",
    });
  }

  public uninstallPlugin(name: string) {
    const encodedName = encodeURIComponent(name);
    return request<{ message: string }>({
      baseURL: TREX_URL,
      url: `plugins/${encodedName}`,
      method: "DELETE",
    });
  }

  public logResponse(logResponse: LogResponseType) {
    return request({
      baseURL: TREX_URL,
      url: "log",
      method: "POST",
      data: {
        response: logResponse,
      },
    });
  }
}
