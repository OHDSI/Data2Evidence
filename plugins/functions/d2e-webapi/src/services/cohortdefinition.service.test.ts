import { assertEquals } from "@std/assert";

// Stub the Trex global and SERVICE_ROUTES env BEFORE importing any module
// that constructs an API class or reads env at load time. Static imports are
// hoisted, so we use dynamic imports for the modules-under-test.
// deno-lint-ignore no-explicit-any
(globalThis as any).Trex = (globalThis as any).Trex ?? {
  tokioChannel: () => ({
    get: () => Promise.resolve({ data: undefined }),
    post: () => Promise.resolve({ data: undefined }),
    put: () => Promise.resolve({ data: undefined }),
    delete: () => Promise.resolve({ data: undefined }),
  }),
};

// `env.ts` parses SERVICE_ROUTES once per process, and the test files share a
// process, so merge rather than overwrite: fill in the routes this suite needs
// without dropping any another test file already set.
const existingServiceRoutes = (() => {
  const raw = Deno.env.get("SERVICE_ROUTES");
  if (!raw) {
    return {};
  }
  try {
    return JSON.parse(raw) as Record<string, string>;
  } catch {
    return {};
  }
})();
Deno.env.set(
  "SERVICE_ROUTES",
  JSON.stringify({
    terminology: "http://localhost:0",
    portalServer: "http://localhost:0",
    bookmark: "http://localhost:0",
    analytics: "http://localhost:0",
    ...existingServiceRoutes,
  }),
);

const { getCohortDefinitionList } = await import("./cohortdefinition.service.ts");
const { AnalyticsSvcAPI } = await import("../api/AnalyticsAPI.ts");
const { BookmarksAPI } = await import("../api/BookmarksAPI.ts");
const { CohortCacheShapeError } = await import(
  "../errors/CohortCacheErrors.ts"
);
const {
  BookmarkMaterializedCohortStatus,
  CachedMaterializedCohortSchema,
  CohortCacheLookupResponseSchema,
} = await import("../api/types.ts");
const { CohortDefinitionListResponseDto } = await import(
  "../dto/cohortdefinition.ts"
);

type IBookmark = import("../api/types.ts").IBookmark;
type IBaseMaterializedCohort = import(
  "../api/types.ts"
).IBaseMaterializedCohort;
type ICohortCacheEntry = import("../api/types.ts").ICohortCacheEntry;
type ICohortCacheLookupResponse = import(
  "../api/types.ts"
).ICohortCacheLookupResponse;
type ICohortCacheWriteEntry = import(
  "../api/types.ts"
).ICohortCacheWriteEntry;

const DATASET_ID = "dataset-1";
const TOKEN = "token";

const makeBookmark = (bmkId: string, version = 1): IBookmark => ({
  bmkId,
  bookmarkname: `bookmark ${bmkId}`,
  bookmark: "{}",
  viewname: null,
  modified: "2026-08-01T00:00:00.000Z",
  version,
  user_id: "user-1",
  shared: false,
});

const makeCohort = (
  id: number,
  bookmarkId: string,
  patientCount: number,
  // `undefined` leaves `bookmarkVersion` out of the syntax.
  bookmarkVersion?: number | null,
): IBaseMaterializedCohort => ({
  id,
  name: `cohort ${id}`,
  description: `description of cohort ${id}`,
  creationTimestamp: "2026-08-02T00:00:00.000Z",
  syntax: JSON.stringify({
    datasetId: DATASET_ID,
    bookmarkId,
    bookmarkVersion,
  }),
  patientCount,
});

const positiveEntry = (
  cohort: IBaseMaterializedCohort,
): ICohortCacheEntry => ({
  materializedCohort: {
    id: cohort.id,
    name: cohort.name,
    description: cohort.description,
    creationTimestamp: cohort.creationTimestamp,
    syntax: cohort.syntax,
    patientCount: cohort.patientCount,
  },
});

const negativeEntry = (): ICohortCacheEntry => ({ materializedCohort: null });

interface RecordedCalls {
  getAllBookmarks: number;
  canMaterializeCohort: number;
  getFilteredCohorts: number;
  lookup: { datasetId: string; bookmarkIds: string[] }[];
  write: { datasetId: string; entries: ICohortCacheWriteEntry[] }[];
}

