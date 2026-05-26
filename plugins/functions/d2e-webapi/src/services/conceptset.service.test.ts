import { assertEquals, assertRejects } from "@std/assert";

import {
  WEBAPI_CONCEPT_SET_ID_OFFSET,
  encodeWebApiConceptSetId,
  getConceptSetExpression,
  isWebApiConceptSetId,
  mapLegacyConceptSetToWebApiConceptSet,
  mapWebApiConceptSetToFacadeConceptSet,
} from "./conceptset.service.ts";

import { ConceptSetExpressionError } from "../errors/ConceptSetErrors.ts";
import { WebApiConceptSetAPI } from "../api/WebApiConceptSetAPI.ts";
import { PortalServerAPI } from "../api/PortalServerAPI.ts";

Deno.test("encodes native WebAPI concept set ids into a dedicated facade namespace", () => {
  const encodedId = encodeWebApiConceptSetId(42);

  assertEquals(encodedId, WEBAPI_CONCEPT_SET_ID_OFFSET + 42);
  assertEquals(isWebApiConceptSetId(encodedId), true);
  assertEquals(isWebApiConceptSetId(42), false);
});

Deno.test("legacy concept sets remain writable in facade responses", () => {
  const conceptSet = mapLegacyConceptSetToWebApiConceptSet({
    id: 15,
    name: "Legacy set",
    shared: true,
    concepts: [],
    userName: "legacy-owner",
    createdBy: "legacy-owner",
    modifiedBy: "legacy-owner",
    createdDate: "2026-05-01T00:00:00.000Z",
    modifiedDate: "2026-05-02T00:00:00.000Z",
  });

  assertEquals(conceptSet.id, 15);
  assertEquals(conceptSet.hasReadAccess, true);
  assertEquals(conceptSet.hasWriteAccess, true);
  assertEquals(conceptSet.createdBy.name, "legacy-owner");
  assertEquals(conceptSet.shared, true);
  assertEquals(conceptSet.source, "legacy");
});

Deno.test("native WebAPI concept sets are exposed with encoded facade ids", () => {
  const conceptSet = mapWebApiConceptSetToFacadeConceptSet({
    id: 7,
    name: "Native set",
    description: "Stored in OHDSI WebAPI",
    createdBy: {
      id: 9,
      login: "webapi-user",
      name: "WebAPI User",
    },
    modifiedBy: {
      id: 9,
      login: "webapi-user",
      name: "WebAPI User",
    },
    createdDate: 1714521600000,
    modifiedDate: 1714608000000,
    readAccess: true,
    writeAccess: true,
    tags: [],
  });

  assertEquals(conceptSet.id, WEBAPI_CONCEPT_SET_ID_OFFSET + 7);
  assertEquals(conceptSet.hasWriteAccess, true);
  assertEquals(conceptSet.createdBy.name, "WebAPI User");
  assertEquals(conceptSet.createdBy.login, "webapi-user");
  assertEquals(conceptSet.description, "Stored in OHDSI WebAPI");
  assertEquals(conceptSet.shared, false);
  assertEquals(conceptSet.source, "webapi");
});

Deno.test("WebAPI concept set expression resolves sourceStudyId before fetching", async () => {
  const originalGetStudy = PortalServerAPI.prototype.getStudy;
  const originalGetConceptSetExpression = WebApiConceptSetAPI.prototype.getConceptSetExpression;
  let seenSourceKey: string | undefined;

  try {
    PortalServerAPI.prototype.getStudy = () =>
      Promise.resolve({
        id: "cached-dataset-id",
        sourceStudyId: "source-dataset-id",
      } as any);
    WebApiConceptSetAPI.prototype.getConceptSetExpression = (
      _id: number,
      sourceKey: string,
    ) => {
      seenSourceKey = sourceKey;
      return Promise.resolve({
        items: [
          {
            concept: {
              CONCEPT_ID: 1,
              CONCEPT_NAME: "Test Concept",
              STANDARD_CONCEPT: null,
              STANDARD_CONCEPT_CAPTION: "",
              INVALID_REASON: null,
              INVALID_REASON_CAPTION: "",
              CONCEPT_CODE: "123",
              DOMAIN_ID: "Condition",
              VOCABULARY_ID: "SNOMED",
              CONCEPT_CLASS_ID: "Clinical Finding",
              VALID_START_DATE: "2020-01-01",
              VALID_END_DATE: "2099-12-31",
            },
            isExcluded: false,
            includeDescendants: false,
            includeMapped: false,
          },
        ],
      } as any);
    };

    const result = await getConceptSetExpression(
      "token",
      "cached-dataset-id",
      WEBAPI_CONCEPT_SET_ID_OFFSET + 1,
    );

    assertEquals(seenSourceKey, "source-dataset-id");
    assertEquals(result.items.length, 1);
  } finally {
    PortalServerAPI.prototype.getStudy = originalGetStudy;
    WebApiConceptSetAPI.prototype.getConceptSetExpression = originalGetConceptSetExpression;
  }
});

Deno.test("WebAPI concept set expression falls back to datasetId for source datasets", async () => {
  const originalGetStudy = PortalServerAPI.prototype.getStudy;
  const originalGetConceptSetExpression = WebApiConceptSetAPI.prototype.getConceptSetExpression;
  let seenSourceKey: string | undefined;

  try {
    PortalServerAPI.prototype.getStudy = () =>
      Promise.resolve({
        id: "source-dataset-id",
        sourceStudyId: null,
      } as any);
    WebApiConceptSetAPI.prototype.getConceptSetExpression = (
      _id: number,
      sourceKey: string,
    ) => {
      seenSourceKey = sourceKey;
      return Promise.resolve({ items: [] } as any);
    };

    const result = await getConceptSetExpression(
      "token",
      "source-dataset-id",
      WEBAPI_CONCEPT_SET_ID_OFFSET + 1,
    );

    assertEquals(seenSourceKey, "source-dataset-id");
    assertEquals(result.items.length, 0);
  } finally {
    PortalServerAPI.prototype.getStudy = originalGetStudy;
    WebApiConceptSetAPI.prototype.getConceptSetExpression = originalGetConceptSetExpression;
  }
});

Deno.test("WebAPI concept set expression throws ConceptSetExpressionError when source resolution fails", async () => {
  const originalGetStudy = PortalServerAPI.prototype.getStudy;

  try {
    PortalServerAPI.prototype.getStudy = () =>
      Promise.reject(new Error("lookup failed"));

    await assertRejects(
      () =>
        getConceptSetExpression(
          "token",
          "cached-dataset-id",
          WEBAPI_CONCEPT_SET_ID_OFFSET + 1,
        ),
      ConceptSetExpressionError,
      "Failed to resolve source configuration for dataset cached-dataset-id",
    );
  } finally {
    PortalServerAPI.prototype.getStudy = originalGetStudy;
  }
});
