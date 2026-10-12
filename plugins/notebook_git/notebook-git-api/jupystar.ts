// @ts-nocheck - Deno edge function (trex EdgeRuntime).
/**
 * Convert a Starboard/jupystar plaintext notebook into the Vue notebook's
 * structured NotebookData.
 *
 * WHY THIS EXISTS: the two notebook implementations store different things.
 * The React notebook (plugins/ui/apps/webr-notebook) keeps a notebook as a
 * single `notebookContent` STRING in this plaintext format, and the published
 * template repo (data2evidence/templates, `notebooks/`) is written in it. The
 * Vue notebook's NotebookData is `{ metadata, cells[] }`. Handing the raw
 * string through would put a 5KB string where the editor expects cells, so
 * templates have to be parsed here.
 *
 * Format:
 *   ---                      <- optional YAML frontmatter
 *   ipynb_metadata: ...
 *   ---
 *   # %% [markdown]          <- cell markers; `# %%--- [x]` is the same marker
 *   ### some markdown
 *   # %% [jupyter]           <- `jupyter` means a code cell
 *   library(dplyr)
 *
 * Anything before the first marker is ignored; an unmarked body becomes a
 * single code cell. Parsing never throws — a template that cannot be read is
 * dropped by the caller rather than breaking the whole list.
 */

export interface JupystarCell {
  type: "code" | "markdown";
  source: string;
}

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;
// `# %%` or `# %%---`, optionally followed by a [tag]. Trailing text is ignored.
// The `---` form opens a per-cell metadata block (see METADATA_END).
const MARKER = /^#\s*%%(-+)?\s*(?:\[([^\]]*)\])?\s*$/;
// Closes the metadata block opened by a `# %%---` marker. The lines between the
// two are the cell's own `# id:` / `# properties:` header, NOT cell content —
// without this they render as literal text at the top of every cell.
const METADATA_END = /^#\s*-+%%\s*$/;

/** Frontmatter is tiny and fixed-shape here, so scan for the key rather than
 * pulling in a YAML parser the edge runtime would have to bundle. */
export function frontmatterLanguage(frontmatter: string): string {
  const m = frontmatter.match(/language_info:\s*\r?\n\s*name:\s*([^\s#]+)/) ||
    frontmatter.match(/(?:^|\n)\s*name:\s*([^\s#]+)/);
  return m ? m[1].trim() : "";
}

/**
 * Pick the kernel language. The templates in data2evidence/templates declare
 * `python` (or a bare venv name) in frontmatter while every one of their code
 * cells is R, so a declared language is only trusted when it actually names a
 * language the editor supports; otherwise the code decides.
 */
export function detectLanguage(declared: string, code: string): "python" | "r" {
  const d = declared.trim().toLowerCase();
  if (d === "r" || d === "ir") return "r";
  if (d === "python" || d === "python3") {
    // Declared python, but R-only syntax in the cells wins — see above.
    return looksLikeR(code) ? "r" : "python";
  }
  return looksLikeR(code) ? "r" : "python";
}

function looksLikeR(code: string): boolean {
  return /(^|\n)\s*library\s*\(/.test(code) ||
    /(^|\n)\s*require\s*\(/.test(code) ||
    /<-\s/.test(code) ||
    /::/.test(code) && !/import\s/.test(code);
}

/** Split the body into cells on `# %%` markers. */
export function splitCells(body: string): JupystarCell[] {
  const lines = body.split(/\r?\n/);
  const cells: JupystarCell[] = [];
  let current: JupystarCell | null = null;
  const push = () => {
    if (!current) return;
    const source = current.source.replace(/^\n+/, "").replace(/\s+$/, "");
    if (source) cells.push({ ...current, source });
    current = null;
  };

  let inMetadata = false;
  for (const line of lines) {
    const m = line.match(MARKER);
    if (m) {
      push();
      const tag = (m[2] || "").trim().toLowerCase();
      current = { type: tag === "markdown" ? "markdown" : "code", source: "" };
      // Only the `---` form carries a metadata header to skip.
      inMetadata = Boolean(m[1]);
      continue;
    }
    if (inMetadata) {
      if (METADATA_END.test(line)) inMetadata = false;
      continue;
    }
    // Text before the first marker belongs to no cell and is dropped.
    if (current) current.source += `${line}\n`;
  }
  push();
  return cells;
}

/** Parse a plaintext notebook into NotebookData-shaped data. */
export function parseJupystar(text: string, newId: () => string = () => crypto.randomUUID()) {
  const src = typeof text === "string" ? text : "";
  const fm = src.match(FRONTMATTER);
  const body = fm ? src.slice(fm[0].length) : src;
  const declared = fm ? frontmatterLanguage(fm[1]) : "";

  let parsed = splitCells(body);
  // No markers at all: treat the whole body as one code cell rather than
  // returning an empty notebook that looks like a load failure.
  if (parsed.length === 0 && body.trim()) {
    parsed = [{ type: "code", source: body.trim() }];
  }

  const code = parsed.filter((c) => c.type === "code").map((c) => c.source).join("\n");
  const language = detectLanguage(declared, code);

  const cells = parsed.map((c) =>
    c.type === "markdown"
      ? { id: newId(), type: "markdown", source: c.source }
      : {
        id: newId(),
        type: "code",
        language,
        source: c.source,
        executionCount: null,
        executionState: "idle",
        outputs: [],
      }
  );

  return { metadata: { language_info: { name: language } }, cells };
}
