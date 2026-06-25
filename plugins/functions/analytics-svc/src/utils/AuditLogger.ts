import { Logger } from "@alp/alp-base-utils";
import type { CDMConfigMetaDataType } from "../types";
import { env } from "../env";
const alpAuditLogger = Logger.CreateLogger("analytics-log");
const AUDITLOG_REQ_CHUNK_SIZE = 10;

type AuditAttachment = { id: string; name: string };
type AuditLogResult = QueryObjectResult | "auditlog disabled" | null;
type AuditCredentials = { logToConsole?: boolean };
type AuditPatientRef = { type: "Patient"; id: { key: string } };
type AuditRow = Record<string, unknown>;
type AuditSelectedAttribute = { id: string };
type AuditDataAccessAttribute = { name: string; successful: boolean };
type AuditLogLike = Partial<{
    read(ref: AuditPatientRef): AuditDataAccessMessage;
}>;

type AuditDataAccessMessage = {
    _content: unknown;
    dataSubject(ref: AuditPatientRef): AuditDataAccessMessage;
    accessChannel(channel: string): AuditDataAccessMessage;
    by(user?: string): AuditDataAccessMessage;
    attachment(attachment: AuditAttachment): AuditDataAccessMessage;
    attribute(attribute: AuditDataAccessAttribute): AuditDataAccessMessage;
};

type QueryObjectResult = {
    sql: string;
    data: unknown[];
    measures: unknown[];
    categories: unknown[];
    totalPatientCount: number;
    messageKey?: string;
    messageLevel?: "Warning";
};

type WriteLogResult = {
    attributesToLog: AuditSelectedAttribute[];
    attributeExistsForLog: boolean;
};

const emptyResult: QueryObjectResult = {
    sql: "",
    data: [],
    measures: [],
    categories: [],
    totalPatientCount: 0,
};

export class AuditLogger {
    private _isConsoleMode?: boolean = false;
    private static _instance: AuditLogger;
    private _cdmConfigMetaData: CDMConfigMetaDataType;

    private constructor(
        private _auditLog: AuditLogLike,
        private _ip?: string,
        private _user?: string
    ) {
        //nothing to see here
    }

    public withCDMConfigMetaData(cdmConfigMetaData: CDMConfigMetaDataType) {
        this._cdmConfigMetaData = cdmConfigMetaData;
        return this;
    }

    public setIP(ip: string) {
        // console.log("Client IP: " + ip);
        this._ip = ip;
        return this;
    }

    public setUser(user: string) {
        // console.log("User: " + user);
        this._user = user;
        return this;
    }

    private _isEnabled() {
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
     * @param excludeAttributes List of attributes to be excluded
     * @param selectedAttributes List of attributes displayed, which will be logged. Only used by Extension usecase.
     */
    public async log(
        objectIdAttribute: string,
        channel: string,
        data: AuditRow[],
        _success: boolean,
        excludeAttributes?: string[],
        selectedAttributes?: AuditSelectedAttribute[],
        attachment?: AuditAttachment
    ): Promise<AuditLogResult> {
        // let st = new Date().getTime();
        // console.log(`# of patients: ${data.length}`);
        // console.log(`Splitting data...`);
        return await this._logChunks(
            objectIdAttribute,
            channel,
            data,
            excludeAttributes,
            selectedAttributes,
            attachment
        );
    }

    private async _logChunks(
        objectIdAttribute: string,
        channel: string,
        data: AuditRow[],
        excludeAttributes?: string[],
        selectedAttributes?: AuditSelectedAttribute[],
        attachment?: AuditAttachment
    ): Promise<AuditLogResult> {
        if (Object.keys(this._auditLog).length === 0) {
            alpAuditLogger.warn(
                "AuditLogger.ts: Warning: call to auditlog.log function - audit log disabled."
            );
            return "auditlog disabled";
        }

        const chunkArr = this._splitResultByChunkSize(data);
        for (const chunk of chunkArr) {
            await this._writeRows(
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

    private _writeRows(
        objectIdAttribute: string,
        channel: string,
        data: AuditRow[],
        success: boolean,
        excludeAttributes?: string[],
        selectedAttributes?: AuditSelectedAttribute[],
        attachment?: AuditAttachment
    ) {
        const isLoggingEnabled = this._isEnabled();

        if (!isLoggingEnabled) {
            return emptyResult;
        }

        let attributeExistsForLog = false;
        let attributesToLog = selectedAttributes;
        for (const row of data) {
            const logResult = this._writeLog(
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

    private _writeLog(
        objectIdAttribute: string,
        channel: string,
        data: AuditRow,
        success: boolean,
        excludeAttributes?: string[],
        selectedAttributes?: AuditSelectedAttribute[],
        attachment?: AuditAttachment,
        attributeExistsForLog: boolean = false
    ): WriteLogResult {
        const object_id = (
            (data[objectIdAttribute] instanceof Array
                ? data[objectIdAttribute][0]
                : data[objectIdAttribute]) as { toString(): string }
        ).toString();
        const defaultSelectedAttributes: AuditSelectedAttribute[] = [];
        Object.keys(data).forEach((el) => {
            defaultSelectedAttributes.push({
                id: el,
            });
        });
        const attributesToLog =
            !selectedAttributes || selectedAttributes.length === 0
                ? defaultSelectedAttributes
                : selectedAttributes;
        const dataAccessMessage = (
            this._auditLog as {
                read(ref: AuditPatientRef): AuditDataAccessMessage;
            }
        )
            .read({ type: "Patient", id: { key: object_id } })
            .dataSubject({ type: "Patient", id: { key: object_id } })
            .accessChannel(channel)
            .by(this._user);

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
                    const logMsg = `${logAttribute.id} (Configuration: ${this._cdmConfigMetaData.id}, Version: ${this._cdmConfigMetaData.version})`;
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
            alpAuditLogger.audit(
                dataAccessMessage._content as string | Error,
                this._user
            );
            return { attributesToLog, attributeExistsForLog };
        }

        return { attributesToLog, attributeExistsForLog };
    }

    public static getAuditLogger({
        auditLog,
        auditCredentials,
    }: {
        auditLog?: AuditLogLike;
        auditCredentials?: AuditCredentials;
    }): AuditLogger {
        if (auditLog) {
            this._instance = new AuditLogger(auditLog);
        } else if (!this._instance) {
            this._instance = new AuditLogger({});
        }

        if (auditCredentials) {
            this._instance._isConsoleMode = auditCredentials.logToConsole;
        }
        return this._instance;
    }

    /**
     * Splits the large array into small chunks.
     * @param arr Input array
     * @returns Array of chunks
     */
    private _splitResultByChunkSize(arr: AuditRow[]): AuditRow[][] {
        const chunkArr = [];
        for (
            let i = 0, len = arr.length;
            i < len;
            i += AUDITLOG_REQ_CHUNK_SIZE
        ) {
            const tmp = arr.slice(i, i + AUDITLOG_REQ_CHUNK_SIZE);
            // console.log(`chunk[${i}] size: ${tmp.length}`);
            chunkArr.push(tmp);
        }
        // console.log(`chunkArr.length: ${chunkArr.length}`);
        return chunkArr;
    }
}
