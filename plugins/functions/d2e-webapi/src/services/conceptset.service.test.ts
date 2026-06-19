import { assertEquals, assertRejects } from "@std/assert";

// Stub the Trex global and SERVICE_ROUTES env BEFORE importing any module
// that constructs an API class or reads env at load time. Static imports
// are hoisted, so we use dynamic imports for the modules-under-test.
// deno-lint-ignore no-explicit-any
(globalThis as any).Trex = (globalThis as any).Trex ?? {
  tokioChannel: () => ({
    get: () => Promise.resolve({ data: undefined }),
    post: () => Promise.resolve({ data: undefined }),
    put: () => Promise.resolve({ data: undefined }),
    delete: () => Promise.resolve({ data: undefined }),
  }),
};

if (!Deno.env.get("SERVICE_ROUTES")) {
  Deno.env.set(
    "SERVICE_ROUTES",
    JSON.stringify({
      terminology: "http://localhost:0",
      portalServer: "http://localhost:0",
      bookmark: "http://localhost:0",
    }),
  );
}

const {
  getConceptSet,
  getConceptSetExpression,
  mapLegacyConceptSetToWebApiConceptSet,
  mapWebApiConceptSetToFacadeConceptSet,
} = await import("./conceptset.service.ts");

const { ConceptSetExpressionError } = await import(
  "../errors/ConceptSetErrors.ts"
);
const { WebApiConceptSetAPI } = await import("../api/WebApiConceptSetAPI.ts");
const { PortalServerAPI } = await import("../api/PortalServerAPI.ts");
const { TerminologySvcAPI } = await import("../api/TerminologySvcAPI.ts");

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

  assertEquals(conceptSet.id, "legacy:15");
  assertEquals(conceptSet.externalId, 15);
  assertEquals(conceptSet.hasReadAccess, true);
  assertEquals(conceptSet.hasWriteAccess, true);
  assertEquals(conceptSet.createdBy.name, "legacy-owner");
  assertEquals(conceptSet.shared, true);
  assertEquals(conceptSet.source, "legacy");
});