interface StubConfig {
  bookmarks: IBookmark[];
  canMaterializeCohort?: boolean;
  filteredCohorts?: IBaseMaterializedCohort[];
  lookup?: (
    datasetId: string,
    bookmarkIds: string[],
  ) => Promise<ICohortCacheLookupResponse>;
  write?: (
    datasetId: string,
    entries: ICohortCacheWriteEntry[],
  ) => Promise<void>;
}

/**
 * Installs prototype doubles for every outbound call
 * `getCohortDefinitionList` makes, and restores them in `finally`.
 */
const withStubs = async <T>(
  config: StubConfig,
  run: (calls: RecordedCalls) => Promise<T>,
): Promise<T> => {
  const originalGetAllBookmarks = BookmarksAPI.prototype.getAllBookmarks;
  const originalCanMaterializeCohort =
    AnalyticsSvcAPI.prototype.canMaterializeCohort;
  const originalGetFilteredCohorts =
    AnalyticsSvcAPI.prototype.getFilteredCohorts;
  const originalCohortCacheLookup = AnalyticsSvcAPI.prototype.cohortCacheLookup;
  const originalCohortCacheWrite = AnalyticsSvcAPI.prototype.cohortCacheWrite;

  const calls: RecordedCalls = {
    getAllBookmarks: 0,
    canMaterializeCohort: 0,
    getFilteredCohorts: 0,
    lookup: [],
    write: [],
  };

  try {
    BookmarksAPI.prototype.getAllBookmarks = (_datasetId: string) => {
      calls.getAllBookmarks += 1;
      return Promise.resolve({
        bookmarks: config.bookmarks,
        schemaName: "cdm_schema",
      });
    };

    AnalyticsSvcAPI.prototype.canMaterializeCohort = (_datasetId: string) => {
      calls.canMaterializeCohort += 1;
      return Promise.resolve(config.canMaterializeCohort ?? true);
    };

    AnalyticsSvcAPI.prototype.getFilteredCohorts = (
      _datasetId: string,
      _filterValue: unknown,
    ) => {
      calls.getFilteredCohorts += 1;
      return Promise.resolve(config.filteredCohorts ?? []);
    };

    AnalyticsSvcAPI.prototype.cohortCacheLookup = (
      datasetId: string,
      bookmarkIds: string[],
    ) => {
      calls.lookup.push({ datasetId, bookmarkIds });
      return config.lookup
        ? config.lookup(datasetId, bookmarkIds)
        : Promise.resolve({
          entries: {},
          missing: [...bookmarkIds],
          stale: false,
        });
    };

    AnalyticsSvcAPI.prototype.cohortCacheWrite = (
      datasetId: string,
      entries: ICohortCacheWriteEntry[],
    ) => {
      calls.write.push({ datasetId, entries });
      return config.write
        ? config.write(datasetId, entries)
        : Promise.resolve();
    };

    return await run(calls);
  } finally {
    BookmarksAPI.prototype.getAllBookmarks = originalGetAllBookmarks;
    AnalyticsSvcAPI.prototype.canMaterializeCohort =
      originalCanMaterializeCohort;
    AnalyticsSvcAPI.prototype.getFilteredCohorts = originalGetFilteredCohorts;
    AnalyticsSvcAPI.prototype.cohortCacheLookup = originalCohortCacheLookup;
    AnalyticsSvcAPI.prototype.cohortCacheWrite = originalCohortCacheWrite;
  }
};

// deno-lint-ignore no-explicit-any
const bookmarkItems = (result: any[]) =>
  result.filter((item) => "bmkId" in item);
// deno-lint-ignore no-explicit-any
const cohortItems = (result: any[]) =>
  result.filter((item) => !("bmkId" in item));

