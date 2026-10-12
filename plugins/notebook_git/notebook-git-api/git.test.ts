// deno-lint-ignore-file no-explicit-any
import { assertEquals, assertThrows } from "jsr:@std/assert@1";
import { Git } from "./git.ts";

function makeGit(): any {
  return new Git({
    repoDir: "./NotebookGitTest",
    repoUrl: "https://example.invalid/repo.git",
    branch: "main",
  });
}

Deno.test("sanitizeFileName accepts a plain uuid json name", () => {
  const g = makeGit();
  assertEquals(
    g.sanitizeFileName("3f1a2b3c-4d5e-6f70-8192-a3b4c5d6e7f8.json"),
    "3f1a2b3c-4d5e-6f70-8192-a3b4c5d6e7f8.json",
  );
});

Deno.test("sanitizeFileName rejects a name containing a slash", () => {
  const g = makeGit();
  assertThrows(() => g.sanitizeFileName("sub/dir.json"), Error, "Invalid filename");
});

Deno.test("sanitizeFileName rejects traversal segments", () => {
  const g = makeGit();
  assertThrows(() => g.sanitizeFileName("../secret.json"), Error, "Invalid filename");
});

Deno.test("resolveFilePath rejects an absolute path", () => {
  const g = makeGit();
  assertThrows(() => g.resolveFilePath("/etc/passwd"), Error, "Invalid filename");
});

// sanitizeFileName's character class allows "." and "..", so a bare ".." or "."
// slips past it untouched — only resolveFilePath's own rel-based check stops
// these. Asserting on "path traversal" (not "Invalid filename") pins down that
// it is specifically this guard, not sanitizeFileName, that fired.
Deno.test("resolveFilePath rejects a bare '..' (sanitizeFileName lets it through)", () => {
  const g = makeGit();
  assertThrows(() => g.resolveFilePath(".."), Error, "path traversal");
});

Deno.test("resolveFilePath rejects a bare '.' (resolves to the repoDir itself)", () => {
  const g = makeGit();
  assertThrows(() => g.resolveFilePath("."), Error, "path traversal");
});

Deno.test("two branches of the same repo get different repo dirs", () => {
  const a = new Git({ repoDir: "./R", repoUrl: "https://x/y.git", branch: "main" }) as any;
  const b = new Git({ repoDir: "./R", repoUrl: "https://x/y.git", branch: "dev" }) as any;
  assertEquals(a.repoDir === b.repoDir, false);
});

function makeGitIn(subDir?: string): any {
  return new Git({
    repoDir: "./NotebookGitTest",
    repoUrl: "https://example.invalid/repo.git",
    branch: "main",
    ...(subDir === undefined ? {} : { subDir }),
  });
}

Deno.test("subDir rejects traversal and absolute paths", () => {
  // subDir is server config, not user input, but a typo must fail loudly rather
  // than silently widening the scope back to the repo root.
  for (const bad of ["../etc", "notebooks/../..", "a//b", "note books", "a/$x"]) {
    assertThrows(() => makeGitIn(bad), Error, "Invalid subDir");
  }
});

Deno.test("subDir accepts plain and nested segments, trimming slashes", () => {
  assertEquals(makeGitIn("notebooks").subDir, "notebooks");
  assertEquals(makeGitIn("/notebooks/").subDir, "notebooks");
  assertEquals(makeGitIn("a/b").subDir, "a/b");
  assertEquals(makeGitIn(undefined).subDir, "");
  assertEquals(makeGitIn("").subDir, "");
});

Deno.test("subDir scopes file paths and keeps git paths repo-relative", () => {
  const g = makeGitIn("notebooks");
  // The on-disk path lands inside the subdirectory...
  assertEquals(g.resolveFilePath("a.json").endsWith("/notebooks/a.json"), true);
  // ...while isomorphic-git still gets a path relative to the repo root.
  assertEquals(g.repoRelative("a.json"), "notebooks/a.json");
  assertEquals(makeGitIn(undefined).repoRelative("a.json"), "a.json");
});

Deno.test("subDir still blocks traversal out of the scoped directory", () => {
  const g = makeGitIn("notebooks");
  assertThrows(() => g.resolveFilePath("../a.json"), Error, "Invalid filename");
});
