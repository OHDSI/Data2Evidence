import { IMRIRequest, QueryObjectType } from "../../types";
import {env} from "../../env"
import MRIEndpointErrorHandler from "../../utils/MRIEndpointErrorHandler";
import {
    Logger,
    getUser,
    DBConnectionUtil as dbConnectionUtil,
    QueryObject as qo,
} from "@alp/alp-base-utils";
import QueryObject = qo.QueryObject;
import { dataflowRequest } from "../../utils/DataflowMgmtProxy";
import { FilterScopeQueryBuilder } from "../../utils/dataset-filter/filter-scope-query-builder";
import { FilterQueryBuilder } from "../../utils/dataset-filter/query-builder";
import {
    DatabaseSchemaMap,
    IDatasetFilterScopesDto,
    IDatasetFilterParamsDto,
    IDatasetSchemaFilterResultDto,
} from "../../types";
import CreateLogger = Logger.CreateLogger;
let logger = CreateLogger("analytics-log");
const language = "en";

enum DomainRequirement {
    CONDITION_OCCURRENCE = "conditionOccurrence",
    DEATH = "death",
    PROCEDURE_OCCURRENCE = "procedureOccurrence",
    DRUG_EXPOSURE = "drugExposure",
    OBSERVATION = "observation",
    MEASUREMENT = "measurement",
    DEVICE_EXPOSURE = "deviceExposure",
}

const DisplayDomainRequirements = {
    [DomainRequirement.CONDITION_OCCURRENCE]: "Condition Occurrence",
    [DomainRequirement.DEATH]: "Death",
    [DomainRequirement.PROCEDURE_OCCURRENCE]: "Procedure Occurrence",
    [DomainRequirement.DRUG_EXPOSURE]: "Drug Exposure",
    [DomainRequirement.OBSERVATION]: "Observation",
    [DomainRequirement.MEASUREMENT]: "Measurement",
    [DomainRequirement.DEVICE_EXPOSURE]: "Device Exposure",
};

export async function getFilterScopes(req: IMRIRequest, res, next: any) {
    try {
        const encodedDatasetsWithSchema =
            req.query.datasetsWithSchema;

        const datasetsWithSchema = JSON.parse(
            decodeURIComponent(encodedDatasetsWithSchema)
        );

        const databaseSchemaMap = createDatabaseSchemaMap(datasetsWithSchema);
        const schemaMappings = await getSchemaMappings(req);
        const dbCharacterizationSchemas = new CharacterizationSchemas(
            databaseSchemaMap,
            schemaMappings
        );
        const databaseNames = Object.keys(databaseSchemaMap);
        const resultPromises: Promise<IDatasetFilterScopesDto>[] = [];

        let database_credentials = getDatabaseCredentials();

        databaseNames.forEach((dbName) => {
            const characterizationSchemas =
                dbCharacterizationSchemas.get(dbName);
            if (characterizationSchemas.length > 0) {
                resultPromises.push(
                    queryFilterScopes(
                        dbName,
                        characterizationSchemas,
                        database_credentials[dbName].dialect,
                        req
                    )
                );
            }
        });

        const databaseFilterScopes = await Promise.all(resultPromises);

        res.status(200).send({
            domains: DisplayDomainRequirements,
            age: {
                min: Math.min(
                    ...databaseFilterScopes.map((scope) => scope.age.min)
                ),
                max: Math.max(
                    ...databaseFilterScopes.map((scope) => scope.age.max)
                ),
            },
            observationYear: {
                min: Math.min(
                    ...databaseFilterScopes.map(
                        (scope) => scope.observationYear.min
                    )
                ),
                max: Math.max(
                    ...databaseFilterScopes.map(
                        (scope) => scope.observationYear.max
                    )
                ),
            },
            cumulativeObservationMonths: {
                min: Math.min(
                    ...databaseFilterScopes.map(
                        (scope) => scope.cumulativeObservationMonths.min
                    )
                ),
                max: Math.max(
                    ...databaseFilterScopes.map(
                        (scope) => scope.cumulativeObservationMonths.max
                    )
                ),
            },
        });
    } catch (err) {
        res.status(500).send(MRIEndpointErrorHandler({ err, language }));
    }
}

