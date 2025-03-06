import { utils} from "@alp/alp-base-utils";
import { configTools } from "@alp/alp-config-utils";
import { env } from "../configs";
import { configDefaultValues } from "../../cfg/pa/configDefaultValues.ts"
import { cwd } from 'node:process';
import { fileURLToPath } from 'node:url';
import { dirname, normalize, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

export class Formatter {

    constructor(private fs: any) {
    }

    // returned to enduser
    public formatFrontendConfig({ mriConfig, dmConfig, lang = "en" }: { mriConfig: any, dmConfig: any, lang: string }) {
        mriConfig = this._loadPAConfigDefault(mriConfig);
        const config: any = {};
        if (!mriConfig.filtercards) {
            mriConfig.filtercards = [];
        }
        const sharingFlag = env.__MRI_FEDERATED_QUERY === "ENABLED";
        const systemName = env.__MRI_FEDERATED_QUERY_SYSTEM_NAME || "MRI";
        const sacFlag = env.__MRI_SAC_EXTENSION === "ENABLED";
        const initialColumns = [];

        mriConfig.filtercards.forEach((filtercard) => {
            let name;
            let filtercardObj;
            let path;
            initialColumns.push(...this._getInitialPatientlistColumns(filtercard));
            if (filtercard.source !== "patient") {
                const cdwConfigObj = utils.getObjectByPath(dmConfig, filtercard.source);
                name = cdwConfigObj.name; // TODO language / translate
                path = filtercard.source;

                filtercardObj = {
                    name,
                    order: filtercard.order,
                    filtercard: {
                        initial: filtercard.initial,
                        visible: filtercard.visible,
                    },
                    attributes: {},
                    parentInteraction: {
                        possibleParent: [],
                        parentLabel: "",
                    },
                    patientlist: {
                        initial: filtercard.initialPatientlistColumn,
                    },
                };
                if (cdwConfigObj.annotations) {
                    filtercardObj.annotations = cdwConfigObj.annotations;
                }
                if (cdwConfigObj.parentInteraction) {
                    filtercardObj.parentInteraction.possibleParent = cdwConfigObj.parentInteraction;
                }
                if (cdwConfigObj.parentInteractionLabel) {
                    filtercardObj.parentInteraction.parentLabel = cdwConfigObj.parentInteractionLabel;
                }
                filtercardObj.attributes = this._getAttributes(dmConfig, filtercard.attributes);
                utils.createPathInObject2(config, path, filtercardObj);
            } else {
                name = "";
                path = "patient.attributes";
                const attributes = this._getAttributes(dmConfig, filtercard.attributes);
                utils.createPathInObject2(config, path, attributes);
            }
        });
        config.chartOptions = {
            stacked: {
                visible: mriConfig.chartOptions.stacked.visible,
                downloadEnabled: mriConfig.chartOptions.stacked.downloadEnabled,
                pdfDownloadEnabled: mriConfig.chartOptions.stacked.pdfDownloadEnabled,
                imageDownloadEnabled: mriConfig.chartOptions.stacked.imageDownloadEnabled,
                collectionEnabled: mriConfig.chartOptions.stacked.collectionEnabled,
                beginVisible: mriConfig.chartOptions.stacked.beginVisible,
                fillMissingValuesEnabled: mriConfig.chartOptions.stacked.fillMissingValuesEnabled,
            },
            boxplot: {
                visible: mriConfig.chartOptions.boxplot.visible,
                downloadEnabled: mriConfig.chartOptions.boxplot.downloadEnabled,
                pdfDownloadEnabled: mriConfig.chartOptions.boxplot.pdfDownloadEnabled,
                imageDownloadEnabled: mriConfig.chartOptions.boxplot.imageDownloadEnabled,
                collectionEnabled: mriConfig.chartOptions.boxplot.collectionEnabled,
                beginVisible: mriConfig.chartOptions.boxplot.beginVisible,
                fillMissingValuesEnabled: mriConfig.chartOptions.boxplot.fillMissingValuesEnabled,
            },
            km: {
                visible: mriConfig.chartOptions.km.visible,
                downloadEnabled: mriConfig.chartOptions.km.downloadEnabled,
                pdfDownloadEnabled: mriConfig.chartOptions.km.pdfDownloadEnabled,
                imageDownloadEnabled: mriConfig.chartOptions.km.imageDownloadEnabled,
                collectionEnabled: mriConfig.chartOptions.km.collectionEnabled,
                beginVisible: mriConfig.chartOptions.km.beginVisible,
                selectedEndInteractions: mriConfig.chartOptions.km.selectedEndInteractions,
            },
            list: {
                visible: mriConfig.chartOptions.list.visible,
                downloadEnabled: mriConfig.chartOptions.list.downloadEnabled,
                zipDownloadEnabled: mriConfig.chartOptions.list.zipDownloadEnabled,
                collectionEnabled: mriConfig.chartOptions.list.collectionEnabled,
                beginVisible: mriConfig.chartOptions.list.beginVisible,
                pageSize: mriConfig.chartOptions.list.pageSize,
                initialColumns,
            },
            vb: {
                visible: mriConfig.chartOptions.vb.visible,
                referenceName: mriConfig.chartOptions.vb.referenceName,
            },
            custom: {
                visible: mriConfig.chartOptions.custom && mriConfig.chartOptions.custom.visible,
                customCharts: mriConfig.chartOptions.custom ? mriConfig.chartOptions.custom.customCharts : [],
            },
            sac: {
                enabled: sacFlag,
                visible: mriConfig.chartOptions.sac && mriConfig.chartOptions.sac.visible && sacFlag,
                sacCharts: mriConfig.chartOptions.sac ? mriConfig.chartOptions.sac.sacCharts : [],
            },
            shared: {
                enabled: sharingFlag,
                systemName,
            },
            initialAttributes: mriConfig.chartOptions.initialAttributes,
            initialChart: mriConfig.chartOptions.initialChart,
        };
        config.pageTitle = mriConfig.pageTitle;
        config.panelOptions = {
          addToCohorts: mriConfig.panelOptions.addToCohorts,
          domainValuesLimit: mriConfig.panelOptions.domainValuesLimit,
          maxFiltercardCount: mriConfig.panelOptions.maxFiltercardCount,
          calcViewAccessPoint: mriConfig.panelOptions.calcViewAccessPoint,
          externalAccessPoints: mriConfig.panelOptions.externalAccessPoints,
          cohortEntryExit: mriConfig.panelOptions.cohortEntryExit,
          atlasCohortDefinition: mriConfig.panelOptions.atlasCohortDefinition,
        };

        return config;
    }

    public formatAdminConfig({ mriConfig, dmConfig, lang }) {
        mriConfig = this._loadPAConfigDefault(mriConfig);

        if (!mriConfig.configInformations) {
            const defaultValues = this._loadDefaultValues();
            mriConfig.configInformations = defaultValues.configInformations;
        }
        let chartFilters = [];
        if (mriConfig.chartOptions.km.filters && mriConfig.chartOptions.km.filters.length > 0) {
            chartFilters = mriConfig.chartOptions.km.filters;
        }
        mriConfig.chartOptions.km.filters = chartFilters;

        const sharingFlag = env.__MRI_FEDERATED_QUERY === "ENABLED";
        const systemName = env.__MRI_FEDERATED_QUERY_SYSTEM_NAME || "MRI";
        const sacFlag = env.__MRI_SAC_EXTENSION === "ENABLED";

        // return the VB feature status
        mriConfig.chartOptions.vb.enabled = false;

        if (mriConfig.chartOptions.sac) {
            mriConfig.chartOptions.sac.enabled = sacFlag;
        } else {
            mriConfig.chartOptions.sac = {
                enabled: sacFlag,
            };
        }

        if (mriConfig.chartOptions.shared) {
            mriConfig.chartOptions.shared.enabled = sharingFlag;
            mriConfig.chartOptions.shared.systemName = systemName;
        } else {
            mriConfig.chartOptions.shared = {
                enabled: sharingFlag,
                systemName,
            };
        }

        mriConfig = this._addAnnotationsToConfig(mriConfig, dmConfig);
        mriConfig = this._addNamesToConfig(mriConfig, dmConfig, lang);
        return this._setPatientListInitialInteractions(mriConfig);
    }

    public formatBackendConfig({ mriConfig, dmConfig, lang }) {
        dmConfig = this._addCatalogAttributes(mriConfig, dmConfig);
        dmConfig = this._addChartOptions(mriConfig, dmConfig);
        return dmConfig;
    }

    public formatList(configList, cdwConfigList) {
        const cdwConfigs = {};
        // let cdwConfigList = [{ configId: "DEFAULT", configName: "DEFAULT", configVersion: "0", configStatus: "A" }];
        // create the list of all available cdwConfigs with their versions
        cdwConfigList.forEach((cdwConfig) => {
            if (!cdwConfigs.hasOwnProperty(cdwConfig.configId)) {
                cdwConfigs[cdwConfig.configId] = {
                    configId: cdwConfig.configId,
                    configName: cdwConfig.configName,
                    versions: {},
                    configs: [],
                };
            }
            cdwConfigs[cdwConfig.configId].versions[cdwConfig.configVersion] = {
                version: cdwConfig.configVersion,
                status: cdwConfig.configStatus,
            };
        });

        // add the PA configs to their respective cdwConfigs
        configList.forEach((config) => {
            /*if (!cdwConfigs.hasOwnProperty(config.dependentConfig.configId)) {
                cdwConfigs[config.dependentConfig.configId].error = "MRI_PA_CFG_ERROR_CDW_DOES_NOT_EXIST";
            }*/
            if (cdwConfigs[config.dependentConfig.configId]) {
              cdwConfigs[config.dependentConfig.configId].configs.push({
                meta: {
                  configId: config.configId,
                  configName: config.configName,
                  configVersion: config.configVersion,
                  creator: config.creator,
                  created: config.created,
                  modifier: config.modifier,
                  modified: config.modified,
                  dependentConfig: {
                    configId: config.dependentConfig.configId,
                    configVersion: config.dependentConfig.configVersion,
                  },
                },
              });
            }
        });

        // convert the object storing the cdwConfigs to an array
        return Object.keys(cdwConfigs).map((key) => {
            return cdwConfigs[key];
        });
    }

    public formatUserList(configs) {
        return configs.map((obj) => {
            delete obj.config;
            return {
                meta: obj,
            };
        });
    }

    public loadFromFileResult(config) {
        let configResult = "";
        if (config.activated) {
            configResult += "Config successfully activated. \n\n";
            configResult += "ConfigDetails:\n";
            configResult += "\tConfig Id: " + config.meta.configId + "\n";
            configResult += "\tConfig Version: " + config.meta.configVersion + "\n";
        } else {
            configResult += "Failed to save the configuration. \n\n";
            config.errors.forEach((error) => {
                configResult += "Error while validating path: " + (error.path ? error.path : "configuration") + "\n";
                configResult += "\t" + utils.formatErrorMessage(error.messageDefault, error.values) + "\n";
            });
        }

        return configResult;
    }

    public trimConfigForSaving(config) {
        const paConfig = JSON.parse(JSON.stringify(config));
        const configWalkFunction = utils.getJsonWalkFunction(paConfig);

        configWalkFunction("filtercards.*.modelName").forEach((modelName) => {
            utils.deleteObjectByPath(paConfig, modelName.path);
        });

        configWalkFunction("filtercards.*.attributes.*.modelName").forEach((modelName) => {
            utils.deleteObjectByPath(paConfig, modelName.path);
        });
        return paConfig;
    }

    /*
        FRONTEND config
    */
    private _getInitialPatientlistColumns(filtercard) {
        const initialColumns: any[] = [];
        if (filtercard.source === "patient" || filtercard.initialPatientlistColumn) {
            const interactionInitialColumns = filtercard.attributes.filter((attribute) => attribute.patientlist.initial);
            if (interactionInitialColumns.length === 0) {
                initialColumns.push(...filtercard.attributes.filter((attribute) => attribute.patientlist.visible));
            } else {
                initialColumns.push(...interactionInitialColumns);
            }
        }
        return initialColumns.map((attribute) => attribute.source);
    }

    private _getAttributes(dmConfig, attributes) {
        const result = {};
        attributes.forEach((attribute) => {
            const splitedAttributePath = attribute.source.split(".");
            const attributeKey = splitedAttributePath[splitedAttributePath.length - 1];
            let cdwConfigAttributeObj;
            try {
                cdwConfigAttributeObj = utils.getObjectByPath(dmConfig, attribute.source);
            } catch (e) {
                cdwConfigAttributeObj = utils.getObjectByPath(dmConfig, "patient.attributes." + attributeKey);
            }
            const attributeObj: any = {
                name: cdwConfigAttributeObj.name, // TODO: translate
                type: cdwConfigAttributeObj.type,
                domainFilter: cdwConfigAttributeObj.domainFilter,
                standardConceptCodeFilter: cdwConfigAttributeObj.standardConceptCodeFilter,
                cohortDefinitionKey: cdwConfigAttributeObj.cohortDefinitionKey,
                conceptIdentifierType: cdwConfigAttributeObj.conceptIdentifierType,
                category: attribute.category,
                measure: attribute.measure,
                aggregated: Boolean(cdwConfigAttributeObj.measureExpression),
                ordered: attribute.ordered,
                cached: attribute.cached,
                defaultBinSize: attribute.defaultBinSize,
                useRefValue: attribute.useRefValue,
                useRefText: attribute.useRefText,
                filtercard: attribute.filtercard,
                patientlist: attribute.patientlist,
            };
            if (cdwConfigAttributeObj.annotations) {
                attributeObj.annotations = cdwConfigAttributeObj.annotations;
            }
            result[attributeKey] = attributeObj;
        });
        return result;
    }

    /*
        ADMIN config
    */

    private _getObjectInCdwConfig(cdwConfig, path) {
        return utils.getObjectByPath(cdwConfig, path);
    }

    private _addNamesToConfig(paConfig, cdwConfig, language) {
        const config = JSON.parse(JSON.stringify(paConfig));
        if (!config.filtercards) {
            return config;
        }
        const configWalkFunction = utils.getJsonWalkFunction(config);
        configWalkFunction("filtercards.*").forEach((filtercard) => {
            // add Name to filtercard
            if (filtercard.obj.source === "patient") {
                try {
                    filtercard.obj.modelName = utils.TextLib.getText2(`${normalize(join(__dirname, "../../i18n/mri-pa-config.properties"))}`,
                    "MRI_PA_SERVICES_FILTERCARD_TITLE_BASIC_DATA", language);
                } catch (err) {
                    console.log("formatter.ts: getText2 Error:");
                    console.log(err);
                    filtercard.obj.modelName = "Basic Data";
                }
            } else if (filtercard.obj.hasOwnProperty("source")) {
                filtercard.obj.modelName = this._getObjectInCdwConfig(cdwConfig, filtercard.obj.source + ".name");
            }
        });
        configWalkFunction("filtercards.*.attributes.*").forEach((attribute) => {
            // add Name to interaction
            if (attribute.obj.hasOwnProperty("source")) {
                attribute.obj.modelName = this._getObjectInCdwConfig(cdwConfig, attribute.obj.source + ".name");
            }
        });
        return config;
    }

    private _setPatientListInitialInteractions(paConfig) {
        const config = JSON.parse(JSON.stringify(paConfig));
        if (!config.filtercards) {
            return config;
        }
        config.filtercards.forEach((filterCard) => {
            // set initial value only if the setting is not yet existing
            if (typeof filterCard.initialPatientlistColumn === "undefined") {
            filterCard.initialPatientlistColumn = filterCard.source === "patient" ||
                    filterCard.attributes.some((attribute) => attribute.patientlist.initial);
            }
        });
        return config;
    }

    private _addAnnotationsToConfig(paConfig, cdwConfig) {
        const config = JSON.parse(JSON.stringify(paConfig));
        if (!config.filtercards) {
            return config;
        }
        const configWalkFunction = utils.getJsonWalkFunction(config);
        configWalkFunction("filtercards.*").concat(configWalkFunction("filtercards.*.attributes.*")).forEach((filtercard) => {
            if (filtercard.obj.hasOwnProperty("source")) {
                if (filtercard.obj.source && filtercard.obj.source !== "patient" && filtercard.obj.attributes) {
                    for (let i = 0; i < filtercard.obj.attributes.length; i++) {
                        try {
                            const aAnnotations = this._getObjectInCdwConfig(cdwConfig, filtercard.obj.attributes[i].source + ".annotations");
                            if (aAnnotations) {
                                filtercard.obj.attributes[i].annotations = aAnnotations;
                            }
                        } catch (exception) {
                            console.log(exception);
                        }
                    }
                }
            }
        });
        return config;
    }

    private _loadPAConfigDefault(paConfig) {
        const defaultValues = this._loadDefaultValues();

        // default values for stacked and boxplot
        if (!paConfig.chartOptions.stacked.hasOwnProperty("fillMissingValuesEnabled")) {
            paConfig.chartOptions.stacked.fillMissingValuesEnabled = defaultValues.chartOptions.stacked.fillMissingValuesEnabled;
        }

        if (!paConfig.chartOptions.boxplot.hasOwnProperty("fillMissingValuesEnabled")) {
            paConfig.chartOptions.boxplot.fillMissingValuesEnabled = defaultValues.chartOptions.boxplot.fillMissingValuesEnabled;
        }
        paConfig.panelOptions = {
            ...defaultValues.panelOptions,
            ...paConfig.panelOptions,
        };

        if (!paConfig.chartOptions.custom) {
            paConfig.chartOptions.custom = defaultValues.chartOptions.custom;
        }

        if (!paConfig.chartOptions.sac) {
            paConfig.chartOptions.sac = defaultValues.chartOptions.sac;
        }

        if (!paConfig.chartOptions.shared) {
            paConfig.chartOptions.shared = defaultValues.chartOptions.shared;
        }

        return paConfig;
    }

    private _loadDefaultValues() {        
        return configDefaultValues;
    }

    /*
        BACKEND config
    */
    /*
        Adds per attribute (if true):
            - userRefText, useRefValue
        Adds chartOptions section:
        {
            patient: {...},
            chartOptions:{
                stacked
                    minCohortSize
                boxplot
                    minCohortSize
                km
                    minCohortSize
                    confidenceInterval
            }
        }
    */
    private _addCatalogAttributes(paConfig, cdwConfig) {
        const config = JSON.parse(JSON.stringify(cdwConfig));
        const configWalkFunction = utils.getJsonWalkFunction(paConfig);

        configWalkFunction("filtercards.*.attributes.*").forEach((attribute) => {
            // add Name to interaction
            if (attribute.obj.hasOwnProperty("useRefValue") && attribute.obj.useRefValue === true) {
                utils.createPathInObject2(config, attribute.obj.source + ".useRefValue", true);
            }
            if (attribute.obj.hasOwnProperty("useRefText") && attribute.obj.useRefText === true) {
                utils.createPathInObject2(config, attribute.obj.source + ".useRefText", true);
            }
        });
        return config;
    }

    private _addChartOptions(paConfig, cdwConfig) {
        paConfig = this._loadPAConfigDefault(paConfig);
        const selectedInteractionsList = [];
        const selectedEndInteractionsList = [];

        const formInteractionFilter = (filterCard) => {
            /*let traverse = filterCard.source.split(".");
            let traversingCDW = JSON.parse(JSON.stringify(cdwConfig));
            for (let i = 0; i < traverse.length; i++) {
                traversingCDW = traversingCDW[traverse[i]];
            }*/
            let traversingCDW;
            try {
                traversingCDW = utils.getObjectByPath(cdwConfig, filterCard.source);
            } catch (e) {
                // console.log(e)
            }
            if (!traversingCDW) { return null; }

            const interactionTypeFilter: any = {};
            interactionTypeFilter.defaultFilter = traversingCDW.defaultFilter;
            if (traversingCDW.from && Object.keys(traversingCDW.from).length > 0) {
                interactionTypeFilter.from = JSON.parse(JSON.stringify(traversingCDW.from));
            }

            interactionTypeFilter.name = traversingCDW.name;
            return interactionTypeFilter;
        };

        const formEndInteractionFilter = (filterCard) => {
            const traverse = filterCard.source.split(".");
            let traversingCDW = cdwConfig;
            for (let i = 0; i < traverse.length; i++) {
                traversingCDW = traversingCDW[traverse[i]];
            }
            if (!traversingCDW) { return null; }
            return {
                configPath: filterCard.source,
                name: traversingCDW.name,
            };
        };

        if (paConfig.chartOptions.km.selectedInteractions) {
            paConfig.filtercards.forEach((filterCard) => {
                let filtered = false;
                paConfig.chartOptions.km.selectedInteractions.forEach((kmFilterSource) => {
                    if (kmFilterSource === filterCard.source) {
                        filtered = true;
                    }
                });

                if (filtered) {
                    const interactionFilter = formInteractionFilter(filterCard);
                    if (interactionFilter) { selectedInteractionsList.push(interactionFilter); }
                }
            });
        } else if (paConfig.chartOptions.km.filters) {
            paConfig.filtercards.forEach((filterCard) => {
                let filtered = false;
                if (filterCard.source === "patient") {
                    filtered = true;
                }

                paConfig.chartOptions.km.filters.forEach((kmFilterSource) => {
                    if (kmFilterSource === filterCard.source) {
                        filtered = true;
                    }
                });

                if (!filtered) {
                    const interactionFilter = formInteractionFilter(filterCard);
                    if (interactionFilter) { selectedInteractionsList.push(interactionFilter); }
                }
            });
        }

        if (paConfig.chartOptions.km.selectedEndInteractions) {
            paConfig.filtercards.forEach((filterCard) => {
                let filtered = false;
                paConfig.chartOptions.km.selectedEndInteractions.forEach((kmFilterSource) => {
                    if (kmFilterSource === filterCard.source) {
                        filtered = true;
                    }
                });

                if (filtered) {
                    const interactionFilter = formEndInteractionFilter(filterCard);
                    if (interactionFilter) { selectedEndInteractionsList.push(interactionFilter); }
                }
            });
        }

        cdwConfig.chartOptions = {
            stacked: {
                enabled: paConfig.chartOptions.stacked.visible,
                fillMissingValuesEnabled: paConfig.chartOptions.stacked.fillMissingValuesEnabled,
            },
            boxplot: {
                enabled: paConfig.chartOptions.boxplot.visible,
                fillMissingValuesEnabled: paConfig.chartOptions.boxplot.fillMissingValuesEnabled,
            },
            km: {
                selectedInteractions: selectedInteractionsList,
                selectedEndInteractions: selectedEndInteractionsList,
                enabled: paConfig.chartOptions.km.visible,
                confidenceInterval: paConfig.chartOptions.km.confidenceInterval,
            },
            list: {
                enabled: paConfig.chartOptions.list.visible,
            },
            vb: {
                enabled: paConfig.chartOptions.vb.visible,
                referenceName: paConfig.chartOptions.vb.referenceName,
            },
            custom: {
                enabled: paConfig.chartOptions.custom && paConfig.chartOptions.custom.visible,
                customCharts: paConfig.chartOptions.custom ? paConfig.chartOptions.custom.customCharts : [],
            },
            sac: {
                enabled: paConfig.chartOptions.sac && paConfig.chartOptions.sac.visible,
                customCharts: paConfig.chartOptions.sac ? paConfig.chartOptions.sac.sacCharts : [],
            },
            shared: {
                enabled: paConfig.chartOptions.shared && paConfig.chartOptions.shared.enabled,
                systemName: paConfig.chartOptions.shared ? paConfig.chartOptions.shared.systemName : "",
            },
            minCohortSize: paConfig.chartOptions.minCohortSize,
        };

        cdwConfig.panelOptions = {
            ...paConfig.panelOptions,
        };

        return cdwConfig;
    }

}
