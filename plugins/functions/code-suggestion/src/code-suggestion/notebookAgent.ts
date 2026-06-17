import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";

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

export function createNotebookEditTools(
  cells: NotebookCellCtx[],
  sink: EditOp[],
): DynamicStructuredTool[] {
  const exists = (cellId: string) => cells.some((c) => c.id === cellId);

  const addCell = new DynamicStructuredTool({
    name: "add_cell",
    description:
      "Add a new cell to the notebook. Use this to insert new code or markdown. " +
      "Set language to 'r' or 'python' for code cells. position is the 0-based " +
      "index to insert at; omit to append at the end.",
    schema: z.object({
      cellType: z.enum(["code", "markdown"]).optional(),
      language: z.enum(["python", "r"]).optional(),
      source: z.string().describe("The full source for the new cell"),
      position: z.number().int().optional(),
    }),
    func: async (args: any) => {
      const op: EditOp = {
        op: "add_cell",
        cellType: args.cellType ?? "code",
        source: args.source,
      };
      if (args.language) (op as any).language = args.language;
      if (typeof args.position === "number") (op as any).position = args.position;
      sink.push(op);
      return `ok: queued add_cell (${(op as any).cellType})`;
    },
  });

  const updateCell = new DynamicStructuredTool({
    name: "update_cell",
    description:
      "Replace the entire source of an existing cell, identified by its id. " +
      "The id must be one of the ids shown in the notebook context.",
    schema: z.object({
      cellId: z.string().describe("The id of the cell to update"),
      source: z.string().describe("The new full source for the cell"),
    }),
    func: async (args: any) => {
      if (!exists(args.cellId)) {
        return `error: no cell with id '${args.cellId}'. Use one of the ids from the notebook context.`;
      }
      sink.push({ op: "update_cell", cellId: args.cellId, source: args.source });
      return `ok: queued update_cell ${args.cellId}`;
    },
  });

  const deleteCell = new DynamicStructuredTool({
    name: "delete_cell",
    description: "Delete an existing cell, identified by its id.",
    schema: z.object({
      cellId: z.string().describe("The id of the cell to delete"),
    }),
    func: async (args: any) => {
      if (!exists(args.cellId)) {
        return `error: no cell with id '${args.cellId}'.`;
      }
      sink.push({ op: "delete_cell", cellId: args.cellId });
      return `ok: queued delete_cell ${args.cellId}`;
    },
  });

  return [addCell, updateCell, deleteCell];
}
