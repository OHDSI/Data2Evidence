import { Knex } from "knex";
import {env} from "../../env"

const rawUp = `CREATE FUNCTION ${env.PG_SCHEMA}."ConfigDbProcedures_DeleteConfiguration" (
    CONFIG_ID  VARCHAR(40),
    CONFIG_VERSION  VARCHAR(20),
    CONFIG_STATUS  VARCHAR(20)
) 
RETURNS INTEGER AS $$

DECLARE PREV_ROWCOUNT INTEGER := 0;
DECLARE CUR_ROWCOUNT INTEGER := 1;
declare cur_row RECORD;

begin
create temporary table "TEMP_CONFIGS" ("CONFIG_ID" VARCHAR(40), "CONFIG_VERSION" VARCHAR(20)) on commit drop;
create temporary table "TEMP_ASSIGNMENTS" ("ASSIGNMENT_ID" VARCHAR(40)) on commit drop;

insert into "TEMP_CONFIGS" (SELECT "Id" as "CONFIG_ID", "Version" as "CONFIG_VERSION" 
    FROM ${env.PG_SCHEMA}."ConfigDbModels_Config"
    WHERE 
        "Id" = CONFIG_ID AND (
            "Version" = CONFIG_VERSION
            OR CONFIG_VERSION is null
        ) AND (
            "Status" = CONFIG_STATUS
            OR CONFIG_STATUS is null
        ));

WHILE CUR_ROWCOUNT > PREV_ROWCOUNT loop
    PREV_ROWCOUNT = CUR_ROWCOUNT;
    insert into "TEMP_CONFIGS" (
            SELECT "Id" as "CONFIG_ID", "Version" as "CONFIG_VERSION"
            FROM ${env.PG_SCHEMA}."ConfigDbModels_Config" configs
                JOIN "TEMP_CONFIGS" as toDelete 
                    ON configs."ParentId" = toDelete."CONFIG_ID"
                    AND configs."ParentVersion" = toDelete."CONFIG_VERSION"
                    EXCEPT
            SELECT "CONFIG_ID", "CONFIG_VERSION"
            FROM "TEMP_CONFIGS"
    );
    SELECT count(*) INTO CUR_ROWCOUNT FROM "TEMP_CONFIGS";
END loop;


DELETE FROM ${env.PG_SCHEMA}."ConfigDbModels_Config"
WHERE "Id" || '-' || "Version" in (
    SELECT "CONFIG_ID" || '-' || "CONFIG_VERSION"
    FROM "TEMP_CONFIGS"
);
DELETE FROM ${env.PG_SCHEMA}."ConfigDbModels_UserDefaultConfig"
WHERE "ConfigId" || '-' || "ConfigVersion" in (
    SELECT "CONFIG_ID" || '-' || "CONFIG_VERSION"
    FROM "TEMP_CONFIGS"
);

insert into "TEMP_ASSIGNMENTS" (
    SELECT DISTINCT header."Id" as "ASSIGNMENT_ID"
    FROM ${env.PG_SCHEMA}."ConfigDbModels_AssignmentHeader" header
    JOIN ${env.PG_SCHEMA}."ConfigDbModels_AssignmentDetail" detail
        ON header."Id" = detail."HeaderId"
    JOIN "TEMP_CONFIGS" as toDelete
        ON detail."ConfigId" = toDelete."CONFIG_ID"
        AND detail."ConfigVersion" = toDelete."CONFIG_VERSION"
    );
BEGIN
    FOR cur_row IN SELECT "ASSIGNMENT_ID" FROM "TEMP_ASSIGNMENTS" 
    LOOP
        PERFORM ${env.PG_SCHEMA}."ConfigDbProcedures_DeleteAssignment"(cur_row."ASSIGNMENT_ID");
    END LOOP;

END;
return 1;
END;--
$$ LANGUAGE plpgsql
CALLED ON NULL INPUT;`

const rawDown = `DROP FUNCTION IF EXISTS ${env.PG_SCHEMA}."ConfigDbProcedures_DeleteConfiguration";`

export async function up(knex: Knex): Promise<void> {
    return (knex.schema.withSchema(env.PG_SCHEMA).raw(rawUp))
}

export async function down(knex: Knex): Promise<void> {
    return knex.schema.withSchema(env.PG_SCHEMA).raw(rawDown)
}
