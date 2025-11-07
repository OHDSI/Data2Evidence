import { IMRIRequest } from "../../types";
import MRIEndpointErrorHandler from "../../utils/MRIEndpointErrorHandler";
import { CustomDBsEndpoint } from "../../mri/endpoint/CustomDBsEndpoint";

const language = 'en';
let regex = new RegExp(/^[a-zA-Z0-9_]+$/);
export async function customDBTableNames(req: IMRIRequest, res, next) {
    const schemaName = req.params.schemaName;
    const { analyticsConnection } = req.dbConnections;

    if (!regex.test(schemaName)) {
        res.status(400)
            .send(MRIEndpointErrorHandler(
                {
                    err: {
                        "name": "mri-pa",
                        "message": `Invalid schema name: ${schemaName}`
                    }, language
                }
            ))
    } else {
        try {
            let results = await (new CustomDBsEndpoint(analyticsConnection).getTablenames(schemaName));
            res.status(200).send(results)
        } catch (err) {
            res.status(500).send(MRIEndpointErrorHandler({ err, language }));
        }

    }
}

export async function customDBTable(req: IMRIRequest, res, next) {
    const schemaName = req.params.schemaName;
    const tableName = req.params.tableName;
    const { analyticsConnection } = req.dbConnections;

    if (!regex.test(schemaName)) {
        res.status(400)
            .send(MRIEndpointErrorHandler(
                {
                    err: {
                        "name": "mri-pa",
                        "message": `Invalid schema name: ${schemaName}`
                    }, language
                }
            ))
    } else if (!regex.test(tableName)) {
        res.status(400)
            .send(MRIEndpointErrorHandler(
                {
                    err: {
                        "name": "mri-pa",
                        "message": `Invalid table name: ${schemaName}`
                    }, language
                }
            ))
    } else {
        try {
            let results = await (new CustomDBsEndpoint(analyticsConnection).getTableData(schemaName, tableName));

            res.status(200).send(results)
        } catch (err) {
            res.status(500).send(MRIEndpointErrorHandler({ err, language }));
        }
    }

}
