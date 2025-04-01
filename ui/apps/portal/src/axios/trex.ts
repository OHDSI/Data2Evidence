import { request } from "./request";
import { TrexPlugin } from "../types";

const TREX_URL = "trex/";

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
}
