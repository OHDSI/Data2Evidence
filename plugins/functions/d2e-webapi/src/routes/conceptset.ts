import { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import {
  ConceptSetCheckDto,
  ConceptSetCheckResponseDto,
  ConceptSetListResponseDto,
  ConceptSetResponseDto,
  ConceptSetItemListDto,
  ConceptSetItemsResponseDto,
  ConceptSetCreateDto,
  ConceptSetInUseErrorDto,
  IConceptSetCheckResponseDto,
} from "../dto/conceptset.ts";
import { ConceptSetInUseError } from "../errors/ConceptSetErrors.ts";

import {
  getConceptSet,
  getConceptSets,
  checkIfConceptSetExists,
  createConceptSet,
  updateConceptSet,
  updateConceptSetItems,
  getConceptSetExpression,
  deleteConceptSet,
} from "../services/conceptset.service.ts";

// deno-lint-ignore require-await
export const conceptset: FastifyPluginAsyncZod = async function (app) {
  app.get(
    "/",
    {
      schema: {
        description: "Get the full list of concept sets in the database",
        tags: ["conceptset"],
        response: { 200: ConceptSetListResponseDto },
        security: [
          {
            bearerAuth: [],
            datasetid: [],
          },
        ],
      },
    },
    async (req, res) => {
      const results = await getConceptSets(req.token, req.datasetId);
      res.send(results);
    }
  );

  app.post(
    "/",
    {
      schema: {
        description: "Save a new concept set to the database",
        body: ConceptSetCreateDto,
        tags: ["conceptset"],
        response: { 200: ConceptSetResponseDto },
        security: [
          {
            bearerAuth: [],
            datasetid: [],
          },
        ],
      },
    },
    async (req, res) => {
      const results = await createConceptSet(
        req.token,
        req.datasetId,
        req.body
      );
      res.send(results);
    }
  );

  app.post(
    "/check",
    {
      schema: {
        description:
          "Checks a concept set for diagnostic problems. At this time, this appears to be an endpoint used to check to see which tags are applied to a concept set.",
        tags: ["conceptset"],
        body: ConceptSetCheckDto,
        response: { 200: ConceptSetCheckResponseDto },
        security: [
          {
            bearerAuth: [],
            datasetid: [],
          },
        ],
      },
    },
    (_req, res) => {
      // TODO: ADD LOGIC
      const dummyresponse: IConceptSetCheckResponseDto = { warnings: [] };
      res.send(dummyresponse);
    }
  );

  app.get(
    "/:id",
    {
      schema: {
        description: "Get the concept set based in the identifier",
        tags: ["conceptset"],
        params: z.object({ id: z.coerce.number() }),
        response: { 200: ConceptSetResponseDto },
        security: [
          {
            bearerAuth: [],
            datasetid: [],
          },
        ],
      },
    },
    async (req, res) => {
      const { id } = req.params;
      const results = await getConceptSet(req.token, req.datasetId, id);
      res.send(results);
    }
  );

  app.put(
    "/:id",
    {
      schema: {
        description: "Updates the concept set for the selected concept set.",
        tags: ["conceptset"],
        params: z.object({ id: z.coerce.number() }),
        body: ConceptSetCreateDto,
        response: { 200: z.boolean() },
        security: [
          {
            bearerAuth: [],
            datasetid: [],
          },
        ],
      },
    },
    async (req, res) => {
      const { id } = req.params;
      const results = await updateConceptSet(
        req.token,
        req.datasetId,
        id,
        req.body
      );
      res.send(results);
    }
  );

  app.get(
    "/:id/exists",
    {
      schema: {
        description:
          "Check if a concept set with the same name exists in the WebAPIdatabase. The name is checked against the selected concept set IDto ensure that only the selected concept set ID has the name specified.",
        tags: ["conceptset"],
        params: z.object({ id: z.coerce.number() }),
        querystring: z.object({ name: z.string() }),
        response: { 200: z.number() },
        security: [
          {
            bearerAuth: [],
            datasetid: [],
          },
        ],
      },
    },
    async (req, res) => {
      const { id } = req.params;
      const { name } = req.query;
      const result = await checkIfConceptSetExists(
        req.token,
        req.datasetId,
        id,
        name
      );
      res.send(result);
    }
  );

  app.get(
    "/:id/expression",
    {
      schema: {
        description: "Get the concept set expression by identifier",
        tags: ["conceptset"],
        params: z.object({ id: z.coerce.number() }),
        response: { 200: ConceptSetItemsResponseDto },
        security: [
          {
            bearerAuth: [],
            datasetid: [],
          },
        ],
      },
    },
    async (req, res) => {
      const result = await getConceptSetExpression(
        req.token,
        req.datasetId,
        req.params.id
      );
      res.send(result);
    }
  );

  app.put(
    "/:id/items",
    {
      schema: {
        description:
          "Update the concept set items for the selected concept set ID in the database.",
        tags: ["conceptset"],
        params: z.object({ id: z.coerce.number() }),
        body: ConceptSetItemListDto,
        response: { 200: z.boolean() },
        security: [
          {
            bearerAuth: [],
            datasetid: [],
          },
        ],
      },
    },
    async (req, res) => {
      const result = await updateConceptSetItems(
        req.token,
        req.datasetId,
        req.params.id,
        req.body
      );
      res.send(result);
    }
  );

  app.delete(
    "/:id",
    {
      schema: {
        description:
          "Delete the concept set by identifier. Returns 409 if concept set is in use by cohort definitions or bookmarks.",
        tags: ["conceptset"],
        params: z.object({ id: z.coerce.number() }),
        response: {
          204: z.null(),
          409: ConceptSetInUseErrorDto,
        },
        security: [
          {
            bearerAuth: [],
            datasetid: [],
          },
        ],
      },
    },
    async (req, res) => {
      const { id } = req.params;
      try {
        await deleteConceptSet(req.token, req.datasetId, id);
        res.status(204).send();
      } catch (error) {
        if (error instanceof ConceptSetInUseError) {
          const cohortCount = error.cohortDefinitions.length;
          const bookmarkCount = error.bookmarks.length;
          const parts = [];
          if (cohortCount > 0)
            parts.push(`${cohortCount} cohort definition(s)`);
          if (bookmarkCount > 0) parts.push(`${bookmarkCount} bookmark(s)`);

          res.status(409).send({
            error: "CONCEPT_SET_IN_USE",
            message: `Cannot delete concept set. Currently used by ${parts.join(
              " and "
            )}.`,
            cohortDefinitions: error.cohortDefinitions,
            bookmarks: error.bookmarks,
          });
          return;
        }
        throw error;
      }
    }
  );
};
