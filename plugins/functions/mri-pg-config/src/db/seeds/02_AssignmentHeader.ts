import { Knex } from "knex";
import {env} from "../../env"

export async function seed(knex: Knex): Promise<void> {
  // Inserts seed entries
  await knex
    .withSchema(env.PG_SCHEMA)
    .into("ConfigDbModels_AssignmentHeader")
    .insert([
      {
        Id: "3D00794D4078407C9B6F67675E62A26D",
        Name: "PUBLIC-CHART_DEFAULT-ASSIGNMENT",
        EntityType: "U",
        EntityValue: "DEFAULT_CONFIG_ASSIGNMENT",
        Creator: "ALICE",
        Created: "2017-09-13 06:58:03",
        Modifier: "ALICE",
        Modified: "2017-09-18 08:24:07",
      }, {
        Id: "ddf8d1ec-30e0-4dab-94cb-490f5900fd98",
        Name: "DEFAULT-ASSIGNMENT",
        EntityType: "U",
        EntityValue: "DEFAULT_CONFIG_ASSIGNMENT",
        Creator: "ALICE",
        Created: "2017-09-13 06:58:03",
        Modifier: "ALICE",
        Modified: "2017-09-18 08:24:07",
      },
      {
        Id: "0dcbe37c-199e-4884-89f9-42f7386e4f54",
        Name: "DEFAULT-ASSIGNMENT",
        EntityType: "U",
        EntityValue: "DEFAULT_CONFIG_ASSIGNMENT",
        Creator: "ALICE",
        Created: "2025-03-13 06:58:03",
        Modifier: "ALICE",
        Modified: "2025-03-17 08:24:07",
      },
    ])    
    .onConflict(["Id"])
    .ignore();
}
