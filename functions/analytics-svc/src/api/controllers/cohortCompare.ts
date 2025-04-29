import { getUser, Logger } from "@alp/alp-base-utils";
import CreateLogger = Logger.CreateLogger;
import { PluginColumnType, IMRIRequest } from "../../types";
import { CohortCompareEndpoint } from "../../mri/endpoint/CohortCompareEndpoint";
import { Settings } from "../../qe/settings/Settings";
import MRIEndpointErrorHandler from "../../utils/MRIEndpointErrorHandler";
import PortalServerAPI from "../PortalServerAPI";
import { getCohortAnalyticsConnection } from "./cohort";

let logger = CreateLogger("mri-log: conhortCompare");

async function getSchemaName(datasetId: string, language: string, res) {
    try {
        const portalServerAPI = new PortalServerAPI();
        const accessToken = await portalServerAPI.getClientCredentialsToken();
        const studies = await portalServerAPI.getStudies(accessToken);

        // find the matching element and get the study schema name
        const studyMatch = studies.find((el) => el.id === datasetId);
        if (!studyMatch) {
            return res.status(500).send(
                MRIEndpointErrorHandler({
                    err: {
                        name: "mri-pa",
                        message: `Study metadata not found for the the given datasetId(${datasetId})!`,
                    },
                    language,
                })
            );
        }
        logger.debug(`Matched study details: ${JSON.stringify(studyMatch)}`);

        return studyMatch.schemaName;
    } catch (err) {
        res.status(500).send(MRIEndpointErrorHandler({ err, language }));
    }
}

export async function getmultiplecohortdata(req: IMRIRequest, res) {
    try {
        const analyticsConnection = await getCohortAnalyticsConnection(req);
        const user = getUser(req);
        const lang = user.lang;
        let settings = new Settings();
        let userSelectedAttributes: PluginColumnType[] = [];

        let chartType: string = req.params.chartType;
        let yaxis: string = req.query.yaxis;
        let bmkIds: string = req.query.ids;
        let datasetId: string = req.query.datasetId;

        if (req.query.xaxis && req.query.xaxis !== "undefined") {
            userSelectedAttributes = (req.query.xaxis as string)
                .split(",")
                .map((configPath) => ({
                    configPath,
                    seq: null,
                    order: null,
                }));
        }

        let schemaName = await getSchemaName(datasetId, lang, res);

        const querySvcParams = {
            queryParams: {
                bmkIds,
                datasetId,
                userSelectedAttributes,
                user,
                yaxis,
                chartType,
                configId: req.paConfigId,
                configVersion: req.paConfigVersion,
            },
        };

        switch (chartType) {
            case "barchart":
                const data = await new CohortCompareEndpoint(
                    analyticsConnection,
                    schemaName
                ).processStackedBarcharCohortRequest(req, querySvcParams);
                res.status(200).send(data);
                break;
            default:
                return res.status(500).send("chart not found");
        }
    } catch (err) {
        logger.error(err);
        res.status(500).send(MRIEndpointErrorHandler({ err, language: "en" }));
    }
}
