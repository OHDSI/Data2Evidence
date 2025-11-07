// tslint:disable:no-console
import { createGuid } from "./utils";
import winston from "winston";

export enum LOG_LEVEL {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4,
  OFF = 5,
}

/**
 * returns a guid which gets logged in the trace file.
 * This guid is sent to the user when filing a report about the error
 */
export interface ILogger {
  name?: string;
  requestCorrelationID?: string;
  log(level: LOG_LEVEL, msg: string | Error): string;
  error(msg: string | Error): string;
  warn(msg: string | Error): string;
  info(msg: string | Error): string;
  debug(msg: string | Error): string;
  fatal(msg: string | Error): string;
  audit(msg: string | Error, user: string);
  addRequestCorrelationID(req: any);
  enrichErrorWithRequestCorrelationID(err: Error, req: any): Error;
  getRequestCorrelationID(req: any): string;
}

const instances: { [key: string]: ILogger } = {};

const separator = "-------------------------------------------------";

function formatErrorMsg(err: Error): string {
  return `${err.name}
        ${separator}
        ${err.message}
        ${separator}
        ${err.stack}`;
}

let logger: winston.Logger;

export function CreateLogger(
  name: string = "defaultLogger",
  logLevel?: string,
): ILogger {
  logger = winston.createLogger({
    format: winston.format.json(),
    transports: [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
          winston.format.colorize(),
          winston.format.printf(nfo => {
            const timestamp: string = nfo["timestamp"].toString();
            return `[${timestamp}] ${nfo.level}: ${nfo.message} `;
          }),
        ),
        level: logLevel || Deno.env.get("INSIGHTS__LOG_LEVEL"),
      }),
    ],
  });
  return new WinstonLogger(name, logger);
}

export function DisableLogger() {
  this.logger.transports["console.info"].silent = true; // this is for winston logger
}

class WinstonLogger implements ILogger {
  public requestCorrelationID: string;

  constructor(public name: string, public logger: winston.Logger) {}

  private addPrefix(msg) {
    return `${(this.name ? `${this.name}:` : "") || ""} ${
      (this.requestCorrelationID
        ? `[CorrelationID: ${this.requestCorrelationID}]:`
        : "") || ""
    }${msg}`;
  }

  public log(level: LOG_LEVEL, msg: string | Error) {
    const guid = createGuid();
    const errorMsg = this.addPrefix(`[${guid}]: ${msg} `);
    switch (level) {
      case LOG_LEVEL.INFO:
        console.log(errorMsg);
        break;
      case LOG_LEVEL.DEBUG:
        console.debug(errorMsg);
        break;
      case LOG_LEVEL.WARN:
        console.warn(errorMsg);
        break;
      case LOG_LEVEL.ERROR:
      case LOG_LEVEL.FATAL:
      default:
        console.error(errorMsg);
        break;
    }

    return guid;
  }

  public error(msg: string | Error) {
    if (msg instanceof Error) {
      console.error(`${this.addPrefix(msg.stack)}`);
    }
    return this.log(LOG_LEVEL.ERROR, msg);
  }

  public warn(msg: string | Error) {
    return this.log(LOG_LEVEL.WARN, msg);
  }

  public info(msg: string | Error) {
    return this.log(LOG_LEVEL.INFO, msg);
  }

  public debug(msg: string | Error) {
    return this.log(LOG_LEVEL.DEBUG, msg);
  }

  public fatal(msg: string | Error) {
    return this.log(LOG_LEVEL.FATAL, msg);
  }

  public audit(objToLog: any, user: string) {
    console.info(
      JSON.stringify({
        "log-type": "audit",
        "log-source": this.name,
        user,
        msg: objToLog,
      }),
    );
  }

  public addRequestCorrelationID(req: any) {
    this.requestCorrelationID = this.getRequestCorrelationID(req);
  }

  public enrichErrorWithRequestCorrelationID(err: Error, req: any): Error {
    if (err && err.message) {
      err.message = `[CorrelationID: ${this.getRequestCorrelationID(req)}]:${
        err.message
      }`;
    }
    return err;
  }

  public getRequestCorrelationID(req: any): string {
    return req && req.headers
      ? typeof req.headers["x-req-correlation-id"] === "string"
        ? req.headers["x-req-correlation-id"]
        : JSON.stringify(req.headers["x-req-correlation-id"])
      : "";
  }
}