Deno.test("native WebAPI concept sets are exposed with compound facade ids", () => {
  const conceptSet = mapWebApiConceptSetToFacadeConceptSet({
    id: 42,
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

  assertEquals(conceptSet.id, "webapi:42");
  assertEquals(conceptSet.externalId, 42);
  assertEquals(conceptSet.source, "webapi");
  assertEquals(conceptSet.hasWriteAccess, true);
  assertEquals(conceptSet.createdBy.name, "WebAPI User");
  assertEquals(conceptSet.createdBy.login, "webapi-user");
  assertEquals(conceptSet.description, "Stored in OHDSI WebAPI");
  assertEquals(conceptSet.shared, false);
});

Deno.test("getConceptSet routes compound legacy id to terminology-svc", async () => {
  const originalGetConceptSet = TerminologySvcAPI.prototype.getConceptSet;
  let seenId: number | undefined;

  try {
    TerminologySvcAPI.prototype.getConceptSet = (
      id: number,
      _datasetId: string,
    ) => {
      seenId = id;
      return Promise.resolve({
        id,
        name: "Legacy via compound",
        shared: false,
        concepts: [],
        userName: "owner",
        createdBy: "owner",
        modifiedBy: "owner",
        createdDate: "2026-05-01T00:00:00.000Z",
        modifiedDate: "2026-05-02T00:00:00.000Z",
      } as any);
    };

    const result = await getConceptSet("token", "dataset-1", "legacy:869");

    assertEquals(seenId, 869);
    assertEquals(result.id, "legacy:869");
    assertEquals(result.externalId, 869);
    assertEquals(result.source, "legacy");
  } finally {
    TerminologySvcAPI.prototype.getConceptSet = originalGetConceptSet;
  }
});

Deno.test("getConceptSet routes compound webapi id to WebAPI", async () => {
  const originalGetConceptSet = WebApiConceptSetAPI.prototype.getConceptSet;
  let seenId: number | undefined;

  try {
    WebApiConceptSetAPI.prototype.getConceptSet = (id: number) => {
      seenId = id;
      return Promise.resolve({
        id,
        name: "WebAPI via compound",
        description: null,
        createdBy: { id: 1, login: "u", name: "U" },
        modifiedBy: { id: 1, login: "u", name: "U" },
        createdDate: 1,
        modifiedDate: 2,
        readAccess: true,
        writeAccess: true,
        tags: [],
      } as any);
    };

    const result = await getConceptSet("token", "dataset-1", "webapi:7");

    assertEquals(seenId, 7);
    assertEquals(result.id, "webapi:7");
    assertEquals(result.externalId, 7);
    assertEquals(result.source, "webapi");
  } finally {
    WebApiConceptSetAPI.prototype.getConceptSet = originalGetConceptSet;
  }
});

Deno.test("getConceptSet back-compat: bare numeric id routes to terminology-svc", async () => {
  const originalGetConceptSet = TerminologySvcAPI.prototype.getConceptSet;
  let seenId: number | undefined;

  try {
    TerminologySvcAPI.prototype.getConceptSet = (
      id: number,
      _datasetId: string,
    ) => {
      seenId = id;
      return Promise.resolve({
        id,
        name: "Legacy bare",
        shared: false,
        concepts: [],
        userName: "owner",
        createdBy: "owner",
        modifiedBy: "owner",
        createdDate: "2026-05-01T00:00:00.000Z",
        modifiedDate: "2026-05-02T00:00:00.000Z",
      } as any);
    };

    const result = await getConceptSet("token", "dataset-1", 869);

    assertEquals(seenId, 869);
    assertEquals(result.id, "legacy:869");
    assertEquals(result.source, "legacy");
  } finally {
    TerminologySvcAPI.prototype.getConceptSet = originalGetConceptSet;
  }
});

Deno.test("getConceptSet back-compat: offset-encoded numeric id routes to WebAPI", async () => {
  const originalGetConceptSet = WebApiConceptSetAPI.prototype.getConceptSet;
  let seenId: number | undefined;

  try {
    WebApiConceptSetAPI.prototype.getConceptSet = (id: number) => {
      seenId = id;
      return Promise.resolve({
        id,
        name: "WebAPI offset",
        description: null,
        createdBy: { id: 1, login: "u", name: "U" },
        modifiedBy: { id: 1, login: "u", name: "U" },
        createdDate: 1,
        modifiedDate: 2,
        readAccess: true,
        writeAccess: true,
        tags: [],
      } as any);
    };

    const result = await getConceptSet("token", "dataset-1", 1_000_000_007);

    assertEquals(seenId, 7);
    assertEquals(result.id, "webapi:7");
    assertEquals(result.externalId, 7);
    assertEquals(result.source, "webapi");
  } finally {
    WebApiConceptSetAPI.prototype.getConceptSet = originalGetConceptSet;
  }
});

Deno.test("WebAPI concept set expression resolves sourceStudyId before fetching", async () => {
  const originalGetStudy = PortalServerAPI.prototype.getStudy;
  const originalGetConceptSetExpression =
    WebApiConceptSetAPI.prototype.getConceptSetExpression;
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
      "webapi:1",
    );

    assertEquals(seenSourceKey, "source-dataset-id");
    assertEquals(result.items.length, 1);
  } finally {
    PortalServerAPI.prototype.getStudy = originalGetStudy;
    WebApiConceptSetAPI.prototype.getConceptSetExpression =
      originalGetConceptSetExpression;
  }
});

Deno.test("WebAPI concept set expression falls back to datasetId for source datasets", async () => {
  const originalGetStudy = PortalServerAPI.prototype.getStudy;
  const originalGetConceptSetExpression =
    WebApiConceptSetAPI.prototype.getConceptSetExpression;
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
      "webapi:1",
    );

    assertEquals(seenSourceKey, "source-dataset-id");
    assertEquals(result.items.length, 0);
  } finally {
    PortalServerAPI.prototype.getStudy = originalGetStudy;
    WebApiConceptSetAPI.prototype.getConceptSetExpression =
      originalGetConceptSetExpression;
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
          "webapi:1",
        ),
      ConceptSetExpressionError,
      "Failed to resolve source configuration for dataset cached-dataset-id",
    );
  } finally {
    PortalServerAPI.prototype.getStudy = originalGetStudy;
  }
});
