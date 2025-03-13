import crypto from "crypto";
import { Readable } from "stream";
import * as utilsLib from "@alp/alp-base-utils";
import {
    QueryObject as qo,
    Connection as connLib,
    PostgresConnection,
} from "@alp/alp-base-utils";
import QueryObject = qo.QueryObject;
import ConnectionInterface = connLib.ConnectionInterface;
import { Settings } from "../../qe/settings/Settings";
import {
    PluginEndpointResultType,
    PluginEndpointStreamResultType,
    ExtensionMetadata,
    CohortDefinitionType,
    PluginEndpointFormatType,
    FilterType,
    BackendConfigWithCDMConfigMetaDataType,
    QuerySvcResultType,
    IMRIRequest,
    MRIEndpointResultMeasureType,
    MRIEndpointResultCategoryType,
    PluginSelectedAttributeType,
} from "../../types";
import { AuditLogger } from "../../utils/AuditLogger";
import { generateQuery } from "../../utils/QueryGenSvcProxy";

// Max length of the channel is 16 (limitation in audit server), hence we use abbreviations to shorten it.
const log = utilsLib.Logger.CreateLogger("analytics-log");

enum MODE {
    CSV = 1,
    JSON = 2,
}

const emptyResult = (): PluginEndpointResultType => {
    return {
        sql: "",
        data: [],
        totalPatientCount: 0,
    };
};

export class PluginEndpoint {
    private MD: ExtensionMetadata;
    private uniquePatientTempTableName: string;
    private createTempTableQuery: string;
    private settingsObj: Settings;
    private pholderTableMap: any;
    private cdmConfigMetaData: any;
    private request: IMRIRequest;
    private selectedAttributes: PluginSelectedAttributeType[];
    private entityQueryMap: any;
    private config: any;

    constructor(
        public connection: ConnectionInterface,
        private schemaName: string
    ) {
        //double quotes surround intentional to preserve lowercase naming in hana table
        this.uniquePatientTempTableName = `"#MRI_PLUGIN_${crypto
            .randomBytes(24)
            .toString("hex")}"`;
    }

    public setRequest(request: IMRIRequest) {
        this.request = request;
    }

    public isEmptyRequest(request) {
        if (utilsLib.deepEquals(request, { patient: {} })) {
            return true;
        }
        if (utilsLib.deepEquals(request, {})) {
            return true;
        }
        return false;
    }

    private mapRequestDataFormat(format: string) {
        switch (format.toUpperCase()) {
            case "CSV":
                return MODE.CSV;
            case "JSON":
                return MODE.JSON;
            default:
                throw new Error(`Plugin service: Invalid request data format`);
        }
    }

    private genLocalTempTableCreationQuery(existingPatientTable): string {
        const query = `CREATE LOCAL TEMPORARY COLUMN TABLE ${this.uniquePatientTempTableName} AS 
                                            (select * from ${existingPatientTable} where 1=0)`;
        log.debug(`Generated Create Local Temp Table Query ${query}`);
        return query;
    }