export async function getDatabaseSchemaFilterResults(
    req: IMRIRequest,
    res,
    next: any
) {
    try {
        const encodedDatasetsWithSchema =
            req.query.datasetsWithSchema;

        const datasetsWithSchema = JSON.parse(
            decodeURIComponent(encodedDatasetsWithSchema)
        );

        const encodedFilterParams = req.query.filterParams;

        const filterParams: IDatasetFilterParamsDto = JSON.parse(
            decodeURIComponent(encodedFilterParams)
        );

        const databaseSchemaMap = createDatabaseSchemaMap(datasetsWithSchema);
        const schemaMappings = await getSchemaMappings(req);

        const databaseNames = Object.keys(databaseSchemaMap);
        const dbCharacterizationSchemas = new CharacterizationSchemas(
            databaseSchemaMap,
            schemaMappings
        );

        const resultPromises = {};
        let database_credentials = getDatabaseCredentials();

        databaseNames.forEach((dbName) => {
            const characterizationSchemas =
                dbCharacterizationSchemas.get(dbName);
            if (characterizationSchemas.length > 0) {
                const resultPromise = filter(
                    dbName,
                    characterizationSchemas,
                    database_credentials[dbName].dialect,
                    filterParams,
                    req
                ).then((schemaCharacterizationResults) => {
                    return Object.keys(
                        schemaCharacterizationResults
                    ).reduce<IDatasetSchemaFilterResultDto>(
                        (acc, characterizationSchema) => {
                            const schemaMapping = schemaMappings.find(
                                (mapping) =>
                                    mapping.characterizationSchema ===
                                    characterizationSchema
                            );
                            acc[schemaMapping.datasetSchema] =
                                schemaCharacterizationResults[
                                    characterizationSchema
                                ];
                            return acc;
                        },
                        {}
                    );
                });
                resultPromises[dbName] = resultPromise;
            }
        });

        const results = await handlePromisesFromProps(resultPromises);
        res.status(200).send(results);
    } catch (err) {
        res.status(500).send(MRIEndpointErrorHandler({ err, language }));
    }
}

const createDatabaseSchemaMap = (
    datasetsWithSchema: { databaseCode: string; schemaName: string }[]
) => {
    return datasetsWithSchema.reduce<DatabaseSchemaMap>((acc, dataset) => {
        const databaseCode = dataset.databaseCode;

        if (acc[databaseCode]) {
            acc[databaseCode].push(dataset.schemaName);
        } else {
            acc[databaseCode] = [dataset.schemaName];
        }
        return acc;
    }, {});
};

const queryFilterScopes = async (
    databaseName,
    schemas,
    dialect,
    req
): Promise<IDatasetFilterScopesDto> => {
    const builder = new FilterScopeQueryBuilder(dialect, schemas);
    const query = builder.build();

    let userObj;
    userObj = getUser(req);
    const dbCredentials = getDatabaseCredentials()[databaseName];
    const dbConnection =
        await dbConnectionUtil.DBConnectionUtil.getDBConnection({
            credentials: dbCredentials,
            schemaName: dbCredentials.schemaName,
            vocabSchemaName: dbCredentials.vocabSchemaName,
            userObj,
        });

    const queryobject = QueryObject.format(query);
    var rangeResults = queryobject.executeQuery(dbConnection);

    const rangeResult = Object.fromEntries(
        Object.entries(rangeResults[0]).map<[string, number]>(([k, v]) => [
            k.toLowerCase(),
            Number(v),
        ])
    );
    const {
        min_age,
        max_age,
        min_obs_year,
        max_obs_year,
        min_cumulative_obs_months,
        max_cumulative_obs_months,
    } = rangeResult;
    return {
        age: {
            min: min_age,
            max: max_age,
        },
        observationYear: {
            min: min_obs_year,
            max: max_obs_year,
        },
        cumulativeObservationMonths: {
            min: min_cumulative_obs_months,
            max: max_cumulative_obs_months,
        },
    };
};