Deno.test("all bookmarks hit the cohort cache: getFilteredCohorts is never called", async () => {
  const bookmarks = ["b1", "b2", "b3"].map(makeBookmark);
  const cohortForB1 = makeCohort(11, "b1", 111);
  const cohortForB3 = makeCohort(13, "b3", 333);

  await withStubs(
    {
      bookmarks,
      // Deliberately different from the cached values, so the assertions
      // below also show the source database was not consulted.
      filteredCohorts: [makeCohort(99, "b1", 999)],
      lookup: () =>
        Promise.resolve({
          entries: {
            b1: positiveEntry(cohortForB1),
            b2: negativeEntry(),
            b3: positiveEntry(cohortForB3),
          },
          missing: [],
          stale: false,
        }),
    },
    async (calls) => {
      const result = await getCohortDefinitionList(TOKEN, DATASET_ID);

      assertEquals(calls.getFilteredCohorts, 0);
      assertEquals(calls.write.length, 0);
      assertEquals(calls.lookup.length, 1);
      assertEquals(calls.lookup[0].datasetId, DATASET_ID);
      assertEquals(calls.lookup[0].bookmarkIds, ["b1", "b2", "b3"]);

      assertEquals(
        bookmarkItems(result).map((bookmark) => [
          bookmark.bmkId,
          bookmark.cohortDefinitionId,
        ]),
        [
          ["b1", 11],
          ["b2", undefined],
          ["b3", 13],
        ],
      );
      assertEquals(
        cohortItems(result).map((cohort) => [cohort.id, cohort.patientCount]),
        [
          [11, 111],
          [13, 333],
        ],
      );
    },
  );
});

Deno.test("a dataset cached entirely as negative entries is served from the cache on the next load", async () => {
  // Round trip through an in-memory store: the first load populates it with
  // nothing but negative entries, and the second must be served from them. If
  // `null` were read as "not cached" the second load would call
  // getFilteredCohorts again.
  const bookmarks = ["b1", "b2", "b3"].map(makeBookmark);
  const store = new Map<string, ICohortCacheEntry>();

  await withStubs(
    {
      bookmarks,
      // No bookmark on this dataset has a materialized cohort.
      filteredCohorts: [],
      lookup: (_datasetId, bookmarkIds) => {
        const entries: Record<string, ICohortCacheEntry> = {};
        const missing: string[] = [];
        for (const bookmarkId of bookmarkIds) {
          const stored = store.get(bookmarkId);
          if (stored) {
            entries[bookmarkId] = stored;
          } else {
            missing.push(bookmarkId);
          }
        }
        return Promise.resolve({ entries, missing, stale: false });
      },
      write: (_datasetId, entries) => {
        for (const entry of entries) {
          store.set(entry.bookmarkId, {
            materializedCohort: entry.materializedCohort,
          });
        }
        return Promise.resolve();
      },
    },
    async (calls) => {
      const coldResult = await getCohortDefinitionList(TOKEN, DATASET_ID);

      assertEquals(calls.getFilteredCohorts, 1);
      assertEquals(calls.write.length, 1);
      // Every bookmark was written back, all of them negative.
      assertEquals(calls.write[0].entries, [
        { bookmarkId: "b1", materializedCohort: null },
        { bookmarkId: "b2", materializedCohort: null },
        { bookmarkId: "b3", materializedCohort: null },
      ]);
      assertEquals([...store.keys()], ["b1", "b2", "b3"]);

      const warmResult = await getCohortDefinitionList(TOKEN, DATASET_ID);

      // Still 1: the warm load issued no source query.
      assertEquals(calls.getFilteredCohorts, 1);
      assertEquals(calls.lookup.length, 2);
      // Nothing to repopulate, so no second write either.
      assertEquals(calls.write.length, 1);
      // Cached and uncached responses agree.
      assertEquals(warmResult, coldResult);
    },
  );
});