    private getColumn = (columnId: string): string => {
        const col = this.pholderTableMap[columnId];
        if (col) {
            return col;
        } else {
            throw new Error(`${columnId} is not defined in placeholderMap`);
        }
    };
    /**
     * Retrieves patient and corresponding interaction datasets
     * @param cohortDefinition - ifr
     * @param pholderTableMap - placeholder table map
     * @param config - cdm config
     * @param dataFormat - Requested data format (csv, json)
     * @param patientId - for retrieving a single patient
     */
    public async retrieveData({
        cohortDefinition,
        datasetId,
        language,
        dataFormat = "json",
        requestQuery,
        metadataType,
        annotated = false,
        patientId,
        auditLogChannelName,
        postFilters,
    }: {
        cohortDefinition?: CohortDefinitionType;
        datasetId: string;
        language: string;
        dataFormat: PluginEndpointFormatType;
        requestQuery?: string[];
        metadataType?: string;
        annotated?: boolean;
        patientId?: string;
        auditLogChannelName: string;
        postFilters?: FilterType;
    }): Promise<NodeJS.ReadWriteStream | PluginEndpointResultType> {
        return new Promise<NodeJS.ReadWriteStream | PluginEndpointResultType>(
            async (resolve, reject) => {
                let dropFn = () => {
                    return Promise.resolve({});
                };

                const errHandler = async (err) => {
                    await dropFn();
                    reject(err);
                };

                try {
                    const mode = this.mapRequestDataFormat(dataFormat);
                    const endpointResult = emptyResult();
                    let { query, pCountQuery, noDataReason } =
                        await this.buildTempTableQuery({
                            cohortDefinition,
                            datasetId,
                            language,
                            insert: true,
                            requestQuery,
                            metadataType,
                            annotated,
                            postFilters,
                        });

                    if (!query) {
                        if (noDataReason) {
                            endpointResult.noDataReason = noDataReason;
                        }
                        return resolve(endpointResult);
                    }

                    if (patientId) {
                        const queryResponse = await generateQuery(
                            this.request,
                            {
                                querySelector: "factTablePlaceholder",
                                config: this.config,
                            },
                            "pluginendpoint"
                        );
                        query = QueryObject.format(
                            queryResponse.queryString,
                            query,
                            patientId
                        );
                    }

                    if (!this.selectedAttributes) {
                        return errHandler(
                            new Error(
                                `Error: Cohort request does not contain any selected attributes`
                            )
                        );
                    }

                    /**Executes query for retrieval of individual interaction datasets */
                    const asyncQuery = async (entity, query) =>
                        new Promise((resolve, reject) => {
                            query.executeQuery(
                                this.connection,
                                (err, result) => {
                                    if (err) {
                                        console.error(
                                            "Extension service - Interaction query failed",
                                            err
                                        );
                                        return reject(err);
                                    }
                                    resolve({
                                        entity,
                                        data: result.data,
                                        sql: result.sql,
                                    });
                                },
                                this.schemaName
                            );
                        });

                    const qeExecuteUpdateCallback = async (err, result) => {
                        let resultSet = [];
                        let serviceResponse;

                        if (err) {
                            console.error(
                                "Extension service - Temporary table data insertion failed",
                                err
                            );
                            return errHandler(err);
                        }

                        try {
                            const allData = [];
                            for (
                                let i = 0;
                                i < this.entityQueryMap.length;
                                i += 1
                            ) {
                                const el = this.entityQueryMap[i];
                                const data = await asyncQuery(
                                    el.entity,
                                    new QueryObject(
                                        el.query.queryString,
                                        el.query.parameterPlaceholders,
                                        el.query.sqlReturnOn
                                    )
                                );
                                allData.push(data);
                            }

                            switch (mode) {
                                case MODE.JSON:
                                case MODE.CSV:
                                    serviceResponse = allData;
                                    break;
                                default:
                                    return errHandler(
                                        Error(
                                            `Error: Invalid output mode! 1 - CSV, 2 - JSON, You passed: ${mode}`
                                        )
                                    );
                            }

                            qeDeleteTempTablesCallback(
                                null,
                                resultSet,
                                serviceResponse
                            );
                        } catch (err) {
                            return errHandler(err);
                        }
                    };

                    /**teardown resource setup, returns response */
                    const qeDeleteTempTablesCallback = async (
                        err,
                        queryResult,
                        serviceResponse
                    ) => {
                        const patientEntity = queryResult.filter(
                            (dataset) => dataset.entity === "patient"
                        )[0];
                        const pList = patientEntity ? patientEntity.data : [];
                        const resultcb = (logErr) => {
                            if (logErr) {
                                return errHandler(new Error("Auditlog error"));
                            }

                            if (mode === MODE.CSV) {
                                endpointResult.selectedAttributes =
                                    this.selectedAttributes;
                                endpointResult.noValue =
                                    connLib.DBValues.NOVALUE;
                                if (metadataType) {
                                    const meta = this.MD
                                        ? JSON.stringify(this.MD)
                                        : "Metadata Type not supported";
                                    serviceResponse.metadata = meta;
                                }
                            }

                            endpointResult.data = serviceResponse;

                            if (endpointResult.data.length === 0) {
                                endpointResult.noDataReason =
                                    "MRI_PA_NO_MATCHING_PATIENTS_GUARDED";
                            }

                            return resolve(endpointResult);
                        };

                        AuditLogger.getAuditLogger({})
                            .withCDMConfigMetaData(this.cdmConfigMetaData)
                            .log(
                                "patient.attributes.pid",
                                auditLogChannelName,
                                pList,
                                true,
                                resultcb,
                                undefined,
                                this.selectedAttributes
                            );
                    };

                    // const tempTableCreateTime = process.hrtime();
                    QueryObject.format(this.createTempTableQuery).executeUpdate(
                        this.connection,
                        async (err, result) => {
                            if (err) {
                                console.error(
                                    "Extension service - Failed to create temporary table",
                                    err
                                );
                                return errHandler(err);
                            }
                            try {
                                const patientCount =
                                    await pCountQuery.executeQuery<
                                        {
                                            "gr_cnt": number;
                                            "patient.attributes.pcount": number;
                                        }[]
                                    >(
                                        this.connection,
                                        undefined,
                                        this.schemaName
                                    );

                                if (patientCount.data.length === 1) {
                                    endpointResult.totalPatientCount =
                                        patientCount.data[0][
                                            "patient.attributes.pcount"
                                        ];
                                }
                                //Execute query to select dataset, insert patient ids into temp table
                                query.executeUpdate(
                                    this.connection,
                                    qeExecuteUpdateCallback,
                                    this.schemaName
                                );
                            } catch (err) {
                                return errHandler(err);
                            }
                        },
                        this.schemaName
                    );
                } catch (err) {
                    return errHandler(err);
                }
            }
        );
    }

