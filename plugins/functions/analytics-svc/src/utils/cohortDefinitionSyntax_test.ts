import assert from "node:assert/strict";
import { setBookmarkVersionInCohortSyntax } from "./cohortDefinitionSyntax.ts";

const syntax = JSON.stringify({
    mriquery: "encoded-query",
    datasetId: "d7fbb0d4-0c4f-4d33-9a4b-1f6bb2f0b111",
    bookmarkId: "bookmark_7a",
});

Deno.test("setBookmarkVersionInCohortSyntax adds bookmarkVersion after the other keys", () => {
    assert.equal(
        setBookmarkVersionInCohortSyntax(syntax, 3),
        '{"mriquery":"encoded-query","datasetId":"d7fbb0d4-0c4f-4d33-9a4b-1f6bb2f0b111","bookmarkId":"bookmark_7a","bookmarkVersion":3}'
    );
});

Deno.test("setBookmarkVersionInCohortSyntax omits bookmarkVersion when the version is not an integer", () => {
    for (const version of [undefined, null, "2", 1.5, Number.NaN]) {
        assert.equal(setBookmarkVersionInCohortSyntax(syntax, version), syntax, String(version));
    }
});

Deno.test("setBookmarkVersionInCohortSyntax replaces a bookmarkVersion that is already in the syntax", () => {
    const withVersion = JSON.stringify({ bookmarkId: "bookmark_7a", bookmarkVersion: 99 });
    assert.equal(JSON.parse(setBookmarkVersionInCohortSyntax(withVersion, 4)).bookmarkVersion, 4);
    assert.equal(
        "bookmarkVersion" in JSON.parse(setBookmarkVersionInCohortSyntax(withVersion, null)),
        false
    );
});

Deno.test("setBookmarkVersionInCohortSyntax writes a null bookmarkVersion when pending", () => {
    for (const version of [3, null, undefined, "2"]) {
        const parsed = JSON.parse(
            setBookmarkVersionInCohortSyntax(syntax, version, { pending: true })
        );
        assert.equal("bookmarkVersion" in parsed, true, String(version));
        assert.equal(parsed.bookmarkVersion, null, String(version));
    }
});

Deno.test("setBookmarkVersionInCohortSyntax pending and final differ only in bookmarkVersion", () => {
    const pending = JSON.parse(setBookmarkVersionInCohortSyntax(syntax, 3, { pending: true }));
    const final = JSON.parse(setBookmarkVersionInCohortSyntax(syntax, 3));
    assert.deepEqual({ ...pending, bookmarkVersion: 3 }, final);
});
