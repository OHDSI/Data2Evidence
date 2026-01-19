import { z } from "zod";

// ==================== Type Definitions ====================

/**
 * Cohort data for list operations
 */
export interface CohortData {
  cohortId: string;
  cohortName: string;
  cohortDescription: string;
}

/**
 * D2E Cohort Definition
 * Matches CohortDefinitionResponseDto from d2e-webapi
 */
export interface D2ECohortDefinition {
  id: number;
  name: string;
  description: string | null;
  expressionType: string;
  expression: any;
  createdBy: string | null;
  createdDate: number | null;
  modifiedBy?: string | null;
  modifiedDate?: number | null;
  tags: string[];
  hasWriteAccess?: boolean;
  hasReadAccess?: boolean;
}

/**
 * Phenotype data from OHDSI Phenotype Library
 */
export interface PhenotypeData {
  cohortId: string;
  cohortName: string;
  // cohortNameFormatted: string;  // Removed but can be added back if needed
  // cohortNameLong: string;
  // logicDescription: string;
}

/**
 * Request payload for creating cohort definition
 */
export interface CreateCohortDefinitionRequest {
  expression: any;
  cohortInfo: string;
}

/**
 * Request payload for updating cohort definition
 */
export interface UpdateCohortDefinitionRequest {
  cohortId: number;
  name: string;
  description: string;
  createdBy: string | null;
  createdDate: number | null;
  expression: any;
}

/**
 * Validation result from D2E WebAPI
 */
export interface ValidationResult {
  warnings: Array<{
    type: string;
    message: string;
    severity?: string;
  }>;
  isValid?: boolean;
}

// ==================== Cohort Management Tool Schemas ====================

export const GetCohortIdNameListInput = {
  cohortInfo: z
    .string()
    .describe("The cohort description extracted from user query"),
};

export const GetCohortDefinitionInput = {
  cohortId: z.number().describe("The cohort ID to retrieve"),
};

export const CreateCohortDefinitionInput = {
  cohortDefinitionExpression: z
    .any()
    .describe(
      "The validated ATLAS cohort definition JSON including concept sets and expression"
    ),
  cohortInfo: z.string().describe("The cohort description"),
  isValidCohortDefinition: z
    .boolean()
    .describe(
      "Must be true. Set after validating with validate_atlas_cohort_definition tool"
    )
    .default(false),
};

export const UpdateCohortDefinitionInput = {
  cohortDefinitionExpression: z
    .any()
    .describe(
      "The validated ATLAS cohort definition JSON including concept sets and expression"
    ),
  isValidCohortDefinition: z
    .boolean()
    .describe("Set after validating with validate_atlas_cohort_definition tool")
    .default(false),
  cohortId: z.number().describe("The cohort ID to update"),
  cohortDescription: z.string().describe("The cohort description to update"),
};

export const DeleteCohortDefinitionInput = {
  cohortId: z.number().describe("The cohort ID to delete"),
};

// ==================== Phenotype Library Tool Schemas ====================

export const SearchPhenotypeLibraryInput = {};

export const FetchTemplatesInput = {
  phenotypeId: z
    .number()
    .describe("Most relevant phenotype ID to use as template examples"),
  userCohortDescription: z
    .string()
    .describe("The user's description of the cohort they want to create"),
};

// ==================== Validation Tool Schemas ====================

export const ValidateCohortDefinitionInput = {
  cohortDefinitionExpression: z
    .any()
    .describe(
      "Atlas cohort definition in json to be validated, include concept sets and expression"
    ),
  userName: z.string().describe("User name creating/updating the cohort"),
};

// ==================== Instruction Tool Schemas ====================

export const CohortInstructionInput = {
  cohortDescription: z
    .string()
    .describe("User's description of the desired cohort"),
};

// ==================== Output Schemas ====================

export const CohortIdNameOutput = z.object({
  cohortId: z.string(),
  cohortName: z.string(),
  cohortDescription: z.string(),
});