    /**
     * Retrieves patient or corresponding interaction dataset stream
     * @param cohortDefinition - ifr
     * @param pholderTableMap - placeholder table map
     * @param config - cdm config
     * @param patientId - for retrieving a single patient
     */
    public async retrieveDataStream({
        cohortDefinition,
        metadataType,
        annotated = false,
        patientId,
        auditLogChannelName,
        postFilters,
        datasetId,
    }: {
        cohortDefinition?: CohortDefinitionType;
        metadataType?: string;
        annotated?: boolean;
        patientId?: string;
        auditLogChannelName: string;
        postFilters?: FilterType;
        datasetId: string;
    }): Promise<PluginEndpointStreamResultType> {
        return new Promise<PluginEndpointStreamResultType>(
            async (resolve, reject) => {
                let dropFn = () => {
                    return Promise.resolve({});
                };

                const errHandler = async (err) => {
                    await dropFn();
                    reject(err);
                };

                try {
                    const endpointResult: PluginEndpointStreamResultType = {
                        entity: "",
                        data: Readable.from(""),
                    };

                    let { query, noDataReason } =
                        await this.buildTempTableQuery({
                            cohortDefinition,
                            datasetId: datasetId,
                            language: "",
                        });
                    if (!query) {
                        if (noDataReason) {
                            endpointResult.noDataReason = noDataReason;
                        }
                        return resolve(endpointResult);
                    }

                    if (patientId) {
                        const queryResponse = await generateQuery(
                            this.request,
                            {
                                querySelector: "factTablePlaceholder",
                                config: this.config,
                            },
                            "pluginendpoint"
                        );
                        query = QueryObject.format(
                            queryResponse.queryString,
                            query,
                            patientId
                        );
                    }

                    // // Inject interaction id in configuration
                    // this._modifyConfigurations(this.config, this.pholderTableMap);

                    // Get the required attributes for which data will be needed
                    if (!this.selectedAttributes) {
                        return errHandler(
                            new Error(
                                `Error: Cohort request does not contain any selected attributes`
                            )
                        );
                    }

                    // Executes query for retrieval of individual interaction datasets
                    //3

                    const streamQuery = async (
                        entity,
                        query: QueryObject
                    ): Promise<{
                        entity: any;
                        data: NodeJS.ReadableStream;
                    }> => {
                        try {
                            log.debug(
                                `Plugin Endpoint Final Query: ${query.queryString}`
                            );

                            const { data } =
                                await query.executeStreamQuery<NodeJS.ReadableStream>(
                                    this.connection,
                                    this.schemaName
                                );

                            return { entity, data };
                        } catch (err) {
                            log.error(err);
                            throw err;
                        }
                    };

                    //2
                    const qeExecuteUpdateCallback = async (err, res) => {
                        if (err) {
                            console.error(
                                "Extension service - Temporary table data insertion failed",
                                err
                            );
                            return errHandler(err);
                        }

                        log.debug(
                            `${res} inserted into ${this.uniquePatientTempTableName}`
                        );

                        if (this.entityQueryMap.length !== 1) {
                            endpointResult.noDataReason =
                                "Detected extension service - Data streaming from a single FAST object failed. " +
                                "Detect more than 1 FAST object based on associated attributes in the request.";
                            return resolve(endpointResult);
                        }

                        const entityObj = this.entityQueryMap[0];

                        try {
                            const qo: QueryObject = new QueryObject(
                                entityObj.query.queryString,
                                entityObj.query.parameterPlaceholders,
                                entityObj.query.sqlReturnOn
                            );
                            const dataStream = await streamQuery(
                                entityObj.entity,
                                qo
                            );
                            await qePrepareDataStream(dataStream);
                        } catch (err) {
                            return errHandler(err);
                        }
                    };

                    // Setup data stream events and return response
                    //4
                    const qePrepareDataStream = async (dataStream: {
                        entity: any;
                        data: NodeJS.ReadableStream;
                    }) => {
                        let rows = [];
                        const CHUNK_SIZE = 10;
                        const auditLogger = AuditLogger.getAuditLogger(
                            {}
                        ).withCDMConfigMetaData(this.cdmConfigMetaData);
                        let rowCount = 0;

                        const resultcb = (logErr) => {
                            if (logErr) {
                                log.error(logErr);
                                return errHandler(new Error("Auditlog error"));
                            }
                        };

                        if (
                            dataStream.data.constructor.prototype.toString() !==
                            "[object AsyncGenerator]"
                        ) {
                            dataStream.data.on("end", () => {
                                log.debug(
                                    `total streamed rows for ${dataStream.entity}: ${rowCount}`
                                );
                            });

                            dataStream.data.on("drain", () => {
                                log.debug(`drain from pluginendpoint   `);
                            });
                        }

                        return resolve({
                            entity: dataStream.entity,
                            data: dataStream.data,
                            rowCount: rowCount,
                        });
                    };

                    //1
                    QueryObject.format(this.createTempTableQuery).executeUpdate(
                        this.connection,
                        async (err) => {
                            if (err) {
                                console.error(
                                    "Extension service - Failed to create temporary table",
                                    err
                                );
                                return errHandler(err);
                            }
                            try {
                                // Execute query to select dataset, insert patient ids into temp table
                                query.executeUpdate(
                                    this.connection,
                                    qeExecuteUpdateCallback,
                                    this.schemaName
                                );
                            } catch (err) {
                                return errHandler(err);
                            }
                        },
                        this.schemaName
                    );
                } catch (err) {
                    return errHandler(err);
                }
            }
        );
    }

