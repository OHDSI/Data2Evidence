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
  getIncludedConcepts,
  mapLegacyConceptSetToWebApiConceptSet,
  mapWebApiConceptSetToFacadeConceptSet,
} = await import("./conceptset.service.ts");

const { ConceptSetExpressionError } = await import(
  "../errors/ConceptSetErrors.ts"
);
const { WebApiConceptSetAPI } = await import("../api/WebApiConceptSetAPI.ts");
const { PortalServerAPI } = await import("../api/PortalServerAPI.ts");
const { TerminologySvcAPI } = await import("../api/TerminologySvcAPI.ts");
const { TrexDAO } = await import("../dao/trex.dao.ts");

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

Deno.test("getIncludedConcepts returns empty array for empty input", async () => {
  const result = await getIncludedConcepts("token", "dataset-1", []);
  assertEquals(result, []);
});

Deno.test("getIncludedConcepts resolves legacy concept sets through terminology-svc", async () => {
  const originalGetConceptSetById = TerminologySvcAPI.prototype.getConceptSetById;
  const originalResolveConceptSetExpression =
    TerminologySvcAPI.prototype.resolveConceptSetExpression;
  const originalGetTrexDao = TrexDAO.getTrexDao;

  try {
    TerminologySvcAPI.prototype.getConceptSetById = (_datasetId: string, id: number) => {
      return Promise.resolve({
        id,
        name: "Legacy set",
        shared: false,
        userName: "owner",
        createdBy: "owner",
        modifiedBy: "owner",
        createdDate: "2026-05-01T00:00:00.000Z",
        modifiedDate: "2026-05-02T00:00:00.000Z",
        concepts: [
          {
            id: 101,
            useMapped: true,
            useDescendants: true,
            isExcluded: false,
            conceptId: 101,
            display: "Legacy Concept",
            domainId: "Condition",
            system: "SNOMED",
            conceptClassId: "Clinical Finding",
            standardConcept: "S",
            code: "legacy-code",
            validStartDate: "2020-01-01",
            validEndDate: "2099-12-31",
            validity: "V",
            conceptCode: "legacy-code",
            conceptName: "Legacy Concept",
            vocabularyId: "SNOMED",
          },
        ],
      } as any);
    };

    TerminologySvcAPI.prototype.resolveConceptSetExpression = (_datasetId: string, concepts: any[]) => {
      return Promise.resolve(concepts.map((c) => c.id));
    };

    TrexDAO.getTrexDao = async (_token: string, _datasetId: string) => {
      return {
        getConceptsFromIdentifiers: (_conceptIds: number[]) => Promise.resolve([]),
      } as any;
    };

    const result = await getIncludedConcepts("token", "dataset-1", ["legacy:1"]);

    assertEquals(result.length, 1);
    assertEquals(result[0].CONCEPT_ID, 101);
    assertEquals(result[0].CONCEPT_NAME, "Legacy Concept");
    assertEquals(result[0].USEMAPPED, true);
    assertEquals(result[0].USEDESCENDANTS, true);
  } finally {
    TerminologySvcAPI.prototype.getConceptSetById = originalGetConceptSetById;
    TerminologySvcAPI.prototype.resolveConceptSetExpression =
      originalResolveConceptSetExpression;
    TrexDAO.getTrexDao = originalGetTrexDao;
  }
});

