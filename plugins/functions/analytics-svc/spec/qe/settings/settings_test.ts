import * as testLib from "../../../src/qe/settings/Settings";
//import * as Defaults from "../../../src/qe/settings/Defaults";
import { CDW } from "../../data/cdw/cdw_configs";
CDW.advancedSettings.tableMapping["@INTERACTION"] = "test_tableMapping";
CDW.advancedSettings.guardedTableMapping["@PATIENT"] =
  "test_guardedTableMapping";
CDW.advancedSettings.language = ["lang1, lang2"];
CDW.advancedSettings.settings["testSettings"] = "testSettings"; //tslint:disable-line

xdescribe("Verify Settings functionality", () => {
  let settingsObj = new testLib.Settings();
  let userSpecificSettingsObj = new testLib.Settings();
  userSpecificSettingsObj.initAdvancedSettings(CDW.advancedSettings);
  it("getOtherSettings() - return other settings", (done) => {
    //let otherSettings = { a: "a", b: "b" };
    //settingsObj.otherSettings = otherSettings;
    //expect(settingsObj.getOtherSettings()).toEqual(otherSettings);
    //let defaultSettings = settingsObj.getSettings();
    //settingsObj.otherSettings = null;
    //expect(settingsObj.getOtherSettings()).toEqual(defaultSettings);
    done();
  });
  /*it("getPlaceholder() - return place holders", (done) => {
        let placeHolder = Defaults.placeholder;
        expect(settingsObj.getPlaceholder()).toEqual(placeHolder);
        done();
    });*/
  it("verify the default setting values with standard settings instance", (done) => {
    //expect(settingsObj.getPlaceholderMap()).toEqual(Defaults.defaultPholderTableMap);
    //expect(settingsObj.getGuardedPlaceholderMap()["@PATIENT"]).toEqual(Defaults.defaultGuardedPholderTable);
    //expect(settingsObj.getSupportedLanguages()).toEqual(Defaults.defaultSupportedLanguages);
    //expect(settingsObj.getUserSpecificAdvancedSettings().tableMapping["@INTERACTION"]).not.toEqual("test_tableMapping");
    //expect(settingsObj.getUserSpecificAdvancedSettings().tableMapping["@INTERACTION"]).toEqual("\"legacy.cdw.db.models::DWViews.Interactions\"");
    done();
  });
  it("verify settings initialized with user specific advanced settings", (done) => {
    //expect(userSpecificSettingsObj.getPlaceholderMap()["@INTERACTION"]).toEqual("test_tableMapping");
    //expect(userSpecificSettingsObj.getGuardedPlaceholderMap()["@PATIENT"]).toEqual("test_guardedTableMapping");
    //expect(userSpecificSettingsObj.getSupportedLanguages()).toEqual(["lang1, lang2"]);
    //expect(userSpecificSettingsObj.getUserSpecificAdvancedSettings().tableMapping["@INTERACTION"]).toEqual("test_tableMapping");
    //expect(userSpecificSettingsObj.getUserSpecificAdvancedSettings().tableMapping["@INTERACTION"])
    //    .not.toEqual("\"legacy.cdw.db.models::DWViews.Interactions\"");
    //expect(userSpecificSettingsObj.isUserSpecificAdvancedSettings()).toEqual(true);
    //expect(settingsObj.isUserSpecificAdvancedSettings()).toEqual(false);
    //expect(userSpecificSettingsObj.getOtherSettings().testSettings).toBeUndefined();
    //expect(userSpecificSettingsObj.getSettings()["testSettings"]).toEqual("testSettings");//tslint:disable-line

    //delete CDW.advancedSettings.others;
    //userSpecificSettingsObj.initAdvancedSettings(CDW.advancedSettings);
    //expect(userSpecificSettingsObj.getOtherSettings().testSettings).toEqual("testSettings");
    done();
  });
});
