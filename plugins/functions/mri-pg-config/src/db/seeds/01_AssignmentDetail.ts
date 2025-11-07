import { Knex } from "knex";
import {env} from "../../env"

export async function seed(knex: Knex): Promise<void> {
  // Inserts seed entries
  await knex
    .withSchema(env.PG_SCHEMA)
    .into("ConfigDbModels_AssignmentDetail")
    .insert([
      {
        HeaderId: "3D00794D4078407C9B6F67675E62A26D",
        ConfigId: "92d7c6f8-3118-4256-ab22-f2f7fd19d4e7",
        ConfigVersion: "A",
        ConfigType: "HC/MRI/PA",
      },
      {
        HeaderId: "ddf8d1ec-30e0-4dab-94cb-490f5900fd98",
        ConfigId: "92d7c6f8-3118-4256-ab22-f2f7fd19d4e7",
        ConfigVersion: "A",
        ConfigType: "HC/MRI/PA",
      },
      {
        HeaderId: "3D00794D4078407C9B6F67675E62A26D",
        ConfigId: "4fce3cb7-32bf-4b46-8cba-32e4f77a14dd",
        ConfigVersion: "A",
        ConfigType: "HC/MRI/PA",
      },
      {
        HeaderId: "ddf8d1ec-30e0-4dab-94cb-490f5900fd98",
        ConfigId: "4fce3cb7-32bf-4b46-8cba-32e4f77a14dd",
        ConfigVersion: "A",
        ConfigType: "HC/MRI/PA",
      },
      {
        HeaderId: "0dcbe37c-199e-4884-89f9-42f7386e4f54",
        ConfigId: "e10f83a0-ade9-4a33-90ae-cf760813943c",
        ConfigVersion: "1",
        ConfigType: "HC/HPH/CDW",
      },
    ])
    .onConflict(["HeaderId", "ConfigId"])
    .ignore();
}
