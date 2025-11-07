import * as utils from "@alp/alp-base-utils";
import ConnectionInterface = utils.Connection.ConnectionInterface;
import CallBackInterface = utils.Connection.CallBackInterface;
import QueryObject = utils.QueryObject.QueryObject;
const log = utils.Logger.CreateLogger("analytics-log");

let QUERIES = (vocabSchema) => {
    return {
        GET_STANDARD_CONCEPT: `select c.CONCEPT_ID, CONCEPT_NAME, COALESCE(STANDARD_CONCEPT,'N') STANDARD_CONCEPT, 
        COALESCE(c.INVALID_REASON,'V') INVALID_REASON, CONCEPT_CODE, CONCEPT_CLASS_ID, c.DOMAIN_ID, 
        c.VOCABULARY_ID, RELATIONSHIP_NAME, 1 RELATIONSHIP_DISTANCE
        from "${vocabSchema}".concept_relationship cr
        join "${vocabSchema}".concept c on cr.CONCEPT_ID_2 = c.CONCEPT_ID
        join "${vocabSchema}".relationship r on cr.RELATIONSHIP_ID = r.RELATIONSHIP_ID
        where cr.CONCEPT_ID_1 IN (select CONCEPT_ID from "${vocabSchema}".concept
        where CONCEPT_CODE = %s) and cr.INVALID_REASON IS NULL and STANDARD_CONCEPT = 'S'`,

        GET_STANDARD_CONCEPT_WITH_VOCAB: `select c.CONCEPT_ID, CONCEPT_NAME, COALESCE(STANDARD_CONCEPT,'N') STANDARD_CONCEPT, 
        COALESCE(c.INVALID_REASON,'V') INVALID_REASON, CONCEPT_CODE, CONCEPT_CLASS_ID, c.DOMAIN_ID, 
        c.VOCABULARY_ID, RELATIONSHIP_NAME, 1 RELATIONSHIP_DISTANCE
        from "${vocabSchema}".concept_relationship cr
        join "${vocabSchema}".concept c on cr.CONCEPT_ID_2 = c.CONCEPT_ID
        join "${vocabSchema}".relationship r on cr.RELATIONSHIP_ID = r.RELATIONSHIP_ID
        where cr.CONCEPT_ID_1 = (select CONCEPT_ID from "${vocabSchema}".concept
        where CONCEPT_CODE = %s and vocabulary_id = %s) and cr.INVALID_REASON IS NULL and STANDARD_CONCEPT = 'S'`,

        GET_DESCENDANT_CONCEPTS: `select cr.CONCEPT_ID_1 as DESCENDANT_CONCEPT_ID, dc.CONCEPT_CODE as DESCENDANT_CONCEPT_CODE,
        dc.CONCEPT_NAME as DESCENDANT_CONCEPT_NAME
        from "${vocabSchema}".concept_relationship cr 
        join "${vocabSchema}".concept dc on cr.CONCEPT_ID_1 = dc.CONCEPT_ID
        join "${vocabSchema}".concept ac on cr.CONCEPT_ID_2 = ac.CONCEPT_ID
        where RELATIONSHIP_ID = 'Is a' and ac.CONCEPT_ID = %s`,
    };
};

// get standard concept id from concept code
export function getStandardConcept(
    connection: ConnectionInterface,
    conceptCode: string,
    vocabularyId: string,
    callback: CallBackInterface
) {
    let querySql: string;
    let queryObj;
    if (!vocabularyId || vocabularyId === "") {
        querySql = QUERIES(connection.vocabSchemaName).GET_STANDARD_CONCEPT;
        queryObj = QueryObject.format(querySql, conceptCode);
    } else {
        querySql = QUERIES(
            connection.vocabSchemaName
        ).GET_STANDARD_CONCEPT_WITH_VOCAB;
        queryObj = QueryObject.format(querySql, conceptCode, vocabularyId);
    }
    queryObj.executeQuery(connection, (err, result) => {
        if (err) {
            return callback(err, null);
        }
        let data = [];
        result.data.forEach((row) => {
            data.push({
                conceptId: row.CONCEPT_ID,
                conceptCode: row.CONCEPT_CODE,
                conceptName: row.CONCEPT_NAME,
                domainId: row.DOMAIN_ID,
                vocabularyId: row.VOCABULARY_ID,
            });
        });
        closeDb(connection);
        callback(err, data);
    });
}

// get descendent concept ids from concept id
export function getDescendantConcepts(
    connection: ConnectionInterface,
    conceptId: string,
    callback: CallBackInterface
) {
    let querySql = QUERIES(connection.vocabSchemaName).GET_DESCENDANT_CONCEPTS;

    let queryObj = QueryObject.format(querySql, conceptId);
    queryObj.executeQuery(connection, (err, result) => {
        if (err) {
            return callback(err, null);
        }
        let data = [];
        result.data.forEach((row) => {
            data.push({
                conceptId: row.DESCENDANT_CONCEPT_ID,
                conceptCode: row.DESCENDANT_CONCEPT_CODE,
                conceptName: row.DESCENDANT_CONCEPT_NAME,
            });
        });
        closeDb(connection);
        callback(err, data);
    });
}

function closeDb(connection) {
    log.debug("Cleanup triggered");
    connection.close((err) => {
        if (err) {
            log.debug("Error while closing connection: " + err);
        }
    });
}
