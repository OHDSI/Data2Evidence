import { Knex } from "knex";
import {env} from "../../env"

export async function seed(knex: Knex): Promise<void> {
  // Inserts seed entries
  await knex
    .withSchema(env.PG_SCHEMA)
    .into("ConfigDbModels_UserDefaultConfig")
    .insert([
      {
        User: "ALICE",
        ConfigType: "HC/MRI/PA",
        ConfigId: "9ED45EBEDE1A4D5487EB96FCA9D04191",
        ConfigVersion: "A",
      },
    ])    
    .onConflict(["User", "ConfigType"])
    .ignore();
}
