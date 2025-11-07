import { z } from "zod";
import { Logger } from "@alp/alp-base-utils";
import MRIEndpointErrorHandler from "../../utils/MRIEndpointErrorHandler";
import { IMRIRequest } from "../../types";
import { PluginEndpointSvc } from "../../svc/PluginEndpointSvc";

const log = Logger.CreateLogger("Query Gen Svc: plugin endpoint query");

export const generateQuery = async (req: IMRIRequest, res, next) => {
    try {
        const { body } = z
            .object({
                body: z.object({
                    config: z.any(),
                    querySelector: z.enum(["factTablePlaceholder"]),
                }),
            })
            .parse(req);
        const queryString = await new PluginEndpointSvc(
            body.config,
            body.querySelector
        ).generateQuery();
        res.status(200).send({ queryString });
    } catch (err: any) {
        if (err instanceof z.ZodError) {
            log.error(`Invalid input received (${err})!`);
            res.status(400).send(err);
            return;
        }
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
