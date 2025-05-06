import { EnvVarUtils } from "@alp/alp-base-utils";
import { MriConfigConnection } from "@alp/alp-config-utils";
import { StudyMriConfigMetaDataType } from "../types";
import * as testConfigs from "./test-data/test_configs";
import { env } from "../env";

const mriConfigConnection = new MriConfigConnection(
    env.SERVICE_ROUTES?.paConfig
);
const envVarUtils = new EnvVarUtils(Deno.env.toObject());

export async function callStudyMRIConfig(
    opts
): Promise<StudyMriConfigMetaDataType> {
    if (envVarUtils.isTestEnv() || envVarUtils.isHttpTestRun()) {
        // this flow is only for integation test
        return getTestConfig(opts.configId);
    } else {
        const configObj: StudyMriConfigMetaDataType =
            await mriConfigConnection.getStudyConfig(opts, false);
        return configObj;
    }
}

function getTestConfig(configId: string): any {
    let meta = {
        configId,
        configVersion: "",
        configStatus: "",
        configName: "",
        dependentConfig: {
            configId: "",
            configVersion: "",
        },
        creator: "",
        created: "",
        modifier: "",
        modified: "",
    };
    let newMockConfig;
    let newPHMap;
    switch (configId) {
        case "mock_config":
            newMockConfig = JSON.parse(JSON.stringify(testConfigs.mock_config));
            newPHMap = JSON.parse(JSON.stringify(testConfigs.pholderTableMap));
            newMockConfig.advancedSettings.tableMapping = newPHMap;
            return {
                config: newMockConfig,
                meta,
                schemaName: "",
            };
        case "dw_views_config":
            newMockConfig = JSON.parse(
                JSON.stringify(testConfigs.dw_views_config)
            );
            newMockConfig[`advancedSettings`] = JSON.parse(
                JSON.stringify(testConfigs.mock_config.advancedSettings)
            );
            return {
                config: newMockConfig,
                meta,
                schemaName: "",
            };
        case "dw_views_config_min_cohort_size_10":
            newMockConfig = JSON.parse(
                JSON.stringify(testConfigs.dw_views_config)
            );
            newMockConfig.chartOptions.minCohortSize = 10;
            return {
                config: newMockConfig,
                meta,
                schemaName: "",
            };
        case "configWithCDMConfigMetaData":
            meta.dependentConfig.configId = "cdmConfigId";
            meta.dependentConfig.configVersion = "1";
            newMockConfig = JSON.parse(JSON.stringify(testConfigs.mock_config));
            newPHMap = JSON.parse(JSON.stringify(testConfigs.pholderTableMap));
            newMockConfig.advancedSettings.tableMapping = newPHMap;
            return {
                config: newMockConfig,
                meta,
                schemaName: "",
            };
        case "mock_config_invalid_ph":
            newMockConfig = JSON.parse(JSON.stringify(testConfigs.mock_config));
            newPHMap = JSON.parse(JSON.stringify(testConfigs.pholderTableMap));
            newPHMap["@INTERACTION.PATIENT_ID"] = `"FAKE_PATIENT_ID"`;
            newMockConfig.advancedSettings.tableMapping = newPHMap;
            newMockConfig.patient.conditions.acme.interactions.priDiag.attributes.icd.expression =
                "SUBSTR(@CODE.FAKE_VALUE,0,3)";
            return {
                config: newMockConfig,
                meta,
                schemaName: "",
            };
        case "mock_config_invalid_ph_2":
            newMockConfig = JSON.parse(JSON.stringify(testConfigs.mock_config));
            newPHMap = JSON.parse(JSON.stringify(testConfigs.pholderTableMap));
            newPHMap["@PATIENT.PATIENT_ID"] = "IM_A_FAKE_COLUMN";
            newMockConfig.advancedSettings.tableMapping = newPHMap;
            return {
                config: newMockConfig,
                meta,
                schemaName: "",
            };
        case "mock_config_min_cohort_size_2":
            newMockConfig = JSON.parse(JSON.stringify(testConfigs.mock_config));
            newMockConfig.chartOptions.minCohortSize = 2;
            newPHMap = JSON.parse(JSON.stringify(testConfigs.pholderTableMap));
            newMockConfig.advancedSettings.tableMapping = newPHMap;
            return {
                config: newMockConfig,
                meta,
                schemaName: "",
            };
        case "mock_config_min_cohort_size_10":
            newMockConfig = JSON.parse(JSON.stringify(testConfigs.mock_config));
            newMockConfig.chartOptions.minCohortSize = 10;
            newPHMap = JSON.parse(JSON.stringify(testConfigs.pholderTableMap));
            newMockConfig.advancedSettings.tableMapping = newPHMap;
            return {
                config: newMockConfig,
                meta,
                schemaName: "",
            };
        case "mock_config_fillMissingValuesEnabled_true":
            newMockConfig = JSON.parse(JSON.stringify(testConfigs.mock_config));
            newMockConfig.chartOptions.stacked.fillMissingValuesEnabled = true;
            newPHMap = JSON.parse(JSON.stringify(testConfigs.pholderTableMap));
            newMockConfig.advancedSettings.tableMapping = newPHMap;
            return {
                config: newMockConfig,
                meta,
                schemaName: "",
            };
        case "mock_config_fillMissingValuesEnabled_false":
            newMockConfig = JSON.parse(JSON.stringify(testConfigs.mock_config));
            newMockConfig.chartOptions.stacked.fillMissingValuesEnabled = false;
            newPHMap = JSON.parse(JSON.stringify(testConfigs.pholderTableMap));
            newMockConfig.advancedSettings.tableMapping = newPHMap;
            return {
                config: newMockConfig,
                meta,
                schemaName: "",
            };
        case "ABCD1234B_minCohortSize_2":
            newMockConfig = JSON.parse(
                JSON.stringify(testConfigs.httptest_acme_mri_cdw_config)
            );
            newMockConfig.config.chartOptions.minCohortSize = 2;
            return newMockConfig;
        case "ABCD1234B":
            return testConfigs.httptest_acme_mri_cdw_config;
        case "4321DCBAB":
            return testConfigs.httptest_test_mri_cdw_config;
        case "GROUP_INTB":
            return testConfigs.httptest_groupedinteraction_mri_cdw_config;
        default:
            return {
                config: {},
                meta,
                schemaName: "",
            };
    }
}
