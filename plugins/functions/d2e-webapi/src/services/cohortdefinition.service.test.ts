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

const makeBookmark = (bmkId: string): IBookmark => ({
  bmkId,
  bookmarkname: `bookmark ${bmkId}`,
  bookmark: "{}",
  viewname: null,
  modified: "2026-08-01T00:00:00.000Z",
  version: 1,
  user_id: "user-1",
  shared: false,
});

const makeCohort = (
  id: number,
  bookmarkId: string,
  patientCount: number,
): IBaseMaterializedCohort => ({
  id,
  name: `cohort ${id}`,
  description: `description of cohort ${id}`,
  creationTimestamp: "2026-08-02T00:00:00.000Z",
  syntax: JSON.stringify({ datasetId: DATASET_ID, bookmarkId }),
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
 * Installs prototype doubles for every outbound call `getCohortDefinitionList`
 * makes and restores them in `finally`, matching the idiom in
 * `conceptset.service.test.ts`.
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
    getFilteredCohorts: 0,
    lookup: [],
    write: [],
  };

  try {
    BookmarksAPI.prototype.getAllBookmarks = (_datasetId: string) =>
      Promise.resolve({
        bookmarks: config.bookmarks,
        schemaName: "cdm_schema",
      });

    AnalyticsSvcAPI.prototype.canMaterializeCohort = (_datasetId: string) =>
      Promise.resolve(config.canMaterializeCohort ?? true);

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
        : Promise.resolve({ entries: {}, missing: [...bookmarkIds] });
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
      // If the implementation ever reaches the source database this stub would
      // hand back a different answer, so the assertions below double as a
      // check that it did not.
      filteredCohorts: [makeCohort(99, "b1", 999)],
      lookup: () =>
        Promise.resolve({
          entries: {
            b1: positiveEntry(cohortForB1),
            b2: negativeEntry(),
            b3: positiveEntry(cohortForB3),
          },
          missing: [],
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

Deno.test("negative cache entries are hits: an all-null dataset skips getFilteredCohorts on the second load", async () => {
  // The single most likely silent failure is an implementation that reads
  // `materializedCohort: null` as "not cached". Most bookmarks have no
  // materialized cohort, so that inversion would produce a full miss on every
  // load while still returning correct data.
  //
  // This test rides a real round trip through an in-memory store: the first
  // load populates it with nothing but negative entries, and the second load
  // must be served entirely from them. If `null` were treated as a miss the
  // second load would call getFilteredCohorts again and the count assertion
  // below would read 2 instead of 1.
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
        return Promise.resolve({ entries, missing });
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

      // The load-bearing assertion: still 1, i.e. the warm load added none.
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
  // Deliberately stale: if the response were assembled from the partial cache
  // read the patient count would come back as 1.
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
      // Sorted by cohort id, and built from the authoritative result.
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

Deno.test("empty cache behaves as today and writes an entry for every bookmark", async () => {
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
      // Mirrors the 500 analytics-svc returns when it cannot resolve
      // paConfigId server-side.
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
      // The cache could not answer, so this request behaves exactly as it did
      // before the cache existed and does not attempt a write either.
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
    },
  );
});
