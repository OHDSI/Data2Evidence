import { assertEquals } from "@std/assert";
import { BookmarkMaterializedCohortStatus } from "../api/types.ts";
import { deriveBookmarkMaterializedCohortStatus } from "./bookmarkMaterializedCohortStatus.ts";

const cohortWithSyntax = (syntax: Record<string, unknown>) => ({
  syntax: JSON.stringify({
    mriquery: "encoded-query",
    datasetId: "dataset-1",
    bookmarkId: "bookmark_1",
    ...syntax,
  }),
});

Deno.test("deriveBookmarkMaterializedCohortStatus gives not-run when no cohort is linked", () => {
  assertEquals(
    deriveBookmarkMaterializedCohortStatus({ version: 1 }, undefined),
    BookmarkMaterializedCohortStatus.NOT_RUN,
  );
  assertEquals(
    deriveBookmarkMaterializedCohortStatus({ version: null }, undefined),
    BookmarkMaterializedCohortStatus.NOT_RUN,
  );
});

Deno.test("deriveBookmarkMaterializedCohortStatus gives ready when the versions are equal", () => {
  assertEquals(
    deriveBookmarkMaterializedCohortStatus(
      { version: 1 },
      cohortWithSyntax({ bookmarkVersion: 1 }),
    ),
    BookmarkMaterializedCohortStatus.READY,
  );
  assertEquals(
    deriveBookmarkMaterializedCohortStatus(
      { version: 7 },
      cohortWithSyntax({ bookmarkVersion: 7 }),
    ),
    BookmarkMaterializedCohortStatus.READY,
  );
});

Deno.test("deriveBookmarkMaterializedCohortStatus gives stale when the bookmark version changed", () => {
  assertEquals(
    deriveBookmarkMaterializedCohortStatus(
      { version: 2 },
      cohortWithSyntax({ bookmarkVersion: 1 }),
    ),
    BookmarkMaterializedCohortStatus.STALE,
  );
  assertEquals(
    deriveBookmarkMaterializedCohortStatus(
      { version: 1 },
      cohortWithSyntax({ bookmarkVersion: 2 }),
    ),
    BookmarkMaterializedCohortStatus.STALE,
  );
});

Deno.test("deriveBookmarkMaterializedCohortStatus gives stale when the bookmark version is null", () => {
  assertEquals(
    deriveBookmarkMaterializedCohortStatus(
      { version: null },
      cohortWithSyntax({ bookmarkVersion: 1 }),
    ),
    BookmarkMaterializedCohortStatus.STALE,
  );
});

Deno.test("deriveBookmarkMaterializedCohortStatus gives ready when the syntax has no bookmarkVersion", () => {
  assertEquals(
    deriveBookmarkMaterializedCohortStatus(
      { version: 3 },
      cohortWithSyntax({}),
    ),
    BookmarkMaterializedCohortStatus.READY,
  );
  assertEquals(
    deriveBookmarkMaterializedCohortStatus(
      { version: null },
      cohortWithSyntax({}),
    ),
    BookmarkMaterializedCohortStatus.READY,
  );
});

Deno.test("deriveBookmarkMaterializedCohortStatus gives ready when the syntax cannot be read", () => {
  for (const syntax of [null, undefined, "", "not json", "null", "5", "[1]"]) {
    assertEquals(
      deriveBookmarkMaterializedCohortStatus(
        { version: 2 },
        { syntax: syntax as unknown as string },
      ),
      BookmarkMaterializedCohortStatus.READY,
      String(syntax),
    );
  }
});

Deno.test("deriveBookmarkMaterializedCohortStatus compares a string bookmarkVersion strictly", () => {
  assertEquals(
    deriveBookmarkMaterializedCohortStatus(
      { version: 2 },
      cohortWithSyntax({ bookmarkVersion: "2" }),
    ),
    BookmarkMaterializedCohortStatus.STALE,
  );
});

// A null `bookmarkVersion` marks a materialization that is not complete.
Deno.test("deriveBookmarkMaterializedCohortStatus gives stale for a pending (null) bookmarkVersion", () => {
  for (const version of [null, 1, 2, 7]) {
    assertEquals(
      deriveBookmarkMaterializedCohortStatus(
        { version },
        cohortWithSyntax({ bookmarkVersion: null }),
      ),
      BookmarkMaterializedCohortStatus.STALE,
      String(version),
    );
  }
});