    // Formats and executes a Query filtered by patientIds defined by a mriquery
    // Query should include a '%Q' for insertion of the filtering subquery
    // If Query has other parameters, the position of '%Q' can be indicated
    public async executeQueryFilteredByPID(
        cohortDefinition: CohortDefinitionType,
        configWithCdmConfigMetaData: BackendConfigWithCDMConfigMetaDataType,
        querySql: string,
        queryParams = [],
        subqueryParamIndex?: number
    ): Promise<PluginEndpointResultType> {
        // const config = configWithCdmConfigMetaData?.backendConfig;
        const endpointResult = emptyResult();
        const { query } = await this.buildTempTableQuery({
            cohortDefinition,
            datasetId: "",
            language: "",
            insert: false,
        });
        if (!query) {
            return Promise.resolve(endpointResult);
        }
        return new Promise<PluginEndpointResultType>(
            async (resolve, reject) => {
                if (subqueryParamIndex === undefined) {
                    subqueryParamIndex = queryParams.length;
                }
                queryParams.splice(subqueryParamIndex, 0, query);

                const filteredQuery = QueryObject.format(
                    querySql,
                    ...queryParams
                );
                // log.debug("Executing query: " + filteredQuery.queryString);
                try {
                    await filteredQuery.executeQuery(
                        this.connection,
                        (err, res) => {
                            if (err) {
                                return reject(err);
                            }
                            endpointResult.data = res.data;
                            return resolve(endpointResult);
                        },
                        this.schemaName
                    );
                } catch (err) {
                    return reject(err);
                }
            }
        );
    }

