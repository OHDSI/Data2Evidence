"use strict";

import { DbMeta } from "../../../src/qe";
import { SettingsFacade } from "../../../src/qe/settings/SettingsFacade";
import { User } from "@alp/alp-base-utils";
import { createConnection } from "../../testutils/connection";

let facade, settings, dbMeta, fakeConnection
const actionKey = "action";

describe("Testing SettingsFacade,", () => {
  beforeAll(async () => {
    facade = new SettingsFacade(new User("TEST_USER"));
    settings = facade.getSettings();
    fakeConnection = await createConnection("duckdb");
    dbMeta = new DbMeta(fakeConnection)
  })
  afterAll(function () {
    fakeConnection.close();
  });
  it('request.action="getDefaultSettings" should call Settings.getDefaultGlobalSettings()', () => {
    spyOn(facade, "invokeAdminServices").and.callThrough();
    spyOn(settings, "getDefaultAdvancedSettings");
    let request = {};
    request[actionKey] = "getDefaultSettings";
    facade.invokeAdminServices(request, (err, data) => {
      expect(settings.getDefaultAdvancedSettings).toHaveBeenCalled();
    });
  });
  it('request.action="getColumns" should call DbMeta.getColumns()', () => {
    spyOn(facade, "invokeAdminServices").and.callThrough();
    spyOn(dbMeta, "getColumns");
    let request = {};
    request[actionKey] = "getColumns";
    facade.invokeAdminServices(request, (err, data) => {
      expect(dbMeta.getColumns).toHaveBeenCalled();
    });
  });
});
