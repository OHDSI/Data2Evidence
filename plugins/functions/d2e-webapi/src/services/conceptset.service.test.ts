import { assertEquals } from "@std/assert";

import {
  WEBAPI_CONCEPT_SET_ID_OFFSET,
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
