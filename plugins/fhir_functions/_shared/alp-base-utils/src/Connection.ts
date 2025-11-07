import { CreateLogger } from "./Logger";

const logger = CreateLogger();
/**
 * type of db parameters
 */
export interface ParameterInterface {
    value: string | number;
    type?: string;
}

/**
 * type of callback used in the connection wrapper
 */
export type CallBackInterface = (err: any, data: any) => any;

/**
 * connection wrapper interface
 */
export interface ConnectionInterface {
    conn: any;
    schemaName: string;
    vocabSchemaName: string;
    dialect: string;
    execute(sql: string, parameters: ParameterInterface[], callback: CallBackInterface, schemaName?: string): void;
    executeQuery(sql: string, parameters: ParameterInterface[], callback: CallBackInterface, schemaName?: string): void;
    executeStreamQuery(sql: string, parameters: ParameterInterface[], callback: CallBackInterface, schemaName?: string): void;
    executeUpdate(sql: string, parameters: ParameterInterface[], callback: CallBackInterface, schemaName?: string): void;
    executeBulkUpdate(sql: string, parameters: ParameterInterface[][], callback: CallBackInterface): void;
    executeBulkInsert(sql: string, parameters: null[][], callback: CallBackInterface): void;
    executeProc(proc: string, parameters: any[], callback: CallBackInterface): void;
    commit(): void;
    parseResults(resultSet: any, identifierMap): any;
    close(): void;
    setCurrentUserToDbSession(user: string, callback: CallBackInterface): void;
    setTemporalSystemTimeToDbSession(systemTime: string, callback: CallBackInterface): void;
    rollback(callback: CallBackInterface): void;
    setAutoCommitToFalse(callback?: CallBackInterface): void;
    getTranslatedSql(sql: string, schemaName: string, parameters: ParameterInterface[]): string;
    activate_nativedb_communication?(credentials: any): void;
    deactivate_nativedb_communication?(dbName: any): void;
}

/**
 * type of object used for stored procedures
 * schema: DB Schema
 * callCommand: Only used for for the old xs db API because there's no way to get run getParameterMetaData w/o specifying the
 *              complete CALL sql statement
 * command: the SP to call
 */
export interface DBCommandInterface {
    schema?: string;
    callCommand?: {
        command: string,
        parameters: any[],
    };
    command: string;

}

/**
 * Converts array of ParameterInterface to a flat array of values
 * @param {Array<ParameterInterface>} parameters - Array of parameters
 */
export function flattenParameter(parameters: ParameterInterface[]) {
    const flatList = [];
    if (parameters) {
        parameters.forEach((p) => {
            flatList.push(p.value === undefined ? null : p.value);
        });
    }
    return flatList;
}


/**
 * DB Constants
 */
export const DBValues = {
    NOVALUE: "NoValue",
    DB_APPUSER_KEY: "APPLICATIONUSER",
    DB_TEMPORAL_SYSTEM_TIME: "TEMPORAL_SYSTEM_TIME_AS_OF",
};


/**
 * Return date in 'yyyy-mm-ddTHH:MM:SS.SSSZ' string format
 * @param {Date} value - Date to be formatted
 * @return {string} formated date - 'yyyy-mm-ddTHH:MM:SS.SSSZ' format
 */
export function formatDate(date: Date) {
    return `${date.getFullYear()}-${padDate((date.getMonth() + 1))}-${padDate(date.getDate())}T` +
        `${padDate(date.getHours())}:${padDate(date.getMinutes())}:${padDate(date.getSeconds())}.${(date.getMilliseconds() / 1000).toFixed(3).slice(2, 5)}Z`;
}

/**
 * format into required 2 digits / Add a zero as a prefix
 * @param {any} value - number or string value
 * @return {string} formatted required digits
 */
function padDate(num: number) {
  if (num < 10) {
    return `0${num}`;
  }
  return num;
}

function escapeRegExp(input) {
  return input.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
}

function replaceAll(input, find, replace) {
  return input.replace(new RegExp(escapeRegExp(find), "g"), replace);
}

function pad(a, b) {
  return (1e15 + a + "").slice(-b);
}
