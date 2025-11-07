import { Knex } from "knex";
import {env} from "../../env"

const rawUp = `CREATE FUNCTION ${env.PG_SCHEMA}."ConfigDbProcedures_HasUserConfigurationAssigned" (
    USERNAME VARCHAR(128),
    CONFIG_ID VARCHAR(40),
    CONFIG_VERSION VARCHAR(20))
    RETURNS TABLE("ALLOWED" INTEGER) AS $$
BEGIN 
    
    return query SELECT
            CASE WHEN
                count(*)>0
            THEN 
                1
            ELSE
                0
            END as ALLOWED
        FROM ${env.PG_SCHEMA}."ConfigDbModels_Assignment" as assignment
        WHERE assignment."ConfigId" = CONFIG_ID
            AND assignment."ConfigVersion" = CONFIG_VERSION
            and assignment."EntityType" = 'U'
                AND assignment."EntityValue" = USERNAME;
END;
$$ LANGUAGE plpgsql;`

const rawDown = `DROP FUNCTION IF EXISTS ${env.PG_SCHEMA}."ConfigDbProcedures_HasUserConfigurationAssigned";`

export async function up(knex: Knex): Promise<void> {
    return (knex.schema.withSchema(env.PG_SCHEMA).raw(rawUp))
}

export async function down(knex: Knex): Promise<void> {
    return knex.schema.withSchema(env.PG_SCHEMA).raw(rawDown)
}

