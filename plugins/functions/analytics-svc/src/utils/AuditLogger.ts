import * as async from "async";
import { Logger, Connection as connLib } from "@alp/alp-base-utils";
import ConnectionInterface = connLib.ConnectionInterface;
import { CDMConfigMetaDataType } from "../types";
import {env} from "../env"
const alpAuditLogger = Logger.CreateLogger("analytics-log");
const AUDITLOG_REQ_CHUNK_SIZE = 10;

let emptyResult: any = {
    sql: "",
    data: [],
    measures: [],
    categories: [],
    totalPatientCount: 0,
};

export class AuditLogger {
    public isConsoleMode: boolean = false;
    private static _instance: AuditLogger;
    private cdmConfigMetaData: CDMConfigMetaDataType;

    private constructor(
        private auditLog: any,
        private ip?: string,
        private user?: string
    ) {
        //nothing to see here
    }

    public withCDMConfigMetaData(cdmConfigMetaData: CDMConfigMetaDataType) {
        this.cdmConfigMetaData = cdmConfigMetaData;
        return this;
    }

    public setIP(ip: string) {
        // console.log("Client IP: " + ip);
        this.ip = ip;
        return this;
    }

    public setUser(user: string) {
        // console.log("User: " + user);
        this.user = user;
        return this;
    }

    private isEnabled() {
        return env.IS_AUDIT_LOG_ENABLED &&
            env.IS_AUDIT_LOG_ENABLED.toLowerCase() === "true"
            ? true
            : false;
    }

    /**
     * Chunks the given data into small chunks and ensures data in each chunk gets logged synchronously.
     *
     * @param objectIdAttribute Name of the Id attribute
     * @param channel Denotes the usecase
     * @param data Actual data
     * @param success Flag which indicates whether to log or not
     * @param callback Callbak function
     * @param excludeAttributes List of attributes to be excluded
     * @param selectedAttributes List of attributes displayed, which will be logged. Only used by Extension usecase.
     */
    public log(
        objectIdAttribute: string,
        channel: string,
        data: any[],
        success: boolean,
        callback,
        excludeAttributes?: string[],
        selectedAttributes?: any[],
        attachment?: { id: string; name: string }
    ) {
        // let st = new Date().getTime();
        // console.log(`# of patients: ${data.length}`);
        // console.log(`Splitting data...`);
        if (Object.keys(this.auditLog).length === 0) {
            alpAuditLogger.warn(
                "AuditLogger.ts: Warning: call to auditlog.log function - audit log disabled."
            );
            return callback(null, "auditlog disabled");
        }
        let chunkArr = this._splitResultByChunkSize(data);
        let tasks = [];
        for (let i in chunkArr) {
            let res = ((i) => {
                let chunk = chunkArr[i];
                tasks.push((callback) => {
                    this.writeFineGrained(
                        objectIdAttribute,
                        channel,
                        chunk,
                        true,
                        (err, data) => {
                            if (err) {
                                callback(err, null);
                            } else {
                                // console.log(`Completed chunk[${i}] ...`);
                                callback(null, data);
                            }
                        },
                        excludeAttributes,
                        selectedAttributes,
                        attachment
                    );
                });
            })(i);
        }
        // console.log(`# of tasks: ${tasks.length}`);
        async.series(tasks, (err, data) => {
            if (err) {
                callback(err, null);
            } else {
                // let et = new Date().getTime();
                // console.log(`Audit logging completed. Time taken: ${(et - st) / 1000}s`);
                callback(null, null);
            }
        });
    }

