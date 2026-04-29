/**
 * Test suite for the plugin endpoint
 */
import { PluginEndpoint } from "../../../src/mri/endpoint/PluginEndpoint";
import {
  createPathInObject as createPath,
  Constants,
  EnvVarUtils,
} from "@alp/alp-base-utils";
// import * as bookmarkService from "../../../src/mri/endpoint/bookmarkservice";
import { Settings } from "../../../src/qe/settings/Settings";
import {
  DEFAULT_TIMEOUT_INTERVAL,
  aggquery_setup,
} from "../../testutils/aggquery_common";
import { insertConfig, deleteConfig } from "../../testutils/config_utils";
import { IMRIRequest, PluginEndpointResultType } from "../../../src/types";
import demo_cdw_config from "../../data/cdw/demo_config";
import * as unzip from "unzipper";
import MockRequest from "../../utils/MockRequest";
import MockResponse from "../../utils/MockResponse";
import * as patientController from "../../../src/api/controllers/patient";
import { mirBackendConfig as mriConfig } from "../../data/pa/mriBackendConfig";
import { BackendConfigWithCDMConfigMetaDataType } from "../../../src/types";
Constants.getInstance().setEnvVar(
  "bookmarks_table",
  `pa.db::MRIEntities.Bookmarks`
);

