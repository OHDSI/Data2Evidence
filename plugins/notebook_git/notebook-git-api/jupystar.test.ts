import { assertEquals } from "jsr:@std/assert@1";
import {
  detectLanguage,
  frontmatterLanguage,
  parseJupystar,
  splitCells,
} from "./jupystar.ts";

// Deterministic ids keep the assertions readable.
const ids = () => {
  let n = 0;
  return () => `id-${++n}`;
};

Deno.test("splitCells separates markdown and code on plain markers", () => {
  const cells = splitCells(
    "# %% [markdown]\n### Title\n# %% [jupyter]\nlibrary(dplyr)\n",
  );
  assertEquals(cells, [
    { type: "markdown", source: "### Title" },
    { type: "code", source: "library(dplyr)" },
  ]);
});

Deno.test("splitCells drops the per-cell metadata header of `# %%---` cells", () => {
  // Regression: the published templates use this form, and without skipping the
  // header every cell rendered `# id: ...` as literal content.
  const cells = splitCells(
    "# %%--- [markdown]\n# id: fc468ce0\n# properties: {}\n# ---%%\n### Real content\n",
  );
  assertEquals(cells, [{ type: "markdown", source: "### Real content" }]);
});

Deno.test("splitCells keeps `#` comments that are part of code", () => {
  const cells = splitCells("# %% [jupyter]\n# a real comment\nx <- 1\n");
  assertEquals(cells, [{ type: "code", source: "# a real comment\nx <- 1" }]);
});

Deno.test("splitCells ignores text before the first marker and drops empty cells", () => {
  const cells = splitCells("stray preamble\n# %% [jupyter]\n\n# %% [markdown]\nkept\n");
  assertEquals(cells, [{ type: "markdown", source: "kept" }]);
});

Deno.test("an untagged marker is a code cell", () => {
  assertEquals(splitCells("# %%\nprint(1)\n"), [
    { type: "code", source: "print(1)" },
  ]);
});

Deno.test("frontmatterLanguage reads language_info.name", () => {
  assertEquals(
    frontmatterLanguage("ipynb_metadata:\n  language_info:\n    name: python\n"),
    "python",
  );
  assertEquals(frontmatterLanguage("jupystar:\n  version: 0.2.1\n"), "");
});

Deno.test("detectLanguage trusts R code over a python label", () => {
  // Every template in data2evidence/templates declares python but is R.
  assertEquals(detectLanguage("python", "library(Strategus)"), "r");
  assertEquals(detectLanguage("python", "import os\nprint(1)"), "python");
  assertEquals(detectLanguage("r", "print(1)"), "r");
  assertEquals(detectLanguage("semantic_search_venv", "x <- 1"), "r");
});

Deno.test("parseJupystar strips frontmatter and returns NotebookData", () => {
  const nb = parseJupystar(
    "---\nipynb_metadata:\n  language_info:\n    name: python\n---\n" +
      "# %% [markdown]\n### Heading\n# %% [jupyter]\nlibrary(dplyr)\n",
    ids(),
  );
  assertEquals(nb.metadata, { language_info: { name: "r" } });
  assertEquals(nb.cells, [
    { id: "id-1", type: "markdown", source: "### Heading" },
    {
      id: "id-2",
      type: "code",
      language: "r",
      source: "library(dplyr)",
      executionCount: null,
      executionState: "idle",
      outputs: [],
    },
  ]);
});

Deno.test("a body with no markers becomes one code cell", () => {
  const nb = parseJupystar("print(1)\n", ids());
  assertEquals(nb.cells.length, 1);
  assertEquals(nb.cells[0].type, "code");
  assertEquals(nb.cells[0].source, "print(1)");
});

Deno.test("empty input yields an empty notebook rather than throwing", () => {
  assertEquals(parseJupystar("", ids()).cells, []);
  assertEquals(parseJupystar("---\njupystar:\n  version: 1\n---\n", ids()).cells, []);
});