    /**
     * Logs data in each chunk.
     *
     * @param objectIdAttribute Name of the Id attribute
     * @param channel Denotes the usecase
     * @param data Actual data
     * @param success Flag which indicates whether to log or not
     * @param callback Callbak function
     * @param excludeAttributes List of attributes to be excluded
     * @param selectedAttributes List of attributes displayed, which will be logged. Only used by Extension usecase.
     */
    public async writeFineGrained(
        objectIdAttribute: string,
        channel: string,
        data: any[],
        success: boolean,
        callback,
        excludeAttributes?: string[],
        selectedAttributes?: any[],
        attachment?: { id: string; name: string }
    ) {
        let dataAccessMessage;
        let object_id;
        let dataLength = data.length;
        let attributeExistsForLog: boolean = false;

        let writeLog = (data, idx, attachment?) => {
            object_id = (
                data[objectIdAttribute] instanceof Array
                    ? data[objectIdAttribute][0]
                    : data[objectIdAttribute]
            ).toString();
            const defaultSelectedAttributes = [];
            Object.keys(data).forEach((el) => {
                defaultSelectedAttributes.push({
                    id: el,
                });
            });
            selectedAttributes =
                !selectedAttributes || selectedAttributes.length === 0
                    ? defaultSelectedAttributes
                    : selectedAttributes;
            dataAccessMessage = this.auditLog
                .read({ type: "Patient", id: { key: object_id } })
                .dataSubject({ type: "Patient", id: { key: object_id } })
                .accessChannel(channel)
                .by(this.user);

            if (attachment) {
                //if it is a attachment download
                dataAccessMessage.attachment(attachment);
            }

            selectedAttributes
                .filter((attribute) => {
                    return !(
                        attribute.id === objectIdAttribute ||
                        (excludeAttributes
                            ? excludeAttributes.indexOf(attribute.id) >= 0
                            : false)
                    );
                })
                .forEach((logAttribute, attrIdx) => {
                    if (logAttribute) {
                        try {
                            let logMsg = `${logAttribute.id} (Configuration: ${this.cdmConfigMetaData.id}, Version: ${this.cdmConfigMetaData.version})`;
                            dataAccessMessage.attribute({
                                name: logMsg,
                                successful: success,
                            });
                            attributeExistsForLog = true;
                        } catch (e) {
                            emptyResult.messageKey =
                                "MRI_PA_CHART_NO_DATA_DEFAULT_MESSAGE";
                            emptyResult.messageLevel = "Warning";
                            alpAuditLogger.error(
                                `SECURITY INCIDENT <AuditLogger>! Failed while logging attribute: ${logAttribute.id}; ${e.message}`
                            );
                            callback(
                                new Error(
                                    "ERROR: Please contact your system administrator"
                                ),
                                emptyResult
                            );
                        }
                    }
                });

            if (attributeExistsForLog) {
                //only if a single patient attribute is present in the the data, then it makes sense to log else skip
                alpAuditLogger.audit(dataAccessMessage._content, this.user);
                if (idx === dataLength - 1) {
                    alpAuditLogger.info("Logged patients in Audit log...");
                    callback(null, emptyResult);
                }
            } else {
                callback(null, emptyResult);
            }
        };

        try {
            const isLoggingEnabled = this.isEnabled();

            if (!isLoggingEnabled) {
                return callback(null, emptyResult);
            }

            data.forEach((row, idx) => {
                writeLog(row, idx, attachment);
            });
        } catch (err) {
            return callback(err);
        }
    }

    public static getAuditLogger({
        auditLog,
        auditCredentials,
    }: {
        auditLog?: any;
        auditCredentials?: any;
    }): AuditLogger {
        if (auditLog) {
            this._instance = new AuditLogger(auditLog);
        } else if (!this._instance) {
            this._instance = new AuditLogger({});
        }

        if (auditCredentials) {
            this._instance.isConsoleMode = auditCredentials.logToConsole;
        }
        return this._instance;
    }

    /**
     * Splits the large array into small chunks.
     * @param arr Input array
     * @returns Array of chunks
     */
    private _splitResultByChunkSize(arr) {
        let chunkArr = [];
        for (
            let i = 0, len = arr.length;
            i < len;
            i += AUDITLOG_REQ_CHUNK_SIZE
        ) {
            let tmp = arr.slice(i, i + AUDITLOG_REQ_CHUNK_SIZE);
            // console.log(`chunk[${i}] size: ${tmp.length}`);
            chunkArr.push(tmp);
        }
        // console.log(`chunkArr.length: ${chunkArr.length}`);
        return chunkArr;
    }
}
