import { ConfigFacade } from "../../src/cfg-utils/ConfigFacade";
import { MockConnection } from "../testutils/testenv/MockConnection";
const conn = new MockConnection();
const configFacade = new ConfigFacade(conn);
const config = configFacade.getFfhConfig();

describe("Testing ConfigFacade,", () => {
  it('request.action="getList" should call FfhConfig.getList()', () => {
    spyOn(configFacade, "invokeService").and.callThrough();
    spyOn(config, "getList");
    const request = { action: "getList" };
    configFacade.invokeService(request, (err, data) => {
      expect(config.getList).toHaveBeenCalled();
    });
  });
  it('request.action="!@#$" should throw an error for invalid action string', () => {
    spyOn(configFacade, "invokeService").and.callThrough();
    spyOn(config, "getList");
    const request = { action: "!@#$" };

    configFacade.invokeService(request, (err, data) => {
      expect(err.message).toEqual(
        "HC_HPH_CONFIG_ASSIGNMENT_ERROR_ACTION_NOT_SUPPORTED"
      );
    });
  });
});
