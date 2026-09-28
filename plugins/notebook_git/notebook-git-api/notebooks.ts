// @ts-nocheck - Deno edge function (trex EdgeRuntime).
// Row access for notebook.document through the DuckDB->Postgres `_config`
// attach, the same path metadata-api uses for _config.notebook.cdm_connection.
import { query, lit } from "./sql.ts";

export interface NotebookRow {
  id: string;
  name: string;
  description: string;
  content: unknown;
  deletedAt: string | null;
}

export async function readNotebook(id: string): Promise<NotebookRow | null> {
  const { rows } = await query(
    `SELECT id, name, description, content, deleted_at
       FROM _config.notebook.document WHERE id = ${lit(id)}`,
  );
  const r = rows[0];
  if (!r) return null;
  return {
    id: String(r.id),
    name: String(r.name ?? ""),
    description: String(r.description ?? ""),
    content: typeof r.content === "string" ? safeParse(r.content) : r.content,
    deletedAt: r.deleted_at ? String(r.deleted_at) : null,
  };
}

export async function writeNotebook(
  id: string,
  fields: { name: string; description: string; content: unknown },
): Promise<void> {
  const content = JSON.stringify(fields.content ?? {});
  await query(
    `UPDATE _config.notebook.document
        SET name = ${lit(fields.name)},
            description = ${lit(fields.description)},
            content = ${lit(content)}::jsonb,
            updated_at = now()
      WHERE id = ${lit(id)}`,
  );
}

function safeParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}
