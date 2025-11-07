// Strips patch version from cdm version number
// E.g example returns 5.3 if input is 5.3.1
export const parseCdmVersionForOhdsi = (cdmVersion: string): string => {
  return cdmVersion.replace(/(\d+.)(\d+)(.\d+)/gi, "$1$2");
};
