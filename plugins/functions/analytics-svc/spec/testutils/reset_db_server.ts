// tslint:disable:no-console
import * as testedLib from "../../src/qe/settings/Settings";
import { createConnection } from "./connection";
//import { QUERY } from "../../src/qe/settings/Defaults";

let Settings = testedLib.Settings;
let settingsObj: testedLib.Settings;
let connectionObj;

function insertGlobalSetting(cb) {

    let query = `INSERT INTO "ConfigDbModels_Config"
    ("Id", "Version", "Status", "Name", "Type", "Creator", "Created", "Modifier", "Modified", "Data")
    VALUES (?,?,?,?,?,?,CURRENT_UTCTIMESTAMP,?,CURRENT_UTCTIMESTAMP,?)`;
    let parameters = [
        { value: "GlobalSettings" },
        { value: "A" },
        { value: "A" },
        { value: "GLOBAL" },
        { value: "HC/HPH/GLOBAL" },
        { value: "" },
        { value: "" },
        { value: JSON.stringify(settingsObj.getDefaultAdvancedSettings()) }];
    connectionObj.executeUpdate(query, parameters, cb);
}

function deleteGlobalSetting(cb) {
    connectionObj.executeUpdate(`delete from  "ConfigDbModels_Config" where "Id" = 'GlobalSettings'`, [],  (err, data) => {
        if (typeof cb === "function") {
            cb(err, data);
        }
    });
}

createConnection().then((connection) => {
    console.log("creating connection");
    connectionObj = connection;
    settingsObj = new Settings();

    deleteGlobalSetting(() => insertGlobalSetting(() => console.log("done")));
});