Deno.test("getIncludedConcepts resolves webapi concept sets through WebAPI", async () => {
  const originalGetStudy = PortalServerAPI.prototype.getStudy;
  const originalGetConceptSetExpression =
    WebApiConceptSetAPI.prototype.getConceptSetExpression;
  const originalResolveConceptSetExpression =
    WebApiConceptSetAPI.prototype.resolveConceptSetExpression;
  const originalLookupIdentifiers = WebApiConceptSetAPI.prototype.lookupIdentifiers;

  try {
    PortalServerAPI.prototype.getStudy = () =>
      Promise.resolve({
        id: "dataset-1",
        sourceStudyId: "source-dataset-id",
      } as any);

    WebApiConceptSetAPI.prototype.getConceptSetExpression = (_id: number, _sourceKey: string) => {
      return Promise.resolve({
        items: [
          {
            concept: {
              CONCEPT_ID: 201,
              CONCEPT_NAME: "WebAPI Concept",
              STANDARD_CONCEPT: "S",
              STANDARD_CONCEPT_CAPTION: "Standard",
              INVALID_REASON: null,
              INVALID_REASON_CAPTION: "Valid",
              CONCEPT_CODE: "webapi-code",
              DOMAIN_ID: "Condition",
              VOCABULARY_ID: "SNOMED",
              CONCEPT_CLASS_ID: "Clinical Finding",
              VALID_START_DATE: "2020-01-01",
              VALID_END_DATE: "2099-12-31",
            },
            isExcluded: false,
            includeDescendants: true,
            includeMapped: false,
          },
        ],
      } as any);
    };

    WebApiConceptSetAPI.prototype.resolveConceptSetExpression = (_sourceKey: string, _expression: any) => {
      return Promise.resolve([201, 202]);
    };

    WebApiConceptSetAPI.prototype.lookupIdentifiers = (_sourceKey: string, conceptIds: number[]) => {
      return Promise.resolve(
        conceptIds.map((id) => ({
          CONCEPT_ID: id,
          CONCEPT_NAME: `Resolved ${id}`,
          STANDARD_CONCEPT: "S",
          STANDARD_CONCEPT_CAPTION: "Standard",
          INVALID_REASON: null,
          INVALID_REASON_CAPTION: "Valid",
          CONCEPT_CODE: `code-${id}`,
          DOMAIN_ID: "Condition",
          VOCABULARY_ID: "SNOMED",
          CONCEPT_CLASS_ID: "Clinical Finding",
          VALID_START_DATE: "2020-01-01",
          VALID_END_DATE: "2099-12-31",
        }))
      );
    };

    const result = await getIncludedConcepts("token", "dataset-1", ["webapi:1"]);

    assertEquals(result.length, 2);
    const directConcept = result.find((c) => c.CONCEPT_ID === 201);
    const descendantConcept = result.find((c) => c.CONCEPT_ID === 202);

    assertEquals(directConcept?.CONCEPT_NAME, "WebAPI Concept");
    assertEquals(directConcept?.USEDESCENDANTS, true);
    assertEquals(directConcept?.USEMAPPED, false);
    assertEquals(descendantConcept?.CONCEPT_NAME, "Resolved 202");
    assertEquals(descendantConcept?.USEDESCENDANTS, false);
    assertEquals(descendantConcept?.USEMAPPED, false);
  } finally {
    PortalServerAPI.prototype.getStudy = originalGetStudy;
    WebApiConceptSetAPI.prototype.getConceptSetExpression =
      originalGetConceptSetExpression;
    WebApiConceptSetAPI.prototype.resolveConceptSetExpression =
      originalResolveConceptSetExpression;
    WebApiConceptSetAPI.prototype.lookupIdentifiers = originalLookupIdentifiers;
  }
});