Deno.test("partial miss makes exactly one getFilteredCohorts call and answers from it", async () => {
  const bookmarks = ["b1", "b2", "b3"].map(makeBookmark);
  // Differs from the fresh value: a response assembled from the partial cache
  // read would report a patient count of 1.
  const staleCohortForB1 = makeCohort(11, "b1", 1);
  const freshCohortForB1 = makeCohort(11, "b1", 111);
  const freshCohortForB2 = makeCohort(12, "b2", 222);

  await withStubs(
    {
      bookmarks,
      filteredCohorts: [freshCohortForB2, freshCohortForB1],
      lookup: () =>
        Promise.resolve({
          entries: { b1: positiveEntry(staleCohortForB1) },
          missing: ["b2", "b3"],
          stale: false,
        }),
    },
    async (calls) => {
      const result = await getCohortDefinitionList(TOKEN, DATASET_ID);

      assertEquals(calls.getFilteredCohorts, 1);

      assertEquals(
        bookmarkItems(result).map((bookmark) => [
          bookmark.bmkId,
          bookmark.cohortDefinitionId,
        ]),
        [
          ["b1", 11],
          ["b2", 12],
          ["b3", undefined],
        ],
      );
      // Sorted by cohort id, and built from the source query result.
      assertEquals(
        cohortItems(result).map((cohort) => [cohort.id, cohort.patientCount]),
        [
          [11, 111],
          [12, 222],
        ],
      );

      // Every bookmark is written back, misses and hits alike.
      assertEquals(calls.write.length, 1);
      assertEquals(
        calls.write[0].entries.map((entry) => [
          entry.bookmarkId,
          entry.materializedCohort?.patientCount ?? null,
        ]),
        [
          ["b1", 111],
          ["b2", 222],
          ["b3", null],
        ],
      );
    },
  );
});

Deno.test("an empty cache queries the source and writes an entry for every bookmark", async () => {
  const bookmarks = ["b1", "b2"].map(makeBookmark);
  const cohortForB1 = makeCohort(11, "b1", 111);

  await withStubs(
    {
      bookmarks,
      filteredCohorts: [cohortForB1],
      // Default lookup stub: everything missing.
    },
    async (calls) => {
      const result = await getCohortDefinitionList(TOKEN, DATASET_ID);

      assertEquals(calls.getFilteredCohorts, 1);
      assertEquals(
        bookmarkItems(result).map((bookmark) => [
          bookmark.bmkId,
          bookmark.cohortDefinitionId,
        ]),
        [
          ["b1", 11],
          ["b2", undefined],
        ],
      );
      assertEquals(cohortItems(result), [
        {
          id: 11,
          patientCount: 111,
          cohortDefinitionName: "cohort 11",
          createdOn: "2026-08-02T00:00:00.000Z",
          description: "description of cohort 11",
          syntax: JSON.stringify({
            datasetId: DATASET_ID,
            bookmarkId: "b1",
          }),
        },
      ]);

      assertEquals(calls.write.length, 1);
      assertEquals(calls.write[0].datasetId, DATASET_ID);
      assertEquals(calls.write[0].entries.length, 2);
      assertEquals(calls.write[0].entries[0], {
        bookmarkId: "b1",
        materializedCohort: {
          id: 11,
          name: "cohort 11",
          description: "description of cohort 11",
          creationTimestamp: "2026-08-02T00:00:00.000Z",
          syntax: JSON.stringify({
            datasetId: DATASET_ID,
            bookmarkId: "b1",
          }),
          patientCount: 111,
        },
      });
      assertEquals(calls.write[0].entries[1], {
        bookmarkId: "b2",
        materializedCohort: null,
      });
    },
  );
});

Deno.test("the cohort cache write is not awaited before the response returns", async () => {
  const bookmarks = ["b1"].map(makeBookmark);
  const events: string[] = [];
  let writePromise: Promise<void> = Promise.resolve();

  await withStubs(
    {
      bookmarks,
      filteredCohorts: [],
      write: () => {
        events.push("write-started");
        // Resolved from a macrotask, so it can only settle after every
        // microtask the response path still has to run. An implementation
        // that awaited the write would log "write-finished" first instead of
        // hanging, which keeps this a failing assertion rather than a stall.
        writePromise = new Promise<void>((resolve) => {
          setTimeout(() => {
            events.push("write-finished");
            resolve();
          }, 0);
        });
        return writePromise;
      },
    },
    async (calls) => {
      await getCohortDefinitionList(TOKEN, DATASET_ID);
      events.push("response-returned");

      assertEquals(calls.write.length, 1);
      assertEquals(events, ["write-started", "response-returned"]);

      await writePromise;
      assertEquals(events, [
        "write-started",
        "response-returned",
        "write-finished",
      ]);
    },
  );
});

