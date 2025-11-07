import { Knex } from "knex";
import {env} from "../../env"

const rawUp = `CREATE FUNCTION ${env.PG_SCHEMA}."ConfigDbProcedures_DeleteAssignment" (
    ASSIGNMENT_ID VARCHAR(256)
) RETURNS VOID AS $$


BEGIN 

DELETE FROM ${env.PG_SCHEMA}."ConfigDbModels_AssignmentHeader"
WHERE "Id" = ASSIGNMENT_ID;
DELETE FROM ${env.PG_SCHEMA}."ConfigDbModels_AssignmentDetail"
WHERE "HeaderId" = ASSIGNMENT_ID;

END
$$ LANGUAGE plpgsql;`

const rawDown = `DROP FUNCTION IF EXISTS ${env.PG_SCHEMA}."ConfigDbProcedures_DeleteAssignment";`


export async function up(knex: Knex): Promise<void> {
    return (knex.schema.withSchema(env.PG_SCHEMA).raw(rawUp))
}

export async function down(knex: Knex): Promise<void> {
    return knex.schema.withSchema(env.PG_SCHEMA).raw(rawDown)
}

