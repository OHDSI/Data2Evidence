import { FfhConfig } from "./config";
import { Connection as connLib } from "@alp/alp-base-utils";
import ConnectionInterface = connLib.ConnectionInterface;
import CallBackInterface = connLib.CallBackInterface;

export class ConfigFacade {
  private connection: ConnectionInterface;
  private config: FfhConfig;

  constructor(connection: ConnectionInterface, testMode: boolean = false) {
    this.connection = connection;
    this.config = new FfhConfig(connection, testMode);
  }

  public getFfhConfig() {
    return this.config;
  }

  public invokeService(request: any, callback: CallBackInterface) {
    switch (request.action) {
      case "getList":
        this.config.getList((err, result) => {
          if (err) {
            callback(err, null);
          } else {
            callback(null, result);
          }
        });
        break;
      default:
        const err = new Error(
          "HC_HPH_CONFIG_ASSIGNMENT_ERROR_ACTION_NOT_SUPPORTED"
        );
        callback(err, null);
    }
  }
}