Deno.test("a failing cohort cache lookup falls through to the uncached path", async () => {
  const bookmarks = ["b1", "b2"].map(makeBookmark);
  const cohortForB2 = makeCohort(12, "b2", 222);

  await withStubs(
    {
      bookmarks,
      filteredCohorts: [cohortForB2],
      // Transport failure, such as a 500 from the lookup endpoint.
      lookup: () =>
        Promise.reject(new Error("Request failed with status code 500")),
    },
    async (calls) => {
      const result = await getCohortDefinitionList(TOKEN, DATASET_ID);

      assertEquals(calls.getFilteredCohorts, 1);
      assertEquals(
        bookmarkItems(result).map((bookmark) => [
          bookmark.bmkId,
          bookmark.cohortDefinitionId,
        ]),
        [
          ["b1", undefined],
          ["b2", 12],
        ],
      );
      assertEquals(
        cohortItems(result).map((cohort) => cohort.id),
        [12],
      );
      // UNAVAILABLE, not MISS: nothing is written back to a cache that could
      // not answer.
      assertEquals(calls.write.length, 0);
    },
  );
});

Deno.test("a dataset that cannot materialize cohorts never touches the cohort cache", async () => {
  const bookmarks = ["b1", "b2"].map(makeBookmark);

  await withStubs(
    {
      bookmarks,
      canMaterializeCohort: false,
      filteredCohorts: [makeCohort(11, "b1", 111)],
    },
    async (calls) => {
      const result = await getCohortDefinitionList(TOKEN, DATASET_ID);

      assertEquals(calls.lookup.length, 0);
      assertEquals(calls.write.length, 0);
      assertEquals(calls.getFilteredCohorts, 0);
      assertEquals(cohortItems(result), []);
      assertEquals(
        bookmarkItems(result).map((bookmark) => bookmark.bmkId),
        ["b1", "b2"],
      );
      assertEquals(statuses(result), [
        ["b1", BookmarkMaterializedCohortStatus.NOT_RUN],
        ["b2", BookmarkMaterializedCohortStatus.NOT_RUN],
      ]);
    },
  );
});

Deno.test("the lookup schema accepts a null description, syntax and creationTimestamp", () => {
  // All three are nullable in the COHORT_DEFINITION DDL, so the cache schema
  // must not be stricter than the uncached path.
  const parsed = CohortCacheLookupResponseSchema.safeParse({
    entries: {
      b1: {
        materializedCohort: {
          id: 11,
          name: "cohort 11",
          description: null,
          creationTimestamp: null,
          syntax: null,
          patientCount: 7,
        },
      },
    },
    missing: [],
  });
  assertEquals(parsed.success, true);
});

Deno.test("the cached cohort schema accepts a numeric creationTimestamp", () => {
  const parsed = CachedMaterializedCohortSchema.safeParse({
    id: 11,
    name: "cohort 11",
    description: "",
    creationTimestamp: 1787824207000,
    syntax: "{}",
    patientCount: 7,
  });
  assertEquals(parsed.success, true);
});

Deno.test("the cached cohort schema rejects a wrongly typed patientCount", () => {
  const parsed = CachedMaterializedCohortSchema.safeParse({
    id: 11,
    name: "cohort 11",
    description: null,
    creationTimestamp: null,
    syntax: null,
    patientCount: "7",
  });
  assertEquals(parsed.success, false);
});

Deno.test("an unusable cache body recomputes from the source and overwrites the cache", async () => {
  await withStubs(
    {
      bookmarks: ["b1"].map(makeBookmark),
      filteredCohorts: [makeCohort(11, "b1", 111)],
      lookup: () =>
        Promise.reject(
          new CohortCacheShapeError("unexpected response shape"),
        ),
    },
    async (calls) => {
      const result = await getCohortDefinitionList("token", DATASET_ID);
      assertEquals(calls.getFilteredCohorts, 1);
      assertEquals(
        (cohortItems(result)[0] as { patientCount: number }).patientCount,
        111,
      );
      // MISS, not UNAVAILABLE: a body that fails to parse never reaches the
      // revalidate path, so only the write-back repairs the stored row.
      assertEquals(calls.write.length, 1);
    },
  );
});

// --- stale-while-revalidate ---------------------------------------------------

/** Resolves once the background cache write has been issued. */
const writeSignal = () => {
  let fire!: () => void;
  const fired = new Promise<void>((resolve) => {
    fire = resolve;
  });
  return { fired, fire };
};

