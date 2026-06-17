export type NotebookCellCtx = {
  id: string;
  type: "code" | "markdown";
  language?: string;
  source: string;
  outputs?: string;
};

export type EditOp =
  | {
      op: "add_cell";
      cellType: "code" | "markdown";
      language?: "python" | "r";
      source: string;
      position?: number;
    }
  | { op: "update_cell"; cellId: string; source: string }
  | { op: "delete_cell"; cellId: string };

export const SENTINEL = "<<<D2E_EDITS>>>";

const MAX_OUTPUT_CHARS = 2000;

export function serializeNotebookForPrompt(cells: NotebookCellCtx[]): string {
  if (cells.length === 0) return "(the notebook is empty)";
  return cells
    .map((c, i) => {
      const lines = [
        `--- cell ${i} ---`,
        `id: ${c.id}`,
        `type: ${c.type}`,
      ];
      if (c.language) lines.push(`language: ${c.language}`);
      lines.push(`source:\n${c.source}`);
      if (c.outputs && c.outputs.length > 0) {
        const out =
          c.outputs.length > MAX_OUTPUT_CHARS
            ? c.outputs.slice(0, MAX_OUTPUT_CHARS) + "\n…(truncated)"
            : c.outputs;
        lines.push(`outputs:\n${out}`);
      }
      return lines.join("\n");
    })
    .join("\n\n");
}

export function frameEdits(edits: EditOp[]): string {
  return `\n${SENTINEL}\n${JSON.stringify(edits)}`;
}
