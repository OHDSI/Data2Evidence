import MRIEndpointErrorHandler from "../../utils/MRIEndpointErrorHandler";
import { loadBookmarks } from "../../proxy/BookmarkSvcProxy";
import { StackedBarChartCohortSvc } from "../../svc/cohortCompare/StackedBarchartCohortSvc";
import {
    IMRIRequest,
    BookmarkCMDType,
    PluginColumnType,
    StudyMriConfigMetaDataType,
} from "../../types";
import { callStudyMRIConfig } from "../../proxy/ConfigSvcProxy";
import * as utilsLib from "@alp/alp-base-utils";
const log = utilsLib.Logger.CreateLogger("query-gen-log");

/**
 * generates list of cohortqueries
 * @param req
 * @param res
 * @param next
 */

export async function generateQuery(req: IMRIRequest, res, next) {
    const body =
        req.query && req.query.data
            ? JSON.parse(<any>req.query.data)
            : req.body;
    const queryParams = body.queryParams;

    try {
        const bookmarks = await loadBookmarks(
            req,
            queryParams,
            BookmarkCMDType.LOAD_BOOKMARKS
        );

        const configId = queryParams.configId;
        const configVersion = queryParams.configVersion;
        const datasetId = queryParams.datasetId;

        const configParams = {
            req,
            action: "getBackendConfig",
            configId,
            configVersion,
            lang: "en",
            datasetId,
        };

        const configResponse: StudyMriConfigMetaDataType =
            await callStudyMRIConfig(configParams);

        const config = configResponse.config;

        const userSelectedAttributes: PluginColumnType[] =
            queryParams.userSelectedAttributes;
        const yaxis: string = queryParams.yaxis;
        const user: string = queryParams.user;

        // init the stackedBarchartCohortSvc
        const stackedBarchartQuery = await new StackedBarChartCohortSvc({
            userSelectedAttributes,
            yaxis,
            user,
            lang: "en",
            backendConfig: config,
            bookmarks,
            req
        }).generateQuery();

        // log.debug(`Query response:\n${JSON.stringify(stackedBarchartQuery)}`);

        res.status(200).send(stackedBarchartQuery);
    } catch (err) {
        log.error(err)
        log.error(`Error in generating query (${err.stack})!`);
        res.status(500).send(
            MRIEndpointErrorHandler({
                err: {
                    name: "query-gen-log",
                    message: `Error in generating query (${err.stack})!`,
                },
                language: "en",
            })
        );
    }
}
