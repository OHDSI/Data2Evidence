import { Logger, utils } from "@alp/alp-base-utils";
import {
    ANALYTICS_DB_DIALECTS,
    IMRIRequest,
    PABackendConfigResponse,
    StudyAnalyticsCredential,
    StudyDbMetadata,
} from "../types";
import { convertZlibBase64ToJson } from "@alp/alp-base-utils";
import PortalServerAPI from "../api/PortalServerAPI";
import { env } from "../env";
const log = Logger.CreateLogger("analytics-log");

export default async (req: IMRIRequest, res, next) => {
    log.addRequestCorrelationID(req);
    const getDatasetIdFromMriquery = (): string => {
        const base64EncodedMriQuery = req.query.mriquery;
        const base64DecodedMriQueryJson = base64EncodedMriQuery
            ? convertZlibBase64ToJson(base64EncodedMriQuery.toString())
            : "";
        return base64DecodedMriQueryJson
            ? base64DecodedMriQueryJson.datasetId
            : "";
    };

    const getDatasetIdFromRequest = (): string => {
        if (req.query.datasetId) {
            return req.query.datasetId.toString();
        } else if (req.body.datasetId) {
            return req.body.datasetId.toString();
        }
        // URL-encoded JSON path segment (e.g. /cohort/SYNTAX/%7B"datasetId":"..."%7D).
        // Bounded indexOf-based extraction avoids ReDoS from a polynomial regex.
        const url = req.url;
        const pathEnd = url.search(/[?#]/);
        const path = pathEnd === -1 ? url : url.slice(0, pathEnd);
        const start = path.indexOf("%7B");
        if (start !== -1) {
            const end = path.indexOf("%7D", start + 3);
            if (end !== -1) {
                const segment = path.slice(start, end + 3);
                if (segment.length <= 4096) {
                    try {
                        const decoded = JSON.parse(decodeURIComponent(segment));
                        if (decoded?.datasetId)
                            return String(decoded.datasetId);
                    } catch {
                        // not JSON, ignore
                    }
                }
            }
        }
        return "";
    };

    /**
     * Three attempts, then give up, with a short backoff.
     *
     * Bounded on purpose: a portal that is genuinely down must not hold every
     * analytics request open. The delays are sized for a worker restart, not
     * for an outage.
     */
    const fetchWithRetry = async <T>(attempt: () => Promise<T>): Promise<T> => {
        // Five attempts over ~3.7s. The first budget was two retries inside
        // 400ms, sized for the ~80ms a worker needs to re-register its routes,
        // and it was not enough: the portal worker is dropped 41 times in one
        // CI run, and under that much churn a replacement can be unavailable
        // for seconds rather than milliseconds. A fetch that gives up here
        // leaves paConfigId unset and the failure re-emerges as an empty
        // patient count, so the budget is worth more than the latency.
        const delaysMs = [200, 500, 1000, 2000];
        for (let i = 0; ; i++) {
            try {
                return await attempt();
            } catch (error) {
                // Never on 429. trex rate-limits per client address, so a retry
                // spends more of a bucket that is already empty and throttles
                // the calls beside it. A 4xx will not answer differently next
                // time either; the transient this exists for is the worker
                // restart, which shows as a 5xx or a dropped connection.
                //
                // Three shapes, because this client offers no single one: it
                // throws whatever its transport produced, and what was observed
                // in CI carried the code only in the text --
                // "Request failed with status 500: Internal Server Error". A
                // guard reading a structured field alone finds nothing there
                // and retries the throttled calls it exists to spare.
                const err = error as {
                    status?: number;
                    response?: { status?: number };
                    message?: string;
                };
                const fromText = /status (\d{3})/.exec(err?.message ?? "");
                const status = err?.status ?? err?.response?.status ??
                    (fromText ? Number(fromText[1]) : undefined);
                // Unknown status means no reply at all -- a network error, which
                // is worth one more try.
                const worthRetrying = status === undefined || status >= 500;

                if (i >= delaysMs.length || !worthRetrying) {
                    throw error;
                }
                await new Promise((resolve) => setTimeout(resolve, delaysMs[i]));
            }
        }
    };

    const addConfigMetadataToReq = async (datasetId: string): Promise<void> => {
        if (!datasetId) {
            log.info(`Skip PA/CDM metadata injection for path ${req.url}`);
            return;
        }

        try {
            const portalServerAPI = new PortalServerAPI();
            // Retried, because the common failure here is not the portal being
            // down but the portal's edge worker being recycled mid-request:
            //
            //   event_type: "Shutdown", reason: "EarlyDrop"
            //
            // The replacement re-registers its routes within ~100ms, so a
            // request that lands in that window gets one 500 and the next
            // succeeds. Without a retry that single 500 is silently converted
            // into an absent paConfigId, and the damage surfaces much later as
            // PA reporting "No suggestions available" with no patient count --
            // observed in CI as pa-filter-cards failing all four attempts while
            // every other dataset call on the same page returned 200.
            const paBackendConfigResponse: PABackendConfigResponse =
                await fetchWithRetry(() => portalServerAPI.getPABackendConfig(datasetId));
            const responseMeta = paBackendConfigResponse?.meta;

            if (!responseMeta) {
                log.info(`Skip PA/CDM metadata injection for path ${req.url}`);
                return;
            }

            req.paConfigId = responseMeta.configId;
            req.paConfigVersion = responseMeta.configVersion;
            req.cdmConfigId = responseMeta.dependentConfig.configId;
            req.cdmConfigVersion = responseMeta.dependentConfig.configVersion;
        } catch (error) {
            const errorMessage =
                error instanceof Error ? error.message : "unknown error";
            // ERROR, not info. Swallowing this leaves req.paConfigId undefined,
            // and the request continues to a handler that reads it --
            // controllers/values.ts takes `configId` from here, not from the
            // query string the browser sent -- so the failure re-emerges far
            // away as a config-less call into mri-pa-config. What the user sees
            // is "No suggestions available" and an empty patient count, naming
            // neither the dataset nor the fetch that failed. At info level the
            // one line that explains it does not appear in a default log.
            log.error(
                `PA/CDM metadata fetch failed for datasetId ${datasetId}: ${errorMessage}. ` +
                `Requests that read paConfigId/cdmConfigId will be served without it.`
            );
        }
    };

    const getDefaultDbConnection = (): any => {
        const studyAnalyticsCredential: StudyAnalyticsCredential = {
            ...analyticsCredentials[Object.keys(analyticsCredentials)[0]],
        };

        // The first credential is an arbitrary pick, so it may well be one
        // registered without a schema -- a bare database connection. Uppercasing
        // it unconditionally threw "Cannot read properties of undefined (reading
        // 'toUpperCase')", which surfaced as a 500 on
        // /alpdb/schema/exists and blocked adding any dataset on a HANA
        // database: that route has no dataset to look up yet, so it always lands
        // on this default path. The schema is not needed here -- main.ts
        // re-resolves the credential from the request's databaseCode for that
        // route, and callers pass schemaName explicitly.
        if (
            studyAnalyticsCredential.dialect === ANALYTICS_DB_DIALECTS.HANA &&
            studyAnalyticsCredential.schema
        ) {
            studyAnalyticsCredential.schema =
                studyAnalyticsCredential.schema.toUpperCase();
        }
        req.dbCredentials = {
            ...req.dbCredentials,
            studyAnalyticsCredential,
        };
    };

    const getDbConnectionByStudyMetadata = (
        studyMetadata: StudyDbMetadata
    ): any => {
        // Use default db connection credentials if studyMetadata is undefined
        if (studyMetadata == null) {
            getDefaultDbConnection();
            return;
        }
        // Throw error if studyMetadata.databaseName or studyMetadata.schemaName is undefined
        if (studyMetadata.databaseName == null) {
            throw new Error("studyMetadata.databaseName is empty");
        }
        if (studyMetadata.schemaName == null) {
            throw new Error("studyMetadata.schemaName is empty");
        }
        const studyDatabaseName: string = studyMetadata.databaseName;
        const studySchemaName: string = studyMetadata.schemaName;
        const studyVocabSchemaName: string = studyMetadata.vocabSchemaName;
        const studyResultsSchemaName: string = studyMetadata.resultsSchemaName;

        log.info(`studyDatabaseName ${studyDatabaseName}`);

        // analyticsCredentials may be keyed by cacheId, databaseCode or databaseName
        // depending on how the credential was registered. Try each in order so that
        // datasets registered under the new cache_id scheme still resolve.
        const credentialLookupKey =
            studyMetadata.cacheId && analyticsCredentials[studyMetadata.cacheId]
                ? studyMetadata.cacheId
                : studyMetadata.databaseCode &&
                    analyticsCredentials[studyMetadata.databaseCode]
                  ? studyMetadata.databaseCode
                  : studyDatabaseName;
        const resolvedCredential = analyticsCredentials[credentialLookupKey];
        if (!resolvedCredential) {
            throw new Error(
                `No analytics credential found for dataset (cacheId=${studyMetadata.cacheId ?? "n/a"}, databaseCode=${studyMetadata.databaseCode ?? "n/a"}, databaseName=${studyDatabaseName})`
            );
        }
        const studyAnalyticsCredential: StudyAnalyticsCredential = {
            ...resolvedCredential,
        };

        studyAnalyticsCredential.schema = studySchemaName
            ? studySchemaName
            : studyAnalyticsCredential.probeSchema;
        studyAnalyticsCredential.vocabSchema = studyVocabSchemaName
            ? studyVocabSchemaName
            : null;
        studyAnalyticsCredential.resultsSchemaName = studyResultsSchemaName
            ? studyResultsSchemaName
            : studyAnalyticsCredential.schema;

        if (studyAnalyticsCredential.dialect === ANALYTICS_DB_DIALECTS.HANA) {
            studyAnalyticsCredential.schema =
                studyAnalyticsCredential.schema.toUpperCase();
            studyAnalyticsCredential.vocabSchema =
                studyAnalyticsCredential.vocabSchema.toUpperCase();
        }

        // Add dialect and databaseCode to credentials for BIGQUERY datasets as BIGQUERY credentials are not generated in envConverter
        if (studyMetadata.dialect === ANALYTICS_DB_DIALECTS.BIGQUERY) {
            studyAnalyticsCredential.dialect = studyMetadata.dialect;
            studyAnalyticsCredential.code = studyMetadata.databaseCode;
        }

        // `code` is the credential lookup key (databaseCode); `cacheId` is the
        // DuckDB ATTACH alias used at `getConnection(<alias>, ...)`.
        studyAnalyticsCredential.cacheId =
            studyMetadata.cacheId ?? studyMetadata.databaseCode;

        // Add database pool related configs to studyAnalyticsCredential
        studyAnalyticsCredential.max = env.PG__MAX_POOL;
        studyAnalyticsCredential.min = env.PG__MIN_POOL;
        studyAnalyticsCredential.idleTimeoutMillis = env.PG__IDLE_TIMEOUT_IN_MS;

        req.dbCredentials = {
            ...req.dbCredentials,
            studyAnalyticsCredential,
        };
    };

    const analyticsCredentials = req.dbCredentials.analyticsCredentials;

    try {
        if (req.url === "/check-readiness") {
            getDefaultDbConnection();
        } else if (utils.isClientCredReq(req)) {
            if (req.query.datasetId) {
                const datasetId: string = String(req.query.datasetId);
                log.info(`Selected study ID ${datasetId}`);

                const portalServerAPI = new PortalServerAPI();
                const studies = await portalServerAPI.getStudies();

                const studyMetadata: StudyDbMetadata = studies.find(
                    (o) => o.tokenStudyCode === datasetId
                );
                log.info(
                    `Selected studyMetadata ${JSON.stringify(studyMetadata)}`
                );
                // Set req.selectedstudyDbMetadata if it does not already exist
                if (!req.selectedstudyDbMetadata) {
                    req.selectedstudyDbMetadata = studyMetadata;
                }
                getDbConnectionByStudyMetadata(studyMetadata);
                await addConfigMetadataToReq(datasetId);
            } else {
                getDefaultDbConnection();
            }
        } else {
            // TODO: throw exact error for missing db metadata later on once mri sends in selected study entity value
            // TODO: check for selected study is in user jwt token for authorisation
            let datasetId: string = getDatasetIdFromMriquery();
            // If datasetId is not found from mriquery, try and find datasetId from request query or body
            if (!datasetId) {
                datasetId = getDatasetIdFromRequest();
            }
            const studyMetadata: StudyDbMetadata =
                req.studiesDbMetadata.studies.find(
                    (o) => o.id === datasetId || o.tokenStudyCode === datasetId
                );
            // Set req.selectedstudyDbMetadata if it does not already exist
            if (!req.selectedstudyDbMetadata) {
                req.selectedstudyDbMetadata = studyMetadata;
            }
            getDbConnectionByStudyMetadata(studyMetadata);
            await addConfigMetadataToReq(datasetId);
        }
        next();
    } catch (err) {
        log.enrichErrorWithRequestCorrelationID(err, req);
        log.error(err);
        next(err);
    }
};
