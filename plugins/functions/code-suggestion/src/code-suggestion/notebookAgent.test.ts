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

import { createNotebookEditTools } from "./notebookAgent.ts";

const sampleCells: NotebookCellCtx[] = [
  { id: "c1", type: "code", language: "r", source: "1+1" },
  { id: "c2", type: "markdown", source: "# hi" },
];

function toolByName(tools: { name: string }[], name: string) {
  const t = tools.find((x) => x.name === name);
  if (!t) throw new Error(`tool ${name} not found`);
  return t as { name: string; func: (args: any) => Promise<string> };
}

Deno.test("update_cell records an edit for a valid cellId", async () => {
  const sink: EditOp[] = [];
  const tools = createNotebookEditTools(sampleCells, sink);
  const res = await toolByName(tools, "update_cell").func({
    cellId: "c1",
    source: "2+2",
  });
  assertStringIncludes(res, "ok");
  assertEquals(sink, [{ op: "update_cell", cellId: "c1", source: "2+2" }]);
});

Deno.test("update_cell rejects an unknown cellId without recording", async () => {
  const sink: EditOp[] = [];
  const tools = createNotebookEditTools(sampleCells, sink);
  const res = await toolByName(tools, "update_cell").func({
    cellId: "nope",
    source: "x",
  });
  assertStringIncludes(res, "error");
  assertEquals(sink.length, 0);
});

Deno.test("delete_cell records an edit for a valid cellId", async () => {
  const sink: EditOp[] = [];
  const tools = createNotebookEditTools(sampleCells, sink);
  await toolByName(tools, "delete_cell").func({ cellId: "c2" });
  assertEquals(sink, [{ op: "delete_cell", cellId: "c2" }]);
});

Deno.test("add_cell records an edit and defaults type to code", async () => {
  const sink: EditOp[] = [];
  const tools = createNotebookEditTools(sampleCells, sink);
  await toolByName(tools, "add_cell").func({
    source: "print('hi')",
    language: "python",
  });
  assertEquals(sink, [
    { op: "add_cell", cellType: "code", language: "python", source: "print('hi')" },
  ]);
});

Deno.test("edits accumulate in call order across tools", async () => {
  const sink: EditOp[] = [];
  const tools = createNotebookEditTools(sampleCells, sink);
  await toolByName(tools, "update_cell").func({ cellId: "c1", source: "a" });
  await toolByName(tools, "delete_cell").func({ cellId: "c2" });
  assertEquals(sink.map((e) => e.op), ["update_cell", "delete_cell"]);
});
