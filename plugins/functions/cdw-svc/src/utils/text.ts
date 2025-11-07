import * as utils from "./utils";
let _texts = null;

export function get(key, locale?) {
  return getWithPackage(key, "pa.services.i18n", locale);
}

export function getWithPackage(key, packageName, locale?) {
  if (utils.isXS2()) {
    return key;
  }
}
