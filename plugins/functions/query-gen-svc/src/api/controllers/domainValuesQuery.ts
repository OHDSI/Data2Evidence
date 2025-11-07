import MRIEndpointErrorHandler from "../../utils/MRIEndpointErrorHandler";
import { IMRIRequest } from "../../types";
import { callStudyMRIConfig } from "../../proxy/ConfigSvcProxy";
import { DomainValuesSvc } from "../../svc/DomainValuesSvc";
import { Logger } from "@alp/alp-base-utils";

const log = Logger.CreateLogger("Query Gen Svc: domain values query");

export const generateQuery = async (req: IMRIRequest, res, next) => {
    try {
        const { attributePath, suggestionLimit, searchQuery } = req.body;
        const configParams = { req, ...req.body.configParams };
        const configResponse = await callStudyMRIConfig(configParams);
        const config = configResponse.config;
        const sQuery = await new DomainValuesSvc(
            config,
            attributePath,
            suggestionLimit,
            searchQuery
        ).generateQuery();

        // log.debug(`Query response:\n${JSON.stringify(sQuery)}`);

        res.status(200).send({
            queryString: sQuery.queryString,
            config,
        });
    } catch (err) {
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
};
