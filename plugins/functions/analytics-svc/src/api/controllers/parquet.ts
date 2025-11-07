import { IMRIRequest, StudyDbMetadata } from "../../types";
import { Logger } from "@alp/alp-base-utils";
import * as Minio from "minio";
import PortalServerAPI from "../PortalServerAPI";
import { env } from "../../env";

const log = Logger.CreateLogger("analytics-log");

export async function retrieveParquetStream(req: IMRIRequest, res) {
    const datasetId = req.params.datasetId;
    const tableName = req.params.tableName;
    try {
        const studies = await new PortalServerAPI().getStudies(
            req.headers.authorization
        );

        log.debug(`All study details from portal: ${JSON.stringify(studies)}`);

        const studyFound = studies.find((study) => study.id === datasetId);
        if (!studyFound) {
            const httpResponse = {
                message: `Study metadata not found for given datasetId(${datasetId})`,
            };
            res.status(500).send(JSON.stringify(httpResponse));
        }

        log.debug(
            `All study details from portal: ${JSON.stringify(studyFound)}`
        );

        const schemaName = studyFound.schemaName;
        if (schemaName === "") {
            const httpResponse = {
                message: `Study schema not found for given datasetId(${datasetId})`,
            };
            res.status(500).send(JSON.stringify(httpResponse));
        }

        const client = new Minio.Client({
            endPoint: env.MINIO__ENDPOINT,
            port: env.MINIO__PORT,
            useSSL: env.MINIO__SSL === "true",
            accessKey: env.MINIO__ACCESS_KEY,
            secretKey: env.MINIO__SECRET_KEY,
        });

        const alp_system_id = env.ALP__SYSTEM_ID;
        const bucketName = `parquetsnapshots-${alp_system_id}`;
        await client.makeBucket(bucketName, env.MINIO__REGION);
        const stream = client.listObjectsV2(bucketName);
        const objects = [];
        await new Promise((resolve, reject) => {
            stream.on("data", (item) => {
                objects.push(item);
            });
            stream.on("end", () => resolve(objects));
            stream.on("error", (err) => {
                this.logger.error(
                    `Error occurred while reading stream from bucket ${bucketName}: ${err}`
                );
                return reject(err);
            });
        });

        const searchString = `^(${schemaName}-${tableName}).*$`;
        const re = new RegExp(searchString);
        const match = objects.find((file) => re.test(file.name));
        if (match) {
            log.debug(`${match}, match found`);
            const readStream = await client.getObject(bucketName, match.name);

            res.setHeader(
                "Content-Disposition",
                "attachment; filename=" + match.name
            );
            res.setHeader("Content-Type", "text/plain");
            readStream.pipe(res);
            return res.status(200);
        }
        return res
            .status(400)
            .send(
                `Parquet not found in table ${tableName} for study ID ${datasetId}`
            );
    } catch (e) {
        log.enrichErrorWithRequestCorrelationID(e, req);
        log.error(e);
        const httpResponse = {
            error: `${e}`,
            message: "Unable to fetch parquet file",
        };
        res.status(500).send(JSON.stringify(httpResponse));
    }
}
