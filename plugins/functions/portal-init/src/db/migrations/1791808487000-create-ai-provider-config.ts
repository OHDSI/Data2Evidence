import { MigrationInterface, QueryRunner } from "npm:typeorm";

/**
 * Issue #3561: AI provider configurations (provider, model, encrypted API key).
 * - ai_provider_config_unique_idx: NULL-safe uniqueness over the identifying fields.
 * - ai_provider_config_selected_idx: at most one selected row.
 */
export class CreateAiProviderConfig1791808487000 implements MigrationInterface {
  name = "CreateAiProviderConfig1791808487000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "portal"."ai_provider_config" ("id" SERIAL NOT NULL, "host" character varying NOT NULL, "model" character varying NOT NULL, "base_url" character varying, "region" character varying, "workspace_id" character varying, "api_key_encrypted" text NOT NULL, "is_selected" boolean NOT NULL DEFAULT false, "created_by" character varying NOT NULL, "created_date" TIMESTAMP NOT NULL DEFAULT now(), "modified_by" character varying NOT NULL, "modified_date" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_ai_provider_config_id" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "ai_provider_config_unique_idx" ON "portal"."ai_provider_config" ("host", "model", COALESCE("base_url", ''), COALESCE("region", ''), COALESCE("workspace_id", ''))`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "ai_provider_config_selected_idx" ON "portal"."ai_provider_config" ("is_selected") WHERE "is_selected"`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "portal"."ai_provider_config"`);
  }
}