    private buildTempTableQuery = async ({
        cohortDefinition,
        datasetId, //
        language, //
        insert = true, //
        requestQuery,
        metadataType,
        annotated,
        postFilters,
    }: {
        cohortDefinition: CohortDefinitionType;
        datasetId; //
        language; //
        insert?: boolean; //
        requestQuery?: string[];
        metadataType?: string;
        annotated?: boolean;
        postFilters?: FilterType;
    }): Promise<{
        query: QueryObject;
        pCountQuery: QueryObject;
        nql: any;
        noDataReason: string;
    }> => {
        return new Promise<{
            query: QueryObject;
            pCountQuery: QueryObject;

            nql: any;
            noDataReason: string;
        }>(async (resolve, reject) => {
                try{
                    const { configId, configVersion } = cohortDefinition.configData;
                    cohortDefinition[`uniquePatientTempTableName`] =
                        this.uniquePatientTempTableName;
                    const querySvcParams = {
                        queryParams: {
                            configId,
                            configVersion,
                            datasetId,
                            queryType: "plugin",
                            ifrRequest: cohortDefinition,
                            language,
                            requestQuery,
                            metadataType,
                            annotated,
                            postFilters,
                            insert,
                        },
                    };
                    const queryResponse: QuerySvcResultType = await generateQuery(
                        this.request,
                        querySvcParams
                    );
                    const finalQueryObject = queryResponse.queryObject;
                    const pCountQueryObject = queryResponse.pCountQueryObject;
                    const nql: QueryObject = new QueryObject(
                        finalQueryObject.queryString,
                        finalQueryObject.parameterPlaceholders,
                        finalQueryObject.sqlReturnOn
                    );
                    const pCountNql: QueryObject = new QueryObject(
                        pCountQueryObject.queryString,
                        pCountQueryObject.parameterPlaceholders,
                        pCountQueryObject.sqlReturnOn
                    );
                    const fast: any = queryResponse.fast;
                    this.config = queryResponse.config;
                    const measures: MRIEndpointResultMeasureType[] =
                        queryResponse.measures;
                    const categories: MRIEndpointResultCategoryType[] =
                        queryResponse.categories;
                    const cdmConfigMetaData = queryResponse.cdmConfigMetaData;

                    this.settingsObj = new Settings().initAdvancedSettings(
                        this.config.advancedSettings
                    );
                    this.pholderTableMap = this.settingsObj.getGuardedPlaceholderMap();
                    this.cdmConfigMetaData = cdmConfigMetaData;
                    this.selectedAttributes = queryResponse.selectedAttributes;
                    this.entityQueryMap = queryResponse.entityQueryMap;

                    // Generate Local temp table creation query
                    this.createTempTableQuery = this.genLocalTempTableCreationQuery(
                        this.pholderTableMap[this.settingsObj.getFactTablePlaceholder()]
                    );
                    cohortDefinition = this._addInteractionId(cohortDefinition);

                    resolve({
                        query: nql,
                        pCountQuery: pCountNql,
                        nql: null,
                        noDataReason: fast.message.noDataReason,
                    });
            } catch(err) {
                reject(err)
            }
        });
    };

    private _addInteractionId(cohortDefinition: any) {
        const newColumns = [];
        let lastInteraction = "";
        if (cohortDefinition && cohortDefinition.columns) {
            cohortDefinition.columns.forEach((el) => {
                if (
                    el.configPath.indexOf("patient.attributes") === -1 &&
                    el.configPath.indexOf("interactions") !== -1
                ) {
                    const confgiPathSections =
                        el.configPath.split(".attributes.");
                    if (lastInteraction !== confgiPathSections[0]) {
                        lastInteraction = confgiPathSections[0];
                        newColumns.push({
                            configPath: `${confgiPathSections[0]}.attributes._interaction_id`,
                            order: "",
                            seq: 0,
                        });
                    }
                }
                newColumns.push(el);
            });
        }
        newColumns.forEach((el, idx) => {
            el[`seq`] = idx;
        });
        cohortDefinition[`columns`] = newColumns;
        return cohortDefinition;
    }
}