Deno.test("a stale hit is served from the cache without waiting for a refresh", async () => {
  const staleCohort = makeCohort(11, "b1", 1);
  const freshCohort = makeCohort(11, "b1", 111);
  const events: string[] = [];
  let refreshPromise: Promise<IBaseMaterializedCohort[]> = Promise.resolve([]);

  await withStubs(
    {
      bookmarks: ["b1"].map(makeBookmark),
      lookup: () =>
        Promise.resolve({
          entries: { b1: positiveEntry(staleCohort) },
          missing: [],
          stale: true,
        }),
      write: () => {
        events.push("write-issued");
        return Promise.resolve();
      },
    },
    async (calls) => {
      AnalyticsSvcAPI.prototype.getFilteredCohorts = () => {
        calls.getFilteredCohorts += 1;
        events.push("refresh-started");
        // Resolved from a macrotask, so it can only settle after every
        // microtask the response path still has to run.
        refreshPromise = new Promise((resolve) => {
          setTimeout(() => {
            events.push("refresh-finished");
            resolve([freshCohort]);
          }, 0);
        });
        return refreshPromise;
      };

      const result = await getCohortDefinitionList(TOKEN, "stale-serve");
      events.push("response-returned");

      // Served from the stale entry: the source query did not stand between
      // the request and the reply.
      assertEquals(
        (cohortItems(result)[0] as { patientCount: number }).patientCount,
        1,
      );
      assertEquals(events, ["refresh-started", "response-returned"]);

      await refreshPromise;
      await new Promise((resolve) => setTimeout(resolve, 0));
      assertEquals(events, [
        "refresh-started",
        "response-returned",
        "refresh-finished",
        "write-issued",
      ]);
    },
  );
});

Deno.test("revalidation writes the freshly read values, not the stale ones", async () => {
  // Writing back what was just served would stamp a new written_at onto stale
  // data, so the entry would never refresh again.
  const staleCohort = makeCohort(11, "b1", 1);
  const freshCohort = makeCohort(11, "b1", 111);
  const written = writeSignal();

  await withStubs(
    {
      bookmarks: ["b1", "b2"].map(makeBookmark),
      filteredCohorts: [freshCohort],
      lookup: () =>
        Promise.resolve({
          entries: { b1: positiveEntry(staleCohort), b2: negativeEntry() },
          missing: [],
          stale: true,
        }),
      write: () => {
        written.fire();
        return Promise.resolve();
      },
    },
    async (calls) => {
      await getCohortDefinitionList(TOKEN, "stale-write");
      await written.fired;

      assertEquals(calls.write.length, 1);
      assertEquals(
        calls.write[0].entries.map((entry) => [
          entry.bookmarkId,
          entry.materializedCohort?.patientCount ?? null,
        ]),
        [
          ["b1", 111],
          ["b2", null],
        ],
      );
    },
  );
});

Deno.test("a failed revalidation leaves the stale entry alone", async () => {
  let refreshAttempted = false;

  await withStubs(
    {
      bookmarks: ["b1"].map(makeBookmark),
      lookup: () =>
        Promise.resolve({
          entries: { b1: positiveEntry(makeCohort(11, "b1", 1)) },
          missing: [],
          stale: true,
        }),
      write: () => Promise.reject(new Error("should not be reached")),
    },
    async (calls) => {
      AnalyticsSvcAPI.prototype.getFilteredCohorts = () => {
        refreshAttempted = true;
        calls.getFilteredCohorts += 1;
        return Promise.reject(new Error("source database unavailable"));
      };

      const result = await getCohortDefinitionList(TOKEN, "stale-refresh-fails");

      // The user still gets the cached answer.
      assertEquals(
        (cohortItems(result)[0] as { patientCount: number }).patientCount,
        1,
      );

      // Let the rejected background chain settle.
      await new Promise((resolve) => setTimeout(resolve, 0));

      assertEquals(refreshAttempted, true);
      // No write, so the entry stays stale and the next load retries.
      assertEquals(calls.write.length, 0);
    },
  );
});

// --- materialization status -------------------------------------------------