Deno.test("getIncludedConcepts deduplicates concepts across mixed sources", async () => {
  const originalGetStudy = PortalServerAPI.prototype.getStudy;
  const originalGetConceptSetById = TerminologySvcAPI.prototype.getConceptSetById;
  const originalResolveConceptSetExpressionTerm =
    TerminologySvcAPI.prototype.resolveConceptSetExpression;
  const originalGetTrexDao = TrexDAO.getTrexDao;
  const originalGetConceptSetExpression =
    WebApiConceptSetAPI.prototype.getConceptSetExpression;
  const originalResolveConceptSetExpressionWeb =
    WebApiConceptSetAPI.prototype.resolveConceptSetExpression;
  const originalLookupIdentifiers = WebApiConceptSetAPI.prototype.lookupIdentifiers;

  try {
    PortalServerAPI.prototype.getStudy = () =>
      Promise.resolve({
        id: "dataset-1",
        sourceStudyId: "source-dataset-id",
      } as any);

    TerminologySvcAPI.prototype.getConceptSetById = (_datasetId: string, id: number) => {
      return Promise.resolve({
        id,
        name: "Legacy set",
        shared: false,
        userName: "owner",
        createdBy: "owner",
        modifiedBy: "owner",
        createdDate: "2026-05-01T00:00:00.000Z",
        modifiedDate: "2026-05-02T00:00:00.000Z",
        concepts: [
          {
            id: 301,
            useMapped: false,
            useDescendants: false,
            isExcluded: false,
            conceptId: 301,
            display: "Shared Concept",
            domainId: "Condition",
            system: "SNOMED",
            conceptClassId: "Clinical Finding",
            standardConcept: "S",
            code: "shared-code",
            validStartDate: "2020-01-01",
            validEndDate: "2099-12-31",
            validity: "V",
            conceptCode: "shared-code",
            conceptName: "Shared Concept",
            vocabularyId: "SNOMED",
          },
        ],
      } as any);
    };

    TerminologySvcAPI.prototype.resolveConceptSetExpression = (_datasetId: string, concepts: any[]) => {
      return Promise.resolve(concepts.map((c) => c.id));
    };

    TrexDAO.getTrexDao = async (_token: string, _datasetId: string) => {
      return {
        getConceptsFromIdentifiers: (_conceptIds: number[]) => Promise.resolve([]),
      } as any;
    };

    WebApiConceptSetAPI.prototype.getConceptSetExpression = (_id: number, _sourceKey: string) => {
      return Promise.resolve({
        items: [
          {
            concept: {
              CONCEPT_ID: 301,
              CONCEPT_NAME: "Shared Concept",
              STANDARD_CONCEPT: "S",
              STANDARD_CONCEPT_CAPTION: "Standard",
              INVALID_REASON: null,
              INVALID_REASON_CAPTION: "Valid",
              CONCEPT_CODE: "shared-code",
              DOMAIN_ID: "Condition",
              VOCABULARY_ID: "SNOMED",
              CONCEPT_CLASS_ID: "Clinical Finding",
              VALID_START_DATE: "2020-01-01",
              VALID_END_DATE: "2099-12-31",
            },
            isExcluded: false,
            includeDescendants: true,
            includeMapped: true,
          },
        ],
      } as any);
    };

    WebApiConceptSetAPI.prototype.resolveConceptSetExpression = (_sourceKey: string, _expression: any) => {
      return Promise.resolve([301]);
    };

    WebApiConceptSetAPI.prototype.lookupIdentifiers = (_sourceKey: string, _conceptIds: number[]) => {
      return Promise.resolve([]);
    };

    const result = await getIncludedConcepts("token", "dataset-1", [
      "legacy:1",
      "webapi:2",
    ]);

    assertEquals(result.length, 1);
    assertEquals(result[0].CONCEPT_ID, 301);
    // Legacy appears first in the combined list, so its flags win.
    assertEquals(result[0].USEMAPPED, false);
    assertEquals(result[0].USEDESCENDANTS, false);
  } finally {
    PortalServerAPI.prototype.getStudy = originalGetStudy;
    TerminologySvcAPI.prototype.getConceptSetById = originalGetConceptSetById;
    TerminologySvcAPI.prototype.resolveConceptSetExpression =
      originalResolveConceptSetExpressionTerm;
    TrexDAO.getTrexDao = originalGetTrexDao;
    WebApiConceptSetAPI.prototype.getConceptSetExpression =
      originalGetConceptSetExpression;
    WebApiConceptSetAPI.prototype.resolveConceptSetExpression =
      originalResolveConceptSetExpressionWeb;
    WebApiConceptSetAPI.prototype.lookupIdentifiers = originalLookupIdentifiers;
  }
});
