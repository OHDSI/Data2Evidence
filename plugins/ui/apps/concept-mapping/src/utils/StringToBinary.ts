import pako from "pako";

export default (stringToConvert: string): string => window.btoa(pako.deflate(stringToConvert, { to: "string" }));
