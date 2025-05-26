import * as utilsLib from "@alp/alp-base-utils";
import MRIEndpointErrorHandler from "../../utils/MRIEndpointErrorHandler";
import { getUser } from "@alp/alp-base-utils";
import { IMRIRequest, StudyDbMetadata } from "../../types";
import * as domainValuesService from "../../mri/endpoint/domain_values_service";

export function values(req: IMRIRequest, res, next) {
    function _sendResult(err, result) {
        if (err) {
            return res
                .status(500)
                .send(MRIEndpointErrorHandler({ err, language }));
        }

        res.status(result.httpStatus).send(result.results);
        next();
    }

    const { analyticsConnection } = req.dbConnections;
    const user = getUser(req);
    const language = user.lang;
    const attributePath = req.query.attributePath;
    const attributeType = req.query.attributeType;
    //Determine config metadata
    let configId = req.paConfigId;
    let configVersion = req.paConfigVersion;
    //Only for tests choose metadata from the request
    if (envVarUtils.isTestEnv() || envVarUtils.isHttpTestRun()) {
        if (!req.query.configId || !req.query.configVersion) {
            throw new Error("Config metadata undefined!")
        }
        configId = req.query.configId
        configVersion = req.query.configVersion
    }

    const suggestionLimit = req.query.suggestionLimit;
    const datasetId = req.query.datasetId;
    const searchQuery = req.query.searchQuery ? req.query.searchQuery : "";
    const studies: StudyDbMetadata[] = req.studiesDbMetadata.studies;
    if (studies && studies.length > 0) {
        const studyMetadata: StudyDbMetadata = studies.find(
            (o) => o.id === datasetId
        );
        if (studyMetadata && studyMetadata.vocabSchemaName) {
            analyticsConnection.schemaName = studyMetadata.vocabSchemaName;
        } else {
            throw new Error(`Vocab schema undefined for Dataset ${datasetId}`);
        }
    }

    analyticsConnection.setCurrentUserToDbSession(
        user.getUser(),
        async (err, data) => {
            if (err) {
                return console.error(err);
            }

            try {
                if (err) {
                    return res
                        .status(500)
                        .send(MRIEndpointErrorHandler({ err, language }));
                }

                utilsLib.assert(
                    attributePath,
                    `The request must contain a property "attributePath"`
                );

                domainValuesService.processRequest(
                    req,
                    {
                        attributePath,
                        attributeType,
                        suggestionLimit,
                        searchQuery,
                        configParams: {
                            action: "getBackendConfig",
                            configId,
                            configVersion,
                            lang: language,
                            datasetId,
                        },
                    },
                    analyticsConnection,
                    _sendResult
                );
            } catch (err) {
                console.error(err);
                return res.status(500).json({});
            }
        }
    );
}
