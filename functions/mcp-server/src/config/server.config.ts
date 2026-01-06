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
export const PHENOTYPE_LIBRARY_COHORT_TEMPLATE = (phenotypeId: number) =>
  `https://raw.githubusercontent.com/data2evidence/d2e-PhenotypeLibrary/main/inst/cohorts/${phenotypeId}.json`;

// Use environment variable or default to Docker container path
export const PHENOTYPE_LIBRARY_COHORTS =
  "/usr/src/plugins/d2ef/mcp-server/data/phenotypes/Cohorts.csv";
