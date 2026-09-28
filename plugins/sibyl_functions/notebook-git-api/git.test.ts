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
