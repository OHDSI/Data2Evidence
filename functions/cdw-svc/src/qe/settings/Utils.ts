import * as Defaults from "./Defaults";

export function cloneJson(json) {
    return JSON.parse(JSON.stringify(json));
}

export function extend(obj, def) {
    const res = cloneJson(obj || {});
    for (const prop in def || {}) {
        if (!res.hasOwnProperty(prop)) {
            res[prop] = def[prop];
        }
    }
    return res;
}

export function parseDbObjectName(dbObject: string): { schema?: string; tableName: string } {
    const result = Defaults.hanaSchemaTableRegex().exec(dbObject);

    // result returns 5 groups
    // 0 - full match
    // 1 - schema with the dot
    // 2 - schema without quotes
    // 3 - schema with quotes
    // 4 - table/view name

    if (result.length !== 5) {
        return {
            schema: "",
            tableName: "",
        };
    }

    let schema = "";
    let tableName = "";

    if (typeof result[2] === "string") {
        schema = result[2];
    } else if (typeof result[3] === "string") {
        schema = result[3].replace(/^"(.*)"$/, `$1`);
    }

    if (typeof result[4] === "string") {
        tableName = result[4].replace(/^"(.*)"$/, `$1`);
    }

    return {
        schema,
        tableName,
    };
}

export function isValidHanaObjectName(dbObject: string): boolean {
    return Defaults.hanaSchemaTableRegex().test(dbObject);
}

export function isSchemaAllowed(schema: string): boolean {
    if (schema.match(/^(_SYS|SYS|SYSTEM|HANA_XS_BASE)(?!_BIC$)/gi)) {
        return false;
    } else {
        return true;
    }
}

export function getDatasetIdFromConfig(config: CDMConfigType): string {
  const datasetId = config.advancedSettings.settings.datasetId;
  return datasetId ? datasetId : "DEFAULT";
}
