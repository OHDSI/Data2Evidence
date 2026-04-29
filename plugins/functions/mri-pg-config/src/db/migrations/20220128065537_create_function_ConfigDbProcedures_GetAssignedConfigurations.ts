import { Knex } from "knex";
import {env} from "../../env"

const rawUp = `CREATE FUNCTION ${env.PG_SCHEMA}."ConfigDbProcedures_GetAssignedConfigurations" (
    CONFIG_TYPE VARCHAR(20), 
    USERNAME VARCHAR(256))  
    RETURNS TABLE(
        "ASSIGNMENT_ID" VARCHAR(40),
        "ASSIGNMENT_NAME" VARCHAR(256),
        "CONFIG_ID" VARCHAR(40),
        "CONFIG_VERSION" VARCHAR(20),
        "CONFIG_STATUS" VARCHAR(20),
        "CONFIG_NAME" VARCHAR(256),
        "DEPENDENT_CONFIG_ID" VARCHAR(40),
        "DEPENDENT_CONFIG_VERSION" VARCHAR(20),
        "DATA" VARCHAR(5000)
    )    AS $$
BEGIN 
     return query SELECT  
            assignment."Id" as ASSIGNMENT_ID,
            assignment."Name" as ASSIGNMENT_NAME,
            config."Id" as CONFIG_ID,
            config."Version" as CONFIG_VERSION,
            config."Status" as CONFIG_STATUS,
            config."Name" as CONFIG_NAME,
            config."ParentId" as DEPENDENT_CONFIG_ID, 
            config."ParentVersion" as DEPENDENT_CONFIG_VERSION,
            config."Data" as "DATA"
        FROM   ${env.PG_SCHEMA}."ConfigDbModels_Assignment" as assignment
            JOIN   ${env.PG_SCHEMA}."ConfigDbModels_Config" as config
                ON assignment."ConfigId" = config."Id"
                AND assignment."ConfigVersion" = config."Version"
                and assignment."EntityType" = 'U'
                AND assignment."EntityValue" = USERNAME
        WHERE config."Type" = CONFIG_TYPE
            AND config."Id" is not null
    ;
END
$$ LANGUAGE plpgsql;`

const rawDown = `DROP FUNCTION IF EXISTS ${env.PG_SCHEMA}."ConfigDbProcedures_GetAssignedConfigurations";`

export async function up(knex: Knex): Promise<void> {
    return (knex.schema.withSchema(env.PG_SCHEMA).raw(rawUp))
}

export async function down(knex: Knex): Promise<void> {
    return knex.schema.withSchema(env.PG_SCHEMA).raw(rawDown)
}

