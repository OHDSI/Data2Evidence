import { assertEquals, assertThrows } from "@std/assert";

import {
  LEGACY_CONCEPT_SET_FORBIDDEN_MESSAGE,
  WEBAPI_CONCEPT_SET_ID_OFFSET,
  assertConceptSetWritable,
  encodeWebApiConceptSetId,
  isWebApiConceptSetId,
  mapLegacyConceptSetToWebApiConceptSet,
  mapWebApiConceptSetToFacadeConceptSet,
} from "./conceptset.service.ts";

Deno.test("encodes native WebAPI concept set ids into a dedicated facade namespace", () => {
  const encodedId = encodeWebApiConceptSetId(42);

  assertEquals(encodedId, WEBAPI_CONCEPT_SET_ID_OFFSET + 42);
  assertEquals(isWebApiConceptSetId(encodedId), true);
  assertEquals(isWebApiConceptSetId(42), false);
});

Deno.test("legacy concept sets stay readable but become read-only in facade responses", () => {
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
  assertEquals(conceptSet.hasWriteAccess, false);
  assertEquals(conceptSet.createdBy.name, "legacy-owner");
  assertEquals(conceptSet.shared, true);
  assertEquals(conceptSet.source, "legacy");
});

Deno.test("native WebAPI concept sets are exposed with encoded facade ids", () => {
  const conceptSet = mapWebApiConceptSetToFacadeConceptSet({
    id: 7,
    name: "Native set",
    description: "Stored in OHDSI WebAPI",
    createdBy: "webapi-user",
    modifiedBy: "webapi-user",
    createdDate: 1714521600000,
    modifiedDate: 1714608000000,
    hasReadAccess: true,
    hasWriteAccess: true,
    tags: [],
  });

  assertEquals(conceptSet.id, WEBAPI_CONCEPT_SET_ID_OFFSET + 7);
  assertEquals(conceptSet.hasWriteAccess, true);
  assertEquals(conceptSet.createdBy.name, "webapi-user");
  assertEquals(conceptSet.description, "Stored in OHDSI WebAPI");
  assertEquals(conceptSet.shared, false);
  assertEquals(conceptSet.source, "webapi");
});

Deno.test("legacy concept sets cannot be updated or deleted anymore", () => {
  assertThrows(
    () => assertConceptSetWritable(99),
    Error,
    LEGACY_CONCEPT_SET_FORBIDDEN_MESSAGE
  );
});
