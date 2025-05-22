import d from "../../../../../functions/package.json" assert { type: "json" };
import { global as _global } from "../env.ts";

const envGlobal = JSON.parse(JSON.stringify(_global));
const REQUIRED_URL_SCOPES = [
  ...envGlobal.REQUIRED_URL_SCOPES,
  ...d.trex.functions.scopes,
];
const ROLE_SCOPES = Object.entries(d.trex.functions.roles).reduce(
  (result, [key, value]) => {
    if (key in envGlobal.ROLE_SCOPES) {
      result[key] = [...envGlobal.ROLE_SCOPES[key], ...(value as string[])];
    } else {
      result[key] = value;
    }
    return result;
  },
  { ...envGlobal.ROLE_SCOPES }
);
const PLUGINS_JSON = "{}";

export const global = {
  REQUIRED_URL_SCOPES,
  ROLE_SCOPES,
  PLUGINS_JSON,
};
