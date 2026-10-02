import { assertEquals } from "jsr:@std/assert@1";
import { canonicalize, contentEquals } from "./diff.ts";

Deno.test("canonicalize sorts object keys recursively", () => {
  assertEquals(
    canonicalize({ b: 1, a: { d: 2, c: 3 } }),
    canonicalize({ a: { c: 3, d: 2 }, b: 1 }),
  );
});

Deno.test("canonicalize preserves array order", () => {
  assertEquals(canonicalize([1, 2]) === canonicalize([2, 1]), false);
});

Deno.test("contentEquals is true for key-reordered notebook content", () => {
  const a = { metadata: { kernel: "pyodide" }, cells: [{ id: "c1", type: "code", source: "1+1" }] };
  const b = { cells: [{ source: "1+1", type: "code", id: "c1" }], metadata: { kernel: "pyodide" } };
  assertEquals(contentEquals(a, b), true);
});

Deno.test("contentEquals is false when a cell source differs", () => {
  const a = { cells: [{ id: "c1", source: "1+1" }] };
  const b = { cells: [{ id: "c1", source: "2+2" }] };
  assertEquals(contentEquals(a, b), false);
});

Deno.test("contentEquals treats a JSON string and its parsed object as equal", () => {
  const obj = { cells: [], metadata: {} };
  assertEquals(contentEquals(JSON.stringify(obj), obj), true);
});

Deno.test("contentEquals is false when one side is unparseable", () => {
  assertEquals(contentEquals("not json{", { cells: [] }), false);
});