/** One bookmark for each status rule, with the status that it must get. */
const statusFixture = () => ({
  bookmarks: [
    makeBookmark("ready", 2),
    makeBookmark("stale", 3),
    makeBookmark("stale-null", 2),
    makeBookmark("not-run", 1),
    makeBookmark("no-version", 4),
  ],
  cohorts: [
    makeCohort(11, "ready", 111, 2),
    makeCohort(12, "stale", 222, 2),
    makeCohort(13, "stale-null", 333, null),
    makeCohort(14, "no-version", 444),
  ],
  expected: [
    ["ready", BookmarkMaterializedCohortStatus.READY],
    ["stale", BookmarkMaterializedCohortStatus.STALE],
    ["stale-null", BookmarkMaterializedCohortStatus.STALE],
    ["not-run", BookmarkMaterializedCohortStatus.NOT_RUN],
    ["no-version", BookmarkMaterializedCohortStatus.READY],
  ],
});

// deno-lint-ignore no-explicit-any
const statuses = (result: any[]) =>
  bookmarkItems(result).map((bookmark) => [
    bookmark.bmkId,
    bookmark.materializationStatus,
  ]);

Deno.test("a cache miss and a cache hit give the same materialization status", async () => {
  const { bookmarks, cohorts, expected } = statusFixture();
  const store = new Map<string, ICohortCacheEntry>();

  await withStubs(
    {
      bookmarks,
      filteredCohorts: cohorts,
      lookup: (_datasetId, bookmarkIds) => {
        const entries: Record<string, ICohortCacheEntry> = {};
        const missing: string[] = [];
        for (const bookmarkId of bookmarkIds) {
          const stored = store.get(bookmarkId);
          if (stored) {
            entries[bookmarkId] = stored;
          } else {
            missing.push(bookmarkId);
          }
        }
        return Promise.resolve({ entries, missing, stale: false });
      },
      write: (_datasetId, entries) => {
        for (const entry of entries) {
          store.set(entry.bookmarkId, {
            materializedCohort: entry.materializedCohort,
          });
        }
        return Promise.resolve();
      },
    },
    async (calls) => {
      const coldResult = await getCohortDefinitionList(TOKEN, DATASET_ID);
      assertEquals(statuses(coldResult), expected);

      const callsAfterColdLoad = {
        getAllBookmarks: calls.getAllBookmarks,
        canMaterializeCohort: calls.canMaterializeCohort,
        getFilteredCohorts: calls.getFilteredCohorts,
        lookup: calls.lookup.length,
        write: calls.write.length,
      };
      assertEquals(callsAfterColdLoad, {
        getAllBookmarks: 1,
        canMaterializeCohort: 1,
        getFilteredCohorts: 1,
        lookup: 1,
        write: 1,
      });

      const warmResult = await getCohortDefinitionList(TOKEN, DATASET_ID);
      assertEquals(statuses(warmResult), expected);
      assertEquals(warmResult, coldResult);

      // The warm load makes only the bookmark, capability and cache lookup
      // calls. It does not query the source database or write the cache.
      assertEquals(
        {
          getAllBookmarks: calls.getAllBookmarks,
          canMaterializeCohort: calls.canMaterializeCohort,
          getFilteredCohorts: calls.getFilteredCohorts,
          lookup: calls.lookup.length,
          write: calls.write.length,
        },
        {
          getAllBookmarks: 2,
          canMaterializeCohort: 2,
          getFilteredCohorts: 1,
          lookup: 2,
          write: 1,
        },
      );
    },
  );
});

Deno.test("the cohort cache write does not contain the materialization status", async () => {
  const { bookmarks, cohorts } = statusFixture();

  await withStubs(
    { bookmarks, filteredCohorts: cohorts },
    async (calls) => {
      await getCohortDefinitionList(TOKEN, DATASET_ID);

      assertEquals(calls.write.length, 1);
      assertEquals(
        calls.write[0].entries.map((entry) => [
          Object.keys(entry).sort(),
          entry.materializedCohort === null
            ? null
            : Object.keys(entry.materializedCohort).sort(),
        ]),
        bookmarks.map((bookmark) => [
          ["bookmarkId", "materializedCohort"],
          bookmark.bmkId === "not-run" ? null : [
            "creationTimestamp",
            "description",
            "id",
            "name",
            "patientCount",
            "syntax",
          ],
        ]),
      );
    },
  );
});

