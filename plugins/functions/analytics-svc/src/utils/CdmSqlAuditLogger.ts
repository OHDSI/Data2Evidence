import type { ConnectionInterface } from "../../../_shared/alp-base-utils/src/Connection.ts";
import { env } from "../env.ts";
import {
    CDM_SQL_AUDIT_FILE,
    type AuditEventWriter,
    NdjsonAuditEventWriter,
} from "./AuditEventWriter.ts";

const SQL_METHODS = new Set([
    "execute",
    "executeQuery",
    "executeStreamQuery",
    "executeUpdate",
    "executeBulkUpdate",
    "executeBulkInsert",
    "executeProc",
]);

export type CdmSqlAuditContext = {
    actorId: string;
    requestMethod: string;
    requestPath: string;
    correlationId?: string;
    databaseCode?: string;
    databaseDialect?: string;
    databaseEngine: "hana" | "duckdb";
    schemaName?: string;
};

type CdmSqlExecution = {
    operation: string;
    sql: string;
    parameters: unknown;
    parameterCount: number;
    successful: boolean;
    durationMs: number;
    error?: unknown;
};

type CdmSqlAuditRecorder = {
    record(execution: CdmSqlExecution): Promise<void>;
};

function getErrorDetails(error: unknown): Record<string, string> | undefined {
    if (!error || typeof error !== "object") {
        return undefined;
    }

    const details: Record<string, string> = {};
    const name = (error as { name?: unknown }).name;
    const code = (error as { code?: unknown }).code;
    if (typeof name === "string") {
        details.name = name;
    }
    if (typeof code === "string" || typeof code === "number") {
        details.code = String(code);
    }

    return Object.keys(details).length > 0 ? details : undefined;
}

function countParameters(value: unknown): number {
    if (!Array.isArray(value)) {
        return 0;
    }

    if (value.length > 0 && Array.isArray(value[0])) {
        return value.reduce(
            (count, parameters) =>
                count + (Array.isArray(parameters) ? parameters.length : 0),
            0
        );
    }

    return value.length;
}

function sqlForOperation(
    operation: string,
    value: unknown,
    parameterCount: number
): string {
    const statement = typeof value === "string" ? value : String(value ?? "");
    if (operation !== "executeProc") {
        return statement;
    }

    const placeholders = Array.from(
        { length: parameterCount },
        () => "?"
    ).join(", ");
    return `CALL ${statement}(${placeholders})`;
}

function unwrapParameter(parameter: unknown): unknown {
    if (
        parameter &&
        typeof parameter === "object" &&
        "value" in parameter
    ) {
        return (parameter as { value?: unknown }).value;
    }
    return parameter;
}

function formatSqlLiteral(parameter: unknown): string {
    const value = unwrapParameter(parameter);
    if (value === null || value === undefined) {
        return "NULL";
    }
    if (typeof value === "number" || typeof value === "bigint") {
        return String(value);
    }
    if (typeof value === "boolean") {
        return value ? "TRUE" : "FALSE";
    }
    if (value instanceof Date) {
        return `'${value.toISOString()}'`;
    }
    if (value instanceof Uint8Array) {
        const hex = Array.from(value, (byte) =>
            byte.toString(16).padStart(2, "0")
        ).join("");
        return `X'${hex}'`;
    }

    let stringValue: string;
    if (typeof value === "string") {
        stringValue = value;
    } else {
        try {
            stringValue = JSON.stringify(value) ?? String(value);
        } catch (_error) {
            stringValue = String(value);
        }
    }
    return `'${stringValue.replace(/'/g, "''")}'`;
}

function copyQuotedSegment(
    sql: string,
    start: number,
    quote: "'" | '"' | "`"
): { text: string; next: number } {
    let cursor = start + 1;
    while (cursor < sql.length) {
        if (sql[cursor] === "\\") {
            cursor += 2;
            continue;
        }
        if (sql[cursor] === quote) {
            if (sql[cursor + 1] === quote) {
                cursor += 2;
                continue;
            }
            cursor += 1;
            break;
        }
        cursor += 1;
    }
    return { text: sql.slice(start, cursor), next: cursor };
}

function renderSingleSql(sql: string, parameters: unknown[]): string {
    const output: string[] = [];
    let questionParameterIndex = 0;
    let cursor = 0;

    while (cursor < sql.length) {
        const current = sql[cursor];
        const next = sql[cursor + 1];

        if (current === "'" || current === '"' || current === "`") {
            const segment = copyQuotedSegment(sql, cursor, current);
            output.push(segment.text);
            cursor = segment.next;
            continue;
        }

        if (current === "-" && next === "-") {
            const lineEnd = sql.slice(cursor + 2).search(/[\r\n]/);
            const commentEnd =
                lineEnd < 0 ? sql.length : cursor + 2 + lineEnd;
            output.push(sql.slice(cursor, commentEnd));
            cursor = commentEnd;
            continue;
        }

        if (current === "/" && next === "*") {
            const commentEnd = sql.indexOf("*/", cursor + 2);
            const nextCursor =
                commentEnd < 0 ? sql.length : commentEnd + 2;
            output.push(sql.slice(cursor, nextCursor));
            cursor = nextCursor;
            continue;
        }

        if (current === "$") {
            const delimiterMatch = sql
                .slice(cursor)
                .match(/^\$(?:[a-z_][a-z0-9_]*)?\$/i);
            if (delimiterMatch) {
                const delimiter = delimiterMatch[0];
                const literalEnd = sql.indexOf(
                    delimiter,
                    cursor + delimiter.length
                );
                const nextCursor =
                    literalEnd < 0
                        ? sql.length
                        : literalEnd + delimiter.length;
                output.push(sql.slice(cursor, nextCursor));
                cursor = nextCursor;
                continue;
            }

            const numberedParameter = sql.slice(cursor).match(/^\$(\d+)/);
            if (numberedParameter) {
                const parameterIndex = Number(numberedParameter[1]) - 1;
                if (parameterIndex >= 0 && parameterIndex < parameters.length) {
                    output.push(formatSqlLiteral(parameters[parameterIndex]));
                    cursor += numberedParameter[0].length;
                    continue;
                }
            }
        }

        if (current === "?" && questionParameterIndex < parameters.length) {
            output.push(
                formatSqlLiteral(parameters[questionParameterIndex])
            );
            questionParameterIndex += 1;
            cursor += 1;
            continue;
        }

        output.push(current);
        cursor += 1;
    }

    return output.join("");
}

