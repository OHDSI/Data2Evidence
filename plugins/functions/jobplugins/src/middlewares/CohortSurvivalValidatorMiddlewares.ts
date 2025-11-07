import { body } from "express-validator";

// Validation rules for CohortSurvivalFlowRunOptions
export const validateCohortSurvivalFlowRunDto = () => [
  body("options.databaseCode")
    .isString()
    .withMessage("databaseCode must be a string"),
  body("options.schemaName")
    .isString()
    .withMessage("schemaName must be a string"),
  body("options.datasetId")
    .isString()
    .withMessage("datasetId must be a string"),
  body("options.targetCohortDefinitionId")
    .isNumeric()
    .withMessage("targetCohortDefinitionId must be a number"),
  body("options.outcomeCohortDefinitionId")
    .isNumeric()
    .withMessage("outcomeCohortDefinitionId must be a number"),
  body("options.analysisType")
    .optional()
    .isString()
    .withMessage("analysisType must be a string")
    .isIn(["single_event", "competing_risk"])
    .withMessage(
      "analysisType must be either 'single_event' or 'competing_risk'"
    ),
  body("options.competingOutcomeCohortDefinitionId")
    .optional()
    .isNumeric()
    .withMessage("competingOutcomeCohortDefinitionId must be a number")
    .custom((value, { req }) => {
      // If analysis type is competing_risk, competingOutcomeCohortDefinitionId is required
      if (req.body.options.analysisType === "competing_risk" && !value) {
        throw new Error(
          "competingOutcomeCohortDefinitionId is required for competing_risk analysis"
        );
      }
      return true;
    }),
  body("options.strataCohorts")
    .optional()
    .isArray()
    .withMessage("strataCohorts must be an array")
    .custom((value) => {
      // Check if each item in the array is an object with id and name properties
      if (
        !value.every(
          (item) =>
            typeof item === "object" &&
            item !== null &&
            "id" in item &&
            "name" in item
        )
      ) {
        throw new Error(
          "Each item in strataCohorts must be an object with id and name properties"
        );
      }
      return true;
    }),
];
