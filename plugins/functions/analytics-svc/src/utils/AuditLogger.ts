import { Logger, getUser } from "@alp/alp-base-utils";
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
type AuditLoggerCreateOptions = {
    auditLog?: AuditLogLike;
    auditCredentials?: AuditCredentials;
    cdmConfigMetaData?: CDMConfigMetaDataType;
    ip?: string;
    request?: unknown;
    user?: string;
};
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

function getRequestHeaders(req?: unknown): Record<string, unknown> | undefined {
    if (!req || typeof req !== "object" || !("headers" in req)) {
        return undefined;
    }

    const headers = (req as { headers?: unknown }).headers;
    if (!headers || typeof headers !== "object") {
        return undefined;
    }

    return headers as Record<string, unknown>;
}

export function getAuditUserIdFromRequest(req?: unknown): string | undefined {
    const headers = getRequestHeaders(req);
    if (!headers?.authorization) {
        return undefined;
    }

    try {
        return getUser({ headers } as never).getUser();
    } catch (_err) {
        return undefined;
    }
}

export class AuditLogger {
    private _isConsoleMode?: boolean = false;
    private _auditLog: AuditLogLike;
    private _cdmConfigMetaData?: CDMConfigMetaDataType;
    private _ip?: string;
    private _user?: string;

    private constructor({
        auditLog = {},
        auditCredentials,
        cdmConfigMetaData,
        ip,
        request,
        user,
    }: AuditLoggerCreateOptions) {
        this._auditLog = auditLog;
        this._isConsoleMode = auditCredentials?.logToConsole;
        this._cdmConfigMetaData = cdmConfigMetaData;
        this._ip = ip;
        this._user = user ?? getAuditUserIdFromRequest(request);
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
                    const logMsg = `${logAttribute.id} (Configuration: ${this._cdmConfigMetaData?.id}, Version: ${this._cdmConfigMetaData?.version})`;
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

    public static create(options: AuditLoggerCreateOptions = {}): AuditLogger {
        return new AuditLogger(options);
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