export function renderSqlWithParameters(
    sql: string,
    parameters: unknown
): string {
    if (!Array.isArray(parameters) || parameters.length === 0) {
        return sql;
    }

    if (Array.isArray(parameters[0])) {
        return parameters
            .map((parameterSet) =>
                renderSingleSql(
                    sql,
                    Array.isArray(parameterSet) ? parameterSet : []
                )
            )
            .join(";\n");
    }

    return renderSingleSql(sql, parameters);
}

async function sha256(value: string): Promise<string> {
    const digest = await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(value)
    );
    return Array.from(new Uint8Array(digest), (byte) =>
        byte.toString(16).padStart(2, "0")
    ).join("");
}

export class CdmSqlAuditLogger implements CdmSqlAuditRecorder {
    public constructor(
        private readonly context: CdmSqlAuditContext,
        private readonly writer: AuditEventWriter = new NdjsonAuditEventWriter()
    ) {}

    public static isEnabled(): boolean {
        return (
            env.IS_CDM_SQL_AUDIT_LOG_ENABLED?.toLowerCase() === "true"
        );
    }

    public async record(execution: CdmSqlExecution): Promise<void> {
        try {
            const completeSql = renderSqlWithParameters(
                execution.sql,
                execution.parameters
            );
            const event: Record<string, unknown> = {
                schemaVersion: 1,
                eventType: "cdm.sql",
                occurredAt: new Date().toISOString(),
                actor: {
                    type: "user",
                    id: this.context.actorId,
                },
                request: {
                    method: this.context.requestMethod,
                    path: this.context.requestPath,
                    correlationId: this.context.correlationId,
                },
                database: {
                    engine: this.context.databaseEngine,
                    dialect: this.context.databaseDialect,
                    code: this.context.databaseCode,
                    schema: this.context.schemaName,
                },
                operation: execution.operation,
                sql: completeSql,
                sqlHash: await sha256(completeSql),
                parameterCount: execution.parameterCount,
                successful: execution.successful,
                durationMs: execution.durationMs,
            };
            const error = getErrorDetails(execution.error);
            if (error) {
                event.error = error;
            }

            await this.writer.append(CDM_SQL_AUDIT_FILE, event);
        } catch (_error) {
            // Audit persistence is fail-open. Never echo SQL, parameters,
            // errors, or request/user data into operational container logs.
            console.error("CDM SQL audit event could not be written");
        }
    }
}

export function createCdmSqlAuditConnection(
    connection: ConnectionInterface,
    context: CdmSqlAuditContext,
    recorder: CdmSqlAuditRecorder = new CdmSqlAuditLogger(context)
): ConnectionInterface {
    if (!CdmSqlAuditLogger.isEnabled()) {
        return connection;
    }

    return new Proxy(connection, {
        get(target, property) {
            const value = Reflect.get(target, property, target);
            if (
                typeof property !== "string" ||
                !SQL_METHODS.has(property) ||
                typeof value !== "function"
            ) {
                return typeof value === "function" ? value.bind(target) : value;
            }

            return (...args: unknown[]) => {
                const startedAt = performance.now();
                const parameters = args[1];
                const parameterCount = countParameters(args[1]);
                const sql = sqlForOperation(
                    property,
                    args[0],
                    parameterCount
                );
                const callbackIndex = args.findIndex(
                    (argument, index) => index >= 2 && typeof argument === "function"
                );
                let completed = false;

                const record = async (
                    successful: boolean,
                    error?: unknown
                ): Promise<void> => {
                    if (completed) {
                        return;
                    }
                    completed = true;
                    const durationMs = Math.max(
                        0,
                        Math.round((performance.now() - startedAt) * 1000) /
                            1000
                    );
                    try {
                        await recorder.record({
                            operation: property,
                            sql,
                            parameters,
                            parameterCount,
                            successful,
                            durationMs,
                            error,
                        });
                    } catch (_error) {
                        console.error(
                            "CDM SQL audit event could not be written"
                        );
                    }
                };

                if (callbackIndex >= 0) {
                    const callback = args[callbackIndex] as (
                        ...callbackArgs: unknown[]
                    ) => unknown;
                    args[callbackIndex] = (...callbackArgs: unknown[]) => {
                        const error = callbackArgs[0];
                        void record(!error, error).finally(() => {
                            callback(...callbackArgs);
                        });
                    };
                }

                try {
                    const result = value.apply(target, args);
                    if (callbackIndex < 0) {
                        if (
                            result &&
                            typeof result === "object" &&
                            "then" in result &&
                            typeof (result as { then?: unknown }).then ===
                                "function"
                        ) {
                            return Promise.resolve(result).then(
                                async (resolved) => {
                                    await record(true);
                                    return resolved;
                                },
                                async (error) => {
                                    await record(false, error);
                                    throw error;
                                }
                            );
                        }
                        void record(true);
                    }
                    return result;
                } catch (error) {
                    void record(false, error);
                    throw error;
                }
            };
        },
    });
}