const filter = async (databaseName, schemas, dialect, filterParams, req) => {
    const builder = new FilterQueryBuilder(dialect, schemas, filterParams);
    const query = builder.build();

    let userObj;
    userObj = getUser(req);
    // retrieve the connection
    const dbCredentials = getDatabaseCredentials()[databaseName];
    const dbConnection =
        await dbConnectionUtil.DBConnectionUtil.getDBConnection({
            credentials: dbCredentials,
            schemaName: dbCredentials.schemaName,
            vocabSchemaName: dbCredentials.vocabSchemaName,
            userObj,
        });

    const queryobject = QueryObject.format(query);

    let schemaResults: { schema_name: string; total_subjects: number }[];

    await queryobject
        .executeQuery(dbConnection)
        .then((result) => {
            schemaResults = result.data as {
                schema_name: string;
                total_subjects: number;
            }[];
        })
        .catch((err) => {
            logger.error("Failed to query data");
            return err;
        });

    return schemaResults.reduce<{
        [characterizationSchema: string]: {
            totalSubjects: number;
            isMatched: boolean;
        };
    }>((acc, schemaResult) => {
        const { schema_name, total_subjects, ...filterResults } = schemaResult;
        acc[schema_name] = {
            isMatched: Object.values(filterResults).every(
                (result) => result === true
            ),
            totalSubjects: total_subjects,
        };
        return acc;
    }, {});
};

const getSchemaMappings = async (req: IMRIRequest) => {
    const schemaMaps = await dataflowRequest(
        req,
        "GET",
        "dqd/data-characterization/schema-mapping/list",
        {}
    );
    logger.info(`Total schema maps: ${schemaMaps.length}`);

    return schemaMaps.reduce((acc, schemaMap) => {
        const key = Object.keys(schemaMap)[0];
        acc.push({
            datasetSchema: key,
            characterizationSchema: schemaMap[key],
        });
        return acc;
    }, []);
};

const handlePromisesFromProps = async (obj) => {
    const values = await Promise.all(Object.values(obj));
    return Object.keys(obj).reduce((acc, key, index) => {
        acc[key] = values[index];
        return acc;
    }, {});
};

class CharacterizationSchemas {
    private readonly databaseSchemaMap: DatabaseSchemaMap;
    private readonly schemaMappings: {
        datasetSchema: string;
        characterizationSchema: string;
    }[];
    private readonly schemasWithCharacterization: string[];
    constructor(
        databaseSchemaMap: DatabaseSchemaMap,
        schemaMappings: {
            datasetSchema: string;
            characterizationSchema: string;
        }[]
    ) {
        this.databaseSchemaMap = databaseSchemaMap;
        this.schemaMappings = schemaMappings;
        this.schemasWithCharacterization = this.schemaMappings.map(
            (schemaMapping) => schemaMapping.datasetSchema
        );
    }

    get(databaseName: string) {
        const databaseSchemas = this.databaseSchemaMap[databaseName];
        return this.schemasWithCharacterization.reduce<string[]>(
            (acc, schemaWithCharacterization) => {
                if (databaseSchemas.includes(schemaWithCharacterization)) {
                    const schemaMapping = this.schemaMappings.find(
                        (mapping) =>
                            mapping.datasetSchema === schemaWithCharacterization
                    );
                    acc.push(schemaMapping.characterizationSchema);
                }
                return acc;
            },
            []
        );
    }
}

const getDatabaseCredentials = () => {
    const all_database_credentials = JSON.parse(
        env.DATABASE_CREDENTIALS
    );
    logger.info(all_database_credentials);

    let credentials = {};

    all_database_credentials.forEach(({ values }) => {
        credentials[values.databaseName] = {
            schema: values.schema,
            dialect: values.dialect,
            host: values.host,
            port: values.port,
            user: values.credentials.user,
            password: values.credentials.password,
        };
    });
    return credentials;
};
