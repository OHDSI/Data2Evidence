/**
 * MCP Server Configuration
 */

export const MCP_SERVER_CONFIG = {
  NAME: "d2e-mcp-server",
  VERSION: "0.2.0",
} as const;

/**
 * External API URLs
 */
export const EXTERNAL_APIS = {
  PHENOTYPE_LIBRARY_COHORTS:
    "https://raw.githubusercontent.com/OHDSI/PhenotypeLibrary/main/inst/Cohorts.csv",
  PHENOTYPE_LIBRARY_COHORT_TEMPLATE: (phenotypeId: number) =>
    `https://raw.githubusercontent.com/OHDSI/PhenotypeLibrary/main/inst/cohorts/${phenotypeId}.json`,
} as const;
