import { Knex } from "knex";
import { env } from "../../env";

// DuckDB 2.0 rejects single-arrow lambdas (`e -> ...`). Rewrite the FHIR
// config expressions already seeded (or copied) into deployed databases.
const REWRITES: [string, string][] = [
  [", e -> e.valueCoding.display)", ", lambda e: e.valueCoding.display)"],
  ["(acc, e) -> concat(", "lambda acc, e: concat("],
];

const table = `${env.PG_SCHEMA}."ConfigDbModels_Config"`;

async function rewrite(knex: Knex, from: number, to: number): Promise<void> {
  for (const pair of REWRITES) {
    await knex.raw(
      `UPDATE ${table} SET "Data" = replace("Data", ?, ?) WHERE strpos("Data", ?) > 0`,
      [pair[from], pair[to], pair[from]],
    );
  }
}

export async function up(knex: Knex): Promise<void> {
  await rewrite(knex, 0, 1);
}

export async function down(knex: Knex): Promise<void> {
  await rewrite(knex, 1, 0);
}
