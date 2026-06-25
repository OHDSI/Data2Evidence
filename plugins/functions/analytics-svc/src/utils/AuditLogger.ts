import { Logger } from "@alp/alp-base-utils";
import { CDMConfigMetaDataType } from "../types";
import { env } from "../env";
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
        this.logChunks(
            objectIdAttribute,
            channel,
            data,
            excludeAttributes,
            selectedAttributes,
            attachment
        )
            .then((result) => callback(null, result))
            .catch((err) => callback(err, null));
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
        try {
            const result = await this.writeFineGrainedInternal(
                objectIdAttribute,
                channel,
                data,
                success,
                excludeAttributes,
                selectedAttributes,
                attachment
            );
            callback(null, result);
            return result;
        } catch (err) {
            callback(err);
            throw err;
        }
    }

    private async logChunks(
        objectIdAttribute: string,
        channel: string,
        data: any[],
        excludeAttributes?: string[],
        selectedAttributes?: any[],
        attachment?: { id: string; name: string }
    ) {
        if (Object.keys(this.auditLog).length === 0) {
            alpAuditLogger.warn(
                "AuditLogger.ts: Warning: call to auditlog.log function - audit log disabled."
            );
            return "auditlog disabled";
        }

        const chunkArr = this._splitResultByChunkSize(data);
        for (const chunk of chunkArr) {
            await this.writeFineGrainedInternal(
                objectIdAttribute,
                channel,
                chunk,
                true,
                excludeAttributes,
                selectedAttributes,
                attachment
            );
        }

        // let et = new Date().getTime();
        // console.log(`Audit logging completed. Time taken: ${(et - st) / 1000}s`);
        return null;
    }

    private writeFineGrainedInternal(
        objectIdAttribute: string,
        channel: string,
        data: any[],
        success: boolean,
        excludeAttributes?: string[],
        selectedAttributes?: any[],
        attachment?: { id: string; name: string }
    ) {
        const isLoggingEnabled = this.isEnabled();

        if (!isLoggingEnabled) {
            return emptyResult;
        }

        let attributeExistsForLog = false;
        let attributesToLog = selectedAttributes;
        for (const row of data) {
            const logResult = this.writeLog(
                objectIdAttribute,
                channel,
                row,
                success,
                excludeAttributes,
                attributesToLog,
                attachment,
                attributeExistsForLog
            );
            attributesToLog = logResult.attributesToLog;
            attributeExistsForLog = logResult.attributeExistsForLog;
        }

        if (attributeExistsForLog) {
            alpAuditLogger.info("Logged patients in Audit log...");
        }

        return emptyResult;
    }

    private writeLog(
        objectIdAttribute: string,
        channel: string,
        data: any,
        success: boolean,
        excludeAttributes?: string[],
        selectedAttributes?: any[],
        attachment?: { id: string; name: string },
        attributeExistsForLog: boolean = false
    ) {
        const object_id = (
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
        const attributesToLog =
            !selectedAttributes || selectedAttributes.length === 0
                ? defaultSelectedAttributes
                : selectedAttributes;
        const dataAccessMessage = this.auditLog
            .read({ type: "Patient", id: { key: object_id } })
            .dataSubject({ type: "Patient", id: { key: object_id } })
            .accessChannel(channel)
            .by(this.user);

        if (attachment) {
            //if it is a attachment download
            dataAccessMessage.attachment(attachment);
        }

        const logAttributes = attributesToLog.filter((attribute) => {
            return !(
                attribute.id === objectIdAttribute ||
                (excludeAttributes
                    ? excludeAttributes.indexOf(attribute.id) >= 0
                    : false)
            );
        });

        logAttributes.forEach((logAttribute) => {
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
                    throw new Error(
                        "ERROR: Please contact your system administrator"
                    );
                }
            }
        });

        if (logAttributes.length > 0) {
            //only if a single patient attribute is present in the the data, then it makes sense to log else skip
            alpAuditLogger.audit(dataAccessMessage._content, this.user);
            return { attributesToLog, attributeExistsForLog };
        }

        return { attributesToLog, attributeExistsForLog };
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