Deno.test("a stale cache hit also gives the materialization status", async () => {
  const { bookmarks, cohorts, expected } = statusFixture();
  const entries: Record<string, ICohortCacheEntry> = {};
  for (const bookmark of bookmarks) {
    const cohort = cohorts.find((candidate) =>
      JSON.parse(candidate.syntax).bookmarkId === bookmark.bmkId
    );
    entries[bookmark.bmkId] = cohort ? positiveEntry(cohort) : negativeEntry();
  }
  const written = writeSignal();

  await withStubs(
    {
      bookmarks,
      filteredCohorts: cohorts,
      lookup: () => Promise.resolve({ entries, missing: [], stale: true }),
      write: () => {
        written.fire();
        return Promise.resolve();
      },
    },
    async (calls) => {
      const result = await getCohortDefinitionList(TOKEN, "stale-status");
      assertEquals(statuses(result), expected);

      await written.fired;
      assertEquals(
        calls.write[0].entries.some((entry) =>
          "materializationStatus" in entry
        ),
        false,
      );
    },
  );
});

Deno.test("the list response schema keeps the materialization status", async () => {
  const { bookmarks, cohorts, expected } = statusFixture();

  await withStubs(
    { bookmarks, filteredCohorts: cohorts },
    async () => {
      const result = await getCohortDefinitionList(TOKEN, DATASET_ID);
      const parsed = CohortDefinitionListResponseDto.parse(result);

      assertEquals(statuses(parsed), expected);
      // Compare the JSON text, as the route sends it. The schema must not
      // remove a field from a bookmark or a cohort.
      assertEquals(
        JSON.parse(JSON.stringify(parsed)),
        JSON.parse(JSON.stringify(result)),
      );
    },
  );
});

Deno.test("the list response schema rejects an unknown materialization status", () => {
  const parsed = CohortDefinitionListResponseDto.safeParse([
    { ...makeBookmark("b1"), materializationStatus: "running" },
  ]);
  assertEquals(parsed.success, false);
});

Deno.test("the status comes from the same cohort as the cohort id", async () => {
  // The lower id has the current bookmark version, but the higher id wins.
  await withStubs(
    {
      bookmarks: [makeBookmark("b1", 2)],
      filteredCohorts: [
        makeCohort(12, "b1", 222, 1),
        makeCohort(11, "b1", 111, 2),
      ],
    },
    async () => {
      const result = await getCohortDefinitionList(TOKEN, DATASET_ID);

      assertEquals(
        bookmarkItems(result).map((bookmark) => [
          bookmark.bmkId,
          bookmark.cohortDefinitionId,
          bookmark.materializationStatus,
        ]),
        [["b1", 12, BookmarkMaterializedCohortStatus.STALE]],
      );
    },
  );
});

/** Bookmarks as the bookmark service could send them, with a status field. */
const bookmarksWithUpstreamStatus = () =>
  [
    { ...makeBookmark("b1"), materializationStatus: "ready" },
    { ...makeBookmark("b2"), materializationStatus: "running" },
  ] as unknown as IBookmark[];

Deno.test("a status from the bookmark service is replaced when cohorts cannot be materialized", async () => {
  await withStubs(
    { bookmarks: bookmarksWithUpstreamStatus(), canMaterializeCohort: false },
    async () => {
      const result = await getCohortDefinitionList(TOKEN, DATASET_ID);

      assertEquals(statuses(result), [
        ["b1", BookmarkMaterializedCohortStatus.NOT_RUN],
        ["b2", BookmarkMaterializedCohortStatus.NOT_RUN],
      ]);
    },
  );
});

Deno.test("the server status replaces a status from the bookmark service", async () => {
  await withStubs(
    {
      bookmarks: bookmarksWithUpstreamStatus(),
      filteredCohorts: [makeCohort(12, "b2", 222, 1)],
    },
    async () => {
      const result = await getCohortDefinitionList(TOKEN, DATASET_ID);

      assertEquals(statuses(result), [
        ["b1", BookmarkMaterializedCohortStatus.NOT_RUN],
        ["b2", BookmarkMaterializedCohortStatus.READY],
      ]);
    },
  );
});
