import { Knex } from "knex";
import {env} from "../../env"

const rawUp = `CREATE TABLE IF NOT EXISTS ${env.PG_SCHEMA}."MRIEntities_AllowedPatientIdsForExtension_Attr" (
    "DWID" BIT VARYING(256) NOT NULL,
    "DWAuditID" BIGINT,
    "InsertedOn" DATE NOT NULL,
    "UserName" VARCHAR(100) NOT NULL,
    "DWID_Patient" BIT VARYING(256),
    "Patient_Key_AssocDWID" BIT VARYING(256) NOT NULL,
    PRIMARY KEY ("DWID", "InsertedOn", "UserName")
);`

const rawDown = `DROP TABLE IF EXISTS ${env.PG_SCHEMA}."MRIEntities_AllowedPatientIdsForExtension_Attr"`

export async function up(knex: Knex): Promise<void> {
    return (knex.schema.withSchema(env.PG_SCHEMA).raw(rawUp))
}

export async function down(knex: Knex): Promise<void> {
    return knex.schema.withSchema(env.PG_SCHEMA).raw(rawDown)
}