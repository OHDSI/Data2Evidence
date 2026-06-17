import { assertEquals, assertStringIncludes } from "jsr:@std/assert@1.0.6";
import {
  serializeNotebookForPrompt,
  frameEdits,
  SENTINEL,
  type NotebookCellCtx,
  type EditOp,
} from "./notebookAgent.ts";

Deno.test("serializeNotebookForPrompt lists cells with id, type, language, source", () => {
  const cells: NotebookCellCtx[] = [
    { id: "c1", type: "code", language: "r", source: "library(rD2E)" },
    { id: "c2", type: "markdown", source: "# Title" },
  ];
  const out = serializeNotebookForPrompt(cells);
  assertStringIncludes(out, "id: c1");
  assertStringIncludes(out, "type: code");
  assertStringIncludes(out, "language: r");
  assertStringIncludes(out, "library(rD2E)");
  assertStringIncludes(out, "id: c2");
  assertStringIncludes(out, "type: markdown");
});

Deno.test("serializeNotebookForPrompt includes truncated outputs when present", () => {
  const long = "x".repeat(5000);
  const out = serializeNotebookForPrompt([
    { id: "c1", type: "code", source: "1", outputs: long },
  ]);
  assertStringIncludes(out, "outputs:");
  // Truncated to <= 2000 chars plus an ellipsis marker.
  assertEquals(out.includes("x".repeat(2001)), false);
});

Deno.test("serializeNotebookForPrompt handles empty notebook", () => {
  assertEquals(serializeNotebookForPrompt([]), "(the notebook is empty)");
});

Deno.test("frameEdits emits the sentinel followed by JSON on its own line", () => {
  const edits: EditOp[] = [{ op: "delete_cell", cellId: "c1" }];
  const framed = frameEdits(edits);
  assertStringIncludes(framed, SENTINEL);
  const json = framed.slice(framed.indexOf(SENTINEL) + SENTINEL.length).trim();
  assertEquals(JSON.parse(json), edits);
});

Deno.test("frameEdits emits an empty array when there are no edits", () => {
  const framed = frameEdits([]);
  const json = framed.slice(framed.indexOf(SENTINEL) + SENTINEL.length).trim();
  assertEquals(JSON.parse(json), []);
});
