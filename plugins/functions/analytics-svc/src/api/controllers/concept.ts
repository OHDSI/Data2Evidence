import * as conceptRepository from "../../terminology/concept";
import { Logger } from "@alp/alp-base-utils";
import { IMRIRequest } from "../../types";

const log = Logger.CreateLogger("analytics-log");

export function getStandardConcept(req: IMRIRequest, res) {
    log.addRequestCorrelationID(req);
    const { analyticsConnection  } = req.dbConnections;
    let conceptCode: string;
    let vocabularyId: string;
    if (req.query.conceptCode) {
        conceptCode = req.query.conceptCode;
    }
    if (req.query.vocabularyId) {
        vocabularyId = req.query.vocabularyId;
    }
    conceptRepository.getStandardConcept(
        analyticsConnection,
        conceptCode,
        vocabularyId,
        (err, resultSet) => {
            if (err) {
                log.enrichErrorWithRequestCorrelationID(err, req);
                log.error(err);
                return res.status(500).send({ message: err.message });
            } else if (resultSet.length === 0) {
                return res
                    .status(204)
                    .send({ message: "No standard concept found" });
            }
            res.send({ concept_id: resultSet });
        }
    );
}

export function getDescendantConcepts(req: IMRIRequest, res) {
    log.addRequestCorrelationID(req);
    const { analyticsConnection } = req.dbConnections;
    let conceptId: string;
    if (req.query.conceptId) {
        conceptId = req.query.conceptId;
    }
    conceptRepository.getDescendantConcepts(
        analyticsConnection,
        conceptId,
        (err, resultSet) => {
            if (err) {
                log.enrichErrorWithRequestCorrelationID(err, req);
                log.error(err);
                return res.status(500).send({ message: err.message });
            }
            res.send({ descendants: resultSet });
        }
    );
}
