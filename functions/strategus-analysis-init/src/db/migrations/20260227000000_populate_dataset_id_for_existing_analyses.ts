import { create } from "domain";
import { Knex } from "knex";

const env = Deno.env.toObject();

export async function up(knex: Knex): Promise<void> {
  // Get all strategus_analysis records where dataset_id is null
  const analysesWithoutDataset = await knex
    .withSchema(env.PG_SCHEMA)
    .select("*")
    .from("strategus_analysis")
    .whereNull("dataset_id");

  console.log(`Found ${analysesWithoutDataset.length} strategus_analysis records without dataset_id`);

  // Process each analysis record
  for (const analysis of analysesWithoutDataset) {
    const datasetId = crypto.randomUUID();
    const studyId = analysis.study_id;

    // Get tenant_id from the first dataset (or use a default)
    const existingDataset = await knex
      .withSchema(env.PG_PORTAL_SCHEMA)
      .select("tenant_id")
      .from("dataset")
      .first();

    const tenantId = existingDataset?.tenant_id || "00000000-0000-0000-0000-000000000001";

    console.log(`Creating dataset ${datasetId} for analysis ${analysis.id} (study_id: ${studyId})`);

    try {
      // Insert into dataset table with default values matching services.ts
      await knex.withSchema(env.PG_PORTAL_SCHEMA).insert({
        id: datasetId,
        type: "strategus_analysis",
        token_dataset_code: studyId, // Use studyId as tokenDatasetCode
        tenant_id: tenantId,
        dialect: "postgres",
        database_code: "dummy",
        schema_name: `results_${studyId}`,
        vocab_schema_name: "",
        result_schema_name: "",
        data_model: "dummy",
        visibility_status: "DEFAULT",
        created_date: new Date(),
        modified_date: new Date(),
        created_by: "migration_script", // TODO: change to admin user if needed
        modified_by: "migration_script", 
      }).into("dataset");

      // Insert into dataset_detail table
      await knex.withSchema(env.PG_PORTAL_SCHEMA).insert({
        id: crypto.randomUUID(),
        dataset_id: datasetId,
        name: studyId,
        summary: "strategus analysis",
        description: "",
        show_request_access: false,
        created_date: new Date(),
        modified_date: new Date(),
        created_by: "migration_script",
        modified_by: "migration_script",
      }).into("dataset_detail");

      // Update strategus_analysis with the new dataset_id
      await knex
        .withSchema(env.PG_SCHEMA)
        .table("strategus_analysis")
        .where("id", analysis.id)
        .update({
          dataset_id: datasetId,
          updated_at: new Date(),
        });

      console.log(`Successfully created dataset ${datasetId} for analysis ${analysis.id}`);
    } catch (error) {
      console.error(`Error creating dataset for analysis ${analysis.id}:`, error);
      throw error;
    }
  }

  console.log("Migration completed successfully");
}

export async function down(knex: Knex): Promise<void> {
  // To rollback, we would need to:
  // 1. Find all datasets of type 'strategus_analysis'
  // 2. Delete them and their related records
  // 3. Set dataset_id to null in strategus_analysis
  
  const strategusDatasets = await knex
    .withSchema(env.PG_PORTAL_SCHEMA)
    .select("id")
    .from("dataset")
    .where("type", "strategus_analysis");

  console.log(`Rolling back ${strategusDatasets.length} strategus_analysis datasets`);

  for (const dataset of strategusDatasets) {
    // Delete dataset_detail records
    await knex
      .withSchema(env.PG_PORTAL_SCHEMA)
      .table("dataset_detail")
      .where("dataset_id", dataset.id)
      .del();

    // Delete dataset record
    await knex
      .withSchema(env.PG_PORTAL_SCHEMA)
      .table("dataset")
      .where("id", dataset.id)
      .del();
  }

  // Set dataset_id to null in strategus_analysis
  await knex
    .withSchema(env.PG_SCHEMA)
    .table("strategus_analysis")
    .whereNotNull("dataset_id")
    .update({
      dataset_id: null,
      updated_at: new Date(),
    });

  console.log("Rollback completed successfully");
}
