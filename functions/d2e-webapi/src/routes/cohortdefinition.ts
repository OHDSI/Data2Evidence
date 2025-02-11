import { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import {
  CohortDefinitionResponseDto,
  CohortDefinitionSqlDto,
  CohortDefinitionSqlResponseDto,
  CohortDefinitionIdVersionResponseDto,
  CohortDefinitionIdInfoResponseDto,
  CohortDefinitionDto,
  CohortDefinitionCheckV2ResponseDto,
  CohortDefinitionCreateResponseDto,
  CohortDefinitionCopyResponseDto,
  CohortDefinitionPutResponseDto,
  GenerateCohortResponseDto,
} from "../dto/cohortdefinition.ts";
import {
  createCohortDefinition,
  generateCohort,
} from "../services/cohortdefinition.service.ts";

// deno-lint-ignore require-await
export const cohortdefinition: FastifyPluginAsyncZod = async function (app) {
  // TODO: Placeholder, to update router

  app.get(
    "/",
    {
      schema: {
        description:
          "Returns metadata about all cohort definitions in the database",
        tags: ["cohortdefinition"],
        response: { 200: CohortDefinitionResponseDto },
      },
    },
    (_req, res) => {
      // TODO: ADD  LOGIC
      const dummyresponse = [
        {
          id: 98149,
          name: "Humira + MI",
          createdDate: 1489065125084,
          hasWriteAccess: false,
          hasReadAccess: false,
          tags: [],
        },
        {
          id: 101431,
          name: "Vinci Type 2 Diabetes",
          description:
            "This definition is based on the PheKB Diabetes definition found at https://phekb.org/phenotype/type-2-diabetes-mellitus",
          createdDate: 1490910390379,
          modifiedDate: 1490910408053,
          hasWriteAccess: false,
          hasReadAccess: false,
          tags: [],
        },
      ];
      res.send(dummyresponse);
    }
  );

  app.post(
    "/",
    {
      schema: {
        description: "Creates a cohort definition in the database.",
        tags: ["cohortdefinition"],
        body: CohortDefinitionDto,
        response: { 200: CohortDefinitionCreateResponseDto },
      },
    },
    async (req, res) => {
      const result = await createCohortDefinition(
        req.token,
        req.datasetId,
        req.body
      );
      res.send(result);
    }
  );

  app.post(
    "/sql",
    {
      schema: {
        description: "Returns OHDSI template SQL for a given cohort definition",
        tags: ["cohortdefinition"],
        body: CohortDefinitionSqlDto,
        response: { 200: CohortDefinitionSqlResponseDto },
      },
    },
    (_req, res) => {
      // TODO: ADD  LOGIC
      res.send({ tempplateSql: "dummy response" });
    }
  );

  app.put(
    "/:id",
    {
      schema: {
        description: "Saves the cohort definition for the given id.",
        tags: ["cohortdefinition"],
        params: z.object({ id: z.number() }),
        body: CohortDefinitionDto,
        response: { 200: CohortDefinitionPutResponseDto },
      },
    },
    (_req, res) => {
      const dummyresponse = {
        id: 1791729,
        name: "Awful diabetes",
        createdDate: 1737138222515,
        modifiedDate: 1737620825277,
        hasWriteAccess: false,
        hasReadAccess: false,
        tags: [],
        expressionType: "SIMPLE_EXPRESSION",
        expression: {
          cdmVersionRange: ">=5.0.0",
          PrimaryCriteria: {
            CriteriaList: [],
            ObservationWindow: {
              PriorDays: 0,
              PostDays: 0,
            },
            PrimaryCriteriaLimit: {
              Type: "First",
            },
          },
          ConceptSets: [
            {
              id: 0,
              name: "A1C trial",
              expression: {
                items: [
                  {
                    concept: {
                      CONCEPT_ID: 4184637,
                      CONCEPT_NAME: "Hemoglobin A1c measurement",
                      STANDARD_CONCEPT: "S",
                      STANDARD_CONCEPT_CAPTION: "Standard",
                      INVALID_REASON: "V",
                      INVALID_REASON_CAPTION: "Valid",
                      CONCEPT_CODE: "43396009",
                      DOMAIN_ID: "Measurement",
                      VOCABULARY_ID: "SNOMED",
                      CONCEPT_CLASS_ID: "Procedure",
                    },
                    isExcluded: false,
                    includeDescendants: true,
                    includeMapped: false,
                  },
                ],
              },
            },
            {
              id: 1,
              name: "Test",
              expression: {
                items: [
                  {
                    concept: {
                      CONCEPT_ID: 3037958,
                      CONCEPT_NAME:
                        "Deprecated Testosterone.bioavailable+Free/Testosterone.total in Serum or Plasma",
                      STANDARD_CONCEPT: "N",
                      STANDARD_CONCEPT_CAPTION: "Non-Standard",
                      INVALID_REASON: "U",
                      INVALID_REASON_CAPTION: "Invalid",
                      CONCEPT_CODE: "41869-9",
                      DOMAIN_ID: "Measurement",
                      VOCABULARY_ID: "LOINC",
                      CONCEPT_CLASS_ID: "Lab Test",
                    },
                    isExcluded: false,
                    includeDescendants: false,
                    includeMapped: false,
                  },
                  {
                    concept: {
                      CONCEPT_ID: 1019874,
                      CONCEPT_NAME:
                        "Testosterone.bioavailable+Free/Testosterone.total",
                      STANDARD_CONCEPT: "N",
                      STANDARD_CONCEPT_CAPTION: "Non-Standard",
                      INVALID_REASON: "V",
                      INVALID_REASON_CAPTION: "Valid",
                      CONCEPT_CODE: "LP287194-7",
                      DOMAIN_ID: "Observation",
                      VOCABULARY_ID: "LOINC",
                      CONCEPT_CLASS_ID: "LOINC Component",
                    },
                    isExcluded: false,
                    includeDescendants: false,
                    includeMapped: false,
                  },
                ],
              },
            },
          ],
          QualifiedLimit: {
            Type: "First",
          },
          ExpressionLimit: {
            Type: "First",
          },
          InclusionRules: [],
          CensoringCriteria: [],
          CollapseSettings: {
            CollapseType: "ERA",
            EraPad: 0,
          },
          CensorWindow: {},
        },
      };

      res.status(200).send(dummyresponse);
    }
  );

  app.delete(
    "/:id",
    {
      schema: {
        description: "Deletes the specified cohort definition",
        tags: ["cohortdefinition"],
        params: z.object({ id: z.number() }),
        response: { 204: z.null() },
      },
    },
    (_req, res) => {
      // TODO: ADD  LOGIC
      res.status(204).send();
    }
  );

  app.get(
    "/:id/copy",
    {
      schema: {
        description: "Copies the specified cohort definition.",
        tags: ["cohortdefinition"],
        params: z.object({ id: z.number() }),
        response: {
          200: CohortDefinitionCopyResponseDto,
        },
      },
    },
    (_req, res) => {
      // TODO: ADD  LOGIC
      const dummyresponse = {
        id: 1791707,
        name: "COPY OF test cohort definition2r1212r",
        createdDate: 1737606795581,
        hasWriteAccess: false,
        hasReadAccess: false,
        expressionType: "SIMPLE_EXPRESSION",
        expression: {
          cdmVersionRange: ">=5.0.0",
          PrimaryCriteria: {
            CriteriaList: [],
            ObservationWindow: {
              PriorDays: 0,
              PostDays: 0,
            },
            PrimaryCriteriaLimit: {
              Type: "First",
            },
          },
          ConceptSets: [],
          QualifiedLimit: {
            Type: "First",
          },
          ExpressionLimit: {
            Type: "First",
          },
          InclusionRules: [],
          CensoringCriteria: [],
          CollapseSettings: {
            CollapseType: "ERA",
            EraPad: 0,
          },
          CensorWindow: {},
        },
      };
      res.status(200).send(dummyresponse);
    }
  );

  app.get(
    "/:id/info",
    {
      schema: {
        description: "Returns a list of cohort generation info objects.",
        tags: ["cohortdefinition"],
        params: z.object({ id: z.number() }),
        response: { 200: CohortDefinitionIdInfoResponseDto },
      },
    },
    (_req, res) => {
      // TODO: ADD  LOGIC
      const dummyresponse = [
        {
          id: {
            cohortDefinitionId: 1791707,
            sourceId: 6,
          },
          startTime: 1737611966883,
          executionDuration: 2246,
          status: "COMPLETE",
          isValid: true,
          isCanceled: false,
          failMessage: null,
          personCount: 0,
          recordCount: 0,
          createdBy: null,
        },
        {
          id: {
            cohortDefinitionId: 1791707,
            sourceId: 7,
          },
          startTime: 1737138508761,
          executionDuration: 622,
          status: "COMPLETE",
          isValid: false,
          isCanceled: false,
          failMessage:
            "org.springframework.jdbc.BadSqlGrammarException: StatementCallback; bad SQL grammar [DELETE FROM synpuf5pct_results.cohort_inclusion WHERE cohort_definition_id = 1791707]; nested exception is org.postgresql.util.PSQLException: ERROR: permission denied for table cohort_inclusion",
          personCount: null,
          recordCount: null,
          createdBy: null,
        },
      ];
      res.status(200).send(dummyresponse);
    }
  );

  app.get(
    "/:id/version",
    {
      schema: {
        description: "Get list of versions of Cohort Definition",
        tags: ["cohortdefinition"],
        params: z.object({ id: z.number() }),
        response: { 200: CohortDefinitionIdVersionResponseDto },
      },
    },
    (_req, res) => {
      // TODO: ADD  LOGIC
      const dummyresult = [
        {
          assetId: 1791707,
          version: 1,
          archived: false,
          createdDate: 1737488670477,
        },
      ];

      res.send(dummyresult);
    }
  );

  app.post(
    "/checkV2",
    {
      schema: {
        description: `Checks the cohort definition for logic issues. <br>
          This method runs a series of logical checks on a cohort definition and returns the set of warning, info and error messages. <br> 
          This method is similar to /check except this method accepts a ChortDTO which includes tags.`,
        tags: ["cohortdefinition"],
        body: CohortDefinitionDto,
        response: { 200: CohortDefinitionCheckV2ResponseDto },
      },
    },
    (_req, res) => {
      // TODO: ADD  LOGIC
      const dummyresult = {
        warnings: [
          {
            type: "DefaultWarning",
            severity: "WARNING",
            message:
              "Tags - no assigned tags from mandatory groups [Prod_Group]",
          },
          {
            type: "ConceptSetWarning",
            severity: "WARNING",
            message: 'Concept Set "[blkrudolph] hospitalization" is not used',
            conceptSetId: 0,
          },
          {
            type: "ConceptSetWarning",
            severity: "WARNING",
            message: 'Concept Set "[blkrudolph] Emergency Room" is not used',
            conceptSetId: 1,
          },
          {
            type: "DefaultWarning",
            severity: "CRITICAL",
            message: "Inclusion rule No warfarin exposure.",
          },
          {
            type: "DefaultWarning",
            severity: "WARNING",
            message:
              ' "all events" are selected and cohort exit criteria has not been specified',
          },
          {
            type: "DefaultWarning",
            severity: "INFO",
            message:
              "It's not specified what type of records to look for in condition occurrence at initial event",
          },
        ],
      };

      res.send(dummyresult);
    }
  );

  app.get(
    "/:id/exists",
    {
      schema: {
        description: `Check that a cohort exists. <br>
                      This method checks to see if a cohort definition name exists. The id parameter is used to 'ignore' a cohort definition from checking. This is
                      used when you have an existing cohort definition which should be ignored
                      when checking if the name already exists.`,
        tags: ["cohortdefinition"],
        params: z.object({ id: z.number() }),
        querystring: z.object({ name: z.string() }),
        response: { 200: z.number() },
      },
    },
    (req, res) => {
      // select count(cd) from CohortDefinition AS cd WHERE cd.name = :name and cd.id <> :id
      // TODO: ADD  LOGIC
      console.log(req.query.name);
      console.log(req.params.id);

      res.send(1);
    }
  );

  app.get(
    "/:id/generate/:sourceKey",
    {
      schema: {
        description: `Queues up a generate cohort task for the specified cohort definition id.`,
        tags: ["cohortdefinition"],
        params: z.object({ id: z.coerce.number(), sourceKey: z.string() }),
        response: { 200: GenerateCohortResponseDto },
      },
    },
    async (req, res) => {
      const { id } = req.params;
      const result = await generateCohort(req.token, req.datasetId, id);

      res.send(result);
    }
  );
};
