import { IMRIRequest } from "../../types";
import { Logger } from "@alp/alp-base-utils";
import CreateLogger = Logger.CreateLogger;
let logger = CreateLogger("analytics-log");

import { dataflowRequest } from "../../utils/DataflowMgmtProxy";
import MRIEndpointErrorHandler from "../../utils/MRIEndpointErrorHandler";
import PortalServerAPI from "../PortalServerAPI";
import { PrefectAPI } from "../../utils/PrefectAPI.ts";

const language = "en";
 
async function getStudyDetails(
    datasetId: string,
    res
): Promise<{
    databaseCode: string;
    schemaName: string;
    vocabSchemaName: string;
}> {
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

        return studyMatch;
    } catch (err) {
        res.status(500).send(MRIEndpointErrorHandler({ err, language }));
    }
}

export async function getKmData(req: IMRIRequest, res) {
    const timeoutMs = 20 * 60 * 1000;
    const retryIntervalMs = 10 * 1000;
    let startTimeMs = +new Date();

    const wait = () => {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve(true);
            }, retryIntervalMs);
        });
    };

    const checkFlowRunState = async () => {
        if (+new Date() < startTimeMs + timeoutMs) {
            const result = await dataflowRequest(
                req,
                "GET",
                `jobplugins/cohort-survival/results/${req.query.flowRunId}`,
                null
            );
            if (result.parameters.options.datasetId !== req.query.datasetId) {
                throw new Error("Not authorized to view this flow run.");
            }
            if (
                ["CANCELLING", "CANCELLED", "FAILED", "CRASHED"].includes(
                    result.state.type
                )
            ) {
                throw new Error(
                    "Cohort survival results could not be retrieved as flow run was unsuccessful"
                );
            }

            if (result.state.type === "COMPLETED") {
                return;
            }
            await wait();
            await checkFlowRunState();
        } else {
            throw new Error(
                "Check flow run state for Kaplan Meier analysis timeout"
            );
        }
    };
    await checkFlowRunState();

    try {
        console.info("Checking for Kapler-Meier Data");

        const prefectApi = new PrefectAPI(req.headers.authorization);
        const flowRunArtifacts = await prefectApi.getFlowRunsArtifactsByFlowRunId(
            req.query.flowRunId
        );
        return res.json(flowRunArtifacts[0]);
    } catch (error) {
        console.error("Error in handling request:", error);
        res.status(500).send("Internal Server Error");
    }
}

export async function analyzeCohortsKm(req: IMRIRequest, res) {
    const datasetId = req.query.datasetId as string;
    const { schemaName, databaseCode } = await getStudyDetails(datasetId, res);
    const result = await dataflowRequest(
        req,
        "POST",
        `jobplugins/cohort-survival/flow-run`,
        {
            options: {
                schemaName,
                databaseCode,
                targetCohortDefinitionId: req.body.targetCohortId,
                outcomeCohortDefinitionId: req.body.outcomeCohortId,
                competingOutcomeCohortDefinitionId: req.body.competingOutcomeCohortId,
                analysisType: req.body.analysisType,
                datasetId: datasetId,
            },
        }
    );
    res.json(result);
}
