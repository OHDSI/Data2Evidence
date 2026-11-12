import { MigrationInterface, QueryRunner } from "npm:typeorm";

/**
 * Issue #3561: named AI configurations (provider, model, encrypted API key).
 * - ai_config_name_idx: configuration names are unique (case-sensitive).
 * - ai_config_active_idx: at most one active row.
 */
export class CreateAiConfig1791808487000 implements MigrationInterface {
  name = "CreateAiConfig1791808487000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "portal"."ai_config" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, "provider" character varying NOT NULL, "model" character varying NOT NULL, "base_url" character varying, "region" character varying, "workspace_id" character varying, "api_key_encrypted" text NOT NULL, "is_active" boolean NOT NULL DEFAULT false, "created_by" character varying NOT NULL, "created_date" TIMESTAMP NOT NULL DEFAULT now(), "modified_by" character varying NOT NULL, "modified_date" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_ai_config_id" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "ai_config_name_idx" ON "portal"."ai_config" ("name")`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "ai_config_active_idx" ON "portal"."ai_config" ("is_active") WHERE "is_active"`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "portal"."ai_config"`);
  }
}