let configWithCdmConfigMetaData: BackendConfigWithCDMConfigMetaDataType = {
  backendConfig: mriConfig.config,
  cdmConfigMetaData: {
    id: mriConfig.meta.dependentConfig.configId,
    version: mriConfig.meta.dependentConfig.configVersion,
  },
};
const mockReq = {
  headers: {
    authorization: "Bearer dummy jwt",
    "x-alp-usersessionclaims": "test",
    "x-source-origin": "test",
  },
} as unknown as IMRIRequest;
describe("--- TESTS SUITE FOR PLUGIN ENDPOINT ---", () => {
  let testEnvironment;
  let connection;
  let patientCreator;
  let settingsObj;
  let cohortDef1;
  let cohortDef2;
  let cohortDefinitionWithSelected;
  let columns;

  let patient1 = {};
  createPath(patient1, "patient.attributes.gender", "M");
  createPath(patient1, "patient.attributes.firstname", "fn1");
  createPath(patient1, "patient.attributes.lastname", "ln1");
  createPath(patient1, "patient.attributes.dob", "10.06.1957");
  createPath(
    patient1,
    "patient.conditions.acme.interactions.priDiag.1._start",
    "26.08.2015"
  );
  createPath(
    patient1,
    "patient.conditions.acme.interactions.priDiag.1.attributes.icd_10",
    "C50"
  );

  let patient2 = {};
  createPath(patient2, "patient.attributes.gender", "M");
  createPath(patient2, "patient.attributes.firstname", "fn2");
  createPath(patient2, "patient.attributes.lastname", "ln2");
  createPath(patient2, "patient.attributes.dob", "19.06.1960");
  createPath(
    patient2,
    "patient.conditions.acme.interactions.priDiag.1._start",
    "26.08.2009"
  );
  createPath(
    patient2,
    "patient.conditions.acme.interactions.priDiag.1.attributes.icd_10",
    "C50"
  );

  let patient3 = {};
  createPath(patient3, "patient.attributes.gender", "W");
  createPath(patient3, "patient.attributes.firstname", "fn3");
  createPath(patient3, "patient.attributes.lastname", "ln3");
  createPath(patient3, "patient.attributes.dob", "19.06.1960");
  createPath(
    patient3,
    "patient.conditions.acme.interactions.priDiag.1._start",
    "26.08.2009"
  );
  createPath(
    patient3,
    "patient.conditions.acme.interactions.priDiag.1.attributes.icd_10",
    "C30"
  );

  cohortDef1 = require("../../data/pa/plugin/cohortDef1.json");
  cohortDef2 = require("../../data/pa/plugin/cohortDef2.json");

  cohortDefinitionWithSelected = JSON.parse(
    JSON.stringify(cohortDef2.cohortDefinition)
  );
  columns = [
    {
      configPath: "patient.attributes.lastName",
      seq: 0,
      order: "D",
    },
    {
      configPath: "patient.attributes.firstName",
      seq: 1,
      order: "",
    },
  ];

  cohortDefinitionWithSelected = {
    ...cohortDefinitionWithSelected,
    columns,
  };

  let patients: any[] = [patient1, patient2, patient3];
  let cohortDefinitions = [cohortDef1, cohortDef2];
  let tasks = [];

  beforeAll((done) => {
    aggquery_setup((_connection, _testEnvironment, _patientCreator) => {
      connection = _connection;
      testEnvironment = _testEnvironment;
      patientCreator = _patientCreator;
      settingsObj = new Settings();
      cohortDef1 = require("../../data/pa/plugin/cohortDef1.json");
      cohortDef2 = require("../../data/pa/plugin/cohortDef2.json");

      cohortDefinitionWithSelected = JSON.parse(
        JSON.stringify(cohortDef2.cohortDefinition)
      );
      columns = [
        {
          configPath: "patient.attributes.lastName",
          seq: 0,
          order: "D",
        },
        {
          configPath: "patient.attributes.firstName",
          seq: 1,
          order: "",
        },
      ];

      cohortDefinitionWithSelected = {
        ...cohortDefinitionWithSelected,
        columns,
      };
      done();
    });
  });
  describe("processRequest() ", () => {
    beforeAll((done) => {
      testEnvironment.clearSchema((err, results) => {
        if (err) {
          console.error("Error in clearing schema tables!");
        }
        patients.forEach((patient) => {
          tasks.push(
            new Promise((resolve, reject) => {
              patientCreator.addPatient(patient, null, (err, patientId) => {
                patient.patientId = patientId;
                if (err) {
                  return reject(err);
                }
                resolve(patientId);
              });
            })
          );
        });
        // TODO: since the bookmark related code is moved to another svc, discuss the necessity of this method
        // cohortDefinitions.forEach((cohortDef) => {
        //     tasks.push(new Promise((resolve, reject) => {
        //         let req = {
        //             body: cohortDef,
        //         };
        //         req.body.cmd = "insert";
        //         if (!req.body.bookmarkname) {
        //             req.body.bookmarkname = `cohort${(new Date()).getTime()}`;
        //         }
        //         bookmarkService.queryBookmarks(req.body, settingsObj.getUser(), EnvVarUtils.getBookmarksTable()
        //             , connection, connection, (err, data) => {
        //             if (err) {
        //                 reject(err);
        //             } else {
        //                 resolve(data);
        //             }
        //         });
        //     }));
        // });

        Promise.all(tasks)
          .then(() => {
            done();
          })
          .catch((err) => {
            // tslint:disable-next-line:no-console
            console.log(err);
          });
      });
    });

    afterAll((done) => {
      testEnvironment.clearSchema((err, results) => {
        if (err) {
          console.error("Error in clearing schema tables!");
        }
        connection.close();
        done();
      });
    });

    it("Returns result matching cohort 1", async () => {
      const pluginEndpoint = new PluginEndpoint(connection, settingsObj);
      pluginEndpoint.setRequest(mockReq);

      const result = <PluginEndpointResultType>(
        await pluginEndpoint.retrieveData({
          cohortDefinition: JSON.parse(
            JSON.stringify({
              ...cohortDef1.cohortDefinition,
              columns: [
                {
                  configPath: "patient.attributes.firstName",
                  order: "",
                  seq: 0,
                },
              ],
            })
          ),
          datasetId: "datasetId_1",
          language: "en",
          dataFormat: "json",
          auditLogChannelName: undefined,
        })
      );
      expect(result.totalPatientCount).toEqual(2);
      expect(
        result.data[0].data.find(
          (p) => p["patient.attributes.firstName"] === "ln1"
        )
      ).toBeDefined();
      expect(
        result.data[0].data.find(
          (p) => p["patient.attributes.firstName"] === "ln2"
        )
      ).toBeDefined();
    });
    it("Returns result matching cohort 2", async () => {
      const pluginEndpoint = new PluginEndpoint(connection, settingsObj);
      pluginEndpoint.setRequest(mockReq);

      const result = <PluginEndpointResultType>(
        await pluginEndpoint.retrieveData({
          cohortDefinition: JSON.parse(
            JSON.stringify({
              ...cohortDef2.cohortDefinition,
              columns: [
                {
                  configPath: "patient.attributes.firstName",
                  order: "",
                  seq: 0,
                },
              ],
            })
          ),
          datasetId: "datasetId_1",
          language: "en",
          dataFormat: "json",
          auditLogChannelName: undefined,
        })
      );
      expect(result).not.toBeNull();
      expect(result.data.length).toEqual(1);
    });
    it("Result should only return the selected columns if columns is supplied", async () => {
      const pluginEndpoint = new PluginEndpoint(connection, settingsObj);
      pluginEndpoint.setRequest(mockReq);
      let result = <PluginEndpointResultType>await pluginEndpoint.retrieveData({
        cohortDefinition: JSON.parse(
          JSON.stringify(cohortDefinitionWithSelected)
        ),
        datasetId: "datasetId_1",
        language: "en",
        dataFormat: "json",
        auditLogChannelName: undefined,
      });
      let resultKeys = Object.keys(result.data[0].data[0]);
      expect(resultKeys.indexOf("patient.attributes.pid")).toBeGreaterThan(-1);
      expect(
        resultKeys.indexOf(cohortDefinitionWithSelected.columns[0].configPath)
      ).toBeGreaterThan(-1);
      expect(
        resultKeys.indexOf(cohortDefinitionWithSelected.columns[1].configPath)
      ).toBeGreaterThan(-1);
    });
    it("Endpoint for zip data creation should include extra attributes to be used in zip creation on client", async () => {
      const pluginEndpoint = new PluginEndpoint(connection, settingsObj);
      pluginEndpoint.setRequest(mockReq);

      const result = <PluginEndpointResultType>(
        await pluginEndpoint.retrieveData({
          cohortDefinition: JSON.parse(
            JSON.stringify({
              ...cohortDef1.cohortDefinition,
              columns: [
                {
                  configPath: "patient.attributes.firstName",
                  order: "",
                  seq: 0,
                },
              ],
            })
          ),
          datasetId: "datasetId_1",
          language: "en",
          dataFormat: "csv",
          auditLogChannelName: undefined,
        })
      );
      expect(result.selectedAttributes).toBeDefined();
      expect(result.noValue).toBeDefined();
    });

    // describe("Single patient endpoint ", () => {
    //   const demoCDMConfigId = "PluginCDM";
    //   const demoCDMConfigVersion = "1";
    //   const interactionTypes = [
    //     "patient.interactions.vStatus",
    //     "patient.conditions.acme.interactions.priDiag",
    //     "patient.conditions.acme.interactions.tnm",
    //     "patient.interactions.Weight_Measurement",
    //     "patient.interactions.ga_sample",
    //     "patient.conditions.acme.interactions.biobank",
    //     "patient.conditions.acme.interactions.radio",
    //     "patient.interactions.Medication_Administered",
    //     "patient.conditions.acme.interactions.surgery",
    //     "patient.conditions.acme.interactions.chemo",
    //   ];
    //   beforeAll(() => {
    //     return insertConfig({
    //       Id: demoCDMConfigId,
    //       Version: demoCDMConfigVersion,
    //       Status: "A",
    //       Name: "DemoPluginCDM",
    //       Type: "HC/HPH/CDW",
    //       Data: JSON.parse(JSON.stringify(demo_cdw_config)),
    //     });
    //   });

    //   afterAll(() => {
    //     deleteConfig({ Id: demoCDMConfigId });
    //   });
    // });
  });
});
