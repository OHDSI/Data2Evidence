import { Constants } from "./Constants";
import { wrapWithQuotes, stringToBoolean } from "./utils";
import * as xsenv from "@sap/xsenv";
import { ProcessEnv } from "./types";
export class EnvVarUtils {
  static envVars: ProcessEnv;

  constructor(envVars: ProcessEnv) {
    EnvVarUtils.envVars = { ...envVars }; // store all environment variables
  }

  public static loadDevSettings() {
    const DEV_SETTINGS_KEY_PREFIX = "advanced_";
    const envVars = EnvVarUtils.envVars;
    for (const k in envVars) {
      if (k.indexOf(DEV_SETTINGS_KEY_PREFIX) > -1) {
        const varName = k.substring(k.indexOf("_") + 1);
        Constants.getInstance().setEnvVar(varName, envVars[k]);
      }
    }
  }

  public static getEnvs() {
    return this.envVars;
  }

  public static getBookmarksTable() {
    return wrapWithQuotes(Constants.getInstance().getEnvVar("bookmarks_table"));
  }

  public static getFreeTextTempTable() {
    return wrapWithQuotes(
      Constants.getInstance().getEnvVar("freetextTempTable"),
    );
  }

  public static getCSVDelimiter() {
    return Constants.getInstance().getEnvVar("csvDelimiter");
  }

  public static getCDWAuditThreshold(): number {
    // if audit threshold is not set in vault, then default value 10 is used
    return +Constants.getInstance().getEnvVar("cdwAuditThreshold") || 10;
  }

  public static isGenomicsEnabled() {
    return stringToBoolean(
      Constants.getInstance().getEnvVar("genomicsEnabled"),
    );
  }

  public static isFilterSummaryVisibled() {
    return stringToBoolean(
      Constants.getInstance().getEnvVar("filterSummaryVisible"),
    );
  }

  public static isGeneSummaryXAxis() {
    return stringToBoolean(
      Constants.getInstance().getEnvVar("geneSummaryXAxis"),
    );
  }

  public static isGeneAlterationXAxis() {
    return stringToBoolean(
      Constants.getInstance().getEnvVar("geneAlterationXAxis"),
    );
  }

  public static isGeneAlterationCategory() {
    return stringToBoolean(
      Constants.getInstance().getEnvVar("geneAlterationCategory"),
    );
  }

  public static isCDWValidationEnabled() {
    return stringToBoolean(
      Constants.getInstance().getEnvVar("cdwValidationEnabled"),
    );
  }

  public isStageLocalDev = () => {
    return Deno.env.get("NODE_ENV") === "development";
  };

  public isTestEnv = () => {
    return (
      EnvVarUtils.envVars.isTestEnv && EnvVarUtils.envVars.isTestEnv === "true"
    );
  };

  public isHttpTestRun = () => {
    return (
      EnvVarUtils.envVars.isTestEnv &&
      EnvVarUtils.envVars.isHttpTestRun === "true"
    );
  };

  public getEnvFile = path => {
    return EnvVarUtils.envVars.ENVFILE ? EnvVarUtils.envVars.ENVFILE : path;
  };

  public isAppFrozen() {
    return stringToBoolean(EnvVarUtils.envVars.FROZEN);
  }

  public static getAnalyticsConnectionParameters(metadataKey: any) {
    const analyticsCredentials = xsenv.cfServiceCredentials(metadataKey);

    if (analyticsCredentials) {
      return analyticsCredentials;
    } else {
      throw new Error(
        "Analytics connection details unavailable in Environment!",
      );
    }
  }
}
